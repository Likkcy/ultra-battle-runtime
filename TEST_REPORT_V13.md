# v1.3 Test Report

Validated before packaging:

- JavaScript syntax check for every file under `src/`.
- ESM import checks for player/battle data and runtime modules.
- Ginga route data:
  - Dark Ultra Brothers registered and requires Ginga.
  - Dark Lugiel registered and requires Ginga.
  - Thunder Darambia / Ultraman / Ultraseven Ultra Live forms available to the showcase encounters.
- Dark Ultra Brothers:
  - Four command-sign objects spawn per trial.
  - Correct REAL-sign scan triggers verification.
  - Wrong-sign scan triggers false-sign callback.
  - Phase patterns spawn/render in both phases.
- Dark Lugiel:
  - Frozen commands/forms persist as reclaimable crystals on later turns.
  - Thunder Darambia pulse can thaw two nearby crystals.
  - Up to eight simultaneous freeze crystals are laid out inside the visible arena.
  - If all four main commands remain frozen, ATTACK is restored as a soft-lock lifeline while the other commands stay frozen.
  - Time-stop band has a tested real safe corridor; the safe center does not damage the player, the stopped zone does.
  - All three phase patterns spawn/render.
- Static HTTP serving and direct-query retrieval:
  - `?player=ginga&battle=dark-ultra-brothers`
  - `?player=ginga&battle=dark-lugiel`

Runtime smoke result: `V13_RUNTIME_SMOKE_PASS`.
Freeze-layout regression: `V13_FREEZE_GRID_PASS`.
Static HTTP result: `STATIC_HTTP_PASS`.

A Chromium headless visual run was attempted, but the container Chromium process stalled on its system D-Bus/sandbox environment and timed out. Visual feel, timing, readability, and balance still require human browser play-testing.
