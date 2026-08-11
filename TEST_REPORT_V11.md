# v1.1 Test Report

Validated before packaging:

- JavaScript syntax check for every file under `src/`.
- Nexus life-cycle unit smoke test:
  - base drain: 0.55 HP/s;
  - Meta Field drain multiplier applied;
  - damage-to-life recovery applied;
  - HP skill costs preserve at least 1 HP.
- Pedoleon interaction smoke test:
  - feeding cell can be severed with Nexus slash;
  - severing lowers PREDATION;
  - missed feeding cell raises PREDATION and triggers feed callback;
  - Pedoleon pattern produces hazards.
- Static HTTP load test for `index.html` and `battles.js`.

Human play-testing is still required for difficulty, feel, text pacing, and visual polish.
