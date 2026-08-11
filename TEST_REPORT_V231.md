# Ultra Battle Runtime v2.3.1 Regression Report

Scope: three user-reported Cosmos issues only.

## Changes verified

- Cosmos story subtitles no longer add a Cosmos-only black background/backdrop-filter.
- Chaos Prominence sweep contains a 118px-equivalent safe gap with matching telegraph, collision, and active rendering.
- Miracle Luna HEART values are reduced; Chaos Darkness enemy stats and battle data are unchanged.

## Static regression

- All JavaScript files pass `node --check`.
- `src/data/battles.js`, `src/data/players.js`, `src/main.js`, `src/engine/SoundSystem.js`, and Bridge/integration files are byte-identical to v2.3.
- The five supplied Cosmos music assets are byte-identical to v2.3.
- Runtime gameplay edits are limited to `BattleRuntime.js`, `BulletSystem.js`, and the Cosmos subtitle CSS rule in `main.css`.
