import { bloomTaskScheduler } from "../performance/bloomTaskScheduler";

export type BootstrapPhase = "COLD" | "IDENTITY" | "FIRST_PAINT" | "INTERACTIVE" | "SYNCING" | "SETTLED";
export type BootstrapTaskPriority = "CRITICAL" | "VISIBLE" | "SYNC" | "PREFETCH" | "IDLE";

export type BootstrapSnapshot = {
  sessionKey: string;
  generation: number;
  phase: BootstrapPhase;
  identityReady: boolean;
  firstPaintReady: boolean;
  interactive: boolean;
  startedAt: number;
  updatedAt: number;
};

type Subscriber = () => void;

type StartupTaskContract = {
  key: string;
  priority: BootstrapTaskPriority;
  estimatedCostMs: number;
  canCancel: boolean;
  requiresNetwork: boolean;
  requiresActiveFamily: boolean;
  blocksFirstPaint: boolean;
};

const initial: BootstrapSnapshot = {
  sessionKey: "cold",
  generation: 0,
  phase: "COLD",
  identityReady: false,
  firstPaintReady: false,
  interactive: false,
  startedAt: Date.now(),
  updatedAt: Date.now(),
};

class BootstrapCoordinator {
  private snapshot: BootstrapSnapshot = initial;
  private subscribers = new Set<Subscriber>();
  private contracts = new Map<string, StartupTaskContract>();

  getSnapshot = () => this.snapshot;
  subscribe = (subscriber: Subscriber) => {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  };

  beginSession(sessionKey: string) {
    if (this.snapshot.sessionKey === sessionKey && this.snapshot.phase !== "COLD") return this.snapshot.generation;
    const generation = this.snapshot.generation + 1;
    this.snapshot = {
      sessionKey,
      generation,
      phase: "IDENTITY",
      identityReady: false,
      firstPaintReady: false,
      interactive: false,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    bloomTaskScheduler.cancelPrefix("bootstrap:");
    this.emit();
    return generation;
  }

  markIdentityReady(generation: number) {
    if (!this.isCurrent(generation)) return;
    this.patch({ identityReady: true, phase: "IDENTITY" });
  }

  markFirstPaint(generation: number) {
    if (!this.isCurrent(generation)) return;
    this.patch({ firstPaintReady: true, phase: "FIRST_PAINT" });
  }

  markInteractive(generation: number) {
    if (!this.isCurrent(generation)) return;
    this.patch({ firstPaintReady: true, interactive: true, phase: "INTERACTIVE" });
  }

  markSyncing(generation: number) {
    if (!this.isCurrent(generation) || !this.snapshot.interactive) return;
    this.patch({ phase: "SYNCING" });
  }

  markSettled(generation: number) {
    if (!this.isCurrent(generation)) return;
    this.patch({ phase: "SETTLED" });
  }

  isCurrent(generation: number) {
    return this.snapshot.generation === generation;
  }

  registerTask(contract: StartupTaskContract) {
    // A task that does not explicitly prove it must block first paint is treated
    // as non-blocking by contract; callers cannot infer global readiness from it.
    this.contracts.set(contract.key, contract);
    return () => this.contracts.delete(contract.key);
  }

  contractsSnapshot() {
    return [...this.contracts.values()];
  }

  private patch(patch: Partial<BootstrapSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch, updatedAt: Date.now() };
    this.emit();
  }

  private emit() {
    this.subscribers.forEach((subscriber) => subscriber());
  }
}

export const bootstrapCoordinator = new BootstrapCoordinator();
