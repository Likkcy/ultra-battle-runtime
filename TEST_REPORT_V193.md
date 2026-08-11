# v1.9.3 Test Report

Focused rebuild:

- Reconstructed Ren sunset opening as a dedicated self-contained scene; old Nexus legacy layers are forcibly hidden during `ren-*` scenes.
- Reconstructed Mizorogi assistance around TV Episode 32 structure: light gathers -> original Dark Mephisto (white eyes) returns -> blocks/fights red-eyed Mephisto Zwei -> is wounded -> restrains Zwei -> Nexus finishes -> human Mizorogi remains for the final line.
- Removed the v1.9.2 "human Mizorogi casting the assist light" presentation.
- Rebuilt Mephisto I finale with explicit giant bodies, beam clash, explosion, Nexus charge, visible punch, grapple, core bloom, and long whiteout.
- Sanitized 77 literal `\\n` escape fragments accidentally embedded in the CSS by an older patch; these could corrupt selector parsing/visual layout in browsers.

Validation:

- All JS files checked as ES modules.
- CSS parsed with zero parser errors.
- HTML has no duplicate IDs.
- Every new cinematic scene name used by BattleRuntime has a corresponding CSS state selector.
- Static HTTP returns index.html and the core JS/CSS assets.
- Chromium visual automation is still not considered reliable in this container because the process stalls on D-Bus, so final composition needs manual browser play-testing.
