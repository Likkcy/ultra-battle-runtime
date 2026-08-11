# TEST REPORT — v2.7.0 Belial Reset

## Scope

Only Belial encounter gameplay/UI plus version docs were changed from v2.6.5:

- `src/data/battles.js`
- `src/engine/BattleRuntime.js`
- `src/engine/BulletSystem.js`
- `styles/main.css`
- `README.md`
- `CHANGELOG.md`

No Zetton / Greeza / Grand King / Five King gameplay files were otherwise edited.

## Static checks

- Every JavaScript file under `src/` passes `node --check`.
- CSS brace count is balanced.
- Runtime no longer creates `belial-clash-qte`; old finale overlay CSS was removed.
- Belial transition pattern sets are uniquely routed through `original_belial_galaxy`, `original_belial_abyss`, and `original_belial_final`.

## BulletSystem smoke test

A headless fake-canvas harness exercised:

- all 5 normal Belial round variants at boss phases 0, 1, and 2;
- galaxy chase at representative timestamps across the 19s window;
- phase-3 energy field across the 17.8s window;
- the live final Deathcium clash with continuous Z-held state until the collision point reaches Belial.

The harness calls pattern generation, bullet/hazard update and Canvas draw methods. Result: `BELIAL_SMOKE_OK`, no runtime exceptions.

## Final clash behavior checked

- HP remains 0 when the finale begins; runtime does not restore Belial to 1 HP.
- No cutscene/QTE DOM is created.
- Z / Enter / Space held state drives actual BulletSystem clash progress.
- First ~34% represents stabilizing the block; after that the live stage switches to stronger push/shake state.
- Releasing the block causes progress loss and repeated real damage near the losing edge.
- Continuous hold reaches completion; the collision point travels from the player side toward Belial and BulletSystem stops on success.
- A timeout without completion does not auto-award victory.

## Limits

A full manual Chromium localhost playthrough was not available in this environment, so final pacing, perceived dodgeability and presentation still require the user's local browser playtest.
