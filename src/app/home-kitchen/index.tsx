import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { COLORS } from "../../constants/theme";
import { KitchenFeaturePanel } from "../../features/home/kitchen/KitchenFeaturePanel";

export default function HomeKitchenScreen() {
  const router = useRouter();
  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <BloomHeroHeader
          eyebrow="BẾP NHÀ MÌNH"
          title="Hôm nay mình nấu gì?"
          subtitle="100 món Việt được đóng gói ngay trong Bloom, đổi theo ngày và ưu tiên ăn uống của các user trong Nhà Mình."
          variant="kitchen"
          onBack={() => router.back()}
          roundedBottom
          compact
        />
        <View style={styles.body}>
          <KitchenFeaturePanel />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  body: { paddingHorizontal: 16 },
});
