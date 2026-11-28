'use strict';
// Explicit, plain-text public byline. Empty means anonymous.
const validPenName=v=>typeof v==='string'&&v.length<=60&&v===v.trim()&&!/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(v);
const normalizePenName=v=>typeof v==='string'&&validPenName(v.trim())?v.trim():null;
module.exports={validPenName,normalizePenName};
