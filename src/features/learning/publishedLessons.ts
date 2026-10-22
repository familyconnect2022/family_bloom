/** Read-only Family Bloom consumer for the Studio v1 cloud contract. No global listeners. */
import {getFirestore, collection, doc, getDoc, getDocs, query, limit, startAfter} from '@react-native-firebase/firestore';
export const PUBLISHED_PATH='bloomStudioPublishedLessons';
export type BloomQuestion={prompt:string;answer:string};
export type PublishedBloomLesson={
 id:string;title:string;subject:string;grade:number;unit:string;topic:string;strand:string;
 outcomes:string[];body:string;questions:BloomQuestion[];formulas:string[];imageUrls:string[];
 sourceTitle:string;sourceUrl:string;curriculumRef:string;catalogEdition:string;
 reviewedAt:string;publishedAt:string;
};
const subjectSet=new Set(['math','vietnamese','literature','english','physics','chemistry']);
const safeHttps=(v:unknown):v is string=>typeof v==='string'&&v.length<=2000&&/^https:\/\/[^\s/]+/i.test(v);
const clean=(v:unknown,max=200)=>typeof v==='string'?v.slice(0,max):'';
export function parsePublished(id:string,raw:unknown):PublishedBloomLesson|null {
 if(!raw||typeof raw!=='object'||!id||id.length>180)return null;
 const d=raw as Record<string,any>,e=d.entry,c=d.content;
 if(d.schema!=='bloom-studio-cloud/1'||d.reviewStatus!=='approved'||
    !e||e.status!=='approved'||e.alignment!=='verified'||!c||
    typeof c.reviewedAt!=='string'||!subjectSet.has(e.subject)||
    !Number.isInteger(e.grade)||e.grade<1||e.grade>12||!clean(e.title,300))return null;
 const questions=Array.isArray(c.questions)?c.questions.slice(0,50).filter((q:any)=>q&&typeof q.prompt==='string'&&typeof q.answer==='string').map((q:any)=>({prompt:clean(q.prompt,2000),answer:clean(q.answer,2000)})):[];
 return {id,title:clean(e.title,300),subject:e.subject,grade:e.grade,unit:clean(e.unit),topic:clean(e.topic),strand:clean(e.strand),
   outcomes:Array.isArray(e.outcomes)?e.outcomes.filter((v:any)=>typeof v==='string').slice(0,30):[],
   body:clean(c.body,50000),questions,formulas:Array.isArray(c.formulas)?c.formulas.filter((v:any)=>typeof v==='string').slice(0,50):[],
   imageUrls:Array.isArray(c.imageUrls)?c.imageUrls.filter(safeHttps).slice(0,20):[],
   sourceTitle:clean(e.sourceTitle),sourceUrl:safeHttps(e.sourceUrl)?e.sourceUrl:'',curriculumRef:clean(e.curriculumRef),
   catalogEdition:clean(e.catalogEdition),reviewedAt:clean(c.reviewedAt,50),publishedAt:clean(d.publishedAt,50)};
}
/** Firestore Rules enforce limit<=50; load more only on explicit user intent. */
export async function listPublishedLessons(lastDoc?:any,pageSize=30){
 const db=getFirestore();const q=lastDoc?
    query(collection(db,PUBLISHED_PATH),startAfter(lastDoc),limit(pageSize)):
    query(collection(db,PUBLISHED_PATH),limit(pageSize));
 const snapshot=await getDocs(q);
 return {lessons:snapshot.docs.map(x=>parsePublished(x.id,x.data())).filter((x):x is PublishedBloomLesson=>!!x),
   cursor:snapshot.docs[snapshot.docs.length-1]??null,hasMore:snapshot.docs.length===pageSize};
}
/** Source-of-truth fetch before opening; revocation removes this document. */
export async function getPublishedLesson(id:string):Promise<PublishedBloomLesson|null>{
 if(!/^[A-Za-z0-9_-]{5,180}$/.test(id))return null;
 const snapshot=await getDoc(doc(getFirestore(),PUBLISHED_PATH,id));
 return snapshot.exists()?parsePublished(snapshot.id,snapshot.data()):null;
}
