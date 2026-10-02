import type { FamilyPerson, FamilyRelationship } from "./familyGraph";
export type ProposalEntity = "persons" | "relationships";
export type ProposalAction = "create" | "update" | "delete";
export type ProposalDocument = FamilyPerson | FamilyRelationship;
export interface GraphProposal {
  id: string; familyId: string; entity: ProposalEntity; action: ProposalAction; targetId: string;
  before: ProposalDocument | null; after: ProposalDocument | null;
  reason: string; createdByUid: string; createdAt: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  reviewedByUid: string | null; reviewedAt: string | null; reviewNote: string | null;
  applied: ProposalDocument | null;
}
