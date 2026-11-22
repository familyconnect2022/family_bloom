import type { FamilyPerson, FamilyRelationship, ParentChildSubtype, PartnerStatus } from "../../types/familyGraph";
import type {
  FamilyGraphDerivedLineage,
  FamilyGraphRelationshipBetweenResult,
  FamilyGraphRelativeAge,
  FamilyGraphVietnameseRelationship,
} from "../../types/familyGraphQuery";

const normalizedDate = (person: FamilyPerson): string | null => {
  if (person.birthDate && /^\d{4}-\d{2}-\d{2}$/.test(person.birthDate)) return person.birthDate;
  return null;
};

const normalizedYear = (person: FamilyPerson): number | null => {
  if (person.birthYear && Number.isInteger(person.birthYear)) return person.birthYear;
  const date = normalizedDate(person);
  if (!date) return null;
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : null;
};

/** DG-7: birthOrder -> full birthDate -> birthYear, but birthOrder is only meaningful for siblings. */
export const compareFamilyPersonAge = (
  source: FamilyPerson,
  target: FamilyPerson,
  useBirthOrder = false,
): FamilyGraphRelativeAge => {
  if (
    useBirthOrder
    && source.birthOrder != null
    && target.birthOrder != null
    && source.birthOrder !== target.birthOrder
  ) {
    return source.birthOrder < target.birthOrder ? "older" : "younger";
  }

  const sourceDate = normalizedDate(source);
  const targetDate = normalizedDate(target);
  if (sourceDate && targetDate && sourceDate !== targetDate) {
    return sourceDate < targetDate ? "older" : "younger";
  }

  const sourceYear = normalizedYear(source);
  const targetYear = normalizedYear(target);
  if (sourceYear != null && targetYear != null && sourceYear !== targetYear) {
    return sourceYear < targetYear ? "older" : "younger";
  }

  return "unknown";
};

const genderWord = (
  person: FamilyPerson,
  male: string,
  female: string,
  neutral: string,
): string => person.gender === "male" ? male : person.gender === "female" ? female : neutral;

const parentLabel = (person: FamilyPerson, subtype: ParentChildSubtype | null): string => {
  if (subtype === "biological") return genderWord(person, "cha ruột", "mẹ ruột", "cha/mẹ ruột");
  if (subtype === "adoptive") return genderWord(person, "cha nuôi", "mẹ nuôi", "cha/mẹ nuôi");
  if (subtype === "step") return genderWord(person, "cha kế", "mẹ kế", "cha/mẹ kế");
  return genderWord(person, "cha", "mẹ", "cha/mẹ");
};

const childLabel = (person: FamilyPerson, subtype: ParentChildSubtype | null): string => {
  const base = genderWord(person, "con trai", "con gái", "con");
  if (subtype === "biological") return `${base} ruột`;
  if (subtype === "adoptive") return `${base} nuôi`;
  if (subtype === "step") return "con kế";
  return base;
};

const partnerLabel = (person: FamilyPerson, status: PartnerStatus | null): string => {
  if (status === "partner") return "bạn đời";
  if (status === "divorced") return genderWord(person, "chồng cũ", "vợ cũ", "vợ/chồng cũ");
  if (status === "separated") return genderWord(person, "chồng đang ly thân", "vợ đang ly thân", "vợ/chồng đang ly thân");
  if (status === "married" || status === "widowed") {
    return genderWord(person, "chồng", "vợ", "vợ/chồng");
  }
  return genderWord(person, "chồng/bạn đời", "vợ/bạn đời", "bạn đời");
};

const siblingLabel = (
  source: FamilyPerson,
  target: FamilyPerson,
): { label: string; relativeAge: FamilyGraphRelativeAge } => {
  const relativeAge = compareFamilyPersonAge(source, target, true);
  if (relativeAge === "older") {
    return {
      label: genderWord(source, "anh", "chị", "anh/chị"),
      relativeAge,
    };
  }
  if (relativeAge === "younger") {
    return {
      label: genderWord(source, "em trai", "em gái", "em"),
      relativeAge,
    };
  }
  return { label: "anh/chị/em", relativeAge };
};


/** Confirmed half siblings require TWO known biological parents for BOTH people. */
export const classifyDocumentedSiblingLineage = (
  sourceId: string, targetId: string,
  relationships: readonly FamilyRelationship[],
  people: ReadonlyMap<string, FamilyPerson>,
): string | null => {
  const collect = (childId: string) => [...new Set(relationships
    .filter((edge) => edge.type === 'parent_child' && edge.subtype === 'biological' && edge.personBId === childId)
    .map((edge) => edge.personAId))];
  const a = collect(sourceId), b = collect(targetId);
  if (a.length !== 2 || b.length !== 2) return null;
  const shared = a.filter((id) => b.includes(id));
  if (shared.length === 2) return 'ruột';
  if (shared.length !== 1) return null;
  const parent = people.get(shared[0]);
  if (parent?.gender === 'male') return 'cùng cha khác mẹ';
  if (parent?.gender === 'female') return 'cùng mẹ khác cha';
  return 'cùng một cha/mẹ';
};

const cousinLabel = (
  source: FamilyPerson,
  target: FamilyPerson,
): { label: string; relativeAge: FamilyGraphRelativeAge } => {
  // birthOrder is local to each sibling group, so it must not compare two cousins.
  const relativeAge = compareFamilyPersonAge(source, target, false);
  if (relativeAge === "older") {
    return { label: genderWord(source, "anh họ", "chị họ", "anh/chị họ"), relativeAge };
  }
  if (relativeAge === "younger") {
    return { label: genderWord(source, "em họ", "em họ", "em họ"), relativeAge };
  }
  return { label: "anh/chị/em họ", relativeAge };
};

const lineageSuffix = (lineage: FamilyGraphDerivedLineage): string | null => {
  if (lineage === "adoptive") return "theo nhánh nhận nuôi";
  if (lineage === "mixed") return "qua nhánh gia đình hỗn hợp";
  if (lineage === "unknown") return "dữ liệu huyết hệ chưa đủ để xác định rõ";
  return null;
};

const auntUncleLabel = (
  source: FamilyPerson,
  targetParent: FamilyPerson | null,
): { label: string; relativeAge: FamilyGraphRelativeAge } => {
  if (!targetParent) return { label: "anh/chị/em của cha/mẹ", relativeAge: "unknown" };

  const relativeAge = compareFamilyPersonAge(source, targetParent, true);
  const branch = targetParent.gender === "male"
    ? "cha"
    : targetParent.gender === "female"
      ? "mẹ"
      : "cha/mẹ";

  // DG-8: exact Vietnamese term only when branch + gender + older/younger evidence are sufficient.
  if (targetParent.gender === "male") {
    if (relativeAge === "older") return { label: "bác", relativeAge };
    if (relativeAge === "younger" && source.gender === "male") return { label: "chú", relativeAge };
    if (relativeAge === "younger" && source.gender === "female") return { label: "cô", relativeAge };
  }

  if (targetParent.gender === "female") {
    if (relativeAge === "older") return { label: "bác", relativeAge };
    if (relativeAge === "younger" && source.gender === "male") return { label: "cậu", relativeAge };
    if (relativeAge === "younger" && source.gender === "female") return { label: "dì", relativeAge };
  }

  return { label: `anh/chị/em của ${branch}`, relativeAge };
};

const relationshipDetail = (
  result: FamilyGraphRelationshipBetweenResult,
  peopleById?: ReadonlyMap<string, FamilyPerson>,
): string | null => {
  const suffix = lineageSuffix(result.lineage);
  const pathNames = peopleById
    ? result.pathPersonIds.map((id) => peopleById.get(id)?.displayName).filter(Boolean) as string[]
    : [];
  const path = pathNames.length > 2 ? `Suy luận qua: ${pathNames.join(" → ")}.` : null;
  if (suffix && path) return `${path} ${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}.`;
  if (path) return path;
  return suffix ? `${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}.` : null;
};

export const resolveVietnameseKinship = (
  result: FamilyGraphRelationshipBetweenResult,
  peopleById?: ReadonlyMap<string, FamilyPerson>,
  relationships?: readonly FamilyRelationship[],
): FamilyGraphVietnameseRelationship => {
  const source = result.sourcePerson;
  const target = result.targetPerson;
  let label = "chưa xác định quan hệ";
  let relativeAge: FamilyGraphRelativeAge = "unknown";

  switch (result.kind) {
    case "self":
      label = "chính người này";
      break;
    case "partner":
      label = partnerLabel(source, result.partnerStatus);
      break;
    case "parent":
      label = parentLabel(source, result.directSubtype);
      break;
    case "child":
      label = childLabel(source, result.directSubtype);
      break;
    case "sibling": {
      const sibling = siblingLabel(source, target);
      label = sibling.label;
      if (relationships && peopleById) {
        const detail = classifyDocumentedSiblingLineage(source.id, target.id, relationships, peopleById);
        if (detail) label = `${label} ${detail}`;
      }
      relativeAge = sibling.relativeAge;
      break;
    }
    case "grandparent": {
      const via = result.viaPersonId ? peopleById?.get(result.viaPersonId) ?? null : null;
      const base = genderWord(source, "ông", "bà", "ông/bà");
      if (via?.gender === "male") label = `${base} nội`;
      else if (via?.gender === "female") label = `${base} ngoại`;
      else label = base;
      break;
    }
    case "grandchild":
      label = genderWord(source, "cháu trai", "cháu gái", "cháu");
      break;
    case "ancestor": {
      const depth = Math.abs(result.generationDistance);
      if (depth === 3) label = genderWord(source, "cụ ông", "cụ bà", "cụ");
      else label = `tổ tiên cách ${depth} thế hệ`;
      break;
    }
    case "descendant": {
      const depth = Math.abs(result.generationDistance);
      if (depth === 3) label = genderWord(source, "chắt trai", "chắt gái", "chắt");
      else label = `hậu duệ cách ${depth} thế hệ`;
      break;
    }
    case "aunt_uncle": {
      const targetParent = result.viaPersonId ? peopleById?.get(result.viaPersonId) ?? null : null;
      const resolved = auntUncleLabel(source, targetParent);
      label = resolved.label;
      relativeAge = resolved.relativeAge;
      break;
    }
    case "niece_nephew":
      label = genderWord(source, "cháu trai", "cháu gái", "cháu");
      break;
    case "cousin": {
      const cousin = cousinLabel(source, target);
      label = cousin.label;
      relativeAge = cousin.relativeAge;
      break;
    }
    case "unrelated": {
      // A child of a CURRENT spouse is not automatically the focus person's
      // biological child. The label is contextual and never persisted.
      const spouse = relationships?.find((edge) => edge.type === "partner"
        && (edge.partnerStatus === "married" || edge.partnerStatus === "partner")
        && (edge.personAId === target.id || edge.personBId === target.id));
      const spouseId = spouse?.personAId === target.id ? spouse.personBId : spouse?.personBId === target.id ? spouse.personAId : null;
      const biologicalParentId = spouseId && relationships?.some((edge) => edge.type === "parent_child"
        && edge.subtype === "biological" && edge.personAId === spouseId && edge.personBId === source.id);
      const targetIsParent = relationships?.some((edge) => edge.type === "parent_child"
        && edge.personAId === target.id && edge.personBId === source.id);
      if (biologicalParentId && !targetIsParent) {
        const spousePerson = peopleById?.get(spouseId!);
        label = spousePerson?.gender === "male" ? "con riêng của chồng"
          : spousePerson?.gender === "female" ? "con riêng của vợ" : "con riêng của bạn đời";
      } else label = "chưa xác định quan hệ trong dữ liệu hiện có";
      break;
    }
    default:
      label = "chưa xác định quan hệ trong dữ liệu hiện có";
      break;
  }

  const sentence = result.kind === "self"
    ? `${source.displayName} chính là người đang được tham chiếu.`
    : `${source.displayName} là ${label} của ${target.displayName}.`;

  return {
    sourcePersonId: source.id,
    targetPersonId: target.id,
    kind: result.kind,
    label,
    sentence,
    detail: relationshipDetail(result, peopleById),
    lineage: result.lineage,
    relativeAge,
    pathPersonIds: [...result.pathPersonIds],
    pathRelationshipIds: [...result.pathRelationshipIds],
  };
};
