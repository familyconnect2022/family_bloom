import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { BloomKeyboardScreen } from "../layout/BloomKeyboardScreen";
import { BloomButton } from "../ui/BloomButtonComponents";
import { BloomTextInput } from "../ui/BloomInputComponents";
import { COLORS } from "../../constants/theme";
import { BLOOM_SUPPER } from "../../constants/bloomSupper";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { familyJoinService } from "../../services/family/familyJoinService";
import { useBloomToast } from "../ui/BloomToast";

/** Lời mời vào nhà xuất hiện khi hồ sơ đã sẵn sàng nhưng người dùng chưa thuộc gia đình nào. */
export function JoinFamilyModal({ visible, dismissWelcome }: { visible: boolean; dismissWelcome: () => void }) {
  const { user, userProfile, refreshProfile } = useAuth();
  const { showToast } = useBloomToast();
  const [familyId, setFamilyId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!user || !userProfile || loading) return;
    if (!familyId.trim()) {
      showToast({ type: "warning", title: "Mình còn thiếu mã nhà", message: "Nhập mã người thân gửi cho bạn rồi thử lại nhé." });
      return;
    }
    setLoading(true);
    try {
      await familyJoinService.requestToJoin(user.uid, familyId.trim(), userProfile, message);
      setSubmitted(true);
      showToast({ title: "Lời xin vào nhà đã được gửi 🌷", message: "Bloom sẽ báo khi người thân phản hồi." });
    } catch (error) {
      showToast({ type: "warning", title: "Chưa gửi được lời xin vào nhà", message: error instanceof Error ? error.message : "Chờ một chút rồi thử lại nhé." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <BloomKeyboardScreen rootStyle={styles.backdrop} contentContainerStyle={styles.keyboardContent}>
        <View style={styles.card}>
          <View style={styles.glow} />
          <View style={styles.icon}><Text style={styles.emoji}>{submitted ? "🌱" : "🏡"}</Text></View>
          <Text style={styles.eyebrow}>FAMILY BLOOM</Text>
          <Text style={styles.title}>{submitted ? "Bloom đang chờ cùng bạn" : "Tìm đúng ngôi nhà của mình"}</Text>
          {submitted ? (
            <>
              <Text style={styles.body}>Lời xin vào nhà đã đến người thân. Khi cánh cửa mở, Bloom sẽ đưa bạn vào ngay.</Text>
              <BloomButton title={loading ? "Bloom đang nhìn lại…" : "Xem nhà đã mở chưa"} onPress={async () => { setLoading(true); try { await refreshProfile(); dismissWelcome(); } finally { setLoading(false); } }} disabled={loading} customStyle={styles.button} />
            </>
          ) : (
            <>
              <Text style={styles.body}>Nhập mã nhà người thân gửi cho bạn. Một lời nhắn nhỏ sẽ giúp cả nhà nhận ra bạn nhanh hơn.</Text>
              <BloomTextInput label="Mã nhà" value={familyId} onChangeText={setFamilyId} autoCapitalize="none" autoCorrect={false} placeholder="Mã nhà của bạn 🌸" leftIcon="key-outline" />
              <BloomTextInput label="Lời nhắn (không bắt buộc)" value={message} onChangeText={setMessage} placeholder="Ví dụ: Mình là con của cô Lan…" multiline leftIcon="chatbubble-ellipses-outline" helperText="Chỉ cần một câu thân quen là đủ." />
              <BloomButton title={loading ? "Đang gửi lời…" : "Gửi lời xin vào nhà"} onPress={handleSubmit} disabled={loading} customStyle={styles.button} />
              {loading && <ActivityIndicator color={COLORS.primary} style={styles.loader} />}
            </>
          )}
        </View>
      </BloomKeyboardScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: BLOOM_SUPPER.modal.backdrop },
  keyboardContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 30 },
  card: { overflow: "hidden", backgroundColor: BLOOM_SUPPER.surface.card, borderRadius: BLOOM_SUPPER.radius.modal, padding: 24, borderWidth: 1, borderColor: BLOOM_SUPPER.border.card, shadowColor: BLOOM_SUPPER.shadow.color, shadowOpacity: 0.18, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  glow: { position: "absolute", width: 180, height: 180, borderRadius: 90, right: -65, top: -80, backgroundColor: BLOOM_SUPPER.modal.glowPink },
  icon: { alignSelf: "center", width: 68, height: 68, borderRadius: 24, backgroundColor: COLORS.accentBg, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  emoji: { fontSize: 31 },
  eyebrow: { color: COLORS.primary, textAlign: "center", fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  title: { marginTop: 5, fontSize: 23, lineHeight: 29, fontWeight: "900", color: COLORS.primaryText, textAlign: "center" },
  body: { fontSize: 13.5, lineHeight: 20, color: COLORS.secondaryText, textAlign: "center", marginTop: 8, marginBottom: 18 },
  button: { width: "100%", marginTop: 2 },
  loader: { marginTop: 12 },
});
