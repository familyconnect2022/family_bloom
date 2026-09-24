import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BloomKeyboardScreen, useBloomKeyboardFocus } from "../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { BloomButton } from "../components/ui/BloomButtonComponents";
import { useBloomToast } from "../components/ui/BloomToast";
import { parseAppError } from "../constants/errorConstants";
import { useAuth } from "../context/AuthContext";
import { familyJoinService } from "../services/family/familyJoinService";
import { familyService } from "../services/family/familyService";
import type { FamilyJoinRequest } from "../types";

export default function FamilyGatewayScreen() {
  const { user, userProfile, refreshProfile } = useAuth();
  const { showToast } = useBloomToast();
  const [mode, setMode] = useState<"choice" | "join" | "create">("choice");
  const [familyKey, setFamilyKey] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<FamilyJoinRequest | null>(null);
  const [createdFamily, setCreatedFamily] = useState<{ familyId: string; familyName: string; familyCode: string } | null>(null);
  const handledStatusRef = useRef<FamilyJoinRequest["status"] | null>(null);

  useEffect(() => {
    if (!user || !pendingRequest?.familyId || pendingRequest.status !== "pending") return;

    return familyJoinService.watchMyRequest(
      user.uid,
      pendingRequest.familyId,
      async (request) => {
        if (!request) return;
        setPendingRequest(request);

        if (request.status === "approved" && handledStatusRef.current !== "approved") {
          handledStatusRef.current = "approved";
          showToast({
            message: `Bạn đã được duyệt vào ${request.familyName} 🌸 Bloom đang mở cửa nhà…`,
            duration: 3500,
          });
          // approve() đã atomically tạo membership + activeFamilyId.
          // Refresh state để Root Navigator tự đưa user vào Tabs ngay, không chặn UI bằng loader.
          await refreshProfile();
        }

        if (request.status === "rejected" && handledStatusRef.current !== "rejected") {
          handledStatusRef.current = "rejected";
          showToast({
            message: request.rejectionReason
              ? `Yêu cầu chưa được duyệt: ${request.rejectionReason}`
              : "Yêu cầu gia nhập chưa được admin duyệt. Bạn có thể kiểm tra lại mã nhà và thử lại.",
            duration: 4000,
          });
        }
      },
      (error) => showToast({ ...parseAppError(error), duration: 3500 }),
    );
  }, [pendingRequest?.familyId, pendingRequest?.status, refreshProfile, showToast, user]);

  const handleJoin = async () => {
    if (!user || !userProfile) return;
    const key = familyKey.trim();
    if (!key) {
      showToast({ ...parseAppError({ code: "FAMILY_ID_REQUIRED" }), duration: 3000 });
      return;
    }
    setLoading(true);
    try {
      const request = await familyJoinService.requestToJoin(user.uid, key, userProfile, message);
      handledStatusRef.current = null;
      setPendingRequest(request);
      setMessage("");
      showToast({
        message: "Yêu cầu đã đến admin 🌸 Bạn cứ ở đây, Bloom sẽ báo ngay khi có phản hồi.",
        duration: 3500,
      });
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3500 });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!user || !userProfile) return;
    const name = familyName.trim();
    if (!name) {
      showToast({ ...parseAppError({ code: "VALIDATION_REQUIRED" }), duration: 3000 });
      return;
    }
    setLoading(true);
    try {
      const result = await familyService.createFamilyForUser(user.uid, name);
      setCreatedFamily(result);
      setFamilyName("");
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3500 });
    } finally {
      setLoading(false);
    }
  };

  const enterCreatedFamily = async () => {
    if (!createdFamily || !user) return;
    setLoading(true);
    try {
      await refreshProfile();
    } finally {
      setLoading(false);
    }
  };

  if (createdFamily) {
    return (
      <ScreenContainer>
        <View style={styles.centered}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={38} color="#fff" /></View>
          <Text style={styles.title}>Nhà của bạn đã được tạo! 🌸</Text>
          <Text style={styles.body}>
            Bạn là admin đầu tiên. Hãy dùng <Text style={styles.bodyStrong}>Mã nhà</Text> bên dưới để mời các thành viên khác.
          </Text>
          <View style={styles.idCard}>
            <Text style={styles.idLabel}>TÊN GIA ĐÌNH</Text>
            <Text style={styles.familyNameValue}>{createdFamily.familyName}</Text>
            <View style={styles.divider} />
            <Text style={styles.idLabel}>MÃ NHÀ DỄ NHỚ</Text>
            <Text selectable style={styles.idValue}>{createdFamily.familyCode}</Text>
            <Text style={styles.helper}>Thành viên có thể nhập mã này thay cho Family ID dài.</Text>
          </View>
          <BloomButton title="Vào nhà của mình" onPress={enterCreatedFamily} isLoading={loading} customStyle={styles.fullButton} />
        </View>
        <BlockingLoader visible={loading} message="Đang mở tổ ấm của bạn…" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <BloomKeyboardScreen
        contentContainerStyle={[
          styles.container,
          mode === "choice" && !pendingRequest ? styles.containerCentered : styles.containerForm,
          styles.keyboardContent,
        ]}
      >
        <GatewayContent
          mode={mode}
          setMode={setMode}
          familyKey={familyKey}
          setFamilyKey={setFamilyKey}
          familyName={familyName}
          setFamilyName={setFamilyName}
          message={message}
          setMessage={setMessage}
          loading={loading}
          pendingRequest={pendingRequest}
          clearPending={() => {
            handledStatusRef.current = null;
            setPendingRequest(null);
            setMode("join");
          }}
          handleJoin={handleJoin}
          handleCreate={handleCreate}
        />
      </BloomKeyboardScreen>
      <BlockingLoader
        visible={loading && !createdFamily && pendingRequest?.status !== "approved"}
        message={mode === "join" ? "Đang gửi lời xin vào nhà…" : "Đang tạo tổ ấm…"}
      />
    </ScreenContainer>
  );
}

function GatewayContent({
  mode,
  setMode,
  familyKey,
  setFamilyKey,
  familyName,
  setFamilyName,
  message,
  setMessage,
  loading,
  pendingRequest,
  clearPending,
  handleJoin,
  handleCreate,
}: {
  mode: "choice" | "join" | "create";
  setMode: (mode: "choice" | "join" | "create") => void;
  familyKey: string;
  setFamilyKey: (value: string) => void;
  familyName: string;
  setFamilyName: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;
  loading: boolean;
  pendingRequest: FamilyJoinRequest | null;
  clearPending: () => void;
  handleJoin: () => void;
  handleCreate: () => void;
}) {
  const { revealInput } = useBloomKeyboardFocus();
  const familyNameInputRef = useRef<TextInput>(null);
  const familyKeyInputRef = useRef<TextInput>(null);
  const messageInputRef = useRef<TextInput>(null);

  return (
    <>
      <View style={styles.heroIcon}><Text style={styles.heroEmoji}>🏡</Text></View>
      <Text style={styles.title}>Chào mừng về Family Bloom</Text>
      <Text style={styles.body}>Bạn chưa thuộc gia đình nào. Hãy chọn cách bắt đầu để mở cánh cửa vào đúng ngôi nhà của mình.</Text>

      {pendingRequest?.status === "pending" && (
        <View style={[styles.card, styles.waitingCard]}>
          <View style={styles.waitingIcon}><Text style={styles.waitingEmoji}>🌱</Text></View>
          <Text style={styles.cardTitleCenter}>Bloom đang chờ cùng bạn</Text>
          <Text style={styles.cardBodyCenter}>
            Yêu cầu vào <Text style={styles.bodyStrong}>{pendingRequest.familyName}</Text> đã được gửi. Bạn không cần thoát ứng dụng hay bấm kiểm tra lại.
          </Text>
          <View style={styles.liveStatus}>
            <ActivityIndicator size="small" color="#D66F8E" />
            <Text style={styles.liveStatusText}>Đang lắng nghe phản hồi từ admin…</Text>
          </View>
          <BloomButton title="Dùng mã nhà khác" variant="link" onPress={clearPending} disabled={loading} />
        </View>
      )}

      {pendingRequest?.status === "approved" && (
        <View style={[styles.card, styles.waitingCard]}>
          <View style={[styles.waitingIcon, styles.approvedIcon]}><Ionicons name="checkmark" size={28} color="#fff" /></View>
          <Text style={styles.cardTitleCenter}>Cửa nhà đã mở 🌸</Text>
          <Text style={styles.cardBodyCenter}>Bạn đã được duyệt. Bloom đang đồng bộ thành viên và đưa bạn vào {pendingRequest.familyName}.</Text>
          <View style={styles.liveStatus}>
            <ActivityIndicator size="small" color="#5AA469" />
            <Text style={styles.liveStatusText}>Đang mở tổ ấm của bạn…</Text>
          </View>
        </View>
      )}

      {pendingRequest?.status === "rejected" && (
        <View style={[styles.card, styles.waitingCard]}>
          <View style={[styles.waitingIcon, styles.rejectedIcon]}><Ionicons name="close" size={26} color="#fff" /></View>
          <Text style={styles.cardTitleCenter}>Chưa vào nhà lần này</Text>
          <Text style={styles.cardBodyCenter}>
            {pendingRequest.rejectionReason || "Admin chưa duyệt yêu cầu. Bạn có thể kiểm tra lại mã nhà hoặc nhắn người thân rồi gửi lại."}
          </Text>
          <BloomButton title="Kiểm tra và gửi lại" variant="outline" onPress={clearPending} customStyle={styles.fullButton} />
        </View>
      )}

      {!pendingRequest && mode === "choice" && <View style={styles.choices}>
        <BloomButton title="Tôi là người đầu tiên — Tạo gia đình" icon="add-circle-outline" onPress={() => setMode("create")} customStyle={styles.fullButton} />
        <BloomButton title="Tôi đã có Mã nhà — Xin gia nhập" icon="key-outline" variant="outline" onPress={() => setMode("join")} customStyle={styles.fullButton} />
      </View>}

      {!pendingRequest && mode === "create" && <View style={styles.card}>
        <Text style={styles.cardTitle}>Tạo gia đình mới</Text>
        <Text style={styles.cardBody}>Bạn sẽ trở thành admin đầu tiên. Sau khi tạo, Bloom tự sinh một Mã nhà duy nhất, dễ đọc và dễ nói cho người thân.</Text>
        <Text style={styles.label}>Tên gia đình</Text>
        <TextInput
          ref={familyNameInputRef}
          value={familyName}
          onChangeText={setFamilyName}
          onFocus={() => revealInput(familyNameInputRef.current, 24)}
          placeholder="Nhà mình tên gì nhỉ? 🌷"
          placeholderTextColor="#9A98A2"
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="sentences"
          keyboardType="default"
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={handleCreate}
        />
        <BloomButton title="Tạo gia đình" onPress={handleCreate} isLoading={loading} customStyle={styles.fullButton} />
        <BloomButton title="Quay lại" variant="link" onPress={() => setMode("choice")} disabled={loading} />
      </View>}

      {!pendingRequest && mode === "join" && <View style={styles.card}>
        <Text style={styles.cardTitle}>Gia nhập gia đình</Text>
        <Text style={styles.cardBody}>Nhập Mã nhà do admin cung cấp. Bloom sẽ tự báo cho bạn ngay khi admin phản hồi.</Text>
        <Text style={styles.label}>Mã nhà / Family ID</Text>
        <TextInput
          ref={familyKeyInputRef}
          value={familyKey}
          onChangeText={setFamilyKey}
          onFocus={() => revealInput(familyKeyInputRef.current, 24)}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Mã nhà của bạn 🌸"
          placeholderTextColor="#9A98A2"
          style={styles.input}
          returnKeyType="next"
          onSubmitEditing={() => messageInputRef.current?.focus()}
        />
        <Text style={styles.label}>Lời nhắn (không bắt buộc)</Text>
        <TextInput
          ref={messageInputRef}
          value={message}
          onChangeText={setMessage}
          onFocus={() => revealInput(messageInputRef.current, 34)}
          placeholder="Ví dụ: Mình là con của cô Lan…"
          placeholderTextColor="#9A98A2"
          multiline
          style={[styles.input, styles.message]}
        />
        <BloomButton title="Gửi yêu cầu gia nhập" onPress={handleJoin} isLoading={loading} customStyle={styles.fullButton} />
        <BloomButton title="Quay lại" variant="link" onPress={() => setMode("choice")} disabled={loading} />
      </View>}
    </>
  );
}

function BlockingLoader({ visible, message }: { visible: boolean; message: string }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <View style={styles.loaderOverlay}>
        <View style={styles.loaderCard}>
          <ActivityIndicator size="large" color="#D66F8E" />
          <Text style={styles.loaderTitle}>{message}</Text>
          <Text style={styles.loaderBody}>Bloom đang hoàn tất bước này. Chỉ một chút thôi nhé.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  containerCentered: { justifyContent: "center", paddingTop: 24 },
  containerForm: { justifyContent: "flex-start", paddingTop: 16 },
  keyboardContent: { paddingBottom: 32 },
  centered: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center" },
  heroIcon: { alignSelf: "center", width: 92, height: 92, borderRadius: 46, backgroundColor: "#F2EFFF", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  heroEmoji: { fontSize: 46 },
  successIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: "#5AA469", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontSize: 27, lineHeight: 34, fontWeight: "800", textAlign: "center", color: "#242B35" },
  body: { fontSize: 15, lineHeight: 23, color: "#6F7480", textAlign: "center", marginTop: 10, marginBottom: 24 },
  bodyStrong: { fontWeight: "800", color: "#8E5368" },
  choices: { gap: 12 },
  card: { marginTop: 8, backgroundColor: "#fff", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#E5E7EB" },
  waitingCard: { alignItems: "center" },
  waitingIcon: { width: 60, height: 60, borderRadius: 22, backgroundColor: "#FFF0F4", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  waitingEmoji: { fontSize: 28 },
  approvedIcon: { backgroundColor: "#81C784" },
  rejectedIcon: { backgroundColor: "#E57373" },
  cardTitle: { fontSize: 20, fontWeight: "800", color: "#242B35" },
  cardTitleCenter: { fontSize: 20, fontWeight: "800", color: "#242B35", textAlign: "center" },
  cardBody: { fontSize: 14, lineHeight: 21, color: "#6F7480", marginTop: 6, marginBottom: 16 },
  cardBodyCenter: { fontSize: 14, lineHeight: 21, color: "#6F7480", marginTop: 8, marginBottom: 16, textAlign: "center" },
  liveStatus: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 16, backgroundColor: "#FFF0F4", paddingHorizontal: 14, paddingVertical: 12, marginBottom: 5 },
  liveStatusText: { color: "#8E5368", fontSize: 12.5, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "700", color: "#242B35", marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: "#D9DDE5", borderRadius: 15, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, color: "#242B35", backgroundColor: "#F8F9FB", minHeight: 52 },
  message: { minHeight: 82, textAlignVertical: "top" },
  fullButton: { width: "100%", marginTop: 12 },
  idCard: { width: "100%", backgroundColor: "#F8F9FB", borderRadius: 18, padding: 18, marginBottom: 18, borderWidth: 1, borderColor: "#E5E7EB" },
  idLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, color: "#6F7480", textAlign: "center" },
  familyNameValue: { fontSize: 20, fontWeight: "800", color: "#242B35", textAlign: "center", marginTop: 8 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 14 },
  idValue: { fontSize: 18, fontWeight: "900", color: "#8E5368", textAlign: "center", marginTop: 8, letterSpacing: 0.4 },
  helper: { fontSize: 12, lineHeight: 18, color: "#6F7480", textAlign: "center", marginTop: 8 },
  loaderOverlay: { flex: 1, backgroundColor: "rgba(35, 24, 31, 0.48)", justifyContent: "center", alignItems: "center", padding: 28 },
  loaderCard: { width: "100%", maxWidth: 340, backgroundColor: "#FFFFFF", borderRadius: 24, padding: 28, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  loaderTitle: { marginTop: 18, fontSize: 18, fontWeight: "800", color: "#8E5368", textAlign: "center" },
  loaderBody: { marginTop: 8, fontSize: 13, lineHeight: 19, color: "#6F7480", textAlign: "center" },
});
