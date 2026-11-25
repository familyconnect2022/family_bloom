export type FieldValue={caption:string;richBody:string|null};
export const MAX_FIELD_BYTES:number;
export const MAX_FIELD_TEXT:number;
export function makeFieldDocument(doc:unknown):FieldValue;
export function readFieldDocument(value:unknown,caption:unknown):Record<string,unknown>|null;
export function plainFieldDocument(text:string):Record<string,unknown>;
export function checkedFieldValue(value:unknown,caption:unknown):string|null;
