/** Offline, deterministic chemistry tokenizer/compiler for the on-demand Super Bloom editor.
 * Never infer a substance from arbitrary prose. Unknown/ambiguous input fails closed;
 * raw input stays editable. Chemistry is not validated for real-world reaction feasibility.
 */
export type ChemistryResult={ok:boolean;tex:string;message:string;warnings:string[];atoms:Record<string,number>};
const ELEMENTS=new Set(('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og').split(' '));
const fail=(message:string):ChemistryResult=>({ok:false,tex:'',message,warnings:[],atoms:{}});
const MAX_CHEM_LENGTH=180;
const tidy=(s:string)=>String(s||'').trim();
const readable=(s:string)=>s.replace(/\\/g,'').slice(0,80);
const protectCharge=(v:string)=>v.replace(/\^(?:\{(?:\d*)(?:\+|-)\}|(?:\d*)(?:\+|-))/g,match=>match.replace(/\+/g,'\uE000'));
const restoreCharge=(v:string)=>v.replace(/\uE000/g,'+');
const formatCoefficient=(text:string):string=>{
 if(!text)return '';
 if(text.includes('/')){const [top,bottom]=text.split('/');return `\\frac{${top}}{${bottom}}\\,`;}
 return text;
};
function parseTerm(input:string):ChemistryResult{
 let text=tidy(input);
 if(!text)return fail('Chưa nhập công thức chất.');
 if(text.length>MAX_CHEM_LENGTH)return fail('Công thức Hóa học quá dài.');
 if(/[\\{}]/.test(text)&&!/\^[{][0-9]*[+-][}]/.test(text))return fail('Hãy dùng chữ nguyên tố và số thông thường; điện tích viết dạng ^2+ hoặc ^{2+}.');
 let state='';const stateMatch=/\s*\((aq|s|l|g)\)$/.exec(text);
 if(stateMatch){state=stateMatch[1];text=text.slice(0,stateMatch.index).trim();}
 let charge='';const chargeMatch=/\^(?:\{(\d*[+-])\}|(\d*[+-]))$/.exec(text);
 if(chargeMatch){charge=chargeMatch[1]||chargeMatch[2];text=text.slice(0,chargeMatch.index);}
 // Deliberate ambiguity guard: Ca2+ may mean Ca_2 or Ca^{2+}. Require ^2+ for charge.
 if(/\d[+-]$/.test(text)||/[A-Za-z][+-]$/.test(text))return fail('Điện tích ion cần ghi rõ bằng dấu ^, ví dụ Ca^2+ hoặc Cl^-.');
 let coefficient='';let cm=/^(\d+\/\d+)\s+(?=[A-Z(\[])/.exec(text);
 if(cm){coefficient=cm[1];text=text.slice(cm[0].length);const [a,b]=coefficient.split('/').map(Number);if(!a||!b||a>999||b>999||/^0/.test(coefficient))return fail('Hệ số phân số phải dương và mẫu khác 0.');}
 else {cm=/^(\d+)(?=[A-Z(\[])/.exec(text);if(cm){coefficient=cm[1];text=text.slice(cm[1].length);if(!Number(coefficient)||Number(coefficient)>999||coefficient.startsWith('0'))return fail('Hệ số phản ứng phải là số dương hợp lệ.');}}
 if(!text)return fail('Thiếu công thức chất sau hệ số.');
 let index=0;let depth=0;
 function readGroup(closing?:string):{tex:string;atoms:Record<string,number>}|null {
  if(++depth>10)throw Error('Công thức lồng ngoặc quá sâu.');
  let tex='';const atoms:Record<string,number>={};let used=false;
  const count=()=>{const m=/^\d+/.exec(text.slice(index));if(!m)return 1;index+=m[0].length;const n=Number(m[0]);if(n<1||n>999||m[0].startsWith('0'))throw Error('Chỉ số nguyên tử phải là số nguyên dương, không bắt đầu bằng 0.');return n};
  while(index<text.length){const c=text[index];
   if(c===')'||c===']'){
    if(!closing||c!==closing)throw Error('Dấu ngoặc Hóa học chưa khớp.');
    index++;depth--;return used?{tex,atoms}:null;
   }
   if(c==='('||c==='['){index++;const inner=readGroup(c==='('?')':']');if(!inner)throw Error('Nhóm trong ngoặc không được để trống.');const n=count();tex+=`${c}${inner.tex}${c==='('?')':']'}${n===1?'':`_{${n}}`}`;for(const [k,v] of Object.entries(inner.atoms))atoms[k]=(atoms[k]||0)+v*n;used=true;continue;}
   if(!/[A-Z]/.test(c))throw Error(`Ký hiệu “${readable(c)}” không đúng vị trí trong công thức.`);
   const m=/^[A-Z][a-z]?/.exec(text.slice(index))!;const symbol=m[0];index+=symbol.length;
   if(!ELEMENTS.has(symbol))throw Error(`“${symbol}” không phải ký hiệu nguyên tố hợp lệ. Phân biệt CO và Co.`);
   const n=count();tex+=symbol+(n===1?'':`_{${n}}`);atoms[symbol]=(atoms[symbol]||0)+n;used=true;
  }
  if(closing)throw Error('Thiếu dấu đóng ngoặc Hóa học.');depth--;return used?{tex,atoms}:null;
 }
 try{
  const content=readGroup();if(!content||index!==text.length)return fail('Công thức chất chưa đầy đủ.');
  const mult=coefficient?(coefficient.includes('/')?Number(coefficient.split('/')[0])/Number(coefficient.split('/')[1]):Number(coefficient)):1;
  const atoms=Object.fromEntries(Object.entries(content.atoms).map(([k,v])=>[k,v*mult]));
  const suffix=charge?`^{${charge}}`:'';
  const tex=formatCoefficient(coefficient)+`\\mathrm{${content.tex}}`+suffix+(state?`\\,\\mathrm{(${state})}`:'');
  return {ok:true,tex,message:'Đã nhận diện cú pháp công thức Hóa học.',warnings:[],atoms};
 }catch(e){return fail(e instanceof Error?e.message:'Công thức Hóa học chưa hợp lệ.');}
}
/** A single species, optionally with coefficient, ionic charge and physical state. */
export function parseChemicalSpecies(input:string):ChemistryResult{return parseTerm(input)}
/** Reaction sides are intentionally distinct from ordinary arithmetic. Balanced atoms are only a warning. */
export function parseChemicalEquation(input:string):ChemistryResult{
 const original=tidy(input);
 if(!original)return fail('Chưa nhập phương trình phản ứng.');
 if(original.length>500)return fail('Phương trình phản ứng quá dài.');
 const safe=protectCharge(original);
 const arrows=safe.match(/<=>|<->|⇌|↔|->|→|=/g)||[];
 if(arrows.length!==1)return fail('Phương trình cần đúng một mũi tên phản ứng: -> hoặc <=>.');
 const marker=arrows[0];const place=safe.indexOf(marker);
 const sides=[safe.slice(0,place),safe.slice(place+marker.length)];
 if(sides.some(s=>!s.trim()))return fail('Hãy nhập cả chất tham gia và sản phẩm.');
 const sideAtoms:Record<string,number>[]=[];const rendered:string[]=[];
 for(const side of sides){const tokens=side.split('+').map(x=>restoreCharge(x).trim());
  if(!tokens.length||tokens.some(t=>!t))return fail('Dấu + phải nằm giữa hai chất. Điện tích ion dùng ^, ví dụ Ca^2+.');
  let total:Record<string,number>={};let texParts:string[]=[];
  for(const token of tokens){const r=parseTerm(token);if(!r.ok)return r;texParts.push(r.tex);for(const [k,n] of Object.entries(r.atoms))total[k]=(total[k]||0)+n;}
  sideAtoms.push(total);rendered.push(texParts.join(' + '));
 }
 const keys=new Set([...Object.keys(sideAtoms[0]),...Object.keys(sideAtoms[1])]);
 const unbalanced=[...keys].filter(k=>Math.abs((sideAtoms[0][k]||0)-(sideAtoms[1][k]||0))>0.000001);
 const arrow=marker==='<=>'||marker==='<->'||marker==='⇌'||marker==='↔'?'\\rightleftharpoons':'\\rightarrow';
 return {ok:true,tex:rendered[0]+` ${arrow} `+rendered[1],message:'Đã nhận diện cú pháp phương trình.',warnings:unbalanced.length?[`Phương trình chưa cân bằng nguyên tố: ${unbalanced.join(', ')}. Có thể lưu để đặt câu hỏi.`]:[],atoms:{}};
}
export function compileChemicalIon(formula:string,chargeInput:string):ChemistryResult{
 const r=parseTerm(formula);if(!r.ok)return r;
 if(/\^/.test(formula))return fail('Điện tích đã có trong công thức, không nhập lặp lại.');
 const charge=tidy(chargeInput);
 if(!/^(?:[1-9]\d{0,2})?[+-]$/.test(charge))return fail('Điện tích phải là +, -, 2+, 3-, ...');
 return {...r,tex:r.tex+`^{${charge}}`};
}
/** Isotopic notation is verified against the chemical symbol and atomic number. */
export function compileChemicalIsotope(symbolInput:string,massInput:string,atomicInput:string):ChemistryResult {
 const symbol=tidy(symbolInput),mass=tidy(massInput),atomic=tidy(atomicInput);
 if(!ELEMENTS.has(symbol))return fail('Ký hiệu đồng vị phải là một nguyên tố hợp lệ.');
 if(!/^[1-9]\d{0,2}$/.test(atomic)||![...ELEMENTS].includes(symbol))return fail('Số hiệu nguyên tử chưa hợp lệ.');
 const expected=[...ELEMENTS].indexOf(symbol)+1;
 if(Number(atomic)!==expected)return fail(`Số hiệu nguyên tử của ${symbol} phải là ${expected}.`);
 if(!/^[1-9]\d{0,2}$/.test(mass)||Number(mass)<expected)return fail('Số khối phải là số nguyên và không nhỏ hơn số hiệu nguyên tử.');
 return {ok:true,tex:`{}_{${atomic}}^{${mass}}\\mathrm{${symbol}}`,message:'Đồng vị có ký hiệu và số hiệu nguyên tử phù hợp.',warnings:[],atoms:{[symbol]:1}};
}
