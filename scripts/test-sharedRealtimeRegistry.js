const fs = require('fs');
const os = require('os');
const path = require('path');
const ts = require('typescript');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'fb-shared-realtime-'));
const files = [
  'src/constants/performanceTest.ts',
  'src/services/performance/performanceTestService.ts',
  'src/services/realtime/sharedRealtimeRegistry.ts',
];
for (const rel of files) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: rel,
  }).outputText;
  const target = path.join(out, rel.replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, js);
}

const { subscribeSharedRealtime, sharedRealtimeRegistryDebug } = require(path.join(out, 'src/services/realtime/sharedRealtimeRegistry.js'));

let starts = 0;
let stops = 0;
let emitData;
let emitError;
const valuesA = [];
const valuesB = [];
const errors = [];
const start = (onData, onError) => {
  starts += 1;
  emitData = onData;
  emitError = onError;
  return () => { stops += 1; };
};

const stopA = subscribeSharedRealtime({
  key: 'family:a:query', listenerName: 'test.query', start,
  onData: value => valuesA.push(value), onError: error => errors.push(error),
});
const stopB = subscribeSharedRealtime({
  key: 'family:a:query', listenerName: 'test.query', start,
  onData: value => valuesB.push(value), onError: error => errors.push(error),
});
assert.equal(starts, 1, 'identical subscribers must open one underlying listener');
emitData({ n: 1 });
assert.deepEqual(valuesA, [{ n: 1 }]);
assert.deepEqual(valuesB, [{ n: 1 }]);

const valuesLate = [];
const stopLate = subscribeSharedRealtime({
  key: 'family:a:query', listenerName: 'test.query', start,
  onData: value => valuesLate.push(value),
});
assert.equal(starts, 1, 'late subscriber must reuse listener');
assert.deepEqual(valuesLate, [{ n: 1 }], 'late subscriber must receive latest snapshot immediately');

emitError(new Error('temporary'));
assert.equal(errors.length, 2, 'error must fan out to subscribers with error handlers');
stopA();
stopB();
assert.equal(stops, 0, 'underlying listener must stay alive while one subscriber remains');
stopLate();
assert.equal(stops, 1, 'last subscriber must release underlying listener exactly once');
assert.deepEqual(sharedRealtimeRegistryDebug.activeKeys(), []);

let secondStarts = 0;
const stopOther = subscribeSharedRealtime({
  key: 'family:b:query',
  start: () => { secondStarts += 1; return () => {}; },
  onData: () => {},
});
assert.equal(secondStarts, 1, 'different family/query key must own an independent listener');
stopOther();
sharedRealtimeRegistryDebug.clearForTests();

console.log('Shared realtime registry runtime tests: PASS');
