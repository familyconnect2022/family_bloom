/** Super Bloom Study Q&A. No module-level Firestore reads or subscriptions.
 * Reads are explicitly paged on route focus; never attached to app bootstrap. */
import {STUDY_RELATIONS} from './StudySolutionModel';
import type {StudyRelation} from './StudySolutionModel';
export {STUDY_RELATIONS,studyRelationGlyph} from './StudySolutionModel';
export type {StudyRelation} from './StudySolutionModel';
import {collection,deleteDoc,doc,getDoc,getDocs,getFirestore,limit,orderBy,query,serverTimestamp,setDoc,startAfter,updateDoc} from '@react-native-firebase/firestore';

export const STUDY_PAGE_SIZE=15;
export type StudySubject='math'|'physics'|'chemistry'|'vietnamese'|'literature'|'english'|'other';
export type StudyFormulaPart={kind:'literal'|'template';syntax?:'plain'|'chemistry';value?:string;templateId?:string;fields?:Record<string,string>};
/** One ordered solution block. `relationBefore` belongs to the CURRENT formula,
 * so text -> equation -> implication -> equation is stable when editing/reordering.
 * Existing Firestore `blocks` without this optional field remain valid. */
export type StudyBlock={kind:'text'|'formula';value:string;relationBefore?:StudyRelation;formulaTemplate?:string;formulaFields?:Record<string,string>;formulaParts?:StudyFormulaPart[]};
export type StudyQuestion={id:string;familyId:string;authorUid:string;authorName:string;title:string;subject:StudySubject;grade:number;blocks:StudyBlock[];imageUrls:string[];createdAt:any;acceptedAnswerId:string;};
export type StudyAnswer={id:string;authorUid:string;authorName:string;blocks:StudyBlock[];imageUrls:string[];createdAt:any};
export type StudyComment={id:string;authorUid:string;authorName:string;body:string;createdAt:any};
export type StudyReaction='heart'|'like'|'laugh'|'wow'|'clap'|'flower';
export const STUDY_REACTIONS:readonly StudyReaction[]=['heart','like','laugh','wow','clap','flower'];
export const studyReactionGlyph:Record<StudyReaction,string>={heart:'❤️',like:'👍',laugh:'😂',wow:'😮',clap:'👏',flower:'🌷'};
export function normalizeStudyReaction(value:unknown):StudyReaction|null{
 return typeof value==='string'&&STUDY_REACTIONS.includes(value as StudyReaction)?value as StudyReaction:null;
}

export const STUDY_SUBJECTS:[StudySubject,string][]=[['math','Toán'],['physics','Vật lý'],['chemistry','Hóa học'],['vietnamese','Tiếng Việt'],['literature','Ngữ văn'],['english','Tiếng Anh'],['other','Môn khác']];
export const subjectName=(id:string)=>STUDY_SUBJECTS.find(x=>x[0]===id)?.[1]||'Học tập';
export const studyTimestamp=(value:any):number=>{
 if(value?.toMillis) return value.toMillis();
 if(value?.seconds) return value.seconds*1000;
 return 0;
};
const page=async <T>(path:any,cursor:any,size:number):Promise<{items:T[];cursor:any;hasMore:boolean}>=>{
 const ref=query(path,orderBy('createdAt','desc'),...(cursor?[startAfter(cursor)]:[]),limit(Math.min(30,Math.max(1,size))));
 const snap=await getDocs(ref);return {items:snap.docs.map(d=>({id:d.id,...d.data()} as T)),cursor:snap.docs[snap.docs.length-1]??null,hasMore:snap.size===size};
};
const questions=(familyId:string)=>collection(getFirestore(),'families',familyId,'studyQuestions');
const question=(familyId:string,id:string)=>doc(questions(familyId),id);
const answers=(familyId:string,qid:string)=>collection(question(familyId,qid),'answers');
const answer=(familyId:string,qid:string,aid:string)=>doc(answers(familyId,qid),aid);
const comments=(familyId:string,qid:string,aid:string)=>collection(answer(familyId,qid,aid),'comments');
// Build a root-based Firestore ref: avoid SDK-specific document-parent overloads for reactions.
const reactionDoc=(fid:string,qid:string,aid:string,uid:string)=>doc(getFirestore(),'families',fid,'studyQuestions',qid,'answers',aid,'reactions',uid);
const validateBlocks=(blocks:StudyBlock[])=>{
 if(!blocks.length||blocks.length>24||blocks.some(b=>!['text','formula'].includes(b.kind)||!b.value.trim()||b.value.length>6000||!!(b.relationBefore&&!STUDY_RELATIONS.includes(b.relationBefore))||!!(b.kind==='text'&&b.relationBefore&&b.relationBefore!=='none')))throw Error('Hãy nhập nội dung (tối đa 24 phần, mỗi phần 6.000 ký tự).');
};
const validateImages=(urls:string[])=>{
 if(urls.length>3||urls.some(u=>!/^https:\/\/[^\s]+$/.test(u)||u.length>1600))throw Error('Chỉ hỗ trợ tối đa 3 ảnh HTTPS.');
};
export const studyRepository={
 listQuestions:(fid:string,cursor?:any,size=STUDY_PAGE_SIZE)=>page<StudyQuestion>(questions(fid),cursor,size),
 getQuestion:async(fid:string,id:string)=>{const s=await getDoc(question(fid,id));return s.exists()?{id:s.id,...s.data()} as StudyQuestion:null},
 async createQuestion(fid:string,uid:string,name:string,title:string,subject:StudySubject,grade:number,blocks:StudyBlock[],imageUrls:string[]){
  validateBlocks(blocks);validateImages(imageUrls);
  if(!title.trim()||title.length>160||!STUDY_SUBJECTS.some(x=>x[0]===subject)||!Number.isInteger(grade)||grade<1||grade>12)throw Error('Hãy chọn môn, lớp và nhập tiêu đề hợp lệ.');
  const ref=doc(questions(fid));await setDoc(ref,{familyId:fid,authorUid:uid,authorName:name.slice(0,80)||'Người nhà',title:title.trim(),subject,grade,blocks,imageUrls,createdAt:serverTimestamp(),acceptedAnswerId:''});return ref.id;
 },
 async deleteQuestion(fid:string,id:string){await deleteDoc(question(fid,id))},
 listAnswers:(fid:string,qid:string,cursor?:any)=>page<StudyAnswer>(answers(fid,qid),cursor,15),
 async createAnswer(fid:string,qid:string,uid:string,name:string,blocks:StudyBlock[],imageUrls:string[]){
  validateBlocks(blocks);validateImages(imageUrls);
  const ref=doc(answers(fid,qid));await setDoc(ref,{authorUid:uid,authorName:name.slice(0,80)||'Người nhà',blocks,imageUrls,createdAt:serverTimestamp()});return ref.id;
 },
 async acceptAnswer(fid:string,qid:string,aid:string){await updateDoc(question(fid,qid),{acceptedAnswerId:aid})},
 listComments:(fid:string,qid:string,aid:string,cursor?:any)=>page<StudyComment>(comments(fid,qid,aid),cursor,15),
 async addComment(fid:string,qid:string,aid:string,uid:string,name:string,body:string){
  const trimmed=body.trim();if(!trimmed||trimmed.length>1000)throw Error('Bình luận tối đa 1.000 ký tự.');
  const ref=doc(comments(fid,qid,aid));await setDoc(ref,{authorUid:uid,authorName:name.slice(0,80)||'Người nhà',body:trimmed,createdAt:serverTimestamp()});return ref.id;
 },
 // Per-user document. Old reactions without `reaction` remain a heart for backwards compatibility.
 getMyReactionKind:async(fid:string,qid:string,aid:string,uid:string):Promise<StudyReaction|null>=>{
  if(!uid) return null;
  const snap=await getDoc(reactionDoc(fid,qid,aid,uid));
  return snap.exists()?(normalizeStudyReaction(snap.data()?.reaction)||'heart'):null;
 },
 getMyReaction:async(fid:string,qid:string,aid:string,uid:string)=>{
  if(!uid)return false;
  return (await getDoc(reactionDoc(fid,qid,aid,uid))).exists();
 },
 async setReactionKind(fid:string,qid:string,aid:string,uid:string,reaction:StudyReaction|null){
  if(!uid)throw Error('Vui lòng đăng nhập để thả cảm xúc.');
  if(reaction!==null&&!normalizeStudyReaction(reaction))throw Error('Biểu tượng cảm xúc không hợp lệ.');
  const ref=reactionDoc(fid,qid,aid,uid);
  if(reaction===null){await deleteDoc(ref);return;}
  const old=await getDoc(ref);
  if(old.exists())await updateDoc(ref,{reaction});
  else await setDoc(ref,{uid,reaction,createdAt:serverTimestamp()});
 },
 async setReaction(fid:string,qid:string,aid:string,uid:string,liked:boolean){
  // Legacy compatibility: existing `Hữu ích` clients keep the same boolean API.
  return studyRepository.setReactionKind(fid,qid,aid,uid,liked?'heart':null);
 },
};
