/** Public server URL contract: safe, no secret, no HTTP request and no node_modules. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'../../..');
const read=(s)=>fs.readFileSync(path.join(ROOT,s),'utf8');
const RENDER='https://render-chess-xiangqi.onrender.com';
const OLD='https://family-bloom-chess.onrender.com';
const MEDIA='https://vercelfamilybloommedia.vercel.app';
const cfg=read('src/config/env.ts');
assert(cfg.includes('DEFAULT_CHESS_SOCKET_URL = "'+RENDER+'"'), 'runtime Render fallback must use S1');
assert(cfg.includes('DEFAULT_MOMENT_MEDIA_API_URL = "'+MEDIA+'"'), 'media fallback');
assert(cfg.includes('LEGACY_CHESS_SOCKET_URL = "'+OLD+'"'), 'legacy URL migration safety');
assert(cfg.includes('chessSocketUrl: chessEnvUrl || chessExtraUrl || DEFAULT_CHESS_SOCKET_URL'), 'both games share resolved ENV.chessSocketUrl');
const fn=require(path.join(ROOT,'app.config.js'));
const before=process.env.EXPO_PUBLIC_CHESS_SOCKET_URL;
try {
 for(const x of [undefined, '',OLD,OLD+'/']) {
   if(x===undefined) delete process.env.EXPO_PUBLIC_CHESS_SOCKET_URL;
   else process.env.EXPO_PUBLIC_CHESS_SOCKET_URL=x;
   const val=fn({config:{extra:{}}}).extra.chessSocketUrl;
   assert.equal(val,RENDER,'Expo extra should skip missing or legacy .env URL');
 }
 process.env.EXPO_PUBLIC_CHESS_SOCKET_URL=RENDER;
 assert.equal(fn({config:{extra:{}}}).extra.chessSocketUrl,RENDER);
 process.env.EXPO_PUBLIC_CHESS_SOCKET_URL='https://specific-render-test.onrender.com';
 assert.equal(fn({config:{extra:{}}}).extra.chessSocketUrl,'https://specific-render-test.onrender.com', 'explicit custom override preserved');
 delete process.env.EXPO_PUBLIC_CHESS_SOCKET_URL;
 assert.equal(fn({config:{extra:{chessSocketUrl:OLD}}}).extra.chessSocketUrl,RENDER, 'stale app.json extra ignored');
} finally {
 if(before===undefined)delete process.env.EXPO_PUBLIC_CHESS_SOCKET_URL;
 else process.env.EXPO_PUBLIC_CHESS_SOCKET_URL=before;
}
const eas=JSON.parse(read('eas.json'));
const env=eas.build['family-bloom-test'].env;
assert.equal(env.EXPO_PUBLIC_CHESS_SOCKET_URL,RENDER);
assert.equal(env.EXPO_PUBLIC_MOMENT_MEDIA_API_URL,MEDIA);
assert(read('.env.example').includes('EXPO_PUBLIC_CHESS_SOCKET_URL='+RENDER));
assert(read('.env.example').includes('EXPO_PUBLIC_MOMENT_MEDIA_API_URL='+MEDIA));
const ch=read('src/services/chess/chessSocketService.ts');
const xq=read('src/services/xiangqi/xiangqiSocketService.ts');
assert(ch.includes('ENV.chessSocketUrl')&&xq.includes('ENV.chessSocketUrl'));
assert(read('src/app/(internal)/server-status.tsx').includes('ENV.chessSocketUrl'));
assert(read('src/services/media/momentMediaApi.ts').includes('ENV.momentMediaApiUrl'));
for(const s of [RENDER,MEDIA])assert.equal(new URL(s).protocol,'https:');
console.log('[PASS] A3 Render S1 URL and Vercel Media config, legacy migration, both games, EAS build + status UI (offline)');
