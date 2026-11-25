export type MomentDraftFields={caption:string;richBody:string|null;audience:'self'|'family'|'persons';notify:boolean;personIds:string[]};
export type MomentDraftHead={draftId:string;kind:'moment-create';revision:number;updatedAt:number;deletedAt:number|null;summary?:{preview:string;imageCount:number;hasVideos?:boolean}};
export type MomentDraftPage={drafts:MomentDraftHead[];cursor:string|null};
export function createMomentDraftClient(deps:{request:(body:Record<string,unknown>)=>Promise<any>;randomId:()=>string;imagesEnabled?:boolean;videosEnabled?:boolean;directVideo?:{upload:(ticket:any,dataUrl:string)=>Promise<void>;download:(ticket:any)=>Promise<string>}|null}):{
 pending:()=>boolean;retry:()=>Promise<MomentDraftHead>;list:(trash?:boolean,cursor?:string|null,includeSummary?:boolean)=>Promise<MomentDraftPage>;
 get:(id:string)=>Promise<MomentDraftHead&{fields:MomentDraftFields;images?:string[]}>;
 saveKeepingImages:(value:MomentDraftFields,current:MomentDraftHead)=>Promise<MomentDraftHead>;
 saveImages:(value:MomentDraftFields,data:string[],current:MomentDraftHead|null)=>Promise<MomentDraftHead>;
 save:(value:MomentDraftFields,hasAttachments:boolean,current:MomentDraftHead|null)=>Promise<MomentDraftHead>;
 trash:(current:MomentDraftHead)=>Promise<MomentDraftHead>;restore:(current:MomentDraftHead)=>Promise<MomentDraftHead>;
};

export function validateMomentDraftFields(value:MomentDraftFields):MomentDraftFields;
