# Phase 2 Final UX Fix

## Keyboard / Family Gateway
- Family name and Family Code inputs are focus-aware.
- The gateway ScrollView scrolls to the focused input after Android keyboard opening.
- Extra bottom padding prevents the keyboard from covering the action area.

## Create-family success button
- BloomButton text without an icon is explicitly centered.

## Welcome flow
- The post-login WelcomeModal is requested only once after authentication and only when the profile already has an active family.
- A new profile without a family goes directly through Family Gateway without an additional welcome modal.
- Failed authentication clears the pending welcome request.

## Build rule
Do not modify `app.json` for these fixes. They are source-level UX changes.
