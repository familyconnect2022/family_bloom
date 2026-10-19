/** Read-only deployment diagnostic. Offline APK compilation stays supported.
 * `--strict` enforces live Render rollout when manually checking a release. */
const fs = require('node:fs');
const strict = process.argv.includes('--strict');
const fingerprint = 'h21r5-durable-preparation-recovery';
const dotEnv = fs.existsSync('.env') ? fs.readFileSync('.env','utf8') : '';
const match = dotEnv.match(/^EXPO_PUBLIC_CHESS_SOCKET_URL\s*=\s*['"]?([^\s'"#]+)['"]?/m);
const endpoint = process.env.EXPO_PUBLIC_CHESS_SOCKET_URL || match?.[1] || 'https://family-bloom-chess.onrender.com';
(async()=>{
  const url = new URL('/health',endpoint);
  if (url.protocol!=='https:' && !/^localhost$|^127\.0\.0\.1$/.test(url.hostname)) throw new Error('Health probe requires HTTPS');
  const timeout = AbortSignal.timeout(10_000);
  const response = await fetch(url,{signal:timeout,headers:{Accept:'application/json'}});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data?.chessSessionProtocol !== fingerprint) {
    console.log(`[WARN] Render still on old/unverified Chess protocol: ${String(data?.chessSessionProtocol ?? 'missing')}`);
    console.log('[WARN] Deploy server/ via Render before testing H21R5 Chess. An APK build does NOT update Render.');
    if(strict)process.exitCode=1;
  } else console.log('[PASS] Live Render Chess protocol h21r5; durable-recovery backend deployed.');
})().catch(e=>{
  console.log(`[WARN] Cannot verify live Render Chess protocol (${e.message}). APK build remains independent.`);
  console.log('[WARN] Deploy server/ and run: node scripts/setup/check-render-chess-protocol.cjs --strict');
  if(strict)process.exitCode=1;
});
