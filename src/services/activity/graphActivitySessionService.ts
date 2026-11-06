export type GraphActivityChangeKind =
  | "person_added"
  | "person_deleted"
  | "person_updated"
  | "relationship_added"
  | "relationship_deleted"
  | "link_changed";

export interface GraphActivityChange {
  kind: GraphActivityChangeKind;
  personName?: string | null;
}

export interface GraphActivitySession {
  id: string;
  familyId: string;
  startedAt: number;
  changes: GraphActivityChange[];
}

const sessions = new Map<string, GraphActivitySession>();
const SESSION_WINDOW_MS = 10 * 60 * 1000;

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const graphActivitySessionService = {
  record(familyId: string, change: GraphActivityChange): GraphActivitySession {
    const now = Date.now();
    const existing = sessions.get(familyId);
    const current = existing && now - existing.startedAt <= SESSION_WINDOW_MS
      ? existing
      : {
        id: makeId(),
        familyId,
        startedAt: now,
        changes: [],
      };
    const next = { ...current, changes: [...current.changes, change] };
    sessions.set(familyId, next);
    return next;
  },

  get(familyId: string | null | undefined): GraphActivitySession | null {
    if (!familyId) return null;
    const current = sessions.get(familyId) ?? null;
    if (!current) return null;
    if (Date.now() - current.startedAt > SESSION_WINDOW_MS) {
      sessions.delete(familyId);
      return null;
    }
    return current;
  },

  clear(familyId: string) {
    sessions.delete(familyId);
  },

  copyFor(session: GraphActivitySession) {
    const [only] = session.changes;
    if (session.changes.length === 1 && only.kind === "person_added" && only.personName) {
      return {
        title: "Cây nhà vừa có thêm một thành viên",
        body: `Admin đã thêm ${only.personName} vào phả hệ.`,
      };
    }
    if (session.changes.length === 1 && only.kind === "person_deleted" && only.personName) {
      return {
        title: "Cây nhà vừa được cập nhật",
        body: `Admin đã xóa ${only.personName} khỏi phả hệ.`,
      };
    }
    if (session.changes.length === 1) {
      return {
        title: "Cây nhà vừa được cập nhật",
        body: "Admin vừa hoàn tất một thay đổi trong phả hệ.",
      };
    }
    return {
      title: "Cây nhà vừa được cập nhật",
      body: `Admin đã thực hiện ${session.changes.length} thay đổi trong phả hệ.`,
    };
  },
};
