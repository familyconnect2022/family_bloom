/** Keep provider codes, URLs and diagnostic payloads out of ordinary screens. */
export function userFacingMessage(error:unknown,fallback='Chưa thực hiện được. Bạn thử lại nhé.'):string {
 const raw=error instanceof Error?error.message:typeof error==='string'?error:'';
 const text=raw.trim();
 if(!text||text.length>260||/[\r\n]/.test(text)||!/[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i.test(text))return fallback;
 if(/firebase|firestore|cloudinary|vercel|render\b|gateway|https?:|\b(?:API|HTTP|UID|JWT|SDK|token|permission-denied|stack|exception|undefined|null|quota)\b|[A-Z]{2,}_[A-Z_]+|[a-z0-9_-]{28,}/i.test(text))return fallback;
 return text;
}
