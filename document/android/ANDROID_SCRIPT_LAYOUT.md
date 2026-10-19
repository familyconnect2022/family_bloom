# Android script layout

All Android BAT helpers live under `scripts/android/`; the project root intentionally contains no `.bat` files.

- `build/` — standalone APK build/share and Release builders.
- `dev/` — Metro and USB debug build/run flows.
- `install/` — install the latest/local APK.
- `eas/` — EAS development-client build and OTA update helpers.
- `verify/` — source/binary/device verification.
- `maintenance/` — pre-copy cleanup and post-copy clean/apply.

For copy-over updates, run `scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat` against the old project, copy the FULL package over it, then run `scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat`.
