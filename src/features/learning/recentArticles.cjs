'use strict';
const {validPenName}=require('./penName.cjs');
const {sha256}=require('./familyDocument/nativePublishJournal.cjs');
const key=(uid,family)=>'bloom:learning:recent:v1:'+encodeURIComponent(uid)+':'+encodeURIComponent(family);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const coverValid=v=>v===null||hex(v);
const valid=a=>!!a&&hex(a.articleId)&&Number.isSafeInteger(a.articleRevision)&&a.articleRevision>0&&typeof a.title==='string'&&a.title.length>0&&a.title.length<=200&&typeof a.community==='boolean'&&Number.isFinite(a.at)&&(a.coverMediaId===undefined||coverValid(a.coverMediaId));
const metadata=a=>({articleId:a.articleId,articleRevision:a.articleRevision,title:a.title,community:a.community,at:a.at,...(coverValid(a.coverMediaId)?{coverMediaId:a.coverMediaId}:{}),...(validPenName(a.authorName)&&a.authorName?{authorName:a.authorName}:{}),...(!a.community&&hex(a.communityAlias)?{communityAlias:a.communityAlias}:{})});
const same=(a,b)=>a.articleId===b.articleId||(a.community&&!b.community&&a.articleId===b.communityAlias)||(!a.community&&b.community&&a.communityAlias===b.articleId);
function unique(rows){const result=[];for(const a of rows){if(!result.some(b=>same(a,b)))result.push(a);}return result.slice(0,3);}
function parseRows(raw){try{const r=JSON.parse(raw||'[]');return Array.isArray(r)?r.filter(valid).slice(0,3).map(metadata):[];}catch{return [];}}
function readRecent(storage,uid,family){try{if(!uid||!family)return [];return unique(parseRows(storage.getItem(key(uid,family))));}catch{return [];}}
function rememberRecent(storage,uid,family,article,community=false,at=Date.now()){if(!uid||!family||typeof article?.title!=='string')return;const a=metadata({articleId:article.articleId,articleRevision:article.articleRevision,title:article.title.slice(0,200),community:!!community,at,coverMediaId:article.coverMediaId,authorName:article.authorName,communityAlias:article.communityAlias});if(!valid(a))return;try{storage.setItem(key(uid,family),JSON.stringify(unique([a,...readRecent(storage,uid,family)])));}catch{}}
// Exact same domain-separated ID as Media Gateway. No guessing from title, author or image.
async function alias(family,id){return sha256(JSON.stringify(['bloom-community-v1',family,id]));}
async function withAlias(a,family,subtle){if(a.community||hex(a.communityAlias))return a;return {...a,communityAlias:await alias(family,a.articleId,subtle)};}
// Migrate old histories on focus. Compare the storage snapshot before writing so a newer read is not overwritten.
async function normalizeRecent(storage,uid,family,subtle=undefined){if(!uid||!family)return [];try{const k=key(uid,family);for(let i=0;i<3;i++){const raw=storage.getItem(k);const rows=unique(await Promise.all(parseRows(raw).map(a=>withAlias(a,family,subtle)))).map(metadata);if(storage.getItem(k)!==raw)continue;const json=JSON.stringify(rows);if(raw!==null&&raw!==undefined&&raw!==json)storage.setItem(k,json);return rows;}return readRecent(storage,uid,family);}catch{return readRecent(storage,uid,family);}}
async function rememberRecentArticle(storage,uid,family,article,community=false,at=Date.now(),subtle=undefined){if(!uid||!family||!hex(article?.articleId))return;let a=article;try{a=await withAlias({...article,community},family,subtle);await normalizeRecent(storage,uid,family,subtle);}catch{}rememberRecent(storage,uid,family,a,community,at);}
function forgetRecent(storage,uid,family,articleId){try{storage.setItem(key(uid,family),JSON.stringify(readRecent(storage,uid,family).filter(x=>x.articleId!==articleId)));}catch{}}
// Backfill metadata only for the same still-present revision, without changing its history order.
function updateRecentCover(storage,uid,family,item,coverMediaId){if(!uid||!family||!valid(item)||!coverValid(coverMediaId))return;try{const rows=readRecent(storage,uid,family);const match=a=>a.articleId===item.articleId&&a.articleRevision===item.articleRevision&&a.community===item.community&&a.coverMediaId===undefined;if(!rows.some(match))return;storage.setItem(key(uid,family),JSON.stringify(rows.map(a=>match(a)?{...a,coverMediaId}:a)));}catch{}}
// Every image read uses the authenticated revision-scoped route, never a public URL.
async function resolveRecentCover(item,request){if(!valid(item))throw Error('INVALID_ARTICLE');let coverMediaId=item.coverMediaId;const scope={articleId:item.articleId,expectedArticleRevision:item.articleRevision};if(coverMediaId===undefined){const r=await request({action:item.community?'readCommunityArticle':'readArticle',...scope});const a=r.article;if(!a||a.articleId!==item.articleId||a.articleRevision!==item.articleRevision||(!item.community&&a.visible!==true)||!coverValid(a.coverMediaId))throw Error('INVALID_ARTICLE');coverMediaId=a.coverMediaId;}if(coverMediaId===null)return {coverMediaId,src:null};const r=await request({action:item.community?'readCommunityArticleMedia':'readArticleMedia',...scope,assetId:coverMediaId});if(typeof r.dataUrl!=='string'||r.dataUrl.length>2800000||!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(r.dataUrl))throw Error('INVALID_IMAGE');return {coverMediaId,src:r.dataUrl};}
 // Session-only cover cache. No private image bytes are written to persistent storage.
 const COVER_TTL=5*60*1000, MAX_COVERS=6;
 let activeScope='',scopeGeneration=0,recentRows=[];
 const covers=new Map(),flights=new Map();
 const coverKey=item=>JSON.stringify([item.community,item.articleId,item.articleRevision,item.coverMediaId===undefined?'unknown':item.coverMediaId]);
 function setRecentCoverScope(uid,fid,epoch=''){
  const next=uid&&fid?JSON.stringify([uid,fid,epoch]):'';
  if(next===activeScope)return;
  activeScope=next;scopeGeneration++;covers.clear();flights.clear();recentRows=[];
 }
 function inScope(uid,fid){if(!activeScope)return false;const [u,f]=JSON.parse(activeScope);return u===uid&&f===fid;}
 function getRecentRows(uid,fid){return inScope(uid,fid)?recentRows:[];}
 function reconcileRecentRows(previous,next){
  const sig=a=>JSON.stringify([a.articleId,a.articleRevision,a.community,a.title,a.authorName??'',a.coverMediaId===undefined?'unknown':a.coverMediaId]);
  const before=new Map(previous.map(a=>[sig(a),a]));
  const rows=next.map(a=>before.get(sig(a))||a);
  return rows.length===previous.length&&rows.every((a,i)=>a===previous[i])?previous:rows;
 }
 function retainRecentRows(uid,fid,previous,next){
  const rows=reconcileRecentRows(previous,next);
  if(inScope(uid,fid)){recentRows=rows;
   const live=new Set(rows.map(a=>JSON.stringify([a.community,a.articleId,a.articleRevision])));
   for(const [k] of covers){if(!live.has(JSON.stringify(JSON.parse(k).slice(0,3))))covers.delete(k);}
  }
  return rows;
 }
 function peekRecentCover(uid,fid,item){return inScope(uid,fid)?covers.get(coverKey(item))?.value:undefined;}
 function dropRecentCover(uid,fid,item){if(!inScope(uid,fid))return;const k=coverKey(item),hit=covers.get(k);for(const [key,entry] of covers){if(key===k||entry===hit)covers.delete(key);}}
 async function loadRecentCover(uid,fid,item,request,now=Date.now){
  if(!inScope(uid,fid))return resolveRecentCover(item,request);
  const k=coverKey(item),hit=covers.get(k);
  if(hit&&now()-hit.at<COVER_TTL)return hit.value;
  if(flights.has(k))return flights.get(k);
  const generation=scopeGeneration;
  const job=resolveRecentCover(item,request).then(value=>{
   if(generation!==scopeGeneration||!inScope(uid,fid))throw Error('RECENT_SCOPE_CHANGED');
   const entry={value,at:now()};
   const put=key=>{covers.delete(key);covers.set(key,entry);};
   put(k);put(coverKey({...item,coverMediaId:value.coverMediaId}));
   while(covers.size>MAX_COVERS)covers.delete(covers.keys().next().value);
   return value;
  }).catch(e=>{if(generation===scopeGeneration)dropRecentCover(uid,fid,item);throw e;}).finally(()=>{if(flights.get(k)===job)flights.delete(k);});
  flights.set(k,job);return job;
 }

module.exports={setRecentCoverScope,getRecentRows,reconcileRecentRows,retainRecentRows,peekRecentCover,dropRecentCover,loadRecentCover,readRecent,rememberRecent,rememberRecentArticle,normalizeRecent,forgetRecent,updateRecentCover,resolveRecentCover};
