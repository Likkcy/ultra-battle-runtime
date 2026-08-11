# UBR Integration Contract — v0.4

展示版和未来 SillyTavern Bridge 保持解耦。

## 启动

```js
window.startBattle(config)
```

跨窗口：

```js
battleWindow.postMessage({
  type: "START_BATTLE",
  battle: config
}, battleOrigin)
```

## 结果

```js
{
  type: "BATTLE_FINISHED",
  result: "victory",
  turns: 6,
  player: {
    id: "ultraman_tiga",
    hp: 52,
    maxHp: 100,
    energy: 61,
    maxEnergy: 100
  },
  enemy: {
    id: "golza",
    hp: 0,
    maxHp: 220,
    rage: 0,
    phase: null
  }
}
```

Boss 战会在 `enemy.phase` 中返回结束时所在阶段。

正式接入前：固定 Battle App origin、校验 `event.origin`、校验 BattleConfig schema，并禁止配置内容直接作为 HTML 注入。
