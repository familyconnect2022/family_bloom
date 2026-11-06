import { createBloomStyles } from '../../theme/createBloomStyles';
import { useBloomColorsRevision, useBloomTypographyRevision } from '../../theme/BloomThemeProvider';
import { useA3Theme, useA3Typography } from '../../appearance3/useAppearance3';
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { BloomText as Text } from './BloomText';
import { Image, type ImageSource } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/theme";
import { getBloomHeroArt, type BloomHeroScene } from '../../theme/storybookHeroRegistry';
import { getBloomFogArt } from '../../theme/storybookFogRegistry';
import { getBloomHeroTextShade } from '../../theme/storybookShadeRegistry';
import { getBloomHeroReadingTokens } from '../../theme/storybookReadingTokens';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


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
  | "generic"
  | "learning";

type HeroConfig = {
  icon: keyof typeof Ionicons.glyphMap;
  accentIcon: keyof typeof Ionicons.glyphMap;
  tertiaryIcon: keyof typeof Ionicons.glyphMap;
  surface: string;
  surfaceDeep: string;
  glow: string;
};

// Icons are static; theme surfaces are resolved from the subscribed immutable
// snapshot inside BloomHeroHeader. Never cache theme colors in a module Proxy.
const HERO_ICONS: Record<Exclude<BloomHeroVariant, 'learning'>, Pick<HeroConfig, 'icon'|'accentIcon'|'tertiaryIcon'>> = {
  event: {
    icon: "calendar-outline",
    accentIcon: "heart",
    tertiaryIcon: "mail-outline",
  },
  moment: {
    icon: "images-outline",
    accentIcon: "heart-outline",
    tertiaryIcon: "sparkles-outline",
  },
  tree: {
    icon: "git-network-outline",
    accentIcon: "people-outline",
    tertiaryIcon: "home-outline",
  },
  profile: {
    icon: "person-circle-outline",
    accentIcon: "heart-outline",
    tertiaryIcon: "flower-outline",
  },
  family: {
    icon: "home-outline",
    accentIcon: "people-outline",
    tertiaryIcon: "heart-outline",
  },
  relationship: {
    icon: "git-branch-outline",
    accentIcon: "people-circle-outline",
    tertiaryIcon: "heart-circle-outline",
  },
  moderation: {
    icon: "shield-checkmark-outline",
    accentIcon: "eye-outline",
    tertiaryIcon: "checkmark-done-outline",
  },
  settings: {
    icon: "options-outline",
    accentIcon: "notifications-outline",
    tertiaryIcon: "flower-outline",
  },
  auth: {
    icon: "heart-outline",
    accentIcon: "home-outline",
    tertiaryIcon: "flower-outline",
  },
  living: {
    icon: "home-outline",
    accentIcon: "musical-notes-outline",
    tertiaryIcon: "game-controller-outline",
  },
  whisper: {
    icon: "chatbubble-ellipses-outline",
    accentIcon: "heart-outline",
    tertiaryIcon: "moon-outline",
  },
  poll: {
    icon: "stats-chart-outline",
    accentIcon: "people-outline",
    tertiaryIcon: "checkmark-circle-outline",
  },
  kitchen: {
    icon: "restaurant-outline",
    accentIcon: "leaf-outline",
    tertiaryIcon: "heart-outline",
  },
  notice: {
    icon: "notifications-outline",
    accentIcon: "pin-outline",
    tertiaryIcon: "calendar-outline",
  },
  game: {
    icon: "game-controller-outline",
    accentIcon: "sparkles-outline",
    tertiaryIcon: "trophy-outline",
  },
  music: {
    icon: "musical-notes-outline",
    accentIcon: "headset-outline",
    tertiaryIcon: "heart-outline",
  },
  fund: {
    icon: "wallet-outline",
    accentIcon: "pie-chart-outline",
    tertiaryIcon: "shield-checkmark-outline",
  },
  generic: {
    icon: "flower-outline",
    accentIcon: "heart-outline",
    tertiaryIcon: "sparkles-outline",
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
  topLeft?: ReactNode;
  /** Optional live content (family switcher, small status pills) anchored inside the hero. */
  footer?: ReactNode;
  compact?: boolean;
  /** Bloom Supper tab heroes use a soft lower silhouette while staying full-bleed on top/left/right. */
  roundedBottom?: boolean;
  /** Optional full-bleed storybook image; artwork must have alpha fade at its bottom. */
  artwork?: ImageSource | string | number;
  testID?: string;
};

function EventIllustration() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.sceneCanvas}>
      <View style={__a3_styles.eventFlowerStem} />
      <View style={[__a3_styles.eventLeaf, __a3_styles.eventLeafOne]} />
      <View style={[__a3_styles.eventLeaf, __a3_styles.eventLeafTwo]} />
      <View style={[__a3_styles.eventTulip, __a3_styles.eventTulipOne]} />
      <View style={[__a3_styles.eventTulip, __a3_styles.eventTulipTwo]} />
      <View style={__a3_styles.calendarCard}>
        <View style={__a3_styles.calendarRings}><View style={__a3_styles.calendarRing} /><View style={__a3_styles.calendarRing} /><View style={__a3_styles.calendarRing} /></View>
        <View style={__a3_styles.calendarTopLine} />
        <View style={__a3_styles.calendarGrid}>
          {Array.from({ length: 9 }).map((_, index) => <View key={index} style={[__a3_styles.calendarCell, index === 4 && __a3_styles.calendarCellHeart]}>{index === 4 ? <Ionicons name="heart" size={12} color={__a3Colors.primary} /> : null}</View>)}
        </View>
      </View>
      <View style={__a3_styles.eventEnvelope}><Ionicons name="heart" size={12} color={__a3Colors.primary} /></View>
    </View>
  );
}

function MomentIllustration() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.sceneCanvas}>
      <View style={[__a3_styles.photoCard, __a3_styles.photoCardBack]}><Ionicons name="image-outline" size={30} color={__a3Colors.primary} /></View>
      <View style={[__a3_styles.photoCard, __a3_styles.photoCardFront]}>
        <Ionicons name="images-outline" size={34} color={__a3Colors.primaryText} />
        <View style={__a3_styles.photoHeart}><Ionicons name="heart" size={17} color={__a3Colors.primary} /></View>
      </View>
      <View style={[__a3_styles.sparkleBadge, { right: 8, top: 11 }]}><Ionicons name="sparkles" size={15} color={__a3Colors.primaryText} /></View>
      <View style={[__a3_styles.sparkleBadge, { left: 2, bottom: 7 }]}><Ionicons name="heart-outline" size={15} color={__a3Colors.primary} /></View>
    </View>
  );
}

function TreeIllustration({ relationship = false }: { relationship?: boolean }) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.sceneCanvas}>
      <View style={__a3_styles.treeTrunk} />
      <View style={[__a3_styles.treeBranch, __a3_styles.treeBranchLeft]} />
      <View style={[__a3_styles.treeBranch, __a3_styles.treeBranchRight]} />
      <View style={[__a3_styles.treeBranch, __a3_styles.treeBranchLower]} />
      <View style={[__a3_styles.treeLeaf, __a3_styles.treeLeafOne]} />
      <View style={[__a3_styles.treeLeaf, __a3_styles.treeLeafTwo]} />
      <View style={[__a3_styles.treeLeaf, __a3_styles.treeLeafThree]} />
      <View style={[__a3_styles.treeNode, __a3_styles.treeNodeTop]}><Ionicons name="person" size={18} color={__a3Colors.primaryText} /></View>
      <View style={[__a3_styles.treeNode, __a3_styles.treeNodeLeft]}><Ionicons name="person" size={16} color={__a3Colors.primary} /></View>
      <View style={[__a3_styles.treeNode, __a3_styles.treeNodeRight]}><Ionicons name="person" size={16} color={__a3Colors.primaryText} /></View>
      <View style={[__a3_styles.treeNode, __a3_styles.treeNodeBottom]}><Ionicons name="person" size={15} color={__a3Colors.positive} /></View>
      <View style={__a3_styles.treeHouse}><Ionicons name={relationship ? "git-branch-outline" : "home"} size={19} color={__a3Colors.primaryText} /></View>
    </View>
  );
}

function FamilyIllustration() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.sceneCanvas}>
      <View style={__a3_styles.familyHome}><Ionicons name="home" size={35} color={__a3Colors.primaryText} /><View style={__a3_styles.familyHomeHeart}><Ionicons name="heart" size={10} color={__a3Colors.primary} /></View></View>
      <View style={[__a3_styles.familyPersonBadge, { left: 5, top: 18 }]}><Ionicons name="person" size={17} color={__a3Colors.primary} /></View>
      <View style={[__a3_styles.familyPersonBadge, { right: 3, top: 8 }]}><Ionicons name="people" size={18} color={__a3Colors.primaryText} /></View>
      <View style={[__a3_styles.familyPersonBadge, { right: 18, bottom: 1 }]}><Ionicons name="heart-outline" size={17} color={__a3Colors.primary} /></View>
    </View>
  );
}

function ProfileIllustration() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.sceneCanvas}>
      <View style={__a3_styles.profileHalo} />
      <View style={__a3_styles.profilePortrait}><Ionicons name="person" size={42} color={__a3Colors.primaryText} /></View>
      <View style={[__a3_styles.sparkleBadge, { right: 5, top: 8 }]}><Ionicons name="flower-outline" size={16} color={__a3Colors.primary} /></View>
      <View style={[__a3_styles.sparkleBadge, { left: 4, bottom: 9 }]}><Ionicons name="heart-outline" size={16} color={__a3Colors.primaryText} /></View>
    </View>
  );
}


function AuthIllustration() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.authScene}>
      <View style={__a3_styles.authHalo} />
      <Image
        source={require("../../../assets/images/login-family-icon.png")}
        style={__a3_styles.authImage}
        contentFit="contain"
        transition={0}
        cachePolicy="memory-disk"
      />
      <View style={[__a3_styles.sparkleBadge, { right: 2, top: 8 }]}><Ionicons name="heart" size={16} color={__a3Colors.primary} /></View>
      <View style={[__a3_styles.sparkleBadge, { left: 6, bottom: 5 }]}><Ionicons name="sparkles" size={15} color={__a3Colors.primaryText} /></View>
    </View>
  );
}

function LivingIllustration() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.sceneCanvas}>
      <View style={__a3_styles.livingHome}>
        <Ionicons name="home" size={34} color={__a3Colors.primaryText} />
        <View style={__a3_styles.livingHeart}><Ionicons name="heart" size={12} color={__a3Colors.primary} /></View>
      </View>
      <View style={[__a3_styles.livingBubble, __a3_styles.livingMusic]}><Ionicons name="musical-notes" size={20} color={__a3Colors.primaryText} /></View>
      <View style={[__a3_styles.livingBubble, __a3_styles.livingGame]}><Ionicons name="game-controller" size={20} color={__a3Colors.primary} /></View>
      <View style={[__a3_styles.livingBubble, __a3_styles.livingFood]}><Ionicons name="restaurant" size={18} color={__a3Colors.positive} /></View>
      <View style={[__a3_styles.livingBubble, __a3_styles.livingChat]}><Ionicons name="chatbubble-ellipses" size={18} color={__a3Colors.primaryText} /></View>
    </View>
  );
}

function WhisperIllustration() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.sceneCanvas}>
      <View style={__a3_styles.whisperMoon}><Ionicons name="moon" size={26} color={__a3Colors.primary} /></View>
      <View style={__a3_styles.whisperEnvelope}><Ionicons name="heart" size={21} color={__a3Colors.primary} /></View>
      <View style={[__a3_styles.whisperBubble, { right: 5, top: 24 }]}><Ionicons name="chatbubble-ellipses" size={23} color={__a3Colors.primaryText} /></View>
      <View style={[__a3_styles.sparkleBadge, { left: 11, bottom: 12 }]}><Ionicons name="sparkles" size={15} color={__a3Colors.primary} /></View>
    </View>
  );
}

function PollIllustration() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.sceneCanvas}>
      <View style={__a3_styles.pollBoard}>
        <View style={[__a3_styles.pollBar, { width: 84 }]} />
        <View style={[__a3_styles.pollBar, { width: 58, opacity: 0.72 }]} />
        <View style={[__a3_styles.pollBar, { width: 70, opacity: 0.55 }]} />
        <View style={__a3_styles.pollCheck}><Ionicons name="checkmark" size={18} color={__a3Colors.white} /></View>
      </View>
      <View style={[__a3_styles.familyPersonBadge, { left: 5, bottom: 8 }]}><Ionicons name="person" size={16} color={__a3Colors.primaryText} /></View>
      <View style={[__a3_styles.familyPersonBadge, { right: 5, top: 8 }]}><Ionicons name="people" size={18} color={__a3Colors.primary} /></View>
    </View>
  );
}

function KitchenIllustration() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.sceneCanvas}>
      <View style={__a3_styles.kitchenPlate}><Ionicons name="restaurant" size={38} color={__a3Colors.primaryText} /></View>
      <View style={[__a3_styles.eventLeaf, { right: 8, top: 22, backgroundColor: "rgba(102,145,101,0.42)", transform: [{ rotate: "20deg" }] }]} />
      <View style={[__a3_styles.eventLeaf, { right: 21, top: 43, backgroundColor: "rgba(102,145,101,0.32)", transform: [{ rotate: "-18deg" }] }]} />
      <View style={[__a3_styles.sparkleBadge, { left: 6, top: 18 }]}><Ionicons name="flame-outline" size={17} color={__a3Colors.primary} /></View>
      <View style={[__a3_styles.sparkleBadge, { right: 6, bottom: 8 }]}><Ionicons name="heart-outline" size={16} color={__a3Colors.primary} /></View>
    </View>
  );
}

function NoticeIllustration() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.sceneCanvas}>
      <View style={__a3_styles.noticeBoard}>
        <View style={__a3_styles.noticePin}><Ionicons name="pin" size={18} color={__a3Colors.primary} /></View>
        <View style={__a3_styles.noticeLine} /><View style={[__a3_styles.noticeLine, { width: 78 }]} /><View style={[__a3_styles.noticeLine, { width: 62 }]} />
      </View>
      <View style={[__a3_styles.sparkleBadge, { right: 2, top: 11 }]}><Ionicons name="notifications" size={17} color={__a3Colors.primaryText} /></View>
      <View style={[__a3_styles.sparkleBadge, { left: 9, bottom: 5 }]}><Ionicons name="calendar-outline" size={16} color={__a3Colors.primary} /></View>
    </View>
  );
}

function GameIllustration() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.sceneCanvas}>
      <View style={__a3_styles.gameController}><Ionicons name="game-controller" size={48} color={__a3Colors.primaryText} /></View>
      <View style={[__a3_styles.sparkleBadge, { right: 2, top: 9 }]}><Ionicons name="trophy" size={17} color={__a3Colors.primary} /></View>
      <View style={[__a3_styles.sparkleBadge, { left: 5, bottom: 8 }]}><Ionicons name="sparkles" size={17} color={__a3Colors.primary} /></View>
      <View style={__a3_styles.gameDotOne} /><View style={__a3_styles.gameDotTwo} />
    </View>
  );
}

function MusicIllustration() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.sceneCanvas}>
      <View style={__a3_styles.musicDisc}><View style={__a3_styles.musicDiscInner} /><View style={__a3_styles.musicDiscHole} /></View>
      <View style={__a3_styles.musicHeadset}><Ionicons name="headset" size={42} color={__a3Colors.primaryText} /></View>
      <View style={[__a3_styles.sparkleBadge, { right: 3, top: 8 }]}><Ionicons name="musical-notes" size={17} color={__a3Colors.primary} /></View>
      <View style={[__a3_styles.sparkleBadge, { left: 2, bottom: 4 }]}><Ionicons name="heart" size={15} color={__a3Colors.primary} /></View>
    </View>
  );
}

function FundIllustration() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.sceneCanvas}>
      <View style={__a3_styles.fundWallet}><Ionicons name="wallet" size={38} color={__a3Colors.primaryText} /><View style={__a3_styles.fundCoin}><Text style={__a3_styles.fundCoinText}>₫</Text></View></View>
      <View style={[__a3_styles.sparkleBadge, { right: 3, top: 10 }]}><Ionicons name="pie-chart" size={17} color={__a3Colors.positive} /></View>
      <View style={[__a3_styles.sparkleBadge, { left: 5, bottom: 8 }]}><Ionicons name="shield-checkmark" size={17} color={__a3Colors.primaryText} /></View>
    </View>
  );
}

function SymbolIllustration({ config }: { config: HeroConfig }) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.sceneCanvas}>
      <View style={__a3_styles.symbolCard}><Ionicons name={config.icon} size={42} color={__a3Colors.primaryText} /></View>
      <View style={[__a3_styles.sparkleBadge, { right: 3, top: 9 }]}><Ionicons name={config.accentIcon} size={16} color={__a3Colors.primary} /></View>
      <View style={[__a3_styles.sparkleBadge, { left: 1, bottom: 5 }]}><Ionicons name={config.tertiaryIcon} size={15} color={__a3Colors.primaryText} /></View>
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
function headerTint(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return `rgba(255,255,255,${alpha})`;
  const raw = match[1];
  return `rgba(${parseInt(raw.slice(0,2),16)},${parseInt(raw.slice(2,4),16)},${parseInt(raw.slice(4,6),16)},${alpha})`;
}

export function BloomHeroHeader({
  eyebrow,
  title,
  subtitle,
  variant = "generic",
  onBack,
  backDisabled = false,
  right,
  topLeft,
  footer,
  compact = false,
  roundedBottom = false,
  artwork,
  testID,
}: BloomHeroHeaderProps) {
  const __a3_styles = useA3LegacyStyles(styles);

  const theme = useA3Theme();
  const typography = useA3Typography();
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  // A consistent 35% of the *available Android window* on tabs and children.
  // Never multiply by physical pixels (PixelRatio); RN dimensions are dp.
  const visibleHeroHeight = Math.round(viewportHeight * 0.35);
  // Keep the illustrated 35% header, but cap its copy independently of the user's
  // larger accessibility text size. The body of the app still follows that setting.
  const readingScale = Math.min(1, 100 / Math.max(85, typography.scale));
  const titleSize = (title.length > 46 ? 22 : title.length > 29 ? 24 : 28) * readingScale;
  const subtitleSize = (subtitle && subtitle.length > 105 ? 11.5 : 12.5) * readingScale;

  const config: HeroConfig = {
    ...HERO_ICONS[variant === 'learning' ? 'generic' : variant],
    surface: theme.colors.heroSurface,
    surfaceDeep: theme.colors.selectedBackground,
    glow: theme.colors.selectedBackground,
  };
  const palette = theme.selection.palette;
  const isDark = theme.resolvedMode === 'dark';
  const heroReading = getBloomHeroReadingTokens(theme.colors);

  // Registry is shared by Home, child headers, and the appearance picker.
  // A compact child inherits its parent's scene but uses less vertical space.
  const scene: BloomHeroScene | null =
    variant === 'living' || variant === 'auth' ? 'home'
    : variant === 'family' || variant === 'tree' || variant === 'relationship' || variant === 'profile' ? 'family'
    : variant === 'moment' || variant === 'whisper' || variant === 'music' ? 'moments'
    : variant === 'event' || variant === 'kitchen' || variant === 'poll' ? 'events'
    : variant === 'learning' || variant === 'game' ? 'learning'
    : variant === 'settings' || variant === 'moderation' || variant === 'notice' ? 'settings'
    : variant === 'generic' && /HỌC|CÂU HỎI|LỜI GIẢI|BLOOM EDUCATION|CÔNG THỨC|TRI THỨC/i.test(`${eyebrow} ${title}`) ? 'learning'
    : variant === 'fund' ? 'family'
    : 'home';
  const realArtwork = artwork ?? (scene ? getBloomHeroArt(scene, palette) : undefined);
  const hasArtwork = Boolean(realArtwork);

  return (
    <View
      testID={testID}
      style={[
        __a3_styles.root,
        compact && __a3_styles.rootCompact,
        roundedBottom && __a3_styles.rootRoundedBottom,
        { backgroundColor: hasArtwork ? theme.colors.background : theme.colors.heroSurface,
          height: visibleHeroHeight, minHeight: visibleHeroHeight },
      ]}
    >
      {/* Bloom Supper full-bleed contract: decorative art owns the complete
          status-bar + left/right surface. Copy/buttons live in a padded inner
          layer so the artwork can breathe all the way to the physical edges. */}
      {hasArtwork ? (
        <View pointerEvents="none" style={[__a3_styles.storyImageLayer, { height: visibleHeroHeight }]}>
          <Image source={realArtwork} recyclingKey={`${scene ?? 'custom'}-${palette}`} contentFit="cover" contentPosition="top" cachePolicy="memory-disk" priority="high" transition={0} style={[__a3_styles.storyImage, isDark && __a3_styles.storyImageDark]} accessibilityIgnoresInvertColors />
          {/* No upscaled 192 px preview: renders a local high-resolution WebP immediately. */}
          <Image source={getBloomHeroTextShade(palette, isDark ? 'dark' : 'light')} recyclingKey={`reading-veil-${palette}-${isDark ? 'dark' : 'light'}`} contentFit="fill" cachePolicy="memory-disk" transition={0} style={__a3_styles.storyCopyShade} accessibilityIgnoresInvertColors />
          {/* Match the page surface with a pre-rendered irregular, transparent fog. Decorative only. */}
          <Image source={getBloomFogArt(palette, isDark ? "dark" : "light")} contentFit="fill" transition={0} cachePolicy="memory-disk" style={__a3_styles.storyAtmosphericFog} accessibilityIgnoresInvertColors />
        </View>
      ) : (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[__a3_styles.glowLarge, { backgroundColor: config.glow }]} />
        <View style={[__a3_styles.glowDeep, { backgroundColor: config.surfaceDeep }]} />
        <View style={__a3_styles.cloudOne} />
        <View style={__a3_styles.cloudTwo} />
        <View style={__a3_styles.petalOne} />
        <View style={__a3_styles.petalTwo} />
        <View style={__a3_styles.petalThree} />
        <View style={__a3_styles.artRibbonOne} />
        <View style={__a3_styles.artRibbonTwo} />
        <View style={[__a3_styles.illustrationWrap, compact && __a3_styles.illustrationWrapCompact]}>
          <HeroIllustration variant={variant} config={config} />
        </View>
      </View>
      )}

      <View
        style={[
          __a3_styles.inner,
          compact && __a3_styles.innerCompact,
          hasArtwork && (compact ? __a3_styles.innerWithArtworkCompact : __a3_styles.innerWithArtwork),
          { paddingTop: Math.max(insets.top, 8) + 8, height: visibleHeroHeight,
            minHeight: visibleHeroHeight, paddingBottom: 12 },
        ]}
      >
        <View style={__a3_styles.topRow}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              disabled={backDisabled}
              hitSlop={8}
              onPress={onBack}
              style={({ pressed }) => [__a3_styles.navButton, backDisabled && __a3_styles.disabled, pressed && !backDisabled && __a3_styles.pressed]}
            >
              <Ionicons name="arrow-back" size={27} color={theme.colors.primary} />
            </Pressable>
          ) : topLeft ? <View style={__a3_styles.topLeft}>{topLeft}</View> : <View style={__a3_styles.navPlaceholder} />}

          <View style={__a3_styles.topSpacer} />
          {right ? <View style={__a3_styles.right}>{right}</View> : <View style={__a3_styles.navPlaceholder} />}
        </View>

        <View style={[__a3_styles.copy, compact && __a3_styles.copyCompact, hasArtwork && (compact ? __a3_styles.copyWithArtworkCompact : __a3_styles.copyWithArtwork), hasArtwork && __a3_styles.copyDirectOnArt]}>
          {!!eyebrow && <Text allowFontScaling={false} style={[__a3_styles.eyebrow, { color: heroReading.eyebrow, fontSize: 10.5 * readingScale }]}>{eyebrow}</Text>}
          <Text allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.84} style={[__a3_styles.title, { color: heroReading.title, fontSize: titleSize, lineHeight: titleSize * 1.18 }]} numberOfLines={3}>{title}</Text>
          {!!subtitle && <Text allowFontScaling={false} adjustsFontSizeToFit minimumFontScale={0.82} style={[__a3_styles.subtitle, { color: heroReading.subtitle, fontSize: subtitleSize, lineHeight: subtitleSize * 1.4 }]} numberOfLines={3}>{subtitle}</Text>}
        </View>
        {!!footer && <View style={[__a3_styles.footer, compact && __a3_styles.footerCompact]}>{footer}</View>}
      </View>
    </View>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  root: {
    width: "100%",
    alignSelf: "stretch",
    minHeight: 300,
    overflow: "hidden",
  },
  rootCompact: { minHeight: 238 },
  storyImageLayer: { position: "absolute", left: 0, right: 0, top: 0, height: 365, overflow: "hidden" },
  storyImageLayerCompact: { height: 265 },
  storyImage: { width: "100%", height: "100%" },
  storyCopyShade: { position: "absolute", left: 0, top: 0, bottom: 0, width: "100%" },
  storyImageDark: { opacity: 0.97 },
  storyAtmosphericFog: { position: "absolute", left: -2, right: -2, bottom: -2, height: "30%" },
  innerWithArtwork: { paddingBottom: 12 },
  innerWithArtworkCompact: { paddingBottom: 12 },
  copyWithArtwork: { marginTop: 0, maxWidth: "100%", padding: 0 },
  copyWithArtworkCompact: { marginTop: 0, maxWidth: "100%", padding: 0 },
  copyDirectOnArt: { backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0, flex: 1, minHeight: 0,
    justifyContent: 'center', paddingBottom: 4 },
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
  petalOne: { position: "absolute", width: 19, height: 10, borderRadius: 999, backgroundColor: COLORS.selectedBackground, top: 74, left: 160, transform: [{ rotate: "-25deg" }] },
  petalTwo: { position: "absolute", width: 13, height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.8)", top: 118, left: 35, transform: [{ rotate: "34deg" }] },
  petalThree: { position: "absolute", width: 15, height: 8, borderRadius: 999, backgroundColor: COLORS.iconBackground, right: 142, bottom: 64, transform: [{ rotate: "20deg" }] },
  topRow: { minHeight: 56, flexDirection: "row", alignItems: "center", zIndex: 4 },
  navButton: { width: 56, height: 56, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 3 },
  navPlaceholder: { width: 56, height: 56 },
  topSpacer: { flex: 1, minWidth: 6 },
  topLeft: { flexShrink: 1, minWidth: 0 },
  right: { minWidth: 56, minHeight: 56, alignItems: "flex-end", justifyContent: "center" },
  copy: { marginTop: 24, maxWidth: "64%", zIndex: 3 },
  copyCompact: { marginTop: 15, maxWidth: "66%" },
  footer: { marginTop: 18, maxWidth: "72%", zIndex: 4 },
  footerCompact: { marginTop: 12, maxWidth: "70%" },
  eyebrow: { color: COLORS.primary, fontSize: 12, fontWeight: "900", letterSpacing: 1.2, textShadowColor: COLORS.background, textShadowRadius: 0 },
  title: { marginTop: 5, color: COLORS.primaryText, fontSize: 29, lineHeight: 35, fontWeight: "900", letterSpacing: -0.7, textShadowColor: COLORS.background, textShadowRadius: 0, textShadowOffset: {width: 0, height: 0} },
  titleCompact: { fontSize: 26, lineHeight: 32 },
  subtitle: { marginTop: 4, color: COLORS.primaryText, fontSize: 14, lineHeight: 20, fontWeight: "700", textShadowColor: "transparent", textShadowRadius: 0 },
  subtitleCompact: { fontSize: 13, lineHeight: 19 },
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
    backgroundColor: COLORS.selectedBackground,
    transform: [{ rotate: "9deg" }],
  },
  sceneCanvas: { width: 194, height: 180 },
  authScene: { width: 178, height: 168, alignItems: "center", justifyContent: "center" },
  authHalo: { position: "absolute", width: 154, height: 154, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.27)" },
  authImage: { width: 150, height: 150 },

  calendarCard: { position: "absolute", right: 12, top: 18, width: 94, height: 96, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.96)", transform: [{ rotate: "6deg" }], paddingTop: 22, paddingHorizontal: 11 },
  calendarRings: { position: "absolute", top: -6, left: 20, right: 20, flexDirection: "row", justifyContent: "space-between" },
  calendarRing: { width: 8, height: 18, borderRadius: 8, borderWidth: 3, borderColor: COLORS.border, backgroundColor: "transparent" },
  calendarTopLine: { position: "absolute", left: 9, right: 9, top: 18, height: 2, borderRadius: 2, backgroundColor: COLORS.border },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  calendarCell: { width: 18, height: 16, borderRadius: 5, backgroundColor: COLORS.iconBackground, alignItems: "center", justifyContent: "center" },
  calendarCellHeart: { backgroundColor: COLORS.selectedBackground },
  eventFlowerStem: { position: "absolute", left: 24, top: 24, width: 4, height: 93, borderRadius: 4, backgroundColor: "rgba(105,137,95,0.42)", transform: [{ rotate: "-10deg" }] },
  eventLeaf: { position: "absolute", width: 29, height: 13, borderRadius: 999, backgroundColor: "rgba(122,145,99,0.4)" },
  eventLeafOne: { left: 7, top: 63, transform: [{ rotate: "-26deg" }] },
  eventLeafTwo: { left: 27, top: 82, transform: [{ rotate: "24deg" }] },
  eventTulip: { position: "absolute", width: 26, height: 30, borderRadius: 16, backgroundColor: COLORS.primary },
  eventTulipOne: { left: 11, top: 7, transform: [{ rotate: "-15deg" }] },
  eventTulipTwo: { left: 37, top: 28, width: 20, height: 25, opacity: 0.75 },
  eventEnvelope: { position: "absolute", right: 0, bottom: 4, width: 46, height: 31, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.84)", alignItems: "center", justifyContent: "center", transform: [{ rotate: "9deg" }] },

  photoCard: { position: "absolute", width: 86, height: 92, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.82)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center" },
  photoCardBack: { left: 14, top: 29, transform: [{ rotate: "-10deg" }], opacity: 0.7 },
  photoCardFront: { right: 10, top: 15, transform: [{ rotate: "8deg" }] },
  photoHeart: { position: "absolute", right: 10, bottom: 9, width: 32, height: 32, borderRadius: 13, backgroundColor: COLORS.surfaceSoft, alignItems: "center", justifyContent: "center" },
  sparkleBadge: { position: "absolute", width: 36, height: 36, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.84)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" },

  treeTrunk: { position: "absolute", width: 7, height: 84, borderRadius: 999, backgroundColor: "rgba(128,68,91,0.38)", right: 42, top: 21, transform: [{ rotate: "8deg" }] },
  treeBranch: { position: "absolute", height: 4, borderRadius: 999, backgroundColor: "rgba(128,68,91,0.35)" },
  treeBranchLeft: { width: 77, right: 38, top: 49, transform: [{ rotate: "-18deg" }] },
  treeBranchRight: { width: 66, right: 6, top: 53, transform: [{ rotate: "17deg" }] },
  treeBranchLower: { width: 74, right: 31, top: 90, transform: [{ rotate: "3deg" }] },
  treeLeaf: { position: "absolute", width: 27, height: 15, borderRadius: 999, backgroundColor: COLORS.selectedBackground },
  treeLeafOne: { right: 73, top: 11, transform: [{ rotate: "-24deg" }] },
  treeLeafTwo: { right: 3, top: 28, transform: [{ rotate: "25deg" }] },
  treeLeafThree: { right: 73, top: 80, transform: [{ rotate: "18deg" }] },
  treeNode: { position: "absolute", width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 2, borderColor: "rgba(255,255,255,0.45)" },
  treeNodeTop: { right: 36, top: 0 },
  treeNodeLeft: { left: 9, top: 36 },
  treeNodeRight: { right: 0, top: 52 },
  treeNodeBottom: { right: 58, bottom: 0, borderColor: "rgba(111,164,125,0.35)" },
  treeHouse: { position: "absolute", right: 2, bottom: 0, width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.78)" },

  familyHome: { position: "absolute", left: 33, top: 31, width: 82, height: 78, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.72)", borderWidth: 1, borderColor: "rgba(255,255,255,0.94)" },
  familyHomeHeart: { position: "absolute", bottom: 10, right: 16, width: 23, height: 23, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.75)", alignItems: "center", justifyContent: "center" },
  familyPersonBadge: { position: "absolute", width: 39, height: 39, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.88)", alignItems: "center", justifyContent: "center" },

  profileHalo: { position: "absolute", left: 27, top: 19, width: 94, height: 94, borderRadius: 47, backgroundColor: "rgba(255,255,255,0.34)" },
  profilePortrait: { position: "absolute", left: 39, top: 31, width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(255,255,255,0.88)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.38)" },
  symbolCard: { position: "absolute", left: 28, top: 25, width: 92, height: 88, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.76)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)", transform: [{ rotate: "5deg" }] },
  livingHome: { position: "absolute", left: 48, top: 45, width: 88, height: 82, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.78)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.96)" },
  livingHeart: { position: "absolute", right: 14, bottom: 12, width: 27, height: 27, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.78)" },
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
  pollCheck: { position: "absolute", right: 12, bottom: 12, width: 31, height: 31, borderRadius: 14, backgroundColor: COLORS.selectedBackground, alignItems: "center", justifyContent: "center" },
  kitchenPlate: { position: "absolute", left: 38, top: 38, width: 98, height: 98, borderRadius: 49, backgroundColor: "rgba(255,255,255,0.75)", borderWidth: 8, borderColor: "rgba(255,255,255,0.42)", alignItems: "center", justifyContent: "center" },
  noticeBoard: { position: "absolute", left: 33, top: 30, width: 108, height: 99, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.82)", paddingTop: 38, paddingHorizontal: 16, gap: 9, transform: [{ rotate: "-4deg" }] },
  noticePin: { position: "absolute", left: 43, top: 8, width: 34, height: 34, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.76)", alignItems: "center", justifyContent: "center" },
  noticeLine: { height: 7, width: 88, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.40)" },
  gameController: { position: "absolute", left: 35, top: 42, width: 113, height: 83, borderRadius: 31, backgroundColor: "rgba(255,255,255,0.8)", alignItems: "center", justifyContent: "center", transform: [{ rotate: "-4deg" }] },
  gameDotOne: { position: "absolute", right: 31, bottom: 22, width: 15, height: 15, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.50)" },
  gameDotTwo: { position: "absolute", left: 20, top: 24, width: 11, height: 11, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.32)" },
  musicDisc: { position: "absolute", left: 27, top: 30, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(102,86,160,0.34)", alignItems: "center", justifyContent: "center" },
  musicDiscInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.64)" },
  musicDiscHole: { position: "absolute", width: 13, height: 13, borderRadius: 7, backgroundColor: "rgba(102,86,160,0.58)" },
  musicHeadset: { position: "absolute", right: 5, top: 58, width: 72, height: 72, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.84)", alignItems: "center", justifyContent: "center" },
  fundWallet: { position: "absolute", left: 30, top: 42, width: 116, height: 82, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.82)", alignItems: "center", justifyContent: "center", transform: [{ rotate: "3deg" }] },
  fundCoin: { position: "absolute", right: -7, top: -12, width: 39, height: 39, borderRadius: 20, backgroundColor: COLORS.selectedBackground, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.92)" },
  fundCoinText: { color: COLORS.primary, fontSize: 16, fontWeight: "900" },

  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.97 }] },
}));
