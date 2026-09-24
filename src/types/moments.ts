export type MomentMediaType = "image" | "video";
export type MomentReaction = "like" | "love" | "haha" | "wow" | "sad" | "celebrate";
export type MomentModerationStatus = "visible" | "hidden";

export interface MomentMedia {
  id: string;
  type: MomentMediaType;
  secureUrl: string;
  publicId: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface MomentPost {
  id: string;
  familyId: string;
  authorUid: string;
  authorName: string;
  authorAvatarUrl?: string;
  caption: string;
  media: MomentMedia[];
  /** Durable media_assets references for new posts; legacy posts may omit this field. */
  mediaAssetIds?: string[];
  /** FamilyPerson references explicitly linked to this Moment. Legacy posts may omit this field. */
  personIds: string[];
  visibility: "family";
  moderationStatus: MomentModerationStatus;
  moderatedByUid: string | null;
  moderatedAt: string | null;
  reactionCounts: Record<MomentReaction, number>;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}


export type MomentPageCursor = unknown;

export interface MomentPage {
  items: MomentPost[];
  cursor: MomentPageCursor | null;
  hasMore: boolean;
}

export interface MomentComment {
  id: string;
  postId: string;
  authorUid: string;
  authorName: string;
  authorAvatarUrl?: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}


export type MomentCommentPageCursor = string | null;

export interface MomentCommentPage {
  items: MomentComment[];
  cursor: MomentCommentPageCursor;
  hasMore: boolean;
}

export interface MomentReactionRecord {
  uid: string;
  reaction: MomentReaction;
  createdAt: string;
  updatedAt: string;
}


export type MomentReactionPageCursor = unknown;

export interface MomentReactionPage {
  items: MomentReactionRecord[];
  cursor: MomentReactionPageCursor | null;
  hasMore: boolean;
}

export type CreateMomentInput = Pick<MomentPost, "caption" | "media" | "personIds">;
