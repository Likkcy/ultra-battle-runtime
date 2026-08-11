# v1.0 Test Report

Validated before packaging:

- JavaScript syntax check for every file under `src/`.
- Data smoke test:
  - Leo player exists.
  - Giras Brothers encounter exists.
  - Applying the Leo profile loads six phase-filtered ACT definitions.
- Leo battle BulletSystem smoke test:
  - Phase 1 spawns twin rush / pellet patterns.
  - Buffered Z counter resolves a nearby twin rush without player damage.
  - Phase 2 spawns Magma-era patterns.
  - New hazards render through the mocked Canvas API without exceptions.
- Static HTTP smoke test:
  - v1.0 index served successfully.
  - Leo player data served successfully.
  - Giras battle data served successfully.

The container Chromium build still hangs in this environment, so browser feel/balance requires human play-testing.
