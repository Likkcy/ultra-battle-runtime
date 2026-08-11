# TEST REPORT — v2.5.3

Scope: Zetton ricochet arrows + supplied soundtrack only.

## Static / syntax

- All project JavaScript files pass `node --check`.
- `original_zetton_battle.ogg` decodes from start to end with ffmpeg without errors.
- SoundSystem contains one `original_zetton_battle` definition and BattleRuntime starts it only for `original_zetton`.
- No phase-change code restarts this track, so Zetton -> Hyper Zetton preserves playback position.

## Ricochet rule

- Authored reverse beat first spawns from its declared/original side.
- Successful first guard spawns exactly one return projectile from the opposite side.
- Missing the first guard does not spawn a return projectile.
- Return projectile is marked terminal and cannot ricochet again.
- Return cue uses a short yellow edge telegraph followed by a fast normalized trip to centre.

## Deterministic score safety

- Reverse beats add 360ms of authored-score padding to every later beat.
- Return impact occurs about 310ms after the successful first block at telegraphScale 1.
- Timeline audit covers all four authored guard variants; no return input is intentionally scheduled on the same frame as the next authored input.
- First Zetton phase duration increased to 11200ms so all authored inputs fit inside the enemy turn.

## Non-scope

- No Greeza, Grand King, Five King, Belial, Cosmos, Tiga, Nexus, Leo, or Ginga gameplay changes in this pass.
