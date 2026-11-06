const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const source = ts.transpileModule(fs.readFileSync(path.join(__legacyScriptsDir, '../src/context/TabStartupContext.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
}).outputText;
function session(enabled=true) {
  const slots=[]; let cursor=0; let dirty=false; let effects=[]; let timerId=0; const timers=new Map();
  const equal=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const memo=(fn,deps)=>{const i=cursor++; if(!slots[i]||!equal(slots[i].deps,deps)) slots[i]={deps,value:fn()}; return slots[i].value;};
  const react={
    createContext:()=>({Provider:'Provider'}), useContext:()=>{},
    useState:(initial)=>{const i=cursor++; if(!slots[i]) slots[i]={value:typeof initial==='function'?initial():initial}; return [slots[i].value,value=>{const next=typeof value==='function'?value(slots[i].value):value;if(!Object.is(next,slots[i].value)){slots[i].value=next;dirty=true;}}];},
    useMemo:memo,useCallback:(fn,deps)=>memo(()=>fn,deps),
    useEffect:(fn,deps)=>{const i=cursor++; if(!slots[i]||!equal(slots[i].deps,deps)){const old=slots[i];slots[i]={deps};effects.push(()=>{old?.cleanup?.();slots[i].cleanup=fn();});}},
  };
  const exports={};
  vm.runInNewContext(source,{exports,require:(id)=>id==='react'?react:id==='react/jsx-runtime'?{jsx:(type,props)=>({type,props})}:{},setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:(id)=>timers.delete(id)});
  let value;
  function render(){let attempts=0;do{dirty=false;cursor=0;effects=[];value=exports.TabStartupProvider({children:null,enabled}).props.value;effects.forEach(fn=>fn());assert.ok(++attempts<30,'no render loop');}while(dirty);return value;}
  return {render,timers,report:(name,ready)=>{render().report(name,ready);return render();}};
}
const login=session(false);
assert.equal(login.render().ready,true,'auth/gateway must not wait for tabs');
assert.equal(login.timers.size,0);
const active=session(true);
assert.equal(active.render().ready,false,'authenticated family waits for active surface commit');
active.report('home',false);
assert.equal(active.render().ready,false);
assert.equal([...active.timers.values()][0].ms,2500,'bounded startup safety timeout');
active.report('home',true);
assert.equal(active.render().ready,true,'first active surface releases readiness');
assert.equal(active.timers.size,0,'deadline clears after release');
active.report('planner',false);
assert.equal(active.render().ready,true,'later hidden/preloaded work cannot re-block splash');
const familyB=session(true);
familyB.report('planner',false);
assert.equal(familyB.render().ready,false,'new session starts unready again');
[...familyB.timers.values()][0].fn();
assert.equal(familyB.render().ready,true,'broken active surface cannot trap splash forever');
console.log('Startup gate: PASS (visual active-surface readiness, latch, bounded fallback, session reset)');
