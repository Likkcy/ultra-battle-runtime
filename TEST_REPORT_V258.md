# Ultra Battle Runtime v2.5.8 Test Report

## Scope
- Grand King soundtrack integration only.
- Grand King infrared sensor beam pacing only.

## Timing assertions
- Phase 1 normal sensor: 12 beams at 700ms spacing; round 11.0s.
- Phase 1 rewind sensor: 8 down + 8 rewind beams at 700ms / 640ms spacing; round 14.0s.
- Phase 2 hard sensor: 14 beams at 600ms spacing; existing 11.2s phase duration retained.
- Phase 3 hard rewind sensor: 9 down + 9 rewind beams at 600ms / 560ms spacing; round 13.6s.
- Non-sensor Grand King round durations are unchanged.

## Audio
- `original_grand_king_battle.ogg` is mapped through SoundSystem and starts only for `original_grand_king`.
- Phase transitions do not restart the track.
