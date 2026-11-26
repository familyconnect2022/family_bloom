export function identity(p:unknown):string;
export function checkExisting(existing:unknown,desired:unknown):'CREATE'|'ALREADY_COMMITTED';
export function checkAssets(desired:unknown,assets:unknown[]):true;
export function editIdentity(post:unknown):string;
export function checkEdit(current:unknown,expected:unknown,desired:unknown):'UPDATE'|'ALREADY_COMMITTED';
export function prepareEdit<T>(current:unknown,desired:{media:T[];mediaAssetIds:string[]},newAssetIds:string[],assets:unknown[]):{media:T[];mediaAssetIds:string[];removed:string[]};

export function matchesPublishedMoment(existing:unknown,desired:unknown):boolean;

export function checkEventEdit(live:unknown,base:unknown,next:unknown):'UPDATE'|'ALREADY_COMMITTED';
export function eventContentPatch(e:unknown):Record<string,unknown>;
