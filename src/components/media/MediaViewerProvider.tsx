import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/theme";

export type MediaViewerItemType = "image" | "video";

export interface MediaViewerItem {
  id: string;
  type: MediaViewerItemType;
  uri: string;
  thumbnailUri?: string | null;
  caption?: string | null;
}

interface OpenMediaViewerInput {
  items: MediaViewerItem[];
  initialIndex?: number;
  title?: string;
}

interface MediaViewerContextValue {
  openMediaViewer: (input: OpenMediaViewerInput) => void;
  closeMediaViewer: () => void;
}

const MediaViewerContext = createContext<MediaViewerContextValue | null>(null);

export const useMediaViewer = () => {
  const context = useContext(MediaViewerContext);
  if (!context) throw new Error("useMediaViewer phải được bọc trong MediaViewerProvider");
  return context;
};

export const inferMediaViewerType = (uri: string): MediaViewerItemType => {
  const lower = uri.toLowerCase();
  if (lower.includes("/video/upload/") || /\.(mp4|mov|m4v|webm|3gp)(?:\?|$)/i.test(lower)) return "video";
  return "image";
};

export const cloudinaryVideoThumbnail = (uri: string, width = 720) => {
  if (!uri.toLowerCase().includes("/video/upload/")) return null;
  const transform = `so_0,q_auto:eco,c_limit,w_${Math.max(320, Math.round(width))}`;
  const withFrame = uri.replace("/video/upload/", `/video/upload/${transform}/`);
  return withFrame.replace(/\.[a-z0-9]+(?=\?|$)/i, ".jpg");
};

/** Lightweight Cloudinary delivery URL for feed cards; fullscreen keeps the original. */
export const cloudinaryImageThumbnail = (uri: string, width = 720) => {
  if (!uri.toLowerCase().includes("/image/upload/")) return uri;
  if (uri.includes("/image/upload/f_auto,")) return uri;
  return uri.replace(
    "/image/upload/",
    `/image/upload/f_auto,q_auto:eco,c_limit,w_${Math.max(320, Math.round(width))}/`,
  );
};

function MediaLoadingState({ label = "Đang mở khoảnh khắc…" }: { label?: string }) {
  return (
    <View pointerEvents="none" style={styles.loadingState}>
      <View style={styles.loadingBloom}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.loadingText}>{label}</Text>
      </View>
    </View>
  );
}

function ViewerImage({ uri }: { uri: string }) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  if (failed) {
    return (
      <View style={styles.errorState}>
        <Ionicons name="image-outline" size={42} color="#B6ADB1" />
        <Text style={styles.errorText}>Không mở được ảnh này</Text>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        transition={140}
        cachePolicy="memory-disk"
        onLoadStart={() => setLoading(true)}
        onDisplay={() => setLoading(false)}
        onError={() => { setLoading(false); setFailed(true); }}
      />
      {loading && <MediaLoadingState label="Đang tải ảnh…" />}
    </View>
  );
}

function ActiveVideo({ item }: { item: MediaViewerItem }) {
  const [warming, setWarming] = useState(true);
  const player = useVideoPlayer(item.uri, (instance) => {
    instance.loop = false;
    instance.play();
  });
  const thumbnail = cloudinaryVideoThumbnail(item.thumbnailUri || item.uri, 960);

  useEffect(() => {
    const timer = setTimeout(() => setWarming(false), 900);
    return () => clearTimeout(timer);
  }, [item.uri]);

  useEffect(() => () => {
    try { player.pause(); } catch { /* native player can already be released */ }
  }, [player]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {!!thumbnail && <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="memory-disk" />}
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls
        contentFit="contain"
        surfaceType="textureView"
      />
      {warming && <MediaLoadingState label="Đang chuẩn bị video…" />}
    </View>
  );
}

function InactiveVideo({ item }: { item: MediaViewerItem }) {
  const thumbnail = cloudinaryVideoThumbnail(item.thumbnailUri || item.uri, 960);
  return (
    <View style={styles.videoPlaceholder}>
      {!!thumbnail && <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} contentFit="contain" transition={80} cachePolicy="memory-disk" />}
      <View style={styles.playCircle}>
        <Ionicons name="play" size={28} color="#FFFFFF" />
      </View>
    </View>
  );
}

export function MediaViewerProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<MediaViewerItem>>(null);
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState<MediaViewerItem[]>([]);
  const [index, setIndex] = useState(0);
  const [title, setTitle] = useState<string | undefined>();

  const closeMediaViewer = useCallback(() => {
    setVisible(false);
  }, []);

  const openMediaViewer = useCallback((input: OpenMediaViewerInput) => {
    const cleanItems = input.items.filter((item) => !!item?.uri);
    if (!cleanItems.length) return;
    const safeIndex = Math.max(0, Math.min(input.initialIndex ?? 0, cleanItems.length - 1));
    setItems(cleanItems);
    setIndex(safeIndex);
    setTitle(input.title);
    setVisible(true);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: safeIndex * width, animated: false });
    });
  }, [width]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: index * width, animated: false });
    }, 32);
    return () => clearTimeout(timer);
  }, [visible, width]);

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width));
    setIndex(Math.max(0, Math.min(next, items.length - 1)));
  };

  const contextValue = useMemo(() => ({ openMediaViewer, closeMediaViewer }), [openMediaViewer, closeMediaViewer]);

  return (
    <MediaViewerContext.Provider value={contextValue}>
      {children}
      <Modal
        visible={visible}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        hardwareAccelerated
        onRequestClose={closeMediaViewer}
      >
        <View style={styles.root}>
          <FlatList
            ref={listRef}
            data={items}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, itemIndex) => `${item.id}-${itemIndex}`}
            getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
            onMomentumScrollEnd={onMomentumEnd}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews
            renderItem={({ item, index: itemIndex }) => (
              <View style={{ width, height }}>
                {item.type === "video" ? (
                  itemIndex === index ? <ActiveVideo item={item} /> : <InactiveVideo item={item} />
                ) : (
                  <ViewerImage uri={item.uri} />
                )}
              </View>
            )}
          />

          <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: insets.top + 8 }]}> 
            <Pressable onPress={closeMediaViewer} style={styles.roundButton} hitSlop={10} accessibilityRole="button" accessibilityLabel="Đóng trình xem media">
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
            <View style={styles.topCopy}>
              {!!title && <Text style={styles.viewerTitle} numberOfLines={1}>{title}</Text>}
              <View style={styles.counterPill}>
                <Text style={styles.counterText}>{items.length ? `${index + 1} / ${items.length}` : ""}</Text>
              </View>
            </View>
            <View style={styles.roundButtonGhost} />
          </View>

          {items[index]?.caption ? (
            <View pointerEvents="none" style={[styles.captionWrap, { paddingBottom: insets.bottom + 14 }]}> 
              <Text style={styles.captionText} numberOfLines={3}>{items[index].caption}</Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </MediaViewerContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1A1417" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: "rgba(9,7,8,0.34)",
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  roundButtonGhost: { width: 44, height: 44 },
  topCopy: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  viewerTitle: { color: "#FFFFFF", fontSize: 12, fontWeight: "800", marginBottom: 5, maxWidth: "88%" },
  counterPill: { borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", paddingHorizontal: 10, paddingVertical: 5 },
  counterText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  videoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1A1417" },
  loadingState: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,245,248,0.16)" },
  loadingBloom: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 11, backgroundColor: "rgba(255,245,248,0.94)", borderWidth: 1, borderColor: "rgba(241,221,229,0.96)" },
  loadingText: { color: COLORS.primaryText, fontSize: 13, fontWeight: "800" },
  playCircle: { width: 62, height: 62, borderRadius: 31, backgroundColor: "rgba(0,0,0,0.52)", alignItems: "center", justifyContent: "center" },
  errorState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  errorText: { color: "#D0C7CB", fontSize: 13, fontWeight: "700" },
  captionWrap: { position: "absolute", left: 18, right: 18, bottom: 0, alignItems: "center" },
  captionText: { color: "#FFFFFF", fontSize: 13, lineHeight: 19, textAlign: "center", backgroundColor: "rgba(0,0,0,0.34)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
});
