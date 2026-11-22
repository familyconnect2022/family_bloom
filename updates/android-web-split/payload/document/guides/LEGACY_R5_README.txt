FAMILY BLOOM – NODE 3D R5 – BAT-PRESERVING REPAIR (2026-11-04)

Your R5 updater previously rejected your existing project solely because its
Family_Bloom_AUTO_UPDATE_FULL.bat differed from the R4 example.
This release DOES NOT REPLACE OR HASH-CHECK THAT EXISTING ROOT BAT.
It still requires exact R4/R5 hashes for the three actual application source files.

HOW TO USE
1. Extract this ZIP OUTSIDE your existing Family Bloom app project.
2. Run 00_MO_CAP_NHAT_FAMILY_BLOOM.cmd FROM THIS EXTRACTED ZIP.
3. Select the existing app project folder, not a ZIP or extracted patch folder.
4. The CHECK runs before any writes. If all app-source hashes match, confirm Y.
5. The installer backs up source and only changes 3 app source files plus release metadata.
6. Do not launch the old Family_Bloom_AUTO_UPDATE_FULL.bat INSIDE your existing project.
7. Build APK only after PASS. Use the NEW extracted updater for this R5 release.

READ-ONLY CMD CHECK (run inside the EXTRACTED NEW ZIP folder):
node "scripts\maintenance\fb-node-3d-r5-safe-update.cjs" check "D:\Family Bloom App + Server\Family_Bloom"

If any of the three app files has unknown SHA-256, installer STOPS.
Do not bypass and do not overwrite those files manually.
Your existing BAT, Firebase rules/config, user data, and relations are preserved.
This fixes installer compatibility only; it does not change R5 application behavior.
