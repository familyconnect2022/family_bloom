import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomButton } from "../../../components/ui/BloomButtonComponents";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { FamilyGraphPrototype } from "../../../components/familyGraph/FamilyGraphPrototype";
import { adaptFamilyGraphSnapshot } from "../../../components/familyGraph/familyGraphLiveAdapter";
import { getFamilyGraphWarmRecord, getOrBuildFamilyGraphVisual, updateFamilyGraphViewState } from "../../../components/familyGraph/familyGraphWarmCache";
import { COLORS } from "../../../constants/theme";
import {
  DEFAULT_FAMILY_GRAPH_FOCUS_CONFIG,
  DEFAULT_FAMILY_GRAPH_THREE_GENERATION_CONFIG,
} from "../../../constants/appConfiguration";
import { useAuth } from "../../../context/AuthContext";
import { useFamilyGraph } from "../../../hooks/family/useFamilyGraph";
import { familyGraphMutationService } from "../../../services/familyGraph/familyGraphMutationService";
import { activityService } from "../../../services/activity/activityService";
import { graphActivitySessionService, type GraphActivitySession } from "../../../services/activity/graphActivitySessionService";
import { familyGraphService } from "../../../services/familyGraph/familyGraphService";
import { resolveVietnameseKinship } from "../../../services/familyGraph/familyKinshipResolver";
import { useBloomToast } from "../../../components/ui/BloomToast";

export default function FamilyGraphScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ focusPersonId?: string; detailPersonId?: string }>();
  const { showToast } = useBloomToast();
  const { user, userProfile, families } = useAuth();
  const familyId = userProfile?.activeFamilyId ?? null;
  const membership = families.find((item) => item.familyId === familyId);
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";
  const [screenFocused, setScreenFocused] = useState(true);
  const [graphActivitySession, setGraphActivitySession] = useState<GraphActivitySession | null>(null);
  const [notifyingGraph, setNotifyingGraph] = useState(false);
  useFocusEffect(useCallback(() => {
    setScreenFocused(true);
    setGraphActivitySession(graphActivitySessionService.get(familyId));
    return () => setScreenFocused(false);
  }, [familyId]));
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
    : snapshot.persons.find((person) => person.id === defaultFocusId && person.linkedUid === user?.uid)?.id ?? snapshot.persons.find((person) => person.linkedUid === user?.uid)?.id ?? null;
  const warmGraph = getFamilyGraphWarmRecord(familyId);
  const visual = useMemo(
    () => getOrBuildFamilyGraphVisual(snapshot, resolvedFocusId),
    [resolvedFocusId, snapshot],
  );
  const visibleFocusId = useMemo(() => {
    if (!visual.people.length) return null;
    return visual.people.some((person) => person.id === resolvedFocusId)
      ? resolvedFocusId
      : null;
  }, [resolvedFocusId, visual.people]);

  const queryEngine = useMemo(
    () => familyId && snapshot.familyId === familyId
      ? familyGraphService.createQueryEngine(snapshot)
      : null,
    [familyId, snapshot],
  );

  // Phase 14F: cache bounded branch layouts for the lifetime of this immutable
  // query-engine snapshot. Opening A -> B -> A can reuse A immediately, while a
  // real graph snapshot change creates a fresh cache automatically.
  const focusBranchVisualCache = useMemo(
    () => new Map<string, ReturnType<typeof adaptFamilyGraphSnapshot> & {
      personIds: string[];
      truncated: boolean;
      requestedMaxPeople: number;
    }>(),
    [queryEngine],
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

  const getFocusBranchVisual = useCallback((focusPersonId: string) => {
    if (!queryEngine) return null;
    const cacheKey = `full:${focusPersonId}`;
    const cached = focusBranchVisualCache.get(cacheKey);
    if (cached) return cached;

    // Focus View is independent from the background 3/5/all canvas. It always
    // derives the complete lineage branch available in the in-memory family
    // snapshot: all ancestors, all descendants, direct siblings and partners.
    // No Firestore read/listener is opened here.
    const fullDepth = Math.max(1, snapshot.persons.length);
    const subgraph = queryEngine.getFocusSubgraph(focusPersonId, {
      ancestorDepth: fullDepth,
      descendantDepth: fullDepth,
      includePartners: true,
      includeSiblings: true,
      includeCousins: false,
      maxPeople: Math.max(1, snapshot.persons.length),
    });
    if (!subgraph) return null;

    const branchVisual = getOrBuildFamilyGraphVisual(subgraph.snapshot, focusPersonId, true);
    const result = {
      ...branchVisual,
      personIds: subgraph.personIds,
      truncated: subgraph.truncated,
      requestedMaxPeople: subgraph.requestedMaxPeople,
    };
    focusBranchVisualCache.set(cacheKey, result);
    return result;
  }, [focusBranchVisualCache, queryEngine, snapshot.persons.length]);

  const deletePerson = async (personId: string) => {
    if (!familyId || !isAdmin) return;
    const personName = snapshot.persons.find((person) => person.id === personId)?.displayName || null;
    await familyGraphMutationService.deletePersonCascade(familyId, personId);
    setGraphActivitySession(graphActivitySessionService.record(familyId, { kind: "person_deleted", personName }));
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
    setGraphActivitySession(graphActivitySessionService.record(familyId, { kind: "relationship_deleted" }));
    showToast({
      type: "success",
      title: "Đã gỡ đường nối",
      message: "Hai người vẫn được giữ nguyên trong phả hệ để bạn có thể nối lại đúng.",
      duration: 2600,
    });
  };


  const notifyGraphChanges = async () => {
    if (!familyId || !user || !graphActivitySession || notifyingGraph) return;
    setNotifyingGraph(true);
    try {
      const copy = graphActivitySessionService.copyFor(graphActivitySession);
      await activityService.createGraphNotice({
        familyId,
        actorUid: user.uid,
        actorName: userProfile?.displayName || "Người giữ nhà",
        title: copy.title,
        body: copy.body,
        sessionId: graphActivitySession.id,
      });
      graphActivitySessionService.clear(familyId);
      setGraphActivitySession(null);
      showToast({
        type: "success",
        title: "Đã báo cho gia đình",
        message: "Thay đổi trong cây nhà đã được đặt vào Chuyện trong nhà.",
        duration: 2400,
      });
    } catch {
      showToast({
        type: "error",
        title: "Chưa gửi được thông báo",
        message: "Bạn có thể thử lại sau, thay đổi trong phả hệ vẫn được giữ nguyên.",
        duration: 2800,
      });
    } finally {
      setNotifyingGraph(false);
    }
  };

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <View style={styles.screen}>
        <BloomHeroHeader
          eyebrow="CÂY GIA ĐÌNH"
          title="Phả hệ gia đình"
          subtitle={membership?.familyName
            ? `${snapshot.persons.length || "Đang mở"} người · ${membership.familyName}`
            : "Cùng lần theo từng nhánh và lưu lại câu chuyện của các thế hệ."}
          variant="tree"
          compact
          onBack={() => router.back()}
        />

        {isAdmin && graphActivitySession ? (
          <View style={styles.graphNotice}>
            <View style={styles.graphNoticeCopy}>
              <Text style={styles.graphNoticeTitle}>Thông báo thay đổi cho gia đình?</Text>
              <Text style={styles.graphNoticeText}>
                {graphActivitySession.changes.length === 1
                  ? "Bloom sẽ gửi một thông báo ngắn về thay đổi vừa thực hiện."
                  : `Bloom sẽ gộp ${graphActivitySession.changes.length} thay đổi thành một thông báo ngắn.`}
              </Text>
            </View>
            <Pressable
              disabled={notifyingGraph}
              onPress={() => void notifyGraphChanges()}
              style={({ pressed }) => [styles.graphNoticeButton, pressed && styles.pressed, notifyingGraph && styles.disabled]}
            >
              {notifyingGraph ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="notifications-outline" size={17} color={COLORS.white} />}
              <Text style={styles.graphNoticeButtonText}>{notifyingGraph ? "Đang gửi" : "Thông báo"}</Text>
            </Pressable>
          </View>
        ) : null}

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
                  : "Người giữ nhà chưa bắt đầu phả hệ của gia đình."}
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
              key={`${familyId}:${user?.uid}`}
              familyName={membership?.familyName || "Gia đình của mình"}
              familyId={familyId}
              people={visual.people}
              connections={visual.connections}
              defaultFocusId={visibleFocusId}
              initialViewMode={warmGraph?.viewState.viewMode}
              initialCameraSnapshot={warmGraph?.viewState.camera}
              onViewStateChange={(state) => {
                if (familyId) updateFamilyGraphViewState(familyId, state);
              }}
              canEdit={isAdmin}
              onEditPerson={(personId) => router.push({
                pathname: "/family-graph-person-editor",
                params: { personId },
              } as never)}
              onAddPerson={() => router.push({ pathname: "/family-graph-admin", params: { from: "graph" } } as never)}
              onDeletePerson={deletePerson}
              onDeleteRelationship={deleteRelationship}
              canvasWidth={visual.canvasWidth}
              canvasHeight={visual.canvasHeight}
              resolveRelationship={resolveRelationship}
              getFocusSubgraphPreview={getFocusSubgraphPreview}
              getFocusBranchVisual={getFocusBranchVisual}
              initialDetailPersonId={requestedDetailPersonId || null}
              headerMode="controls"
            />
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingBottom: 4, backgroundColor: COLORS.background },
  topBar: { height: 50, flexDirection: "row", alignItems: "center", marginBottom: 4 },
  iconButton: { width: 42, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  iconPlaceholder: { width: 42, height: 42 },
  topCopy: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  topTitle: { color: COLORS.primaryText, fontSize: 15.5, fontWeight: "900" },
  topMeta: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "600" },
  adminButton: { width: 42, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF1F6", borderWidth: 1, borderColor: COLORS.border, position: "relative" },
  adminBloomBadge: { position: "absolute", right: 4, top: 4, width: 15, height: 15, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.white },
  graphNotice: { marginHorizontal: 16, marginTop: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.focusBorder, backgroundColor: COLORS.white, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  graphNoticeCopy: { flex: 1, minWidth: 0 },
  graphNoticeTitle: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  graphNoticeText: { marginTop: 2, color: COLORS.secondaryText, fontSize: 9.5, lineHeight: 13, fontWeight: "600" },
  graphNoticeButton: { minHeight: 40, borderRadius: 14, paddingHorizontal: 12, backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  graphNoticeButtonText: { color: COLORS.white, fontSize: 10.5, fontWeight: "900" },
  disabled: { opacity: 0.58 },
  graphArea: { flex: 1, marginHorizontal: 10, marginBottom: 4, borderRadius: 26, overflow: "hidden" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  emptyIcon: { width: 66, height: 66, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface, marginBottom: 16 },
  stateTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900", textAlign: "center", marginTop: 10 },
  stateText: { color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 18, textAlign: "center", marginTop: 7, maxWidth: 300 },
  emptyButton: { marginTop: 20, minWidth: 200 },
  pressed: { opacity: 0.64 },
});
