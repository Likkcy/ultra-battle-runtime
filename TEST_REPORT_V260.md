# Ultra Battle Runtime v2.6.0 Test Report

## Scope

- Original Grand King EN sustain
- Original Five King full five-part enemy-turn rebuild

## Static / runtime checks

- All JavaScript sources pass `node --check`.
- Five King custom hazard families execute through generation, update, collision and Canvas draw smoke tests without runtime exceptions.
- Base Five King rotation produces five distinct turn families: ultrasound echo / two-row lasers / windmill barrage / free-fall debris / freeze-fire cover.
- Max-boost single-part tests also execute for all five families.
- Five King implementation no longer calls the generic original Orb/Rush/Wall/Sweep helpers from its enemy-turn routine.
- Reicubas fire-ray cover test: an ice block between emitter and player stops the entire firing window and melts; the same shot without cover damages the player.
- Windmill safety sampling retains broad navigable space at boost levels 0–4 while its radial projectile positions continuously flow outward, preventing fixed-radius camping.
- Stationary-pressure smoke test confirms every Five King body-part family can threaten a stationary player; Melba debris lanes shift between waves so there is no permanent fixed lane.
- Grand King supply logic is capped at five deliveries and defers a delivery while EN is too close to maximum.

## Manual QA note

The current execution environment does not substitute for a full human playthrough. Final rhythm, readability, and difficulty should still be judged in the local browser build.
