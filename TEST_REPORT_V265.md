# TEST REPORT v2.6.5

- Baseline: v2.6.4.
- Five King chest helper audit: no spiral, breathe, contract, classicFinal, unfurl, radialPeriod, or counter-rotating layer code remains in the chest attack block.
- `spawnFiveWindmill(boost)` for boost 0..4 always creates exactly 1 layer and 4 arms.
- Windmill speed progression: 0.62, 0.78, 0.96, 1.14, 1.34 rad/s before turn-direction sign.
- Falling light begins at boost 1 and becomes denser through boost 4.
- All JavaScript files pass `node --check`.
- ZIP integrity checked after packaging.
