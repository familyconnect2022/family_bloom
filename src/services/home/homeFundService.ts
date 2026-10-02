import {
  collection,
  doc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  where,
} from "@react-native-firebase/firestore";
import type {
  HomeFundAuditAction,
  HomeFundAuditEvent,
  HomeFundCategory,
  HomeFundControl,
  HomeFundMonthTotals,
  HomeFundStats,
  HomeFundStatsBucket,
  HomeFundStatsPeriod,
  HomeFundSummary,
  HomeFundTransaction,
  HomeFundTransactionType,
} from "@/types/homeLiving";
import { FIRESTORE_PATHS } from "../firebase/firestorePaths";

const PAGE_SIZE = 30;
const MONTH_SCAN_LIMIT = 501;
const STATS_SCAN_LIMIT = 1001;
const AUDIT_PAGE_SIZE = 30;
const MAX_AMOUNT_VND = 1_000_000_000;
const EDIT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const nowIso = () => new Date().toISOString();

export type HomeFundPageCursor = unknown | null;
export type HomeFundPage = {
  items: HomeFundTransaction[];
  cursor: HomeFundPageCursor;
  hasMore: boolean;
};

export type HomeFundMutationInput = {
  familyId: string;
  type: HomeFundTransactionType;
  amountVnd: number;
  category: HomeFundCategory;
  note: string;
  occurredOn: string;
  actorUid: string;
  actorName: string;
};

export type HomeFundUpdateInput = HomeFundMutationInput & {
  transactionId: string;
};

export type HomeFundAssistantInput = { uid: string; task: string };

const CATEGORY_SET = new Set<HomeFundCategory>([
  "contribution",
  "groceries",
  "household",
  "event",
  "travel",
  "gift",
  "refund",
  "other",
]);

const cleanText = (value: string, max: number) => value.trim().replace(/\s+/g, " ").slice(0, max);
const monthKeyFor = (dateOnly: string) => dateOnly.slice(0, 7);
const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const localDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const todayKey = () => localDateKey(new Date());

const normalizeMoney = (value: unknown) => {
  const number = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
  return number;
};

const timestampMillis = (value: unknown): number | null => {
  if (!value || typeof value !== "object") return null;
  const maybe = value as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
  if (typeof maybe.toMillis === "function") {
    const result = maybe.toMillis();
    return Number.isFinite(result) ? result : null;
  }
  if (typeof maybe.seconds === "number") return maybe.seconds * 1000 + Math.floor((maybe.nanoseconds ?? 0) / 1_000_000);
  return null;
};

const normalizeSummary = (familyId: string, raw?: Record<string, unknown>): HomeFundSummary => ({
  familyId,
  balanceVnd: normalizeMoney(raw?.balanceVnd),
  totalIncomeVnd: Math.max(0, normalizeMoney(raw?.totalIncomeVnd)),
  totalExpenseVnd: Math.max(0, normalizeMoney(raw?.totalExpenseVnd)),
  transactionCount: Math.max(0, normalizeMoney(raw?.transactionCount)),
  lastMutationId: typeof raw?.lastMutationId === "string" ? raw.lastMutationId : null,
  lastMutationKind: raw?.lastMutationKind === "create" || raw?.lastMutationKind === "update" || raw?.lastMutationKind === "delete"
    ? raw.lastMutationKind
    : null,
  lastAuditId: typeof raw?.lastAuditId === "string" ? raw.lastAuditId : null,
  updatedByUid: typeof raw?.updatedByUid === "string" ? raw.updatedByUid : null,
  updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : null,
});

const isLegacyVoided = (raw: Record<string, unknown>) => raw.status === "voided";

const normalizeTransaction = (id: string, raw: Record<string, unknown>): HomeFundTransaction => ({
  id,
  familyId: typeof raw.familyId === "string" ? raw.familyId : "",
  type: raw.type === "expense" ? "expense" : "income",
  amountVnd: Math.max(0, normalizeMoney(raw.amountVnd)),
  category: CATEGORY_SET.has(raw.category as HomeFundCategory) ? raw.category as HomeFundCategory : "other",
  note: typeof raw.note === "string" ? raw.note : "",
  occurredOn: typeof raw.occurredOn === "string" ? raw.occurredOn : "",
  monthKey: typeof raw.monthKey === "string" ? raw.monthKey : "",
  createdByUid: typeof raw.createdByUid === "string" ? raw.createdByUid : "",
  createdByName: typeof raw.createdByName === "string" ? raw.createdByName : "Người thân",
  createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
  createdAtMillis: timestampMillis(raw.createdAtTs),
  updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  updatedByUid: typeof raw.updatedByUid === "string" ? raw.updatedByUid : "",
  revision: Math.max(1, normalizeMoney(raw.revision) || 1),
});

const normalizeControl = (familyId: string, raw: Record<string, unknown>): HomeFundControl => {
  const assistantUids = Array.isArray(raw.assistantUids)
    ? raw.assistantUids.filter((uid): uid is string => typeof uid === "string").slice(0, 2)
    : [];
  const rawTasks = raw.assistantTasks && typeof raw.assistantTasks === "object" ? raw.assistantTasks as Record<string, unknown> : {};
  const assistantTasks = assistantUids.reduce<Record<string, string>>((acc, uid) => {
    acc[uid] = typeof rawTasks[uid] === "string" ? String(rawTasks[uid]) : "";
    return acc;
  }, {});
  return {
    familyId,
    primaryUid: typeof raw.primaryUid === "string" ? raw.primaryUid : "",
    assistantUids,
    assistantTasks,
    pendingTransferToUid: typeof raw.pendingTransferToUid === "string" ? raw.pendingTransferToUid : null,
    pendingTransferRequestedByUid: typeof raw.pendingTransferRequestedByUid === "string" ? raw.pendingTransferRequestedByUid : null,
    pendingTransferRequestedAt: typeof raw.pendingTransferRequestedAt === "string" ? raw.pendingTransferRequestedAt : null,
    pendingTransferNote: typeof raw.pendingTransferNote === "string" ? raw.pendingTransferNote : null,
    version: Math.max(1, normalizeMoney(raw.version) || 1),
    lastAuditId: typeof raw.lastAuditId === "string" ? raw.lastAuditId : null,
    updatedByUid: typeof raw.updatedByUid === "string" ? raw.updatedByUid : "",
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
  };
};

const AUDIT_ACTIONS = new Set<HomeFundAuditAction>([
  "create", "update", "delete", "control_init", "handover_request", "handover_accept",
  "handover_decline", "handover_cancel", "team_update",
]);

const normalizeAudit = (id: string, raw: Record<string, unknown>): HomeFundAuditEvent | null => {
  if (!AUDIT_ACTIONS.has(raw.action as HomeFundAuditAction)) return null;
  return {
    id,
    familyId: typeof raw.familyId === "string" ? raw.familyId : "",
    action: raw.action as HomeFundAuditAction,
    transactionId: typeof raw.transactionId === "string" ? raw.transactionId : null,
    actorUid: typeof raw.actorUid === "string" ? raw.actorUid : "",
    actorName: typeof raw.actorName === "string" ? raw.actorName : "Người thân",
    targetUid: typeof raw.targetUid === "string" ? raw.targetUid : null,
    detail: typeof raw.detail === "string" ? raw.detail : "",
    beforeLabel: typeof raw.beforeLabel === "string" ? raw.beforeLabel : null,
    afterLabel: typeof raw.afterLabel === "string" ? raw.afterLabel : null,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
  };
};

const validateInput = (input: HomeFundMutationInput) => {
  if (!input.familyId || !input.actorUid) throw new Error("Không xác định được Nhà Mình hiện tại.");
  const amountVnd = Math.trunc(input.amountVnd);
  if (!Number.isFinite(amountVnd) || amountVnd <= 0) throw new Error("Số tiền phải lớn hơn 0.");
  if (amountVnd > MAX_AMOUNT_VND) throw new Error("Mỗi khoản thu/chi tối đa 1 tỷ đồng.");
  if (input.type !== "income" && input.type !== "expense") throw new Error("Loại giao dịch không hợp lệ.");
  if (!CATEGORY_SET.has(input.category)) throw new Error("Nhóm thu/chi không hợp lệ.");
  if (!isDateOnly(input.occurredOn) || input.occurredOn > todayKey()) throw new Error("Ngày ghi quỹ không hợp lệ.");
  return {
    amountVnd,
    note: cleanText(input.note, 240),
    actorName: cleanText(input.actorName || "Người thân", 80) || "Người thân",
  };
};

const signed = (type: HomeFundTransactionType, amountVnd: number) => type === "income" ? amountVnd : -amountVnd;
const incomePart = (item: Pick<HomeFundTransaction, "type" | "amountVnd">) => item.type === "income" ? item.amountVnd : 0;
const expensePart = (item: Pick<HomeFundTransaction, "type" | "amountVnd">) => item.type === "expense" ? item.amountVnd : 0;

const summaryAfterCreate = (
  current: HomeFundSummary,
  item: Pick<HomeFundTransaction, "id" | "type" | "amountVnd">,
  actorUid: string,
  timestamp: string,
  auditId: string,
): HomeFundSummary => ({
  ...current,
  balanceVnd: current.balanceVnd + signed(item.type, item.amountVnd),
  totalIncomeVnd: current.totalIncomeVnd + incomePart(item),
  totalExpenseVnd: current.totalExpenseVnd + expensePart(item),
  transactionCount: current.transactionCount + 1,
  lastMutationId: item.id,
  lastMutationKind: "create",
  lastAuditId: auditId,
  updatedByUid: actorUid,
  updatedAt: timestamp,
});

const summaryAfterUpdate = (
  current: HomeFundSummary,
  before: Pick<HomeFundTransaction, "id" | "type" | "amountVnd">,
  after: Pick<HomeFundTransaction, "type" | "amountVnd">,
  actorUid: string,
  timestamp: string,
  auditId: string,
): HomeFundSummary => ({
  ...current,
  balanceVnd: current.balanceVnd - signed(before.type, before.amountVnd) + signed(after.type, after.amountVnd),
  totalIncomeVnd: current.totalIncomeVnd - incomePart(before) + incomePart(after),
  totalExpenseVnd: current.totalExpenseVnd - expensePart(before) + expensePart(after),
  lastMutationId: before.id,
  lastMutationKind: "update",
  lastAuditId: auditId,
  updatedByUid: actorUid,
  updatedAt: timestamp,
});

const summaryAfterDelete = (
  current: HomeFundSummary,
  before: Pick<HomeFundTransaction, "id" | "type" | "amountVnd">,
  actorUid: string,
  timestamp: string,
  auditId: string,
): HomeFundSummary => ({
  ...current,
  balanceVnd: current.balanceVnd - signed(before.type, before.amountVnd),
  totalIncomeVnd: Math.max(0, current.totalIncomeVnd - incomePart(before)),
  totalExpenseVnd: Math.max(0, current.totalExpenseVnd - expensePart(before)),
  transactionCount: Math.max(0, current.transactionCount - 1),
  lastMutationId: before.id,
  lastMutationKind: "delete",
  lastAuditId: auditId,
  updatedByUid: actorUid,
  updatedAt: timestamp,
});

const auditPayload = (
  familyId: string,
  action: HomeFundAuditAction,
  actorUid: string,
  actorName: string,
  detail: string,
  transactionId: string | null = null,
  targetUid: string | null = null,
  beforeLabel: string | null = null,
  afterLabel: string | null = null,
) => ({
  familyId,
  action,
  transactionId,
  actorUid,
  actorName: cleanText(actorName || "Người thân", 80) || "Người thân",
  targetUid,
  detail: cleanText(detail, 300),
  beforeLabel: beforeLabel ? cleanText(beforeLabel, 420) : null,
  afterLabel: afterLabel ? cleanText(afterLabel, 420) : null,
  createdAt: nowIso(),
  createdAtTs: serverTimestamp(),
});

const auditMoneyLabel = (item: Pick<HomeFundTransaction, "type" | "amountVnd" | "category" | "note" | "occurredOn">) => {
  const direction = item.type === "income" ? "Thu" : "Chi";
  const note = cleanText(item.note || "", 80);
  return `${direction} ${Math.trunc(item.amountVnd).toLocaleString("vi-VN")}đ · ${item.category} · ${item.occurredOn}${note ? ` · ${note}` : ""}`;
};

const assertEditableWindow = (item: HomeFundTransaction) => {
  if (!item.createdAtMillis) throw new Error("Khoản này đã được khóa vì không còn trong thời gian chỉnh sửa.");
  if (Date.now() >= item.createdAtMillis + EDIT_WINDOW_MS) {
    throw new Error("Khoản này đã quá 3 ngày nên không thể sửa hoặc xóa. Nếu cần sửa sai, hãy ghi thêm một khoản điều chỉnh.");
  }
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const addMonths = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth() + amount, 1);
const addYears = (date: Date, amount: number) => new Date(date.getFullYear() + amount, 0, 1);

const statsBuckets = (period: HomeFundStatsPeriod, anchor = new Date()): { startKey: string; buckets: HomeFundStatsBucket[] } => {
  if (period === "day") {
    const start = addDays(startOfDay(anchor), -6);
    return {
      startKey: localDateKey(start),
      buckets: Array.from({ length: 7 }, (_, i) => {
        const d = addDays(start, i);
        return { key: localDateKey(d), label: d.toLocaleDateString("vi-VN", { weekday: "short" }), incomeVnd: 0, expenseVnd: 0, transactionCount: 0 };
      }),
    };
  }
  if (period === "month") {
    const start = addMonths(anchor, -5);
    return {
      startKey: localDateKey(start),
      buckets: Array.from({ length: 6 }, (_, i) => {
        const d = addMonths(start, i);
        return { key: localDateKey(d).slice(0, 7), label: `T${d.getMonth() + 1}`, incomeVnd: 0, expenseVnd: 0, transactionCount: 0 };
      }),
    };
  }
  const start = addYears(anchor, -4);
  return {
    startKey: localDateKey(start),
    buckets: Array.from({ length: 5 }, (_, i) => {
      const d = addYears(start, i);
      return { key: String(d.getFullYear()), label: String(d.getFullYear()), incomeVnd: 0, expenseVnd: 0, transactionCount: 0 };
    }),
  };
};

const aggregateStats = (period: HomeFundStatsPeriod, rows: HomeFundTransaction[], capped: boolean, simulated = false): HomeFundStats => {
  const template = statsBuckets(period);
  const map = new Map(template.buckets.map((bucket) => [bucket.key, { ...bucket }]));
  for (const item of rows) {
    const key = period === "day" ? item.occurredOn : period === "month" ? item.occurredOn.slice(0, 7) : item.occurredOn.slice(0, 4);
    const bucket = map.get(key);
    if (!bucket) continue;
    if (item.type === "income") bucket.incomeVnd += item.amountVnd;
    else bucket.expenseVnd += item.amountVnd;
    bucket.transactionCount += 1;
  }
  const buckets = template.buckets.map((bucket) => map.get(bucket.key) ?? bucket);
  return {
    period,
    buckets,
    incomeVnd: buckets.reduce((sum, bucket) => sum + bucket.incomeVnd, 0),
    expenseVnd: buckets.reduce((sum, bucket) => sum + bucket.expenseVnd, 0),
    transactionCount: buckets.reduce((sum, bucket) => sum + bucket.transactionCount, 0),
    capped,
    simulated,
  };
};

const mockStats = (period: HomeFundStatsPeriod): HomeFundStats => {
  const { buckets } = statsBuckets(period);
  const seeded = buckets.map((bucket, index) => ({
    ...bucket,
    incomeVnd: (2 + ((index * 7 + 3) % 6)) * 450_000,
    expenseVnd: (1 + ((index * 5 + 2) % 7)) * 320_000,
    transactionCount: 4 + ((index * 11) % 9),
  }));
  return {
    period,
    buckets: seeded,
    incomeVnd: seeded.reduce((sum, bucket) => sum + bucket.incomeVnd, 0),
    expenseVnd: seeded.reduce((sum, bucket) => sum + bucket.expenseVnd, 0),
    transactionCount: seeded.reduce((sum, bucket) => sum + bucket.transactionCount, 0),
    capped: false,
    simulated: true,
  };
};

export const homeFundService = {
  pageSize: PAGE_SIZE,
  maxAmountVnd: MAX_AMOUNT_VND,
  editWindowMs: EDIT_WINDOW_MS,

  subscribeSummary(
    familyId: string,
    onChange: (summary: HomeFundSummary) => void,
    onError?: (error: unknown) => void,
  ) {
    return onSnapshot(
      doc(getFirestore(), FIRESTORE_PATHS.familyHomeFundSummary(familyId)),
      (snap) => onChange(normalizeSummary(familyId, snap.exists() ? snap.data() as Record<string, unknown> : undefined)),
      onError,
    );
  },

  subscribeControl(
    familyId: string,
    onChange: (control: HomeFundControl | null) => void,
    onError?: (error: unknown) => void,
  ) {
    return onSnapshot(
      doc(getFirestore(), FIRESTORE_PATHS.familyHomeFundControl(familyId)),
      (snap) => onChange(snap.exists() ? normalizeControl(familyId, snap.data() as Record<string, unknown>) : null),
      onError,
    );
  },

  subscribeRecent(
    familyId: string,
    onChange: (page: HomeFundPage) => void,
    onError?: (error: unknown) => void,
  ) {
    const q = query(
      collection(getFirestore(), FIRESTORE_PATHS.familyHomeFundTransactions(familyId)),
      orderBy("occurredOn", "desc"),
      limit(PAGE_SIZE),
    );
    return onSnapshot(q, (snap) => {
      const items = snap.docs
        .filter((row) => !isLegacyVoided(row.data() as Record<string, unknown>))
        .map((row) => normalizeTransaction(row.id, row.data() as Record<string, unknown>))
        .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt));
      onChange({
        items,
        cursor: snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null,
        hasMore: snap.docs.length === PAGE_SIZE,
      });
    }, onError);
  },

  async ensureInitialControl(familyId: string, actorUid: string, actorName: string): Promise<void> {
    const db = getFirestore();
    const familyRef = doc(db, `families/${familyId}`);
    const controlRef = doc(db, FIRESTORE_PATHS.familyHomeFundControl(familyId));
    await runTransaction(db, async (tx) => {
      const [familySnap, controlSnap] = await Promise.all([tx.get(familyRef), tx.get(controlRef)]);
      if (controlSnap.exists()) return;
      if (!familySnap.exists()) throw new Error("Không tìm thấy Nhà Mình.");
      const ownerId = (familySnap.data() as { ownerId?: unknown }).ownerId;
      if (ownerId !== actorUid) throw new Error("Admin mặc định chưa khởi tạo sổ quỹ. Hãy nhờ Admin mở Quỹ gia đình một lần.");
      const auditRef = doc(collection(db, FIRESTORE_PATHS.familyHomeFundAudit(familyId)));
      const timestamp = nowIso();
      tx.set(auditRef, auditPayload(familyId, "control_init", actorUid, actorName, "Admin trở thành thủ quỹ mặc định."));
      tx.set(controlRef, {
        familyId,
        primaryUid: actorUid,
        assistantUids: [],
        assistantTasks: {},
        pendingTransferToUid: null,
        pendingTransferRequestedByUid: null,
        pendingTransferRequestedAt: null,
        pendingTransferNote: null,
        version: 1,
        lastAuditId: auditRef.id,
        updatedByUid: actorUid,
        updatedAt: timestamp,
        updatedAtTs: serverTimestamp(),
      });
    });
  },

  async requestHandover(input: { familyId: string; actorUid: string; actorName: string; targetUid: string; note?: string }): Promise<void> {
    const db = getFirestore();
    const controlRef = doc(db, FIRESTORE_PATHS.familyHomeFundControl(input.familyId));
    await runTransaction(db, async (tx) => {
      const controlSnap = await tx.get(controlRef);
      if (!controlSnap.exists()) throw new Error("Sổ quỹ chưa được Admin khởi tạo.");
      const current = normalizeControl(input.familyId, controlSnap.data() as Record<string, unknown>);
      if (current.primaryUid !== input.actorUid) throw new Error("Chỉ thủ quỹ chính mới có thể bàn giao quỹ.");
      if (!input.targetUid || input.targetUid === input.actorUid) throw new Error("Hãy chọn một người khác trong Nhà Mình.");
      const memberSnap = await tx.get(doc(db, FIRESTORE_PATHS.familyMember(input.familyId, input.targetUid)));
      if (!memberSnap.exists()) throw new Error("Người được chọn không còn là thành viên Nhà Mình.");
      const auditRef = doc(collection(db, FIRESTORE_PATHS.familyHomeFundAudit(input.familyId)));
      const timestamp = nowIso();
      tx.set(auditRef, auditPayload(input.familyId, "handover_request", input.actorUid, input.actorName, cleanText(input.note || "Đề nghị bàn giao trách nhiệm thủ quỹ.", 300), null, input.targetUid));
      tx.set(controlRef, {
        ...controlSnap.data(),
        pendingTransferToUid: input.targetUid,
        pendingTransferRequestedByUid: input.actorUid,
        pendingTransferRequestedAt: timestamp,
        pendingTransferNote: cleanText(input.note || "", 200) || null,
        version: current.version + 1,
        lastAuditId: auditRef.id,
        updatedByUid: input.actorUid,
        updatedAt: timestamp,
        updatedAtTs: serverTimestamp(),
      });
    });
  },

  async resolveHandover(input: { familyId: string; actorUid: string; actorName: string; accept: boolean }): Promise<void> {
    const db = getFirestore();
    const controlRef = doc(db, FIRESTORE_PATHS.familyHomeFundControl(input.familyId));
    await runTransaction(db, async (tx) => {
      const controlSnap = await tx.get(controlRef);
      if (!controlSnap.exists()) throw new Error("Sổ quỹ chưa được khởi tạo.");
      const current = normalizeControl(input.familyId, controlSnap.data() as Record<string, unknown>);
      if (current.pendingTransferToUid !== input.actorUid) throw new Error("Không có lời mời bàn giao nào dành cho bạn.");
      const auditRef = doc(collection(db, FIRESTORE_PATHS.familyHomeFundAudit(input.familyId)));
      const timestamp = nowIso();
      const action: HomeFundAuditAction = input.accept ? "handover_accept" : "handover_decline";
      tx.set(auditRef, auditPayload(
        input.familyId,
        action,
        input.actorUid,
        input.actorName,
        input.accept ? "Đã nhận trách nhiệm thủ quỹ chính." : "Đã từ chối nhận trách nhiệm thủ quỹ.",
        null,
        current.pendingTransferRequestedByUid,
      ));
      tx.set(controlRef, {
        ...controlSnap.data(),
        primaryUid: input.accept ? input.actorUid : current.primaryUid,
        assistantUids: input.accept ? [] : current.assistantUids,
        assistantTasks: input.accept ? {} : current.assistantTasks,
        pendingTransferToUid: null,
        pendingTransferRequestedByUid: null,
        pendingTransferRequestedAt: null,
        pendingTransferNote: null,
        version: current.version + 1,
        lastAuditId: auditRef.id,
        updatedByUid: input.actorUid,
        updatedAt: timestamp,
        updatedAtTs: serverTimestamp(),
      });
    });
  },

  async cancelHandover(input: { familyId: string; actorUid: string; actorName: string }): Promise<void> {
    const db = getFirestore();
    const controlRef = doc(db, FIRESTORE_PATHS.familyHomeFundControl(input.familyId));
    await runTransaction(db, async (tx) => {
      const controlSnap = await tx.get(controlRef);
      if (!controlSnap.exists()) return;
      const current = normalizeControl(input.familyId, controlSnap.data() as Record<string, unknown>);
      if (current.primaryUid !== input.actorUid) throw new Error("Chỉ thủ quỹ chính mới có thể hủy bàn giao.");
      if (!current.pendingTransferToUid) return;
      const auditRef = doc(collection(db, FIRESTORE_PATHS.familyHomeFundAudit(input.familyId)));
      const timestamp = nowIso();
      tx.set(auditRef, auditPayload(input.familyId, "handover_cancel", input.actorUid, input.actorName, "Đã hủy lời mời bàn giao quỹ.", null, current.pendingTransferToUid));
      tx.set(controlRef, {
        ...controlSnap.data(),
        pendingTransferToUid: null,
        pendingTransferRequestedByUid: null,
        pendingTransferRequestedAt: null,
        pendingTransferNote: null,
        version: current.version + 1,
        lastAuditId: auditRef.id,
        updatedByUid: input.actorUid,
        updatedAt: timestamp,
        updatedAtTs: serverTimestamp(),
      });
    });
  },

  async updateAssistants(input: { familyId: string; actorUid: string; actorName: string; assistants: HomeFundAssistantInput[] }): Promise<void> {
    const unique = Array.from(new Map(input.assistants.map((item) => [item.uid, { uid: item.uid, task: cleanText(item.task, 160) }])).values());
    if (unique.length > 2) throw new Error("Thủ quỹ chính chỉ có thể chọn tối đa 2 người cùng tham gia.");
    if (unique.some((item) => !item.uid || item.uid === input.actorUid || item.task.length < 3)) {
      throw new Error("Mỗi người tham gia cần một nhiệm vụ rõ ràng.");
    }
    const db = getFirestore();
    const controlRef = doc(db, FIRESTORE_PATHS.familyHomeFundControl(input.familyId));
    await runTransaction(db, async (tx) => {
      const controlSnap = await tx.get(controlRef);
      if (!controlSnap.exists()) throw new Error("Sổ quỹ chưa được khởi tạo.");
      const current = normalizeControl(input.familyId, controlSnap.data() as Record<string, unknown>);
      if (current.primaryUid !== input.actorUid) throw new Error("Chỉ thủ quỹ chính mới được thay đổi nhóm giữ quỹ.");
      for (const item of unique) {
        const memberSnap = await tx.get(doc(db, FIRESTORE_PATHS.familyMember(input.familyId, item.uid)));
        if (!memberSnap.exists()) throw new Error("Một người được chọn không còn ở trong Nhà Mình.");
      }
      const assistantUids = unique.map((item) => item.uid);
      const assistantTasks = Object.fromEntries(unique.map((item) => [item.uid, item.task]));
      const auditRef = doc(collection(db, FIRESTORE_PATHS.familyHomeFundAudit(input.familyId)));
      const timestamp = nowIso();
      tx.set(auditRef, auditPayload(input.familyId, "team_update", input.actorUid, input.actorName, `Cập nhật nhóm giữ quỹ: ${assistantUids.length} người cùng tham gia.`));
      tx.set(controlRef, {
        ...controlSnap.data(),
        assistantUids,
        assistantTasks,
        version: current.version + 1,
        lastAuditId: auditRef.id,
        updatedByUid: input.actorUid,
        updatedAt: timestamp,
        updatedAtTs: serverTimestamp(),
      });
    });
  },

  async fetchPage(familyId: string, cursor: HomeFundPageCursor = null): Promise<HomeFundPage> {
    const parts: any[] = [orderBy("occurredOn", "desc")];
    if (cursor) parts.push(startAfter(cursor as any));
    parts.push(limit(PAGE_SIZE));
    const snap = await getDocs(query(collection(getFirestore(), FIRESTORE_PATHS.familyHomeFundTransactions(familyId)), ...parts));
    return {
      items: snap.docs
        .filter((row) => !isLegacyVoided(row.data() as Record<string, unknown>))
        .map((row) => normalizeTransaction(row.id, row.data() as Record<string, unknown>))
        .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt)),
      cursor: snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null,
      hasMore: snap.docs.length === PAGE_SIZE,
    };
  },

  async fetchMonthTotals(familyId: string, monthKey: string): Promise<HomeFundMonthTotals> {
    const snap = await getDocs(query(
      collection(getFirestore(), FIRESTORE_PATHS.familyHomeFundTransactions(familyId)),
      where("monthKey", "==", monthKey),
      limit(MONTH_SCAN_LIMIT),
    ));
    const rows = snap.docs.slice(0, MONTH_SCAN_LIMIT - 1)
      .filter((row) => !isLegacyVoided(row.data() as Record<string, unknown>))
      .map((row) => normalizeTransaction(row.id, row.data() as Record<string, unknown>));
    return rows.reduce<HomeFundMonthTotals>((acc, item) => {
      if (item.type === "income") acc.incomeVnd += item.amountVnd;
      else acc.expenseVnd += item.amountVnd;
      acc.transactionCount += 1;
      return acc;
    }, {
      monthKey,
      incomeVnd: 0,
      expenseVnd: 0,
      transactionCount: 0,
      capped: snap.docs.length >= MONTH_SCAN_LIMIT,
    });
  },

  async fetchStats(familyId: string, period: HomeFundStatsPeriod): Promise<HomeFundStats> {
    const { startKey } = statsBuckets(period);
    const snap = await getDocs(query(
      collection(getFirestore(), FIRESTORE_PATHS.familyHomeFundTransactions(familyId)),
      where("occurredOn", ">=", startKey),
      orderBy("occurredOn", "desc"),
      limit(STATS_SCAN_LIMIT),
    ));
    const rows = snap.docs.slice(0, STATS_SCAN_LIMIT - 1)
      .filter((row) => !isLegacyVoided(row.data() as Record<string, unknown>))
      .map((row) => normalizeTransaction(row.id, row.data() as Record<string, unknown>));
    return aggregateStats(period, rows, snap.docs.length >= STATS_SCAN_LIMIT, false);
  },

  makeMockStats(period: HomeFundStatsPeriod): HomeFundStats {
    // DEV/test-only synthetic dataset: deterministic and RAM-only, never written to Firestore.
    return mockStats(period);
  },

  async fetchAudit(familyId: string): Promise<HomeFundAuditEvent[]> {
    const snap = await getDocs(query(
      collection(getFirestore(), FIRESTORE_PATHS.familyHomeFundAudit(familyId)),
      orderBy("createdAt", "desc"),
      limit(AUDIT_PAGE_SIZE),
    ));
    return snap.docs
      .map((row) => normalizeAudit(row.id, row.data() as Record<string, unknown>))
      .filter((item): item is HomeFundAuditEvent => !!item);
  },

  async create(input: HomeFundMutationInput): Promise<string> {
    const normalized = validateInput(input);
    const db = getFirestore();
    const transactionRef = doc(collection(db, FIRESTORE_PATHS.familyHomeFundTransactions(input.familyId)));
    const summaryRef = doc(db, FIRESTORE_PATHS.familyHomeFundSummary(input.familyId));
    const auditRef = doc(collection(db, FIRESTORE_PATHS.familyHomeFundAudit(input.familyId)));
    const timestamp = nowIso();
    const payload = {
      id: transactionRef.id,
      familyId: input.familyId,
      type: input.type,
      amountVnd: normalized.amountVnd,
      category: input.category,
      note: normalized.note,
      occurredOn: input.occurredOn,
      monthKey: monthKeyFor(input.occurredOn),
      createdByUid: input.actorUid,
      createdByName: normalized.actorName,
      createdAt: timestamp,
      createdAtTs: serverTimestamp(),
      updatedAt: timestamp,
      updatedAtTs: serverTimestamp(),
      updatedByUid: input.actorUid,
      revision: 1,
    };

    await runTransaction(db, async (tx) => {
      const summarySnap = await tx.get(summaryRef);
      const current = normalizeSummary(input.familyId, summarySnap.exists() ? summarySnap.data() as Record<string, unknown> : undefined);
      tx.set(auditRef, auditPayload(
        input.familyId,
        "create",
        input.actorUid,
        normalized.actorName,
        `Ghi ${input.type === "income" ? "thu" : "chi"} ${normalized.amountVnd.toLocaleString("vi-VN")}đ.`,
        transactionRef.id,
        null,
        null,
        auditMoneyLabel({ type: input.type, amountVnd: normalized.amountVnd, category: input.category, note: normalized.note, occurredOn: input.occurredOn }),
      ));
      tx.set(transactionRef, payload);
      tx.set(summaryRef, summaryAfterCreate(current, { id: transactionRef.id, type: input.type, amountVnd: normalized.amountVnd }, input.actorUid, timestamp, auditRef.id));
    });
    return transactionRef.id;
  },

  async update(input: HomeFundUpdateInput): Promise<void> {
    const normalized = validateInput(input);
    const db = getFirestore();
    const transactionRef = doc(db, FIRESTORE_PATHS.familyHomeFundTransaction(input.familyId, input.transactionId));
    const summaryRef = doc(db, FIRESTORE_PATHS.familyHomeFundSummary(input.familyId));
    const auditRef = doc(collection(db, FIRESTORE_PATHS.familyHomeFundAudit(input.familyId)));
    const timestamp = nowIso();

    await runTransaction(db, async (tx) => {
      const [rowSnap, summarySnap] = await Promise.all([tx.get(transactionRef), tx.get(summaryRef)]);
      if (!rowSnap.exists()) throw new Error("Khoản thu/chi này không còn tồn tại.");
      const rawBefore = rowSnap.data() as Record<string, unknown>;
      if (isLegacyVoided(rawBefore)) throw new Error("Khoản cũ này đã được xóa/khóa ở phiên bản trước.");
      const before = normalizeTransaction(rowSnap.id, rawBefore);
      assertEditableWindow(before);
      const current = normalizeSummary(input.familyId, summarySnap.exists() ? summarySnap.data() as Record<string, unknown> : undefined);
      const after = {
        ...rawBefore,
        type: input.type,
        amountVnd: normalized.amountVnd,
        category: input.category,
        note: normalized.note,
        occurredOn: input.occurredOn,
        monthKey: monthKeyFor(input.occurredOn),
        updatedAt: timestamp,
        updatedAtTs: serverTimestamp(),
        updatedByUid: input.actorUid,
        revision: before.revision + 1,
      };
      tx.set(auditRef, auditPayload(
        input.familyId,
        "update",
        input.actorUid,
        normalized.actorName,
        `Sửa khoản quỹ lần ${before.revision + 1} trong cửa sổ 3 ngày.`,
        input.transactionId,
        null,
        auditMoneyLabel(before),
        auditMoneyLabel({ type: input.type, amountVnd: normalized.amountVnd, category: input.category, note: normalized.note, occurredOn: input.occurredOn }),
      ));
      tx.set(transactionRef, after);
      tx.set(summaryRef, summaryAfterUpdate(current, before, { type: input.type, amountVnd: normalized.amountVnd }, input.actorUid, timestamp, auditRef.id));
    });
  },

  async remove(familyId: string, transactionId: string, actorUid: string, actorName: string): Promise<void> {
    const db = getFirestore();
    const transactionRef = doc(db, FIRESTORE_PATHS.familyHomeFundTransaction(familyId, transactionId));
    const summaryRef = doc(db, FIRESTORE_PATHS.familyHomeFundSummary(familyId));
    const auditRef = doc(collection(db, FIRESTORE_PATHS.familyHomeFundAudit(familyId)));
    const timestamp = nowIso();
    await runTransaction(db, async (tx) => {
      const [rowSnap, summarySnap] = await Promise.all([tx.get(transactionRef), tx.get(summaryRef)]);
      if (!rowSnap.exists()) return;
      const rawBefore = rowSnap.data() as Record<string, unknown>;
      if (isLegacyVoided(rawBefore)) throw new Error("Khoản cũ này đã được xóa/khóa ở phiên bản trước.");
      const before = normalizeTransaction(rowSnap.id, rawBefore);
      assertEditableWindow(before);
      const current = normalizeSummary(familyId, summarySnap.exists() ? summarySnap.data() as Record<string, unknown> : undefined);
      tx.set(auditRef, auditPayload(
        familyId,
        "delete",
        actorUid,
        actorName,
        `Xóa khoản ${before.type === "income" ? "thu" : "chi"} ${before.amountVnd.toLocaleString("vi-VN")}đ trong cửa sổ 3 ngày.`,
        transactionId,
        null,
        auditMoneyLabel(before),
        "Đã xóa khỏi sổ đang hoạt động",
      ));
      tx.delete(transactionRef);
      tx.set(summaryRef, summaryAfterDelete(current, before, actorUid, timestamp, auditRef.id));
    });
  },

  isEditLocked(item: HomeFundTransaction, now = Date.now()) {
    return !item.createdAtMillis || now >= item.createdAtMillis + EDIT_WINDOW_MS;
  },
};
