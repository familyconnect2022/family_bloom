const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const soundscapePath = path.join(root, 'src/components/games/useBoardGameSoundscape.ts');
const chessSoundscapePath = path.join(root, 'src/components/chess/useChessSoundscape.ts');
const soundscape = fs.readFileSync(soundscapePath, 'utf8');
const chessSoundscape = fs.readFileSync(chessSoundscapePath, 'utf8');

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

let nativeBytes = 0;
for (const name of board) {
  const rel = `assets/audio/board-game/${name}.mp3`;
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { fail(`${rel} missing`); continue; }
  const size = fs.statSync(file).size;
  nativeBytes += size;
  if (!isMp3(file)) fail(`${rel} is not a valid MP3 payload`);
  else pass(`${rel} valid (${size} bytes)`);
  if (!soundscape.includes(`${name}.mp3`)) fail(`${name}.mp3 is not statically required by board soundscape`);
  for (const retiredExt of ['m4a', 'ogg']) {
    if (fs.existsSync(path.join(root, `assets/audio/board-game/${name}.${retiredExt}`))) fail(`${name}.${retiredExt} should not remain in native assets`);
  }
}
if (nativeBytes > 32 * 1024) pass(`exact supplied MP3 pack present (${nativeBytes} bytes)`);
else fail(`supplied MP3 pack suspiciously small (${nativeBytes} bytes)`);

if (fs.existsSync(path.join(root, 'assets/audio/chess'))) fail('retired generated assets/audio/chess bank still exists');
else pass('retired generated Chess WAV bank removed');

if (chessSoundscape.includes('useBoardGameSoundscape') && !chessSoundscape.includes('CHESS_SOURCES')) pass('Chess consumes only the supplied board-game set');
else fail('Chess still owns a competing generated sound bank');

if (soundscape.includes('lastAttachAttemptAtRef') && soundscape.includes('retryCount < 3') && soundscape.includes('Date.now() - requestedAt > 140') && soundscape.includes('player.replace(source)')) pass('native cue attach has bounded current-request recovery');
else fail('native cue bounded recovery missing');

if (!soundscape.includes('Date.now() - startedAt >= 1600') && !soundscape.includes('setPlayersReady(true)')) pass('no timeout can falsely mark unloaded audio ready');
else fail('legacy false-positive audio readiness timeout still present');

process.exit(ok ? 0 : 1);
