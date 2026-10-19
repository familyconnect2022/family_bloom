const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/scheduleIdleSequence.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
function harness() {
  let id = 0;
  const timers = new Map();
  const idle = new Map();
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    setTimeout: (fn) => { timers.set(++id, fn); return id; },
    clearTimeout: (key) => timers.delete(key),
    requestIdleCallback: (fn) => { idle.set(++id, fn); return id; },
    cancelIdleCallback: (key) => idle.delete(key),
  });
  const flushOne = (queue) => {
    const [key, callback] = queue.entries().next().value;
    queue.delete(key);
    callback();
  };
  return { start: exports.scheduleIdleSequence, timers, idle, flushOne };
}

const h = harness();
const prepared = [];
const stop = h.start(['moments', 'planner', 'family'], (name) => prepared.push(name));
assert.equal(prepared.length, 0, 'must not mount tabs during the initial render');
h.flushOne(h.timers);
assert.equal(prepared.length, 0, 'busy JS frame must wait for idle');
h.flushOne(h.idle);
assert.deepEqual(prepared, ['moments'], 'only one tab per idle window');
assert.equal(h.timers.size, 1, 'remaining tabs are staggered');
h.flushOne(h.timers);
const lateCallback = [...h.idle.values()][0];
stop();
assert.equal(h.idle.size, 0);
assert.equal(h.timers.size, 0);
lateCallback();
assert.deepEqual(prepared, ['moments'], 'cancelled callback must not mount after background/unmount');

const resumed = h.start(['planner', 'family'], (name) => prepared.push(name));
while (h.timers.size) { h.flushOne(h.timers); h.flushOne(h.idle); }
assert.deepEqual(prepared, ['moments', 'planner', 'family']);
assert.equal(h.timers.size + h.idle.size, 0, 'finite queue must stop scheduling');
resumed();

const early = harness();
early.start(['moments'], () => assert.fail('cancel before timer'))();
assert.equal(early.timers.size + early.idle.size, 0);
early.start([], () => assert.fail('empty queue'));
assert.equal(early.timers.size + early.idle.size, 0);
console.log('Tab warmup scheduling: PASS (idle-only, sequential, cancellation, resume, completion)');
