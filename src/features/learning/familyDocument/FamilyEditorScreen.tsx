import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,BackHandler,Keyboard,Pressable,View,Modal,Alert} from 'react-native';
import {useFocusEffect,useRouter,useLocalSearchParams} from 'expo-router';
import {Asset} from 'expo-asset';
import {File} from 'expo-file-system';
import {WebView,type WebViewMessageEvent} from 'react-native-webview';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BloomText as Text} from '../../../components/ui/BloomText';
import {useA3Theme,useA3Typography} from '../../../appearance3/useAppearance3';
import {nativeDraftRequest} from './draftRequest';
import {chooseEditorImages} from './nativeImagePicker';
import {getAuth} from '@react-native-firebase/auth';
import {checkedFieldValue,readFieldDocument,type FieldValue} from './formDocument.cjs';
import {useAuth} from '../../../context/AuthContext';
import {learningSelection,type MomentSelection} from './draftCatalogue.cjs';
const supportsLearningSelection=(require('../../../../assets/editor/bundle-provenance.json') as {learningSelectionProtocol?:number}).learningSelectionProtocol===1;

// Stable isolated origin for IndexedDB; this host is never contacted over the network.
const ORIGIN='https://family-editor.invalid/';
const localDocumentUrl=(url:string)=>url===ORIGIN||url===ORIGIN.slice(0,-1)||url==='about:blank';
const FINISH="window.dispatchEvent(new Event('family-editor:finish'));true;";
const MODULE=require('../../../../assets/editor/family-editor.html');
type Scope={uid:string;familyId:string};

export function FamilyEditorScreen(){
 const {publish}=useLocalSearchParams<{publish?:string}>();
 const {user,activeFamilyId,activeMembership}=useAuth();
 const theme=useA3Theme();
 if(!user||!activeFamilyId||!activeMembership||activeMembership.familyId!==activeFamilyId)return <SafeAreaView style={{flex:1,backgroundColor:theme.colors.background}}><Text>Hãy đăng nhập và chọn nhà trước khi mở Editor.</Text></SafeAreaView>;
 return <OfflineEditor key={JSON.stringify([user.uid,activeFamilyId])} uid={user.uid} familyId={activeFamilyId} syncForPublish={publish==='1'}/>;
}
type Field={id:string;caption:string;richBody:string|null};
type Reader={caption:string;richBody:string};
function OfflineEditor({uid,familyId,field,reader,onClose,onApply,finishRef,syncForPublish=false}:Scope&{syncForPublish?:boolean;field?:Field;reader?:Reader;onClose?:()=>void;onApply?:(value:FieldValue)=>void;finishRef?:React.MutableRefObject<()=>void>}){
 const router=useRouter(),theme=useA3Theme(),typography=useA3Typography(),c=theme.colors;
 const web=useRef<WebView>(null),ready=useRef(false),closing=useRef(false),keyboard=useRef(false);
 const [html,setHtml]=useState<string|null>(null),[error,setError]=useState(''),[opened,setOpened]=useState(false),[attempt,setAttempt]=useState(0);
 // Opt-in: an explicit article workflow enables sync for this editor session only.
 const syncEnabled=!field&&!reader&&(syncForPublish||process.env.EXPO_PUBLIC_FAMILY_EDITOR_DRAFTS_ENABLED==='1');
 const [initialSelection,setInitialSelection]=useState<MomentSelection|null>(null),selectionTaken=useRef(false);
 const [selectionReady,setSelectionReady]=useState(!syncEnabled||!supportsLearningSelection);
 useEffect(()=>{if(!syncEnabled||!supportsLearningSelection||selectionTaken.current)return;selectionTaken.current=true;setInitialSelection(learningSelection.take(uid,familyId));setSelectionReady(true);},[uid,familyId,syncEnabled]);
 const inflight=useRef<AbortController|null>(null);
 const picker=useRef<string|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;picker.current=null;inflight.current?.abort();};},[]);
 const config=useMemo(()=>({uid,familyId,syncEnabled,field,reader,initialSelection:initialSelection??undefined,scale:typography.scale,colors:{primaryText:c.primaryText,secondaryText:c.secondaryText,primary:c.primary,onPrimary:c.onPrimary,background:c.background,surface:c.surface,border:c.border,softSurface:c.softSurface,accentBg:c.accentBg}}),[uid,familyId,syncEnabled,field,reader,initialSelection,typography.scale,c]);
 const configRef=useRef(config);configRef.current=config;
 const source=useMemo(()=>html&&selectionReady?{html,baseUrl:ORIGIN}:null,[html,selectionReady]);
 const exit=useCallback(()=>{if(closing.current)return;closing.current=true;if(onClose){onClose();return;}if(router.canGoBack())router.back();else router.replace('/learning-library');},[router,onClose]);
 const configure=useCallback(()=>{if(!ready.current)return;const serialized=JSON.stringify(configRef.current).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');web.current?.injectJavaScript(`window.familyBloomStart && window.familyBloomStart(${serialized});true;`);},[]);
 useEffect(()=>{let alive=true;void(async()=>{try{const asset=await Asset.fromModule(MODULE).downloadAsync();if(!asset.localUri)throw Error('missing asset');const content=await new File(asset.localUri).text();if(!content.includes('Content-Security-Policy')||!content.includes('familyBloomStart')||(supportsLearningSelection&&!content.includes('INVALID_SELECTED_LEARNING_DRAFT'))||((field||reader)&&!content.includes('FIELD_INVALID_PUBLICATION')))throw Error('invalid bundle');if(alive)setHtml(content);}catch{if(alive)setError('Chưa mở được trình soạn thảo. Bạn thử lại nhé.');}})();return()=>{alive=false;};},[attempt]);
 useEffect(()=>{configure();},[config,configure]);
 useEffect(()=>{const show=Keyboard.addListener('keyboardDidShow',()=>{keyboard.current=true;}),hide=Keyboard.addListener('keyboardDidHide',()=>{keyboard.current=false;});return()=>{show.remove();hide.remove();};},[]);
 useEffect(()=>{if(opened||error)return;const timeout=setTimeout(()=>setError('Trình soạn thảo chưa phản hồi. Bản nháp đã lưu vẫn được giữ.'),15000);return()=>clearTimeout(timeout);},[attempt,opened,error]);
 // The native message bridge can attach after the bundled script emitted ready.
 // Ask the already loaded local document to repeat its handshake; never relax its navigation policy.
 const handshake=useCallback(()=>{web.current?.injectJavaScript("(function(){if(typeof window.familyBloomStart==='function'&&window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({protocol:1,type:document.getElementById('root')?.childElementCount?'rendered':'ready'}));}})();true;");},[]);
 useEffect(()=>{if(!source||opened||error)return;const timer=setInterval(handshake,500);return()=>clearInterval(timer);},[source,opened,error,handshake]);
 const retry=()=>{ready.current=false;inflight.current?.abort();inflight.current=null;picker.current=null;setOpened(false);setHtml(null);setError('');setAttempt(v=>v+1);};
 const finish=useCallback(()=>{if(error||!html||!opened||!ready.current){exit();return;}web.current?.injectJavaScript(FINISH);},[error,html,opened,exit]);
 useEffect(()=>{if(finishRef)finishRef.current=finish;},[finishRef,finish]);
 useFocusEffect(useCallback(()=>{if(onClose)return;const handler=BackHandler.addEventListener('hardwareBackPress',()=>{if(keyboard.current){Keyboard.dismiss();return true;}finish();return true;});return()=>handler.remove();},[finish,onClose]));
 const receive=useCallback((event:WebViewMessageEvent)=>{const {data,url}=event.nativeEvent;if(data.length>3500000||!localDocumentUrl(url))return;try{const message=JSON.parse(data);if(message.protocol!==1)return;if(message.type==='fieldResult'){if(!field||!onApply||!ready.current||closing.current||message.id!==field.id||getAuth().currentUser?.uid!==uid||typeof message.caption!=='string')return;try{const richBody=checkedFieldValue(message.richBody,message.caption);if(message.richBody!==richBody)throw Error('INVALID_FIELD');closing.current=true;onApply({caption:message.caption,richBody});}catch{setError('Nội dung chưa hợp lệ; bản nháp vẫn được giữ.');}return;}if(message.type==='pickImages'){if(field||reader||!ready.current||closing.current||picker.current||getAuth().currentUser?.uid!==uid||!(/^[a-f0-9]{32}$/).test(message.id))return;const id=String(message.id);picker.current=id;const active=()=>mounted.current&&!closing.current&&picker.current===id&&getAuth().currentUser?.uid===uid;const send=(index:number,total:number,mime:string,data:string,error:string)=>{if(!active())return;const payload=JSON.stringify([id,index,total,mime,data,error]);web.current?.injectJavaScript(`window.familyBloomImageReply && window.familyBloomImageReply(...${payload});true;`);};void chooseEditorImages(send,active).catch(()=>send(0,0,'','','PICK_FAILED')).finally(()=>{if(picker.current===id)picker.current=null;});return;}if(message.type==='draftRequest'){if(!syncEnabled||!ready.current||closing.current||inflight.current||!(/^[a-f0-9]{32}$/).test(message.id)||!message.body||typeof message.body!=='object'||Array.isArray(message.body))return;const ctrl=new AbortController();inflight.current=ctrl;const timer=setTimeout(()=>ctrl.abort(),35000);const reply=(ok:boolean,value:unknown)=>{if(closing.current||ctrl.signal.aborted)return;const payload=JSON.stringify([message.id,ok,value]).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');web.current?.injectJavaScript(`window.familyBloomDraftReply && window.familyBloomDraftReply(...${payload});true;`);};void nativeDraftRequest(uid,familyId,message.body,ctrl.signal).then(v=>reply(true,v),e=>reply(false,typeof e?.code==='string'&&/^[A-Z][A-Z0-9_]{2,63}$/.test(e.code)?e.code:'SYNC_FAILED')).finally(()=>{clearTimeout(timer);if(inflight.current===ctrl)inflight.current=null;});return;}if(message.type==='ready'){if(!ready.current){ready.current=true;configure();}}else if(message.type==='rendered'&&ready.current){setOpened(true);}else if(message.type==='closed'&&ready.current){exit();}else if(message.type==='error'){setError('Editor không thể khởi tạo an toàn. Bản nháp cục bộ không bị xóa.');}}catch{/* Ignore malformed or unrelated messages. */}},[configure,exit,uid,familyId,syncEnabled,field,reader,onApply]);
 return <SafeAreaView style={{flex:1,backgroundColor:c.background}}>
  <View style={{minHeight:52,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:c.surface,borderBottomWidth:1,borderColor:c.border}}><Text style={{fontSize:18,fontWeight:'800',color:c.primaryText}}>Family Editor</Text><Pressable accessibilityRole="button" onPress={finish} style={{padding:12}}><Text style={{color:c.primary,fontWeight:'800'}}>{opened&&!error?'Xong':'Quay lại'}</Text></Pressable></View>
  {error?<View style={{flex:1,justifyContent:'center',padding:20,gap:12}}><Text style={{color:c.primaryText}}>{error}</Text><Pressable accessibilityRole="button" onPress={retry} style={{padding:12,backgroundColor:c.primary,borderRadius:12}}><Text style={{color:c.onPrimary,textAlign:'center'}}>Thử lại</Text></Pressable><Pressable accessibilityRole="button" onPress={exit}><Text style={{color:c.primary}}>Quay lại</Text></Pressable></View>:source?<View style={{flex:1}}><WebView key={attempt} ref={web} source={source} style={{flex:1,backgroundColor:c.background}} originWhitelist={['*']} onShouldStartLoadWithRequest={r=>localDocumentUrl(r.url)} onLoadEnd={handshake} onMessage={receive} javaScriptEnabled domStorageEnabled allowFileAccess={false} allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false} javaScriptCanOpenWindowsAutomatically={false} setSupportMultipleWindows={false} mixedContentMode="never" thirdPartyCookiesEnabled={false} sharedCookiesEnabled={false} onError={()=>setError('Không mở được Editor.')} onRenderProcessGone={()=>setError('Editor bị gián đoạn. Bản nháp đã lưu không bị xóa.')}/>{!opened&&<View pointerEvents="none" style={{position:'absolute',top:0,bottom:0,left:0,right:0,alignItems:'center',justifyContent:'center',backgroundColor:c.background,gap:10}}><ActivityIndicator color={c.primary}/><Text>Đang mở trình soạn thảo…</Text></View>}</View>:<View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={c.primary}/><Text>Đang mở Family Editor…</Text></View>}
 </SafeAreaView>;
}

const fieldEnabled=process.env.EXPO_PUBLIC_FAMILY_FIELD_EDITOR_ENABLED==='1';
export function MomentFieldControl({caption,richBody,disabled,onChange}:{caption:string;richBody?:string|null;disabled?:boolean;onChange:(value:FieldValue)=>void}){
 const {user,activeFamilyId,activeMembership}=useAuth(),c=useA3Theme().colors;
 const [open,setOpen]=useState(false);const id=useRef<{scope:string;caption:string;richBody:string|null;id:string}|null>(null),finish=useRef<()=>void>(()=>{});
 const scope=JSON.stringify([user?.uid,activeFamilyId]),valid=!!readFieldDocument(richBody,caption);
 if(!user||!activeFamilyId||activeMembership?.familyId!==activeFamilyId||(!fieldEnabled&&!valid))return null;
 const uid=user.uid,familyId=activeFamilyId;
 const start=()=>{if(disabled||!fieldEnabled)return;if(!id.current||id.current.scope!==scope||id.current.caption!==caption||id.current.richBody!==(richBody??null)){const hex=Date.now().toString(16).padStart(12,'0')+Array.from({length:20},()=>Math.floor(Math.random()*16).toString(16)).join('');id.current={scope,caption,richBody:richBody??null,id:hex.slice(-32)};}Keyboard.dismiss();setOpen(true);};
 const button={padding:10,borderRadius:10,borderWidth:1,borderColor:c.border};
 return <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12}}>{fieldEnabled&&<Pressable style={button} disabled={disabled} onPress={start}><Text style={{color:c.primary}}>{valid?'Chỉnh nội dung định dạng':'Mở Family Editor'}</Text></Pressable>}{valid&&<Pressable style={button} disabled={disabled} onPress={()=>Alert.alert('Chuyển về văn bản thường?','Định dạng sẽ bị bỏ khi lưu biểu mẫu.',[{text:'Hủy',style:'cancel'},{text:'Chuyển',onPress:()=>{onChange({caption,richBody:null});id.current=null;}}])}><Text style={{color:c.primary}}>Văn bản thường</Text></Pressable>}{open&&id.current?.scope===scope&&<Modal visible animationType="slide" onRequestClose={()=>finish.current()}><OfflineEditor key={id.current.id} uid={uid} familyId={familyId} field={{id:id.current.id,caption,richBody:richBody??null}} onClose={()=>setOpen(false)} onApply={v=>{onChange(v);id.current=null;setOpen(false);}} finishRef={finish}/></Modal>}</View>;
}
export function MomentFieldReaderControl({caption,richBody}:{caption:string;richBody?:string|null}){
 const {user,activeFamilyId,activeMembership}=useAuth(),c=useA3Theme().colors;const [open,setOpen]=useState(false),finish=useRef<()=>void>(()=>{});
 if(!user||!activeFamilyId||activeMembership?.familyId!==activeFamilyId||!richBody||!readFieldDocument(richBody,caption))return null;
 return <><Pressable onPress={()=>setOpen(true)} style={{paddingHorizontal:16,paddingBottom:12}}><Text style={{color:c.primary}}>Xem nội dung định dạng</Text></Pressable>{open&&<Modal visible animationType="slide" onRequestClose={()=>setOpen(false)}><OfflineEditor uid={user.uid} familyId={activeFamilyId} reader={{caption,richBody}} onClose={()=>setOpen(false)} finishRef={finish}/></Modal>}</>;
}
