'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const source=fs.readFileSync(path.join(root,'scripts/tests/release/test-r16r8-native-session.cjs'),'utf8');
const tsconfig=JSON.parse(fs.readFileSync(path.join(root,'tsconfig.json'),'utf8'));
test('Session semantic gate must use Bundler and never deprecated Node10',()=>{
  assert.equal(tsconfig.compilerOptions.moduleResolution,'bundler','Expo project tsconfig must stay on Bundler');
  assert.match(source,/module:ts\.ModuleKind\.ESNext/);
  assert.match(source,/moduleResolution:ts\.ModuleResolutionKind\.Bundler/);
  assert.doesNotMatch(source,/moduleResolution:ts\.ModuleResolutionKind\.Node10/);
  assert.match(source,/ts\.getPreEmitDiagnostics\(program\)/,'Semantic errors must be detected');
  assert.match(source,/brokenDiagnostics\.some\(d=>d\.code===7006\)/,'TS7006 negative case must remain active');
  assert.match(source,/for \(const interop of \[false,true\]\)/,'Both import interop behaviors must remain tested');
});
