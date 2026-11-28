export type Category={id:string;title:string;icon:string};
export const categoryGroups:readonly (Category&{children:readonly Category[]})[];
export function validCategory(value:unknown):value is string;
export function categoryInfo(value:unknown):(Category&{group:string;groupTitle:string})|null;
export function categoryMatches(value:unknown,filter:string):boolean;
