export type FamilyActivityKind = "moment" | "event" | "graph" | "review" | "home";
export type FamilyActivityAudience = "family" | "target";
export type FamilyActivityImportance = "normal" | "notable" | "important";
export type FamilyActivitySourceType = "moment" | "event" | "graph" | "join_request" | "graph_proposal" | "home_time_capsule";

export interface FamilyActivity {
  id: string;
  familyId: string;
  kind: FamilyActivityKind;
  audience: FamilyActivityAudience;
  targetUid: string | null;
  actorUid: string;
  actorName: string;
  title: string;
  body: string | null;
  sourceType: FamilyActivitySourceType;
  sourceId: string | null;
  importance: FamilyActivityImportance;
  badgeEligible: boolean;
  createdAt: string;
}

export interface FamilyActivityPage {
  items: FamilyActivity[];
  lastSeenAt: string | null;
  unreadBadgeCount: number;
}
