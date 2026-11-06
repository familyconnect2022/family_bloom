# Family Bloom P2.12.6 — Build Dependency Contract Fix

## Scope

P2.12.6 fixes the Debug/Release dependency checker regression found on Windows after a normal `npm install` resolved newer compatible Expo SDK 57 patch releases.

The failing real-device build installed:

- `expo-linking 57.0.12` for package contract `~57.0.11`
- `expo-router 57.0.25` for package contract `~57.0.24`
- `expo-notifications 57.0.22` for package contract `~57.0.21`

Those versions are valid for the declared tilde ranges, but P2.12.5 incorrectly compared them against a second hard-coded exact-version table.

## New dependency contract

There is now one version policy:

1. `package.json` owns the allowed semver range.
2. `npm install` resolves a compatible exact version.
3. `package-lock.json` pins that resolved exact version.
4. `node_modules` must equal the exact lock version.

`check-expo-dependencies.js` no longer duplicates Expo patch versions. It reads `package.json` and validates the installed package against the declared range.

`check-package-lock.js` validates all three sides: root package spec, resolved lock version, and installed version.

## Compatibility proof

The P2.12.6 regression explicitly verifies that:

- `57.0.12` satisfies `~57.0.11`
- `57.0.25` satisfies `~57.0.24`
- `57.0.22` satisfies `~57.0.21`
- `57.1.0` does not satisfy `~57.0.24`
- pinned `expo-doctor 1.20.4` remains exact

A synthetic package-lock/node_modules fixture matching the Windows screenshot was also executed against both production dependency validators and passed.

## Preserved functionality

P2.12.6 preserves:

- P2.12.4 `expo-audio` build/runtime recovery
- all 11 board-game M4A assets and Release payload validation
- P2.12.5 standalone Release APK + remote share BAT
- BSH retained Family Graph rendering and previous Family Graph recovery work

## Verification

Current focused verification:

- P2.12.6 dependency contract: 20/20 PASS
- P2.12.5 remote APK share: 26/26 PASS
- P2.12.4 build/audio integrity: 52/52 PASS
- build-entrypoint audit: PASS
- current Chess aggregate: 21/21 PASS
- project structure: 18/18 PASS

All shipped BAT files are normalized to Windows CRLF before packaging.
