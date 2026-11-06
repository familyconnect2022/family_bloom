/** Per-subscription, per-UID proof tracker. No persisted data, no cache trust.
 * Both Firestore getDocsFromServer and onSnapshot(metadata.fromCache=false,
 * metadata.hasPendingWrites=false) are server evidence. The live watch takes
 * precedence over any earlier-started read that completes later.
 */
export type MembershipServerProof = { watchConfirmed: boolean; permissionDenied: boolean };
export function acceptMembershipServerProof(
  proof: MembershipServerProof,
  source: 'watch' | 'read',
  trustedServerResponse: boolean,
): boolean {
  if (proof.permissionDenied || !trustedServerResponse) return false;
  if (source === 'watch') {
    proof.watchConfirmed = true;
    return true;
  }
  return !proof.watchConfirmed;
}
export function deferMembershipError(
  proof: MembershipServerProof,
  fromListener: boolean,
  readPending: boolean,
  previouslyVerified: boolean,
  permissionFailure: boolean,
): boolean {
  if (permissionFailure || proof.permissionDenied) return false;
  // A listener can fail while an independent server read is in flight.
  if (fromListener) return readPending && !previouslyVerified;
  // A redundant read cannot invalidate a trusted, already-current watch.
  return proof.watchConfirmed;
}
