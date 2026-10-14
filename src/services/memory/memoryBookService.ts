import { collection, doc, getDoc, getDocs, getFirestore, limit, query, setDoc, where } from "@react-native-firebase/firestore";
import { getAuth } from "@react-native-firebase/auth";
import type { MemoryBookDraft, MemoryBookScope } from "../../types/memoryBook";
import type { MomentPost } from "../../types/moments";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";
import { momentsService } from "../moments/momentsService";

const now = () => new Date().toISOString();
const normalize = (raw: Record<string, unknown>, id: string): MemoryBookDraft => ({
  id, familyId: String(raw.familyId || ""), scope: raw.scope === "person" ? "person" : "family",
  personId: typeof raw.personId === "string" ? raw.personId : null,
  title: typeof raw.title === "string" ? raw.title : "Kỷ yếu gia đình", subtitle: typeof raw.subtitle === "string" ? raw.subtitle : "",
  coverMomentId: typeof raw.coverMomentId === "string" ? raw.coverMomentId : null,
  momentIds: Array.isArray(raw.momentIds) ? raw.momentIds.filter((x): x is string => typeof x === "string") : [],
  createdByUid: String(raw.createdByUid || ""), createdAt: String(raw.createdAt || now()), updatedAt: String(raw.updatedAt || now()),
});

export const memoryBookService = {
  async loadSourceMoments(familyId: string, scope: MemoryBookScope, personId?: string | null, max = 120): Promise<MomentPost[]> {
    if (scope === "person" && personId) return momentsService.listForPersonOnce(familyId, personId, max);
    return momentsService.listFamilyTimelineOnce(familyId, max);
  },
  async load(familyId: string, bookId: string) {
    const snap = await getDoc(doc(getFirestore(), FIRESTORE_PATHS.memoryBook(familyId, bookId)));
    return snap.exists() ? normalize(snap.data() as Record<string, unknown>, bookId) : null;
  },
  async save(input: Omit<MemoryBookDraft, "id" | "createdByUid" | "createdAt" | "updatedAt"> & { id?: string }) {
    const uid = getAuth().currentUser?.uid; if (!uid) throw new Error("AUTH_REQUIRED");
    const db = getFirestore(); const ref = input.id ? doc(db, FIRESTORE_PATHS.memoryBook(input.familyId, input.id)) : doc(collection(db, FIRESTORE_PATHS.memoryBooks(input.familyId)));
    const existing = input.id ? await getDoc(ref) : null; const timestamp = now();
    const draft: MemoryBookDraft = { ...input, id: ref.id, createdByUid: existing?.exists() ? String((existing.data() as any).createdByUid || uid) : uid, createdAt: existing?.exists() ? String((existing.data() as any).createdAt || timestamp) : timestamp, updatedAt: timestamp };
    await setDoc(ref, draft); return draft;
  },
};
