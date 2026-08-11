# TEST REPORT v2.6.3

- Five King chest boost-4 now spawns 5 total spiral arms instead of the previous accidental 2 layers × 5 arms = 10 arms.
- Direction split checked: 3 clockwise / 2 counter-clockwise, with per-arm angular-speed offsets.
- Max-boost attack now has 620ms telegraph + 900ms progressive unfurl; inactive unrevealed beads are skipped by both collision and renderer.
- Lower chest boost levels are untouched.
- All JavaScript files pass `node --check`.
- Archive integrity checked after packaging.
