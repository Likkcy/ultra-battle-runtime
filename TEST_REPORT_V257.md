# Ultra Battle Runtime v2.5.7 Test Report

## Regression target

Reproduced the reported sequence: Original Grand King infrared-sensor round renders normally, then the next round spawns `grandThrowArm`. In v2.5.5 the first draw of that hazard throws `ReferenceError: activeAge is not defined`, stopping the animation frame chain and leaving the arena blank.

## Fix

`drawHazard()` now defines `activeAge = bullet.activeAge` once alongside `age`. The fix covers all Grand King rendering branches that referenced the same variable.

## Checks

- All JavaScript files pass `node --check`.
- Direct update + Canvas draw smoke test passed for: `grandSensorBeam`, `grandThrowArm`, `grandDebris`, `grandFist`, `grandDustWave`, `grandBarrageCannons`, `grandBarrageWave`, `grandLaserHole`.
- v2.5.6 sensor-duration workaround is not present; gameplay is based on v2.5.5.
- ZIP integrity check passes.
