const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass=0, fail=0;
function assert(ok,msg){ if(ok){console.log('PASS',msg);pass++;} else {console.log('FAIL',msg);fail++;} }

const svc=read('src/services/performance/appWidePerformanceService.ts');
const driver=read('src/components/system/AppWidePerformanceDriver.tsx');
const lab=read('src/app/(internal)/performance-test.tsx');
const board=read('src/components/chess/ChessBoard.tsx');
const piece=read('src/components/chess/v2/PieceLayer.tsx');
const interaction=read('src/components/chess/v2/InteractionLayer.tsx');
const game=read('src/app/(chess)/chess-game/[gameId].tsx');

assert(svc.includes('runnerReady: boolean') && svc.includes('markRunnerReady ='), 'runner has explicit visible-route readiness handshake');
assert(driver.includes('if (!state.runnerReady)') && driver.includes('pathname !== "/performance-test"') && driver.includes('[FB_PERF_DRIVER] BOOTSTRAP'), 'global driver owns Android Lab bootstrap and visible-route readiness');
assert(lab.includes('appWidePerformanceService.start()') && !lab.split('const startAppWideSweep = () => {')[1].split('const copyAppWideSweepReport')[0].includes('router.'), 'Performance Lab starts state only; global driver owns startup navigation');
assert(!lab.includes('router.dismissTo(run.firstRoute'), 'old dismissTo startup path removed');
assert(driver.includes('router.replace(route as never)') && !driver.includes('router.navigate(route as never)'), 'sweep has one visible route owner and uses replace between steps');
assert(!svc.includes('pathname: "/(tabs)/'), 'route sweep uses public URLs instead of physical route-group paths');
assert(!svc.includes('file:///') && !svc.includes('pathname: "file:'), 'route matrix cannot emit file scheme URLs');
assert(svc.includes('return step.params && Object.keys(step.params).length') && svc.includes('const common = { appSweep: "1"'), 'production routes stay query-clean while synthetic routes keep automation params');
assert(driver.includes('state.currentStep / Math.max(1, state.totalSteps)') && driver.includes('Đã xong ${state.currentStep}'), 'HUD progress uses same currentStep source as the state machine');

// Build public static route set by stripping Expo route groups and index filenames.
const appRoot=path.join(root,'src/app');
const publicRoutes=new Set();
function walk(dir){
  for(const name of fs.readdirSync(dir)){
    const full=path.join(dir,name); const st=fs.statSync(full);
    if(st.isDirectory()) walk(full);
    else if(/\.(tsx|ts)$/.test(name) && !name.startsWith('_layout')){
      let rel=path.relative(appRoot,full).replace(/\\/g,'/').replace(/\.(tsx|ts)$/,'');
      const parts=rel.split('/').filter(x=>!/^\(.*\)$/.test(x));
      if(parts[parts.length-1]==='index') parts.pop();
      const route='/' + parts.join('/');
      publicRoutes.add(route==='/'?'/':route.replace(/\/$/,''));
    }
  }
}
walk(appRoot);
const productionRouteBlock = svc.split('] as const;')[0];
const hrefs=[...productionRouteBlock.matchAll(/type: "route"[^\n]*pathname: "([^"]+)"/g)].map(m=>m[1]);
assert(hrefs.length===29, '29 production route steps are still present');
const missing=hrefs.filter(h=>!publicRoutes.has(h));
assert(missing.length===0, `all production sweep paths resolve to real Expo routes${missing.length?': '+missing.join(', '):''}`);

assert(board.includes('<SquareLayer') && board.includes('style={[StyleSheet.absoluteFill, fadeStyle]}'), 'Chess board uses the proven V4K single visual plane');
assert(!board.includes('squarePlane:{') && !board.includes('piecePlane:{') && !board.includes('interactionPlane:{'), 'regression-prone full-size plane wrappers stay removed');
assert(piece.includes('style={StyleSheet.absoluteFill}'), 'PieceLayer is the proven V4K absolute-fill surface');
assert(interaction.includes('Gesture.Tap()') && interaction.includes('style={StyleSheet.absoluteFill}'), 'empty-square input uses the proven V4K RNGH tap surface');
assert(board.includes('const onTapPiece = useCallback') && board.includes('const onPressSquare = useCallback'), 'piece selection and destination taps stay on the proven V4K split input paths');
assert(!game.includes('measureInWindow') && !game.includes('boardWindowPortalSlot') && !game.includes('boardSurfaceRef'), 'post-V4K board portal/measurement layers are absent from the restored game screen');
assert(game.includes('PHONG QUÂN') && game.includes('styles.boardLocalOverlay') && game.includes('const boardPreparing ='), '16B.9 keeps promotion/preparing board-local without window measurement portals');

console.log(`Phase 15B.3 State Machine + Chess Layering: ${pass} PASS / ${fail} FAIL`);
process.exit(fail?1:0);
