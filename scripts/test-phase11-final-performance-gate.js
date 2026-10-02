const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const gate = read('src/services/performance/finalPerformanceGateService.ts');
assert(gate.includes('FINAL_PERFORMANCE_GATE_STEPS'), 'Final gate must define an explicit deterministic step matrix');
for (const count of [50, 100, 200, 300, 500]) {
  assert(gate.includes(`type: "graph", count: ${count}`), `Final gate missing Graph ${count}`);
}
for (const kind of ['moments', 'timeline', 'events', 'memorybook']) {
  assert(gate.includes(`kind: "${kind}", count: 100`), `Final gate missing ${kind} 100`);
  assert(gate.includes(`kind: "${kind}", count: 200`), `Final gate missing ${kind} 200`);
}
assert(gate.includes('startInteractionProbe(120_000, "final_gate")'), 'Final gate must use the dedicated normalized event-loop probe mode');
assert(gate.includes('performanceTestService.reset()'), 'Final gate must isolate metrics from old runs');
assert(!gate.includes('@react-native-firebase'), 'Final performance gate must not depend on Firebase');
assert(!gate.includes('eventService') && !gate.includes('momentsService'), 'Final performance gate must not write user data');

const graph = read('src/app/performance-graph-test.tsx');
assert(graph.includes('finalPerformanceGateService.isActiveStep'), 'Graph screen must recognize automated gate routes');
assert(graph.includes('advanceFinalGate("PASS"'), 'Graph screen must auto-advance after full mount');
assert(graph.includes('timeout > 25s'), 'Graph screen needs a timeout so the gate cannot hang forever');

const stress = read('src/app/performance-data-test.tsx');
assert(stress.includes('jumpToEnd(() => advanceFinalGate("PASS"'), 'Stress screen must measure long-list jump before auto-advance');
assert(stress.includes('timeout > 15s'), 'Stress screen needs a timeout so the gate cannot hang forever');
assert(stress.includes('onScrollToIndexFailed={handleTimelineScrollToIndexFailed}'), 'Timeline SectionList must handle unmeasured scrollToLocation targets');
assert(stress.includes('Stress timeline scroll fallback'), 'Timeline fallback must be visible in the performance report');

const regression = read('src/services/performance/automatedRegressionService.ts');
assert(regression.includes('evaluateFinalGate'), 'Regression evaluator must expose strict final-gate evaluation');
assert(regression.includes('Final gate · Graph coverage'), 'Final gate must fail on incomplete Graph coverage');
assert(regression.includes('Final gate · Stress coverage'), 'Final gate must fail on incomplete stress coverage');
assert(regression.includes('Final gate · Event-loop probe coverage'), 'Final gate must fail when the normalized event-loop probe did not finish');
assert(regression.includes('Final gate event-loop delay p95'), 'Final gate must score normalized event-loop delay separately from real interaction');
assert(regression.includes('Interaction event-loop delay p95'), 'Real-use interaction probe must keep stricter event-loop guardrails');
assert(regression.includes('mode === "interaction"'), 'Synthetic Final Gate timings must not be scored as app-wide navigation responsiveness');

const perf = read('src/services/performance/performanceTestService.ts');
assert(perf.includes('actual callback time minus the time the callback was scheduled for'), 'Probe must document normalized event-loop delay semantics');
assert(perf.includes('Final gate event-loop delay'), 'Final Gate probe must emit dedicated metrics');
assert(perf.includes('Interaction event-loop delay'), 'Real interaction probe must emit dedicated metrics');
assert(perf.includes('sample coverage'), 'Probe must report sampling coverage so long busy periods are visible');
assert(!perf.includes('recordMetric("JS stall p95"'), 'Legacy ambiguous JS stall p95 metric must not drive Hotfix #3');

const lab = read('src/app/performance-test.tsx');
assert(lab.includes('Chạy Final Performance Gate'), 'Performance Lab must expose the one-tap final gate');
assert(lab.includes('Sao chép Final Gate report'), 'Performance Lab must export a copyable final report');
assert(lab.includes('không ghi Firebase'), 'UI must state that the automated performance gate is RAM-only');

console.log('PASS Phase 11 Final Performance Gate automation + safety + coverage contracts');
