import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import type { VideoThumbnail } from "expo-video";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMomentPublish } from "../../context/MomentPublishContext";
import { useMomentUploadToastState } from "../../services/moments/momentUploadToastStore";

/** Floating, non-modal top banner. Only HỦY captures touch; the card is inert. */
export function MomentUploadToast() {
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
  const percent = Math.max(0, Math.min(100, value.progress));
  const line = stopping ? "Đang hủy và dọn dẹp…" : publishing
    ? "Đang hoàn tất bài đăng…" : value.status === "queued"
      ? "Đang chuẩn bị ảnh / video…"
      : `Đang tải lên · ${percent}%`;
  return (
    <View pointerEvents="box-none" style={[styles.root, { top: insets.top + 9 }]}>
      <View pointerEvents="box-none" style={styles.toast}>
        <View pointerEvents="none" style={styles.thumbnail}>
          {(videoThumb && value.video) || (value.thumbnailUri && !value.video) ? (
            <Image source={value.video ? videoThumb! : { uri: value.thumbnailUri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" />
          ) : <Ionicons name={value.video ? "videocam-outline" : "images-outline"} color="#C86A92" size={26} />}
          {value.video && <View style={styles.playBadge}><Ionicons name="play" color="#FFFFFF" size={11}/></View>}
        </View>
        <View pointerEvents="none" style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>{stopping ? "Đang hủy khoảnh khắc" : "Đang tạo khoảnh khắc 🌸"}</Text>
          <Text style={styles.detail} numberOfLines={1}>{line}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hủy đăng khoảnh khắc"
          disabled={stopping || publishing}
          onPress={() => cancelMoment(value.localId)}
          style={({ pressed }) => [styles.cancel, (stopping || publishing) && styles.cancelDisabled, pressed && styles.pressed]}
        >
          <Text style={styles.cancelText}>{stopping ? "Đang hủy" : publishing ? "Đang lưu" : "Hủy"}</Text>
        </Pressable>
        <View pointerEvents="none" style={styles.track}>
          <View style={[styles.progress, { width: `${percent}%` }]} />
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { position: "absolute", left: 14, right: 14, zIndex: 9500, elevation: 24 },
  toast: {
    minHeight: 83, flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 20, borderColor: "#EDCCD8", borderWidth: 1,
    backgroundColor: "#FFF9FC", paddingHorizontal: 11, paddingVertical: 10,
    shadowColor: "#853F60", shadowRadius: 10, shadowOpacity: 0.16, shadowOffset: { width: 0, height: 3 },
    elevation: 12, overflow: "hidden",
  },
  thumbnail: { width: 52, height: 52, borderRadius: 13, overflow: "hidden", backgroundColor: "#FBE4ED", alignItems: "center", justifyContent: "center" },
  playBadge: { position: "absolute", bottom: 3, right: 3, backgroundColor: "#A94C76", width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, justifyContent: "center", gap: 3, minWidth: 0 },
  title: { color: "#873454", fontSize: 13.2, fontWeight: "900" },
  detail: { color: "#946E7C", fontSize: 11.2, fontWeight: "600" },
  cancel: { minWidth: 60, minHeight: 42, borderRadius: 16, paddingHorizontal: 11, justifyContent: "center", alignItems: "center", backgroundColor: "#FBE1EA", borderWidth: 1, borderColor: "#EAA4BD" },
  cancelText: { color: "#A83F67", fontSize: 12.5, fontWeight: "900" },
  cancelDisabled: { opacity: 0.55 }, pressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
  track: { position: "absolute", left: 12, right: 12, bottom: 4, height: 4, backgroundColor: "#F3DCE5", borderRadius: 4, overflow: "hidden" },
  progress: { height: "100%", backgroundColor: "#E685AA", borderRadius: 4 },
});
