import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,BackHandler,Keyboard,Pressable,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Asset} from 'expo-asset';
import {File} from 'expo-file-system';
import {WebView,type WebViewMessageEvent} from 'react-native-webview';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BloomText as Text} from '../../../components/ui/BloomText';
import {useA3Theme,useA3Typography} from '../../../appearance3/useAppearance3';
import {nativeDraftRequest} from './draftRequest';
import {chooseEditorImages} from './nativeImagePicker';
import {getAuth} from '@react-native-firebase/auth';
import {useAuth} from '../../../context/AuthContext';

// Stable isolated origin for IndexedDB; this host is never contacted over the network.
const ORIGIN='https://family-editor.invalid/';
const FINISH="window.dispatchEvent(new Event('family-editor:finish'));true;";
const MODULE=require('../../../../assets/editor/family-editor.html');
type Scope={uid:string;familyId:string};

export function FamilyEditorScreen(){
 const {user,activeFamilyId,activeMembership}=useAuth();
 const theme=useA3Theme();
 if(!user||!activeFamilyId||!activeMembership||activeMembership.familyId!==activeFamilyId)return <SafeAreaView style={{flex:1,backgroundColor:theme.colors.background}}><Text>Hãy đăng nhập và chọn nhà trước khi mở Editor.</Text></SafeAreaView>;
 return <OfflineEditor key={JSON.stringify([user.uid,activeFamilyId])} uid={user.uid} familyId={activeFamilyId}/>;
}
function OfflineEditor({uid,familyId}:Scope){
 const router=useRouter(),theme=useA3Theme(),typography=useA3Typography(),c=theme.colors;
 const web=useRef<WebView>(null),ready=useRef(false),closing=useRef(false),keyboard=useRef(false);
 const [html,setHtml]=useState<string|null>(null),[error,setError]=useState(''),[opened,setOpened]=useState(false);
 // Opt-in only. The R29 artifact contains the native draft bridge; keep disabled in production until live gates pass.
 const syncEnabled=process.env.EXPO_PUBLIC_FAMILY_EDITOR_DRAFTS_ENABLED==='1';
 const inflight=useRef<AbortController|null>(null);
 const picker=useRef<string|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;picker.current=null;inflight.current?.abort();};},[]);
 const config=useMemo(()=>({uid,familyId,syncEnabled,scale:typography.scale,colors:{primaryText:c.primaryText,secondaryText:c.secondaryText,primary:c.primary,onPrimary:c.onPrimary,background:c.background,surface:c.surface,border:c.border,softSurface:c.softSurface,accentBg:c.accentBg}}),[uid,familyId,syncEnabled,typography.scale,c]);
 const configRef=useRef(config);configRef.current=config;
 const source=useMemo(()=>html?{html,baseUrl:ORIGIN}:null,[html]);
 const exit=useCallback(()=>{if(closing.current)return;closing.current=true;if(router.canGoBack())router.back();else router.replace('/learning-library');},[router]);
 const configure=useCallback(()=>{if(!ready.current)return;const serialized=JSON.stringify(configRef.current).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');web.current?.injectJavaScript(`window.familyBloomStart && window.familyBloomStart(${serialized});true;`);},[]);
 useEffect(()=>{let alive=true;void(async()=>{try{const asset=await Asset.fromModule(MODULE).downloadAsync();if(!asset.localUri)throw Error('missing asset');const content=await new File(asset.localUri).text();if(!content.includes('Content-Security-Policy')||!content.includes('familyBloomStart'))throw Error('invalid bundle');if(alive)setHtml(content);}catch{if(alive)setError('Không mở được bộ Editor đóng gói. Hãy kiểm tra phiên bản ứng dụng.');}})();return()=>{alive=false;};},[]);
 useEffect(()=>{configure();},[config,configure]);
 useEffect(()=>{const show=Keyboard.addListener('keyboardDidShow',()=>{keyboard.current=true;}),hide=Keyboard.addListener('keyboardDidHide',()=>{keyboard.current=false;});return()=>{show.remove();hide.remove();};},[]);
 useEffect(()=>{if(!html||opened||error)return;const timeout=setTimeout(()=>setError('Editor không phản hồi. Bản nháp đã lưu vẫn được giữ trên thiết bị.'),15000);return()=>clearTimeout(timeout);},[html,opened,error]);
 const finish=useCallback(()=>{if(error||!html){exit();return;}if(!ready.current)return;web.current?.injectJavaScript(FINISH);},[error,html,exit]);
 useFocusEffect(useCallback(()=>{const handler=BackHandler.addEventListener('hardwareBackPress',()=>{if(keyboard.current){Keyboard.dismiss();return true;}finish();return true;});return()=>handler.remove();},[finish]));
 const receive=useCallback((event:WebViewMessageEvent)=>{const {data,url}=event.nativeEvent;if(data.length>3500000||url!==ORIGIN&&url!=='about:blank')return;try{const message=JSON.parse(data);if(message.protocol!==1)return;if(message.type==='pickImages'){if(!ready.current||closing.current||picker.current||getAuth().currentUser?.uid!==uid||!(/^[a-f0-9]{32}$/).test(message.id))return;const id=String(message.id);picker.current=id;const active=()=>mounted.current&&!closing.current&&picker.current===id&&getAuth().currentUser?.uid===uid;const send=(index:number,total:number,mime:string,data:string,error:string)=>{if(!active())return;const payload=JSON.stringify([id,index,total,mime,data,error]);web.current?.injectJavaScript(`window.familyBloomImageReply && window.familyBloomImageReply(...${payload});true;`);};void chooseEditorImages(send,active).catch(()=>send(0,0,'','','PICK_FAILED')).finally(()=>{if(picker.current===id)picker.current=null;});return;}if(message.type==='draftRequest'){if(!syncEnabled||!ready.current||closing.current||inflight.current||!(/^[a-f0-9]{32}$/).test(message.id)||!message.body||typeof message.body!=='object'||Array.isArray(message.body))return;const ctrl=new AbortController();inflight.current=ctrl;const timer=setTimeout(()=>ctrl.abort(),35000);const reply=(ok:boolean,value:unknown)=>{if(closing.current||ctrl.signal.aborted)return;const payload=JSON.stringify([message.id,ok,value]).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');web.current?.injectJavaScript(`window.familyBloomDraftReply && window.familyBloomDraftReply(...${payload});true;`);};void nativeDraftRequest(uid,familyId,message.body,ctrl.signal).then(v=>reply(true,v),e=>reply(false,typeof e?.code==='string'&&/^[A-Z][A-Z0-9_]{2,63}$/.test(e.code)?e.code:'SYNC_FAILED')).finally(()=>{clearTimeout(timer);if(inflight.current===ctrl)inflight.current=null;});return;}if(message.type==='ready'){ready.current=true;configure();setOpened(true);}else if(message.type==='closed'&&ready.current){exit();}else if(message.type==='error'){setError('Editor không thể khởi tạo an toàn. Bản nháp cục bộ không bị xóa.');}}catch{/* Ignore malformed or unrelated messages. */}},[configure,exit,uid,familyId,syncEnabled]);
 return <SafeAreaView style={{flex:1,backgroundColor:c.background}}>
  <View style={{minHeight:52,paddingHorizontal:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',backgroundColor:c.surface,borderBottomWidth:1,borderColor:c.border}}><Text style={{fontSize:18,fontWeight:'800',color:c.primaryText}}>Family Editor</Text><Pressable accessibilityRole="button" onPress={finish} disabled={!opened&&!error&&!!html} style={{padding:12}}><Text style={{color:c.primary,fontWeight:'800'}}>Xong</Text></Pressable></View>
  {error?<View style={{flex:1,justifyContent:'center',padding:20,gap:12}}><Text style={{color:c.primaryText}}>{error}</Text><Pressable accessibilityRole="button" onPress={exit}><Text style={{color:c.primary}}>Quay lại</Text></Pressable></View>:source?<WebView ref={web} source={source} style={{flex:1,backgroundColor:c.background}} originWhitelist={['*']} onShouldStartLoadWithRequest={r=>r.url===ORIGIN||r.url==='about:blank'} onMessage={receive} javaScriptEnabled domStorageEnabled allowFileAccess={false} allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false} javaScriptCanOpenWindowsAutomatically={false} setSupportMultipleWindows={false} mixedContentMode="never" thirdPartyCookiesEnabled={false} sharedCookiesEnabled={false} onError={()=>setError('Không mở được Editor.')} onRenderProcessGone={()=>setError('Editor bị gián đoạn. Bản nháp đã lưu không bị xóa.')}/>:<View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={c.primary}/><Text>Đang mở Family Editor…</Text></View>}
 </SafeAreaView>;
}
