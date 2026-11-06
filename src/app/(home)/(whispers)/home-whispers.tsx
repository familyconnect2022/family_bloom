import { getBloomStatusBarStyle } from "../../../constants/theme";
import { useBloomColorsRevision , useBloomTypographyRevision} from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomKeyboardScreen } from "../../../components/layout/BloomKeyboardScreen";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { WhisperFeaturePanel } from "../../../features/home/whispers/WhisperFeaturePanel";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


export default function HomeWhispersScreen() {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  const router = useRouter();
  const { activeMembership } = useAuth();

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <StatusBar translucent backgroundColor="transparent" style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
      <BloomHeroHeader
        eyebrow="LỜI THÌ THẦM"
        title="Một lời nhỏ cho đúng người"
        subtitle={`Gửi riêng cho một người thân hoặc chia sẻ với ${activeMembership?.familyName || "cả nhà"} — nhẹ nhàng và đúng người.`}
        variant="whisper"
        onBack={() => router.back()}
        roundedBottom
        compact
      />
      <BloomKeyboardScreen contentContainerStyle={__a3_styles.body}>
        <WhisperFeaturePanel />
      </BloomKeyboardScreen>
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 34 },
}));
