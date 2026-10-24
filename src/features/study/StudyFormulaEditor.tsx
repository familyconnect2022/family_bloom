/** On-demand native compound formula editor: no WebView, no extra dependency, no bootstrap work. */
import React,{useMemo,useState} from 'react';
import {KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import type {StudyBlock,StudyFormulaPart} from './studyRepository';
import {FORMULA_TEMPLATES,NativeFormula} from './StudyFormula';
import {VISUAL_FORMULA_TEMPLATES,findVisualTemplate,type FormulaGroup} from './StudyFormulaTemplates';
import {parseChemicalSpecies,parseChemicalEquation} from './StudyChemistry';
import {COMPOUND_OPERATORS,FORMULA_FOLLOW_FIELD,MAX_EXPRESSION_PARTS,compileFormulaParts,compoundFromSaved,formatFormulaFollow,isFormulaPartComplete,moveFormulaPart,templatePart,textPart} from './StudyFormulaExpression';
const TINT='#AE437A';
const activeFollow=(part?:StudyFormulaPart)=>formatFormulaFollow(part?.kind==='template'?part.fields?.[FORMULA_FOLLOW_FIELD]||'':'');
const visualPartLabel=(part:StudyFormulaPart):string=>part.kind==='literal'?(part.syntax==='chemistry'?`Hóa: ${part.value||'...'}`:(part.value||'Số/chữ')):findVisualTemplate(part.templateId||'')?.label||'Công thức';
export function FormulaEditor({visible,initial='',initialBlock,onCancel,onSave}:{visible:boolean;initial?:string;initialBlock?:StudyBlock;onCancel:()=>void;onSave:(value:string,extra?:Pick<StudyBlock,'formulaTemplate'|'formulaFields'|'formulaParts'>)=>void}){
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
 const field=(key:string,label:string,hint:string)=><View key={key} style={s.slotWrap}>
  <Text style={s.slotLabel}>{label}</Text>
  <TextInput value={active?.fields?.[key]||''} onChangeText={v=>change(key,v)} accessibilityLabel={label} placeholder={hint} placeholderTextColor="#AA94A1" autoCapitalize="none" autoCorrect={false} maxLength={60} style={s.slotInput}/>
 </View>;
 return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
  <KeyboardAvoidingView style={s.modal} behavior={Platform.OS==='ios'?'padding':'height'}>
   <View style={s.header}>
    <Pressable onPress={onCancel} accessibilityRole="button"><Text style={s.action}>Hủy</Text></Pressable>
    <Text style={s.heading}>Ghép công thức ƒx</Text>
    <Pressable disabled={!complete} onPress={save} accessibilityRole="button"><Text style={[s.action,!complete&&{opacity:.35}]}>Chèn</Text></Pressable>
   </View>
   <ScrollView keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag" contentContainerStyle={s.editorScroll}>
    <Text style={s.help}>Chọn một mẫu, điền các ô. Muốn viết ½ O₂, hãy chọn Phân số, nhập 1 và 2, rồi gõ O2 vào ô nét đứt bên dưới. Kết quả tự hiện ở phần xem trước.</Text>
    {!advanced?<>
     <View style={s.preview}><Text style={s.small}>XEM TRƯỚC CẢ BIỂU THỨC</Text>
      {tex?<NativeFormula tex={tex}/>:<Text style={s.empty}>Ví dụ: √25 + 3 hoặc ½ + x² − √9</Text>}
     </View>
     <View style={s.inputPanel}>
      <Text style={s.sectionTitle}>Các phần của biểu thức ({parts.length}/{MAX_EXPRESSION_PARTS})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={s.partsRow}>
       {parts.length?parts.map((p,i)=><Pressable key={i} onPress={()=>{setSelected(i);setError('')}} accessibilityRole="button" accessibilityLabel={`Sửa phần ${i+1}: ${visualPartLabel(p)}`} style={[s.partChip,selected===i&&s.partActive]}>
        <Text style={s.partIndex}>{i+1}</Text><Text style={s.partText} numberOfLines={1}>{visualPartLabel(p)}</Text>
       </Pressable>):<Text style={s.empty}>Chọn mẫu hoặc nhập Số/chữ bên dưới để bắt đầu.</Text>}
      </ScrollView>
      {!!parts.length&&<View style={s.editRow}>
       <Pressable onPress={()=>move(-1)} disabled={selected===0} style={s.editBtn}><Text style={s.editTxt}>← Dời trái</Text></Pressable>
       <Pressable onPress={()=>move(1)} disabled={selected===parts.length-1} style={s.editBtn}><Text style={s.editTxt}>Dời phải →</Text></Pressable>
       <Pressable onPress={remove} style={s.editBtn}><Text style={s.deleteTxt}>Xóa phần</Text></Pressable>
      </View>}
     </View>
     {active&&<View style={s.inputPanel}>
      <Text style={s.sectionTitle}>Sửa phần {selected+1}: {visualPartLabel(active)}</Text>
      {active.kind==='literal'&&active.syntax==='chemistry'&&active.value&&(!parseChemicalSpecies(active.value).ok)&&<Text style={s.extraWarning}>{parseChemicalSpecies(active.value).message}</Text>}
      {active.kind==='literal'?<TextInput accessibilityLabel="Nhập số, chữ hoặc phép toán" placeholder="Ví dụ: 3, x, +, =" placeholderTextColor="#AA94A1" value={active.value||''} onChangeText={v=>change('value',v)} autoCapitalize="none" autoCorrect={false} maxLength={100} style={s.slotInput}/>:
       (active.templateId==='fraction'||active.templateId==='mixed')?<View style={s.fractionArea}>
        {active.templateId==='mixed'&&<View style={s.whole}>{field('whole','Phần nguyên','2')}</View>}
        <View style={s.fractionSlots}>{field('top','Tử số','3')}<View style={s.fractionBar}/>{field('bottom','Mẫu số','4')}</View>
       </View>:<View style={s.fieldsGrid}>{activeTemplate?.slots.map(t=><View key={t.key} style={s.fieldColumn}>{field(t.key,t.label,t.example)}</View>)}</View>}
      {active.kind==='template'&&<View style={s.extraPanel}>
       <Text style={s.extraHeading}>Viết thêm sau công thức (tùy chọn)</Text>
       <TextInput accessibilityLabel="Viết thêm sau công thức" value={active.fields?.[FORMULA_FOLLOW_FIELD]||''} onChangeText={v=>change(FORMULA_FOLLOW_FIELD,v)} placeholder="Ví dụ: O2, H2O hoặc x + 1" placeholderTextColor="#AF9AA6" autoCapitalize="none" autoCorrect={false} maxLength={100} style={s.extraInput}/>
       {!!follow.note&&<Text style={follow.kind==='uncertain'?s.extraWarning:s.extraOkay}>{follow.note}</Text>}
       <Text style={s.tip}>Ví dụ: Phân số 1/2 + nhập O2 tại đây = ½ O₂. Không cần chọn chế độ hay bấm Chèn thêm lần nữa.</Text>
      </View>}
      {reactionDiagnostic?.ok&&reactionDiagnostic.warnings.map((w,i)=><Text key={i} style={s.extraWarning}>{w}</Text>)}
      {reactionDiagnostic&&!reactionDiagnostic.ok&&<Text style={s.extraWarning}>{reactionDiagnostic.message}</Text>}
      <Text style={s.tip}>Đổi sang phần khác bằng cách chạm ô ở hàng “Các phần”. Mỗi phần giữ nguyên ô nhập khi sửa lại.</Text>
     </View>}
     <View style={s.inputPanel}><Text style={s.sectionTitle}>Thêm số, chữ và phép toán</Text>
      <View style={s.keys}>
       <Pressable style={[s.key,s.mainKey]} onPress={()=>add(textPart(''))} accessibilityLabel="Thêm số hoặc chữ"><Text style={[s.keyText,{color:'#FFF'}]}>123 / abc</Text></Pressable>
       {COMPOUND_OPERATORS.map(op=><Pressable key={op.label} style={s.key} onPress={()=>add(textPart(op.value))} accessibilityLabel={`Thêm ${op.label}`}><Text style={s.keyText}>{op.label}</Text></Pressable>)}
      </View><Text style={s.tip}>Chọn một phần, rồi chạm dấu hoặc mẫu mới: phần mới sẽ được chèn ngay sau phần đang chọn.</Text>
     </View>
     <View style={s.tabs}>
      {([{id:'math',label:'Toán'},{id:'physics',label:'Vật lý'},{id:'chemistry',label:'Hóa học'}] as const).map(item=><Pressable key={item.id} style={[s.tab,group===item.id&&s.tabActive]} onPress={()=>setGroup(item.id)}><Text style={[s.tabLabel,group===item.id&&s.tabLabelActive]}>{item.label}</Text></Pressable>)}
     </View>
     <Text style={s.sectionTitle}>Thêm mẫu vào biểu thức</Text>
     <View style={s.templateGrid}>{VISUAL_FORMULA_TEMPLATES.filter(t=>t.group===group).map(t=><Pressable key={t.id} style={s.templateCard} onPress={()=>add(templatePart(t.id))} accessibilityRole="button" accessibilityLabel={`Chèn mẫu ${t.label}`}><Text style={s.symbol}>{t.symbol}</Text><Text style={s.templateName}>{t.label}</Text></Pressable>)}</View>
    </>:<View style={s.inputPanel}>
     <Text style={s.sectionTitle}>Mã TeX nâng cao</Text>
     <Text style={s.tip}>Chế độ nâng cao sẽ lưu biểu thức dạng TeX, không giữ các ô chỉnh sửa trực quan mới.</Text>
     <TextInput multiline value={draft} onChangeText={setDraft} onSelectionChange={e=>setCaret(e.nativeEvent.selection.start)} placeholder="Nhập TeX khi cần…" autoCapitalize="none" autoCorrect={false} style={s.editor}/>
     <View style={s.keys}>{FORMULA_TEMPLATES.map(t=><Pressable key={t.label} style={s.key} onPress={()=>{const p=caret??draft.length;setDraft(value=>value.slice(0,p)+t.value+value.slice(p));setCaret(p+t.value.length)}}><Text style={s.keyText}>{t.label}</Text></Pressable>)}</View>
     <View style={s.preview}>{draft?<NativeFormula tex={draft}/>:<Text style={s.empty}>Xem trước công thức</Text>}</View>
    </View>}
    {!!error&&<Text style={s.error} accessibilityRole="alert">{error}</Text>}
    <Pressable onPress={()=>{if(!advanced){setDraft(tex);setAdvanced(true)}else if(initialParts!==null){setAdvanced(false)}else{setError('Công thức TeX cũ không thể tự chuyển về các ô trực quan. Bạn vẫn có thể sửa bằng TeX.')}}} style={s.advancedButton}><Text style={s.advancedText}>{advanced?'← Quay lại biểu thức trực quan (nếu có)':'Dùng mã TeX nâng cao (tùy chọn)'}</Text></Pressable>
    <Text style={s.foot}>Bộ ghép Native chỉ tải khi bạn mở ƒx. Dữ liệu từng phần được lưu để mở lại và sửa; không tạo WebView trên danh sách.</Text>
   </ScrollView>
  </KeyboardAvoidingView>
 </Modal>;
}
const s=StyleSheet.create({
 modal:{flex:1,backgroundColor:'#FFF8FC',paddingTop:Platform.OS==='android'?24:44},
 header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:18,paddingVertical:15,borderBottomColor:'#F1D8E5',borderBottomWidth:1},heading:{fontSize:17,fontWeight:'900',color:'#633952'},action:{fontSize:15,fontWeight:'900',color:TINT},
 extraPanel:{borderColor:'#DDAFC6',borderWidth:1,borderStyle:'dashed',borderRadius:17,backgroundColor:'#FFF9FC',padding:14,gap:10},
 extraHeading:{fontSize:14,fontWeight:'700',color:'#A27590'},extraInput:{minHeight:48,borderWidth:1,borderColor:'#DEC2D2',borderStyle:'dashed',backgroundColor:'#FFF',borderRadius:12,paddingHorizontal:12,paddingVertical:9,fontSize:17,color:'#70485E'},extraWarning:{color:'#A33F4D',fontSize:12,lineHeight:19},extraOkay:{color:'#477D67',fontSize:12},
 editorScroll:{padding:16,paddingBottom:60,gap:14},help:{color:'#876678',fontSize:13,lineHeight:20},
 preview:{backgroundColor:'#FDF1F7',borderRadius:17,padding:15,gap:10,borderColor:'#EED3E1',borderWidth:1,minHeight:86},small:{fontSize:11,fontWeight:'800',color:TINT},empty:{color:'#9A8191',fontSize:13},
 inputPanel:{borderColor:'#F0D4E2',borderWidth:1,borderRadius:20,backgroundColor:'#FFF',padding:14,gap:11},sectionTitle:{fontSize:16,fontWeight:'900',color:'#6E3D57'},
 partsRow:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:5},partChip:{borderRadius:13,borderWidth:1,borderColor:'#EAD3DF',backgroundColor:'#FFF5FA',paddingHorizontal:12,paddingVertical:9,flexDirection:'row',alignItems:'center',gap:7,maxWidth:180},partActive:{backgroundColor:'#FCE2EF',borderColor:TINT,borderWidth:2},partIndex:{fontSize:11,fontWeight:'800',color:'#B76794'},partText:{fontSize:14,fontWeight:'700',color:'#60394E'},editRow:{flexDirection:'row',flexWrap:'wrap',gap:8},editBtn:{backgroundColor:'#F9EDF3',padding:9,borderRadius:12},editTxt:{color:'#85526F',fontSize:12,fontWeight:'700'},deleteTxt:{color:'#AC375C',fontSize:12,fontWeight:'800'},
 tabs:{flexDirection:'row',gap:8},tab:{flex:1,paddingVertical:12,alignItems:'center',borderRadius:16,backgroundColor:'#F8EAF0'},tabActive:{backgroundColor:'#A4437B'},tabLabel:{fontWeight:'800',color:'#985E7C'},tabLabelActive:{color:'#FFF'},
 templateGrid:{flexDirection:'row',flexWrap:'wrap',gap:8},templateCard:{width:'31%',minHeight:68,backgroundColor:'#FFF',borderColor:'#EBD5E0',borderWidth:1,borderRadius:15,alignItems:'center',justifyContent:'center',padding:7,gap:5},symbol:{fontSize:20,fontWeight:'800',color:'#854260'},templateName:{fontSize:11,fontWeight:'700',color:'#704A60',textAlign:'center'},
 fieldsGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},fieldColumn:{width:'47%',flexGrow:1},slotWrap:{flex:1,gap:5},slotLabel:{fontSize:12,fontWeight:'700',color:'#855B70'},slotInput:{minHeight:49,borderWidth:1.2,borderColor:'#E9BDD2',borderRadius:13,paddingHorizontal:12,paddingVertical:8,backgroundColor:'#FFF9FC',color:'#54354C',fontSize:18,fontWeight:'600'},
 fractionArea:{flexDirection:'row',justifyContent:'center',alignItems:'center',gap:15,paddingVertical:4},whole:{width:'28%'},fractionSlots:{width:'66%',gap:7,alignItems:'stretch'},fractionBar:{height:2.5,backgroundColor:'#704059',borderRadius:2,marginHorizontal:6},
 keys:{flexDirection:'row',flexWrap:'wrap',gap:8,paddingVertical:5},key:{minWidth:'20%',flexGrow:1,paddingHorizontal:10,paddingVertical:12,alignItems:'center',backgroundColor:'#F6E2ED',borderRadius:12},mainKey:{backgroundColor:TINT},keyText:{color:'#95436E',fontWeight:'800'},tip:{fontSize:12,color:'#927789',lineHeight:18},editor:{minHeight:95,maxHeight:190,backgroundColor:'#FFF',borderRadius:14,borderWidth:1,borderColor:'#F0CADA',padding:12,fontSize:16,color:'#462C42',textAlignVertical:'top'},advancedButton:{alignItems:'center',paddingVertical:13},advancedText:{fontWeight:'800',color:'#A0477C'},foot:{fontSize:11,color:'#927A8A',lineHeight:17},error:{fontSize:13,color:'#B62C4C',fontWeight:'700',backgroundColor:'#FFE6ED',borderRadius:12,padding:10}
});
