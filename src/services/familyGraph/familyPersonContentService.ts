import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";
import { getAuth } from "@react-native-firebase/auth";
import { FEATURE_FLAGS } from "../../constants/featureFlags";
import type {
  CreateFamilyPersonTimelineEntryInput,
  UpdateFamilyPersonTimelineEntryInput,
  FamilyPersonAlbumMedia,
  FamilyPersonAlbumRef,
  FamilyPersonTimelineEntry,
} from "../../types/familyGraph";
import type { MediaAsset, MediaFile } from "../../types/media";
import { AppError } from "../../types/errors";
import { removeUndefinedDeep } from "../../utils/firestore";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";
import { mediaService } from "../media/mediaService";
import { postFamilyGraphMutation } from "./familyGraphCloudGateway";

const TIMELINE_LIMIT = 120;
const ALBUM_LIMIT = 80;
const nowIso = () => new Date().toISOString();

const cleanId = (value: string) => {
  const id = String(value ?? "").trim();
  if (!id || id.includes("/")) throw new AppError("PERSON_INVALID_DATA", "PERSON");
  return id;
};

const requireUser = () => {
  const user = getAuth().currentUser;
  if (!user) throw new AppError("GRAPH_PERMISSION_DENIED", "GRAPH");
  return user;
};

const cleanDate = (value: string) => {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new AppError("PERSON_INVALID_DATA", "PERSON");
  const [year, month, day] = text.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    !Number.isFinite(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    throw new AppError("PERSON_INVALID_DATA", "PERSON");
  }
  return text;
};

const cleanTitle = (value: string) => {
  const title = String(value ?? "").trim();
  if (!title || title.length > 160) throw new AppError("PERSON_INVALID_DATA", "PERSON");
  return title;
};

const cleanDescription = (value?: string | null) => {
  const description = String(value ?? "").trim();
  if (description.length > 4000) throw new AppError("PERSON_INVALID_DATA", "PERSON");
  return description || null;
};

const normalizeTimelineEntry = (
  raw: Record<string, unknown>,
  fallbackId: string,
  familyId: string,
  personId: string,
): FamilyPersonTimelineEntry => ({
  id: typeof raw.id === "string" && raw.id ? raw.id : fallbackId,
  familyId: typeof raw.familyId === "string" && raw.familyId ? raw.familyId : familyId,
  personId: typeof raw.personId === "string" && raw.personId ? raw.personId : personId,
  date: typeof raw.date === "string" ? raw.date : "",
  title: typeof raw.title === "string" ? raw.title : "Kỷ niệm gia đình",
  description: typeof raw.description === "string" && raw.description.trim() ? raw.description.trim() : null,
  createdByUid: typeof raw.createdByUid === "string" ? raw.createdByUid : "",
  createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowIso(),
  updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : (typeof raw.createdAt === "string" ? raw.createdAt : nowIso()),
});

const normalizeAlbumRef = (
  raw: Record<string, unknown>,
  fallbackId: string,
  familyId: string,
  personId: string,
): FamilyPersonAlbumRef => ({
  id: typeof raw.id === "string" && raw.id ? raw.id : fallbackId,
  familyId: typeof raw.familyId === "string" && raw.familyId ? raw.familyId : familyId,
  personId: typeof raw.personId === "string" && raw.personId ? raw.personId : personId,
  mediaAssetId: typeof raw.mediaAssetId === "string" && raw.mediaAssetId ? raw.mediaAssetId : fallbackId,
  caption: typeof raw.caption === "string" && raw.caption.trim() ? raw.caption.trim() : null,
  createdByUid: typeof raw.createdByUid === "string" ? raw.createdByUid : "",
  createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowIso(),
});



export const familyPersonContentService = {
  watchTimeline(
    familyIdInput: string,
    personIdInput: string,
    onChange: (items: FamilyPersonTimelineEntry[]) => void,
    onError?: (error: unknown) => void,
  ) {
    const familyId = cleanId(familyIdInput);
    const personId = cleanId(personIdInput);
    return onSnapshot(
      query(
        collection(getFirestore(), FIRESTORE_PATHS.familyPersonTimeline(familyId, personId)),
        orderBy("date", "asc"),
        limit(TIMELINE_LIMIT),
      ),
      (snapshot) => {
        try {
          onChange(snapshot.docs.map((item) => normalizeTimelineEntry(
            item.data() as Record<string, unknown>,
            item.id,
            familyId,
            personId,
          )));
        } catch (error) {
          onError?.(error);
        }
      },
      onError,
    );
  },

  watchAlbum(
    familyIdInput: string,
    personIdInput: string,
    onChange: (items: FamilyPersonAlbumMedia[]) => void,
    onError?: (error: unknown) => void,
  ) {
    const familyId = cleanId(familyIdInput);
    const personId = cleanId(personIdInput);
    let closed = false;
    let refs: FamilyPersonAlbumRef[] = [];
    let assets = new Map<string, MediaAsset>();

    const emit = () => {
      if (closed) return;
      const resolved = refs
        .map((albumRef): FamilyPersonAlbumMedia | null => {
          const asset = assets.get(albumRef.mediaAssetId);
          if (!asset) return null;
          if (
            asset.familyId !== familyId
            || asset.entityType !== "person"
            || asset.entityId !== personId
            || asset.purpose !== "album"
            || !["uploaded", "attached"].includes(asset.status)
            || !asset.secureUrl
          ) return null;
          return {
            ...albumRef,
            type: asset.type,
            secureUrl: asset.secureUrl,
            thumbnailUrl: asset.thumbnailUrl ?? null,
          };
        })
        .filter((item): item is FamilyPersonAlbumMedia => !!item)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onChange(resolved);
    };

    // Keep one bounded listener for album refs and one bounded listener for the
    // Person's media lifecycle records. This removes the previous getDoc race
    // where an album ref could arrive before media_assets changed to attached.
    const unsubscribeRefs = onSnapshot(
      query(
        collection(getFirestore(), FIRESTORE_PATHS.familyPersonAlbum(familyId, personId)),
        orderBy("createdAt", "desc"),
        limit(ALBUM_LIMIT),
      ),
      (snapshot) => {
        refs = snapshot.docs.map((item) => normalizeAlbumRef(
          item.data() as Record<string, unknown>,
          item.id,
          familyId,
          personId,
        ));
        emit();
      },
      onError,
    );

    const unsubscribeAssets = onSnapshot(
      query(
        collection(getFirestore(), FIRESTORE_PATHS.mediaAssets()),
        // Firestore rules are not filters. Constrain the global media collection
        // by family as well as entity so the query can be authorized safely.
        where("familyId", "==", familyId),
        where("entityId", "==", personId),
        limit(ALBUM_LIMIT * 2),
      ),
      (snapshot) => {
        const next = new Map<string, MediaAsset>();
        snapshot.docs.forEach((item) => {
          const asset = item.data() as MediaAsset;
          if (
            asset.familyId === familyId
            && asset.entityType === "person"
            && asset.entityId === personId
            && asset.purpose === "album"
          ) next.set(item.id, { ...asset, id: asset.id || item.id });
        });
        assets = next;
        emit();
      },
      onError,
    );

    return () => {
      closed = true;
      refs = [];
      assets.clear();
      unsubscribeRefs();
      unsubscribeAssets();
    };
  },

  async createTimelineEntry(
    familyIdInput: string,
    personIdInput: string,
    input: CreateFamilyPersonTimelineEntryInput,
  ): Promise<FamilyPersonTimelineEntry> {
    const user = requireUser();
    const familyId = cleanId(familyIdInput);
    const personId = cleanId(personIdInput);
    const db = getFirestore();
    const ref = doc(collection(db, FIRESTORE_PATHS.familyPersonTimeline(familyId, personId)));
    const timestamp = nowIso();
    const entry: FamilyPersonTimelineEntry = {
      id: ref.id,
      familyId,
      personId,
      date: cleanDate(input.date),
      title: cleanTitle(input.title),
      description: cleanDescription(input.description),
      createdByUid: user.uid,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    if (FEATURE_FLAGS.USE_CLOUD_FUNCTIONS) {
      const result = await postFamilyGraphMutation<{ entry: FamilyPersonTimelineEntry }>(
        familyId,
        "createTimelineEntry",
        { personId, entryId: ref.id, date: entry.date, title: entry.title, description: entry.description },
      );
      return result.entry;
    }

    await setDoc(ref, removeUndefinedDeep(entry));
    return entry;
  },

  async updateTimelineEntry(
    familyIdInput: string,
    personIdInput: string,
    entryIdInput: string,
    input: UpdateFamilyPersonTimelineEntryInput,
  ): Promise<void> {
    requireUser();
    const familyId = cleanId(familyIdInput);
    const personId = cleanId(personIdInput);
    const entryId = cleanId(entryIdInput);
    const patch = {
      date: cleanDate(input.date),
      title: cleanTitle(input.title),
      description: cleanDescription(input.description),
      updatedAt: nowIso(),
    };
    if (FEATURE_FLAGS.USE_CLOUD_FUNCTIONS) {
      await postFamilyGraphMutation<{ entryId: string }>(familyId, "updateTimelineEntry", {
        personId,
        entryId,
        ...patch,
      });
      return;
    }
    await updateDoc(
      doc(getFirestore(), FIRESTORE_PATHS.familyPersonTimelineEntry(familyId, personId, entryId)),
      removeUndefinedDeep(patch),
    );
  },

  async deleteTimelineEntry(familyIdInput: string, personIdInput: string, entryIdInput: string) {
    requireUser();
    const familyId = cleanId(familyIdInput);
    const personId = cleanId(personIdInput);
    const entryId = cleanId(entryIdInput);
    if (FEATURE_FLAGS.USE_CLOUD_FUNCTIONS) {
      await postFamilyGraphMutation<{ entryId: string }>(familyId, "deleteTimelineEntry", { personId, entryId });
      return;
    }
    await deleteDoc(doc(getFirestore(), FIRESTORE_PATHS.familyPersonTimelineEntry(familyId, personId, entryId)));
  },

  async addAlbumFile(
    familyIdInput: string,
    personIdInput: string,
    file: MediaFile,
    caption?: string | null,
    onProgress?: (value: number) => void,
  ): Promise<FamilyPersonAlbumMedia> {
    const user = requireUser();
    const familyId = cleanId(familyIdInput);
    const personId = cleanId(personIdInput);
    const db = getFirestore();

    // Avoid uploading a provider file for a Person that no longer exists.
    const personSnapshot = await getDoc(doc(db, FIRESTORE_PATHS.familyPerson(familyId, personId)));
    if (!personSnapshot.exists()) throw new AppError("PERSON_NOT_FOUND", "PERSON");

    const { asset, result } = await mediaService.uploadManaged(
      { ...file, purpose: "album" },
      {
        ownerUid: user.uid,
        familyId,
        purpose: "album",
        entityType: "person",
        entityId: personId,
        category: "persons",
      },
      onProgress,
    );

    const item: FamilyPersonAlbumRef = {
      id: asset.id,
      familyId,
      personId,
      mediaAssetId: asset.id,
      caption: cleanDescription(caption),
      createdByUid: user.uid,
      createdAt: nowIso(),
    };

    try {
      if (FEATURE_FLAGS.USE_CLOUD_FUNCTIONS) {
        await postFamilyGraphMutation<{ albumId: string }>(familyId, "attachPersonAlbumAsset", {
          personId,
          mediaAssetId: asset.id,
          caption: item.caption,
        });
      } else {
        await mediaService.attachToDocument(
          asset.id,
          FIRESTORE_PATHS.familyPersonAlbumItem(familyId, personId, asset.id),
          item as unknown as Record<string, unknown>,
        );
      }
    } catch (error) {
      try { await mediaService.markCleanupPending(asset.id); } catch { /* preserve original attach failure */ }
      throw error;
    }

    return {
      ...item,
      type: file.type,
      secureUrl: result.secureUrl,
      thumbnailUrl: result.thumbnailUrl || null,
    };
  },
};
