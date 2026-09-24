/** Trạng thái yêu cầu gia nhập một gia đình. */
export type FamilyJoinRequestStatus = "pending" | "approved" | "rejected";

/** Dữ liệu mô tả người đang xin gia nhập để admin dễ nhận diện. */
export interface FamilyJoinApplicant {
  uid: string;
  displayName: string;
  shortName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  birthDate?: string;
  bio?: string;
  interests?: string[];
}

/** Document families/{familyId}/joinRequests/{uid}. */
export interface FamilyJoinRequest {
  uid: string;
  familyId: string;
  familyName: string;
  status: FamilyJoinRequestStatus;
  applicant: FamilyJoinApplicant;
  message?: string;
  requestedAt: string;
  reviewedAt?: string;
  reviewedByUid?: string;
  rejectionReason?: string;
}
