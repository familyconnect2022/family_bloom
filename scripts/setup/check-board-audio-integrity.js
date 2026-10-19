const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const board = [
  'game-start', 'move-self', 'move-opponent', 'capture', 'move-check', 'castle',
  'promote', 'premove', 'illegal', 'tenseconds', 'game-end',
];
let ok = true;
function pass(message) { console.log(`PASS ${message}`); }
function fail(message) { ok = false; console.error(`FAIL ${message}`); }

function isMp3(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.length < 256) return false;
  if (bytes.subarray(0, 3).toString('ascii') === 'ID3') return true;
  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
}

let totalBytes = 0;
for (const name of board) {
  const rel = `assets/audio/board-game/${name}.mp3`;
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { fail(`${rel} missing`); continue; }
  const size = fs.statSync(file).size;
  totalBytes += size;
  if (!isMp3(file)) fail(`${rel} is not a valid MP3 payload`);
  else pass(`${rel} valid (${size} bytes)`);
  for (const retiredExt of ['m4a', 'ogg', 'wav']) {
    if (fs.existsSync(path.join(root, `assets/audio/board-game/${name}.${retiredExt}`))) fail(`${name}.${retiredExt} should not remain beside canonical MP3`);
  }
}

if (totalBytes > 32 * 1024) pass(`board-game MP3 pack retained (${totalBytes} bytes)`);
else fail(`board-game MP3 pack suspiciously small (${totalBytes} bytes)`);

if (fs.existsSync(path.join(root, 'assets/audio/chess'))) fail('retired generated assets/audio/chess bank still exists');
else pass('no competing generated Chess audio bank');

pass('audio integrity is asset-only; deleted legacy board renderer/soundscape code is not required');
process.exit(ok ? 0 : 1);
