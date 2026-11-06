#!/usr/bin/env node
'use strict';
/** P0: never call React hooks from lazy theme/style factories. A style proxy
 * runs its factory on cache misses, not on every component render; a Hook
 * inside the factory causes the native login hero to crash on subsequent renders.
 * This gate checks the TS/TSX AST, NOT fragile regex text snippets.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'../../..');
let ts;
try { ts = require('typescript'); }
catch { ts = require(path.join(root,'scripts/vendor/typescript')); }
const src = path.join(root,'src');
const offenses=[];
let checked=0, factories=0;
function scan(directory){
  for(const ent of fs.readdirSync(directory,{withFileTypes:true})){
    const filename=path.join(directory,ent.name);
    if(ent.isDirectory())scan(filename);
    else if(/\.tsx?$/.test(ent.name)){
      checked++;
      const contents=fs.readFileSync(filename,'utf8');
      const source=ts.createSourceFile(filename,contents,ts.ScriptTarget.Latest,true,ent.name.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
      function visitor(node){
        if(ts.isCallExpression(node) && node.expression.getText(source)==='createBloomStyles'){
          factories++;
          const factory=node.arguments[0];
          if(factory){
            function checkFactory(n){
              if(ts.isCallExpression(n) && /^use[A-Z]\w*$/.test(n.expression.getText(source))){
                const pos=source.getLineAndCharacterOfPosition(n.getStart(source));
                offenses.push(`${path.relative(root,filename)}:${pos.line+1} ${n.expression.getText(source)}`);
              }
              ts.forEachChild(n,checkFactory);
            }
            checkFactory(factory);
          }
        }
        ts.forEachChild(node,visitor);
      }
      visitor(source);
    }
  }
}
scan(src);
assert(factories>100,`Suspiciously few theme/style factories scanned: ${factories}`);
assert.equal(offenses.length,0,'React Hook called from a cache-dependent style factory:\n'+offenses.join('\n'));
const hero=fs.readFileSync(path.join(src,'components/ui/BloomHeroHeader.tsx'),'utf8');
assert(hero.includes('const theme = useA3Theme();') && hero.includes('const palette = theme.selection.palette;'), 'Login hero must read reactive theme at the component level');
assert(hero.includes('const config: HeroConfig = {') && hero.includes('surface: theme.colors.heroSurface'),'Login hero resolves config colors from reactive tokens');
const login=fs.readFileSync(path.join(src,'app/(auth)/login.tsx'),'utf8');
assert(login.includes('<BloomHeroHeader'),'Login still renders the hero whose hooks were repaired');
console.log(`P0 Hook safety: ${checked} TS/TSX files, ${factories} factories, 0 invalid hooks. Login hero PASS.`);
