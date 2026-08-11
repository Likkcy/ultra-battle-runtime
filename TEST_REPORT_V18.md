# v1.8 Test Report

Validated before packaging:

- All JavaScript files under `src/` pass `node --check`.
- Battle registry imports successfully and contains 17 encounters.
- Cosmos route registry contains Chaos Lidorias, Chaos Ultraman and Chaos Header / Chaos Darkness.
- Chaos Lidorias is now route-locked to Cosmos.
- Nexus final beam clash source requires 38 non-repeat `Z / Enter / Space` presses before the Zagi break state.
- Cosmos normal attack no longer references an undefined `skill` variable in the Chaos Ultraman path.
- COPY has real gameplay consequences: direct damage reduction and enemy-turn intensity growth.
- Luna pulse smoke test purifies nearby Chaos bullets.
- Monster-call smoke test converts a hostile Chaos projectile into a heart fragment.
- Chaos Panel, Prominence and Broken Halo telegraphs render without throwing.
- Chaos Panel, Prominence and Broken Halo active hazard drawing renders without throwing.
- Broken Halo collision test: player in a safe angular gap takes 0 hits; player on a solid arc takes 1 hit.
- Luna / Corona / Eclipse / Miracle Luna player-core drawing paths render without throwing.
- Chaos Ultraman phase 2 is Calamity and the Eclipse cinematic reconstructs the boss as Calamity.
- Cosmos story-boss phase floors use `Math.floor` and prevent a heavy hit from skipping the required story transition.
- Static HTTP load test passes.

Chromium visual automation is still not used as a substitute for human play-testing; final game feel and cinematic pacing require manual play.
