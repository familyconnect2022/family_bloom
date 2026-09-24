import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import {
  BloomBackButton,
  BloomCard,
  BloomEmptyState,
  BloomInfoRow,
  BloomPageHeader,
  BloomPill,
  BloomSectionHeader,
} from "../../components/ui/BloomPageComponents";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useFamilyMembers } from "../../hooks/useFamilyMembers";

const roleLabel: Record<string, string> = {
  owner: "Chủ nhà",
  admin: "Quản trị viên",
  member: "Thành viên",
  child: "Thành viên nhỏ",
};

const genderLabel: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN");
};

export default function MemberDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uid?: string }>();
  const uid = Array.isArray(params.uid) ? params.uid[0] : params.uid;
  const { user, userProfile, activeFamilyId, families } = useAuth();
  const { members, loading } = useFamilyMembers(activeFamilyId);

  const member = useMemo(() => members.find((item) => item.uid === uid) ?? null, [members, uid]);
  const membership = families.find((item) => item.familyId === activeFamilyId);
  const isMe = !!uid && uid === user?.uid;

  if (!member && !loading) {
    return (
      <ScreenContainer>
        <View style={styles.page}>
          <BloomPageHeader
            eyebrow="Thành viên"
            title="Người nhà này đã rời khỏi danh sách"
            subtitle="Thông tin có thể đã thay đổi trong lúc bạn đang xem."
            right={<BloomBackButton onPress={() => router.back()} />}
          />
          <BloomEmptyState
            icon="person-outline"
            title="Bloom chưa tìm thấy thành viên này"
            description="Quay lại danh sách thành viên để xem những người đang ở trong nhà nhé."
          />
        </View>
      </ScreenContainer>
    );
  }

  if (!member) {
    return (
      <ScreenContainer>
        <View style={styles.page}>
          <BloomPageHeader
            eyebrow="Thành viên"
            title="Bloom đang mở hồ sơ…"
            subtitle="Một chút thôi, đang tìm người nhà của bạn."
            right={<BloomBackButton onPress={() => router.back()} />}
          />
        </View>
      </ScreenContainer>
    );
  }

  const displayName = member.shortName || member.displayName;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomPageHeader
          eyebrow="Người trong nhà"
          title={`${displayName} 🌷`}
          subtitle={`Một mảnh ghép của ${membership?.familyName || "gia đình mình"}.`}
          right={<BloomBackButton onPress={() => router.back()} />}
        />

        <BloomCard tone="accent" style={styles.hero}>
          <View style={styles.avatarShell}>
            {member.avatarUrl ? (
              <Image source={{ uri: member.avatarUrl }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <Text style={styles.avatarInitial}>{member.displayName.slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.name}>{member.displayName}</Text>
          {!!member.shortName && member.shortName !== member.displayName && (
            <Text style={styles.shortName}>Cả nhà gọi là {member.shortName}</Text>
          )}
          <View style={styles.pills}>
            <BloomPill icon="home-outline" label={membership?.familyName || "Gia đình mình"} />
            <BloomPill icon="shield-checkmark-outline" label={roleLabel[member.role] ?? "Thành viên"} />
            {isMe && <BloomPill icon="heart-outline" label="Là bạn đó 🌸" />}
          </View>
          {!!member.bio && <Text style={styles.bio}>{member.bio}</Text>}
        </BloomCard>

        <View style={styles.section}>
          <BloomSectionHeader
            title="Thông tin nhỏ xinh"
            subtitle="Những điều thành viên này đã chia sẻ với gia đình"
          />
          <BloomCard style={styles.infoCard}>
            <BloomInfoRow icon="call-outline" label="Số điện thoại" value={member.phoneNumber} />
            <View style={styles.divider} />
            <BloomInfoRow icon="calendar-outline" label="Ngày sinh" value={formatDate(member.birthDate)} />
            <View style={styles.divider} />
            <BloomInfoRow icon="person-outline" label="Giới tính" value={genderLabel[member.gender] ?? "Khác"} />
            <View style={styles.divider} />
            <BloomInfoRow icon="water-outline" label="Nhóm máu" value={member.bloodType} />
          </BloomCard>
        </View>

        <View style={styles.section}>
          <BloomSectionHeader
            title="Kết nối trong nhà"
            subtitle="Vai trò và thời điểm cùng bước vào tổ ấm"
          />
          <BloomCard style={styles.connectionCard}>
            <View style={styles.connectionIcon}>
              <Ionicons name="people-outline" size={23} color={COLORS.primary} />
            </View>
            <View style={styles.connectionCopy}>
              <Text style={styles.connectionLabel}>{roleLabel[member.role] ?? "Thành viên"}</Text>
              <Text style={styles.connectionText}>
                Cùng ở trong nhà từ {formatDate(member.joinedAt) || "một ngày thật đẹp"}.
              </Text>
            </View>
          </BloomCard>
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="Điều người ấy yêu thích" />
          {member.interests.length ? (
            <BloomCard style={styles.interestsCard}>
              <View style={styles.interests}>
                {member.interests.map((interest) => (
                  <View key={interest} style={styles.interestChip}>
                    <Ionicons name="sparkles-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </BloomCard>
          ) : (
            <BloomEmptyState
              icon="heart-outline"
              title="Chưa kể về sở thích"
              description="Một ngày nào đó, nơi này sẽ đầy những điều người ấy yêu quý 🌷"
              compact
            />
          )}
        </View>

        {isMe && (
          <BloomCard onPress={() => router.push("/profile")} style={styles.editCard}>
            <View style={styles.editIcon}>
              <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.editCopy}>
              <Text style={styles.editTitle}>Muốn kể thêm về mình?</Text>
              <Text style={styles.editText}>Mở hồ sơ cá nhân để cập nhật những điều cả nhà được thấy.</Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={COLORS.secondaryText} />
          </BloomCard>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingBottom: 24 },
  hero: { alignItems: "center", marginBottom: 26 },
  avatarShell: {
    width: 104,
    height: 104,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderWidth: 5,
    borderColor: "rgba(255,255,255,0.9)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: "100%", height: "100%" },
  avatarInitial: { color: COLORS.primaryText, fontSize: 36, fontWeight: "900" },
  name: { marginTop: 14, color: COLORS.primaryText, fontSize: 24, fontWeight: "900", textAlign: "center" },
  shortName: { marginTop: 4, color: COLORS.secondaryText, fontSize: 12.5, fontWeight: "700" },
  pills: { marginTop: 13, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 7 },
  bio: { marginTop: 15, color: COLORS.primaryText, fontSize: 13.5, lineHeight: 20, textAlign: "center" },
  section: { marginBottom: 24 },
  infoCard: { paddingVertical: 4 },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 50 },
  connectionCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  connectionIcon: { width: 46, height: 46, borderRadius: 17, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  connectionCopy: { flex: 1 },
  connectionLabel: { color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900" },
  connectionText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
  interestsCard: { paddingVertical: 14 },
  interests: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  interestChip: { minHeight: 38, paddingHorizontal: 12, borderRadius: 14, backgroundColor: COLORS.softSurface, flexDirection: "row", alignItems: "center", gap: 6 },
  interestText: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "800" },
  editCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  editIcon: { width: 43, height: 43, borderRadius: 16, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  editCopy: { flex: 1 },
  editTitle: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  editText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
});
