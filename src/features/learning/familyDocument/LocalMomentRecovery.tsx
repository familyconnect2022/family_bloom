import React,{useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import {createLocalMomentJournal,type LocalMomentRecord} from './localMomentJournal.cjs';
import {localMomentStore} from './localMomentStore';
import {readDraftImage,restoreDraftImages,discardRestoredImages,type DraftAttachment} from './momentDraftImages';
import type {MomentDraftFields} from './momentFormDraft.cjs';
import {BloomText as Text} from '../../../components/ui/BloomText';
import {BloomButton} from '../../../components/ui/BloomButtonComponents';
import {useA3Tokens} from '../../../appearance3/useAppearance3';
const enabled=process.env.EXPO_PUBLIC_FAMILY_LOCAL_MOMENT_RECOVERY_ENABLED==='1';
const videosEnabled=process.env.EXPO_PUBLIC_FAMILY_FORM_VIDEOS_ENABLED==='1';
type Props={uid:string;familyId:string;fields:MomentDraftFields;attachments:DraftAttachment[];stamp:string;canReplace:boolean;disabled:boolean;cloudBusy:boolean;cloudId:string|null;onBusy:(value:boolean)=>void;onRestore:(fields:MomentDraftFields,attachments:DraftAttachment[])=>void};
const eligible=(p:Props)=>p.attachments.length<=10&&p.attachments.every(a=>a.type==='image'||videosEnabled&&a.type==='video'&&a.mimeType==='video/mp4')&&(!!p.fields.caption.trim()||p.attachments.length>0);
const id=()=>Date.now().toString(16).padStart(12,'0').slice(-12)+Array.from({length:20},()=>Math.floor(Math.random()*16).toString(16)).join('');
const errorText=(e:unknown)=>(e as {code?:string})?.code==='LOCAL_DRAFT_CONFLICT'?'Bản sao đã đổi ở cửa sổ khác. Hãy tải lại trạng thái trước khi lưu.':'Chưa xác nhận được bản sao trên thiết bị. Kiểm tra dung lượng, ảnh và quyền lưu trữ; nội dung đang soạn vẫn còn.';
export function LocalMomentRecovery(props:Props){if(!enabled)return null;return <Recovery key={JSON.stringify([props.uid,props.familyId])} {...props}/>;}
function Recovery(props:Props){
 const {colors}=useA3Tokens();
 const [journal]=useState(()=>createLocalMomentJournal(localMomentStore,props.uid,props.familyId,id,Date.now,videosEnabled));
 const [record,setRecord]=useState<LocalMomentRecord|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[auto,setAuto]=useState(false),[savedStamp,setSavedStamp]=useState<string|null>(null),[notice,setNotice]=useState(''),[confirmClear,setConfirmClear]=useState(false);
 const live=useRef(true),lock=useRef(false),latest=useRef(props);latest.current=props;
 useEffect(()=>{live.current=true;let active=true;void journal.read().then(v=>{if(active){setRecord(v);setReady(true);}}).catch(e=>{if(active)setNotice(errorText(e));});return()=>{active=false;live.current=false;};},[journal]);
 useEffect(()=>{setAuto(false);},[props.cloudId]);
 const run=async(fn:()=>Promise<void>)=>{if(lock.current||latest.current.disabled||latest.current.cloudBusy)return;lock.current=true;setBusy(true);latest.current.onBusy(true);setNotice('');try{await fn();}catch(e){if(live.current){setAuto(false);setNotice(errorText(e));if((e as {code?:string})?.code==='LOCAL_DRAFT_CONFLICT')setReady(false);}}finally{lock.current=false;if(live.current){setBusy(false);latest.current.onBusy(false);}}};
 const reload=()=>void run(async()=>{const v=await journal.read();if(!live.current)return;setRecord(v);setSavedStamp(null);setAuto(false);setReady(true);});
 const save=()=>void run(async()=>{const p=latest.current;if(!ready||!eligible(p))return;const images:string[]=[];for(const a of p.attachments){if(!live.current||latest.current.disabled)return;images.push(await readDraftImage(a,videosEnabled));}if(!live.current||latest.current.disabled)return;const v=await journal.save(p.fields,images,record?.version??null);if(!live.current)return;setRecord(v);setSavedStamp(p.stamp);setConfirmClear(false);setNotice(latest.current.stamp===p.stamp?'Đã lưu bản sao trên thiết bị. Chưa đồng bộ lên máy chủ.':'Đã lưu nội dung lúc bắt đầu; có thay đổi mới chưa lưu.');});
 const restore=()=>void run(async()=>{const before=latest.current;if(!ready||!record||!before.canReplace)return;const v=await journal.read();if(!v||v.version!==record.version)throw Object.assign(Error('LOCAL_DRAFT_CONFLICT'),{code:'LOCAL_DRAFT_CONFLICT'});const images=await restoreDraftImages(v.images,videosEnabled);const p=latest.current;if(!live.current||p.disabled||p.cloudBusy||!p.canReplace||p.stamp!==before.stamp){discardRestoredImages(images);return;}p.onRestore(v.fields,images);setAuto(false);setSavedStamp(null);setNotice('Đã mở bản sao ngoại tuyến. Nếu cần đồng bộ, lưu thành bản nháp mới; không ghi đè phiên bản máy chủ.');});
 const clear=()=>void run(async()=>{if(!record||!confirmClear)return;await journal.clear(record.version);if(!live.current)return;setRecord(null);setAuto(false);setSavedStamp(null);setConfirmClear(false);setNotice('Đã xóa bản sao trên thiết bị. Bản nháp trên máy chủ không thay đổi.');});
 useEffect(()=>{if(!auto||!ready||!record||busy||props.disabled||props.cloudBusy||!eligible(props)||savedStamp===props.stamp)return;const snapshot=props.stamp;const timer=setTimeout(()=>{if(live.current&&!lock.current&&latest.current.stamp===snapshot)save();},5000);return()=>clearTimeout(timer);},[auto,ready,record,busy,props.disabled,props.cloudBusy,props.stamp,savedStamp]);
 const locked=busy||props.disabled||props.cloudBusy;
 const button=(label:string,onPress:()=>void,disabled=false)=><BloomButton variant="outline" title={label} onPress={onPress} disabled={disabled}/>;
 return <View style={{borderTopWidth:1,borderColor:colors.border,paddingTop:10,gap:7}}>
  <Text style={{color:colors.primaryText,fontWeight:'700'}}>Bản sao ngoại tuyến</Text>
  <Text style={{color:colors.secondaryText}}>Tùy chọn: lưu lời nhắn, định dạng và tối đa 10 tệp ({videosEnabled?'ảnh hoặc MP4 nhỏ':'chỉ ảnh'}, 2 MiB/tệp) ngay trên thiết bị, không cần mạng. Dữ liệu lưu cục bộ không được mã hóa riêng; không dùng trên thiết bị chung. Không tự đăng hoặc đồng bộ.</Text>
  {record&&<Text style={{color:colors.secondaryText}}>Bản sao: {new Date(record.savedAt).toLocaleString('vi-VN')} · {record.images.length} tệp. Bản sao không tự xóa khi đăng bài.</Text>}
  {button(record?'Thay bản sao trên thiết bị':'Lưu bản sao trên thiết bị',save,locked||!ready||!eligible(props))}
  {record&&button('Mở bản sao ngoại tuyến',restore,locked||!ready||!props.canReplace)}
  {record&&button(auto?'Tắt tự lưu trên thiết bị':'Bật tự lưu trên thiết bị',()=>setAuto(v=>!v),locked||!ready||savedStamp===null&&!auto)}
  {auto&&<Text style={{color:colors.secondaryText}}>Lưu sau 5 giây ngừng chỉnh sửa; tạm dừng nếu có tệp không được hỗ trợ, lỗi hoặc thao tác đồng bộ. Thay đổi ngay trước khi đóng có thể chưa lưu.</Text>}
  {record&&button(confirmClear?'Xác nhận xóa bản sao cục bộ':'Xóa bản sao cục bộ',()=>confirmClear?clear():setConfirmClear(true),locked||!ready)}
  {confirmClear&&button('Không xóa',()=>setConfirmClear(false),locked)}
  {button('Tải lại trạng thái bản sao',reload,locked)}
  {busy&&<Text style={{color:colors.secondaryText}}>Đang xử lý bản sao…</Text>}
  {!!notice&&<Text accessibilityRole="alert" style={{color:colors.primaryText}}>{notice}</Text>}
 </View>;
}
