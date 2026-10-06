# Phase 15A.4 — Chess config + Moment comment composer

## Scope

This hotfix sits on top of Phase 15A.3.

### Chess public endpoint
- Adds the public Render endpoint `https://family-bloom-chess.onrender.com` to `app.config.js -> extra.chessSocketUrl` as a non-secret fallback.
- Keeps `EXPO_PUBLIC_CHESS_SOCKET_URL` as the highest-priority override.
- Runtime config trims empty environment/config values before falling back, so a present-but-empty environment variable cannot trigger `CHESS_SOCKET_URL_MISSING` in a clean FULL ZIP build.

### Moment comment composer
- Adds `variant="embedded"` to the shared `BloomTextInput`.
- Embedded inputs remove their own border/background/shadow so a containing composer can own one visual surface.
- Moment comments now use one Bloom Supper soft surface, one border, a compact 42px send action, and warmer placeholder copy.
- Existing Moment keyboard focus/reveal behavior remains intact.

### Build regression protection
- Adds `phase15a4:check`.
- Debug and Release Android helper scripts run the Phase 15A.4 gate.

## Validation
- Phase 15A.4: 10/10 PASS
- Phase 15A: 30/30 PASS
- Current Chess build gates: 14/14 PASS
- Release readiness: 11/11 PASS
- TS/TSX syntax: 249/249 PASS
- Relative/alias/asset import resolution: 0 broken
