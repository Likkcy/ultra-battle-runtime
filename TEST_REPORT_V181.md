# v1.8.1 Regression Fix

- Fixed a browser-module syntax error introduced in v1.8: Cosmos intro `await` calls were accidentally inserted inside the synchronous `onNexusShot` callback. In browsers this prevented the ES module from loading at all, leaving only the static default Golza HTML visible and making the whole UI appear frozen.
- Moved Cosmos intro cinematics into the async `start()` encounter dispatch where they belong.
- Removed an accidental Cosmos phase-HP mutation from `renderChoiceMenu`; opening a menu must never heal/lock a boss to a phase threshold. Phase gating remains in the actual damage-resolution path.
- Checked every source file as an ES module (`.mjs` syntax mode), not only CommonJS `node --check`.
- Static HTTP loading verified.
