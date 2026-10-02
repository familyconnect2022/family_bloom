import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';

export const ScreenContainer = ({
  children,
  edgeToEdgeTop = false,
  edgeToEdgeHorizontal = false,
  backgroundColor = COLORS.softSurface,
}: {
  children: ReactNode;
  edgeToEdgeTop?: boolean;
  edgeToEdgeHorizontal?: boolean;
  backgroundColor?: string;
}) => {
  return (
    <SafeAreaView
      edges={edgeToEdgeTop ? ['left', 'right', 'bottom'] : undefined}
      style={[styles.safeArea, { backgroundColor }]}
    >
      <View
        style={[
          styles.container,
          edgeToEdgeTop && styles.containerEdgeTop,
          edgeToEdgeHorizontal && styles.containerEdgeHorizontal,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  containerEdgeTop: { paddingTop: 0 },
  containerEdgeHorizontal: { paddingHorizontal: 0 },
});
