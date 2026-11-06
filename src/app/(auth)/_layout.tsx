import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { Stack } from "expo-router";
import { BLOOM_MOTION } from "../../constants/motion";

export default function AuthLayout() {
  useBloomThemeRevision();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: BLOOM_MOTION.screen.animation,
        animationDuration: BLOOM_MOTION.screen.duration,
      }}
    />
  );
}
