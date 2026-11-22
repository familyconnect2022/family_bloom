import type { FamilyRelationship } from '../../types/familyGraph';

/** A single currently effective marriage by default. Historical multi-marriage
 * exceptions require separate trusted review; this client never auto-overrides.
 * 'separated' still counts as effective until the old union is resolved.
 */
export function concurrentMarriageConflict(
  relationships: readonly FamilyRelationship[],
  personAId: string,
  personBId: string,
  excludedRelationshipId?: string,
): FamilyRelationship | null {
  return relationships.find((r) => r.type === 'partner'
    && r.id !== excludedRelationshipId
    && (r.partnerStatus === 'married' || r.partnerStatus === 'separated')
    && (r.personAId === personAId || r.personBId === personAId
      || r.personAId === personBId || r.personBId === personBId)) ?? null;
}
