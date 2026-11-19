import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../../components/ui/BloomText';
import { ScreenContainer } from '../../../components/layout/ScreenContainer';
import { BloomBackButton } from '../../../components/ui/BloomPageComponents';
import { BloomButton, BloomChipButton } from '../../../components/ui/BloomButtonComponents';
import { useBloomToast } from '../../../components/ui/BloomToast';
import { useAuth } from '../../../context/AuthContext';
import { useFamilyGraph } from '../../../hooks/family/useFamilyGraph';
import {
  familyGraphMutationService,
  updateFamilyGraphParentChildSubtypeDirect,
} from '../../../services/familyGraph/familyGraphMutationService';
import { parseAppError } from '../../../constants/errorConstants';
import type { ParentChildSubtype, PartnerStatus, FamilyRelationship } from '../../../types/familyGraph';
import { useA3Theme } from '../../../appearance3/useAppearance3';

const parentText: Record<ParentChildSubtype, string> = {
  biological: 'ruột', adoptive: 'nuôi', step: 'kế', unknown: 'chưa xác định',
};
const partnerText: Record<PartnerStatus, string> = {
  married: 'vợ/chồng', partner: 'bạn đời', separated: 'đang ly thân',
  divorced: 'đã ly hôn', widowed: 'đã kết thúc do qua đời',
};
function description(rel: FamilyRelationship, subjectId: string, a: string, b: string, subtype: ParentChildSubtype, status: PartnerStatus, parentGender: string): string {
  if (rel.type === 'partner') return `${a} và ${b} có quan hệ ${partnerText[status]}.`;
  if (subjectId === rel.personBId) return `${b} là con ${parentText[subtype]} của ${a}.`;
  const role = parentGender === 'male' ? 'cha' : parentGender === 'female' ? 'mẹ' : 'cha/mẹ';
  return `${a} là ${role} ${parentText[subtype]} của ${b}.`;
}

/** Only the metadata permitted by the deployed rules may be edited here.
 * Endpoints remain immutable. A different person requires a separate verified operation.
 */
export default function FamilyGraphRelationshipDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ relationshipId?: string; personId?: string }>();
  const relationshipId = typeof params.relationshipId === 'string' ? params.relationshipId : '';
  const subjectId = typeof params.personId === 'string' ? params.personId : '';
  const colors = useA3Theme().colors;
  const { showToast } = useBloomToast();
  const { user, userProfile, families } = useAuth();
  const familyId = userProfile?.activeFamilyId ?? null;
  const membership = families.find((m) => m.familyId === familyId);
  const canEdit = membership?.role === 'owner' || membership?.role === 'admin';
  const { snapshot, loading } = useFamilyGraph(familyId, user?.uid);
  const rel = useMemo(() => snapshot.relationships.find((r) => r.id === relationshipId), [snapshot.relationships, relationshipId]);
  const people = useMemo(() => new Map(snapshot.persons.map((p) => [p.id, p])), [snapshot.persons]);
  const [subtype, setSubtype] = useState<ParentChildSubtype>('unknown');
  const [status, setStatus] = useState<PartnerStatus>('partner');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!rel) return;
    setSubtype(rel.subtype ?? 'unknown');
    setStatus(rel.partnerStatus ?? 'partner');
  }, [rel?.id, rel?.subtype, rel?.partnerStatus]);
  const a = rel ? (people.get(rel.personAId)?.displayName ?? 'Người thứ nhất') : '';
  const b = rel ? (people.get(rel.personBId)?.displayName ?? 'Người thứ hai') : '';
  const sentence = rel ? description(rel, subjectId, a, b, subtype, status, people.get(rel.personAId)?.gender ?? "other") : '';
  const changed = !!rel && (rel.type === 'partner' ? status !== (rel.partnerStatus ?? 'partner') : subtype !== (rel.subtype ?? 'unknown'));
  const save = async () => {
    if (!canEdit || !familyId || !rel || saving || !changed) return;
    setSaving(true);
    try {
      if (rel.type === 'partner') {
        await familyGraphMutationService.updatePartnerRelationship(familyId, rel.id, { partnerStatus: status });
      } else {
        await updateFamilyGraphParentChildSubtypeDirect(familyId, rel.id, subtype);
      }
      showToast({ type: 'success', message: 'Đã cập nhật quan hệ.' });
      router.back();
    } catch (e) {
      const parsed = parseAppError(e);
      Alert.alert('Chưa thể lưu quan hệ', parsed.message || 'Hãy kiểm tra quyền và dữ liệu rồi thử lại.');
    } finally { setSaving(false); }
  };
  if (loading && !rel) return <ScreenContainer><View style={styles.center}><ActivityIndicator color={colors.primary} /><Text>Đang tải quan hệ…</Text></View></ScreenContainer>;
  return (
    <ScreenContainer keyboardSafe>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <BloomBackButton onPress={() => router.back()} />
        <Text style={[styles.headerText, { color: colors.primaryText }]}>Chi tiết mối quan hệ</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!rel ? <View style={styles.center}><Text>Không tìm thấy mối quan hệ này.</Text></View> : <>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.primaryText }]}>Hai người liên quan</Text>
            <Text style={[styles.name, { color: colors.primaryText }]}>{a}</Text>
            <Text style={{ color: colors.secondaryText }}>và</Text>
            <Text style={[styles.name, { color: colors.primaryText }]}>{b}</Text>
            <Text style={{ color: colors.secondaryText }}>Đường nối hiện có được giữ nguyên. Bạn chỉ sửa loại hoặc trạng thái quan hệ.</Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.primaryText }]}>Chỉnh sửa {rel.type === 'partner' ? 'trạng thái cặp đôi' : 'quan hệ cha/mẹ – con'}</Text>
            <View style={styles.options}>
              {rel.type === 'partner'
                ? (['married', 'partner', 'separated', 'divorced', 'widowed'] as PartnerStatus[]).map((s) => <BloomChipButton key={s} label={partnerText[s]} selected={s === status} onPress={() => setStatus(s)} />)
                : (['biological', 'adoptive', 'step', 'unknown'] as ParentChildSubtype[]).map((s) => <BloomChipButton key={s} label={`Con ${parentText[s]}`} selected={s === subtype} onPress={() => setSubtype(s)} />)}
            </View>
            <Text style={{ color: colors.secondaryText }}>Thông tin này sẽ được kiểm tra lại trước khi ghi. Không tự động thay đổi cha mẹ hoặc thêm một người mới.</Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.previewTitle}><Ionicons name="reader-outline" size={20} color={colors.primary} /><Text style={[styles.title, { color: colors.primaryText }]}>Đọc trước khi xác nhận</Text></View>
            <Text style={[styles.sentence, { color: colors.primaryText }]}>{sentence}</Text>
            <Text style={{ color: colors.secondaryText }}>Sẽ cập nhật đúng 1 quan hệ đã có; không xóa người hay tạo đường nối mới.</Text>
          </View>
          {!canEdit && <Text style={{ color: colors.secondaryText }}>Tài khoản hiện tại chỉ có quyền xem. Việc sửa mối nối cần được người quản lý xác minh.</Text>}
          <BloomButton title="Xác nhận cập nhật" icon="checkmark-circle-outline" isLoading={saving} disabled={!canEdit || !changed || saving} onPress={() => Alert.alert('Xác nhận quan hệ', sentence, [{ text: 'Sửa lại', style: 'cancel' }, { text: 'Xác nhận', onPress: () => void save() }])} />
        </>}
      </ScrollView>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, paddingHorizontal: 16 },
  headerText: { fontSize: 18, fontWeight: '800' },
  content: { padding: 18, paddingBottom: 125, gap: 16 },
  card: { padding: 18, borderWidth: 1, borderRadius: 22, gap: 13 },
  title: { fontSize: 16, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '700' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  previewTitle: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sentence: { fontSize: 16, lineHeight: 25, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, gap: 12 },
});
