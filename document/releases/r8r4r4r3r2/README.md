# Family Bloom R8R4R4R3R2 — Atmospheric Hero + Auth Handoff + Theme Patches

Base: R8R4R4R3R1 FULL CODE (which includes R8R4R4R2/R8R4R4R3). Direct upgrade target.

## Implemented
- 8 pre-rendered RGBA asymmetrical fog overlay assets (4 palettes × light/dark); the original 20 approved scene illustrations and all 4 Home images stay unchanged.
- Shared `BloomHeroHeader` draws fog over the lower 23% of header artwork. Each theme/mode uses its matching surface color; there is no live blur, native shader or per-frame repaint. Child headers inherit the same mechanism.
- During Google-login navigation handoff or pending Welcome, display a real Bloom loading surface rather than the old blank white shield; never authorize Home until uid, profile and verified family gates pass.
- Public session-gate shows a safe retry after 12 seconds of unresolved verification; retry cannot bypass authorization.
- Planner mode buttons, calendar selection markers, Family Tree card/graph backgrounds and generation icons use semantic theme colors. Theme changes do not remount Firebase/Game providers.

## Test limits
No Android APK/runtime Google auth test executed here. Gate checks are syntax/static/Node tests, and updater dry-run is not a Windows BAT launch. A white-screen fix can only be confirmed on the physical Android device.

## Required device tests
1. Login and verify that Home/Welcome never shows a pure white blank surface, including slow network and first login.
2. Welcome envelope: tap anywhere, read, continue to Home without app restart.
3. Each main section and compact child header: 4 themes × light/dark, fog reaches 20–23% with uneven height, and background is seamless.
4. Planner: both buttons and calendar day selection, in light/dark; tree graph relation cards, node labels and focus/zoom controls.
5. Switch tabs quickly; verify no full-app theme rerender or game state reset.
6. Auto Update & Build & Share on Windows; ZIP includes scripts/android and Native modules.
