# 银河线 03：黑暗路基艾尔 — 时间停止 / 未来反击

旧版“冻结菜单 / 冻结 Spark Doll 按钮”已废弃。新设计只围绕路基艾尔自己的能力：停止生命、运动与未来。

## 第一阶段：HALT

路基艾尔发射黑暗光弹。周期性的 Dark Spark 会让整个战斗框真正进入时间停止：

- 普通黑暗光弹停在当前坐标。
- 路基艾尔仍然是场上唯一保持微弱活动的敌人。
- 停止期间按 `Z / Enter`，可以给附近的冻结光弹留下 `FUTURE` 标记。
- 时间恢复后，被标记的攻击不再继续射向银河，而是反向飞回路基艾尔。
- 没有处理的冻结攻击则恢复原运动，并提高 `STASIS`。

因此敌人的能力本身就是反击素材。

## 第二阶段：THE NEXT MOMENT

时间停止进一步冻结银河的身体。停滞发生时：

- 身体留在原地。
- 玩家控制一个青色“未来意识”移动。
- 时间恢复时，身体直接出现在未来意识停下的位置。

玩家不再是在静止世界里拖着身体走，而是提前选择“下一刻自己会在哪里”。

## 第三阶段：ABSOLUTE STOP

路基艾尔试图让这一刻永远不会进入下一刻。

时间停止期间会出现三枚“未来锚点”，来源于银河路线已经真正获得的 Spark Doll：

- BLACK KING
- THUNDER DARAMBIA
- GRAND KING

未来意识必须逐一触碰并点亮它们。三枚都亮起以前，路基艾尔会保留最后 1 HP，不允许被普通输出跳过终局机制。

不同 Ultra Live 身体仍然影响“未来标记”的方式：重型 Spark Doll 有更大的作用范围，Thunder Darambia 可以同时处理更多冻结目标。

三枚未来锚点全部点亮后，最后攻击才可以真正结束战斗，进入 GINGA ESPECIALLY / 时间恢复演出。


## v1.4.2：第三阶段的情绪曲线

第三阶段不再直接弹出 `ABSOLUTE STOP` 后继续打。

结构：

1. 路基艾尔发动绝对停止，银河被剧情压至 1 HP，STASIS 达到 100。
2. 全屏黑暗，战场和声音收束。
3. “世界已经被黑暗笼罩。”之后，美铃、健太、千草、友也的声音依次出现。
4. 泰罗回应并以光打破第一层停滞。
5. 银河恢复到 72% HP、满 EN，STASIS 回落至 34。
6. 最终阶段启动原创 WebAudio 旋律脉冲和星光战场。
7. 伙伴在后续每轮提供实际支援；FUTURE 转化范围与锚点出现速度也得到永久强化。

对白为本项目原创，只借用《银河》最终回中“伙伴与城镇居民重新点亮希望、泰罗恢复并帮助银河复起”的剧情结构。


## v1.4.3 Finale Rule

ABSOLUTE STOP 的情绪顺序固定为：压制 -> 处决 -> HP 0 -> 银河光体崩解 -> 全黑 -> 伙伴之光 -> 泰罗 -> 银河重新站起 -> 最终阶段。最终阶段的菜单本身表达的是“回应一路走来的关系”，而不是继续使用普通战斗配置。

## v1.8.4 pressure rebuild

The final phase is now treated as a full rematch rather than a nearly-finished cleanup. After Ginga is executed and returns, Dark Lugiel is restored to full HP while the encounter remains in the Absolute Stop phase.

Additional Dark Spark attack language:

- diagonal Dark Spark blade slashes;
- crossed double slashes;
- sequential spear rain;
- moving blade gates with readable safe gaps;
- rotating clock-hand blade sweeps;
- mixed late-round combinations layered around the existing stasis-shard / FUTURE mechanic.

The revival presentation no longer uses a generic starfield as its main image. Light particles physically converge into the Ginga Spark during each ally beat. The device grows brighter with every influx, the frame whites out, the Ginga Spark becomes rainbow-colored, and it then smashes through a frozen-screen layer to return to battle.
