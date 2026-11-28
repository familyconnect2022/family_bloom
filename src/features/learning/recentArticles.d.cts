export type RecentArticle={articleId:string;articleRevision:number;title:string;community:boolean;at:number;coverMediaId?:string|null;authorName?:string;communityAlias?:string};
export function readRecent(storage:{getItem(key:string):string|null;setItem(key:string,value:string):void},uid:string,family:string):RecentArticle[];
export function rememberRecent(storage:{getItem(key:string):string|null;setItem(key:string,value:string):void},uid:string,family:string,article:Pick<RecentArticle,'articleId'|'articleRevision'|'title'|'coverMediaId'|'authorName'>,community?:boolean,at?:number):void;
export function forgetRecent(storage:{getItem(key:string):string|null;setItem(key:string,value:string):void},uid:string,family:string,articleId:string):void;
export function updateRecentCover(storage:{getItem(key:string):string|null;setItem(key:string,value:string):void},uid:string,family:string,item:RecentArticle,coverMediaId:string|null):void;
export function resolveRecentCover(item:RecentArticle,request:(body:Record<string,unknown>)=>Promise<any>):Promise<{coverMediaId:string|null;src:string|null}>;
export function normalizeRecent(storage:{getItem(key:string):string|null;setItem(key:string,value:string):void},uid:string,family:string):Promise<RecentArticle[]>;
export function rememberRecentArticle(storage:{getItem(key:string):string|null;setItem(key:string,value:string):void},uid:string,family:string,article:Pick<RecentArticle,'articleId'|'articleRevision'|'title'|'coverMediaId'|'authorName'>,community?:boolean,at?:number):Promise<void>;
