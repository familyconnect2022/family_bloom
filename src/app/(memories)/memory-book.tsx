import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { BloomTextInput } from "../../components/ui/BloomInputComponents";
import { BloomEmptyState } from "../../components/ui/BloomPageComponents";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { memoryBookService } from "../../services/memory/memoryBookService";
import type { MemoryBookScope } from "../../types/memoryBook";
import type { MomentPost } from "../../types/moments";

export default function MemoryBookScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scope?: string; personId?: string; personName?: string }>();
  const { activeFamilyId, families } = useAuth();
  const scope: MemoryBookScope = params.scope === "person" ? "person" : "family";
  const personId = typeof params.personId === "string" ? params.personId : null;
  const personName = typeof params.personName === "string" ? params.personName : "một người thân";
  const familyName = families.find((item) => item.familyId === activeFamilyId)?.familyName || "Gia đình";

  const [source, setSource] = useState<MomentPost[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState(scope === "person" ? `Câu chuyện của ${personName}` : `Kỷ yếu ${familyName}`);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let live = true;
    if (!activeFamilyId) {
      setLoading(false);
      return () => { live = false; };
    }
    setLoading(true);
    memoryBookService.loadSourceMoments(activeFamilyId, scope, personId, 120)
      .then((items) => {
        if (!live) return;
        setSource(items);
        setSelected(items.slice(0, 40).map((item) => item.id));
      })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [activeFamilyId, personId, scope]);

  const chosen = useMemo(
    () => selected.map((id) => source.find((item) => item.id === id)).filter((item): item is MomentPost => !!item),
    [selected, source],
  );

  const toggle = (id: string) => setSelected((current) => current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id]);

  const move = (index: number, delta: number) => setSelected((current) => {
    const next = [...current];
    const target = index + delta;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const save = async () => {
    if (!activeFamilyId) return;
    setSaving(true);
    try {
      await memoryBookService.save({
        familyId: activeFamilyId,
        scope,
        personId,
        title: title.trim() || "Kỷ yếu Bloom",
        subtitle: scope === "person" ? `Những mảnh ký ức của ${personName}` : `Những điều ${familyName} muốn giữ lại`,
        coverMomentId: selected[0] || null,
        momentIds: selected,
      });
      setSaved(true);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const data = editing ? source : chosen;

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background} keyboardSafe>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <BloomHeroHeader
        eyebrow="KỶ YẾU BLOOM"
        title={scope === "person" ? `Câu chuyện của ${personName}` : "Cuốn sách của Nhà Mình"}
        subtitle={scope === "person"
          ? "Những mảnh ký ức nhỏ được xếp lại để một người thân luôn có câu chuyện của riêng mình."
          : `Những điều ${familyName} muốn giữ thật lâu, xếp thành từng trang để mai này vẫn còn nguyên cảm giác.`}
        variant="moment"
        onBack={() => router.back()}
        roundedBottom
        compact
      />

      <View style={styles.body}>
        <View style={styles.toolbar}>
          <Pressable onPress={() => setEditing((value) => !value)} style={({ pressed }) => [styles.tool, pressed && styles.pressed]}>
            <Ionicons name={editing ? "book-outline" : "create-outline"} size={18} color={COLORS.primaryText} />
            <Text style={styles.toolText}>{editing ? "Xem sách" : "Biên tập"}</Text>
          </Pressable>
          <Pressable disabled={saving} onPress={() => void save()} style={({ pressed }) => [styles.save, saving && styles.disabled, pressed && styles.pressed]}>
            {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name={saved ? "checkmark-circle" : "heart-outline"} size={17} color={COLORS.white} />}
            <Text style={styles.saveText}>{saving ? "Bloom đang cất…" : saved ? "Đã cất vào sách" : "Lưu kỷ yếu"}</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.muted}>Bloom đang gom những trang đáng nhớ…</Text>
          </View>
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            ListHeaderComponent={(
              <View style={styles.cover}>
                <View pointerEvents="none" style={styles.coverGlow} />
                <Text style={styles.coverEyebrow}>{scope === "person" ? "CÂU CHUYỆN MỘT NGƯỜI" : "CHUYỆN CỦA NHÀ MÌNH"}</Text>
                {editing ? (
                  <BloomTextInput
                    label="Tên cuốn kỷ yếu"
                    value={title}
                    onChangeText={setTitle}
                    inputStyle={styles.titleInput}
                    containerStyle={styles.titleField}
                    maxLength={80}
                    helperText="Một cái tên thật gần gũi sẽ khiến cuốn sách này giống câu chuyện của riêng nhà mình hơn."
                  />
                ) : (
                  <Text style={styles.coverTitle}>{title}</Text>
                )}
                <Text style={styles.coverMeta}>{selected.length} kỷ niệm đang nằm trong sách · bạn có thể đổi thứ tự bất cứ lúc nào</Text>
              </View>
            )}
            ListEmptyComponent={(
              <BloomEmptyState
                icon="book-outline"
                title="Cuốn sách đang chờ trang đầu tiên"
                description="Khi có một kỷ niệm muốn giữ lại, Bloom sẽ giúp bạn đặt nó vào đây."
              />
            )}
            renderItem={({ item }) => {
              const media = item.media[0];
              const isSelected = selected.includes(item.id);
              return (
                <View style={[styles.page, !isSelected && editing && styles.unselected]}>
                  {media?.secureUrl ? (
                    <Image source={{ uri: media.thumbnailUrl || media.secureUrl }} style={styles.heroImage} contentFit="cover" cachePolicy="memory-disk" />
                  ) : (
                    <View style={styles.noImage}><Ionicons name="flower-outline" size={28} color={COLORS.primary} /></View>
                  )}
                  <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" })}</Text>
                  <Text style={styles.pageTitle}>{item.caption || "Một ngày đáng nhớ"}</Text>
                  <Text style={styles.author}>{item.authorName}{item.media.length ? ` · ${item.media.length} ảnh/video` : ""}</Text>
                  {editing && (
                    <View style={styles.editRow}>
                      <Pressable onPress={() => toggle(item.id)} style={[styles.select, isSelected && styles.selectOn]}>
                        <Ionicons name={isSelected ? "checkmark" : "add"} size={16} color={isSelected ? COLORS.white : COLORS.primaryText} />
                        <Text style={[styles.selectText, isSelected && styles.selectTextOn]}>{isSelected ? "Trong sách" : "Thêm"}</Text>
                      </Pressable>
                      {isSelected && (
                        <>
                          <Pressable onPress={() => move(selected.indexOf(item.id), -1)} style={styles.round}><Ionicons name="arrow-up" size={16} color={COLORS.primaryText} /></Pressable>
                          <Pressable onPress={() => move(selected.indexOf(item.id), 1)} style={styles.round}><Ionicons name="arrow-down" size={16} color={COLORS.primaryText} /></Pressable>
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  toolbar: { flexDirection: "row", gap: 10, marginBottom: 12 },
  tool: { flex: 1, minHeight: 48, borderRadius: 18, borderWidth: 1, borderColor: "#EBCED9", backgroundColor: "#FFFDFE", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  toolText: { color: COLORS.primaryText, fontWeight: "900", fontSize: 12.5 },
  save: { flex: 1.2, minHeight: 48, borderRadius: 18, backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  saveText: { color: COLORS.white, fontWeight: "900", fontSize: 12.2 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.58 },
  loading: { paddingVertical: 60, alignItems: "center", gap: 10 },
  list: { paddingBottom: 40 },
  cover: { minHeight: 220, borderRadius: 30, backgroundColor: "#FFF8FB", borderWidth: 1, borderColor: "#EABED0", padding: 24, justifyContent: "flex-end", marginBottom: 18, overflow: "hidden" },
  coverGlow: { position: "absolute", width: 210, height: 210, borderRadius: 105, backgroundColor: "rgba(244,162,190,0.17)", right: -80, top: -90 },
  coverEyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  coverTitle: { marginTop: 8, color: COLORS.primaryText, fontSize: 30, lineHeight: 36, fontWeight: "900" },
  titleField: { marginTop: 10, marginBottom: 0 },
  titleInput: { color: COLORS.primaryText, fontSize: 20, fontWeight: "900" },
  coverMeta: { marginTop: 10, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
  page: { backgroundColor: "#FFFDFE", borderRadius: 28, borderWidth: 1, borderColor: "#EBCED9", padding: 14, marginBottom: 16, shadowColor: "#A8657F", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.07, shadowRadius: 13, elevation: 2 },
  unselected: { opacity: 0.58 },
  heroImage: { width: "100%", aspectRatio: 1.45, borderRadius: 20, backgroundColor: COLORS.surfaceSoft },
  noImage: { height: 130, borderRadius: 20, backgroundColor: COLORS.surfaceSoft, alignItems: "center", justifyContent: "center" },
  date: { marginTop: 14, color: COLORS.primary, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  pageTitle: { marginTop: 6, color: COLORS.primaryText, fontSize: 20, lineHeight: 27, fontWeight: "900" },
  author: { marginTop: 7, color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "600" },
  editRow: { marginTop: 14, flexDirection: "row", gap: 12, alignItems: "center" },
  select: { minHeight: 38, borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", alignItems: "center", gap: 5 },
  selectOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  selectText: { color: COLORS.primaryText, fontSize: 11, fontWeight: "900" },
  selectTextOn: { color: COLORS.white },
  round: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.surfaceSoft, alignItems: "center", justifyContent: "center" },
  muted: { color: COLORS.secondaryText, fontSize: 11.5, textAlign: "center" },
});
