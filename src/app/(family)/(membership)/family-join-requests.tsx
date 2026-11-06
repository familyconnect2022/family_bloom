import { getBloomStatusBarStyle } from "../../../constants/theme";
import { useBloomThemeRevision } from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../../components/ui/BloomText';
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { familyJoinService } from "@/services/family/familyJoinService";
import { useAuth } from "@/context/AuthContext";
import type { FamilyJoinRequest } from "@/types";
import { COLORS } from "@/constants/theme";
import { BloomButton } from "@/components/ui/BloomButtonComponents";
import { BloomHeroHeader } from "@/components/ui/BloomHeroHeader";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { useBloomToast } from "@/components/ui/BloomToast";
import { useBloomDialog } from "@/components/ui/BloomDialogProvider";
import { parseAppError } from "@/constants/errorConstants";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


/** Trang chỉ dành cho admin; route vẫn được bảo vệ thêm bởi Rules/service. */
export default function FamilyJoinRequestsScreen() {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  const { user, userProfile, families } = useAuth();
  const { showToast } = useBloomToast();
  const { confirm } = useBloomDialog();
  const [items, setItems] = useState<FamilyJoinRequest[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const familyId = userProfile?.activeFamilyId;
  const current = families.find((family) => family.familyId === familyId);
  const isAdmin = current?.role === "admin" || current?.role === "owner";

  useEffect(() => {
    if (!familyId || !isAdmin) return;

    return familyJoinService.watchPending(
      familyId,
      setItems,
      (error) => showToast({ ...parseAppError(error), duration: 3500 }),
    );
  }, [familyId, isAdmin, showToast]);

  if (!isAdmin) return null;

  /** Admin duyệt; transaction tạo member + membership và cập nhật activeFamilyId. */
  const approve = async (item: FamilyJoinRequest) => {
    if (!user || !familyId) return;
    setLoadingId(item.uid);

    try {
      await familyJoinService.approve(familyId, item, user.uid);
      showToast({
        type: "success",
        message: `Đã duyệt ${item.applicant.displayName} vào gia đình.`,
        duration: 3000,
      });
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3500 });
    } finally {
      setLoadingId(null);
    }
  };

  /** Từ chối request nhưng vẫn giữ lịch sử để audit. */
  const reject = (item: FamilyJoinRequest) => {
    void confirm({
      eyebrow: "DUYỆT THÀNH VIÊN",
      title: "Từ chối yêu cầu?",
      message: `Bloom sẽ giữ lịch sử duyệt, nhưng ${item.applicant.displayName} sẽ chưa được vào nhà.`,
      icon: "person-remove-outline",
      cancelLabel: "Xem lại",
      confirmLabel: "Từ chối",
      destructive: true,
    }).then(async (accepted) => {
      if (!accepted || !user || !familyId) return;
      setLoadingId(item.uid);
      try {
        await familyJoinService.reject(familyId, item, user.uid);
        showToast({ type: "success", message: "Đã từ chối yêu cầu.", duration: 2500 });
      } catch (error) {
        showToast({ ...parseAppError(error), duration: 3500 });
      } finally {
        setLoadingId(null);
      }
    });
  };

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <StatusBar translucent backgroundColor="transparent" style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
      <BloomHeroHeader
        eyebrow="CỬA NHÀ ĐANG CHỜ"
        title="Chào đúng người vào nhà"
        subtitle={`${items.length} yêu cầu đang chờ · Xem hồ sơ và lời nhắn trước khi mở cửa cho một thành viên mới.`}
        variant="moderation"
        onBack={() => router.back()}
      />
      <View style={__a3_styles.pageBody}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={__a3_styles.listContent}
        ListEmptyComponent={
          <View style={__a3_styles.empty}>
            <Text style={__a3_styles.emptyEmoji}>🌷</Text>
            <Text style={__a3_styles.emptyTitle}>Chưa có yêu cầu mới</Text>
            <Text style={__a3_styles.emptyText}>
              Khi có người nhập Family ID và gửi yêu cầu, họ sẽ xuất hiện ở đây.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={__a3_styles.card}>
            <View style={__a3_styles.person}>
              {item.applicant.avatarUrl ? (
                <Image source={{ uri: item.applicant.avatarUrl }} style={__a3_styles.avatar} />
              ) : (
                <View style={__a3_styles.avatarFallback}>
                  <Text style={__a3_styles.avatarEmoji}>👤</Text>
                </View>
              )}

              <View style={__a3_styles.personText}>
                <Text style={__a3_styles.name}>{item.applicant.displayName}</Text>
                {item.applicant.shortName ? (
                  <Text style={__a3_styles.meta}>Tên gọi: {item.applicant.shortName}</Text>
                ) : null}
                {item.applicant.phoneNumber ? (
                  <Text style={__a3_styles.meta}>📞 {item.applicant.phoneNumber}</Text>
                ) : null}
                {item.applicant.birthDate ? (
                  <Text style={__a3_styles.meta}>
                    🎂 {new Date(item.applicant.birthDate).toLocaleDateString("vi-VN")}
                  </Text>
                ) : null}
              </View>
            </View>

            {!!item.applicant.interests?.length && (
              <Text style={__a3_styles.info}>
                🌿 Sở thích: {item.applicant.interests.join(", ")}
              </Text>
            )}

            {!!item.message && (
              <View style={__a3_styles.messageBox}>
                <Text style={__a3_styles.messageLabel}>Lời nhắn</Text>
                <Text style={__a3_styles.message}>{item.message}</Text>
              </View>
            )}

            <Text style={__a3_styles.requested}>
              Gửi lúc: {new Date(item.requestedAt).toLocaleString("vi-VN")}
            </Text>

            <View style={__a3_styles.actions}>
              <BloomButton
                title={loadingId === item.uid ? "Đang xử lý…" : "Duyệt vào nhà"}
                onPress={() => approve(item)}
                disabled={!!loadingId}
                customStyle={__a3_styles.approve}
              />
              <BloomButton
                title="Từ chối"
                variant="outline"
                onPress={() => reject(item)}
                disabled={!!loadingId}
                customStyle={__a3_styles.reject}
                textStyle={__a3_styles.rejectText}
              />
            </View>
          </View>
        )}
      />
      </View>
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  pageBody: { flex: 1, marginTop: -24, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden", backgroundColor: COLORS.background },
  screen: { flex: 1, backgroundColor: COLORS.softSurface },
  header: {
    paddingTop: 55,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.primaryText },
  subtitle: { marginTop: 3, color: COLORS.secondaryText },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  person: { flexDirection: "row", alignItems: "center", gap: 12 },
  personText: { flex: 1 },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.accentBg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 22 },
  name: { fontSize: 18, fontWeight: "800", color: COLORS.primaryText },
  meta: { fontSize: 13, color: COLORS.secondaryText, marginTop: 2 },
  info: { marginTop: 12, color: COLORS.primaryText },
  messageBox: { marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: COLORS.softSurface },
  messageLabel: { fontSize: 12, fontWeight: "800", color: COLORS.primary },
  message: { marginTop: 4, color: COLORS.primaryText, lineHeight: 20 },
  requested: { fontSize: 11, color: COLORS.secondaryText, marginTop: 12 },
  actions: { flexDirection: "row", gap: 12, marginTop: 15 },
  approve: { flex: 1 },
  reject: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.destructive, minWidth: 112 },
  rejectText: { color: COLORS.destructive },
  empty: { alignItems: "center", padding: 45 },
  emptyEmoji: { fontSize: 42 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.primaryText, marginTop: 12 },
  emptyText: { textAlign: "center", color: COLORS.secondaryText, marginTop: 6, lineHeight: 20 },
}));
