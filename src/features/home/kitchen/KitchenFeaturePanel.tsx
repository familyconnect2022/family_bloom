import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { homeKitchenService } from "@/services/home/homeKitchenService";
import type { BloomRecipe, KitchenPreferenceTag } from "@/types/homeLiving";
import { BloomNoteCallout } from "@/components/ui/BloomNoteCallout";
import { BloomTextInput } from "@/components/ui/BloomInputComponents";
import { COLORS } from "@/constants/theme";

const PREFS: Array<{ key: KitchenPreferenceTag; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "normal", label: "Ăn bình thường", icon: "restaurant-outline" },
  { key: "vegetarian", label: "Ăn chay", icon: "leaf-outline" },
  { key: "lowerSugar", label: "Ưu tiên ít đường", icon: "water-outline" },
  { key: "controlledCarb", label: "Kiểm soát tinh bột", icon: "options-outline" },
  { key: "lowerSodium", label: "Ưu tiên ít muối", icon: "heart-outline" },
];

const mealLabel: Record<string, string> = { sang: "Bữa sáng", trua: "Bữa trưa", toi: "Bữa tối" };

function RecipeCard({ recipe, title, onSwap, onOpen }: { recipe: BloomRecipe; title?: string; onSwap?: () => void; onOpen: () => void }) {
  return (
    <View style={styles.recipeCard}>
      {!!title && <Text style={styles.slotLabel}>{title}</Text>}
      <View style={styles.recipeTop}>
        <View style={styles.foodIcon}><Ionicons name="restaurant-outline" size={20} color={COLORS.primary} /></View>
        <View style={styles.recipeCopy}>
          <Text style={styles.recipeName}>{recipe.nameVi}</Text>
          <Text style={styles.recipeMeta}>{recipe.category} · {recipe.prepMinutes + recipe.cookMinutes} phút · {recipe.difficulty}</Text>
        </View>
      </View>
      <Text style={styles.recipeSummary}>{recipe.summary}</Text>
      <View style={styles.cardActions}>
        <Pressable onPress={onOpen} style={styles.secondaryButton}><Text style={styles.secondaryText}>Xem công thức</Text></Pressable>
        {!!onSwap && <Pressable onPress={onSwap} style={styles.secondaryButton}><Ionicons name="refresh-outline" size={15} color={COLORS.primary} /><Text style={styles.secondaryText}>Đổi món</Text></Pressable>}
      </View>
    </View>
  );
}

function RecipeDetail({ recipe, onClose }: { recipe: BloomRecipe; onClose: () => void }) {
  return (
    <View style={styles.detail}>
      <View style={styles.detailHeader}>
        <View style={{ flex: 1 }}><Text style={styles.detailTitle}>{recipe.nameVi}</Text><Text style={styles.recipeMeta}>{recipe.servings} khẩu phần · {recipe.prepMinutes + recipe.cookMinutes} phút</Text></View>
        <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close-circle" size={28} color={COLORS.primary} /></Pressable>
      </View>
      <Text style={styles.sectionTitle}>Nguyên liệu</Text>
      {recipe.ingredients.map((item, i) => <Text key={`${item.name}-${i}`} style={styles.line}>• {item.name}: {item.amount}</Text>)}
      <Text style={styles.sectionTitle}>Cách làm</Text>
      {recipe.steps.map((step, i) => <View key={i} style={styles.step}><View style={styles.stepNo}><Text style={styles.stepNoText}>{i + 1}</Text></View><Text style={styles.stepText}>{step}</Text></View>)}
      <View style={styles.healthNote}><Ionicons name="information-circle-outline" size={18} color={COLORS.primary} /><Text style={styles.healthText}>{recipe.nutritionNote}</Text></View>
    </View>
  );
}

export function KitchenFeaturePanel() {
  const { user, activeFamilyId } = useAuth();
  const uid = user?.uid ?? "";
  const [myTags, setMyTags] = useState<KitchenPreferenceTag[]>(["normal"]);
  const [saving, setSaving] = useState(false);
  const [offsets, setOffsets] = useState({ sang: 0, trua: 0, toi: 0 });
  const [opened, setOpened] = useState<BloomRecipe | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeFamilyId || !uid) return;
    setMyTags(["normal"]);
    const unsub = homeKitchenService.watchMyPreferences(
      activeFamilyId,
      uid,
      mine => setMyTags(mine?.tags?.length ? mine.tags : ["normal"]),
      e => setError(e instanceof Error ? e.message : "Bloom chưa nhớ được lựa chọn ăn uống của bạn. Thử lại một chút nhé."),
    );
    return unsub;
  }, [activeFamilyId, uid]);

  const menu = useMemo(() => activeFamilyId && uid
    ? homeKitchenService.dailyMenu(activeFamilyId, uid, new Date(), myTags, offsets)
    : { sang: null, trua: null, toi: null, personalized: false, dayKey: "" }, [activeFamilyId, uid, myTags, offsets]);
  const searchResults = useMemo(() => search.trim() ? homeKitchenService.search(search, 20) : [], [search]);

  const togglePref = (tag: KitchenPreferenceTag) => {
    setMyTags(current => {
      if (tag === "normal") return ["normal"];
      const base = current.filter(x => x !== "normal");
      const next = base.includes(tag) ? base.filter(x => x !== tag) : [...base, tag];
      return next.length ? next : ["normal"];
    });
  };

  const save = async () => {
    if (!activeFamilyId || !uid) return;
    setSaving(true); setError(null);
    try { await homeKitchenService.saveMyPreferences(activeFamilyId, uid, myTags); }
    catch (e) { setError(e instanceof Error ? e.message : "Bloom chưa cất được lựa chọn này. Bạn thử lại nhé."); }
    finally { setSaving(false); }
  };

  if (opened) return <RecipeDetail recipe={opened} onClose={() => setOpened(null)} />;

  return (
    <View style={styles.wrapper}>
      <View style={styles.prefCard}>
        <Text style={styles.heading}>Khẩu vị & ưu tiên của tôi</Text>
        <BloomNoteCallout title="Chỉ cá nhân hoá khi bạn chọn" icon="options-outline" tone="green">Nếu để “Ăn bình thường”, bạn sẽ thấy đúng thực đơn chung của cả nhà hôm nay. Chỉ các bộ lọc bạn chủ động chọn mới làm thực đơn của riêng bạn khác đi.</BloomNoteCallout>
        <View style={styles.prefWrap}>
          {PREFS.map(pref => {
            const selected = myTags.includes(pref.key);
            return (
              <Pressable key={pref.key} onPress={() => togglePref(pref.key)} style={[styles.prefChip, selected && styles.prefChipActive]}>
                <Ionicons name={pref.icon} size={15} color={selected ? COLORS.primaryText : COLORS.secondaryText} />
                <Text style={[styles.prefText, selected && styles.prefTextActive]}>{pref.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable disabled={saving} onPress={() => void save()} style={[styles.saveButton, saving && { opacity: 0.55 }]}><Text style={styles.saveText}>{saving ? "Đang lưu…" : "Lưu lựa chọn"}</Text></Pressable>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.titleRow}>
        <View><Text style={styles.heading}>Gợi ý hôm nay</Text><Text style={styles.help}>{menu.personalized ? "Đang dùng bộ lọc riêng của bạn. Bạn có thể đổi món trong chế độ này; xóa bộ lọc để quay về thực đơn chung của cả nhà." : "Thực đơn chung của cả nhà — đổi theo ngày và giống nhau với mọi thành viên chưa bật bộ lọc."}</Text></View>
      </View>
      <View style={styles.menuList}>
        {(["sang", "trua", "toi"] as const).map(slot => {
          const recipe = menu[slot];
          return recipe ? <RecipeCard
            key={slot}
            title={mealLabel[slot]}
            recipe={recipe}
            onOpen={() => setOpened(recipe)}
            onSwap={menu.personalized ? () => setOffsets(o => ({ ...o, [slot]: o[slot] + 1 })) : undefined}
          /> : null;
        })}
      </View>

      <BloomTextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Tìm món mình đang thèm…"
        isSearch
        containerStyle={styles.searchField}
      />
      {!!search && (
        <View style={styles.menuList}>
          {searchResults.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} onOpen={() => setOpened(recipe)} />)}
          {!searchResults.length && <Text style={styles.empty}>Chưa thấy món nào đúng ý. Thử một từ khóa khác nhé.</Text>}
        </View>
      )}

      <BloomNoteCallout title="Một thực đơn mới mỗi ngày" icon="sunny-outline" tone="amber">Mỗi ngày Bloom mở ra một thực đơn chung mới cho cả nhà. Khi bạn chọn khẩu vị riêng, những gợi ý dành cho bạn sẽ đổi theo thật nhẹ nhàng.</BloomNoteCallout>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 18, gap: 14, paddingBottom: 24 },
  prefCard: { borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, padding: 15, gap: 10 },
  heading: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900" },
  help: { color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  prefWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  prefChip: { flexDirection: "row", gap: 5, alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.softSurface },
  prefChipActive: { backgroundColor: COLORS.accentBg, borderWidth: 1, borderColor: COLORS.primary },
  prefText: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "800" },
  prefTextActive: { color: COLORS.primaryText },
  saveButton: { alignSelf: "flex-start", backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  saveText: { color: "#fff", fontSize: 11.5, fontWeight: "900" },
  titleRow: { marginTop: 2 },
  menuList: { gap: 10 },
  recipeCard: { borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, padding: 15 },
  slotLabel: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900", textTransform: "uppercase", marginBottom: 9 },
  recipeTop: { flexDirection: "row", gap: 10, alignItems: "center" },
  foodIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  recipeCopy: { flex: 1 },
  recipeName: { color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900" },
  recipeMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5 },
  recipeSummary: { marginTop: 9, color: COLORS.secondaryText, fontSize: 12, lineHeight: 17 },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 11 },
  secondaryButton: { flexDirection: "row", gap: 4, alignItems: "center", backgroundColor: COLORS.softSurface, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8 },
  secondaryText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  searchField: { marginBottom: 12 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, paddingHorizontal: 12, minHeight: 46 },
  searchInput: { flex: 1, color: COLORS.primaryText, fontSize: 13 },
  catalogNote: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: COLORS.softSurface, borderRadius: 16, padding: 12 },
  catalogNumber: { color: COLORS.primary, fontSize: 22, fontWeight: "900" },
  catalogText: { flex: 1, color: COLORS.secondaryText, fontSize: 11, lineHeight: 15 },
  detail: { marginTop: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: 16, gap: 8, marginBottom: 24 },
  detailHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  detailTitle: { color: COLORS.primaryText, fontSize: 20, lineHeight: 25, fontWeight: "900" },
  sectionTitle: { marginTop: 10, color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  line: { color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 19 },
  step: { flexDirection: "row", gap: 9, alignItems: "flex-start", marginTop: 5 },
  stepNo: { width: 25, height: 25, borderRadius: 9, backgroundColor: COLORS.accentBg, alignItems: "center", justifyContent: "center" },
  stepNoText: { color: COLORS.primaryText, fontSize: 11, fontWeight: "900" },
  stepText: { flex: 1, color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 19 },
  healthNote: { flexDirection: "row", gap: 7, alignItems: "flex-start", backgroundColor: COLORS.softSurface, borderRadius: 13, padding: 10, marginTop: 9 },
  healthText: { flex: 1, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  error: { color: "#A7475B", backgroundColor: "#FFF0F3", padding: 10, borderRadius: 12, fontSize: 12 },
  empty: { textAlign: "center", color: COLORS.secondaryText, paddingVertical: 18, fontSize: 12 },
});
