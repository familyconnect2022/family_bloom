/** Native equivalent of the approved Web Cây nhà dashboard. Read-only overview,
 * permissioned GraphAction screens remain the only writers. Legacy Android
 * family timeline / memory book remain available under "Tiện ích Cây nhà".
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useFamilyGraph } from '../../hooks/family/useFamilyGraph';
import { FIRESTORE_PATHS } from '../../services/firebase/firestorePaths';
import { BloomText as Text } from '../ui/BloomText';
import { useA3Theme } from '../../appearance3/useAppearance3';
import { summarizeNativeFamilyGraph } from './familyGraphWebDashboardModel';

export function FamilyGraphWebDashboard({ onExplore, onLegacy }: {
  onExplore: () => void;
  onLegacy: () => void;
}) {
  const router = useRouter();
  const { user, userProfile, families } = useAuth();
  const familyId = userProfile?.activeFamilyId ?? null;
  const { colors, resolvedMode } = useA3Theme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const membership = families.find(f => f.familyId === familyId);
  const isManager = membership?.role === 'owner' || membership?.role === 'admin';
  const { snapshot, loading, error } = useFamilyGraph(familyId, user?.uid, !!familyId);
  const [confirmedRoots, setConfirmedRoots] = useState<string[] | null>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    setConfirmedRoots(null);
    if (!familyId) return () => { alive = false; };
    // Read the SAME graphLineageRoots metadata used by Web. Failure is
    // represented as unknown, never silently treated as zero confirmed roots.
    void getDoc(doc(getFirestore(), FIRESTORE_PATHS.family(familyId)))
      .then(s => {
        if (!alive) return;
        const raw = s.data()?.graphLineageRoots;
        setConfirmedRoots(Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string' && !!v) : []);
      }).catch(() => { if (alive) setConfirmedRoots(null); });
    return () => { alive = false; };
  }, [familyId]);
  const summary = useMemo(() => summarizeNativeFamilyGraph(snapshot, confirmedRoots ?? []), [snapshot, confirmedRoots]);
  const directory = useMemo(() => summary.directory.filter(p => {
    if (unlinkedOnly && p.relationCount !== 0) return false;
    return p.displayName.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'));
  }), [summary, unlinkedOnly, search]);
  const openDirectory = useCallback(() => { setSearch(''); setUnlinkedOnly(false); setDirectoryOpen(true); }, []);
  const go = useCallback((route: string) => router.push(route as never), [router]);
  const tiles: Array<{ name: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; allowed?: boolean }> = [
    { name: 'Thêm người mới', icon: 'person-add-outline', onPress: () => go('/family-graph-person-editor'), allowed: isManager },
    { name: 'Nối người có sẵn', icon: 'link-outline', onPress: () => go('/family-graph-relationship-editor'), allowed: isManager },
    { name: isManager ? 'Duyệt đề xuất' : 'Đề xuất của tôi', icon: 'checkbox-outline', onPress: () => go('/family-graph-proposals') },
    { name: 'Quản lý gốc', icon: 'shield-checkmark-outline', onPress: () => go('/family-graph-admin'), allowed: isManager },
    { name: 'Quy tắc & Kiểm tra', icon: 'book-outline', onPress: () => setRulesOpen(true) },
    { name: 'Danh sách thành viên', icon: 'people-outline', onPress: openDirectory },
  ];
  const stats: Array<{ icon: keyof typeof Ionicons.glyphMap; value: string; label: string }> = [
    { icon: 'people-outline', value: String(summary.people), label: 'Thành viên' },
    { icon: 'git-merge-outline', value: String(summary.relations), label: 'Mối quan hệ' },
    { icon: 'layers-outline', value: summary.generations === null ? '—' : String(summary.generations), label: 'Thế hệ' },
    { icon: 'git-branch-outline', value: confirmedRoots === null ? '—' : String(confirmedRoots.length), label: 'Gốc xác nhận' },
  ];
  const shadow = { borderColor: colors.border, backgroundColor: colors.surface };
  const title = { color: colors.primaryText };
  const sub = { color: colors.secondaryText };
  return <View style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 14, paddingBottom: 120, gap: 20 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 26, fontWeight: '900', ...title }}>Cây nhà</Text>
        <Text style={{ fontSize: 13, ...sub }}>Gia phả, thành viên và những câu chuyện gia đình</Text>
      </View>
      <View style={{ ...shadow, borderWidth: 1, borderRadius: 24, padding: 16, gap: 17 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 64, height: 66, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
            <Ionicons name="git-network-outline" size={30} color={colors.primary}/>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontSize: 19, fontWeight: '800', ...title }}>Cây phả hệ nhà mình</Text>
            <Text style={{ fontSize: 12.5, lineHeight: 19, ...sub }}>Gắn kết các thế hệ · Lưu giữ dòng chảy gia đình</Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: colors.border }}/>
        {loading ? <ActivityIndicator color={colors.primary}/> : error ? <Text style={sub}>Chưa tải được số liệu gia phả.</Text> :
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {stats.map(stat => <View key={stat.label} style={{ flex: 1, minWidth: 0, borderRadius: 15, backgroundColor: colors.background, alignItems: 'center', gap: 6, paddingVertical: 13, paddingHorizontal: 2 }}>
              <Ionicons name={stat.icon} size={21} color={colors.primary}/>
              <Text style={{ fontWeight: '900', fontSize: 22, ...title }}>{stat.value}</Text>
              <Text style={{ fontSize: width < 390 ? 10 : 11, textAlign: 'center', ...sub }}>{stat.label}</Text>
            </View>)}
          </View>}
        {summary.provisional && summary.generations !== null && !loading &&
          <Text style={{ fontSize: 11.5, lineHeight: 17, ...sub }}>Số thế hệ tạm tính theo quan hệ cha–con ruột/nuôi đã ghi nhận; chưa xác nhận gốc gia phả.</Text>}
      </View>
      <View style={{ gap: 12 }}>
        <Text style={{ fontWeight: '900', fontSize: 21, ...title }}>│ Quản lý gia phả</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
          {tiles.map(tile => <Pressable key={tile.name} accessibilityRole="button"
            accessibilityLabel={tile.name} disabled={tile.allowed === false}
            onPress={tile.onPress} style={({ pressed }) => ({
              width: width < 370 ? '48%' : '31.8%', minHeight: 126, borderRadius: 20,
              borderWidth: 1, ...shadow, justifyContent: 'center', alignItems: 'center',
              padding: 8, gap: 12, opacity: tile.allowed === false ? .45 : pressed ? .76 : 1,
            })}>
            <Ionicons name={tile.icon} size={29} color={colors.primary}/>
            <Text style={{ textAlign: 'center', fontSize: 13.5, fontWeight: '800', lineHeight: 20, ...title }}>{tile.name}</Text>
          </Pressable>)}
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Khám phá cây gia đình" onPress={onExplore}
        style={({ pressed }) => ({ ...shadow, borderRadius: 21, borderWidth: 1, padding: 19,
          flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? .7 : 1 })}>
        <Ionicons name="expand-outline" color={colors.primary} size={24}/>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 16, fontWeight: '900', ...title }}>Khám phá cây gia đình</Text>
          <Text style={{ fontSize: 12, lineHeight: 17, ...sub }}>Xem toàn cảnh · Focus tổ tiên và hậu duệ</Text>
        </View>
        <Ionicons name="arrow-forward" color={colors.primary} size={22}/>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onLegacy} style={{ alignSelf: 'center', paddingVertical: 9, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>Tiện ích Cây nhà · Kỷ yếu · Dòng thời gian</Text>
      </Pressable>
    </ScrollView>
    <Modal transparent visible={directoryOpen} animationType="fade" statusBarTranslucent
      onRequestClose={() => setDirectoryOpen(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: '#23172190', paddingTop: Math.max(insets.top, 12) + 8,
          paddingBottom: Math.max(insets.bottom, 12) + 8, paddingHorizontal: 14, justifyContent: 'center' }}>
        <View style={{ ...shadow, flex: 1, maxHeight: 770, borderRadius: 24, padding: 17, gap: 11 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', ...title }}>Danh sách thành viên</Text>
              <Text style={{ fontSize: 12, ...sub }}>{summary.directory.length} hồ sơ · {summary.unlinked} chưa nối</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng danh sách" onPress={() => setDirectoryOpen(false)}
              style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22, backgroundColor: colors.background }}>
              <Ionicons name="close" size={25} color={colors.primaryText}/>
            </Pressable>
          </View>
          <View style={{ borderRadius: 15, borderWidth: 1, borderColor: colors.border,
            flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }}>
            <Ionicons name="search-outline" size={20} color={colors.primary}/>
            <TextInput accessibilityLabel="Tìm người thân" value={search} onChangeText={setSearch}
              placeholder="Tìm theo tên người thân…" placeholderTextColor={colors.secondaryText}
              style={{ flex: 1, color: colors.primaryText, fontSize: 15, paddingVertical: 13 }}/>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([{ name: `Tất cả (${summary.directory.length})`, active: !unlinkedOnly, set: false },
              { name: `Chưa nối (${summary.unlinked})`, active: unlinkedOnly, set: true }]).map(filter =>
              <Pressable key={filter.name} accessibilityRole="button" onPress={() => setUnlinkedOnly(filter.set)}
                style={{ backgroundColor: filter.active ? colors.primary : colors.background,
                  paddingVertical: 9, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: filter.active ? '#fff' : colors.primaryText }}>{filter.name}</Text>
              </Pressable>)}
          </View>
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled
            showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 16 }}>
            {directory.map(p => <Pressable key={p.id} accessibilityRole="button"
              accessibilityLabel={`Xem chi tiết ${p.displayName}`}
              onPress={() => {
                setDirectoryOpen(false);
                router.push({ pathname: '/family-graph-person-detail', params: { personId: p.id } } as never);
              }}
              style={({pressed})=>({borderBottomWidth: 1, borderBottomColor: colors.border,
                flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13, opacity:pressed?.65:1})}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background,
                alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontWeight: '800', color: colors.primary }}>{p.displayName.trim().slice(-1).toLocaleUpperCase('vi')}</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text numberOfLines={2} style={{ fontSize: 14, fontWeight: '800', ...title }}>{p.displayName}</Text>
                <Text style={{ fontSize: 12, ...sub }}>{p.birthYear ?? 'Chưa rõ năm sinh'} · {p.relationCount ? `${p.relationCount} quan hệ đã ghi nhận` : 'Chưa có quan hệ nối'}</Text>
              </View>
              {!p.relationCount && <Ionicons name="alert-circle-outline" size={19} color={colors.primary}/>}
              <Ionicons name="chevron-forward" size={18} color={colors.secondaryText}/>
            </Pressable>)}
            {!directory.length && <Text style={{ padding: 16, ...sub }}>Không tìm thấy hồ sơ phù hợp.</Text>}
          </ScrollView>
          <Text style={{ fontSize: 11, lineHeight: 16, ...sub }}>Chỉ đọc. Trùng tên không đồng nghĩa trùng hồ sơ; không tự gộp hoặc xóa người.</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    <Modal transparent visible={rulesOpen} animationType="fade" onRequestClose={() => setRulesOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#23172190', padding: 25 }}>
        <View style={{ ...shadow, borderRadius: 25, padding: 20, gap: 13 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', ...title }}>Quy tắc phả hệ Family Bloom</Text>
          <Text style={{ fontSize: 13, lineHeight: 22, ...sub }}>Con ruột và con nuôi được công nhận tạo nhánh hậu duệ. Con kế, nguồn chưa xác minh và quan hệ lịch sử không được tự suy diễn thành huyết thống. Focus hiển thị người thân dựa trên các quan hệ đã được ghi nhận.</Text>
          <Pressable accessibilityRole="button" onPress={() => setRulesOpen(false)} style={{ backgroundColor: colors.primary, paddingVertical: 13, borderRadius: 14, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Đã hiểu</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}
