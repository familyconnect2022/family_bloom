import { useBloomColorsRevision , useBloomTypographyRevision} from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


export const ScreenContainer = ({
  children,
  edgeToEdgeTop = false,
  edgeToEdgeHorizontal = false,
  backgroundColor,
  keyboardSafe = false,
  keyboardVerticalOffset = 0,
}: {
  children: ReactNode;
  edgeToEdgeTop?: boolean;
  edgeToEdgeHorizontal?: boolean;
  backgroundColor?: string;
  /** For list-based screens that cannot use BloomKeyboardScreen without nesting scroll views. */
  keyboardSafe?: boolean;
  keyboardVerticalOffset?: number;
}) => {
  const __a3_styles = useA3LegacyStyles(styles);
  const themeColors = useA3Theme().colors;
  const actualBackground = backgroundColor ?? themeColors.softSurface;

  
  
  const content = (
    <View
      style={[
        __a3_styles.container,
        edgeToEdgeTop && __a3_styles.containerEdgeTop,
        edgeToEdgeHorizontal && __a3_styles.containerEdgeHorizontal,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={edgeToEdgeTop ? ['left', 'right', 'bottom'] : undefined}
      style={[__a3_styles.safeArea, { backgroundColor: actualBackground }]}
    >
      {keyboardSafe ? (
        <KeyboardAvoidingView
          style={__a3_styles.keyboardRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {content}
        </KeyboardAvoidingView>
      ) : content}
    </SafeAreaView>
  );
};

const styles = createBloomStyles(() => StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardRoot: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  containerEdgeTop: { paddingTop: 0 },
  containerEdgeHorizontal: { paddingHorizontal: 0 },
}));
