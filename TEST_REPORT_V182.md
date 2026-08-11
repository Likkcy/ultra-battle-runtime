# v1.8.2 Test Report

Validated before packaging:

- ES-module syntax check on every JS file under `src/`.
- CSS parsed with `tinycss2` with zero parse errors.
- Chaos Ultraman and Chaos Darkness both have dedicated normal-battle CSS selectors and no longer fall through to the generic Golza-like silhouette.
- Chaos Ultraman phase 2 has a distinct Calamity visual state.
- Chaos Darkness uses a dedicated multi-core / claw / spike silhouette and lunar final-battle environment.
- Both Cosmos boss openings begin with visual-only beats, then dialogue, then an awaited cinematic fade and staged battle-HUD reveal.
- Cosmos cinematic dialogue timing is slower than generic story text.
- Package file/reference integrity checked.

Full Chromium visual automation is not claimed for this build; final visual pacing still requires manual play-testing.
