import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useHomeMusicPlayer, useHomeMusicPlayerControls } from "@/context/HomeMusicPlayerContext";
import { homeMusicService } from "@/services/home/music/homeMusicService";
import type { HomeMusicCycle, HomeMusicFamilySong, HomeMusicFavorite, HomeMusicTrack } from "@/types/homeLiving";
import { COLORS } from "@/constants/theme";

type MusicTab = "playlist" | "favorites" | "family";
const PAGE = 20;
const LIST_HEIGHT = 350;
const TABS: Array<{ key: MusicTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "playlist", label: "Playlist", icon: "sparkles-outline" },
  { key: "favorites", label: "Yêu thích", icon: "star-outline" },
  { key: "family", label: "Bài hát Nhà Mình", icon: "home-outline" },
];

const formatDuration = (seconds: number) => {
  if (!seconds) return "";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
};

const formatCycle = (cycle: HomeMusicCycle | null) => {
  if (!cycle) return "Playlist chung của cả nhà";
  const start = new Date(cycle.startsAt);
  const end = new Date(cycle.endsAt);
  return `${start.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} – ${end.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`;
};

const friendlyMusicError = (error: unknown, fallback: string) => {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (/permission-denied|does not have permission/i.test(raw)) {
    return "Bloom chưa thể chuẩn bị nhạc cho nhà mình lúc này. Thử lại sau một chút nhé.";
  }
  if (/network|offline|fetch|timeout|abort|phản hồi chậm|PLAYLIST_BUILD_TIMEOUT/i.test(raw)) {
    return "Bloom chưa mở được playlist lúc này. Thử lại sau một chút nhé.";
  }
  if (/bài tiếng Việt|khác ngôn ngữ|ghép được \d+\/20/i.test(raw)) {
    return "Hôm nay Bloom chưa tìm đủ 20 bài tiếng Việt phù hợp. Thử lại sau một chút nhé.";
  }
  return fallback;
};

const TrackArtwork = memo(function TrackArtwork({ track, size = 46 }: { track: HomeMusicTrack; size?: number }) {
  return (
    <View style={[styles.artwork, { width: size, height: size, borderRadius: Math.round(size * 0.28) }]}> 
      {track.artworkUrl ? (
        <Image source={{ uri: track.artworkUrl }} style={StyleSheet.absoluteFillObject} contentFit="cover" recyclingKey={track.id} transition={100} />
      ) : (
        <Ionicons name="musical-notes" size={Math.round(size * 0.4)} color="#8D79B4" />
      )}
    </View>
  );
});

type TrackRowProps = {
  track: HomeMusicTrack;
  queue: HomeMusicTrack[];
  active: boolean;
  favorite: boolean;
  inFamily: boolean;
  subtitle?: string;
  last?: boolean;
  onPlay: (track: HomeMusicTrack, queue: HomeMusicTrack[]) => void;
  onFavorite: (track: HomeMusicTrack, next: boolean) => void;
  onFamily: (track: HomeMusicTrack) => void;
};

const TrackRow = memo(function TrackRow({ track, queue, active, favorite, inFamily, subtitle, last, onPlay, onFavorite, onFamily }: TrackRowProps) {
  return (
    <View style={[styles.trackRow, active && styles.trackRowActive, !last && styles.trackDivider]}>
      <Pressable onPress={() => onPlay(track, queue)} style={styles.trackMain}>
        <TrackArtwork track={track} />
        <View style={styles.trackCopy}>
          <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
          <Text numberOfLines={1} style={styles.trackArtist}>{subtitle || track.artist}{track.durationSec ? ` · ${formatDuration(track.durationSec)}` : ""}</Text>
          <View style={styles.trackActions}>
            <Pressable accessibilityLabel={favorite ? "Bỏ yêu thích" : "Yêu thích"} onPress={() => onFavorite(track, !favorite)} style={[styles.iconAction, favorite && styles.iconActionActive]}>
              <Ionicons name={favorite ? "star" : "star-outline"} size={15} color={favorite ? "#C88A33" : COLORS.secondaryText} />
            </Pressable>
            <Pressable disabled={inFamily} accessibilityLabel={inFamily ? "Đã thêm vào Nhà Mình" : "Thêm vào Nhà Mình"} onPress={() => onFamily(track)} style={[styles.familyAction, inFamily && styles.familyActionDone]}>
              <Ionicons name={inFamily ? "checkmark" : "add"} size={14} color={inFamily ? "#5D8F72" : COLORS.primary} />
              <Text style={[styles.familyActionText, inFamily && styles.familyActionTextDone]}>{inFamily ? "Đã thêm" : "Thêm"}</Text>
            </Pressable>
          </View>
        </View>
        <View style={[styles.playButton, active && styles.playButtonActive]}>
          <Ionicons name={active ? "musical-note" : "play"} size={15} color={active ? COLORS.white : COLORS.primary} />
        </View>
      </Pressable>
    </View>
  );
});

function MiniPlayer() {
  const { currentTrack, playing, loading, currentTime, duration, toggle, next, previous, error } = useHomeMusicPlayer();
  if (!currentTrack && error) {
    return (
      <View style={styles.playbackNotice}>
        <Ionicons name="heart-outline" size={17} color={COLORS.primary} />
        <Text style={styles.playbackNoticeText}>{error}</Text>
      </View>
    );
  }
  if (!currentTrack) return null;
  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  return (
    <View style={styles.miniPlayer}>
      <View style={styles.miniPlayerTop}>
        <TrackArtwork track={currentTrack} size={46} />
        <View style={styles.miniCopy}>
          <Text style={styles.miniKicker}>ĐANG PHÁT TRONG NHÀ MÌNH</Text>
          <Text numberOfLines={1} style={styles.miniTitle}>{currentTrack.title}</Text>
          <Text numberOfLines={1} style={styles.miniArtist}>{currentTrack.artist}</Text>
        </View>
        <Pressable onPress={() => void previous()} style={styles.playerControl}><Ionicons name="play-skip-back" size={16} color={COLORS.primaryText} /></Pressable>
        <Pressable disabled={loading} onPress={toggle} style={styles.playerControlMain}>
          {loading ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name={playing ? "pause" : "play"} size={18} color={COLORS.white} />}
        </Pressable>
        <Pressable onPress={() => void next()} style={styles.playerControl}><Ionicons name="play-skip-forward" size={16} color={COLORS.primaryText} /></Pressable>
      </View>
      <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
      {!!error && <Text style={styles.playerError}>{error}</Text>}
    </View>
  );
}

export function HomeMusicPanel() {
  const { user, userProfile, activeFamilyId } = useAuth();
  const uid = user?.uid ?? "";
  const displayName = userProfile?.shortName || userProfile?.displayName || "Người thân";
  const { currentTrack, playTrack } = useHomeMusicPlayerControls();
  const [tab, setTab] = useState<MusicTab>("playlist");
  const [cycle, setCycle] = useState<HomeMusicCycle | null>(null);
  const [favorites, setFavorites] = useState<HomeMusicFavorite[]>([]);
  const [familySongs, setFamilySongs] = useState<HomeMusicFamilySong[]>([]);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<HomeMusicTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingCycle, setLoadingCycle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const searchRequestRef = useRef<AbortController | null>(null);
  const listRef = useRef<ScrollView>(null);

  useEffect(() => {
    setPage(0);
    listRef.current?.scrollTo({ y: 0, animated: false });
  }, [tab, searchText]);

  const reportError = useCallback((value: unknown, fallback: string) => {
    console.warn("[FamilyBloom/HomeMusic]", value);
    setError(friendlyMusicError(value, fallback));
  }, []);

  const loadCycle = useCallback(async () => {
    if (!activeFamilyId) return;
    setLoadingCycle(true);
    setError(null);
    try { setCycle(await homeMusicService.getOrCreateCurrentCycle(activeFamilyId)); }
    catch (e) { reportError(e, "Playlist của nhà mình chưa sẵn sàng. Thử lại sau một chút nhé."); }
    finally { setLoadingCycle(false); }
  }, [activeFamilyId, reportError]);

  useEffect(() => { void loadCycle(); }, [loadCycle]);

  useEffect(() => {
    if (!uid) return;
    return homeMusicService.watchFavorites(uid, setFavorites, e => reportError(e, "Bloom chưa mở được những bài bạn yêu thích."));
  }, [reportError, uid]);

  useEffect(() => {
    if (!activeFamilyId) return;
    return homeMusicService.watchFamilySongs(activeFamilyId, setFamilySongs, e => reportError(e, "Bloom chưa mở được Bài hát Nhà Mình."));
  }, [activeFamilyId, reportError]);

  useEffect(() => {
    const q = searchText.trim();
    searchRequestRef.current?.abort();
    if (q.length < 2) { setSearchResults([]); setSearching(false); return; }
    const controller = new AbortController();
    searchRequestRef.current = controller;
    const timer = setTimeout(async () => {
      setSearching(true); setError(null);
      try { setSearchResults(await homeMusicService.search(q, { limit: PAGE, signal: controller.signal })); }
      catch (e) {
        if ((e as { name?: string })?.name !== "AbortError") reportError(e, "Bloom chưa tìm được bài hát này. Thử một tên khác nhé.");
      } finally { if (!controller.signal.aborted) setSearching(false); }
    }, 360);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [reportError, searchText]);

  const favoriteIds = useMemo(() => new Set(favorites.map(item => item.id)), [favorites]);
  const familyIds = useMemo(() => new Set(familySongs.map(item => item.id)), [familySongs]);
  const familySongById = useMemo(() => new Map(familySongs.map(item => [item.id, item])), [familySongs]);
  const baseTracks = useMemo<HomeMusicTrack[]>(() => {
    if (searchText.trim().length >= 2) return searchResults;
    if (tab === "favorites") return favorites;
    if (tab === "family") return familySongs;
    return cycle?.tracks ?? [];
  }, [cycle?.tracks, familySongs, favorites, searchResults, searchText, tab]);
  const totalPages = Math.max(1, Math.ceil(baseTracks.length / PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleTracks = useMemo(() => baseTracks.slice(safePage * PAGE, safePage * PAGE + PAGE), [baseTracks, safePage]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const changePage = useCallback((next: number) => {
    setPage(Math.max(0, Math.min(totalPages - 1, next)));
    listRef.current?.scrollTo({ y: 0, animated: true });
  }, [totalPages]);

  const onFavorite = useCallback(async (track: HomeMusicTrack, next: boolean) => {
    if (!uid) return;
    setFavorites(current => next
      ? [{ ...track, uid, createdAt: new Date().toISOString() }, ...current.filter(item => item.id !== track.id)]
      : current.filter(item => item.id !== track.id));
    try { await homeMusicService.toggleFavorite(uid, track, next); }
    catch (e) {
      setFavorites(current => next
        ? current.filter(item => item.id !== track.id)
        : [{ ...track, uid, createdAt: new Date().toISOString() }, ...current.filter(item => item.id !== track.id)]);
      reportError(e, "Bloom chưa lưu được bài yêu thích này.");
    }
  }, [reportError, uid]);

  const onFamily = useCallback(async (track: HomeMusicTrack) => {
    if (!activeFamilyId || !uid || familyIds.has(track.id)) return;
    setFamilySongs(current => [{ ...track, familyId: activeFamilyId, sharedByUid: uid, sharedByName: displayName, sharedAt: new Date().toISOString() }, ...current]);
    try { await homeMusicService.addToFamily(activeFamilyId, uid, displayName, track); }
    catch (e) {
      setFamilySongs(current => current.filter(item => item.id !== track.id));
      reportError(e, "Bloom chưa thêm được bài này vào Nhà Mình.");
    }
  }, [activeFamilyId, displayName, familyIds, reportError, uid]);

  const onPlay = useCallback((track: HomeMusicTrack, queue: HomeMusicTrack[]) => { void playTrack(track, queue); }, [playTrack]);

  const isSearch = searchText.trim().length >= 2;
  const currentTabLabel = TABS.find(item => item.key === tab)?.label ?? "Playlist";
  const emptyCopy = isSearch
    ? "Chưa tìm thấy bài phù hợp. Thử tên bài hoặc nghệ sĩ khác nhé."
    : tab === "favorites"
      ? "Chưa có bài yêu thích. Bấm ☆ ở bất kỳ bài nào để giữ lại cho riêng bạn."
      : tab === "family"
        ? "Chưa có bài nào trong Nhà Mình. Tìm một bài và bấm Thêm nhé."
        : "Playlist vài ngày tới đang được chuẩn bị.";

  return (
    <View style={styles.musicCard}>
      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.heroGlowOne} />
        <View pointerEvents="none" style={styles.heroGlowTwo} />
        <View pointerEvents="none" style={styles.heroNotes}><Ionicons name="musical-notes" size={38} color="#725D9D" /></View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>NHẠC NHÀ MÌNH · BLOOM SUPPER</Text>
          <Text style={styles.heroTitle}>Một góc nhạc để cả nhà cùng thương</Text>
          <Text style={styles.heroSubtitle}>Playlist chung tự thay sau vài ngày; bài bạn thích vẫn ở lại trong góc riêng của mình.</Text>
          <View style={styles.heroBadge}><Ionicons name="refresh-outline" size={14} color="#725D9D" /><Text style={styles.heroBadgeText}>100% tiếng Việt · đổi mỗi 3 ngày · {formatCycle(cycle)}</Text></View>
        </View>

        <View style={styles.searchBox}>
          <View style={styles.searchIcon}><Ionicons name="search" size={18} color={COLORS.primary} /></View>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Tìm tên bài hát hoặc nghệ sĩ…"
            placeholderTextColor="#8F8188"
            returnKeyType="search"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {searching ? <ActivityIndicator size="small" color={COLORS.primary} /> : searchText ? (
            <Pressable onPress={() => setSearchText("")} hitSlop={8}><Ionicons name="close-circle" size={20} color="#9B8891" /></Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.tabs}>
          {TABS.map(item => {
            const active = tab === item.key;
            return (
              <Pressable key={item.key} onPress={() => { setTab(item.key); setSearchText(""); }} style={[styles.tab, active && styles.tabActive]}>
                <Ionicons name={active ? (item.key === "favorites" ? "star" : item.icon) : item.icon} size={15} color={active ? COLORS.white : COLORS.primaryText} />
                <Text numberOfLines={1} style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {!isSearch && tab === "playlist" && (
          <View style={styles.playlistNote}>
            <View style={styles.playlistNoteIcon}><Ionicons name="radio-outline" size={17} color="#765FA0" /></View>
            <View style={styles.playlistNoteCopy}>
              <Text style={styles.playlistNoteTitle}>20 bài tiếng Việt cho vài ngày tới</Text>
              <Text style={styles.playlistNoteText}>Nhẹ nhàng, vui vẻ, chill, những bài đang được yêu thích và vài giai điệu mới — tất cả đều bằng tiếng Việt.</Text>
            </View>
          </View>
        )}

        <View style={styles.listHeader}>
          <View style={styles.listHeaderCopy}>
            <Text style={styles.listTitle}>{isSearch ? "Kết quả tìm kiếm" : currentTabLabel}</Text>
            <Text numberOfLines={2} style={styles.listSubtitle}>{isSearch ? `Đang tìm “${searchText.trim()}”` : tab === "family" ? "Những bài người thân đã chủ động thêm" : tab === "favorites" ? "Góc nhạc riêng của bạn" : "Cùng một playlist cho mọi người trong nhà"}</Text>
          </View>
          {tab === "playlist" && !isSearch && <Pressable disabled={loadingCycle} onPress={() => void loadCycle()} style={styles.refreshButton}><Ionicons name="refresh" size={16} color={COLORS.primary} /></Pressable>}
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="heart-circle-outline" size={18} color="#A7475B" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Nhạc chưa sẵn sàng</Text>
              <Text style={styles.errorText}>{error}</Text>
              {tab === "playlist" && !isSearch ? (
                <Pressable disabled={loadingCycle} onPress={() => void loadCycle()} style={({ pressed }) => [styles.errorRetry, pressed && styles.errorRetryPressed]}>
                  <Ionicons name="refresh" size={14} color={COLORS.primary} />
                  <Text style={styles.errorRetryText}>Thử lại</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}

        <View style={styles.listShell}>
          {loadingCycle && tab === "playlist" && !cycle ? (
            <View style={styles.centerListState}>
              <View style={styles.centerListIcon}><Ionicons name="musical-notes" size={22} color="#8D79B4" /></View>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.centerListTitle}>Đang mở playlist của nhà mình…</Text>
              <Text style={styles.centerListText}>Chỉ một chút thôi nhé.</Text>
            </View>
          ) : error && tab === "playlist" && !cycle && !isSearch ? (
            <View style={styles.centerListState}>
              <View style={styles.centerListIcon}><Ionicons name="heart-outline" size={22} color={COLORS.primary} /></View>
              <Text style={styles.centerListTitle}>Playlist chưa mở được</Text>
              <Text style={styles.centerListText}>Không sao, bạn có thể thử lại sau một chút.</Text>
              <Pressable disabled={loadingCycle} onPress={() => void loadCycle()} style={({ pressed }) => [styles.centerRetryButton, pressed && styles.errorRetryPressed]}>
                <Ionicons name="refresh" size={15} color={COLORS.white} />
                <Text style={styles.centerRetryText}>Thử lại</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              ref={listRef}
              nestedScrollEnabled
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              style={styles.trackScroller}
              contentContainerStyle={styles.trackListContent}
            >
              {visibleTracks.map((track, index) => {
                const familySong = familySongById.get(track.id);
                return (
                  <TrackRow
                    key={track.id}
                    track={track}
                    queue={baseTracks}
                    active={currentTrack?.id === track.id}
                    favorite={favoriteIds.has(track.id)}
                    inFamily={familyIds.has(track.id)}
                    subtitle={tab === "family" && !isSearch && familySong ? `${familySong.artist} · ${familySong.sharedByName} đã thêm` : undefined}
                    last={index === visibleTracks.length - 1}
                    onPlay={onPlay}
                    onFavorite={onFavorite}
                    onFamily={onFamily}
                  />
                );
              })}
              {!visibleTracks.length && !searching ? <Text style={styles.empty}>{emptyCopy}</Text> : null}
              {searching ? <View style={styles.searchingRow}><ActivityIndicator size="small" color={COLORS.primary} /><Text style={styles.searchingText}>Bloom đang tìm một giai điệu phù hợp…</Text></View> : null}
            </ScrollView>
          )}
        </View>

        {baseTracks.length > PAGE && !isSearch ? (
          <View style={styles.pager}>
            <Pressable disabled={safePage <= 0} onPress={() => changePage(safePage - 1)} style={[styles.pagerButton, safePage <= 0 && styles.pagerButtonDisabled]}>
              <Ionicons name="chevron-back" size={16} color={safePage <= 0 ? "#C9C0C5" : COLORS.primary} />
            </Pressable>
            <Text style={styles.pagerText}>Trang {safePage + 1}/{totalPages}</Text>
            <Pressable disabled={safePage >= totalPages - 1} onPress={() => changePage(safePage + 1)} style={[styles.pagerButton, safePage >= totalPages - 1 && styles.pagerButtonDisabled]}>
              <Ionicons name="chevron-forward" size={16} color={safePage >= totalPages - 1 ? "#C9C0C5" : COLORS.primary} />
            </Pressable>
          </View>
        ) : null}

        <MiniPlayer />

        <View style={styles.providerNote}>
          <Ionicons name="flower-outline" size={15} color="#8A709B" />
          <Text style={styles.providerNoteText}>Playlist sẽ đổi theo từng đợt để cả nhà có thêm giai điệu mới. Những bài bạn yêu thích vẫn luôn ở lại trong góc riêng của mình.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  musicCard: { overflow: "hidden", borderRadius: 30, backgroundColor: "#FFF9FB", borderWidth: 1, borderColor: "#E7D9E0", shadowColor: "#8D6675", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  hero: { position: "relative", overflow: "hidden", backgroundColor: "#F1EAFB", padding: 18, paddingTop: 20, paddingBottom: 17 },
  heroGlowOne: { position: "absolute", width: 170, height: 170, borderRadius: 85, right: -55, top: -70, backgroundColor: "rgba(255,255,255,0.56)" },
  heroGlowTwo: { position: "absolute", width: 120, height: 120, borderRadius: 60, right: 34, bottom: -58, backgroundColor: "rgba(236,205,229,0.45)" },
  heroNotes: { position: "absolute", right: 18, top: 18, width: 68, height: 68, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.58)", alignItems: "center", justifyContent: "center", transform: [{ rotate: "7deg" }] },
  heroCopy: { paddingRight: 66 },
  heroEyebrow: { color: "#7F6BA7", fontSize: 9.5, fontWeight: "900", letterSpacing: 0.9 },
  heroTitle: { marginTop: 6, color: COLORS.primaryText, fontSize: 20, lineHeight: 25, fontWeight: "900", maxWidth: 265 },
  heroSubtitle: { marginTop: 7, color: "#756970", fontSize: 11.4, lineHeight: 17, fontWeight: "600", maxWidth: 300 },
  heroBadge: { marginTop: 10, alignSelf: "flex-start", flexDirection: "row", gap: 6, alignItems: "center", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.67)", paddingHorizontal: 10, paddingVertical: 6 },
  heroBadgeText: { color: "#725D9D", fontSize: 9.4, fontWeight: "900" },
  searchBox: { marginTop: 15, minHeight: 50, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#DCCFE8", flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 10, shadowColor: "#7D668A", shadowOpacity: 0.07, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  searchIcon: { width: 34, height: 34, borderRadius: 13, backgroundColor: "#FFF0F5", alignItems: "center", justifyContent: "center" },
  searchInput: { flex: 1, color: COLORS.primaryText, fontSize: 13, minHeight: 46 },
  cardBody: { gap: 12, padding: 13, paddingTop: 12 },
  tabs: { flexDirection: "row", gap: 5, padding: 4, borderRadius: 18, backgroundColor: "#F5F0F8" },
  tab: { flex: 1, minHeight: 42, paddingHorizontal: 5, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  tabActive: { backgroundColor: "#9B83BE" },
  tabText: { color: COLORS.primaryText, fontSize: 10.2, fontWeight: "900" },
  tabTextActive: { color: COLORS.white },
  playlistNote: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 17, backgroundColor: "#F7F2FD", paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#E4D9F2" },
  playlistNoteIcon: { width: 34, height: 34, borderRadius: 13, backgroundColor: "#EEE5FA", alignItems: "center", justifyContent: "center" },
  playlistNoteCopy: { flex: 1 },
  playlistNoteTitle: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  playlistNoteText: { marginTop: 2, color: COLORS.secondaryText, fontSize: 9.4, lineHeight: 13.5 },
  listHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 2 },
  listHeaderCopy: { flex: 1 },
  listTitle: { color: COLORS.primaryText, fontSize: 15, fontWeight: "900" },
  listSubtitle: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.2, lineHeight: 14 },
  refreshButton: { width: 36, height: 36, borderRadius: 13, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  listShell: { height: LIST_HEIGHT, overflow: "hidden", borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#E7DDE2" },
  trackScroller: { flex: 1 },
  trackListContent: { paddingHorizontal: 10, paddingVertical: 3 },
  trackRow: { paddingHorizontal: 4, paddingVertical: 10 },
  trackRowActive: { backgroundColor: "#FCF9FF", borderRadius: 15, paddingHorizontal: 8, marginHorizontal: -4 },
  trackDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#EADFE4" },
  trackMain: { flexDirection: "row", alignItems: "center", gap: 10 },
  artwork: { overflow: "hidden", backgroundColor: "#ECE5F7", alignItems: "center", justifyContent: "center" },
  trackCopy: { flex: 1, minWidth: 0 },
  trackTitle: { color: COLORS.primaryText, fontSize: 12.2, fontWeight: "900" },
  trackArtist: { marginTop: 2, color: COLORS.secondaryText, fontSize: 9.8 },
  trackActions: { flexDirection: "row", gap: 6, marginTop: 6 },
  iconAction: { width: 31, height: 28, borderRadius: 10, backgroundColor: "#F8F5F8", alignItems: "center", justifyContent: "center" },
  iconActionActive: { backgroundColor: "#FFF5E6" },
  familyAction: { minHeight: 28, borderRadius: 10, backgroundColor: "#FFF1F5", flexDirection: "row", gap: 3, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  familyActionDone: { backgroundColor: "#F0F8F3" },
  familyActionText: { color: COLORS.primary, fontSize: 9.4, fontWeight: "900" },
  familyActionTextDone: { color: "#5D8F72" },
  playButton: { width: 34, height: 34, borderRadius: 13, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  playButtonActive: { backgroundColor: "#9B83BE" },
  centerListState: { height: LIST_HEIGHT, alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 28 },
  centerListIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: "#F3ECFA", alignItems: "center", justifyContent: "center", marginBottom: 1 },
  centerListTitle: { color: COLORS.primaryText, fontSize: 13.1, lineHeight: 18, fontWeight: "900", textAlign: "center" },
  centerListText: { color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 16, textAlign: "center" },
  centerRetryButton: { marginTop: 3, minHeight: 40, borderRadius: 16, backgroundColor: COLORS.primary, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  centerRetryText: { color: COLORS.white, fontSize: 11, fontWeight: "900" },
  searchingRow: { paddingVertical: 28, alignItems: "center", justifyContent: "center", gap: 8 },
  searchingText: { color: COLORS.secondaryText, fontSize: 10.5 },
  empty: { textAlign: "center", color: COLORS.secondaryText, paddingHorizontal: 22, paddingVertical: 34, fontSize: 11.3, lineHeight: 17 },
  pager: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  pagerButton: { width: 34, height: 31, borderRadius: 11, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  pagerButtonDisabled: { backgroundColor: "#F7F4F6" },
  pagerText: { minWidth: 72, textAlign: "center", color: COLORS.secondaryText, fontSize: 9.8, fontWeight: "800" },
  playbackNotice: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 17, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: "#FFF1F5", borderWidth: 1, borderColor: "#F0D8E1" },
  playbackNoticeText: { flex: 1, color: COLORS.primaryText, fontSize: 10.2, lineHeight: 15, fontWeight: "700" },
  miniPlayer: { borderRadius: 19, padding: 10, backgroundColor: "#F7F1FC", borderWidth: 1, borderColor: "#DCCFEA" },
  miniPlayerTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  miniCopy: { flex: 1, minWidth: 0, marginLeft: 1 },
  miniKicker: { color: "#8B73AD", fontSize: 7.3, fontWeight: "900", letterSpacing: 0.5 },
  miniTitle: { marginTop: 2, color: COLORS.primaryText, fontSize: 11.8, fontWeight: "900" },
  miniArtist: { marginTop: 1, color: COLORS.secondaryText, fontSize: 9.2 },
  playerControl: { width: 29, height: 29, borderRadius: 11, backgroundColor: "#EFE8F7", alignItems: "center", justifyContent: "center" },
  playerControlMain: { width: 36, height: 36, borderRadius: 14, backgroundColor: "#9279B7", alignItems: "center", justifyContent: "center" },
  progressTrack: { height: 3, borderRadius: 3, backgroundColor: "#E3DAEF", overflow: "hidden", marginTop: 9 },
  progressFill: { height: 3, backgroundColor: "#9B83BE", borderRadius: 3 },
  playerError: { marginTop: 6, color: "#A7475B", fontSize: 9.2 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FFF0F3", borderRadius: 15, padding: 10 },
  errorTitle: { color: "#9A4357", fontSize: 10.5, fontWeight: "900" },
  errorText: { marginTop: 2, color: "#9A5868", fontSize: 9.8, lineHeight: 14 },
  errorRetry: { marginTop: 8, alignSelf: "flex-start", minHeight: 34, borderRadius: 14, backgroundColor: "#FFE6ED", paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 6 },
  errorRetryPressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  errorRetryText: { color: COLORS.primary, fontSize: 10.2, fontWeight: "900" },
  providerNote: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 8, paddingBottom: 2 },
  providerNoteText: { flex: 1, color: COLORS.secondaryText, fontSize: 9.1, lineHeight: 13.5 },
});
