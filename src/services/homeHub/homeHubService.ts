import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "@react-native-firebase/firestore";
import type { HomeHubPoll, HomeHubPollOption, HomeHubWhisper, HomeHubWhisperTone } from "../../types";
import { removeUndefinedDeep } from "../../utils/firestore";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";

const nowIso = () => new Date().toISOString();
const cleanText = (value: string, max: number) => value.trim().replace(/\s+/g, " ").slice(0, max);

const normalizeWhisper = (raw: Record<string, unknown>, id: string, familyId: string): HomeHubWhisper => ({
  id,
  familyId: typeof raw.familyId === "string" ? raw.familyId : familyId,
  authorUid: typeof raw.authorUid === "string" ? raw.authorUid : "",
  authorName: typeof raw.authorName === "string" && raw.authorName.trim() ? raw.authorName.trim() : "Một người trong nhà",
  message: typeof raw.message === "string" ? raw.message.trim() : "",
  tone: raw.tone === "thanks" || raw.tone === "miss" || raw.tone === "cheer" ? raw.tone : "warm",
  createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowIso(),
  updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : (typeof raw.createdAt === "string" ? raw.createdAt : nowIso()),
});

const normalizeOptions = (value: unknown): HomeHubPollOption[] => Array.isArray(value)
  ? value
    .map((item) => {
      const row = (item && typeof item === "object") ? item as Record<string, unknown> : {};
      const id = typeof row.id === "string" ? row.id : "";
      const label = typeof row.label === "string" ? row.label.trim() : "";
      return id && label ? { id, label } : null;
    })
    .filter((item): item is HomeHubPollOption => !!item)
    .slice(0, 6)
  : [];

const normalizeVotes = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, string>;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([, optionId]) => typeof optionId === "string" && optionId.length > 0)
    .map(([uid, optionId]) => [uid, String(optionId)]));
};

const normalizePoll = (raw: Record<string, unknown>, id: string, familyId: string): HomeHubPoll => {
  const options = normalizeOptions(raw.options);
  const optionIds = Array.isArray(raw.optionIds)
    ? raw.optionIds.filter((item): item is string => typeof item === "string")
    : options.map((item) => item.id);
  return {
    id,
    familyId: typeof raw.familyId === "string" ? raw.familyId : familyId,
    createdByUid: typeof raw.createdByUid === "string" ? raw.createdByUid : "",
    createdByName: typeof raw.createdByName === "string" && raw.createdByName.trim() ? raw.createdByName.trim() : "Một người trong nhà",
    question: typeof raw.question === "string" ? raw.question.trim() : "",
    options,
    optionIds,
    votes: normalizeVotes(raw.votes),
    status: raw.status === "closed" ? "closed" : "open",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : nowIso(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : (typeof raw.createdAt === "string" ? raw.createdAt : nowIso()),
  };
};

const makeOptionId = (index: number) => `o${index + 1}`;

export const homeHubService = {
  subscribeWhispers(
    familyId: string,
    onChange: (items: HomeHubWhisper[]) => void,
    onError?: (error: unknown) => void,
  ) {
    const q = query(
      collection(getFirestore(), FIRESTORE_PATHS.familyHomeWhispers(familyId)),
      orderBy("createdAt", "desc"),
      limit(30),
    );
    return onSnapshot(q, (snapshot) => {
      onChange(snapshot.docs.map((item) => normalizeWhisper(item.data() as Record<string, unknown>, item.id, familyId)));
    }, onError);
  },

  async createWhisper(input: {
    familyId: string;
    authorUid: string;
    authorName: string;
    message: string;
    tone?: HomeHubWhisperTone;
  }) {
    const message = cleanText(input.message, 500);
    if (!message) throw new Error("Hãy viết một lời nhỏ trước khi gửi nhé.");
    const ref = doc(collection(getFirestore(), FIRESTORE_PATHS.familyHomeWhispers(input.familyId)));
    const timestamp = nowIso();
    const payload: HomeHubWhisper = {
      id: ref.id,
      familyId: input.familyId,
      authorUid: input.authorUid,
      authorName: cleanText(input.authorName || "Một người trong nhà", 80),
      message,
      tone: input.tone ?? "warm",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await setDoc(ref, removeUndefinedDeep(payload));
    return payload;
  },

  async deleteWhisper(familyId: string, whisperId: string) {
    await deleteDoc(doc(getFirestore(), FIRESTORE_PATHS.familyHomeWhisper(familyId, whisperId)));
  },

  subscribePolls(
    familyId: string,
    onChange: (items: HomeHubPoll[]) => void,
    onError?: (error: unknown) => void,
  ) {
    const q = query(
      collection(getFirestore(), FIRESTORE_PATHS.familyHomePolls(familyId)),
      orderBy("createdAt", "desc"),
      limit(20),
    );
    return onSnapshot(q, (snapshot) => {
      onChange(snapshot.docs.map((item) => normalizePoll(item.data() as Record<string, unknown>, item.id, familyId)));
    }, onError);
  },

  async createPoll(input: {
    familyId: string;
    createdByUid: string;
    createdByName: string;
    question: string;
    options: string[];
  }) {
    const question = cleanText(input.question, 220);
    const labels = input.options.map((item) => cleanText(item, 100)).filter(Boolean).slice(0, 6);
    if (!question) throw new Error("Hãy viết câu hỏi để cả nhà cùng góp ý.");
    if (labels.length < 2) throw new Error("Biểu quyết cần ít nhất 2 lựa chọn.");
    const options = labels.map((label, index) => ({ id: makeOptionId(index), label }));
    const ref = doc(collection(getFirestore(), FIRESTORE_PATHS.familyHomePolls(input.familyId)));
    const timestamp = nowIso();
    const payload: HomeHubPoll = {
      id: ref.id,
      familyId: input.familyId,
      createdByUid: input.createdByUid,
      createdByName: cleanText(input.createdByName || "Một người trong nhà", 80),
      question,
      options,
      optionIds: options.map((item) => item.id),
      votes: {},
      status: "open",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await setDoc(ref, removeUndefinedDeep(payload));
    return payload;
  },

  async vote(familyId: string, poll: HomeHubPoll, uid: string, optionId: string) {
    if (poll.status !== "open") throw new Error("Biểu quyết này đã khép lại.");
    if (!poll.optionIds.includes(optionId)) throw new Error("Lựa chọn này không còn hợp lệ.");
    await updateDoc(doc(getFirestore(), FIRESTORE_PATHS.familyHomePoll(familyId, poll.id)), {
      [`votes.${uid}`]: optionId,
      updatedAt: nowIso(),
    });
  },

  async closePoll(familyId: string, pollId: string) {
    await updateDoc(doc(getFirestore(), FIRESTORE_PATHS.familyHomePoll(familyId, pollId)), {
      status: "closed",
      updatedAt: nowIso(),
    });
  },

  async deletePoll(familyId: string, pollId: string) {
    await deleteDoc(doc(getFirestore(), FIRESTORE_PATHS.familyHomePoll(familyId, pollId)));
  },
};
