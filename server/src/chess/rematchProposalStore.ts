export type RematchVoteResult = {
  waiting: boolean;
  ready: boolean;
  expiresAt: number;
  voterCount: number;
  requestIds: string[];
};

type Proposal = {
  voters: Set<string>;
  requestIdsByUid: Map<string, string>;
  expiresAt: number;
  timer: NodeJS.Timeout;
};

/**
 * Ephemeral rematch consensus only. Game creation remains authoritative in the
 * socket handler / ChessGameManager. Every proposal has a hard TTL and a real
 * eviction timer so stale votes cannot survive for hours in server memory.
 */
export class RematchProposalStore {
  private proposals = new Map<string, Proposal>();

  constructor(private ttlMs = 45_000) {}

  vote(gameId: string, uid: string, requestId: string, now = Date.now()): RematchVoteResult {
    let proposal = this.proposals.get(gameId);
    if (proposal && proposal.expiresAt <= now) {
      this.clear(gameId);
      proposal = undefined;
    }
    if (!proposal) {
      const expiresAt = now + this.ttlMs;
      const timer = setTimeout(() => this.clear(gameId), this.ttlMs + 25);
      timer.unref();
      proposal = { voters: new Set<string>(), requestIdsByUid: new Map<string, string>(), expiresAt, timer };
      this.proposals.set(gameId, proposal);
    }
    proposal.voters.add(uid);
    proposal.requestIdsByUid.set(uid, requestId);
    const ready = proposal.voters.size >= 2;
    return {
      waiting: !ready,
      ready,
      expiresAt: proposal.expiresAt,
      voterCount: proposal.voters.size,
      requestIds: [...proposal.requestIdsByUid.values()],
    };
  }

  cancel(gameId: string, uid: string, now = Date.now()) {
    const proposal = this.proposals.get(gameId);
    if (!proposal) return true;
    if (proposal.expiresAt <= now) {
      this.clear(gameId);
      return true;
    }
    proposal.voters.delete(uid);
    proposal.requestIdsByUid.delete(uid);
    if (proposal.voters.size === 0) this.clear(gameId);
    return true;
  }

  clear(gameId: string) {
    const proposal = this.proposals.get(gameId);
    if (proposal) clearTimeout(proposal.timer);
    this.proposals.delete(gameId);
  }

  hasVote(gameId: string, uid: string, now = Date.now()) {
    const proposal = this.proposals.get(gameId);
    if (!proposal) return false;
    if (proposal.expiresAt <= now) {
      this.clear(gameId);
      return false;
    }
    return proposal.voters.has(uid);
  }

  size() {
    return this.proposals.size;
  }
}
