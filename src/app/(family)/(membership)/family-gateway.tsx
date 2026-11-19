import { BloomScaledInput } from '../../../components/ui/BloomScaledInput';
import { useBloomThemeRevision , useBloomColorsRevision, useBloomTypographyRevision} from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, type TextInput, View,  } from 'react-native';
import { BloomText as Text } from '../../../components/ui/BloomText';
import { BloomKeyboardScreen } from "../../../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomButton } from "../../../components/ui/BloomButtonComponents";
import { BloomTextInput } from "../../../components/ui/BloomInputComponents";
import { BloomLoadingOverlay } from "../../../components/ui/BloomLoadingOverlay";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { useBloomToast } from "../../../components/ui/BloomToast";
import { parseAppError } from "../../../constants/errorConstants";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { familyJoinService } from "../../../services/family/familyJoinService";
import { familyService } from "../../../services/family/familyService";
import type { FamilyJoinRequest } from "../../../types";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


export default function FamilyGatewayScreen() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const { user, userProfile, refreshProfile, requestWelcomeForFamily } = useAuth();
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
            type: "success",
            message: `Bạn đã được duyệt vào ${request.familyName} 🌸 Bloom đang mở cửa nhà…`,
            duration: 3500,
          });
          // Approval creates membership; only the applicant updates their profile.
          // Approval must arm Thư Ngõ before activation; a membership
          // snapshot may otherwise navigate to Home immediately.
          requestWelcomeForFamily(request.familyId);
          try {
            await familyService.switchActiveFamily(user.uid, request.familyId);
            await refreshProfile();
          } catch (error) {
            handledStatusRef.current = null;
            showToast({ ...parseAppError(error), duration: 3500 });
          }
        }

        if (request.status === "rejected" && handledStatusRef.current !== "rejected") {
          handledStatusRef.current = "rejected";
          showToast({
            type: "warning",
            message: request.rejectionReason
              ? `Yêu cầu chưa được duyệt: ${request.rejectionReason}`
              : "Người quản lý nhà chưa đồng ý yêu cầu này. Bạn có thể xem lại Mã nhà hoặc nhắn người thân rồi thử lại nhé.",
            duration: 4000,
          });
        }
      },
      (error) => showToast({ ...parseAppError(error), duration: 3500 }),
    );
  }, [pendingRequest?.familyId, pendingRequest?.status, refreshProfile, requestWelcomeForFamily, showToast, user]);

  const openApprovedFamily = async () => {
    if (!user || !pendingRequest || loading) return;
    setLoading(true);
    try { requestWelcomeForFamily(pendingRequest.familyId); await familyService.switchActiveFamily(user.uid, pendingRequest.familyId); await refreshProfile(); }
    catch (error) { showToast({ ...parseAppError(error), duration: 3500 }); }
    finally { setLoading(false); }
  };

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
        type: "success",
        message: "Lời xin vào nhà đã được gửi 🌸 Bloom sẽ báo ngay khi người thân phản hồi.",
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
      // The membership/profile snapshot may navigate straight to Tabs before
      // the user can tap "Vào nhà". Arm the family-scoped welcome immediately.
      requestWelcomeForFamily(result.familyId);
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
      // Pending welcome is scoped to the new family. It only becomes visible
      // after the membership is authoritative and the Tabs surface is ready.
      requestWelcomeForFamily(createdFamily.familyId);
      await refreshProfile();
    } finally {
      setLoading(false);
    }
  };

  if (createdFamily) {
    return (
      <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
        <BloomHeroHeader eyebrow="MÁI NHÀ MỚI" title="Nhà mình vừa nở 🌸" subtitle="Giữ lại Mã nhà để người thương có thể tìm đúng đường về đây." variant="family" compact roundedBottom />
        <View style={[__a3_styles.centered, __a3_styles.pageBody]}>
          <View style={__a3_styles.successIcon}><Ionicons name="checkmark" size={38} color={__a3Colors.white} /></View>
          <Text style={__a3_styles.title}>Nhà của bạn đã được tạo! 🌸</Text>
          <Text style={__a3_styles.body}>
            Bạn là người quản lý đầu tiên của ngôi nhà này. Hãy dùng <Text style={__a3_styles.bodyStrong}>Mã nhà</Text> bên dưới để mời các thành viên khác.
          </Text>
          <View style={__a3_styles.idCard}>
            <Text style={__a3_styles.idLabel}>TÊN GIA ĐÌNH</Text>
            <Text style={__a3_styles.familyNameValue}>{createdFamily.familyName}</Text>
            <View style={__a3_styles.divider} />
            <Text style={__a3_styles.idLabel}>MÃ NHÀ DỄ NHỚ</Text>
            <Text selectable style={__a3_styles.idValue}>{createdFamily.familyCode}</Text>
            <Text style={__a3_styles.helper}>Chỉ cần đọc Mã nhà này cho người thân — ngắn gọn và dễ nhớ hơn nhiều.</Text>
          </View>
          <BloomButton title="Vào nhà của mình" onPress={enterCreatedFamily} isLoading={loading} customStyle={__a3_styles.fullButton} />
        </View>
        <BlockingLoader visible={loading} message="Đang mở tổ ấm của bạn…" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <BloomHeroHeader eyebrow="BẮT ĐẦU CÙNG BLOOM" title="Mình về đúng nhà nhé" subtitle="Tạo một mái nhà mới hoặc gửi lời xin vào ngôi nhà người thân đã mở." variant="family" compact roundedBottom />
      <BloomKeyboardScreen
        contentContainerStyle={[
          __a3_styles.container,
          __a3_styles.pageBody,
          mode === "choice" && !pendingRequest ? __a3_styles.containerCentered : __a3_styles.containerForm,
          __a3_styles.keyboardContent,
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
          openApprovedFamily={() => void openApprovedFamily()}
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
  openApprovedFamily,
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
  openApprovedFamily: () => void;
}) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  const familyNameInputRef = useRef<React.ElementRef<typeof BloomScaledInput>>(null);
  const familyKeyInputRef = useRef<React.ElementRef<typeof BloomScaledInput>>(null);
  const messageInputRef = useRef<React.ElementRef<typeof BloomScaledInput>>(null);

  return (
    <>
      <View style={__a3_styles.heroIcon}><Text style={__a3_styles.heroEmoji}>🏡</Text></View>
      <Text style={__a3_styles.title}>Chào mừng về Family Bloom</Text>
      <Text style={__a3_styles.body}>Bạn chưa thuộc gia đình nào. Hãy chọn cách bắt đầu để mở cánh cửa vào đúng ngôi nhà của mình.</Text>

      {pendingRequest?.status === "pending" && (
        <View style={[__a3_styles.card, __a3_styles.waitingCard]}>
          <View style={__a3_styles.waitingIcon}><Text style={__a3_styles.waitingEmoji}>🌱</Text></View>
          <Text style={__a3_styles.cardTitleCenter}>Bloom đang chờ cùng bạn</Text>
          <Text style={__a3_styles.cardBodyCenter}>
            Yêu cầu vào <Text style={__a3_styles.bodyStrong}>{pendingRequest.familyName}</Text> đã được gửi. Bạn không cần thoát ứng dụng hay bấm kiểm tra lại.
          </Text>
          <View style={__a3_styles.liveStatus}>
            <ActivityIndicator size="small" color={__a3Colors.primary} />
            <Text style={__a3_styles.liveStatusText}>Bloom đang chờ người thân mở cửa…</Text>
          </View>
          <BloomButton title="Dùng mã nhà khác" variant="link" onPress={clearPending} disabled={loading} />
        </View>
      )}

      {pendingRequest?.status === "approved" && (
        <View style={[__a3_styles.card, __a3_styles.waitingCard]}>
          <View style={[__a3_styles.waitingIcon, __a3_styles.approvedIcon]}><Ionicons name="checkmark" size={28} color={__a3Colors.white} /></View>
          <Text style={__a3_styles.cardTitleCenter}>Cửa nhà đã mở 🌸</Text>
          <BloomButton title="Mở cửa vào nhà" onPress={openApprovedFamily} disabled={loading} />
          <Text style={__a3_styles.cardBodyCenter}>Bạn đã được duyệt. Bloom đang mở cửa và đưa bạn vào {pendingRequest.familyName}.</Text>
          <View style={__a3_styles.liveStatus}>
            <ActivityIndicator size="small" color={__a3Colors.positive} />
            <Text style={__a3_styles.liveStatusText}>Đang mở tổ ấm của bạn…</Text>
          </View>
        </View>
      )}

      {pendingRequest?.status === "rejected" && (
        <View style={[__a3_styles.card, __a3_styles.waitingCard]}>
          <View style={[__a3_styles.waitingIcon, __a3_styles.rejectedIcon]}><Ionicons name="close" size={26} color={__a3Colors.white} /></View>
          <Text style={__a3_styles.cardTitleCenter}>Chưa vào nhà lần này</Text>
          <Text style={__a3_styles.cardBodyCenter}>
            {pendingRequest.rejectionReason || "Người quản lý nhà chưa đồng ý. Bạn có thể xem lại Mã nhà hoặc nhắn người thân rồi gửi lại."}
          </Text>
          <BloomButton title="Kiểm tra và gửi lại" variant="outline" onPress={clearPending} customStyle={__a3_styles.fullButton} />
        </View>
      )}

      {!pendingRequest && mode === "choice" && <View style={__a3_styles.choices}>
        <BloomButton title="Tôi là người đầu tiên — Tạo gia đình" icon="add-circle-outline" onPress={() => setMode("create")} customStyle={__a3_styles.fullButton} />
        <BloomButton title="Tôi đã có Mã nhà — Xin gia nhập" icon="key-outline" variant="outline" onPress={() => setMode("join")} customStyle={__a3_styles.fullButton} />
      </View>}

      {!pendingRequest && mode === "create" && <View style={__a3_styles.card}>
        <Text style={__a3_styles.cardTitle}>Tạo gia đình mới</Text>
        <Text style={__a3_styles.cardBody}>Bạn sẽ là người quản lý đầu tiên. Sau khi tạo, Bloom chuẩn bị một Mã nhà ngắn gọn để mời người thân về chung một mái nhà.</Text>
        <BloomTextInput
          ref={familyNameInputRef}
          label="Tên gia đình"
          value={familyName}
          onChangeText={setFamilyName}
          placeholder="Nhà mình tên gì nhỉ? 🌷"
          leftIcon="home-outline"
          autoCorrect={false}
          autoCapitalize="sentences"
          keyboardType="default"
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={handleCreate}
          helperText="Chọn một cái tên thân thuộc — bạn có thể đổi lại sau."
        />
        <View style={__a3_styles.formActions}>
          <BloomButton title="Tạo gia đình" onPress={handleCreate} isLoading={loading} customStyle={__a3_styles.fullButton} />
          <BloomButton title="Quay lại" variant="link" onPress={() => setMode("choice")} disabled={loading} customStyle={__a3_styles.secondaryAction} />
        </View>
      </View>}

      {!pendingRequest && mode === "join" && <View style={__a3_styles.card}>
        <Text style={__a3_styles.cardTitle}>Gia nhập gia đình</Text>
        <Text style={__a3_styles.cardBody}>Nhập Mã nhà người thân đã gửi. Bloom sẽ báo ngay khi cửa nhà được mở cho bạn.</Text>
        <BloomTextInput
          ref={familyKeyInputRef}
          label="Mã nhà"
          value={familyKey}
          onChangeText={setFamilyKey}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Mã nhà của bạn 🌸"
          leftIcon="key-outline"
          returnKeyType="next"
          onSubmitEditing={() => messageInputRef.current?.focus()}
        />
        <BloomTextInput
          ref={messageInputRef}
          label="Lời nhắn (không bắt buộc)"
          value={message}
          onChangeText={setMessage}
          placeholder="Ví dụ: Mình là con của cô Lan…"
          leftIcon="chatbubble-ellipses-outline"
          multiline
          helperText="Một câu ngắn giúp người thân nhận ra bạn nhanh hơn."
        />
        <View style={__a3_styles.formActions}>
          <BloomButton title="Gửi yêu cầu gia nhập" onPress={handleJoin} isLoading={loading} customStyle={__a3_styles.fullButton} />
          <BloomButton title="Quay lại" variant="link" onPress={() => setMode("choice")} disabled={loading} customStyle={__a3_styles.secondaryAction} />
        </View>
      </View>}
    </>
  );
}

function BlockingLoader({ visible, message }: { visible: boolean; message: string }) {
  return (
    <BloomLoadingOverlay
      visible={visible}
      title={message}
      message="Bloom đang hoàn tất bước này. Chỉ một chút thôi nhé."
      icon="home-outline"
    />
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  pageBody: { marginTop: -16, paddingHorizontal: 20, paddingTop: 28, backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  container: { flexGrow: 1, paddingHorizontal: 24 },
  containerCentered: { justifyContent: "center", paddingTop: 24 },
  containerForm: { justifyContent: "flex-start", paddingTop: 16 },
  keyboardContent: { paddingBottom: 32 },
  centered: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center" },
  heroIcon: { alignSelf: "center", width: 92, height: 92, borderRadius: 46, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  heroEmoji: { fontSize: 46 },
  successIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.selectedBackground, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontSize: 27, lineHeight: 34, fontWeight: "800", textAlign: "center", color: COLORS.primaryText },
  body: { fontSize: 15, lineHeight: 23, color: COLORS.secondaryText, textAlign: "center", marginTop: 10, marginBottom: 24 },
  bodyStrong: { fontWeight: "800", color: COLORS.primary },
  choices: { gap: 12 },
  card: { marginTop: 8, backgroundColor: COLORS.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  waitingCard: { alignItems: "center" },
  waitingIcon: { width: 60, height: 60, borderRadius: 22, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  waitingEmoji: { fontSize: 28 },
  approvedIcon: { backgroundColor: COLORS.selectedBackground },
  rejectedIcon: { backgroundColor: COLORS.selectedBackground },
  cardTitle: { fontSize: 20, fontWeight: "800", color: COLORS.primaryText },
  cardTitleCenter: { fontSize: 20, fontWeight: "800", color: COLORS.primaryText, textAlign: "center" },
  cardBody: { fontSize: 14, lineHeight: 21, color: COLORS.secondaryText, marginTop: 6, marginBottom: 16 },
  cardBodyCenter: { fontSize: 14, lineHeight: 21, color: COLORS.secondaryText, marginTop: 8, marginBottom: 16, textAlign: "center" },
  liveStatus: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 16, backgroundColor: COLORS.surface, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 5 },
  liveStatusText: { color: COLORS.primary, fontSize: 12.5, fontWeight: "700" },
  label: { fontSize: 13, fontWeight: "700", color: COLORS.primaryText, marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1.6, borderColor: COLORS.inputBorder, borderRadius: 16, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, color: COLORS.primaryText, backgroundColor: COLORS.surface, minHeight: 52, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  message: { minHeight: 82, textAlignVertical: "top" },
  fullButton: { width: "100%", marginTop: 12 },
  formActions: { width: "100%", gap: 14, paddingTop: 8, paddingBottom: 10 },
  secondaryAction: { minHeight: 44, marginTop: 2 },
  idCard: { width: "100%", backgroundColor: COLORS.surface, borderRadius: 18, padding: 18, marginBottom: 18, borderWidth: 1, borderColor: COLORS.border },
  idLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, color: COLORS.secondaryText, textAlign: "center" },
  familyNameValue: { fontSize: 20, fontWeight: "800", color: COLORS.primaryText, textAlign: "center", marginTop: 8 },
  divider: { height: 1, backgroundColor: COLORS.softSurface, marginVertical: 14 },
  idValue: { fontSize: 18, fontWeight: "900", color: COLORS.primary, textAlign: "center", marginTop: 8, letterSpacing: 0.4 },
  helper: { fontSize: 12, lineHeight: 18, color: COLORS.secondaryText, textAlign: "center", marginTop: 8 },
}));
