const assert = require("node:assert/strict");
const {
  cleanFamilyId,
  cleanUid,
  dateOnly,
  getParentChildRelationshipId,
  getPartnerRelationshipId,
  normalizePersonInput,
  wouldCreateCycle,
} = require("./familyGraphCore");

assert.equal(getParentChildRelationshipId("parentA", "childB"), "pc_parentA_childB");
assert.equal(getPartnerRelationshipId("z", "a"), "pt_a_z");
assert.equal(getPartnerRelationshipId("a", "z"), "pt_a_z");
assert.equal(dateOnly("2024-02-29"), "2024-02-29");
assert.throws(() => dateOnly("2023-02-29"), /PERSON_INVALID_DATA/);
assert.throws(() => cleanFamilyId("a/b"), /GRAPH_FAMILY_MISMATCH/);
assert.throws(() => cleanUid("a/b"), /PERSON_INVALID_DATA/);

const normalized = normalizePersonInput({
  displayName: "  Nguyễn Văn An  ",
  gender: "male",
  lifeStatus: "unknown",
  birthYear: 1988,
});
assert.equal(normalized.displayName, "Nguyễn Văn An");
assert.equal(normalized.birthYear, 1988);
assert.throws(
  () => normalizePersonInput({ displayName: "A", gender: "male", lifeStatus: "living", deathDate: "2020-01-01" }),
  /PERSON_INVALID_DATA/,
);

const deceased = normalizePersonInput({
  displayName: "Bà Nguyễn",
  gender: "female",
  lifeStatus: "deceased",
  birthYear: 1940,
  deathYear: 2018,
});
assert.equal(deceased.deathYear, 2018);
assert.equal(deceased.lifeStatus, "deceased");
const inferredDeceased = normalizePersonInput({ displayName: "Ông B", gender: "male", deathYear: 2005 });
assert.equal(inferredDeceased.lifeStatus, "deceased");
assert.throws(
  () => normalizePersonInput({ displayName: "A", gender: "male", lifeStatus: "deceased", birthYear: 1980, deathYear: 1979 }),
  /PERSON_INVALID_DATA/,
);

const edges = [
  { type: "parent_child", personAId: "A", personBId: "B" },
  { type: "parent_child", personAId: "B", personBId: "C" },
];
assert.equal(wouldCreateCycle("C", "A", edges), true);
assert.equal(wouldCreateCycle("A", "D", edges), false);

console.log("familyGraphCore tests: PASS");
