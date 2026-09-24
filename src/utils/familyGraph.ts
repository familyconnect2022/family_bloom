import { AppError } from "../types/errors";
import type {
  CreateFamilyPersonInput,
  FamilyPerson,
  FamilyPersonLifeStatus,
  FamilyPersonLink,
  FamilyRelationship,
  FamilyRelationshipType,
  ParentChildSubtype,
  PartnerStatus,
} from "../types/familyGraph";
import type { Gender } from "../types/user";

const GENDERS = new Set<Gender>(["male", "female", "other"]);
const LIFE_STATUSES = new Set<FamilyPersonLifeStatus>(["living", "deceased", "unknown"]);
const PARENT_CHILD_SUBTYPES = new Set<ParentChildSubtype>(["biological", "adoptive", "step", "unknown"]);
const PARTNER_STATUSES = new Set<PartnerStatus>(["partner", "married", "separated", "divorced", "widowed"]);
const RELATIONSHIP_TYPES = new Set<FamilyRelationshipType>(["parent_child", "partner"]);

const stringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const requiredString = (value: unknown, errorCode: "PERSON_INVALID_DATA" | "RELATIONSHIP_INVALID"): string => {
  const normalized = stringOrNull(value);
  if (!normalized) throw new AppError(errorCode, errorCode.startsWith("PERSON_") ? "PERSON" : "RELATIONSHIP");
  return normalized;
};

const nullableInteger = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const isIsoDateOnly = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
};

const isIsoDateTime = (value: string): boolean => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && /T/.test(value);
};

const assertIsoAuditTime = (value: unknown): string => {
  const text = requiredString(value, "PERSON_INVALID_DATA");
  if (!isIsoDateTime(text)) throw new AppError("PERSON_INVALID_DATA", "PERSON");
  return text;
};

const assertDateOnlyOrNull = (
  value: unknown,
  category: "PERSON" | "RELATIONSHIP",
): string | null => {
  const text = stringOrNull(value);
  if (text && !isIsoDateOnly(text)) {
    throw new AppError(category === "PERSON" ? "PERSON_INVALID_DATA" : "RELATIONSHIP_INVALID", category);
  }
  return text;
};

const assertPersonId = (value: unknown): string => {
  const id = requiredString(value, "PERSON_INVALID_DATA");
  if (id.includes("/")) throw new AppError("PERSON_INVALID_DATA", "PERSON");
  return id;
};

const assertRelationshipIdPart = (value: string): void => {
  if (!value || value.includes("/")) throw new AppError("RELATIONSHIP_INVALID", "RELATIONSHIP");
};

export const canonicalizePartnerIds = (personAId: string, personBId: string): [string, string] => {
  assertRelationshipIdPart(personAId);
  assertRelationshipIdPart(personBId);
  if (personAId === personBId) throw new AppError("RELATIONSHIP_SELF_REFERENCE", "RELATIONSHIP");
  return personAId < personBId ? [personAId, personBId] : [personBId, personAId];
};

export const getParentChildRelationshipId = (parentId: string, childId: string): string => {
  assertRelationshipIdPart(parentId);
  assertRelationshipIdPart(childId);
  if (parentId === childId) throw new AppError("RELATIONSHIP_SELF_REFERENCE", "RELATIONSHIP");
  return `pc_${parentId}_${childId}`;
};

export const getPartnerRelationshipId = (personAId: string, personBId: string): string => {
  const [a, b] = canonicalizePartnerIds(personAId, personBId);
  return `pt_${a}_${b}`;
};

export const getFamilyRelationshipId = (
  type: FamilyRelationshipType,
  personAId: string,
  personBId: string,
): string => type === "parent_child"
  ? getParentChildRelationshipId(personAId, personBId)
  : getPartnerRelationshipId(personAId, personBId);

export const normalizeCreateFamilyPersonInput = (input: CreateFamilyPersonInput): CreateFamilyPersonInput => {
  const displayName = input.displayName.trim();
  if (!displayName || !GENDERS.has(input.gender)) throw new AppError("PERSON_INVALID_DATA", "PERSON");

  const birthDate = assertDateOnlyOrNull(input.birthDate, "PERSON");
  const deathDate = assertDateOnlyOrNull(input.deathDate, "PERSON");
  const currentYear = new Date().getUTCFullYear();
  const dateBirthYear = birthDate ? Number(birthDate.slice(0, 4)) : null;
  const dateDeathYear = deathDate ? Number(deathDate.slice(0, 4)) : null;
  const suppliedBirthYear = input.birthYear ?? null;
  const suppliedDeathYear = input.deathYear ?? null;
  const birthYear = dateBirthYear ?? suppliedBirthYear;
  const deathYear = dateDeathYear ?? suppliedDeathYear;
  const lifeStatus = input.lifeStatus ?? ((deathDate || deathYear) ? "deceased" : "unknown");

  if (!LIFE_STATUSES.has(lifeStatus)) throw new AppError("PERSON_INVALID_DATA", "PERSON");
  if (birthYear !== null && (!Number.isInteger(birthYear) || birthYear < 1800 || birthYear > currentYear)) {
    throw new AppError("PERSON_INVALID_DATA", "PERSON");
  }
  if (deathYear !== null && (!Number.isInteger(deathYear) || deathYear < 1800 || deathYear > currentYear)) {
    throw new AppError("PERSON_INVALID_DATA", "PERSON");
  }
  if (birthDate && suppliedBirthYear !== null && suppliedBirthYear !== undefined && suppliedBirthYear !== dateBirthYear) {
    throw new AppError("PERSON_INVALID_DATA", "PERSON");
  }
  if (deathDate && suppliedDeathYear !== null && suppliedDeathYear !== undefined && suppliedDeathYear !== dateDeathYear) {
    throw new AppError("PERSON_INVALID_DATA", "PERSON");
  }
  if (lifeStatus === "living" && (deathDate || deathYear)) throw new AppError("PERSON_INVALID_DATA", "PERSON");
  if ((deathDate || deathYear) && lifeStatus !== "deceased") throw new AppError("PERSON_INVALID_DATA", "PERSON");
  if (birthYear !== null && deathYear !== null && deathYear < birthYear) throw new AppError("PERSON_INVALID_DATA", "PERSON");
  if (birthDate && deathDate && deathDate < birthDate) throw new AppError("PERSON_INVALID_DATA", "PERSON");
  if (input.birthOrder !== null && input.birthOrder !== undefined && (!Number.isInteger(input.birthOrder) || input.birthOrder <= 0)) {
    throw new AppError("PERSON_INVALID_DATA", "PERSON");
  }

  return {
    displayName,
    gender: input.gender,
    nickname: stringOrNull(input.nickname),
    birthDate,
    birthYear,
    birthPlace: stringOrNull(input.birthPlace),
    deathDate,
    deathYear,
    lifeStatus,
    birthOrder: input.birthOrder ?? null,
    avatarUrl: stringOrNull(input.avatarUrl),
    description: stringOrNull(input.description),
    linkedUid: stringOrNull(input.linkedUid),
  };
};

export const normalizeFamilyPerson = (
  data: Record<string, unknown>,
  documentId: string,
  familyId: string,
): FamilyPerson => {
  const id = assertPersonId(data.id ?? documentId);
  const storedFamilyId = requiredString(data.familyId, "PERSON_INVALID_DATA");
  const displayName = requiredString(data.displayName, "PERSON_INVALID_DATA");
  const gender = data.gender as Gender;
  const lifeStatus = data.lifeStatus as FamilyPersonLifeStatus;
  const birthDate = assertDateOnlyOrNull(data.birthDate, "PERSON");
  const deathDate = assertDateOnlyOrNull(data.deathDate, "PERSON");
  const birthYear = nullableInteger(data.birthYear);
  const deathYear = nullableInteger(data.deathYear) ?? (deathDate ? Number(deathDate.slice(0, 4)) : null);
  const birthOrder = nullableInteger(data.birthOrder);

  if (id !== documentId || storedFamilyId !== familyId || !GENDERS.has(gender) || !LIFE_STATUSES.has(lifeStatus)) {
    throw new AppError("PERSON_INVALID_DATA", "PERSON");
  }
  const currentYear = new Date().getUTCFullYear();
  if (birthYear !== null && (birthYear < 1800 || birthYear > currentYear)) {
    throw new AppError("PERSON_INVALID_DATA", "PERSON");
  }
  if (deathYear !== null && (deathYear < 1800 || deathYear > currentYear)) {
    throw new AppError("PERSON_INVALID_DATA", "PERSON");
  }
  if (birthDate && birthYear !== null && birthYear !== Number(birthDate.slice(0, 4))) {
    throw new AppError("PERSON_INVALID_DATA", "PERSON");
  }
  if (deathDate && deathYear !== null && deathYear !== Number(deathDate.slice(0, 4))) {
    throw new AppError("PERSON_INVALID_DATA", "PERSON");
  }
  if (birthOrder !== null && birthOrder <= 0) throw new AppError("PERSON_INVALID_DATA", "PERSON");
  if (lifeStatus === "living" && (deathDate || deathYear)) throw new AppError("PERSON_INVALID_DATA", "PERSON");
  if ((deathDate || deathYear) && lifeStatus !== "deceased") throw new AppError("PERSON_INVALID_DATA", "PERSON");
  if (birthYear !== null && deathYear !== null && deathYear < birthYear) throw new AppError("PERSON_INVALID_DATA", "PERSON");
  if (birthDate && deathDate && deathDate < birthDate) throw new AppError("PERSON_INVALID_DATA", "PERSON");

  return {
    id,
    familyId: storedFamilyId,
    linkedUid: stringOrNull(data.linkedUid),
    displayName,
    gender,
    nickname: stringOrNull(data.nickname),
    birthDate,
    birthYear,
    birthPlace: stringOrNull(data.birthPlace),
    deathDate,
    deathYear,
    lifeStatus,
    birthOrder,
    avatarUrl: stringOrNull(data.avatarUrl),
    description: stringOrNull(data.description),
    createdByUid: requiredString(data.createdByUid, "PERSON_INVALID_DATA"),
    createdAt: assertIsoAuditTime(data.createdAt),
    updatedAt: assertIsoAuditTime(data.updatedAt),
  };
};

export const normalizeFamilyRelationship = (
  data: Record<string, unknown>,
  documentId: string,
  familyId: string,
): FamilyRelationship => {
  const id = requiredString(data.id ?? documentId, "RELATIONSHIP_INVALID");
  const storedFamilyId = requiredString(data.familyId, "RELATIONSHIP_INVALID");
  const type = data.type as FamilyRelationshipType;
  const rawA = requiredString(data.personAId, "RELATIONSHIP_INVALID");
  const rawB = requiredString(data.personBId, "RELATIONSHIP_INVALID");

  if (id !== documentId || storedFamilyId !== familyId || !RELATIONSHIP_TYPES.has(type)) {
    throw new AppError("RELATIONSHIP_INVALID", "RELATIONSHIP");
  }
  if (rawA === rawB) throw new AppError("RELATIONSHIP_SELF_REFERENCE", "RELATIONSHIP");

  let personAId = rawA;
  let personBId = rawB;
  let subtype: ParentChildSubtype | null = null;
  let partnerStatus: PartnerStatus | null = null;
  let startDate: string | null = null;
  let endDate: string | null = null;

  if (type === "parent_child") {
    subtype = (data.subtype ?? "unknown") as ParentChildSubtype;
    if (!PARENT_CHILD_SUBTYPES.has(subtype)) throw new AppError("RELATIONSHIP_INVALID", "RELATIONSHIP");
    if (data.partnerStatus !== null && data.partnerStatus !== undefined) throw new AppError("RELATIONSHIP_INVALID", "RELATIONSHIP");
    if (data.startDate !== null && data.startDate !== undefined) throw new AppError("RELATIONSHIP_INVALID", "RELATIONSHIP");
    if (data.endDate !== null && data.endDate !== undefined) throw new AppError("RELATIONSHIP_INVALID", "RELATIONSHIP");
    if (id !== getParentChildRelationshipId(personAId, personBId)) throw new AppError("RELATIONSHIP_INVALID", "RELATIONSHIP");
  } else {
    [personAId, personBId] = canonicalizePartnerIds(rawA, rawB);
    partnerStatus = (data.partnerStatus ?? "partner") as PartnerStatus;
    if (!PARTNER_STATUSES.has(partnerStatus)) throw new AppError("RELATIONSHIP_INVALID", "RELATIONSHIP");
    if (data.subtype !== null && data.subtype !== undefined) throw new AppError("RELATIONSHIP_INVALID", "RELATIONSHIP");
    startDate = assertDateOnlyOrNull(data.startDate, "RELATIONSHIP");
    endDate = assertDateOnlyOrNull(data.endDate, "RELATIONSHIP");
    if (startDate && endDate && endDate < startDate) throw new AppError("RELATIONSHIP_INVALID", "RELATIONSHIP");
    if (id !== getPartnerRelationshipId(personAId, personBId)) throw new AppError("RELATIONSHIP_INVALID", "RELATIONSHIP");
  }

  const createdAt = requiredString(data.createdAt, "RELATIONSHIP_INVALID");
  const updatedAt = requiredString(data.updatedAt, "RELATIONSHIP_INVALID");
  if (!isIsoDateTime(createdAt) || !isIsoDateTime(updatedAt)) throw new AppError("RELATIONSHIP_INVALID", "RELATIONSHIP");

  return {
    id,
    familyId: storedFamilyId,
    type,
    personAId,
    personBId,
    subtype,
    partnerStatus,
    startDate,
    endDate,
    createdByUid: requiredString(data.createdByUid, "RELATIONSHIP_INVALID"),
    createdAt,
    updatedAt,
  };
};

export const normalizeFamilyPersonLink = (
  data: Record<string, unknown>,
  uid: string,
  familyId: string,
): FamilyPersonLink => {
  const storedFamilyId = requiredString(data.familyId, "PERSON_INVALID_DATA");
  const storedUid = requiredString(data.uid, "PERSON_INVALID_DATA");
  if (storedFamilyId !== familyId || storedUid !== uid) throw new AppError("PERSON_INVALID_DATA", "PERSON");

  return {
    familyId: storedFamilyId,
    uid: storedUid,
    personId: assertPersonId(data.personId),
    createdByUid: requiredString(data.createdByUid, "PERSON_INVALID_DATA"),
    createdAt: assertIsoAuditTime(data.createdAt),
    updatedAt: assertIsoAuditTime(data.updatedAt),
  };
};

export const wouldCreateParentCycle = (
  parentId: string,
  childId: string,
  relationships: readonly FamilyRelationship[],
): boolean => {
  if (parentId === childId) return true;

  const childrenByParent = new Map<string, string[]>();
  for (const relationship of relationships) {
    if (relationship.type !== "parent_child") continue;
    const children = childrenByParent.get(relationship.personAId) ?? [];
    children.push(relationship.personBId);
    childrenByParent.set(relationship.personAId, children);
  }

  const queue = [childId];
  const visited = new Set<string>();
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current === parentId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const child of childrenByParent.get(current) ?? []) queue.push(child);
  }
  return false;
};

export const getIncidentRelationships = (
  personId: string,
  relationships: readonly FamilyRelationship[],
): FamilyRelationship[] => relationships.filter(
  (relationship) => relationship.personAId === personId || relationship.personBId === personId,
);

export type ParentChildBatchPlan = {
  requestedCount: number;
  newEdges: Array<{ id: string; parentId: string; childId: string }>;
  existingRelationshipIds: string[];
};

/**
 * DG-11 pure planner. Expands N parents × M children into canonical edges.
 * Existing edges with the same subtype are idempotent; an existing edge with
 * a different subtype is intentionally rejected so the Admin never believes
 * a biological/adoptive/step classification was silently changed.
 */
export const planParentChildRelationshipBatch = (
  parentIdsInput: readonly string[],
  childIdsInput: readonly string[],
  subtype: ParentChildSubtype,
  relationships: readonly FamilyRelationship[],
): ParentChildBatchPlan => {
  const parentIds = [...new Set(parentIdsInput.map((value) => String(value).trim()).filter(Boolean))];
  const childIds = [...new Set(childIdsInput.map((value) => String(value).trim()).filter(Boolean))];
  if (!parentIds.length || !childIds.length) throw new AppError("RELATIONSHIP_INVALID", "RELATIONSHIP");

  const existingById = new Map(relationships.map((relationship) => [relationship.id, relationship]));
  const working = [...relationships];
  const newEdges: ParentChildBatchPlan["newEdges"] = [];
  const existingRelationshipIds: string[] = [];

  for (const parentId of parentIds) {
    for (const childId of childIds) {
      if (parentId === childId) throw new AppError("RELATIONSHIP_SELF_REFERENCE", "RELATIONSHIP");
      const id = getParentChildRelationshipId(parentId, childId);
      const existing = existingById.get(id);
      if (existing) {
        if (existing.type !== "parent_child" || (existing.subtype ?? "unknown") !== subtype) {
          throw new AppError("RELATIONSHIP_DUPLICATE", "RELATIONSHIP");
        }
        existingRelationshipIds.push(id);
        continue;
      }
      if (wouldCreateParentCycle(parentId, childId, working)) {
        throw new AppError("RELATIONSHIP_PARENT_CYCLE", "RELATIONSHIP");
      }
      newEdges.push({ id, parentId, childId });
      working.push({
        id,
        familyId: "__batch_preview__",
        type: "parent_child",
        personAId: parentId,
        personBId: childId,
        subtype,
        partnerStatus: null,
        startDate: null,
        endDate: null,
        createdByUid: "__batch_preview__",
        createdAt: "1970-01-01T00:00:00.000Z",
        updatedAt: "1970-01-01T00:00:00.000Z",
      });
    }
  }

  return {
    requestedCount: parentIds.length * childIds.length,
    newEdges,
    existingRelationshipIds,
  };
};
