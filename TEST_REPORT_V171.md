# v1.7.1 Test Report

Regression targets:

- Leo profile HP is 128.
- Mephisto Zwei phase gate `.58 * 382` floors to 221 HP, and `221 / 382 <= .58`.
- Dark Zagi gates floor below `.76`, `.50`, and `.24`, so no phase can remain stuck just above its threshold.
- Zagi Shock Ring now owns two opposite angular safe sectors. Collision ignores players inside either safe sector.
- Shock Ring telegraph and active rendering both draw the broken sectors.
- All JavaScript files pass `node --check`.

Runtime checks completed:

- `V171_NEXUS_PHASE_GATES_PASS`
- `V171_ZAGI_BROKEN_RING_PASS`
- `STATIC_HTTP_PASS`
- all files under `src/` passed `node --check`.
