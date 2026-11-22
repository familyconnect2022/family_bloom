import { useBloomColorsRevision , useBloomTypographyRevision} from '../../theme/BloomThemeProvider';
import { getBloomStatusBarStyle } from "../../constants/theme";
import { createBloomStyles } from '../../theme/createBloomStyles';
import type { ReactNode } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../../constants/theme";
import { BloomHeroHeader, type BloomHeroVariant } from "./BloomHeroHeader";
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


export type BloomFullScreenFlowProps = {
  visible: boolean;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  onBack: () => void;
  backDisabled?: boolean;
  children: ReactNode;
  right?: ReactNode;
  variant?: BloomHeroVariant;
  compactHeader?: boolean;
  testID?: string;
  onDismiss?: () => void;
  dismissImmediately?: boolean;
};

/**
 * Full-screen surface for create/edit/manage flows.
 *
 * Phase 12 UX rule:
 * - substantive work opens as a real page, never a draggable 70% sheet;
 * - the purpose-aware hero reaches behind the status bar instead of sitting on a white strip;
 * - every page has a clear Back affordance and warm, explicit copy;
 * - callers own unsaved-change protection through `onBack`;
 * - lightweight pickers/confirmations can remain compact modals.
 */
export function BloomFullScreenFlow({
  visible,
  eyebrow = "FAMILY BLOOM",
  title,
  subtitle,
  onBack,
  backDisabled = false,
  children,
  right,
  variant = "generic",
  compactHeader = false,
  testID,
  onDismiss,
  dismissImmediately = false,
}: BloomFullScreenFlowProps) {
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <Modal
      visible={visible}
      animationType={dismissImmediately ? "none" : "slide"}
      presentationStyle="fullScreen"
      statusBarTranslucent
      onDismiss={onDismiss}
      onRequestClose={() => {
        if (!backDisabled) onBack();
      }}
    >
      <StatusBar style={getBloomStatusBarStyle()} />
      <SafeAreaView style={__a3_styles.safeArea} edges={["left", "right", "bottom"]} testID={testID}>
        <BloomHeroHeader
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          onBack={onBack}
          backDisabled={backDisabled}
          right={right}
          variant={variant}
          compact={compactHeader}
        />
        <View style={__a3_styles.body}>{children}</View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.softSurface },
  body: {
    flex: 1,
    marginTop: -18,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
    backgroundColor: COLORS.background,
  },
}));
