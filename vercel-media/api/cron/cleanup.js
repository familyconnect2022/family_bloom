import { method, response, safeError, store, destroyMomentAsset } from '../../lib/media.js';

// 20:00 UTC = 03:00 ICT, once daily. Vercel Hobby can invoke within the hour.
export default async function handler(req, res) {
  try {
    method(req, 'GET');
    if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`)
      return response(res, 401, { ok: false, error: 'Unauthorized cron' });
    const db = store();
    const pending = await db.collection('media_assets').where('status', '==', 'cleanup_pending').limit(80).get();
    const stuck = await db.collection('media_assets').where('status', '==', 'uploading').limit(150).get();
    const abandonedCutoff = Date.now() - 6 * 3600_000;
    const resumableCutoff = Date.now() - 72 * 3600_000;
    const failed = await db.collection('media_assets').where('status', '==', 'failed').limit(100).get();
    const uploaded = await db.collection('media_assets').where('status', '==', 'uploaded').limit(100).get();
    const targets = pending.docs.filter(doc => doc.data().purpose === 'moment');
    for (const doc of stuck.docs) {
      const a = doc.data();
      if (a.purpose !== 'moment' || !a.createdAt || Date.parse(a.createdAt) > abandonedCutoff) continue;
      // Stop treating a vanished phone's upload as active. Never touch attached assets.
      await db.runTransaction(async tx => {
        const fresh = await tx.get(doc.ref);
        if (fresh.exists && fresh.data().status === 'uploading' && Date.parse(fresh.data().createdAt) < abandonedCutoff)
          tx.update(doc.ref, { status: 'cleanup_pending', updatedAt: new Date().toISOString() });
      });
      targets.push(doc);
    }
    for (const doc of [...failed.docs, ...uploaded.docs]) {
      const a = doc.data();
      if (a.purpose !== 'moment' || !a.createdAt || Date.parse(a.createdAt) > resumableCutoff) continue;
      await db.runTransaction(async tx => {
        const fresh = await tx.get(doc.ref);
        if (fresh.exists && ['failed','uploaded'].includes(fresh.data().status) && Date.parse(fresh.data().createdAt) < resumableCutoff)
          tx.update(doc.ref, { status: 'cleanup_pending', updatedAt: new Date().toISOString() });
      });
      targets.push(doc);
    }
    let cleaned = 0, pendingRetry = 0;
    for (const doc of targets.slice(0, 80)) {
      try {
        const outcome = await destroyMomentAsset(doc.ref);
        if (outcome === 'deleted') cleaned++; else pendingRetry++;
      } catch { pendingRetry++; }
    }
    return response(res, 200, { ok: true, scanned: targets.length, cleaned, pendingRetry });
  } catch (error) { return safeError(res, error); }
}
