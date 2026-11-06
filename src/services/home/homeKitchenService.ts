import {
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
} from "@react-native-firebase/firestore";
import { BLOOM_RECIPES_V1 } from "@/data/kitchen/bloomRecipesV1";
import type { BloomRecipe, HomeKitchenPreference, KitchenPreferenceTag } from "@/types/homeLiving";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";

const preferenceCollection = FIRESTORE_PATHS.familyHomeKitchenPreferences;
const nowIso = () => new Date().toISOString();

const hash = (text: string) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const localDayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const localDayOrdinal = (date: Date) => {
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(localMidnight.getTime() / 86_400_000);
};

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a), y = Math.abs(b);
  while (y) [x, y] = [y, x % y];
  return x || 1;
};

const rotationStride = (length: number) => {
  for (let stride = 7; stride < Math.max(8, length); stride += 2) {
    if (gcd(stride, length) === 1) return stride;
  }
  return 1;
};

const normalizeTags = (tags: KitchenPreferenceTag[]) => {
  const valid = new Set<KitchenPreferenceTag>(["normal", "vegetarian", "lowerSugar", "controlledCarb", "lowerSodium"]);
  const normalized = Array.from(new Set(tags.filter(tag => valid.has(tag)))).slice(0, 5);
  const custom = normalized.filter(tag => tag !== "normal");
  return custom.length ? custom : ["normal"];
};

const hasCustomFilters = (tags: KitchenPreferenceTag[]) => normalizeTags(tags).some(tag => tag !== "normal");

const preferenceScore = (recipe: BloomRecipe, tags: Set<KitchenPreferenceTag>) => {
  let score = 0;
  if (tags.has("vegetarian") && recipe.preferenceTags.includes("vegetarian")) score += 8;
  if (tags.has("lowerSugar") && recipe.preferenceTags.includes("lowerSugarCandidate")) score += 4;
  if (tags.has("controlledCarb") && recipe.preferenceTags.includes("controlledCarbCandidate")) score += 4;
  if (tags.has("lowerSodium") && recipe.preferenceTags.includes("lowerSodiumCandidate")) score += 4;
  if (recipe.preferenceTags.includes("family")) score += 1;
  return score;
};

const candidatesFor = (meal: BloomRecipe["mealTypes"][number], selectedTags: Set<KitchenPreferenceTag>) => {
  const vegetarianRequired = selectedTags.has("vegetarian");
  let items = BLOOM_RECIPES_V1.filter(r => r.mealTypes.includes(meal));
  if (vegetarianRequired) {
    const vegetarian = items.filter(r => r.preferenceTags.includes("vegetarian"));
    if (vegetarian.length >= 3) items = vegetarian;
  }
  return [...items].sort((a, b) => {
    const scoreDiff = preferenceScore(b, selectedTags) - preferenceScore(a, selectedTags);
    if (scoreDiff !== 0) return scoreDiff;
    return a.id.localeCompare(b.id);
  });
};

const pick = (
  familyId: string,
  userKey: string | null,
  date: Date,
  meal: BloomRecipe["mealTypes"][number],
  tags: Set<KitchenPreferenceTag>,
  offset = 0,
) => {
  const items = candidatesFor(meal, tags);
  if (!items.length) return null;
  // IMPORTANT PRODUCT INVARIANT:
  // - no custom filter => seed only by family + date, therefore everyone in that family sees the same menu;
  // - custom filter => include uid/filter signature, so personalization starts only after explicit user choice.
  const filterSignature = [...tags].sort().join(",");
  const seed = userKey
    ? `${familyId}|${userKey}|${filterSignature}|${meal}`
    : `${familyId}|shared-default|${meal}`;
  const base = hash(seed) % items.length;
  const stride = rotationStride(items.length);
  const index = (base + localDayOrdinal(date) * stride + offset) % items.length;
  return items[index];
};

export const homeKitchenService = {
  catalog: BLOOM_RECIPES_V1,
  localDayKey,
  hasCustomFilters,

  async saveMyPreferences(familyId: string, uid: string, tags: KitchenPreferenceTag[]) {
    const normalized = normalizeTags(tags);
    const ref = doc(getFirestore(), `${preferenceCollection(familyId)}/${uid}`);
    // "Ăn bình thường" is the absence of personalization. Deleting the preference doc
    // keeps default users on the exact same shared family menu and avoids unnecessary reads.
    if (!hasCustomFilters(normalized)) {
      await deleteDoc(ref).catch(() => {});
      return;
    }
    await setDoc(ref, { familyId, uid, tags: normalized, updatedAt: nowIso() });
  },

  async getMyPreferences(familyId: string, uid: string): Promise<HomeKitchenPreference | null> {
    const snap = await getDoc(doc(getFirestore(), `${preferenceCollection(familyId)}/${uid}`));
    return snap.exists() ? (snap.data() as HomeKitchenPreference) : null;
  },

  watchMyPreferences(
    familyId: string,
    uid: string,
    onChange: (item: HomeKitchenPreference | null) => void,
    onError?: (error: unknown) => void,
  ) {
    return onSnapshot(
      doc(getFirestore(), `${preferenceCollection(familyId)}/${uid}`),
      snap => onChange(snap.exists() ? (snap.data() as HomeKitchenPreference) : null),
      onError,
    );
  },

  dailyMenu(
    familyId: string,
    uid: string,
    date: Date,
    myTags: KitchenPreferenceTag[],
    swapOffsets: Partial<Record<"sang" | "trua" | "toi", number>> = {},
  ) {
    const normalized = normalizeTags(myTags);
    const custom = hasCustomFilters(normalized);
    const tags = new Set<KitchenPreferenceTag>(custom ? normalized : ["normal"]);
    const userKey = custom ? uid : null;
    // The shared default must stay identical for every family member. A local "Đổi món"
    // offset is therefore honored only after that user has explicitly enabled filters.
    const effectiveOffsets = custom ? swapOffsets : {};
    return {
      sang: pick(familyId, userKey, date, "sang", tags, effectiveOffsets.sang ?? 0),
      trua: pick(familyId, userKey, date, "trua", tags, effectiveOffsets.trua ?? 0),
      toi: pick(familyId, userKey, date, "toi", tags, effectiveOffsets.toi ?? 0),
      personalized: custom,
      dayKey: localDayKey(date),
    };
  },

  search(text: string, limit = 30): BloomRecipe[] {
    const q = text.trim().toLocaleLowerCase("vi");
    if (!q) return BLOOM_RECIPES_V1.slice(0, limit);
    return BLOOM_RECIPES_V1.filter(recipe => {
      const hay = [recipe.nameVi, recipe.category, recipe.summary, ...recipe.ingredients.map(i => i.name)]
        .join(" ")
        .toLocaleLowerCase("vi");
      return hay.includes(q);
    }).slice(0, limit);
  },
};
