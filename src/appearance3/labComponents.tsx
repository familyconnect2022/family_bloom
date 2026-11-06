/** Standalone Appearance 3.0 primitives. No COLORS Proxy, createBloomStyles,
 * BloomText registry, WeakSet, or imperative global read during render.
 * The caller passes explicit immutable tokens so Compiler can track changes.
 */
import type { ReactNode } from 'react';
import { Modal, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import type { A3Tokens } from './useAppearance3';

type Base = { tokens: A3Tokens };
export function A3Text({tokens,children,role='body',muted=false,strong=false}:{tokens:A3Tokens;children:ReactNode;role?:keyof A3Tokens['sizes'];muted?:boolean;strong?:boolean}) {
  return <Text allowFontScaling style={{fontFamily:tokens.typography.family,fontSize:tokens.sizes[role],letterSpacing:tokens.typography.letterSpacing,
    lineHeight:Math.ceil(tokens.sizes[role]*1.42),fontWeight:strong?'700':'400',color:muted?tokens.colors.secondaryText:tokens.colors.primaryText,flexShrink:1}}>{children}</Text>;
}
export function A3Card({tokens,children}:{tokens:A3Tokens;children:ReactNode}) {
  return <View style={{backgroundColor:tokens.colors.card,borderColor:tokens.colors.border,borderWidth:1,borderRadius:20,padding:15,gap:10}}>{children}</View>;
}
export function A3Button({tokens,label,onPress,kind='solid',disabled=false}:{tokens:A3Tokens;label:string;onPress:()=>void;kind?:'solid'|'outline';disabled?:boolean}) {
  const solid=kind==='solid';
  return <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
    style={({pressed})=>({minHeight:Math.max(48,tokens.sizes.body*2.9),paddingHorizontal:16,paddingVertical:12,borderRadius:15,
      backgroundColor:solid?tokens.colors.primary:tokens.colors.surface,borderColor:solid?tokens.colors.primary:tokens.colors.border,
      borderWidth:1,justifyContent:'center',alignItems:'center',opacity:disabled?0.5:pressed?0.75:1})}>
    <Text allowFontScaling style={{fontFamily:tokens.typography.family,fontSize:tokens.sizes.body,fontWeight:'700',textAlign:'center',
      color:solid?tokens.colors.buttonPrimaryText:tokens.colors.primaryText}}>{label}</Text>
  </Pressable>;
}
export function A3Input({tokens,value,onChangeText,placeholder='Nhập nội dung tiếng Việt…',...rest}:Base & Pick<TextInputProps,'value'|'onChangeText'|'placeholder'|'onFocus'|'onBlur'>) {
  return <TextInput {...rest} accessibilityLabel="Appearance Lab input" value={value} onChangeText={onChangeText} placeholder={placeholder}
    placeholderTextColor={tokens.colors.inputPlaceholder} selectionColor={tokens.colors.primary} multiline
    style={{minHeight:72,maxHeight:180,textAlignVertical:'top',padding:13,borderWidth:1,borderRadius:14,
      borderColor:tokens.colors.inputBorder,backgroundColor:tokens.colors.inputSurface,color:tokens.colors.primaryText,
      fontFamily:tokens.typography.family,fontSize:tokens.sizes.body,lineHeight:Math.ceil(tokens.sizes.body*1.4)}} />;
}
export function A3Modal({tokens,visible,onClose}:{tokens:A3Tokens;visible:boolean;onClose:()=>void}) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View style={{flex:1,justifyContent:'center',padding:22,backgroundColor:tokens.colors.overlay}}>
      <View style={{padding:20,borderRadius:24,gap:14,backgroundColor:tokens.colors.surface,borderColor:tokens.colors.border,borderWidth:1}}>
        <A3Text tokens={tokens} role="title" strong>Thử nghiệm Modal</A3Text>
        <A3Text tokens={tokens}>Đổi màu và cỡ chữ, sau đó mở lại modal. Nền, viền, nút và chữ phải cùng cập nhật.</A3Text>
        <A3Button tokens={tokens} label="Đóng Modal" onPress={onClose}/>
      </View>
    </View>
  </Modal>;
}
