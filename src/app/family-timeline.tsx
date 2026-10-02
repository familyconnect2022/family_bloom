import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { memo, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { cloudinaryImageThumbnail, cloudinaryVideoThumbnail, useMediaViewer } from "../components/media/MediaViewerProvider";
import { BloomEmptyState, BloomStickyHeader } from "../components/ui/BloomPageComponents";
import { COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { momentsService } from "../services/moments/momentsService";
import type { MomentPost } from "../types/moments";
import { buildMomentTimelineSections, type MomentTimelineRow } from "../utils/timelineSections";

const monthLabel = (month: number) => `THÁNG ${month}`;
const dayLabel = (iso: string) => {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return iso.slice(0, 10);
  return `${String(date.getDate()).padStart(2, "0")} tháng ${date.getMonth() + 1}`;
};
const fullDateLabel = (iso: string) => {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" }) : iso.slice(0, 10);
};

const TimelineMemory = memo(function TimelineMemory({ row, familyName, onOpen }: { row: MomentTimelineRow; familyName: string; onOpen: (moment: MomentPost) => void }) {
  const moment = row.moment;
  const unique = useMemo(() => {
    const seen = new Set<string>();
    return moment.media.filter((media) => { const key = media.publicId || media.secureUrl; if (seen.has(key)) return false; seen.add(key); return true; });
  }, [moment.media]);
  const visible = unique.slice(0, 5);
  return (
    <View>
      {row.showDayHeader && <View style={styles.dayGroup}><Text style={styles.dayGroupText}>{dayLabel(moment.createdAt)}</Text><View style={styles.dayGroupLine} /></View>}
      <View style={styles.row}>
        <View style={styles.rail}><View style={styles.dot}><Ionicons name={moment.media.length ? "images" : "heart"} size={10} color={COLORS.white} /></View><View style={styles.railLine} /></View>
        <View style={styles.memory}>
          <Text style={styles.date}>{fullDateLabel(moment.createdAt)}</Text>
          <Text style={styles.title}>{moment.caption || "Một kỷ niệm của cả nhà"}</Text>
          <Text style={styles.meta}>{moment.authorName}{unique.length ? ` · ${unique.length} ảnh/video` : ""}</Text>
          {!!visible.length && (
            <>
              <Pressable accessibilityRole="button" accessibilityLabel={`Mở ảnh và video của ${familyName}`} onPress={() => onOpen(moment)} style={styles.stack}>
                {visible.map((media, index) => {
                  const uri = media.type === "video" ? (media.thumbnailUrl || cloudinaryVideoThumbnail(media.secureUrl, 180)) : (media.thumbnailUrl || cloudinaryImageThumbnail(media.secureUrl, 180));
                  return <View key={media.id || `${moment.id}-${index}`} style={[styles.circle, index > 0 && styles.overlap, { zIndex: visible.length - index }]}>{uri ? <Image source={{ uri }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" /> : <Ionicons name="image-outline" size={15} color={COLORS.primary} />}{media.type === "video" && <View style={styles.video}><Ionicons name="play" size={8} color={COLORS.white} /></View>}</View>;
                })}
                {unique.length > visible.length && <View style={[styles.more, styles.overlap]}><Text style={styles.moreText}>+{unique.length - visible.length}</Text></View>}
              </Pressable>
              <Text style={styles.mediaHint}>Chạm vào cụm ảnh hoặc video để xem toàn màn hình</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
});

export default function FamilyTimelineScreen() {
  const router = useRouter();
  const { activeFamilyId, families } = useAuth();
  const { openMediaViewer } = useMediaViewer();
  const [items, setItems] = useState<MomentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const familyName = families.find((item) => item.familyId === activeFamilyId)?.familyName || "Gia đình";

  useEffect(() => {
    setItems([]); setLoading(true);
    if (!activeFamilyId) { setLoading(false); return; }
    // Keep a bounded realtime head. SectionList virtualizes the rendered memories so 100–200 historical entries can be added later without mounting them all.
    return momentsService.subscribeFamilyTimeline(activeFamilyId, (next) => { setItems(next); setLoading(false); }, () => setLoading(false));
  }, [activeFamilyId]);

  const sections = useMemo(() => buildMomentTimelineSections(items), [items]);

  const openMomentMedia = (moment: MomentPost) => {
    const seen = new Set<string>();
    const media = moment.media.filter((item) => { const key = item.publicId || item.secureUrl; if (seen.has(key)) return false; seen.add(key); return true; });
    if (!media.length) { router.navigate({ pathname: "/(tabs)/moments", params: { highlightMomentId: moment.id } } as never); return; }
    openMediaViewer({ items: media.map((item) => ({ id: item.id, type: item.type, uri: item.secureUrl, thumbnailUri: item.thumbnailUrl, caption: moment.caption })), title: `Dòng thời gian · ${familyName}` });
  };

  return (
    <ScreenContainer>
      <BloomStickyHeader title="Dòng thời gian gia đình" subtitle={familyName} onBack={() => router.back()} />
      {loading ? <View style={styles.loading}><ActivityIndicator color={COLORS.primary} /><Text style={styles.loadingText}>Bloom đang xếp lại ký ức của cả nhà…</Text></View>
      : !items.length ? <BloomEmptyState icon="flower-outline" title="Dòng thời gian đang chờ nở" description="Khi đăng kỷ niệm, chọn “Toàn gia đình” để lưu dấu mốc vào đây." />
      : <SectionList
          sections={sections}
          keyExtractor={(row) => row.moment.id}
          ListHeaderComponent={<View style={styles.timelineIntro}><Text style={styles.timelineIntroTitle}>Câu chuyện của cả nhà</Text><Text style={styles.timelineIntroText}>Những kỷ niệm cả nhà đã chọn để cùng lưu giữ. Chạm vào cụm ảnh hoặc video để xem trọn khoảnh khắc.</Text></View>}
          renderSectionHeader={({ section }) => <View style={styles.temporalHeader}>{section.showYear && <View style={styles.yearRow}><Text style={styles.year}>{section.year}</Text><View style={styles.yearLine} /></View>}<Text style={styles.month}>{monthLabel(section.month)}</Text></View>}
          renderItem={({ item }) => <TimelineMemory row={item} familyName={familyName} onOpen={openMomentMedia} />}
          ListFooterComponent={<View style={styles.end}><Ionicons name="flower-outline" size={18} color={COLORS.primary} /><Text style={styles.endText}>Mỗi kỷ niệm là một mảnh nhỏ trong câu chuyện của gia đình.</Text></View>}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={45}
          windowSize={7}
          removeClippedSubviews
        />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 36 }, timelineIntro: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: 16, marginBottom: 14 }, timelineIntroTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900" }, timelineIntroText: { marginTop: 5, color: COLORS.secondaryText, fontSize: 12, lineHeight: 18, fontWeight: "600" }, loading: { paddingVertical: 50, alignItems: "center", gap: 10 }, loadingText: { color: COLORS.secondaryText, fontSize: 12, fontWeight: "700" },
  temporalHeader: { backgroundColor: COLORS.background, paddingTop: 4, paddingBottom: 7 }, yearRow: { flexDirection: "row", alignItems: "center", gap: 12 }, year: { color: COLORS.primaryText, fontSize: 26, fontWeight: "900" }, yearLine: { height: 1, flex: 1, backgroundColor: COLORS.timelineRail }, month: { marginTop: 5, color: COLORS.primary, fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 },
  dayGroup: { flexDirection: "row", alignItems: "center", gap: 9, marginLeft: 40, marginTop: 3, marginBottom: 7 }, dayGroupText: { color: COLORS.primaryText, fontSize: 11, fontWeight: "900", textTransform: "uppercase" }, dayGroupLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  row: { flexDirection: "row", gap: 10, minHeight: 100 }, rail: { width: 30, alignItems: "center" }, dot: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.primary, borderWidth: 4, borderColor: COLORS.background, alignItems: "center", justifyContent: "center", zIndex: 2 }, railLine: { width: 5, flex: 1, marginTop: -2, marginBottom: -2, borderRadius: 99, backgroundColor: COLORS.timelineRail },
  memory: { flex: 1, marginBottom: 13, borderRadius: 21, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, padding: 13 }, date: { color: COLORS.primary, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }, title: { marginTop: 5, color: COLORS.primaryText, fontSize: 14, lineHeight: 20, fontWeight: "900" }, meta: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "600" },
  stack: { flexDirection: "row", alignItems: "center", marginTop: 10, alignSelf: "flex-start" }, circle: { width: 42, height: 42, borderRadius: 21, borderWidth: 2.5, borderColor: COLORS.white, backgroundColor: COLORS.softSurface, overflow: "hidden", alignItems: "center", justifyContent: "center" }, overlap: { marginLeft: -21 }, image: { width: "100%", height: "100%" }, video: { position: "absolute", right: 1, bottom: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: "rgba(67,39,49,.72)", alignItems: "center", justifyContent: "center" }, more: { width: 42, height: 42, borderRadius: 21, borderWidth: 2.5, borderColor: COLORS.white, backgroundColor: COLORS.surfaceFocus, alignItems: "center", justifyContent: "center" }, moreText: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "900" }, mediaHint: { marginTop: 7, color: COLORS.secondaryText, fontSize: 9.5, fontWeight: "600" },
  end: { alignItems: "center", paddingVertical: 18, gap: 5 }, endText: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "700", textAlign: "center" },
});
