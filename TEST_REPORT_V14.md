# UBR v1.4 Test Report

## Scope

Galaxy route second and third fights were fully redesigned after v1.3 was rejected for mechanics that manipulated UI without enough connection to the enemies.

Active Galaxy route:

1. Thunder Darambia — Ultra Live / circuit grounding / Plasma conduct.
2. Super Grand King — exterior siege / Misuzu consciousness rescue / armor break / ally cover.
3. Dark Lugiel — actual battlefield time stop / FUTURE marking / future-self movement / future anchors.

`dark-ultra-brothers` is no longer present in the active battle registry or battle catalog.

## Automated checks

- All JavaScript files: `node --check` PASS.
- Battle registry import: PASS.
- Active encounter count: 11.
- Super Grand King memory pickup -> carry -> delivery: PASS.
- Memory delivery still works after the pickup object itself is removed: PASS.
- Taking a hit while carrying memory drops it back into the arena: PASS.
- Ally support signal grants exactly one cover charge: PASS.
- Cover absorbs the next hit: PASS.
- Ally signal spawn cap counts spawned signals, so missed signals cannot generate an infinite stream: PASS.
- Super Grand King phase-0 armor floor: PASS.
- Super Grand King phase-1 damage restoration: PASS.
- Memory Sweep / Grand Beam / Grand Shock telegraph, collision and draw smoke: PASS.
- Dark Lugiel stasis start/end state callbacks: PASS.
- Frozen stasis shard FUTURE marking: PASS.
- Marked shard reverses after time resumes: PASS.
- Returning shard invokes counter-damage callback: PASS.
- Lugiel lance stops progressing and cannot damage during time stop: PASS.
- Future anchor sequence respects already-awakened route progress across rounds: PASS.
- Future spark touching anchor awakens it: PASS.
- Phase-3 damage floor prevents killing Dark Lugiel before all future anchors are awakened: PASS.
- `stop()` clears time-stop visual state: PASS.
- All 11 active encounters / all declared phases run one pattern-generation + draw smoke pass: PASS.
- Static HTTP root load: PASS.

Smoke outputs:

- `V14_RUNTIME_SMOKE_PASS`
- `V14_RUNTIME_RULES_PASS`
- `V14_ALL_ACTIVE_PATTERN_DRAW_PASS 11`
- `STATIC_HTTP_PASS`

## Browser automation limitation

Headless Chromium was attempted again, but the container Chromium process stalled on the same system D-Bus / headless environment problem and timed out before producing a screenshot. No claim is made that automated visual/browser QA passed.

Manual play-testing is still required for animation timing, difficulty, readability and game feel.
