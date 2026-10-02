import { BloomButton } from "@/components/ui/BloomButtonComponents";
import { BloomTextInput } from "@/components/ui/BloomInputComponents";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { BloomKeyboardScreen } from "../../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { COLORS } from "../../constants/theme";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const router = useRouter();
  const { loginWithGoogle, sendPhoneCode, isLoadingPhone } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleSendOTP = async () => {
    const success = await sendPhoneCode(phoneNumber);
    if (success) router.push("/(auth)/otp");
  };

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <BloomKeyboardScreen contentContainerStyle={styles.container}>
        <BloomHeroHeader
          eyebrow="CHÀO MỪNG VỀ NHÀ"
          title="Một nơi để nhà mình luôn gần nhau"
          subtitle="Đăng nhập để cùng lưu những ngày đáng nhớ, những người mình thương và câu chuyện của cả nhà."
          variant="auth"
          compact
        />

        <View style={styles.formWrap}>
          <View style={styles.brandRow}>
            <View>
              <Text style={styles.title}>Family Bloom</Text>
              <Text style={styles.subtitle}>Nhà mình, cùng một nơi 🌷</Text>
            </View>
            <View style={styles.miniBloom}><Ionicons name="flower-outline" size={22} color={COLORS.primary} /></View>
          </View>

          <BloomTextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            label="Số điện thoại"
            placeholder="Số của bạn nè 🌷"
            keyboardType="phone-pad"
            leftIcon={<Image source={require("../../../assets/images/flag.png")} style={styles.inputFlag} />}
            containerStyle={{ width: "100%" }}
          />

          <BloomButton
            title="TIẾP TỤC"
            icon={<Ionicons name="arrow-forward" color={COLORS.white} size={22} />}
            iconPosition="right"
            onPress={handleSendOTP}
            customStyle={styles.primaryButton}
            isLoading={isLoadingPhone}
          />

          <View style={styles.dividerRow}><View style={styles.divider}/><Text style={styles.orText}>HOẶC</Text><View style={styles.divider}/></View>
          <BloomButton
            title="ĐĂNG NHẬP VỚI GOOGLE"
            icon={<Ionicons name="logo-google" size={22} color={COLORS.white} />}
            customStyle={styles.googleButton}
            disabled={isLoadingPhone}
            onPress={loginWithGoogle}
          />
          <Text style={styles.promise}>Bloom chỉ dùng thông tin cần thiết để giữ đúng ngôi nhà và kỷ niệm của bạn.</Text>
        </View>
      </BloomKeyboardScreen>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingBottom: 24, backgroundColor: COLORS.background },
  formWrap: {
    marginTop: -18,
    marginHorizontal: 16,
    padding: 22,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#EBCAD6",
    shadowColor: "#7E5260",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 4,
  },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  miniBloom: { width: 46, height: 46, borderRadius: 17, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 25, fontWeight: "900", color: COLORS.primaryText, letterSpacing: -0.4 },
  subtitle: { marginTop: 5, fontSize: 13.5, color: COLORS.secondaryText, fontWeight: "600" },
  inputFlag: { width: 24, height: 22, borderRadius: 5 },
  primaryButton: { width: "100%", marginTop: 2 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  orText: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "900", letterSpacing: 0.9 },
  googleButton: { width: "100%" },
  promise: { marginTop: 16, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, textAlign: "center" },
});
