#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
/** A source-only Android connectivity gate, optional VM cases post-install. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__legacyScriptsDir,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manager=read('src/services/network/internetReachabilityService.ts');
const banner=read('src/components/system/BloomInternetBanner.tsx');
const login=read('src/app/(auth)/login.tsx');
const auth=read('src/context/AuthContext.tsx');
const layout=read('src/app/_layout.tsx');
let passed=0;
const test=(name,condition)=>{assert(condition,name);passed++;console.log('PASS '+name)};
test('Reachability tests actual HTTPS, not Android 5G signal', manager.includes('generate_204') && manager.includes('cdn-cgi/trace') && manager.includes("response.status === 204"));
test('Reachability has bounded fetch timeout and abort',manager.includes('Promise.race') && manager.includes('controller.abort()') && manager.includes('TIMEOUT_MS = 3400'));
test('Reachability dedupes concurrent probes',manager.includes('if (pending) return pending;'));
test('Banner auto-checks on foreground, never polls in background',banner.includes("AppState.addEventListener('change'") && banner.includes("if (!active && timer)") && banner.includes("if (active && !wasActive) void run()"));
test('Banner is nonblocking and disappears when Internet is online',banner.includes('pointerEvents="none"') && banner.includes("status !== 'offline'"));
test('Banner mounted above game/route plane for anonymous and signed-in screens',layout.indexOf('<BloomInternetBanner />') > layout.indexOf('<BoardGamePresentationRoot'));
test('Google button immediately shows loading and rejects duplicate presses',login.includes('googleBusyRef.current = true') && login.includes('isLoading={isLoadingGoogle}') && login.includes('onPress={handleGoogle}'));
test('Both login methods and OTP guard Internet prior to auth call',auth.includes('if (!(await ensureInternetForAuth())) return;') && (auth.match(/if \(!\(await ensureInternetForAuth\(\)\)\) return false;/g)||[]).length===2);
test('Network loss never signs out Firebase identity',!manager.includes('signOut') && !banner.includes('signOut') && !auth.includes('authService.signOut()\n    welcomeRequestedRef.current = true;'));

const buildAndShare=read('scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat');
const cleanApply=read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const eas=read('scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat');
test('Windows Build, Clean Apply and EAS run connectivity VM after dependencies',
  [buildAndShare,cleanApply,eas].every(b=>b.includes('node scripts\\tests\\release\\test-h25r2r5-internet-connectivity.cjs\r\nif errorlevel 1 goto :fail')));

if(process.argv.includes('--source-only')) {console.log(`H25R2R5 CONNECTIVITY SOURCE ${passed}/${passed} PASS`);process.exit(0)}
let ts;try {ts=require('typescript')} catch { console.error('Install TypeScript before runtime test; preinstall uses --source-only.');process.exit(1) }
const vm=require('node:vm');
const compiled=ts.transpileModule(manager,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve()};
async function load(probe) {
  const ex={};const aborts=[];
  const ctx={exports:ex,Promise,Set,Date,AbortController:class{signal={};abort(){aborts.push(true)}},
    setTimeout,clearTimeout,fetch:probe};
  vm.runInNewContext(compiled,ctx,{timeout:5000});
  return {api:ex.internetReachabilityService,aborts};
}
(async()=>{
  const offline=await load(async()=>{throw Error('network unreachable')});
  const transitions=[];
  const dispose=offline.api.subscribe(status=>transitions.push(status));
  const p1=offline.api.checkNow({force:true});const p2=offline.api.checkNow({force:true});
  test('VM concurrent callers reuse same probe promise',p1===p2);
  test('VM both probes fail: offline',await p1==='offline');
  test('VM offline listener gets one notification',transitions.length===1 && transitions[0]==='offline');dispose();
  const ok=await load(async(url)=>url.includes('gstatic')?{status:204}:{status:503,text:async()=>''});
  test('VM one valid 204 is online',await ok.api.checkNow({force:true})==='online');
  const captive=await load(async()=>({status:200,text:async()=>'<html>login captive portal</html>'}));
  test('VM captive login pages do not masquerade as Internet',await captive.api.checkNow({force:true})==='offline');
  let recovered=false, requests=0;
  const transitionsAgain=[];
  const reconnect=await load(async()=>{requests++;return recovered?{status:204}:{status:500};});
  reconnect.api.subscribe(next=>transitionsAgain.push(next));
  test('VM starts offline while mobile data is exhausted',await reconnect.api.checkNow({force:true})==='offline');
  recovered=true;
  test('VM foreground forced refresh returns online',await reconnect.api.checkNow({force:true})==='online');
  test('VM transitions trigger offline then online notification',transitionsAgain.join(',')==='offline,online');
  const beforeCache=requests;
  test('VM non-forced rapid UI checks use cached result',await reconnect.api.checkNow()==='online' && requests===beforeCache);

  const cloudflare=await load(async(url)=>url.includes('cloudflare')?{status:200,text:async()=> 'ip=198.51.100.1\ncolo=SIN\n'}:{status:500,text:async()=>''});
  test('VM Cloudflare backup detects Internet during primary outage',await cloudflare.api.checkNow({force:true})==='online');
  console.log(`H25R2R5 CONNECTIVITY SOURCE+VM ${passed}/${passed} PASS`);
})().catch(e=>{console.error(e);process.exit(1)});
