export function identity(p:unknown):string;
export function checkExisting(existing:unknown,desired:unknown):'CREATE'|'ALREADY_COMMITTED';
export function checkAssets(desired:unknown,assets:unknown[]):true;
