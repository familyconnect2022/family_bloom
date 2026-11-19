import { BLOOM_ABSOLUTE_FILL } from "../bloomAbsoluteFill";
import { useBloomThemeRevision } from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import { COLORS } from '../../../constants/theme';
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../BloomText';
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


export type AvatarUploadVisualState = { phase: "idle" | "uploading" | "complete" | "failed"; progress: number | null };
/** Progress follows the four edges of a rounded square. Never invent a percent.
 * When upload size is unknown show an indeterminate activity indicator instead.
 */
export const AvatarUploadFrame = ({ size, upload, onRetry, children }: {
  size: number; upload?: AvatarUploadVisualState; onRetry?: () => void; children: React.ReactNode;
}) => {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const phase = upload?.phase || "idle";
  const showUploadFrame = phase !== "idle";
  const percentage = typeof upload?.progress === "number" ? Math.min(100, Math.max(0, upload.progress)) : null;
  const progress = percentage === null ? 0 : percentage / 100;
  const color = phase === "failed" ? __a3Colors.destructive : phase === "complete" ? __a3Colors.positive : __a3Colors.primary;
  const stroke = 4;
  return (
    <View style={{ width: size + 10, height: size + 10, padding: 5, borderRadius: 27, backgroundColor: showUploadFrame ? __a3Colors.surface : "transparent" }}>
      {/* No decorative track in idle state. The former pale-pink top edge looked
          like an unrelated stripe above the avatar on profile/onboarding. */}
      {showUploadFrame && <View style={[__a3_styles.track, { borderColor: __a3Colors.border }]} pointerEvents="none"/>}
      {children}
      {phase === "uploading" && percentage === null && <View pointerEvents="none" style={__a3_styles.statusCorner}><ActivityIndicator color={color} size="small"/></View>}
      {phase === "failed" && <Pressable accessibilityRole="button" accessibilityLabel="Thử tải lại avatar" onPress={onRetry} style={[__a3_styles.statusCorner,{backgroundColor: __a3Colors.surface}]}><Ionicons name="refresh" size={15} color={color}/></Pressable>}
      {phase === "complete" && <View pointerEvents="none" style={[__a3_styles.statusCorner,{backgroundColor: __a3Colors.softSurface}]}><Ionicons name="checkmark" size={17} color={color}/></View>}
      {phase === "uploading" && percentage !== null && <>
        <View pointerEvents="none" style={[__a3_styles.edge, { left: 6, top: 2, height: stroke, width: Math.max(0, (size - 2) * Math.min(1, progress * 4)), backgroundColor: color }]}/>
        {progress > .25 && <View pointerEvents="none" style={[__a3_styles.edge,{right:2,top:5,width:stroke,height:(size-2)*Math.min(1,(progress-.25)*4),backgroundColor:color}]}/>} 
        {progress > .5 && <View pointerEvents="none" style={[__a3_styles.edge,{right:6,bottom:2,height:stroke,width:(size-2)*Math.min(1,(progress-.5)*4),backgroundColor:color}]}/>} 
        {progress > .75 && <View pointerEvents="none" style={[__a3_styles.edge,{left:2,bottom:5,width:stroke,height:(size-2)*Math.min(1,(progress-.75)*4),backgroundColor:color}]}/>} 
      </>}
      {phase === "uploading" && percentage !== null && <View style={__a3_styles.progressChip} pointerEvents="none"><Text style={__a3_styles.progressText}>{percentage}%</Text></View>}
    </View>
  );
};
const styles = createBloomStyles(() => StyleSheet.create({
  track: { ...BLOOM_ABSOLUTE_FILL, borderWidth: 3, borderRadius: 27 },
  edge: { position: "absolute", borderRadius: 5 },
  statusCorner: { position: "absolute", bottom: -7, left: -8, width: 29, height: 29,
    alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface, borderRadius: 12 },
  progressChip: { position: "absolute", left: 12, bottom: 10, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: COLORS.primary, borderRadius: 9 },
  progressText: { color: COLORS.onPrimary, fontSize: 10, fontWeight: "800" },
}));
