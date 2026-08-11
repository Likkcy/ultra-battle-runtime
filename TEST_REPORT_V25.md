# TEST REPORT — v2.5

## Static checks

- `node --check`: 8 / 8 JavaScript files passed.
- BattleRuntime `this.method()` audit: 0 missing method definitions.
- BulletSystem `this.method()` audit: 0 missing method definitions.
- Battle registry: 22 encounter keys, identical key set to v2.4.1.
- Visible original-route lore grep: no `LIGHT ARCHIVE / FUTURE ADAPTER / 适配试炼 / 训练记录 / 标准答案 / 接入记录` strings remain in runtime UI/config.

## Browser initialization harness

Chromium was run with the real `index.html` DOM and a locally concatenated module harness (direct localhost navigation is blocked by the environment policy).

- 22 / 22 registered encounters reached `PLAYER_MENU` without JavaScript exceptions.
- Specific previous regression case `mephisto-one` rendered `黑暗梅菲斯特 / 奈克瑟斯奥特曼 / 幼年形态` correctly.
- Original 5 encounters × all 5 player profiles (`tiga / leo / nexus / ginga / cosmos`): 25 / 25 reached `PLAYER_MENU`.
- Original ADAPT row computed style under `data-original=true`: `display: none`.

## Original boss logic smoke tests

### Zetton / Hyper Zetton

- Zetton phase generated directional guard waves/fireballs.
- Hyper phase generated free-movement rush/orb/sweep families.
- Stored high-output beam return path remained active.

### Greeza

- First form: three tested player hits returned `0` damage / `MISS`, then switched to second form.
- Second form: tested normal-hit cadence `50, 50, 0` (third light hit dodged).
- Final form: tested direct damage remains tangible.
- Pattern smoke passed for phases 0 / 1 / 2.

### Grand King

- Damage penetration test from base 100: phase 0 = 40, phase 1 = 76, phase 2 = 110.
- `grandKingAdvance` physically pushed the player below the advancing front.
- Pattern smoke passed for phases 0 / 1 / 2.

### Five King

- Module break test: live module count 5 → 4 and selected module HP reached 0.
- Enemy patterns were generated only from live module families.
- Visual QA confirmed wings/arms/head states visibly dim or collapse when marked off.

### Belial

Battlenizer collision rule unit test:

```text
blue + moving  = hit
blue + still   = safe
orange + moving = safe
orange + still  = hit
```

Pattern smoke passed for duel / monster-army / last-duel phases.

## Tiga / Cosmos regression checks

- Gatanothor revival code sets `enemy.hp = enemy.maxHp` at the moment Glitter Tiga becomes active.
- Cosmos base HP: 120 / 120.
- Miracle Luna transformation raises max HP to at least 156 and refills HP/energy.
- Miracle Luna field-clear test removed all normal Chaos bullet types plus `chaosPanel`, `chaosProminence`, `chaosBrokenHalo`, and `chaosAssimilation`, including a delayed/telegraphing wall.
- 1000 generated Chaos impedance walls were checked: horizontal walls always placed the safe gap on the canvas-height axis; vertical walls always placed it on the canvas-width axis.
- 1000 final-fight horizontal wall gaps stayed within canvas height.

## Visual model QA

Chromium `page.set_content` snapshots were rendered for:

- Zetton
- Hyper Zetton
- Greeza first / second / final forms
- Grand King
- Five King
- Belial

Five King was additionally rendered with successive parts disabled to verify visual disassembly. Belial was checked after the shoulder/arm attachment correction and Greeza final after the absorbed-organ additions.

## Environment limitation

Direct browser navigation to localhost/file URLs is blocked by the execution environment administrator. Therefore this report does **not** claim a complete human playthrough of every phase. Runtime initialization, state rules, collision rules, pattern generation and DOM/CSS model rendering were tested separately as described above.
