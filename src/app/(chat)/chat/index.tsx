import { useBloomThemeRevision } from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../../components/ui/BloomText';
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import {
  BloomCard,
  BloomEmptyState,
  BloomListRow,
  BloomPill,
  BloomSectionHeader,
} from "../../../components/ui/BloomPageComponents";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


export default function ChatScreen() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  const { families, activeFamilyId } = useAuth();
  const membership = families.find((item) => item.familyId === activeFamilyId);

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <BloomHeroHeader eyebrow="TRÒ CHUYỆN" title="Gần nhau hơn một chút" subtitle={`Một góc trò chuyện dành riêng cho ${membership?.familyName || "gia đình của mình"}.`} variant="whisper" onBack={() => router.back()} compact roundedBottom />
      <ScrollView contentContainerStyle={[__a3_styles.content, __a3_styles.pageBody]} showsVerticalScrollIndicator={false}>
        <BloomCard tone="accent" style={__a3_styles.familyCard}>
          <View style={__a3_styles.familyTop}>
            <View style={__a3_styles.familyIcon}>
              <Ionicons name="chatbubbles-outline" size={26} color={__a3Colors.primaryText} />
            </View>
            <View style={__a3_styles.familyCopy}>
              <Text style={__a3_styles.familyLabel}>PHÒNG CỦA NHÀ</Text>
              <Text style={__a3_styles.familyName}>{membership?.familyName || "Gia đình của mình"}</Text>
            </View>
          </View>
          <View style={__a3_styles.pills}>
            <BloomPill icon="people-outline" label="Dành cho thành viên trong nhà" />
          </View>
        </BloomCard>

        <View style={__a3_styles.section}>
          <BloomSectionHeader title="Cuộc trò chuyện" subtitle="Những lời mới nhất của cả nhà sẽ cùng nằm ở đây" />
          <BloomEmptyState
            icon="chatbubble-ellipses-outline"
            title="Chưa có cuộc trò chuyện nào"
            description="Khi cả nhà bắt đầu nhắn nhau, những câu chuyện gần nhất sẽ nhẹ nhàng xuất hiện ở đây."
          />
        </View>

        <View style={__a3_styles.section}>
          <BloomSectionHeader title="Trong lúc chờ nhau" subtitle="Bạn vẫn có thể ghé những góc đang hoạt động của Family Bloom" />
          <BloomCard>
            <BloomListRow
              icon="images-outline"
              title="Khoảnh khắc gia đình"
              subtitle="Xem ảnh, video và câu chuyện mới"
              onPress={() => router.navigate("/(tabs)/moments" as never)}
            />
            <View style={__a3_styles.divider} />
            <BloomListRow
              icon="people-outline"
              title="Cây nhà"
              subtitle="Xem thông tin và vai trò thành viên"
              onPress={() => router.navigate("/(tabs)/family" as never)}
            />
          </BloomCard>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  pageBody: { marginTop: -16, paddingHorizontal: 16, paddingTop: 26, backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  content: { paddingBottom: 32 },
  familyCard: { marginBottom: 26 },
  familyTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  familyIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  familyCopy: { flex: 1 },
  familyLabel: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 },
  familyName: { marginTop: 4, color: COLORS.primaryText, fontSize: 18, fontWeight: "900" },
  pills: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  section: { marginBottom: 26 },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 56 },
}));
