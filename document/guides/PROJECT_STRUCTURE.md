# Family Bloom project structure

The project uses feature-oriented folders without changing public Expo Router URLs.

- `src/app/(tabs)` — five primary tabs.
- `src/app/(home)` — Nhà Mình features (whispers, polls, kitchen, fund, games, time capsule).
- `src/app/(family)` — memberships, family graph, timeline and family administration.
- `src/app/(chess)` — chess lobby, history and game route.
- `src/app/(activity)` — Activity Center, event detail and notification preferences.
- `src/app/(memories)` — memory-book flows.
- `src/app/(profile)` — profile flows.
- `src/app/(internal)` — performance/dev screens.
- `src/features` — reusable feature panels, not routes.
- `src/components` — shared visual/system components grouped by domain.
- `src/hooks` — hooks grouped by domain.
- `src/services` — data/domain services grouped by domain.
- `document/phases` — implementation notes grouped by phase; Phase 14 is further grouped by feature.
- `reports` — generated validation/device reports.
- `scripts` — build/deploy/test/maintenance tools.

Route groups in parentheses are URL-transparent in Expo Router, so links such as `/home-whispers`, `/family-graph`, and `/chess-lobby` remain unchanged.
