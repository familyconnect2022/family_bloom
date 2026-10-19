# Family Bloom P2.37R2C-H7 — Tab navigator flex regression fix

## Symptom
H6 restores the authenticated app shell and persistent tab bar, but the active tab scene can be blank.

## Root cause found by direct diff against P2.35
`src/app/(tabs)/_layout.tsx` changed the navigator host from normal Yoga flow:

`navigatorRoot: { flex: 1, ... }`

to:

`navigatorRoot: { ...StyleSheet.absoluteFillObject, ... }`

The persistent visual tab bar is a sibling of the navigator. The absolute-filled navigator host can leave the native tab scene coordinator with an unstable/zero content measurement even while the persistent tab bar itself remains visible.

## Fix
Restore `navigatorRoot` to `flex: 1`, keep `collapsable={false}`, preserve `tabScene: { flex: 1 }`, and keep the H6 Android Activity decor rail completely outside the React/Yoga tree.

## Binary impact
JS/layout only. Native binary contract remains `P2.37R2C-H6-native-1`, module version `1.3.5`.
