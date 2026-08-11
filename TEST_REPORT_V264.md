# TEST REPORT v2.6.4

## Scope
Five King chest max-boost only. Other Five King organs and other encounters were not intentionally changed.

## Changes checked
- Boost 4 chest creates one four-arm straight windmill (no spiral/counter-rotating layers).
- Max-boost windmill angular speed is higher than the normal chest windmill.
- Max-boost chest schedules independent randomized falling light projectiles.
- Falling projectiles use normal moving-bullet collision and leave the arena naturally.
- Boost 0–3 chest code path remains the existing spiral progression.

## Static checks
- All JavaScript files pass `node --check`.
- ZIP integrity checked after packaging.
