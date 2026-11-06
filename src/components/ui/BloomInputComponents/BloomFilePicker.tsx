import { useBloomThemeRevision } from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import * as Haptics from "expo-haptics";
import React from "react";
import { Image, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BloomText as Text } from '../BloomText';
import { BloomIconProp, COLORS, renderIcon, sharedInputStyles } from "./shared";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


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
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
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
        <Pressable onPress={handleSimulatePick} style={__a3_styles.dropZone}>
          <View style={__a3_styles.dropZoneCircle}>{renderIcon(uploadIcon, 26, __a3Colors.primary)}</View>
          <Text style={__a3_styles.dropZoneTitle}>Tải ảnh / tài liệu lên</Text>
          <Text style={__a3_styles.dropZoneSub}>PNG, JPG, PDF (Tối đa 10MB)</Text>
        </Pressable>
      ) : (
        <View style={__a3_styles.thumbnailCard}>
          {file.type === "image" ? (
            <Image source={{ uri: file.uri }} style={__a3_styles.thumbnailImage} />
          ) : (
            <View style={__a3_styles.fileIconBox}>{renderIcon(fileIcon, 28, __a3Colors.primary)}</View>
          )}
          <View style={__a3_styles.fileInfo}>
            <Text style={__a3_styles.fileName} numberOfLines={1}>
              {file.name}
            </Text>
            {file.size && <Text style={__a3_styles.fileSize}>{file.size}</Text>}
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onRemoveFile();
            }}
            style={__a3_styles.removeFileBtn}
          >
            {renderIcon("close-circle", 24, __a3Colors.destructive)}
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = createBloomStyles(() => StyleSheet.create({
  dropZone: {
    height: 120,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.surface,
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
}));
