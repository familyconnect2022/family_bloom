/** Super Bloom math renderer: lazy in study screens, native/offline, source TeX retained unchanged. */
import React from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import type {StudyBlock} from './studyRepository';
import {studyRelationGlyph} from './StudySolutionModel';
import {parseStudyMath,studyMathPlain,type MathNode} from './StudyMathParser';
export {parseStudyMath,studyMathPlain,splitLessonMathInline} from './StudyMathParser';
export const FORMULA_TEMPLATES=[
 {label:'a/b',value:String.raw`\frac{a}{b}`},{label:'√',value:String.raw`\sqrt{x}`},
 {label:'x²',value:'x^{2}'},{label:'xₙ',value:'x_{n}'},{label:'±',value:String.raw`\pm`},
 {label:'→',value:String.raw`\rightarrow`},{label:'∑',value:String.raw`\sum_{i=1}^{n}`},
 {label:'Vectơ',value:String.raw`\vec{F}`},{label:'H₂O',value:String.raw`\mathrm{H_{2}O}`},
 {label:'P.ứng',value:String.raw`\mathrm{2H_{2}+O_{2}\rightarrow 2H_{2}O}`},
 {label:'m/s²',value:String.raw`\frac{m}{s^{2}}`},{label:'Tích phân',value:String.raw`\int_{a}^{b}f(x)\,dx`},
];
export function formulaToAccessibleText(src:string):string{return studyMathPlain(parseStudyMath(src))}
/** Spacing is structural, not encoded as text; avoids `dx+√` and `v=...` collisions. */
export function mathOperatorSpacing(node:MathNode,index:number):number {
 if(node.kind!=='text')return 0;
 return index===0?0:/^[+\-−×÷=<>≤≥≠≈±∓·]$/.test(node.value)?6:0;
}
type Point = readonly [number, number];
/** Continuous geometric root: hook, descending stroke and vinculum share one rail.
 * The rail measures the full radicand height (including fractions/nested roots),
 * so the top stroke always joins its bar at precisely the same pixel.
 */
function RootSegment({from,to,stroke}:{from:Point;to:Point;stroke:number}) {
 const dx=to[0]-from[0],dy=to[1]-from[1];
 const length=Math.hypot(dx,dy);
 return <View pointerEvents="none" style={{position:'absolute',left:(from[0]+to[0]-length)/2,top:(from[1]+to[1]-stroke)/2,width:length,height:stroke,borderRadius:stroke/2,backgroundColor:'#704D63',transform:[{rotate:`${Math.atan2(dy,dx)*180/Math.PI}deg`}]}}/>;
}
const RootInk=React.memo(function RootInk({node,scale}:{node:Extract<MathNode,{kind:'root'}>;scale:number}) {
 const [height,setHeight]=React.useState(Math.max(31,27*scale));
 const stroke=Math.max(1.8,2*scale),w=Math.max(21,23*scale);
 const a:Point=[w*.12,height*.64],b:Point=[w*.34,height*.59],c:Point=[w*.53,height-2],d:Point=[w,stroke/2];
 return <View style={[s.rootContainer,{marginTop:node.index?8:3}]}>
   <View style={{width:w,height,alignSelf:'stretch'}} pointerEvents="none">
     <RootSegment from={a} to={b} stroke={stroke}/><RootSegment from={b} to={c} stroke={stroke}/><RootSegment from={c} to={d} stroke={stroke}/>
     {node.index&&<View style={{position:'absolute',right:w*.40,top:-Math.max(9,12*scale),zIndex:2}}><Ink node={node.index} scale={scale*.6} compact/></View>}
   </View>
   <View onLayout={e=>{const h=e.nativeEvent.layout.height;if(Math.abs(h-height)>.9)setHeight(h)}} style={[s.rootBody,{minHeight:Math.max(31,27*scale),borderTopWidth:stroke,paddingTop:Math.max(4,5*scale)}]}>
     <Ink node={node.body} scale={scale}/>
   </View>
 </View>;
});
type Props={node:MathNode;scale?:number;compact?:boolean};
const Ink=React.memo(function Ink({node,scale=1,compact=false}:Props):React.ReactElement{
 const base=Math.max(12,17*scale);
 switch(node.kind){
 case 'text':return <Text style={[s.mathText,{fontSize:base,lineHeight:base*1.45}]}>{node.value}</Text>;
 case 'row':return <View style={s.row}>{node.children.map((part,i)=><View key={i} style={!compact&&mathOperatorSpacing(part,i)?{marginHorizontal:mathOperatorSpacing(part,i)}:undefined}><Ink node={part} scale={scale} compact={compact}/></View>)}</View>;
 case 'fraction':return <View style={[s.fraction,{marginHorizontal:3}]}>
  <View style={s.fractionCenter}><Ink node={node.top} scale={scale*.86}/></View>
  <View style={s.fractionLine}/>
  <View style={s.fractionCenter}><Ink node={node.bottom} scale={scale*.86}/></View>
 </View>;
 case 'root':return <RootInk node={node} scale={scale}/>;
 case 'script':return <View style={s.row}>
  <Ink node={node.body} scale={scale}/>
  <View style={[s.scriptColumn,{minHeight:base*1.5,justifyContent:node.sup&&node.sub?'space-between':node.sup?'flex-start':'flex-end'}]}>{node.sup&&<Ink node={node.sup} scale={scale*.68} compact/>}{node.sub&&<Ink node={node.sub} scale={scale*.68} compact/>}</View>
 </View>;
 case 'large':return <View style={s.row}>
  <View style={s.largeGroup}>
   {node.sup&&<Ink node={node.sup} scale={scale*.65}/>}
   <Text style={[s.largeSymbol,{fontSize:base*1.72,lineHeight:base*1.9}]}>{node.symbol}</Text>
   {node.sub&&<Ink node={node.sub} scale={scale*.65}/>}
  </View>
 </View>;
 case 'limit':return <View style={s.limitBox}>
  {node.upper&&<Ink node={node.upper} scale={scale*.6} compact/>}
  <Text style={[s.limitSymbol,{fontSize:base*1.18,lineHeight:base*1.3}]}>lim</Text>
  {node.condition&&<View style={s.limitCondition}><Ink node={node.condition} scale={scale*.67} compact/></View>}
 </View>;
 case 'matrix':return <View style={s.matrixWrap}>
  {node.style!=='matrix'&&<Text style={[s.matrixBracket,{fontSize:Math.max(base*2.1,base*(node.rows.length*.95))}]}>{node.style==='pmatrix'?'(':'['}</Text>}
  <View style={s.matrixGrid}>{node.rows.map((line,i)=><View style={s.matrixRow} key={i}>{line.map((cell,j)=><View key={j} style={s.matrixCell}><Ink node={cell} scale={scale*.92}/></View>)}</View>)}</View>
  {node.style!=='matrix'&&<Text style={[s.matrixBracket,{fontSize:Math.max(base*2.1,base*(node.rows.length*.95))}]}>{node.style==='pmatrix'?')':']'}</Text>}
 </View>;
 case 'accent':return <View style={s.accent}><Text style={s.accentSymbol}>{node.symbol}</Text><Ink node={node.body} scale={scale}/></View>;
 }
});
/** Component stays View-based: scrolling overflow instead of clipping formula or truncating TeX. */
export const NativeFormula=React.memo(function NativeFormula({tex}:{tex:string}){
 const ast=React.useMemo(()=>parseStudyMath(tex),[tex]);
 const label=React.useMemo(()=>studyMathPlain(ast),[ast]);
 return <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={s.scrollContent} accessibilityLabel={'Công thức '+label}>
  <Ink node={ast}/>
 </ScrollView>;
});
/** A relation is a semantic link to the previous math step, not raw TeX.
 * A separate fixed-width left rail keeps ⇒ / ⇔ readable with long scrolling equations. */
export const StudyBlocksView=React.memo(function StudyBlocksView({blocks}:{blocks:StudyBlock[]}){
 return <View style={{gap:8}}>{blocks.map((b,i)=>b.kind==='formula'?<View key={i} style={s.formulaDisplay}>
  <View style={s.solutionEquation}>
   {!!b.relationBefore&&b.relationBefore!=='none'&&<Text style={s.solutionRelation} accessibilityLabel={b.relationBefore==='iff'?'Tương đương':b.relationBefore==='implies'?'Suy ra':'Bằng'}>{studyRelationGlyph[b.relationBefore]||''}</Text>}
   <View style={s.solutionEquationBody}><NativeFormula tex={b.value}/></View>
  </View>
 </View>:<Text key={i} selectable style={s.prose}>{b.value}</Text>)}</View>;
});
const s=StyleSheet.create({
 row:{flexDirection:'row',alignItems:'center'},rootContainer:{flexDirection:'row',alignItems:'stretch',marginHorizontal:3,marginTop:3},scrollContent:{alignItems:'center',minHeight:30,paddingRight:8},
 mathText:{color:'#54364E',fontWeight:'600',includeFontPadding:false},
 fraction:{minWidth:25,alignItems:'stretch',justifyContent:'center'},fractionCenter:{alignItems:'center',paddingHorizontal:4},
 fractionLine:{height:1.6,backgroundColor:'#704D63',marginVertical:3},
 rootBody:{borderColor:'#704D63',paddingHorizontal:6,justifyContent:'center',alignSelf:'stretch'},
 scriptColumn:{justifyContent:'center',alignItems:'flex-start',marginLeft:1},
 largeGroup:{alignItems:'center',justifyContent:'center',marginHorizontal:3},largeSymbol:{color:'#704D63',includeFontPadding:false,fontWeight:'500'},
 accent:{alignItems:'center',justifyContent:'center'},accentSymbol:{fontSize:13,color:'#704D63',lineHeight:13,marginBottom:-5,includeFontPadding:false},
 limitBox:{alignItems:'center',justifyContent:'center',marginHorizontal:5,flexShrink:0},limitSymbol:{fontWeight:'700',color:'#704D63',includeFontPadding:false,textAlign:'center'},
 limitCondition:{alignItems:'center',justifyContent:'center',alignSelf:'center',minWidth:35,marginTop:-1},
 matrixWrap:{flexDirection:'row',alignItems:'center',marginHorizontal:4},matrixBracket:{color:'#704D63',fontWeight:'300',includeFontPadding:false},matrixGrid:{gap:4,paddingVertical:3},matrixRow:{flexDirection:'row',justifyContent:'space-around',gap:12},matrixCell:{minWidth:24,alignItems:'center',justifyContent:'center'},
 solutionEquation:{flexDirection:'row',alignItems:'center',minWidth:0},solutionRelation:{fontSize:22,fontWeight:'700',color:'#80526D',minWidth:28,textAlign:'center',marginRight:8},solutionEquationBody:{flex:1,minWidth:0},
 formulaDisplay:{backgroundColor:'#FDF0F7',borderRadius:13,padding:12},prose:{color:'#4F4051',fontSize:15,lineHeight:23},
});
