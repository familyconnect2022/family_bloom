import { authorizedUser, method, response, safeError, requestCleanupForUser } from '../../lib/media.js';
export default async function handler(req, res) {
  try {
    method(req, 'POST');
    const uid = await authorizedUser(req);
    const results = await requestCleanupForUser(uid, req.body?.assetIds);
    return response(res, 200, { ok: true, results });
  } catch (error) { return safeError(res, error); }
}
