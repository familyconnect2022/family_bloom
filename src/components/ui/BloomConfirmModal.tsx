import { useA3Theme } from '../../appearance3/useAppearance3';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { BloomText as Text } from './BloomText';
import { COLORS } from "../../constants/theme";
import { BLOOM_SUPPER } from "../../constants/bloomSupper";
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


type BloomConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  confirmDisabled?: boolean;
  onConfirm?: () => void;
  onCancel: () => void;
};

export function BloomConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Đồng ý",
  cancelLabel = "Để sau",
  destructive = false,
  icon = destructive ? "trash-outline" : "flower-outline",
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: BloomConfirmModalProps) {
  const __a3_styles = useA3LegacyStyles(styles);

  const { colors } = useA3Theme();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={[__a3_styles.overlay, { backgroundColor: colors.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={[__a3_styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <View pointerEvents="none" style={__a3_styles.glowOne} />
          <View pointerEvents="none" style={__a3_styles.glowTwo} />
          <View style={[__a3_styles.iconWrap, destructive && __a3_styles.iconWrapDestructive, { backgroundColor: colors.surface }]}>
            <Ionicons name={icon} size={24} color={destructive ? colors.destructive : colors.primary} />
          </View>
          <Text appearanceTone="primaryText" style={__a3_styles.title}>{title}</Text>
          <Text appearanceTone="secondaryText" style={__a3_styles.message}>{message}</Text>
          <View style={__a3_styles.actions}>
            <Pressable onPress={onCancel} style={({ pressed }) => [__a3_styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && __a3_styles.pressed]}>
              <Text appearanceTone="primaryText" style={__a3_styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            {onConfirm && (
              <Pressable
                disabled={confirmDisabled}
                onPress={onConfirm}
                style={({ pressed }) => [
                  __a3_styles.confirmButton,
                  destructive && __a3_styles.confirmButtonDestructive, { backgroundColor: destructive ? colors.destructive : colors.primary },
                  confirmDisabled && __a3_styles.disabled,
                  pressed && __a3_styles.pressed,
                ]}
              >
                <Text appearanceTone="onPrimary" style={__a3_styles.confirmText}>{confirmLabel}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: BLOOM_SUPPER.modal.backdrop,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: BLOOM_SUPPER.radius.modal,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    backgroundColor: BLOOM_SUPPER.surface.card,
    borderWidth: 1,
    borderColor: BLOOM_SUPPER.border.strong,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 9 },
    elevation: 12,
    overflow: "hidden",
  },
  glowOne: { position: "absolute", width: 170, height: 170, borderRadius: 85, backgroundColor: BLOOM_SUPPER.modal.glowPink, right: -70, top: -90 },
  glowTwo: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: BLOOM_SUPPER.modal.glowGold, left: -50, bottom: -55 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 15,
  },
  iconWrapDestructive: { backgroundColor: COLORS.surface },
  title: { color: COLORS.primaryText, fontSize: 20, fontWeight: "900", lineHeight: 26 },
  message: { marginTop: 9, color: COLORS.secondaryText, fontSize: 13.5, lineHeight: 20 },
  actions: { marginTop: 22, flexDirection: "row", gap: 12 },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BLOOM_SUPPER.border.card,
    backgroundColor: COLORS.surface,
  },
  confirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  confirmButtonDestructive: { backgroundColor: COLORS.destructive },
  cancelText: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  confirmText: { color: COLORS.onPrimary, fontSize: 13.5, fontWeight: "900" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
}));
