export function createDraftResume(store:{getItem:(key:string)=>string|null|Promise<string|null>;setItem:(key:string,value:string)=>void|Promise<void>;removeItem:(key:string)=>void|Promise<void>},uid:string,familyId:string):{read:()=>Promise<string|null>;remember:(id:string)=>Promise<boolean>;forget:(id:string)=>Promise<boolean>};
export const AUTOSAVE_DELAY:number;
export const MEDIA_AUTOSAVE_DELAY:number;
export function canAutosave(s:{enabled:boolean;current:{deletedAt:number|null}|null;busy:boolean;retry:boolean;disabled?:boolean;hasAttachments:boolean;mediaSupported?:boolean;hasContent?:boolean;caption:string;saved:string|null;stamp:string}):boolean;
