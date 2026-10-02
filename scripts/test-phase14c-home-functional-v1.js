#!/usr/bin/env node
const fs=require('fs'), path=require('path');
const root=path.resolve(process.argv[2]||process.cwd());
const pass=[], fail=[]; const ck=(ok,label)=>(ok?pass:fail).push(label);
const rd=p=>fs.readFileSync(path.join(root,p),'utf8'); const ex=p=>fs.existsSync(path.join(root,p));
const req=[
 'src/app/home-whispers.tsx','src/app/home-polls.tsx','src/app/home-kitchen/index.tsx','src/app/home-kitchen/[recipeId].tsx',
 'src/features/home/whispers/WhisperFeaturePanel.tsx','src/features/home/polls/PollFeaturePanel.tsx','src/features/home/kitchen/KitchenFeaturePanel.tsx',
 'src/services/home/homeWhisperService.ts','src/services/home/homePollService.ts','src/services/home/homeKitchenService.ts','src/components/family/FamilyMemberPicker.tsx','src/types/homeLiving.ts','src/data/bloomRecipesV1.ts',
 'firestore.rules','firestore.cloud.rules','firestore.indexes.json','scripts/firebase/Family_Bloom_Deploy_Firestore_Indexes.bat'
];
for(const f of req) ck(ex(f),`exists:${f}`);
const w=rd('src/services/home/homeWhisperService.ts');
ck(w.includes('const PAGE_SIZE = 20'),'whisper pagination 20');
ck(w.includes('const RETENTION_DAYS = 60'),'whisper retention 60d');
ck(w.includes('savedHomeWhispers'),'saved whisper snapshot');
ck(w.includes('homeInbox'),'direct recipient inbox');
const wp=rd('src/features/home/whispers/WhisperFeaturePanel.tsx');
ck(wp.includes('Gửi cho cả nhà?')&&wp.includes('Người thân'),'whisper family/direct UX');
ck((wp.match(/\{ value: \"/g)||[]).length===10,'whisper 10 emotions');
ck(wp.includes('Lời đã lưu')&&wp.includes('Gửi riêng cho tôi')&&wp.includes('Tôi đã gửi')&&wp.includes('filterVisible'),'whisper compact filter UX');
const ps=rd('src/services/home/homePollService.ts'), pp=rd('src/features/home/polls/PollFeaturePanel.tsx');
const memberPicker=rd('src/components/family/FamilyMemberPicker.tsx');
ck(wp.includes('FamilyMemberPicker')&&pp.includes('FamilyMemberPicker'),'membership picker reused by whispers/polls');
ck(memberPicker.includes('FlatList')&&memberPicker.includes('Tìm theo tên thành viên')&&memberPicker.includes('initialNumToRender={14}'),'member picker scalable search + virtualization');
ck(w.includes('fallbackFetchPage')&&ps.includes('fallbackUnsubscribe'),'missing-index fallback');
ck(ps.includes('POLL_RETENTION_DAYS = 30'),'poll retention 30d');
ck(ps.includes('eligibleUids')&&ps.includes('/ballots/${uid}'),'poll frozen denominator + ballots');
ck(pp.includes('Nhóm bỏ phiếu phải có ít nhất 3 người'),'poll group min 3');
ck(pp.includes('Bỏ phiếu ẩn danh')&&pp.includes('kể cả người tạo cũng không thấy'),'poll anonymous UX');
ck(pp.includes('Hôm nay')&&pp.includes('Ngày mai')&&pp.includes('Chọn ngày'),'poll expiry choices');
ck(pp.includes('Chưa bỏ phiếu')&&pp.includes('Không bỏ phiếu')&&pp.includes('Đã kết thúc'),'poll result buckets');
const k=rd('src/data/bloomRecipesV1.ts'), ks=rd('src/services/home/homeKitchenService.ts');
ck((k.match(/"id":\s*"bloom-v1-/g)||[]).length===100,'kitchen 100 recipes');
ck(ks.includes('dailyMenu')&&ks.includes('rotationStride'),'kitchen daily rotation');
ck(ks.includes('homeKitchenPreferences'),'kitchen membership-user preferences');
const rules=rd('firestore.rules');
ck(rules.includes('match /savedHomeWhispers/{whisperId}')&&rules.includes('match /homeInbox/{eventId}'),'rules user private data');
ck(rules.includes('match /ballots/{uid}')&&rules.includes('match /homeKitchenPreferences/{uid}'),'rules polls/kitchen');
ck(rules.includes("'id','familyId','authorUid','authorName','message','tone','createdAt','updatedAt'"),'rules legacy whisper compatibility');
ck(rules.includes("'id','familyId','createdByUid','createdByName','question','options','optionIds','votes','status','createdAt','updatedAt'"),'rules legacy poll compatibility');
const bridge=rd('src/components/system/BloomPushBridge.tsx'), fn=rd('functions/pushNotifications.js');
ck(bridge.includes('home_whisper')&&bridge.includes('/home-whispers'),'push deep link source');
ck(fn.includes('pushDirectWhisperCreated')&&fn.includes('users/{uid}/homeInbox/{eventId}')&&fn.includes('inbox.type !== "home_whisper"'),'Cloud push remains direct-only via recipient inbox');
let indexes=null; try{indexes=JSON.parse(rd('firestore.indexes.json'))}catch{}
ck(indexes&&indexes.indexes?.length===7,'7 Firestore indexes');
let ts=null; try{ts=require('typescript')}catch{}
if(ts){
 const files=[]; const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.tsx?$/.test(e.name))files.push(p)}}; walk(path.join(root,'src'));
 let bad=0; for(const f of files){const r=ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},reportDiagnostics:true,fileName:f}); if((r.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error))bad++;}
 ck(bad===0,`all TS/TSX syntax ${files.length-bad}/${files.length}`);
}
console.log(`Phase14C functional V1: ${pass.length} PASS / ${fail.length} FAIL`); for(const x of pass)console.log('PASS | '+x); for(const x of fail)console.error('FAIL | '+x); if(fail.length)process.exitCode=1;
