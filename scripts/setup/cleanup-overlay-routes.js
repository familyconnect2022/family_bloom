const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const rel = (p) => path.join(root, ...p.split('/'));

const legacyFiles = [
  // Phase 16B.8 hard-restores the proven V4K Chess client. These post-V4K
  // overlay components must not survive a FULL-over-old copy.
  'src/components/chess/ChessPromotionOverlay.tsx',
  'src/components/chess/ChessResultToast.tsx',
  'PHASE_16B5_BUILD_REPORT.md',
  'PHASE_16B6_BUILD_REPORT.md',
  'PHASE_16B7_BUILD_REPORT.md',
  'src/app/chess-history.tsx',
  'src/app/chess-lobby.tsx',
  'src/app/create-profile.tsx',
  'src/app/family-gateway.tsx',
  'src/app/family-graph.tsx',
  'src/app/family-graph-admin.tsx',
  'src/app/family-graph-person-editor.tsx',
  'src/app/family-graph-proposals.tsx',
  'src/app/family-graph-relationship-editor.tsx',
  'src/app/family-join-requests.tsx',
  'src/app/family-memberships.tsx',
  'src/app/family-select.tsx',
  'src/app/family-timeline.tsx',
  'src/app/home-board.tsx',
  'src/app/home-fund.tsx',
  'src/app/home-game-create.tsx',
  'src/app/home-games.tsx',
  'src/app/home-music.tsx',
  'src/app/home-polls.tsx',
  'src/app/home-time-capsule-compose.tsx',
  'src/app/home-time-capsule-demo.tsx',
  'src/app/home-time-capsules.tsx',
  'src/app/home-whispers.tsx',
  'src/app/memory-book.tsx',
  'src/app/notification-preferences.tsx',
  'src/app/notifications.tsx',
  'src/app/performance-data-test.tsx',
  'src/app/performance-graph-test.tsx',
  'src/app/performance-test.tsx',
  'src/app/profile.tsx',
];

const legacyDirs = [
  'src/app/chat',
  'src/app/chess-game',
  'src/app/event',
  'src/app/home-game',
  'src/app/home-kitchen',
  'src/app/home-time-capsule',
  'src/app/member',
];

for (const file of legacyFiles) fs.rmSync(rel(file), { force: true });
for (const dir of legacyDirs) fs.rmSync(rel(dir), { recursive: true, force: true });

function deleteGeneratedJs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) deleteGeneratedJs(full);
    else if (entry.isFile() && entry.name.endsWith('.js')) fs.rmSync(full, { force: true });
  }
}
deleteGeneratedJs(rel('src'));
deleteGeneratedJs(rel('server/src'));

fs.rmSync(rel('.expo'), { recursive: true, force: true });
fs.rmSync(rel('node_modules/.cache'), { recursive: true, force: true });

const mustNotExist = [
  'src/app/chess-game/[gameId].tsx',
  'src/app/chess-lobby.tsx',
  'src/app/performance-test.tsx',
];
const leftovers = mustNotExist.filter((p) => fs.existsSync(rel(p)));
if (leftovers.length) {
  console.error('[FB_OVERLAY_CLEAN] FAIL legacy routes remain:', leftovers.join(', '));
  process.exit(1);
}
console.log('[FB_OVERLAY_CLEAN] PASS legacy duplicate routes and local Metro caches cleared');
