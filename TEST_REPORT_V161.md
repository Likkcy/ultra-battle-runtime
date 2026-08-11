# v1.6.1 Test Report

- Fixed Pressure phase-3 Z/Enter/Space freeze: `drawEffects()` now defines `dpr` before drawing `pressureMantle` / `pressureReflect`.
- Black End phase 0 and phase 2 pattern generation smoke-tested.
- New Black End attacks: horn cage, black flame rain, black disc volley.
- Post-hostage Black End starts at <=36% HP with 62% HORN GUARD and berserk rage.
- Black Crystal finisher requires HORN GUARD <=2% and HP <=12%.
- Four Leo audio assets are bundled and wired to their encounters / ending summary.

Runtime smoke results:

```text
PRESSURE_Z_DRAW_PASS
BLACK_END_PHASE 0 blackEndCharge,blackEndDisc,blackFlame
BLACK_END_PHASE 2 blackEndCharge,blackEndDisc,blackFlame
BLACK_END_PATTERN_PASS
JS_ALL_PASS
STATIC_HTTP_PASS
```

Audio asset durations were also probed successfully:
- Leo ending: ~191.24 s
- Black End battle: ~247.20 s
- Giras trio: ~178.49 s
- Pressure: ~97.99 s
