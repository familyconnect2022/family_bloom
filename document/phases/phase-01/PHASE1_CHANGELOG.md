# Phase 1 Change Log

## P0 fixes

- Replaced unconditional authenticated → welcome redirect with an auth/profile state machine.
- Implemented Firebase Phone Auth and OTP verification.
- Implemented real profile persistence.
- Replaced `family_one` with generated family IDs.
- Added atomic profile + family + owner membership creation.
- Added Firestore security rules.

## P1 fixes included

- Centralized User/Profile/Family types.
- Centralized public runtime configuration.
- Removed invalid `undefined` dependency.
- Improved media upload ordering and retry strategy.
- Removed `any` from the new auth/error/OTP paths.
- Added Phase 1 setup documentation.
