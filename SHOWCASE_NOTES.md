# Showcase v0.9

重点测试基里艾洛德人Ⅱ：

1. 选择迪迦后进入 `?player=tiga&battle=kyrieloid`。
2. 敌人 HP 下方应出现 HELL GATE 条。
3. 敌方回合玩家应持续受到向上拖拽；按向下可以主动抵抗。
4. 金色光点必须可以主动接取，接到后 GATE 立即下降。
5. GATE 越高拖拽越强；到 100% 时应触发一次带安全缺口的 Gate Rupture，而不是全场无解伤害。
6. 普通 ATTACK 后 HUD 显示 `模仿：格斗`；再次普通攻击应出现 `ADAPTED` 并明显减伤。
7. 切到技能攻击应获得 BREAK 伤害，然后 HUD 改为 `模仿：光线`。
8. 迪迦 ACT【驳回】应清除模仿并压低 GATE。
9. 低于 48% HP 后进入“模仿”阶段，模仿减伤更强。
10. 其他五场战斗不能因新增 GATE / adaptation 逻辑受到影响。
