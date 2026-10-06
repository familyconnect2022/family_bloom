import { AppError } from "../../types/errors";
import type {
  FamilyGraphSnapshot,
  FamilyPerson,
  FamilyRelationship,
  ParentChildSubtype,
} from "../../types/familyGraph";
import type {
  FamilyGraphDerivedLineage,
  FamilyGraphParentChildLink,
  FamilyGraphPartnerLink,
  FamilyGraphFocusSubgraph,
  FamilyGraphFocusSubgraphOptions,
  FamilyGraphQueryDiagnostics,
  FamilyGraphRelationshipBetweenResult,
  FamilyGraphSiblingView,
  FamilyGraphTraversalNode,
  FamilyGraphTraversalOptions,
} from "../../types/familyGraphQuery";
import {
  APP_CONFIG_DEFAULTS,
  DEFAULT_FAMILY_GRAPH_QUERY_CONFIG,
  resolveFamilyGraphQueryConfig,
  type FamilyGraphQueryRuntimeConfig,
} from "../../constants/appConfiguration";

type ParentChildRelationship = FamilyRelationship & { type: "parent_child" };
type PartnerRelationship = FamilyRelationship & { type: "partner" };

type TraversalDirection = "ancestors" | "descendants";

const isParentChild = (relationship: FamilyRelationship): relationship is ParentChildRelationship =>
  relationship.type === "parent_child";

const isPartner = (relationship: FamilyRelationship): relationship is PartnerRelationship =>
  relationship.type === "partner";

/**
 * Step parent edges are direct social relationships, but Phase 6.3 DG-5 forbids
 * using them as ancestry/blood evidence. Direct getParents/getChildren still
 * returns them; derived ancestry/sibling/cousin traversal excludes them.
 */
const isKinshipTraversalEdge = (relationship: ParentChildRelationship): boolean =>
  relationship.subtype !== "step";

const subtypeOf = (relationship: ParentChildRelationship): ParentChildSubtype =>
  relationship.subtype ?? "unknown";

const lineageFromSubtypes = (subtypes: readonly ParentChildSubtype[]): FamilyGraphDerivedLineage => {
  if (subtypes.length === 0) return "unknown";
  if (subtypes.some((subtype) => subtype === "unknown" || subtype === "step")) return "unknown";

  const hasBiological = subtypes.includes("biological");
  const hasAdoptive = subtypes.includes("adoptive");
  if (hasBiological && hasAdoptive) return "mixed";
  if (hasAdoptive) return "adoptive";
  return "biological";
};

const mergeLineage = (
  current: FamilyGraphDerivedLineage,
  nextSubtype: ParentChildSubtype,
): FamilyGraphDerivedLineage => {
  if (nextSubtype === "unknown" || nextSubtype === "step" || current === "unknown") return "unknown";
  if (current === "mixed") return "mixed";
  if (current === "biological" && nextSubtype === "biological") return "biological";
  if (current === "adoptive" && nextSubtype === "adoptive") return "adoptive";
  return "mixed";
};

const firstHopLineage = (subtype: ParentChildSubtype): FamilyGraphDerivedLineage => {
  if (subtype === "biological") return "biological";
  if (subtype === "adoptive") return "adoptive";
  return "unknown";
};

const mergeDerivedLineage = (
  left: FamilyGraphDerivedLineage,
  right: FamilyGraphDerivedLineage,
): FamilyGraphDerivedLineage => {
  if (left === "unknown" || right === "unknown") return "unknown";
  if (left === "mixed" || right === "mixed") return "mixed";
  return left === right ? left : "mixed";
};

const emptyRelationshipResult = (
  sourcePerson: FamilyPerson,
  targetPerson: FamilyPerson,
): FamilyGraphRelationshipBetweenResult => ({
  sourcePerson,
  targetPerson,
  kind: "unrelated",
  evidenceKind: "none",
  lineage: "unknown",
  generationDistance: 0,
  pathPersonIds: [sourcePerson.id, targetPerson.id],
  pathRelationshipIds: [],
  directSubtype: null,
  partnerStatus: null,
  sharedParentIds: [],
  viaPersonId: null,
});

const personSortValue = (person: FamilyPerson): [number, string, number, string, string] => {
  const birthOrder = person.birthOrder ?? Number.MAX_SAFE_INTEGER;
  const birthDate = person.birthDate ?? "9999-12-31";
  const birthYear = person.birthYear ?? Number.MAX_SAFE_INTEGER;
  return [birthOrder, birthDate, birthYear, person.displayName.trim().toLocaleLowerCase("vi"), person.id];
};

const comparePersons = (left: FamilyPerson, right: FamilyPerson): number => {
  const a = personSortValue(left);
  const b = personSortValue(right);

  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1].localeCompare(b[1]);
  if (a[2] !== b[2]) return a[2] - b[2];
  const nameCompare = a[3].localeCompare(b[3], "vi");
  return nameCompare !== 0 ? nameCompare : a[4].localeCompare(b[4]);
};

const uniqueSortedPersons = (persons: Iterable<FamilyPerson>): FamilyPerson[] => {
  const byId = new Map<string, FamilyPerson>();
  for (const person of persons) byId.set(person.id, person);
  return [...byId.values()].sort(comparePersons);
};

const relationshipSort = (left: FamilyRelationship, right: FamilyRelationship): number =>
  left.id.localeCompare(right.id);

const sanitizeDepth = (value: number | undefined, fallback: number): number =>
  Number.isInteger(value) && (value ?? -1) >= 0 ? (value as number) : fallback;

const sanitizeMaxPeople = (value: number | undefined, fallback: number): number =>
  Number.isInteger(value) && (value ?? 0) > 0 ? (value as number) : fallback;

/**
 * Phase 6.3A read-only query/index engine.
 *
 * - consumes an already-loaded FamilyGraphSnapshot;
 * - never writes Firestore;
 * - never mutates Person/Relationship data;
 * - never opens listeners;
 * - keeps all derived indexes in memory for O(1)-ish neighborhood lookup;
 * - skips invalid/dangling relationships defensively and exposes diagnostics.
 */
export class FamilyGraphQueryEngine {
  readonly familyId: string;
  readonly config: FamilyGraphQueryRuntimeConfig;

  private readonly personsById = new Map<string, FamilyPerson>();
  private readonly parentEdgesByChild = new Map<string, ParentChildRelationship[]>();
  private readonly childEdgesByParent = new Map<string, ParentChildRelationship[]>();
  private readonly partnerEdgesByPerson = new Map<string, PartnerRelationship[]>();
  private readonly relationshipsById = new Map<string, FamilyRelationship>();
  private readonly skippedRelationshipIds: string[] = [];
  private readonly sourceRelationshipCount: number;

  constructor(
    snapshot: FamilyGraphSnapshot,
    configOverrides?: Partial<FamilyGraphQueryRuntimeConfig> | null,
  ) {
    const familyId = snapshot.familyId.trim();
    if (!familyId) throw new AppError("GRAPH_FAMILY_MISMATCH", "GRAPH");

    this.familyId = familyId;
    this.config = resolveFamilyGraphQueryConfig(configOverrides);
    this.sourceRelationshipCount = snapshot.relationships.length;

    for (const person of snapshot.persons) {
      if (person.familyId !== familyId) throw new AppError("GRAPH_FAMILY_MISMATCH", "GRAPH");
      this.personsById.set(person.id, person);
    }

    for (const relationship of snapshot.relationships) {
      if (
        relationship.familyId !== familyId
        || !this.personsById.has(relationship.personAId)
        || !this.personsById.has(relationship.personBId)
      ) {
        this.skippedRelationshipIds.push(relationship.id);
        continue;
      }

      this.relationshipsById.set(relationship.id, relationship);
      if (isParentChild(relationship)) {
        const byChild = this.parentEdgesByChild.get(relationship.personBId) ?? [];
        byChild.push(relationship);
        this.parentEdgesByChild.set(relationship.personBId, byChild);

        const byParent = this.childEdgesByParent.get(relationship.personAId) ?? [];
        byParent.push(relationship);
        this.childEdgesByParent.set(relationship.personAId, byParent);
      } else if (isPartner(relationship)) {
        const forA = this.partnerEdgesByPerson.get(relationship.personAId) ?? [];
        forA.push(relationship);
        this.partnerEdgesByPerson.set(relationship.personAId, forA);

        const forB = this.partnerEdgesByPerson.get(relationship.personBId) ?? [];
        forB.push(relationship);
        this.partnerEdgesByPerson.set(relationship.personBId, forB);
      }
    }

    for (const edges of this.parentEdgesByChild.values()) edges.sort(relationshipSort);
    for (const edges of this.childEdgesByParent.values()) edges.sort(relationshipSort);
    for (const edges of this.partnerEdgesByPerson.values()) edges.sort(relationshipSort);
    this.skippedRelationshipIds.sort();
  }

  getDiagnostics(): FamilyGraphQueryDiagnostics {
    return {
      personCount: this.personsById.size,
      relationshipCount: this.sourceRelationshipCount,
      indexedRelationshipCount: this.relationshipsById.size,
      skippedRelationshipIds: [...this.skippedRelationshipIds],
    };
  }

  getPerson(personId: string): FamilyPerson | null {
    return this.personsById.get(personId) ?? null;
  }

  hasPerson(personId: string): boolean {
    return this.personsById.has(personId);
  }

  getParentLinks(personId: string): FamilyGraphParentChildLink[] {
    const links: FamilyGraphParentChildLink[] = [];
    for (const relationship of this.parentEdgesByChild.get(personId) ?? []) {
      const person = this.personsById.get(relationship.personAId);
      if (!person) continue;
      links.push({ person, relationship, subtype: subtypeOf(relationship) });
    }
    return links.sort((left, right) => comparePersons(left.person, right.person));
  }

  getParents(personId: string): FamilyPerson[] {
    return this.getParentLinks(personId).map((link) => link.person);
  }

  getChildLinks(personId: string): FamilyGraphParentChildLink[] {
    const links: FamilyGraphParentChildLink[] = [];
    for (const relationship of this.childEdgesByParent.get(personId) ?? []) {
      const person = this.personsById.get(relationship.personBId);
      if (!person) continue;
      links.push({ person, relationship, subtype: subtypeOf(relationship) });
    }
    return links.sort((left, right) => comparePersons(left.person, right.person));
  }

  getChildren(personId: string): FamilyPerson[] {
    return this.getChildLinks(personId).map((link) => link.person);
  }

  getPartnerLinks(personId: string): FamilyGraphPartnerLink[] {
    const links: FamilyGraphPartnerLink[] = [];
    for (const relationship of this.partnerEdgesByPerson.get(personId) ?? []) {
      const partnerId = relationship.personAId === personId
        ? relationship.personBId
        : relationship.personAId;
      const person = this.personsById.get(partnerId);
      if (!person) continue;
      links.push({ person, relationship });
    }
    return links.sort((left, right) => comparePersons(left.person, right.person));
  }

  getPartners(personId: string): FamilyPerson[] {
    return this.getPartnerLinks(personId).map((link) => link.person);
  }

  /** Parent links allowed to participate in inferred ancestry/kinship traversal. */
  private getKinshipParentLinks(personId: string): FamilyGraphParentChildLink[] {
    return this.getParentLinks(personId).filter((link) => isKinshipTraversalEdge(link.relationship));
  }

  /** Child links allowed to participate in inferred ancestry/kinship traversal. */
  private getKinshipChildLinks(personId: string): FamilyGraphParentChildLink[] {
    return this.getChildLinks(personId).filter((link) => isKinshipTraversalEdge(link.relationship));
  }

  getSiblingViews(personId: string): FamilyGraphSiblingView[] {
    const targetParents = this.getKinshipParentLinks(personId);
    if (targetParents.length === 0) return [];

    const evidenceBySibling = new Map<string, FamilyGraphSiblingView>();

    for (const targetParent of targetParents) {
      const siblingCandidates = this.getKinshipChildLinks(targetParent.person.id);
      for (const candidate of siblingCandidates) {
        if (candidate.person.id === personId) continue;

        const existing = evidenceBySibling.get(candidate.person.id) ?? {
          person: candidate.person,
          sharedParentIds: [],
          sharedParentEvidence: [],
          lineage: "unknown" as FamilyGraphDerivedLineage,
        };

        if (!existing.sharedParentIds.includes(targetParent.person.id)) {
          existing.sharedParentIds.push(targetParent.person.id);
          existing.sharedParentEvidence.push({
            parentId: targetParent.person.id,
            sourceSubtype: targetParent.subtype,
            targetSubtype: candidate.subtype,
            sourceRelationshipId: targetParent.relationship.id,
            targetRelationshipId: candidate.relationship.id,
          });
        }

        evidenceBySibling.set(candidate.person.id, existing);
      }
    }

    const result = [...evidenceBySibling.values()];
    for (const item of result) {
      item.sharedParentIds.sort();
      item.sharedParentEvidence.sort((a, b) => a.parentId.localeCompare(b.parentId));
      item.lineage = lineageFromSubtypes(
        item.sharedParentEvidence.flatMap((evidence) => [evidence.sourceSubtype, evidence.targetSubtype]),
      );
    }

    return result.sort((left, right) => comparePersons(left.person, right.person));
  }

  getSiblings(personId: string): FamilyPerson[] {
    return this.getSiblingViews(personId).map((view) => view.person);
  }

  getGrandparents(personId: string): FamilyPerson[] {
    const result: FamilyPerson[] = [];
    for (const parent of this.getKinshipParentLinks(personId)) {
      for (const grandparent of this.getKinshipParentLinks(parent.person.id)) result.push(grandparent.person);
    }
    return uniqueSortedPersons(result);
  }

  getGrandchildren(personId: string): FamilyPerson[] {
    const result: FamilyPerson[] = [];
    for (const child of this.getKinshipChildLinks(personId)) {
      for (const grandchild of this.getKinshipChildLinks(child.person.id)) result.push(grandchild.person);
    }
    return uniqueSortedPersons(result);
  }

  getAuntsAndUncles(personId: string): FamilyPerson[] {
    const result: FamilyPerson[] = [];
    for (const parent of this.getKinshipParentLinks(personId)) {
      for (const sibling of this.getSiblings(parent.person.id)) result.push(sibling);
    }
    return uniqueSortedPersons(result);
  }

  /** First cousins derived through a non-step parent -> parent sibling -> child path. */
  getCousins(personId: string, maxPeople = this.config.maxPeople): FamilyPerson[] {
    const safeMax = sanitizeMaxPeople(maxPeople, this.config.maxPeople);
    const excludedIds = new Set<string>([
      personId,
      ...this.getSiblings(personId).map((person) => person.id),
    ]);
    const result = new Map<string, FamilyPerson>();

    for (const auntOrUncle of this.getAuntsAndUncles(personId)) {
      for (const child of this.getKinshipChildLinks(auntOrUncle.id)) {
        if (excludedIds.has(child.person.id)) continue;
        result.set(child.person.id, child.person);
        if (result.size >= safeMax) return uniqueSortedPersons(result.values()).slice(0, safeMax);
      }
    }

    return uniqueSortedPersons(result.values()).slice(0, safeMax);
  }

  getAncestorViews(personId: string, options?: FamilyGraphTraversalOptions): FamilyGraphTraversalNode[] {
    return this.traverse(personId, "ancestors", options);
  }

  getAncestors(personId: string, options?: FamilyGraphTraversalOptions): FamilyPerson[] {
    return this.getAncestorViews(personId, options).map((item) => item.person);
  }

  getDescendantViews(personId: string, options?: FamilyGraphTraversalOptions): FamilyGraphTraversalNode[] {
    return this.traverse(personId, "descendants", options);
  }

  getDescendants(personId: string, options?: FamilyGraphTraversalOptions): FamilyPerson[] {
    return this.getDescendantViews(personId, options).map((item) => item.person);
  }

  /**
   * DG-4 direction is fixed: getRelationshipBetween(A, B) means "A là gì của B".
   * The result is language-neutral evidence. Vietnamese wording is resolved separately.
   */
  getRelationshipBetween(
    sourcePersonId: string,
    targetPersonId: string,
  ): FamilyGraphRelationshipBetweenResult | null {
    const sourcePerson = this.getPerson(sourcePersonId);
    const targetPerson = this.getPerson(targetPersonId);
    if (!sourcePerson || !targetPerson) return null;

    if (sourcePersonId === targetPersonId) {
      return {
        ...emptyRelationshipResult(sourcePerson, targetPerson),
        kind: "self",
        evidenceKind: "direct",
        pathPersonIds: [sourcePersonId],
      };
    }

    const partner = this.getPartnerLinks(targetPersonId).find((link) => link.person.id === sourcePersonId);
    if (partner) {
      return {
        ...emptyRelationshipResult(sourcePerson, targetPerson),
        kind: "partner",
        evidenceKind: "direct",
        pathPersonIds: [sourcePersonId, targetPersonId],
        pathRelationshipIds: [partner.relationship.id],
        partnerStatus: partner.relationship.partnerStatus,
      };
    }

    // A is parent of B. Direct step remains a valid direct social relationship.
    const sourceAsParent = this.getParentLinks(targetPersonId).find((link) => link.person.id === sourcePersonId);
    if (sourceAsParent) {
      return {
        ...emptyRelationshipResult(sourcePerson, targetPerson),
        kind: "parent",
        evidenceKind: "direct",
        lineage: firstHopLineage(sourceAsParent.subtype),
        generationDistance: -1,
        pathPersonIds: [sourcePersonId, targetPersonId],
        pathRelationshipIds: [sourceAsParent.relationship.id],
        directSubtype: sourceAsParent.subtype,
      };
    }

    // A is child of B.
    const sourceAsChild = this.getChildLinks(targetPersonId).find((link) => link.person.id === sourcePersonId);
    if (sourceAsChild) {
      return {
        ...emptyRelationshipResult(sourcePerson, targetPerson),
        kind: "child",
        evidenceKind: "direct",
        lineage: firstHopLineage(sourceAsChild.subtype),
        generationDistance: 1,
        pathPersonIds: [sourcePersonId, targetPersonId],
        pathRelationshipIds: [sourceAsChild.relationship.id],
        directSubtype: sourceAsChild.subtype,
      };
    }

    const sibling = this.getSiblingViews(targetPersonId).find((view) => view.person.id === sourcePersonId);
    if (sibling) {
      const evidence = sibling.sharedParentEvidence[0];
      return {
        ...emptyRelationshipResult(sourcePerson, targetPerson),
        kind: "sibling",
        evidenceKind: "derived",
        lineage: sibling.lineage,
        pathPersonIds: evidence ? [sourcePersonId, evidence.parentId, targetPersonId] : [sourcePersonId, targetPersonId],
        pathRelationshipIds: evidence
          ? [evidence.targetRelationshipId, evidence.sourceRelationshipId]
          : [],
        sharedParentIds: [...sibling.sharedParentIds],
        viaPersonId: evidence?.parentId ?? null,
      };
    }

    // A is an ancestor of B. Traversal starts at B and walks upward.
    const sourceAsAncestor = this.getAncestorViews(targetPersonId, {
      depth: Math.max(this.personsById.size, this.config.defaultTraversalDepth),
      maxPeople: this.config.maxPeople,
    }).find((view) => view.person.id === sourcePersonId);
    if (sourceAsAncestor) {
      return {
        ...emptyRelationshipResult(sourcePerson, targetPerson),
        kind: sourceAsAncestor.depth === 2 ? "grandparent" : "ancestor",
        evidenceKind: "derived",
        lineage: sourceAsAncestor.lineage,
        generationDistance: -sourceAsAncestor.depth,
        pathPersonIds: [...sourceAsAncestor.pathPersonIds].reverse(),
        pathRelationshipIds: [...sourceAsAncestor.pathRelationshipIds].reverse(),
        viaPersonId: sourceAsAncestor.depth >= 2
          ? sourceAsAncestor.pathPersonIds[sourceAsAncestor.pathPersonIds.length - 2] ?? null
          : null,
      };
    }

    // A is a descendant of B. Traversal starts at B and walks downward.
    const sourceAsDescendant = this.getDescendantViews(targetPersonId, {
      depth: Math.max(this.personsById.size, this.config.defaultTraversalDepth),
      maxPeople: this.config.maxPeople,
    }).find((view) => view.person.id === sourcePersonId);
    if (sourceAsDescendant) {
      return {
        ...emptyRelationshipResult(sourcePerson, targetPerson),
        kind: sourceAsDescendant.depth === 2 ? "grandchild" : "descendant",
        evidenceKind: "derived",
        lineage: sourceAsDescendant.lineage,
        generationDistance: sourceAsDescendant.depth,
        pathPersonIds: [...sourceAsDescendant.pathPersonIds].reverse(),
        pathRelationshipIds: [...sourceAsDescendant.pathRelationshipIds].reverse(),
        viaPersonId: sourceAsDescendant.depth >= 2
          ? sourceAsDescendant.pathPersonIds[sourceAsDescendant.pathPersonIds.length - 2] ?? null
          : null,
      };
    }

    // A is aunt/uncle of B: A is sibling of one of B's non-step parents.
    for (const targetParent of this.getKinshipParentLinks(targetPersonId)) {
      const siblingOfParent = this.getSiblingViews(targetParent.person.id)
        .find((view) => view.person.id === sourcePersonId);
      if (!siblingOfParent) continue;
      const sharedEvidence = siblingOfParent.sharedParentEvidence[0];
      const lineage = mergeDerivedLineage(
        firstHopLineage(targetParent.subtype),
        siblingOfParent.lineage,
      );
      return {
        ...emptyRelationshipResult(sourcePerson, targetPerson),
        kind: "aunt_uncle",
        evidenceKind: "derived",
        lineage,
        generationDistance: -1,
        pathPersonIds: sharedEvidence
          ? [sourcePersonId, sharedEvidence.parentId, targetParent.person.id, targetPersonId]
          : [sourcePersonId, targetParent.person.id, targetPersonId],
        pathRelationshipIds: sharedEvidence
          ? [
            sharedEvidence.targetRelationshipId,
            sharedEvidence.sourceRelationshipId,
            targetParent.relationship.id,
          ]
          : [targetParent.relationship.id],
        sharedParentIds: [...siblingOfParent.sharedParentIds],
        viaPersonId: targetParent.person.id,
      };
    }

    // A is niece/nephew of B: one of A's parents is a sibling of B.
    for (const sourceParent of this.getKinshipParentLinks(sourcePersonId)) {
      const siblingOfTarget = this.getSiblingViews(targetPersonId)
        .find((view) => view.person.id === sourceParent.person.id);
      if (!siblingOfTarget) continue;
      const sharedEvidence = siblingOfTarget.sharedParentEvidence[0];
      const lineage = mergeDerivedLineage(
        firstHopLineage(sourceParent.subtype),
        siblingOfTarget.lineage,
      );
      return {
        ...emptyRelationshipResult(sourcePerson, targetPerson),
        kind: "niece_nephew",
        evidenceKind: "derived",
        lineage,
        generationDistance: 1,
        pathPersonIds: sharedEvidence
          ? [sourcePersonId, sourceParent.person.id, sharedEvidence.parentId, targetPersonId]
          : [sourcePersonId, sourceParent.person.id, targetPersonId],
        pathRelationshipIds: sharedEvidence
          ? [
            sourceParent.relationship.id,
            sharedEvidence.targetRelationshipId,
            sharedEvidence.sourceRelationshipId,
          ]
          : [sourceParent.relationship.id],
        sharedParentIds: [...siblingOfTarget.sharedParentIds],
        viaPersonId: sourceParent.person.id,
      };
    }

    // First cousin: a parent of A and a parent of B are siblings.
    for (const sourceParent of this.getKinshipParentLinks(sourcePersonId)) {
      for (const targetParent of this.getKinshipParentLinks(targetPersonId)) {
        const parentSibling = this.getSiblingViews(targetParent.person.id)
          .find((view) => view.person.id === sourceParent.person.id);
        if (!parentSibling) continue;
        const sharedEvidence = parentSibling.sharedParentEvidence[0];
        const lineage = mergeDerivedLineage(
          mergeDerivedLineage(firstHopLineage(sourceParent.subtype), firstHopLineage(targetParent.subtype)),
          parentSibling.lineage,
        );
        return {
          ...emptyRelationshipResult(sourcePerson, targetPerson),
          kind: "cousin",
          evidenceKind: "derived",
          lineage,
          generationDistance: 0,
          pathPersonIds: sharedEvidence
            ? [
              sourcePersonId,
              sourceParent.person.id,
              sharedEvidence.parentId,
              targetParent.person.id,
              targetPersonId,
            ]
            : [sourcePersonId, sourceParent.person.id, targetParent.person.id, targetPersonId],
          pathRelationshipIds: sharedEvidence
            ? [
              sourceParent.relationship.id,
              sharedEvidence.targetRelationshipId,
              sharedEvidence.sourceRelationshipId,
              targetParent.relationship.id,
            ]
            : [sourceParent.relationship.id, targetParent.relationship.id],
          sharedParentIds: [...parentSibling.sharedParentIds],
          viaPersonId: sharedEvidence?.parentId ?? null,
        };
      }
    }

    return emptyRelationshipResult(sourcePerson, targetPerson);
  }

  /**
   * Read-only bounded focus subgraph. It derives a render snapshot from the source
   * snapshot and never rewrites Firestore. The cap comes from centralized config.
   */
  getFocusSubgraph(
    focusPersonId: string,
    options?: FamilyGraphFocusSubgraphOptions,
  ): FamilyGraphFocusSubgraph | null {
    if (!this.personsById.has(focusPersonId)) return null;

    const defaults = APP_CONFIG_DEFAULTS.familyGraph.focusSubgraph;
    const ancestorDepth = sanitizeDepth(options?.ancestorDepth, defaults.ancestorDepth);
    const descendantDepth = sanitizeDepth(options?.descendantDepth, defaults.descendantDepth);
    const includePartners = options?.includePartners ?? defaults.includePartners;
    const includeSiblings = options?.includeSiblings ?? defaults.includeSiblings;
    const includeCousins = options?.includeCousins ?? defaults.includeCousins;
    const maxPeople = sanitizeMaxPeople(options?.maxPeople, defaults.maxPeople);

    const selectedIds = new Set<string>();
    let truncated = false;
    const addPerson = (personId: string) => {
      if (selectedIds.has(personId)) return true;
      if (!this.personsById.has(personId)) return true;
      if (selectedIds.size >= maxPeople) {
        truncated = true;
        return false;
      }
      selectedIds.add(personId);
      return true;
    };

    addPerson(focusPersonId);

    const ancestors = this.getAncestorViews(focusPersonId, { depth: ancestorDepth, maxPeople });
    for (const item of ancestors) if (!addPerson(item.person.id)) break;

    const descendants = this.getDescendantViews(focusPersonId, { depth: descendantDepth, maxPeople });
    for (const item of descendants) if (!addPerson(item.person.id)) break;

    if (includeSiblings) {
      for (const sibling of this.getSiblings(focusPersonId)) if (!addPerson(sibling.id)) break;
    }

    if (includeCousins) {
      for (const cousin of this.getCousins(focusPersonId, maxPeople)) if (!addPerson(cousin.id)) break;
    }

    if (includePartners) {
      // Include partners of every already-selected person. Snapshot the IDs first so
      // newly-added partners do not recursively expand partner-of-partner chains.
      for (const personId of [...selectedIds]) {
        for (const partner of this.getPartners(personId)) if (!addPerson(partner.id)) break;
        if (selectedIds.size >= maxPeople) break;
      }
    }

    const persons = uniqueSortedPersons(
      [...selectedIds].map((id) => this.personsById.get(id)).filter((item): item is FamilyPerson => !!item),
    );
    const personIdSet = new Set(persons.map((person) => person.id));
    const relationships = [...this.relationshipsById.values()]
      .filter((relationship) => personIdSet.has(relationship.personAId) && personIdSet.has(relationship.personBId))
      .sort(relationshipSort);

    return {
      snapshot: { familyId: this.familyId, persons, relationships },
      focusPersonId,
      personIds: persons.map((person) => person.id),
      relationshipIds: relationships.map((relationship) => relationship.id),
      truncated,
      requestedMaxPeople: maxPeople,
    };
  }

  private traverse(
    startPersonId: string,
    direction: TraversalDirection,
    options?: FamilyGraphTraversalOptions,
  ): FamilyGraphTraversalNode[] {
    if (!this.personsById.has(startPersonId)) return [];

    const maxDepth = sanitizeDepth(options?.depth, this.config.defaultTraversalDepth);
    const maxPeople = sanitizeMaxPeople(options?.maxPeople, this.config.maxPeople);
    if (maxDepth === 0 || maxPeople === 0) return [];

    type QueueItem = {
      personId: string;
      depth: number;
      pathPersonIds: string[];
      pathRelationshipIds: string[];
      lineage: FamilyGraphDerivedLineage;
    };

    const queue: QueueItem[] = [{
      personId: startPersonId,
      depth: 0,
      pathPersonIds: [startPersonId],
      pathRelationshipIds: [],
      lineage: "unknown",
    }];
    const bestDepthByPerson = new Map<string, number>([[startPersonId, 0]]);
    const result = new Map<string, FamilyGraphTraversalNode>();

    for (let index = 0; index < queue.length && result.size < maxPeople; index += 1) {
      const current = queue[index];
      if (current.depth >= maxDepth) continue;

      const links = direction === "ancestors"
        ? this.getKinshipParentLinks(current.personId)
        : this.getKinshipChildLinks(current.personId);

      for (const link of links) {
        const nextDepth = current.depth + 1;
        const previousBestDepth = bestDepthByPerson.get(link.person.id);
        if (previousBestDepth !== undefined && previousBestDepth <= nextDepth) continue;

        const nextLineage = current.depth === 0
          ? firstHopLineage(link.subtype)
          : mergeLineage(current.lineage, link.subtype);
        const nextNode: FamilyGraphTraversalNode = {
          person: link.person,
          depth: nextDepth,
          pathPersonIds: [...current.pathPersonIds, link.person.id],
          pathRelationshipIds: [...current.pathRelationshipIds, link.relationship.id],
          lineage: nextLineage,
        };

        bestDepthByPerson.set(link.person.id, nextDepth);
        result.set(link.person.id, nextNode);
        queue.push({
          personId: link.person.id,
          depth: nextDepth,
          pathPersonIds: nextNode.pathPersonIds,
          pathRelationshipIds: nextNode.pathRelationshipIds,
          lineage: nextLineage,
        });

        if (result.size >= maxPeople) break;
      }
    }

    return [...result.values()].sort((left, right) => {
      if (left.depth !== right.depth) return left.depth - right.depth;
      return comparePersons(left.person, right.person);
    });
  }
}

export const createFamilyGraphQueryEngine = (
  snapshot: FamilyGraphSnapshot,
  configOverrides: Partial<FamilyGraphQueryRuntimeConfig> | null = null,
): FamilyGraphQueryEngine => new FamilyGraphQueryEngine(
  snapshot,
  configOverrides ?? DEFAULT_FAMILY_GRAPH_QUERY_CONFIG,
);
