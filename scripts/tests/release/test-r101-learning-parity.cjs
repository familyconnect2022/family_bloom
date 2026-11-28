const {test}=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {matchesArticleSearch}=require('../../../src/features/learning/articleSearch.cjs');const {normalizePenName}=require('../../../src/features/learning/penName.cjs');const {rememberRecentArticle,normalizeRecent,resolveRecentCover}=require('../../../src/features/learning/recentArticles.cjs');
const uid='member',fid='house',familyId='a'.repeat(64),other='b'.repeat(64),communityId=createHash('sha256').update(JSON.stringify(['bloom-community-v1',fid,familyId])).digest('hex');const title='Vũ trụ',articleId=familyId,a={articleId,articleRevision:1,title,coverMediaId:null,authorName:'Đặng Ánh'};
function store(){const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),m};}
test('native article search folds Vietnamese accents and matches only public title/byline',()=>{assert(matchesArticleSearch(a,'vu tru'));assert(matchesArticleSearch(a,'dang anh'));assert(!matchesArticleSearch({...a,authorName:undefined,ownerUid:'secret'},'secret'));assert.equal(normalizePenName('  Đặng Ánh '),'Đặng Ánh');assert.equal(normalizePenName(''), '');assert.equal(normalizePenName('abc\nxyz'),null);});
test('family and community share one recent entry, distinct same-title article stays separate',async()=>{const s=store();await rememberRecentArticle(s,uid,fid,a,false,1);await rememberRecentArticle(s,uid,fid,{...a,articleId:other},false,2);await rememberRecentArticle(s,uid,fid,{...a,articleId:communityId},true,3);const rows=await normalizeRecent(s,uid,fid);assert.equal(rows.length,2);assert.equal(rows[0].articleId,communityId);assert.equal(rows[0].community,true);assert.equal(rows[1].articleId,other);assert.deepEqual(await normalizeRecent(s,'another',fid),[]);});
test('legacy recents migrate using exact scoped ID, not title, cover reads retain scope and revision',async()=>{const s=store(),key='bloom:learning:recent:v1:'+uid+':'+fid;s.setItem(key,JSON.stringify([{...a,articleId:communityId,community:true,at:3},{...a,community:false,at:2},{...a,articleId:other,community:false,at:1}]));const rows=await normalizeRecent(s,uid,fid);assert.equal(rows.length,2);const calls=[];const cover='c'.repeat(64);await resolveRecentCover({...rows[0],coverMediaId:cover},async b=>{calls.push(b);return {dataUrl:'data:image/png;base64,AAAA'};});assert.deepEqual(calls,[{action:'readCommunityArticleMedia',articleId:communityId,expectedArticleRevision:1,assetId:cover}]);});

const {setRecentCoverScope,getRecentRows,retainRecentRows,peekRecentCover,loadRecentCover}=require('../../../src/features/learning/recentArticles.cjs');
test('R113 recent covers reuse resolved and in-flight media, stable rows, and clear on scope change',async()=>{
 const uid='u',fid='f',item={articleId:'a'.repeat(64),articleRevision:1,community:false,title:'Test',coverMediaId:'b'.repeat(64),at:1};let calls=0,clock=1000;
 const req=async()=>{calls++;return {dataUrl:'data:image/png;base64,AAAA'};};
 setRecentCoverScope(uid,fid);const rows=retainRecentRows(uid,fid,[],[item]);assert.strictEqual(retainRecentRows(uid,fid,rows,[{...item,at:2}]),rows);assert.strictEqual(getRecentRows(uid,fid),rows);
 await Promise.all([loadRecentCover(uid,fid,item,req,()=>clock),loadRecentCover(uid,fid,item,req,()=>clock)]);assert.equal(calls,1);
 await loadRecentCover(uid,fid,item,req,()=>clock);assert.equal(calls,1);assert(peekRecentCover(uid,fid,item).src);
 clock+=300001;await loadRecentCover(uid,fid,item,req,()=>clock);assert.equal(calls,2);
 await loadRecentCover(uid,fid,{...item,articleRevision:2},req,()=>clock);assert.equal(calls,3);
 setRecentCoverScope(uid,'other');assert.equal(peekRecentCover(uid,fid,item),undefined);assert.deepEqual(getRecentRows(uid,fid),[]);
 setRecentCoverScope(uid,fid);let finish;const pending=loadRecentCover(uid,fid,item,()=>new Promise(r=>{finish=r;}));setRecentCoverScope(uid,'other');finish({dataUrl:'data:image/png;base64,AAAA'});await assert.rejects(pending,/RECENT_SCOPE_CHANGED/);assert.equal(peekRecentCover(uid,fid,item),undefined);
 setRecentCoverScope(null,null);
});
