import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { BloomButton } from "../components/ui/BloomButtonComponents";
import { FamilyGraphPrototype } from "../components/familyGraph/FamilyGraphPrototype";
import { adaptFamilyGraphSnapshot } from "../components/familyGraph/familyGraphLiveAdapter";
import { COLORS } from "../constants/theme";
import {
  DEFAULT_FAMILY_GRAPH_FOCUS_CONFIG,
  DEFAULT_FAMILY_GRAPH_THREE_GENERATION_CONFIG,
} from "../constants/appConfiguration";
import { useAuth } from "../context/AuthContext";
import { useFamilyGraph } from "../hooks/useFamilyGraph";
import { familyGraphMutationService } from "../services/familyGraph/familyGraphMutationService";
import { familyGraphService } from "../services/familyGraph/familyGraphService";
import { resolveVietnameseKinship } from "../services/familyGraph/familyKinshipResolver";
import { useBloomToast } from "../components/ui/BloomToast";

export default function FamilyGraphScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ focusPersonId?: string; detailPersonId?: string }>();
  const { showToast } = useBloomToast();
  const { user, userProfile, families } = useAuth();
  const familyId = userProfile?.activeFamilyId ?? null;
  const membership = families.find((item) => item.familyId === familyId);
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";
  const [screenFocused, setScreenFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    setScreenFocused(true);
    return () => setScreenFocused(false);
  }, []));
  const { snapshot, defaultFocusId, loading, error } = useFamilyGraph(familyId, user?.uid, screenFocused);
  const requestedFocusId = typeof params.focusPersonId === "string" ? params.focusPersonId.trim() : "";
  const requestedDetailPersonId = typeof params.detailPersonId === "string" ? params.detailPersonId.trim() : "";
  useEffect(() => {
    if (!requestedDetailPersonId || !snapshot.persons.some((person) => person.id === requestedDetailPersonId)) return;
    const timer = setTimeout(() => router.setParams({ detailPersonId: undefined } as never), 0);
    return () => clearTimeout(timer);
  }, [requestedDetailPersonId, router, snapshot.persons]);
  const resolvedFocusId = (requestedFocusId && snapshot.persons.some((person) => person.id === requestedFocusId))
    ? requestedFocusId
    : defaultFocusId ?? snapshot.persons.find((person) => person.linkedUid === user?.uid)?.id ?? null;
  const visual = useMemo(
    () => adaptFamilyGraphSnapshot(snapshot, resolvedFocusId),
    [resolvedFocusId, snapshot],
  );
  const visibleFocusId = useMemo(() => {
    if (!visual.people.length) return null;
    return visual.people.some((person) => person.id === resolvedFocusId)
      ? resolvedFocusId
      : visual.people[0].id;
  }, [resolvedFocusId, visual.people]);

  const queryEngine = useMemo(
    () => familyId && snapshot.familyId === familyId
      ? familyGraphService.createQueryEngine(snapshot)
      : null,
    [familyId, snapshot],
  );

  const peopleById = useMemo(
    () => new Map(snapshot.persons.map((person) => [person.id, person])),
    [snapshot.persons],
  );

  const resolveRelationship = useCallback((sourcePersonId: string, targetPersonId: string) => {
    if (!queryEngine) return null;
    const evidence = queryEngine.getRelationshipBetween(sourcePersonId, targetPersonId);
    return evidence ? resolveVietnameseKinship(evidence, peopleById) : null;
  }, [peopleById, queryEngine]);

  const getFocusSubgraphPreview = useCallback((focusPersonId: string, mode: "3" | "5") => {
    if (!queryEngine) return null;
    const config = mode === "3"
      ? DEFAULT_FAMILY_GRAPH_THREE_GENERATION_CONFIG
      : DEFAULT_FAMILY_GRAPH_FOCUS_CONFIG;
    const subgraph = queryEngine.getFocusSubgraph(focusPersonId, config);
    if (!subgraph) return null;
    return {
      personIds: subgraph.personIds,
      truncated: subgraph.truncated,
      requestedMaxPeople: subgraph.requestedMaxPeople,
    };
  }, [queryEngine]);

  const deletePerson = async (personId: string) => {
    if (!familyId || !isAdmin) return;
    await familyGraphMutationService.deletePersonCascade(familyId, personId);
    showToast({
      type: "success",
      title: "Đã xóa người",
      message: "Người này và các đường quan hệ trực tiếp đã được gỡ khỏi phả hệ.",
      duration: 2600,
    });
  };

  const deleteRelationship = async (relationshipId: string) => {
    if (!familyId || !isAdmin) return;
    await familyGraphMutationService.deleteRelationship(familyId, relationshipId);
    showToast({
      type: "success",
      title: "Đã gỡ đường nối",
      message: "Hai người vẫn được giữ nguyên trong phả hệ để bạn có thể nối lại đúng.",
      duration: 2600,
    });
  };

  return (
    <ScreenContainer>
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={23} color={COLORS.primaryText} />
          </Pressable>
          <View style={styles.topCopy}>
            <Text style={styles.topTitle}>Phả hệ gia đình</Text>
            <Text style={styles.topMeta}>{membership?.familyName || "Gia đình của mình"}</Text>
          </View>
          {isAdmin ? (
            <Pressable
              accessibilityLabel="Thêm hoặc chỉnh người trong phả hệ"
              onPress={() => router.push({ pathname: "/family-graph-admin", params: { from: "graph" } } as never)}
              style={({ pressed }) => [styles.adminButton, pressed && styles.pressed]}
            >
              <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
              <View pointerEvents="none" style={styles.adminBloomBadge}>
                <Ionicons name="sparkles" size={8} color={COLORS.white} />
              </View>
            </Pressable>
          ) : <View style={styles.iconPlaceholder} />}
        </View>

        <View style={styles.graphArea}>
          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.stateText}>Bloom đang mở phả hệ…</Text>
            </View>
          ) : error ? (
            <View style={styles.centerState}>
              <Ionicons name="cloud-offline-outline" size={34} color={COLORS.secondaryText} />
              <Text style={styles.stateTitle}>Chưa tải được phả hệ</Text>
              <Text style={styles.stateText}>Kiểm tra kết nối rồi mở lại màn hình này nhé.</Text>
            </View>
          ) : !snapshot.persons.length ? (
            <View style={styles.centerState}>
              <View style={styles.emptyIcon}><Ionicons name="git-network-outline" size={32} color={COLORS.primary} /></View>
              <Text style={styles.stateTitle}>Cây nhà đang chờ nhánh đầu tiên</Text>
              <Text style={styles.stateText}>
                {isAdmin
                  ? "Tạo người đầu tiên, sau đó nối cha mẹ, con và vợ/chồng để cây bắt đầu nở."
                  : "Quản trị viên của gia đình chưa khởi tạo phả hệ."}
              </Text>
              {isAdmin && (
                <BloomButton
                  title="Bắt đầu xây cây"
                  icon="add-circle-outline"
                  onPress={() => router.push({ pathname: "/family-graph-admin", params: { from: "graph" } } as never)}
                  customStyle={styles.emptyButton}
                />
              )}
            </View>
          ) : !visual.people.length ? (
            <View style={styles.centerState}>
              <View style={styles.emptyIcon}><Ionicons name="git-branch-outline" size={32} color={COLORS.primary} /></View>
              <Text style={styles.stateTitle}>Chưa có nhánh nào được nối</Text>
              <Text style={styles.stateText}>
                {isAdmin
                  ? "Những người đã thêm vẫn được giữ trong danh sách quản lý. Hãy nối ít nhất một quan hệ đã xác nhận để họ xuất hiện trên cây."
                  : "Phả hệ hiện chưa có đường quan hệ nào đã được xác nhận."}
              </Text>
              {isAdmin && (
                <BloomButton
                  title="Nối người vào cây"
                  icon="git-branch-outline"
                  onPress={() => router.push({ pathname: "/family-graph-admin", params: { from: "graph" } } as never)}
                  customStyle={styles.emptyButton}
                />
              )}
            </View>
          ) : (
            <FamilyGraphPrototype
              familyName={membership?.familyName || "Gia đình của mình"}
              familyId={familyId}
              people={visual.people}
              connections={visual.connections}
              defaultFocusId={visibleFocusId}
              canEdit={isAdmin}
              onEditPerson={(personId) => router.push({
                pathname: "/family-graph-person-editor",
                params: { personId },
              } as never)}
              onDeletePerson={deletePerson}
              onDeleteRelationship={deleteRelationship}
              canvasWidth={visual.canvasWidth}
              canvasHeight={visual.canvasHeight}
              resolveRelationship={resolveRelationship}
              getFocusSubgraphPreview={getFocusSubgraphPreview}
              initialDetailPersonId={requestedDetailPersonId || null}
            />
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingBottom: 4 },
  topBar: { height: 50, flexDirection: "row", alignItems: "center", marginBottom: 4 },
  iconButton: { width: 42, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  iconPlaceholder: { width: 42, height: 42 },
  topCopy: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  topTitle: { color: COLORS.primaryText, fontSize: 15.5, fontWeight: "900" },
  topMeta: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "600" },
  adminButton: { width: 42, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF1F6", borderWidth: 1, borderColor: COLORS.border, position: "relative" },
  adminBloomBadge: { position: "absolute", right: 4, top: 4, width: 15, height: 15, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.white },
  graphArea: { flex: 1 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  emptyIcon: { width: 66, height: 66, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface, marginBottom: 16 },
  stateTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900", textAlign: "center", marginTop: 10 },
  stateText: { color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 18, textAlign: "center", marginTop: 7, maxWidth: 300 },
  emptyButton: { marginTop: 20, minWidth: 200 },
  pressed: { opacity: 0.64 },
});
