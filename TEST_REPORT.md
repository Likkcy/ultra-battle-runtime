# v0.7 Test Report

Validated before packaging:

- JavaScript syntax check across all files in `src/`.
- Melba world-space projectile regression:
  - ordinary platform pellets carry `worldSpace: true`;
  - changing the camera changes screen position but does not mutate projectile world coordinates;
  - changing the player's jump height does not mutate already-spawned projectile world coordinates;
  - Melba swoop hazard is also world-space;
  - platform jump/landing/goal effects are world-space.
- Player-profile regression:
  - Cosmos profile applies correctly;
  - battle-specific ACT entries remain attached after player swap;
  - Cosmos profile exposes a Mercy-type skill.

Automated runtime checks passed:

- `MELBA_WORLDSPACE_PASS`
- `PLAYER_SELECT_PASS`

Human browser play-testing is still required for camera feel, platform spacing and animation quality.
