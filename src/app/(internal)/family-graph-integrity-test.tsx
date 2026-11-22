import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../components/ui/BloomText';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { BloomHeroHeader } from '../../components/ui/BloomHeroHeader';
import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { COLORS, getBloomStatusBarStyle } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { isPerformanceTestAccount, isVerifiedDeveloperAccount } from '../../constants/performanceTest';
import { auditFamilyGraph, type GraphIntegrityReport } from '../../services/familyGraph/familyGraphIntegrity';
import { familyGraphRepository } from '../../services/familyGraph/familyGraphRepository';
import { createSyntheticFamilyGraph } from '../../services/performance/syntheticFamilyGraph';
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


type Result = { kind: string; elapsedMs: number; report: GraphIntegrityReport; personLabels: Record<string,string> };

/** Developer only: explicit button -> one-shot read -> local analysis. NEVER writes Firestore. */
export default function FamilyGraphIntegrityTestScreen() {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  const {user, activeFamilyId} = useAuth();
  const allowed = isPerformanceTestAccount(user?.email) && isVerifiedDeveloperAccount(user);
  const [busy,setBusy] = useState(false);
  const [result,setResult] = useState<Result | null>(null);
  const [error,setError] = useState('');
  const run = async (kind:'synthetic'|'actual'|'fault',count = 300) => {
    if (busy || !allowed) return;
    setBusy(true);setError('');setResult(null);
    try {
      const data = kind === 'synthetic' || kind === 'fault' ? createSyntheticFamilyGraph(kind==='fault'?100:count) : await (async()=>{
        if (!activeFamilyId) throw new Error('Hãy chọn gia đình trước khi kiểm tra.');
        // No persistent listener. Reads happen only on a button press.
        const [persons,relationships] = await Promise.all([
          familyGraphRepository.listPersons(activeFamilyId),
          familyGraphRepository.listRelationships(activeFamilyId),
        ]);
        return { familyId: activeFamilyId, persons, relationships };
      })();
      if (kind === 'fault') {
        // Synthetic data-only fixture: one inverted biological parent, one ancestry
        // loop. Never writes to or alters the real family in Firebase.
        const a = data.persons[0], b = data.persons[data.persons.length - 1];
        data.relationships.push({
          id:'synthetic-fault-1',familyId:data.familyId,type:'parent_child',
          personAId:b.id,personBId:a.id,subtype:'biological',partnerStatus:null,
          startDate:null,endDate:null,createdByUid:'dev-fixture',createdAt:'',updatedAt:'',
        });
      }
      const started = globalThis.performance?.now?.() ?? Date.now();
      const report = auditFamilyGraph(data);
      const elapsedMs = Math.round(((globalThis.performance?.now?.() ?? Date.now()) - started) * 10) / 10;
      setResult({kind:kind==='actual'?'Gia phả thật (chỉ đọc)':kind==='fault'?'Dữ liệu lỗi mẫu · 100 người':`Dữ liệu giả · ${count} người`,elapsedMs,report,
        personLabels:Object.fromEntries(data.persons.map(p=>[p.id,p.displayName]))});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };
  const copy = async () => {
    if (!result) return;
    // Deliberately omit names, UID, familyId, personId, raw relationships and private data.
    await Clipboard.setStringAsync(JSON.stringify({kind:result.kind,ms:result.elapsedMs,
      persons:result.report.persons,relationships:result.report.relationships,
      blocks:result.report.blocks,warnings:result.report.warnings,
      truncated:result.report.truncated,
      codes:result.report.issues.reduce<Record<string,number>>((a,i)=>{a[i.code]=(a[i.code]??0)+1;return a;},{})},null,2));
  };
  if (!allowed) return <ScreenContainer><View style={__a3_styles.center}><Text style={__a3_styles.body}>Chỉ tài khoản developer đã xác minh được mở công cụ này.</Text><Pressable onPress={()=>router.replace('/settings' as never)}><Text style={__a3_styles.link}>Quay lại</Text></Pressable></View></ScreenContainer>;
  return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
    <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')}/>
    <BloomHeroHeader eyebrow="DEVELOPER · GRAPH INTEGRITY" title="Kiểm tra tính hợp lý" subtitle="Chỉ chạy khi bấm. Không thay đổi bất kỳ hồ sơ hay quan hệ nào." variant="family" onBack={()=>router.back()} compact roundedBottom/>
    <ScrollView contentContainerStyle={__a3_styles.content} showsVerticalScrollIndicator={false}>
      <Text style={__a3_styles.head}>Kiểm thử trên dữ liệu giả</Text>
      <Text style={__a3_styles.body}>Không đọc/ghi Firebase. Đo thời gian chạy và kiểm tra cấu trúc theo số lượng người.</Text>
      <View style={__a3_styles.row}>
        {[100,300,500].map(count=><Pressable key={count} disabled={busy} style={__a3_styles.button} onPress={()=>void run('synthetic',count)}><Text style={__a3_styles.buttonText}>{count} người</Text></Pressable>)}
      </View>
      <Pressable disabled={busy} style={__a3_styles.button} onPress={()=>void run('fault')}><Ionicons name="warning-outline" size={17} color={__a3Colors.attention}/><Text style={__a3_styles.buttonText}>Ca lỗi mẫu: sai năm sinh và vòng lặp</Text></Pressable>
      <Text style={__a3_styles.head}>Kiểm tra gia phả thật (chỉ đọc)</Text>
      <Text style={__a3_styles.body}>Đọc danh sách người và quan hệ một lần, phân tích trên máy. Không tạo dữ liệu, không sửa Firestore Rules, không lưu kết quả lên Cloud.</Text>
      <Pressable disabled={busy || !activeFamilyId} style={[__a3_styles.button,(!activeFamilyId||busy)&&__a3_styles.disabled]} onPress={()=>void run('actual')}><Ionicons name="shield-checkmark-outline" size={17} color={__a3Colors.primary}/><Text style={__a3_styles.buttonText}>Quét gia phả đang chọn</Text></Pressable>
      {busy && <ActivityIndicator color={__a3Colors.primary}/>}
      {!!error && <Text style={__a3_styles.error}>{error}</Text>}
      {result && <View style={__a3_styles.report}>
        <Text style={__a3_styles.head}>{result.kind}</Text>
        <Text style={__a3_styles.body}>{result.report.persons} người · {result.report.relationships} quan hệ · xử lý {result.elapsedMs} ms (không tính mạng)</Text>
        <Text style={__a3_styles.block}>Chặn: {result.report.blocks}</Text>
        <Text style={__a3_styles.warn}>Cảnh báo: {result.report.warnings}</Text>
        {result.report.issues.length===0 && <Text style={__a3_styles.body}>Không phát hiện mâu thuẫn trong các quy tắc hiện được hỗ trợ.</Text>}
        {result.report.issues.map((issue,index)=><View key={`${issue.code}-${index}`} style={__a3_styles.issue}>
          <Text style={issue.severity==='block'?__a3_styles.block:__a3_styles.warn}>{issue.code} · {issue.severity==='block'?'Chặn':'Cảnh báo'}</Text>
          <Text style={__a3_styles.body}>{issue.message}</Text>
          <Text style={__a3_styles.meta}>{issue.personIds.map(id=>result.personLabels[id]??'[hồ sơ chưa có]').join(' · ')}</Text>
        </View>)}
        {result.report.truncated && <Text style={__a3_styles.warn}>Danh sách hiển thị đã giới hạn để tránh treo UI; bộ đếm vẫn phản ánh toàn bộ cảnh báo.</Text>}
        <Pressable style={__a3_styles.button} onPress={()=>void copy()}><Ionicons name="copy-outline" size={17} color={__a3Colors.primary}/><Text style={__a3_styles.buttonText}>Sao chép báo cáo đã ẩn dữ liệu riêng</Text></Pressable>
      </View>}
      <Text style={__a3_styles.note}>Mục này chỉ dành cho kiểm tra và đo tốc độ. Quyền ghi vẫn do Firebase Rules và dịch vụ ghi tin cậy quyết định; bộ phân tích tại thiết bị không thay thế kiểm tra máy chủ.</Text>
    </ScrollView>
  </ScreenContainer>;
}
const styles=createBloomStyles(()=>StyleSheet.create({
  content:{padding:16,paddingBottom:60,gap:12},center:{flex:1,justifyContent:'center',padding:20,gap:20},
  head:{fontSize:17,fontWeight:'800',color:COLORS.primaryText},
  body:{fontSize:13,lineHeight:20,color:COLORS.secondaryText},
  row:{flexDirection:'row',gap:8,flexWrap:'wrap'},
  button:{borderRadius:14,borderWidth:1,borderColor:COLORS.border,backgroundColor:COLORS.surface,padding:13,minHeight:48,flexDirection:'row',alignItems:'center',gap:8},
  buttonText:{fontSize:12,fontWeight:'800',color:COLORS.primary},
  disabled:{opacity:.4},error:{fontSize:13,color:COLORS.destructive},
  report:{backgroundColor:COLORS.surface,borderRadius:18,padding:14,gap:10,borderColor:COLORS.border,borderWidth:1},
  block:{fontSize:13,fontWeight:'800',color:COLORS.destructive},warn:{fontSize:13,fontWeight:'800',color:COLORS.attention},
  issue:{gap:4,paddingTop:10,borderTopWidth:1,borderTopColor:COLORS.border},
  meta:{fontSize:11,color:COLORS.secondaryText},
  link:{fontSize:14,color:COLORS.primary},note:{fontSize:11,lineHeight:17,color:COLORS.secondaryText,textAlign:'center'},
}));
