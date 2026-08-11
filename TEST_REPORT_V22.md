> **Superseded by v2.2.1:** this report only validated syntax/static structure and missed a runtime startup regression inherited from v2.1. See `TEST_REPORT_V221.md` for the corrected functional regression pass.

# UBR v2.2 Cosmos Continuity / Set-piece Upgrade — Test Report

## Automated checks

- ES Module syntax: PASS (8 / 8 JS files)
- CSS brace balance: PASS
- CSS parse: PASS (0 top-level parse errors)
- CSS literal `\\n` contamination: 0
- HTML duplicate IDs: 0
- Static HTTP load: PASS (`index.html`)
- Cosmos registry: PASS
  - Chaos Lidorias: 360 HP
  - Chaos Ultraman: 620 HP
  - Chaos Darkness: 780 HP
- Cosmos cinematic scene coverage: PASS (all `setCosmosVision()` scene IDs have CSS selectors)
- v2.2 scene coverage: PASS
  - Lidorias memory carried into Chaos Ultraman
  - Calamity learning / collapse / reconstruction
  - Chaos Darkness learning archive
  - Luna / Corona / Eclipse NO ANSWER beats
  - Miracle Luna open-hands shot
  - Three-stage shell peel
- Canonical result-route plumbing: PASS
  - Chaos Lidorias requires `MERCY` before offering Chaos Ultraman
  - Chaos Ultraman `VICTORY` offers Chaos Darkness
  - `startBattle()` clears stale route-button state
- ZIP integrity: checked during packaging

## Visual QA note

A Chromium visual pass was attempted in the working environment, but browser navigation is blocked by the environment administrator (`ERR_BLOCKED_BY_ADMINISTRATOR`). Static serving and code-level checks pass; final animation composition should still receive a manual browser play-test on the target machine.

## Intentionally unchanged

- Cosmos route BGM remains deferred.
- Existing v2.1 battle gauges, core controls and three-battle skeleton remain the baseline.
- Original route and unrelated battle routes were not part of this pass.
