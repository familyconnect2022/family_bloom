import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { BloomCard, BloomEmptyState, BloomSectionHeader } from "../../components/ui/BloomPageComponents";
import { COLORS } from "../../constants/theme";
import { BLOOM_RECIPES_V1 } from "../../data/bloomRecipesV1";

export default function HomeKitchenRecipeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ recipeId?: string }>();
  const recipe = BLOOM_RECIPES_V1.find((item) => item.id === String(params.recipeId ?? ""));

  if (!recipe) {
    return (
      <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
        <StatusBar translucent backgroundColor="transparent" style="dark" />
        <BloomHeroHeader eyebrow="BẾP NHÀ MÌNH" title="Món này đang đi chợ" subtitle="Bloom chưa tìm thấy công thức bạn vừa mở." variant="living" onBack={() => router.back()} roundedBottom compact />
        <View style={styles.body}><BloomEmptyState icon="restaurant-outline" title="Chưa có công thức" description="Quay lại Bếp Nhà Mình để chọn một món khác nhé." /></View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader eyebrow="CÙNG NHAU VÀO BẾP" title={recipe.nameVi} subtitle={recipe.summary} variant="kitchen" onBack={() => router.back()} roundedBottom compact />
        <View style={styles.body}>
          <View style={styles.quickRow}>
            <View style={styles.quick}><Ionicons name="time-outline" size={17} color={COLORS.primaryText} /><Text style={styles.quickText}>{recipe.prepMinutes + recipe.cookMinutes} phút</Text></View>
            <View style={styles.quick}><Ionicons name="people-outline" size={17} color={COLORS.primaryText} /><Text style={styles.quickText}>{recipe.servings} người</Text></View>
            <View style={styles.quick}><Ionicons name="sparkles-outline" size={17} color={COLORS.primaryText} /><Text style={styles.quickText}>{recipe.difficulty}</Text></View>
          </View>

          <BloomSectionHeader title="Chuẩn bị" subtitle="Định lượng V1 để gia đình dễ bắt đầu; có thể nêm lại theo khẩu vị" />
          <BloomCard style={styles.card}>
            {recipe.ingredients.map((item, index) => (
              <View key={`${item.name}-${index}`} style={[styles.row, index > 0 && styles.rowBorder]}>
                <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
                <Text style={styles.rowText}>{item.name}: {item.amount}</Text>
              </View>
            ))}
          </BloomCard>

          <BloomSectionHeader title="Cùng làm từng bước" subtitle="Công thức Bloom biên soạn độc lập, không sao chép nội dung từ website khác" />
          <View style={styles.steps}>
            {recipe.steps.map((step, index) => (
              <BloomCard key={index} style={styles.stepCard}>
                <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>{index + 1}</Text></View>
                <Text style={styles.stepText}>{step}</Text>
              </BloomCard>
            ))}
          </View>

          <BloomCard style={styles.tipCard}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipTitle}>Về lựa chọn ăn uống</Text>
              <Text style={styles.tipText}>{recipe.nutritionNote}</Text>
            </View>
          </BloomCard>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 34 },
  body: { paddingHorizontal: 16, paddingTop: 18, gap: 16 },
  quickRow: { flexDirection: "row", gap: 8 },
  quick: { flex: 1, minHeight: 66, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", gap: 5 },
  quickText: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "900" },
  card: { paddingVertical: 5 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, paddingVertical: 8 },
  rowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  number: { width: 28, height: 28, borderRadius: 12, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  numberText: { color: COLORS.primaryText, fontSize: 11, fontWeight: "900" },
  rowText: { flex: 1, color: COLORS.primaryText, fontSize: 13, lineHeight: 18, fontWeight: "650" },
  steps: { gap: 9 },
  stepCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 15 },
  stepBadge: { width: 34, height: 34, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  stepBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: "900" },
  stepText: { flex: 1, color: COLORS.primaryText, fontSize: 13, lineHeight: 19, fontWeight: "650" },
  tipCard: { flexDirection: "row", gap: 10, backgroundColor: COLORS.surfaceFocus },
  tipTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  tipText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
});
