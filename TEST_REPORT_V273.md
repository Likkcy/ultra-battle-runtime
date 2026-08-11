# Ultra Battle Runtime v2.7.3 — Test Report

## Scope
Belial-only correction pass based on v2.7.2 and the user-supplied 29.03s phase-three reference video. No Zetton / Greeza / Grand King / Five King gameplay changes.

## Static checks
- Every JavaScript file under `src/` passes `node --check`.
- ZIP/package integrity checked after packaging.

## Runtime smoke
- 5 regular Belial patterns × 3 phases executed through spawn → update/collision → Canvas draw with a mocked 860×326 canvas. Result: `BELIAL_273_SMOKE_OK`.
- Galaxy special: 19,000ms full smoke.
- Rebuilt phase-three special: 22,000ms full smoke.

## Battlenizer crescent regression
- Phase 2 (bossPhase=1) turn-3 crescent is spawned around 10.44s of a 12.4s round, leaving the full ~1.9s hazard life before stop.
- Phase 3 (bossPhase=2) turn-3 crescent is spawned around 11.44s of a 13.4s round.
- Z action was injected inside the actual guard window in both phases; each produced exactly one `onBelialGuard` callback.
- The old phase-2 schedule (~0.7s before round end) no longer exists.

## Phase-three shooting safety audit
A 31×13 arena grid was sampled every 80ms through the phase-three shooting portions of both the dedicated shooting round and mixed-shooting round. Reachability was propagated from the player's normal start point with one-grid-step movement per sample.
- Dedicated shooting round: no reachable-path collapse.
- Mixed shooting round: no reachable-path collapse.
- Minimum sampled safe grid cells: 383/403; minimum reachable cells from the propagated route: 5.

## Phase-three special safety audit
The same 31×13 / 80ms reachability audit was run across the rebuilt 22s special round, including the final diagonal Descium active window.
- No sampled time slice eliminated all reachable positions.
- Minimum sampled safe grid cells: 364/403.
- Minimum propagated reachable cells: 5.

## Visual-source grounding
The supplied 29.03s video was sampled at 1fps and used as the basis for the rebuilt sequence. The implemented order follows the visible progression of: dark entrance → red/purple large edge emblems → blue diagonal emblem bands → purple crossing bands → red radial/flower-like expansion → blue/purple pressure → bright white shard field → one large diagonal beam.

## Limitation
Container Chromium still does not complete local headless navigation reliably in this environment, so no claim is made that a full manual browser playthrough was performed here. Runtime/draw paths and geometry were exercised programmatically; final feel remains a local-playtest item.
