/** Super Bloom Native Math AST. Pure, bounded TeX subset; no browser, network or Firestore.
 * Original TeX always remains the source of truth. Unknown commands render visibly.
 */
export type MathNode =
 | {kind:'text';value:string}
 | {kind:'row';children:MathNode[]}
 | {kind:'fraction';top:MathNode;bottom:MathNode}
 | {kind:'root';body:MathNode;index?:MathNode}
 | {kind:'script';body:MathNode;sup?:MathNode;sub?:MathNode}
 | {kind:'large';symbol:string;sup?:MathNode;sub?:MathNode}
 | {kind:'limit';condition?:MathNode;upper?:MathNode}
 | {kind:'matrix';style:'bmatrix'|'pmatrix'|'matrix';rows:MathNode[][]}
 | {kind:'accent';symbol:string;body:MathNode};
const aliases:Record<string,string>={
  times:'×',cdot:'·',div:'÷',pm:'±',mp:'∓',le:'≤',leq:'≤',ge:'≥',geq:'≥',ne:'≠',neq:'≠',approx:'≈',equiv:'≡',infty:'∞',
  to:'→',rightarrow:'→',longrightarrow:'⟶',leftarrow:'←',leftrightarrow:'↔',rightleftharpoons:'⇌',implies:'⇒',iff:'⇔',
  alpha:'α',beta:'β',gamma:'γ',delta:'δ',Delta:'Δ',theta:'θ',lambda:'λ',mu:'μ',pi:'π',rho:'ρ',sigma:'σ',omega:'ω',
  phi:'φ',varphi:'φ',partial:'∂',nabla:'∇',degree:'°',circ:'°',cdots:'⋯',ldots:'…',therefore:'∴',
  square:'□',Box:'□',placeholder:'□',qquad:'    ',sin:'sin',cos:'cos',tan:'tan',log:'log',ln:'ln',exp:'exp',lim:'lim',
};
const largeSymbols:Record<string,string>={int:'∫',iint:'∬',oint:'∮',sum:'∑',prod:'∏',bigcup:'⋃',bigcap:'⋂'};
const textNode=(value:string):MathNode=>({kind:'text',value});
const row=(children:MathNode[]):MathNode=>children.length===1?children[0]:{kind:'row',children};
export function parseStudyMath(input:string):MathNode {
 let value=String(input||'').trim().slice(0,2400);
 // Strip display delimiters at render time only. Saved content stays untouched.
 if(value.startsWith('$$')&&value.endsWith('$$'))value=value.slice(2,-2);
 else if(value.startsWith('$')&&value.endsWith('$'))value=value.slice(1,-1);
 else if(value.startsWith('\\[')&&value.endsWith('\\]'))value=value.slice(2,-2);
 else if(value.startsWith('\\(')&&value.endsWith('\\)'))value=value.slice(2,-2);
 // Small mhchem-compatible subset for published lessons; structural chemistry TeX also works.
 value=value.replace(/\\ce\{([^{}]{1,512})\}/g,(_,chemical:string)=>chemical
  .replace(/<=>/g,'\\rightleftharpoons').replace(/->/g,'\\rightarrow')
  .replace(/([A-Za-z\)])(\d+)/g,'$1_{$2}'));
 let i=0;let count=0;
 const bounded=()=>{if(++count>480)throw new Error('formula too long')};
 const parse=(close?:string,depth=0):MathNode=>{
  if(depth>16)throw new Error('formula nesting limit');
  const children:MathNode[]=[];
  while(i<value.length){
   if(close&&value[i]===close){i++;break;}
   if(value[i]==='}'||value[i]===']'){children.push(textNode(value[i++]));continue;}
   bounded();let n:MathNode;
   if(value[i]==='{'){i++;n=parse('}',depth+1)}
   else if(value[i]==='\\'){
    i++;const rest=/^[A-Za-z]+/.exec(value.slice(i));let cmd='';
    if(rest){cmd=rest[0];i+=cmd.length;}else cmd=value[i++]||'';
    const arg=()=>{if(value[i]==='{'){i++;return parse('}',depth+1)}if(i<value.length){const one=value[i++];return textNode(one)}return textNode('');};
    if(cmd==='begin'){
     // Matrix rows and columns are structural. Never display raw TeX environment as prose.
     const envMatch=/^\{(bmatrix|pmatrix|matrix)\}/.exec(value.slice(i));
     if(!envMatch){n=textNode('\\begin');}
     else{
      const env=envMatch[1] as 'bmatrix'|'pmatrix'|'matrix';i+=envMatch[0].length;
      const end='\\end{'+env+'}';const endIndex=value.indexOf(end,i);
      if(endIndex<0){n=textNode('□');i=value.length;}
      else{
       const body=value.slice(i,endIndex);i=endIndex+end.length;
       const cells=body.split(/\\\\/).map(line=>line.split('&'));
       const countCells=cells.reduce((total,line)=>total+line.length,0);
       if(cells.length>8||countCells>64||cells.some(line=>line.length>8))n=textNode('□');
       else n={kind:'matrix',style:env,rows:cells.map(line=>line.map(cell=>parseStudyMath(cell.trim())))};
      }
     }
    }
    else if(['frac','dfrac','tfrac'].includes(cmd))n={kind:'fraction',top:arg(),bottom:arg()};
    else if(cmd==='sqrt'){
     let index:MathNode|undefined;if(value[i]==='['){i++;index=parse(']',depth+1)}
     n={kind:'root',body:arg(),index};
    }else if(['mathrm','mathbf','mathit','text','operatorname','ce','pu','boldsymbol'].includes(cmd))n=arg();
    else if(['vec','overrightarrow','hat','bar','overline'].includes(cmd))n={kind:'accent',symbol:cmd==='vec'||cmd==='overrightarrow'?'→':cmd==='hat'?'^':'¯',body:arg()};
    else if(cmd==='lim')n={kind:'limit'};
    else if(cmd==='limits'||cmd==='nolimits'||cmd==='displaystyle'||cmd==='textstyle'){continue;}
    else if(cmd in largeSymbols)n={kind:'large',symbol:largeSymbols[cmd]};
    else if(cmd==='left'||cmd==='right'||cmd==='middle'){continue;}
    else if([',',';',':',' ','quad','qquad','!'].includes(cmd))n=textNode(cmd==='!'?'':cmd==='quad'?'  ':cmd==='qquad'?'    ':' ');
    else if(cmd in aliases)n=textNode(aliases[cmd]);
    else if(['{','}','[',']','_','^','$','%','#','&','\\'].includes(cmd))n=textNode(cmd);
    else n=textNode('\\'+cmd); // never silently discard unsupported mathematics
   }else n=textNode(value[i++]);
   // A display-style \lim can have \limits before its subscript.
   if(n.kind==='limit' && value.slice(i).startsWith('\\limits'))i+='\\limits'.length;
   // TeX sub/sup scripts attach to preceding symbol, group, or large operator.
   while(i<value.length && (value[i]==='_'||value[i]==='^')){
    const token=value[i++],v=argForScript(depth+1);
    if(n.kind==='limit')n={...n,[token==='^'?'upper':'condition']:v};
    else if(n.kind==='large')n={...n,[token==='^'?'sup':'sub']:v};
    else if(n.kind==='script')n={...n,[token==='^'?'sup':'sub']:v};
    else n={kind:'script',body:n,[token==='^'?'sup':'sub']:v};
   }
   children.push(n);
  }
  return row(children);
 };
 const argForScript=(depth:number):MathNode=>{
  if(i>=value.length)return textNode('');
  if(value[i]==='{'){i++;return parse('}',depth)}
  if(value[i]==='\\'){ // a single escaped symbol as script
   const m=/^\\[A-Za-z]+/.exec(value.slice(i));if(m){i+=m[0].length;return textNode(aliases[m[0].slice(1)]||m[0])}
  }
  return textNode(value[i++]);
 };
 try{return parse()}catch{return textNode(value)};
}
export function studyMathPlain(node:MathNode):string{
 switch(node.kind){
  case 'text':return node.value;
  case 'row':return node.children.map(studyMathPlain).join('');
  case 'fraction':return '('+studyMathPlain(node.top)+')/('+studyMathPlain(node.bottom)+')';
  case 'root':return (node.index?'root['+studyMathPlain(node.index)+']':'√')+'('+studyMathPlain(node.body)+')';
  case 'script':return studyMathPlain(node.body)+(node.sub?'_('+studyMathPlain(node.sub)+')':'')+(node.sup?'^('+studyMathPlain(node.sup)+')':'');
  case 'limit':return 'lim'+(node.condition?'_('+studyMathPlain(node.condition)+')':'');
  case 'matrix':return node.rows.map(line=>line.map(studyMathPlain).join(', ')).join('; ');
  case 'large':return node.symbol+(node.sub?'_('+studyMathPlain(node.sub)+')':'')+(node.sup?'^('+studyMathPlain(node.sup)+')':'');
  case 'accent':return studyMathPlain(node.body)+node.symbol;
 }
}
/** Detect math-delimited fragments from Bloom Content Studio Markdown without interpreting HTML. */
export type LessonMathSpan={kind:'text'|'math';value:string};
export function splitLessonMathInline(source:string):LessonMathSpan[]{
 const spans:LessonMathSpan[]=[];let pos=0;
 const re=/\\\(([^\n]*?)\\\)|\$([^$\n]{1,1800})\$/g;let m:RegExpExecArray|null;
 while((m=re.exec(source))){
  if(m.index>0&&source[m.index-1]==='\\'){continue;}
  if(m.index>pos)spans.push({kind:'text',value:source.slice(pos,m.index)});
  spans.push({kind:'math',value:m[1]??m[2]});pos=re.lastIndex;
 }
 if(pos<source.length)spans.push({kind:'text',value:source.slice(pos)});
 return spans.length?spans:[{kind:'text',value:source}];
}
