import { BloomScaledInput } from '../../components/ui/BloomScaledInput';
import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { COLORS } from '../../constants/theme';
import {Ionicons} from '@expo/vector-icons';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ActivityIndicator,Image,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import type {StudyBlock} from './studyRepository';
import {studyRelationGlyph,type StudyRelation} from './StudySolutionModel';
import {StudyBlocksView} from './StudyFormula';
import {mediaService} from '../../services/media/mediaService';
import {useBloomToast} from '../../components/ui/BloomToast';
import {useBloomKeyboardFocus} from '../../components/layout/BloomKeyboardScreen';
import {showStudyError} from './studyFeedback';
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


// Use semantic brand color instead of a module-captured pink swatch.
type Asset={uri:string;fileName:string;mimeType:string;fileSize?:number};
export function StudyComposer({familyId,uid,initialBlocks,onSubmit,submitText='Đăng',extraBusy=false,draftKey='question',validateBeforeUpload}:{familyId:string;uid:string;initialBlocks?:StudyBlock[];onSubmit:(blocks:StudyBlock[],images:string[])=>Promise<void>;submitText?:string;extraBusy?:boolean;draftKey?:string;validateBeforeUpload?:()=>boolean}){
  const __a3Colors = useA3Theme().colors;
  const __a3_s = useA3LegacyStyles(s);

  
 const {showToast}=useBloomToast();
 const [FormulaEditorComponent,setFormulaEditorComponent]=useState<React.ComponentType<any>|null>(null);
 const {revealInput}=useBloomKeyboardFocus();
 const bodyRef=useRef<React.ElementRef<typeof BloomScaledInput>>(null);
 const [blocks,setBlocks]=useState<StudyBlock[]>(initialBlocks??[]);
 const [body,setBody]=useState('');
 const [nextRelation,setNextRelation]=useState<StudyRelation>('none');
 const [editingTextIndex,setEditingTextIndex]=useState<number|null>(null);
 const [formulaOpen,setFormulaOpen]=useState(false);
 const openFormula=useCallback(async()=>{const module=await import('./StudyFormulaEditor');setFormulaEditorComponent(()=>module.FormulaEditor);setFormulaOpen(true)},[]);
 const [editingFormula,setEditingFormula]=useState<number|null>(null);
 const [hydrated,setHydrated]=useState(false);
 const [assets,setAssets]=useState<Asset[]>([]);
 const [busy,setBusy]=useState(false);
 const commitText=useCallback(()=>{if(!body.trim())return;setBlocks(v=>editingTextIndex!==null?v.map((block,i)=>i===editingTextIndex?{kind:'text',value:body.trim()}:block):(v.length<24?[...v,{kind:'text',value:body.trim()}]:v));setBody('');setEditingTextIndex(null);},[body,editingTextIndex]);
 const storageKey=`bloom.study.draft:${uid}:${familyId}:${draftKey}`;
 useEffect(()=>{let live=true;setHydrated(false);void AsyncStorage.getItem(storageKey).then(value=>{
   if(live&&value){try{const data=JSON.parse(value);if(Array.isArray(data.blocks))setBlocks(data.blocks.slice(0,24));if(typeof data.body==='string')setBody(data.body.slice(0,6000));}catch{}}
 }).finally(()=>{if(live)setHydrated(true)});return()=>{live=false};},[storageKey]);
 useEffect(()=>{if(!hydrated)return;const timer=setTimeout(()=>{void AsyncStorage.setItem(storageKey,JSON.stringify({blocks,body})).catch(()=>undefined)},900);return()=>clearTimeout(timer)},[body,blocks,hydrated,storageKey]);
 const pick=useCallback(async()=>{
  if(assets.length>=3)return;
  const Picker=await import('expo-image-picker');
  const p=await Picker.requestMediaLibraryPermissionsAsync();if(p.status!=='granted'){showToast({title:'Cần quyền chọn ảnh',message:'Hãy cấp quyền thư viện để đính kèm ảnh bài tập nhé.',type:'warning'});return;}
  const result=await Picker.launchImageLibraryAsync({mediaTypes:['images'],allowsMultipleSelection:true,selectionLimit:3-assets.length,quality:.8});
  if(!result.canceled)setAssets(old=>[...old,...result.assets.map(a=>({uri:a.uri,fileName:a.fileName||`study-${Date.now()}.jpg`,mimeType:a.mimeType||'image/jpeg',fileSize:a.fileSize}))].slice(0,3));
 },[assets.length,showToast]);
 const submit=useCallback(async()=>{
  if(busy||extraBusy)return;
  const merged=editingTextIndex!==null?blocks.map((block,i)=>i===editingTextIndex?{kind:'text' as const,value:body.trim()||block.value}:block):[...blocks,...(body.trim()?[{kind:'text' as const,value:body.trim()}]:[])];
  if(!merged.length && assets.length)merged.push({kind:'text',value:'Nhờ cả nhà xem giúp bài trong ảnh nhé.'});
  if(!merged.length){showToast({title:'Còn thiếu nội dung 🌸',message:'Hãy nhập câu hỏi hoặc bài giải trước khi đăng nhé.',type:'warning'});bodyRef.current?.focus();return;}
  if(merged.length>24){showToast({title:'Bài viết hơi dài',message:'Hãy dùng tối đa 24 phần nội dung nhé.',type:'warning'});return;}
  // Validate title and other question metadata BEFORE any Cloudinary upload.
  if(validateBeforeUpload && !validateBeforeUpload())return;
  setBusy(true);
  try{
   // Limit peak memory/network to one upload at a time; shared Cloudinary folder.
   const imageUrls:string[]=[];
   for(let i=0;i<assets.length;i++){
    const a=assets[i];if(a.fileSize&&a.fileSize>8_000_000)throw Error('Mỗi ảnh cần nhỏ hơn 8 MB.');
    const uploaded=await mediaService.uploadImage({id:`study-${uid}-${Date.now()}-${i}`,uri:a.uri,mimeType:a.mimeType,fileName:a.fileName},'documents',familyId,undefined,{ownerUid:uid,entityType:'document',entityId:`study-${Date.now()}`,purpose:'document'});
    imageUrls.push(uploaded.secureUrl);
   }
   await onSubmit(merged,imageUrls);
   await AsyncStorage.removeItem(storageKey).catch(()=>undefined);
  }catch(err){console.warn('[StudyComposer] Submit failed:',(err as {code?:string})?.code||'unknown');showStudyError(showToast,err,'lưu bài');}finally{setBusy(false)}
 },[assets,blocks,body,busy,extraBusy,familyId,onSubmit,uid,storageKey,showToast,validateBeforeUpload,editingTextIndex]);
 return <View style={__a3_s.section}>
  <Text style={__a3_s.heading}>Nội dung {submitText==='Đăng câu hỏi'?'câu hỏi':'bài giải'}</Text>
  {blocks.map((block,i)=><View key={i} style={__a3_s.block}>
    <View style={{flex:1,gap:6}}>
     <Pressable onPress={()=>{if(block.kind==='formula'){setEditingFormula(i);void openFormula()}else {setEditingTextIndex(i);setBody(block.value);bodyRef.current?.focus()}}} accessibilityHint={block.kind==='formula'?'Chạm để sửa công thức':undefined}><StudyBlocksView blocks={[block]}/></Pressable>
     {block.kind==='formula'&&<View style={__a3_s.relations}>
      {(['none','implies','iff','equals'] as StudyRelation[]).map(relation=><Pressable key={relation} accessibilityRole="button" accessibilityLabel={relation==='none'?'Không dấu':relation==='iff'?'Tương đương':relation==='implies'?'Suy ra':'Bằng'} onPress={()=>setBlocks(current=>current.map((item,j)=>j===i?{...item,relationBefore:relation}:item))} style={[__a3_s.relationChoice,block.relationBefore===relation||(!block.relationBefore&&relation==='none')?__a3_s.relationChoiceActive:null]}><Text style={__a3_s.relationChoiceText}>{relation==='none'?'Không dấu':studyRelationGlyph[relation]}</Text></Pressable>)}
     </View>}
    </View>
    <View style={__a3_s.blockActions}>
     <Pressable disabled={i===0} accessibilityLabel="Đưa phần lên trước" onPress={()=>setBlocks(v=>{const next=[...v];[next[i-1],next[i]]=[next[i],next[i-1]];return next})}><Ionicons name="arrow-up-circle-outline" size={22} color={i===0?__a3Colors.muted:__a3Colors.primary}/></Pressable>
     <Pressable disabled={i===blocks.length-1} accessibilityLabel="Đưa phần xuống sau" onPress={()=>setBlocks(v=>{const next=[...v];[next[i],next[i+1]]=[next[i+1],next[i]];return next})}><Ionicons name="arrow-down-circle-outline" size={22} color={i===blocks.length-1?__a3Colors.muted:__a3Colors.primary}/></Pressable>
     <Pressable accessibilityLabel="Xóa phần nội dung" onPress={()=>setBlocks(v=>v.filter((_,j)=>i!==j))}><Ionicons name="close-circle" size={23} color={__a3Colors.primary}/></Pressable>
    </View>
   </View>)}
  {editingTextIndex!==null&&<Text style={__a3_s.subheading}>Đang sửa đoạn chữ số {editingTextIndex+1} · Lưu thay đổi bằng nút Thêm/Lưu đoạn chữ</Text>}
  <BloomScaledInput ref={bodyRef} multiline style={__a3_s.input} onFocus={()=>revealInput(bodyRef.current,64)} onContentSizeChange={()=>revealInput(bodyRef.current,64)} placeholder="Viết đề bài, các bước giải hoặc giải thích dễ hiểu…" placeholderTextColor={__a3Colors.secondaryText} value={body} onChangeText={setBody} maxLength={6000} textAlignVertical="top"/>
  <Pressable style={__a3_s.addParagraph} accessibilityRole="button" onPress={commitText} disabled={!body.trim()||(editingTextIndex===null&&blocks.length>=24)}><Ionicons name="add-circle-outline" size={18} color={__a3Colors.primary}/><Text style={__a3_s.toolText}>{editingTextIndex!==null?'Lưu đoạn chữ':'Thêm đoạn chữ vào bài giải'}</Text></Pressable>
  <Text style={__a3_s.subheading}>Ký hiệu liên hệ trước công thức tiếp theo</Text>
  <View style={__a3_s.relations}>{(['none','implies','iff','equals'] as StudyRelation[]).map(relation=><Pressable key={relation} accessibilityRole="button" accessibilityLabel={relation==='none'?'Không dấu':relation==='iff'?'Tương đương':relation==='implies'?'Suy ra':'Bằng'} style={[__a3_s.relationChoice,relation===nextRelation&&__a3_s.relationChoiceActive]} onPress={()=>setNextRelation(relation)}><Text style={__a3_s.relationChoiceText}>{relation==='none'?'Không dấu':studyRelationGlyph[relation]}</Text></Pressable>)}</View>
  <View style={__a3_s.tools}>
   <Pressable style={__a3_s.tool} onPress={()=>{if(body.trim())commitText();setEditingFormula(null);void openFormula()}} accessibilityLabel="Chèn công thức Toán Lý Hóa"><Ionicons name="calculator-outline" size={19} color={__a3Colors.primary}/><Text style={__a3_s.toolText}>ƒx Công thức</Text></Pressable>
   <Pressable style={__a3_s.tool} onPress={()=>void pick()}><Ionicons name="image-outline" size={19} color={__a3Colors.primary}/><Text style={__a3_s.toolText}>Ảnh ({assets.length}/3)</Text></Pressable>
  </View>
  {!!assets.length&&<View style={__a3_s.photos}>{assets.map((a,i)=><View key={a.uri} style={{position:'relative'}}><Image source={{uri:a.uri}} style={__a3_s.photo}/><Pressable style={__a3_s.closeImage} onPress={()=>setAssets(v=>v.filter((_,j)=>j!==i))}><Ionicons name="close" size={15} color={__a3Colors.white}/></Pressable></View>)}</View>}
  <Pressable style={[__a3_s.submit,(busy||extraBusy)&&{opacity:.6}]} disabled={busy||extraBusy} onPress={()=>void submit()} accessibilityRole="button">{busy?<ActivityIndicator color={__a3Colors.onPrimary}/>:<Ionicons name="paper-plane" size={18} color={__a3Colors.onPrimary}/>}<Text style={__a3_s.submitText}>{busy?'Đang lưu…':submitText}</Text></Pressable>
  <Text style={__a3_s.tip}>Chỉ tải ảnh khi bạn đăng. Công thức được lưu riêng để chỉnh sửa, không dùng WebView ở danh sách.</Text>
  {formulaOpen&&FormulaEditorComponent&&<FormulaEditorComponent visible initial={editingFormula!==null?blocks[editingFormula]?.value||'':''} initialBlock={editingFormula!==null?blocks[editingFormula]:undefined} onCancel={()=>{setFormulaOpen(false);setEditingFormula(null)}} onSave={(value:string,extra?:Pick<StudyBlock,'formulaTemplate'|'formulaFields'|'formulaParts'>)=>{const newBlock:StudyBlock={kind:'formula',value,...extra,relationBefore:editingFormula!==null?blocks[editingFormula]?.relationBefore||'none':nextRelation};setBlocks(v=>editingFormula!==null?v.map((b,i)=>i===editingFormula?newBlock:b):[...v,newBlock]);setFormulaOpen(false);setEditingFormula(null);setNextRelation('none')}}/>}
 </View>;
}
const s=createBloomStyles(() => StyleSheet.create({section:{gap:12},heading:{fontSize:16,fontWeight:'900',color:COLORS.primaryText},block:{flexDirection:'row',gap:8,padding:12,borderRadius:15,backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.border},blockActions:{gap:9,justifyContent:'center'},addParagraph:{flexDirection:'row',gap:8,alignItems:'center',alignSelf:'flex-start',paddingHorizontal:13,paddingVertical:10,backgroundColor:COLORS.surface,borderRadius:12},subheading:{fontSize:12,color:COLORS.primary,fontWeight:'800'},relations:{flexDirection:'row',gap:7,flexWrap:'wrap'},relationChoice:{minWidth:54,paddingVertical:8,paddingHorizontal:11,borderRadius:11,backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.border,alignItems:'center'},relationChoiceActive:{backgroundColor:COLORS.softSurface,borderColor:COLORS.border},relationChoiceText:{color:COLORS.primary,fontWeight:'800',fontSize:14},input:{backgroundColor:COLORS.surface,borderWidth:1,borderColor:COLORS.border,borderRadius:17,minHeight:135,padding:15,color:COLORS.primaryText,fontSize:15,lineHeight:22},tools:{flexDirection:'row',flexWrap:'wrap',gap:9},tool:{flexDirection:'row',alignItems:'center',gap:7,backgroundColor:COLORS.surface,paddingHorizontal:14,paddingVertical:11,borderRadius:14},toolText:{fontWeight:'800',fontSize:13,color:COLORS.primary},photos:{flexDirection:'row',gap:8,flexWrap:'wrap'},photo:{width:85,height:85,borderRadius:14},closeImage:{position:'absolute',right:3,top:3,backgroundColor:COLORS.selectedBackground,borderRadius:12,padding:3},submit:{backgroundColor:COLORS.primary,borderRadius:18,minHeight:53,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:10},submitText:{color:COLORS.onPrimary,fontWeight:'900',fontSize:15},tip:{fontSize:11,color:COLORS.secondaryText,lineHeight:17}}));
