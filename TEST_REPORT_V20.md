# v2.0 ORIGINAL / FUTURE ADAPTER — Test Report

## Static structure — PASS

- Battle registry count: **22**.
- Five original-route encounters are registered:
  - `original-zetton` — 960 HP, 2 phases.
  - `original-greeza` — 900 HP, 2 phases.
  - `original-grand-king` — 1120 HP, 2 phases.
  - `original-five-king` — 900 HP, 2 phases.
  - `original-belial` — 1560 HP, 3 phases.
- All five current playable Ultra profiles expose original-route form tables.
- Every profile has at least one ADAPT-gated ultimate/highest state.
- Nexus Noa's original-route skills have no hidden EN cost.
- Every original encounter was instantiated with every currently selectable Ultra profile: **25/25 PASS**.

## Original player system — PASS

- ACT menu exposes form switching only within the selected Ultra's own form table.
- Ultimate/highest form remains locked until `ADAPT == 100`.
- Entering an ultimate/highest form consumes ADAPT; leaving it requires rebuilding ADAPT before re-entry.
- Selecting the current form does not waste a turn or consume the ultimate gauge.
- ADAPT gains from actual damage dealt and actual damage received and clamps at 100.
- Original bosses use phase HP floors based on `Math.floor`, preventing one hit from skipping a phase without recreating the historical soft-lock bug.

## Boss rule runtime — PASS

Direct prototype-level runtime checks:

- Greeza: low EXISTENCE damage = **22**, full EXISTENCE damage = **138** from the same 100-point test hit; damage never becomes zero.
- Grand King: full ARMOR reduces a 100-point test hit to **28** and the hit chips ARMOR.
- Five King: a heavy test hit can destroy the selected module, grants ADAPT, advances the target, and still deals positive main-body damage (**49** in the test).
- Belial: 90 DOMINATION reduces a 100-point test hit to **66** without making the boss invulnerable.
- ADAPT clamp: **100/100 PASS**.

## Bullet runtime smoke — PASS

Each original pattern was forced through early / mid / late segments using a mock Canvas context, then passed through `runPattern -> updateBullets -> draw`.

- `original_zetton`: PASS — normal Zetton + Hyper Zetton phase.
- `original_greeza`: PASS — both phases.
- `original_grand_king`: PASS — both phases.
- `original_five_king`: PASS — both phases.
- `original_belial`: PASS — all three phases.

`updateBullets()` brace-isolated body contains **0 `ctx.*` calls**, guarding against the previous blank-BattleBox regression caused by drawing code leaking into physics updates.

## Syntax / asset / package preparation — PASS

- ES-module syntax: **8/8 JS files PASS**.
- CSS parse: **0 errors**.
- HTML duplicate IDs: **0**.
- Static HTTP smoke:
  - `/` — 200
  - `/src/main.js` — 200
  - `/src/data/battles.js` — 200
  - `/src/data/players.js` — 200
  - `/src/engine/BattleRuntime.js` — 200
  - `/src/engine/BulletSystem.js` — 200
  - `/styles/main.css` — 200

Human play-testing remains the authority for difficulty, telegraph readability, form balance, and audiovisual pacing. Automated Chromium visual QA is **not claimed** for this build.
