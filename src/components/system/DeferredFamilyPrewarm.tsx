import { useEffect } from "react";
import { AppState } from "react-native";
import { hydrateFamilyGraphWarmCache, primeFamilyGraphWarmCache } from "../familyGraph/familyGraphWarmCache";
import { useAuth } from "../../context/AuthContext";
import { familyGraphService } from "../../services/familyGraph/familyGraphService";

/**
 * Low-priority A14 prewarm. It never blocks Home and never mounts Graph UI.
 *
 * A persisted Graph snapshot/layout is hydrated first. Then one shared realtime
 * snapshot is allowed to refresh it. After the first complete snapshot this
 * consumer releases; the registry keeps the physical listener warm briefly so
 * an immediate Graph navigation reuses the same listener instead of opening a
 * duplicate pair.
 */
export function DeferredFamilyPrewarm({ ready }: { ready: boolean }) {
  const { user, activeFamilyId, profileStatus } = useAuth();

  useEffect(() => {
    if (!ready || !user || profileStatus !== "ready" || !activeFamilyId || AppState.currentState !== "active") return;
    let closed = false;
    let stop: (() => void) | null = null;

    void hydrateFamilyGraphWarmCache(activeFamilyId).finally(() => {
      if (closed) return;
      stop = familyGraphService.watchSnapshot(
        activeFamilyId,
        (snapshot) => {
          if (closed) return;
          primeFamilyGraphWarmCache(snapshot, user.uid);
          // Keep the underlying shared query alive for the short "Home -> Graph"
          // navigation window, but release this prewarm consumer immediately.
          stop?.();
          stop = null;
        },
        () => {
          stop?.();
          stop = null;
        },
        30_000,
      );
    });

    return () => {
      closed = true;
      stop?.();
    };
  }, [activeFamilyId, profileStatus, ready, user]);

  return null;
}
