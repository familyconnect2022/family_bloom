import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  query,
  runTransaction,
  where,
} from "@react-native-firebase/firestore";
import { getAuth } from "@react-native-firebase/auth";
import type {
  CreateFamilyPersonInput,
  CreateFamilyRelationshipInput,
  CreateParentChildRelationshipsBatchInput,
  CreateParentChildRelationshipsBatchResult,
  FamilyRelationship,
  UpdateFamilyPersonInput,
  UpdatePartnerRelationshipInput,
} from "../../types/familyGraph";
import { AppError } from "../../types/errors";
import {
  canonicalizePartnerIds,
  getParentChildRelationshipId,
  getPartnerRelationshipId,
  normalizeCreateFamilyPersonInput,
  normalizeFamilyPerson,
  normalizeFamilyRelationship,
  planParentChildRelationshipBatch,
  wouldCreateParentCycle,
} from "../../utils/familyGraph";
import { FEATURE_FLAGS } from "../../constants/featureFlags";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";
import { postFamilyGraphMutation } from "./familyGraphCloudGateway";

const nowIso = () => new Date().toISOString();

const requireUser = () => {
  const user = getAuth().currentUser;
  if (!user) throw new AppError("GRAPH_PERMISSION_DENIED", "GRAPH");
  return user;
};

const cleanId = (value: string, errorCode: "PERSON_INVALID_DATA" | "RELATIONSHIP_INVALID") => {
  const id = String(value ?? "").trim();
  if (!id || id.includes("/")) {
    throw new AppError(errorCode, errorCode.startsWith("PERSON_") ? "PERSON" : "RELATIONSHIP");
  }
  return id;
};

const toDirectFirestoreError = (error: unknown): never => {
  if (error instanceof AppError) throw error;
  const code = String((error as { code?: unknown } | null)?.code ?? "").toLowerCase();
  if (code.includes("permission-denied")) throw new AppError("GRAPH_PERMISSION_DENIED", "GRAPH", undefined, { cause: error });
  if (code.includes("not-found")) throw new AppError("PERSON_NOT_FOUND", "PERSON", undefined, { cause: error });
  if (code.includes("already-exists")) throw new AppError("RELATIONSHIP_DUPLICATE", "RELATIONSHIP", undefined, { cause: error });
  throw error;
};

const mutablePersonFields = (input: CreateFamilyPersonInput) => ({
  displayName: input.displayName,
  gender: input.gender,
  nickname: input.nickname ?? null,
  birthDate: input.birthDate ?? null,
  birthYear: input.birthYear ?? null,
  birthPlace: input.birthPlace ?? null,
  deathDate: input.deathDate ?? null,
  deathYear: input.deathYear ?? null,
  lifeStatus: input.lifeStatus ?? "unknown",
  birthOrder: input.birthOrder ?? null,
  avatarUrl: input.avatarUrl ?? null,
  description: input.description ?? null,
});

const listNormalizedRelationships = async (familyId: string): Promise<FamilyRelationship[]> => {
  const snapshot = await getDocs(collection(getFirestore(), FIRESTORE_PATHS.familyRelationships(familyId)));
  return snapshot.docs.map((item: { id: string; data(): unknown }) => normalizeFamilyRelationship(
    item.data() as Record<string, unknown>,
    item.id,
    familyId,
  ));
};

/**
 * Development adapter: mobile app writes Family Graph directly to Firestore.
 * Firestore Security Rules remain the authorization/data-integrity boundary.
 *
 * IMPORTANT: cycle detection is client-side in this mode. Before production,
 * switch this adapter back to a trusted backend if strong graph integrity is required.
 */
const directFamilyGraphMutationService = {
  async createPerson(familyIdInput: string, input: CreateFamilyPersonInput) {
    const user = requireUser();
    const familyId = cleanId(familyIdInput, "PERSON_INVALID_DATA");
    const normalized = normalizeCreateFamilyPersonInput(input);
    const db = getFirestore();
    const personRef = doc(collection(db, FIRESTORE_PATHS.familyPersons(familyId)));
    const linkedUid = normalized.linkedUid ? cleanId(normalized.linkedUid, "PERSON_INVALID_DATA") : null;
    const now = nowIso();

    try {
      await runTransaction(db, async (tx) => {
        let linkRef: ReturnType<typeof doc> | null = null;
        if (linkedUid) {
          const memberRef = doc(db, FIRESTORE_PATHS.familyMember(familyId, linkedUid));
          linkRef = doc(db, FIRESTORE_PATHS.familyPersonLink(familyId, linkedUid));
          const [memberSnap, linkSnap] = await Promise.all([tx.get(memberRef), tx.get(linkRef)]);
          if (!memberSnap.exists()) throw new AppError("LINKED_UID_NOT_MEMBER", "PERSON");
          if (linkSnap.exists()) throw new AppError("UID_ALREADY_LINKED", "PERSON");
        }

        tx.set(personRef, {
          id: personRef.id,
          familyId,
          linkedUid,
          ...mutablePersonFields(normalized),
          createdByUid: user.uid,
          createdAt: now,
          updatedAt: now,
        });

        if (linkedUid && linkRef) {
          tx.set(linkRef, {
            familyId,
            uid: linkedUid,
            personId: personRef.id,
            createdByUid: user.uid,
            createdAt: now,
            updatedAt: now,
          });
        }
      });
      return { personId: personRef.id };
    } catch (error) {
      return toDirectFirestoreError(error);
    }
  },

  async updatePerson(familyIdInput: string, personIdInput: string, patch: UpdateFamilyPersonInput) {
    requireUser();
    const familyId = cleanId(familyIdInput, "PERSON_INVALID_DATA");
    const personId = cleanId(personIdInput, "PERSON_INVALID_DATA");
    const db = getFirestore();
    const personRef = doc(db, FIRESTORE_PATHS.familyPerson(familyId, personId));

    try {
      await runTransaction(db, async (tx) => {
        const currentSnap = await tx.get(personRef);
        if (!currentSnap.exists()) throw new AppError("PERSON_NOT_FOUND", "PERSON");
        const current = normalizeFamilyPerson(
          currentSnap.data() as Record<string, unknown>,
          currentSnap.id,
          familyId,
        );
        const normalized = normalizeCreateFamilyPersonInput({
          displayName: patch.displayName ?? current.displayName,
          gender: patch.gender ?? current.gender,
          nickname: patch.nickname === undefined ? current.nickname : patch.nickname,
          birthDate: patch.birthDate === undefined ? current.birthDate : patch.birthDate,
          birthYear: patch.birthYear === undefined ? current.birthYear : patch.birthYear,
          birthPlace: patch.birthPlace === undefined ? current.birthPlace : patch.birthPlace,
          deathDate: patch.deathDate === undefined ? current.deathDate : patch.deathDate,
          deathYear: patch.deathYear === undefined ? current.deathYear : patch.deathYear,
          lifeStatus: patch.lifeStatus ?? current.lifeStatus,
          birthOrder: patch.birthOrder === undefined ? current.birthOrder : patch.birthOrder,
          avatarUrl: patch.avatarUrl === undefined ? current.avatarUrl : patch.avatarUrl,
          description: patch.description === undefined ? current.description : patch.description,
          linkedUid: current.linkedUid,
        });
        tx.update(personRef, {
          ...mutablePersonFields(normalized),
          updatedAt: nowIso(),
        });
      });
      return { personId };
    } catch (error) {
      return toDirectFirestoreError(error);
    }
  },

  async deletePerson(familyIdInput: string, personIdInput: string) {
    requireUser();
    const familyId = cleanId(familyIdInput, "PERSON_INVALID_DATA");
    const personId = cleanId(personIdInput, "PERSON_INVALID_DATA");
    const db = getFirestore();

    try {
      // Firestore Rules cannot query arbitrary relationship collections during a delete.
      // Keep this integrity check in the app while Direct Firestore Development Mode is active.
      const relsRef = collection(db, FIRESTORE_PATHS.familyRelationships(familyId));
      const [asA, asB] = await Promise.all([
        getDocs(query(relsRef, where("personAId", "==", personId))),
        getDocs(query(relsRef, where("personBId", "==", personId))),
      ]);
      if (!asA.empty || !asB.empty) throw new AppError("PERSON_HAS_RELATIONSHIPS", "PERSON");

      const personRef = doc(db, FIRESTORE_PATHS.familyPerson(familyId, personId));
      await runTransaction(db, async (tx) => {
        const current = await tx.get(personRef);
        if (!current.exists()) throw new AppError("PERSON_NOT_FOUND", "PERSON");
        if ((current.data() as { linkedUid?: string | null }).linkedUid) {
          throw new AppError("PERSON_ALREADY_LINKED", "PERSON");
        }
        tx.delete(personRef);
      });
      return { personId };
    } catch (error) {
      return toDirectFirestoreError(error);
    }
  },

  /**
   * Explicit Person deletion for correction workflows. Unlike deletePerson(), this
   * removes structural edges touching the Person in the same client transaction.
   * Linked accounts and Person Timeline/Album content remain protected.
   */
  async deletePersonCascade(familyIdInput: string, personIdInput: string) {
    requireUser();
    const familyId = cleanId(familyIdInput, "PERSON_INVALID_DATA");
    const personId = cleanId(personIdInput, "PERSON_INVALID_DATA");
    const db = getFirestore();

    try {
      const relsRef = collection(db, FIRESTORE_PATHS.familyRelationships(familyId));
      const [asA, asB, timeline, album] = await Promise.all([
        getDocs(query(relsRef, where("personAId", "==", personId))),
        getDocs(query(relsRef, where("personBId", "==", personId))),
        getDocs(query(collection(db, FIRESTORE_PATHS.familyPersonTimeline(familyId, personId)), limit(1))),
        getDocs(query(collection(db, FIRESTORE_PATHS.familyPersonAlbum(familyId, personId)), limit(1))),
      ]);
      if (!timeline.empty || !album.empty) throw new AppError("PERSON_HAS_CONTENT", "PERSON");

      const relationshipRefs = Array.from(new Map(
        [...asA.docs, ...asB.docs].map((snapshot) => [snapshot.id, snapshot.ref] as const),
      ).values());
      const personRef = doc(db, FIRESTORE_PATHS.familyPerson(familyId, personId));
      await runTransaction(db, async (tx) => {
        const current = await tx.get(personRef);
        if (!current.exists()) throw new AppError("PERSON_NOT_FOUND", "PERSON");
        if ((current.data() as { linkedUid?: string | null }).linkedUid) {
          throw new AppError("PERSON_ALREADY_LINKED", "PERSON");
        }
        relationshipRefs.forEach((relationshipRef) => tx.delete(relationshipRef));
        tx.delete(personRef);
      });
      return { personId, deletedRelationshipIds: relationshipRefs.map((ref) => ref.id) };
    } catch (error) {
      return toDirectFirestoreError(error);
    }
  },

  async linkPerson(familyIdInput: string, personIdInput: string, uidInput: string) {
    const user = requireUser();
    const familyId = cleanId(familyIdInput, "PERSON_INVALID_DATA");
    const personId = cleanId(personIdInput, "PERSON_INVALID_DATA");
    const uid = cleanId(uidInput, "PERSON_INVALID_DATA");
    const db = getFirestore();
    const personRef = doc(db, FIRESTORE_PATHS.familyPerson(familyId, personId));
    const memberRef = doc(db, FIRESTORE_PATHS.familyMember(familyId, uid));
    const linkRef = doc(db, FIRESTORE_PATHS.familyPersonLink(familyId, uid));

    try {
      await runTransaction(db, async (tx) => {
        const [personSnap, memberSnap, linkSnap] = await Promise.all([
          tx.get(personRef), tx.get(memberRef), tx.get(linkRef),
        ]);
        if (!personSnap.exists()) throw new AppError("PERSON_NOT_FOUND", "PERSON");
        if (!memberSnap.exists()) throw new AppError("LINKED_UID_NOT_MEMBER", "PERSON");

        const currentUid = String((personSnap.data() as { linkedUid?: unknown }).linkedUid ?? "").trim() || null;
        if (currentUid && currentUid !== uid) throw new AppError("PERSON_ALREADY_LINKED", "PERSON");
        if (linkSnap.exists()) {
          const linkedPersonId = String((linkSnap.data() as { personId?: unknown }).personId ?? "");
          if (linkedPersonId !== personId) throw new AppError("UID_ALREADY_LINKED", "PERSON");
          if (currentUid === uid) return;
        }

        const now = nowIso();
        tx.update(personRef, { linkedUid: uid, updatedAt: now });
        tx.set(linkRef, {
          familyId,
          uid,
          personId,
          createdByUid: user.uid,
          createdAt: now,
          updatedAt: now,
        });
      });
      return { personId, uid };
    } catch (error) {
      return toDirectFirestoreError(error);
    }
  },

  async unlinkPerson(familyIdInput: string, personIdInput: string) {
    requireUser();
    const familyId = cleanId(familyIdInput, "PERSON_INVALID_DATA");
    const personId = cleanId(personIdInput, "PERSON_INVALID_DATA");
    const db = getFirestore();
    const personRef = doc(db, FIRESTORE_PATHS.familyPerson(familyId, personId));

    try {
      await runTransaction(db, async (tx) => {
        const personSnap = await tx.get(personRef);
        if (!personSnap.exists()) throw new AppError("PERSON_NOT_FOUND", "PERSON");
        const uid = String((personSnap.data() as { linkedUid?: unknown }).linkedUid ?? "").trim() || null;
        if (!uid) return;

        const linkRef = doc(db, FIRESTORE_PATHS.familyPersonLink(familyId, uid));
        const linkSnap = await tx.get(linkRef);
        if (linkSnap.exists()) {
          const linkedPersonId = String((linkSnap.data() as { personId?: unknown }).personId ?? "");
          if (linkedPersonId !== personId) throw new AppError("PERSON_INVALID_DATA", "PERSON");
        }

        tx.update(personRef, { linkedUid: null, updatedAt: nowIso() });
        if (linkSnap.exists()) tx.delete(linkRef);
      });
      return { personId };
    } catch (error) {
      return toDirectFirestoreError(error);
    }
  },

  async setPersonAvatar(
    familyIdInput: string,
    personIdInput: string,
    avatarUrl: string | null,
    mediaAssetId: string | null = null,
  ) {
    const user = requireUser();
    const familyId = cleanId(familyIdInput, "PERSON_INVALID_DATA");
    const personId = cleanId(personIdInput, "PERSON_INVALID_DATA");
    const db = getFirestore();
    const personRef = doc(db, FIRESTORE_PATHS.familyPerson(familyId, personId));

    try {
      await runTransaction(db, async (tx) => {
        const personSnap = await tx.get(personRef);
        if (!personSnap.exists()) throw new AppError("PERSON_NOT_FOUND", "PERSON");

        if (!avatarUrl) {
          tx.update(personRef, { avatarUrl: null, updatedAt: nowIso() });
          return;
        }
        if (!mediaAssetId || !/^https:\/\//i.test(avatarUrl)) {
          throw new AppError("PERSON_INVALID_DATA", "PERSON");
        }

        const assetRef = doc(db, FIRESTORE_PATHS.mediaAsset(mediaAssetId));
        const assetSnap = await tx.get(assetRef);
        const asset = assetSnap.data() as Record<string, unknown> | undefined;
        if (!assetSnap.exists()
          || asset?.ownerUid !== user.uid
          || asset?.familyId !== familyId
          || asset?.entityType !== "person"
          || asset?.entityId !== personId
          || asset?.purpose !== "avatar"
          || asset?.status !== "uploaded"
          || asset?.secureUrl !== avatarUrl) {
          throw new AppError("PERSON_INVALID_DATA", "PERSON");
        }

        const now = nowIso();
        tx.update(personRef, { avatarUrl, updatedAt: now });
        tx.update(assetRef, { status: "attached", updatedAt: now });
      });
      return { personId };
    } catch (error) {
      return toDirectFirestoreError(error);
    }
  },

  async createRelationship(familyIdInput: string, input: CreateFamilyRelationshipInput) {
    const user = requireUser();
    const familyId = cleanId(familyIdInput, "RELATIONSHIP_INVALID");
    const db = getFirestore();
    const now = nowIso();

    try {
      if (input.type === "parent_child") {
        const parentId = cleanId(input.parentId, "RELATIONSHIP_INVALID");
        const childId = cleanId(input.childId, "RELATIONSHIP_INVALID");
        const relationshipId = getParentChildRelationshipId(parentId, childId);
        const currentRelationships = await listNormalizedRelationships(familyId);
        if (wouldCreateParentCycle(parentId, childId, currentRelationships)) {
          throw new AppError("RELATIONSHIP_PARENT_CYCLE", "RELATIONSHIP");
        }

        const relationship: FamilyRelationship = {
          id: relationshipId,
          familyId,
          type: "parent_child",
          personAId: parentId,
          personBId: childId,
          subtype: input.subtype ?? "unknown",
          partnerStatus: null,
          startDate: null,
          endDate: null,
          createdByUid: user.uid,
          createdAt: now,
          updatedAt: now,
        };
        normalizeFamilyRelationship(relationship as unknown as Record<string, unknown>, relationshipId, familyId);

        const relRef = doc(db, FIRESTORE_PATHS.familyRelationship(familyId, relationshipId));
        const parentRef = doc(db, FIRESTORE_PATHS.familyPerson(familyId, parentId));
        const childRef = doc(db, FIRESTORE_PATHS.familyPerson(familyId, childId));
        await runTransaction(db, async (tx) => {
          const [parentSnap, childSnap, relSnap] = await Promise.all([
            tx.get(parentRef), tx.get(childRef), tx.get(relRef),
          ]);
          if (!parentSnap.exists() || !childSnap.exists()) throw new AppError("PERSON_NOT_FOUND", "PERSON");
          if (relSnap.exists()) throw new AppError("RELATIONSHIP_DUPLICATE", "RELATIONSHIP");
          tx.set(relRef, relationship);
        });
        return { relationshipId };
      }

      const [personAId, personBId] = canonicalizePartnerIds(
        cleanId(input.personAId, "RELATIONSHIP_INVALID"),
        cleanId(input.personBId, "RELATIONSHIP_INVALID"),
      );
      const relationshipId = getPartnerRelationshipId(personAId, personBId);
      const relationship: FamilyRelationship = {
        id: relationshipId,
        familyId,
        type: "partner",
        personAId,
        personBId,
        subtype: null,
        partnerStatus: input.partnerStatus ?? "partner",
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        createdByUid: user.uid,
        createdAt: now,
        updatedAt: now,
      };
      normalizeFamilyRelationship(relationship as unknown as Record<string, unknown>, relationshipId, familyId);

      const relRef = doc(db, FIRESTORE_PATHS.familyRelationship(familyId, relationshipId));
      const aRef = doc(db, FIRESTORE_PATHS.familyPerson(familyId, personAId));
      const bRef = doc(db, FIRESTORE_PATHS.familyPerson(familyId, personBId));
      await runTransaction(db, async (tx) => {
        const [aSnap, bSnap, relSnap] = await Promise.all([tx.get(aRef), tx.get(bRef), tx.get(relRef)]);
        if (!aSnap.exists() || !bSnap.exists()) throw new AppError("PERSON_NOT_FOUND", "PERSON");
        if (relSnap.exists()) throw new AppError("RELATIONSHIP_DUPLICATE", "RELATIONSHIP");
        tx.set(relRef, relationship);
      });
      return { relationshipId };
    } catch (error) {
      return toDirectFirestoreError(error);
    }
  },

  async createParentChildRelationshipsBatch(
    familyIdInput: string,
    input: CreateParentChildRelationshipsBatchInput,
  ): Promise<CreateParentChildRelationshipsBatchResult> {
    const user = requireUser();
    const familyId = cleanId(familyIdInput, "RELATIONSHIP_INVALID");
    const parentIds = [...new Set(input.parentIds.map((value) => cleanId(value, "RELATIONSHIP_INVALID")))];
    const childIds = [...new Set(input.childIds.map((value) => cleanId(value, "RELATIONSHIP_INVALID")))];
    const subtype = input.subtype ?? "unknown";
    const db = getFirestore();
    const now = nowIso();

    try {
      const currentRelationships = await listNormalizedRelationships(familyId);
      const plan = planParentChildRelationshipBatch(parentIds, childIds, subtype, currentRelationships);
      if (!plan.newEdges.length) {
        return {
          createdRelationshipIds: [],
          existingRelationshipIds: plan.existingRelationshipIds,
        };
      }

      const personIds = [...new Set([...parentIds, ...childIds])];
      const personRefs = personIds.map((personId) => doc(db, FIRESTORE_PATHS.familyPerson(familyId, personId)));
      const relationshipRefs = plan.newEdges.map((edge) => doc(db, FIRESTORE_PATHS.familyRelationship(familyId, edge.id)));
      const transactionResult = await runTransaction(db, async (tx) => {
        const createdRelationshipIds: string[] = [];
        const concurrentExistingIds: string[] = [];
        const personSnapshots = await Promise.all(personRefs.map((ref) => tx.get(ref)));
        if (personSnapshots.some((snapshot) => !snapshot.exists())) {
          throw new AppError("PERSON_NOT_FOUND", "PERSON");
        }

        const relationshipSnapshots = await Promise.all(relationshipRefs.map((ref) => tx.get(ref)));
        relationshipSnapshots.forEach((snapshot, index) => {
          const edge = plan.newEdges[index];
          if (snapshot.exists()) {
            const current = normalizeFamilyRelationship(
              snapshot.data() as Record<string, unknown>,
              snapshot.id,
              familyId,
            );
            if ((current.subtype ?? "unknown") !== subtype) {
              throw new AppError("RELATIONSHIP_DUPLICATE", "RELATIONSHIP");
            }
            concurrentExistingIds.push(edge.id);
            return;
          }

          const relationship: FamilyRelationship = {
            id: edge.id,
            familyId,
            type: "parent_child",
            personAId: edge.parentId,
            personBId: edge.childId,
            subtype,
            partnerStatus: null,
            startDate: null,
            endDate: null,
            createdByUid: user.uid,
            createdAt: now,
            updatedAt: now,
          };
          tx.set(relationshipRefs[index], relationship);
          createdRelationshipIds.push(edge.id);
        });
        return { createdRelationshipIds, concurrentExistingIds };
      });

      return {
        createdRelationshipIds: transactionResult.createdRelationshipIds,
        existingRelationshipIds: [...new Set([...plan.existingRelationshipIds, ...transactionResult.concurrentExistingIds])],
      };
    } catch (error) {
      return toDirectFirestoreError(error);
    }
  },

  async updatePartnerRelationship(
    familyIdInput: string,
    relationshipIdInput: string,
    patch: UpdatePartnerRelationshipInput,
  ) {
    requireUser();
    const familyId = cleanId(familyIdInput, "RELATIONSHIP_INVALID");
    const relationshipId = cleanId(relationshipIdInput, "RELATIONSHIP_INVALID");
    const db = getFirestore();
    const relRef = doc(db, FIRESTORE_PATHS.familyRelationship(familyId, relationshipId));

    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(relRef);
        if (!snap.exists()) throw new AppError("RELATIONSHIP_NOT_FOUND", "RELATIONSHIP");
        const current = normalizeFamilyRelationship(
          snap.data() as Record<string, unknown>,
          snap.id,
          familyId,
        );
        if (current.type !== "partner") throw new AppError("RELATIONSHIP_INVALID", "RELATIONSHIP");
        const next: FamilyRelationship = {
          ...current,
          partnerStatus: patch.partnerStatus === undefined ? current.partnerStatus : (patch.partnerStatus ?? "partner"),
          startDate: patch.startDate === undefined ? current.startDate : patch.startDate,
          endDate: patch.endDate === undefined ? current.endDate : patch.endDate,
          updatedAt: nowIso(),
        };
        normalizeFamilyRelationship(next as unknown as Record<string, unknown>, relationshipId, familyId);
        tx.update(relRef, {
          partnerStatus: next.partnerStatus,
          startDate: next.startDate,
          endDate: next.endDate,
          updatedAt: next.updatedAt,
        });
      });
      return { relationshipId };
    } catch (error) {
      return toDirectFirestoreError(error);
    }
  },

  async deleteRelationship(familyIdInput: string, relationshipIdInput: string) {
    requireUser();
    const familyId = cleanId(familyIdInput, "RELATIONSHIP_INVALID");
    const relationshipId = cleanId(relationshipIdInput, "RELATIONSHIP_INVALID");
    const db = getFirestore();
    const relRef = doc(db, FIRESTORE_PATHS.familyRelationship(familyId, relationshipId));

    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(relRef);
        if (!snap.exists()) throw new AppError("RELATIONSHIP_NOT_FOUND", "RELATIONSHIP");
        tx.delete(relRef);
      });
      return { relationshipId };
    } catch (error) {
      return toDirectFirestoreError(error);
    }
  },
};


const cloudFamilyGraphMutationService: typeof directFamilyGraphMutationService = {
  async createPerson(familyId: string, input: CreateFamilyPersonInput) {
    return postFamilyGraphMutation<{ personId: string }>(familyId, "createPerson", input as unknown as Record<string, unknown>);
  },

  async updatePerson(familyId: string, personId: string, patch: UpdateFamilyPersonInput) {
    return postFamilyGraphMutation<{ personId: string }>(familyId, "updatePerson", { personId, patch });
  },

  async deletePerson(familyId: string, personId: string) {
    return postFamilyGraphMutation<{ personId: string }>(familyId, "deletePerson", { personId });
  },

  async deletePersonCascade(familyId: string, personId: string) {
    return postFamilyGraphMutation<{ personId: string; deletedRelationshipIds: string[] }>(familyId, "deletePersonCascade", { personId });
  },

  async linkPerson(familyId: string, personId: string, uid: string) {
    return postFamilyGraphMutation<{ personId: string; uid: string }>(familyId, "linkPerson", { personId, uid });
  },

  async unlinkPerson(familyId: string, personId: string) {
    return postFamilyGraphMutation<{ personId: string }>(familyId, "unlinkPerson", { personId });
  },

  async setPersonAvatar(
    familyId: string,
    personId: string,
    avatarUrl: string | null,
    mediaAssetId: string | null = null,
  ) {
    return postFamilyGraphMutation<{ personId: string }>(familyId, "setPersonAvatar", {
      personId,
      avatarUrl,
      mediaAssetId,
    });
  },

  async createRelationship(familyId: string, input: CreateFamilyRelationshipInput) {
    return postFamilyGraphMutation<{ relationshipId: string }>(
      familyId,
      "createRelationship",
      input as unknown as Record<string, unknown>,
    );
  },

  async createParentChildRelationshipsBatch(
    familyId: string,
    input: CreateParentChildRelationshipsBatchInput,
  ) {
    return postFamilyGraphMutation<CreateParentChildRelationshipsBatchResult>(
      familyId,
      "createParentChildRelationshipsBatch",
      input as unknown as Record<string, unknown>,
    );
  },

  async updatePartnerRelationship(
    familyId: string,
    relationshipId: string,
    patch: UpdatePartnerRelationshipInput,
  ) {
    return postFamilyGraphMutation<{ relationshipId: string }>(familyId, "updatePartnerRelationship", {
      relationshipId,
      ...patch,
    });
  },

  async deleteRelationship(familyId: string, relationshipId: string) {
    return postFamilyGraphMutation<{ relationshipId: string }>(familyId, "deleteRelationship", { relationshipId });
  },
};

/**
 * Stable mutation facade. UI never needs to know which transport is active.
 * Spark/dev: Direct Firestore + Security Rules.
 * Blaze later: flip FEATURE_FLAGS.USE_CLOUD_FUNCTIONS and publish the hardened rules.
 */
const activeMutationService = (): typeof directFamilyGraphMutationService => FEATURE_FLAGS.USE_CLOUD_FUNCTIONS
  ? cloudFamilyGraphMutationService
  : directFamilyGraphMutationService;

export const familyGraphMutationService = {
  createPerson: (...args: Parameters<typeof directFamilyGraphMutationService.createPerson>) => activeMutationService().createPerson(...args),
  updatePerson: (...args: Parameters<typeof directFamilyGraphMutationService.updatePerson>) => activeMutationService().updatePerson(...args),
  deletePerson: (...args: Parameters<typeof directFamilyGraphMutationService.deletePerson>) => activeMutationService().deletePerson(...args),
  deletePersonCascade: (...args: Parameters<typeof directFamilyGraphMutationService.deletePersonCascade>) => activeMutationService().deletePersonCascade(...args),
  linkPerson: (...args: Parameters<typeof directFamilyGraphMutationService.linkPerson>) => activeMutationService().linkPerson(...args),
  unlinkPerson: (...args: Parameters<typeof directFamilyGraphMutationService.unlinkPerson>) => activeMutationService().unlinkPerson(...args),
  setPersonAvatar: (...args: Parameters<typeof directFamilyGraphMutationService.setPersonAvatar>) => activeMutationService().setPersonAvatar(...args),
  createRelationship: (...args: Parameters<typeof directFamilyGraphMutationService.createRelationship>) => activeMutationService().createRelationship(...args),
  createParentChildRelationshipsBatch: (...args: Parameters<typeof directFamilyGraphMutationService.createParentChildRelationshipsBatch>) => activeMutationService().createParentChildRelationshipsBatch(...args),
  updatePartnerRelationship: (...args: Parameters<typeof directFamilyGraphMutationService.updatePartnerRelationship>) => activeMutationService().updatePartnerRelationship(...args),
  deleteRelationship: (...args: Parameters<typeof directFamilyGraphMutationService.deleteRelationship>) => activeMutationService().deleteRelationship(...args),
};
