/** Zero-dependency, pure template catalog. Imported only by the on-demand formula composer.
 * Values remain human-editable TeX plus structured slot data; no HTML or WebView involved. */
import {parseChemicalSpecies,parseChemicalEquation,compileChemicalIon,compileChemicalIsotope} from './StudyChemistry';
export type FormulaGroup = 'math'|'physics'|'chemistry';
export type FormulaSlot={key:string;label:string;example:string};
export type VisualFormulaTemplate={id:string;group:FormulaGroup;label:string;symbol:string;slots:readonly FormulaSlot[];compile:(fields:Record<string,string>)=>string};
const slot=(key:string,label:string,example:string):FormulaSlot=>({key,label,example});
const template=(id:string,group:FormulaGroup,label:string,symbol:string,slots:FormulaSlot[],compile:(values:Record<string,string>)=>string):VisualFormulaTemplate=>({id,group,label,symbol,slots,compile});
const v=(f:Record<string,string>,k:string)=>String(f[k]||'').trim().slice(0,60).replace(/[{}\\]/g,'');
const m=(f:Record<string,string>,k:string)=>v(f,k)||'\\square';
const chemistry=(raw:string,kind:'species'|'equation')=>{
 const r=kind==='species'?parseChemicalSpecies(raw):parseChemicalEquation(raw);
 if(!r.ok)throw Error(r.message);
 return r.tex;
};
export const VISUAL_FORMULA_TEMPLATES:readonly VisualFormulaTemplate[]=[
 template('fraction','math','Phân số','a/b',[slot('top','Tử số','3'),slot('bottom','Mẫu số','4')],f=>`\\frac{${m(f,'top')}}{${m(f,'bottom')}}`),
 template('mixed','math','Hỗn số','1 ½',[slot('whole','Phần nguyên','2'),slot('top','Tử số','1'),slot('bottom','Mẫu số','3')],f=>`${m(f,'whole')}\\;\\frac{${m(f,'top')}}{${m(f,'bottom')}}`),
 template('square','math','Lũy thừa','xⁿ',[slot('base','Cơ số','x'),slot('power','Số mũ','2')],f=>`${m(f,'base')}^{${m(f,'power')}}`),
 template('index','math','Chỉ số dưới','xₙ',[slot('base','Ký hiệu','a'),slot('index','Chỉ số','1')],f=>`${m(f,'base')}_{${m(f,'index')}}`),
 template('sqrt','math','Căn bậc hai','√',[slot('value','Biểu thức dưới căn','25')],f=>`\\sqrt{${m(f,'value')}}`),
 template('nthroot','math','Căn bậc n','ⁿ√',[slot('n','Bậc căn','3'),slot('value','Biểu thức dưới căn','8')],f=>`\\sqrt[${m(f,'n')}]{${m(f,'value')}}`),
 template('equation','math','Phương trình','x =',[slot('left','Vế trái','2x+3'),slot('right','Vế phải','7')],f=>`${m(f,'left')}=${m(f,'right')}`),
 template('quadratic','math','Tam thức bậc 2','ax²',[slot('a','Hệ số a','1'),slot('b','Hệ số b','-5'),slot('c','Hệ số c','6')],f=>`${m(f,'a')}x^{2}+(${m(f,'b')})x+(${m(f,'c')})=0`),
 template('inequality','math','Bất phương trình','a ≤ b',[slot('left','Vế trái','x+1'),slot('right','Vế phải','5')],f=>`${m(f,'left')}\\le ${m(f,'right')}`),
 template('sum','math','Tổng Σ','Σ',[slot('variable','Biến','i'),slot('from','Bắt đầu','1'),slot('to','Kết thúc','n'),slot('expr','Biểu thức','i')],f=>`\\sum_{${m(f,'variable')}=${m(f,'from')}}^{${m(f,'to')}} ${m(f,'expr')}`),
 template('integral','math','Tích phân','∫',[slot('from','Cận dưới','0'),slot('to','Cận trên','1'),slot('expr','Hàm số','x^2'),slot('by','Biến','x')],f=>`\\int_{${m(f,'from')}}^{${m(f,'to')}}${m(f,'expr')}\\,d${m(f,'by')}`),
 template('limit','math','Giới hạn','lim',[slot('by','Biến','x'),slot('to','Tiến tới','0'),slot('expr','Biểu thức','sin(x)/x')],f=>`\\lim_{${m(f,'by')}\\to ${m(f,'to')}}${m(f,'expr')}`),
 template('absolute','math','Giá trị tuyệt đối','|x|',[slot('value','Biểu thức','-3')],f=>`\\left|${m(f,'value')}\\right|`),
 template('vector','math','Vectơ','→v',[slot('value','Ký hiệu vectơ','AB')],f=>`\\vec{${m(f,'value')}}`),
 template('matrix2','math','Ma trận 2×2','[a b]',[slot('a','Ô 1,1','1'),slot('b','Ô 1,2','2'),slot('c','Ô 2,1','3'),slot('d','Ô 2,2','4')],f=>`\\begin{bmatrix}${m(f,'a')}&${m(f,'b')}\\\\${m(f,'c')}&${m(f,'d')}\\end{bmatrix}`),
 template('speed','physics','Vận tốc','v=s/t',[slot('distance','Quãng đường s','120'),slot('time','Thời gian t','2')],f=>`v=\\frac{${m(f,'distance')}}{${m(f,'time')}}`),
 template('accel','physics','Gia tốc','a=Δv/t',[slot('dv','Độ biến thiên vận tốc','20'),slot('time','Thời gian','4')],f=>`a=\\frac{${m(f,'dv')}}{${m(f,'time')}}`),
 template('force','physics','Định luật II','F=ma',[slot('mass','Khối lượng m','5'),slot('accel','Gia tốc a','2')],f=>`\\vec{F}=${m(f,'mass')}\\vec{a}\\;(${m(f,'accel')})`),
 template('ohm','physics','Định luật Ôm','I=U/R',[slot('voltage','Hiệu điện thế U','12'),slot('resistance','Điện trở R','6')],f=>`I=\\frac{${m(f,'voltage')}}{${m(f,'resistance')}}`),
 template('kinetic','physics','Động năng','½mv²',[slot('mass','Khối lượng m','2'),slot('speed','Vận tốc v','3')],f=>`W_d=\\frac{1}{2}${m(f,'mass')}(${m(f,'speed')})^{2}`),
 template('potential','physics','Thế năng','mgh',[slot('mass','Khối lượng m','2'),slot('g','Gia tốc trọng trường g','9.8'),slot('height','Độ cao h','4')],f=>`W_t=${m(f,'mass')}\\cdot${m(f,'g')}\\cdot${m(f,'height')}`),
 template('pressure','physics','Áp suất','p=F/S',[slot('force','Lực F','100'),slot('area','Diện tích S','5')],f=>`p=\\frac{${m(f,'force')}}{${m(f,'area')}}`),
 template('density','physics','Khối lượng riêng','ρ=m/V',[slot('mass','Khối lượng m','12'),slot('volume','Thể tích V','3')],f=>`\\rho=\\frac{${m(f,'mass')}}{${m(f,'volume')}}`),
 template('power','physics','Công suất','P=A/t',[slot('work','Công A','100'),slot('time','Thời gian t','5')],f=>`P=\\frac{${m(f,'work')}}{${m(f,'time')}}`),
 template('unit','physics','Đại lượng/đơn vị','3 m/s',[slot('value','Giá trị','9.8'),slot('unit','Đơn vị','m/s2')],f=>`${m(f,'value')}\\;\\mathrm{${m(f,'unit')}}`),
 template('chemical','chemistry','Công thức chất','H₂SO₄',[slot('formula','Ký hiệu/nguyên tử và chỉ số','H2SO4')],f=>chemistry(v(f,'formula'),'species')),
 template('ion','chemistry','Ion','Ca²⁺',[slot('formula','Ký hiệu chất','Ca'),slot('charge','Điện tích','2+')],f=>{const r=compileChemicalIon(v(f,'formula'),v(f,'charge'));if(!r.ok)throw Error(r.message);return r.tex;}),
 template('reaction','chemistry','Phương trình phản ứng','→',[slot('left','Chất tham gia','2H2 + O2'),slot('right','Sản phẩm','2H2O')],f=>chemistry(`${v(f,'left')} -> ${v(f,'right')}`,'equation')),
 template('equilibrium','chemistry','Cân bằng','⇌',[slot('left','Chất tham gia','N2 + 3H2'),slot('right','Sản phẩm','2NH3')],f=>chemistry(`${v(f,'left')} <=> ${v(f,'right')}`,'equation')),
 template('moles','chemistry','Số mol','n=m/M',[slot('mass','Khối lượng m','18'),slot('molar','Khối lượng mol M','18')],f=>`n=\\frac{${m(f,'mass')}}{${m(f,'molar')}}`),
 template('molarity','chemistry','Nồng độ mol','C=n/V',[slot('moles','Số mol','0.5'),slot('volume','Thể tích (L)','2')],f=>`C_M=\\frac{${m(f,'moles')}}{${m(f,'volume')}}`),
 template('ph','chemistry','pH','pH',[slot('h','[H⁺]','0.001')],f=>`pH=-\\log[H^{+}]=-\\log(${m(f,'h')})`),
 template('isotope','chemistry','Đồng vị','ᴬZX',[slot('mass','Số khối A','14'),slot('atomic','Số hiệu Z','6'),slot('symbol','Nguyên tố','C')],f=>{const r=compileChemicalIsotope(v(f,'symbol'),v(f,'mass'),v(f,'atomic'));if(!r.ok)throw Error(r.message);return r.tex;}),
];
export const findVisualTemplate=(id:string)=>VISUAL_FORMULA_TEMPLATES.find(t=>t.id===id);
export const sampleFields=(t:VisualFormulaTemplate):Record<string,string>=>Object.fromEntries(t.slots.map(s=>[s.key,'']));
export const compileVisualFormula=(id:string,fields:Record<string,string>):string=>{const t=findVisualTemplate(id);if(!t)throw Error('Unknown formula template');return t.compile(fields)};
/** Best-effort recovery of legacy TeX so earlier fractions/powers can be edited visually. */
export function migrateLegacyFormula(tex:string):{id:string;fields:Record<string,string>}|null{
 const value=tex.trim();let match:RegExpExecArray|null;
 if((match=/^\\frac\{([^{}]+)\}\{([^{}]+)\}$/.exec(value)))return {id:'fraction',fields:{top:match[1],bottom:match[2]}};
 if((match=/^\\sqrt\{([^{}]+)\}$/.exec(value)))return {id:'sqrt',fields:{value:match[1]}};
 if((match=/^([^{}^_]+)\^\{([^{}]+)\}$/.exec(value)))return {id:'square',fields:{base:match[1],power:match[2]}};
 if((match=/^([^{}^_]+)_\{([^{}]+)\}$/.exec(value)))return {id:'index',fields:{base:match[1],index:match[2]}};
 return null;
}
