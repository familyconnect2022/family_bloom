const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const rel = (p) => path.join(root, ...p.split('/'));

const legacyFiles = [
  // Phase 16B.8 hard-restores the proven V4K Chess client. These post-V4K
  // overlay components must not survive a FULL-over-old copy.
  'src/components/chess/ChessPromotionOverlay.tsx',
  'src/components/chess/ChessBattleEffects.tsx',
  'src/components/chess/ChessResultToast.tsx',
  'PHASE_16B5_BUILD_REPORT.md',
  'PHASE_16B6_BUILD_REPORT.md',
  'PHASE_16B7_BUILD_REPORT.md',
  'PHASE_16B8_BUILD_REPORT.md',
  'PHASE_16B9_BUILD_REPORT.md',
  'PHASE_16B10_BUILD_REPORT.md',
  'PHASE_16B11_BUILD_REPORT.md',
  'PHASE_16B12_BUILD_REPORT.md',
  'PHASE_16B13_BUILD_REPORT.md',
  'PHASE_16B14_BUILD_REPORT.md',
  'PHASE_16B15_BUILD_REPORT.md',
  'PHASE_16B16_BUILD_REPORT.md',
  'PHASE_16B17_BUILD_REPORT.md',
  'PHASE_16B18_BUILD_REPORT.md',
  'PHASE_17_BUILD_REPORT.md',
  'PHASE_17_1_BUILD_REPORT.md',
  'PHASE_17_2_BUILD_REPORT.md',
  'PHASE_17_3_BUILD_REPORT.md',
  'PHASE_17_3A_BUILD_REPORT.md',
  'PHASE_17_3B_BUILD_REPORT.md',
  'PHASE_17_3C_BUILD_REPORT.md',
  'PHASE_17_3D_BUILD_REPORT.md',
  'PHASE_17_3E_BUILD_REPORT.md',
  'PHASE_17_4_BUILD_REPORT.md',
  'PHASE_17_4A_BUILD_REPORT.md',
  'PHASE_17_5_BUILD_REPORT.md',
  'PHASE_17_5A_BUILD_REPORT.md',
  'PHASE_17_5B_BUILD_REPORT.md',
  'PHASE_17_5C_BUILD_REPORT.md',
  'PHASE_17_6_BUILD_REPORT.md',
  'PHASE_17_7_BUILD_REPORT.md',
  'PHASE_17_8_BUILD_REPORT.md',
  'PHASE_17_8A_BUILD_REPORT.md',
  'PHASE_17_8B_BUILD_REPORT.md',
  'PHASE_17_8C_BUILD_REPORT.md',
  'PHASE_17_8D_BUILD_REPORT.md',
  'PHASE_17_8E_BUILD_REPORT.md',
  'PHASE_17_9A_BUILD_REPORT.md',
  'PHASE_17_9A1_BUILD_REPORT.md',
  'PHASE_17_9A2_BUILD_REPORT.md',
  'PHASE_17_9A3_BUILD_REPORT.md',
  'PHASE_17_9A4_BUILD_REPORT.md',
  'PHASE_17_9A5_BUILD_REPORT.md',
  'PHASE_17_9A6_BUILD_REPORT.md',
  'PHASE_17_9A7_BUILD_REPORT.md',
  'PHASE_17_9A8_BUILD_REPORT.md',
  'PHASE_17_9A9_BUILD_REPORT.md',
  'PHASE_17_9A10_BUILD_REPORT.md',
  'PHASE_17_9A11_BUILD_REPORT.md',
  'PHASE_17_9A12_BUILD_REPORT.md',
  'PHASE_17_9A13_BUILD_REPORT.md',
  'src/components/system/AppWidePerformanceDriver.tsx',
  'src/components/system/GuidedPerformanceOverlay.tsx',
  'src/services/performance/appWidePerformanceService.ts',
  'src/services/homeHub/homeHubService.ts',
  'src/services/performance/finalPerformanceGateService.ts',
  'src/services/performance/automatedRegressionService.ts',
  'src/app/(internal)/performance-test.tsx',
  'scripts/android/Family_Bloom_Phase15B_Performance_Run.bat',
  'scripts/android/Family_Bloom_Phase15B_Performance_Run.ps1',
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
  'assets/images/chess/pieces-webp-default',
];

for (const file of legacyFiles) fs.rmSync(rel(file), { force: true });
for (const dir of legacyDirs) fs.rmSync(rel(dir), { recursive: true, force: true });

function deleteGeneratedJsShadows(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) deleteGeneratedJsShadows(full);
    else if (entry.isFile() && entry.name.endsWith('.js')) {
      const stem = full.slice(0, -3);
      if (fs.existsSync(`${stem}.ts`) || fs.existsSync(`${stem}.tsx`)) fs.rmSync(full, { force: true });
    }
  }
}
deleteGeneratedJsShadows(rel('src'));
deleteGeneratedJsShadows(rel('server/src'));

// Retired Phase 17.2–17.5C guided/auto-runner static gates are intentionally
// removed from the clean checkpoint. They describe architectures no longer mounted.
for (const entry of fs.readdirSync(rel('scripts'), { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (/^test-phase17_(?:2|3|4|5)/.test(entry.name) || /^test-phase15b/.test(entry.name)) {
    fs.rmSync(path.join(rel('scripts'), entry.name), { force: true });
  }
}

fs.rmSync(rel('.expo'), { recursive: true, force: true });
fs.rmSync(rel('node_modules/.cache'), { recursive: true, force: true });

const mustNotExist = [
  'src/app/chess-game/[gameId].tsx',
  'src/app/chess-lobby.tsx',
  'src/app/performance-test.tsx',
  'src/app/(internal)/performance-test.tsx',
  'src/components/system/AppWidePerformanceDriver.tsx',
  'src/components/system/GuidedPerformanceOverlay.tsx',
  'src/services/performance/appWidePerformanceService.ts',
  'src/services/homeHub/homeHubService.ts',
];
const leftovers = mustNotExist.filter((p) => fs.existsSync(rel(p)));
if (leftovers.length) {
  console.error('[FB_OVERLAY_CLEAN] FAIL legacy routes remain:', leftovers.join(', '));
  process.exit(1);
}
console.log('[FB_OVERLAY_CLEAN] PASS legacy routes, retired performance runner, JS shadows and local caches cleared');
