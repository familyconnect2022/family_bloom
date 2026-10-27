import { authorizedUser, method, response, safeError, signMomentUpload } from '../../lib/media.js';
export default async function handler(req, res) {
  try {
    method(req, 'POST');
    const uid = await authorizedUser(req);
    const result = await signMomentUpload(uid, req.body?.assetId);
    return response(res, 200, result);
  } catch (error) { return safeError(res, error); }
}
