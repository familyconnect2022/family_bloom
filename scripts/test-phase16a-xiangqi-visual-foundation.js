const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));
let pass = 0;
let fail = 0;
function check(name, ok) {
  if (ok) { console.log(`PASS ${name}`); pass += 1; }
  else { console.error(`FAIL ${name}`); fail += 1; }
}

const colors = ['red', 'black'];
const types = ['general', 'advisor', 'elephant', 'chariot', 'horse', 'cannon', 'soldier'];
const assetDir = 'assets/xiangqi';
const assets = colors.flatMap(color => types.map(type => `${assetDir}/${color}_${type}.webp`));
const piece = read('src/components/xiangqi/XiangqiPiece.tsx');
const board = read('src/components/xiangqi/XiangqiBoardPreview.tsx');
const gallery = read('src/components/xiangqi/XiangqiPieceGallery.tsx');
const screen = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const games = read('src/app/(home)/(games)/home-games.tsx');
const layout = read('src/app/_layout.tsx');
const debugBuild = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBuild = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('14 production WebP piece assets exist', assets.every(exists) && assets.length === 14);
check('piece registry maps red and black sets', types.every(t => piece.includes(`red_${t}.webp`) && piece.includes(`black_${t}.webp`)));
check('piece renderer uses image assets, not runtime glyph text', piece.includes('<Image') && !piece.includes('<Text'));
check('piece component exposes five visual states', ['normal','selected','hint','drag','disabled'].every(s => piece.includes(`"${s}"`)));
check('gallery shows seven canonical Xiangqi piece types', types.every(t => gallery.includes(`"${t}"`)));
check('gallery exposes production size matrix', ['32, 40, 48, 56, 64'].every(v => screen.includes(v)));
check('board defines 10 horizontal ranks', board.includes('Array.from({ length: 10 }'));
check('board defines 9 vertical files', board.includes('Array.from({ length: 9 }'));
check('board includes river split and labels', board.includes('riverBand') && board.includes('楚 河') && board.includes('漢 界'));
check('board includes both palace diagonals', board.includes('point(3, 0)') && board.includes('point(5, 2)') && board.includes('point(3, 7)') && board.includes('point(5, 9)'));
check('initial position includes both 9-piece back ranks', (board.match(/r-back-/g) || []).length >= 1 && board.includes('row: 9') && board.includes('row: 0'));
check('initial position exports 32 pieces by construction', board.includes('XIANGQI_INITIAL_POSITION') && board.includes('[0, 2, 4, 6, 8]'));
check('board positions pieces on intersections, not square centers', board.includes('piece.col * step - pieceSize / 2') && board.includes('piece.row * step - pieceSize / 2'));
check('preview route exists', exists('src/app/(xiangqi)/xiangqi-preview.tsx'));
check('root stack registers Xiangqi preview', layout.includes('(xiangqi)/xiangqi-preview'));
check('Games hub exposes Xiangqi entry', games.includes('Cờ tướng Nhà Mình') && games.includes('/xiangqi-preview'));
check('preview clearly avoids fake rules before engine integration', screen.includes('chưa nối luật') || screen.includes('CHƯA NỐI LUẬT'));
check('Xiangqi visual module does not import Chess socket/rules', ![piece,board,gallery,screen].join('\n').match(/chessSocket|chess\.js|socket\.io|Chess\(/));
check('piece visuals preserve actual assets under wrapper effects', piece.includes('PIECE_IMAGES[color][type]') && piece.includes('selectedHalo') && piece.includes('hintHalo'));
check('board surface is relative and pieces have explicit higher plane', board.includes('position: "relative"') && board.includes('zIndex: 20'));
check('debug build runs Phase 16A gate', debugBuild.includes('phase16a:check'));
check('release build runs Phase 16A gate', releaseBuild.includes('phase16a:check'));

console.log(`Phase 16A Xiangqi Visual Foundation: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
