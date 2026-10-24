#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
let pass=0;const test=(name,fn)=>{try{fn();console.log(`PASS R3R12 ${++pass}: ${name}`)}catch(e){console.error('FAIL R3R12 '+name,e.stack);process.exitCode=1;}};
const alias=read('src/utils/familyIntroduction.ts'),service=read('src/services/family/familyService.ts');
const join=read('src/services/family/familyJoinService.ts');
const welcome=read('src/components/onboarding/WelcomeModal.tsx');
const renderer=read('src/features/study/StudyFormula.tsx');
test('alias preserves capitalization, accents, spaces and punctuation',()=>{
  assert(alias.includes('encodeURIComponent'));assert(alias.includes("normalize('NFC')"));
  assert(!/\.toLowerCase\(|toLocaleLowerCase\(/.test(alias));
  assert(join.includes('familyIntroDocId(familyKey)'));assert(!join.includes('familyKey.toLowerCase()'));
});
test('transaction reserves unique alias, checks membership and never changes familyId',()=>{
  assert(service.includes('runTransaction(db, async tx =>'));
  for(const part of ['updateFamilyIntroName','tx.get(memberRef)','tx.get(newRef)','newSnap.exists()','tx.set(newRef','tx.update(familyRef','tx.delete(oldRef)'])assert(service.includes(part),part);
  assert(service.includes('introNameKey'));assert(!service.includes('tx.update(familyRef, { familyCode: name'));
});
test('rules enforce family admin and global uniqueness on BOTH rule files',()=>{
  for(const name of ['firestore.rules','firestore.cloud.rules']){
    const rules=read(name);assert(rules.includes('match /family_intro_names/{nameKey}'),name);
    assert(rules.includes('allow list: if false;'));assert(rules.includes('graphAdmin(resource.data.familyId)'));
    assert(rules.includes('getAfter(/databases/$(database)/documents/family_intro_names/$(request.resource.data.introNameKey))'));
  }
});
test('welcome letter is entire approved text with scrolling and bounded sheet',()=>{
  for(const phrase of ['THƯ NGỎ','phi lợi nhuận','không thu phí thành viên','Hộp Thời Gian của tình thân','10 năm','3 năm','mã nguồn dự án','Mỗi thành viên','Gìn giữ hôm nay'])assert(welcome.includes(phrase),phrase);
  assert(welcome.includes('<ScrollView'));
  assert(welcome.includes('readerHeight = Math.min') && welcome.includes('height - (compact ? 18 : 48)'));
  assert(welcome.includes('styles.footer'));assert(welcome.includes('openLetter'));
  assert(!welcome.includes('<Modal'));
});
test('radical is continuous and scales with content height in unified renderer',()=>{
  for(const piece of ['RootSegment','RootInk','onLayout={e=>','borderTopWidth:stroke','case \'root\':return <RootInk'])assert(renderer.includes(piece),piece);
  assert(!renderer.includes('rootGlyph'));assert(renderer.includes('NativeFormula'));assert(renderer.includes('StudyBlocksView'));
});
test('root BAT launchers and build gates ship together',()=>{
  const launchers=['Family_Bloom_AUTO_UPDATE_FULL.bat','Family_Bloom_BUILD_APK_TO_SHARE.bat','Family_Bloom_EAS_BUILD_TEST.bat','Family_Bloom_EAS_UPDATE_TEST.bat'];
  const manifest=JSON.parse(read('scripts/setup/bat-entrypoints-manifest.json'));
  for(const name of launchers){assert(manifest.batFiles.includes(name));assert(read(name).includes('scripts\\android\\'));}
  for(const name of ['scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat','scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat','scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat'])assert(read(name).includes('test-r3r12-family-intro-letter-radical.cjs'),name);
});
let ts;try{ts=require('typescript')}catch{}
if(ts){
 const code=ts.transpileModule(alias,{fileName:'familyIntroduction.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m={exports:{}};new Function('module','exports',code)(m,m.exports);
 const {familyIntroDocId:encode,validateFamilyIntroName:validate,familyIntroCharacters:count}=m.exports;
 test('case-sensitive aliases, 20-character limit and arbitrary symbols behave correctly',()=>{
  assert.notEqual(encode('Nhà Hoa'),encode('nhà hoa'));
  assert.notEqual(encode('Nhà Hoa'),encode('Nha Hoa'));
  for(const str of ['Nhà Hoa', 'Họ Trần 👨‍👩‍👧', 'Nhà / #&? % ☘️']) assert.equal(validate(str),str);
  assert(!encode('Nhà / #&? % ☘️').includes('/'));
  assert.equal(count('Đ'.repeat(20)),20);
  assert.throws(()=>validate('a'.repeat(21)));
  assert.throws(()=>validate(' '));
 });
}
console.log(`R3R12 FAMILY / LETTER / RADICAL: ${pass} PASS${process.exitCode?' / FAIL':''}`);
