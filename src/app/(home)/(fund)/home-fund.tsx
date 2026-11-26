import {userFacingMessage} from '../../../services/error/userFacingMessage';
import { BloomScaledInput } from '../../../components/ui/BloomScaledInput';
import { getBloomStatusBarStyle } from "../../../constants/theme";
import { useBloomThemeRevision , useBloomColorsRevision, useBloomTypographyRevision} from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, type TextInput, type TextInputProps,  } from 'react-native';
import { BloomText as Text } from '../../../components/ui/BloomText';
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomKeyboardScreen } from "../../../components/layout/BloomKeyboardScreen";
import { FamilyMemberPicker } from "../../../components/family/FamilyMemberPicker";
import { BloomConfirmModal } from "../../../components/ui/BloomConfirmModal";
import { BloomFullScreenFlow } from "../../../components/ui/BloomFullScreenFlow";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { BloomDatePicker } from "../../../components/ui/BloomInputComponents/BloomDatePicker";
import { BloomTextInput } from "../../../components/ui/BloomInputComponents/BloomTextInput";
import { BloomCard, BloomEmptyState, BloomPill, BloomSectionHeader } from "../../../components/ui/BloomPageComponents";
import { useBloomToast } from "../../../components/ui/BloomToast";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useFamilyMembersRealtime } from "../../../context/FamilyRealtimeContext";
import { homeFundService, type HomeFundPageCursor } from "../../../services/home/homeFundService";
import { activityService } from "../../../services/activity/activityService";
import type { FamilyMember } from "../../../types";
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
} from "../../../types/homeLiving";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


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
  contribution: { label: "Đóng góp", icon: "people-outline", tone: "theme" },
  groceries: { label: "Ăn uống", icon: "basket-outline", tone: "theme" },
  household: { label: "Đồ dùng", icon: "home-outline", tone: "theme" },
  event: { label: "Sự kiện", icon: "calendar-outline", tone: "theme" },
  travel: { label: "Đi lại", icon: "car-outline", tone: "theme" },
  gift: { label: "Quà tặng", icon: "gift-outline", tone: "theme" },
  refund: { label: "Hoàn tiền", icon: "return-down-back-outline", tone: "theme" },
  other: { label: "Khác", icon: "ellipsis-horizontal-circle-outline", tone: "theme" },
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

function FundKeyboardTextInput({
  inputRef: externalInputRef,
  extraGap: _extraGap,
  multiline,
  style,
  ...props
}: TextInputProps & { inputRef?: React.RefObject<TextInput | null>; extraGap?: number }) {
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  const fallbackRef = useRef<TextInput>(null);
  const inputRef = externalInputRef ?? fallbackRef;

  return (
    <BloomTextInput
      ref={inputRef}
      {...props}
      multiline={multiline}
      inputStyle={style}
      containerStyle={__a3_styles.fundInputField}
      helperTone="warm"
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
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
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
  const savingRef = useRef(false);
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
    savingRef.current = false;
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
    if (!activeFamilyId || !uid || saving || savingRef.current) return;
    const amountVnd = Number(amountDigits || 0);
    if (!amountVnd) {
      setError("Nhập số tiền trước khi lưu nhé.");
      amountRef.current?.focus();
      return;
    }
    savingRef.current = true;
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
      setError(userFacingMessage(e,"Không lưu được khoản thu/chi."));
    } finally {
      savingRef.current = false;
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
        <BloomKeyboardScreen contentContainerStyle={__a3_styles.editorBody}>
          <Text style={__a3_styles.editorLabel}>LOẠI GIAO DỊCH</Text>
          <View style={__a3_styles.typeRow}>
            <Pressable onPress={() => switchType("income")} style={[__a3_styles.typeButton, type === "income" && __a3_styles.typeIncomeActive]}>
              <Ionicons name="arrow-down-circle-outline" size={20} color={type === "income" ? __a3Colors.positive : __a3Colors.secondaryText} />
              <Text style={[__a3_styles.typeText, type === "income" && __a3_styles.typeIncomeText]}>Khoản thu</Text>
            </Pressable>
            <Pressable onPress={() => switchType("expense")} style={[__a3_styles.typeButton, type === "expense" && __a3_styles.typeExpenseActive]}>
              <Ionicons name="arrow-up-circle-outline" size={20} color={type === "expense" ? __a3Colors.primary : __a3Colors.secondaryText} />
              <Text style={[__a3_styles.typeText, type === "expense" && __a3_styles.typeExpenseText]}>Khoản chi</Text>
            </Pressable>
          </View>

          <Text style={__a3_styles.editorLabel}>SỐ TIỀN</Text>
          <View style={[__a3_styles.amountInputWrap, !!error && !amountDigits && __a3_styles.inputInvalid]}>
            <BloomScaledInput
              ref={amountRef}
              appearanceTone="primaryText"
              value={formatAmountInput(amountDigits)}
              onChangeText={(value) => {
                setAmountDigits(value.replace(/\D/g, "").slice(0, 10));
                setDirty(true);
                setError(null);
              }}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={__a3Colors.muted}
              style={__a3_styles.amountInput}
              accessibilityLabel="Số tiền Việt Nam đồng"
            />
            <Text style={__a3_styles.currency}>₫</Text>
          </View>

          <Text style={__a3_styles.editorLabel}>NHÓM</Text>
          <View style={__a3_styles.categoryGrid}>
            {categories.map((key) => {
              const meta = CATEGORY_META[key];
              const selected = category === key;
              return (
                <Pressable key={key} onPress={() => { setCategory(key); setDirty(true); }} style={[__a3_styles.categoryChip, selected && __a3_styles.categoryChipActive]}>
                  <View style={[__a3_styles.categoryIcon, { backgroundColor: __a3Colors.iconBackground }]}><Ionicons name={meta.icon} size={16} color={__a3Colors.primaryText} /></View>
                  <Text style={[__a3_styles.categoryText, selected && __a3_styles.categoryTextActive]}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={__a3_styles.editorLabel}>NGÀY GHI QUỸ</Text>
          <BloomDatePicker selectedDate={occurredDate} onDateChange={(date) => { setOccurredDate(date); setDirty(true); }} maximumDate={new Date()} />

          <Text style={__a3_styles.editorLabel}>GHI CHÚ</Text>
          <View style={__a3_styles.noteInputWrap}>
            <FundKeyboardTextInput
              inputRef={noteRef}
              value={note}
              onChangeText={(value) => { setNote(value.slice(0, 240)); setDirty(true); }}
              placeholder="Ví dụ: tiền chợ cuối tuần"
              placeholderTextColor={__a3Colors.muted}
              multiline
              style={__a3_styles.noteInput}
            />
            <Text style={__a3_styles.counter}>{note.length}/240</Text>
          </View>

          <View style={__a3_styles.editorAudit}>
            <Ionicons name="footsteps-outline" size={18} color={__a3Colors.positive} />
            <Text style={__a3_styles.editorAuditText}><Text style={__a3_styles.editorAuditStrong}>Nhật ký quỹ:</Text> tên người ghi và những lần chỉnh sửa đều được giữ lại. Sau 3 ngày, khoản này sẽ được khóa.</Text>
          </View>
          {!!error && <View style={__a3_styles.errorBox}><Ionicons name="alert-circle-outline" size={17} color={__a3Colors.primary} /><Text style={__a3_styles.errorText}>{error}</Text></View>}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving || !Number(amountDigits) }} disabled={saving || !Number(amountDigits)} onPress={() => void save()} style={({ pressed }) => [__a3_styles.saveButton, !Number(amountDigits) && __a3_styles.saveButtonUnavailable, saving && __a3_styles.disabled, pressed && __a3_styles.pressed]}>
            {saving ? <ActivityIndicator color={__a3Colors.onPrimary} /> : <Ionicons name="checkmark-circle-outline" size={20} color={__a3Colors.onPrimary} />}
            <Text style={__a3_styles.saveText}>{item ? "Lưu thay đổi" : "Ghi vào sổ quỹ"}</Text>
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
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  const maxValue = Math.max(1, ...stats.buckets.flatMap((bucket) => [bucket.incomeVnd, bucket.expenseVnd]));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={__a3_styles.chartScroll}>
      {stats.buckets.map((bucket) => {
        const incomeHeight = bucket.incomeVnd ? Math.max(8, Math.round((bucket.incomeVnd / maxValue) * 92)) : 3;
        const expenseHeight = bucket.expenseVnd ? Math.max(8, Math.round((bucket.expenseVnd / maxValue) * 92)) : 3;
        return (
          <View key={bucket.key} style={__a3_styles.chartBucket}>
            <View style={__a3_styles.chartBars}>
              <View style={[__a3_styles.chartBar, __a3_styles.chartIncome, { height: incomeHeight }]} />
              <View style={[__a3_styles.chartBar, __a3_styles.chartExpense, { height: expenseHeight }]} />
            </View>
            <Text style={__a3_styles.chartLabel} numberOfLines={1}>{bucket.label}</Text>
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
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
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
    catch (e) { setError(userFacingMessage(e,"Chưa gửi được lời mời bàn giao.")); }
    finally { setSaving(false); }
  };
  return (
    <BloomFullScreenFlow visible={visible} eyebrow="BÀN GIAO QUỸ" title="Bàn giao quỹ" subtitle="Chọn người bạn tin cậy. Quyền chỉ chuyển sau khi họ đồng ý." variant="fund" compactHeader backDisabled={saving} onBack={onClose}>
      <BloomKeyboardScreen contentContainerStyle={__a3_styles.manageBody}>
        <FamilyMemberPicker label="Người nhận bàn giao" hint="Chọn một thành viên đang dùng Family Bloom trong nhà." members={members} selectedUids={selectedUids} onChange={setSelectedUids} mode="single" currentUid={currentUid} excludeUids={[currentUid]} variant="fund" />
        <Text style={__a3_styles.editorLabel}>LỜI NHẮN BÀN GIAO</Text>
        <View style={__a3_styles.noteInputWrap}>
          <FundKeyboardTextInput value={note} onChangeText={(value) => setNote(value.slice(0, 200))} placeholder="Có điều gì bạn muốn nhắn trước khi giao quỹ?" placeholderTextColor={__a3Colors.muted} multiline style={__a3_styles.noteInput} />
          <Text style={__a3_styles.counter}>{note.length}/200</Text>
        </View>
        <View style={__a3_styles.warningCard}><Ionicons name="shield-checkmark-outline" size={19} color={__a3Colors.attention} /><Text style={__a3_styles.warningText}>Khi họ đồng ý, họ sẽ trở thành người giữ quỹ chính. Bạn chỉ tiếp tục nhập thu · chi nếu được mời lại vào nhóm quỹ.</Text></View>
        {!!error && <View style={__a3_styles.errorBox}><Ionicons name="alert-circle-outline" size={17} color={__a3Colors.primary} /><Text style={__a3_styles.errorText}>{error}</Text></View>}
        <Pressable disabled={saving} onPress={() => void submit()} style={({ pressed }) => [__a3_styles.saveButton, saving && __a3_styles.disabled, pressed && __a3_styles.pressed]}>
          {saving ? <ActivityIndicator color={__a3Colors.white} /> : <Ionicons name="paper-plane-outline" size={19} color={__a3Colors.white} />}
          <Text style={__a3_styles.saveText}>Gửi lời mời bàn giao</Text>
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
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
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
    catch (e) { setError(userFacingMessage(e,"Chưa cập nhật được nhóm quỹ.")); }
    finally { setSaving(false); }
  };
  return (
    <BloomFullScreenFlow visible={visible} eyebrow="NHÓM GIỮ QUỸ" title="Cùng giữ quỹ" subtitle="Bạn có thể chọn tối đa 2 người hỗ trợ và ghi rõ phần việc của mỗi người." variant="fund" compactHeader backDisabled={saving} onBack={onClose}>
      <BloomKeyboardScreen contentContainerStyle={__a3_styles.manageBody}>
        <FamilyMemberPicker label="Người cùng tham gia" hint="Chọn tối đa 2 người hỗ trợ bạn. Bạn đã là thủ quỹ chính nên không cần chọn lại." members={members} selectedUids={selectedUids} onChange={changeSelection} mode="multiple" currentUid={currentUid} excludeUids={[currentUid]} variant="fund" />
        {selectedUids.map((selectedUid) => {
          const selectedMember = members.find((member) => member.uid === selectedUid);
          return (
            <View key={selectedUid} style={__a3_styles.taskBlock}>
              <Text style={__a3_styles.taskName}>{memberName(selectedMember)}</Text>
              <FundKeyboardTextInput value={tasks[selectedUid] || ""} onChangeText={(value) => setTasks((current) => ({ ...current, [selectedUid]: value.slice(0, 160) }))} placeholder="Ví dụ: Theo dõi tiền chợ và hóa đơn mỗi tuần" placeholderTextColor={__a3Colors.muted} multiline style={__a3_styles.taskInput} />
              <Text style={__a3_styles.counter}>{(tasks[selectedUid] || "").length}/160</Text>
            </View>
          );
        })}
        {!!error && <View style={__a3_styles.errorBox}><Ionicons name="alert-circle-outline" size={17} color={__a3Colors.primary} /><Text style={__a3_styles.errorText}>{error}</Text></View>}
        <Pressable disabled={saving} onPress={() => void submit()} style={({ pressed }) => [__a3_styles.saveButton, saving && __a3_styles.disabled, pressed && __a3_styles.pressed]}>
          {saving ? <ActivityIndicator color={__a3Colors.white} /> : <Ionicons name="people-outline" size={19} color={__a3Colors.white} />}
          <Text style={__a3_styles.saveText}>Lưu nhóm giữ quỹ</Text>
        </Pressable>
      </BloomKeyboardScreen>
    </BloomFullScreenFlow>
  );
}

export default function HomeFundScreen() {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
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
  const [stats, setStats] = useState<HomeFundStats>({ period: "month", buckets: [], incomeVnd: 0, expenseVnd: 0, transactionCount: 0, capped: false });
  const [statsLoading, setStatsLoading] = useState(false);
  const [auditEvents, setAuditEvents] = useState<HomeFundAuditEvent[]>([]);
  const monthKey = currentMonthKey();

  const memberByUid = useMemo(() => new Map(members.map((member) => [member.uid, member])), [members]);
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
    const stopSummary = homeFundService.subscribeSummary(activeFamilyId, (next) => { settledSummary = true; setSummary(next); settle(); }, (e) => { settledSummary = true; setError(userFacingMessage(e,"Không tải được số dư quỹ.")); settle(); });
    const stopRows = homeFundService.subscribeRecent(activeFamilyId, (page) => {
      settledRows = true;
      setHeadItems(page.items);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      setExtraItems((current) => current.filter((row) => !page.items.some((head) => head.id === row.id)));
      void refreshMonth();
      settle();
    }, (e) => { settledRows = true; setError(userFacingMessage(e,"Không tải được lịch sử quỹ.")); settle(); });
    const stopControl = homeFundService.subscribeControl(activeFamilyId, (next) => { settledControl = true; setControl(next); settle(); }, (e) => { settledControl = true; setError(userFacingMessage(e,"Không tải được người giữ quỹ.")); settle(); });
    return () => { stopSummary(); stopRows(); stopControl(); };
  }, [activeFamilyId, refreshMonth]);

  useEffect(() => {
    if (!activeFamilyId || !uid || control || uid !== defaultPrimaryUid) return;
    void homeFundService.ensureInitialControl(activeFamilyId, uid, actorName).catch((e) => setError(userFacingMessage(e,"Chưa khởi tạo được quyền thủ quỹ.")));
  }, [activeFamilyId, actorName, control, defaultPrimaryUid, uid]);

  useEffect(() => {
    if (!activeFamilyId) return;
    let live = true;
    setStatsLoading(true);
    void homeFundService.fetchStats(activeFamilyId, statsPeriod).then((next) => { if (live) setStats(next); }).catch((e) => { if (live) setError(userFacingMessage(e,"Không tải được thống kê quỹ.")); }).finally(() => { if (live) setStatsLoading(false); });
    return () => { live = false; };
  }, [activeFamilyId, statsPeriod, summary.lastAuditId]);

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
  const displaySummary = summary;
  const displayMonthTotals = monthTotals;
  const displayAuditEvents = auditEvents;
  const displayItems = useMemo(() => filter === "all" ? allItems : allItems.filter((row) => row.type === filter), [allItems, filter]);
  const canManage = useCallback((item: HomeFundTransaction) => {
    if (homeFundService.isEditLocked(item)) return false;
    if (isPrimary) return true;
    return isAssistant && item.createdByUid === uid;
  }, [isAssistant, isPrimary, uid]);

  const openCreate = () => {
    if (!isFundTeam) {
      showToast({ type: "warning", title: "Chỉ nhóm quỹ được ghi thu · chi", message: "Thủ quỹ chính có thể mời tối đa 2 người cùng tham gia và mô tả rõ nhiệm vụ." });
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
    void activityService.createFundHandoverNotice({
      familyId: activeFamilyId, actorUid: uid, actorName, targetUid,
      title: "Bạn có lời mời nhận bàn giao quỹ",
      body: `${actorName} đề nghị bạn nhận trách nhiệm thủ quỹ. Mở Quỹ gia đình để đồng ý hoặc từ chối.`,
      eventId: `request-${uid}-${targetUid}-${Date.now()}`,
    }).catch(() => showToast({ type: "warning", title: "Đã lưu lời mời, chưa gửi được thông báo", message: "Lời mời vẫn xuất hiện trong Quỹ gia đình. Có thể kiểm tra lại kết nối." }));
  };
  const resolveHandover = async (accept: boolean) => {
    if (!activeFamilyId || resolvingHandover) return;
    setResolvingHandover(true);
    try {
      const previousStewardUid = control?.pendingTransferRequestedByUid ?? null;
      await homeFundService.resolveHandover({ familyId: activeFamilyId, actorUid: uid, actorName, accept });
      showToast({ type: "success", title: accept ? "Bạn đã nhận quỹ" : "Đã từ chối bàn giao", message: accept ? "Từ bây giờ bạn là người chịu trách nhiệm chính." : "Quyền vẫn ở người đang giữ quỹ trước đó." });
      if (previousStewardUid && previousStewardUid !== uid) {
        void activityService.createFundHandoverNotice({
          familyId: activeFamilyId, actorUid: uid, actorName, targetUid: previousStewardUid,
          title: accept ? "Bàn giao quỹ đã được chấp nhận" : "Lời mời bàn giao quỹ đã bị từ chối",
          body: accept ? `${actorName} đã xác nhận nhận trách nhiệm thủ quỹ.` : `${actorName} chưa nhận bàn giao. Bạn vẫn là thủ quỹ chính.`,
          eventId: `response-${uid}-${previousStewardUid}-${Date.now()}`,
        }).catch(() => showToast({ type: "warning", title: "Chưa gửi được thông báo bàn giao", message: "Trạng thái quỹ đã cập nhật thành công." }));
      }
    } catch (e) { showToast({ type: "error", title: "Chưa xử lý được bàn giao", message: e instanceof Error ? e.message : "Hãy thử lại." }); }
    finally { setResolvingHandover(false); }
  };
  const cancelHandover = async () => {
    if (!activeFamilyId) return;
    const cancelledRecipient = control?.pendingTransferToUid || null;
    try {
      await homeFundService.cancelHandover({ familyId: activeFamilyId, actorUid: uid, actorName });
      showToast({ type: "success", title: "Đã hủy bàn giao", message: "Bạn vẫn là thủ quỹ chính." });
      if (cancelledRecipient && cancelledRecipient !== uid) {
        void activityService.createFundHandoverNotice({
          familyId: activeFamilyId, actorUid: uid, actorName, targetUid: cancelledRecipient,
          title: "Lời mời bàn giao quỹ đã được hủy",
          body: `${actorName} đã hủy lời mời; bạn không cần xác nhận nhận quỹ nữa.`,
          eventId: `cancel-${uid}-${cancelledRecipient}-${Date.now()}`,
        }).catch(() => showToast({ type: "warning", title: "Đã hủy lời mời nhưng chưa gửi được thông báo", message: "Trạng thái quỹ đã được cập nhật." }));
      }
    } catch (e) { showToast({ type: "error", title: "Không hủy được", message: e instanceof Error ? e.message : "Hãy thử lại." }); }
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
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
      <ScrollView contentContainerStyle={__a3_styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader eyebrow="QUỸ GIA ĐÌNH" title="Cùng giữ quỹ nhà mình" subtitle="Một người chịu trách nhiệm chính, có thể nhờ thêm người hỗ trợ. Mọi khoản thu chi đều có lịch sử rõ ràng." variant="fund" onBack={() => router.back()} roundedBottom compact />
        <View style={__a3_styles.body}>
          <View style={__a3_styles.previewRow}>
            <BloomPill icon="shield-checkmark-outline" label="Có nhật ký" />
            <BloomPill icon="time-outline" label="Sửa trong 3 ngày" />
            <BloomPill icon="people-outline" label={isPrimary ? "Bạn là thủ quỹ chính" : isAssistant ? "Bạn thuộc nhóm quỹ" : "Chỉ xem quỹ"} />
          </View>

          {pendingForMe && (
            <BloomCard style={__a3_styles.inviteCard}>
              <View style={__a3_styles.inviteIcon}><Ionicons name="key-outline" size={23} color={__a3Colors.primary} /></View>
              <View style={__a3_styles.inviteCopy}>
                <Text style={__a3_styles.inviteEyebrow}>LỜI MỜI BÀN GIAO QUỸ</Text>
                <Text style={__a3_styles.inviteTitle}>{memberName(memberByUid.get(control?.pendingTransferRequestedByUid || ""))} muốn giao quỹ cho bạn</Text>
                {!!control?.pendingTransferNote && <Text style={__a3_styles.inviteNote}>“{control.pendingTransferNote}”</Text>}
                <Text style={__a3_styles.inviteMeta}>Chỉ khi bạn đồng ý thì quyền thu · chi mới chuyển sang bạn.</Text>
                <View style={__a3_styles.inviteActions}>
                  <Pressable disabled={resolvingHandover} onPress={() => void resolveHandover(false)} style={({ pressed }) => [__a3_styles.secondaryAction, pressed && __a3_styles.pressed]}><Text style={__a3_styles.secondaryActionText}>Từ chối</Text></Pressable>
                  <Pressable accessibilityRole="button" accessibilityState={{ disabled: resolvingHandover, busy: resolvingHandover }} disabled={resolvingHandover} onPress={() => void resolveHandover(true)} style={({ pressed }) => [__a3_styles.acceptAction, resolvingHandover && __a3_styles.disabled, pressed && __a3_styles.pressed]}>{resolvingHandover ? <ActivityIndicator color={__a3Colors.white} size="small" /> : <Text style={__a3_styles.acceptActionText}>Đồng ý nhận quỹ</Text>}</Pressable>
                </View>
              </View>
            </BloomCard>
          )}

          <BloomCard style={__a3_styles.stewardCard}>
            <View style={__a3_styles.stewardHeader}>
              <View style={__a3_styles.stewardBadge}><Ionicons name="shield-checkmark" size={24} color={__a3Colors.primary} /></View>
              <View style={__a3_styles.stewardCopy}>
                <Text style={__a3_styles.stewardEyebrow}>NGƯỜI CHỊU TRÁCH NHIỆM CHÍNH</Text>
                <Text style={__a3_styles.stewardName}>{memberName(primaryMember)}</Text>
                <Text style={__a3_styles.stewardMeta}>{control ? "Thủ quỹ đã được xác nhận" : "Người giữ nhà tạm chăm quỹ cho đến khi việc bàn giao được đồng ý"}</Text>
              </View>
            </View>
            {effectiveAssistantUids.length ? (
              <View style={__a3_styles.assistantList}>
                {effectiveAssistantUids.map((assistantUid) => (
                  <View key={assistantUid} style={__a3_styles.assistantRow}>
                    <View style={__a3_styles.assistantAvatar}><Text style={__a3_styles.assistantAvatarText}>{memberName(memberByUid.get(assistantUid)).slice(-1).toUpperCase()}</Text></View>
                    <View style={__a3_styles.assistantCopy}><Text style={__a3_styles.assistantName}>{memberName(memberByUid.get(assistantUid))}</Text><Text style={__a3_styles.assistantTask}>{effectiveAssistantTasks[assistantUid] || "Cùng tham gia ghi sổ quỹ"}</Text></View>
                  </View>
                ))}
              </View>
            ) : <Text style={__a3_styles.noAssistant}>Chưa có người cùng tham gia. Thủ quỹ chính có thể mời tối đa 2 người.</Text>}
            {isPrimary && (
              <View style={__a3_styles.stewardActions}>
                <Pressable onPress={() => setTeamVisible(true)} style={({ pressed }) => [__a3_styles.stewardButton, pressed && __a3_styles.pressed]}><Ionicons name="people-outline" size={17} color={__a3Colors.primary} /><Text style={__a3_styles.stewardButtonText}>Nhóm quỹ</Text></Pressable>
                {pendingFromMe ? (
                  <Pressable onPress={() => void cancelHandover()} style={({ pressed }) => [__a3_styles.stewardButton, pressed && __a3_styles.pressed]}><Ionicons name="close-circle-outline" size={17} color={__a3Colors.primary} /><Text style={[__a3_styles.stewardButtonText, { color: __a3Colors.primary }]}>Hủy bàn giao</Text></Pressable>
                ) : (
                  <Pressable onPress={() => setHandoverVisible(true)} style={({ pressed }) => [__a3_styles.stewardButton, pressed && __a3_styles.pressed]}><Ionicons name="swap-horizontal-outline" size={17} color={__a3Colors.primary} /><Text style={__a3_styles.stewardButtonText}>Bàn giao</Text></Pressable>
                )}
              </View>
            )}
            {pendingFromMe && <Text style={__a3_styles.pendingLine}>Đang chờ {memberName(pendingTarget)} xác nhận. Trong lúc chờ, quyền của bạn vẫn giữ nguyên.</Text>}
          </BloomCard>

          <BloomCard style={__a3_styles.balanceCard}>
            <View style={__a3_styles.balanceTop}>
              <View style={__a3_styles.balanceCopy}><Text style={__a3_styles.balanceKicker}>SỐ DƯ QUỸ HIỆN TẠI</Text><Text style={[__a3_styles.balanceValue, displaySummary.balanceVnd < 0 && __a3_styles.balanceNegative]}>{displaySummary.balanceVnd < 0 ? "− " : ""}{money(displaySummary.balanceVnd)}</Text><Text style={__a3_styles.balanceMeta}>{displaySummary.transactionCount.toLocaleString("vi-VN")} khoản đang có · luôn theo nhịp của cả nhà</Text></View>
              <View style={__a3_styles.walletIcon}><Ionicons name="wallet" size={27} color={__a3Colors.primary} /></View>
            </View>
            <View style={__a3_styles.summaryRow}>
              <View style={__a3_styles.summaryItem}><Text style={__a3_styles.summaryLabel}>{monthLabel(monthKey).toUpperCase()} · THU</Text><Text style={[__a3_styles.summaryValue, __a3_styles.income]}>+ {money(displayMonthTotals.incomeVnd)}</Text></View>
              <View style={__a3_styles.summaryDivider} />
              <View style={__a3_styles.summaryItem}><Text style={__a3_styles.summaryLabel}>ĐÃ CHI</Text><Text style={[__a3_styles.summaryValue, __a3_styles.expense]}>− {money(displayMonthTotals.expenseVnd)}</Text></View>
            </View>
            {displayMonthTotals.capped && <Text style={__a3_styles.capNote}>Tháng này có hơn 500 giao dịch; tổng tháng dùng 500 khoản gần nhất để giữ màn hình nhẹ.</Text>}
            <Pressable disabled={!isFundTeam} onPress={openCreate} accessibilityRole="button"
              accessibilityState={{ disabled: !isFundTeam }}
              style={({ pressed }) => [__a3_styles.primaryAction, !isFundTeam && {backgroundColor: __a3Colors.softSurface}, pressed && isFundTeam && __a3_styles.pressed]}>
              <Ionicons name={isFundTeam ? "add-circle-outline" : "lock-closed-outline"} size={21} color={isFundTeam ? __a3Colors.onPrimary : __a3Colors.secondaryText} />
              <Text style={[__a3_styles.primaryActionText, !isFundTeam && {color: __a3Colors.secondaryText}]}>{isFundTeam ? "Ghi khoản thu · chi" : "Chỉ nhóm quỹ được nhập thu · chi"}</Text>
            </Pressable>
          </BloomCard>

          <BloomCard tone="soft" style={__a3_styles.policyCard}><Ionicons name="information-circle-outline" size={20} color={__a3Colors.primary} /><Text style={__a3_styles.policyText}>Chỉ những người trong nhóm quỹ mới được ghi thu · chi. Nếu nhập nhầm, bạn có 3 ngày để sửa hoặc xóa; sau đó hãy tạo một khoản điều chỉnh mới.</Text></BloomCard>

          <BloomSectionHeader title="Thống kê quỹ" subtitle={`${statsPeriodLabel} · xem thu và chi thay đổi theo thời gian.`} />
          <BloomCard style={__a3_styles.statsCard}>
            <View style={__a3_styles.periodRow}>
              {(["day", "month", "year"] as HomeFundStatsPeriod[]).map((period) => <Pressable key={period} onPress={() => setStatsPeriod(period)} style={[__a3_styles.periodChip, statsPeriod === period && __a3_styles.periodChipActive]}><Text style={[__a3_styles.periodText, statsPeriod === period && __a3_styles.periodTextActive]}>{period === "day" ? "Ngày" : period === "month" ? "Tháng" : "Năm"}</Text></Pressable>)}
            </View>
            {statsLoading ? <View style={__a3_styles.statsLoading}><ActivityIndicator color={__a3Colors.primary} /><Text style={__a3_styles.loadingText}>Đang tính thống kê…</Text></View> : <>
              <View style={__a3_styles.statsTotals}><View><Text style={__a3_styles.statsLabel}>THU</Text><Text style={[__a3_styles.statsValue, __a3_styles.income]}>+ {money(stats.incomeVnd)}</Text></View><View><Text style={__a3_styles.statsLabel}>CHI</Text><Text style={[__a3_styles.statsValue, __a3_styles.expense]}>− {money(stats.expenseVnd)}</Text></View><View><Text style={__a3_styles.statsLabel}>CHÊNH LỆCH</Text><Text style={__a3_styles.statsValue}>{stats.incomeVnd - stats.expenseVnd < 0 ? "− " : "+ "}{money(stats.incomeVnd - stats.expenseVnd)}</Text></View></View>
              <View style={__a3_styles.chartLegend}><View style={[__a3_styles.legendDot, __a3_styles.chartIncome]} /><Text style={__a3_styles.legendText}>Thu</Text><View style={[__a3_styles.legendDot, __a3_styles.chartExpense]} /><Text style={__a3_styles.legendText}>Chi</Text></View>
              <FundBarChart stats={stats} />
              {stats.capped && <Text style={__a3_styles.capNote}>Khoảng thống kê có hơn 1.000 khoản; biểu đồ dùng 1.000 khoản gần nhất.</Text>}
            </>}
          </BloomCard>

          <BloomSectionHeader title="Lịch sử quỹ" subtitle="Ai ghi, đã chỉnh mấy lần và khoản nào đã khóa đều hiện rõ ở đây." />
          <View style={__a3_styles.filterRow}>{(["all", "income", "expense"] as FilterMode[]).map((key) => { const label = key === "all" ? "Tất cả" : key === "income" ? "Khoản thu" : "Khoản chi"; return <Pressable key={key} onPress={() => setFilter(key)} style={[__a3_styles.filterChip, filter === key && __a3_styles.filterChipActive]}><Text style={[__a3_styles.filterText, filter === key && __a3_styles.filterTextActive]}>{label}</Text></Pressable>; })}</View>
          {!!error && <View style={__a3_styles.errorBox}><Ionicons name="alert-circle-outline" size={17} color={__a3Colors.primary} /><Text style={__a3_styles.errorText}>{error}</Text></View>}
          {loading ? <View style={__a3_styles.loadingBox}><ActivityIndicator color={__a3Colors.primary} /><Text style={__a3_styles.loadingText}>Đang mở sổ quỹ…</Text></View> : displayItems.length === 0 ? <BloomEmptyState icon="wallet-outline" title={filter === "all" ? "Quỹ đang chờ khoản đầu tiên" : "Chưa có khoản phù hợp"} description={filter === "all" ? (isFundTeam ? "Ghi một khoản đóng góp hoặc chi tiêu để bắt đầu." : "Khi nhóm quỹ ghi khoản đầu tiên, lịch sử sẽ xuất hiện ở đây.") : "Thử chuyển bộ lọc."} /> : (
            <View style={__a3_styles.historyList}>{displayItems.map((item) => {
              const meta = CATEGORY_META[item.category];
              const manageable = canManage(item);
              const locked = homeFundService.isEditLocked(item);
              const updatedBy = memberByUid.get(item.updatedByUid);
              return <BloomCard key={item.id} style={__a3_styles.txCard} onPress={manageable ? () => { setEditing(item); setEditorVisible(true); } : undefined}>
                <View style={[__a3_styles.txIcon, { backgroundColor: __a3Colors.iconBackground }]}><Ionicons name={meta.icon} size={20} color={__a3Colors.primaryText} /></View>
                <View style={__a3_styles.txCopy}><View style={__a3_styles.txTitleRow}><Text style={__a3_styles.txTitle} numberOfLines={1}>{item.note || meta.label}</Text><Text style={[__a3_styles.txAmount, item.type === "income" ? __a3_styles.income : __a3_styles.expense]}>{signedMoney(item.type, item.amountVnd)}</Text></View><Text style={__a3_styles.txMeta}>{meta.label} · {dateLabel(item.occurredOn)} · ghi bởi {item.createdByName}</Text><Text style={__a3_styles.auditInline}>Lần cập nhật {item.revision}{item.revision > 1 ? ` · gần nhất bởi ${memberName(updatedBy)}` : " · lần ghi đầu tiên"}</Text><Text style={[__a3_styles.lockHint, locked && __a3_styles.lockHintLocked]}>{locked ? "Đã qua 3 ngày nên khoản này được giữ nguyên" : manageable ? "Vẫn còn trong 3 ngày · chạm để chỉnh lại" : "Khoản này đang được người giữ quỹ chăm sóc"}</Text></View>
                {manageable && <Pressable onPress={() => setDeleteTarget(item)} hitSlop={8} style={({ pressed }) => [__a3_styles.deleteIcon, pressed && __a3_styles.pressed]}><Ionicons name="trash-outline" size={18} color={__a3Colors.destructive} /></Pressable>}
              </BloomCard>;
            })}</View>
          )}
          {hasMore && filter === "all" && <Pressable disabled={loadingMore} onPress={() => void loadMore()} style={({ pressed }) => [__a3_styles.moreButton, pressed && __a3_styles.pressed, loadingMore && __a3_styles.disabled]}>{loadingMore ? <ActivityIndicator size="small" color={__a3Colors.primary} /> : <Ionicons name="chevron-down" size={18} color={__a3Colors.primary} />}<Text style={__a3_styles.moreText}>Xem thêm 30 khoản</Text></Pressable>}

          <BloomSectionHeader title="Nhật ký quỹ" subtitle="Những lần ghi, sửa, xóa và bàn giao quỹ được lưu lại để cả nhà dễ đối chiếu." />
          <BloomCard style={__a3_styles.auditCard}>{displayAuditEvents.length === 0 ? <Text style={__a3_styles.auditEmpty}>Chưa có thay đổi nào được ghi lại.</Text> : displayAuditEvents.slice(0, 10).map((event, index) => <View key={event.id} style={[__a3_styles.auditRow, index > 0 && __a3_styles.auditRowBorder]}><View style={__a3_styles.auditDot} /><View style={__a3_styles.auditCopy}><Text style={__a3_styles.auditTitle}>{auditActionLabel[event.action]} · {event.actorName}</Text><Text style={__a3_styles.auditDetail}>{event.detail}</Text>{event.beforeLabel && <Text style={__a3_styles.auditSnapshot}>Trước: {event.beforeLabel}</Text>}{event.afterLabel && <Text style={__a3_styles.auditSnapshot}>Sau: {event.afterLabel}</Text>}<Text style={__a3_styles.auditTime}>{event.createdAt ? new Date(event.createdAt).toLocaleString("vi-VN") : ""}</Text></View></View>)}</BloomCard>

          <BloomCard tone="soft" style={__a3_styles.noteCard}><Ionicons name="lock-closed-outline" size={21} color={__a3Colors.primary} /><Text style={__a3_styles.noteText}>Đây là sổ quỹ nội bộ của gia đình, không lưu tài khoản hay thẻ và không chuyển tiền thật. Khoản quá 3 ngày sẽ được giữ nguyên để lịch sử luôn rõ ràng.</Text></BloomCard>
        </View>
      </ScrollView>

      <FundEditor visible={editorVisible} item={editing} onClose={() => { setEditorVisible(false); setEditing(null); }} onSaved={() => void refreshMonth()} />
      <HandoverFlow visible={handoverVisible} members={members} currentUid={uid} onClose={() => setHandoverVisible(false)} onSubmit={requestHandover} />
      <FundTeamFlow visible={teamVisible} members={members} currentUid={uid} initialUids={effectiveAssistantUids} initialTasks={effectiveAssistantTasks} onClose={() => setTeamVisible(false)} onSubmit={updateAssistants} />
      <BloomConfirmModal visible={!!deleteTarget} title="Xóa khoản này khỏi quỹ?" message={deleteTarget ? `${deleteTarget.note || CATEGORY_META[deleteTarget.category].label} · ${signedMoney(deleteTarget.type, deleteTarget.amountVnd)}. Bạn chỉ xóa được trong 3 ngày đầu; Nhật ký quỹ vẫn lưu lần xóa này.` : ""} confirmLabel={deleting ? "Đang xóa…" : "Xóa khoản"} cancelLabel="Giữ lại" destructive confirmDisabled={deleting} onCancel={() => { if (!deleting) setDeleteTarget(null); }} onConfirm={() => void removeItem()} />
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  content: { paddingBottom: 36 },
  body: { paddingHorizontal: 16, paddingTop: 18, gap: 17 },
  previewRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  balanceCard: { padding: 17, gap: 14, backgroundColor: COLORS.surface },
  balanceTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  balanceCopy: { flex: 1, minWidth: 0 },
  balanceKicker: { color: COLORS.primary, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.75 },
  balanceValue: { marginTop: 4, color: COLORS.primaryText, fontSize: 28, fontWeight: "900", letterSpacing: -0.8 },
  balanceNegative: { color: COLORS.destructive },
  balanceMeta: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "600" },
  walletIcon: { width: 52, height: 52, borderRadius: 19, backgroundColor: COLORS.iconBackground, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: 18, padding: 12, alignItems: "center" },
  summaryItem: { flex: 1 },
  summaryDivider: { width: 1, height: 34, backgroundColor: COLORS.border, marginHorizontal: 10 },
  summaryLabel: { color: COLORS.secondaryText, fontSize: 8.5, fontWeight: "900", letterSpacing: 0.45 },
  summaryValue: { marginTop: 4, fontSize: 12.5, fontWeight: "900" },
  capNote: { color: COLORS.primary, fontSize: 10.5, lineHeight: 15, backgroundColor: COLORS.surface, padding: 9, borderRadius: 12 },
  primaryAction: { minHeight: 50, borderRadius: 18, backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryActionText: { color: COLORS.onPrimary, fontSize: 13.5, fontWeight: "900", textAlign: "center" },
  policyCard: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  policyText: { flex: 1, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
  inviteCard: { flexDirection: "row", gap: 12, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  inviteIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  inviteCopy: { flex: 1 },
  inviteEyebrow: { color: COLORS.primary, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  inviteTitle: { marginTop: 3, color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  inviteNote: { marginTop: 6, color: COLORS.attention, fontSize: 11, lineHeight: 16, fontStyle: "italic" },
  inviteMeta: { marginTop: 5, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  inviteActions: { flexDirection: "row", gap: 8, marginTop: 11 },
  secondaryAction: { minHeight: 40, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  secondaryActionText: { color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "900" },
  acceptAction: { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  acceptActionText: { color: COLORS.white, fontSize: 11.5, fontWeight: "900" },
  stewardCard: { gap: 12 },
  stewardHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  stewardBadge: { width: 50, height: 50, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  stewardCopy: { flex: 1 },
  stewardEyebrow: { color: COLORS.positive, fontSize: 8.5, fontWeight: "900", letterSpacing: 0.65 },
  stewardName: { marginTop: 3, color: COLORS.primaryText, fontSize: 16, fontWeight: "900" },
  stewardMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  assistantList: { gap: 8, paddingTop: 2 },
  assistantRow: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: COLORS.surface, borderRadius: 15, padding: 9 },
  assistantAvatar: { width: 36, height: 36, borderRadius: 13, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  assistantAvatarText: { color: COLORS.primaryText, fontSize: 12, fontWeight: "900" },
  assistantCopy: { flex: 1 },
  assistantName: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  assistantTask: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10, lineHeight: 14 },
  noAssistant: { color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, backgroundColor: COLORS.surface, padding: 10, borderRadius: 14 },
  stewardActions: { flexDirection: "row", gap: 8 },
  stewardButton: { flex: 1, minHeight: 41, borderRadius: 14, backgroundColor: COLORS.softSurface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  stewardButtonText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  pendingLine: { color: COLORS.primary, fontSize: 10, lineHeight: 15, backgroundColor: COLORS.surface, borderRadius: 12, padding: 9 },
  statsCard: { gap: 13 },
  periodRow: { flexDirection: "row", gap: 7, alignItems: "center", flexWrap: "wrap" },
  periodChip: { minHeight: 36, paddingHorizontal: 13, borderRadius: 13, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  periodChipActive: { backgroundColor: COLORS.primary },
  periodText: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "900" },
  periodTextActive: { color: COLORS.onPrimary },
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
  chartIncome: { backgroundColor: COLORS.selectedBackground },
  chartExpense: { backgroundColor: COLORS.selectedBackground },
  chartLabel: { color: COLORS.secondaryText, fontSize: 8.5, fontWeight: "800" },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: { minHeight: 38, paddingHorizontal: 14, borderRadius: 14, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterText: { color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "900" },
  filterTextActive: { color: COLORS.onPrimary },
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
  auditInline: { marginTop: 3, color: COLORS.secondaryText, fontSize: 9.2, lineHeight: 13 },
  lockHint: { marginTop: 3, color: COLORS.primary, fontSize: 9.5, fontWeight: "800" },
  lockHintLocked: { color: COLORS.primary },
  deleteIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  moreButton: { minHeight: 45, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  moreText: { color: COLORS.primary, fontSize: 11.5, fontWeight: "900" },
  auditCard: { paddingVertical: 7 },
  auditEmpty: { color: COLORS.secondaryText, fontSize: 11, paddingVertical: 8 },
  auditRow: { flexDirection: "row", gap: 9, paddingVertical: 9 },
  auditRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  auditDot: { marginTop: 5, width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.selectedBackground },
  auditCopy: { flex: 1 },
  auditTitle: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "900" },
  auditDetail: { marginTop: 2, color: COLORS.secondaryText, fontSize: 9.5, lineHeight: 14 },
  auditSnapshot: { marginTop: 2, color: COLORS.secondaryText, fontSize: 8.8, lineHeight: 13 },
  auditTime: { marginTop: 2, color: COLORS.secondaryText, fontSize: 8.5 },
  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noteText: { flex: 1, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 7, backgroundColor: COLORS.surface, padding: 11, borderRadius: 14 },
  errorText: { flex: 1, color: COLORS.primary, fontSize: 11.5, lineHeight: 16 },
  editorBody: { paddingHorizontal: 18, paddingTop: 20, gap: 13 },
  editorLabel: { color: COLORS.secondaryText, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.65, marginTop: 2 },
  typeRow: { flexDirection: "row", gap: 9 },
  typeButton: { flex: 1, minHeight: 50, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  typeIncomeActive: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
  typeExpenseActive: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
  typeText: { color: COLORS.secondaryText, fontSize: 12.5, fontWeight: "900" },
  typeIncomeText: { color: COLORS.positive },
  typeExpenseText: { color: COLORS.primary },
  amountInputWrap: { minHeight: 68, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  inputInvalid: { borderColor: COLORS.border, backgroundColor: COLORS.surface },
  amountInput: { flex: 1, minWidth: 0, height: 58, color: COLORS.primaryText, fontSize: 22, fontWeight: "900", paddingVertical: 8, textAlignVertical: "center" },
  currency: { color: COLORS.positive, fontSize: 20, fontWeight: "900" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: { minHeight: 44, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: "row", alignItems: "center", gap: 7 },
  categoryChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.accentBg },
  categoryIcon: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  categoryText: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "800" },
  categoryTextActive: { color: COLORS.primaryText },
  noteInputWrap: { borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 12 },
  fundInputField: { marginBottom: 0 },
  noteInput: { minHeight: 86, color: COLORS.primaryText, fontSize: 13, lineHeight: 19, padding: 0 },
  counter: { alignSelf: "flex-end", color: COLORS.secondaryText, fontSize: 9.5, marginTop: 5 },
  editorAudit: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: COLORS.surface, padding: 11, borderRadius: 14 },
  editorAuditText: { flex: 1, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15.5 },
  editorAuditStrong: { fontWeight: "900", color: COLORS.positive },
  saveButton: { minHeight: 52, borderRadius: 18, backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  saveButtonUnavailable: { backgroundColor: COLORS.softSurface, opacity: 0.65 },
  saveText: { color: COLORS.onPrimary, fontSize: 13.5, fontWeight: "900" },
  manageBody: { paddingHorizontal: 18, paddingTop: 20, gap: 14 },
  warningCard: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: COLORS.surface, padding: 11, borderRadius: 14 },
  warningText: { flex: 1, color: COLORS.attention, fontSize: 10.5, lineHeight: 15.5 },
  taskBlock: { borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 12 },
  taskName: { color: COLORS.primaryText, fontSize: 12, fontWeight: "900", marginBottom: 7 },
  taskInput: { minHeight: 66, color: COLORS.primaryText, fontSize: 12, lineHeight: 18, padding: 0 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.72 },
}));
