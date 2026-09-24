import type { Gender } from "./user";

export type FamilyPersonLifeStatus = "living" | "deceased" | "unknown";
export type FamilyRelationshipType = "parent_child" | "partner";
export type ParentChildSubtype = "biological" | "adoptive" | "step" | "unknown";
export type PartnerStatus = "partner" | "married" | "separated" | "divorced" | "widowed";

export interface FamilyPerson {
  id: string;
  familyId: string;
  linkedUid: string | null;
  displayName: string;
  gender: Gender;
  nickname: string | null;
  birthDate: string | null;
  birthYear: number | null;
  birthPlace: string | null;
  deathDate: string | null;
  deathYear: number | null;
  lifeStatus: FamilyPersonLifeStatus;
  birthOrder: number | null;
  avatarUrl: string | null;
  description: string | null;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyRelationship {
  id: string;
  familyId: string;
  type: FamilyRelationshipType;
  /** parent_child: parent. partner: canonical lexical first person. */
  personAId: string;
  /** parent_child: child. partner: canonical lexical second person. */
  personBId: string;
  subtype: ParentChildSubtype | null;
  partnerStatus: PartnerStatus | null;
  startDate: string | null;
  endDate: string | null;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}


export interface FamilyPersonTimelineEntry {
  id: string;
  familyId: string;
  personId: string;
  date: string;
  title: string;
  description: string | null;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateFamilyPersonTimelineEntryInput = {
  date: string;
  title: string;
  description?: string | null;
};

export type UpdateFamilyPersonTimelineEntryInput = CreateFamilyPersonTimelineEntryInput;

export interface FamilyPersonAlbumRef {
  id: string;
  familyId: string;
  personId: string;
  mediaAssetId: string;
  caption: string | null;
  createdByUid: string;
  createdAt: string;
}

export interface FamilyPersonAlbumMedia extends FamilyPersonAlbumRef {
  type: "image" | "video";
  secureUrl: string;
  thumbnailUrl: string | null;
}

export interface FamilyPersonLink {
  familyId: string;
  uid: string;
  personId: string;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyGraphSnapshot {
  familyId: string;
  persons: FamilyPerson[];
  relationships: FamilyRelationship[];
}

export type CreateFamilyPersonInput = {
  displayName: string;
  gender: Gender;
  nickname?: string | null;
  birthDate?: string | null;
  birthYear?: number | null;
  birthPlace?: string | null;
  deathDate?: string | null;
  deathYear?: number | null;
  lifeStatus?: FamilyPersonLifeStatus;
  birthOrder?: number | null;
  avatarUrl?: string | null;
  description?: string | null;
  linkedUid?: string | null;
};

export type UpdateFamilyPersonInput = Partial<
  Omit<
    FamilyPerson,
    "id" | "familyId" | "linkedUid" | "createdByUid" | "createdAt" | "updatedAt"
  >
>;

export type CreateParentChildRelationshipInput = {
  type: "parent_child";
  parentId: string;
  childId: string;
  subtype?: ParentChildSubtype | null;
};

export type CreatePartnerRelationshipInput = {
  type: "partner";
  personAId: string;
  personBId: string;
  partnerStatus?: PartnerStatus | null;
  startDate?: string | null;
  endDate?: string | null;
};

export type CreateFamilyRelationshipInput =
  | CreateParentChildRelationshipInput
  | CreatePartnerRelationshipInput;

/**
 * DG-11 — Batch Relationship Composer.
 * UI convenience only: this expands to canonical parent_child documents.
 * It never introduces a persisted "group relationship" schema.
 */
export type CreateParentChildRelationshipsBatchInput = {
  parentIds: string[];
  childIds: string[];
  subtype?: ParentChildSubtype | null;
};

export type CreateParentChildRelationshipsBatchResult = {
  createdRelationshipIds: string[];
  existingRelationshipIds: string[];
};

export type UpdatePartnerRelationshipInput = {
  partnerStatus?: PartnerStatus | null;
  startDate?: string | null;
  endDate?: string | null;
};

/** Derived-only view. Never persist this interface in Firestore during Phase 6.2. */
export interface FamilyUnionView {
  partnerIds: string[];
  childIds: string[];
  status: PartnerStatus | null;
  startDate: string | null;
  endDate: string | null;
}
