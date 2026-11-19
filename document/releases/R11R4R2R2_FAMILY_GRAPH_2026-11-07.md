# Family Bloom Android R11R4R2R2 — Phả hệ / Node & Focus

Base: **R11R4R2R1 FULL CODE**, not R10, not Web. Safe rollback: the untouched original R11R4R2R1 ZIP.

- Attached relationship nameplate above each node (1–3 lines), no upper decorative PNG layer; original 3D lower ornament and gender palettes remain.
- If a full Vietnamese name is long, retain **first two words** (potential composite surname) and **last two words** (given-name segment); abbreviate only middle portion with an ellipsis. The canonical displayName is **never modified**.
- When focus is active, show documented relationship relative to selected person; focused node displays “Đang xem”.
- Gentle semi-transparent pink/green/purple mist behind focused node and a 3pt lift; no heavy glow border.
- Main tree retains its existing rounded native connectors with an 8pt corner radius, Focus View receives rounded two-corner connectors.
- Keep a biological child connected to their real recorded parent(s), not automatically to a new spouse. Never infer half-sibling unless both recorded biological parents are known. Exclude step-parent links from shared-parent grouping.
- No Firestore Rules changes. No data migration. No new app login/session gates. Android root keeps exactly **two BAT** (Metro and Build APK & Share).

## Validation boundaries

- ZIP CRC and unchanged-file SHA must pass.
- Gate: structure 19/19 + R9+ Android release contract.
- Graph: new presentation/kinship tests + historical QueryEngine test pass.
- Source TSX parsing is validated; **APK Gradle/Android device testing is NOT confirmed** in this packaging environment.
- The legacy `test-familyGraphLayout.js` is failing on the supplied unmodified R11R4R2R1 baseline too, so it is not an accepted passing release gate for this change.
- Relationship display remains conservative when records are incomplete; full Vietnamese kinship and advanced multi-marriage geometry still require a later dedicated validation on real data.
