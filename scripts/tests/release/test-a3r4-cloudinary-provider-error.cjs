'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const load = (file, mocks = {}) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const output = ts.transpileModule(source, {fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const module = {exports:{}};
  new Function('require', 'module', 'exports', 'FormData', output)(id => mocks[id] ?? require(id), module, module.exports, class MockFormData {append(){}});
  return module.exports;
};
const helper = load('src/services/media/momentUploadDiagnostic.ts');
let pass=0;
const check = (label, fn) => {fn(); pass++; console.log('PASS '+pass+' '+label);};
const status403 = {response:{status:403,data:{error:{message:'Uploads are restricted for this account.'}},headers:{'x-cld-error':'Account policy restricted'}}};
check('Read JSON error.message + X-Cld-Error from 403, without raw response', () => {
  const d=helper.extractCloudinaryFailure(status403, {cloudName:'fb_test_cloud',resourceType:'image',signed:true});
  assert.equal(d.status,403);assert.equal(d.providerMessage,'Uploads are restricted for this account.');
  assert.equal(d.providerHeader,'Account policy restricted'); assert.equal(d.cloudName,'fb_test_cloud');
  assert.equal(JSON.stringify(d).includes('response'),false);
});
check('Read AxiosHeaders and JSON string error bodies',()=>{
  const d=helper.extractCloudinaryFailure({response:{status:403,data:'{"error":{"message":"Account suspended"}}',headers:{get:key=>key==='x-cld-error'?'Upload disabled':null}}},{cloudName:'good-cloud',resourceType:'video',signed:false});
  assert.equal(d.providerMessage,'Account suspended');assert.equal(d.providerHeader,'Upload disabled');
});
check('Malformed HTML body is not exposed',()=>{
  const d=helper.extractCloudinaryFailure({response:{status:403,data:'<html>secret raw cloud error</html>',headers:{}}},{cloudName:'ok',resourceType:'image',signed:true});
  assert.equal(d.providerMessage,''); assert.equal(d.providerHeader,'');
});
check('Non-HTTP errors are never treated as Cloudinary status',()=>{
  assert.equal(helper.extractCloudinaryFailure(new Error('network'),{cloudName:'ok',resourceType:'image',signed:true}),null);
});
check('Redacts credentials, signed IDs, JWTs, URLs, emails and private keys',()=>{
  const message='signature=abcd123 api_key=12345678 folder=private/family public_id=abc123 https://host.com/?token=XYZ someone@example.com Bearer abcdefgh public_id:other';
  const d=helper.safeProviderText(message);
  for(const secret of ['abcd123','12345678','private/family','abc123','host.com','someone@example.com','abcdef','other'])assert.ok(!d.includes(secret),secret);
});
check('Keeps safe actionable provider reason rather than generic HTTP code',()=>{
  helper.recordMomentUploadFailure(Object.assign(new Error('CLOUDINARY_UPLOAD_HTTP_403'),{momentCloudinaryFailure:helper.extractCloudinaryFailure(status403,{cloudName:'fbcloud',resourceType:'image',signed:true})}),'upload');
  const report=helper.formatMomentUploadDiagnosticReport(helper.getLatestMomentUploadDiagnostic());
  assert.ok(report.includes('Uploads are restricted for this account.'));
  assert.ok(report.includes('HTTP: 403'));assert.ok(report.includes('Signed upload: Có'));
});
check('Copies of stored record are immutable from caller perspective',()=>{
  const a=helper.getLatestMomentUploadDiagnostic();a.providerMessage='fake';assert.notEqual(helper.getLatestMomentUploadDiagnostic().providerMessage,'fake');
});
check('Clear diagnostic removes in-memory report',()=>{
  helper.clearMomentUploadDiagnostic();assert.equal(helper.getLatestMomentUploadDiagnostic(),null);
});
const fakeAxios={__esModule:true,default:{post:async()=>{throw status403;},isCancel:()=>false}};
const cloud = load('src/services/media/cloudinaryService.ts', {
  'axios':fakeAxios,
  '../../constants/appPaths': { APP_CONFIG:{CLOUDINARY:{cloudName:'wrong_android_cloud',uploadPresets:{image:'legacy',video:'legacy'}}},getCloudinaryFolder:()=> 'moments' },
  '../../types/errors':{AppError:class AppError extends Error {}},
  './momentMediaApi':{ momentMediaApi:{configured:true,signUpload:async()=>({cloudName:'correct_server_cloud',apiKey:'123456789',timestamp:12345,signature:'secret_signature',folder:'media',publicId:'privateid'})} },
  './momentUploadDiagnostic':helper,
});
const f={type:'image',uri:'file://local.jpg',mimeType:'image/jpeg',fileName:'local.jpg'};
(async()=>{
  try {await cloud.cloudinaryService.upload(f,{purpose:'moment',familyId:'x'},undefined,{assetId:'id1'});assert.fail('Expected 403');}
  catch(e){assert.equal(e.message,'CLOUDINARY_UPLOAD_HTTP_403');assert.equal(e.momentCloudinaryFailure.cloudName,'correct_server_cloud');assert.equal(e.momentCloudinaryFailure.providerMessage,'Uploads are restricted for this account.');assert.ok(!JSON.stringify(e).includes('secret_signature'));}
  pass++;console.log('PASS '+pass+' 403 survives signed Cloudinary service boundary; no raw Axios error');
  const ui=fs.readFileSync(path.join(root,'src/app/(internal)/moment-upload-diagnostics.tsx'),'utf8');
  const entry=fs.readFileSync(path.join(root,'src/app/(internal)/developer-tools.tsx'),'utf8');
  const context=fs.readFileSync(path.join(root,'src/context/MomentPublishContext.tsx'),'utf8');
  assert(ui.includes('isVerifiedDeveloperAccount(user)'));assert(ui.includes('formatMomentUploadDiagnosticReport'));assert(entry.includes('/moment-upload-diagnostics'));
  assert(context.includes('recordMomentUploadFailure(error, stage)'));
  pass++;console.log('PASS '+pass+' developer-only route, copy action and failure-hook wired');
  console.log(`A3R4 CLOUDINARY DIAGNOSTICS ${pass}/${pass} PASS`);
})().catch(err=>{console.error(err);process.exitCode=1;});
