# Changelog

## v2.7.4
- Added the supplied Belial battle track as `original_belial_battle.ogg`.
- Belial uses one continuous loop across phase 1, the galaxy chase, phase 3, and the final Deathcium clash; phase changes do not restart playback.
- No gameplay changes in this release.

## v2.7.3
- Belial battlenizer finisher fixed: the giant crescent slash now has enough round time to charge, visibly cross the arena and be Z-blocked.
- Removed the extra Descium overlap from the battlenizer slash round; the crescent guard is now the actual finisher of that pattern.
- Rebuilt Belial's three shooting styles around readable authored seams/corridors and replaced phase-three overlap spam with a fixed alternating phrase score.
- Fixed a duplicated mixed-shooting fan loop that spawned the same volley twice.
- Rebuilt the phase-three transition round from the supplied reference-video structure: edge sigils, diagonal chains, radial rings, white shard storm and one final diagonal Descium beam, with matching red/purple/blue field changes.
- Extended the phase-three special combat window to ~22s so each reference-derived section is playable instead of compressed into overlapping hazards.

## v2.7.2
- Rebuilt Belial's claw round as one continuous 5/6/7-bite sequence instead of disconnected one-shot clamps.
- Claws are already visibly posed at round start with the safe gap exposed; the first read window is ~1.9s, later gaps follow immediately after each reopen.
- Removed dead-air pauses between claw bites and kept the jaws at a readable ready depth between closures.
- Constrained all claw gaps to reachable positions inside the narrowed arena.
- Extended only Belial's claw-round durations so the denser sequence finishes cleanly; phase 3 flows directly into the Deathcium finisher.

## v2.7.1
- 修复贝利亚普通回合末尾攻击提前清空造成的 1~3 秒空场；按攻击类型重新铺满时间轴。
- 修复银河追逐结束后 Battle Frame / Canvas 尺寸泄漏到技能、道具菜单。
- 贝利亚表现层重做：菜单/对白采用扁平手绘式差分轮廓，受击/重击/说话/嘲讽有独立帧；敌方回合改由 Canvas 内实时贝利亚作为攻击源，加入移动残影与攻击姿态。
- 银河阶段 Canvas 贝利亚重绘并加入飞行残影。

## v2.7.0

- Full Belial encounter reset. Replaced the old generic/original Belial pool with three authored phases and live boss movement.
- Added varied Belial reaction dialogue for round start/end, player hits, attacks on Belial, item use, galaxy self-hits, low HP and the final clash; generic “fake / imitation” taunts never inspect the player's current Ultraman form.
- Phase 1 now includes three distinct Giga Battlenizer shot structures, telegraphed Belial lightning, blue/orange melee slashes, a Z-timed scythe guard and narrow claw clamps.
- Phase 2 transition is a playable 19s galaxy chase window with tracking orbs that can curve back into Belial, falling meteors/asteroids and Z-fired player shots that break obstacles.
- Phase 3 transition is a playable 17.8s large energy-field window based on the supplied reference video's purple/blue/red arena structure, glyph barrages, lightning and a large Deathcium finisher.
- Final-phase regular patterns can end with one huge horizontal, vertical or diagonal Deathcium Beam.
- Removed the old DOM `belial-clash-qte` finale. At 0 HP Belial forces a live Canvas Deathcium struggle: holding Z/Enter/Space stabilizes the block, then pushes the collision point back toward Belial while the battle frame shakes. Failure is real damage/defeat; completion triggers victory.

## v2.6.5

- Five King chest attack now uses one straight four-arm windmill implementation at every boost level.
- Removed spiral angle offsets, counter-rotating layers, radial cycling, breathing contraction and unfurl logic from the Five King chest path.
- Boost levels now increase windmill rotation speed and progressively add randomized falling light shots.
- Five King chest never changes the arena size.

## v2.6.3

- Five King chest max-boost windmill corrected from accidental 10-arm coverage to five total spiral arms.
- Max boost uses 3 clockwise / 2 counter-clockwise arms with slightly different angular speeds.
- Added a longer telegraph and progressive 900ms unfurl so the final spiral does not appear as an instant full-screen hitbox.
- Lowered max-boost bead radius slightly while preserving spiral drift and radial flow.

## v2.6.2

- Added the user-supplied Five King battle track as `assets/audio/original_five_king_battle.ogg`; organ destruction does not restart playback.
- Reworked Five King's head resonance nodes into telegraphed cross-shaped explosions. After the node flashes, damaging horizontal and vertical arms expand from the intersection instead of using only a small circular burst.
- Cross length/width scale with Five King's surviving-organ boost while keeping the authored resonance timing.

## v2.6.1

- 五帝王第二轮机制重构：头部改为波形共振场；左臂改为左右两列射线谱；胸部强化后进入螺旋/双层反转/收缩扩张；右臂冰冻改为减速，强化火焰改为流水线重叠锁定。
- 美尔巴翅膀高空坠落保持 v2.6.0 结构。
- 古兰特王移除错误的自动 EN 补给，改为【道具】中的“能量补给”固定 5 次，每次恢复 30 HP。

# v2.6.0

- Rebuilt Original Five King around five body-part-specific enemy-turn systems.
- Destroyed parts permanently remove their attack system; every surviving part scales with the number of parts already broken.
- Golza head: delayed ultrasound echoes replay the player's recent movement path as damaging traces.
- Gan-Q left arm: two-row compressed arena with authored left/right rapid laser sequences.
- Super C.O.V chest: rotating radial windmill barrage with outward-flowing projectiles.
- Melba wings: free-fall arena with shifting debris fields and stronger descent pressure.
- Reicubas right arm: freeze beams create ice cover; tracked fire beams can be blocked by and melt that cover.
- Original Grand King can now receive up to five deferred +18 EN supplies during its long encounter.

# v2.5.9

- 修正古兰特王红外线感应器的橙/蓝光束移动判定。
- 判定不再只检查方向键是否被按住，而以玩家这一帧的实际位移为准。
- 橙光加入 120ms 的短移动宽容窗，避免玩家迎着光束移动却因 keyup/碰撞落在相邻帧而误伤。
- 蓝光仍要求真正停下：当前帧有实际位移才会受到蓝光伤害。
- 在场地边界按着无法继续移动的方向不再被误判为“移动”。

# v2.5.8

- Added `original_grand_king_battle.ogg` as Grand King's continuous encounter BGM.
- Re-spaced Grand King's infrared sensor beams: 700ms normal / 600ms hard, with 640ms / 560ms rewind spacing.
- Sensor-pattern rounds now receive dedicated longer durations; other Grand King patterns keep their existing timing.

# v2.5.7

- Fixed a runtime Canvas render crash in the new Original Grand King hazards.
- `drawHazard()` now binds `activeAge` from `bullet.activeAge`; Grand King arm/debris/fist/dust/barrage/laser branches no longer throw after the infrared-sensor round.
- Built from the v2.5.5 gameplay baseline; the unrelated v2.5.6 sensor-duration workaround is intentionally discarded.
- Added direct render smoke coverage for every new Grand King hazard type.

# v2.5.5

- 重做原创古兰特王敌方回合：红外线感应器（橙/蓝连续光束与倒带）、超级手臂投掷、超级毁灭拳与落地灰尘、双炮波形光弹扫射、可引导反击本体的古兰镭射。
- 古兰特王不再使用旧版通用雷柱/扫线/光球/冲撞攻击池。
- 古兰镭射锁定玩家后固定方向，玩家可在开火前离开射线，并通过站位让激光从战斗框顶部中央射向古兰特王。

# v2.5.4 — Zetton pursuit lanes + Greeza pressure pass + soundtrack

- Zetton free-movement blink strikes now snapshot the player's current row/column instead of travelling through authored middle lanes. Fixed perpendicular follow-ups keep the phrase deterministic while removing corner idling.
- Increased non-Hyper Zetton blink speed and replaced the vehicle-like rush marker/body with a horned afterimage silhouette.
- Generalized Greeza helix collision/rendering to arbitrary angles and continuous rotation; second-form helix rounds now include diagonal cuts, rotating spirals and a crossed late phrase instead of horizontal/vertical only.
- Rebuilt final-form Greeza wave-cannon volleys around three sweeping beams fired from changing arena edges. Nine authored volleys remove permanent corner bunkers while retaining sampled safe space at every instant.
- Added the user-supplied Greeza battle track as `assets/audio/original_greeza_battle.ogg`; one continuous loop spans all three forms without restarting.
- No Grand King / Five King / Belial gameplay changes.

# v2.5.3 — Zetton ricochet + soundtrack

- Reworked authored yellow Zetton reverse beats into two-step ricochets: honest-side first guard, then an opposite-side return only after a successful block.
- Added deterministic 360ms score padding after authored ricochet beats so the return input cannot overlap the next required direction.
- Extended the first Zetton phase to 11.2s to preserve v2.5.2 density while accommodating the additional return inputs.
- Added the user-supplied Zetton / Hyper Zetton battle track as `assets/audio/original_zetton_battle.ogg`; one continuous loop covers both forms without restarting on transformation.
- No Greeza / Grand King / Five King / Belial gameplay changes.

# v2.5.2 — Zetton / Greeza pressure pass

- Zetton guard scores: 24 authored impacts per round, no random direction/timing, normalized arrival time across aspect ratios, ~260ms minimum adjacent impact spacing.
- Zetton free-movement phrase: 14 authored rush/fireball beats with faster telegraphs and faster body rushes.
- Hyper Zetton: 16 afterimage rushes / 15 lock-on fireballs / 19-beat mixed chase depending on the authored round.
- Greeza first form: 15 thunder strikes per round with more player-snapshot targeting late in the phrase.
- Greeza vortex phrase: six large-path moving vortices instead of tiny local wobble.
- Greeza evil sound: 12 continuous blue/orange rings. Dark lightning: 16 strikes including staggered chains. Double spiral: four alternating horizontal/vertical helix attacks.
- Greeza final wave-cannon phrase: eight paired volleys (16 beams). Final rain phrase: 16 rows at 520ms spacing with a one-lane-at-a-time authored safe corridor.
- No Grand King / Five King / Belial gameplay changes in this pass.

# v2.5 — Original route full rebuild + Tiga/Cosmos combat fixes

- Abandoned the v2.4 original-route READ / triangulation / seam / EXPOSED / DOMINATION structure as the active design.
- Removed visible invented original-route lore such as training records, adaptation trials, lesson objectives, and standard-answer framing. Story ownership remains outside UBR.
- Rebuilt Original Zetton around a Zetton-specific four-direction defense phase, beam absorption/return, and a Hyper Zetton free-movement teleport phase.
- Rebuilt Greeza around three actual forms: first-form attack dodges with `MISS`, second-form spatial misalignment, and a tangible final form using a broader absorbed-monster attack vocabulary.
- Rebuilt Grand King as a physical advancing body boundary plus overlapping heavy artillery; removed the invented seam hunt and visible ARMOR objective.
- Rebuilt Five King as direct body-part destruction. Broken organs visibly remain damaged and permanently remove their corresponding attack family.
- Rebuilt Belial around an in-box Giga Battlenizer, blue/stop and orange/move sweeps, monster-army overlap, and an in-box final beam clash after nominal HP reaches zero.
- Rebuilt all five original enemy DOM silhouettes so their bodies and weapons animate inside normal combat instead of sharing a generic monster shell.
- Original-route powers are available immediately; the old ADAPT gate/HUD is disabled for original encounters.
- Tiga/Gatanothor: Gatanothor returns to full HP when Glitter Tiga revives so the Glitter phase is a real final round.
- Cosmos: base max HP raised to 120; Miracle Luna raises max HP to at least 156 and refills it.
- Cosmos: fixed the moving-wall safe-gap axis bug and enlarged the gap/telegraph, preventing a full-screen unavoidable wall.
- Miracle Luna purification now clears every Chaos projectile and major moving-wall/beam hazard, including attacks still in their telegraph delay.
- Corrected original-route CSS scoping from the nonexistent `#battle-stage` selector to the actual `#stage`, so hidden auxiliary DOM pieces, body-part damage states, original backgrounds, and ADAPT hiding apply in the real page.
- Browser startup harness: all 22 registered encounters reach PLAYER_MENU without runtime exceptions; original 5 × all 5 player profiles also pass startup initialization.

# v2.4 — Original route combat identity rebuild

- Rebuilt all five Future Adapter trials around different win/interaction questions instead of shared projectile templates.
- Zetton / Hyper Zetton: visible READ meter, heavy repeat adaptation, attack-class BREAK, and learned-response enemy patterns.
- Greeza: ordered 1→2→3 reality triangulation replaces generic anchor collection as the main EXISTENCE loop.
- Grand King: advancing fortress front physically compresses the arena; touching exposed seams pushes the front back and removes ARMOR. Blind player attacks no longer chip armor.
- Five King: explicit per-module target choices, module-specific challenge rounds, EXPOSED strike windows, permanent ability removal, and immediate victory when the final module is destroyed.
- Belial: DOMINATION now primarily punishes staying in one form, while the enemy-turn pattern changes according to the current form's control style.
- Fixed Archive form switching to consume `formKey` correctly.
- No route sequencing, Bridge ownership, Cosmos mechanics, or non-original Encounter registry changes.

# v2.3.1 — Cosmos battle feel patch

- Removed the Cosmos-only black dialogue slab; Cosmos cinematics now use the existing subtitle presentation without a separate opaque box.
- Reworked `chaosProminence` into a sweeping beam with a clearly telegraphed safe gap, so every Cosmos form can evade it through movement. Enemy damage and barrage count are unchanged.
- Extended the Miracle Luna finale by reducing HEART gain values only. Chaos Darkness HP, attack, defense, bullet damage, pattern count, and AI were not increased.
- No Bridge, registry, route sequencing, original-route, or non-Cosmos battle logic changes.

# v2.3 — Cosmos objective rebuild

- Replaced Chaos Ultraman hidden HP-threshold progression with three explicit goals: COPY 0 → three COPY CORE cuts → Calamity HP fight.
- HP is locked/dimmed during COPY and CORE; misleading damage commands are disabled.
- Added dedicated, slower `CORE` targets to Eclipse Break and made Eclipse Z prioritize only CORE nodes in that phase.
- Replaced Chaos Darkness pre-Miracle HP thresholds with three player-performed Luna / Corona / Eclipse answer trials.
- Added visible `ANSWER 0/3` objective and explicit next-form guidance.
- Miracle Luna now hides enemy HP, disables ordinary ATTACK, and presents HEART as the sole final objective.
- Added cross-battle cleanup so Cosmos objective HUD state cannot leak into another Encounter.
- Preserved all five v2.2.2 Cosmos soundtrack assignments and kept route progression under the card / UBR Bridge.

# v2.2.2 — Cosmos soundtrack pass

- Added the five user-supplied Cosmos route tracks without changing encounter mechanics.
- Chaos Lidorias: dedicated battle track.
- Chaos Ultraman / Calamity: dedicated battle track.
- Chaos Darkness pre-Miracle phase: dedicated looping battle track.
- Cosmos realization / insight cinematic: dedicated non-looping cue.
- Miracle Luna final phase: dedicated final battle track, crossfaded after the awakening reveal.

## v2.2.1 — Runtime startup regression fix

- Restored four Tiga helper methods accidentally removed during the v2.1 Cosmos rewrite.
- Fixed the global startup crash that left all encounters on the static Golza/Tiga placeholder UI.
- Removed runtime-owned Cosmos route progression; route/battle sequencing remains the responsibility of the card / UBR Bridge.
- Retained the v2.2 Cosmos continuity and cinematic improvements.

# Changelog

## v0.4 — Showcase Build

- 新增战斗选择页，适合直接给其他人试玩。
- 哥尔赞全面优化：
  - 更短、更有性格的动态战斗文本。
  - 普通弹体统一为白色 pellet。
  - 新增地震裂缝特殊攻击。
  - 后段会叠加 Pattern，不再只是四段机械轮换。
- 杰顿全面优化：
  - 完善四向 Guard 模式。
  - 普通弹统一为白色 pellet。
  - 火球保留为特殊攻击。
  - 新增交叉方向与三连方向序列。
  - “稳住”会提高下一轮格挡容错。
- 新增加坦杰厄 Boss：
  - 520 HP。
  - 三阶段：黑海苏醒 / 深渊下沉 / 石化之光。
  - 阶段转场与 Boss HUD。
  - 触腕封路、黑暗墙、石化光束。
  - Boss 专属 Action 与战斗文本。
- 新增轻量程序化音效，可静音。
- Victory / Defeat 后可重试或返回战斗选择。
- 背景继续去除网格化装饰，保留连续雾气与远景层次。
- 保留纯静态部署与 `window.startBattle(config)` 接口。


## v0.4.3 — Runtime recovery + Gatanothor corridor fix

- 从 v0.4 正常基线重新制作修复版。
- 修复 v0.4.2 中 `updateHazard()` 被错误补丁覆盖，导致敌方回合 Canvas 运行时报错、战斗框空白的问题。
- 恢复 `hitPlayer`、Guard collision、Telegraph、Hazard rendering 等完整方法链。
- 二阶段黑暗墙改为单一 `darkcorridor`，不再存在左右碰撞区交叉。


## v0.5 — Text + Interaction + Platform Mode

- 按用户稿替换哥尔赞、杰顿、加坦杰厄核心文本。
- 其余文本按更短、更贴合敌人性格、适度冷幽默的方向统一。
- ACT 增加重复使用计数与重复反馈。
- 增加按技能 ID 的敌人命中反馈、PERFECT 命中反馈。
- 增强普通 / 重击受击演出和技能释放画面反馈。
- 新增美尔巴。
- 新增 Platform Mode：平台碰撞、重力、跳跃、跌落、最高平台目标。
- 新增美尔巴普通白弹与特殊俯冲扫击。
- 保持哥尔赞 / 杰顿 / 加坦杰厄原有模式可用。

## v0.6 — Vertical Chase Rework

- 重写美尔巴平台玩法为纵向滚动的连续爬楼追击。
- 每轮默认要求爬升 9 层才能暴露弱点。
- 普通攻击在目标未暴露时改为“追击”，技能锁定。
- 登顶后只开放攻击 / 技能；命中后目标重新升空。
- 普通攻击 MISS 会浪费暴露窗口。
- 提高基础跳跃高度和横向空中机动。
- 增加 Jump Buffer / Coyote Time。
- 掉落只回退部分进度，不再重置整轮。
- 平台、镜头与目标核心一起向上滚动。
- 再次重写四场战斗中未由用户指定的文本，减少机械说明和刻意笑点。


## v0.7 — World-space chase + Ultraman select

- Melba platform bullets/swoops now live in world coordinates.
- Platform effects now scroll with the stage instead of following the player sprite.
- Melba placeholder silhouette redesigned around a flying-body/wing profile.
- Added Ultraman selection to the showcase menu.
- Added Ultraman Cosmos profile and Mercy skill plumbing.
- Added `MERCY` battle result support for future compatible encounters.


## v0.8 — Cosmos Mercy Battle

- 新增混沌利多利阿斯。
- 新增高斯专属净化路线和实时 CALM 条。
- 新增 `chaos` 敌方回合模式。
- 新增混沌碎片：高斯开启净化领域后必须主动拦截；普通状态下则属于危险物。
- 新增混沌长枪特殊攻击。
- 普通强攻会降低 CALM，避免“边打边顺便饶恕”。
- CALM 满值后才允许高斯使用满月光波完成 `MERCY`。
- `applyPlayerProfile()` 现在支持同一怪兽按奥特曼加载不同的 ACT 菜单。
- 新增混沌利多利阿斯独立程序化占位模型与净化演出。


## v0.9 — Kyrieloid II / Gate of Hell

- 新增基里艾洛德人Ⅱ，定位为迪迦的区域 Boss。
- 新增 `prophecy` 敌方回合模式。
- 新增持久化 HELL GATE 条。
- GATE 会持续产生向上拖拽，并跨回合保留。
- 新增可收集金色光点，主动压低 GATE。
- GATE 100% 触发 Gate Rupture，而非直接无解判负。
- 新增 Sacred Fire、Gate Chain、Gate Rupture 特殊攻击。
- 新增攻击类型模仿：连续使用同类攻击被减伤，切换格斗 / 光线可 BREAK。
- 二阶段强化模仿与攻击压力。
- 新增迪迦专属 ACT：看向门扉 / 站稳 / 驳回。
- 新增独立基里艾洛德人程序化占位模型。
- 战斗选择页显示“推荐奥特曼”。


## v1.0 — Leo Route 01

- 新增雷欧奥特曼。
- 新增红基拉斯 / 黑基拉斯双怪战。
- 新增敌方回合主动迎击输入。
- 新增 `TWIN LINK` 围攻同步。
- 第一阶段结束后马格马星人进入第二阶段。
- 第二阶段新增 `MAGMA COMMAND` 和佩剑 PARRY。
- 新增雷欧专属 ACT 与三项技能。

## v1.1 — Nexus Route 01

- 新增奈克瑟斯奥特曼（幼年形态）。
- 新增全局生命循环：战斗活动状态持续缓慢扣血；奈克瑟斯技能直接消耗 HP；对敌人造成实际伤害会按比例回血。
- 新增佩德隆专属战。
- 新增 PREDATION 捕食度：捕食胞被佩德隆吸收会回血并提高捕食度；玩家可在敌方回合靠近捕食胞并按 Z / Enter 切断。
- 切断捕食胞会直接对佩德隆造成小额伤害，因此也能触发生命回收。
- 佩德隆第二阶段转化为弗利根，并展开美塔领域；领域内奈克瑟斯生命流失更快，但攻击与生命回收效率也更高。
- 新增奈克瑟斯专属 ACT：看清输送 / 压住核心 / 逼近捕食线。


## v1.1.1 — Nexus turn-drain fix

- 移除奈克瑟斯按现实时间持续扣血。
- 改为每个完整敌方回合结束后固定结算生命损耗。
- 基础损耗 4 HP / 回合；美塔领域 5 HP / 回合。
- 圆形护盾与“压住核心”会将当回合固定损耗减半。
- 技能 HP 消耗与伤害回血逻辑不变。


## v1.2 — Ginga Route 01

- 新增银河奥特曼。
- 新增雷电达兰比尔。
- 新增 Ultra Live 菜单与 BLACK KING / GINGA 两种 Live Form。
- 新增 STATIC 电路接地玩法。
- 第三轮触发 scripted paralysis，菜单只剩 LIVE。
- 新增 Plasma Conduct 与 3 格黄色充能。
- 银河雷电击在满充能时进入 OVERCHARGE。
- 胜利后敌人收束为 Spark Doll，并通过 localStorage 与 BattleResult 记录收藏。


## v1.3 — Ginga Route Complete

- 新增奥特曼黑暗 / 赛文黑暗双 Boss。
- 新增 DARK SYNC、真假 Live Sign 记忆/扫描与真实命令劫持。
- 击败后恢复 ULTRAMAN / ULTRASEVEN Spark Doll。
- 新增黑暗路基艾尔三阶段最终战。
- Dark Spark 可冻结实际命令按钮和 LIVE 列表中的 Spark Doll。
- 冻结对象会实体化成 Battle Box 结晶，靠近后按 Z / Enter 才能解冻。
- 不同 Spark Doll 形态具有不同解冻半径/数量。
- 增加全指令冻结防软锁 lifeline。
- 黑暗路基艾尔胜利结算新增 FLOW RESUMED。


## v1.4 — Ginga Route Rewrite

- 从银河正式路线移除 `奥特曼黑暗 / 赛文黑暗` 遭遇战。
- 新增 `超级古兰德王`：重装甲、意识接触、记忆搬运、美铃救援、友军援护与装甲崩解阶段。
- `黑暗路基艾尔` 从 UI 冻结战彻底重写为时间停止战：冻结弹、FUTURE 标记、未来意识位移、攻击返还、三枚未来锚点。
- 最终阶段必须唤醒足够的路线积累，不能只靠伤害跳过机制。
- 新增 Super Grand King 独立重装甲 CSS 模型与装甲裂解 / Ginga Sunshine 演出。
- 加强 Dark Lugiel 时间停止、未来锚点、Ginga Especially 终局演出。
- 修复 stasis 反射攻击可能在未来锚点未完成时直接击杀 Boss 的问题。
- 修复 stasis 回合结束后舞台可能残留“时间停止”视觉状态的问题。
- 修复 Super Grand King 友军信号可能因漏接而无限生成的问题。
- 修复未来锚点跨回合重复使用第一枚 Spark Doll 的问题。


## v1.4.1 — Dark Lugiel damage / FUTURE radius fix

- Scoped the 72% scripted HP floor to `ginga_darambia` only.
- Replaced Dark Lugiel final-phase hard HP floor with progressive Future Anchor damage multipliers.
- Increased FUTURE mark radius: Ginga 48→64, Black King 58→74, Thunder Darambia 62→80, Grand King 76→94; ACT boost 25→30.


## v1.4.2 — The Light After Absolute Stop

- 重做黑暗路基艾尔第三阶段开场演出。
- 新增剧情杀、全黑停滞、伙伴声音、泰罗支援与银河重新点燃的完整 cutscene。
- 第三阶段伙伴支援具备实际玩法效果，不只是对白。
- 新增最终阶段动态星光场景、支援 callout 与原创 WebAudio finale pulse。
- 保留现有 FUTURE / Future Anchor 机制。


## v1.4.3 — Dark Lugiel finale overhaul

- ABSOLUTE STOP begins with a scripted execution sequence. Ginga is pinned by Dark Spark attacks, HP is visibly reduced to 0, the body shatters into light, and only then does the blackout/hope sequence begin.
- Final-phase command language changes: SKILL -> 光技, ACT -> 呼唤, LIVE becomes a memory interface instead of simple form switching.
- Final ACT now responds directly to Misuzu, Kenta/Chigusa, Tomoya, and Taro; each response grants a distinct battle effect.
- Final LIVE menu recalls Black King, Thunder Darambia, Grand King, and Ginga as memories from the route. These no longer merely swap forms during the climax.
- Final skills become 未来闪光 / 大家的光 / 银河尤其. 银河尤其 unlocks after all Future Anchors are awakened.
- Added dedicated execution animation, Dark Spark spears, lock ring, final beam, shatter effect, HUD HP impact, and new procedural execution SFX.

## v1.5 — Tiga Route Presentation Overhaul

- Global dialogue type speed slowed from 19ms/character to a configurable default of 31ms/character.
- Cinematic story text now types on screen and holds after completion; silence beats can be truly blank for multiple seconds.
- Dark Lugiel finale blackout now contains substantially longer silence before the first returning voice/light.
- Golza: rebuilt intro quake/dust presentation, rewrote non-user-authored battle text, and made the observed right shoulder an actual temporary damage opening. Clean dodges can also reveal a brief opening.
- Kyrieloid II: rebuilt intro gate presentation, rewrote battle text, added a dedicated imitation phase cutscene, and made “否定预言” visibly disrupt the gate/adaptation flow.
- Gatanothor: replaced the old simple phase-three transition with a full Tiga finale sequence: scripted petrification defeat, statue sinking, GUTS light-converter rescue attempt, rescue failure, extended silence, worldwide light gathering, Glitter Tiga revival, transformed final commands, enhanced final damage/defense, and a dedicated finishing/victory sequence.
- Added dedicated procedural SFX/music layers for Golza quake, Kyrieloid gate, Tiga petrification, rescue attempt/failure, light gathering, Glitter revival, and the final strike.
- Added persistent golden world-light battlefield layer during the Glitter Tiga phase.


## v1.5.1 — Player Becomes Light

- 加坦杰厄最终逆转改为玩家主动参与的唤光 QTE。
- 延长胜利队救援失败后的黑暗与沉默。
- 光点大小、震屏和世界回应由真实按键输入驱动。
- 达标后仍需最后一次玩家输入，才会释放贯穿屏幕的光柱并复活闪耀迪迦。


## v1.5.2 — Tiga Route Soundtrack

- 接入五个用户提供音频资源。
- 哥尔赞 / 基里艾洛德人 / 加坦杰厄前两阶段拥有独立循环 BGM。
- 三首常规战 BGM 单独降低运行音量，避免压住战斗 SFX 和对白。
- 加坦杰厄石化处决开始时常规 BGM 淡出。
- 闪耀迪迦复活时播放独立变身音效。
- 最终战 BGM 延迟 2.8 秒后开始，以 7.2 秒渐入，和变身音效重叠衔接。
- 最终阶段不再以程序化 Pulse 作为主 BGM。
- 胜利/失败最终结算时统一淡出长音乐轨。

## v1.6 — Leo Route Rebuild

- Rebuilt the Giras Brothers encounter around the full trio from the opening second: Red Giras, Black Giras and Magma Alien.
- `GIRAS SPIN` is now a real formation/defense rule; Leo breaks it through active counters, reverse-spin ACT choices and corkscrew kick.
- Added phase-2 tsunami hazards for the “Great Submergence” instead of merely increasing projectile speed.
- Added Pressure as the second Leo encounter.
- Pressure can truly shrink Leo: player collision core becomes tiny, enemy/world scale grows, damage becomes nearly ineffective, large debris and a contracting balloon prison become the arena language.
- Added Ultraman King / King Hammer transition and Ultra Mantle reflection input.
- Added Black End as Leo's final boss.
- Added Toru alternating-run prelude, hostage sequence, player-controlled children encirclement, crystal steal interaction, real Black Crystal ITEM finisher, Black Star destruction and quiet departure ending.
- Leo ending is deliberately not a resurrection/collective-light finale. The dramatic transfer of agency goes from Leo to the people he protected.


## v1.6.1 — Leo combat pass

- 修复普雷夏第三阶段按 Z / Enter / Space 后战斗 Canvas 停止刷新的异常：反射披风效果绘制引用了未定义的 `dpr`。
- 布莱克恩多改为更高强度的最终 Boss：增加黑焰雨、圆盘刃齐射、巨角封锁、交叉冲撞和命令断开后的暴走组合。
- 孩子们夺取水晶后不再直接把 Boss 降到 22% 且清空 HORN GUARD；现在进入真正的最后反扑。
- 黑色水晶必须等到 HORN GUARD 被折断、HP 压到 12% 以下后才能完成终结。
- 雷欧主动迎击布莱克恩多会直接造成小额碰撞伤害。
- 接入雷欧线四首用户提供音乐：三人组、普雷夏、布莱克恩多战斗，以及最终总结/启程段。


## v1.7 — Nexus / Bond

- Tuned Black End unbound projectile overlap down without deleting attack families.
- Reworked Leo child interlude into blind-spot encirclement plus a separate crystal-opening timing beat.
- Added Dark Mephisto Zwei encounter for Junis Blue with active enemy-turn shooting and DARK DRAIN.
- Added Mizorogi Shinya restraint/atonement phase.
- Added Dark Zagi four-form finale: Anphans, Junis, Junis Blue, Noa.
- Each Zagi form changes player interaction and uses multiple authored attack patterns.
- Added Nexus route cinematic visual language for Himeya / Ren / bond / Noa transitions.
- Mephisto Zwei custom ending: Mizorogi holds the opening through the finishing shot rather than disappearing after a generic victory.
- Black End unbound overlap was reduced a second time after play-test feedback: wider flame spacing, three-disc volleys and slower mixed-pattern cadence.


## v1.7.1 — Nexus Phase Gate Fix / Zagi Ring Readability / Leo HP

- 雷欧基础 HP 从 112 调整为 128，降低布莱克恩多最终战的容错压力。
- 修复黑暗梅菲斯特二代与黑暗扎基阶段血量门槛使用 `Math.ceil` 导致的软锁：HP 会停在略高于阶段阈值的位置，使阶段无法推进并持续显示 `-0`。
- 阶段门槛改为 `Math.floor`，仍防止一次重击跳过剧情形态，但保证 HP 比率已经达到阶段切换条件。
- 黑暗扎基扩张红环改为两处相对的缺口环。玩家根据预警移动到任一缺口方向即可无伤通过，不再是覆盖所有半径的必中特效。
- 红环预警时间与持续时间略增加，伤害和环宽略下调，并在预警/实体环上明确绘制缺口边界。


## v1.7.2
- Fixed Black End crystal finisher: broken horns now immediately authorize the crystal; removed hidden HP condition.
- Added Mephisto Zwei near-death overrun before Mizorogi's interception.
- Rebuilt Dark Zagi form cinematics around visible predecessor silhouettes and braided light-thread inheritance.
- Expanded Noa awakening with Riko, Nagi/Night Raiders, recovering public memories, Gravity Zagi rejection, and bespoke Noa-wing animation.


## v1.7.3 — Nexus Cinematic Polish
- Rebuilt Himeya/Ren legacy entrances with dedicated environments and large visible silhouettes.
- Added SVG light-ribbon inheritance effects and explicit weave/core animations.
- Slowed Nexus cinematic typing and post-line holds.
- Replaced Noa starfield with damaged-city / high-atmosphere aurora visual language.
- Added a multi-step Dark Zagi defeat cinematic before the epilogue.


## v1.8
Nexus final beam clash is player-driven. Cosmos route rebuilt around in-battle form switching and a three-encounter Chaos arc.

## v1.8 — Cosmos Route / Nexus Final Input

- Dark Zagi's last beam clash is now player-driven: mash Z / Enter / Space to physically push the clash point toward Zagi before the break animation can occur.
- Rebuilt Cosmos as a form-switching route rather than a fixed Luna-only mercy character.
- Luna enemy-turn purification pulse, Corona directional breakthrough dash and Eclipse precision separation are distinct active controls.
- Chaos Lidorias is now the formal Cosmos route opener.
- Added Chaos Ultraman with COPY pressure, multiple attack families, Eclipse unlock and a Calamity transformation.
- Added Chaos Header / Chaos Darkness final battle with Miracle Luna, HEART objective, EYES cover, monster-call projectile conversion and Chaos Header 0 mercy ending.
- Added readable telegraphs for new Chaos walls, prominence sweeps and broken halos.
- Added Cosmos-specific player-core colors and dedicated story environments instead of generic starfield staging.


## v1.8.2 — Cosmos Visual Repair

- Dedicated Chaos Ultraman and Chaos Darkness battle silhouettes.
- Dedicated Earth/protection-area and lunar final-battle environments.
- Rebuilt both Cosmos boss openings with pre-visual pauses and staged battle reveal.
- Slower Cosmos cinematic typewriter/hold timing.


## v1.8.3 — Chaos Battle Box runtime fix

- 修复卡俄斯奥特曼与卡俄斯黑暗进入敌方回合后 Battle Box 全空、动画停止的问题。
- 根因：v1.8 的新卡俄斯弹体绘制代码误插进 `updateBullets()` 物理循环，首次生成 `chaosMirror` / `chaosHatredOrb` 等弹体时访问不存在的 `ctx`，导致 RAF 直接中断。
- 将卡俄斯移动弹体恢复为正确的物理碰撞分支；视觉绘制继续只在绘制路径中执行。
- 新增覆盖两个高斯 Boss 六个 Pattern segment 及全部新卡俄斯攻击类型的运行级 smoke test。


## v1.8.4 — Dark Lugiel pressure rebuild
- Expanded Dark Lugiel attack language with Dark Spark slashes, blade gates, spear rain and clock-hand sweeps.
- Rebuilt Ginga revival around particles physically entering the Ginga Spark.
- Added whiteout, rainbow Ginga Spark and frozen-screen shatter return.
- Dark Lugiel returns to full HP for the final rematch.

## v1.9 — Ginga Bonds & Soundtrack

- 重构超级古兰德王的美铃唤醒流程：四段具名共同记忆、不同颜色记忆光、独立记忆回响。
- `MISUZU SIGNAL` 改为 `MISUZU / RESONANCE`；首次找回不同记忆才提供主要共鸣进度。
- 新增小光与美铃的专属长对话和独立意识空间动画：人物轮廓、记忆环、光丝连接、黑暗锁链破碎。
- 美铃解放后强化伙伴支援：更多可接取支援光、回血/回能/高额反击，以及周期性的自动交叉火力。
- 接入银河路线 9 段音乐：雷电达兰比尔、超级古兰德王常态/对话/解放、路基艾尔常态/绝望/伙伴/光汇聚/最终战。
- 用户上传的两个“第七首”经 SHA-256 检查为完全相同文件，仅保留一份进入项目。


## v1.9.1 — Himeya / The Meaning of Light
- Fixed Misuzu bond dialogue stacking.
- Added unlimited story resurrection during Dark Lugiel's post-revival final phase.
- Replaced formal Pedoleon slot with Dark Mephisto I.
- Added Himeya/Negoro prologue, Sera luminous-forest sequence, lineage-of-light animation, 1 HP story lock, Night Raider energy restoration, Junis return, and white-light finale.


## v1.9.2
- 修复银河最终阶段死亡仍进入普通 DEFEAT 的竞态/状态依赖问题。
- 重构黑暗梅菲斯特二代开场与沟吕木助战/结尾。
- 提升梅菲斯特一代终幕动画的动作可读性。


## v1.9.3 — Nexus cinematic reconstruction

- Rebuilt the Mephisto Zwei sunset opening so it no longer shares stray legacy layers.
- Mizorogi now returns as the original Dark Mephisto to intercept the red-eyed Zwei; the assist-light action belongs to the transformed giant.
- Rebuilt Mephisto I finishing sequence into readable shot-by-shot giant combat.
- Removed literal CSS escape corruption left by the prior patch.


## v1.9.4
- Fixed cross-battle Ren-scene contamination introduced by broad `ren-*` CSS selectors.
- Zagi HP 1680; Zagi-only Nexus HP 176.
- Exact Himeya/Ren/Riko legacy lines and slower legacy pacing.
- Richer encounter-scoped Zagi legacy animation effects.
- Added six-track Nexus soundtrack routing with crossfades.

## v2.0 — ORIGINAL / FUTURE ADAPTER
- Added a future-human Light Archive route with five trials: Zetton -> Hyper Zetton, Greeza, Grand King, Five King, and Belial.
- The player can enter an Archive trial as any currently available Ultra and switch that Ultra's own forms through ACT.
- Added ADAPT, earned by dealing and receiving real damage; highest forms require 100% ADAPT.
- Added distinct enemy-turn controls per form: guard, break, dash, shot, parry, purify, and ultimate pulse.
- Zetton learns repeated attack classes and transforms into Hyper Zetton at 50% HP.
- Greeza uses an EXISTENCE anchoring loop.
- Grand King uses regenerating ARMOR and fortress artillery.
- Five King has five destructible ability modules; destroying a module permanently removes its attack family.
- Belial uses DOMINATION to punish staying in one form and combines Battlenizer, lightning, monster-army and beam attack languages.

## v2.1 — Cosmos route story rebuild
- Rebuilt Chaos Lidorias around progressive recognition and a dedicated Full Moon Rect return cinematic.
- Expanded Chaos Ultraman from 2 to 3 phases; Eclipse is now a real playable middle phase before Calamity reconstructs.
- Expanded Chaos Darkness from 2 to 3 phases; added a failed-escalation stage before Miracle Luna.
- HEART is hidden until Miracle Luna changes the win condition.
- Added collectible HEART responses, four HEART story milestones, stronger TEAM EYES/monster participation, and a longer Chaos Header 0 ending.
- Added dedicated Cosmos story layers and slowed key Cosmos finale dialogue pacing.
- No new Cosmos BGM added yet; soundtrack integration is intentionally deferred.


## v2.2 — Cosmos continuity / set-piece upgrade
- Continued directly from v2.1; no unrelated runtime/world-director work is included.
- Chaos Ultraman now explicitly recalls the Chaos Lidorias encounter and learns Cosmos's decision-making rather than only copying poses or attacks.
- Rebuilt the Calamity transition as a staged learning archive -> fragment collapse -> combat-specialized reconstruction sequence.
- Calamity's live battle silhouette now gains a distinct spined shell, reshaped head/arms and hotter core instead of functioning as a red-tinted copy.
- Chaos Darkness now opens with an archive of the prior two encounters, making its hatred a visible consequence of accumulated learning.
- Rebuilt NO ANSWER into four sequential failures: Luna pacification, Corona breakthrough, Eclipse separation, then TEAM EYES fire.
- Miracle Luna awakening adds a dedicated open-hands shot: Cosmos still has power, but deliberately stops pointing that power at Chaos.
- Chaos Header 0 ending now peels the black shell in three separate beats; the final pieces loosen by themselves rather than being blasted away.
- Added canonical route continuation on the result panel: Chaos Lidorias MERCY -> Chaos Ultraman -> Chaos Darkness.
- Cosmos soundtrack remains intentionally deferred.
