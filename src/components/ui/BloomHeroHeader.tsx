import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/theme";

export type BloomHeroVariant =
  | "event"
  | "moment"
  | "tree"
  | "profile"
  | "family"
  | "relationship"
  | "moderation"
  | "settings"
  | "auth"
  | "living"
  | "whisper"
  | "poll"
  | "kitchen"
  | "notice"
  | "game"
  | "music"
  | "fund"
  | "generic";

type HeroConfig = {
  icon: keyof typeof Ionicons.glyphMap;
  accentIcon: keyof typeof Ionicons.glyphMap;
  tertiaryIcon: keyof typeof Ionicons.glyphMap;
  surface: string;
  surfaceDeep: string;
  glow: string;
};

const HERO_CONFIG: Record<BloomHeroVariant, HeroConfig> = {
  event: {
    icon: "calendar-outline",
    accentIcon: "heart",
    tertiaryIcon: "mail-outline",
    surface: "#FFD5E3",
    surfaceDeep: "#F4A8C1",
    glow: "#FFF0F5",
  },
  moment: {
    icon: "images-outline",
    accentIcon: "heart-outline",
    tertiaryIcon: "sparkles-outline",
    surface: "#FFD7E5",
    surfaceDeep: "#F1A0BC",
    glow: "#FFF1F6",
  },
  tree: {
    icon: "git-network-outline",
    accentIcon: "people-outline",
    tertiaryIcon: "home-outline",
    surface: "#FFD4E2",
    surfaceDeep: "#E993B2",
    glow: "#FFF0F4",
  },
  profile: {
    icon: "person-circle-outline",
    accentIcon: "heart-outline",
    tertiaryIcon: "flower-outline",
    surface: "#FFD9E6",
    surfaceDeep: "#EFA8C0",
    glow: "#FFF1F6",
  },
  family: {
    icon: "home-outline",
    accentIcon: "people-outline",
    tertiaryIcon: "heart-outline",
    surface: "#FFD7E4",
    surfaceDeep: "#EBA0B9",
    glow: "#FFF0F5",
  },
  relationship: {
    icon: "git-branch-outline",
    accentIcon: "people-circle-outline",
    tertiaryIcon: "heart-circle-outline",
    surface: "#FFD5E3",
    surfaceDeep: "#E398B3",
    glow: "#FFF0F4",
  },
  moderation: {
    icon: "shield-checkmark-outline",
    accentIcon: "eye-outline",
    tertiaryIcon: "checkmark-done-outline",
    surface: "#FBD8E4",
    surfaceDeep: "#DFA1B7",
    glow: "#FFF1F5",
  },
  settings: {
    icon: "options-outline",
    accentIcon: "notifications-outline",
    tertiaryIcon: "flower-outline",
    surface: "#FFD8E5",
    surfaceDeep: "#E7A1BA",
    glow: "#FFF1F5",
  },
  auth: {
    icon: "heart-outline",
    accentIcon: "home-outline",
    tertiaryIcon: "flower-outline",
    surface: "#FFD1E0",
    surfaceDeep: "#E987AA",
    glow: "#FFF0F6",
  },
  living: {
    icon: "home-outline",
    accentIcon: "musical-notes-outline",
    tertiaryIcon: "game-controller-outline",
    surface: "#FFD0E0",
    surfaceDeep: "#E781A5",
    glow: "#FFF0F6",
  },
  whisper: {
    icon: "chatbubble-ellipses-outline",
    accentIcon: "heart-outline",
    tertiaryIcon: "moon-outline",
    surface: "#FFD8E8",
    surfaceDeep: "#E991B4",
    glow: "#FFF4F8",
  },
  poll: {
    icon: "stats-chart-outline",
    accentIcon: "people-outline",
    tertiaryIcon: "checkmark-circle-outline",
    surface: "#F1DCFA",
    surfaceDeep: "#C997E2",
    glow: "#FBF5FF",
  },
  kitchen: {
    icon: "restaurant-outline",
    accentIcon: "leaf-outline",
    tertiaryIcon: "heart-outline",
    surface: "#F6E6D8",
    surfaceDeep: "#D9B08D",
    glow: "#FFF9F3",
  },
  notice: {
    icon: "notifications-outline",
    accentIcon: "pin-outline",
    tertiaryIcon: "calendar-outline",
    surface: "#FFE0E7",
    surfaceDeep: "#E7A0B3",
    glow: "#FFF5F7",
  },
  game: {
    icon: "game-controller-outline",
    accentIcon: "sparkles-outline",
    tertiaryIcon: "trophy-outline",
    surface: "#F8DFEC",
    surfaceDeep: "#D89CC2",
    glow: "#FFF5FA",
  },
  music: {
    icon: "musical-notes-outline",
    accentIcon: "headset-outline",
    tertiaryIcon: "heart-outline",
    surface: "#E8E3FA",
    surfaceDeep: "#AEA4DB",
    glow: "#F8F6FF",
  },
  fund: {
    icon: "wallet-outline",
    accentIcon: "pie-chart-outline",
    tertiaryIcon: "shield-checkmark-outline",
    surface: "#DFF2E9",
    surfaceDeep: "#94C6AE",
    glow: "#F4FCF8",
  },
  generic: {
    icon: "flower-outline",
    accentIcon: "heart-outline",
    tertiaryIcon: "sparkles-outline",
    surface: "#FFD9E6",
    surfaceDeep: "#EFA4BC",
    glow: "#FFF1F6",
  },
};

// Bloom Supper hero artwork is rendered from clean in-app illustrations.
// Earlier screenshot-derived PNGs contained embedded typography, which could
// visually overlap the live page title. Keep all header copy native and
// purpose-aware so every screen stays readable and localizable.


export type BloomHeroHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  variant?: BloomHeroVariant;
  onBack?: () => void;
  backDisabled?: boolean;
  right?: ReactNode;
  /** Optional live content (family switcher, small status pills) anchored inside the hero. */
  footer?: ReactNode;
  compact?: boolean;
  /** Bloom Supper tab heroes use a soft lower silhouette while staying full-bleed on top/left/right. */
  roundedBottom?: boolean;
  testID?: string;
};

function EventIllustration() {
  return (
    <View style={styles.sceneCanvas}>
      <View style={styles.eventFlowerStem} />
      <View style={[styles.eventLeaf, styles.eventLeafOne]} />
      <View style={[styles.eventLeaf, styles.eventLeafTwo]} />
      <View style={[styles.eventTulip, styles.eventTulipOne]} />
      <View style={[styles.eventTulip, styles.eventTulipTwo]} />
      <View style={styles.calendarCard}>
        <View style={styles.calendarRings}><View style={styles.calendarRing} /><View style={styles.calendarRing} /><View style={styles.calendarRing} /></View>
        <View style={styles.calendarTopLine} />
        <View style={styles.calendarGrid}>
          {Array.from({ length: 9 }).map((_, index) => <View key={index} style={[styles.calendarCell, index === 4 && styles.calendarCellHeart]}>{index === 4 ? <Ionicons name="heart" size={12} color={COLORS.primary} /> : null}</View>)}
        </View>
      </View>
      <View style={styles.eventEnvelope}><Ionicons name="heart" size={12} color={COLORS.primary} /></View>
    </View>
  );
}

function MomentIllustration() {
  return (
    <View style={styles.sceneCanvas}>
      <View style={[styles.photoCard, styles.photoCardBack]}><Ionicons name="image-outline" size={30} color="#B86A87" /></View>
      <View style={[styles.photoCard, styles.photoCardFront]}>
        <Ionicons name="images-outline" size={34} color={COLORS.primaryText} />
        <View style={styles.photoHeart}><Ionicons name="heart" size={17} color={COLORS.primary} /></View>
      </View>
      <View style={[styles.sparkleBadge, { right: 8, top: 11 }]}><Ionicons name="sparkles" size={15} color={COLORS.primaryText} /></View>
      <View style={[styles.sparkleBadge, { left: 2, bottom: 7 }]}><Ionicons name="heart-outline" size={15} color={COLORS.primary} /></View>
    </View>
  );
}

function TreeIllustration({ relationship = false }: { relationship?: boolean }) {
  return (
    <View style={styles.sceneCanvas}>
      <View style={styles.treeTrunk} />
      <View style={[styles.treeBranch, styles.treeBranchLeft]} />
      <View style={[styles.treeBranch, styles.treeBranchRight]} />
      <View style={[styles.treeBranch, styles.treeBranchLower]} />
      <View style={[styles.treeLeaf, styles.treeLeafOne]} />
      <View style={[styles.treeLeaf, styles.treeLeafTwo]} />
      <View style={[styles.treeLeaf, styles.treeLeafThree]} />
      <View style={[styles.treeNode, styles.treeNodeTop]}><Ionicons name="person" size={18} color={COLORS.primaryText} /></View>
      <View style={[styles.treeNode, styles.treeNodeLeft]}><Ionicons name="person" size={16} color={COLORS.primary} /></View>
      <View style={[styles.treeNode, styles.treeNodeRight]}><Ionicons name="person" size={16} color={COLORS.primaryText} /></View>
      <View style={[styles.treeNode, styles.treeNodeBottom]}><Ionicons name="person" size={15} color="#6FA47D" /></View>
      <View style={styles.treeHouse}><Ionicons name={relationship ? "git-branch-outline" : "home"} size={19} color={COLORS.primaryText} /></View>
    </View>
  );
}

function FamilyIllustration() {
  return (
    <View style={styles.sceneCanvas}>
      <View style={styles.familyHome}><Ionicons name="home" size={35} color={COLORS.primaryText} /><View style={styles.familyHomeHeart}><Ionicons name="heart" size={10} color={COLORS.primary} /></View></View>
      <View style={[styles.familyPersonBadge, { left: 5, top: 18 }]}><Ionicons name="person" size={17} color={COLORS.primary} /></View>
      <View style={[styles.familyPersonBadge, { right: 3, top: 8 }]}><Ionicons name="people" size={18} color={COLORS.primaryText} /></View>
      <View style={[styles.familyPersonBadge, { right: 18, bottom: 1 }]}><Ionicons name="heart-outline" size={17} color={COLORS.primary} /></View>
    </View>
  );
}

function ProfileIllustration() {
  return (
    <View style={styles.sceneCanvas}>
      <View style={styles.profileHalo} />
      <View style={styles.profilePortrait}><Ionicons name="person" size={42} color={COLORS.primaryText} /></View>
      <View style={[styles.sparkleBadge, { right: 5, top: 8 }]}><Ionicons name="flower-outline" size={16} color={COLORS.primary} /></View>
      <View style={[styles.sparkleBadge, { left: 4, bottom: 9 }]}><Ionicons name="heart-outline" size={16} color={COLORS.primaryText} /></View>
    </View>
  );
}


function AuthIllustration() {
  return (
    <View style={styles.authScene}>
      <View style={styles.authHalo} />
      <Image
        source={require("../../../assets/images/login-family-icon.png")}
        style={styles.authImage}
        contentFit="contain"
        transition={0}
        cachePolicy="memory-disk"
      />
      <View style={[styles.sparkleBadge, { right: 2, top: 8 }]}><Ionicons name="heart" size={16} color={COLORS.primary} /></View>
      <View style={[styles.sparkleBadge, { left: 6, bottom: 5 }]}><Ionicons name="sparkles" size={15} color={COLORS.primaryText} /></View>
    </View>
  );
}

function LivingIllustration() {
  return (
    <View style={styles.sceneCanvas}>
      <View style={styles.livingHome}>
        <Ionicons name="home" size={34} color={COLORS.primaryText} />
        <View style={styles.livingHeart}><Ionicons name="heart" size={12} color={COLORS.primary} /></View>
      </View>
      <View style={[styles.livingBubble, styles.livingMusic]}><Ionicons name="musical-notes" size={20} color={COLORS.primaryText} /></View>
      <View style={[styles.livingBubble, styles.livingGame]}><Ionicons name="game-controller" size={20} color={COLORS.primary} /></View>
      <View style={[styles.livingBubble, styles.livingFood]}><Ionicons name="restaurant" size={18} color="#6F9279" /></View>
      <View style={[styles.livingBubble, styles.livingChat]}><Ionicons name="chatbubble-ellipses" size={18} color={COLORS.primaryText} /></View>
    </View>
  );
}

function WhisperIllustration() {
  return (
    <View style={styles.sceneCanvas}>
      <View style={styles.whisperMoon}><Ionicons name="moon" size={26} color="#B46E92" /></View>
      <View style={styles.whisperEnvelope}><Ionicons name="heart" size={21} color={COLORS.primary} /></View>
      <View style={[styles.whisperBubble, { right: 5, top: 24 }]}><Ionicons name="chatbubble-ellipses" size={23} color={COLORS.primaryText} /></View>
      <View style={[styles.sparkleBadge, { left: 11, bottom: 12 }]}><Ionicons name="sparkles" size={15} color={COLORS.primary} /></View>
    </View>
  );
}

function PollIllustration() {
  return (
    <View style={styles.sceneCanvas}>
      <View style={styles.pollBoard}>
        <View style={[styles.pollBar, { width: 84 }]} />
        <View style={[styles.pollBar, { width: 58, opacity: 0.72 }]} />
        <View style={[styles.pollBar, { width: 70, opacity: 0.55 }]} />
        <View style={styles.pollCheck}><Ionicons name="checkmark" size={18} color={COLORS.white} /></View>
      </View>
      <View style={[styles.familyPersonBadge, { left: 5, bottom: 8 }]}><Ionicons name="person" size={16} color={COLORS.primaryText} /></View>
      <View style={[styles.familyPersonBadge, { right: 5, top: 8 }]}><Ionicons name="people" size={18} color="#8A5E9D" /></View>
    </View>
  );
}

function KitchenIllustration() {
  return (
    <View style={styles.sceneCanvas}>
      <View style={styles.kitchenPlate}><Ionicons name="restaurant" size={38} color={COLORS.primaryText} /></View>
      <View style={[styles.eventLeaf, { right: 8, top: 22, backgroundColor: "rgba(102,145,101,0.42)", transform: [{ rotate: "20deg" }] }]} />
      <View style={[styles.eventLeaf, { right: 21, top: 43, backgroundColor: "rgba(102,145,101,0.32)", transform: [{ rotate: "-18deg" }] }]} />
      <View style={[styles.sparkleBadge, { left: 6, top: 18 }]}><Ionicons name="flame-outline" size={17} color="#B46F52" /></View>
      <View style={[styles.sparkleBadge, { right: 6, bottom: 8 }]}><Ionicons name="heart-outline" size={16} color={COLORS.primary} /></View>
    </View>
  );
}

function NoticeIllustration() {
  return (
    <View style={styles.sceneCanvas}>
      <View style={styles.noticeBoard}>
        <View style={styles.noticePin}><Ionicons name="pin" size={18} color={COLORS.primary} /></View>
        <View style={styles.noticeLine} /><View style={[styles.noticeLine, { width: 78 }]} /><View style={[styles.noticeLine, { width: 62 }]} />
      </View>
      <View style={[styles.sparkleBadge, { right: 2, top: 11 }]}><Ionicons name="notifications" size={17} color={COLORS.primaryText} /></View>
      <View style={[styles.sparkleBadge, { left: 9, bottom: 5 }]}><Ionicons name="calendar-outline" size={16} color={COLORS.primary} /></View>
    </View>
  );
}

function GameIllustration() {
  return (
    <View style={styles.sceneCanvas}>
      <View style={styles.gameController}><Ionicons name="game-controller" size={48} color={COLORS.primaryText} /></View>
      <View style={[styles.sparkleBadge, { right: 2, top: 9 }]}><Ionicons name="trophy" size={17} color="#B57931" /></View>
      <View style={[styles.sparkleBadge, { left: 5, bottom: 8 }]}><Ionicons name="sparkles" size={17} color={COLORS.primary} /></View>
      <View style={styles.gameDotOne} /><View style={styles.gameDotTwo} />
    </View>
  );
}

function MusicIllustration() {
  return (
    <View style={styles.sceneCanvas}>
      <View style={styles.musicDisc}><View style={styles.musicDiscInner} /><View style={styles.musicDiscHole} /></View>
      <View style={styles.musicHeadset}><Ionicons name="headset" size={42} color={COLORS.primaryText} /></View>
      <View style={[styles.sparkleBadge, { right: 3, top: 8 }]}><Ionicons name="musical-notes" size={17} color="#7766B1" /></View>
      <View style={[styles.sparkleBadge, { left: 2, bottom: 4 }]}><Ionicons name="heart" size={15} color={COLORS.primary} /></View>
    </View>
  );
}

function FundIllustration() {
  return (
    <View style={styles.sceneCanvas}>
      <View style={styles.fundWallet}><Ionicons name="wallet" size={38} color={COLORS.primaryText} /><View style={styles.fundCoin}><Text style={styles.fundCoinText}>₫</Text></View></View>
      <View style={[styles.sparkleBadge, { right: 3, top: 10 }]}><Ionicons name="pie-chart" size={17} color="#5F8F76" /></View>
      <View style={[styles.sparkleBadge, { left: 5, bottom: 8 }]}><Ionicons name="shield-checkmark" size={17} color={COLORS.primaryText} /></View>
    </View>
  );
}

function SymbolIllustration({ config }: { config: HeroConfig }) {
  return (
    <View style={styles.sceneCanvas}>
      <View style={styles.symbolCard}><Ionicons name={config.icon} size={42} color={COLORS.primaryText} /></View>
      <View style={[styles.sparkleBadge, { right: 3, top: 9 }]}><Ionicons name={config.accentIcon} size={16} color={COLORS.primary} /></View>
      <View style={[styles.sparkleBadge, { left: 1, bottom: 5 }]}><Ionicons name={config.tertiaryIcon} size={15} color={COLORS.primaryText} /></View>
    </View>
  );
}

function HeroIllustration({ variant, config }: { variant: BloomHeroVariant; config: HeroConfig }) {
  if (variant === "event") return <EventIllustration />;
  if (variant === "moment") return <MomentIllustration />;
  if (variant === "tree") return <TreeIllustration />;
  if (variant === "relationship") return <TreeIllustration relationship />;
  if (variant === "family") return <FamilyIllustration />;
  if (variant === "profile") return <ProfileIllustration />;
  if (variant === "auth") return <AuthIllustration />;
  if (variant === "living") return <LivingIllustration />;
  if (variant === "whisper") return <WhisperIllustration />;
  if (variant === "poll") return <PollIllustration />;
  if (variant === "kitchen") return <KitchenIllustration />;
  if (variant === "notice") return <NoticeIllustration />;
  if (variant === "game") return <GameIllustration />;
  if (variant === "music") return <MusicIllustration />;
  if (variant === "fund") return <FundIllustration />;
  return <SymbolIllustration config={config} />;
}

/**
 * Purpose-aware Family Bloom hero header.
 *
 * Phase 12 Bloom Supper visual contract:
 * - header owns the top safe-area/status-bar surface; never sits in a white strip;
 * - typography and illustration are bolder than ordinary cards so the page purpose is obvious;
 * - each domain gets its own motif (calendar, memory/photo, family tree, profile, home, review...);
 * - decorative visuals never replace the actual page title/copy.
 */
export function BloomHeroHeader({
  eyebrow,
  title,
  subtitle,
  variant = "generic",
  onBack,
  backDisabled = false,
  right,
  footer,
  compact = false,
  roundedBottom = false,
  testID,
}: BloomHeroHeaderProps) {
  const insets = useSafeAreaInsets();
  const config = HERO_CONFIG[variant];

  return (
    <View
      testID={testID}
      style={[
        styles.root,
        compact && styles.rootCompact,
        roundedBottom && styles.rootRoundedBottom,
        { backgroundColor: config.surface },
      ]}
    >
      {/* Bloom Supper full-bleed contract: decorative art owns the complete
          status-bar + left/right surface. Copy/buttons live in a padded inner
          layer so the artwork can breathe all the way to the physical edges. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.glowLarge, { backgroundColor: config.glow }]} />
        <View style={[styles.glowDeep, { backgroundColor: config.surfaceDeep }]} />
        <View style={styles.cloudOne} />
        <View style={styles.cloudTwo} />
        <View style={styles.petalOne} />
        <View style={styles.petalTwo} />
        <View style={styles.petalThree} />
        <View style={styles.artRibbonOne} />
        <View style={styles.artRibbonTwo} />
        <View style={[styles.illustrationWrap, compact && styles.illustrationWrapCompact]}>
          <HeroIllustration variant={variant} config={config} />
        </View>
      </View>

      <View
        style={[
          styles.inner,
          compact && styles.innerCompact,
          { paddingTop: Math.max(insets.top, 8) + 10 },
        ]}
      >
        <View style={styles.topRow}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              disabled={backDisabled}
              hitSlop={8}
              onPress={onBack}
              style={({ pressed }) => [styles.navButton, backDisabled && styles.disabled, pressed && !backDisabled && styles.pressed]}
            >
              <Ionicons name="arrow-back" size={27} color="#71304B" />
            </Pressable>
          ) : <View style={styles.navPlaceholder} />}

          <View style={styles.topSpacer} />
          {right ? <View style={styles.right}>{right}</View> : <View style={styles.navPlaceholder} />}
        </View>

        <View style={[styles.copy, compact && styles.copyCompact]}>
          {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={3}>{title}</Text>
          {!!subtitle && <Text style={[styles.subtitle, compact && styles.subtitleCompact]} numberOfLines={compact ? 3 : 4}>{subtitle}</Text>}
        </View>
        {!!footer && <View style={[styles.footer, compact && styles.footerCompact]}>{footer}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    alignSelf: "stretch",
    minHeight: 300,
    overflow: "hidden",
  },
  rootCompact: { minHeight: 238 },
  rootRoundedBottom: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  inner: {
    minHeight: 300,
    paddingHorizontal: 22,
    paddingBottom: 42,
    zIndex: 3,
  },
  innerCompact: { minHeight: 238, paddingBottom: 30 },
  glowLarge: { position: "absolute", width: 290, height: 290, borderRadius: 999, right: -92, top: -88, opacity: 0.88 },
  glowDeep: { position: "absolute", width: 220, height: 220, borderRadius: 999, left: -120, bottom: -130, opacity: 0.2 },
  cloudOne: { position: "absolute", width: 230, height: 100, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.25)", left: -42, bottom: -35 },
  cloudTwo: { position: "absolute", width: 180, height: 82, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.18)", right: 58, bottom: -32 },
  petalOne: { position: "absolute", width: 19, height: 10, borderRadius: 999, backgroundColor: "rgba(229,112,151,0.28)", top: 74, left: 160, transform: [{ rotate: "-25deg" }] },
  petalTwo: { position: "absolute", width: 13, height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.8)", top: 118, left: 35, transform: [{ rotate: "34deg" }] },
  petalThree: { position: "absolute", width: 15, height: 8, borderRadius: 999, backgroundColor: "rgba(149,70,101,0.14)", right: 142, bottom: 64, transform: [{ rotate: "20deg" }] },
  topRow: { minHeight: 56, flexDirection: "row", alignItems: "center", zIndex: 4 },
  navButton: { width: 56, height: 56, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.87)", borderWidth: 1, borderColor: "rgba(255,255,255,0.96)", shadowColor: "#7E5260", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 3 },
  navPlaceholder: { width: 56, height: 56 },
  topSpacer: { flex: 1 },
  right: { minWidth: 56, minHeight: 56, alignItems: "flex-end", justifyContent: "center" },
  copy: { marginTop: 24, maxWidth: "64%", zIndex: 3 },
  copyCompact: { marginTop: 15, maxWidth: "66%" },
  footer: { marginTop: 18, maxWidth: "72%", zIndex: 4 },
  footerCompact: { marginTop: 12, maxWidth: "70%" },
  eyebrow: { color: "#D45E88", fontSize: 12, fontWeight: "900", letterSpacing: 1.2 },
  title: { marginTop: 7, color: "#641333", fontSize: 34, lineHeight: 39, fontWeight: "900", letterSpacing: -0.9 },
  titleCompact: { fontSize: 27, lineHeight: 32 },
  subtitle: { marginTop: 10, color: "#764D5F", fontSize: 14.5, lineHeight: 21, fontWeight: "600" },
  subtitleCompact: { fontSize: 12.5, lineHeight: 18 },
  illustrationWrap: {
    position: "absolute",
    right: -24,
    bottom: -4,
    width: 286,
    height: 244,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ scale: 1.12 }],
    opacity: 0.98,
  },
  illustrationWrapCompact: { right: -34, bottom: -12, transform: [{ scale: 1.02 }] },
  artRibbonOne: {
    position: "absolute",
    right: -54,
    bottom: 52,
    width: 270,
    height: 62,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    transform: [{ rotate: "-8deg" }],
  },
  artRibbonTwo: {
    position: "absolute",
    right: 88,
    bottom: -36,
    width: 230,
    height: 82,
    borderRadius: 999,
    backgroundColor: "rgba(227,114,151,0.10)",
    transform: [{ rotate: "9deg" }],
  },
  sceneCanvas: { width: 194, height: 180 },
  authScene: { width: 178, height: 168, alignItems: "center", justifyContent: "center" },
  authHalo: { position: "absolute", width: 154, height: 154, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.27)" },
  authImage: { width: 150, height: 150 },

  calendarCard: { position: "absolute", right: 12, top: 18, width: 94, height: 96, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.96)", transform: [{ rotate: "6deg" }], paddingTop: 22, paddingHorizontal: 11 },
  calendarRings: { position: "absolute", top: -6, left: 20, right: 20, flexDirection: "row", justifyContent: "space-between" },
  calendarRing: { width: 8, height: 18, borderRadius: 8, borderWidth: 3, borderColor: "#A84F70", backgroundColor: "transparent" },
  calendarTopLine: { position: "absolute", left: 9, right: 9, top: 18, height: 2, borderRadius: 2, backgroundColor: "rgba(168,79,112,0.18)" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  calendarCell: { width: 18, height: 16, borderRadius: 5, backgroundColor: "rgba(235,130,164,0.13)", alignItems: "center", justifyContent: "center" },
  calendarCellHeart: { backgroundColor: "rgba(235,130,164,0.22)" },
  eventFlowerStem: { position: "absolute", left: 24, top: 24, width: 4, height: 93, borderRadius: 4, backgroundColor: "rgba(105,137,95,0.42)", transform: [{ rotate: "-10deg" }] },
  eventLeaf: { position: "absolute", width: 29, height: 13, borderRadius: 999, backgroundColor: "rgba(122,145,99,0.4)" },
  eventLeafOne: { left: 7, top: 63, transform: [{ rotate: "-26deg" }] },
  eventLeafTwo: { left: 27, top: 82, transform: [{ rotate: "24deg" }] },
  eventTulip: { position: "absolute", width: 26, height: 30, borderRadius: 16, backgroundColor: "rgba(232,112,151,0.72)" },
  eventTulipOne: { left: 11, top: 7, transform: [{ rotate: "-15deg" }] },
  eventTulipTwo: { left: 37, top: 28, width: 20, height: 25, opacity: 0.75 },
  eventEnvelope: { position: "absolute", right: 0, bottom: 4, width: 46, height: 31, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.84)", alignItems: "center", justifyContent: "center", transform: [{ rotate: "9deg" }] },

  photoCard: { position: "absolute", width: 86, height: 92, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center" },
  photoCardBack: { left: 14, top: 29, transform: [{ rotate: "-10deg" }], opacity: 0.7 },
  photoCardFront: { right: 10, top: 15, transform: [{ rotate: "8deg" }] },
  photoHeart: { position: "absolute", right: 10, bottom: 9, width: 32, height: 32, borderRadius: 13, backgroundColor: "rgba(255,238,244,0.95)", alignItems: "center", justifyContent: "center" },
  sparkleBadge: { position: "absolute", width: 36, height: 36, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.84)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" },

  treeTrunk: { position: "absolute", width: 7, height: 84, borderRadius: 999, backgroundColor: "rgba(128,68,91,0.38)", right: 42, top: 21, transform: [{ rotate: "8deg" }] },
  treeBranch: { position: "absolute", height: 4, borderRadius: 999, backgroundColor: "rgba(128,68,91,0.35)" },
  treeBranchLeft: { width: 77, right: 38, top: 49, transform: [{ rotate: "-18deg" }] },
  treeBranchRight: { width: 66, right: 6, top: 53, transform: [{ rotate: "17deg" }] },
  treeBranchLower: { width: 74, right: 31, top: 90, transform: [{ rotate: "3deg" }] },
  treeLeaf: { position: "absolute", width: 27, height: 15, borderRadius: 999, backgroundColor: "rgba(225,103,145,0.48)" },
  treeLeafOne: { right: 73, top: 11, transform: [{ rotate: "-24deg" }] },
  treeLeafTwo: { right: 3, top: 28, transform: [{ rotate: "25deg" }] },
  treeLeafThree: { right: 73, top: 80, transform: [{ rotate: "18deg" }] },
  treeNode: { position: "absolute", width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 2, borderColor: "rgba(235,130,164,0.45)" },
  treeNodeTop: { right: 36, top: 0 },
  treeNodeLeft: { left: 9, top: 36 },
  treeNodeRight: { right: 0, top: 52 },
  treeNodeBottom: { right: 58, bottom: 0, borderColor: "rgba(111,164,125,0.35)" },
  treeHouse: { position: "absolute", right: 2, bottom: 0, width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.78)" },

  familyHome: { position: "absolute", left: 33, top: 31, width: 82, height: 78, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.72)", borderWidth: 1, borderColor: "rgba(255,255,255,0.94)" },
  familyHomeHeart: { position: "absolute", bottom: 10, right: 16, width: 23, height: 23, borderRadius: 10, backgroundColor: "rgba(255,236,243,0.9)", alignItems: "center", justifyContent: "center" },
  familyPersonBadge: { position: "absolute", width: 39, height: 39, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.88)", alignItems: "center", justifyContent: "center" },

  profileHalo: { position: "absolute", left: 27, top: 19, width: 94, height: 94, borderRadius: 47, backgroundColor: "rgba(255,255,255,0.34)" },
  profilePortrait: { position: "absolute", left: 39, top: 31, width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(255,255,255,0.88)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(235,130,164,0.38)" },
  symbolCard: { position: "absolute", left: 28, top: 25, width: 92, height: 88, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.76)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)", transform: [{ rotate: "5deg" }] },
  livingHome: { position: "absolute", left: 48, top: 45, width: 88, height: 82, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.78)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.96)" },
  livingHeart: { position: "absolute", right: 14, bottom: 12, width: 27, height: 27, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,239,245,0.96)" },
  livingBubble: { position: "absolute", width: 43, height: 43, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.88)", borderWidth: 1, borderColor: "rgba(255,255,255,0.97)", alignItems: "center", justifyContent: "center" },
  livingMusic: { right: 3, top: 15, transform: [{ rotate: "8deg" }] },
  livingGame: { left: 7, top: 19, transform: [{ rotate: "-8deg" }] },
  livingFood: { right: 5, bottom: 10, transform: [{ rotate: "-6deg" }] },
  livingChat: { left: 8, bottom: 8, transform: [{ rotate: "7deg" }] },

  whisperMoon: { position: "absolute", left: 18, top: 16, width: 58, height: 58, borderRadius: 29, backgroundColor: "rgba(255,255,255,0.52)", alignItems: "center", justifyContent: "center" },
  whisperEnvelope: { position: "absolute", left: 53, top: 55, width: 91, height: 63, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.84)", alignItems: "center", justifyContent: "center", transform: [{ rotate: "-5deg" }] },
  whisperBubble: { position: "absolute", width: 48, height: 48, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.88)", alignItems: "center", justifyContent: "center" },
  pollBoard: { position: "absolute", left: 27, top: 31, width: 116, height: 94, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.8)", padding: 18, gap: 9, justifyContent: "center" },
  pollBar: { height: 9, borderRadius: 999, backgroundColor: "rgba(163,99,190,0.45)" },
  pollCheck: { position: "absolute", right: 12, bottom: 12, width: 31, height: 31, borderRadius: 14, backgroundColor: "#B07BC7", alignItems: "center", justifyContent: "center" },
  kitchenPlate: { position: "absolute", left: 38, top: 38, width: 98, height: 98, borderRadius: 49, backgroundColor: "rgba(255,255,255,0.75)", borderWidth: 8, borderColor: "rgba(255,255,255,0.42)", alignItems: "center", justifyContent: "center" },
  noticeBoard: { position: "absolute", left: 33, top: 30, width: 108, height: 99, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.82)", paddingTop: 38, paddingHorizontal: 16, gap: 9, transform: [{ rotate: "-4deg" }] },
  noticePin: { position: "absolute", left: 43, top: 8, width: 34, height: 34, borderRadius: 14, backgroundColor: "rgba(255,239,245,0.95)", alignItems: "center", justifyContent: "center" },
  noticeLine: { height: 7, width: 88, borderRadius: 999, backgroundColor: "rgba(172,84,113,0.18)" },
  gameController: { position: "absolute", left: 35, top: 42, width: 113, height: 83, borderRadius: 31, backgroundColor: "rgba(255,255,255,0.8)", alignItems: "center", justifyContent: "center", transform: [{ rotate: "-4deg" }] },
  gameDotOne: { position: "absolute", right: 31, bottom: 22, width: 15, height: 15, borderRadius: 8, backgroundColor: "rgba(232,130,164,0.5)" },
  gameDotTwo: { position: "absolute", left: 20, top: 24, width: 11, height: 11, borderRadius: 6, backgroundColor: "rgba(151,105,180,0.4)" },
  musicDisc: { position: "absolute", left: 27, top: 30, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(102,86,160,0.34)", alignItems: "center", justifyContent: "center" },
  musicDiscInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.64)" },
  musicDiscHole: { position: "absolute", width: 13, height: 13, borderRadius: 7, backgroundColor: "rgba(102,86,160,0.58)" },
  musicHeadset: { position: "absolute", right: 5, top: 58, width: 72, height: 72, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.84)", alignItems: "center", justifyContent: "center" },
  fundWallet: { position: "absolute", left: 30, top: 42, width: 116, height: 82, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.82)", alignItems: "center", justifyContent: "center", transform: [{ rotate: "3deg" }] },
  fundCoin: { position: "absolute", right: -7, top: -12, width: 39, height: 39, borderRadius: 20, backgroundColor: "#F4D78A", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.92)" },
  fundCoinText: { color: "#8D6A2A", fontSize: 16, fontWeight: "900" },

  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
});
