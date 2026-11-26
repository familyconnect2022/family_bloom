'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const pre='scripts/android/prepare-android-local.cjs',env='scripts/android/configure-main-env.cjs',verify='scripts/setup/verify-release-source.cjs';
for(const f of ['scripts/android/dev/Family_Bloom_Android_Metro_Only.bat','scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat'])assert.match(read(f),/node scripts\\android\\prepare-android-local\.cjs/);
assert.match(read('scripts/android/dev/Family_Bloom_Android_Metro_Only.bat'),/npx --no-install expo start --dev-client/);
assert.match(read('scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat'),/npx --no-install expo prebuild --platform android --clean --no-install/);
assert.match(read('scripts/android/build/Build-And-Sign.ps1'),/node scripts\/android\/prepare-android-local\.cjs/);
assert.match(read(pre),/--repair-eol/);
assert.match(read(pre),/if\(!exists\('node_modules'\)\|\|missing.length/);
assert.match(read(pre),/configure-main-env\.cjs','ensure'/);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fb-preflight-'));
function put(n,v){const f=path.join(tmp,n);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,v);}
const run=(file,...args)=>cp.spawnSync(process.execPath,[path.join(tmp,file),...args],{cwd:tmp,env:{...process.env,PATH:path.join(tmp,'bin')+path.delimiter+process.env.PATH},encoding:'utf8',input:'',timeout:30000});
const ok=(v)=>assert.equal(v.status,0,(v.stdout||'')+(v.stderr||''));
const bad=(v)=>assert.notEqual(v.status,0);
try{
 for(const f of [pre,env,verify,'scripts/setup/semver-contract.js','.env.main.example'])put(f,read(f));
 for(const f of ['scripts/setup/check-package-lock.js','scripts/setup/check-p2_37r2-local-install.js','scripts/setup/check-expo-route-uniqueness.cjs','scripts/tests/release/test-family-publish-manager.cjs','scripts/tests/release/test-family-field-document.cjs','scripts/tests/release/test-family-media-review.cjs'])put(f,'process.exit(0);\n');
 put('app.json',JSON.stringify({expo:{version:'1.3.80',android:{versionCode:143090}}}));
 put('package.json',JSON.stringify({version:'1.3.80',dependencies:{expo:'~57.0.28'},devDependencies:{typescript:'~6.0.3'}}));
 put('package-lock.json',JSON.stringify({version:'1.3.80',lockfileVersion:3,packages:{'':{dependencies:{expo:'~57.0.28'},devDependencies:{typescript:'~6.0.3'}}}}));
 put('bin/npm',`#!/bin/sh\n[ "$*" = "ci --include=dev --no-audit --no-fund" ] || exit 99\nmkdir -p node_modules/typescript node_modules/expo\nprintf '%s' '{"name":"typescript","version":"6.0.3"}' > node_modules/typescript/package.json\nprintf '%s' '{"name":"expo","version":"57.0.28"}' > node_modules/expo/package.json\necho repaired > npm-called.txt\n`);
 fs.chmodSync(path.join(tmp,'bin/npm'),0o755);
 put('bin/npm.cmd','@echo off\r\nif not "%*"=="ci --include=dev --no-audit --no-fund" exit /b 99\r\nmkdir node_modules\\typescript 2>nul\r\nmkdir node_modules\\expo 2>nul\r\n>node_modules\\typescript\\package.json echo {"name":"typescript","version":"6.0.3"}\r\n>node_modules\\expo\\package.json echo {"name":"expo","version":"57.0.28"}\r\n>npm-called.txt echo repaired\r\n');
 put('src/fixture.ts','const value = 1;\n');
 const paths=[pre,env,verify,'scripts/setup/semver-contract.js','.env.main.example','app.json','package.json','src/fixture.ts','scripts/setup/check-p2_37r2-local-install.js','scripts/setup/check-expo-route-uniqueness.cjs'];
 const files=paths.map(p=>{const bytes=fs.readFileSync(path.join(tmp,p));return {path:p,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}});
 put('ANDROID_SOURCE_MANIFEST.json',JSON.stringify({release:'R16R11R68',version:'1.3.80',versionCode:143090,fileCount:files.length,files}));
 // Reject missing production URL on all launch modes; no silent disabled mode.
 bad(run(pre));assert(!fs.existsSync(path.join(tmp,'.env')));
 bad(run(env,'init','http://invalid.test/api/session'));assert(!fs.existsSync(path.join(tmp,'.env')));
 ok(run(env,'init','https://gateway.familybloom.invalid'));const envBefore=fs.readFileSync(path.join(tmp,'.env'));
 assert.match(envBefore.toString(),/https:\/\/gateway\.familybloom\.invalid\/api\/session/);
 bad(run(env,'init','https://another.familybloom.invalid'));assert.deepEqual(fs.readFileSync(path.join(tmp,'.env')),envBefore);
 put('node_modules/expo/package.json','{"name":"expo","version":"57.0.28"}');
 put('node_modules/typescript/package.json','{"name":"typescript","version":"6.0.3"}');
 put('node_modules/keep.txt','existing-dependencies');
 // Non-Git CRLF checkout repair: exact raw SHA only.
 put('src/fixture.ts','const value = 1;\r\n');
 const pass=run(pre);ok(pass);assert.match(pass.stdout,/EOL-only repaired: 1/);assert.match(pass.stdout,/Keeping existing node_modules/);
 assert.equal(fs.readFileSync(path.join(tmp,'src/fixture.ts'),'utf8'),'const value = 1;\n');
 assert.equal(fs.readFileSync(path.join(tmp,'node_modules/keep.txt'),'utf8'),'existing-dependencies');
 assert.deepEqual(fs.readFileSync(path.join(tmp,'.env')),envBefore);
 // A real content change cannot be repaired.
 put('src/fixture.ts','const value = 2;\r\n');bad(run(pre));assert.match(fs.readFileSync(path.join(tmp,'src/fixture.ts'),'utf8'),/value = 2/);
 put('src/fixture.ts','const value = 1;\n');
 // Existing but incomplete node_modules -> repair from pinned lock automatically.
 fs.rmSync(path.join(tmp,'node_modules/typescript'),{recursive:true,force:true});
 const missing=run(pre);ok(missing);assert.match(missing.stdout,/Repairing missing or mismatched/);assert.match(missing.stdout,/typescript missing/);assert(fs.existsSync(path.join(tmp,'npm-called.txt')));assert.deepEqual(fs.readFileSync(path.join(tmp,'.env')),envBefore);fs.unlinkSync(path.join(tmp,'npm-called.txt'));put('node_modules/typescript/package.json','{"name":"typescript","version":"5.0.0"}');ok(run(pre));assert(fs.existsSync(path.join(tmp,'npm-called.txt')));
 // No silent override of configured .env by .env.local.
 put('.env.local','EXPO_PUBLIC_SINGLE_SESSION_ENABLED=0\n');bad(run(env,'check'));
 console.log('[PASS] Metro/Debug/Release shared preflight: gateway, auto repair only when needed, exact EOL repair, content tamper rejected, local env preserved.');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
