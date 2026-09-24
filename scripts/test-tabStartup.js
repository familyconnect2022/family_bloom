const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ts = require('typescript');
const assert = require('node:assert/strict');
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/context/TabStartupContext.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
}).outputText;
function session() {
  const slots = []; let cursor = 0; let dirty = false; let effects = []; let timerId = 0;
  const timers = new Map();
  const shared = { members: { familyId: 'a', loading: true }, moments: { familyId: 'a', loading: true }, events: { familyId: 'a', upcomingLoading: true, yearlyLoading: true } };
  const equal = (a,b) => a && b && a.length === b.length && a.every((v,i) => Object.is(v,b[i]));
  const memo = (fn,deps) => { const i=cursor++; if (!slots[i] || !equal(slots[i].deps,deps)) slots[i]={deps,value:fn()}; return slots[i].value; };
  const react = {
    createContext: () => ({ Provider: 'Provider' }), useContext: () => {},
    useState: (initial) => { const i=cursor++; if (!slots[i]) slots[i]={value:initial}; return [slots[i].value, value => { const next=typeof value === 'function' ? value(slots[i].value) : value; if (!Object.is(next,slots[i].value)) { slots[i].value=next; dirty=true; } }]; },
    useMemo: memo, useCallback: (fn,deps) => memo(() => fn,deps),
    useEffect: (fn,deps) => { const i=cursor++; if (!slots[i] || !equal(slots[i].deps,deps)) { const old=slots[i]; slots[i]={deps}; effects.push(() => { old?.cleanup?.(); slots[i].cleanup=fn(); }); } },
  };
  const exports = {};
  vm.runInNewContext(source, { exports, require: (id) => {
    if (id === 'react') return react;
    if (id === 'react/jsx-runtime') return { jsx: (type,props) => ({type,props}) };
    return { useFamilyMembersRealtime: () => shared.members, useFamilyMomentsRealtime: () => shared.moments, useFamilyEventsRealtime: () => shared.events };
  }, setTimeout: (fn,ms) => { timers.set(++timerId,{fn,ms}); return timerId; }, clearTimeout: (id) => timers.delete(id) });
  let value;
  function render() { let attempts=0; do { dirty=false; cursor=0; effects=[]; value=exports.TabStartupProvider({children:null}).props.value; effects.forEach(fn => fn()); assert.ok(++attempts<30,'no render loop'); } while(dirty); return value; }
  return { render, shared, timers, report: (name,ready) => { render().report(name,ready); return render(); } };
}
const tasks=['home','moments','planner','family','play'];
const a=session();
assert.equal(a.render().ready,true,'login/profile/gateway must not wait for tabs');
assert.equal(a.timers.size,0);
for (const task of tasks) a.report(task,true);
assert.equal(a.render().ready,false,'mounted screens still wait for data');
a.report('planner',false);
a.shared.members.loading=false; a.shared.moments.loading=false;
a.shared.events.upcomingLoading=false; a.shared.events.yearlyLoading=false;
assert.equal(a.render().ready,false,'calendar must settle');
a.report('planner',true);
assert.equal(a.render().ready,true);
assert.equal(a.timers.size,0,'cancel deadline after readiness');
a.shared.moments.loading=true;
assert.equal(a.render().ready,true,'later refresh must not re-block tabs');
const b=session();
b.report('home',true);
assert.equal(b.render().ready,false,'new family/session waits again');
const timeout=[...b.timers.values()][0];
assert.equal(timeout.ms,8000);
timeout.fn();
assert.equal(b.render().ready,true,'slow or failed network cannot hold startup forever');
const c=session();
for (const task of tasks) c.report(task,true);
c.shared.members.loading=false; c.shared.moments.loading=false; c.shared.events.upcomingLoading=false;c.shared.events.yearlyLoading=false;
c.shared.events.familyId='old-family';
assert.equal(c.render().ready,false,'mismatched family snapshots cannot release');
console.log('Startup gate: PASS (login bypass, data+screen readiness, deadline, latch, session reset, family isolation)');
