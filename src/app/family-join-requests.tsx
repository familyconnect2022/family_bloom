import { useEffect, useState } from "react";
import { Alert, FlatList, Image, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { familyJoinService } from "@/services/family/familyJoinService";
import { useAuth } from "@/context/AuthContext";
import type { FamilyJoinRequest } from "@/types";
import { COLORS } from "@/constants/theme";
import { BloomButton, BloomIconButton } from "@/components/ui/BloomButtonComponents";
import { useBloomToast } from "@/components/ui/BloomToast";
import { parseAppError } from "@/constants/errorConstants";

/** Trang chỉ dành cho admin; route vẫn được bảo vệ thêm bởi Rules/service. */
export default function FamilyJoinRequestsScreen() {
  const router = useRouter();
  const { user, userProfile, families } = useAuth();
  const { showToast } = useBloomToast();
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
    Alert.alert(
      "Từ chối yêu cầu",
      `Bạn có chắc muốn từ chối ${item.applicant.displayName} không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Từ chối",
          style: "destructive",
          onPress: async () => {
            if (!user || !familyId) return;
            setLoadingId(item.uid);

            try {
              await familyJoinService.reject(familyId, item, user.uid);
              showToast({ message: "Đã từ chối yêu cầu.", duration: 2500 });
            } catch (error) {
              showToast({ ...parseAppError(error), duration: 3500 });
            } finally {
              setLoadingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <BloomIconButton icon="chevron-back" onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.title}>Duyệt thành viên</Text>
          <Text style={styles.subtitle}>{items.length} yêu cầu đang chờ</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌷</Text>
            <Text style={styles.emptyTitle}>Chưa có yêu cầu mới</Text>
            <Text style={styles.emptyText}>
              Khi có người nhập Family ID và gửi yêu cầu, họ sẽ xuất hiện ở đây.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.person}>
              {item.applicant.avatarUrl ? (
                <Image source={{ uri: item.applicant.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarEmoji}>👤</Text>
                </View>
              )}

              <View style={styles.personText}>
                <Text style={styles.name}>{item.applicant.displayName}</Text>
                {item.applicant.shortName ? (
                  <Text style={styles.meta}>Tên gọi: {item.applicant.shortName}</Text>
                ) : null}
                {item.applicant.phoneNumber ? (
                  <Text style={styles.meta}>📞 {item.applicant.phoneNumber}</Text>
                ) : null}
                {item.applicant.birthDate ? (
                  <Text style={styles.meta}>
                    🎂 {new Date(item.applicant.birthDate).toLocaleDateString("vi-VN")}
                  </Text>
                ) : null}
              </View>
            </View>

            {!!item.applicant.interests?.length && (
              <Text style={styles.info}>
                🌿 Sở thích: {item.applicant.interests.join(", ")}
              </Text>
            )}

            {!!item.message && (
              <View style={styles.messageBox}>
                <Text style={styles.messageLabel}>Lời nhắn</Text>
                <Text style={styles.message}>{item.message}</Text>
              </View>
            )}

            <Text style={styles.requested}>
              Gửi lúc: {new Date(item.requestedAt).toLocaleString("vi-VN")}
            </Text>

            <View style={styles.actions}>
              <BloomButton
                title={loadingId === item.uid ? "Đang xử lý…" : "Duyệt vào nhà"}
                onPress={() => approve(item)}
                disabled={!!loadingId}
                customStyle={styles.approve}
              />
              <BloomButton
                title="Từ chối"
                variant="outline"
                onPress={() => reject(item)}
                disabled={!!loadingId}
                customStyle={styles.reject}
                textStyle={styles.rejectText}
              />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.softSurface },
  header: {
    paddingTop: 55,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.white,
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
    backgroundColor: COLORS.white,
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
  actions: { flexDirection: "row", gap: 8, marginTop: 15 },
  approve: { flex: 1 },
  reject: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.destructive, minWidth: 112 },
  rejectText: { color: COLORS.destructive },
  empty: { alignItems: "center", padding: 45 },
  emptyEmoji: { fontSize: 42 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.primaryText, marginTop: 12 },
  emptyText: { textAlign: "center", color: COLORS.secondaryText, marginTop: 6, lineHeight: 20 },
});
