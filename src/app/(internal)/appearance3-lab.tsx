/** Dev-only Appearance 3.0 laboratory. Compiler ON, explicit reactive token props.
 * No background timers, no console logs, no Firebase reads/writes in render.
 */
import { Profiler, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { isPerformanceTestAccount, isVerifiedDeveloperAccount } from '../../constants/performanceTest';
import { A3Button, A3Card, A3Input, A3Modal, A3Text } from '../../appearance3/labComponents';
import { makeA3SandboxColors, makeA3Tokens, makeA3Typography, useA3Theme, useA3Tokens, useA3Typography } from '../../appearance3/useAppearance3';
import { evaluateColdStart } from '../../appearance3/coldStartCheck';
import { updateBloomPalette, updateBloomMode } from '../../theme/runtime';
import { applyLivingAppearance, getLivingAppearance, type BloomFontStyle } from '../../theme/livingAppearance';
import { appearanceUserEdited, getAppearanceHydrationStatus, subscribeAppearanceHydration, getAppearanceSyncMetrics, waitForAppearanceLocalWrites } from '../../theme/appearanceCloudSync';
import { BLOOM_PALETTE_IDS, BLOOM_PALETTE_LABELS, type BloomPaletteId, type BloomDisplayMode } from '../../theme/palette';

const TEST_MARKER_PREFIX='@family-bloom/android/appearance3/lab/cold-start/v1/';
// New JS session after a full app restart. A navigation away/back is NOT a cold start.
const LAB_SESSION = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const FONTS: ReadonlyArray<BloomFontStyle> = ['modern','rounded','cute','clear','classic'];
const now=()=> typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
const round=(value:number)=>Math.round(value*10)/10;
type LabMode='sandbox'|'live';
type Marker={palette:BloomPaletteId;mode:BloomDisplayMode;font:BloomFontStyle;scale:number;
  createdAt:string;session?:string;testVersion?:2;testMode?:'live'};
function isMarker(value:unknown):value is Marker {
  if(!value||typeof value!=='object')return false;
  const v=value as Partial<Marker>;
  return BLOOM_PALETTE_IDS.includes(v.palette as BloomPaletteId) &&
    ['light','dark','system'].includes(v.mode??'') && FONTS.includes(v.font as BloomFontStyle) &&
    typeof v.scale==='number' && v.scale>=90 && v.scale<=160 && typeof v.createdAt==='string';
}

type ProfileRow={commits:number;renderMs:number[];baseMs:number[]};
type ProfileSummary=Record<string,{commits:number;meanRenderMs:number;p95RenderMs:number;maxRenderMs:number}>;
function summarize(rows:Record<string,ProfileRow>): ProfileSummary {
  const summary:ProfileSummary={};
  for(const [id,row] of Object.entries(rows)) {
    const data=[...row.renderMs].sort((a,b)=>a-b);
    const total=data.reduce((a,b)=>a+b,0);
    summary[id]={commits:row.commits,meanRenderMs:round(data.length?total/data.length:0),
      p95RenderMs:round(data.length?data[Math.max(0,Math.ceil(data.length*0.95)-1)]:0),maxRenderMs:round(data.length?data[data.length-1]:0)};
  }
  return summary;
}
export default function Appearance3Lab() {
  const router=useRouter();
  const {user}=useAuth();
  const authorized=isPerformanceTestAccount(user?.email)&&isVerifiedDeveloperAccount(user);
  const liveTheme=useA3Theme();
  const liveTypography=useA3Typography();
  const liveTokens=useA3Tokens();
  const hydrate=useSyncExternalStore(subscribeAppearanceHydration,getAppearanceHydrationStatus,getAppearanceHydrationStatus);
  const [labMode,setLabMode]=useState<LabMode>('sandbox');
  const [sandbox,setSandbox]=useState<{palette:BloomPaletteId;mode:BloomDisplayMode;font:BloomFontStyle;scale:number}>(()=>({
    palette:liveTheme.selection.palette,mode:liveTheme.selection.mode,font:liveTypography.font,scale:liveTypography.scale,
  }));
  const sandboxTokens=useMemo(()=>makeA3Tokens(makeA3SandboxColors(sandbox.palette,sandbox.mode==='dark'?'dark':'light'),makeA3Typography(sandbox.font,sandbox.scale)),[sandbox.palette,sandbox.mode,sandbox.font,sandbox.scale]);
  const tokens=labMode==='sandbox'?sandboxTokens:liveTokens;
  const [input,setInput]=useState('Cả nhà mình cùng nở hoa 🌸');
  const [modal,setModal]=useState(false);
  const [presses,setPresses]=useState(0);
  const [marker,setMarker]=useState<Marker|null>(null);
  const [markerLoading,setMarkerLoading]=useState(true);
  const [markerError,setMarkerError]=useState('');
  const [measure,setMeasure]=useState<{rows:ProfileSummary;latencies:number[];capturedAt:string}|null>(null);
  const [lastLatency,setLastLatency]=useState<number|null>(null);
  const [syncMetrics,setSyncMetrics]=useState(getAppearanceSyncMetrics);
  const logsRef=useRef<Record<string,ProfileRow>>({});
  const latencyRef=useRef<number[]>([]);
  const pendingRef=useRef<{start:number;reason:string}|null>(null);
  const captureRef=useRef(true);
  const onRender=useCallback((id:string,_phase:'mount'|'update'|'nested-update',actualDuration:number,baseDuration:number)=>{
    if(!captureRef.current)return;
    const prev=logsRef.current[id]??{commits:0,renderMs:[],baseMs:[]};
    prev.commits++;
    if(Number.isFinite(actualDuration))prev.renderMs.push(actualDuration);
    if(Number.isFinite(baseDuration))prev.baseMs.push(baseDuration);
    if(prev.renderMs.length>300)prev.renderMs.shift();
    if(prev.baseMs.length>300)prev.baseMs.shift();
    logsRef.current[id]=prev;
  },[]);
  useLayoutEffect(()=>{
    const pending=pendingRef.current;
    if(!pending)return;
    pendingRef.current=null;
    const delta=Math.max(0,now()-pending.start);
    latencyRef.current.push(delta);
    if(latencyRef.current.length>300)latencyRef.current.shift();
    // No state update here: measuring must not generate another render.
  });
  useEffect(()=>{
    let valid=true;
    setMarker(null);setMarkerError('');setMarkerLoading(true);
    if(!authorized||!user?.uid){setMarkerLoading(false);return()=>{valid=false;};}
    void AsyncStorage.getItem(TEST_MARKER_PREFIX+user.uid).then(raw=>{
      if(valid){
        let parsed: unknown = null;
        try{parsed=raw?JSON.parse(raw):null;}catch{parsed=null;}
        setMarker(isMarker(parsed)?parsed:null);
        setMarkerLoading(false);
      }
    }).catch(()=>{if(valid){setMarkerError('Không đọc được mốc thử trong máy.');setMarkerLoading(false);}});
    return()=>{valid=false;};
  },[authorized,user?.uid]);
  const begin=()=>{captureRef.current=true;pendingRef.current={start:now(),reason:'interaction'};setLastLatency(null);};
  const onSelectPalette=(palette:BloomPaletteId)=>{
    if((labMode==='sandbox'?sandbox.palette:liveTheme.selection.palette)===palette)return;
    begin();
    if(labMode==='sandbox')setSandbox(prev=>({...prev,palette}));
    else if(updateBloomPalette(palette))appearanceUserEdited();
  };
  const onSetScale=(scale:number)=>{
    const safe=Math.max(90,Math.min(160,scale));
    if((labMode==='sandbox'?sandbox.scale:liveTypography.scale)===safe)return;
    begin();
    if(labMode==='sandbox')setSandbox(prev=>({...prev,scale:safe}));
    else if(applyLivingAppearance({...getLivingAppearance(),fontScale:safe}))appearanceUserEdited();
  };
  const onSetFont=(font:BloomFontStyle)=>{
    if((labMode==='sandbox'?sandbox.font:liveTypography.font)===font)return;
    begin();
    if(labMode==='sandbox')setSandbox(prev=>({...prev,font}));
    else if(applyLivingAppearance({...getLivingAppearance(),font}))appearanceUserEdited();
  };
  const onSetMode=(mode:BloomDisplayMode)=>{
    if((labMode==='sandbox'?sandbox.mode:liveTheme.selection.mode)===mode)return;
    begin();
    if(labMode==='sandbox')setSandbox(prev=>({...prev,mode}));
    else if(updateBloomMode(mode))appearanceUserEdited();
  };
  const changeLabMode=(next:LabMode)=>{
    if(next===labMode)return;
    begin();setLabMode(next);
  };
  const storeMarker=async()=>{
    if(!user?.uid)return;
    if(labMode!=='live'){
      setMarkerError('Chuyển sang “Theo theme thực của tài khoản” để kiểm tra cold start. Sandbox tự đặt lại khi mở màn hình.');
      return;
    }
    if(!['ready-local','ready-cloud','ready-default','offline-default'].includes(hydrate.phase)){
      setMarkerError('Appearance chưa khôi phục xong; chưa thể lưu mốc.');return;
    }
    const data:Marker={palette:liveTheme.selection.palette,mode:liveTheme.selection.mode,font:liveTypography.font,scale:liveTypography.scale,
      createdAt:new Date().toISOString(),session:LAB_SESSION,testVersion:2,testMode:'live'};
    try {await waitForAppearanceLocalWrites();await AsyncStorage.setItem(TEST_MARKER_PREFIX+user.uid,JSON.stringify(data));setMarker(data);setMarkerError('Đã lưu mốc riêng trong máy. Đóng hẳn app rồi mở lại để so sánh.');}
    catch {setMarkerError('Không thể lưu mốc thử.');}
  };
  const refreshMeasurement=()=>{
    pendingRef.current=null;captureRef.current=false;
    const snapshot={rows:summarize(logsRef.current),latencies:[...latencyRef.current],capturedAt:new Date().toISOString()};
    setMeasure(snapshot);
    setSyncMetrics(getAppearanceSyncMetrics());
    setLastLatency(snapshot.latencies.length?round(snapshot.latencies[snapshot.latencies.length-1]):null);
  };
  const resetMeasurement=()=>{captureRef.current=false;logsRef.current={};latencyRef.current=[];pendingRef.current=null;setMeasure(null);setLastLatency(null);captureRef.current=true;};
  const copyReport=async()=>{
    const metrics=getAppearanceSyncMetrics();
    const payload={title:'Family Bloom · Appearance 3.0 Lab',compilerEnabledInAppConfigExpected:true,
      compilerTransformVerified:false,coldStartResult:coldStartResult.key,
      // Never export user email, uid or entered text.
      mode:labMode,theme:labMode==='sandbox'?sandbox.palette:liveTheme.selection.palette,
      font:labMode==='sandbox'?sandbox.font:liveTypography.font,scale:labMode==='sandbox'?sandbox.scale:liveTypography.scale,
      hydration:hydrate,baseline:marker?{palette:marker.palette,mode:marker.mode,font:marker.font,scale:marker.scale,
        createdAt:marker.createdAt,testMode:marker.testMode??'legacy'}:null,
      profiler:measure?.rows??summarize(logsRef.current),commitLatencyMs:(measure?.latencies??latencyRef.current).map(round),
      appearanceFirebase:{reads:metrics.cloudReads,writes:metrics.cloudWrites,cacheHits:metrics.cacheHits,cacheMisses:metrics.cacheMisses}};
    await Clipboard.setStringAsync(JSON.stringify(payload,null,2));setMarkerError('Đã sao chép báo cáo (không có UID, email hoặc nội dung Input).');
  };
  const loading=hydrate.phase==='reading-local'||hydrate.phase==='reading-cloud';
  const coldStartResult=evaluateColdStart(marker,LAB_SESSION,{
    palette:liveTheme.selection.palette,mode:liveTheme.selection.mode,
    font:liveTypography.font,scale:liveTypography.scale,
  },hydrate);
  const baselineStatus=coldStartResult.label;
  if(!authorized)return <View style={{flex:1,padding:20}}><Text>Chỉ tài khoản developer đã xác minh được mở Appearance Lab.</Text></View>;
  const currentPalette=labMode==='sandbox'?sandbox.palette:liveTheme.selection.palette;
  const currentFont=labMode==='sandbox'?sandbox.font:liveTypography.font;
  const currentScale=labMode==='sandbox'?sandbox.scale:liveTypography.scale;
  const currentMode=labMode==='sandbox'?sandbox.mode:liveTheme.selection.mode;
  return <View style={{flex:1,backgroundColor:tokens.colors.background}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,paddingBottom:76,gap:16}}>
      <Pressable accessibilityRole="button" onPress={()=>router.back()}><A3Text tokens={tokens} strong>‹ Quay lại Dev Tools</A3Text></Pressable>
      <A3Text tokens={tokens} role="headline" strong>Appearance 3.0 · Dev Lab</A3Text>
      <A3Text tokens={tokens} muted>Lab chạy với React Compiler ON, dùng token reactive trực tiếp. Không dùng Proxy hay BloomText. Mặc định chỉ thử trên màn Lab, không đổi cài đặt tài khoản.</A3Text>
      <A3Card tokens={tokens}>
        <A3Text tokens={tokens} role="title" strong>A/B · Compiler ON so với OFF trong cùng APK</A3Text>
        <A3Text tokens={tokens} muted>So sánh hai cây component độc lập với cùng dữ liệu và cùng 100 bước cập nhật mỗi nhánh. Không cần build lại để chuyển A/B.</A3Text>
        <A3Button tokens={tokens} label="Mở Appearance 3.0 A/B Lab" onPress={()=>router.push('/(internal)/appearance3-ab-lab' as never)}/>
      </A3Card>
      <A3Card tokens={tokens}>
        <A3Text tokens={tokens} role="title" strong>Component ứng dụng thật · Core Preview</A3Text>
        <A3Text tokens={tokens} muted>Khác A/B sandbox: màn này dùng chính BloomText, BloomCard, BloomTextInput, BloomButton, BloomConfirmModal và BloomHeroHeader đang phục vụ ứng dụng. Chỉ hiển thị theme LIVE.</A3Text>
        <A3Button tokens={tokens} label="Mở Preview Appearance 3.0 Core" onPress={()=>router.push('/(internal)/appearance3-core-preview' as never)}/>
      </A3Card>
      <A3Card tokens={tokens}>
        <A3Text tokens={tokens} role="title" strong>1 · Chế độ thử</A3Text>
        <A3Button tokens={tokens} kind={labMode==='sandbox'?'solid':'outline'} label="Mô phỏng riêng · Không ghi Firebase" onPress={()=>changeLabMode('sandbox')}/>
        <A3Button tokens={tokens} kind={labMode==='live'?'solid':'outline'} label="Theo theme thực của tài khoản" onPress={()=>changeLabMode('live')}/>
        <A3Text tokens={tokens} muted>{labMode==='sandbox'?
          'Sandbox không lưu lựa chọn qua lần mở lại; nếu sandbox về Rose thì KHÔNG phải lỗi cache UID. Để test mở lại, hãy chuyển sang theme thật.':
          'Thay đổi ở chế độ này được lưu Local-First cho UID và có thể đồng bộ Firebase khi người dùng chủ động thay đổi.'}</A3Text>
      </A3Card>
      <A3Card tokens={tokens}>
        <A3Text tokens={tokens} role="title" strong>2 · Theme và chữ</A3Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
          {BLOOM_PALETTE_IDS.map(id=><View key={id} style={{width:'47%',flexGrow:1}}><A3Button tokens={tokens} kind={currentPalette===id?'solid':'outline'} label={BLOOM_PALETTE_LABELS[id]} onPress={()=>onSelectPalette(id)}/></View>)}
        </View>
        <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
          {(['light','dark','system'] as const).map(id=><View key={id} style={{flexGrow:1}}><A3Button tokens={tokens} kind={currentMode===id?'solid':'outline'} label={id==='light'?'Sáng':id==='dark'?'Tối':'Hệ thống'} onPress={()=>onSetMode(id)}/></View>)}
        </View>
        <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>
          {FONTS.map(id=><View key={id} style={{minWidth:'29%',flexGrow:1}}><A3Button tokens={tokens} kind={currentFont===id?'solid':'outline'} label={id} onPress={()=>onSetFont(id)}/></View>)}
        </View>
        <A3Text tokens={tokens} strong>Cỡ chữ: {currentScale}%</A3Text>
        <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
          {[90,100,120,140,160].map(value=><View key={value} style={{flexGrow:1}}><A3Button tokens={tokens} kind={currentScale===value?'solid':'outline'} label={`${value}%`} onPress={()=>onSetScale(value)}/></View>)}
        </View>
      </A3Card>
      <Profiler id="card" onRender={onRender}>
        <A3Card tokens={tokens}>
          <Profiler id="text" onRender={onRender}>
            <View style={{gap:8}}>
              <A3Text tokens={tokens} role="title" strong>3 · Card cha và chữ con</A3Text>
              <A3Text tokens={tokens}>Chúng ta cùng giữ những khoảnh khắc đẹp của gia đình. Chữ phải xuống dòng đầy đủ ở 160%.</A3Text>
              <A3Text tokens={tokens} role="caption" muted>Màu nền, viền và chữ dùng chung snapshot Appearance 3.0.</A3Text>
            </View>
          </Profiler>
          <Profiler id="input" onRender={onRender}>
            <A3Input tokens={tokens} value={input} onChangeText={value=>{begin();setInput(value);}}/>
          </Profiler>
          <Profiler id="button" onRender={onRender}>
            <A3Button tokens={tokens} label={`Nút thử nghiệm · Đã bấm ${presses}`} onPress={()=>{begin();setPresses(value=>value+1);}}/>
          </Profiler>
          <A3Button tokens={tokens} kind="outline" label="Mở Modal" onPress={()=>{begin();setModal(true);}}/>
        </A3Card>
      </Profiler>
      <Profiler id="modal" onRender={onRender}><A3Modal tokens={tokens} visible={modal} onClose={()=>{begin();setModal(false);}}/></Profiler>
      <A3Card tokens={tokens}>
        <A3Text tokens={tokens} role="title" strong>4 · Đóng/mở app và kiểm tra cache</A3Text>
        <A3Text tokens={tokens}>Trạng thái khôi phục: {hydrate.phase} · nguồn {hydrate.source} · {hydrate.elapsedMs} ms</A3Text>
        <A3Text tokens={tokens} muted>Appearance thực: {liveTheme.selection.palette}/{liveTheme.selection.mode}, {liveTypography.font}, {liveTypography.scale}%</A3Text>
        <A3Text tokens={liveTokens} strong>{markerLoading?'Đang đọc mốc thử…':baselineStatus}</A3Text>
        <A3Card tokens={liveTokens}>
          <A3Text tokens={liveTokens} role="caption" strong>Preview LIVE (không phải sandbox) sau khôi phục</A3Text>
          <A3Text tokens={liveTokens}>Cả nhà mình cùng nở hoa · màu, font và cỡ chữ từ UID</A3Text>
          <A3Button tokens={liveTokens} label="Nút theo Appearance thật" onPress={()=>setMarkerError('Preview LIVE đã nhận thao tác, không thay đổi Appearance.')}/>
        </A3Card>
        {marker&&<A3Text tokens={tokens} muted>Mốc lưu: {marker.palette}/{marker.mode}, {marker.font}, {marker.scale}% · {marker.createdAt}</A3Text>}
        <A3Button tokens={tokens} kind="outline" disabled={labMode!=='live'||loading}
          label="Lưu mốc LIVE trước khi đóng/mở lại" onPress={()=>void storeMarker()}/>
        <A3Text tokens={tokens} role="caption" muted>Chỉ lưu mốc kiểm thử riêng trong AsyncStorage, không ghi Firebase vì hành động lưu mốc. Sau khi đóng hẳn app, mở lại Lab và xem kết quả PASS/FAIL. Mốc trong cùng phiên chỉ báo “chưa mở lại”.</A3Text>
      </A3Card>
      <A3Card tokens={tokens}>
        <A3Text tokens={tokens} role="title" strong>5 · Đo phản hồi và render</A3Text>
        <A3Text tokens={tokens} muted>React Profiler đo thời gian render JS (khi build hỗ trợ Profiler). Độ trễ thao tác → useLayoutEffect chỉ là số đo JS, không phải FPS hoặc thời điểm vẽ native.</A3Text>
        <A3Button tokens={tokens} label="Chụp số đo hiện tại" onPress={refreshMeasurement}/>
        <A3Button tokens={tokens} kind="outline" label="Đặt lại bộ đếm" onPress={resetMeasurement}/>
        <A3Button tokens={tokens} kind="outline" label="Sao chép báo cáo không chứa dữ liệu cá nhân" onPress={()=>void copyReport()}/>
        {measure&&<>
          <A3Text tokens={tokens} muted>Độ trễ JS lần cuối: {lastLatency??'—'} ms · {measure.latencies.length} tương tác đã đo</A3Text>
          {Object.entries(measure.rows).map(([id,value])=><A3Text key={id} tokens={tokens} role="caption">{id}: {value.commits} commits · TB {value.meanRenderMs} ms · P95 {value.p95RenderMs} ms</A3Text>)}
          {Object.keys(measure.rows).length===0&&<A3Text tokens={tokens} muted>Không có Profiler callback. Hãy thử bản Dev có profiling; không được coi đây là 0 render.</A3Text>}
        </>}
        <A3Text tokens={tokens} muted>Firebase Appearance của phiên tại lần chụp số đo: {syncMetrics.cloudReads} lần đọc, {syncMetrics.cloudWrites} lần ghi. Không có listener Firebase riêng của Lab.</A3Text>
      </A3Card>
      {!!markerError&&<A3Card tokens={tokens}><A3Text tokens={tokens}>{markerError}</A3Text></A3Card>}
    </ScrollView>
  </View>;
}
