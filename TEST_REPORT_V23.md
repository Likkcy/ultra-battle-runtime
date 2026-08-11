# Ultra Battle Runtime v2.3 Regression Report

## Scope

Cosmos objective rebuild only, based on v2.2.2. Five supplied Cosmos soundtrack files remain unchanged and keep the v2.2.2 mapping.

## Static checks

- 8 / 8 JavaScript source files pass `node --check`.
- BattleRuntime `this.method()` reference audit: 0 missing class methods.
- Battle registry remains 22 fixed Encounter keys.

## Runtime initialization harness

A DOM/canvas stub harness executes the synchronous startup chain used before long cinematics:

- player form application;
- `renderStatic()`;
- `renderResources()`;
- command availability;
- first player-menu render.

Result: **22 / 22 registered Encounters pass** with the correct enemy and player identity.

This includes the previous regression case:

```text
player=nexus&battle=mephisto-one
→ 黑暗梅菲斯特 / 奈克瑟斯奥特曼
```

## Cosmos focused flow tests

### Chaos Ultraman

Passed assertions:

- initial objective is COPY;
- ATTACK is disabled while COPY is active;
- HP cannot change during COPY;
- COPY 0 transitions to `COPY CORE 3 / 3`;
- ATTACK / SKILL remain disabled during CORE;
- three real `chaosOrderNode` cuts reduce the counter to zero;
- zero CORE transitions to Calamity;
- COPY meter disappears in Calamity;
- HP damage becomes active only in Calamity.

### Eclipse Break bullet test

Passed assertions:

- the objective round spawns three slow `CORE` nodes at its opening beat;
- those nodes use the dedicated objective form;
- while `bossPhase === 1`, Eclipse Z ignores a closer ordinary Chaos projectile and cuts the nearby CORE instead.

### Chaos Darkness

Passed assertions:

- initial objective is ANSWER;
- HP cannot change before Miracle Luna;
- Luna → Corona → Eclipse trials increment ANSWER from 0 / 3 to 3 / 3;
- third trial transitions through NO ANSWER into Miracle Luna;
- ATTACK is disabled in the HEART phase;
- SKILL and ACT remain available;
- enemy HP remains unchanged in HEART phase;
- forced violent damage reduces HEART instead of HP;
- HUD changes to HEART objective.

## Cross-battle contamination test

A shared DOM stub is used to render Chaos Darkness and then immediately create Nexus / Mephisto One on the same stage.

Result: Cosmos `data-cosmos-objective` is removed correctly and does not leak into the Nexus encounter.

## Browser limitation

A real Chromium localhost navigation test was attempted. The execution environment itself redirects localhost navigation to a policy page (`Your organization doesn’t allow you to view this site`), so this report does **not** claim a real visual-browser animation pass. Static HTTP serving works and the runtime harness covers the initialization path that caused the previous global crash.
