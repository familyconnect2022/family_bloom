/** Pure, dependency-free compound expression model. Imported by the ƒx editor only.
 * Keep the original TeX and editable segments; zero root listeners, no WebView. */
import type {StudyFormulaPart} from './studyRepository';
import {parseChemicalSpecies} from './StudyChemistry';
import {compileVisualFormula,findVisualTemplate,migrateLegacyFormula,sampleFields} from './StudyFormulaTemplates';

export const MAX_EXPRESSION_PARTS=32;
export const MAX_COMPOUND_TEX_LENGTH=3000;
export const COMPOUND_OPERATORS:readonly {label:string;value:string}[]=[
 {label:'+',value:'+'},{label:'−',value:'-'},{label:'×',value:'×'},
 {label:'÷',value:'÷'},{label:'=',value:'='},{label:'(',value:'('},
 {label:')',value:')'},{label:'±',value:'±'},{label:'<',value:'<'},{label:'>',value:'>'},
];
const cleanText=(v:string)=>v.slice(0,100).replace(/[{}\\]/g,'').replace(/\r?\n/g,' ');
/** Optional, editable text immediately following a visual formula template.
 * A confident chemical species is formatted automatically; ambiguous text is NEVER
 * converted to a different substance. No WebView, network, or global state. */
export const FORMULA_FOLLOW_FIELD='__after';
export type FormulaFollowResult={tex:string;kind:'empty'|'chemistry'|'plain'|'uncertain';note:string};
export function formatFormulaFollow(input:string):FormulaFollowResult{
 const raw=String(input||'').slice(0,100).trim();
 if(!raw)return {tex:'',kind:'empty',note:''};
 const safe=cleanText(raw);
 const parsed=parseChemicalSpecies(safe);
 // Only infer chemistry for an unambiguous element formula with an explicit
 // subscript/ion marker. Ordinary words such as 'Co', 'No', 'In' stay as typed.
 const chemicalShape=/^[A-Z][a-z]?(?:\d|\(|\[)|^[A-Z][a-z]?(?:[A-Z][a-z]?\d*)+|^[A-Z][a-z]?\^/.test(safe);
 if(parsed.ok && chemicalShape)
  return {tex:'\\,'+parsed.tex,kind:'chemistry',note:'Đã nhận diện công thức Hóa học; chữ hoa/thường được giữ nguyên.'};
 // Never guess that numeric 0 means elemental O, or that Ca2+ means Ca^{2+}.
 if(/^0\d/.test(safe)||(/^[A-Z]/.test(safe)&&(/\d|\^/.test(safe))&&!parsed.ok))
  return {tex:'\\,'+safe,kind:'uncertain',note:`Chưa chắc đây là công thức Hóa học: ${parsed.message || 'hãy kiểm tra chữ O và số 0'}. Giữ nguyên chữ bạn nhập.`};
 return {tex:'\\,'+safe,kind:'plain',note:'Giữ nguyên văn bản bổ sung.'};
}

export const textPart=(value='',syntax:'plain'|'chemistry'='plain'):StudyFormulaPart=>({kind:'literal',syntax,value:cleanText(value)});
export function templatePart(id:string,fields?:Record<string,string>):StudyFormulaPart{
 const tpl=findVisualTemplate(id);if(!tpl)throw Error('Mẫu công thức không hợp lệ');
 return {kind:'template',templateId:id,fields:fields?{...fields}:sampleFields(tpl)};
}
export function isFormulaPartComplete(part:StudyFormulaPart):boolean{
 if(part.kind==='literal')return Boolean(part.value?.trim()) && (part.syntax!=='chemistry'||parseChemicalSpecies(part.value||'').ok);
 const tpl=findVisualTemplate(part.templateId||'');
 return Boolean(tpl && tpl.slots.every(slot=>Boolean(part.fields?.[slot.key]?.trim())));
}
export function compileFormulaParts(parts:readonly StudyFormulaPart[],strict=false):string{
 if(parts.length>MAX_EXPRESSION_PARTS)throw Error('Công thức có quá nhiều phần.');
 const result=parts.map(part=>{
  if(strict&&!isFormulaPartComplete(part))throw Error('Hãy nhập đủ các ô trong công thức.');
  if(part.kind==='literal'){
   if(part.syntax==='chemistry'){
    const r=parseChemicalSpecies(part.value||'');
    if(!r.ok){if(strict)throw Error(r.message);return cleanText(part.value||'');}
    return '\\,'+r.tex;
   }
   return cleanText(part.value||'').replace(/×/g,'\\times ').replace(/÷/g,'\\div ').replace(/±/g,'\\pm ');
  }
  const tpl=findVisualTemplate(part.templateId||'');
  if(!tpl)throw Error('Mẫu công thức không hợp lệ');
  let formula='';
  try { formula=compileVisualFormula(tpl.id,part.fields||{}); }
  catch(e) {
   if(strict)throw e;
   // An in-progress reaction or incomplete chemistry must not blank the WHOLE preview.
   formula=String.raw`\square`;
  }
  return formula+formatFormulaFollow(part.fields?.[FORMULA_FOLLOW_FIELD]||'').tex;
 }).join('');
 if(strict && (parts[parts.length-1]?.kind==='literal') && /[+−×÷=<>\-]$/.test((parts[parts.length-1].value||'').trim()))throw Error('Công thức còn thiếu phần sau dấu phép toán.');
 if(result.length>MAX_COMPOUND_TEX_LENGTH)throw Error('Công thức quá dài.');
 return result;
}
export function compoundFromSaved(value:string,parts?:StudyFormulaPart[],oldTemplate?:string,oldFields?:Record<string,string>):StudyFormulaPart[]|null{
 // null means advanced TeX which cannot safely be parsed into slots; never silently lose it.
 if(Array.isArray(parts)&&parts.length){
  if(parts.length>MAX_EXPRESSION_PARTS||parts.some(part=>part.kind!=='literal'&&part.kind!=='template'))return null;
  try {compileFormulaParts(parts);return parts.map(part=>part.kind==='literal'?textPart(part.value||'',part.syntax==='chemistry'?'chemistry':'plain'):templatePart(part.templateId||'',part.fields))}catch{return null;}
 }
 if(oldTemplate&&oldFields&&findVisualTemplate(oldTemplate))return [templatePart(oldTemplate,oldFields)];
 const legacy=migrateLegacyFormula(value);
 if(legacy)return [templatePart(legacy.id,legacy.fields)];
 if(!value.trim())return [];
 // Legacy plain expression, without TeX commands, can be edited as a single literal.
 if(!/[\\{}]/.test(value))return [textPart(value)];
 return null;
}
export function moveFormulaPart(parts:readonly StudyFormulaPart[],from:number,to:number):StudyFormulaPart[]{
 if(from<0||from>=parts.length||to<0||to>=parts.length)return [...parts];
 const next=[...parts];const [item]=next.splice(from,1);next.splice(to,0,item);return next;
}
