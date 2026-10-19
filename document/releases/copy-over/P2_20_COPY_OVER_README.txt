FAMILY BLOOM — P2.20 CLEAN GAME LIFECYCLE / FOCUS 85% / NATIVE PAN

SAFE COPY-OVER FLOW
1. Keep your existing project folder.
2. Run scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat from this P2.20 package and point it at the old project when prompted.
3. Copy the ENTIRE P2.20 FULL CODE package over the existing project and replace files.
4. Inside the updated project run scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat.
5. For the first device test after overlay, use your normal Android Debug build flow. If Metro cache appears stale, npx expo start -c is safe.

P2.20 IMPORTANT BEHAVIOR
- A finished Chess/Xiangqi result is history/presentation only; it is never a resumable active session.
- Leaving a finished result clears the active game lease + presentation rail + surface gameId.
- Xiangqi retained local state is reset when its surface detaches.
- Focus remains inside the Phả hệ route, is centered at 85% x 85% of the native window, and owns its native gesture root for Pan/Pinch.
- Chess/Xiangqi are still lazy-mounted; no app-start board prewarm is restored.

Do not copy only a patch. This release is intended to be overlaid as FULL CODE with the bundled cleanup/updater BAT files.
