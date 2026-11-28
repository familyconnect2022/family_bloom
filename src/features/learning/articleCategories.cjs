'use strict';
// Stable persisted identifiers; labels can evolve without migrating articles.
const groups=[
 ['science','Khoa học','planet',[['space','Vũ trụ','planet'],['physics','Vật lý','magnet'],['chemistry','Hóa học','flask'],['biology','Sinh học','leaf'],['math','Toán học','calculator']]],
 ['technology','Công nghệ','hardware-chip',[['computer','Máy tính','desktop'],['ai','AI','sparkles'],['coding','Lập trình','code-slash'],['inventions','Phát minh','bulb']]],
 ['history','Lịch sử & Văn hóa','business',[['history','Lịch sử','time'],['geography','Địa lý','globe'],['people','Danh nhân','person'],['traditions','Truyền thống','ribbon']]],
 ['nature','Thiên nhiên','leaf',[['animals','Động vật','paw'],['plants','Thực vật','flower'],['earth','Trái Đất','earth'],['environment','Môi trường','water']]],
 ['health','Sức khỏe','heart',[['nutrition','Dinh dưỡng','nutrition'],['exercise','Vận động','fitness'],['physical','Thể chất','medkit'],['mental','Tinh thần','happy']]],
 ['life','Gia đình & Cuộc sống','home',[['parenting','Nuôi dạy con','people'],['communication','Giao tiếp','chatbubbles'],['skills','Kỹ năng sống','compass'],['finance','Tài chính','wallet']]],
 ['arts','Sách & Nghệ thuật','color-palette',[['books','Sách hay','book'],['literature','Văn học','library'],['music','Âm nhạc','musical-notes'],['painting','Hội họa','brush'],['creative','Sáng tạo','create']]],
 ['languages','Ngôn ngữ','language',[['vietnamese','Tiếng Việt','chatbox'],['english','Tiếng Anh','chatbox'],['other','Ngoại ngữ khác','globe']]],
 ['discovery','Khám phá khác','bulb',[['facts','Kiến thức thú vị','star'],['questions','Câu hỏi','help-circle'],['ideas','Ý tưởng mới','sparkles']]]
].map(([id,title,icon,children])=>Object.freeze({id,title,icon,children:Object.freeze(children.map(([key,title,icon])=>Object.freeze({id:id+'.'+key,title,icon})))}));
const categoryGroups=Object.freeze(groups), byId=new Map(groups.flatMap(g=>g.children.map(c=>[c.id,{...c,group:g.id,groupTitle:g.title}])));
const validCategory=v=>typeof v==='string'&&byId.has(v);
const categoryInfo=v=>byId.get(v)||null;
const categoryMatches=(v,filter)=>!filter||filter==='all'||(filter==='uncategorized'?!validCategory(v):v===filter||categoryInfo(v)?.group===filter);
module.exports={categoryGroups,validCategory,categoryInfo,categoryMatches};
