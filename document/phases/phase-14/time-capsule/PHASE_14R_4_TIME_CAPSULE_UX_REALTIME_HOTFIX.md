# Phase 14R.4 — Hộp thời gian UX + realtime notification hotfix

Date: 2026-10-01
Base: `Family_Bloom_Phase_14R_3_DEV_FIREBASE_LOCK_GATE_CLEAN_ROOT_FULL_2026-10-01.zip`

## Fixed in this patch

1. **Recipient notification scheduling now reacts to Firestore changes while the app process is alive.**
   - Added one bounded recipient Time Capsule realtime query for the active family.
   - The listener is pooled through `sharedRealtimeRegistry`, so the global notification bridge and the Hộp thời gian list share one underlying Firestore listener.
   - Create/edit/delete snapshots replace only that family's Time Capsule local alarms; Event and other Bloom reminders are not cancelled.
   - Long-sleep capsules remain supported and short-future test capsules can be scheduled down to the existing feature validation window.

2. **Ready-to-open card is intentionally obvious.**
   - Recipient cards that have reached `openAt` get elevated pink treatment, gift icon, and `MỞ HỘP NGAY` CTA.
   - A short native-driver shake runs occasionally (not continuously) to attract attention.
   - Shake is disabled when Android/iOS Reduce Motion is enabled.
   - After the user taps the card in the same session, attention animation stops and the card becomes a normal replay/read-again card.

3. **Exact reveal transition while the page is open.**
   - The list uses a one-shot timer for the next known `openAt`, not a 1-second polling loop.
   - Hidden recipient capsules are known to the pooled realtime metadata listener but remain visually hidden until due; at the due time the list silently reloads and can reveal the ready card.
   - The detail page automatically reloads content at `openAt`; if the recipient is waiting on the locked page it flows directly into the first-open ceremony without Back/refresh.

4. **Custom Bloom date picker.**
   - Removed the native Android `DateTimePicker` from Hộp thời gian compose.
   - Added `BloomDatePicker`: Vietnamese Monday-first calendar, Bloom Supper styling, month navigation, today/tomorrow/+1 week shortcuts, minimum-date guard, and Bloom action buttons.
   - Existing `BloomTimePicker` remains for time selection.

5. **Back navigation in the Hộp thời gian header.**
   - The main Hộp thời gian list now passes `onBack={() => router.back()}` to `BloomHeroHeader`.

## Important delivery boundary

This remains the current **local-first notification architecture**. Once the recipient device has received Time Capsule metadata, Android can schedule the exact local alarm and it can fire with the app in background. If the recipient app process is fully killed/offline before it ever receives a newly-created capsule, a guaranteed remote wake-up still requires the server-side FCM/Cloud Functions path. Phase 14R.4 does not pretend a local Firestore listener can wake a killed process.

## Validation

- `node scripts/test-phase14r-time-capsule-functional.js` → 49 PASS / 0 FAIL
- `node scripts/test-phase14r4-time-capsule-ux-realtime.js` → 14 PASS / 0 FAIL
- `node scripts/test-phase14q-time-capsule-reveal.js` → 34 PASS / 0 FAIL
- `node scripts/test-phase14r3-dev-firebase-lock-gate.js` → 8 PASS / 0 FAIL
- TypeScript parser check on all changed TS/TSX files → no syntax/parse errors.

Full `tsc --noEmit` could not be run in the artifact workspace because the CLEAN ROOT source intentionally does not ship `node_modules`, so `expo/tsconfig.base` and package type declarations are unavailable there.
