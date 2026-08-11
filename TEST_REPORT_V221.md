# Ultra Battle Runtime v2.2.1 Regression Report

## Root cause fixed
v2.1 Cosmos rewrite accidentally removed four pre-existing Tiga helper methods from `BattleRuntime`:
- `tigaGatanothorFinaleActive()`
- `getTigaGlitterSkills()`
- `getTigaGlitterActions()`
- `applyTigaEncounterDamage()`

`renderCommandAvailability()` calls `tigaGatanothorFinaleActive()` for every encounter. As a result, every battle failed during startup. Nexus encounters exposed the failure particularly clearly because `applyNexusForm()` changes the form label before the runtime reaches `renderStatic()`, leaving the static Golza/Tiga placeholder visible with the Nexus form label.

## Architecture correction
Removed the v2.2 runtime-owned `继续高斯路线` progression button. Route progression remains owned by the card / UBR Bridge. UBR receives a fixed `battleId`, executes that registered encounter, and returns its result.

## Regression checks
- All JavaScript files pass syntax validation.
- Static class-call audit reports zero missing `this.method()` implementations in `BattleRuntime`.
- All 22 registered encounter keys complete startup initialization without page errors in the browser harness.
- Exact check: `?player=nexus&battle=mephisto-one` initializes `黑暗梅菲斯特 / 奈克瑟斯奥特曼 / mephisto-one` rather than the static Golza placeholder.
