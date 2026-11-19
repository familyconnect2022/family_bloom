import { createBloomStyles } from '../../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../../components/ui/BloomText';
import { StatusBar } from "expo-status-bar";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomButton } from "../../../components/ui/BloomButtonComponents";
import { FamilyGraphWebHero } from "../../../components/familyGraph/FamilyGraphWebHero";
import { FamilyGraphPrototype } from "../../../components/familyGraph/FamilyGraphPrototype";
import { FamilyGraphFocusHost } from "../../../components/familyGraph/FamilyGraphFocusHost";
import { updateFamilyGraphViewState } from "../../../components/familyGraph/familyGraphWarmCache";
import {
  buildFamilyGraphRenderSceneInterruptible,
  peekFamilyGraphRenderSceneIdentity,
  type FamilyGraphBuildCancellation,
  type FamilyGraphRenderScene,
} from "../../../components/familyGraph/familyGraphSceneBuilder";
import { COLORS } from "../../../constants/theme";
import {
  DEFAULT_FAMILY_GRAPH_FOCUS_CONFIG,
  DEFAULT_FAMILY_GRAPH_THREE_GENERATION_CONFIG,
} from "../../../constants/appConfiguration";
import { useAuth } from "../../../context/AuthContext";
import { useFamilyGraph } from "../../../hooks/family/useFamilyGraph";
import { useFamilyMembers } from "../../../hooks/family/useFamilyMembers";
import { familyGraphMutationService } from "../../../services/familyGraph/familyGraphMutationService";
import { activityService } from "../../../services/activity/activityService";
import { graphActivitySessionService, type GraphActivitySession } from "../../../services/activity/graphActivitySessionService";
import { familyGraphService } from "../../../services/familyGraph/familyGraphService";
import { resolveVietnameseKinship } from "../../../services/familyGraph/familyKinshipResolver";
import { useBloomToast } from "../../../components/ui/BloomToast";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


export function FamilyGraphScreen({ embeddedInTab = false, onOpenOverview }: {
  embeddedInTab?: boolean;
  onOpenOverview?: () => void;
} = {}) {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  const params = useLocalSearchParams<{ focusPersonId?: string; detailPersonId?: string }>();
  const { showToast } = useBloomToast();
  const { user, userProfile, families } = useAuth();
  const familyId = userProfile?.activeFamilyId ?? null;
  const { memberByUid } = useFamilyMembers(familyId);
  const memberAvatarByUid = useMemo(() => new Map(Array.from(memberByUid, ([uid, member]) => [uid, member.avatarUrl] as const)), [memberByUid]);
  const membership = families.find((item) => item.familyId === familyId);
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";
  const [screenFocused, setScreenFocused] = useState(true);
  const [graphActivitySession, setGraphActivitySession] = useState<GraphActivitySession | null>(null);
  const [notifyingGraph, setNotifyingGraph] = useState(false);
  const [searchRequest, setSearchRequest] = useState(0);
  const [showHeroMenu, setShowHeroMenu] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [focusOverlayPersonId, setFocusOverlayPersonId] = useState<string | null>(null);
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

  // P2.17.1 — Family Graph route first-paint boundary.
  //
  // Never build topology/layout/geometry synchronously while React is trying to
  // present this route. A retained scene for the exact immutable snapshot is O(1)
  // and may be consumed immediately; a cold scene starts only after the route has
  // yielded one frame, then follows the interruptible BSH pipeline.
  const identityVisual = peekFamilyGraphRenderSceneIdentity(snapshot, {
    mode: "fullTree",
    focusPersonId: resolvedFocusId,
  });
  const [preparedVisual, setPreparedVisual] = useState<{
    snapshot: typeof snapshot;
    focusPersonId: string | null;
    scene: FamilyGraphRenderScene;
  } | null>(() => identityVisual ? {
    snapshot,
    focusPersonId: resolvedFocusId,
    scene: identityVisual,
  } : null);

  const visual = identityVisual
    ?? (preparedVisual?.snapshot === snapshot && preparedVisual.focusPersonId === resolvedFocusId
      ? preparedVisual.scene
      : null);

  useEffect(() => {
    const hot = peekFamilyGraphRenderSceneIdentity(snapshot, {
      mode: "fullTree",
      focusPersonId: resolvedFocusId,
    });
    if (hot) {
      setPreparedVisual((current) => (
        current?.snapshot === snapshot
        && current.focusPersonId === resolvedFocusId
        && current.scene === hot
          ? current
          : { snapshot, focusPersonId: resolvedFocusId, scene: hot }
      ));
      return undefined;
    }

    if (!snapshot.familyId || !snapshot.persons.length) {
      setPreparedVisual(null);
      return undefined;
    }

    let cancelled = false;
    const cancellation: FamilyGraphBuildCancellation = {
      isCancelled: () => cancelled,
    };
    const frame = requestAnimationFrame(() => {
      void buildFamilyGraphRenderSceneInterruptible(
        snapshot,
        { mode: "fullTree", focusPersonId: resolvedFocusId },
        cancellation,
      ).then((scene) => {
        if (cancelled || !scene) return;
        setPreparedVisual({
          snapshot,
          focusPersonId: resolvedFocusId,
          scene,
        });
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [resolvedFocusId, snapshot]);

  const visibleFocusId = useMemo(() => {
    if (!visual?.people.length) return null;
    return visual.people.some((person) => person.id === resolvedFocusId)
      ? resolvedFocusId
      : null;
  }, [resolvedFocusId, visual]);

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
    return evidence ? resolveVietnameseKinship(evidence, peopleById, snapshot.relationships) : null;
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
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
      <View style={__a3_styles.screen}>
        <FamilyGraphWebHero
          count={snapshot.persons.length}
          familyName={membership?.familyName || 'Gia đình của mình'}
          onBack={embeddedInTab ? undefined : () => router.back()}
          onOverview={embeddedInTab ? () => setShowHeroMenu(true) : undefined}
        />

        <View style={__a3_styles.parityActionRow}>
          {isAdmin ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Duyệt đề xuất phả hệ"
                onPress={() => router.push('/family-graph-proposals' as never)}
                style={({ pressed }) => [__a3_styles.parityAction, pressed && __a3_styles.pressed]}
              >
                <Ionicons name="checkmark" size={18} color={__a3Colors.primary} />
                <Text style={__a3_styles.parityActionText}>Duyệt đề xuất</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quản lý gốc và người trong phả hệ"
                onPress={() => router.push({ pathname: '/family-graph-admin', params: { from: 'graph' } } as never)}
                style={({ pressed }) => [__a3_styles.parityAction, pressed && __a3_styles.pressed]}
              >
                <Ionicons name="git-branch-outline" size={18} color={__a3Colors.primary} />
                <Text style={__a3_styles.parityActionText}>Quản lý gốc</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đề xuất thay đổi phả hệ"
              onPress={() => router.push('/family-graph-proposals' as never)}
              style={({ pressed }) => [__a3_styles.parityAction, pressed && __a3_styles.pressed]}
            >
              <Ionicons name="git-pull-request-outline" size={18} color={__a3Colors.primary} />
              <Text style={__a3_styles.parityActionText}>Đề xuất thay đổi</Text>
            </Pressable>
          )}
        </View>

        <View style={__a3_styles.paritySearchRow}>
          <Text style={__a3_styles.paritySearchTitle}>Tìm trong phả hệ</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tìm kiếm người trong phả hệ"
            onPress={() => setSearchRequest((count) => count + 1)}
            style={({ pressed }) => [__a3_styles.paritySearchButton, pressed && __a3_styles.pressed]}
          >
            <Ionicons name="search" size={27} color={__a3Colors.primaryText} />
          </Pressable>
        </View>

        {isAdmin && graphActivitySession ? (
          <View style={__a3_styles.graphNotice}>
            <View style={__a3_styles.graphNoticeCopy}>
              <Text style={__a3_styles.graphNoticeTitle}>Thông báo thay đổi cho gia đình?</Text>
              <Text style={__a3_styles.graphNoticeText}>
                {graphActivitySession.changes.length === 1
                  ? "Bloom sẽ gửi một thông báo ngắn về thay đổi vừa thực hiện."
                  : `Bloom sẽ gộp ${graphActivitySession.changes.length} thay đổi thành một thông báo ngắn.`}
              </Text>
            </View>
            <Pressable
              disabled={notifyingGraph}
              onPress={() => void notifyGraphChanges()}
              style={({ pressed }) => [__a3_styles.graphNoticeButton, pressed && __a3_styles.pressed, notifyingGraph && __a3_styles.disabled]}
            >
              {notifyingGraph ? <ActivityIndicator size="small" color={__a3Colors.white} /> : <Ionicons name="notifications-outline" size={17} color={__a3Colors.white} />}
              <Text style={__a3_styles.graphNoticeButtonText}>{notifyingGraph ? "Đang gửi" : "Thông báo"}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={__a3_styles.graphArea}>
          {loading ? (
            <View style={__a3_styles.centerState}>
              <ActivityIndicator color={__a3Colors.primary} />
              <Text style={__a3_styles.stateText}>Bloom đang mở phả hệ…</Text>
            </View>
          ) : error ? (
            <View style={__a3_styles.centerState}>
              <Ionicons name="cloud-offline-outline" size={34} color={__a3Colors.secondaryText} />
              <Text style={__a3_styles.stateTitle}>Chưa tải được phả hệ</Text>
              <Text style={__a3_styles.stateText}>Kiểm tra kết nối rồi mở lại màn hình này nhé.</Text>
            </View>
          ) : !snapshot.persons.length ? (
            <View style={__a3_styles.centerState}>
              <View style={__a3_styles.emptyIcon}><Ionicons name="git-network-outline" size={32} color={__a3Colors.primary} /></View>
              <Text style={__a3_styles.stateTitle}>Cây nhà đang chờ nhánh đầu tiên</Text>
              <Text style={__a3_styles.stateText}>
                {isAdmin
                  ? "Tạo người đầu tiên, sau đó nối cha mẹ, con và vợ/chồng để cây bắt đầu nở."
                  : "Người giữ nhà chưa bắt đầu phả hệ của gia đình."}
              </Text>
              {isAdmin && (
                <BloomButton
                  title="Bắt đầu xây cây"
                  icon="add-circle-outline"
                  onPress={() => router.push({ pathname: "/family-graph-admin", params: { from: "graph" } } as never)}
                  customStyle={__a3_styles.emptyButton}
                />
              )}
            </View>
          ) : !visual ? (
            <View style={__a3_styles.centerState}>
              <ActivityIndicator color={__a3Colors.primary} />
              <Text style={__a3_styles.stateText}>Bloom đang mở phả hệ…</Text>
            </View>
          ) : !visual.people.length ? (
            <View style={__a3_styles.centerState}>
              <View style={__a3_styles.emptyIcon}><Ionicons name="git-branch-outline" size={32} color={__a3Colors.primary} /></View>
              <Text style={__a3_styles.stateTitle}>Chưa có nhánh nào được nối</Text>
              <Text style={__a3_styles.stateText}>
                {isAdmin
                  ? "Những người đã thêm vẫn được giữ trong danh sách quản lý. Hãy nối ít nhất một quan hệ đã xác nhận để họ xuất hiện trên cây."
                  : "Phả hệ hiện chưa có đường quan hệ nào đã được xác nhận."}
              </Text>
              {isAdmin && (
                <BloomButton
                  title="Nối người vào cây"
                  icon="git-branch-outline"
                  onPress={() => router.push({ pathname: "/family-graph-admin", params: { from: "graph" } } as never)}
                  customStyle={__a3_styles.emptyButton}
                />
              )}
            </View>
          ) : (
            <FamilyGraphPrototype
              key={`${familyId}:${user?.uid}`}
              familyName={membership?.familyName || "Gia đình của mình"}
              familyId={familyId}
              scene={visual}
              memberAvatarByUid={memberAvatarByUid}
              defaultFocusId={visibleFocusId}
              initialViewMode="all"
              initialCameraSnapshot={null}
              onViewStateChange={(state) => {
                if (familyId) updateFamilyGraphViewState(familyId, state);
              }}
              canEdit={isAdmin}
              onProposePerson={() => router.push('/family-graph-proposals' as never)}
              onEditPerson={(personId) => router.push({
                pathname: "/family-graph-person-editor",
                params: { personId },
              } as never)}
              onAddPerson={() => router.push({ pathname: "/family-graph-admin", params: { from: "graph" } } as never)}
              onDeletePerson={deletePerson}
              onDeleteRelationship={deleteRelationship}
              onEditRelationship={(relationshipId, personId) => router.push({
                pathname: "/family-graph-relationship-detail",
                params: { relationshipId, personId },
              } as never)}
              resolveRelationship={resolveRelationship}
              getFocusSubgraphPreview={getFocusSubgraphPreview}
              onOpenFocus={setFocusOverlayPersonId}
              initialDetailPersonId={requestedDetailPersonId || null}
              headerMode="none"
              webParity
              showAdvancedControls={showAdvancedControls}
              searchRequest={searchRequest}
              autoFitOnMount
            />
          )}
        </View>

        <FamilyGraphFocusHost
          snapshot={snapshot}
          memberAvatarByUid={memberAvatarByUid}
          personId={focusOverlayPersonId}
          resolveRelationship={resolveRelationship}
          onYieldBack={() => setFocusOverlayPersonId(null)}
        />
        <Modal transparent visible={showHeroMenu} animationType="fade" onRequestClose={() => setShowHeroMenu(false)}>
          <View style={__a3_styles.webMenuBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowHeroMenu(false)} accessibilityLabel="Đóng menu Cây nhà" />
            <View style={__a3_styles.webMenuCard}>
              <Text style={__a3_styles.webMenuHeading}>Cây nhà</Text>
              <Pressable accessibilityRole="button" style={__a3_styles.webMenuChoice} onPress={() => { setShowAdvancedControls((v) => !v); setShowHeroMenu(false); }}>
                <Ionicons name="options-outline" size={21} color={__a3Colors.primary} />
                <Text style={__a3_styles.webMenuChoiceText}>{showAdvancedControls ? 'Ẩn điều khiển thế hệ' : 'Điều khiển thế hệ / nhánh'}</Text>
              </Pressable>
              {onOpenOverview && <Pressable accessibilityRole="button" style={__a3_styles.webMenuChoice} onPress={() => { setShowHeroMenu(false); onOpenOverview(); }}>
                <Ionicons name="people-outline" size={21} color={__a3Colors.primary} />
                <Text style={__a3_styles.webMenuChoiceText}>Tổng quan Cây nhà & thành viên</Text>
              </Pressable>}
            </View>
          </View>
        </Modal>
      </View>
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  screen: { flex: 1, paddingBottom: 4, backgroundColor: COLORS.background },
  webMenuBackdrop: { flex: 1, justifyContent: 'center', padding: 26, backgroundColor: 'rgba(35,22,34,0.30)' },
  webMenuCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 18, gap: 5 },
  webMenuHeading: { color: COLORS.primaryText, fontWeight: '900', fontSize: 17, paddingHorizontal: 8, paddingVertical: 10 },
  webMenuChoice: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
  webMenuChoiceText: { flex: 1, color: COLORS.primaryText, fontSize: 14, fontWeight: '700' },
  topBar: { height: 50, flexDirection: "row", alignItems: "center", marginBottom: 4 },
  iconButton: { width: 42, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  iconPlaceholder: { width: 42, height: 42 },
  topCopy: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  topTitle: { color: COLORS.primaryText, fontSize: 15.5, fontWeight: "900" },
  topMeta: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "600" },
  adminButton: { width: 42, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, position: "relative" },
  adminBloomBadge: { position: "absolute", right: 4, top: 4, width: 15, height: 15, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.white },
  graphNotice: { marginHorizontal: 16, marginTop: 8, marginBottom: 8, borderWidth: 1, borderColor: COLORS.focusBorder, backgroundColor: COLORS.surface, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  graphNoticeCopy: { flex: 1, minWidth: 0 },
  graphNoticeTitle: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  graphNoticeText: { marginTop: 2, color: COLORS.secondaryText, fontSize: 9.5, lineHeight: 13, fontWeight: "600" },
  graphNoticeButton: { minHeight: 40, borderRadius: 14, paddingHorizontal: 12, backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  graphNoticeButtonText: { color: COLORS.white, fontSize: 10.5, fontWeight: "900" },
  disabled: { opacity: 0.58 },
  graphArea: {
    flex: 1, minHeight: 210, marginHorizontal: 18, marginTop: 16,
    marginBottom: 9, borderRadius: 23, overflow: 'hidden',
    backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1,
  },
  parityActionRow: {
    minHeight: 61, paddingHorizontal: 17, paddingTop: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 13,
  },
  parityAction: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 3 },
  parityActionText: { color: COLORS.primary, fontSize: 13.5, fontWeight: '800' },
  paritySearchRow: {
    paddingHorizontal: 19, minHeight: 63, marginTop: 2,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  paritySearchTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: '800' },
  paritySearchButton: {
    width: 53, height: 53, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  emptyIcon: { width: 66, height: 66, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface, marginBottom: 16 },
  stateTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900", textAlign: "center", marginTop: 10 },
  stateText: { color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 18, textAlign: "center", marginTop: 7, maxWidth: 300 },
  emptyButton: { marginTop: 20, minWidth: 200 },
  pressed: { opacity: 0.64 },
}));

export default FamilyGraphScreen;
