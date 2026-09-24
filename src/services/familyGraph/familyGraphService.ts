import type {
  FamilyGraphSnapshot,
  FamilyPerson,
  FamilyRelationship,
} from "../../types/familyGraph";
import { AppError } from "../../types/errors";
import { familyGraphRepository } from "./familyGraphRepository";
import { createFamilyGraphQueryEngine } from "./familyGraphQueryEngine";
import type { FamilyGraphQueryRuntimeConfig } from "../../constants/appConfiguration";

export type FamilyGraphUnsubscribe = () => void;

/**
 * Read-side Graph Foundation service. Mutations live in familyGraphMutationService.
 * During Direct Firestore Development Mode, Security Rules are the write boundary;
 * the adapter can later switch back to a trusted backend without changing this read side.
 */
export const familyGraphService = {
  /** Pure in-memory query engine over an already-loaded snapshot. No Firestore writes/listeners. */
  createQueryEngine(
    snapshot: FamilyGraphSnapshot,
    configOverrides?: Partial<FamilyGraphQueryRuntimeConfig> | null,
  ) {
    return createFamilyGraphQueryEngine(snapshot, configOverrides);
  },

  async listPersons(familyId: string): Promise<FamilyPerson[]> {
    return familyGraphRepository.listPersons(familyId);
  },

  async getSnapshot(familyId: string): Promise<FamilyGraphSnapshot> {
    const [persons, relationships] = await Promise.all([
      familyGraphRepository.listPersons(familyId),
      familyGraphRepository.listRelationships(familyId),
    ]);
    return { familyId, persons, relationships };
  },

  async getDefaultFocusPerson(familyId: string, uid: string): Promise<FamilyPerson | null> {
    const link = await familyGraphRepository.getPersonLink(familyId, uid);
    if (!link) return null;

    const person = await familyGraphRepository.getPerson(familyId, link.personId);
    if (!person) throw new AppError("PERSON_NOT_FOUND", "PERSON");
    if (person.familyId !== familyId || person.linkedUid !== uid) {
      throw new AppError("PERSON_INVALID_DATA", "PERSON");
    }
    return person;
  },

  /**
   * Current read transport remains the Phase 6.2 full graph listener and only lives
   * while the Graph screen subscribes. Phase 6.3 bounds DERIVED/RENDER work in memory.
   * We intentionally do not change Firestore schema/index/query transport in 6.3
   * because DG-1 requires a separate approved data decision before that migration.
   */
  watchSnapshot(
    familyId: string,
    onChange: (snapshot: FamilyGraphSnapshot) => void,
    onError?: (error: unknown) => void,
  ): FamilyGraphUnsubscribe {
    let latestPersons: FamilyPerson[] | null = null;
    let latestRelationships: FamilyRelationship[] | null = null;
    let closed = false;

    const emit = () => {
      if (closed || latestPersons === null || latestRelationships === null) return;
      onChange({ familyId, persons: latestPersons, relationships: latestRelationships });
    };

    const reportError = (error: unknown) => {
      if (!closed) onError?.(error);
    };

    const unsubscribePersons = familyGraphRepository.watchPersons(
      familyId,
      (persons) => {
        latestPersons = persons;
        emit();
      },
      reportError,
    );

    const unsubscribeRelationships = familyGraphRepository.watchRelationships(
      familyId,
      (relationships) => {
        latestRelationships = relationships;
        emit();
      },
      reportError,
    );

    return () => {
      if (closed) return;
      closed = true;
      unsubscribePersons();
      unsubscribeRelationships();
    };
  },
};
