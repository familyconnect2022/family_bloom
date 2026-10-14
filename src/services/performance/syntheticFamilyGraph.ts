import type { FamilyGraphSnapshot, FamilyPerson, FamilyRelationship } from "../../types/familyGraph";

const TEST_FAMILY_ID = "__perf_test_family__";
const TEST_UID = "__perf_test__";
const iso = "2026-01-01T00:00:00.000Z";

const generationCounts = (count: number) => {
  const weights = [0.05, 0.12, 0.23, 0.3, 0.3];
  const counts = weights.map((weight) => Math.max(1, Math.floor(count * weight)));
  let total = counts.reduce((sum, value) => sum + value, 0);
  while (total < count) { counts[total % counts.length] += 1; total += 1; }
  while (total > count) {
    const index = counts.findIndex((value) => value > 1);
    if (index < 0) break;
    counts[index] -= 1;
    total -= 1;
  }
  return counts;
};

export const createSyntheticFamilyGraph = (count: number): FamilyGraphSnapshot => {
  const safeCount = Math.max(2, Math.min(500, Math.floor(count)));
  const counts = generationCounts(safeCount);
  const persons: FamilyPerson[] = [];
  const generations: string[][] = [];
  let personIndex = 0;

  counts.forEach((generationCount, generationIndex) => {
    const ids: string[] = [];
    for (let index = 0; index < generationCount; index += 1) {
      const id = `perf_p_${personIndex}`;
      const gender = personIndex % 2 === 0 ? "male" : "female";
      persons.push({
        id,
        familyId: TEST_FAMILY_ID,
        linkedUid: personIndex === 0 ? TEST_UID : null,
        displayName: `Người test ${personIndex + 1}`,
        gender,
        nickname: `P${personIndex + 1}`,
        birthDate: null,
        birthYear: 1930 + generationIndex * 22 + (index % 15),
        birthPlace: null,
        deathDate: null,
        deathYear: null,
        lifeStatus: "living",
        birthOrder: (index % 6) + 1,
        avatarUrl: null,
        description: "Synthetic in-memory performance test person",
        createdByUid: TEST_UID,
        createdAt: iso,
        updatedAt: iso,
      });
      ids.push(id);
      personIndex += 1;
    }
    generations.push(ids);
  });

  const relationships: FamilyRelationship[] = [];
  const pushPartner = (a: string, b: string) => relationships.push({
    id: `perf_partner_${a}_${b}`,
    familyId: TEST_FAMILY_ID,
    type: "partner",
    personAId: a < b ? a : b,
    personBId: a < b ? b : a,
    subtype: null,
    partnerStatus: "married",
    startDate: null,
    endDate: null,
    createdByUid: TEST_UID,
    createdAt: iso,
    updatedAt: iso,
  });
  const pushParent = (parent: string, child: string) => relationships.push({
    id: `perf_pc_${parent}_${child}`,
    familyId: TEST_FAMILY_ID,
    type: "parent_child",
    personAId: parent,
    personBId: child,
    subtype: "biological",
    partnerStatus: null,
    startDate: null,
    endDate: null,
    createdByUid: TEST_UID,
    createdAt: iso,
    updatedAt: iso,
  });

  // Partner pairs keep each generation realistic enough to exercise atomic row units.
  for (const generation of generations) {
    for (let index = 0; index + 1 < generation.length; index += 2) pushPartner(generation[index], generation[index + 1]);
  }

  // Every child gets one/two deterministic parents from the previous generation.
  for (let generationIndex = 1; generationIndex < generations.length; generationIndex += 1) {
    const parents = generations[generationIndex - 1];
    const children = generations[generationIndex];
    children.forEach((child, childIndex) => {
      const parentAIndex = (childIndex * 2) % parents.length;
      const parentBIndex = parents.length > 1 ? (parentAIndex + 1) % parents.length : parentAIndex;
      pushParent(parents[parentAIndex], child);
      if (parentBIndex !== parentAIndex) pushParent(parents[parentBIndex], child);
    });
  }

  return { familyId: TEST_FAMILY_ID, persons, relationships };
};
