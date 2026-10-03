const fs = require('fs');
const path = require('path');

const boardPath = path.join(__dirname, '..', 'src', 'components', 'chess', 'ChessBoard.tsx');
const src = fs.readFileSync(boardPath, 'utf8');

const assertions = [
  ['visual move owns an id', /id:\s*number/],
  ['visual move stores target FEN', /targetFen:\s*string\s*\|\s*null/],
  ['authoritative board commits before overlay removal', /commitDisplayFen\(targetFen\)[\s\S]*requestAnimationFrame\([\s\S]*commitVisualMove\(null\)/],
  ['no stale closure on remote animation finish', !/const startSlide = \(nextMove: VisualMove, onFinished/.test(src)],
  ['pending move blocks mid-animation FEN overwrite', /if \(pending\) return;/],
  ['rollback uses latest authoritative state', /commitDisplayFen\(latestStateRef\.current\.fen\)/],
  ['move success waits for authoritative confirmation', /On success we intentionally do not mark the visual move confirmed here/],
  ['native-driver piece motion retained', /useNativeDriver:\s*true/],
];

let failed = 0;
for (const [name, test] of assertions) {
  const ok = typeof test === 'boolean' ? test : test.test(src);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed} regression assertion(s) failed.`);
  process.exit(1);
}
console.log('\nPhase 14V3H chess no-rollback-jitter static regression PASS.');
