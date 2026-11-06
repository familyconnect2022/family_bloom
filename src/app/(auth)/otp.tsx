import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { BloomButton } from "@/components/ui/BloomButtonComponents";
import { BloomOTPInput } from "@/components/ui/BloomInputComponents";
import { COLORS } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../components/ui/BloomText';
import { BloomKeyboardScreen } from "../../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


export default function OTP() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  const { pendingPhoneNumber, confirmPhoneCode, resendPhoneCode, isLoadingPhone } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (!pendingPhoneNumber) router.replace("/(auth)/login");
  }, [pendingPhoneNumber, router]);

  const handleCode = (value: string) => setCode(value);

  const handleConfirm = async () => {
    if (code.length !== 6) return;
    await confirmPhoneCode(code);
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || isLoadingPhone) return;
    const success = await resendPhoneCode();
    if (success) setSecondsLeft(30);
  };

  const maskedPhone = pendingPhoneNumber
    ? `${pendingPhoneNumber.slice(0, 4)}••••${pendingPhoneNumber.slice(-3)}`
    : "";

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <BloomHeroHeader eyebrow="MỞ CỬA NHÀ" title="Một bước nhỏ nữa thôi" subtitle="Nhập mã Bloom vừa gửi để mình biết đúng là bạn nhé." variant="auth" onBack={() => router.replace("/(auth)/login")} compact roundedBottom />
      <BloomKeyboardScreen contentContainerStyle={[__a3_styles.container, __a3_styles.pageBody]}>
        <View style={__a3_styles.icon}>
          <Ionicons name="shield-checkmark-outline" size={36} color={__a3Colors.primary} />
        </View>
        <Text style={__a3_styles.title}>Mã dành cho bạn</Text>
        <Text style={__a3_styles.subtitle}>Sáu con số nhỏ để Bloom mở đúng cánh cửa.</Text>
        <Text style={__a3_styles.phone}>{maskedPhone}</Text>

        <BloomOTPInput length={6} onCodeFilled={handleCode} onCodeChange={handleCode} containerStyle={__a3_styles.otp} />

        <BloomButton
          title="Xác nhận mã"
          variant="primary"
          isLoading={isLoadingPhone}
          disabled={code.length !== 6}
          onPress={handleConfirm}
          customStyle={__a3_styles.verifyButton}
        />

        <Text style={__a3_styles.resendLabel}>Không nhận được mã?</Text>
        <BloomButton
          title={secondsLeft > 0 ? `Gửi lại sau ${secondsLeft}s` : "Gửi lại mã"}
          variant="outline"
          disabled={secondsLeft > 0 || isLoadingPhone}
          onPress={handleResend}
          customStyle={__a3_styles.resendButton}
        />
        <BloomButton
          title="Đổi số điện thoại"
          variant="outline"
          disabled={isLoadingPhone}
          onPress={() => router.replace("/(auth)/login")}
          customStyle={__a3_styles.changeButton}
        />
      </BloomKeyboardScreen>
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  pageBody: { marginTop: -16, paddingTop: 34, backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  container: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  icon: { width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontSize: 25, fontWeight: "800", color: COLORS.primaryText, textAlign: "center" },
  subtitle: { marginTop: 10, fontSize: 15, color: COLORS.secondaryText, textAlign: "center" },
  phone: { marginTop: 6, fontSize: 16, fontWeight: "700", color: COLORS.primaryText },
  otp: { width: "100%", marginTop: 26 },
  verifyButton: { width: "100%", marginTop: 24 },
  resendLabel: { marginTop: 28, color: COLORS.secondaryText },
  resendButton: { width: "100%", marginTop: 8 },
  changeButton: { width: "100%", marginTop: 8 },
}));
