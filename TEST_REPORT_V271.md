# v2.7.1 Test Plan

- Syntax: all src JS via node --check.
- Belial normal pattern schedule audit for 5 variants × 3 phases: final visible threat should approach round end.
- Runtime smoke: Belial duel field, galaxy field, abyss field, final clash draw/update.
- Arena reset: special classes removed and non-arena canvas absolute/min-height=0 so SKILL/ITEM cannot inherit galaxy arena height.
- Package integrity: unzip -t.

## Executed checks

- `node --check` passed for every JavaScript file under `src/`.
- Belial normal attack smoke: 5 variants × 3 phases, stepping generation/update/collision/Canvas draw at 50 ms intervals: `BELIAL_271_SMOKE_OK`.
- Galaxy chase and abyss field were stepped through their complete 19.0 s / 17.8 s windows with Canvas draw/update and no runtime exception.
- Final live Deathcium clash was stepped with continuous Z-held state until progress reached 1.0 and the completion callback fired.
- Headless Chromium visual capture was attempted, but Chromium cannot complete navigation in the current container (DBus/headless process stalls); therefore visual feel still requires local browser playtesting.
