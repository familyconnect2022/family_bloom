import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
} from "@react-native-firebase/firestore";
import type {
  FamilyPerson,
  FamilyPersonLink,
  FamilyRelationship,
} from "../../types/familyGraph";
import { AppError } from "../../types/errors";
import {
  normalizeFamilyPerson,
  normalizeFamilyPersonLink,
  normalizeFamilyRelationship,
} from "../../utils/familyGraph";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";

const assertFamilyId = (familyId: string): string => {
  const normalized = familyId.trim();
  if (!normalized || normalized.includes("/")) throw new AppError("GRAPH_FAMILY_MISMATCH", "GRAPH");
  return normalized;
};

const mapPersons = (familyId: string, docs: ReadonlyArray<{ id: string; data(): unknown }>): FamilyPerson[] =>
  docs.map((item) => normalizeFamilyPerson(item.data() as Record<string, unknown>, item.id, familyId));

const mapRelationships = (
  familyId: string,
  docs: ReadonlyArray<{ id: string; data(): unknown }>,
): FamilyRelationship[] => docs.map(
  (item) => normalizeFamilyRelationship(item.data() as Record<string, unknown>, item.id, familyId),
);

export const familyGraphRepository = {
  async listPersons(familyIdInput: string): Promise<FamilyPerson[]> {
    const familyId = assertFamilyId(familyIdInput);
    const snapshot = await getDocs(collection(getFirestore(), FIRESTORE_PATHS.familyPersons(familyId)));
    return mapPersons(familyId, snapshot.docs);
  },

  async getPerson(familyIdInput: string, personId: string): Promise<FamilyPerson | null> {
    const familyId = assertFamilyId(familyIdInput);
    const normalizedPersonId = personId.trim();
    if (!normalizedPersonId || normalizedPersonId.includes("/")) throw new AppError("PERSON_INVALID_DATA", "PERSON");

    const snapshot = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.familyPerson(familyId, normalizedPersonId)));
    return snapshot.exists()
      ? normalizeFamilyPerson(snapshot.data() as Record<string, unknown>, snapshot.id, familyId)
      : null;
  },

  async listRelationships(familyIdInput: string): Promise<FamilyRelationship[]> {
    const familyId = assertFamilyId(familyIdInput);
    const snapshot = await getDocs(collection(getFirestore(), FIRESTORE_PATHS.familyRelationships(familyId)));
    return mapRelationships(familyId, snapshot.docs);
  },

  async getPersonLink(familyIdInput: string, uidInput: string): Promise<FamilyPersonLink | null> {
    const familyId = assertFamilyId(familyIdInput);
    const uid = uidInput.trim();
    if (!uid || uid.includes("/")) throw new AppError("PERSON_INVALID_DATA", "PERSON");

    const snapshot = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.familyPersonLink(familyId, uid)));
    return snapshot.exists()
      ? normalizeFamilyPersonLink(snapshot.data() as Record<string, unknown>, uid, familyId)
      : null;
  },

  watchPersons(
    familyIdInput: string,
    onChange: (persons: FamilyPerson[]) => void,
    onError?: (error: unknown) => void,
  ) {
    const familyId = assertFamilyId(familyIdInput);
    return onSnapshot(
      collection(getFirestore(), FIRESTORE_PATHS.familyPersons(familyId)),
      (snapshot: { docs: Array<{ id: string; data(): unknown }> }) => {
        try {
          onChange(mapPersons(familyId, snapshot.docs));
        } catch (error) {
          onError?.(error);
        }
      },
      onError,
    );
  },

  watchRelationships(
    familyIdInput: string,
    onChange: (relationships: FamilyRelationship[]) => void,
    onError?: (error: unknown) => void,
  ) {
    const familyId = assertFamilyId(familyIdInput);
    return onSnapshot(
      collection(getFirestore(), FIRESTORE_PATHS.familyRelationships(familyId)),
      (snapshot: { docs: Array<{ id: string; data(): unknown }> }) => {
        try {
          onChange(mapRelationships(familyId, snapshot.docs));
        } catch (error) {
          onError?.(error);
        }
      },
      onError,
    );
  },
};
