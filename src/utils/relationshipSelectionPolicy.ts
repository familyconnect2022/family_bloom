/** Relationship selection rules shared with the Web genealogy workflow.
 * Only a deliberate choice of direction permits selection; never infer it.
 * These UI bounds supplement (never replace) Firestore integrity checks.
 */
export type LinkDirection = 'parent_of'|'child_of'|'partner';
export type LinkSide = 'base'|'target';
export function limitForRelationshipSide(mode:LinkDirection|null,side:LinkSide):number{
  if(!mode)return 0;
  if(mode==='partner')return 1;
  if(mode==='parent_of')return side==='base'?2:Infinity;
  return side==='target'?2:Infinity;
}
export function toggleRelationshipPerson(
 current:readonly string[],personId:string,mode:LinkDirection|null,side:LinkSide,
):{ids:string[];blocked:boolean}{
 const cap=limitForRelationshipSide(mode,side);
 if(!cap||!personId)return {ids:[...current],blocked:true};
 if(current.includes(personId))return {ids:current.filter(id=>id!==personId),blocked:false};
 if(cap===1)return {ids:[personId],blocked:false};
 if(current.length>=cap)return {ids:[...current],blocked:true};
 return {ids:[...current,personId],blocked:false};
}
export function validateRelationshipPeople(mode:LinkDirection|null,base:readonly string[],target:readonly string[]):string|null{
 if(!mode)return 'Hãy chọn loại và chiều quan hệ trước khi chọn người.';
 if(!base.length||!target.length)return 'Hãy chọn người ở cả hai phía.';
 if(base.length>limitForRelationshipSide(mode,'base')||target.length>limitForRelationshipSide(mode,'target'))
  return 'Vợ/chồng hoặc bạn đời chỉ được chọn một người; cha/mẹ tối đa hai người.';
 if(base.some(id=>target.includes(id)))return 'Không thể nối một người với chính mình.';
 return null;
}
