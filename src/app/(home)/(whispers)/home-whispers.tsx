import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomKeyboardScreen } from "../../../components/layout/BloomKeyboardScreen";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { WhisperFeaturePanel } from "../../../features/home/whispers/WhisperFeaturePanel";

export default function HomeWhispersScreen() {
  const router = useRouter();
  const { activeMembership } = useAuth();

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <BloomHeroHeader
        eyebrow="LỜI THÌ THẦM"
        title="Một lời nhỏ cho đúng người"
        subtitle={`Gửi riêng cho một người thân hoặc chia sẻ với ${activeMembership?.familyName || "cả nhà"} — nhẹ nhàng và đúng người.`}
        variant="whisper"
        onBack={() => router.back()}
        roundedBottom
        compact
      />
      <BloomKeyboardScreen contentContainerStyle={styles.body}>
        <WhisperFeaturePanel />
      </BloomKeyboardScreen>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 34 },
});
