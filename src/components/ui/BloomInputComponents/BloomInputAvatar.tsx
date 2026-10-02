import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMediaUpload } from "../../../hooks/useMediaUpload";
import { BloomAvatarButton } from "../BloomButtonComponents";
import { COLORS } from "./shared";

export interface BloomInputAvatarProps {
  label?: string;
  value?: string | null;
  fallbackText?: string;
  optional?: boolean;
  disabled?: boolean;
  size?: number;
  onChange: (uri: string | null) => void;
}

/**
 * Form-level avatar input. It only selects/removes a local/remote URI.
 * Upload/persistence stays in the owning feature so avatar remains optional
 * and can never block saving the rest of the form.
 */
export const BloomInputAvatar: React.FC<BloomInputAvatarProps> = ({
  label = "Ảnh đại diện",
  value,
  fallbackText = "Thành viên",
  optional = true,
  disabled = false,
  size = 86,
  onChange,
}) => {
  const { handleSelectAvatar } = useMediaUpload();

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}{optional ? " (không bắt buộc)" : ""}
      </Text>
      <View style={styles.row}>
        <View style={styles.avatarWrap}>
          <BloomAvatarButton
            source={value ? { uri: value } : null}
            text={fallbackText || "Thành viên"}
            size={size}
            disabled={disabled}
            showOnlineIndicator={false}
            onPress={() => {
              if (!disabled) void handleSelectAvatar((uri) => onChange(uri));
            }}
            customStyle={styles.avatar}
          />
          <View pointerEvents="none" style={styles.cameraBadge}>
            <Ionicons name="camera" size={15} color={COLORS.white} />
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>{value ? "Đã chọn ảnh" : "Chưa chọn ảnh"}</Text>
          <Text style={styles.description}>
            {value
              ? "Chạm avatar để chọn ảnh khác. Ảnh là tùy chọn và không ảnh hưởng việc lưu thông tin."
              : "Chạm avatar để chọn ảnh. Bạn có thể để trống và bổ sung sau."}
          </Text>
          {!!value && (
            <Pressable
              disabled={disabled}
              onPress={() => onChange(null)}
              hitSlop={8}
              style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
            >
              <Ionicons name="close-circle-outline" size={16} color={COLORS.secondaryText} />
              <Text style={styles.removeText}>Bỏ ảnh</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 15 },
  label: { marginBottom: 8, color: COLORS.primaryText, fontSize: 11.5, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarWrap: { position: "relative" },
  avatar: {
    borderWidth: 0,
    backgroundColor: COLORS.softSurface,
    shadowColor: "#E8C9D4",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  title: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  description: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  removeButton: { alignSelf: "flex-start", marginTop: 7, flexDirection: "row", alignItems: "center", gap: 4 },
  removeText: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "700" },
  pressed: { opacity: 0.6 },
});
