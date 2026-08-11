# Ultra Battle Runtime v2.4.1 — Text Merge Verification

- Source code baseline: v2.4.
- User text sheet baseline: v2.3.1, stable IDs retained.
- Applied modified rows only from TIGA / COSMOS / NEXUS / LEO / GINGA.
- Applied: 563 entries (142 / 120 / 103 / 35 / 163).
- ORIG / PLAYER / COMMON / BULLET / SHARED / UI rows from the sheet were not merged.
- One edited sheet row had its “current text” cell altered (TIGA-0229); replacement used the untouched v2.3.1 source baseline and the user’s desired text.
- Every patch was resolved by ID + original file + original line mapping against v2.3.1, then mapped to the unchanged corresponding line in v2.4. No global string replacement was used.
- 8/8 JavaScript files pass `node --check`.
- Battle registry imports successfully with 22 encounters.
