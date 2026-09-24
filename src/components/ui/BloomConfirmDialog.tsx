import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/theme";

type BloomConfirmDialogProps = {
  visible: boolean;
  eyebrow?: string;
  title: string;
  message: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm?: () => void;
};

export function BloomConfirmDialog({
  visible,
  eyebrow = "FAMILY BLOOM",
  title,
  message,
  icon = "flower-outline",
  confirmLabel = "Xác nhận",
  cancelLabel = "Giữ lại",
  destructive = false,
  loading = false,
  confirmDisabled = false,
  onCancel,
  onConfirm,
}: BloomConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => !loading && onCancel()}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} disabled={loading} onPress={onCancel} />
        <View style={styles.dialog}>
          <View style={[styles.iconWrap, destructive && styles.iconWrapDanger]}>
            <Ionicons name={icon} size={28} color={destructive ? COLORS.destructive : COLORS.primary} />
          </View>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            <Pressable
              disabled={loading}
              onPress={onCancel}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            >
              <Ionicons name="heart-outline" size={17} color={COLORS.primaryText} />
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>

            {onConfirm ? (
              <Pressable
                disabled={loading || confirmDisabled}
                onPress={onConfirm}
                style={({ pressed }) => [
                  styles.confirmButton,
                  destructive && styles.confirmButtonDanger,
                  (confirmDisabled || loading) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons
                    name={destructive ? "trash-outline" : "checkmark-circle-outline"}
                    size={17}
                    color={COLORS.white}
                  />
                )}
                <Text style={styles.confirmText}>{loading ? "Đang xử lý…" : confirmLabel}</Text>
              </Pressable>
            ) : null}
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
    paddingHorizontal: 26,
    backgroundColor: "rgba(70, 51, 59, 0.34)",
  },
  dialog: {
    width: "100%",
    maxWidth: 430,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#5F3E4A",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F5",
    marginBottom: 14,
  },
  iconWrapDanger: { backgroundColor: "#FFF1F2" },
  eyebrow: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900", letterSpacing: 1.1 },
  title: { marginTop: 5, color: COLORS.primaryText, fontSize: 21, lineHeight: 27, fontWeight: "900" },
  message: { marginTop: 9, color: COLORS.secondaryText, fontSize: 13.5, lineHeight: 20.5, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10, marginTop: 22 },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#FFF7FA",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelText: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  confirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: COLORS.primary,
  },
  confirmButtonDanger: { backgroundColor: COLORS.destructive },
  confirmText: { color: COLORS.white, fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
