---
name: Rydexo brand direction
description: Visual identity decisions from the Rydexo rebrand (formerly VeloTrack) and rename constraints
---

# Rydexo brand direction

- App renamed VeloTrack → Rydexo (user-facing strings, app.json name, artifact title). **Intentionally unchanged:** AsyncStorage keys stay `velotrack:*` (data preservation) and bundle IDs stay `com.velotrack.app` until the store-ID follow-up task lands.
- Visual identity: OLED pure black `#000000` base + matte panels, electric cyan `#00E5FF` primary, Space Grotesk for display/numerals, Inter for body. Uppercased telemetry-style labels.
- Warning escalation (safety-critical, keep unmistakable): cyan → amber `#FFE600` → orange `#FF6B00` → red `#FF003C` in services/speedWarning.ts.
- **Why:** night-driving legibility makes pure-dark backgrounds a functional requirement, not a style choice.
