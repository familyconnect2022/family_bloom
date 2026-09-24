import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useMediaViewer } from "../media/MediaViewerProvider";
import { COLORS, UI } from "../../constants/theme";
import type { PendingMoment } from "../../context/MomentPublishContext";

const statusCopy = (status: PendingMoment["status"], progress: number) => {
  if (status === "queued") return "Bloom đang chuẩn bị khoảnh khắc…";
  if (status === "uploading") return `Đang cất ảnh / video ${Math.max(1, progress)}%`;
  if (status === "publishing") return "Sắp xuất hiện trên tường nhà…";
  if (status === "published") return "Đã đăng · đang đồng bộ…";
  return "Khoảnh khắc này chưa đăng được";
};

export function PendingMomentCard({
  item,
  onRetry,
  onRemove,
}: {
  item: PendingMoment;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const { width } = useWindowDimensions();
  const { openMediaViewer } = useMediaViewer();
  const visible = item.files.slice(0, 4);
  const mediaWidth = Math.max(250, Math.min(width - 60, 720));
  const halfWidth = Math.floor((mediaWidth - 6) / 2);
  const viewerItems = item.files.map((file) => ({
    id: file.id,
    type: file.type,
    uri: file.uri,
    caption: item.caption || null,
  }));

  const openAt = (index: number) => openMediaViewer({
    items: viewerItems,
    initialIndex: index,
    title: "Khoảnh khắc đang xử lý",
  });

  const tileStyle = (index: number) => {
    if (visible.length === 1) return { width: mediaWidth, height: Math.min(330, Math.round(mediaWidth * 0.72)) };
    if (visible.length === 2) return { width: halfWidth, height: Math.min(230, Math.round(halfWidth * 0.9)) };
    if (visible.length === 3 && index === 0) return { width: mediaWidth, height: Math.min(250, Math.round(mediaWidth * 0.58)) };
    return { width: halfWidth, height: Math.min(210, halfWidth) };
  };

  return (
    <View style={[styles.card, item.status === "failed" && styles.cardFailed]}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          {item.author.avatarUrl ? (
            <Image
              source={{ uri: item.author.avatarUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={`pending-author-${item.author.uid}`}
            />
          ) : (
            <Text style={styles.initial}>{item.author.displayName.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.author}>{item.author.displayName}</Text>
          <View style={styles.statusRow}>
            {item.status !== "failed" ? (
              <Ionicons name="cloud-upload-outline" size={13} color={COLORS.primary} />
            ) : (
              <Ionicons name="alert-circle-outline" size={13} color={COLORS.destructive} />
            )}
            <Text style={[styles.status, item.status === "failed" && styles.statusFailed]}>
              {statusCopy(item.status, item.progress)}
            </Text>
          </View>
        </View>
      </View>

      {!!item.caption.trim() && <Text style={styles.caption}>{item.caption.trim()}</Text>}

      {!!visible.length && (
        <View style={[styles.grid, { width: mediaWidth }]}> 
          {visible.map((file, index) => (
            <Pressable
              key={file.id}
              onPress={() => openAt(index)}
              style={[styles.tile, tileStyle(index)]}
            >
              {file.type === "image" ? (
                <Image
                  source={{ uri: file.uri }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={0}
                  cachePolicy="memory"
                  recyclingKey={`pending-${file.id}`}
                />
              ) : (
                <View style={styles.videoTile}>
                  <Ionicons name="videocam" size={30} color={COLORS.primary} />
                  <Text style={styles.videoText}>VIDEO</Text>
                  <View style={styles.playBadge}>
                    <Ionicons name="play" size={15} color={COLORS.white} />
                  </View>
                </View>
              )}
              {index === visible.length - 1 && item.files.length > visible.length && (
                <View style={styles.more}>
                  <Text style={styles.moreText}>+{item.files.length - visible.length}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {item.status !== "failed" ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.max(
                    item.status === "queued" ? 4 : 8,
                    Math.min(100, item.progress || (item.status === "publishing" || item.status === "published" ? 100 : 8)),
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.progressHint}>Bạn cứ tiếp tục dùng Bloom nhé 🌷</Text>
        </View>
      ) : (
        <View style={styles.failedActions}>
          <Pressable onPress={onRemove} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>Bỏ bài chờ</Text>
          </Pressable>
          <Pressable onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
            <Ionicons name="refresh" size={16} color={COLORS.white} />
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: UI.borderRadiusCard,
    borderWidth: 1,
    borderColor: "#F2BED0",
    padding: 14,
    overflow: "hidden",
  },
  cardFailed: { borderColor: "#F0C3CE", backgroundColor: "#FFF9FB" },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 11 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: COLORS.accentBg,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: { color: COLORS.primaryText, fontWeight: "900" },
  headerCopy: { flex: 1, minWidth: 0 },
  author: { color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900" },
  statusRow: { marginTop: 3, flexDirection: "row", alignItems: "center", gap: 5 },
  status: { flexShrink: 1, color: COLORS.primary, fontSize: 10.5, fontWeight: "800" },
  statusFailed: { color: COLORS.destructive },
  caption: { color: COLORS.primaryText, fontSize: 14, lineHeight: 20, marginBottom: 11 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 13, alignSelf: "center" },
  tile: { borderRadius: 15, overflow: "hidden", backgroundColor: COLORS.softSurface },
  videoTile: { flex: 1, alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#FFF2F7" },
  videoText: { color: COLORS.primaryText, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.7 },
  playBadge: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(70,42,52,0.56)",
    alignItems: "center",
    justifyContent: "center",
  },
  more: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(54,34,42,0.54)", alignItems: "center", justifyContent: "center" },
  moreText: { color: COLORS.white, fontSize: 27, fontWeight: "900" },
  progressBlock: { gap: 7 },
  progressTrack: { height: 6, borderRadius: 999, backgroundColor: COLORS.softSurface, overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 999, backgroundColor: COLORS.primary },
  progressHint: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "700" },
  failedActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  secondaryButton: { minHeight: 38, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 13, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "800" },
  retryButton: { minHeight: 38, borderRadius: 14, backgroundColor: COLORS.primary, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  retryText: { color: COLORS.white, fontSize: 11.5, fontWeight: "900" },
  pressed: { opacity: 0.7 },
});
