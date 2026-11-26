export type Article={articleId:string;ownerUid:string;draftId:string;title:string;articleRevision:number;draftRevision:number;publishedAt:number;visible:boolean;coverMediaId?:string|null};
export const hex=(x:unknown)=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export const id=(x:unknown)=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(x);
export const positive=(x:unknown)=>typeof x==='number'&&Number.isSafeInteger(x)&&x>0;
export const validArticle=(a:any):a is Article=>!!a&&hex(a.articleId)&&id(a.ownerUid)&&id(a.draftId)&&typeof a.title==='string'&&positive(a.articleRevision)&&positive(a.draftRevision)&&Number.isSafeInteger(a.publishedAt)&&typeof a.visible==='boolean'&&(a.coverMediaId===undefined||a.coverMediaId===null||hex(a.coverMediaId));

// No local draft can masquerade as a published article. The server must acknowledge the exact revision.
export async function publishCheckedArticle(request:(body:Record<string,unknown>)=>Promise<any>,target:{draftId:string;revision:number;previous:Article|null;options:string[]},cover:string|null):Promise<Article>{
 if(cover!==null&&(!hex(cover)||!target.options.includes(cover)))throw Object.assign(Error('ARTICLE_INVALID_COVER'),{code:'ARTICLE_INVALID_COVER'});
 let result:any;try{result=await request({action:'publishArticle',draftId:target.draftId,expectedRevision:target.revision,expectedArticleRevision:target.previous?.articleRevision??0,coverMediaId:cover});}catch(e){
  const code=(e as {code?:unknown})?.code;
  // A timed-out mutation may have committed. Only read to reconcile; never resend blindly.
  if(!['REQUEST_TIMEOUT','NETWORK_ERROR','INVALID_RESPONSE','SYNC_HTTP_ERROR','INTERNAL_ERROR'].includes(String(code)))throw e;
  try{const actual=await request({action:'articleStatus',draftId:target.draftId});const a=actual.article;if(!validArticle(a)||a.draftId!==target.draftId||a.draftRevision!==target.revision||!a.visible||a.coverMediaId!==cover||a.articleRevision<(target.previous?.articleRevision??0))throw e;result=actual;}catch{throw e;}
 }
 if(!validArticle(result.article)||result.article.draftId!==target.draftId||result.article.draftRevision!==target.revision||!result.article.visible||result.article.coverMediaId!==cover)throw Error('INVALID_ARTICLE');
 return result.article;
}

// Reconcile an uncertain withdrawal by reading the owner's status, never resending the mutation.
export async function withdrawCheckedArticle(request:(body:Record<string,unknown>)=>Promise<any>,target:Article):Promise<Article>{
 const matches=(a:any):a is Article=>validArticle(a)&&a.articleId===target.articleId&&a.ownerUid===target.ownerUid&&a.draftId===target.draftId&&a.draftRevision===target.draftRevision&&!a.visible&&a.articleRevision===target.articleRevision+1;
 let result:any;try{result=await request({action:'withdrawArticle',articleId:target.articleId,expectedArticleRevision:target.articleRevision});}catch(e){
  if(!['REQUEST_TIMEOUT','NETWORK_ERROR','INVALID_RESPONSE','SYNC_HTTP_ERROR','INTERNAL_ERROR'].includes(String((e as {code?:unknown})?.code)))throw e;
  try{result=await request({action:'articleStatus',draftId:target.draftId});if(!matches(result.article))throw e;}catch{throw e;}
 }
 if(!matches(result.article))throw Error('INVALID_ARTICLE');return result.article;
}
