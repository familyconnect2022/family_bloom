# R8R4R4R1 - Auto Update and Android Native package repair

Root cause: R8R4R4 ZIP creation excluded any folder named `android`, unintentionally omitting `scripts/android` and `modules/family-bloom-overlay/android`. The root BAT therefore called a nonexistent nested BAT and immediately closed.

This release restores all `scripts/android/*` update, build, EAS and menu tools, plus the native Android module source; it adds a visible early preflight to the root BAT. UI/feature code remains the same as R8R4R4.

## Windows steps

1. Extract the NEW ZIP using Extract All into a new folder OUTSIDE your existing project. Do not run a BAT inside the compressed ZIP.
2. Double-click the **root** `Family_Bloom_AUTO_UPDATE_FULL.bat`.
3. If the BAT still does not open, open the extracted folder in File Explorer; type `cmd` in its address bar and press Enter. In the window type `call Family_Bloom_AUTO_UPDATE_FULL.bat`. Leave the window visible and send the error output.
4. Select the EXISTING Family Bloom app project as target (not this new extracted release); backup, copy and Clean Apply must PASS.
5. Run Build & Share only after a successful update.
6. If Windows blocks the downloaded archive, inspect ZIP Properties for an Unblock option if available; do not turn off Windows security.

Do not remove your existing app project, .env or Firebase credentials. The update tool is designed to preserve them.

Windows BAT and actual Android APK were not executed in this Linux environment; archive contents and CLI preflight will be checked separately.
