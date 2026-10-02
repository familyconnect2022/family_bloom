import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { BloomKeyboardScreen, useBloomKeyboardFocus } from "../components/layout/BloomKeyboardScreen";
import { FamilyMemberPicker } from "../components/family/FamilyMemberPicker";
import { BloomConfirmModal } from "../components/ui/BloomConfirmModal";
import { BloomFullScreenFlow } from "../components/ui/BloomFullScreenFlow";
import { BloomHeroHeader } from "../components/ui/BloomHeroHeader";
import { BloomDatePicker } from "../components/ui/BloomInputComponents/BloomDatePicker";
import { BloomCard, BloomEmptyState, BloomPill, BloomSectionHeader } from "../components/ui/BloomPageComponents";
import { useBloomToast } from "../components/ui/BloomToast";
import { COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useFamilyMembersRealtime } from "../context/FamilyRealtimeContext";
import { homeFundService, type HomeFundPageCursor } from "../services/home/homeFundService";
import type { FamilyMember } from "../types";
import type {
  HomeFundAuditEvent,
  HomeFundCategory,
  HomeFundControl,
  HomeFundMonthTotals,
  HomeFundStats,
  HomeFundStatsPeriod,
  HomeFundSummary,
  HomeFundTransaction,
  HomeFundTransactionType,
} from "../types/homeLiving";

const EMPTY_SUMMARY: HomeFundSummary = {
  familyId: "",
  balanceVnd: 0,
  totalIncomeVnd: 0,
  totalExpenseVnd: 0,
  transactionCount: 0,
  lastMutationId: null,
  lastMutationKind: null,
  lastAuditId: null,
  updatedByUid: null,
  updatedAt: null,
};

const CATEGORY_META: Record<HomeFundCategory, { label: string; icon: keyof typeof Ionicons.glyphMap; tone: string }> = {
  contribution: { label: "Đóng góp", icon: "people-outline", tone: "#EAF7EF" },
  groceries: { label: "Ăn uống", icon: "basket-outline", tone: "#FFF2E8" },
  household: { label: "Đồ dùng", icon: "home-outline", tone: "#F0F2FF" },
  event: { label: "Sự kiện", icon: "calendar-outline", tone: "#FFF0F5" },
  travel: { label: "Đi lại", icon: "car-outline", tone: "#EAF5FF" },
  gift: { label: "Quà tặng", icon: "gift-outline", tone: "#FFF4DA" },
  refund: { label: "Hoàn tiền", icon: "return-down-back-outline", tone: "#EAF7EF" },
  other: { label: "Khác", icon: "ellipsis-horizontal-circle-outline", tone: "#F4F1F3" },
};

const INCOME_CATEGORIES: HomeFundCategory[] = ["contribution", "refund", "other"];
const EXPENSE_CATEGORIES: HomeFundCategory[] = ["groceries", "household", "event", "travel", "gift", "other"];
type FilterMode = "all" | HomeFundTransactionType;

const money = (value: number) => `${Math.abs(Math.trunc(value)).toLocaleString("vi-VN")} ₫`;
const signedMoney = (type: HomeFundTransactionType, value: number) => `${type === "income" ? "+" : "−"} ${money(value)}`;
const localDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const currentMonthKey = () => localDateKey(new Date()).slice(0, 7);
const parseDateOnly = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y || 2000, Math.max(0, (m || 1) - 1), d || 1);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};
const dateLabel = (value: string) => parseDateOnly(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return `Tháng ${Number(m) || new Date().getMonth() + 1}/${y || new Date().getFullYear()}`;
};
const formatAmountInput = (digits: string) => digits ? Number(digits).toLocaleString("vi-VN") : "";
const memberName = (member?: FamilyMember | null) => member?.shortName || member?.displayName || "Người thân";
const auditActionLabel: Record<HomeFundAuditEvent["action"], string> = {
  create: "Ghi khoản mới",
  update: "Sửa khoản",
  delete: "Xóa khoản",
  control_init: "Khởi tạo thủ quỹ",
  handover_request: "Đề nghị bàn giao",
  handover_accept: "Nhận bàn giao",
  handover_decline: "Từ chối bàn giao",
  handover_cancel: "Hủy bàn giao",
  team_update: "Cập nhật nhóm quỹ",
};

const addLocalDays = (base: Date, amount: number) =>
  new Date(base.getFullYear(), base.getMonth(), base.getDate() + amount, 12, 0, 0, 0);

const makeMockFundTransactions = (familyId: string, uid: string, actorName: string): HomeFundTransaction[] => {
  const today = new Date();
  const specs: Array<[number, HomeFundTransactionType, number, HomeFundCategory, string, number]> = [
    [0, "expense", 185_000, "groceries", "Đi chợ buổi sáng", 1],
    [-1, "income", 1_500_000, "contribution", "Đóng quỹ đầu tháng", 1],
    [-2, "expense", 320_000, "household", "Đồ dùng trong nhà", 2],
    [-3, "expense", 120_000, "travel", "Gửi xe và đi lại", 1],
    [-5, "income", 450_000, "refund", "Hoàn lại khoản mua chung", 1],
    [-7, "expense", 560_000, "event", "Chuẩn bị sinh nhật", 1],
    [-11, "expense", 210_000, "groceries", "Bữa tối cuối tuần", 1],
    [-16, "income", 1_000_000, "contribution", "Bổ sung quỹ gia đình", 1],
    [-22, "expense", 390_000, "gift", "Quà cho người thân", 1],
    [-31, "expense", 275_000, "household", "Thay đồ dùng bếp", 1],
    [-45, "income", 800_000, "contribution", "Đóng góp thêm", 1],
    [-70, "expense", 640_000, "event", "Bữa cơm gia đình", 1],
  ];

  return specs.map(([offset, type, amountVnd, category, note, revision], index) => {
    const occurred = addLocalDays(today, offset);
    const created = addLocalDays(today, Math.min(offset, -index % 2));
    const createdAtMillis = created.getTime();
    return {
      id: `mock-fund-${index + 1}`,
      familyId: familyId || "mock-family",
      type,
      amountVnd,
      category,
      note,
      occurredOn: localDateKey(occurred),
      monthKey: localDateKey(occurred).slice(0, 7),
      createdByUid: uid || "mock-user",
      createdByName: actorName || "Người thân",
      createdAt: created.toISOString(),
      createdAtMillis,
      updatedAt: created.toISOString(),
      updatedByUid: uid || "mock-user",
      revision,
    };
  });
};

const summarizeMockFund = (familyId: string, rows: HomeFundTransaction[]): HomeFundSummary => {
  const incomeVnd = rows.filter((row) => row.type === "income").reduce((sum, row) => sum + row.amountVnd, 0);
  const expenseVnd = rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.amountVnd, 0);
  return {
    familyId: familyId || "mock-family",
    balanceVnd: incomeVnd - expenseVnd,
    totalIncomeVnd: incomeVnd,
    totalExpenseVnd: expenseVnd,
    transactionCount: rows.length,
    lastMutationId: rows[0]?.id ?? null,
    lastMutationKind: "create",
    lastAuditId: "mock-audit-1",
    updatedByUid: rows[0]?.createdByUid ?? null,
    updatedAt: new Date().toISOString(),
  };
};

const summarizeMockMonth = (rows: HomeFundTransaction[]): HomeFundMonthTotals => {
  const monthKey = currentMonthKey();
  const inMonth = rows.filter((row) => row.monthKey === monthKey);
  return {
    monthKey,
    incomeVnd: inMonth.filter((row) => row.type === "income").reduce((sum, row) => sum + row.amountVnd, 0),
    expenseVnd: inMonth.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.amountVnd, 0),
    transactionCount: inMonth.length,
    capped: false,
  };
};

const makeMockAuditEvents = (familyId: string, rows: HomeFundTransaction[], actorName: string): HomeFundAuditEvent[] =>
  rows.slice(0, 6).map((row, index) => ({
    id: `mock-audit-${index + 1}`,
    familyId: familyId || "mock-family",
    action: index === 2 ? "update" : "create",
    transactionId: row.id,
    actorUid: row.createdByUid,
    actorName: actorName || row.createdByName,
    targetUid: null,
    detail: index === 2 ? "Điều chỉnh lại số tiền sau khi đối chiếu." : `Ghi ${row.type === "income" ? "khoản thu" : "khoản chi"} ${money(row.amountVnd)}.`,
    beforeLabel: index === 2 ? "Chi 300.000 ₫ · đồ dùng trong nhà" : null,
    afterLabel: index === 2 ? `Chi ${money(row.amountVnd)} · ${row.note}` : null,
    createdAt: row.updatedAt,
  }));

function FundKeyboardTextInput({
  inputRef: externalInputRef,
  extraGap,
  onFocus,
  onContentSizeChange,
  multiline,
  ...props
}: TextInputProps & { inputRef?: React.RefObject<TextInput | null>; extraGap?: number }) {
  const fallbackRef = useRef<TextInput>(null);
  const inputRef = externalInputRef ?? fallbackRef;
  const { revealInput } = useBloomKeyboardFocus();
  const revealGap = extraGap ?? (multiline ? 58 : 28);
  const reveal = () => revealInput(inputRef.current, revealGap);

  return (
    <TextInput
      ref={inputRef}
      {...props}
      multiline={multiline}
      onFocus={(event) => {
        onFocus?.(event);
        reveal();
        if (multiline) {
          setTimeout(reveal, 90);
        }
      }}
      onContentSizeChange={(event) => {
        onContentSizeChange?.(event);
        if (multiline) {
          requestAnimationFrame(reveal);
        }
      }}
    />
  );
}

function FundEditor({
  visible,
  item,
  onClose,
  onSaved,
}: {
  visible: boolean;
  item: HomeFundTransaction | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user, userProfile, activeFamilyId } = useAuth();
  const { showToast } = useBloomToast();
  const uid = user?.uid ?? "";
  const actorName = userProfile?.shortName || userProfile?.displayName || "Người thân";
  const [type, setType] = useState<HomeFundTransactionType>("income");
  const [amountDigits, setAmountDigits] = useState("");
  const [category, setCategory] = useState<HomeFundCategory>("contribution");
  const [note, setNote] = useState("");
  const [occurredDate, setOccurredDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<TextInput>(null);
  const noteRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    if (item) {
      setType(item.type);
      setAmountDigits(String(item.amountVnd));
      setCategory(item.category);
      setNote(item.note);
      setOccurredDate(parseDateOnly(item.occurredOn));
    } else {
      setType("income");
      setAmountDigits("");
      setCategory("contribution");
      setNote("");
      setOccurredDate(new Date());
    }
    setDirty(false);
    setError(null);
    setConfirmDiscard(false);
  }, [item, visible]);

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const switchType = (next: HomeFundTransactionType) => {
    setType(next);
    const nextCategories = next === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!nextCategories.includes(category)) setCategory(nextCategories[0]);
    setDirty(true);
  };
  const requestClose = () => {
    if (saving) return;
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };
  const save = async () => {
    if (!activeFamilyId || !uid || saving) return;
    const amountVnd = Number(amountDigits || 0);
    if (!amountVnd) {
      setError("Nhập số tiền trước khi lưu nhé.");
      amountRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const base = {
        familyId: activeFamilyId,
        type,
        amountVnd,
        category,
        note,
        occurredOn: localDateKey(occurredDate),
        actorUid: uid,
        actorName,
      };
      if (item) await homeFundService.update({ ...base, transactionId: item.id });
      else await homeFundService.create(base);
      setDirty(false);
      showToast({
        type: "success",
        title: item ? "Đã cập nhật sổ quỹ" : "Đã ghi vào quỹ nhà mình",
        message: item ? "Mọi thay đổi vẫn được ghi lại trong nhật ký." : "Nếu nhập nhầm, bạn có 3 ngày để chỉnh lại.",
        duration: 2600,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được khoản thu/chi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BloomFullScreenFlow
        visible={visible}
        eyebrow="QUỸ GIA ĐÌNH"
        title={item ? "Sửa khoản thu · chi" : "Ghi một khoản mới"}
        subtitle="Ai đang cùng giữ quỹ thì có thể ghi khoản này. Nếu nhập nhầm, bạn có 3 ngày để chỉnh lại."
        onBack={requestClose}
        backDisabled={saving}
        variant="fund"
        compactHeader
      >
        <BloomKeyboardScreen contentContainerStyle={styles.editorBody}>
          <Text style={styles.editorLabel}>LOẠI GIAO DỊCH</Text>
          <View style={styles.typeRow}>
            <Pressable onPress={() => switchType("income")} style={[styles.typeButton, type === "income" && styles.typeIncomeActive]}>
              <Ionicons name="arrow-down-circle-outline" size={20} color={type === "income" ? "#2F7951" : COLORS.secondaryText} />
              <Text style={[styles.typeText, type === "income" && styles.typeIncomeText]}>Khoản thu</Text>
            </Pressable>
            <Pressable onPress={() => switchType("expense")} style={[styles.typeButton, type === "expense" && styles.typeExpenseActive]}>
              <Ionicons name="arrow-up-circle-outline" size={20} color={type === "expense" ? "#A65353" : COLORS.secondaryText} />
              <Text style={[styles.typeText, type === "expense" && styles.typeExpenseText]}>Khoản chi</Text>
            </Pressable>
          </View>

          <Text style={styles.editorLabel}>SỐ TIỀN</Text>
          <View style={[styles.amountInputWrap, !!error && !amountDigits && styles.inputInvalid]}>
            <FundKeyboardTextInput
              inputRef={amountRef}
              extraGap={30}
              value={formatAmountInput(amountDigits)}
              onChangeText={(value) => {
                setAmountDigits(value.replace(/\D/g, "").slice(0, 10));
                setDirty(true);
                setError(null);
              }}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#B39DA5"
              style={styles.amountInput}
            />
            <Text style={styles.currency}>₫</Text>
          </View>

          <Text style={styles.editorLabel}>NHÓM</Text>
          <View style={styles.categoryGrid}>
            {categories.map((key) => {
              const meta = CATEGORY_META[key];
              const selected = category === key;
              return (
                <Pressable key={key} onPress={() => { setCategory(key); setDirty(true); }} style={[styles.categoryChip, selected && styles.categoryChipActive]}>
                  <View style={[styles.categoryIcon, { backgroundColor: meta.tone }]}><Ionicons name={meta.icon} size={16} color={COLORS.primaryText} /></View>
                  <Text style={[styles.categoryText, selected && styles.categoryTextActive]}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.editorLabel}>NGÀY GHI QUỸ</Text>
          <BloomDatePicker selectedDate={occurredDate} onDateChange={(date) => { setOccurredDate(date); setDirty(true); }} maximumDate={new Date()} />

          <Text style={styles.editorLabel}>GHI CHÚ</Text>
          <View style={styles.noteInputWrap}>
            <FundKeyboardTextInput
              inputRef={noteRef}
              value={note}
              onChangeText={(value) => { setNote(value.slice(0, 240)); setDirty(true); }}
              placeholder="Ví dụ: tiền chợ cuối tuần"
              placeholderTextColor="#B39DA5"
              multiline
              style={styles.noteInput}
            />
            <Text style={styles.counter}>{note.length}/240</Text>
          </View>

          <View style={styles.editorAudit}>
            <Ionicons name="footsteps-outline" size={18} color="#4E6E5B" />
            <Text style={styles.editorAuditText}><Text style={styles.editorAuditStrong}>Nhật ký quỹ:</Text> tên người ghi và những lần chỉnh sửa đều được giữ lại. Sau 3 ngày, khoản này sẽ được khóa.</Text>
          </View>
          {!!error && <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={17} color="#A7475B" /><Text style={styles.errorText}>{error}</Text></View>}
          <Pressable disabled={saving} onPress={() => void save()} style={({ pressed }) => [styles.saveButton, saving && styles.disabled, pressed && styles.pressed]}>
            {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />}
            <Text style={styles.saveText}>{item ? "Lưu thay đổi" : "Ghi vào sổ quỹ"}</Text>
          </Pressable>
        </BloomKeyboardScreen>
      </BloomFullScreenFlow>
      <BloomConfirmModal
        visible={confirmDiscard}
        title="Bỏ thay đổi?"
        message="Những gì bạn vừa nhập sẽ không được lưu vào sổ quỹ."
        confirmLabel="Bỏ thay đổi"
        cancelLabel="Ở lại"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={() => { setConfirmDiscard(false); setDirty(false); onClose(); }}
      />
    </>
  );
}

function FundBarChart({ stats }: { stats: HomeFundStats }) {
  const maxValue = Math.max(1, ...stats.buckets.flatMap((bucket) => [bucket.incomeVnd, bucket.expenseVnd]));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chartScroll}>
      {stats.buckets.map((bucket) => {
        const incomeHeight = bucket.incomeVnd ? Math.max(8, Math.round((bucket.incomeVnd / maxValue) * 92)) : 3;
        const expenseHeight = bucket.expenseVnd ? Math.max(8, Math.round((bucket.expenseVnd / maxValue) * 92)) : 3;
        return (
          <View key={bucket.key} style={styles.chartBucket}>
            <View style={styles.chartBars}>
              <View style={[styles.chartBar, styles.chartIncome, { height: incomeHeight }]} />
              <View style={[styles.chartBar, styles.chartExpense, { height: expenseHeight }]} />
            </View>
            <Text style={styles.chartLabel} numberOfLines={1}>{bucket.label}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

function HandoverFlow({ visible, members, currentUid, onClose, onSubmit }: {
  visible: boolean;
  members: FamilyMember[];
  currentUid: string;
  onClose: () => void;
  onSubmit: (targetUid: string, note: string) => Promise<void>;
}) {
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!visible) return;
    setSelectedUids([]);
    setNote("");
    setSaving(false);
    setError(null);
  }, [visible]);
  const submit = async () => {
    const targetUid = selectedUids[0];
    if (!targetUid || saving) { setError("Chọn người sẽ chịu trách nhiệm chính cho quỹ."); return; }
    setSaving(true);
    setError(null);
    try { await onSubmit(targetUid, note); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "Chưa gửi được lời mời bàn giao."); }
    finally { setSaving(false); }
  };
  return (
    <BloomFullScreenFlow visible={visible} eyebrow="BÀN GIAO QUỸ" title="Bàn giao quỹ" subtitle="Chọn người bạn tin cậy. Quyền chỉ chuyển sau khi họ đồng ý." variant="fund" compactHeader backDisabled={saving} onBack={onClose}>
      <BloomKeyboardScreen contentContainerStyle={styles.manageBody}>
        <FamilyMemberPicker label="Người nhận bàn giao" hint="Chọn một thành viên đang dùng Family Bloom trong nhà." members={members} selectedUids={selectedUids} onChange={setSelectedUids} mode="single" currentUid={currentUid} excludeUids={[currentUid]} variant="fund" />
        <Text style={styles.editorLabel}>LỜI NHẮN BÀN GIAO</Text>
        <View style={styles.noteInputWrap}>
          <FundKeyboardTextInput value={note} onChangeText={(value) => setNote(value.slice(0, 200))} placeholder="Có điều gì bạn muốn nhắn trước khi giao quỹ?" placeholderTextColor="#B39DA5" multiline style={styles.noteInput} />
          <Text style={styles.counter}>{note.length}/200</Text>
        </View>
        <View style={styles.warningCard}><Ionicons name="shield-checkmark-outline" size={19} color="#7D6438" /><Text style={styles.warningText}>Khi họ đồng ý, họ sẽ trở thành người giữ quỹ chính. Bạn chỉ tiếp tục nhập thu · chi nếu được mời lại vào nhóm quỹ.</Text></View>
        {!!error && <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={17} color="#A7475B" /><Text style={styles.errorText}>{error}</Text></View>}
        <Pressable disabled={saving} onPress={() => void submit()} style={({ pressed }) => [styles.saveButton, saving && styles.disabled, pressed && styles.pressed]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="paper-plane-outline" size={19} color="#fff" />}
          <Text style={styles.saveText}>Gửi lời mời bàn giao</Text>
        </Pressable>
      </BloomKeyboardScreen>
    </BloomFullScreenFlow>
  );
}

function FundTeamFlow({ visible, members, currentUid, initialUids, initialTasks, onClose, onSubmit }: {
  visible: boolean;
  members: FamilyMember[];
  currentUid: string;
  initialUids: string[];
  initialTasks: Record<string, string>;
  onClose: () => void;
  onSubmit: (items: Array<{ uid: string; task: string }>) => Promise<void>;
}) {
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!visible) return;
    setSelectedUids(initialUids.slice(0, 2));
    setTasks({ ...initialTasks });
    setSaving(false);
    setError(null);
  }, [initialTasks, initialUids, visible]);
  const changeSelection = (uids: string[]) => {
    if (uids.length > 2) { setError("Tối đa 2 người cùng tham gia giữ quỹ."); return; }
    setError(null);
    setSelectedUids(uids);
    setTasks((current) => Object.fromEntries(uids.map((uid) => [uid, current[uid] ?? ""])));
  };
  const submit = async () => {
    if (saving) return;
    const items = selectedUids.map((selectedUid) => ({ uid: selectedUid, task: (tasks[selectedUid] || "").trim() }));
    if (items.some((entry) => entry.task.length < 3)) { setError("Mỗi người cần một mô tả nhiệm vụ rõ ràng trước khi lưu."); return; }
    setSaving(true);
    setError(null);
    try { await onSubmit(items); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : "Chưa cập nhật được nhóm quỹ."); }
    finally { setSaving(false); }
  };
  return (
    <BloomFullScreenFlow visible={visible} eyebrow="NHÓM GIỮ QUỸ" title="Cùng giữ quỹ" subtitle="Bạn có thể chọn tối đa 2 người hỗ trợ và ghi rõ phần việc của mỗi người." variant="fund" compactHeader backDisabled={saving} onBack={onClose}>
      <BloomKeyboardScreen contentContainerStyle={styles.manageBody}>
        <FamilyMemberPicker label="Người cùng tham gia" hint="Chọn tối đa 2 người hỗ trợ bạn. Bạn đã là thủ quỹ chính nên không cần chọn lại." members={members} selectedUids={selectedUids} onChange={changeSelection} mode="multiple" currentUid={currentUid} excludeUids={[currentUid]} variant="fund" />
        {selectedUids.map((selectedUid) => {
          const selectedMember = members.find((member) => member.uid === selectedUid);
          return (
            <View key={selectedUid} style={styles.taskBlock}>
              <Text style={styles.taskName}>{memberName(selectedMember)}</Text>
              <FundKeyboardTextInput value={tasks[selectedUid] || ""} onChangeText={(value) => setTasks((current) => ({ ...current, [selectedUid]: value.slice(0, 160) }))} placeholder="Ví dụ: Theo dõi tiền chợ và hóa đơn mỗi tuần" placeholderTextColor="#B39DA5" multiline style={styles.taskInput} />
              <Text style={styles.counter}>{(tasks[selectedUid] || "").length}/160</Text>
            </View>
          );
        })}
        {!!error && <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={17} color="#A7475B" /><Text style={styles.errorText}>{error}</Text></View>}
        <Pressable disabled={saving} onPress={() => void submit()} style={({ pressed }) => [styles.saveButton, saving && styles.disabled, pressed && styles.pressed]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="people-outline" size={19} color="#fff" />}
          <Text style={styles.saveText}>Lưu nhóm giữ quỹ</Text>
        </Pressable>
      </BloomKeyboardScreen>
    </BloomFullScreenFlow>
  );
}

export default function HomeFundScreen() {
  const router = useRouter();
  const { user, userProfile, activeFamilyId, activeMembership } = useAuth();
  const membersRealtime = useFamilyMembersRealtime();
  const members = membersRealtime?.members ?? [];
  const { showToast } = useBloomToast();
  const uid = user?.uid ?? "";
  const actorName = userProfile?.shortName || userProfile?.displayName || "Người thân";
  const [summary, setSummary] = useState<HomeFundSummary>(EMPTY_SUMMARY);
  const [control, setControl] = useState<HomeFundControl | null>(null);
  const [headItems, setHeadItems] = useState<HomeFundTransaction[]>([]);
  const [extraItems, setExtraItems] = useState<HomeFundTransaction[]>([]);
  const [cursor, setCursor] = useState<HomeFundPageCursor>(null);
  const [hasMore, setHasMore] = useState(false);
  const [monthTotals, setMonthTotals] = useState<HomeFundMonthTotals>({ monthKey: currentMonthKey(), incomeVnd: 0, expenseVnd: 0, transactionCount: 0, capped: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<HomeFundTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomeFundTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [handoverVisible, setHandoverVisible] = useState(false);
  const [teamVisible, setTeamVisible] = useState(false);
  const [resolvingHandover, setResolvingHandover] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<HomeFundStatsPeriod>("month");
  const [stats, setStats] = useState<HomeFundStats>(() => homeFundService.makeMockStats("month"));
  const [statsLoading, setStatsLoading] = useState(false);
  const [simulateStats, setSimulateStats] = useState(false);
  const [auditEvents, setAuditEvents] = useState<HomeFundAuditEvent[]>([]);
  const monthKey = currentMonthKey();

  const memberByUid = useMemo(() => new Map(members.map((member) => [member.uid, member])), [members]);
  const mockTransactions = useMemo(
    () => makeMockFundTransactions(activeFamilyId || "", uid, actorName),
    [activeFamilyId, actorName, uid],
  );
  const mockSummary = useMemo(
    () => summarizeMockFund(activeFamilyId || "", mockTransactions),
    [activeFamilyId, mockTransactions],
  );
  const mockMonthTotals = useMemo(
    () => summarizeMockMonth(mockTransactions),
    [mockTransactions],
  );
  const mockAuditEvents = useMemo(
    () => makeMockAuditEvents(activeFamilyId || "", mockTransactions, actorName),
    [activeFamilyId, actorName, mockTransactions],
  );
  const defaultAdmin = useMemo(() => members.find((member) => member.role === "owner") ?? members.find((member) => member.role === "admin") ?? null, [members]);
  const defaultPrimaryUid = defaultAdmin?.uid || ((activeMembership?.role === "owner" || activeMembership?.role === "admin") ? uid : "");
  const effectivePrimaryUid = control?.primaryUid || defaultPrimaryUid;
  const effectiveAssistantUids = control?.assistantUids ?? [];
  const effectiveAssistantTasks = control?.assistantTasks ?? {};
  const isPrimary = !!uid && uid === effectivePrimaryUid;
  const isAssistant = !!uid && effectiveAssistantUids.includes(uid);
  const isFundTeam = isPrimary || isAssistant;
  const primaryMember = memberByUid.get(effectivePrimaryUid) ?? null;
  const pendingTarget = control?.pendingTransferToUid ? memberByUid.get(control.pendingTransferToUid) ?? null : null;

  const refreshMonth = useCallback(async () => {
    if (!activeFamilyId) return;
    try { setMonthTotals(await homeFundService.fetchMonthTotals(activeFamilyId, monthKey)); }
    catch { /* Summary remains usable when the bounded month refresh fails. */ }
  }, [activeFamilyId, monthKey]);

  useEffect(() => {
    if (!activeFamilyId) {
      setSummary(EMPTY_SUMMARY);
      setControl(null);
      setHeadItems([]);
      setExtraItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setExtraItems([]);
    let settledSummary = false;
    let settledRows = false;
    let settledControl = false;
    const settle = () => { if (settledSummary && settledRows && settledControl) setLoading(false); };
    const stopSummary = homeFundService.subscribeSummary(activeFamilyId, (next) => { settledSummary = true; setSummary(next); settle(); }, (e) => { settledSummary = true; setError(e instanceof Error ? e.message : "Không tải được số dư quỹ."); settle(); });
    const stopRows = homeFundService.subscribeRecent(activeFamilyId, (page) => {
      settledRows = true;
      setHeadItems(page.items);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      setExtraItems((current) => current.filter((row) => !page.items.some((head) => head.id === row.id)));
      void refreshMonth();
      settle();
    }, (e) => { settledRows = true; setError(e instanceof Error ? e.message : "Không tải được lịch sử quỹ."); settle(); });
    const stopControl = homeFundService.subscribeControl(activeFamilyId, (next) => { settledControl = true; setControl(next); settle(); }, (e) => { settledControl = true; setError(e instanceof Error ? e.message : "Không tải được người giữ quỹ."); settle(); });
    return () => { stopSummary(); stopRows(); stopControl(); };
  }, [activeFamilyId, refreshMonth]);

  useEffect(() => {
    if (!activeFamilyId || !uid || control || uid !== defaultPrimaryUid) return;
    void homeFundService.ensureInitialControl(activeFamilyId, uid, actorName).catch((e) => setError(e instanceof Error ? e.message : "Chưa khởi tạo được quyền thủ quỹ."));
  }, [activeFamilyId, actorName, control, defaultPrimaryUid, uid]);

  useEffect(() => {
    if (!activeFamilyId) return;
    let live = true;
    if (simulateStats) {
      setStatsLoading(false);
      setStats(homeFundService.makeMockStats(statsPeriod));
      return () => { live = false; };
    }
    setStatsLoading(true);
    void homeFundService.fetchStats(activeFamilyId, statsPeriod).then((next) => { if (live) setStats(next); }).catch((e) => { if (live) setError(e instanceof Error ? e.message : "Không tải được thống kê quỹ."); }).finally(() => { if (live) setStatsLoading(false); });
    return () => { live = false; };
  }, [activeFamilyId, simulateStats, statsPeriod, summary.lastAuditId]);

  useEffect(() => {
    if (!activeFamilyId) return;
    let live = true;
    void homeFundService.fetchAudit(activeFamilyId).then((events) => { if (live) setAuditEvents(events); }).catch(() => undefined);
    return () => { live = false; };
  }, [activeFamilyId, control?.lastAuditId, summary.lastAuditId]);

  const allItems = useMemo(() => {
    const seen = new Set<string>();
    return [...headItems, ...extraItems].filter((row) => !seen.has(row.id) && seen.add(row.id)).sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt));
  }, [extraItems, headItems]);
  const displaySummary = simulateStats ? mockSummary : summary;
  const displayMonthTotals = simulateStats ? mockMonthTotals : monthTotals;
  const displayAuditEvents = simulateStats ? mockAuditEvents : auditEvents;
  const displayItems = useMemo(() => {
    const source = simulateStats ? mockTransactions : allItems;
    return filter === "all" ? source : source.filter((row) => row.type === filter);
  }, [allItems, filter, mockTransactions, simulateStats]);
  const canManage = useCallback((item: HomeFundTransaction) => {
    if (homeFundService.isEditLocked(item)) return false;
    if (isPrimary) return true;
    return isAssistant && item.createdByUid === uid;
  }, [isAssistant, isPrimary, uid]);

  const openCreate = () => {
    if (!isFundTeam) {
      showToast({ type: "info", title: "Chỉ nhóm quỹ được ghi thu · chi", message: "Thủ quỹ chính có thể mời tối đa 2 người cùng tham gia và mô tả rõ nhiệm vụ." });
      return;
    }
    setEditing(null);
    setEditorVisible(true);
  };

  const loadMore = async () => {
    if (!activeFamilyId || !hasMore || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await homeFundService.fetchPage(activeFamilyId, cursor);
      setExtraItems((current) => [...current, ...page.items.filter((row) => !current.some((old) => old.id === row.id) && !headItems.some((old) => old.id === row.id))]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (e) { showToast({ type: "error", title: "Chưa tải thêm được", message: e instanceof Error ? e.message : "Hãy thử lại sau." }); }
    finally { setLoadingMore(false); }
  };

  const removeItem = async () => {
    if (!activeFamilyId || !uid || !deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await homeFundService.remove(activeFamilyId, deleteTarget.id, uid, actorName);
      setDeleteTarget(null);
      await refreshMonth();
      showToast({ type: "success", title: "Đã xóa khỏi sổ quỹ", message: "Số dư đã được tính lại. Nhật ký vẫn giữ lần xóa này." });
    } catch (e) { showToast({ type: "error", title: "Không xóa được", message: e instanceof Error ? e.message : "Hãy thử lại sau." }); }
    finally { setDeleting(false); }
  };

  const requestHandover = async (targetUid: string, note: string) => {
    if (!activeFamilyId) return;
    await homeFundService.requestHandover({ familyId: activeFamilyId, actorUid: uid, actorName, targetUid, note });
    showToast({ type: "success", title: "Đã gửi lời mời bàn giao", message: "Quyền chưa đổi cho tới khi người được chọn bấm Đồng ý." });
  };
  const resolveHandover = async (accept: boolean) => {
    if (!activeFamilyId || resolvingHandover) return;
    setResolvingHandover(true);
    try {
      await homeFundService.resolveHandover({ familyId: activeFamilyId, actorUid: uid, actorName, accept });
      showToast({ type: accept ? "success" : "info", title: accept ? "Bạn đã nhận quỹ" : "Đã từ chối bàn giao", message: accept ? "Từ bây giờ bạn là người chịu trách nhiệm chính." : "Quyền vẫn ở người đang giữ quỹ trước đó." });
    } catch (e) { showToast({ type: "error", title: "Chưa xử lý được bàn giao", message: e instanceof Error ? e.message : "Hãy thử lại." }); }
    finally { setResolvingHandover(false); }
  };
  const cancelHandover = async () => {
    if (!activeFamilyId) return;
    try { await homeFundService.cancelHandover({ familyId: activeFamilyId, actorUid: uid, actorName }); showToast({ type: "info", title: "Đã hủy bàn giao", message: "Bạn vẫn là thủ quỹ chính." }); }
    catch (e) { showToast({ type: "error", title: "Không hủy được", message: e instanceof Error ? e.message : "Hãy thử lại." }); }
  };
  const updateAssistants = async (items: Array<{ uid: string; task: string }>) => {
    if (!activeFamilyId) return;
    await homeFundService.updateAssistants({ familyId: activeFamilyId, actorUid: uid, actorName, assistants: items });
    showToast({ type: "success", title: "Đã cập nhật nhóm giữ quỹ", message: items.length ? `${items.length} người cùng tham gia và nhiệm vụ đã được ghi rõ.` : "Hiện chỉ thủ quỹ chính được nhập thu · chi." });
  };

  const statsPeriodLabel = statsPeriod === "day" ? "7 ngày gần nhất" : statsPeriod === "month" ? "6 tháng gần nhất" : "5 năm gần nhất";
  const pendingForMe = control?.pendingTransferToUid === uid;
  const pendingFromMe = isPrimary && !!control?.pendingTransferToUid;

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader eyebrow="QUỸ GIA ĐÌNH" title="Cùng giữ quỹ nhà mình" subtitle="Một người chịu trách nhiệm chính, có thể nhờ thêm người hỗ trợ. Mọi khoản thu chi đều có lịch sử rõ ràng." variant="fund" onBack={() => router.back()} roundedBottom compact />
        <View style={styles.body}>
          <View style={styles.previewRow}>
            <BloomPill icon="shield-checkmark-outline" label="Có nhật ký" />
            <BloomPill icon="time-outline" label="Sửa trong 3 ngày" />
            <BloomPill icon="people-outline" label={isPrimary ? "Bạn là thủ quỹ chính" : isAssistant ? "Bạn thuộc nhóm quỹ" : "Chỉ xem quỹ"} />
          </View>

          {pendingForMe && (
            <BloomCard style={styles.inviteCard}>
              <View style={styles.inviteIcon}><Ionicons name="key-outline" size={23} color="#805E26" /></View>
              <View style={styles.inviteCopy}>
                <Text style={styles.inviteEyebrow}>LỜI MỜI BÀN GIAO QUỸ</Text>
                <Text style={styles.inviteTitle}>{memberName(memberByUid.get(control?.pendingTransferRequestedByUid || ""))} muốn giao quỹ cho bạn</Text>
                {!!control?.pendingTransferNote && <Text style={styles.inviteNote}>“{control.pendingTransferNote}”</Text>}
                <Text style={styles.inviteMeta}>Chỉ khi bạn đồng ý thì quyền thu · chi mới chuyển sang bạn.</Text>
                <View style={styles.inviteActions}>
                  <Pressable disabled={resolvingHandover} onPress={() => void resolveHandover(false)} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}><Text style={styles.secondaryActionText}>Từ chối</Text></Pressable>
                  <Pressable disabled={resolvingHandover} onPress={() => void resolveHandover(true)} style={({ pressed }) => [styles.acceptAction, pressed && styles.pressed]}>{resolvingHandover ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.acceptActionText}>Đồng ý nhận quỹ</Text>}</Pressable>
                </View>
              </View>
            </BloomCard>
          )}

          <BloomCard style={styles.stewardCard}>
            <View style={styles.stewardHeader}>
              <View style={styles.stewardBadge}><Ionicons name="shield-checkmark" size={24} color="#4E8B6A" /></View>
              <View style={styles.stewardCopy}>
                <Text style={styles.stewardEyebrow}>NGƯỜI CHỊU TRÁCH NHIỆM CHÍNH</Text>
                <Text style={styles.stewardName}>{memberName(primaryMember)}</Text>
                <Text style={styles.stewardMeta}>{control ? "Thủ quỹ đã được xác nhận" : "Admin mặc định giữ quỹ cho tới khi bàn giao được chấp nhận"}</Text>
              </View>
            </View>
            {effectiveAssistantUids.length ? (
              <View style={styles.assistantList}>
                {effectiveAssistantUids.map((assistantUid) => (
                  <View key={assistantUid} style={styles.assistantRow}>
                    <View style={styles.assistantAvatar}><Text style={styles.assistantAvatarText}>{memberName(memberByUid.get(assistantUid)).slice(-1).toUpperCase()}</Text></View>
                    <View style={styles.assistantCopy}><Text style={styles.assistantName}>{memberName(memberByUid.get(assistantUid))}</Text><Text style={styles.assistantTask}>{effectiveAssistantTasks[assistantUid] || "Cùng tham gia ghi sổ quỹ"}</Text></View>
                  </View>
                ))}
              </View>
            ) : <Text style={styles.noAssistant}>Chưa có người cùng tham gia. Thủ quỹ chính có thể mời tối đa 2 người.</Text>}
            {isPrimary && (
              <View style={styles.stewardActions}>
                <Pressable onPress={() => setTeamVisible(true)} style={({ pressed }) => [styles.stewardButton, pressed && styles.pressed]}><Ionicons name="people-outline" size={17} color={COLORS.primary} /><Text style={styles.stewardButtonText}>Nhóm quỹ</Text></Pressable>
                {pendingFromMe ? (
                  <Pressable onPress={() => void cancelHandover()} style={({ pressed }) => [styles.stewardButton, pressed && styles.pressed]}><Ionicons name="close-circle-outline" size={17} color="#A65353" /><Text style={[styles.stewardButtonText, { color: "#A65353" }]}>Hủy bàn giao</Text></Pressable>
                ) : (
                  <Pressable onPress={() => setHandoverVisible(true)} style={({ pressed }) => [styles.stewardButton, pressed && styles.pressed]}><Ionicons name="swap-horizontal-outline" size={17} color={COLORS.primary} /><Text style={styles.stewardButtonText}>Bàn giao</Text></Pressable>
                )}
              </View>
            )}
            {pendingFromMe && <Text style={styles.pendingLine}>Đang chờ {memberName(pendingTarget)} xác nhận. Trong lúc chờ, quyền của bạn vẫn giữ nguyên.</Text>}
          </BloomCard>

          <BloomCard style={styles.balanceCard}>
            <View style={styles.balanceTop}>
              <View style={styles.balanceCopy}><Text style={styles.balanceKicker}>SỐ DƯ QUỸ HIỆN TẠI</Text><Text style={[styles.balanceValue, displaySummary.balanceVnd < 0 && styles.balanceNegative]}>{displaySummary.balanceVnd < 0 ? "− " : ""}{money(displaySummary.balanceVnd)}</Text><Text style={styles.balanceMeta}>{displaySummary.transactionCount.toLocaleString("vi-VN")} khoản đang có{simulateStats ? " · dữ liệu thử" : " · cập nhật realtime"}</Text></View>
              <View style={styles.walletIcon}><Ionicons name="wallet" size={27} color="#4E8B6A" /></View>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>{monthLabel(monthKey).toUpperCase()} · THU</Text><Text style={[styles.summaryValue, styles.income]}>+ {money(displayMonthTotals.incomeVnd)}</Text></View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>ĐÃ CHI</Text><Text style={[styles.summaryValue, styles.expense]}>− {money(displayMonthTotals.expenseVnd)}</Text></View>
            </View>
            {displayMonthTotals.capped && <Text style={styles.capNote}>Tháng này có hơn 500 giao dịch; tổng tháng dùng 500 khoản gần nhất để giữ màn hình nhẹ.</Text>}
            <Pressable disabled={!isFundTeam} onPress={openCreate} style={({ pressed }) => [styles.primaryAction, !isFundTeam && styles.disabled, pressed && isFundTeam && styles.pressed]}><Ionicons name={isFundTeam ? "add-circle-outline" : "lock-closed-outline"} size={21} color="#fff" /><Text style={styles.primaryActionText}>{isFundTeam ? "Ghi khoản thu · chi" : "Chỉ nhóm quỹ được nhập thu · chi"}</Text></Pressable>
          </BloomCard>

          <BloomCard tone="soft" style={styles.policyCard}><Ionicons name="information-circle-outline" size={20} color="#4E8B6A" /><Text style={styles.policyText}>Chỉ những người trong nhóm quỹ mới được ghi thu · chi. Nếu nhập nhầm, bạn có 3 ngày để sửa hoặc xóa; sau đó hãy tạo một khoản điều chỉnh mới.</Text></BloomCard>

          <BloomSectionHeader title="Thống kê quỹ" subtitle={`${statsPeriodLabel} · xem thu và chi thay đổi theo thời gian.`} />
          <BloomCard style={styles.statsCard}>
            <View style={styles.periodRow}>
              {(["day", "month", "year"] as HomeFundStatsPeriod[]).map((period) => <Pressable key={period} onPress={() => setStatsPeriod(period)} style={[styles.periodChip, statsPeriod === period && styles.periodChipActive]}><Text style={[styles.periodText, statsPeriod === period && styles.periodTextActive]}>{period === "day" ? "Ngày" : period === "month" ? "Tháng" : "Năm"}</Text></Pressable>)}
              {typeof __DEV__ !== "undefined" && __DEV__ && <Pressable onPress={() => setSimulateStats((value) => !value)} style={[styles.mockChip, simulateStats && styles.mockChipActive]}><Ionicons name="flask-outline" size={14} color={simulateStats ? "#805E26" : COLORS.secondaryText} /><Text style={[styles.mockText, simulateStats && styles.mockTextActive]}>Dữ liệu thử</Text></Pressable>}
            </View>
            {simulateStats && <Text style={styles.mockNote}>Bạn đang xem dữ liệu thử trong RAM: số dư, lịch sử và biểu đồ đều không ảnh hưởng quỹ thật.</Text>}
            {statsLoading ? <View style={styles.statsLoading}><ActivityIndicator color={COLORS.primary} /><Text style={styles.loadingText}>Đang tính thống kê…</Text></View> : <>
              <View style={styles.statsTotals}><View><Text style={styles.statsLabel}>THU</Text><Text style={[styles.statsValue, styles.income]}>+ {money(stats.incomeVnd)}</Text></View><View><Text style={styles.statsLabel}>CHI</Text><Text style={[styles.statsValue, styles.expense]}>− {money(stats.expenseVnd)}</Text></View><View><Text style={styles.statsLabel}>CHÊNH LỆCH</Text><Text style={styles.statsValue}>{stats.incomeVnd - stats.expenseVnd < 0 ? "− " : "+ "}{money(stats.incomeVnd - stats.expenseVnd)}</Text></View></View>
              <View style={styles.chartLegend}><View style={[styles.legendDot, styles.chartIncome]} /><Text style={styles.legendText}>Thu</Text><View style={[styles.legendDot, styles.chartExpense]} /><Text style={styles.legendText}>Chi</Text></View>
              <FundBarChart stats={stats} />
              {stats.capped && <Text style={styles.capNote}>Khoảng thống kê có hơn 1.000 khoản; biểu đồ dùng 1.000 khoản gần nhất.</Text>}
            </>}
          </BloomCard>

          <BloomSectionHeader title="Lịch sử quỹ" subtitle="Ai ghi, đã chỉnh mấy lần và khoản nào đã khóa đều hiện rõ ở đây." />
          <View style={styles.filterRow}>{(["all", "income", "expense"] as FilterMode[]).map((key) => { const label = key === "all" ? "Tất cả" : key === "income" ? "Khoản thu" : "Khoản chi"; return <Pressable key={key} onPress={() => setFilter(key)} style={[styles.filterChip, filter === key && styles.filterChipActive]}><Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text></Pressable>; })}</View>
          {!!error && <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={17} color="#A7475B" /><Text style={styles.errorText}>{error}</Text></View>}
          {!simulateStats && loading ? <View style={styles.loadingBox}><ActivityIndicator color={COLORS.primary} /><Text style={styles.loadingText}>Đang mở sổ quỹ…</Text></View> : displayItems.length === 0 ? <BloomEmptyState icon="wallet-outline" title={filter === "all" ? "Quỹ đang chờ khoản đầu tiên" : "Chưa có khoản phù hợp"} description={filter === "all" ? (isFundTeam ? "Ghi một khoản đóng góp hoặc chi tiêu để bắt đầu." : "Khi nhóm quỹ ghi khoản đầu tiên, lịch sử sẽ xuất hiện ở đây.") : "Thử chuyển bộ lọc."} /> : (
            <View style={styles.historyList}>{displayItems.map((item) => {
              const meta = CATEGORY_META[item.category];
              const manageable = !simulateStats && canManage(item);
              const locked = homeFundService.isEditLocked(item);
              const updatedBy = memberByUid.get(item.updatedByUid);
              return <BloomCard key={item.id} style={styles.txCard} onPress={manageable ? () => { setEditing(item); setEditorVisible(true); } : undefined}>
                <View style={[styles.txIcon, { backgroundColor: meta.tone }]}><Ionicons name={meta.icon} size={20} color={COLORS.primaryText} /></View>
                <View style={styles.txCopy}><View style={styles.txTitleRow}><Text style={styles.txTitle} numberOfLines={1}>{item.note || meta.label}</Text><Text style={[styles.txAmount, item.type === "income" ? styles.income : styles.expense]}>{signedMoney(item.type, item.amountVnd)}</Text></View><Text style={styles.txMeta}>{meta.label} · {dateLabel(item.occurredOn)} · ghi bởi {item.createdByName}</Text><Text style={styles.auditInline}>Nhật ký: lần {item.revision}{item.revision > 1 ? ` · sửa gần nhất bởi ${memberName(updatedBy)}` : " · bản ghi đầu tiên"}</Text><Text style={[styles.lockHint, locked && styles.lockHintLocked]}>{locked ? "Đã khóa sau 3 ngày · không thể sửa/xóa" : manageable ? "Còn trong cửa sổ 3 ngày · chạm để sửa" : "Bạn không có quyền sửa khoản này"}</Text></View>
                {manageable && <Pressable onPress={() => setDeleteTarget(item)} hitSlop={8} style={({ pressed }) => [styles.deleteIcon, pressed && styles.pressed]}><Ionicons name="trash-outline" size={18} color={COLORS.destructive} /></Pressable>}
              </BloomCard>;
            })}</View>
          )}
          {!simulateStats && hasMore && filter === "all" && <Pressable disabled={loadingMore} onPress={() => void loadMore()} style={({ pressed }) => [styles.moreButton, pressed && styles.pressed, loadingMore && styles.disabled]}>{loadingMore ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="chevron-down" size={18} color={COLORS.primary} />}<Text style={styles.moreText}>Xem thêm 30 khoản</Text></Pressable>}

          <BloomSectionHeader title="Nhật ký quỹ" subtitle="Những lần ghi, sửa, xóa và bàn giao quỹ được lưu lại để cả nhà dễ đối chiếu." />
          <BloomCard style={styles.auditCard}>{displayAuditEvents.length === 0 ? <Text style={styles.auditEmpty}>Chưa có thay đổi nào được ghi lại.</Text> : displayAuditEvents.slice(0, 10).map((event, index) => <View key={event.id} style={[styles.auditRow, index > 0 && styles.auditRowBorder]}><View style={styles.auditDot} /><View style={styles.auditCopy}><Text style={styles.auditTitle}>{auditActionLabel[event.action]} · {event.actorName}</Text><Text style={styles.auditDetail}>{event.detail}</Text>{event.beforeLabel && <Text style={styles.auditSnapshot}>Trước: {event.beforeLabel}</Text>}{event.afterLabel && <Text style={styles.auditSnapshot}>Sau: {event.afterLabel}</Text>}<Text style={styles.auditTime}>{event.createdAt ? new Date(event.createdAt).toLocaleString("vi-VN") : ""}</Text></View></View>)}</BloomCard>

          <BloomCard tone="soft" style={styles.noteCard}><Ionicons name="lock-closed-outline" size={21} color="#4E8B6A" /><Text style={styles.noteText}>Đây là sổ quỹ nội bộ của gia đình, không lưu tài khoản hay thẻ và không chuyển tiền thật. Khoản quá 3 ngày sẽ được giữ nguyên để lịch sử luôn rõ ràng.</Text></BloomCard>
        </View>
      </ScrollView>

      <FundEditor visible={editorVisible} item={editing} onClose={() => { setEditorVisible(false); setEditing(null); }} onSaved={() => void refreshMonth()} />
      <HandoverFlow visible={handoverVisible} members={members} currentUid={uid} onClose={() => setHandoverVisible(false)} onSubmit={requestHandover} />
      <FundTeamFlow visible={teamVisible} members={members} currentUid={uid} initialUids={effectiveAssistantUids} initialTasks={effectiveAssistantTasks} onClose={() => setTeamVisible(false)} onSubmit={updateAssistants} />
      <BloomConfirmModal visible={!!deleteTarget} title="Xóa khoản này khỏi quỹ?" message={deleteTarget ? `${deleteTarget.note || CATEGORY_META[deleteTarget.category].label} · ${signedMoney(deleteTarget.type, deleteTarget.amountVnd)}. Bạn chỉ xóa được trong 3 ngày đầu; Nhật ký quỹ vẫn lưu lần xóa này.` : ""} confirmLabel={deleting ? "Đang xóa…" : "Xóa khoản"} cancelLabel="Giữ lại" destructive confirmDisabled={deleting} onCancel={() => { if (!deleting) setDeleteTarget(null); }} onConfirm={() => void removeItem()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 36 },
  body: { paddingHorizontal: 16, paddingTop: 18, gap: 17 },
  previewRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  balanceCard: { padding: 17, gap: 14, backgroundColor: "#F8FFFB" },
  balanceTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  balanceCopy: { flex: 1, minWidth: 0 },
  balanceKicker: { color: "#4E8B6A", fontSize: 9.5, fontWeight: "900", letterSpacing: 0.75 },
  balanceValue: { marginTop: 4, color: COLORS.primaryText, fontSize: 28, fontWeight: "900", letterSpacing: -0.8 },
  balanceNegative: { color: COLORS.destructive },
  balanceMeta: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "600" },
  walletIcon: { width: 52, height: 52, borderRadius: 19, backgroundColor: "#EAF7EF", alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", backgroundColor: "#FFFFFF", borderRadius: 18, padding: 12, alignItems: "center" },
  summaryItem: { flex: 1 },
  summaryDivider: { width: 1, height: 34, backgroundColor: COLORS.border, marginHorizontal: 10 },
  summaryLabel: { color: COLORS.secondaryText, fontSize: 8.5, fontWeight: "900", letterSpacing: 0.45 },
  summaryValue: { marginTop: 4, fontSize: 12.5, fontWeight: "900" },
  capNote: { color: "#8A6A35", fontSize: 10.5, lineHeight: 15, backgroundColor: "#FFF8E8", padding: 9, borderRadius: 12 },
  primaryAction: { minHeight: 50, borderRadius: 18, backgroundColor: "#4E8B6A", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryActionText: { color: "#fff", fontSize: 13.5, fontWeight: "900", textAlign: "center" },
  policyCard: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  policyText: { flex: 1, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
  inviteCard: { flexDirection: "row", gap: 12, borderWidth: 1.5, borderColor: "#E9C778", backgroundColor: "#FFF9EA" },
  inviteIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: "#FFF0C8", alignItems: "center", justifyContent: "center" },
  inviteCopy: { flex: 1 },
  inviteEyebrow: { color: "#8A6A35", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  inviteTitle: { marginTop: 3, color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  inviteNote: { marginTop: 6, color: "#755B36", fontSize: 11, lineHeight: 16, fontStyle: "italic" },
  inviteMeta: { marginTop: 5, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  inviteActions: { flexDirection: "row", gap: 8, marginTop: 11 },
  secondaryAction: { minHeight: 40, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  secondaryActionText: { color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "900" },
  acceptAction: { flex: 1, minHeight: 40, borderRadius: 14, backgroundColor: "#4E8B6A", alignItems: "center", justifyContent: "center" },
  acceptActionText: { color: "#fff", fontSize: 11.5, fontWeight: "900" },
  stewardCard: { gap: 12 },
  stewardHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  stewardBadge: { width: 50, height: 50, borderRadius: 18, backgroundColor: "#EAF7EF", alignItems: "center", justifyContent: "center" },
  stewardCopy: { flex: 1 },
  stewardEyebrow: { color: "#4E8B6A", fontSize: 8.5, fontWeight: "900", letterSpacing: 0.65 },
  stewardName: { marginTop: 3, color: COLORS.primaryText, fontSize: 16, fontWeight: "900" },
  stewardMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  assistantList: { gap: 8, paddingTop: 2 },
  assistantRow: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#FAF8F9", borderRadius: 15, padding: 9 },
  assistantAvatar: { width: 36, height: 36, borderRadius: 13, backgroundColor: "#F3EAF0", alignItems: "center", justifyContent: "center" },
  assistantAvatarText: { color: COLORS.primaryText, fontSize: 12, fontWeight: "900" },
  assistantCopy: { flex: 1 },
  assistantName: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  assistantTask: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10, lineHeight: 14 },
  noAssistant: { color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, backgroundColor: "#FAF8F9", padding: 10, borderRadius: 14 },
  stewardActions: { flexDirection: "row", gap: 8 },
  stewardButton: { flex: 1, minHeight: 41, borderRadius: 14, backgroundColor: COLORS.softSurface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  stewardButtonText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  pendingLine: { color: "#8A6A35", fontSize: 10, lineHeight: 15, backgroundColor: "#FFF8E8", borderRadius: 12, padding: 9 },
  statsCard: { gap: 13 },
  periodRow: { flexDirection: "row", gap: 7, alignItems: "center", flexWrap: "wrap" },
  periodChip: { minHeight: 36, paddingHorizontal: 13, borderRadius: 13, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  periodChipActive: { backgroundColor: COLORS.primary },
  periodText: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "900" },
  periodTextActive: { color: "#fff" },
  mockChip: { minHeight: 36, paddingHorizontal: 10, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", alignItems: "center", gap: 5 },
  mockChipActive: { backgroundColor: "#FFF4D8", borderColor: "#E6C46F" },
  mockText: { color: COLORS.secondaryText, fontSize: 9.5, fontWeight: "900" },
  mockTextActive: { color: "#805E26" },
  mockNote: { color: "#8A6A35", fontSize: 10, lineHeight: 14, backgroundColor: "#FFF8E8", padding: 8, borderRadius: 11 },
  statsLoading: { minHeight: 150, alignItems: "center", justifyContent: "center", gap: 8 },
  statsTotals: { flexDirection: "row", justifyContent: "space-between", gap: 9 },
  statsLabel: { color: COLORS.secondaryText, fontSize: 8, fontWeight: "900", letterSpacing: 0.45 },
  statsValue: { marginTop: 3, color: COLORS.primaryText, fontSize: 10.5, fontWeight: "900" },
  chartLegend: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { color: COLORS.secondaryText, fontSize: 9.5, fontWeight: "800", marginRight: 7 },
  chartScroll: { minWidth: "100%", gap: 12, alignItems: "flex-end", paddingTop: 6, paddingBottom: 2 },
  chartBucket: { minWidth: 42, alignItems: "center", gap: 5 },
  chartBars: { height: 98, flexDirection: "row", alignItems: "flex-end", gap: 4 },
  chartBar: { width: 12, borderRadius: 5 },
  chartIncome: { backgroundColor: "#79B792" },
  chartExpense: { backgroundColor: "#D98B8B" },
  chartLabel: { color: COLORS.secondaryText, fontSize: 8.5, fontWeight: "800" },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: { minHeight: 38, paddingHorizontal: 14, borderRadius: 14, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterText: { color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "900" },
  filterTextActive: { color: "#fff" },
  loadingBox: { minHeight: 120, alignItems: "center", justifyContent: "center", gap: 9 },
  loadingText: { color: COLORS.secondaryText, fontSize: 11.5 },
  historyList: { gap: 10 },
  txCard: { padding: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  txIcon: { width: 43, height: 43, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  txCopy: { flex: 1, minWidth: 0 },
  txTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  txTitle: { flex: 1, minWidth: 0, color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  txAmount: { fontSize: 11.5, fontWeight: "900" },
  income: { color: COLORS.positive },
  expense: { color: COLORS.destructive },
  txMeta: { marginTop: 4, color: COLORS.secondaryText, fontSize: 9.5, lineHeight: 14 },
  auditInline: { marginTop: 3, color: "#6C7B70", fontSize: 9.2, lineHeight: 13 },
  lockHint: { marginTop: 3, color: COLORS.primary, fontSize: 9.5, fontWeight: "800" },
  lockHintLocked: { color: "#8A6A35" },
  deleteIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: "#FFF0F3", alignItems: "center", justifyContent: "center" },
  moreButton: { minHeight: 45, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  moreText: { color: COLORS.primary, fontSize: 11.5, fontWeight: "900" },
  auditCard: { paddingVertical: 7 },
  auditEmpty: { color: COLORS.secondaryText, fontSize: 11, paddingVertical: 8 },
  auditRow: { flexDirection: "row", gap: 9, paddingVertical: 9 },
  auditRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  auditDot: { marginTop: 5, width: 9, height: 9, borderRadius: 5, backgroundColor: "#79B792" },
  auditCopy: { flex: 1 },
  auditTitle: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "900" },
  auditDetail: { marginTop: 2, color: COLORS.secondaryText, fontSize: 9.5, lineHeight: 14 },
  auditSnapshot: { marginTop: 2, color: "#6C7B70", fontSize: 8.8, lineHeight: 13 },
  auditTime: { marginTop: 2, color: "#9B8C92", fontSize: 8.5 },
  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noteText: { flex: 1, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 7, backgroundColor: "#FFF0F3", padding: 11, borderRadius: 14 },
  errorText: { flex: 1, color: "#A7475B", fontSize: 11.5, lineHeight: 16 },
  editorBody: { paddingHorizontal: 18, paddingTop: 20, gap: 13 },
  editorLabel: { color: COLORS.secondaryText, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.65, marginTop: 2 },
  typeRow: { flexDirection: "row", gap: 9 },
  typeButton: { flex: 1, minHeight: 50, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  typeIncomeActive: { backgroundColor: "#ECF8F0", borderColor: "#B8DEC6" },
  typeExpenseActive: { backgroundColor: "#FFF1F1", borderColor: "#F0C5C5" },
  typeText: { color: COLORS.secondaryText, fontSize: 12.5, fontWeight: "900" },
  typeIncomeText: { color: "#2F7951" },
  typeExpenseText: { color: "#A65353" },
  amountInputWrap: { minHeight: 68, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  inputInvalid: { borderColor: "#D76A7E", backgroundColor: "#FFF7F9" },
  amountInput: { flex: 1, color: COLORS.primaryText, fontSize: 28, fontWeight: "900", paddingVertical: 10 },
  currency: { color: "#4E8B6A", fontSize: 20, fontWeight: "900" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: { minHeight: 44, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: "row", alignItems: "center", gap: 7 },
  categoryChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.accentBg },
  categoryIcon: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  categoryText: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "800" },
  categoryTextActive: { color: COLORS.primaryText },
  noteInputWrap: { borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, padding: 12 },
  noteInput: { minHeight: 86, color: COLORS.primaryText, fontSize: 13, lineHeight: 19, padding: 0 },
  counter: { alignSelf: "flex-end", color: COLORS.secondaryText, fontSize: 9.5, marginTop: 5 },
  editorAudit: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "#F3F8F5", padding: 11, borderRadius: 14 },
  editorAuditText: { flex: 1, color: "#6B7D72", fontSize: 10.5, lineHeight: 15.5 },
  editorAuditStrong: { fontWeight: "900", color: "#4E6E5B" },
  saveButton: { minHeight: 52, borderRadius: 18, backgroundColor: "#4E8B6A", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  saveText: { color: "#fff", fontSize: 13.5, fontWeight: "900" },
  manageBody: { paddingHorizontal: 18, paddingTop: 20, gap: 14 },
  warningCard: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "#FFF8E8", padding: 11, borderRadius: 14 },
  warningText: { flex: 1, color: "#7D6438", fontSize: 10.5, lineHeight: 15.5 },
  taskBlock: { borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff", padding: 12 },
  taskName: { color: COLORS.primaryText, fontSize: 12, fontWeight: "900", marginBottom: 7 },
  taskInput: { minHeight: 66, color: COLORS.primaryText, fontSize: 12, lineHeight: 18, padding: 0 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.72 },
});
