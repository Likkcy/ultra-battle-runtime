# v1.2 Test Report

Validated before packaging:

- JavaScript syntax checks for every file under `src/`.
- ESM import checks for battle/player data, BattleRuntime, BulletSystem, StateMachine, and SoundSystem.
- Ginga profile and required-player routing.
- BLACK KING form application and LIVE unlock list.
- Forced-paralysis command gate: ATTACK / SKILL / ACT locked, LIVE remains available.
- Circuit arc spawning and active-node grounding.
- Inactive nodes cannot be farmed for STATIC reduction.
- Missed circuit arcs increase STATIC.
- Ginga conduct interception converts a yellow bolt without player damage.
- BLACK KING remains mechanically usable after phase 2 by returning to circuit-grounding rules.
- Static HTTP serving and direct query URL retrieval.

Runtime smoke result: `V12_RUNTIME_SMOKE_PASS`.

A Chromium headless visual run could not be confirmed in this container because the system browser failed on D-Bus / sandbox infrastructure. Visual feel and presentation therefore still require manual browser play-testing.
