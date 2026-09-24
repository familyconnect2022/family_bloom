import * as Haptics from "expo-haptics";
import React from "react";
import { Image, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { BloomIconProp, COLORS, renderIcon, sharedInputStyles } from "./shared";

export interface SelectedFile {
  uri: string;
  name: string;
  size?: string;
  type?: "image" | "file";
}

export interface BloomFilePickerProps {
  label?: string;
  file?: SelectedFile | null;
  uploadIcon?: BloomIconProp;
  fileIcon?: BloomIconProp;
  onSelectFile: (file: SelectedFile) => void;
  onRemoveFile: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const BloomFilePicker: React.FC<BloomFilePickerProps> = ({
  label,
  file,
  uploadIcon = "cloud-upload-outline",
  fileIcon = "document-text",
  onSelectFile,
  onRemoveFile,
  containerStyle,
}) => {
  const handleSimulatePick = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSelectFile({
      uri: "https://picsum.photos/200/200",
      name: "avatar_cute_bloom.png",
      size: "2.4 MB",
      type: "image",
    });
  };

  return (
    <View style={[sharedInputStyles.inputWrapper, containerStyle]}>
      {label && <Text style={sharedInputStyles.inputLabel}>{label}</Text>}

      {!file ? (
        <Pressable onPress={handleSimulatePick} style={styles.dropZone}>
          <View style={styles.dropZoneCircle}>{renderIcon(uploadIcon, 26, COLORS.primary)}</View>
          <Text style={styles.dropZoneTitle}>Tải ảnh / tài liệu lên</Text>
          <Text style={styles.dropZoneSub}>PNG, JPG, PDF (Tối đa 10MB)</Text>
        </Pressable>
      ) : (
        <View style={styles.thumbnailCard}>
          {file.type === "image" ? (
            <Image source={{ uri: file.uri }} style={styles.thumbnailImage} />
          ) : (
            <View style={styles.fileIconBox}>{renderIcon(fileIcon, 28, COLORS.primary)}</View>
          )}
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {file.name}
            </Text>
            {file.size && <Text style={styles.fileSize}>{file.size}</Text>}
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onRemoveFile();
            }}
            style={styles.removeFileBtn}
          >
            {renderIcon("close-circle", 24, COLORS.destructive)}
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dropZone: {
    height: 120,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    backgroundColor: COLORS.softSurface,
    justifyContent: "center",
    alignItems: "center",
  },
  dropZoneCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accentBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  dropZoneTitle: { fontSize: 14, fontWeight: "700", color: COLORS.primaryText },
  dropZoneSub: { fontSize: 12, color: COLORS.secondaryText, marginTop: 2 },
  thumbnailCard: {
    height: 72,
    borderRadius: 18,
    backgroundColor: COLORS.softSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  thumbnailImage: { width: 52, height: 52, borderRadius: 12 },
  fileIconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.accentBg,
    justifyContent: "center",
    alignItems: "center",
  },
  fileInfo: { flex: 1, marginLeft: 12 },
  fileName: { fontSize: 14, fontWeight: "700", color: COLORS.primaryText },
  fileSize: { fontSize: 12, color: COLORS.secondaryText, marginTop: 2 },
  removeFileBtn: { padding: 6 },
});
