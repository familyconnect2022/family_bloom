import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { BloomKeyboardScreen } from "../../../../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../../../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../../../components/ui/BloomHeroHeader";
import { COLORS } from "../../../../constants/theme";
import { KitchenFeaturePanel } from "../../../../features/home/kitchen/KitchenFeaturePanel";

export default function HomeKitchenScreen() {
  const router = useRouter();
  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <BloomHeroHeader
          eyebrow="BẾP NHÀ MÌNH"
          title="Hôm nay mình nấu gì?"
          subtitle="Mỗi ngày Bloom gợi một mâm cơm Việt mới, rồi nhẹ nhàng điều chỉnh theo khẩu vị của từng người trong nhà."
          variant="kitchen"
          onBack={() => router.back()}
          roundedBottom
          compact
        />
      <BloomKeyboardScreen contentContainerStyle={styles.body}>
        <KitchenFeaturePanel />
      </BloomKeyboardScreen>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 32 },
});
