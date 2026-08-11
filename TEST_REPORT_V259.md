# Ultra Battle Runtime v2.5.9 Test Report

## Scope

Only the Grand King infrared sensor orange/blue movement recognition was changed from v2.5.8.

## Colour-rule unit checks

Synthetic collision checks against `grandSensorBeam`:

- orange + stationary: damage = 1 (expected)
- orange + actual movement this frame: damage = 0 (expected)
- orange + movement ended within 120ms grace: damage = 0 (expected)
- orange + grace expired: damage = 1 (expected)
- blue + actual movement: damage = 1 (expected)
- blue + stationary: damage = 0 (expected)

## Actual-motion tracking

- Normal WASD movement produces `playerMovingThisFrame = true`.
- Holding a direction against the arena boundary with zero actual displacement produces `playerMovingThisFrame = false`.

## Static checks

All project JavaScript files pass `node --check`.
