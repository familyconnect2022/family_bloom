import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { BloomKeyboardScreen, useBloomKeyboardFocus } from "../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { BloomButton } from "../components/ui/BloomButtonComponents";
import { BloomCard, BloomPill, BloomSectionHeader } from "../components/ui/BloomPageComponents";
import { BloomHeroHeader } from "../components/ui/BloomHeroHeader";
import { useBloomToast } from "../components/ui/BloomToast";
import { parseAppError } from "../constants/errorConstants";
import { COLORS, SPACING } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { familyJoinService } from "../services/family/familyJoinService";
import { familyService } from "../services/family/familyService";
import type { FamilyJoinRequest } from "../types";

type Mode = "manage" | "join" | "create";
const ROLE_LABEL: Record<string, string> = { owner: "Chủ nhà", admin: "Quản trị viên", member: "Thành viên", child: "Thành viên nhỏ" };

const normalizeMode = (value: string | string[] | undefined): Mode => {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "join" || raw === "create" ? raw : "manage";
};

export default function FamilyMembershipsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const { user, userProfile, families, activeFamilyId, familyTransition, switchFamily } = useAuth();
  const { showToast } = useBloomToast();
  const [mode, setMode] = useState<Mode>(() => normalizeMode(params.mode));
  const [familyKey, setFamilyKey] = useState("");
  const [message, setMessage] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [joinRequest, setJoinRequest] = useState<FamilyJoinRequest | null>(null);
  const [createdFamily, setCreatedFamily] = useState<{ familyId: string; familyName: string; familyCode: string } | null>(null);
  const handledStatusRef = useRef<FamilyJoinRequest["status"] | null>(null);

  useEffect(() => setMode(normalizeMode(params.mode)), [params.mode]);

  useEffect(() => {
    if (!user || !joinRequest?.familyId || joinRequest.status !== "pending") return;
    return familyJoinService.watchMyRequest(
      user.uid,
      joinRequest.familyId,
      (request) => {
        if (!request) return;
        setJoinRequest(request);
        if (request.status === "approved" && handledStatusRef.current !== "approved") {
          handledStatusRef.current = "approved";
          showToast({
            type: "success",
            title: "Đã được duyệt 🌸",
            message: `${request.familyName} đã xuất hiện trong danh sách nhà. Bạn vẫn ở nhà hiện tại cho đến khi tự chọn chuyển.`,
            duration: 4200,
          });
        } else if (request.status === "rejected" && handledStatusRef.current !== "rejected") {
          handledStatusRef.current = "rejected";
          showToast({
            message: request.rejectionReason || "Yêu cầu chưa được duyệt. Bạn có thể kiểm tra mã nhà và gửi lại.",
            duration: 3800,
          });
        }
      },
      (error) => showToast({ ...parseAppError(error), duration: 3500 }),
    );
  }, [joinRequest?.familyId, joinRequest?.status, showToast, user]);

  const orderedFamilies = useMemo(() => [...families].sort((a, b) => {
    if (a.familyId === activeFamilyId) return -1;
    if (b.familyId === activeFamilyId) return 1;
    return b.joinedAt.localeCompare(a.joinedAt) || a.familyName.localeCompare(b.familyName, "vi");
  }), [activeFamilyId, families]);

  const handleJoin = async () => {
    if (!user || !userProfile || busy) return;
    if (!familyKey.trim()) {
      showToast({ ...parseAppError({ code: "FAMILY_ID_REQUIRED" }), duration: 3000 });
      return;
    }
    setBusy(true);
    try {
      const request = await familyJoinService.requestToJoin(user.uid, familyKey, userProfile, message);
      handledStatusRef.current = null;
      setJoinRequest(request);
      setMessage("");
      showToast({ message: "Yêu cầu đã gửi 🌸 Bạn vẫn có thể dùng ngôi nhà hiện tại trong lúc chờ duyệt.", duration: 3500 });
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3500 });
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!user || !familyName.trim() || busy) {
      if (!familyName.trim()) showToast({ ...parseAppError({ code: "VALIDATION_REQUIRED" }), duration: 3000 });
      return;
    }
    setBusy(true);
    try {
      // Phase 7: tạo nhà mới không tự rời active family hiện tại.
      const result = await familyService.createFamilyForUser(user.uid, familyName.trim(), { activateAfterCreate: false });
      setCreatedFamily(result);
      setFamilyName("");
      showToast({ message: "Ngôi nhà mới đã được tạo. Bạn có thể vào ngay hoặc ở lại nhà hiện tại.", duration: 3600 });
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3500 });
    } finally {
      setBusy(false);
    }
  };

  const enterFamily = async (familyId: string) => {
    if (busy || familyTransition) return;
    const ok = await switchFamily(familyId);
    if (ok) router.navigate("/(tabs)" as never);
  };

  const headerCopy = mode === "join"
    ? { eyebrow: "THÊM MỘT MÁI NHÀ", title: "Tìm đường về đúng nhà", subtitle: "Nhập mã nhà và gửi một lời nhắn nhỏ. Nhà bạn đang xem vẫn ở nguyên trong lúc chờ duyệt." }
    : mode === "create"
      ? { eyebrow: "MÁI NHÀ MỚI", title: "Gieo một tổ ấm mới", subtitle: "Đặt một cái tên thân thuộc. Bloom tạo nhà mới nhưng không tự rời nơi bạn đang ở." }
      : { eyebrow: "NHỮNG NGÔI NHÀ CỦA BẠN", title: "Mỗi nhà, một câu chuyện", subtitle: "Chuyển giữa các gia đình thật rõ ràng mà vẫn giữ riêng từng dòng ký ức." };

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <BloomHeroHeader
        eyebrow={headerCopy.eyebrow}
        title={headerCopy.title}
        subtitle={headerCopy.subtitle}
        variant="family"
        onBack={() => router.back()}
      />
      <View style={styles.pageBody}>
      <BloomKeyboardScreen contentContainerStyle={styles.content}>
        <View style={styles.modeTabs}>
          <ModeChip label="Các nhà" active={mode === "manage"} onPress={() => setMode("manage")} />
          <ModeChip label="Tham gia" active={mode === "join"} onPress={() => setMode("join")} />
          <ModeChip label="Tạo mới" active={mode === "create"} onPress={() => setMode("create")} />
        </View>

        {mode === "manage" && (
          <View style={styles.section}>
            <BloomSectionHeader title="Gia đình của bạn" subtitle={`${orderedFamilies.length} nhà đang gắn với tài khoản này`} />
            <View style={styles.familyList}>
              {orderedFamilies.map((item) => {
                const active = item.familyId === activeFamilyId;
                return (
                  <BloomCard key={item.familyId} tone={active ? "accent" : "default"} style={styles.familyCard}>
                    <View style={styles.familyRow}>
                      <View style={[styles.familyIcon, active && styles.familyIconActive]}>
                        <Ionicons name={active ? "home" : "home-outline"} size={20} color={active ? COLORS.white : COLORS.primary} />
                      </View>
                      <View style={styles.familyCopy}>
                        <Text style={styles.familyName}>{item.familyName}</Text>
                        <View style={styles.pillRow}>
                          <BloomPill icon="shield-checkmark-outline" label={ROLE_LABEL[item.role] ?? "Thành viên"} />
                          {active && <BloomPill icon="checkmark-circle-outline" label="Đang xem" />}
                        </View>
                      </View>
                    </View>
                    {!active && (
                      <BloomButton
                        title="Vào nhà này"
                        variant="outline"
                        onPress={() => void enterFamily(item.familyId)}
                        disabled={!!familyTransition}
                        customStyle={styles.familyAction}
                      />
                    )}
                  </BloomCard>
                );
              })}
            </View>
          </View>
        )}

        {mode === "join" && (
          <JoinForm
            familyKey={familyKey}
            setFamilyKey={setFamilyKey}
            message={message}
            setMessage={setMessage}
            request={joinRequest}
            busy={busy}
            onJoin={() => void handleJoin()}
            onReset={() => {
              handledStatusRef.current = null;
              setJoinRequest(null);
              setFamilyKey("");
              setMessage("");
            }}
            onEnter={(familyId) => void enterFamily(familyId)}
          />
        )}

        {mode === "create" && (
          <View style={styles.section}>
            <BloomSectionHeader title="Tạo thêm một gia đình" subtitle="Bạn trở thành admin của nhà mới, nhưng Bloom không tự chuyển khỏi nhà đang xem." />
            {createdFamily ? (
              <BloomCard tone="accent" style={styles.successCard}>
                <View style={styles.successIcon}><Ionicons name="checkmark" size={24} color={COLORS.white} /></View>
                <Text style={styles.successTitle}>{createdFamily.familyName} đã sẵn sàng 🌸</Text>
                <Text style={styles.successLabel}>MÃ NHÀ</Text>
                <Text selectable style={styles.houseCode}>{createdFamily.familyCode}</Text>
                <View style={styles.successActions}>
                  <BloomButton title="Vào nhà mới" onPress={() => void enterFamily(createdFamily.familyId)} disabled={!!familyTransition} />
                  <BloomButton title="Ở lại nhà hiện tại" variant="outline" onPress={() => { setCreatedFamily(null); setMode("manage"); }} disabled={!!familyTransition} />
                </View>
              </BloomCard>
            ) : (
              <BloomCard style={styles.formCard}>
                <Text style={styles.formTitle}>Tên gia đình</Text>
                <Text style={styles.formHint}>Ví dụ: Nhà Ngoại · Gia đình Nguyễn · Nhà của Ba Mẹ</Text>
                <TextInput
                  value={familyName}
                  onChangeText={setFamilyName}
                  placeholder="Tên ngôi nhà mới 🌷"
                  placeholderTextColor="#9A98A2"
                  style={styles.input}
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleCreate()}
                />
                <BloomButton title="Tạo gia đình" icon="add-circle-outline" onPress={() => void handleCreate()} isLoading={busy} customStyle={styles.primaryAction} />
              </BloomCard>
            )}
          </View>
        )}
      </BloomKeyboardScreen>
      </View>
    </ScreenContainer>
  );
}

function JoinForm({
  familyKey,
  setFamilyKey,
  message,
  setMessage,
  request,
  busy,
  onJoin,
  onReset,
  onEnter,
}: {
  familyKey: string;
  setFamilyKey: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;
  request: FamilyJoinRequest | null;
  busy: boolean;
  onJoin: () => void;
  onReset: () => void;
  onEnter: (familyId: string) => void;
}) {
  const { revealInput } = useBloomKeyboardFocus();
  const keyRef = useRef<TextInput>(null);
  const messageRef = useRef<TextInput>(null);

  if (request?.status === "pending") {
    return (
      <View style={styles.section}>
        <BloomCard tone="accent" style={styles.successCard}>
          <View style={styles.waitingIcon}><Text style={styles.waitingEmoji}>🌱</Text></View>
          <Text style={styles.successTitle}>Đang chờ {request.familyName}</Text>
          <Text style={styles.statusText}>Yêu cầu đã được gửi. Bạn có thể quay lại dùng nhà hiện tại; khi admin duyệt, membership sẽ tự cập nhật.</Text>
          <BloomButton title="Dùng mã nhà khác" variant="outline" onPress={onReset} disabled={busy} customStyle={styles.primaryAction} />
        </BloomCard>
      </View>
    );
  }

  if (request?.status === "approved") {
    return (
      <View style={styles.section}>
        <BloomCard tone="accent" style={styles.successCard}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={24} color={COLORS.white} /></View>
          <Text style={styles.successTitle}>Bạn đã vào {request.familyName} 🌸</Text>
          <Text style={styles.statusText}>Bloom không tự rời nhà hiện tại. Bạn quyết định khi nào muốn chuyển.</Text>
          <BloomButton title="Vào nhà vừa được duyệt" onPress={() => onEnter(request.familyId)} customStyle={styles.primaryAction} />
          <BloomButton title="Ở lại nhà hiện tại" variant="outline" onPress={onReset} />
        </BloomCard>
      </View>
    );
  }

  if (request?.status === "rejected") {
    return (
      <View style={styles.section}>
        <BloomCard style={styles.successCard}>
          <View style={styles.rejectedIcon}><Ionicons name="close" size={23} color={COLORS.white} /></View>
          <Text style={styles.successTitle}>Chưa vào nhà lần này</Text>
          <Text style={styles.statusText}>{request.rejectionReason || "Bạn có thể kiểm tra lại mã nhà hoặc liên hệ admin rồi gửi lại."}</Text>
          <BloomButton title="Gửi yêu cầu khác" variant="outline" onPress={onReset} />
        </BloomCard>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <BloomSectionHeader title="Tham gia một nhà khác" subtitle="Nhà đang xem vẫn hoạt động bình thường trong lúc yêu cầu chờ duyệt." />
      <BloomCard style={styles.formCard}>
        <Text style={styles.formTitle}>Mã nhà / Family ID</Text>
        <TextInput
          ref={keyRef}
          value={familyKey}
          onChangeText={setFamilyKey}
          onFocus={() => revealInput(keyRef.current, 24)}
          placeholder="Nhập mã nhà 🌸"
          placeholderTextColor="#9A98A2"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          returnKeyType="next"
          onSubmitEditing={() => messageRef.current?.focus()}
        />
        <Text style={styles.formTitle}>Lời nhắn (không bắt buộc)</Text>
        <TextInput
          ref={messageRef}
          value={message}
          onChangeText={setMessage}
          onFocus={() => revealInput(messageRef.current, 34)}
          placeholder="Ví dụ: Mình là con của cô Lan…"
          placeholderTextColor="#9A98A2"
          style={[styles.input, styles.messageInput]}
          multiline
        />
        <BloomButton title="Gửi yêu cầu gia nhập" onPress={onJoin} isLoading={busy} customStyle={styles.primaryAction} />
      </BloomCard>
    </View>
  );
}

function ModeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.modeChip, active && styles.modeChipActive, pressed && styles.pressed]}>
      <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pageBody: { flex: 1, marginTop: -24, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden", backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 34 },
  modeTabs: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.xs, marginBottom: SPACING.md },
  modeChip: { flex: 1, minHeight: 40, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1.6, borderColor: COLORS.inputBorder, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  modeChipActive: { backgroundColor: COLORS.accentBg, borderColor: "#F2BFD1" },
  modeChipText: { color: COLORS.secondaryText, fontSize: 12.5, fontWeight: "800" },
  modeChipTextActive: { color: COLORS.primaryText },
  section: { marginTop: SPACING.xl },
  familyList: { gap: SPACING.md },
  familyCard: { gap: SPACING.md },
  familyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  familyIcon: { width: 46, height: 46, borderRadius: 17, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  familyIconActive: { backgroundColor: COLORS.primary },
  familyCopy: { flex: 1, minWidth: 0 },
  familyName: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 7 },
  familyAction: { width: "100%" },
  formCard: { gap: SPACING.sm },
  formTitle: { color: COLORS.primaryText, fontSize: 13, fontWeight: "800", marginTop: 3 },
  formHint: { color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 18, marginTop: -2, marginBottom: 2 },
  input: { minHeight: 52, borderWidth: 1.6, borderColor: COLORS.inputBorder, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: COLORS.white, color: COLORS.primaryText, fontSize: 15 },
  messageInput: { minHeight: 90, textAlignVertical: "top" },
  primaryAction: { width: "100%", marginTop: 8 },
  successCard: { alignItems: "center" },
  successIcon: { width: 54, height: 54, borderRadius: 20, backgroundColor: "#68A977", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  waitingIcon: { width: 54, height: 54, borderRadius: 20, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  waitingEmoji: { fontSize: 27 },
  rejectedIcon: { width: 54, height: 54, borderRadius: 20, backgroundColor: "#D97575", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  successTitle: { color: COLORS.primaryText, fontSize: 19, fontWeight: "900", textAlign: "center" },
  successLabel: { marginTop: 14, color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "900", letterSpacing: 1 },
  houseCode: { marginTop: 5, color: COLORS.primary, fontSize: 20, fontWeight: "900", letterSpacing: 0.5 },
  statusText: { marginTop: 8, color: COLORS.secondaryText, fontSize: 13.5, lineHeight: 20, textAlign: "center" },
  successActions: { alignSelf: "stretch", gap: SPACING.md, marginTop: SPACING.lg },
  pressed: { opacity: 0.72 },
});
