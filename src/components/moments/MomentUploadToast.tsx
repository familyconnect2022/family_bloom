import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { COLORS } from '../../constants/theme';
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import type { VideoThumbnail } from "expo-video";
import { Pressable, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../ui/BloomText';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMomentPublish } from "../../context/MomentPublishContext";
import { useMomentUploadToastState } from "../../services/moments/momentUploadToastStore";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


/** Floating, non-modal top banner. Only HỦY captures touch; the card is inert. */
export function MomentUploadToast() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const value = useMomentUploadToastState();
  const insets = useSafeAreaInsets();
  const { cancelMoment } = useMomentPublish();
  const [videoThumb, setVideoThumb] = useState<VideoThumbnail | null>(null);
  const currentVideoUri = value?.video ? value.thumbnailUri : undefined;
  useEffect(() => {
    let disposed = false;
    setVideoThumb(null);
    if (!currentVideoUri) return;
    // Only decode the ONE currently uploading video; never allocate players for all 10 files.
    void (async () => {
      let player: { generateThumbnailsAsync: (times: number) => Promise<VideoThumbnail[]>; release: () => void } | null = null;
      try {
        const { createVideoPlayer } = await import("expo-video");
        if (disposed) return;
        player = createVideoPlayer({ uri: currentVideoUri });
        const frames = await player.generateThumbnailsAsync(0.2);
        if (!disposed && frames[0]) setVideoThumb(frames[0]);
      } catch { /* Unsupported/corrupt video: fall back to the video icon. */ }
      finally { player?.release(); }
    })();
    return () => { disposed = true; };
  }, [currentVideoUri]);
  if (!value) return null;
  const stopping = value.status === "cancelling";
  const publishing = value.status === "publishing";
  const editing = value.operation === "edit";
  const percent = Math.max(0, Math.min(100, value.progress));
  const line = stopping ? "Đang hủy và dọn dẹp…" : publishing
    ? editing ? "Đang lưu thay đổi…" : "Đang hoàn tất bài đăng…" : value.status === "queued"
      ? "Đang chuẩn bị ảnh / video…"
      : `Đang tải lên · ${percent}%`;
  return (
    <View pointerEvents="box-none" style={[__a3_styles.root, { top: insets.top + 9 }]}>
      <View pointerEvents="box-none" style={__a3_styles.toast}>
        <View pointerEvents="none" style={__a3_styles.thumbnail}>
          {(videoThumb && value.video) || (value.thumbnailUri && !value.video) ? (
            <Image source={value.video ? videoThumb! : { uri: value.thumbnailUri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" />
          ) : <Ionicons name={value.video ? "videocam-outline" : "images-outline"} color={__a3Colors.primary} size={26} />}
          {value.video && <View style={__a3_styles.playBadge}><Ionicons name="play" color={__a3Colors.white} size={11}/></View>}
        </View>
        <View pointerEvents="none" style={__a3_styles.copy}>
          <Text style={__a3_styles.title} numberOfLines={1}>{stopping ? "Đang hủy khoảnh khắc" : editing ? "Đang cập nhật kỷ niệm" : "Đang tạo khoảnh khắc 🌸"}</Text>
          <Text style={__a3_styles.detail} numberOfLines={1}>{line}</Text>
        </View>
        {!editing && <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hủy đăng khoảnh khắc"
          disabled={stopping || publishing}
          onPress={() => cancelMoment(value.localId)}
          style={({ pressed }) => [__a3_styles.cancel, (stopping || publishing) && __a3_styles.cancelDisabled, pressed && __a3_styles.pressed]}
        >
          <Text style={__a3_styles.cancelText}>{stopping ? "Đang hủy" : publishing ? "Đang lưu" : "Hủy"}</Text>
        </Pressable>}
        <View pointerEvents="none" style={__a3_styles.track}>
          <View style={[__a3_styles.progress, { width: `${percent}%` }]} />
        </View>
      </View>
    </View>
  );
}
const styles = createBloomStyles(() => StyleSheet.create({
  root: { position: "absolute", left: 14, right: 14, zIndex: 9500, elevation: 24 },
  toast: {
    minHeight: 83, flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 20, borderColor: COLORS.border, borderWidth: 1,
    backgroundColor: COLORS.surface, paddingHorizontal: 11, paddingVertical: 10,
    shadowColor: COLORS.shadow, shadowRadius: 10, shadowOpacity: 0.16, shadowOffset: { width: 0, height: 3 },
    elevation: 12, overflow: "hidden",
  },
  thumbnail: { width: 52, height: 52, borderRadius: 13, overflow: "hidden", backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  playBadge: { position: "absolute", bottom: 3, right: 3, backgroundColor: COLORS.selectedBackground, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, justifyContent: "center", gap: 3, minWidth: 0 },
  title: { color: COLORS.primary, fontSize: 13.2, fontWeight: "900" },
  detail: { color: COLORS.primary, fontSize: 11.2, fontWeight: "600" },
  cancel: { minWidth: 60, minHeight: 42, borderRadius: 16, paddingHorizontal: 11, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.softSurface, borderWidth: 1, borderColor: COLORS.border },
  cancelText: { color: COLORS.primary, fontSize: 12.5, fontWeight: "900" },
  cancelDisabled: { opacity: 0.55 }, pressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
  track: { position: "absolute", left: 12, right: 12, bottom: 4, height: 4, backgroundColor: COLORS.softSurface, borderRadius: 4, overflow: "hidden" },
  progress: { height: "100%", backgroundColor: COLORS.selectedBackground, borderRadius: 4 },
}));
