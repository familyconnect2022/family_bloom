/** Identical A/B scenario; only compiler directive and symbol prefix differ.
 * IMPORTANT: Do not import pre-compiled UI primitives into the OFF arm.
 * Both branches must render their own Text, Card, Input, Button, Modal.
 */
import { Profiler, useLayoutEffect, type ReactNode } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import type { A3Tokens } from '../useAppearance3';
import type { ABScenarioProps } from './types';

function UncompiledText({tokens,children,role='body',strong=false,muted=false}:{tokens:A3Tokens;children:ReactNode;role?:keyof A3Tokens['sizes'];strong?:boolean;muted?:boolean}) {
  'use no memo';
  return <Text allowFontScaling style={{fontFamily:tokens.typography.family,fontSize:tokens.sizes[role],
    lineHeight:Math.ceil(tokens.sizes[role]*1.42),letterSpacing:tokens.typography.letterSpacing,
    fontWeight:strong?'700':'400',color:muted?tokens.colors.secondaryText:tokens.colors.primaryText,flexShrink:1}}>{children}</Text>;
}
function UncompiledCard({tokens,children}:{tokens:A3Tokens;children:ReactNode}) {
  'use no memo';
  return <View style={{backgroundColor:tokens.colors.card,borderColor:tokens.colors.border,borderWidth:1,
    borderRadius:20,padding:14,gap:9}}>{children}</View>;
}
function UncompiledButton({tokens,label,onPress,kind='solid'}:{tokens:A3Tokens;label:string;onPress:()=>void;kind?:'solid'|'outline'}) {
  'use no memo';
  const solid=kind==='solid';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({pressed})=>({minHeight:Math.max(48,tokens.sizes.body*2.9),padding:12,borderRadius:14,
      borderWidth:1,borderColor:solid?tokens.colors.primary:tokens.colors.border,
      backgroundColor:solid?tokens.colors.primary:tokens.colors.surface,
      justifyContent:'center',alignItems:'center',opacity:pressed?.78:1})}>
    <Text allowFontScaling style={{fontFamily:tokens.typography.family,fontSize:tokens.sizes.body,
      color:solid?tokens.colors.buttonPrimaryText:tokens.colors.primaryText,fontWeight:'700',textAlign:'center'}}>{label}</Text>
  </Pressable>;
}
function UncompiledInput({tokens,value,onChangeText}:{tokens:A3Tokens;value:string;onChangeText:(text:string)=>void}) {
  'use no memo';
  return <TextInput accessibilityLabel="Appearance A/B Input" value={value} onChangeText={onChangeText}
    placeholder="Nhập tên thành viên…" placeholderTextColor={tokens.colors.inputPlaceholder}
    selectionColor={tokens.colors.primary} multiline
    style={{minHeight:64,maxHeight:180,textAlignVertical:'top',padding:12,borderWidth:1,borderRadius:14,
      borderColor:tokens.colors.inputBorder,backgroundColor:tokens.colors.inputSurface,
      color:tokens.colors.primaryText,fontFamily:tokens.typography.family,fontSize:tokens.sizes.body,
      lineHeight:Math.ceil(tokens.sizes.body*1.42)}}/>;
}
function UncompiledModal({tokens,visible,onClose}:{tokens:A3Tokens;visible:boolean;onClose:()=>void}) {
  'use no memo';
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View style={{flex:1,justifyContent:'center',padding:22,backgroundColor:tokens.colors.overlay}}>
      <View style={{padding:18,borderRadius:22,gap:12,backgroundColor:tokens.colors.surface,
        borderColor:tokens.colors.border,borderWidth:1}}>
        <UncompiledText tokens={tokens} role="title" strong>Modal · thử đổi theme</UncompiledText>
        <UncompiledText tokens={tokens}>Màu, viền và cỡ chữ phải cập nhật đồng loạt.</UncompiledText>
        <UncompiledButton tokens={tokens} label="Đóng Modal" onPress={onClose}/>
      </View>
    </View>
  </Modal>;
}
export function UncompiledScenario({tokens,step,onText,onPress,onOpen,onClose,onCommit,onRender}:ABScenarioProps) {
  'use no memo';
  useLayoutEffect(()=>{onCommit('off',step.seq);},[onCommit,step.seq]);
  return <View style={{gap:10}}>
    <Profiler id="off.card" onRender={onRender}>
      <UncompiledCard tokens={tokens}>
        <Profiler id="off.text" onRender={onRender}>
          <View style={{gap:8}}>
            <UncompiledText tokens={tokens} role="title" strong>Thẻ gia đình · Compiler OFF</UncompiledText>
            <UncompiledText tokens={tokens}>Cả nhà mình cùng nở hoa. Thử font và cỡ chữ tới 160%.</UncompiledText>
            <UncompiledText tokens={tokens} muted role="caption">Card cha và chữ con nhận cùng token.</UncompiledText>
          </View>
        </Profiler>
        <Profiler id="off.input" onRender={onRender}>
          <UncompiledInput tokens={tokens} value={step.value} onChangeText={onText}/>
        </Profiler>
        <Profiler id="off.button" onRender={onRender}>
          <UncompiledButton tokens={tokens} label={`Đã bấm ${step.presses} lần`} onPress={onPress}/>
        </Profiler>
        <UncompiledButton tokens={tokens} label="Mở Modal" kind="outline" onPress={onOpen}/>
      </UncompiledCard>
    </Profiler>
    <Profiler id="off.modal" onRender={onRender}>
      <UncompiledModal tokens={tokens} visible={step.modalVisible} onClose={onClose}/>
    </Profiler>
  </View>;
}
