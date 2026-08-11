# TEST REPORT — v2.5.1

## Scope lock

Compared with the v2.5 work backup taken before this pass, gameplay changes are limited to:

- `src/engine/BulletSystem.js`
- `src/engine/BattleRuntime.js`
- `styles/main.css`

Other gameplay data/configs were not edited in the Zetton/Greeza pass. Documentation/version markers are updated separately.

## Static checks

- 8 / 8 JavaScript files: `node --check` PASS.
- BattleRuntime internal `this.method()` audit: 0 missing definitions.
- BulletSystem internal `this.method()` audit: 0 missing definitions.

## Chromium startup regression

Using the real `index.html` DOM with module code injected into a Chromium `page.set_content` harness:

- 22 / 22 registered encounters reached `PLAYER_MENU`.
- 0 page JavaScript exceptions.

Long story cinematics/music were stubbed in this harness; actual bind/render/resource/menu initialization remained real.

## Zetton fairness / pattern tests

Two arena aspect ratios were tested: 860×326 and 326×860.

- 4 authored guard scores × both aspect ratios.
- 10 impacts per guard score.
- Minimum computed adjacent impact separation: >= 700 ms.
- Direction/timing generation uses no random side selection in the Zetton authored scores.
- Third-turn free-movement phase generated only `zettonBlinkStrike` and `zettonFireballBurst`.
- Hyper turn 1: afterimage strike family only.
- Hyper turn 2: target-lock fireball family only.
- Hyper turn 3: deliberate afterimage + fireball alternation.
- Stored beam path generated a separate `zettonReturnBeam`.

## Greeza pattern tests

- First form: generated only `greezaThunderSmash`; 5 fixed-timing strikes in the tested score.
- Second-form turn 1: vortex only.
- Second-form turn 2: centre core + coloured soundwave only.
- Second-form turn 3: dark lightning only.
- Second-form turn 4: double helix only.
- Final-form odd score: wave cannon only.
- Final-form even score: chest rain only.
- Sound ring collision rule: blue+moving=hit, blue+still=safe, orange+moving=safe, orange+still=hit.
- Custom telegraph and active drawing smoke passed for Zetton rush/fireball, Greeza thunder/vortex/sound/helix/wave cannon/rain, and Zetton return beam.

## Environment limit

This report validates timing structure, collision rules, pattern vocabulary, render calls, and runtime startup. It does not claim a complete human no-hit playthrough inside the execution environment.
