# Ultra Battle Runtime v2.7.2 — targeted test report

## Scope
Belial claw / jaw attack only. Baseline: v2.7.1.

## Checks
- `node --check` passed for every JavaScript file under `src/`.
- Claw sequence smoke-tested at boost 0 / 1 / 2.
- Verified cycle counts: 5 / 6 / 7.
- Verified claws are visible in a non-zero ready pose at t=0 and the first warning window is 1900 ms.
- Verified all generated gap centers remain within 34%–66% of arena width, inside the actual narrowed movement corridor.
- Verified standing in the active gap does not damage the player during full closure.
- Verified standing outside the gap does damage the player during closure.
- Timeline audit: phase-1 claw sequence ends ~280 ms before the player turn; phase-2 ~290 ms; phase-3 ends ~260 ms before the Deathcium follow-up starts.

## Browser limitation
No claim of full manual Chromium playthrough in this environment; gameplay feel remains for local validation.
