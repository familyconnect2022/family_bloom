import { useBloomThemeRevision } from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../BloomText';
import { COLORS } from "../../../constants/theme";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


export type AvatarPickerChoice = "camera" | "library";
export function AvatarSourceSheet({ visible, disabled, canRemove, onClose, onPick, onRemove }: {
  visible: boolean; disabled?: boolean; canRemove?: boolean; onClose: () => void;
  onPick: (choice: AvatarPickerChoice) => void;
  onRemove?: () => void;
}) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  return <Modal transparent visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
    <View style={__a3_styles.overlay}>
      <Pressable accessibilityLabel="Đóng chọn ảnh" onPress={onClose} style={StyleSheet.absoluteFill}/>
      <View style={__a3_styles.sheet}>
        <View style={__a3_styles.handle}/>
        <View style={__a3_styles.header}>
          <Text style={__a3_styles.title}>Chọn ảnh đại diện</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={onClose} style={__a3_styles.close}>
            <Ionicons name="close" size={22} color={__a3Colors.primaryText}/>
          </Pressable>
        </View>
        <Pressable disabled={disabled} onPress={() => onPick("camera")} style={__a3_styles.option} accessibilityRole="button">
          <View style={[__a3_styles.icon,{ backgroundColor:__a3Colors.softSurface }]}><Ionicons name="camera-outline" size={23} color={__a3Colors.primary}/></View>
          <View style={__a3_styles.copy}><Text style={__a3_styles.optionTitle}>Chụp ảnh mới</Text><Text style={__a3_styles.caption}>Mở máy ảnh của điện thoại</Text></View>
          <Ionicons name="chevron-forward" size={17} color={__a3Colors.secondaryText}/>
        </Pressable>
        <Pressable disabled={disabled} onPress={() => onPick("library")} style={__a3_styles.option} accessibilityRole="button">
          <View style={[__a3_styles.icon,{ backgroundColor:__a3Colors.surface }]}><Ionicons name="images-outline" size={23} color={__a3Colors.primary}/></View>
          <View style={__a3_styles.copy}><Text style={__a3_styles.optionTitle}>Chọn từ thư viện ảnh</Text><Text style={__a3_styles.caption}>Ảnh đã lưu trên thiết bị</Text></View>
          <Ionicons name="chevron-forward" size={17} color={__a3Colors.secondaryText}/>
        </Pressable>
        {canRemove && onRemove ? <Pressable accessibilityRole="button" accessibilityLabel="Bỏ ảnh đại diện"
          onPress={onRemove} style={__a3_styles.removeAction}>
          <Ionicons name="trash-outline" size={16} color={__a3Colors.primary}/>
          <Text style={__a3_styles.removeLabel}>Bỏ ảnh đại diện</Text>
        </Pressable> : null}
      </View>
    </View>
  </Modal>;
}
const styles = createBloomStyles(() => StyleSheet.create({
  overlay: {flex:1,justifyContent:"flex-end",backgroundColor:"rgba(28,20,31,0.45)"},
  sheet: {backgroundColor:COLORS.surface,borderTopLeftRadius:28,borderTopRightRadius:28,paddingTop:10,paddingHorizontal:20,paddingBottom:34,maxHeight:"90%"},
  handle:{alignSelf:"center",width:42,height:5,borderRadius:20,backgroundColor:COLORS.softSurface,marginBottom:14},
  header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:13},
  title:{fontSize:19,fontWeight:"900",color:COLORS.primaryText},
  close:{width:36,height:36,borderRadius:13,backgroundColor:COLORS.surface,alignItems:"center",justifyContent:"center"},
  option:{minHeight:76,flexDirection:"row",alignItems:"center",gap:12,borderRadius:18,backgroundColor:COLORS.surface,marginBottom:9,paddingHorizontal:12,borderWidth:1,borderColor:COLORS.border},
  icon:{width:47,height:47,borderRadius:17,alignItems:"center",justifyContent:"center"},
  copy:{flex:1},optionTitle:{fontSize:14,fontWeight:"800",color:COLORS.primaryText},
  caption:{fontSize:11.5,color:COLORS.secondaryText,marginTop:4},
  removeAction:{flexDirection:"row",gap:8,alignItems:"center",justifyContent:"center",minHeight:42,marginTop:10},
  removeLabel:{fontSize:12,fontWeight:"800",color:COLORS.primary},
}));
