import { View, type ViewProps } from 'react-native';
import { useBloomColorsRevision } from '../../theme/BloomThemeProvider';
import { COLORS } from '../../constants/theme';
import { useA3Theme } from '../../appearance3/useAppearance3';

/** Tiny palette-only native surface; never remounts routing/Auth children. */
export function BloomThemedPlane({ tone, style, ...props }: ViewProps & {tone:'surface'|'background'}) {
  const __a3Colors = useA3Theme().colors;

  useBloomColorsRevision();
  return <View {...props} style={[style, {backgroundColor:__a3Colors[tone]}]} />;
}
