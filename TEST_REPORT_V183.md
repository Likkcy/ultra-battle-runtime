# v1.8.3 Test Report

Regression target: Chaos Ultraman / Chaos Darkness enemy turns displayed an empty Battle Box because the animation frame crashed on the first Chaos projectile.

Validated:

- All source JavaScript parsed in ES-module syntax mode.
- `updateBullets()` contains no Canvas `ctx` drawing calls.
- Chaos Ultraman pattern exercised at progress 0.00 / 0.20 / 0.42 / 0.62 / 0.80 / 0.93.
- Chaos Darkness pattern exercised at the same six progress points.
- Each pattern completed spawn -> physics update -> draw without exception.
- Individually exercised: `chaosMirror`, `chaosOrderNode`, `chaosPanel`, `chaosProminence`, `chaosHatredOrb`, `chaosHeartOrb`, `chaosDarkOrb`, `chaosBrokenHalo`.
- Moving Chaos projectiles now use the normal collision path and no longer execute rendering code during physics.
- Static package integrity verified.

Expected visible result: enemy turn immediately shows the player core, projectile telegraphs, and attacks instead of a blank arena.
