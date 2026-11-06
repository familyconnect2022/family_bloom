import { BloomScaledInput } from '../../components/ui/BloomScaledInput';
import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { COLORS } from '../../constants/theme';
/** On-demand native compound formula editor: no WebView, no extra dependency, no bootstrap work. */
import React,{useMemo,useState} from 'react';
import {KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import type {StudyBlock,StudyFormulaPart} from './studyRepository';
import {FORMULA_TEMPLATES,NativeFormula} from './StudyFormula';
import {VISUAL_FORMULA_TEMPLATES,findVisualTemplate,type FormulaGroup} from './StudyFormulaTemplates';
import {parseChemicalSpecies,parseChemicalEquation} from './StudyChemistry';
import {COMPOUND_OPERATORS,FORMULA_FOLLOW_FIELD,MAX_EXPRESSION_PARTS,compileFormulaParts,compoundFromSaved,formatFormulaFollow,isFormulaPartComplete,moveFormulaPart,templatePart,textPart} from './StudyFormulaExpression';
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


const activeFollow=(part?:StudyFormulaPart)=>formatFormulaFollow(part?.kind==='template'?part.fields?.[FORMULA_FOLLOW_FIELD]||'':'');
const visualPartLabel=(part:StudyFormulaPart):string=>part.kind==='literal'?(part.syntax==='chemistry'?`Hóa: ${part.value||'...'}`:(part.value||'Số/chữ')):findVisualTemplate(part.templateId||'')?.label||'Công thức';
export function FormulaEditor({visible,initial='',initialBlock,onCancel,onSave}:{visible:boolean;initial?:string;initialBlock?:StudyBlock;onCancel:()=>void;onSave:(value:string,extra?:Pick<StudyBlock,'formulaTemplate'|'formulaFields'|'formulaParts'>)=>void}){
  const __a3Colors = useA3Theme().colors;
  const __a3_s = useA3LegacyStyles(s);

  
 const [initialParts]=useState(()=>compoundFromSaved(initial,initialBlock?.formulaParts,initialBlock?.formulaTemplate,initialBlock?.formulaFields));
 const [parts,setParts]=useState<StudyFormulaPart[]>(()=>initialParts??[]);
 const [selected,setSelected]=useState<number>(()=>(initialParts?.length??0)-1);
 const [group,setGroup]=useState<FormulaGroup>('math');
 const [advanced,setAdvanced]=useState(initialParts===null);
 const [draft,setDraft]=useState(initial);
 const [caret,setCaret]=useState<number|undefined>(undefined);
 const [error,setError]=useState('');
 // Optional inline continuation is stored in this template's existing editable fields.
 // No second mode picker or separate 'insert' action is necessary.
 const follow=useMemo(()=>activeFollow(parts[selected]),[parts,selected]);
 const active=parts[selected];
 const activeTemplate=active?.kind==='template'?findVisualTemplate(active.templateId||''):null;
 const reactionDiagnostic=useMemo(()=>{
  if(!active||active.kind!=='template'||!['reaction','equilibrium'].includes(active.templateId||''))return null;
  const left=active.fields?.left||'',right=active.fields?.right||'';
  return left.trim()&&right.trim()?parseChemicalEquation(`${left} ${active.templateId==='equilibrium'?'<=>':'->'} ${right}`):null;
 },[active]);
 const tex=useMemo(()=>{
  if(advanced)return draft;
  try{return compileFormulaParts(parts)}catch{return parts.length?String.raw`\square`:''}
 },[advanced,draft,parts]);
 const complete=useMemo(()=>{if(advanced)return Boolean(draft.trim());if(!parts.length||!parts.every(isFormulaPartComplete))return false;try{return Boolean(compileFormulaParts(parts,true).trim())}catch{return false}},[advanced,draft,parts]);
 const add=(part:StudyFormulaPart)=>{
  if(parts.length>=MAX_EXPRESSION_PARTS){setError('Một công thức tối đa 32 phần. Hãy chèn thành công thức mới nhé.');return;}
  setError('');setAdvanced(false);
  const position=selected>=0?Math.min(selected+1,parts.length):parts.length;
  setParts(v=>[...v.slice(0,position),part,...v.slice(position)]);setSelected(position);
 };
 const change=(key:string,value:string)=>setParts(v=>v.map((p,i)=>i!==selected?p:p.kind==='literal'?textPart(value,p.syntax==='chemistry'?'chemistry':'plain'):{...p,fields:{...p.fields,[key]:value.slice(0,60)}}));
 const remove=()=>{if(selected<0)return;setParts(v=>v.filter((_,i)=>i!==selected));setSelected(v=>Math.min(v,parts.length-2));setError('')};
 const move=(step:number)=>{const dest=selected+step;if(dest<0||dest>=parts.length)return;setParts(v=>moveFormulaPart(v,selected,dest));setSelected(dest)};
 const save=()=>{
  if(!complete){setError('Hãy nhập đủ các phần trước khi chèn.');return;}
  try{
   if(advanced){onSave(draft.trim());return;}
   const result=compileFormulaParts(parts,true);
   if(parts.length===1&&parts[0].kind==='template')onSave(result,{formulaTemplate:parts[0].templateId,formulaFields:{...parts[0].fields},formulaParts:parts});
   else onSave(result,{formulaParts:parts});
  }catch(e){setError((e as Error).message)}
 };
 const field=(key:string,label:string,hint:string)=><View key={key} style={__a3_s.slotWrap}>
  <Text style={__a3_s.slotLabel}>{label}</Text>
  <BloomScaledInput value={active?.fields?.[key]||''} onChangeText={v=>change(key,v)} accessibilityLabel={label} placeholder={hint} placeholderTextColor={__a3Colors.muted} autoCapitalize="none" autoCorrect={false} maxLength={60} style={__a3_s.slotInput}/>
 </View>;
 return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
  <KeyboardAvoidingView style={__a3_s.modal} behavior={Platform.OS==='ios'?'padding':'height'}>
   <View style={__a3_s.header}>
    <Pressable onPress={onCancel} accessibilityRole="button"><Text style={__a3_s.action}>Hủy</Text></Pressable>
    <Text style={__a3_s.heading}>Ghép công thức ƒx</Text>
    <Pressable disabled={!complete} onPress={save} accessibilityRole="button"><Text style={[__a3_s.action,!complete&&{opacity:.35}]}>Chèn</Text></Pressable>
   </View>
   <ScrollView keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag" contentContainerStyle={__a3_s.editorScroll}>
    <Text style={__a3_s.help}>Chọn một mẫu, điền các ô. Muốn viết ½ O₂, hãy chọn Phân số, nhập 1 và 2, rồi gõ O2 vào ô nét đứt bên dưới. Kết quả tự hiện ở phần xem trước.</Text>
    {!advanced?<>
     <View style={__a3_s.preview}><Text style={__a3_s.small}>XEM TRƯỚC CẢ BIỂU THỨC</Text>
      {tex?<NativeFormula tex={tex}/>:<Text style={__a3_s.empty}>Ví dụ: √25 + 3 hoặc ½ + x² − √9</Text>}
     </View>
     <View style={__a3_s.inputPanel}>
      <Text style={__a3_s.sectionTitle}>Các phần của biểu thức ({parts.length}/{MAX_EXPRESSION_PARTS})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={__a3_s.partsRow}>
       {parts.length?parts.map((p,i)=><Pressable key={i} onPress={()=>{setSelected(i);setError('')}} accessibilityRole="button" accessibilityLabel={`Sửa phần ${i+1}: ${visualPartLabel(p)}`} style={[__a3_s.partChip,selected===i&&__a3_s.partActive]}>
        <Text style={__a3_s.partIndex}>{i+1}</Text><Text style={__a3_s.partText} numberOfLines={1}>{visualPartLabel(p)}</Text>
       </Pressable>):<Text style={__a3_s.empty}>Chọn mẫu hoặc nhập Số/chữ bên dưới để bắt đầu.</Text>}
      </ScrollView>
      {!!parts.length&&<View style={__a3_s.editRow}>
       <Pressable onPress={()=>move(-1)} disabled={selected===0} style={__a3_s.editBtn}><Text style={__a3_s.editTxt}>← Dời trái</Text></Pressable>
       <Pressable onPress={()=>move(1)} disabled={selected===parts.length-1} style={__a3_s.editBtn}><Text style={__a3_s.editTxt}>Dời phải →</Text></Pressable>
       <Pressable onPress={remove} style={__a3_s.editBtn}><Text style={__a3_s.deleteTxt}>Xóa phần</Text></Pressable>
      </View>}
     </View>
     {active&&<View style={__a3_s.inputPanel}>
      <Text style={__a3_s.sectionTitle}>Sửa phần {selected+1}: {visualPartLabel(active)}</Text>
      {active.kind==='literal'&&active.syntax==='chemistry'&&active.value&&(!parseChemicalSpecies(active.value).ok)&&<Text style={__a3_s.extraWarning}>{parseChemicalSpecies(active.value).message}</Text>}
      {active.kind==='literal'?<BloomScaledInput accessibilityLabel="Nhập số, chữ hoặc phép toán" placeholder="Ví dụ: 3, x, +, =" placeholderTextColor={__a3Colors.muted} value={active.value||''} onChangeText={v=>change('value',v)} autoCapitalize="none" autoCorrect={false} maxLength={100} style={__a3_s.slotInput}/>:
       (active.templateId==='fraction'||active.templateId==='mixed')?<View style={__a3_s.fractionArea}>
        {active.templateId==='mixed'&&<View style={__a3_s.whole}>{field('whole','Phần nguyên','2')}</View>}
        <View style={__a3_s.fractionSlots}>{field('top','Tử số','3')}<View style={__a3_s.fractionBar}/>{field('bottom','Mẫu số','4')}</View>
       </View>:<View style={__a3_s.fieldsGrid}>{activeTemplate?.slots.map(t=><View key={t.key} style={__a3_s.fieldColumn}>{field(t.key,t.label,t.example)}</View>)}</View>}
      {active.kind==='template'&&<View style={__a3_s.extraPanel}>
       <Text style={__a3_s.extraHeading}>Viết thêm sau công thức (tùy chọn)</Text>
       <BloomScaledInput accessibilityLabel="Viết thêm sau công thức" value={active.fields?.[FORMULA_FOLLOW_FIELD]||''} onChangeText={v=>change(FORMULA_FOLLOW_FIELD,v)} placeholder="Ví dụ: O2, H2O hoặc x + 1" placeholderTextColor={__a3Colors.muted} autoCapitalize="none" autoCorrect={false} maxLength={100} style={__a3_s.extraInput}/>
       {!!follow.note&&<Text style={follow.kind==='uncertain'?__a3_s.extraWarning:__a3_s.extraOkay}>{follow.note}</Text>}
       <Text style={__a3_s.tip}>Ví dụ: Phân số 1/2 + nhập O2 tại đây = ½ O₂. Không cần chọn chế độ hay bấm Chèn thêm lần nữa.</Text>
      </View>}
      {reactionDiagnostic?.ok&&reactionDiagnostic.warnings.map((w,i)=><Text key={i} style={__a3_s.extraWarning}>{w}</Text>)}
      {reactionDiagnostic&&!reactionDiagnostic.ok&&<Text style={__a3_s.extraWarning}>{reactionDiagnostic.message}</Text>}
      <Text style={__a3_s.tip}>Đổi sang phần khác bằng cách chạm ô ở hàng “Các phần”. Mỗi phần giữ nguyên ô nhập khi sửa lại.</Text>
     </View>}
     <View style={__a3_s.inputPanel}><Text style={__a3_s.sectionTitle}>Thêm số, chữ và phép toán</Text>
      <View style={__a3_s.keys}>
       <Pressable style={[__a3_s.key,__a3_s.mainKey]} onPress={()=>add(textPart(''))} accessibilityLabel="Thêm số hoặc chữ"><Text style={[__a3_s.keyText,{color:__a3Colors.onPrimary}]}>123 / abc</Text></Pressable>
       {COMPOUND_OPERATORS.map(op=><Pressable key={op.label} style={__a3_s.key} onPress={()=>add(textPart(op.value))} accessibilityLabel={`Thêm ${op.label}`}><Text style={__a3_s.keyText}>{op.label}</Text></Pressable>)}
      </View><Text style={__a3_s.tip}>Chọn một phần, rồi chạm dấu hoặc mẫu mới: phần mới sẽ được chèn ngay sau phần đang chọn.</Text>
     </View>
     <View style={__a3_s.tabs}>
      {([{id:'math',label:'Toán'},{id:'physics',label:'Vật lý'},{id:'chemistry',label:'Hóa học'}] as const).map(item=><Pressable key={item.id} style={[__a3_s.tab,group===item.id&&__a3_s.tabActive]} onPress={()=>setGroup(item.id)}><Text style={[__a3_s.tabLabel,group===item.id&&__a3_s.tabLabelActive]}>{item.label}</Text></Pressable>)}
     </View>
     <Text style={__a3_s.sectionTitle}>Thêm mẫu vào biểu thức</Text>
     <View style={__a3_s.templateGrid}>{VISUAL_FORMULA_TEMPLATES.filter(t=>t.group===group).map(t=><Pressable key={t.id} style={__a3_s.templateCard} onPress={()=>add(templatePart(t.id))} accessibilityRole="button" accessibilityLabel={`Chèn mẫu ${t.label}`}><Text style={__a3_s.symbol}>{t.symbol}</Text><Text style={__a3_s.templateName}>{t.label}</Text></Pressable>)}</View>
    </>:<View style={__a3_s.inputPanel}>
     <Text style={__a3_s.sectionTitle}>Mã TeX nâng cao</Text>
     <Text style={__a3_s.tip}>Chế độ nâng cao sẽ lưu biểu thức dạng TeX, không giữ các ô chỉnh sửa trực quan mới.</Text>
     <BloomScaledInput multiline value={draft} onChangeText={setDraft} onSelectionChange={e=>setCaret(e.nativeEvent.selection.start)} placeholder="Nhập TeX khi cần…" autoCapitalize="none" autoCorrect={false} style={__a3_s.editor}/>
     <View style={__a3_s.keys}>{FORMULA_TEMPLATES.map(t=><Pressable key={t.label} style={__a3_s.key} onPress={()=>{const p=caret??draft.length;setDraft(value=>value.slice(0,p)+t.value+value.slice(p));setCaret(p+t.value.length)}}><Text style={__a3_s.keyText}>{t.label}</Text></Pressable>)}</View>
     <View style={__a3_s.preview}>{draft?<NativeFormula tex={draft}/>:<Text style={__a3_s.empty}>Xem trước công thức</Text>}</View>
    </View>}
    {!!error&&<Text style={__a3_s.error} accessibilityRole="alert">{error}</Text>}
    <Pressable onPress={()=>{if(!advanced){setDraft(tex);setAdvanced(true)}else if(initialParts!==null){setAdvanced(false)}else{setError('Công thức TeX cũ không thể tự chuyển về các ô trực quan. Bạn vẫn có thể sửa bằng TeX.')}}} style={__a3_s.advancedButton}><Text style={__a3_s.advancedText}>{advanced?'← Quay lại biểu thức trực quan (nếu có)':'Dùng mã TeX nâng cao (tùy chọn)'}</Text></Pressable>
    <Text style={__a3_s.foot}>Bộ ghép Native chỉ tải khi bạn mở ƒx. Dữ liệu từng phần được lưu để mở lại và sửa; không tạo WebView trên danh sách.</Text>
   </ScrollView>
  </KeyboardAvoidingView>
 </Modal>;
}
const s=createBloomStyles(() => StyleSheet.create({
 modal:{flex:1,backgroundColor:COLORS.surface,paddingTop:Platform.OS==='android'?24:44},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,paddingVertical:15,borderBottomColor:COLORS.border,borderBottomWidth:1},heading:{fontSize:17,fontWeight:'900',color:COLORS.primaryText},action:{fontSize:15,fontWeight:'900',color:COLORS.primary},
 extraPanel:{borderColor:COLORS.border,borderWidth:1,borderStyle:'dashed',borderRadius:17,backgroundColor:COLORS.surface,padding:14,gap:10},
 extraHeading:{fontSize:14,fontWeight:'700',color:COLORS.secondaryText},extraInput:{minHeight:48,borderWidth:1,borderColor:COLORS.border,borderStyle:'dashed',backgroundColor:COLORS.surface,borderRadius:12,paddingHorizontal:12,paddingVertical:9,fontSize:17,color:COLORS.primary},extraWarning:{color:COLORS.primary,fontSize:12,lineHeight:19},extraOkay:{color:COLORS.positive,fontSize:12},
 editorScroll:{padding:16,paddingBottom:60,gap:14},help:{color:COLORS.secondaryText,fontSize:13,lineHeight:20},
 preview:{backgroundColor:COLORS.surface,borderRadius:17,padding:15,gap:10,borderColor:COLORS.border,borderWidth:1,minHeight:86},small:{fontSize:11,fontWeight:'800',color:COLORS.primary},empty:{color:COLORS.secondaryText,fontSize:13},
 inputPanel:{borderColor:COLORS.border,borderWidth:1,borderRadius:20,backgroundColor:COLORS.surface,padding:14,gap:11},sectionTitle:{fontSize:16,fontWeight:'900',color:COLORS.secondaryText},
 partsRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:5},partChip:{borderRadius:13,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.surface,paddingHorizontal:12,paddingVertical:9,flexDirection:'row',alignItems:'center',gap:7,maxWidth:180},partActive:{backgroundColor:COLORS.softSurface,borderColor:COLORS.primary,borderWidth:2},partIndex:{fontSize:11,fontWeight:'800',color:COLORS.primary},partText:{fontSize:14,fontWeight:'700',color:COLORS.primaryText},editRow:{flexDirection:'row',flexWrap:'wrap',gap:8},editBtn:{backgroundColor:COLORS.surface,padding:9,borderRadius:12},editTxt:{color:COLORS.primary,fontSize:12,fontWeight:'700'},deleteTxt:{color:COLORS.primary,fontSize:12,fontWeight:'800'},
 tabs:{flexDirection:'row',gap:8},tab:{flex:1,paddingVertical:12,alignItems:'center',borderRadius:16,backgroundColor:COLORS.surface},tabActive:{backgroundColor:COLORS.selectedBackground},tabLabel:{fontWeight:'800',color:COLORS.primary},tabLabelActive:{color:COLORS.primaryText},
 templateGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},templateCard:{width:'31%',minHeight:68,backgroundColor:COLORS.surface,borderColor:COLORS.border,borderWidth:1,borderRadius:15,alignItems:'center',justifyContent:'center',padding:7,gap:5},symbol:{fontSize:20,fontWeight:'800',color:COLORS.primary},templateName:{fontSize:11,fontWeight:'700',color:COLORS.primary,textAlign:'center'},
 fieldsGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},fieldColumn:{width:'47%',flexGrow:1},slotWrap:{flex:1,gap:5},slotLabel:{fontSize:12,fontWeight:'700',color:COLORS.primary},slotInput:{minHeight:49,borderWidth:1.2,borderColor:COLORS.border,borderRadius:13,paddingHorizontal:12,paddingVertical:8,backgroundColor:COLORS.surface,color:COLORS.primaryText,fontSize:18,fontWeight:'600'},
 fractionArea:{flexDirection:'row',justifyContent:'center',alignItems:'center',gap:15,paddingVertical:4},whole:{width:'28%'},fractionSlots:{width:'66%',gap:7,alignItems:'stretch'},fractionBar:{height:2.5,backgroundColor:COLORS.primaryText,borderRadius:2,marginHorizontal:6},
 keys:{flexDirection:'row',flexWrap:'wrap',gap:8,paddingVertical:5},key:{minWidth:'20%',flexGrow:1,paddingHorizontal:10,paddingVertical:12,alignItems:'center',backgroundColor:COLORS.softSurface,borderRadius:12},mainKey:{backgroundColor:COLORS.primary},keyText:{color:COLORS.primary,fontWeight:'800'},tip:{fontSize:12,color:COLORS.secondaryText,lineHeight:18},editor:{minHeight:95,maxHeight:190,backgroundColor:COLORS.surface,borderRadius:14,borderWidth:1,borderColor:COLORS.border,padding:12,fontSize:16,color:COLORS.primaryText,textAlignVertical:'top'},advancedButton:{alignItems:'center',paddingVertical:13},advancedText:{fontWeight:'800',color:COLORS.primary},foot:{fontSize:11,color:COLORS.secondaryText,lineHeight:17},error:{fontSize:13,color:COLORS.primary,fontWeight:'700',backgroundColor:COLORS.softSurface,borderRadius:12,padding:10}
}));
