# Family Bloom — Android Performance Foundation P1

## Base
Phase 17.9W3 / A18 FULL CODE (2026-10-09).

## Goal
Keep the existing Android UI and feature behavior intact while making main-tab handoff deterministic: touch feedback first, route commit second, realtime/data React work after the critical frame window.

## Changes

### 1. Pre-commit tab lifecycle handoff
- The 240ms UI-critical window starts on tab `press-in` so the first visual response is protected.
- `TabRuntimeStore.prepareFocus()` runs at the start of accepted `onPress`, immediately before React Navigation emits/commits the target route. This avoids transferring runtime ownership if a press gesture is cancelled.
- Outgoing tab `useTabLiveEffect` work is stopped before navigation blur through the existing WARM transition.
- The target tab reuses the same restore timer when navigation focus arrives, preventing duplicate listener restarts.
- Prevented tab navigation rolls runtime ownership back to the actual selected tab.

### 2. UI frame-budget coordinator
Added `src/services/performance/uiFrameBudget.ts`.
- A short 240ms UI-critical window begins on main-tab press-in.
- Realtime React commits are coalesced by key; only the newest snapshot per channel is retained.
- Deferred commits drain one per frame after the critical window, avoiding a multi-context catch-up commit in one frame.
- Listener cleanup cancels any deferred commit owned by an old family/session.

### 3. Global family realtime commit isolation
The four bounded app-global channels now respect the UI-critical window:
- members
- latest moments
- upcoming events
- yearly recurring events

Network listeners remain live; only React state commits are briefly deferred/coalesced during the visual tab handoff.

### 4. Moments feed render isolation
- Removed the parent-level `screenFocused` state and 280ms focus timers.
- `MomentPostRow` now subscribes only to the tab's `live` boolean via `useTabLiveState("moments")`.
- The full Moments parent/feed no longer rerenders merely to enable/disable per-card realtime.
- Existing viewport visibility gating remains: `realtimeEnabled = live && visible`.

## Protected behavior
- `lazy:false` retained.
- `detachInactiveScreens={false}` retained.
- main-tab route animation remains `none`.
- A18 single-icon tabbar geometry retained.
- No Chess/Xiangqi gameplay/server/rules behavior changed.
- Web code is intentionally not part of P1.

## Delivery
- Root `.gitignore` retained.
- Pre-copy cleanup BAT retained and marked for P1.
- Post-copy updater runs the new `phaseP1:check` gate.
- Android Debug and Release BATs run the new P1 gate.
