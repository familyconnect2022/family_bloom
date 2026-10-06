import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomKeyboardScreen } from "../../../components/layout/BloomKeyboardScreen";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { PollFeaturePanel } from "../../../features/home/polls/PollFeaturePanel";

export default function HomePollsScreen() {
  const router = useRouter();
  const { activeMembership } = useAuth();

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <BloomHeroHeader
        eyebrow="CÙNG QUYẾT ĐỊNH"
        title="Hỏi một câu, nghe đúng nhóm"
        subtitle={`Cùng ${activeMembership?.familyName || "cả nhà"} hỏi một điều, chọn đúng nhóm và nhìn kết quả thật rõ ràng.`}
        variant="poll"
        onBack={() => router.back()}
        roundedBottom
        compact
      />
      <BloomKeyboardScreen contentContainerStyle={styles.body}>
        <PollFeaturePanel />
      </BloomKeyboardScreen>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 34 },
});
