# v1.6 Test Report — Leo Route Rebuild

Validated before packaging:

- JavaScript syntax check passed for every file under `src/`.
- Battle registry contains 13 encounters and correctly registers:
  - `giras-brothers`
  - `pressure`
  - `black-end`
- Giras trio config uses the rebuilt `leo_giras_rework` encounter/pattern and `GIRAS SPIN` formation system.
- Pressure config enters a real `one-inch-leo` phase and keeps the King recovery phase manual (`threshold: 0`).
- Pressure tiny-state runtime uses a real reduced player collision radius (`2.8` vs normal `7.1`).
- Pressure phase 2 mantle reflection callback was exercised successfully in the BulletSystem smoke test.
- Black End config keeps hostage/crystal phases manual and runs a six-step children sequence.
- The Black Directive crystal exists as a real one-use battle item (`blackCrystal`).
- Black End horn-charge counter callback was exercised successfully in the BulletSystem smoke test.
- Dedicated Leo cinematic DOM exists for Toru run, Pressure/King, hostage/children/crystal, and departure scenes.
- Ending title is `向太阳出发`.
- Static HTTP loading passed for index, BattleRuntime, BulletSystem, battles data, CSS, and Leo route docs.

Runtime smoke result:

`LEO_BULLET_RUNTIME_SMOKE_PASS { reflects: 1, counters: 1, hits: 1 }`

Config smoke result:

`LEO_V16_CONFIG_PASS 13`

Visual/browser automation was not treated as final visual QA. Animation pacing and game feel still require human play-testing.
