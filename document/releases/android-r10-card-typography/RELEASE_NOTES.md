# Family Bloom Android R10 — Trang chủ / Card Typography

- **Baseline:** Android-only R9 full source (SHA-256 exact in source-release marker)
- **Target:** Android-only R10, app version 1.3.35, `versionCode` 143045 unchanged.
- **Home upcoming:** remove Hero artwork from list-style card. With one event, the surface now contains only that event row (no large empty image). Up to 3 event rows and “more” action remain.
- **Readability:** allow 2 lines for upcoming event title. Maintain date, participants, creator, event navigation and React Native responsive layout.
- **Typography:** common card-title token (base size 15, line height 21) in Home, Events, Moments and shared card components. `BloomText` continues to apply theme font and font scale; hero/section headings and descriptive text keep their distinct hierarchy.
- **Excluded:** Firebase, Firestore Rules, networking, phả hệ, games, Moment uploads, tab navigation, native app identity and Web.
- **Validation required:** R10 UI contract, Android route/structure/graph tests, release tests, TypeScript syntax scan; native APK UI still needs physical Android verification.

**INSTALL:** use R10 PATCH only on an exact R9 baseline; it verifies fingerprints before writing and preserves root BAT and all local config.
