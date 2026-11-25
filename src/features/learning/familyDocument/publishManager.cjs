'use strict';
// Idempotent create contract for the existing Moment schema. No new collection or client-side delete.
const fail=code=>{throw Object.assign(new Error(code),{code});};
const validId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,180}$/.test(v);
const ids=v=>Array.isArray(v)&&v.every(validId)&&new Set(v).size===v.length;
function identity(p){if(!p||![p.id,p.familyId,p.authorUid].every(validId)||typeof p.caption!=='string'||!['self','family','persons'].includes(p.timelineAudience)||!ids(p.mediaAssetIds)||!ids(p.personIds)||p.mediaAssetIds.length>10||p.personIds.length>24||!Array.isArray(p.media)||p.media.length!==p.mediaAssetIds.length)fail('PUBLISH_INVALID');
 const media=p.media.map((m,i)=>{if(!m||m.id!==p.mediaAssetIds[i]||!['image','video'].includes(m.type)||typeof m.secureUrl!=='string'||!m.secureUrl.startsWith('https://')||typeof m.publicId!=='string'||!m.publicId)fail('PUBLISH_MEDIA_INVALID');return [m.id,m.type,m.secureUrl,m.publicId];});return JSON.stringify([p.id,p.familyId,p.authorUid,p.caption,media,p.personIds,p.timelineAudience,p.notifyFamily===true]);}
function checkExisting(existing,desired){if(existing==null)return 'CREATE';if(identity(existing)!==identity(desired))fail('PUBLISH_ID_CONFLICT');return 'ALREADY_COMMITTED';}
function checkAssets(desired,assets){identity(desired);if(!Array.isArray(assets)||assets.length!==desired.mediaAssetIds.length)fail('PUBLISH_MEDIA_NOT_READY');for(let i=0;i<assets.length;i++){const a=assets[i],m=desired.media[i];if(!a||a.id!==m.id||a.ownerUid!==desired.authorUid||a.familyId!==desired.familyId||a.entityType!=='moment'||a.entityId!==desired.id||a.purpose!=='moment'||a.provider!=='cloudinary'||a.type!==m.type||a.status!=='uploaded'||a.secureUrl!==m.secureUrl||a.publicId!==m.publicId)fail('PUBLISH_MEDIA_NOT_READY');}return true;}
module.exports={identity,checkExisting,checkAssets};
