import React,{useEffect,useRef,useState} from 'react';
import {Pressable,View,TextInput} from 'react-native';
import {BloomText as Text} from '../../../components/ui/BloomText';
import {readPage,mergeRows,changeRow,momentSelection,type DraftKind,type CatalogueRow} from './draftCatalogue.cjs';
type Props={uid:string;familyId:string;request:(body:Record<string,unknown>)=>Promise<unknown>;learning:boolean;moment:boolean;colors:{primary:string;primaryText:string;secondaryText:string;border:string};onOpen:(kind:DraftKind)=>void};
type Slot={cursor:string|null;loaded:boolean;error:boolean;rows:CatalogueRow[]};
const blank=():Slot=>({cursor:null,loaded:false,error:false,rows:[]});
const kinds:DraftKind[]=['learning','moment'];
const names={learning:'Góc học tập',moment:'Kỷ niệm'};
export function DraftCatalogue({uid,familyId,request,learning,moment,colors,onOpen}:Props){
 const [mode,setMode]=useState<'active'|'trash'|null>(null),[slots,setSlots]=useState<Record<DraftKind,Slot>>({learning:blank(),moment:blank()}),[busy,setBusy]=useState(false),[query,setQuery]=useState(''),[confirm,setConfirm]=useState<CatalogueRow|null>(null),[notice,setNotice]=useState(''),[stale,setStale]=useState(false);
 const live=useRef(true),lock=useRef(false);useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 const enabled=kinds.filter(k=>k==='learning'?learning:moment);
 async function load(next:'active'|'trash',only?:DraftKind){
  if(lock.current||!enabled.length)return;lock.current=true;setBusy(true);setConfirm(null);const reset=!only;
  if(reset){setMode(next);setSlots({learning:blank(),moment:blank()});setQuery('');setConfirm(null);setNotice('');setStale(false);}
  try{for(const kind of only?[only]:enabled){if(!live.current)return;const prior=reset?blank():slots[kind];if(!reset&&prior.loaded&&!prior.cursor&&!prior.error)continue;
   try{const page=await readPage(request,kind,next==='trash',prior.cursor);if(!live.current)return;setSlots(old=>({...old,[kind]:{loaded:true,error:false,cursor:page.cursor,rows:mergeRows(prior.rows,page.rows)}}));}
   catch{if(!live.current)return;setSlots(old=>({...old,[kind]:{...prior,error:true}}));}
  }}finally{lock.current=false;if(live.current)setBusy(false);}
 }
 async function mutate(row:CatalogueRow){
  if(lock.current||stale||!mode||!enabled.includes(row.kind)||!slots[row.kind].rows.some(r=>r.id===row.id&&r.revision===row.revision))return;
  lock.current=true;setBusy(true);setConfirm(null);setNotice('');const trash=mode==='active';
  try{await changeRow(request,row,trash,()=>Date.now().toString(16).padStart(12,'0').slice(-12)+Array.from({length:20},()=>Math.floor(Math.random()*16).toString(16)).join(''));if(!live.current)return;
   setSlots(old=>({...old,[row.kind]:{...old[row.kind],rows:old[row.kind].rows.filter(r=>r.id!==row.id)}}));
   setNotice(trash?'Đã chuyển bản nháp trên server vào thùng rác. Media và bản sao thiết bị được giữ nguyên.':'Đã khôi phục bản nháp trên server. Mở chức năng để đồng bộ về thiết bị.');
  }catch{if(live.current){setStale(true);setNotice('Chưa xác nhận được thao tác. Có thể bản nháp đang được sửa hoặc kết nối bị gián đoạn. Tải lại danh sách trước khi thử tiếp.');}}
  finally{lock.current=false;if(live.current)setBusy(false);}
 }
 const button=(label:string,fn:()=>void)=><Pressable accessibilityRole="button" disabled={busy} onPress={fn} style={{padding:10,borderWidth:1,borderColor:colors.border,borderRadius:12,opacity:busy ? 0.6 : 1}}><Text style={{color:colors.primary,fontWeight:'700'}}>{label}</Text></Pressable>;
 const all=mergeRows(slots.learning.rows,slots.moment.rows);const q=query.trim().toLocaleLowerCase('vi');const visible=all.filter(row=>!q||`${names[row.kind]} ${row.title}`.toLocaleLowerCase('vi').includes(q));
 if(!enabled.length)return null;
 return <View style={{gap:8,paddingVertical:10}}><Text style={{fontWeight:'800',color:colors.primaryText}}>Danh sách đồng bộ</Text><Text style={{color:colors.secondaryText}}>Chỉ bản nháp đã lưu lên máy chủ của tài khoản và nhà hiện tại. Bản nháp ngoại tuyến vẫn ở trong từng chức năng.</Text>
 {button('Đang soạn',()=>void load('active'))}{button('Thùng rác',()=>void load('trash'))}
 {mode&&<><Text style={{fontWeight:'700',color:colors.primaryText}}>{mode==='trash'?'Thùng rác':'Đang soạn'} · {all.length} mục đã tải</Text>
 <TextInput accessibilityLabel="Tìm bản nháp đã tải" placeholder="Tìm bản nháp đã tải" placeholderTextColor={colors.secondaryText} value={query} onChangeText={setQuery} style={{padding:10,borderWidth:1,borderRadius:10,borderColor:colors.border,color:colors.primaryText}}/>
 {busy&&<Text style={{color:colors.secondaryText}}>Đang xử lý…</Text>}{notice&&<Text accessibilityRole="alert" style={{color:colors.secondaryText}}>{notice}</Text>}{stale&&button('Tải lại danh sách',()=>void load(mode))}
 {!busy&&!visible.length&&<Text style={{color:colors.secondaryText}}>Không có kết quả trong các trang đã tải.</Text>}
 {visible.map(row=><View key={row.kind+':'+row.id} style={{gap:4,paddingVertical:8,borderTopWidth:1,borderColor:colors.border}}><Text style={{color:colors.primary,fontWeight:'700'}}>{names[row.kind]}</Text><Text numberOfLines={2} style={{color:colors.primaryText,fontWeight:'700'}}>{row.title}</Text><Text style={{color:colors.secondaryText}}>{new Date(row.at).toLocaleString('vi-VN')} · v{row.revision}{row.mediaCount?` · ${row.mediaCount} tệp`:''}{row.hasVideos?' · Có video':''}</Text>{mode==='active'&&row.kind==='moment'&&!stale&&!slots[row.kind].error&&button('Mở bản nháp này',()=>{if(momentSelection.queue(uid,familyId,row))onOpen('moment');})}{!stale&&!slots[row.kind].error&&(!confirm||confirm.kind!==row.kind||confirm.id!==row.id||confirm.revision!==row.revision?button(mode==='trash'?'Khôi phục':'Chuyển vào thùng rác',()=>setConfirm(row)):<View style={{gap:6}}><Text style={{color:colors.primaryText}}>{mode==='trash'?'Khôi phục bản nháp trên máy chủ?':'Chuyển bản nháp trên máy chủ vào thùng rác? Không xóa media hoặc bản sao trên thiết bị.'}</Text>{button('Xác nhận',()=>void mutate(row))}{button('Hủy',()=>setConfirm(null))}</View>)}</View>)}
 {enabled.map(kind=><View key={kind} style={{gap:6}}>{slots[kind].error&&<Text accessibilityRole="alert" style={{color:colors.secondaryText}}>Chưa tải được {names[kind]}. Danh sách đã tải được giữ nguyên.</Text>}{(slots[kind].error||slots[kind].cursor)&&button((slots[kind].error?'Thử lại ':'Tải thêm ')+names[kind],()=>void load(mode,kind))}{button('Mở quản lý '+names[kind],()=>{momentSelection.clear();onOpen(kind);})}</View>)}
 <Text style={{color:colors.secondaryText}}>Mở quản lý từng chức năng để sửa hoặc đồng bộ bản nháp về thiết bị.</Text></>}
 </View>;
}
