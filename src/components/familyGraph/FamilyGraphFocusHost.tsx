import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { FamilyGraphSnapshot } from "../../types/familyGraph";
import { COLORS } from "../../constants/theme";
import { FamilyGraphFocusView } from "./FamilyGraphFocusView";
import {
  buildFamilyGraphRenderSceneInterruptible,
  type FamilyGraphBuildCancellation,
  type FamilyGraphRenderScene,
} from "./familyGraphSceneBuilder";

const SCREEN_RATIO = 0.85;

type CachedFocusVisual = {
  snapshot: FamilyGraphSnapshot;
  visual: FamilyGraphRenderScene;
};

/**
 * Route-level Focus owner.
 *
 * It owns a separate native Modal, branch-build lifecycle and hot visual cache.
 * The main FamilyGraphPrototype only emits an open intent; it never renders or
 * nests this host.
 */
export function FamilyGraphFocusHost({
  snapshot,
  personId,
  onYieldBack,
}: {
  snapshot: FamilyGraphSnapshot;
  personId: string | null;
  onYieldBack: () => void;
}) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const visible = !!personId;
  const [visual, setVisual] = useState<FamilyGraphRenderScene | null>(null);
  const [visualReady, setVisualReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const requestRef = useRef(0);
  const visualCacheRef = useRef(new Map<string, CachedFocusVisual>());

  const personName = useMemo(() => {
    if (!personId) return "Nhánh gia đình";
    return snapshot.persons.find((person) => person.id === personId)?.displayName ?? "Nhánh gia đình";
  }, [personId, snapshot.persons]);

  const yieldBack = useCallback(() => {
    // Yield first: invalidate every delayed callback before asking the route to
    // detach Focus. No cleanup/build result may reopen the native presentation.
    requestRef.current += 1;
    onYieldBack();
  }, [onYieldBack]);

  useEffect(() => {
    if (!personId) {
      requestRef.current += 1;
      setVisual(null);
      setVisualReady(false);
      setLoadFailed(false);
      return undefined;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoadFailed(false);
    setVisualReady(false);

    const hot = visualCacheRef.current.get(personId);
    if (hot?.snapshot === snapshot) {
      setVisual(hot.visual);
      return undefined;
    }
    if (hot) visualCacheRef.current.delete(personId);
    setVisual(null);

    let cancelled = false;
    const cancellation: FamilyGraphBuildCancellation = {
      isCancelled: () => cancelled || requestRef.current !== requestId,
    };

    // Shell-first, cancel-first: paint the Focus frame/Back control before the
    // independent branch topology/layout work begins.
    let frameA = 0;
    let frameB = 0;
    frameA = requestAnimationFrame(() => {
      frameB = requestAnimationFrame(() => {
        if (cancellation.isCancelled()) return;
        void buildFamilyGraphRenderSceneInterruptible(
          snapshot,
          { mode: "focusBranch", focusPersonId: personId },
          cancellation,
          null,
          null,
        ).then((next) => {
          if (cancellation.isCancelled()) return;
          if (!next) {
            setLoadFailed(true);
            return;
          }
          visualCacheRef.current.set(personId, { snapshot, visual: next });
          setVisual(next);
        }).catch(() => {
          if (!cancellation.isCancelled()) setLoadFailed(true);
        });
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameA);
      cancelAnimationFrame(frameB);
    };
  }, [personId, snapshot]);

  const cardWidth = Math.max(1, windowWidth * SCREEN_RATIO);
  const cardHeight = Math.max(1, windowHeight * SCREEN_RATIO);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={yieldBack}
    >
      <GestureHandlerRootView unstable_forceActive style={styles.root}>
        <View pointerEvents="none" style={styles.shield} />
        <View style={[styles.card, { width: cardWidth, height: cardHeight }]}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Trở về cây phả hệ"
              onPress={yieldBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Ionicons name="arrow-back" size={18} color={COLORS.primaryText} />
              <Text style={styles.backText}>Trở về</Text>
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>XEM NHÁNH · TOÀN NHÁNH</Text>
              <Text numberOfLines={1} style={styles.title}>Nhánh của {personName}</Text>
              <Text numberOfLines={1} style={styles.hint}>Kéo để di chuyển · chụm hai ngón để thu phóng</Text>
            </View>
          </View>

          <View style={styles.graph}>
            {visual && personId ? (
              <FamilyGraphFocusView
                key={visual.sceneKey}
                visual={visual}
                personId={personId}
                onVisualReady={() => {
                  if (requestRef.current > 0) setVisualReady(true);
                }}
              />
            ) : null}

            {!visualReady || loadFailed ? (
              <View pointerEvents="none" style={styles.preparingLayer}>
                {loadFailed ? (
                  <View style={styles.messageCard}>
                    <Ionicons name="leaf-outline" size={28} color={COLORS.primary} />
                    <Text style={styles.messageTitle}>Chưa dựng được nhánh này</Text>
                    <Text style={styles.messageText}>Cây chính vẫn nguyên vẹn. Trở về rồi thử mở lại nhánh này nhé.</Text>
                  </View>
                ) : (
                  <View style={styles.preparingInline}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.preparingText}>Đang chuẩn bị cây…</Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>

          {visualReady && visual?.truncated ? (
            <View style={styles.footer}>
              <Ionicons name="leaf-outline" size={13} color={COLORS.primary} />
              <Text style={styles.footerText}>Nhánh rất lớn nên Bloom giữ giới hạn an toàn để thao tác luôn mượt.</Text>
            </View>
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  shield: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(45,31,37,0.22)" },
  card: { borderRadius: 28, overflow: "hidden", backgroundColor: "#FFF9FB", borderWidth: 1, borderColor: "#EADBE1", shadowColor: "#6A4A56", shadowOpacity: 0.2, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  header: { minHeight: 78, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", backgroundColor: "#FFF7FA", borderBottomWidth: 1, borderBottomColor: "#F1E5EA" },
  backButton: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 40, paddingHorizontal: 10, borderRadius: 14, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#EEDCE3" },
  pressed: { opacity: 0.72 },
  backText: { fontSize: 12, fontWeight: "800", color: COLORS.primaryText },
  headerCopy: { flex: 1, paddingLeft: 12, paddingRight: 4 },
  eyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 0.7, color: COLORS.primary },
  title: { marginTop: 2, fontSize: 17, fontWeight: "900", color: COLORS.primaryText },
  hint: { marginTop: 3, fontSize: 10, fontWeight: "600", color: COLORS.secondaryText },
  graph: { flex: 1, overflow: "hidden", backgroundColor: "#FFFDFE" },
  preparingLayer: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,253,254,0.78)" },
  preparingInline: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.94)", paddingHorizontal: 14, paddingVertical: 10 },
  preparingText: { fontSize: 12, fontWeight: "700", color: COLORS.secondaryText },
  messageCard: { width: "78%", borderRadius: 20, padding: 18, alignItems: "center", backgroundColor: "#FFF", borderWidth: 1, borderColor: "#F0DFE5" },
  messageTitle: { marginTop: 8, fontSize: 15, fontWeight: "900", color: COLORS.primaryText },
  messageText: { marginTop: 5, textAlign: "center", fontSize: 11.5, lineHeight: 17, color: COLORS.secondaryText },
  footer: { minHeight: 32, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#FFF7FA", borderTopWidth: 1, borderTopColor: "#F1E5EA" },
  footerText: { fontSize: 9.5, fontWeight: "600", color: COLORS.secondaryText },
});
