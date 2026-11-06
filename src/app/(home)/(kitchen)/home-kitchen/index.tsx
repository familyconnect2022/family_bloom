import { getBloomStatusBarStyle } from "../../../../constants/theme";
import { useBloomColorsRevision , useBloomTypographyRevision} from '../../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../../theme/createBloomStyles';
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { BloomKeyboardScreen } from "../../../../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../../../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../../../components/ui/BloomHeroHeader";
import { COLORS } from "../../../../constants/theme";
import { KitchenFeaturePanel } from "../../../../features/home/kitchen/KitchenFeaturePanel";
import { useA3Theme } from '../../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../../appearance3/compatReactiveStyles';


export default function HomeKitchenScreen() {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  const router = useRouter();
  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <StatusBar translucent backgroundColor="transparent" style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
      <BloomHeroHeader
          eyebrow="BẾP NHÀ MÌNH"
          title="Hôm nay mình nấu gì?"
          subtitle="Mỗi ngày Bloom gợi một mâm cơm Việt mới, rồi nhẹ nhàng điều chỉnh theo khẩu vị của từng người trong nhà."
          variant="kitchen"
          onBack={() => router.back()}
          roundedBottom
          compact
        />
      <BloomKeyboardScreen contentContainerStyle={__a3_styles.body}>
        <KitchenFeaturePanel />
      </BloomKeyboardScreen>
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 32 },
}));
