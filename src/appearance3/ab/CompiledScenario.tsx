/** Identical A/B scenario; only compiler directive and symbol prefix differ.
 * IMPORTANT: Do not import pre-compiled UI primitives into the OFF arm.
 * Both branches must render their own Text, Card, Input, Button, Modal.
 */
import { Profiler, useLayoutEffect, type ReactNode } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import type { A3Tokens } from '../useAppearance3';
import type { ABScenarioProps } from './types';

function CompiledText({tokens,children,role='body',strong=false,muted=false}:{tokens:A3Tokens;children:ReactNode;role?:keyof A3Tokens['sizes'];strong?:boolean;muted?:boolean}) {
  'use memo';
  return <Text allowFontScaling style={{fontFamily:tokens.typography.family,fontSize:tokens.sizes[role],
    lineHeight:Math.ceil(tokens.sizes[role]*1.42),letterSpacing:tokens.typography.letterSpacing,
    fontWeight:strong?'700':'400',color:muted?tokens.colors.secondaryText:tokens.colors.primaryText,flexShrink:1}}>{children}</Text>;
}
function CompiledCard({tokens,children}:{tokens:A3Tokens;children:ReactNode}) {
  'use memo';
  return <View style={{backgroundColor:tokens.colors.card,borderColor:tokens.colors.border,borderWidth:1,
    borderRadius:20,padding:14,gap:9}}>{children}</View>;
}
function CompiledButton({tokens,label,onPress,kind='solid'}:{tokens:A3Tokens;label:string;onPress:()=>void;kind?:'solid'|'outline'}) {
  'use memo';
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
function CompiledInput({tokens,value,onChangeText}:{tokens:A3Tokens;value:string;onChangeText:(text:string)=>void}) {
  'use memo';
  return <TextInput accessibilityLabel="Appearance A/B Input" value={value} onChangeText={onChangeText}
    placeholder="Nhập tên thành viên…" placeholderTextColor={tokens.colors.inputPlaceholder}
    selectionColor={tokens.colors.primary} multiline
    style={{minHeight:64,maxHeight:180,textAlignVertical:'top',padding:12,borderWidth:1,borderRadius:14,
      borderColor:tokens.colors.inputBorder,backgroundColor:tokens.colors.inputSurface,
      color:tokens.colors.primaryText,fontFamily:tokens.typography.family,fontSize:tokens.sizes.body,
      lineHeight:Math.ceil(tokens.sizes.body*1.42)}}/>;
}
function CompiledModal({tokens,visible,onClose}:{tokens:A3Tokens;visible:boolean;onClose:()=>void}) {
  'use memo';
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View style={{flex:1,justifyContent:'center',padding:22,backgroundColor:tokens.colors.overlay}}>
      <View style={{padding:18,borderRadius:22,gap:12,backgroundColor:tokens.colors.surface,
        borderColor:tokens.colors.border,borderWidth:1}}>
        <CompiledText tokens={tokens} role="title" strong>Modal · thử đổi theme</CompiledText>
        <CompiledText tokens={tokens}>Màu, viền và cỡ chữ phải cập nhật đồng loạt.</CompiledText>
        <CompiledButton tokens={tokens} label="Đóng Modal" onPress={onClose}/>
      </View>
    </View>
  </Modal>;
}
export function CompiledScenario({tokens,step,onText,onPress,onOpen,onClose,onCommit,onRender}:ABScenarioProps) {
  'use memo';
  useLayoutEffect(()=>{onCommit('on',step.seq);},[onCommit,step.seq]);
  return <View style={{gap:10}}>
    <Profiler id="on.card" onRender={onRender}>
      <CompiledCard tokens={tokens}>
        <Profiler id="on.text" onRender={onRender}>
          <View style={{gap:8}}>
            <CompiledText tokens={tokens} role="title" strong>Thẻ gia đình · Compiler ON</CompiledText>
            <CompiledText tokens={tokens}>Cả nhà mình cùng nở hoa. Thử font và cỡ chữ tới 160%.</CompiledText>
            <CompiledText tokens={tokens} muted role="caption">Card cha và chữ con nhận cùng token.</CompiledText>
          </View>
        </Profiler>
        <Profiler id="on.input" onRender={onRender}>
          <CompiledInput tokens={tokens} value={step.value} onChangeText={onText}/>
        </Profiler>
        <Profiler id="on.button" onRender={onRender}>
          <CompiledButton tokens={tokens} label={`Đã bấm ${step.presses} lần`} onPress={onPress}/>
        </Profiler>
        <CompiledButton tokens={tokens} label="Mở Modal" kind="outline" onPress={onOpen}/>
      </CompiledCard>
    </Profiler>
    <Profiler id="on.modal" onRender={onRender}>
      <CompiledModal tokens={tokens} visible={step.modalVisible} onClose={onClose}/>
    </Profiler>
  </View>;
}
