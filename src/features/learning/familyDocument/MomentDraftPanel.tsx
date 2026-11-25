import {momentSelection,checkSelectedMoment,type MomentSelection} from './draftCatalogue.cjs';
import {uploadDirectVideo,downloadDirectVideo} from './directFormVideo';
import {LocalMomentRecovery} from './LocalMomentRecovery';
import {readDraftImage,restoreDraftImages,discardRestoredImages,type DraftAttachment} from './momentDraftImages';
import React,{useEffect,useRef,useState} from 'react';
import {View,TextInput} from 'react-native';
import {createDraftResume,canAutosave,AUTOSAVE_DELAY,MEDIA_AUTOSAVE_DELAY} from './momentDraftResume.cjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createMomentDraftClient,type MomentDraftFields,type MomentDraftHead} from './momentFormDraft.cjs';
import {BloomText as Text} from '../../../components/ui/BloomText';
import {BloomButton} from '../../../components/ui/BloomButtonComponents';
import {useA3Tokens} from '../../../appearance3/useAppearance3';
import {nativeDraftRequest} from './draftRequest';
const requestFor=(uid:string,familyId:string)=>async(body:Record<string,unknown>)=>{const c=new AbortController();const timer=setTimeout(()=>c.abort(),35000);try{return await nativeDraftRequest(uid,familyId,body,c.signal);}finally{clearTimeout(timer);}};
export const momentDraftEnabled=process.env.EXPO_PUBLIC_FAMILY_FORM_DRAFTS_ENABLED==='1';
const imagesEnabled=process.env.EXPO_PUBLIC_FAMILY_FORM_IMAGES_ENABLED==='1';
const videosEnabled=imagesEnabled&&process.env.EXPO_PUBLIC_FAMILY_FORM_VIDEOS_ENABLED==='1';
type Props={uid:string;familyId:string;fields:MomentDraftFields;hasAttachments:boolean;attachments:DraftAttachment[];disabled?:boolean;localDisabled?:boolean;initialList?:boolean;onRestore:(fields:MomentDraftFields,attachments:DraftAttachment[])=>void};
const attachmentKeys=new WeakMap<object,number>();let nextKey=0;
const keyFor=(a:DraftAttachment)=>{let k=attachmentKeys.get(a);if(k===undefined){k=++nextKey;attachmentKeys.set(a,k);}return k;};
const attachmentStamp=(attachments:DraftAttachment[])=>JSON.stringify(attachments.map(keyFor));
const formStamp=(fields:MomentDraftFields,attachments:DraftAttachment[])=>JSON.stringify([fields,attachmentStamp(attachments)]);
const imageEligible=(p:Props)=>imagesEnabled&&p.attachments.length<=10&&p.attachments.every(a=>a.type==='image'||videosEnabled&&a.type==='video'&&a.mimeType==='video/mp4');
const errorText=(error:unknown)=>{const code=(error as {code?:string})?.code;
 if(code==='REVISION_CONFLICT'||code==='FORM_STATE_CONFLICT')return 'Bản nháp đã thay đổi trên thiết bị khác. Tải lại danh sách; nội dung đang soạn vẫn được giữ.';
 if(code==='FORM_IMAGE_REFS_NOT_CONFIRMED')return 'Chưa xác nhận được tham chiếu ảnh. Hãy mở lại bản nháp hoặc lưu thành bản nháp mới.';
 if(code==='FORM_IMAGES_CLIENT_REQUIRED')return 'Bản nháp có ảnh cần phiên bản hỗ trợ ảnh. Không thay đổi dữ liệu.';
 if(code==='FIELD_TOO_LARGE')return 'Lời nhắn vượt giới hạn lưu bản nháp.';
 if(code==='FORM_ATTACHMENTS_UNSUPPORTED'||code==='FORM_VIDEOS_DISABLED'||code==='FORM_VIDEOS_CLIENT_REQUIRED')return 'Bản nháp có video cần máy chủ và ứng dụng hỗ trợ video riêng tư.';
 if(code==='FORM_DIRECT_VIDEO_CLIENT_REQUIRED'||code==='FORM_DIRECT_VIDEO_DISABLED')return 'Video lớn chỉ mở được trong phiên bản thử nghiệm có quyền truy cập.';
 if(code==='FORM_DIRECT_VIDEO_LIMIT'||code==='FORM_DIRECT_VIDEO_IDENTITY')return 'Video lớn vượt giới hạn hoặc chưa xác nhận được định danh. Bản nháp hiện có được giữ.';
 if(code==='INVALID_FORM_VIDEO')return 'Video phải là MP4 hợp lệ, tối đa 2 MiB.';
 if(code==='FORM_IMAGE_LIMIT'||code==='EDITOR_IMAGE_TOO_LARGE'||code==='INVALID_IMAGE')return 'Ảnh phải là JPEG, PNG, WebP hoặc GIF hợp lệ, tối đa 2 MiB mỗi tệp.';
 if(code==='FORM_DUPLICATE_IMAGE')return 'Có ảnh trùng nội dung. Bỏ ảnh trùng rồi lưu lại.';
 if(code==='FORM_IMAGES_DISABLED')return 'Máy chủ chưa bật bản nháp ảnh riêng tư.';
 if(code==='FORM_IMAGE_STAGE_LIMIT')return 'Bản nháp đã đạt giới hạn ảnh tải thử. Hãy lưu thành bản nháp mới.';
 if(code==='FORM_DRAFTS_DISABLED'||code==='EDITOR_DRAFTS_DISABLED')return 'Máy chủ chưa bật bản nháp đồng bộ.';
 if(code==='NOT_FAMILY_MEMBER'||code==='AUTH_CHANGED'||code==='INVALID_TOKEN')return 'Không còn quyền truy cập bản nháp trong nhà này.';
 return 'Chưa xác nhận được thao tác. Nội dung trên màn hình vẫn được giữ.';
};
export function MomentDraftPanel(props:Props){if(!momentDraftEnabled||!props.uid||!props.familyId)return null;return <ScopedPanel key={JSON.stringify([props.uid,props.familyId])} {...props}/>;}
function ScopedPanel(props:Props){
 const {colors}=useA3Tokens();
 const directEnabled=videosEnabled&&process.env.EXPO_PUBLIC_FAMILY_FORM_DIRECT_VIDEO_ENABLED==='1'&&!!process.env.EXPO_PUBLIC_FAMILY_FORM_DIRECT_VIDEO_TEST_UID&&props.uid===process.env.EXPO_PUBLIC_FAMILY_FORM_DIRECT_VIDEO_TEST_UID;
 const [client]=useState(()=>createMomentDraftClient({imagesEnabled,videosEnabled,directVideo:directEnabled?{upload:uploadDirectVideo,download:downloadDirectVideo}:null,request:requestFor(props.uid,props.familyId),randomId:()=>Date.now().toString(16).padStart(12,'0').slice(-12)+Array.from({length:20},()=>Math.floor(Math.random()*16).toString(16)).join('')}));
 const [resumeStore]=useState(()=>createDraftResume(AsyncStorage,props.uid,props.familyId));
 const [resumeId,setResumeId]=useState<string|null>(null),[auto,setAuto]=useState(false);
 const [current,setCurrent]=useState<MomentDraftHead|null>(null),[saved,setSaved]=useState<string|null>(null),[savedHasImages,setSavedHasImages]=useState(false),[savedAttachments,setSavedAttachments]=useState<string|null>(null);
 const [localBusy,setLocalBusy]=useState(false);const localLock=useRef(false);
 const [busy,setBusy]=useState(false),[retry,setRetry]=useState(false),[notice,setNotice]=useState('');
 const initialListLoaded=useRef(false);const [target,setTarget]=useState<MomentSelection|null>(null);const [search,setSearch]=useState('');
 const [mode,setMode]=useState<'active'|'trash'|null>(null),[rows,setRows]=useState<MomentDraftHead[]>([]),[cursor,setCursor]=useState<string|null>(null);
 const live=useRef(true),lock=useRef(false),latest=useRef(props);latest.current=props;
 const pending=useRef<{action:'save'|'trash'|'restore';snapshot?:string;id?:string;hasImages?:boolean;attachmentSnapshot?:string}|null>(null);
 useEffect(()=>{live.current=true;let active=true;void resumeStore.read().then(id=>{if(active&&!lock.current)setResumeId(id);});return()=>{active=false;live.current=false;};},[resumeStore]);
 const stamp=(p:Props)=>formStamp(p.fields,p.attachments);
 const empty=(p:Props)=>!p.hasAttachments&&!p.fields.caption.trim()&&!p.fields.richBody&&p.fields.audience==='self'&&!p.fields.notify&&!p.fields.personIds.length;
 const canReplace=(p:Props)=>empty(p)||saved===stamp(p);
 const run=async(fn:()=>Promise<void>)=>{if(lock.current||localLock.current||latest.current.disabled)return;lock.current=true;setBusy(true);setNotice('');try{await fn();}catch(e){if(live.current){setAuto(false);setNotice(errorText(e));if((e as {code?:string})?.code==='REVISION_CONFLICT'){setCurrent(null);setSaved(null);}}}finally{lock.current=false;if(live.current){setBusy(false);setRetry(client.pending());if(!client.pending())pending.current=null;}}};
 const finish=(head:MomentDraftHead,operation:NonNullable<typeof pending.current>)=>{if(!live.current)return;
  if(operation.action==='save'){setResumeId(head.draftId);void resumeStore.remember(head.draftId);setCurrent(head);setSaved(operation.snapshot??null);setSavedHasImages(!!operation.hasImages);setSavedAttachments(operation.attachmentSnapshot??null);setNotice(stamp(latest.current)===operation.snapshot?'Đã lưu bản nháp '+(operation.hasImages?'và media riêng tư.':'văn bản.')+' Bản nháp không tự xóa khi đăng bài.':'Đã lưu phiên bản lúc bắt đầu thao tác. Nội dung mới thêm sau đó chưa được lưu.');}
  else{if(operation.action==='trash'){void resumeStore.forget(head.draftId);setResumeId(old=>old===head.draftId?null:old);}if(operation.action==='trash'&&current?.draftId===head.draftId){setAuto(false);setCurrent(null);setSaved(null);}setRows(old=>old.filter(x=>x.draftId!==head.draftId));setNotice(operation.action==='trash'?'Đã chuyển bản nháp vào thùng rác.':'Đã khôi phục bản nháp. Mở danh sách để viết tiếp.');}
 };
 const save=(asNew=false)=>void run(async()=>{const p=latest.current;if(p.hasAttachments&&!imageEligible(p)||!p.fields.caption.trim()&&!p.hasAttachments)return;const op={action:'save' as const,snapshot:stamp(p),hasImages:p.hasAttachments,attachmentSnapshot:attachmentStamp(p.attachments)};const target=asNew?null:current;const keepImages=!!target&&p.hasAttachments&&savedHasImages&&savedAttachments===op.attachmentSnapshot;let data:string[]=[];if(p.hasAttachments&&!keepImages){for(const file of p.attachments){if(!live.current) return;data.push(await readDraftImage(file,videosEnabled,directEnabled));}}if(!live.current||latest.current.disabled)return;pending.current=op;finish(await (keepImages&&target?client.saveKeepingImages(p.fields,target):imagesEnabled&&(p.hasAttachments||!!target&&savedHasImages)?client.saveImages(p.fields,data,target):client.save(p.fields,false,target)),op);});
 const load=(nextMode:'active'|'trash',more=false)=>void run(async()=>{const page=await client.list(nextMode==='trash',more?cursor:null,true);if(!live.current)return;setMode(nextMode);if(!more)setSearch('');setRows(old=>(more?[...old,...page.drafts.filter(v=>!old.some(x=>x.draftId===v.draftId))]:page.drafts).sort((a,b)=>b.updatedAt-a.updatedAt||a.draftId.localeCompare(b.draftId)));setCursor(page.cursor);});
 useEffect(()=>{if(props.initialList&&!initialListLoaded.current&&!props.disabled){initialListLoaded.current=true;const selected=momentSelection.take(props.uid,props.familyId);if(selected)setTarget(selected);else load('active');}},[props.initialList,props.disabled]);
 const open=(row:Pick<MomentDraftHead,'draftId'>&{revision?:number})=>void run(async()=>{const before=stamp(latest.current);if(!canReplace(latest.current))return;let result:Awaited<ReturnType<typeof client.get>>;try{result=await client.get(row.draftId);if(row.revision!==undefined)checkSelectedMoment(row,result);}catch(e){if((e as {code?:string})?.code==='FORM_DRAFT_NOT_FOUND'){void resumeStore.forget(row.draftId);if(live.current)setResumeId(old=>old===row.draftId?null:old);}throw e;}if(!live.current)return;const attachments=await restoreDraftImages(result.images??[],videosEnabled,directEnabled);const p=latest.current;if(!live.current||p.disabled||stamp(p)!==before||!canReplace(p)){discardRestoredImages(attachments);if(live.current)setNotice('Nội dung đã thay đổi trong lúc tải. Không ghi đè biểu mẫu đang soạn.');return;}p.onRestore(result.fields,attachments);setAuto(false);setResumeId(result.draftId);void resumeStore.remember(result.draftId);setCurrent(result);setSaved(formStamp(result.fields,attachments));setSavedHasImages(attachments.length>0);setSavedAttachments(attachmentStamp(attachments));setNotice(attachments.length?'Đã mở bản nháp và media riêng tư.':'Đã mở bản nháp văn bản.');setMode(null);});
 const change=(row:MomentDraftHead,action:'trash'|'restore')=>void run(async()=>{const op={action,id:row.draftId};pending.current=op;finish(await (action==='trash'?client.trash(row):client.restore(row)),op);});
 const retryOperation=()=>void run(async()=>{const op=pending.current;if(op)finish(await client.retry(),op);});
 const currentStamp=stamp(props);
 // Debounce only for a user-selected, already-saved server draft. Recheck latest form and lock at execution.
 useEffect(()=>{const state={enabled:auto,current,busy:busy||localBusy,retry,disabled:props.disabled,hasAttachments:props.hasAttachments||savedHasImages,mediaSupported:imageEligible(props),hasContent:props.hasAttachments,caption:props.fields.caption,saved,stamp:currentStamp};if(!canAutosave(state))return;const mediaChanged=state.hasAttachments&&savedAttachments!==attachmentStamp(props.attachments);const timer=setTimeout(()=>{const p=latest.current;if(live.current&&!lock.current&&stamp(p)===currentStamp&&canAutosave({...state,disabled:p.disabled,hasAttachments:p.hasAttachments||savedHasImages,mediaSupported:imageEligible(p),hasContent:p.hasAttachments,caption:p.fields.caption}))save();},mediaChanged?MEDIA_AUTOSAVE_DELAY:AUTOSAVE_DELAY);return()=>clearTimeout(timer);},[auto,current,busy,localBusy,retry,props.disabled,props.hasAttachments,currentStamp,saved,savedHasImages,savedAttachments]);
 const locked=busy||retry||localBusy||!!props.disabled;const canSave=!locked&&(!props.hasAttachments||imageEligible(props))&&(!!props.fields.caption.trim()||props.hasAttachments);
 const button=(label:string,onPress:()=>void,disabled=false)=><BloomButton variant="outline" title={label} onPress={onPress} disabled={disabled}/>;
 return <View style={{borderWidth:1,borderColor:colors.border,borderRadius:14,padding:12,gap:8,marginBottom:14}}>
  <Text style={{fontWeight:'700',color:colors.primaryText}}>Bản nháp Kỷ niệm</Text>
  <Text style={{color:colors.secondaryText}}>Riêng tư theo tài khoản và nhà. {directEnabled?'Thử nghiệm MP4 tối đa 16 MiB/video (tối đa 2 video lớn), ảnh tối đa 2 MiB.':videosEnabled?'Lưu lời nhắn, định dạng, ảnh và MP4 nhỏ (tối đa 2 MiB/tệp).':imagesEnabled?'Lưu lời nhắn, định dạng và ảnh (tối đa 2 MiB/ảnh); chưa hỗ trợ video.':'Chỉ lưu lời nhắn, định dạng và lựa chọn Dòng thời gian; chưa lưu ảnh/video.'}</Text>
  {!!props.hasAttachments&&!imageEligible(props)&&<Text style={{color:colors.secondaryText}}>Hãy giữ biểu mẫu này nếu còn ảnh/video chưa đăng. Không thể lưu đồng bộ khi có tệp đính kèm.</Text>}
  {current&&<Text style={{color:colors.secondaryText}}>Phiên bản {current.revision} · {saved===stamp(props)?'đã lưu':'có thay đổi chưa lưu'}</Text>}
  {button(current?'Cập nhật bản nháp':'Lưu bản nháp',()=>save(),!canSave)}
  {current&&button('Lưu thành bản nháp mới',()=>{setAuto(false);save(true);},!canSave)}
  {current&&button(auto?'Tắt tự động lưu':'Bật tự động lưu',()=>setAuto(v=>!v),locked)}
  {auto&&<Text style={{color:colors.secondaryText}}>{props.hasAttachments&&!imageEligible(props)?'Tạm dừng: có tệp chưa được hỗ trợ.':!props.fields.caption.trim()&&!props.hasAttachments?'Tạm dừng vì bản nháp trống.':'Tự động lưu văn bản sau 2,5 giây; thay đổi ảnh sau 5 giây. Chỉ lưu khi có kết nối; không lưu nội dung chưa gửi khi đóng app.'}</Text>}
  {target&&<View style={{gap:6}}><Text style={{color:colors.primaryText}}>Bản nháp đã chọn từ Cài đặt · v{target.revision}</Text>{button('Mở bản nháp đã chọn',()=>{setTarget(null);open(target);},locked||!canReplace(props))}{button('Bỏ lựa chọn',()=>setTarget(null),locked)}</View>}
  {resumeId&&resumeId!==current?.draftId&&button('Tiếp tục bản nháp gần nhất trên thiết bị',()=>open({draftId:resumeId}),locked||!canReplace(props))}
  {button('Danh sách bản nháp',()=>load('active'),locked)}
  {button('Thùng rác bản nháp',()=>load('trash'),locked)}
  {retry&&button('Thử lại thao tác chưa xác nhận',retryOperation,busy||!!props.disabled)}
  {busy&&<Text style={{color:colors.secondaryText}}>Đang xử lý…</Text>}
  {!!notice&&<Text accessibilityRole="alert" style={{color:colors.primaryText}}>{notice}</Text>}
  <LocalMomentRecovery uid={props.uid} familyId={props.familyId} fields={props.fields} attachments={props.attachments} stamp={currentStamp} canReplace={!retry&&canReplace(props)} disabled={props.localDisabled??!!props.disabled} cloudBusy={busy} cloudId={current?.draftId??null} onBusy={value=>{localLock.current=value;setLocalBusy(value);}} onRestore={(fields,attachments)=>{setAuto(false);setCurrent(null);setSaved(null);setSavedHasImages(false);setSavedAttachments(null);props.onRestore(fields,attachments);}}/>
  {mode&&<View style={{gap:8}}>
   <Text style={{color:colors.primaryText,fontWeight:'700'}}>{mode==='trash'?'Thùng rác':'Bản nháp đã lưu'}</Text>
   {mode==='active'&&!canReplace(props)&&<Text style={{color:colors.secondaryText}}>Lưu thay đổi hoặc mở biểu mẫu trống trước khi mở bản nháp khác.</Text>}
   {!rows.length&&<Text style={{color:colors.secondaryText}}>{cursor?'Trang này không có bản nháp phù hợp.':'Không có bản nháp.'}</Text>}
   <TextInput accessibilityLabel="Tìm bản nháp đã tải" placeholder="Tìm trong các bản nháp đã tải" placeholderTextColor={colors.secondaryText} value={search} onChangeText={setSearch} style={{borderWidth:1,borderColor:colors.border,borderRadius:10,padding:9,color:colors.primaryText}}/>
   {search.trim()&&!rows.some(row=>(row.summary?.preview??'').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')))&&<Text style={{color:colors.secondaryText}}>Không có kết quả trong các trang đã tải.</Text>}
   {rows.filter(row=>!search.trim()||(row.summary?.preview??'').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))).map(row=><View key={row.draftId} style={{gap:5,borderTopWidth:1,borderColor:colors.border,paddingTop:8}}>
    {row.summary&&<Text style={{color:colors.primaryText,fontWeight:'700'}}>{row.summary.preview||'Bản nháp không có lời nhắn'}{row.summary.imageCount?` · ${row.summary.imageCount} ${row.summary.hasVideos?'tệp ảnh/video':'ảnh'}`:''}</Text>}
    <Text style={{color:colors.primaryText}}>{new Date(row.updatedAt).toLocaleString('vi-VN')} · #{row.draftId.slice(0,8)} · v{row.revision}</Text>
    {mode==='active'?<>{button('Mở bản nháp',()=>open(row),locked||!canReplace(props))}{button('Chuyển vào thùng rác',()=>change(row,'trash'),locked)}</>:button('Khôi phục',()=>change(row,'restore'),locked)}
   </View>)}
   {cursor&&button('Tải trang tiếp theo',()=>load(mode,true),locked)}
   {button('Đóng danh sách',()=>setMode(null),busy)}
  </View>}
 </View>;
}
