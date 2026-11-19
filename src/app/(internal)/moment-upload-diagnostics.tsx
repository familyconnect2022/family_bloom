import { getBloomStatusBarStyle } from "../../constants/theme";
import { useBloomThemeRevision , useBloomColorsRevision, useBloomTypographyRevision} from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../components/ui/BloomText';
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { BloomCard, BloomSectionHeader } from "../../components/ui/BloomPageComponents";
import { useBloomToast } from "../../components/ui/BloomToast";
import { COLORS } from "../../constants/theme";
import { isPerformanceTestAccount, isVerifiedDeveloperAccount } from "../../constants/performanceTest";
import { useAuth } from "../../context/AuthContext";
import {
  clearMomentUploadDiagnostic,
  formatMomentUploadDiagnosticReport,
  getLatestMomentUploadDiagnostic,
  type MomentUploadDiagnostic,
} from "../../services/media/momentUploadDiagnostic";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


function Detail({label, value}: {label:string;value:string}) {
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return <View style={__a3_styles.field}>
    <Text style={__a3_styles.fieldLabel}>{label}</Text>
    <Text selectable style={__a3_styles.fieldValue}>{value}</Text>
  </View>;
}

export default function MomentUploadDiagnosticsScreen() {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useBloomToast();
  const allowed = isPerformanceTestAccount(user?.email) && isVerifiedDeveloperAccount(user);
  const [diagnostic, setDiagnostic] = useState<MomentUploadDiagnostic | null>(() => getLatestMomentUploadDiagnostic());
  useEffect(() => { if (!allowed) router.replace("/settings" as never); }, [allowed, router]);
  if (!allowed) return null;

  const copy = async () => {
    if (!diagnostic) return;
    await Clipboard.setStringAsync(formatMomentUploadDiagnosticReport(diagnostic));
    showToast({ type: "success", title: "Đã sao chép báo cáo Moment", message: "Báo cáo đã được lọc token, chữ ký và ID media.", duration: 3500 });
  };
  const clear = () => {
    clearMomentUploadDiagnostic();
    setDiagnostic(null);
    showToast({ type: "success", title: "Đã xóa chẩn đoán trên máy", message: "Không xóa Moment hay tệp Cloudinary.", duration: 3000 });
  };

  return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
    <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
    <BloomHeroHeader eyebrow="PRIVATE · DEVELOPER" title="Lỗi upload Moment" subtitle="Đọc phản hồi Cloudinary thật · không chứa thông tin bí mật" variant="profile" onBack={() => router.back()} compact roundedBottom />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={__a3_styles.content}>
      <BloomCard style={__a3_styles.card}>
        <BloomSectionHeader title="Chẩn đoán gần nhất" subtitle="Chỉ lưu trong bộ nhớ cho tới khi đóng tiến trình ứng dụng" />
        {diagnostic ? <>
          <View style={__a3_styles.statusRow}><Ionicons name="alert-circle-outline" color={__a3Colors.destructive} size={20}/><Text style={__a3_styles.statusText}>{diagnostic.service} · HTTP {diagnostic.httpStatus ?? "Không có"}</Text></View>
          <Detail label="Thời điểm" value={new Date(diagnostic.at).toLocaleString("vi-VN")}/>
          <Detail label="Giai đoạn" value={diagnostic.phase === "upload" ? "Tải ảnh/video" : "Ghi Moment"}/>
          <Detail label="Mã lỗi" value={diagnostic.shortCode}/>
          <Detail label="Cloudinary error.message (đã lọc)" value={diagnostic.providerMessage}/>
          <Detail label="Cloudinary X-Cld-Error (đã lọc)" value={diagnostic.providerHeader}/>
          <Detail label="Cloud name đã dùng" value={diagnostic.cloudName}/>
          <Detail label="Resource / signed" value={`${diagnostic.resourceType} · ${diagnostic.signed === null ? "không xác định" : diagnostic.signed ? "signed" : "unsigned"}`}/>
          <Pressable style={__a3_styles.primaryButton} onPress={() => void copy()}>
            <Ionicons name="copy-outline" color={__a3Colors.white} size={18}/><Text style={__a3_styles.primaryText}>Sao chép báo cáo đã lọc</Text>
          </Pressable>
          <Pressable style={__a3_styles.secondaryButton} onPress={clear}>
            <Ionicons name="trash-outline" color={__a3Colors.primary} size={17}/><Text style={__a3_styles.secondaryText}>Xóa chẩn đoán trên máy</Text>
          </Pressable>
        </> : <Text style={__a3_styles.hint}>Chưa có lỗi upload trong phiên ứng dụng này. Hãy thử đăng một ảnh nhỏ, quay lại đây và bấm “Làm mới kết quả”. Không cần gửi khóa Cloudinary hoặc Firebase.</Text>}
        <Pressable style={__a3_styles.secondaryButton} onPress={() => setDiagnostic(getLatestMomentUploadDiagnostic())}>
          <Ionicons name="refresh-outline" color={__a3Colors.primary} size={17}/><Text style={__a3_styles.secondaryText}>Làm mới kết quả</Text>
        </Pressable>
      </BloomCard>
      <Text style={__a3_styles.note}>Màn hình này không gọi Cloudinary hoặc Vercel, không tải thêm ảnh, không ghi/xóa Firestore. Chỉ hiển thị phần phản hồi lỗi đã lọc từ lần upload gần nhất. Nếu API không trả error.message hoặc X-Cld-Error, mục tương ứng sẽ báo không có; không suy đoán nguyên nhân HTTP 403.</Text>
    </ScrollView>
  </ScreenContainer>;
}

const styles = createBloomStyles(() => StyleSheet.create({
  content:{padding:16,paddingBottom:54,gap:16},card:{padding:15,gap:12},
  field:{gap:4,borderTopWidth:1,borderTopColor:COLORS.border,paddingTop:10},
  fieldLabel:{fontSize:11,color:COLORS.secondaryText,fontWeight:"700"},
  fieldValue:{fontSize:12,color:COLORS.primaryText,lineHeight:19},
  statusRow:{flexDirection:"row",alignItems:"center",gap:8},
  statusText:{fontSize:14,fontWeight:"900",color:COLORS.destructive},
  hint:{fontSize:12,lineHeight:19,color:COLORS.secondaryText},
  primaryButton:{minHeight:48,flexDirection:"row",justifyContent:"center",alignItems:"center",gap:8,borderRadius:13,backgroundColor:COLORS.primary,padding:10},
  primaryText:{fontSize:13,color:COLORS.white,fontWeight:"900"},
  secondaryButton:{minHeight:44,flexDirection:"row",justifyContent:"center",alignItems:"center",gap:8,borderRadius:12,borderWidth:1,borderColor:COLORS.border,padding:9},
  secondaryText:{color:COLORS.primary,fontSize:12,fontWeight:"800"},
  note:{fontSize:11,lineHeight:17,color:COLORS.secondaryText,textAlign:"center",paddingHorizontal:12},
}));
