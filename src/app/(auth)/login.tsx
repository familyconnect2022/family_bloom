import { getBloomStatusBarStyle } from "../../constants/theme";
import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import type {ViewStyle,StyleProp} from "react-native";
import { BloomTextInput } from "@/components/ui/BloomInputComponents";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text as NativeText, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../components/ui/BloomText';
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { BloomKeyboardScreen } from "../../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { COLORS } from "../../constants/theme";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { BloomRouteEntrance } from "../../motion/BloomMotion";
import { useAuth } from "../../context/AuthContext";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


// Keep one native text/view tree alive across Google account-picker transitions.
function LoginButton({title,icon,iconPosition='left',onPress,customStyle,isLoading=false,disabled=false,textStyle}:{title:string;icon:import("react").ReactNode;iconPosition?:'left'|'right';onPress:()=>void;customStyle:StyleProp<ViewStyle>;isLoading?:boolean;disabled?:boolean;textStyle:{color:string};keepTextWhileLoading?:boolean}){
 const {colors}=useA3Theme();const locked=disabled||isLoading;
 return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{disabled:locked,busy:isLoading}} disabled={locked} onPress={onPress} style={({pressed})=>[{backgroundColor:colors.primary,minHeight:48,paddingHorizontal:15,paddingVertical:12,justifyContent:'center',alignItems:'center',opacity:locked&&!isLoading?.65:pressed?.86:1},customStyle]}>
  <View collapsable={false} style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10}}>
   <View style={{width:22,alignItems:'center'}}>{isLoading?<ActivityIndicator color={textStyle.color} size="small"/>:iconPosition==='left'?icon:null}</View>
   <NativeText style={{color:textStyle.color,fontSize:15,fontWeight:'700',textAlign:'center',flexShrink:1}}>{title}</NativeText>
   <View style={{width:22,alignItems:'center'}}>{!isLoading&&iconPosition==='right'?icon:null}</View>
  </View>
 </Pressable>;
}

export default function Login() {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  const { loginWithGoogle, sendPhoneCode, isLoadingPhone, singleSessionNotice,
    googleLoginPhase, googleLoginNotice } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const googleBusyRef = useRef(false);
  const handleGoogle = async () => {
    if (googleBusyRef.current || isLoadingPhone) return;
    googleBusyRef.current = true;
    setIsLoadingGoogle(true);
    try { await loginWithGoogle(); }
    finally {
      googleBusyRef.current = false;
      setIsLoadingGoogle(false);
    }
  };

  const handleSendOTP = async () => {
    const success = await sendPhoneCode(phoneNumber);
    if (success) router.push("/(auth)/otp");
  };

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
      <BloomKeyboardScreen contentContainerStyle={__a3_styles.container}>
        <BloomRouteEntrance kind="login">
        <BloomHeroHeader
          eyebrow="CHÀO MỪNG VỀ NHÀ"
          title="Một nơi để nhà mình luôn gần nhau"
          subtitle="Đăng nhập để cùng lưu những ngày đáng nhớ, những người mình thương và câu chuyện của cả nhà."
          variant="auth"
          compact
        />
        </BloomRouteEntrance>

        <View style={__a3_styles.formWrap}>
          <View style={__a3_styles.brandRow}>
            <View>
              <Text style={__a3_styles.title}>Family Bloom</Text>
              <Text style={__a3_styles.subtitle}>Nhà mình, cùng một nơi 🌷</Text>
            </View>
            <View style={__a3_styles.miniBloom}><Ionicons name="flower-outline" size={22} color={__a3Colors.primary} /></View>
          </View>

          {!!singleSessionNotice && (
            <Text accessibilityRole="alert" style={__a3_styles.sessionNotice}>{singleSessionNotice}</Text>
          )}
          {!!googleLoginNotice && (
            <Text accessibilityRole="alert" style={__a3_styles.sessionNotice}>{googleLoginNotice}</Text>
          )}
          <BloomTextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            label="Số điện thoại"
            placeholder="Số của bạn nè 🌷"
            keyboardType="phone-pad"
            leftIcon={<Image source={require("../../../assets/images/flag.png")} style={__a3_styles.inputFlag} />}
            containerStyle={{ width: "100%" }}
          />

          <LoginButton
            title="TIẾP TỤC"
            icon={<Ionicons name="arrow-forward" color={__a3Colors.onPrimary} size={22} />}
            iconPosition="right"
            onPress={handleSendOTP}
            customStyle={__a3_styles.primaryButton}
            isLoading={isLoadingPhone}
            keepTextWhileLoading
            textStyle={{ color: __a3Colors.onPrimary }}
            disabled={isLoadingGoogle}
          />

          <View style={__a3_styles.dividerRow}><View style={__a3_styles.divider}/><Text style={__a3_styles.orText}>HOẶC</Text><View style={__a3_styles.divider}/></View>
          <LoginButton
            title={isLoadingGoogle ? "ĐANG KẾT NỐI GOOGLE…" : "CHỌN TÀI KHOẢN GOOGLE"}
            icon={<Ionicons name="logo-google" size={22} color={__a3Colors.onPrimary} />}
            customStyle={__a3_styles.googleButton}
            disabled={isLoadingPhone || isLoadingGoogle}
            isLoading={isLoadingGoogle}
            keepTextWhileLoading
            textStyle={{ color: __a3Colors.onPrimary }}
            onPress={handleGoogle}
          />
          {isLoadingGoogle && (
            <Text accessibilityLiveRegion="polite" style={__a3_styles.loginProgress}>
              {googleLoginPhase === 'play-services' ? 'Đang chuẩn bị đăng nhập…'
                : googleLoginPhase === 'account-picker' ? 'Đang chờ chọn tài khoản Google…'
                : googleLoginPhase === 'firebase' ? 'Đang xác nhận tài khoản…'
                : 'Đang chuẩn bị đăng nhập…'}
            </Text>
          )}
          <Text style={__a3_styles.promise}>Bloom chỉ dùng thông tin cần thiết để giữ đúng ngôi nhà và kỷ niệm của bạn.</Text>
        </View>
      </BloomKeyboardScreen>
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  container: { flexGrow: 1, paddingBottom: 24, backgroundColor: COLORS.background },
  formWrap: {
    marginTop: -18,
    marginHorizontal: 16,
    padding: 22,
    borderRadius: 30,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
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
  // Login-only: on some Android GPUs an elevated, non-clipped pill draws square/white corner artifacts.
  // Clip the coloured surface to a true capsule and disable native elevation/shadow here only.
  primaryButton: { width: "100%", marginTop: 2, borderRadius: 999, overflow: "hidden", elevation: 0, shadowOpacity: 0, shadowRadius: 0 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 18 },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  orText: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "900", letterSpacing: 0.9 },
  googleButton: { width: "100%", borderRadius: 999, overflow: "hidden", elevation: 0, shadowOpacity: 0, shadowRadius: 0 },
  accountHint: { marginTop: 8, color: COLORS.secondaryText, textAlign: "center", fontSize: 11, lineHeight: 17 },
  sessionNotice: { marginBottom: 12, fontSize: 13, lineHeight: 20, color: COLORS.primaryText },
  loginProgress: { marginTop: 10, textAlign: 'center', fontSize: 12, color: COLORS.secondaryText },
  promise: { marginTop: 16, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, textAlign: "center" },
}));
