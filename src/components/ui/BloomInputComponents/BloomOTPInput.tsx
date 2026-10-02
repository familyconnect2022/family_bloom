import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import { NativeSyntheticEvent, StyleProp, StyleSheet, TextInput, TextInputKeyPressEventData, View, ViewStyle } from "react-native";
import { useBloomKeyboardFocus } from "../../layout/BloomKeyboardScreen";
import { COLORS } from "./shared";

export interface BloomOTPInputProps {
  length?: number;
  onCodeFilled: (code: string) => void;
  onCodeChange?: (code: string) => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const BloomOTPInput: React.FC<BloomOTPInputProps> = ({
  length = 4,
  onCodeFilled,
  onCodeChange,
  containerStyle,
}) => {
  const [code, setCode] = useState<string[]>(Array(length).fill(""));
  const inputsRef = useRef<Array<TextInput | null>>([]);
  const { revealInput } = useBloomKeyboardFocus();

  const handleChange = (text: string, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    onCodeChange?.(newCode.join(""));

    if (text && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    const fullCode = newCode.join("");
    if (fullCode.length === length && !newCode.includes("")) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onCodeFilled(fullCode);
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <View style={[styles.otpRow, containerStyle]}>
      {code.map((digit, idx) => (
        <TextInput
          key={idx}
          ref={(ref) => {
            inputsRef.current[idx] = ref;
          }}
          style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
          keyboardType="number-pad"
          maxLength={1}
          value={digit}
          onChangeText={(text) => handleChange(text, idx)}
          onFocus={() => revealInput(inputsRef.current[idx], 22)}
          onKeyPress={(e) => handleKeyPress(e, idx)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 8 },
  otpBox: {
    width: 56,
    height: 60,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.softSurface,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.primaryText,
  },
  otpBoxFilled: { borderColor: COLORS.primary, backgroundColor: COLORS.white },
});
