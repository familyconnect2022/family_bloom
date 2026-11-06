#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const root=path.resolve(__dirname,'../../..');
const lines=[['file','line','type','title_message_preview'].join(',')];
const counts={total:0,success:0,warning:0,error:0,info:0,notification:0,dynamic:0,unclassified:0};
function quote(s){return '"'+s.replace(/"/g,'""')+'"'}
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
 const file=path.join(dir,ent.name);if(ent.isDirectory()){if(ent.name!=='web')walk(file);continue}
 if(!/\.tsx?$/.test(ent.name))continue;
 const data=fs.readFileSync(file,'utf8'),tree=ts.createSourceFile(file,data,ts.ScriptTarget.Latest,true);
 function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(tree).endsWith('showToast')&&n.arguments.length&&ts.isObjectLiteralExpression(n.arguments[0])){
   const obj=n.arguments[0],prop=obj.properties.find(x=>ts.isPropertyAssignment(x)&&x.name.getText(tree)==='type');
   const t=prop?.initializer.getText(tree).replace(/["']/g,'') || (obj.getText(tree).includes('...parseAppError')?'dynamic':'unclassified');
   const kind=t in counts?t:'dynamic';counts.total++;counts[kind]++;
   const line=tree.getLineAndCharacterOfPosition(n.getStart(tree)).line+1;
   lines.push([quote(path.relative(root,file).replace(/\\/g,'/')),line,quote(kind),quote(obj.getText(tree).slice(0,260).replace(/\s+/g,' '))].join(','));
 }ts.forEachChild(n,visit)}visit(tree);
}}
walk(path.join(root,'src'));
const out=path.join(root,'document/reports/validation/FAMILY_BLOOM_M3R4R3_TOAST_AUDIT.csv');fs.writeFileSync(out,lines.join('\n')+'\n');
console.log(JSON.stringify({counts,out},null,2));
if(counts.unclassified>0)process.exitCode=1;
