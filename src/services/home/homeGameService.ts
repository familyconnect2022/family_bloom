import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";
import { GAME_COPY, GUESS_PERSON_CLUES, KNOW_EACH_OTHER_QUESTIONS, BINGO_CELLS, STORY_STARTERS } from "../../data/homeGameQuestionBank";
import type {
  HomeGamePrompt,
  HomeGameResponse,
  HomeGameSecret,
  HomeGameSession,
  HomeGameStatus,
  HomeGameType,
} from "../../types/homeLiving";
import { momentsService } from "../moments/momentsService";

const SESSION_LIMIT = 80;
const nowIso = () => new Date().toISOString();
const sessionsPath = (familyId: string) => `families/${familyId}/homeGameSessions`;
const sessionPath = (familyId: string, sessionId: string) => `${sessionsPath(familyId)}/${sessionId}`;
const responsePath = (familyId: string, sessionId: string, uid: string) => `${sessionPath(familyId, sessionId)}/responses/${uid}`;
const secretPath = (familyId: string, sessionId: string) => `${sessionPath(familyId, sessionId)}/secrets/main`;

const normalizePrompt = (raw: any): HomeGamePrompt => ({
  id: String(raw?.id ?? ""),
  prompt: String(raw?.prompt ?? ""),
  category: String(raw?.category ?? ""),
  options: Array.isArray(raw?.options) ? raw.options.filter((item: unknown): item is string => typeof item === "string") : [],
});

const normalizeSession = (id: string, raw: any): HomeGameSession => ({
  id,
  familyId: String(raw?.familyId ?? ""),
  gameType: raw?.gameType as HomeGameType,
  title: String(raw?.title ?? "Trò chơi Nhà Mình"),
  createdByUid: String(raw?.createdByUid ?? ""),
  createdByName: String(raw?.createdByName ?? "Người thân"),
  participantUids: Array.isArray(raw?.participantUids) ? raw.participantUids.filter((item: unknown): item is string => typeof item === "string") : [],
  participantNames: Array.isArray(raw?.participantNames) ? raw.participantNames.filter((item: unknown): item is string => typeof item === "string") : [],
  status: ["playing", "revealed", "completed"].includes(raw?.status) ? raw.status : "playing",
  prompts: Array.isArray(raw?.prompts) ? raw.prompts.map(normalizePrompt) : [],
  subjectUid: typeof raw?.subjectUid === "string" ? raw.subjectUid : null,
  subjectName: typeof raw?.subjectName === "string" ? raw.subjectName : null,
  turnUids: Array.isArray(raw?.turnUids) ? raw.turnUids.filter((item: unknown): item is string => typeof item === "string") : [],
  turnNames: Array.isArray(raw?.turnNames) ? raw.turnNames.filter((item: unknown): item is string => typeof item === "string") : [],
  bingoCellIds: Array.isArray(raw?.bingoCellIds) ? raw.bingoCellIds.filter((item: unknown): item is string => typeof item === "string") : [],
  memoryPreview: {
    caption: String(raw?.memoryPreview?.caption ?? ""),
    mediaUrl: String(raw?.memoryPreview?.mediaUrl ?? ""),
    mediaType: raw?.memoryPreview?.mediaType === "image" || raw?.memoryPreview?.mediaType === "video" ? raw.memoryPreview.mediaType : "none",
  },
  submittedUids: Array.isArray(raw?.submittedUids) ? raw.submittedUids.filter((item: unknown): item is string => typeof item === "string") : [],
  createdAt: String(raw?.createdAt ?? ""),
  updatedAt: String(raw?.updatedAt ?? raw?.createdAt ?? ""),
});

const normalizeResponse = (raw: any, uid = ""): HomeGameResponse => ({
  uid: String(raw?.uid ?? uid),
  displayName: String(raw?.displayName ?? "Thành viên"),
  answers: Array.isArray(raw?.answers) ? raw.answers.filter((item: unknown): item is string => typeof item === "string") : [],
  textLines: Array.isArray(raw?.textLines) ? raw.textLines.filter((item: unknown): item is string => typeof item === "string") : [],
  selectedIds: Array.isArray(raw?.selectedIds) ? raw.selectedIds.filter((item: unknown): item is string => typeof item === "string") : [],
  guessUid: typeof raw?.guessUid === "string" ? raw.guessUid : null,
  guessName: typeof raw?.guessName === "string" ? raw.guessName : null,
  choiceIndex: Number.isInteger(raw?.choiceIndex) ? Number(raw.choiceIndex) : null,
  public: raw?.public === true,
  submittedAt: String(raw?.submittedAt ?? ""),
  updatedAt: String(raw?.updatedAt ?? raw?.submittedAt ?? ""),
});

const normalizeSecret = (raw: any): HomeGameSecret => ({
  sessionId: String(raw?.sessionId ?? ""),
  familyId: String(raw?.familyId ?? ""),
  allowedUids: Array.isArray(raw?.allowedUids) ? raw.allowedUids.filter((item: unknown): item is string => typeof item === "string") : [],
  subjectUid: typeof raw?.subjectUid === "string" ? raw.subjectUid : null,
  subjectName: typeof raw?.subjectName === "string" ? raw.subjectName : null,
  memoryAuthorUid: typeof raw?.memoryAuthorUid === "string" ? raw.memoryAuthorUid : null,
  memoryAuthorName: typeof raw?.memoryAuthorName === "string" ? raw.memoryAuthorName : null,
  memoryMomentId: typeof raw?.memoryMomentId === "string" ? raw.memoryMomentId : null,
  lieIndex: Number.isInteger(raw?.lieIndex) ? Number(raw.lieIndex) : null,
  createdAt: String(raw?.createdAt ?? ""),
  updatedAt: String(raw?.updatedAt ?? raw?.createdAt ?? ""),
});

const hash = (input: string) => {
  let value = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
};

const seededPick = <T,>(items: T[], count: number, seed: string): T[] => {
  const pool = [...items];
  let state = hash(seed) || 1;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, Math.min(count, pool.length));
};

const uniqueParticipants = (uids: string[], names: string[]) => {
  const pairs = uids.map((uid, index) => ({ uid, name: names[index] || "Thành viên" })).filter(item => !!item.uid);
  const seen = new Set<string>();
  const clean = pairs.filter(item => !seen.has(item.uid) && seen.add(item.uid));
  return { uids: clean.map(item => item.uid), names: clean.map(item => item.name.trim().slice(0, 80) || "Thành viên") };
};

export type CreateHomeGameInput = {
  familyId: string;
  creatorUid: string;
  creatorName: string;
  gameType: HomeGameType;
  participantUids: string[];
  participantNames: string[];
  subjectUid?: string | null;
  subjectName?: string | null;
};

export type SubmitHomeGameResponseInput = {
  familyId: string;
  sessionId: string;
  uid: string;
  displayName: string;
  answers?: string[];
  textLines?: string[];
  selectedIds?: string[];
  guessUid?: string | null;
  guessName?: string | null;
  choiceIndex?: number | null;
  public?: boolean;
};

export const homeGameService = {
  sessionLimit: SESSION_LIMIT,

  async create(input: CreateHomeGameInput): Promise<string> {
    const db = getFirestore();
    const meta = GAME_COPY[input.gameType];
    if (!meta) throw new Error("Trò chơi chưa được hỗ trợ.");
    const participants = uniqueParticipants(input.participantUids, input.participantNames);
    if (!participants.uids.includes(input.creatorUid)) {
      participants.uids.unshift(input.creatorUid);
      participants.names.unshift(input.creatorName.trim().slice(0, 80) || "Bạn");
    }
    if (participants.uids.length < 2 && input.gameType !== "family_bingo") {
      throw new Error("Cần ít nhất 2 người trong Nhà Mình để bắt đầu ván này.");
    }
    if (participants.uids.length > 50) throw new Error("Một ván tối đa 50 người để giữ trải nghiệm nhẹ và dễ theo dõi.");

    const ref = doc(collection(db, sessionsPath(input.familyId)));
    const createdAt = nowIso();
    const seed = `${input.familyId}:${ref.id}:${createdAt}`;
    let prompts: HomeGamePrompt[] = [];
    let subjectUid: string | null = null;
    let subjectName: string | null = null;
    let turnUids: string[] = [];
    let turnNames: string[] = [];
    let bingoCellIds: string[] = [];
    let memoryPreview = { caption: "", mediaUrl: "", mediaType: "none" as const };
    let secret: HomeGameSecret | null = null;

    if (input.gameType === "know_each_other") {
      subjectUid = input.subjectUid || input.creatorUid;
      const subjectIndex = participants.uids.indexOf(subjectUid);
      if (subjectIndex < 0) throw new Error("Người được chọn phải nằm trong nhóm chơi.");
      subjectName = input.subjectName || participants.names[subjectIndex];
      prompts = seededPick(KNOW_EACH_OTHER_QUESTIONS, 5, seed);
    } else if (input.gameType === "guess_person") {
      const targetUid = input.subjectUid || seededPick(participants.uids, 1, seed)[0];
      const targetIndex = participants.uids.indexOf(targetUid);
      if (targetIndex < 0) throw new Error("Người bí mật phải nằm trong nhóm chơi.");
      const targetName = input.subjectName || participants.names[targetIndex];
      prompts = seededPick(GUESS_PERSON_CLUES, 3, seed);
      secret = {
        sessionId: ref.id,
        familyId: input.familyId,
        allowedUids: Array.from(new Set([input.creatorUid, targetUid])),
        subjectUid: targetUid,
        subjectName: targetName,
        memoryAuthorUid: null,
        memoryAuthorName: null,
        memoryMomentId: null,
        lieIndex: null,
        createdAt,
        updatedAt: createdAt,
      };
    } else if (input.gameType === "memory_owner") {
      const moments = (await momentsService.listFamilyTimelineOnce(input.familyId, 60))
        .filter(item => item.caption.trim().length > 0 || item.media.length > 0)
        .filter(item => participants.uids.includes(item.authorUid));
      if (!moments.length) throw new Error("Nhà Mình chưa có Moment phù hợp để chơi. Hãy lưu một kỷ niệm trước nhé.");
      const chosen = seededPick(moments, 1, seed)[0];
      const media = chosen.media[0];
      memoryPreview = {
        caption: chosen.caption.trim().slice(0, 700) || "Một khoảnh khắc đã được lưu trong Nhà Mình.",
        mediaUrl: media?.thumbnailUrl || media?.secureUrl || "",
        mediaType: media?.type === "video" ? "video" : media?.type === "image" ? "image" : "none",
      };
      secret = {
        sessionId: ref.id,
        familyId: input.familyId,
        allowedUids: [input.creatorUid],
        subjectUid: null,
        subjectName: null,
        memoryAuthorUid: chosen.authorUid,
        memoryAuthorName: chosen.authorName,
        memoryMomentId: chosen.id,
        lieIndex: null,
        createdAt,
        updatedAt: createdAt,
      };
    } else if (input.gameType === "truth_lie") {
      subjectUid = input.subjectUid || input.creatorUid;
      const subjectIndex = participants.uids.indexOf(subjectUid);
      if (subjectIndex < 0) throw new Error("Người ra câu phải nằm trong nhóm chơi.");
      subjectName = input.subjectName || participants.names[subjectIndex];
      secret = {
        sessionId: ref.id,
        familyId: input.familyId,
        allowedUids: Array.from(new Set([input.creatorUid, subjectUid])),
        subjectUid,
        subjectName,
        memoryAuthorUid: null,
        memoryAuthorName: null,
        memoryMomentId: null,
        lieIndex: null,
        createdAt,
        updatedAt: createdAt,
      };
    } else if (input.gameType === "story_chain") {
      const starterIndex = hash(seed) % STORY_STARTERS.length;
      prompts = [{ id: `story_${starterIndex}`, category: "Mở đầu", prompt: STORY_STARTERS[starterIndex], options: [] }];
      const order = seededPick(participants.uids.map((uid, index) => ({ uid, name: participants.names[index] })), participants.uids.length, seed);
      turnUids = order.map(item => item.uid);
      turnNames = order.map(item => item.name);
    } else if (input.gameType === "family_bingo") {
      const indices = seededPick(BINGO_CELLS.map((_, index) => index), 9, seed);
      bingoCellIds = indices.map(index => `bingo_${index}`);
    }

    const session: HomeGameSession = {
      id: ref.id,
      familyId: input.familyId,
      gameType: input.gameType,
      title: meta.title,
      createdByUid: input.creatorUid,
      createdByName: input.creatorName.trim().slice(0, 80) || "Người thân",
      participantUids: participants.uids,
      participantNames: participants.names,
      status: "playing",
      prompts,
      subjectUid,
      subjectName,
      turnUids,
      turnNames,
      bingoCellIds,
      memoryPreview,
      submittedUids: [],
      createdAt,
      updatedAt: createdAt,
    };

    const batch = writeBatch(db);
    batch.set(ref, session as unknown as Record<string, unknown>);
    if (secret) batch.set(doc(db, secretPath(input.familyId, ref.id)), secret as unknown as Record<string, unknown>);
    await batch.commit();
    return ref.id;
  },

  watchVisible(familyId: string, uid: string, onChange: (items: HomeGameSession[]) => void, onError?: (error: unknown) => void) {
    const q = query(collection(getFirestore(), sessionsPath(familyId)), where("participantUids", "array-contains", uid), limit(SESSION_LIMIT));
    return onSnapshot(q, snap => {
      const rows = snap.docs.map(row => normalizeSession(row.id, row.data())).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      onChange(rows);
    }, onError);
  },

  watchSession(familyId: string, sessionId: string, onChange: (item: HomeGameSession | null) => void, onError?: (error: unknown) => void) {
    return onSnapshot(doc(getFirestore(), sessionPath(familyId, sessionId)), snap => {
      onChange(snap.exists() ? normalizeSession(snap.id, snap.data()) : null);
    }, onError);
  },

  watchPublicResponses(familyId: string, sessionId: string, onChange: (items: HomeGameResponse[]) => void, onError?: (error: unknown) => void) {
    const q = query(collection(getFirestore(), `${sessionPath(familyId, sessionId)}/responses`), where("public", "==", true), limit(60));
    return onSnapshot(q, snap => onChange(snap.docs.map(row => normalizeResponse(row.data(), row.id))), onError);
  },

  async getMyResponse(familyId: string, sessionId: string, uid: string): Promise<HomeGameResponse | null> {
    const snap = await getDoc(doc(getFirestore(), responsePath(familyId, sessionId, uid)));
    return snap.exists() ? normalizeResponse(snap.data(), uid) : null;
  },

  async listResponses(familyId: string, sessionId: string): Promise<HomeGameResponse[]> {
    const snap = await getDocs(query(collection(getFirestore(), `${sessionPath(familyId, sessionId)}/responses`), limit(60)));
    return snap.docs.map(row => normalizeResponse(row.data(), row.id));
  },

  async getSecret(familyId: string, sessionId: string): Promise<HomeGameSecret | null> {
    try {
      const snap = await getDoc(doc(getFirestore(), secretPath(familyId, sessionId)));
      return snap.exists() ? normalizeSecret(snap.data()) : null;
    } catch {
      return null;
    }
  },

  async submitResponse(input: SubmitHomeGameResponseInput): Promise<void> {
    const db = getFirestore();
    const sRef = doc(db, sessionPath(input.familyId, input.sessionId));
    const rRef = doc(db, responsePath(input.familyId, input.sessionId, input.uid));
    const updatedAt = nowIso();
    await runTransaction(db, async tx => {
      const sSnap = await tx.get(sRef);
      if (!sSnap.exists()) throw new Error("Ván chơi không còn tồn tại.");
      const session = normalizeSession(sSnap.id, sSnap.data());
      if (!session.participantUids.includes(input.uid)) throw new Error("Bạn không thuộc ván chơi này.");
      if (session.status !== "playing" && session.gameType !== "family_bingo") throw new Error("Ván chơi đã mở kết quả.");

      const existing = await tx.get(rRef);
      const response: HomeGameResponse = {
        uid: input.uid,
        displayName: input.displayName.trim().slice(0, 80) || "Thành viên",
        answers: (input.answers ?? []).slice(0, 10).map(value => value.slice(0, 220)),
        textLines: (input.textLines ?? []).slice(0, 3).map(value => value.trim().slice(0, 400)),
        selectedIds: Array.from(new Set((input.selectedIds ?? []).slice(0, 9))),
        guessUid: input.guessUid || null,
        guessName: input.guessName?.trim().slice(0, 80) || null,
        choiceIndex: Number.isInteger(input.choiceIndex) ? input.choiceIndex! : null,
        public: input.public === true,
        submittedAt: existing.exists() ? normalizeResponse(existing.data()).submittedAt || updatedAt : updatedAt,
        updatedAt,
      };
      tx.set(rRef, response as unknown as Record<string, unknown>);
      if (!session.submittedUids.includes(input.uid)) {
        tx.update(sRef, { submittedUids: [...session.submittedUids, input.uid], updatedAt });
      } else {
        tx.update(sRef, { updatedAt });
      }
    });
  },

  async submitTruthStatements(input: SubmitHomeGameResponseInput & { lieIndex: number }): Promise<void> {
    if (input.textLines?.filter(Boolean).length !== 3) throw new Error("Hãy viết đủ 3 câu trước khi gửi.");
    if (input.lieIndex < 0 || input.lieIndex > 2) throw new Error("Hãy chọn câu bịa.");
    const db = getFirestore();
    const sRef = doc(db, sessionPath(input.familyId, input.sessionId));
    const rRef = doc(db, responsePath(input.familyId, input.sessionId, input.uid));
    const secretRef = doc(db, secretPath(input.familyId, input.sessionId));
    const updatedAt = nowIso();
    await runTransaction(db, async tx => {
      const [sSnap, secretSnap] = await Promise.all([tx.get(sRef), tx.get(secretRef)]);
      if (!sSnap.exists() || !secretSnap.exists()) throw new Error("Ván chơi chưa sẵn sàng.");
      const session = normalizeSession(sSnap.id, sSnap.data());
      const secret = normalizeSecret(secretSnap.data());
      if (session.gameType !== "truth_lie" || secret.subjectUid !== input.uid) throw new Error("Chỉ người ra câu mới được tạo ba câu chuyện.");
      const response: HomeGameResponse = {
        uid: input.uid,
        displayName: input.displayName.trim().slice(0, 80) || "Thành viên",
        answers: [],
        textLines: input.textLines!.map(value => value.trim().slice(0, 400)),
        selectedIds: [],
        guessUid: null,
        guessName: null,
        choiceIndex: null,
        public: true,
        submittedAt: updatedAt,
        updatedAt,
      };
      tx.set(rRef, response as unknown as Record<string, unknown>);
      tx.update(secretRef, { lieIndex: input.lieIndex, updatedAt });
      tx.update(sRef, { submittedUids: Array.from(new Set([...session.submittedUids, input.uid])), updatedAt });
    });
  },

  async setStatus(familyId: string, sessionId: string, actorUid: string, status: HomeGameStatus): Promise<void> {
    const db = getFirestore();
    const ref = doc(db, sessionPath(familyId, sessionId));
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("Ván chơi không còn tồn tại.");
      const session = normalizeSession(snap.id, snap.data());
      if (session.createdByUid !== actorUid) throw new Error("Chỉ người tạo ván mới được mở kết quả.");
      tx.update(ref, { status, updatedAt: nowIso() });
    });
  },

  async delete(familyId: string, sessionId: string, actorUid: string): Promise<void> {
    const db = getFirestore();
    const ref = doc(db, sessionPath(familyId, sessionId));
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const session = normalizeSession(snap.id, snap.data());
    if (session.createdByUid !== actorUid) throw new Error("Chỉ người tạo ván mới được xóa ván.");
    const responses = await getDocs(query(collection(db, `${sessionPath(familyId, sessionId)}/responses`), limit(60)));
    const batch = writeBatch(db);
    responses.docs.forEach(row => batch.delete(row.ref));
    if (["guess_person", "memory_owner", "truth_lie"].includes(session.gameType)) {
      batch.delete(doc(db, secretPath(familyId, sessionId)));
    }
    batch.delete(ref);
    await batch.commit();
  },

  simulated(familyId: string, uid: string, displayName: string, count: number): HomeGameSession[] {
    const types: HomeGameType[] = ["know_each_other", "guess_person", "memory_owner", "truth_lie", "story_chain", "family_bingo"];
    const safeCount = Math.max(1, Math.min(count, 100));
    return Array.from({ length: safeCount }, (_, index) => {
      const gameType = types[index % types.length];
      const meta = GAME_COPY[gameType];
      const d = new Date(Date.now() - index * 36 * 60 * 1000);
      return {
        id: `sim-${index}`,
        familyId,
        gameType,
        title: meta.title,
        createdByUid: uid,
        createdByName: displayName,
        participantUids: [uid, "demo-a", "demo-b", "demo-c"],
        participantNames: [displayName, "Hà", "Minh", "Lan"],
        status: index % 4 === 0 ? "revealed" : "playing",
        prompts: gameType === "know_each_other" ? KNOW_EACH_OTHER_QUESTIONS.slice(index % 10, index % 10 + 5) : [],
        subjectUid: gameType === "know_each_other" || gameType === "truth_lie" ? uid : null,
        subjectName: gameType === "know_each_other" || gameType === "truth_lie" ? displayName : null,
        turnUids: gameType === "story_chain" ? [uid, "demo-a", "demo-b", "demo-c"] : [],
        turnNames: gameType === "story_chain" ? [displayName, "Hà", "Minh", "Lan"] : [],
        bingoCellIds: gameType === "family_bingo" ? Array.from({ length: 9 }, (_, i) => `bingo_${(index * 3 + i) % BINGO_CELLS.length}`) : [],
        memoryPreview: gameType === "memory_owner" ? { caption: "Một buổi chiều cả nhà cùng ngồi lại và cười rất lâu vì một chuyện nhỏ.", mediaUrl: "", mediaType: "none" } : { caption: "", mediaUrl: "", mediaType: "none" },
        submittedUids: index % 3 === 0 ? [uid, "demo-a"] : [uid],
        createdAt: d.toISOString(),
        updatedAt: d.toISOString(),
      };
    });
  },
};
