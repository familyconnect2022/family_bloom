import React from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { BloomButton, COLORS } from "@/components/ui/BloomButtonComponents";

type Props = { visible: boolean; name?: string; onContinue: () => void };

/** Transient post-auth greeting. It is not a navigation route and should not reappear on app restore. */
export function WelcomeModal({ visible, name, onContinue }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.icon}><Text style={styles.emoji}>🌸</Text></View>
          <Text style={styles.title}>Chào mừng bạn đến với Bloom!</Text>
          <Text style={styles.body}>{name ? `${name}, ` : ""}đăng nhập thành công. Hãy cùng gia đình tạo nên một không gian thật ấm áp nhé.</Text>
          <BloomButton title="Vào tổ ấm ngay" onPress={onContinue} customStyle={styles.button} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: COLORS.white, borderRadius: 28, padding: 28, alignItems: "center" },
  icon: { width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.accentBg, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emoji: { fontSize: 36 },
  title: { fontSize: 23, fontWeight: "800", color: COLORS.primaryText, textAlign: "center" },
  body: { marginTop: 10, fontSize: 15, lineHeight: 22, color: COLORS.secondaryText, textAlign: "center" },
  button: { width: "100%", marginTop: 24 },
});
