import { useBloomThemeRevision } from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../BloomText';
import { useBloomToast } from "../BloomToast";
import { BloomAvatarButton } from "../BloomButtonComponents";
import { AvatarCropEditor, type AvatarSourcePhoto } from "./AvatarCropEditor";
import { AvatarSourceSheet, type AvatarPickerChoice } from "./AvatarSourceSheet";
import { AvatarUploadFrame, type AvatarUploadVisualState } from "./AvatarUploadFrame";
import { avatarPickerActivity } from "../../../services/media/avatarPickerActivity";
import { COLORS } from "./shared";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


export interface BloomInputAvatarProps {
  label?: string;
  value?: string | null;
  fallbackText?: string;
  optional?: boolean;
  disabled?: boolean;
  size?: number;
  centered?: boolean;
  /** Portrait-only mode for narrow CV rows; hide helper text beside the photo. */
  compact?: boolean;
  upload?: AvatarUploadVisualState;
  /** A Firebase UID + optional family/person key; never share pending picker results across accounts. */
  pickerScope?: string;
  onRetry?: () => void;
  onChange: (uri: string | null) => void;
}

/** Picker never launches the Android crop Activity. Each native result gets
 * rendered immediately, then the optional in-app crop persists real 512px JPEG.
 */
export const BloomInputAvatar: React.FC<BloomInputAvatarProps> = ({
  label = "Ảnh đại diện", value, fallbackText = "Thành viên", optional = true,
  disabled = false, size = 108, centered = false, compact = false, upload, pickerScope, onRetry, onChange,
}) => {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const { showToast } = useBloomToast();
  const [preview, setPreview] = useState<string | null>(value ?? null);
  const [photo, setPhoto] = useState<AvatarSourcePhoto | null>(null);
  const [sourceSheetVisible, setSourceSheetVisible] = useState(false);
  const [revision, setRevision] = useState(0);
  const beforeCrop = useRef<string | null>(null);
  const busy = useRef(false);
  const latest = useRef(0);
  // Local user choice must outrank a late parent/Firestore snapshot.
  const hasLocalSelection = useRef(false);
  const intentKey = pickerScope ? `fb:avatar-picker-intent:v1:${pickerScope}` : null;
  // The normal callback is always primary. Recover only an interrupted Android
  // picker carrying an intent for THIS identity, never a global stale result.
  useEffect(() => {
    if (Platform.OS !== "android" || !intentKey) return;
    let live = true;
    const recoveryTicket = latest.current;
    void (async () => {
      const raw = await AsyncStorage.getItem(intentKey);
      if (!live || !raw) return;
      const startedAt = Number(raw);
      if (!Number.isFinite(startedAt) || Date.now() - startedAt > 10 * 60_000) {
        await AsyncStorage.removeItem(intentKey);
        return;
      }
      // Do not consume a result while the same mounted component is picking.
      if (busy.current || avatarPickerActivity.isPicking()) return;
      const result = await ImagePicker.getPendingResultAsync();
      if (!live || latest.current !== recoveryTicket || avatarPickerActivity.isPicking()) return;
      await AsyncStorage.removeItem(intentKey);
      if (!result || !("assets" in result) || result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri || !asset.width || !asset.height) return;
      beforeCrop.current = value ?? null;
      apply(asset.uri);
      setPhoto({ uri: asset.uri, width: asset.width, height: asset.height });
    })().catch(() => undefined);
    return () => { live = false; };
    // Only begin recovery for a newly mounted identity; parent preview changes
    // must not re-consume a pending Android result.
  }, [intentKey]);
  // Reset local choice only on an identity/scope change, never on a stale
  // Firestore snapshot from the same editing session.
  useEffect(() => {
    hasLocalSelection.current = false;
    setPreview(value ?? null);
    setPhoto(null);
  }, [pickerScope]);
  useEffect(() => {
    if (!busy.current && !hasLocalSelection.current) setPreview(value ?? null);
  }, [value]);
  const apply = useCallback((uri: string | null) => {
    hasLocalSelection.current = true;
    setPreview(uri);
    setRevision((old) => old + 1);
    onChange(uri);
  }, [onChange]);
  const select = async (choice: AvatarPickerChoice) => {
    setSourceSheetVisible(false);
    if (disabled || busy.current) return;
    busy.current = true;
    const ticket = ++latest.current;
    const endPickerSession = avatarPickerActivity.begin();
    try {
      if (intentKey) await AsyncStorage.setItem(intentKey, String(Date.now())).catch(() => undefined);
      if (choice === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showToast({ type: "warning", title: "Chưa có quyền máy ảnh", message: "Cho phép Family Bloom dùng máy ảnh trong cài đặt điện thoại rồi thử lại." });
          return;
        }
      }
      const pickerOptions = { mediaTypes: ["images"] as ["images"], allowsEditing: false,
        allowsMultipleSelection: false, exif: false, quality: 1 };
      const result = choice === "camera"
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);
      if (ticket !== latest.current || result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri || !asset.width || !asset.height) {
        showToast({ type: "warning", title: "Chưa nhận được ảnh", message: "Bạn hãy thử chọn ảnh khác." });
        return;
      }
      beforeCrop.current = preview;
      // Native picker resolved: update the user-visible image BEFORE crop or any upload.
      apply(asset.uri);
      setPhoto({ uri: asset.uri, width: asset.width, height: asset.height });
    } catch (error) {
      showToast({ type: "error", title: "Không mở được ảnh", message: "Bạn hãy thử lại hoặc chọn ảnh khác nhé." });
    } finally {
      busy.current = false;
      endPickerSession();
      if (intentKey) void AsyncStorage.removeItem(intentKey).catch(() => undefined);
    }
  };
  const cancelCrop = () => {
    setPhoto(null);
    apply(beforeCrop.current);
  };
  const finishCrop = (uri: string) => {
    setPhoto(null);
    apply(uri);
  };
  return (
    <View style={[__a3_styles.wrapper, centered && __a3_styles.centered, compact && __a3_styles.compact]}>
      {!!label && <Text style={__a3_styles.label}>{label}{optional ? " (không bắt buộc)" : ""}</Text>}
      <View style={[__a3_styles.row, centered && __a3_styles.column]}>
        <View style={__a3_styles.avatarWrap}>
          <AvatarUploadFrame size={size} upload={upload} onRetry={onRetry}>
            <BloomAvatarButton source={preview ? { uri: preview } : null} previewRevision={revision}
              text={fallbackText} size={size} disabled={disabled} showOnlineIndicator={false}
              onPress={() => setSourceSheetVisible(true)} shape="square" customStyle={__a3_styles.avatar}/>
          </AvatarUploadFrame>
          <Pressable accessibilityRole="button" accessibilityLabel="Thay ảnh đại diện"
            disabled={disabled} onPress={() => setSourceSheetVisible(true)} style={__a3_styles.cameraBadge}>
            <Ionicons name="camera" size={16} color="white"/>
          </Pressable>
        </View>
        {!compact && <View style={[__a3_styles.copy, centered && __a3_styles.centerCopy]}>
          <Text style={__a3_styles.title}>{preview ? "Ảnh đã chọn" : "Chạm để chọn ảnh"}</Text>
          <Text style={[__a3_styles.description, centered && __a3_styles.centerText]}>
            {preview ? "Ảnh hiển thị ngay. Bạn có thể chọn lại; ảnh đã căn chỉnh sẽ được lưu khi bấm Lưu." : "Kéo và phóng to để căn chỉnh ảnh vuông bo góc."}
          </Text>
          {!!preview && <Pressable disabled={disabled} style={__a3_styles.removeButton} onPress={() => { ++latest.current; apply(null); }}>
            <Ionicons name="close-circle-outline" size={16} color={__a3Colors.secondaryText}/>
            <Text style={__a3_styles.removeText}>Bỏ ảnh</Text>
          </Pressable>}
        </View>}
      </View>
      <AvatarSourceSheet visible={sourceSheetVisible} disabled={disabled} canRemove={!!preview}
        onClose={() => setSourceSheetVisible(false)}
        onRemove={() => { ++latest.current; setPhoto(null); apply(null); setSourceSheetVisible(false); }}
        // Let the native bottom-sheet modal disappear before opening another
        // Android Activity (camera/gallery); otherwise the picker may never appear.
        onPick={(choice) => { setTimeout(() => { void select(choice); }, 320); }}/>
      <AvatarCropEditor key={photo?.uri || "no-photo"} photo={photo} onCancel={cancelCrop} onConfirm={finishCrop}
        onError={() => showToast({ type: "error", title: "Không thể chỉnh ảnh", message: "Bạn có thể thử lại với ảnh khác nhé." })}/>
    </View>
  );
};
const styles = createBloomStyles(() => StyleSheet.create({
  wrapper: { marginBottom: 16 }, centered: { marginTop: 2, alignItems: "center" },
  compact: { width: 124, flexShrink: 0, marginBottom: 0 },
  label: { marginBottom: 11, color: COLORS.primaryText, fontSize: 13, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 16 }, column: { flexDirection: "column" },
  avatarWrap: { position: "relative" },
  avatar: { borderWidth: 0, backgroundColor: COLORS.softSurface },
  cameraBadge: { position: "absolute", right: -5, bottom: -5, width: 36, height: 36, borderRadius: 13,
    backgroundColor: COLORS.primary, borderWidth: 3, borderColor: COLORS.white, justifyContent: "center", alignItems: "center" },
  copy: { flex: 1, minWidth: 0 }, centerCopy: { flex: 0, alignItems: "center", maxWidth: 310 },
  title: { color: COLORS.primaryText, fontSize: 13, fontWeight: "800" },
  description: { marginTop: 5, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 }, centerText: { textAlign: "center" },
  removeButton: { marginTop: 10, flexDirection: "row", alignSelf: "flex-start", alignItems: "center", gap: 5 },
  removeText: { color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "700" },
}));
