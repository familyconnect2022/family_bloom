# Family Bloom P2.11.3 — BSH Cancel-first Focus / Immediate Back

Date: 2026-10-11  
Baseline: P2.11.2 BSH Focus Runtime / Presentation FULL CODE

## Device evidence

Device video 6282 confirms that P2.11.2 successfully renders the previously problematic Lan/Don Focus branches. The remaining UX problem is cancellation: while Focus construction or React presentation work is still active, Back can feel delayed instead of dismissing the Focus surface immediately.

This is a different failure domain from topology/layout. BSH Model/Layout/Scene correctness is retained; P2.11.3 changes scheduling and cancellation only.

## Root cause 1 — close path still waited for an exit tween

P2.11.2 kept the Focus surface geometrically stable but `closeFocusOverlay()` still waited for a 90ms Reanimated timing completion before clearing React state. That violates the new UX contract: Back must not wait for any animation or graph task.

P2.11.3 changes close to cancel-first:

1. mark Focus as closing;
2. invalidate the active request id;
3. cancel every registered Focus RAF/timer continuation;
4. mark the active BSH build token cancelled;
5. cancel Focus UI animations;
6. set Focus React state to `null` immediately in the same JS turn.

The header Back button, Android hardware/predictive Back handler, and native Modal `onRequestClose` all use this same path.

## Root cause 2 — synchronous Focus BSH build could monopolize the JS turn

Before P2.11.3, `getFocusBranchVisual()` synchronously executed the complete BSH Focus pipeline. Even with correct stale-request guards, JavaScript cannot process a Back event while one long synchronous call is still running.

P2.11.3 adds `buildFamilyGraphRenderSceneInterruptible()` while preserving the existing synchronous stage functions and their independent caches.

The Focus path is now:

`request -> yield -> GraphModel -> yield -> GraphLayout -> yield -> GraphScene -> commit`

Cancellation is checked before/after every stage boundary. This gives native/JS events a scheduling opportunity between stages. A cancelled request returns `null` and cannot commit presentation state.

Completed Model/Layout work is still safe to cache because BSH cache identity is revision/version based. Cancellation stops presentation, not correctness-preserving cache reuse.

## Root cause 3 — heavy Scene mount competed with urgent Back

A prepared Focus Scene may still contain many cards/connectors. Committing that Scene is presentation work, not an urgent user action.

P2.11.3 wraps the large Scene state commit in React `startTransition()`. The Focus shell remains immediate, while heavy Scene mount becomes interruptible/non-urgent. Back uses a normal urgent update, allowing React to discard/preempt transition rendering when the user exits.

## Registered Focus work

P2.11.3 owns Focus continuations explicitly:

- `focusScheduledFramesRef` tracks requestAnimationFrame callbacks;
- `focusScheduledTimersRef` tracks timers;
- `focusBuildTokenRef` tracks the active BSH build request.

`cancelFocusScheduledWork()` clears all three categories. Component/route unmount also calls the same cancellation function so no Focus work may outlive its owner.

A-to-B navigation inside the same Focus portal also cancels the previous Person's pending work before preparing the next Person.

## What is intentionally unchanged

- BSH GraphModel topology rules;
- BSH GraphLayout coordinates/generation rebase;
- GraphScene camera contract: 0.95 scale, 50% horizontal / 42% vertical anchor;
- retained-node rendering;
- loader placement/readiness from P2.11.2;
- Lan / Don / Bich remain regression fixtures only, never production branches by name.

## New P2.11.3 regression gate

`scripts/test-phase-p2_11_3-bsh-cancel-first-focus.js`

The gate verifies:

- interruptible Focus build returns no Scene after cancellation;
- an uncancelled build still produces the normal 0.95 Focus Scene;
- close invalidates request and cancels scheduled work before unmount;
- close does not wait for `withTiming`;
- UI Back, Android Back and Modal request-close share the same path;
- RAF/timer/build-token registries are all cancelled;
- route/unmount also cancels Focus work;
- stale/cancelled async hydration cannot commit Scene state;
- heavy Scene mount uses React `startTransition`;
- screen Focus build uses the interruptible BSH facade while Full Tree keeps the synchronous memoized facade;
- BSH yields and checks cancellation around each stage;
- initial and A-to-B Focus continuations are registered/cancellable;
- copy-over and Android build BATs invoke the new gate;
- changed TS/TSX transpiles cleanly.

## Historical gate updates

P2.7 and Phase14J previously encoded the older requirement that Focus must finish a short exit animation before unmount. P2.11.3 intentionally supersedes that behavior with the stronger cancel-first contract. Their assertions were updated to accept immediate cancellation/unmount while retaining all other isolation, readiness, geometry, pan/pinch, and stale-request invariants.

## Packaging

- FULL CODE copy-over release.
- Root `.gitignore` retained.
- Root copy-over BAT entrypoints retained.
- No Markdown/TXT files at project root.
- New documentation is stored under `document/releases/performance/p2/`.
- No Firebase/Render/native dependency deployment change is required solely by P2.11.3.
