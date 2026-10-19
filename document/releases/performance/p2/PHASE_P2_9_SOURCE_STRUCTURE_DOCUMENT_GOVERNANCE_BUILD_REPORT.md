# Family Bloom — Performance Architecture P2.9

## Clean Source Structure + Documents Governance

Date: 2026-10-11  
Baseline: P2.8 Moments + Branch + Chess Audio + TabBar Stabilization

### Goal

P2.9 is a source-organization release. It does not intentionally change user-facing runtime behavior from P2.8. The goal is to keep the project root small, predictable and safe for future copy-over releases.

### Canonical root

Only runtime/build configuration, top-level source folders and the two copy-over entrypoint BAT files remain at project root. All `.md` and `.txt` source documentation is now under `document/`.

P2.8 shipped 46 root files, including 26 root `.md/.txt` documents. P2.9 ships 17 root files and **0 root `.md/.txt` files**.

Root directories are limited to the main project areas: `assets`, `document`, `functions`, `plugins`, `public`, `scripts`, `server`, and `src`.

### Documentation migration

- Kept the existing `document/` tree as the canonical documentation root, matching the project convention and the new user rule.
- Moved old top-level `reports/` into `document/reports/`.
- Moved P1/P2 build reports into `document/releases/performance/`.
- Moved Phase 17 native/web build reports into `document/releases/phase-17/`.
- Moved A16/A17/W1 verification logs into `document/verification/`.
- Moved Web companion/parity READMEs into `document/web/`.
- Moved copy-over instructions into `document/releases/copy-over/`.
- Moved the performance architecture PDF into `document/architecture/performance/`.

### Machine-generated files

The Vietnamese music catalog state/audit JSON files are not documentation. They were moved out of the documentation tree:

- `scripts/music/state/source-state.json`
- `scripts/music/reports/refresh-latest.json`
- `scripts/music/reports/audius-audit-latest.json`

The music refresh/audit scripts were updated to use these paths.

### Tooling consolidation

Three stale/duplicate Firebase deploy BAT files were removed from `scripts/maintenance/`. The single maintained copies now live only in `scripts/firebase/`. The Vietnamese music refresh helper remains under maintenance for compatibility, but its output message now points to the canonical machine-report location under `scripts/music/reports/`.

### Windows helper scripts

Only the two copy-over entrypoint BAT files remain at root:

- `scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat`
- `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat`

Web preview/export helpers now live under:

- `scripts/windows/web/Family_Bloom_WEB_PREVIEW.bat`
- `scripts/windows/web/Family_Bloom_WEB_EXPORT.bat`

Their working-directory logic was changed so they still execute from the project root.

### Android/Web-only cleanup

The stale iOS Firebase/native configuration was removed from the active source baseline:

- removed `GoogleService-Info.plist`;
- removed the `ios` block from `app.json`;
- removed the `ios` npm run command.

Android identity remains `com.familybloom.android`; Web source remains unchanged functionally.

### Safe copy-over preservation + normalization

Added `scripts/maintenance/backup-legacy-project-notes.js` and `scripts/maintenance/normalize-project-root.js`.

Before overlay, the P2.9 PRE-COPY BAT hashes legacy P2.8-managed documentation and backs up only unknown or manually changed `.md/.txt` files to `document/legacy-import/pre-copy/`. This is intentionally done **before** overlay so a same-path manual edit cannot be overwritten by the new FULL package.

After overlay the normalizer:

- removes top-level `reports/`, obsolete root notes, and P2.8 files that were moved to new locations inside/outside `document/`;
- preserves unknown/manual legacy files under `document/legacy-import/` instead of silently deleting them;
- removes retired root documentation copies;
- removes old root Web BAT duplicates;
- removes stale duplicate Firebase deploy BAT files from `scripts/maintenance/` while keeping the canonical helpers in `scripts/firebase/`;
- removes stale `GoogleService-Info.plist`;
- detects an identical pre-copy safeguard and avoids creating a second duplicate archive copy.

`document/legacy-import/` is ignored by Git so local migration backups do not accidentally become release-source history.

The post-copy BAT invokes this normalizer before verification.

### Permanent structure gate

Added `npm run structure:check` backed by `scripts/maintenance/check-project-structure.js`.

The gate verifies:

- zero root `.md` / `.txt` files;
- no `.md` / `.txt` anywhere outside `document/`;
- no accidental parallel `documents/` directory and no root `reports/` directory;
- only the two copy-over BAT entrypoints at root;
- Web BAT helpers are under `scripts/windows/web/`;
- release/verification/device/validation documents are grouped correctly;
- music machine state is outside `document/`;
- stale iOS Firebase/native config is absent;
- Android package identity is unchanged.

### Regression status

After the reorganization, the inherited gates were rerun, including:

- P2.8: 34/34 PASS
- P2.7: 35/35 PASS
- P2.6: 21/21 PASS
- P2.5: 20/20 PASS
- P2.4: 41/41 PASS
- P2.3: 23/23 PASS
- P2.2: 14/14 PASS
- P2.1: 32/32 PASS
- P2: 49/49 PASS
- P1.2: 26/26 PASS
- P1.1: 25/25 PASS
- P1: 32/32 PASS
- Phase 17.9W1: 49/49 PASS
- Phase 17.9W2: 88/88 PASS
- Phase 17.9W3: 34/34 PASS
- Current Chess aggregate: 20/20 PASS
- Phase 14T.0A single Android identity: 21/21 PASS
- Project structure gate: 18/18 PASS
- Real P2.8 → P2.9 overlay migration simulation: PASS, 0 standard legacy files duplicated
- Manual-note preservation simulation: PASS, modified/unknown files preserved before overlay under `document/legacy-import/pre-copy/`, with no duplicate post-copy archive

### What intentionally stays where it is

Some root files were deliberately **not** moved because the toolchain expects or benefits from their conventional location: `package.json`, `app.json`, `app.config.js`, `metro.config.js`, `tsconfig.json`, `firebase.json`, Firestore rule/index files, `google-services.json`, `vercel.json`, `.env.example`, `.gitignore`, `.prettierrc`, and `LICENSE`.

The large regression-script collection remains inside `scripts/`. It is already outside project root and many package/BAT gates intentionally reference those stable paths. Moving hundreds of historical test scripts solely for aesthetics would increase regression risk without reducing root clutter. New operational helpers should use the existing categorized subfolders instead.

### Future release rule

Every new Family Bloom FULL release must put newly generated `.md` / `.txt` project documentation under `document/` from the beginning. Root documentation files are no longer an accepted temporary state.
