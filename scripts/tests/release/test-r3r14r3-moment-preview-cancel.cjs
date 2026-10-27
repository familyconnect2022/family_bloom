/* No network / Firebase / Expo dependency: regression contracts for release. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const moment = read('src/app/(tabs)/moments.tsx');
const publish = read('src/context/MomentPublishContext.tsx');
const cloud = read('src/services/media/cloudinaryService.ts');
const api = read('vercel-media/lib/media.js');
const cron = read('vercel-media/api/cron/cleanup.js');
const toast = read('src/components/moments/MomentUploadToast.tsx');
const config = JSON.parse(read('vercel-media/vercel.json'));
const tests = [
 ['10 thumbnail previews: no two-row cap', !moment.includes('selected.slice(0, previewLimit)') && moment.includes('const previewItems = selected;')],
 ['all edited items visible', !moment.includes('.slice(0, previewLimit)')],
 ['grid width measured', moment.includes('onLayout={(event) => setPreviewGridWidth') && moment.includes('SPACING.sm - 2')],
 ['native cancellation controls workers', publish.includes('throwIfCancelled();') && publish.includes('abortRef.current.get(localId)?.abort();')],
 ['no publish from cancelled upload', publish.indexOf('throwIfCancelled();\n      setPendingMomentProgress(task.localId, 100);') >= 0],
 ['client deletion token and signed upload', cloud.includes('delete_by_token') && cloud.includes('signUpload(')],
 ['server checks owner', api.includes('asset.ownerUid !== uid') && api.includes('a.ownerUid !== uid')],
 ['server protects attached media', api.includes("asset.status === 'attached'") && api.includes('post.exists')],
 ['server preserves retry when cloud resource not found', api.includes("result === 'not found'")],
 ['cron checks offline and abandoned', cron.includes('cleanup_pending') && cron.includes('uploading') && cron.includes('uploaded')],
 ['hobby daily cron', config.crons.length === 1 && config.crons[0].schedule === '0 20 * * *'],
 ['toast only cancel touch action', toast.includes('onPress={() => cancelMoment(value.localId)}') && !toast.includes('onPress={() => open')],
 ['no Renderer shared with games', !api.includes('chess') && !api.includes('xiangqi')],
];
for (const [title, ok] of tests) { assert.ok(ok, title); console.log('PASS', title); }
console.log(`PASS ${tests.length}/${tests.length} R3R14R3 Moment contracts`);
