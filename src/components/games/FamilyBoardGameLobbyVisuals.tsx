import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { COLORS } from '../../constants/theme';
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { FamilyMember } from "../../types";

export type ArenaPalette = { primary: string; deep: string; background: string; surface: string; pale: string; border: string };
export type ArenaPresence = "online_app" | "in_lobby" | "in_game" | "busy" | "offline" | "reconnecting" | "test_background" | undefined;

const names = (member: FamilyMember) => member.shortName?.trim() || member.displayName?.trim() || "Người thân";
export function mayChallengeMember(status: ArenaPresence): boolean { return status === "online_app" || status === "in_lobby" || status === "test_background"; }
export function memberPresenceText(status: ArenaPresence): string {
  switch (status) { case "in_lobby": return "Đang ở sảnh · Sẵn sàng chơi";
    case "online_app": return "Đang dùng Family Bloom";
    case "test_background": return "Thử nghiệm ứng dụng kép · sẵn sàng tạm thời";
    case "in_game": return "Đang trong ván cờ";
    case "busy": return "Đang có lời mời / ván khác";
    case "reconnecting": return "Đang kết nối lại";
    default: return "Hiện không online"; }
}
export function ArenaPlayerRow({ member, presence, theme, onChallenge, waiting, sending=false, inviteWithoutPresence=false }: {
  member: FamilyMember; presence: ArenaPresence; theme: ArenaPalette; onChallenge: () => void; waiting: boolean; sending?: boolean; inviteWithoutPresence?: boolean;
}) {
  useBloomThemeRevision();
  const active = inviteWithoutPresence ? presence !== "busy" && presence !== "in_game" : mayChallengeMember(presence);
  const title = names(member);
  return <View style={[styles.playerRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
    <View style={styles.avatarWrap}>
      {member.avatarUrl ? <Image source={{ uri: member.avatarUrl }} style={styles.avatar} /> :
        <View style={[styles.avatar, { backgroundColor: theme.pale, alignItems:"center",justifyContent:"center" }]}><Text style={[styles.avatarLetter,{color:theme.deep}]}>{title.slice(0,1).toLocaleUpperCase("vi")}</Text></View>}
      <View style={[styles.presenceDot,{backgroundColor:active?COLORS.selectedBackground:presence==="in_game"||presence==="busy"?COLORS.selectedBackground:COLORS.selectedBackground}]} />
    </View>
    <View style={styles.personText}><Text style={styles.personName} numberOfLines={1}>{title}</Text><Text style={styles.personStatus} numberOfLines={1}>{inviteWithoutPresence && !presence ? "Có thể gửi lời mời · không cần online" : memberPresenceText(presence)}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Thách đấu ${title}`} disabled={!active || waiting} onPress={onChallenge}
      style={({pressed})=>[styles.inviteButton,{backgroundColor:active?theme.primary:COLORS.softSurface, opacity:waiting&&!sending?0.5:pressed?0.75:1}]}>
      {sending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name={active?"flash":"lock-closed-outline"} size={14} color={active?COLORS.white:COLORS.secondaryText}/>}
      <Text style={[styles.inviteText,{color:active?COLORS.white:COLORS.secondaryText}]}>{sending?"Đang gửi…":active?"Mời đấu":"Đang bận"}</Text>
    </Pressable>
  </View>;
}
export function ArenaRuleLine({ icon, children, theme }: {icon: keyof typeof Ionicons.glyphMap;children: React.ReactNode;theme:ArenaPalette}) {
  useBloomThemeRevision();
  return <View style={styles.ruleLine}><View style={[styles.ruleIcon,{backgroundColor:theme.pale}]}><Ionicons name={icon} size={16} color={theme.deep}/></View><Text style={styles.ruleText}>{children}</Text></View>;
}
const styles=createBloomStyles(() => StyleSheet.create({
 playerRow:{flexDirection:"row",alignItems:"center",borderWidth:1,borderRadius:21,padding:11,marginBottom:9,gap:11},
 avatarWrap:{width:52,height:52},avatar:{width:52,height:52,borderRadius:18},avatarLetter:{fontSize:23,fontWeight:"900"},
 presenceDot:{width:13,height:13,borderRadius:8,position:"absolute",bottom:-2,right:-2,borderWidth:2,borderColor:COLORS.border},
 personText:{flex:1,minWidth:0},personName:{fontSize:14,fontWeight:"800",color:COLORS.primaryText},personStatus:{fontSize:10.5,marginTop:5,color:COLORS.secondaryText},
 inviteButton:{borderRadius:14,paddingHorizontal:11,minHeight:38,flexDirection:"row",alignItems:"center",gap:5},inviteText:{fontSize:11,fontWeight:"800"},
 ruleLine:{flexDirection:"row",alignItems:"center",gap:9,marginTop:9},ruleIcon:{width:30,height:30,borderRadius:11,alignItems:"center",justifyContent:"center"},ruleText:{flex:1,fontSize:11.5,lineHeight:18,color:COLORS.secondaryText},
}));
