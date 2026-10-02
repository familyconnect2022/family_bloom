export type HomeWhisperAudience = "family" | "direct";
export type HomeWhisperEmotion =
  | "heart"
  | "love"
  | "smile"
  | "touched"
  | "sad"
  | "hug"
  | "thanks"
  | "laugh"
  | "flower"
  | "sparkles";

export type HomeWhisper = {
  id: string;
  familyId: string;
  authorUid: string;
  authorName: string;
  audience: HomeWhisperAudience;
  recipientUid: string | null;
  recipientName: string | null;
  viewerUids: string[];
  message: string;
  emotion: HomeWhisperEmotion;
  heartUids: string[];
  createdAt: string;
  updatedAt: string;
  /** Firestore Timestamp at runtime; kept unknown here to avoid leaking Firebase types into UI. */
  expireAt?: unknown;
};

export type SavedHomeWhisper = {
  id: string;
  sourceWhisperId: string;
  familyId: string;
  savedByUid: string;
  authorUid: string;
  authorName: string;
  audience: HomeWhisperAudience;
  recipientUid: string | null;
  recipientName: string | null;
  message: string;
  emotion: HomeWhisperEmotion;
  originalCreatedAt: string;
  savedAt: string;
};

export type HomeWhisperFeedMode = "all" | "toMe" | "sent" | "family";

export type HomePollAudience = "family" | "group";
export type HomePollChoice = "agree" | "disagree";

export type HomePoll = {
  id: string;
  familyId: string;
  createdByUid: string;
  createdByName: string;
  question: string;
  description: string;
  audience: HomePollAudience;
  eligibleUids: string[];
  eligibleCount: number;
  anonymous: boolean;
  agreeCount: number;
  disagreeCount: number;
  votedCount: number;
  createdAt: string;
  updatedAt: string;
  /** Firestore Timestamp at runtime. */
  expiresAt?: unknown;
  /** Firestore Timestamp at runtime, 30 days after expiresAt. */
  deleteAt?: unknown;
};

export type HomePollBallot = {
  uid: string;
  displayName: string;
  choice: HomePollChoice;
  createdAt: string;
  updatedAt: string;
  deleteAt?: unknown;
};

export type KitchenPreferenceTag =
  | "normal"
  | "vegetarian"
  | "lowerSugar"
  | "controlledCarb"
  | "lowerSodium";

export type HomeKitchenPreference = {
  familyId: string;
  uid: string;
  tags: KitchenPreferenceTag[];
  updatedAt: string;
};

export type BloomRecipeIngredient = {
  name: string;
  amount: string;
};

export type BloomRecipe = {
  id: string;
  nameVi: string;
  summary: string;
  category: string;
  mealTypes: Array<"sang" | "trua" | "toi" | "an_nhe">;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: "Dễ" | "Vừa" | "Khá";
  ingredients: BloomRecipeIngredient[];
  steps: string[];
  preferenceTags: Array<"vegetarian" | "lowerSugarCandidate" | "controlledCarbCandidate" | "lowerSodiumCandidate" | "family" | "light" | "quick">;
  /** Nutrition is intentionally not medical advice; numeric verification is deferred. */
  nutritionNote: string;
};


export type HomeMusicProviderId = "audius";

export type HomeMusicTrack = {
  id: string;
  provider: HomeMusicProviderId;
  providerTrackId: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  durationSec: number;
  genre: string | null;
  mood: string | null;
  releaseDate: string | null;
  /** Only set when Bloom has explicitly curated/verified the playlist language. */
  language?: "vi" | null;
  /** Discovery provenance only; this never means audio is streamed from the signal source. */
  curation?: {
    catalogVersion: string;
    seedId: string;
    sourceKinds: string[];
  } | null;
};

export type HomeMusicCycle = {
  id: string;
  familyId: string;
  provider: HomeMusicProviderId;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  tracks: HomeMusicTrack[];
  mix: { calm: number; happy: number; chill: number; trending: number; recent: number };
};

export type HomeMusicFavorite = HomeMusicTrack & {
  uid: string;
  createdAt: string;
};

export type HomeMusicFamilySong = HomeMusicTrack & {
  familyId: string;
  sharedByUid: string;
  sharedByName: string;
  sharedAt: string;
};

export type HomeTimeCapsuleAudience = "family" | "selected";
export type HomeTimeCapsulePreviewMode = "hidden" | "locked";
export type HomeTimeCapsuleRevealTheme = "warm" | "formal" | "festive";

export type HomeTimeCapsule = {
  id: string;
  familyId: string;
  createdByUid: string;
  createdByName: string;
  audience: HomeTimeCapsuleAudience;
  recipientUids: string[];
  previewMode: HomeTimeCapsulePreviewMode;
  revealTheme: HomeTimeCapsuleRevealTheme;
  createdAt: string;
  updatedAt: string;
  /** Recipient UIDs that have completed the first-open ceremony. */
  openedByUids?: string[];
  /** Firestore Timestamp at runtime. */
  openAt?: unknown;
};

export type HomeTimeCapsuleContent = {
  title: string;
  message: string;
};

export type HomeTimeCapsuleOpen = {
  uid: string;
  /** Firestore Timestamp at runtime. */
  openedAt?: unknown;
};


export type HomeFundTransactionType = "income" | "expense";
export type HomeFundCategory =
  | "contribution"
  | "groceries"
  | "household"
  | "event"
  | "travel"
  | "gift"
  | "refund"
  | "other";

export type HomeFundTransaction = {
  id: string;
  familyId: string;
  type: HomeFundTransactionType;
  amountVnd: number;
  category: HomeFundCategory;
  note: string;
  occurredOn: string;
  monthKey: string;
  createdByUid: string;
  createdByName: string;
  createdAt: string;
  /** Server timestamp converted to millis; null for legacy rows, which are locked. */
  createdAtMillis: number | null;
  updatedAt: string;
  updatedByUid: string;
  revision: number;
};

export type HomeFundSummary = {
  familyId: string;
  balanceVnd: number;
  totalIncomeVnd: number;
  totalExpenseVnd: number;
  transactionCount: number;
  lastMutationId: string | null;
  lastMutationKind: "create" | "update" | "delete" | null;
  lastAuditId: string | null;
  updatedByUid: string | null;
  updatedAt: string | null;
};

export type HomeFundMonthTotals = {
  monthKey: string;
  incomeVnd: number;
  expenseVnd: number;
  transactionCount: number;
  capped: boolean;
};

/** Canonical fund authority. Family Admin is only the default bootstrap treasurer. */
export type HomeFundControl = {
  familyId: string;
  primaryUid: string;
  assistantUids: string[];
  assistantTasks: Record<string, string>;
  pendingTransferToUid: string | null;
  pendingTransferRequestedByUid: string | null;
  pendingTransferRequestedAt: string | null;
  pendingTransferNote: string | null;
  version: number;
  lastAuditId: string | null;
  updatedByUid: string;
  updatedAt: string;
};

export type HomeFundAuditAction =
  | "create"
  | "update"
  | "delete"
  | "control_init"
  | "handover_request"
  | "handover_accept"
  | "handover_decline"
  | "handover_cancel"
  | "team_update";

/** Immutable family-visible footprint. before/after labels intentionally stay concise. */
export type HomeFundAuditEvent = {
  id: string;
  familyId: string;
  action: HomeFundAuditAction;
  transactionId: string | null;
  actorUid: string;
  actorName: string;
  targetUid: string | null;
  detail: string;
  beforeLabel: string | null;
  afterLabel: string | null;
  createdAt: string;
};

export type HomeFundStatsPeriod = "day" | "month" | "year";

export type HomeFundStatsBucket = {
  key: string;
  label: string;
  incomeVnd: number;
  expenseVnd: number;
  transactionCount: number;
};

export type HomeFundStats = {
  period: HomeFundStatsPeriod;
  buckets: HomeFundStatsBucket[];
  incomeVnd: number;
  expenseVnd: number;
  transactionCount: number;
  capped: boolean;
  simulated: boolean;
};

export type HomeGameType =
  | "know_each_other"
  | "guess_person"
  | "memory_owner"
  | "truth_lie"
  | "story_chain"
  | "family_bingo";

export type HomeGameStatus = "playing" | "revealed" | "completed";

export type HomeGamePrompt = {
  id: string;
  prompt: string;
  category: string;
  options: string[];
};

export type HomeGameMemoryPreview = {
  caption: string;
  mediaUrl: string;
  mediaType: "image" | "video" | "none";
};

export type HomeGameSession = {
  id: string;
  familyId: string;
  gameType: HomeGameType;
  title: string;
  createdByUid: string;
  createdByName: string;
  participantUids: string[];
  participantNames: string[];
  status: HomeGameStatus;
  prompts: HomeGamePrompt[];
  subjectUid: string | null;
  subjectName: string | null;
  turnUids: string[];
  turnNames: string[];
  bingoCellIds: string[];
  memoryPreview: HomeGameMemoryPreview;
  submittedUids: string[];
  createdAt: string;
  updatedAt: string;
};

export type HomeGameResponse = {
  uid: string;
  displayName: string;
  answers: string[];
  textLines: string[];
  selectedIds: string[];
  guessUid: string | null;
  guessName: string | null;
  choiceIndex: number | null;
  public: boolean;
  submittedAt: string;
  updatedAt: string;
};

export type HomeGameSecret = {
  sessionId: string;
  familyId: string;
  allowedUids: string[];
  subjectUid: string | null;
  subjectName: string | null;
  memoryAuthorUid: string | null;
  memoryAuthorName: string | null;
  memoryMomentId: string | null;
  lieIndex: number | null;
  createdAt: string;
  updatedAt: string;
};
