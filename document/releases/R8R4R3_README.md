# Family Bloom R8R4R3 — Image Hero + Floating Snap Dock (Android)

Base: R8R4R2. This is a FULL SOURCE release, not an APK and not a claim of 92/92 redesign completion.

## Changed
- `BloomHeroHeader` now renders real image assets (no baked text) for Home, Family, Auth, Moments, Events, Family Tree and Relationship headers. Theme-specific Rose/Garden/Heritage/Midnight artwork is bundled locally and the image's lower edge fades to transparent. Native title/actions remain accessible.
- Home uses a seamless page background after the hero rather than a hard rounded division.
- Bottom tabbar floats 16dp from left/right edges and above the system navigation area; selected icon rises in a circular bubble. Quick tap navigates immediately. Long press and drag moves the bubble on Reanimated's UI thread; release chooses nearest of five anchors and navigates once. Reduced motion supports no-spring selection.
- Existing tab controller bridge, frozen scenes, protected Auth/Welcome and Firebase/Game backends are not replaced.
- Added dependency-free test `test-r8r4r3-floating-dock-hero.cjs`, updated obsolete R8R4R2 slider assertions, and registered R8R4R3 as known verified source lineage for future upgrades.

## Important limitations
- No local Windows/Gradle/physical-Android APK build was performed. No assertion of >90% screenshot fidelity or device frame time.
- The shared header variants other than the listed groups still use their preexisting component illustrations until their own clean assets are prepared.
- The visual image asset for the Home hero was extracted as standalone imagery from an AI-generated design composition; compare with a real Android screenshot before signoff.
- No Web, Render or Vercel changes; native chess board Full/Mini unchanged.
- 25 cross-Render gates are deferred, not passed. Existing android `versionCode` remains unchanged until native build is verified.

## Manual test matrix (Android)
1. Tap each tab quickly; image should change immediately, icon pops at the new anchor; no old sliding pill.
2. Long-press 190ms and drag across all five positions, release near two anchors, confirm nearest screen only once. Repeat dragging back and forth fast.
3. Turn on Still motion; verify bubble snaps without spring. Gentle and Vivid may spring.
4. Change each of four palettes and Light/Dark. Verify hero image, background dissolve, tab bar fill, inactive icons and selected label.
5. Test Android gesture navigation with bottom inset and a small device; floating dock must not overlap system gesture bar.
6. Enter/exit Home repeatedly, open Moment/Family/Schedule; check no auth/profile reset, native boards preserved.
7. Rotate device if supported, large accessibility font (160%), and Android Reduce motion; verify there is no crash or overlap.

## Updating safely
Unzip to a NEW folder, NOT inside the installed project. Run root `Family_Bloom_AUTO_UPDATE_FULL.bat`, verify checks and backup, then use Build & Share. Keep Firebase rules/credentials in existing project. Do not report a release APK without building and testing it.
