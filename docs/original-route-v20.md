# ORIGINAL / FUTURE ADAPTER — v2.0

## Premise

The original route is not another historical Ultra story. The player is a future human candidate for becoming an adapter of light. The Light Archive recreates battles from different eras so the candidate can temporarily synchronize with powers already inherited/unlocked by the card's story.

The standalone showcase exposes every currently implemented Ultra profile for testing. In the eventual SillyTavern integration, the card remains the source of truth for which Ultras/forms have been unlocked.

## Player rule: one Ultra, many forms

Before an Archive battle, choose one unlocked Ultra. During that battle, ACT only switches forms belonging to that same Ultra.

Examples:

- Tiga: Multi / Power / Sky / Glitter
- Leo: base / King Mantle support state
- Nexus: Anphans / Junis / Junis Blue / Noa
- Ginga: Ginga / Strium
- Cosmos: Luna / Corona / Eclipse / Miracle Luna

Form changes affect attack, movement speed, incoming damage and the Z/Enter/Space enemy-turn interaction. They are not cosmetic stat skins.

## ADAPT meter

ADAPT is the original-route special meter.

- Real damage dealt raises ADAPT.
- Damage received also raises ADAPT, faster per point than dealing damage.
- Enemy-turn interaction (anchors, breakable targets, counters) can add smaller amounts.
- At 100%, the route's highest form becomes selectable.
- Entering an ultimate form spends the current 100% ADAPT. Leaving it means it must be earned again before re-entry.

The intent is not to reward intentional damage farming; getting hit also costs HP and makes the next enemy turn harder. The meter rewards actually surviving a hard fight, whether through offense or endurance.

## Trial 1 — Zetton -> Hyper Zetton

Core rule: **the opponent learns answers that are repeated**.

Phase 1 retains Zetton's identity through attacks from cardinal directions, electromagnetic barrier/gap patterns, return-wave sweeps and teleport repositioning. Repeating the same attack class is resisted; changing between physical and energy attacks can BREAK its adaptation. ACT `打乱运算` clears the current adaptation at the cost of a turn.

At 50% HP, the record tears open and rebuilds the enemy as Hyper Zetton Imago. The same defensive logic remains, but the pace changes: blink-speed rushes, denser fireballs, tighter barriers and faster return attacks. A huge attack cannot skip the transformation gate.

## Trial 2 — Greeza

Core rule: **an enemy that is not stably present cannot simply be DPS-raced**.

The boss has an EXISTENCE gauge. When it is low, attacks still deal at least 1 damage but are heavily suppressed. During enemy turns, reality anchors appear; collecting them increases EXISTENCE. ACT `锁定坐标` also pushes the gauge upward.

At 100%, Greeza is briefly pinned into a hittable coordinate and takes much more damage. A substantial hit then knocks it out of alignment again and the gauge falls, creating a loop:

`survive distortion -> collect anchors -> pin reality -> burst -> it slips away`.

Phase 2 increases displacement speed, back-beam pressure and reality instability rather than replacing the core rule.

## Trial 3 — Grand King

Core rule: **break a fortress before trying to out-damage it**.

ARMOR starts at 100%. High armor heavily reduces damage. Attacks chip armor, heavy hits chip more, breakable armor fragments in the enemy turn can be destroyed with form-specific Z interactions, and ACT `扫描装甲` exposes structural seams.

Grand King slowly closes damaged plates after each enemy turn, so the player wants to create a low-armor window and then switch to a form that can exploit it. Its attack language is large-scale artillery rather than small bullet density: vertical/horizontal lanes, fortress walls, heavy sweeps and hot armor debris.

## Trial 4 — Five King

Core rule: **there are five real bosses inside one body**.

The five modules are Fire Golza (head), Melba (wings), Gan-Q (left arm), Reicubas (right arm), and Super C.O.V. (core). ACT `切换部位` cycles the current target.

Each living module owns an attack family:

- Fire Golza: vertical energy columns.
- Melba: high-speed rushes.
- Gan-Q: breakable eye orbs.
- Reicubas: large gap walls.
- Super C.O.V.: broad energy sweeps.

Destroying a module permanently disables its family for the rest of the fight. The interface shows the number of modules still alive and the current target. The late fight therefore becomes *less diverse but more tightly combined*, rather than simply adding more bullets.

## Final Trial — Belial

Core rule: **prove the inherited light is yours, rather than a form you hide inside**.

Belial uses DOMINATION. It rises every enemy turn and rises faster when the player is hit. At high DOMINATION Belial moves faster and suppresses outgoing player damage. Switching between forms reduces DOMINATION substantially; ACT `拒绝支配` can also cut it.

The enemy turn mixes several large attack languages: Giga Battlenizer sweeps, parryable staff rushes, lightning columns, breakable Deathcium-like volleys, monster-army walls and Deathscythe-like cuts. Later phases combine them.

This makes Belial the examination of the whole original route: no single form is intended to answer every pattern. Fast forms reposition, parry forms challenge rushes, shot/purify/breaker forms remove constructs, and ultimate forms provide a temporary high-power answer earned through ADAPT rather than chosen for free.

## Integration boundary

The Archive runtime does not decide what the user has unlocked. The card/story should eventually send the chosen `playerKey`, unlocked state and battle ID. UBR only runs the selected trial and returns its result.
