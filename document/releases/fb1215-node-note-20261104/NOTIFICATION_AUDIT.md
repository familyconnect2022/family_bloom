# Family Bloom Android: notification/feedback inventory (2026-11-04)

## Channels
- Form validation inline (must happen before a write, beside its field).
- `BloomToast` for one user's success, warning, failure, pending state.
- Existing immutable Firestore Activity inbox for another person's attention, using member target privacy.
- Android OS local reminders only for currently supported scheduled event/time-capsule paths.
- FCM push is NOT automatically enabled by this release; Cloud Functions/FCM need real production configuration and permission review.

## Audit by workflow

| Function | Feedback / notification expected | Release status |
|---|---|---|
| Person create | Save success, separate family activity; fallback if activity unavailable | Implemented this release in editor + admin path |
| Person edit / delete | Save/delete success; optional grouped graph summary to family | Existing grouped graph activity retained |
| Relationship create | Success + one family activity; fallback if activity unavailable | Implemented this release |
| Relationship edit/delete | Save/delete and grouped graph share | Existing behavior retained |
| Person Note (`description`) | Same Person save message; note indicator reflects saved content | Implemented; no separate duplicate notification |
| Tree contribution/proposal | Invalid-input error; pending admin approval; reviewed outcome | Existing FB06 remediation; live test required |
| Polls | Validation + create/vote result; scope to eligible members | Existing FB07 remediation; no new mass notification added |
| Fund transaction | Create/edit/delete confirmation, authoritative ledger audit | Existing FB08-09 remediation retained |
| Fund handover request | Only target receives private inbox notice, clear pending status | Implemented this release |
| Fund handover accept / decline | Only outgoing steward receives private inbox notice | Implemented this release |
| Fund handover cancel | Only original invitee receives private inbox notice | Implemented this release |
| Fund assistant team changes | Update confirmation; scoped team changes | Existing toast; targeted assistant invite not added |
| Time Capsule | Required title error adjacent to title field, saved/failed result | Inline error implemented; existing waiting/opened notices retained |
| Events | Creation confirmation and importance-based notification/reminder | Existing logic retained |
| Moments | Progress, cancel, publish success/errors, optional notify family | Existing logic retained |
| Join Requests | New request / approved / rejected attention to relevant party | Existing flows; live permissions not verified |
| Chess / Xiangqi | Invitations, ready state, game-end events via existing game pipeline | Untouched, requires two-device end-to-end test |
| Learning | Submission, answer acceptance, comment updates | Existing flows; redesign FB-11 deferred |

## Notes
- Inbox notices are best-effort *after* the authoritative data mutation has completed; a failed activity write must not turn a successful Person/relationship/fund transaction into an apparent failed write.
- For families with many members, avoid sending multiple repetitive notifications on each keystroke or note edit.
- Current Rules `firestore.rules` and `firestore.cloud.rules` were not modified by this release; the legacy `scripts/firestore.rules` copy was already out of sync with `firestore.rules` in the user-provided base and is intentionally not deployed or overwritten.
- Live Android, Firestore production Rules, remote FCM and Render connections were not tested offline.
