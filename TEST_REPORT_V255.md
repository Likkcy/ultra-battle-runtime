# Ultra Battle Runtime v2.5.5 Test Report

## Scope

Only the original Grand King encounter plus version documentation was changed. Zetton, Greeza, Five King, Belial and all TV routes retain their v2.5.4 gameplay code.

## Automated checks

- All 8 JavaScript files pass `node --check`.
- BulletSystem internal `this.method()` audit: 232 calls / 240 class methods / 0 missing.
- BattleRuntime internal `this.method()` audit: 200 calls / 204 class methods / 0 missing.
- Battle registry still contains 22 encounter entries.
- The rewritten `runOriginalGrandKingPattern()` contains 0 calls to the former generic Grand King attack pool (`spawnOriginalSweep`, `spawnOriginalOrb`, `spawnOriginalRush`, `spawnGrandKingAdvance`, generic Zagi lightning/shock-ring helpers).

## Authored Grand King rounds

- Phase 1: 12 falling sensor beams; 7 Super Arm throws / 28 debris pieces; 6 Super Destruction Fists / 36 dust waves; 8 falling + 8 rewind sensor beams.
- Phase 2: 14 or 15 wave-barrage fronts depending on the authored round; 14 fast sensor beams; 10 Super Arm throws / 50 debris pieces; 7 Super Destruction Fists / 42 dust waves.
- Phase 3: 7 Grand Laser lock-ons; 17 hard wave-barrage fronts; 9 falling + 9 rewind sensor beams; 8 Super Destruction Fists / 48 dust waves.

## Fairness / interaction checks

- Rewind sensor sequence reproduces the forward color order in exact reverse while travelling upward.
- Grand Laser geometry test: a player bait position aligned with the top-center produces a ray endpoint exactly at the Grand King target and fires the runtime counter-damage callback once.
- Hard wave-barrage safe corridor shifts by at most one lane per 555 ms. At base 252 px/s movement, one lane requires about 427 ms, so the authored corridor is physically reachable without dash mechanics.
- Static-position scan over the full phase-2 and phase-3 barrage scripts found 0 grid positions that can remain stationary for the entire attack.
- ZIP integrity checked after packaging.

## Visual QA limitation

The container Chromium process did not exit reliably under headless screenshot mode, so this report does not claim a full human visual playthrough. Collision geometry and authored timing were tested programmatically.
