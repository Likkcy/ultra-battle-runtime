# Cosmos Route v2.3 — Objective Rebuild

v2.3 fixes the main usability problem left in the v2.2 Cosmos route: the story knew what each phase meant, but the player could not reliably tell **what they were supposed to do**.

The route order is unchanged and remains controlled by the card / UBR Bridge:

```text
Chaos Lidorias — MERCY
        ↓
Chaos Ultraman — VICTORY
        ↓
Chaos Darkness — MIRACLE LUNA / HEART / MERCY
```

UBR still executes only the fixed encounter requested through `route + battleId`. It does not choose or launch the next story battle.

## Music map

The five supplied tracks stay mapped exactly as requested:

1. Miracle Luna final battle phase
2. Chaos Darkness before awakening
3. Chaos Ultraman / Calamity
4. Chaos Lidorias
5. Cosmos realization / insight sequence

The realization cue is non-looping. After `MIRACLE LUNA MODE`, it crossfades into the final battle cue.

---

# Chaos Ultraman

The previous build displayed COPY but actually advanced the story through hidden HP thresholds. v2.3 removes that contradiction.

## Phase 1 — COPY

**Visible objective:** `OBJECTIVE · COPY`

```text
COPY 68%
   ↓
COPY 0%
```

Enemy HP is visually dimmed and cannot be reduced in this phase. Ordinary ATTACK is disabled and labelled `HP锁定`.

COPY can be disrupted through:

- switching Luna / Corona through ACTION;
- Luna's dedicated pacification wave;
- Corona's dedicated blazing wave;
- Luna Z purification during the enemy turn;
- Corona directional Z burst during the enemy turn.

Only skills that actually affect COPY are shown during this phase, so the skill menu no longer offers fake HP options.

When COPY reaches zero, the battle does **not** immediately become a normal HP fight.

## Phase 2 — ECLIPSE BREAK

**Visible objective:** `OBJECTIVE · COPY CORE · 3 / 3`

Eclipse awakens. ATTACK and SKILL are disabled because HP is still not the objective.

Use ACTION → `锁定 CORE`, then enter the enemy turn:

```text
WASD / Arrow Keys = move
Z / Enter / Space  = Eclipse cut
```

Three slow objective nodes appear with a visible `CORE` label. Eclipse Z targets only those CORE nodes in this phase, so nearby ordinary Chaos bullets cannot steal the cut.

Each successful cut changes the counter:

```text
3 / 3 → 2 / 3 → 1 / 3 → 0 / 3
```

If the first wave is missed, later waves reappear during the same defense pattern.

At zero cores, the copy body collapses and Chaos reconstructs itself as Chaos Ultraman Calamity.

## Phase 3 — CALAMITY

COPY is over. The interface meter disappears.

```text
CALAMITY
HP becomes the real objective
```

ATTACK and SKILL return. Damage now reduces HP normally. This is the only part of the encounter that is a conventional boss health fight.

---

# Chaos Darkness

The old build advanced Luna / Corona / Eclipse failure scenes automatically at HP thresholds. v2.3 makes the player personally prove all three answers fail.

## Phase 1 — ANSWER 0 / 3

**Visible objective:** `OBJECTIVE · ANSWER`

Enemy HP is dimmed and cannot be reduced. The header explicitly says which form must be tested next.

### 1 / 3 — Luna

Start in Luna. Use ATTACK or a Luna light skill once.

The attempt resolves into the Luna failure scene: Chaos has already learned where pacification comes from and how to rebuild around it.

### 2 / 3 — Corona

ACTION explicitly offers the required Corona switch. After switching, use ATTACK or a Corona light skill.

The attempt resolves into the Corona failure scene: Chaos predicts the direction of the breakthrough.

### 3 / 3 — Eclipse

ACTION explicitly offers the required Eclipse switch. Use ATTACK or an Eclipse light skill.

The attempt resolves into the Eclipse failure scene: even separation is learned as a reconstruction template.

After all three player-performed trials, TEAM EYES fires once and its spectrum is learned as well.

## NO ANSWER / realization

At this point the battle does not ask for a fourth weapon.

Track 5 begins. The scene moves through defeat, Lidorias memory, the realization that Lidorias returned because it was heard, the pyroxene response, and Cosmos choosing a different answer.

## MIRACLE LUNA — HEART

After `MIRACLE LUNA MODE`, track 1 begins.

Enemy HP is hidden. Ordinary ATTACK is disabled and relabelled `停止攻击`.

The command language also changes:

```text
SKILL → 回应
ACT   → 倾听
```

The only victory objective is:

```text
OBJECTIVE · HEART
0% → 100%
```

HEART is raised through:

- `奇迹之光`;
- `听它的声音`;
- `相信怪兽`;
- Miracle Luna Z purification during enemy turns;
- HEART fragments and monster / TEAM EYES support.

Milestones at 25 / 50 / 75 / 100 keep the existing narrative progression. At 100%, `露娜终结` unlocks and resolves the encounter as MERCY rather than a kill.

---

# Scope safety

v2.3 changes only the Cosmos objective implementation and the version/documentation surface. No Bridge protocol, battle registry key, route sequencing, original-route battle design, or non-Cosmos encounter rule is intentionally changed.
