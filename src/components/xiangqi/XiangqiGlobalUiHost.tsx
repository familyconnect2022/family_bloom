import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";

import { useXiangqiRealtime } from "../../context/XiangqiRealtimeContext";
import { useFamilyMembersRealtime } from "../../context/FamilyRealtimeContext";
import { xiangqiSocketService } from "../../services/xiangqi/xiangqiSocketService";
import { activateXiangqiSurface, prepareXiangqiSurface } from "../../services/xiangqi/xiangqiSurfaceStore";
import { useBloomToast } from "../ui/BloomToast";
import { XiangqiChallengeOverlay } from "./XiangqiChallengeOverlay";

/**
 * Xiangqi-only root invitation UI.
 *
 * It deliberately does not import Chess state, Chess transport, or the shared
 * board-session coordinator. The only cross-game exclusivity lives on the
 * server reservation/active-game guard.
 */
export const XiangqiGlobalUiHost = React.memo(function XiangqiGlobalUiHost({
  suspended = false,
}: {
  suspended?: boolean;
}) {
  const router = useRouter();
  const realtime = useXiangqiRealtime();
  const members = useFamilyMembersRealtime();
  const { showToast } = useBloomToast();
  const [busy, setBusy] = useState(false);
  const routedGameRef = useRef<string | null>(null);
  const incomingRef = useRef(realtime.incomingInvite);
  incomingRef.current = realtime.incomingInvite;

  const invite = suspended ? null : realtime.incomingInvite;
  const challenger = useMemo(
    () => invite && !invite.isTestBot ? members?.memberByUid.get(invite.fromUid) : null,
    [invite, members?.memberByUid],
  );

  useEffect(() => xiangqiSocketService.onInviteExpired(({ inviteId }) => {
    const current = incomingRef.current;
    if (!current || current.inviteId !== inviteId) return;
    const displayName = current.fromDisplayName
      || members?.memberByUid.get(current.fromUid)?.shortName
      || members?.memberByUid.get(current.fromUid)?.displayName
      || (current.isTestBot ? "Bloom Bot" : "Người thân");
    showToast({
      type: "info",
      title: "Lời mời đã khép lại",
      message: `Lời mời Cờ tướng từ ${displayName} không còn khả dụng nữa.`,
    });
  }), [members?.memberByUid, showToast]);

  useEffect(() => {
    const gameId = realtime.activeGameId;
    if (!gameId) {
      routedGameRef.current = null;
      return;
    }
    if (routedGameRef.current === gameId) return;
    activateXiangqiSurface(gameId, "full", "active_game");
    routedGameRef.current = gameId;
    router.navigate("/(xiangqi)/xiangqi-preview" as never);
  }, [realtime.activeGameId, router]);

  return (
    <XiangqiChallengeOverlay
      invite={invite}
      challenger={challenger}
      busy={busy}
      onAccept={() => {
        if (!invite || busy) return;
        prepareXiangqiSurface("accept_invite");
        setBusy(true);
        void realtime.acceptInvite(invite.inviteId)
          .then((response) => {
            if (!response.ok) {
              showToast({
                type: "warning",
                title: "Chưa vào được phòng",
                message: response.message || "Lời mời có thể đã khép lại. Bạn thử lại từ trang Cờ tướng nhé.",
              });
            }
          })
          .finally(() => setBusy(false));
      }}
      onReject={() => {
        if (!invite || busy) return;
        setBusy(true);
        void realtime.rejectInvite(invite.inviteId)
          .then((response) => {
            if (!response.ok) {
              showToast({ type: "warning", message: response.message || "Bloom chưa gửi được phản hồi." });
            }
          })
          .finally(() => setBusy(false));
      }}
    />
  );
});
