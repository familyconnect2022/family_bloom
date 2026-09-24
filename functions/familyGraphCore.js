const GENDERS = new Set(["male", "female", "other"]);
const LIFE_STATUSES = new Set(["living", "deceased", "unknown"]);
const PARENT_SUBTYPES = new Set(["biological", "adoptive", "step", "unknown"]);
const PARTNER_STATUSES = new Set(["partner", "married", "separated", "divorced", "widowed"]);

const fail = (code, status = 400, message = code) => {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  throw error;
};

const text = (value, max = 200) => {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return result ? result.slice(0, max) : null;
};

const requiredText = (value, code = "PERSON_INVALID_DATA", max = 120) => {
  const result = text(value, max);
  if (!result) fail(code);
  return result;
};

const pathSegment = (value, code, max = 180) => {
  const result = requiredText(value, code, max);
  if (result.includes("/")) fail(code);
  return result;
};

const cleanFamilyId = (value) => pathSegment(value, "GRAPH_FAMILY_MISMATCH", 180);
const cleanPersonId = (value) => pathSegment(value, "PERSON_INVALID_DATA", 180);
const cleanUid = (value) => pathSegment(value, "PERSON_INVALID_DATA", 180);
const cleanRelationshipId = (value) => pathSegment(value, "RELATIONSHIP_INVALID", 400);

const dateOnly = (value, code = "PERSON_INVALID_DATA") => {
  const result = text(value, 10);
  if (!result) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) fail(code);
  const parsed = new Date(`${result}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) fail(code);
  return result;
};

const intOrNull = (value, min, max, code = "PERSON_INVALID_DATA") => {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  if (!Number.isInteger(result) || result < min || result > max) fail(code);
  return result;
};

const getPartnerRelationshipId = (a, b) => {
  const ids = [cleanPersonId(a), cleanPersonId(b)].sort();
  if (ids[0] === ids[1]) fail("RELATIONSHIP_SELF_REFERENCE");
  return `pt_${ids[0]}_${ids[1]}`;
};

const getParentChildRelationshipId = (parentId, childId) => {
  const parent = cleanPersonId(parentId);
  const child = cleanPersonId(childId);
  if (parent === child) fail("RELATIONSHIP_SELF_REFERENCE");
  return `pc_${parent}_${child}`;
};

const normalizePersonInput = (input = {}) => {
  const gender = requiredText(input.gender, "PERSON_INVALID_DATA", 20);
  if (!GENDERS.has(gender)) fail("PERSON_INVALID_DATA");
  const birthDate = dateOnly(input.birthDate);
  const deathDate = dateOnly(input.deathDate);
  const currentYear = new Date().getUTCFullYear();
  const birthYear = intOrNull(input.birthYear, 1800, currentYear);
  const deathYear = intOrNull(input.deathYear, 1800, currentYear);
  const resolvedBirthYear = birthDate ? Number(birthDate.slice(0, 4)) : birthYear;
  const resolvedDeathYear = deathDate ? Number(deathDate.slice(0, 4)) : deathYear;
  const lifeStatus = text(input.lifeStatus, 20) || (resolvedDeathYear ? "deceased" : "unknown");
  if (!LIFE_STATUSES.has(lifeStatus)) fail("PERSON_INVALID_DATA");
  const birthOrder = intOrNull(input.birthOrder, 1, 99);
  if (lifeStatus === "living" && (deathDate || resolvedDeathYear)) fail("PERSON_INVALID_DATA");
  if ((deathDate || resolvedDeathYear) && lifeStatus !== "deceased") fail("PERSON_INVALID_DATA");
  if (birthDate && birthYear && Number(birthDate.slice(0, 4)) !== birthYear) fail("PERSON_INVALID_DATA");
  if (deathDate && deathYear && Number(deathDate.slice(0, 4)) !== deathYear) fail("PERSON_INVALID_DATA");
  if (resolvedBirthYear && resolvedDeathYear && resolvedDeathYear < resolvedBirthYear) fail("PERSON_INVALID_DATA");
  if (birthDate && deathDate && deathDate < birthDate) fail("PERSON_INVALID_DATA");
  return {
    displayName: requiredText(input.displayName, "PERSON_INVALID_DATA", 120),
    gender,
    nickname: text(input.nickname, 80),
    birthDate,
    birthYear: resolvedBirthYear,
    birthPlace: text(input.birthPlace, 160),
    deathDate,
    deathYear: resolvedDeathYear,
    lifeStatus: (deathDate || resolvedDeathYear) ? "deceased" : lifeStatus,
    birthOrder,
    avatarUrl: text(input.avatarUrl, 1200),
    description: text(input.description, 2500),
  };
};

const wouldCreateCycle = (parentId, childId, relationships) => {
  if (parentId === childId) return true;
  const childrenByParent = new Map();
  for (const item of relationships) {
    if (item.type !== "parent_child") continue;
    const list = childrenByParent.get(item.personAId) || [];
    list.push(item.personBId);
    childrenByParent.set(item.personAId, list);
  }
  const queue = [childId];
  const seen = new Set();
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current === parentId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const child of childrenByParent.get(current) || []) queue.push(child);
  }
  return false;
};

module.exports = {
  GENDERS,
  LIFE_STATUSES,
  PARENT_SUBTYPES,
  PARTNER_STATUSES,
  fail,
  text,
  requiredText,
  cleanFamilyId,
  cleanPersonId,
  cleanUid,
  cleanRelationshipId,
  dateOnly,
  intOrNull,
  getPartnerRelationshipId,
  getParentChildRelationshipId,
  normalizePersonInput,
  wouldCreateCycle,
};
