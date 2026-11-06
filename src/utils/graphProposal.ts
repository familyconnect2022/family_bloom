import type { CreateFamilyPersonInput, FamilyPerson, FamilyRelationship } from "../types/familyGraph";
import type { GraphProposal, ProposalAction, ProposalDocument, ProposalEntity } from "../types/graphProposal";
import { canonicalizePartnerIds, getParentChildRelationshipId, getPartnerRelationshipId, normalizeCreateFamilyPersonInput, normalizeFamilyRelationship } from "./familyGraph";

export const sameDocument = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every(key => key in right && sameDocument(left[key], right[key]));
};
export function buildProposalTarget(entity: ProposalEntity, action: ProposalAction, familyId: string, targetId: string, before: ProposalDocument | null, input: Record<string, unknown>, uid: string, now: string): ProposalDocument | null {
  if (action !== "create" && !before) throw new Error("Nội dung không còn tồn tại.");
  if (action === "delete") return null;
  if (entity === "persons") {
    const old = before as FamilyPerson | null;
    const normalized = normalizeCreateFamilyPersonInput({ ...old, ...input, linkedUid: old?.linkedUid ?? null } as CreateFamilyPersonInput);
    for (const [key, max] of Object.entries({displayName:160,nickname:120,birthPlace:240,description:4000,avatarUrl:1500})) {
      const value = (normalized as Record<string, unknown>)[key];
      if (typeof value === "string" && value.length > max) throw new Error(`Nội dung quá dài (tối đa ${max} ký tự).`);
    }
    if (normalized.birthOrder != null && normalized.birthOrder > 100) throw new Error("Thứ tự sinh từ 1 đến 100.");
    return { ...normalized, id: targetId, familyId, linkedUid: old?.linkedUid ?? null,
      createdByUid: old?.createdByUid ?? uid, createdAt: old?.createdAt ?? now, updatedAt: old?.updatedAt ?? now } as FamilyPerson;
  }
  const old = before as FamilyRelationship | null;
  const type = old?.type ?? input.type;
  let a = String(old?.personAId ?? input.personAId ?? "").trim();
  let b = String(old?.personBId ?? input.personBId ?? "").trim();
  if (type === "partner") [a,b] = canonicalizePartnerIds(a,b);
  const id = type === "parent_child" ? getParentChildRelationshipId(a,b) : getPartnerRelationshipId(a,b);
  if (action === "update" && id !== targetId) throw new Error("Không thể đổi hai đầu của quan hệ. Hãy đề xuất xóa rồi tạo quan hệ đúng.");
  return normalizeFamilyRelationship({ id, familyId, type, personAId:a, personBId:b,
    subtype: type === "parent_child" ? (input.subtype ?? old?.subtype ?? "unknown") : null,
    partnerStatus: type === "partner" ? (input.partnerStatus ?? old?.partnerStatus ?? "partner") : null,
    startDate: type === "partner" ? (input.startDate === undefined ? old?.startDate ?? null : input.startDate) : null,
    endDate: type === "partner" ? (input.endDate === undefined ? old?.endDate ?? null : input.endDate) : null,
    createdByUid: old?.createdByUid ?? uid, createdAt: old?.createdAt ?? now, updatedAt: old?.updatedAt ?? now,
  }, id, familyId);
}
export function approveTarget(proposal: GraphProposal, current: ProposalDocument | null, uid: string, now: string): ProposalDocument | null {
  if (proposal.status !== "pending") throw new Error("Đề xuất đã được xử lý.");
  if (!sameDocument(current, proposal.before)) throw new Error("Dữ liệu đã thay đổi từ lúc gửi đề xuất. Hãy từ chối và tạo đề xuất mới để tránh ghi đè.");
  if (proposal.action === "delete") return null;
  if (!proposal.after) throw new Error("Đề xuất thiếu nội dung.");
  return { ...proposal.after, updatedAt: now, ...(proposal.action === "create" ? { createdByUid: uid, createdAt: now } : {}) };
}
