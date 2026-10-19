# Family Bloom P2.16.1 — Hydration Without Paint-ACK Deadlock

## Scope

P2.16.1 fixes the real-device deadlock where Focus, Chess, and Xiangqi could paint only their shell (or nothing) because hydration was incorrectly started from a paint ACK. Paint ACK is now observational only.

## Final flow

- **Focus:** tap -> route-local Focus shell mounts immediately -> BSH hydration starts independently -> shell/content ACKs update Root arbitration when they actually arrive. Opening no longer waits for `measureInWindow()`.
- **Chess:** game route claims full runtime in layout effect -> route-owned host remains visually present regardless of a transient store-mode race -> game subscription stays mode-gated so mini mode still sleeps. Lobby explicitly establishes Socket.IO transport before waiting on lobby membership ACK.
- **Xiangqi:** route claims the warm 32-piece runtime in layout effect -> route-owned host is considered focused by route ownership -> board pixels stack above the shell while server hydration proceeds.
- **Root arbitration:** a surface is considered presented only after a real `shellPaintedAt`; content may hydrate before that without synthesizing visibility.

## Regression guard

`test-phase-p2_16_1-hydration-no-ack-deadlock.js` dynamically executes the route surface lifecycle to prove that content can finish before shell ACK without falsely occluding lower surfaces, while stale owner/request ACKs remain rejected.
