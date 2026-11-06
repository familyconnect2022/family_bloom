/** Family Bloom · Appearance 3.0 same-APK A/B benchmark.
 * Compiler stays enabled at build time. The ON and OFF arms differ ONLY in
 * per-function compiler directives and names. Never reads/writes Firebase.
 * Timings measure JS action -> React layout-effect; not native FPS / energy.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ProfilerOnRenderCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { isPerformanceTestAccount, isVerifiedDeveloperAccount } from '../../constants/performanceTest';
import { BLOOM_PALETTE_IDS, type BloomPaletteId } from '../../theme/palette';
import { type BloomFontStyle } from '../../theme/livingAppearance';
import { getAppearanceSyncMetrics } from '../../theme/appearanceCloudSync';
import { makeA3SandboxColors, makeA3Tokens, makeA3Typography } from '../../appearance3/useAppearance3';
import { A3Button, A3Card, A3Text } from '../../appearance3/labComponents';
import { CompiledScenario } from '../../appearance3/ab/CompiledScenario';
import { UncompiledScenario } from '../../appearance3/ab/UncompiledScenario';
import { ABBA_ROUNDS, MEASURED_PER_ROUND, WARMUP_STEPS, metric, type ABArm, type ABProfile, type ABStep } from '../../appearance3/ab/types';

const FONTS: readonly BloomFontStyle[] = ['modern','rounded','cute','clear','classic'];
const SCALES = [90,100,120,140,160] as const;
const TOTAL_PER_ARM = MEASURED_PER_ROUND*2;
const now=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?performance.now():Date.now();
const r=(n:number)=>Math.round(n*10)/10;
const blankProfiles=():Record<string,ABProfile>=>({});
type Frame = { arm:ABArm; round:number; index:number; serial:number };
type Manual = { palette:BloomPaletteId; mode:'light'|'dark'; font:BloomFontStyle; scale:number; text:string; presses:number; modal:boolean; serial:number };
type Run = {
  round:number; index:number; serial:number; startedAt:number; lastCommittedSerial:number;
  raf:number|null; cancelled:boolean; latencies:Record<ABArm,number[]>;
  profiles:Record<string,ABProfile>; startedAtIso:string;
  beforeCloud:{reads:number;writes:number};
};
type Result = {
  sequence:'ABBA'; perArm:number; warmupPerRound:number; startedAt:string; endedAt:string;
  latency:Record<ABArm,number[]>; profile:Record<string,ABProfile>;
  cloudDelta:{reads:number;writes:number};
};
function deterministicStep(index:number):Manual {
  const indexSafe=Math.max(0,index);
  return {palette:BLOOM_PALETTE_IDS[indexSafe%4] as BloomPaletteId,
    mode:indexSafe%3===0?'dark':'light',font:FONTS[Math.floor(indexSafe/5)%FONTS.length],
    scale:SCALES[Math.floor(indexSafe/3)%SCALES.length],text:`Gia đình Bloom · thử nghiệm số ${indexSafe}`,
    presses:indexSafe,modal:indexSafe%12===5,serial:indexSafe};
}
function summary(result:Result|null) {
  if(!result)return null;
  const render=(arm:ABArm,area:string)=>metric(result.profile[`${arm}.${area}`]?.samples??[]);
  return {on:metric(result.latency.on),off:metric(result.latency.off),render};
}
export default function Appearance3ABLab() {
  const router=useRouter();
  const {user}=useAuth();
  const authorized=isPerformanceTestAccount(user?.email)&&isVerifiedDeveloperAccount(user);
  const [arm,setArm]=useState<ABArm>('on');
  const [manual,setManual]=useState<Manual>(()=>({...deterministicStep(1),palette:'rose',mode:'light',font:'modern',scale:100,text:'Cả nhà mình cùng nở hoa 🌸',modal:false,presses:0,serial:0}));
  const [frame,setFrame]=useState<Frame|null>(null);
  const [result,setResult]=useState<Result|null>(null);
  const [runPhase,setRunPhase]=useState<'idle'|'running'|'finished'|'cancelled'>('idle');
  const [notice,setNotice]=useState('');
  const runRef=useRef<Run|null>(null);
  const activeArm=frame?.arm??arm;
  const sample=frame?deterministicStep(frame.index):manual;
  // A single source of explicit immutable tokens for BOTH arms at every step.
  const tokens=useMemo(()=>makeA3Tokens(makeA3SandboxColors(sample.palette,sample.mode),
    makeA3Typography(sample.font,sample.scale)),[sample.palette,sample.mode,sample.font,sample.scale]);
  const step:ABStep=useMemo(()=>({seq:frame?.serial??manual.serial,value:sample.text,
    presses:sample.presses,modalVisible:sample.modal}),[frame?.serial,manual.serial,sample.text,sample.presses,sample.modal]);
  const running=frame!==null;
  const onRender=useCallback<ProfilerOnRenderCallback>((id,_phase,actualDuration)=>{
    const run=runRef.current;
    if(!run||run.cancelled||run.index<WARMUP_STEPS)return;
    if(!id.startsWith(run.round===0||run.round===3?'on.':'off.'))return;
    const profile=run.profiles[id]??{samples:[],commits:0};
    profile.commits++;
    if(Number.isFinite(actualDuration))profile.samples.push(actualDuration);
    run.profiles[id]=profile;
  },[]);
  const onCommit=useCallback((committedArm:ABArm,serial:number)=>{
    const run=runRef.current;
    if(!run||run.cancelled||serial!==run.serial||serial===run.lastCommittedSerial||ABBA_ROUNDS[run.round]!==committedArm)return;
    run.lastCommittedSerial=serial;
    if(run.index>=WARMUP_STEPS){
      run.latencies[committedArm].push(Math.max(0,now()-run.startedAt));
    }
    // Advance only when user explicitly started the benchmark. The next frame
    // yields between commits; there are no background timers or Metro logs.
    run.raf=requestAnimationFrame(()=>{
      run.raf=null;
      if(run.cancelled||runRef.current!==run)return;
      const total=WARMUP_STEPS+MEASURED_PER_ROUND;
      if(run.index+1<total){
        run.index++;
        run.serial++;
        run.startedAt=now();
        setFrame({arm:ABBA_ROUNDS[run.round],round:run.round,index:run.index,serial:run.serial});
        return;
      }
      if(run.round+1<ABBA_ROUNDS.length){
        run.round++;
        run.index=0;
        run.serial++;
        run.startedAt=now();
        setFrame({arm:ABBA_ROUNDS[run.round],round:run.round,index:0,serial:run.serial});
        return;
      }
      const cloud=getAppearanceSyncMetrics();
      const ended:Result={sequence:'ABBA',perArm:TOTAL_PER_ARM,warmupPerRound:WARMUP_STEPS,
        startedAt:run.startedAtIso,endedAt:new Date().toISOString(),latency:run.latencies,
        profile:run.profiles,cloudDelta:{reads:cloud.cloudReads-run.beforeCloud.reads,writes:cloud.cloudWrites-run.beforeCloud.writes}};
      runRef.current=null;
      setFrame(null);
      setResult(ended);
      setRunPhase('finished');
    });
  },[]);
  useEffect(()=>()=>{
    const run=runRef.current;
    if(run){run.cancelled=true;if(run.raf!==null)cancelAnimationFrame(run.raf);runRef.current=null;}
  },[]);
  const start=()=>{
    if(runRef.current)return;
    const cloud=getAppearanceSyncMetrics();
    const run:Run={round:0,index:0,serial:1,lastCommittedSerial:-1,startedAt:now(),raf:null,cancelled:false,
      latencies:{on:[],off:[]},profiles:blankProfiles(),startedAtIso:new Date().toISOString(),
      beforeCloud:{reads:cloud.cloudReads,writes:cloud.cloudWrites}};
    runRef.current=run;
    setNotice('');setResult(null);setRunPhase('running');
    setFrame({arm:'on',round:0,index:0,serial:1});
  };
  const cancel=()=>{
    const run=runRef.current;
    if(!run)return;
    run.cancelled=true;
    if(run.raf!==null)cancelAnimationFrame(run.raf);
    runRef.current=null;
    setFrame(null);setRunPhase('cancelled');setNotice('Đã dừng phép đo; kết quả chưa hoàn chỉnh không được dùng để so sánh.');
  };
  const setManualOption=(patch:Partial<Manual>)=>{
    if(runRef.current)return;
    setManual(prev=>({...prev,...patch,serial:prev.serial+1}));
  };
  const changeArm=(next:ABArm)=>{if(runRef.current)return;setArm(next);};
  const onText=useCallback((value:string)=>{if(runRef.current)return;setManual(prev=>({...prev,text:value,serial:prev.serial+1}));},[]);
  const onPress=useCallback(()=>{if(runRef.current)return;setManual(prev=>({...prev,presses:prev.presses+1,serial:prev.serial+1}));},[]);
  const onOpen=useCallback(()=>{if(runRef.current)return;setManual(prev=>({...prev,modal:true,serial:prev.serial+1}));},[]);
  const onClose=useCallback(()=>{if(runRef.current)return;setManual(prev=>({...prev,modal:false,serial:prev.serial+1}));},[]);
  const stats=summary(result);
  const copy=async()=>{
    if(!result||!stats)return;
    const report={title:'Family Bloom Appearance 3.0 · Same APK A/B',method:'ABBA 4 rounds · 50 measured updates each · 8 warmups/round',
      build:{reactCompilerConfigExpected:true,compiledArmDirective:'use memo',uncompiledArmDirective:'use no memo',
        compilerTransformVerifiedInThisEnvironment:false, note:'Compiler ON/OFF here means per-function directives, not two whole-app builds.'},
      timings:{metric:'JS update scheduled -> React useLayoutEffect',nativeFPS:false,profiler:'React Profiler callback when supported',
        on:stats.on,off:stats.off,byComponent:Object.fromEntries(['card','text','input','button','modal'].map(id=>[id,{on:stats.render('on',id),off:stats.render('off',id)}]))},
      counts:{on:result.latency.on.length,off:result.latency.off.length},
      cloudAppearanceDelta:result.cloudDelta,startedAt:result.startedAt,endedAt:result.endedAt,
      rawLatencyMs:result.latency};
    try{await Clipboard.setStringAsync(JSON.stringify(report,null,2));setNotice('Đã sao chép báo cáo A/B (không chứa UID, email hoặc nội dung Input).');}
    catch{setNotice('Không thể sao chép báo cáo.');}
  };
  if(!authorized)return <View style={{flex:1,padding:20}}><Text>Chỉ tài khoản developer đã xác minh được mở A/B Lab.</Text></View>;
  const button=(label:string,action:()=>void,selected=false,disabled=false)=><View style={{flexGrow:1,minWidth:'29%'}} key={label}>
    <A3Button tokens={tokens} label={label} kind={selected?'solid':'outline'} disabled={disabled} onPress={action}/>
  </View>;
  const f=(value:number|null)=>value===null?'—':`${value.toFixed(1)} ms`;
  return <View style={{flex:1,backgroundColor:tokens.colors.background}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:16,paddingBottom:76,gap:14}}>
      <Pressable accessibilityRole="button" onPress={()=>router.back()}><A3Text tokens={tokens}>‹ Quay lại Appearance 3.0 Lab</A3Text></Pressable>
      <A3Text tokens={tokens} role="headline" strong>Appearance 3.0 · A/B cùng APK</A3Text>
      <A3Text tokens={tokens} muted>Hai phiên bản Card/Text/Input/Button/Modal giống nhau. A dùng “use memo”; B dùng “use no memo”. Chỉ thay đổi bên trong Lab, không ghi Firebase.</A3Text>
      <A3Card tokens={tokens}>
        <A3Text tokens={tokens} role="title" strong>1 · Chọn nhánh để thử tay</A3Text>
        <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
          {button('A · Compiler ON',()=>changeArm('on'),activeArm==='on',running)}
          {button('B · Compiler OFF',()=>changeArm('off'),activeArm==='off',running)}
        </View>
        <A3Text tokens={tokens} muted>Đây là hai nhánh biên dịch trong cùng APK; không thay đổi Compiler toàn app khi bấm.</A3Text>
        <A3Text tokens={tokens} muted>A/B này chỉ là SANDBOX: khi đóng/mở lại, lựa chọn A/B, màu và font thử sẽ được đặt lại. Đây KHÔNG phải lỗi cache tài khoản. Để kiểm tra cold start, quay lại Appearance 3.0 Lab → chọn “Theo theme thực của tài khoản” → lưu mốc LIVE.</A3Text>
        <A3Text tokens={tokens} strong>Màu thử</A3Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
          {BLOOM_PALETTE_IDS.map(id=>button(id,()=>setManualOption({palette:id}),sample.palette===id,running))}
        </View>
        <A3Text tokens={tokens} strong>Font và cỡ chữ</A3Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
          {FONTS.map(font=>button(font,()=>setManualOption({font}),sample.font===font,running))}
        </View>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
          {SCALES.map(scale=>button(`${scale}%`,()=>setManualOption({scale}),sample.scale===scale,running))}
        </View>
        <View style={{flexDirection:'row',gap:7}}>
          {button('Sáng',()=>setManualOption({mode:'light'}),sample.mode==='light',running)}
          {button('Tối',()=>setManualOption({mode:'dark'}),sample.mode==='dark',running)}
        </View>
      </A3Card>
      {activeArm==='on'?
        <CompiledScenario key={`a-${frame?.round??'manual'}`} tokens={tokens} step={step} onCommit={onCommit} onRender={onRender}
          onText={onText} onPress={onPress} onOpen={onOpen} onClose={onClose}/>:
        <UncompiledScenario key={`b-${frame?.round??'manual'}`} tokens={tokens} step={step} onCommit={onCommit} onRender={onRender}
          onText={onText} onPress={onPress} onOpen={onOpen} onClose={onClose}/>}
      <A3Card tokens={tokens}>
        <A3Text tokens={tokens} role="title" strong>2 · Đo tự động A/B</A3Text>
        <A3Text tokens={tokens}>ABBA: ON → OFF → OFF → ON. Mỗi lượt 8 bước làm nóng và 50 lần cập nhật; tổng cộng 100 mẫu mỗi nhánh.</A3Text>
        <A3Text tokens={tokens} muted>Mỗi bước đổi token/nhãn/Input; có bước bật Modal. Lần mount và bước làm nóng bị loại khỏi độ trễ đo. Không dùng log Metro hay timer chạy nền.</A3Text>
        {running?<>
          <A3Text tokens={tokens} strong>Đang đo: {activeArm.toUpperCase()} · lượt {(frame?.round??0)+1}/4</A3Text>
          <A3Button tokens={tokens} label="Dừng đo" kind="outline" onPress={cancel}/>
        </>:<A3Button tokens={tokens} label="Chạy 100 thao tác mỗi nhánh (A/B)" onPress={start}/>}
        <A3Text tokens={tokens} muted>Trạng thái: {runPhase}. Phép đo JS → commit, không phải FPS native hay mức tiêu thụ pin.</A3Text>
        {stats&&<>
          <A3Text tokens={tokens} role="title" strong>3 · Kết quả so sánh</A3Text>
          <View style={{gap:6}}>
            <A3Text tokens={tokens}>A · ON: {stats.on.count} mẫu · TB {f(stats.on.meanMs)} · P95 {f(stats.on.p95Ms)}</A3Text>
            <A3Text tokens={tokens}>B · OFF: {stats.off.count} mẫu · TB {f(stats.off.meanMs)} · P95 {f(stats.off.p95Ms)}</A3Text>
            {(['card','text','input','button','modal'] as const).map(id=><A3Text key={id} tokens={tokens} role="caption">
              {id}: P95 A {f(stats.render('on',id).p95Ms)} / B {f(stats.render('off',id).p95Ms)}
            </A3Text>)}
            <A3Text tokens={tokens} muted>Thời gian Profiler có thể không có trong Release không hỗ trợ profiling; “—” không có nghĩa 0 ms. Không cộng thời gian các component lồng nhau.</A3Text>
            <A3Text tokens={tokens} muted>Firebase Appearance trong lúc chạy: Δ {result?.cloudDelta.reads} read · Δ {result?.cloudDelta.writes} write (kỳ vọng 0/0).</A3Text>
          </View>
          <A3Button tokens={tokens} kind="outline" label="Sao chép báo cáo A/B" onPress={()=>void copy()}/>
        </>}
        {!!notice&&<A3Text tokens={tokens} muted>{notice}</A3Text>}
      </A3Card>
      <A3Text tokens={tokens} role="caption" muted>Phép thử chỉ dùng token sandbox. Sau khi build cần đối chiếu bundle hoặc React DevTools để xác nhận nhánh A thật sự được tối ưu. Không kết luận hiệu năng toàn app chỉ từ màn Lab.</A3Text>
    </ScrollView>
  </View>;
}
