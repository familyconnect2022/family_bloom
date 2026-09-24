import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/theme";

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
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  destructive = false,
  icon = destructive ? "trash-outline" : "flower-outline",
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: BloomConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.card}>
          <View style={[styles.iconWrap, destructive && styles.iconWrapDestructive]}>
            <Ionicons name={icon} size={24} color={destructive ? COLORS.destructive : COLORS.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
            {onConfirm && (
              <Pressable
                disabled={confirmDisabled}
                onPress={onConfirm}
                style={({ pressed }) => [
                  styles.confirmButton,
                  destructive && styles.confirmButtonDestructive,
                  confirmDisabled && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(64,44,53,0.34)",
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#6D4C5A",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 12,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.softSurface,
    marginBottom: 15,
  },
  iconWrapDestructive: { backgroundColor: "#FFF0F3" },
  title: { color: COLORS.primaryText, fontSize: 20, fontWeight: "900", lineHeight: 26 },
  message: { marginTop: 9, color: COLORS.secondaryText, fontSize: 13.5, lineHeight: 20 },
  actions: { marginTop: 22, flexDirection: "row", gap: 10 },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
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
  confirmText: { color: COLORS.white, fontSize: 13.5, fontWeight: "900" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7 },
});
