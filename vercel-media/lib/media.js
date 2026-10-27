import crypto from 'node:crypto';
import { cert, getApps, initializeApp, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

function firebase() {
  if (getApps().length) return getApp();
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing');
  return initializeApp({ credential: cert(JSON.parse(json)) });
}
export function store() { return getFirestore(firebase()); }
export async function authorizedUser(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) throw Object.assign(new Error('Firebase Auth required'), { status: 401 });
  const decoded = await getAuth(firebase()).verifyIdToken(header.slice(7), true);
  return decoded.uid;
}
export const response = (res, code, value) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(code).json(value);
};
export function method(req, verb) {
  if (req.method !== verb) throw Object.assign(new Error('Method not allowed'), { status: 405 });
}
export function safeError(res, error) {
  const status = Number(error?.status) || 500;
  return response(res, status, { ok: false, error: status === 500 ? 'MEDIA_SERVER_FAILED' : String(error.message) });
}
function credentials() {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) throw new Error('Cloudinary env is incomplete');
  return { cloudName: CLOUD_NAME, apiKey: API_KEY, secret: API_SECRET };
}
function signParams(params, secret) {
  return crypto.createHash('sha1').update(
    Object.entries(params).filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`).join('&') + secret,
  ).digest('hex');
}
function momentAsset(snapshot) {
  const a = snapshot.data();
  if (!a || a.purpose !== 'moment' || a.entityType !== 'moment' || !['image','video'].includes(a.type))
    throw Object.assign(new Error('Not a Moment asset'), { status: 400 });
  if (typeof a.familyId !== 'string' || !a.familyId || a.familyId.includes('/'))
    throw Object.assign(new Error('Invalid family'), { status: 400 });
  return a;
}
export async function signMomentUpload(uid, assetId) {
  if (typeof assetId !== 'string' || !/^[a-zA-Z0-9_-]{8,180}$/.test(assetId))
    throw Object.assign(new Error('Invalid assetId'), { status: 400 });
  const { cloudName, apiKey, secret } = credentials();
  const ref = store().collection('media_assets').doc(assetId);
  let familyId;
  await store().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw Object.assign(new Error('Asset missing'), { status: 404 });
    const asset = momentAsset(snap);
    if (asset.ownerUid !== uid) throw Object.assign(new Error('Forbidden'), { status: 403 });
    if (asset.status !== 'uploading') throw Object.assign(new Error('Upload no longer active'), { status: 409 });
    familyId = asset.familyId;
    const folder = `family_bloom/families/${familyId}/moments`;
    const plannedId = `${folder}/${assetId}`;
    if (asset.publicId && asset.publicId !== plannedId)
      throw Object.assign(new Error('Unexpected asset public ID'), { status: 409 });
    tx.update(ref, { publicId: plannedId, updatedAt: new Date().toISOString() });
  });
  const folder = `family_bloom/families/${familyId}/moments`;
  const timestamp = Math.floor(Date.now()/1000);
  const params = { folder, overwrite: 'false', public_id: assetId, return_delete_token: 'true', timestamp };
  return { cloudName, apiKey, timestamp, signature: signParams(params, secret),
    folder, publicId: assetId, returnDeleteToken: true, overwrite: false };
}
export async function destroyMomentAsset(ref) {
  const { cloudName, apiKey, secret } = credentials();
  const snapshot = await ref.get();
  if (!snapshot.exists) return 'gone';
  const asset = momentAsset(snapshot);
  if (asset.status === 'attached') return 'attached';
  if (asset.status === 'deleted') return 'deleted';
  if (asset.status !== 'cleanup_pending') return 'not_pending';
  // A provider status alone is not enough: a late Firestore batch may attach
  // the asset while the cleanup request is in flight. Protect published posts.
  const post = await store().doc(`families/${asset.familyId}/moments/${asset.entityId}`).get();
  if (post.exists && (post.data()?.mediaAssetIds || []).includes(ref.id)) {
    await ref.update({ status: 'attached', updatedAt: new Date().toISOString() });
    return 'attached';
  }
  if (!asset.publicId) {
    // An old unsigned upload may have reached Cloudinary while its response was lost.
    // Do not falsely report successful deletion without a known provider identifier.
    // Move out of the cron queue so one legacy unknown file cannot starve others.
    await ref.update({ status: 'cleanup_needs_review', updatedAt: new Date().toISOString() });
    return 'unknown_public_id';
  }
  const timestamp = Math.floor(Date.now()/1000);
  const body = { public_id: asset.publicId, timestamp };
  const signature = signParams(body, secret);
  const params = new URLSearchParams({ ...body, timestamp: String(timestamp), api_key: apiKey, signature });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let result;
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${asset.type}/destroy`, {
      method: 'POST', body: params, signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Cloudinary destroy HTTP ${res.status}`);
    result = (await res.json()).result;
  } finally { clearTimeout(timeout); }
  if (!['ok','not found'].includes(result)) return 'retry';
  // A signed upload can finish after the cancellation request. Keep retrying
  // a not-found resource throughout the possible in-flight upload window.
  const time = Date.parse(asset.createdAt || '');
  if (result === 'not found' && (!Number.isFinite(time) || Date.now() - time < 90*60_000)) return 'retry_late_upload';
  await store().runTransaction(async (tx) => {
    const current = await tx.get(ref);
    if (current.exists && current.data().status === 'cleanup_pending') {
      tx.update(ref, { status: 'deleted', updatedAt: new Date().toISOString() });
    }
  });
  return 'deleted';
}
export async function requestCleanupForUser(uid, assetIds) {
  if (!Array.isArray(assetIds) || !assetIds.length || assetIds.length > 10 ||
    assetIds.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9_-]{8,180}$/.test(id)))
    throw Object.assign(new Error('Invalid asset IDs'), { status: 400 });
  const unique = [...new Set(assetIds)];
  const db = store();
  const results = [];
  for (const assetId of unique) {
    const ref = db.collection('media_assets').doc(assetId);
    const status = await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) return 'missing';
      const a = momentAsset(snap);
      if (a.ownerUid !== uid) throw Object.assign(new Error('Forbidden'), { status: 403 });
      if (a.status === 'attached' || a.status === 'deleted') return a.status;
      tx.update(ref, { status: 'cleanup_pending', updatedAt: new Date().toISOString() });
      return 'cleanup_pending';
    });
    if (status !== 'cleanup_pending') { results.push({ assetId, status }); continue; }
    let outcome = 'retry';
    try { outcome = await destroyMomentAsset(ref); } catch { /* daily cron retries */ }
    results.push({ assetId, status: outcome });
  }
  return results;
}
