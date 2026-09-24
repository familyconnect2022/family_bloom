import { BloomButton } from "@/components/ui/BloomButtonComponents";
import { BloomTextInput } from "@/components/ui/BloomInputComponents";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { BloomKeyboardScreen } from "../../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { COLORS, UI } from "../../constants/theme";
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
    <ScreenContainer>
      <BloomKeyboardScreen contentContainerStyle={styles.container}>
        {/* THẺ TRẮNG CHỨA LOGO VÀ INPUT */}
        <View style={styles.card}>
          <View style={styles.logoFrame}>
            <Image
              source={require("../../../assets/images/login-family-icon.png")}
              style={styles.logo}
              contentFit="contain"
              transition={0}
              cachePolicy="memory-disk"
            />
          </View>
          <Text style={styles.title}>Family Bloom</Text>
          <Text style={styles.subtitle}>Nhà mình, cùng một nơi.</Text>
          <BloomTextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            label="Số điện thoại"
            placeholder="Số của bạn nè 🌷"
            keyboardType="phone-pad"
            leftIcon={
              <Image source={require("../../../assets/images/flag.png")} style={styles.inputFlag} />
            }
            containerStyle={{ width: "100%" }}
          />
        </View>

        {/* NÚT ĐĂNG NHẬP NẰM ĐÈ LÊN VIỀN THẺ */}
        <BloomButton
          title="TIẾP TỤC"
          icon={<Ionicons name="arrow-forward" color={COLORS.white} size={24} />}
          iconPosition="right"
          onPress={handleSendOTP}
          customStyle={{
            marginTop: -28,
            marginLeft: "5%",
            width: "90%",
            alignItems: "center",
            paddingHorizontal: 24,
            zIndex: 10,
          }}
          isLoading={isLoadingPhone}
        />
        {/* PHẦN ĐĂNG NHẬP GOOGLE & ĐĂNG KÝ */}
        <Text style={styles.orText}>--- OR ---</Text>
        <BloomButton
          title="ĐĂNG NHẬP VỚI GOOGLE"
          icon={<Ionicons name="logo-google" size={24} color={COLORS.white} />}
          customStyle={{ width: "90%", marginLeft: "5%" }}
          textStyle={{
            flex: 1,
            justifyContent: "center",
            textAlign: "center",
          }}
          disabled={isLoadingPhone}
          onPress={loginWithGoogle}
        />
      </BloomKeyboardScreen>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 30,
    paddingBottom: 45, // Chừa khoảng trống dưới cùng để nút bấm đè lên
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primaryText,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  logoFrame: {
    width: 176,
    height: 176,
    borderRadius: 88,
    marginTop: -88,
    marginBottom: 16,
    backgroundColor: COLORS.accentBg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 160,
    height: 160,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primaryText,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.secondaryText,
    marginBottom: 30,
  },
  inputContainer: {
    borderRadius: UI.borderRadiusInput,
    width: "100%",
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputFlag: {
    width: 24,
    height: 22,
    borderRadius: 5, // Bo tròn để tạo hình tròn
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: "transparent", // Màu hồng nhạt,
    paddingHorizontal: 10,
    fontSize: 16,
    color: COLORS.primaryText,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  mainButtonWrapper: {
    marginTop: -28, // Kéo nút lên đè vào viền dưới của card (một nửa chiều cao nút)
    marginLeft: "5%",
    width: "90%",
    alignItems: "center",
    paddingHorizontal: 24,
    zIndex: 10,
  },
  mainButton: {
    width: "100%",
    height: 56,
    borderRadius: 28, // Bo tròn nhiều hơn giống bản thiết kế
  },

  bottomSection: {
    alignItems: "center",
    marginTop: 10,
  },
  orText: {
    width: "100%",
    textAlign: "center",
    marginVertical: 20,
    color: COLORS.secondaryText,
    marginBottom: 20,
    fontSize: 14,
  },
});
