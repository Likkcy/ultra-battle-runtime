# TEST REPORT — v2.5.2

## Scope lock

Gameplay changes compared with v2.5.1 are limited to:

- `src/engine/BulletSystem.js`
- `src/data/battles.js` (phase durations only)

Grand King, Five King, Belial, Bridge/runtime sequencing, player data, audio, and official-route combat logic are unchanged.

## Static checks

- All JavaScript files: `node --check` PASS.
- `BattleRuntime.js` internal method-call audit: 0 missing definitions.
- `BulletSystem.js` internal method-call audit: 0 missing definitions.

## Zetton timing tests

Tested at 860×326 and 326×860:

- 4 authored guard scores × 24 impacts each.
- Direction/timing selection: no RNG.
- Minimum adjacent computed impact separation: 260 ms.
- Last guard impact lands at ~8.56–8.59 s inside the 9.6 s round.
- Free-movement Zetton phrase: 7 teleport rushes + 7 lock-on fireballs.
- Hyper phrase A: 16 teleport/afterimage rushes.
- Hyper phrase B: 15 lock-on fireballs.
- Hyper phrase C: 10 rushes + 9 fireballs.

The test guarantees authored non-simultaneous impact times; it does not claim a human no-hit clear.

## Greeza density / fairness tests

- First form: 15 `greezaThunderSmash` hazards per round.
- Second form vortex: 6 moving vortices. Sampled 9-second paths travel roughly 258–378 px horizontally and 91–130 px vertically on an 860×326 arena, rather than the old ~18 px wobble.
- Second form evil sound: 12 coloured rings + centre source.
- Second form dark lightning: 16 total thunder hazards including staggered chains.
- Second form double spiral: 4 helix hazards.
- Final wave-cannon round: 8 paired volleys = 16 cannon beams. Grid sampling confirms large valid safe regions for every pair.
- Final light-bullet rain: 16 rows × 9 dangerous lanes = 144 shots. Rows are 520 ms apart; the authored two-lane safe corridor shifts by at most one lane per row. At base movement speed, one lane can be crossed before the next row.

## Environment limit

Headless Chromium navigation did not complete in this container, so this report does not claim a full visual/manual playthrough. Pattern generation, timing geometry, movement feasibility, syntax, and internal method integrity were tested directly.
