import { BloomButton } from "@/components/ui/BloomButtonComponents";
import { BloomOTPInput } from "@/components/ui/BloomInputComponents";
import { COLORS } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BloomKeyboardScreen } from "../../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../../components/layout/ScreenContainer";

export default function OTP() {
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
    <ScreenContainer>
      <BloomKeyboardScreen contentContainerStyle={styles.container}>
        <View style={styles.icon}>
          <Ionicons name="shield-checkmark-outline" size={36} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Xác thực số điện thoại</Text>
        <Text style={styles.subtitle}>Nhập mã 6 số chúng tôi vừa gửi tới</Text>
        <Text style={styles.phone}>{maskedPhone}</Text>

        <BloomOTPInput length={6} onCodeFilled={handleCode} onCodeChange={handleCode} containerStyle={styles.otp} />

        <BloomButton
          title="Xác nhận mã"
          variant="primary"
          isLoading={isLoadingPhone}
          disabled={code.length !== 6}
          onPress={handleConfirm}
          customStyle={styles.verifyButton}
        />

        <Text style={styles.resendLabel}>Không nhận được mã?</Text>
        <BloomButton
          title={secondsLeft > 0 ? `Gửi lại sau ${secondsLeft}s` : "Gửi lại mã"}
          variant="outline"
          disabled={secondsLeft > 0 || isLoadingPhone}
          onPress={handleResend}
          customStyle={styles.resendButton}
        />
        <BloomButton
          title="Đổi số điện thoại"
          variant="outline"
          disabled={isLoadingPhone}
          onPress={() => router.replace("/(auth)/login")}
          customStyle={styles.changeButton}
        />
      </BloomKeyboardScreen>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
});
