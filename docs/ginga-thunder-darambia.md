# 银河线 01：雷电达兰比尔

## 第一阶段：ULTRALIVE BLACK KING

- 玩家并不是以银河开场，而是先实体化黑王。
- 黑王移动速度明显降低。
- 场地由六个导电节点组成，电弧会在节点之间通电。
- 靠近亮起节点按 `Z / Enter` 使用重踏接地，可中断与该节点相连的电弧并降低 `STATIC`。
- 第一阶段不会允许黑王直接结束战斗；敌人生命最多只能被压到约 72%。
- 第三个完整敌方回合后触发大放电，BLACK KING 进入 PARALYZED，菜单只允许 `LIVE`。

## 首次 Ultra Live 银河

- LIVE 列表出现 `ULTRAMAN GINGA`。
- 选择后发生专属变身阶段，进入第二阶段。
- 此后 LIVE 菜单可在已解锁的 BLACK KING 与 GINGA 之间切换。

## 第二阶段：Plasma Conduct

- 普通白弹继续是纯躲避。
- 黄色导流雷接近时，银河形态可按 `Z / Enter` 主动接入。
- 成功导流获得 1 格 `PLASMA / YELLOW`，最多 3 格。
- 受击会损失一格充能，除非使用 ACT「稳住充能」。
- 3 格时使用「银河雷电击」触发 OVERCHARGE，伤害倍率显著提高并消耗全部 Plasma。
- 如果切回 BLACK KING，Z 会重新变成重踏而不是导流，证明同一种战斗场地会因 Live Form 改变玩法。

## 战后

雷电达兰比尔不会直接爆炸消失，而会收束为 Spark Doll。运行时会把 `thunder-darambia` 写入本地 `ubr:ginga:sparkDolls` 收藏记录，并在 BattleResult 中返回 `sparkDollAcquired`。


## Showcase 约束

当前第一战是银河专属脚本战。展示页即使此前选择了其他奥特曼，进入本战时也会自动切换到银河，以保证 BLACK KING → GINGA 的首次 Ultra Live 流程完整。
