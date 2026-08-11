# ORIGINAL / FUTURE ADAPTER — v2.4 COMBAT REBUILD

This pass keeps the v2.0 premise, player-selection boundary and ADAPT system, but rebuilds the five Archive trials so they are no longer five variants of the same dodge-and-DPS loop.

## Design rule

Each trial must ask a different question and must change what the player does during both halves of a turn.

- Player turn is not always "deal the most damage".
- Enemy turn is not always "survive a denser barrage".
- The boss's identity determines the interaction rule.
- A failed attempt should teach the rule rather than merely cost HP.
- The card / Bridge still owns route progression. UBR only runs the selected Encounter.

## Trial 1 — Zetton -> Hyper Zetton

### Question
Can the player stop giving a learning opponent the same answer?

### Rule
Zetton now has a visible `READ` meter in addition to attack-class memory.

- First use of an attack class gives Zetton a partial read.
- Repeating the same class sharply raises READ and the repeated attack is almost completely adapted.
- Switching between physical and energy attacks collapses part of the read and produces a strong BREAK bonus.
- ACT `打乱运算` clears both the current learned class and READ.
- Switching Ultra forms also breaks the immediate read, but does not replace the need to vary attacks.

The enemy turn is generated from what Zetton currently learned:

- If it learned energy attacks, its response centers on return beams and barrier lanes.
- If it learned physical attacks, its response centers on teleport rushes and intercept movement.
- High READ makes that chosen counter pattern more aggressive.
- Hyper Zetton keeps the same rule but combines the learned counter with a second high-speed attack family.

The transformation at 50% HP remains mandatory.

## Trial 2 — Greeza

### Question
Can the player define a target that is not occupying a stable coordinate?

### Rule
EXISTENCE remains the damage gate, but floating pickup spam is removed as the main mechanic.

Each enemy turn creates a three-point coordinate solution:

`1 -> 2 -> 3`

The player must physically pass through the numbered anchors in order.

- Correct anchors add EXISTENCE.
- Completing all three closes a triangle and gives a large EXISTENCE gain.
- Touching a later number early does not delete the run, but gives a small penalty and leaves the expected number unchanged.
- Phase 2 can move the anchor points and can present a second triangulation attempt in the same enemy turn.
- ACT `锁定坐标` gives a small EXISTENCE gain and improves the next telegraph, but cannot replace the movement puzzle.

At full EXISTENCE, Greeza becomes a real damage target for a short burst. A substantial hit knocks it out of alignment again.

## Trial 3 — Grand King

### Question
Can the player dismantle a fortress while the fortress is physically taking away the battlefield?

### Rule
Blind attacks no longer chip ARMOR.

The enemy turn creates an actual advancing fortress front inside the Battle Box.

- The front moves downward and compresses the usable arena.
- Glowing armor seams travel on the front.
- The player must move up to those seams and physically breach them.
- Each breached seam pushes the front back and removes ARMOR.
- ACT `扫描装甲` does not directly subtract armor. It makes the next advance expose an additional, larger seam.
- Heavy artillery remains sparse and large-scale: vertical batteries, horizontal batteries and Gran Laser sweeps.

Player attacks against sealed armor do almost nothing. Low ARMOR creates a real burst window. A heavy attack through a completely open breach causes Grand King to reseal part of the fortress, starting another advance/breach cycle.

## Trial 4 — Five King

### Question
Can the player defeat five different combat systems rather than one large HP bar?

### Rule
ACT no longer contains a single "cycle target" button. Every living fusion module appears as its own target choice.

The selected module becomes the primary enemy-turn challenge:

- Fire Golza / head: eruption columns and lane control.
- Melba / wings: high-speed rush challenge.
- Gan-Q / left arm: eye constructs must be physically broken; two breaks expose the arm.
- Reicubas / right arm: large ice-wall gap challenge.
- Super C.O.V. / core: broad sweep challenge.

For Golza, Melba, Reicubas and C.O.V., a clean solution to that module's enemy turn exposes it. Gan-Q requires breaking at least two eye constructs.

Only an `EXPOSED` module can take real module damage. Attacking a locked module deals no meaningful damage. A successful hit consumes exposure, so every part has a defend/solve -> strike rhythm.

Destroyed modules permanently stop generating their attack family. When only two modules remain, the second survivor can appear as a support attack while the selected module remains the actual challenge target. Destroying the final module ends the battle immediately; there is no empty post-module HP grind.

## Final Trial — Belial

### Question
Does the player own these forms, or are they just habits that an opponent can read?

### Rule
DOMINATION now measures continued readability, not a passive timer.

- The first enemy turn in a form gives Belial only a small read.
- Remaining in the same form on consecutive turns raises DOMINATION much faster.
- Taking hits adds additional pressure.
- Switching form sharply lowers DOMINATION and breaks the current read chain.
- ACT `拒绝支配` clears the current read chain and lowers DOMINATION, which keeps one-base-form profiles such as Leo playable.

Most importantly, Belial's enemy turn now changes according to the current form's enemy-turn control:

- `guard`: wide gap walls and sweeps that cannot be solved by standing still behind a short pulse.
- `dash`: delayed prediction zones are placed around the player's current route, then followed by a staff rush.
- `parry`: non-rush Battlenizer lines and lightning deny a one-button parry answer.
- `shot / breaker / purify`: breakable Deathcium constructs are mixed with a direct staff rush.
- `ultimate`: mixed prediction and weapon pressure.

Later phases increase combination pressure, but the central rule remains the same: Belial changes his test when the player changes the way they fight.

## Compatibility

The rebuild remains compatible with all currently exposed Archive profiles:

- Tiga
- Leo
- Nexus
- Ginga
- Cosmos

No trial requires a specific Ultra or a specific form-control type to be solvable.
