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
import { PollFeaturePanel } from "../../../features/home/polls/PollFeaturePanel";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


export default function HomePollsScreen() {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  const router = useRouter();
  const { activeMembership } = useAuth();

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
      <BloomHeroHeader
        eyebrow="CÙNG QUYẾT ĐỊNH"
        title="Hỏi một câu, nghe đúng nhóm"
        subtitle={`Cùng ${activeMembership?.familyName || "cả nhà"} hỏi một điều, chọn đúng nhóm và nhìn kết quả thật rõ ràng.`}
        variant="poll"
        onBack={() => router.back()}
        roundedBottom
        compact
      />
      <BloomKeyboardScreen contentContainerStyle={__a3_styles.body}>
        <PollFeaturePanel />
      </BloomKeyboardScreen>
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 34 },
}));
