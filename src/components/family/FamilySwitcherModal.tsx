import { useBloomThemeRevision , useBloomColorsRevision, useBloomTypographyRevision} from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { memo, useCallback, useMemo } from "react";
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../ui/BloomText';
import { COLORS, SPACING } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import type { UserFamilyMembership } from "../../types";
import { BloomButton } from "../ui/BloomButtonComponents";
import { BloomFullScreenFlow } from "../ui/BloomFullScreenFlow";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


const ROLE_LABEL: Record<string, string> = {
  owner: "Người giữ nhà",
  admin: "Người giữ nhà",
  member: "Thành viên",
  child: "Thành viên nhỏ",
};

type Props = {
  visible: boolean;
  onClose: () => void;
};

function FamilyRow({
  item,
  active,
  busy,
  onPress,
}: {
  item: UserFamilyMembership;
  active: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [__a3_styles.familyRow, active && __a3_styles.familyRowActive, pressed && !busy && __a3_styles.pressed]}
    >
      <View style={[__a3_styles.familyIcon, active && __a3_styles.familyIconActive]}>
        <Ionicons name={active ? "home" : "home-outline"} size={20} color={active ? __a3Colors.white : __a3Colors.primary} />
      </View>
      <View style={__a3_styles.familyCopy}>
        <Text style={__a3_styles.familyName} numberOfLines={1}>{item.familyName}</Text>
        <Text style={__a3_styles.familyRole}>{ROLE_LABEL[item.role] ?? "Thành viên"}</Text>
      </View>
      {active ? (
        <View style={__a3_styles.activePill}>
          <Ionicons name="checkmark" size={13} color={__a3Colors.primary} />
          <Text style={__a3_styles.activePillText}>Đang xem</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={__a3Colors.secondaryText} />
      )}
    </Pressable>
  );
}

/**
 * Lightweight family picker. It reads ONLY the user membership reverse-index already
 * held by AuthContext; opening this modal never starts listeners for inactive families.
 */
export const FamilySwitcherModal = memo(function FamilySwitcherModal({ visible, onClose }: Props) {
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  const { families, activeFamilyId, familyTransition, switchFamily } = useAuth();
  const busy = !!familyTransition;
  const ordered = useMemo(() => [...families].sort((a, b) => {
    if (a.familyId === activeFamilyId) return -1;
    if (b.familyId === activeFamilyId) return 1;
    return b.joinedAt.localeCompare(a.joinedAt) || a.familyName.localeCompare(b.familyName, "vi");
  }), [activeFamilyId, families]);

  const choose = useCallback(async (membership: UserFamilyMembership) => {
    if (busy) return;
    if (membership.familyId === activeFamilyId) {
      onClose();
      return;
    }
    // switchFamily synchronously requests the global transition overlay before its first await.
    // Close this native Modal immediately so it cannot visually cover the splash while
    // membership verification is running on the network.
    const switching = switchFamily(membership.familyId);
    onClose();
    const ok = await switching;
    if (ok) router.navigate("/(tabs)" as never);
  }, [activeFamilyId, busy, onClose, router, switchFamily]);

  const openMemberships = useCallback((mode: "manage" | "join" | "create") => {
    onClose();
    router.push({ pathname: "/family-memberships", params: { mode } } as never);
  }, [onClose, router]);

  return (
    <BloomFullScreenFlow
      visible={visible}
      eyebrow="NHỮNG NGÔI NHÀ CỦA BẠN"
      title="Bạn muốn ghé nhà nào?"
      subtitle="Mỗi ngôi nhà có một nhịp riêng. Bloom sẽ đưa bạn về đúng nơi mình muốn ghé, thật nhẹ nhàng và liền mạch."
      variant="family"
      onBack={onClose}
      backDisabled={busy}
    >
      <View style={__a3_styles.fullBody}>
        <FlatList
          data={ordered}
          keyExtractor={(item) => item.familyId}
          renderItem={({ item }) => (
            <FamilyRow
              item={item}
              active={item.familyId === activeFamilyId}
              busy={busy}
              onPress={() => void choose(item)}
            />
          )}
          style={__a3_styles.list}
          contentContainerStyle={__a3_styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews
        />

        <View style={__a3_styles.actions}>
          <BloomButton title="Tham gia nhà khác" variant="outline" icon="person-add-outline" onPress={() => openMemberships("join")} disabled={busy} />
          <BloomButton title="Tạo nhà mới" variant="transparent" icon="add-circle-outline" onPress={() => openMemberships("create")} disabled={busy} />
          <Pressable onPress={() => openMemberships("manage")} disabled={busy} style={__a3_styles.manageLink}>
            <Text style={__a3_styles.manageLinkText}>Quản lý những ngôi nhà của tôi</Text>
          </Pressable>
        </View>
      </View>
    </BloomFullScreenFlow>
  );
});

const styles = createBloomStyles(() => StyleSheet.create({
  fullBody: { flex: 1, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 },
  list: { flex: 1 },
  listContent: { gap: SPACING.sm, paddingTop: SPACING.xs, paddingBottom: SPACING.md },
  familyRow: { minHeight: 72, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 13, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: COLORS.surface },
  familyRowActive: { backgroundColor: COLORS.accentBg, borderColor: COLORS.border },
  familyIcon: { width: 42, height: 42, borderRadius: 16, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  familyIconActive: { backgroundColor: COLORS.primary },
  familyCopy: { flex: 1, minWidth: 0 },
  familyName: { color: COLORS.primaryText, fontSize: 15, fontWeight: "800" },
  familyRole: { marginTop: 3, color: COLORS.secondaryText, fontSize: 12.5, fontWeight: "600" },
  activePill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: COLORS.surface, paddingHorizontal: 9, paddingVertical: 6 },
  activePillText: { color: COLORS.primary, fontSize: 11, fontWeight: "800" },
  actions: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.md, gap: SPACING.md, marginTop: SPACING.md },
  manageLink: { alignSelf: "center", paddingHorizontal: 12, paddingVertical: 8 },
  manageLinkText: { color: COLORS.primary, fontSize: 12.5, fontWeight: "800" },
  pressed: { opacity: 0.72 },
}));
