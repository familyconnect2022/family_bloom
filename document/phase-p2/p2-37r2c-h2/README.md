# P2.37R2C-H2 — Native UI thread + real layout visibility

Scope is intentionally limited to the Android authenticated native presentation host.

- All module AsyncFunctions that read or mutate the host run on `Queues.MAIN`.
- React gives `FamilyBloomOverlayHost` explicit window width/height instead of relying only on absolute-fill inference.
- Native presentation waits for non-zero host size.
- `NATIVE_HOST_FULL_VISIBLE`, `NATIVE_HOST_MINI_VISIBLE`, and `NATIVE_HOST_PROBE_VISIBLE` are emitted only after the corresponding native container is shown and has non-zero measured size.
- Probe restore timer starts only after the probe has actually become visible.
- Server, Chess/Xiangqi session flow, and gameplay are unchanged.

Binary identity: app 1.3.7 / Android versionCode 143017 / `P2.37R2C-H2-native-1` / `family-bloom-overlay@1.3.3`.
