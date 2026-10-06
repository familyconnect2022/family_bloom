import type { ReactNode } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../../constants/theme";
import { BloomHeroHeader, type BloomHeroVariant } from "./BloomHeroHeader";

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
}: BloomFullScreenFlowProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={() => {
        if (!backDisabled) onBack();
      }}
    >
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]} testID={testID}>
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
        <View style={styles.body}>{children}</View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFD1E0" },
  body: {
    flex: 1,
    marginTop: -18,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
    backgroundColor: COLORS.background,
  },
});
