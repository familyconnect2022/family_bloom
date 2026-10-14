import { useState } from "react";
import { useTabLiveEffect } from "../../context/TabRuntimeContext";
import { familyJoinService } from "../../services/family/familyJoinService";
import { graphProposalService } from "../../services/familyGraph/graphProposalService";
import { subscribeSharedRealtime } from "../../services/realtime/sharedRealtimeRegistry";

type Status = "loading" | "pending" | "empty" | "error";
export function usePendingFamilyReviews(familyId: string | null, uid: string | undefined, isAdmin: boolean) {
  const key = `${uid || ""}:${familyId || ""}`;
  const [state, setState] = useState<{key: string; joins: Status; proposals: Status}>({key: "", joins: "loading", proposals: "loading"});

  useTabLiveEffect("family", () => {
    if (!familyId || !uid || !isAdmin) return;
    let live = true;
    setState({key, joins: "loading", proposals: "loading"});
    const update = (field: "joins" | "proposals", value: Status) => {
      if (live) setState(previous => ({...previous, key, [field]: value}));
    };
    const stopJoins = subscribeSharedRealtime<boolean>({
      key: `reviews.join_pending:${familyId}`,
      listenerName: "reviews.join_pending",
      start: (onData, onError) => familyJoinService.watchHasPending(familyId, onData, onError),
      onData: pending => update("joins", pending ? "pending" : "empty"),
      onError: () => update("joins", "error"),
    });
    const stopProposals = subscribeSharedRealtime<boolean>({
      key: `reviews.proposal_pending:${familyId}`,
      listenerName: "reviews.proposal_pending",
      start: (onData, onError) => graphProposalService.watchHasPending(familyId, onData, onError),
      onData: pending => update("proposals", pending ? "pending" : "empty"),
      onError: () => update("proposals", "error"),
    });
    return () => {
      live = false;
      stopJoins?.();
      stopProposals?.();
    };
  }, [familyId, isAdmin, key, uid]);

  return isAdmin && state.key === key ? state : {joins: "loading" as Status, proposals: "loading" as Status};
}
