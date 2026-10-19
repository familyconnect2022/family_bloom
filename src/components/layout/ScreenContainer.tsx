import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';

export const ScreenContainer = ({
  children,
  edgeToEdgeTop = false,
  edgeToEdgeHorizontal = false,
  backgroundColor = COLORS.softSurface,
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
  const content = (
    <View
      style={[
        styles.container,
        edgeToEdgeTop && styles.containerEdgeTop,
        edgeToEdgeHorizontal && styles.containerEdgeHorizontal,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={edgeToEdgeTop ? ['left', 'right', 'bottom'] : undefined}
      style={[styles.safeArea, { backgroundColor }]}
    >
      {keyboardSafe ? (
        <KeyboardAvoidingView
          style={styles.keyboardRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {content}
        </KeyboardAvoidingView>
      ) : content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardRoot: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  containerEdgeTop: { paddingTop: 0 },
  containerEdgeHorizontal: { paddingHorizontal: 0 },
});
