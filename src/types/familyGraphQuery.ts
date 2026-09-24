import type {
  FamilyGraphSnapshot,
  FamilyPerson,
  FamilyRelationship,
  ParentChildSubtype,
  PartnerStatus,
} from "./familyGraph";

/** Derived/query-only types. Never persist these objects as Family Graph source of truth. */
export type FamilyGraphDerivedLineage = "biological" | "adoptive" | "unknown" | "mixed";

export interface FamilyGraphParentChildLink {
  person: FamilyPerson;
  relationship: FamilyRelationship & { type: "parent_child" };
  subtype: ParentChildSubtype;
}

export interface FamilyGraphPartnerLink {
  person: FamilyPerson;
  relationship: FamilyRelationship & { type: "partner" };
}

export interface FamilyGraphSharedParentEvidence {
  parentId: string;
  sourceSubtype: ParentChildSubtype;
  targetSubtype: ParentChildSubtype;
  sourceRelationshipId: string;
  targetRelationshipId: string;
}

/**
 * A sibling candidate derived from one or more shared non-step parent edges.
 * We intentionally do NOT label full/half sibling here because a missing second
 * parent in the graph may mean incomplete data rather than a real half-sibling.
 */
export interface FamilyGraphSiblingView {
  person: FamilyPerson;
  sharedParentIds: string[];
  sharedParentEvidence: FamilyGraphSharedParentEvidence[];
  lineage: FamilyGraphDerivedLineage;
}

export interface FamilyGraphTraversalNode {
  person: FamilyPerson;
  depth: number;
  /** Ordered from the starting person to this node. */
  pathPersonIds: string[];
  /** Ordered relationship IDs corresponding to each hop in pathPersonIds. */
  pathRelationshipIds: string[];
  lineage: FamilyGraphDerivedLineage;
}

export interface FamilyGraphTraversalOptions {
  depth?: number;
  maxPeople?: number;
}

export interface FamilyGraphQueryDiagnostics {
  personCount: number;
  relationshipCount: number;
  indexedRelationshipCount: number;
  skippedRelationshipIds: string[];
}

export type FamilyGraphRelationshipKind =
  | "self"
  | "partner"
  | "parent"
  | "child"
  | "sibling"
  | "grandparent"
  | "grandchild"
  | "ancestor"
  | "descendant"
  | "aunt_uncle"
  | "niece_nephew"
  | "cousin"
  | "unrelated";

export type FamilyGraphRelationshipEvidenceKind = "direct" | "derived" | "none";

/**
 * Structured result for DG-4: getRelationshipBetween(A, B) means "A là gì của B".
 * This object is evidence-only. Vietnamese wording lives in the resolver layer.
 */
export interface FamilyGraphRelationshipBetweenResult {
  sourcePerson: FamilyPerson;
  targetPerson: FamilyPerson;
  kind: FamilyGraphRelationshipKind;
  evidenceKind: FamilyGraphRelationshipEvidenceKind;
  lineage: FamilyGraphDerivedLineage;
  generationDistance: number;
  pathPersonIds: string[];
  pathRelationshipIds: string[];
  directSubtype: ParentChildSubtype | null;
  partnerStatus: PartnerStatus | null;
  sharedParentIds: string[];
  viaPersonId: string | null;
}

export type FamilyGraphRelativeAge = "older" | "younger" | "unknown";

export interface FamilyGraphVietnameseRelationship {
  sourcePersonId: string;
  targetPersonId: string;
  kind: FamilyGraphRelationshipKind;
  label: string;
  sentence: string;
  detail: string | null;
  lineage: FamilyGraphDerivedLineage;
  relativeAge: FamilyGraphRelativeAge;
  pathPersonIds: string[];
  pathRelationshipIds: string[];
}

export interface FamilyGraphFocusSubgraphOptions {
  ancestorDepth?: number;
  descendantDepth?: number;
  includePartners?: boolean;
  includeSiblings?: boolean;
  includeCousins?: boolean;
  maxPeople?: number;
}

export interface FamilyGraphFocusSubgraph {
  snapshot: FamilyGraphSnapshot;
  focusPersonId: string;
  personIds: string[];
  relationshipIds: string[];
  truncated: boolean;
  requestedMaxPeople: number;
}
