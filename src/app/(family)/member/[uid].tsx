import { useBloomThemeRevision } from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../../components/ui/BloomText';
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import {
  BloomCard,
  BloomEmptyState,
  BloomInfoRow,
  BloomPill,
  BloomSectionHeader,
} from "../../../components/ui/BloomPageComponents";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useFamilyMembers } from "../../../hooks/family/useFamilyMembers";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


const roleLabel: Record<string, string> = {
  owner: "Người giữ nhà",
  admin: "Người giữ nhà",
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
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
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
      <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
        <BloomHeroHeader eyebrow="NGƯỜI TRONG NHÀ" title="Một gương mặt thân quen" subtitle="Bloom chưa tìm thấy người này trong mái nhà hiện tại." variant="profile" onBack={() => router.back()} compact roundedBottom />
        <View style={[__a3_styles.page, __a3_styles.pageBody]}>
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
      <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
        <BloomHeroHeader eyebrow="NGƯỜI TRONG NHÀ" title="Bloom đang mở câu chuyện…" subtitle="Một chút thôi, những điều người ấy đã chia sẻ sẽ hiện ra đây." variant="profile" onBack={() => router.back()} compact roundedBottom />
      </ScreenContainer>
    );
  }

  const displayName = member.shortName || member.displayName;

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <BloomHeroHeader eyebrow="NGƯỜI TRONG NHÀ" title={`${displayName} 🌷`} subtitle={`Một góc nhỏ của ${membership?.familyName || "gia đình mình"}.`} variant="profile" onBack={() => router.back()} compact roundedBottom />
      <ScrollView contentContainerStyle={[__a3_styles.content, __a3_styles.pageBody]} showsVerticalScrollIndicator={false}>
        <BloomCard tone="accent" style={__a3_styles.hero}>
          <View style={__a3_styles.avatarShell}>
            {member.avatarUrl ? (
              <Image source={{ uri: member.avatarUrl }} style={__a3_styles.avatar} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <Text style={__a3_styles.avatarInitial}>{member.displayName.slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <Text style={__a3_styles.name}>{member.displayName}</Text>
          {!!member.shortName && member.shortName !== member.displayName && (
            <Text style={__a3_styles.shortName}>Cả nhà gọi là {member.shortName}</Text>
          )}
          <View style={__a3_styles.pills}>
            <BloomPill icon="home-outline" label={membership?.familyName || "Gia đình mình"} />
            <BloomPill icon="shield-checkmark-outline" label={roleLabel[member.role] ?? "Thành viên"} />
            {isMe && <BloomPill icon="heart-outline" label="Là bạn đó 🌸" />}
          </View>
          {!!member.bio && <Text style={__a3_styles.bio}>{member.bio}</Text>}
        </BloomCard>

        <View style={__a3_styles.section}>
          <BloomSectionHeader
            title="Thông tin nhỏ xinh"
            subtitle="Những điều thành viên này đã chia sẻ với gia đình"
          />
          <BloomCard style={__a3_styles.infoCard}>
            <BloomInfoRow icon="call-outline" label="Số điện thoại" value={member.phoneNumber} />
            <View style={__a3_styles.divider} />
            <BloomInfoRow icon="calendar-outline" label="Ngày sinh" value={formatDate(member.birthDate)} />
            <View style={__a3_styles.divider} />
            <BloomInfoRow icon="person-outline" label="Giới tính" value={genderLabel[member.gender] ?? "Khác"} />
            <View style={__a3_styles.divider} />
            <BloomInfoRow icon="water-outline" label="Nhóm máu" value={member.bloodType} />
          </BloomCard>
        </View>

        <View style={__a3_styles.section}>
          <BloomSectionHeader
            title="Kết nối trong nhà"
            subtitle="Vai trò và thời điểm cùng bước vào tổ ấm"
          />
          <BloomCard style={__a3_styles.connectionCard}>
            <View style={__a3_styles.connectionIcon}>
              <Ionicons name="people-outline" size={23} color={__a3Colors.primary} />
            </View>
            <View style={__a3_styles.connectionCopy}>
              <Text style={__a3_styles.connectionLabel}>{roleLabel[member.role] ?? "Thành viên"}</Text>
              <Text style={__a3_styles.connectionText}>
                Cùng ở trong nhà từ {formatDate(member.joinedAt) || "một ngày thật đẹp"}.
              </Text>
            </View>
          </BloomCard>
        </View>

        <View style={__a3_styles.section}>
          <BloomSectionHeader title="Điều người ấy yêu thích" />
          {member.interests.length ? (
            <BloomCard style={__a3_styles.interestsCard}>
              <View style={__a3_styles.interests}>
                {member.interests.map((interest) => (
                  <View key={interest} style={__a3_styles.interestChip}>
                    <Ionicons name="sparkles-outline" size={14} color={__a3Colors.primary} />
                    <Text style={__a3_styles.interestText}>{interest}</Text>
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
          <BloomCard onPress={() => router.push("/profile")} style={__a3_styles.editCard}>
            <View style={__a3_styles.editIcon}>
              <Ionicons name="pencil-outline" size={20} color={__a3Colors.primary} />
            </View>
            <View style={__a3_styles.editCopy}>
              <Text style={__a3_styles.editTitle}>Muốn kể thêm về mình?</Text>
              <Text style={__a3_styles.editText}>Mở hồ sơ cá nhân để cập nhật những điều cả nhà được thấy.</Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={__a3Colors.secondaryText} />
          </BloomCard>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  page: { flex: 1 },
  pageBody: { marginTop: -16, paddingHorizontal: 16, paddingTop: 26, backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
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
}));
