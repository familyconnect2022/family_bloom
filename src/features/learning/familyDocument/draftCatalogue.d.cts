export type DraftKind='learning'|'moment';
export type CatalogueRow={kind:DraftKind;id:string;revision:number;at:number;title:string;mediaCount:number;hasVideos:boolean};
export type CataloguePage={rows:CatalogueRow[];cursor:string|null};
export function parsePage(kind:DraftKind,trash:boolean,value:unknown,priorCursor?:string|null):CataloguePage;
export function readPage(request:(body:Record<string,unknown>)=>Promise<unknown>,kind:DraftKind,trash:boolean,cursor?:string|null):Promise<CataloguePage>;
export function mergeRows(old:CatalogueRow[],added:CatalogueRow[]):CatalogueRow[];
export function changeRow(request:(body:Record<string,unknown>)=>Promise<unknown>,row:CatalogueRow,trash:boolean,randomId:()=>string):Promise<void>;

export type MomentSelection={draftId:string;revision:number};
export function createMomentSelection(now?:()=>number):{queue(uid:string,familyId:string,row:CatalogueRow):boolean;take(uid:string,familyId:string):MomentSelection|null;clear():void};
export const momentSelection:ReturnType<typeof createMomentSelection>;
export function checkSelectedMoment<T>(target:{draftId:string;revision?:number},result:T):T;

export function createLearningSelection(now?:()=>number):ReturnType<typeof createMomentSelection>;
export const learningSelection:ReturnType<typeof createLearningSelection>;
