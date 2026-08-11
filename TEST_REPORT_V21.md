# UBR v2.1 Cosmos Route Rebuild — Test Report

## Automated checks

- ES Module syntax: PASS (8 / 8 JS files)
- CSS brace balance: PASS
- CSS literal `\\n` contamination: 0
- HTML duplicate IDs: 0
- Static HTTP load: PASS (`index.html`, `BattleRuntime.js`, `main.css`)
- Cosmos registry:
  - Chaos Lidorias: 360 HP, CALM/MERCY route
  - Chaos Ultraman: 620 HP, 3 phases (`COPY -> ECLIPSE BREAK -> CALAMITY`)
  - Chaos Darkness: 780 HP, 3 phases (`HATRED -> NO ANSWER -> MIRACLE LUNA`)
- Runtime smoke:
  - Eclipse unlock / COPY reduction: PASS
  - Calamity rebuild / HP recovery / COPY recovery: PASS
  - Miracle Luna transition: PASS
  - HEART 25 / 50 / 75 / 100 story milestones: PASS
  - Lidorias CALM 28 / 55 / 82 / 100 story milestones: PASS
- Miracle HEART collectible collision: PASS (`12 HEART`, orb removed, collect effect emitted)
- `updateBullets()` Canvas regression: PASS (`ctx.*` count = 0)
- ZIP integrity: checked during packaging

## Manual QA still needed

This environment does not provide reliable Chromium visual QA. Please manually check animation composition, dialogue pacing, projectile readability, and whether the longer story beats feel appropriately spaced in a real browser.
