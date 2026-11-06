#!/usr/bin/env node
'use strict';
/** Offline regression: routine Metro runs are quiet, errors remain visible,
 * session gates never depend on the optional observer. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const source=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const metro=source('src/diagnostics/metroLogging.ts');
const session=source('src/diagnostics/sessionDiagnostics.ts');
const layout=source('src/app/_layout.tsx');
const gate=source('src/app/session-gate.tsx');
const auth=source('src/context/AuthContext.tsx');
const notifier=source('src/services/push/localNotificationService.ts');
const realtime=source('src/services/realtime/sharedRealtimeRegistry.ts');
let passes=0;
const check=(name,fn)=>{fn();passes++;};
function evalMetro(dev,flag) {
  const code=ts.transpileModule(metro,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
  const context={exports:{},__DEV__:dev,process:{env:flag===undefined?{}:{EXPO_PUBLIC_FB_METRO_TEST_LOGS:flag}}};
  vm.runInNewContext(code,context,{filename:'metroLogging.js'});
  return context.exports.metroTestLogsEnabled;
}
function evalSession(flag) {
  const code=ts.transpileModule(session,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
  const context={exports:{},process:{env:flag===undefined?{}:{EXPO_PUBLIC_FB_SESSION_DIAGNOSTICS:flag}},Date,Math,setTimeout,clearTimeout};
  vm.runInNewContext(code,context,{filename:'sessionDiagnostics.js'});
  return context.exports;
}
check('Metro logging defaults OFF in Dev and Release',()=>{
  assert.equal(evalMetro(true,undefined),false);assert.equal(evalMetro(false,undefined),false);
  assert.equal(evalMetro(true,'0'),false);
});
check('Explicit Metro logging works only in Development',()=>{
  assert.equal(evalMetro(true,'1'),true);assert.equal(evalMetro(false,'1'),false);
});
check('Diagnostic observer defaults OFF without allocating diagnostic records',()=>{
  const d=evalSession();assert.equal(d.sessionDiagnosticsEnabled,false);
  const instance=new d.SessionDiagnostics();
  assert.equal(instance.start('AUTH','main').serial,-1);
  for(let i=0;i<150;i++)instance.note('AUTH','test');
  assert.equal(instance.getSnapshot().records.length,0);instance.dispose();
});
check('Explicit diagnostic observer retains functionality for authorized troubleshooting',()=>{
  const d=evalSession('1');assert.equal(d.sessionDiagnosticsEnabled,true);
  const instance=new d.SessionDiagnostics();instance.note('AUTH','test');
  assert.equal(instance.getSnapshot().records.length,1);instance.dispose();
});
check('Root and Welcome test probes are opt-in, not painted routinely',()=>{
  assert(layout.includes('devVisualProbe = sessionDiagnosticsEnabled &&'));
  assert(gate.includes('if (!sessionDiagnosticsEnabled || !welcomeOnGate'));
  assert(gate.includes('sessionDiagnosticsEnabled && typeof __DEV__'));
});
check('High volume route and session traces are gated before arguments are created',()=>{
  assert(layout.includes('if (metroTestLogsEnabled) {\n      console.info("[BloomGate]"'));
  assert(layout.includes('if (metroTestLogsEnabled) console.info("[BloomVisualD3] root-planes"'));
  assert(auth.includes('if (metroTestLogsEnabled) console.info("[BloomSession] membership verified via"'));
  assert(auth.includes('if (current && metroTestLogsEnabled)'));
  assert(!auth.includes('console.log(`[A14][perf] family switch ${current.targetFamilyId}'));
});
check('Test notification and listener-key logs are disabled by default',()=>{
  assert(notifier.includes('if (metroTestLogsEnabled) console.info("[Bloom E2E]'));
  assert(notifier.includes('if (metroTestLogsEnabled) console.info(`[Bloom notifications]'));
  assert(realtime.includes('else if (metroTestLogsEnabled && entry.listenerName !== resolvedName)'));
});
check('Critical actual error reporting is NOT globally disabled',()=>{
  const all=[metro,session,layout,gate,auth,notifier,realtime].join('\n');
  assert(!all.includes('LogBox.ignoreAllLogs'));
  assert(!all.includes('console.log ='));
  assert(notifier.includes('console.error(`[Bloom notifications] failed to schedule test'));
  assert(auth.includes('console.warn("[SessionGate] Profile verification failed"'));
});
check('No changes to Auth guards needed for optional log policy',()=>{
  assert(layout.includes('guard={allowFamilyRoutes}'));
  assert(auth.includes('authEpochRef.current'));
});
console.log(`R3R3 METRO QUIET: ${passes}/${passes} PASS (source+VM; runtime Android yet to verify)`);
