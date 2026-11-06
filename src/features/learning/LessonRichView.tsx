import { useBloomThemeRevision , useBloomColorsRevision} from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { COLORS } from '../../constants/theme';
import React, {useMemo} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {inlineTokens, LessonBlock, parseLessonBlocks} from './richLesson';
import {NativeFormula} from '../study/StudyFormula';
import {splitLessonMathInline} from '../study/StudyMathParser';
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


type Colors={text:string;muted:string;tint:string;border:string;surface:string;lightTint:string};
const TONES={
  story:{icon:'🌷',label:'Câu chuyện khởi động',get background(){return COLORS.surface},get edge(){return COLORS.primary}},
  activity:{icon:'🎲',label:'Cùng thực hành',get background(){return COLORS.surface},get edge(){return COLORS.primary}},
  remember:{icon:'⭐',label:'Điều cần ghi nhớ',get background(){return COLORS.softSurface},get edge(){return COLORS.primary}},
  tip:{icon:'💡',label:'Mẹo học nhanh',get background(){return COLORS.surface},get edge(){return COLORS.primary}},
  challenge:{icon:'🏆',label:'Thử thách Bloom',get background(){return COLORS.surface},get edge(){return COLORS.primary}},
  example:{icon:'✏️',label:'Ví dụ mẫu',get background(){return COLORS.surface},get edge(){return COLORS.primary}}
} as const;
/** Renders inline math in lesson headings, tables, lists and callouts. Plain prose stays cheap native Text. */
export function RichLine({content,colors,base=16,bold=false}:{content:string;colors:Colors;base?:number;bold?:boolean}){
  const pieces=splitLessonMathInline(content);
  const style={fontSize:base,lineHeight:base*1.58,color:colors.text,flexShrink:1 as const,fontWeight:(bold?'800':'400') as '800'|'400'};
  const renderProse=(fragment:string,key:string)=><Text key={key} style={style} selectable>{inlineTokens(fragment).map((token,index)=><Text key={`${index}-${token.style}`} style={
    token.style==='strong'?{fontWeight:'800',color:colors.text}:
    token.style==='highlight'?{fontWeight:'800',color:colors.tint,backgroundColor:colors.lightTint}:
    token.style==='emphasis'?{fontStyle:'italic'}:
    token.style==='code'?{fontFamily:'monospace',fontWeight:'700',color:colors.tint}:undefined}>{token.text}</Text>)}</Text>;
  if(!pieces.some(x=>x.kind==='math'))return renderProse(content,'prose');
  return <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:4,flexShrink:1}}>
    {pieces.map((p,i)=>p.kind==='math'?<View key={i} style={{maxWidth:'100%'}}><NativeFormula tex={p.value}/></View>:renderProse(p.value,'prose-'+i))}
  </View>;
}

function RenderBlock({block,colors}:{block:LessonBlock;colors:Colors}):React.ReactElement{
  const __a3Colors = useA3Theme().colors;

  useBloomColorsRevision();
  switch(block.kind){
    case 'heading':return <View style={{marginTop:block.level===1?8:14,marginBottom:4}}><RichLine content={block.text} base={block.level===1?25:block.level===2?20:17} bold colors={colors}/></View>;
    case 'paragraph':return <View style={{marginVertical:5}}><RichLine content={block.text} colors={colors}/></View>;
    case 'quote':return <View style={{borderLeftWidth:4,borderLeftColor:colors.tint,paddingLeft:12,marginVertical:8}}><RichLine content={block.text} colors={colors}/></View>;
    case 'math':return <View style={{backgroundColor:colors.lightTint,borderRadius:12,marginVertical:7,padding:12}}><NativeFormula tex={block.tex}/></View>;
    case 'divider':return <View style={{height:1,backgroundColor:colors.border,marginVertical:10}}/>;
    case 'image':return <View style={{marginVertical:9,gap:5}}><Image source={{uri:block.url}} resizeMode="contain" style={{width:'100%',height:185,borderRadius:12,backgroundColor:colors.lightTint}}/><Text style={{fontSize:12,color:colors.muted,textAlign:'center'}}>{block.alt}</Text></View>;
    case 'list':return <View style={{gap:7,marginVertical:7}}>{block.items.map((item,i)=><View key={i} style={{flexDirection:'row',gap:8,alignItems:'flex-start'}}><Text style={{fontSize:15,fontWeight:'800',color:colors.tint,minWidth:19}}>{block.ordered?`${i+1}.`:'•'}</Text><View style={{flex:1}}><RichLine content={item} colors={colors}/></View></View>)}</View>;
    case 'table':return <View style={{borderRadius:13,borderWidth:1,borderColor:colors.border,overflow:'hidden',marginVertical:9}}>
      {[block.headers,...block.rows].map((cells,i)=><View key={i} style={{flexDirection:'row',backgroundColor:i===0?colors.lightTint:colors.surface,borderBottomWidth:i<block.rows.length?1:0,borderBottomColor:colors.border}}>
        {block.headers.map((_,j)=><View key={j} style={{flex:1,paddingVertical:9,paddingHorizontal:7}}><RichLine content={cells[j]??''} colors={colors} base={13} bold={i===0}/></View>)}
      </View>)}
    </View>;
    case 'callout':{
      const tone=TONES[block.tone];
      return <View style={{backgroundColor:tone.background,borderLeftWidth:5,borderLeftColor:tone.edge,borderRadius:16,padding:13,marginVertical:10,gap:5}}>
        <Text style={{fontSize:15,fontWeight:'800',color:__a3Colors.primaryText}}>{tone.icon}  {tone.label}</Text>
        {block.blocks.map((child,i)=><RenderBlock key={i} block={child} colors={{...colors,text:__a3Colors.primaryText,muted:__a3Colors.secondaryText,lightTint:__a3Colors.surface,surface:__a3Colors.heroSurface}}/>)}
      </View>;
    }
  }
}
export default function LessonRichView({markdown,colors}:{markdown:string;colors:Colors}){
  const __a3_s = useA3LegacyStyles(s);

  
  const blocks=useMemo(()=>parseLessonBlocks(markdown),[markdown]);
  if(!markdown.trim())return <Text style={[__a3_s.empty,{color:colors.muted}]}>Bài chưa có nội dung. Hãy nhập văn bản để xem trước.</Text>;
  return <View style={__a3_s.container} accessibilityLabel="Nội dung bài học được trình bày với tiêu đề và các phần nhấn mạnh">
    {blocks.map((block,i)=><RenderBlock key={i} block={block} colors={colors}/>)}
  </View>;
}
const s=createBloomStyles(() => StyleSheet.create({container:{gap:2},empty:{fontSize:14,lineHeight:22}}));
