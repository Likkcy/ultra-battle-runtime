# v1.7 Test Report

## Leo regression

- Black End command-severed phase keeps all major attack families but reduces simultaneous saturation.
- Unbound disc volley reduced to 3 discs.
- Unbound black-flame rain spacing widened.
- Unbound spawn intervals increased across charge / flame / disc / horn patterns.
- Child sequence now uses Black Directive gaze + opposite blind-spot movement instead of displaying the answer direction.
- Wrong movement loses one step rather than hard-resetting the sequence.
- Children create the distraction collectively; Toru still has to take the real opening himself.
- Crystal opening uses a short timing input with a feint and retry behavior, not a mash sequence.

## Nexus route

- `mephisto-zwei` and `dark-zagi` are registered encounters.
- Mephisto Zwei runs in Junis Blue and supports enemy-turn shooting with `Z / Enter / Space`.
- Mephisto attack families tested: spear fan, red-eye targets, drain orbs, claw sweep, cross beam.
- DARK DRAIN interaction is wired: drain orbs raise it; shot targets lower it.
- Mizorogi assist phase is wired and Mephisto Zwei has a custom victory cinematic.
- Dark Zagi has exactly four authored phases: Anphans -> Junis -> Junis Blue -> Noa.
- Zagi phase interactions:
  - Anphans: local darkness neutralization pulse.
  - Junis: timed close parry against rushes.
  - Junis Blue: active shooting against dark nodes.
  - Noa: return selected heavy red attacks.
- Zagi attack families include orb fan, aimed needles, claw sweep, shock ring, rush, beam sweep, cross lanes, dark nodes, needle rain, teleport cross, homing orbs, return orbs, lightning and cosmic sweeps.
- Noa phase ends the per-round Nexus life drain.
- Story transitions include Himeya, Ren, Riko / Nagi / Mizorogi / Night Raider / public trust, and the Noa awakening.

## Runtime validation

- `node --check`: PASS for every JavaScript file under `src/`.
- Mock Canvas Nexus pattern smoke: `V17_NEXUS_BULLET_SMOKE_PASS`.
- Mephisto drain collision smoke: `V17_DRAIN_PASS`.
- Registry / four-phase / Leo / visual source regression: `V17_ROUTE_REGRESSION_PASS`.
- Focused finale / Black End / Nexus interaction assertions: `V17_FOCUSED_SOURCE_PASS`.
- Static HTTP load for index, battles, BattleRuntime, BulletSystem, CSS and Nexus docs: PASS.
- Development backup files removed from distributable tree.

Chromium visual automation was not used for acceptance because the environment has previously stalled on its browser / D-Bus process. Final animation pacing, difficulty and visual readability still require human play-testing.
