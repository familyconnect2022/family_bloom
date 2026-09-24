import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { COLORS } from "@/constants/theme";
import { BloomButton } from "@/components/ui/BloomButtonComponents";
import { useBloomToast } from "@/components/ui/BloomToast";
import { parseAppError } from "@/constants/errorConstants";
import { familyJoinService } from "@/services/family/familyJoinService";
import { useAuth } from "@/context/AuthContext";

type Props = { visible: boolean; onSubmitted: () => void };

/** Modal bắt buộc sau khi profile đã sẵn sàng nhưng user chưa thuộc family nào. */
export function JoinFamilyModal({ visible, onSubmitted }: Props) {
  const { user, userProfile, refreshProfile, dismissWelcome } = useAuth();
  const { showToast } = useBloomToast();
  const [familyId, setFamilyId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Khi đổi tài khoản hoặc modal đóng, reset về bước nhập Family ID.
  useEffect(() => { if (!visible) setSubmitted(false); }, [visible, user?.uid]);

  /** Gửi yêu cầu vào family; chưa được admin duyệt thì chưa trở thành member. */
  const handleSubmit = async () => {
    if (!user || !userProfile) return;
    if (!familyId.trim()) {
      showToast({ ...parseAppError({ code: "FAMILY_ID_REQUIRED" }), duration: 3000 });
      return;
    }
    setLoading(true);
    try {
      await familyJoinService.requestToJoin(user.uid, familyId, userProfile, message);
      showToast({ message: "Đã gửi yêu cầu. Chờ admin gia đình duyệt nhé 🌸", duration: 3500 });
      setFamilyId(""); setMessage(""); setSubmitted(true); onSubmitted();
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3500 });
    } finally { setLoading(false); }
  };

  return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.icon}><Text style={styles.emoji}>{submitted ? "⏳" : "🏡"}</Text></View>
        <Text style={styles.title}>{submitted ? "Đang chờ admin duyệt" : "Tìm tổ ấm của bạn"}</Text>
        {submitted ? <>
          <Text style={styles.body}>Yêu cầu đã được gửi. Admin gia đình sẽ xem hồ sơ của bạn trước khi cho bạn vào nhà.</Text>
          <BloomButton title={loading ? "Đang kiểm tra…" : "Kiểm tra trạng thái"} onPress={async () => { setLoading(true); try { await refreshProfile(); dismissWelcome(); } finally { setLoading(false); } }} disabled={loading} customStyle={styles.button} />
        </> : <>
        <Text style={styles.body}>Nhập Family ID do admin gia đình cung cấp. Sau đó admin sẽ xem hồ sơ và duyệt bạn vào nhà.</Text>
        <Text style={styles.label}>Family ID</Text>
        <TextInput value={familyId} onChangeText={setFamilyId} autoCapitalize="none" placeholder="Mã nhà của bạn 🌸" style={styles.input} />
        <Text style={styles.label}>Lời nhắn cho admin (không bắt buộc)</Text>
        <TextInput value={message} onChangeText={setMessage} placeholder="Ví dụ: Mình là con của cô Lan…" multiline style={[styles.input, styles.message]} />
        <BloomButton title={loading ? "Đang gửi…" : "Gửi yêu cầu gia nhập"} onPress={handleSubmit} disabled={loading} customStyle={styles.button} />
        {loading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} />}
        </>}
      </View>
    </View>
  </Modal>;
}
const styles=StyleSheet.create({backdrop:{flex:1,backgroundColor:"rgba(0,0,0,.38)",justifyContent:"center",padding:20},card:{backgroundColor:COLORS.white,borderRadius:28,padding:24},icon:{alignSelf:"center",width:64,height:64,borderRadius:32,backgroundColor:COLORS.accentBg,alignItems:"center",justifyContent:"center",marginBottom:12},emoji:{fontSize:30},title:{fontSize:23,fontWeight:"800",color:COLORS.primaryText,textAlign:"center"},body:{fontSize:14,lineHeight:21,color:COLORS.secondaryText,textAlign:"center",marginTop:8,marginBottom:18},label:{fontSize:13,fontWeight:"700",color:COLORS.primaryText,marginBottom:6,marginTop:8},input:{borderWidth:1,borderColor:COLORS.border,borderRadius:15,paddingHorizontal:15,paddingVertical:12,fontSize:15,color:COLORS.primaryText,backgroundColor:COLORS.softSurface},message:{minHeight:80,textAlignVertical:"top"},button:{width:"100%",marginTop:18}});
