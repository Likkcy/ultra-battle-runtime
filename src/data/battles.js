const commonSkills = [
  {
    id: "hand-slash",
    name: "手掌光箭",
    damage: 35,
    cost: 18,
    description: "一发干脆的光刃。快，也省事。",
    text: "光从掌缘甩出。"
  },
  {
    id: "zeppelion-ray",
    name: "哉佩利敖光线",
    damage: 78,
    cost: 50,
    description: "把大量能量压进一次出手。适合结束争论。",
    text: "双臂展开。光开始汇向同一点。"
  }
];

const commonItems = [
  {
    id: "energy-recover",
    name: "能量补给",
    type: "heal",
    heal: 30,
    uses: 2,
    description: "恢复 30 点 HP。"
  },
  {
    id: "barrier-pulse",
    name: "屏障脉冲",
    type: "barrier",
    reduction: 0.5,
    uses: 1,
    description: "下一轮受到的伤害减半。"
  }
];

const basePlayer = {
  id: "ultraman_tiga",
  name: "迪迦奥特曼",
  form: "复合型",
  maxHp: 100,
  hp: 100,
  attack: 29,
  maxEnergy: 100,
  energy: 46,
  skills: commonSkills,
  items: commonItems
};

export const golzaBattleConfig = {
  id: "tiga-vs-golza-showcase",
  meta: {
    key: "golza",
    title: "哥尔赞",
    subtitle: "地底怪兽",
    mode: "地震 / 破绽",
    difficulty: "STANDARD",
    recommendedPlayer: "tiga",
    blurb: "基础怪兽战重制：读震动、穿过裂缝，并抓住哥尔赞发力后右肩暴露的短暂破绽。"
  },
  player: {
    ...basePlayer,
    actions: [
      {
        id: "observe",
        effect: "golzaWeakRead",
        name: "观察",
        description: "确认发力顺序，并标记下一处破绽。",
        text: "你没有急着出手。",
        resultText: "它的右肩似乎是弱点？",
        repeatResults: [
          "每次震地前，右边的肩膀都会先沉下去。",
          "你已经看清了。接下来只需要等它自己露馅。"
        ]
      },
      {
        id: "provoke",
        effect: "provoke",
        name: "挑衅",
        description: "羞辱一只脑子不好使的怪兽？你干的对。",
        text: "你向前踏了一步。",
        resultText: "哥尔赞立马压低了身体，尘土从它的脚边震开。",
        repeatResults: [
          "它没有继续吼叫，只是把重心压在了前脚。",
          "已经没有更多可以激怒的余地了，它急眼了。"
        ]
      },
      {
        id: "focus",
        effect: "focus",
        name: "听震",
        description: "倾听震动抵达脚下的先后。下一次普通攻击更容易抓中。",
        text: "你把视线从烟尘里收了回来。",
        resultText: "攻击紧随着它的脚步而至",
        repeatResults: ["震动没有说谎。"]
      }
    ]
  },
  enemy: {
    id: "golza",
    name: "哥尔赞",
    subtitle: "地底怪兽",
    encounterMode: "tiga_golza",
    maxHp: 220,
    hp: 220,
    attack: 13,
    defense: 3,
    rage: 0,
    defenseMode: "dodge",
    patternSet: "golza_dodge",
    intro: ["地面在颤抖", "烟尘裂开,哥尔赞从废墟中觉醒了"],
    flavorText: [
      "石块从它背上不断滚落。",
      "哥尔赞用爪子刨开地面,地下传来了更深的回响。",
      "它用鼻息吹开灰尘，并且始终压低着右肩。",
      "它没有绕路的打算。"
    ],
    angryFlavor: [
      "哥尔赞不再试探。",
      "它将身体压低，为接下来的撞击做好了准备。"
    ],
    lowHpFlavor: [
      "它还在发出虚张声势的吼声。",
      "哥尔赞想把身体挺直，但它失败了"
    ],
    cleanDefenseFlavor: [
      "哥尔赞需要去学习一下瞄准了",
      "攻击擦过去以后，它的右肩慢了半拍。"
    ],
    hitDefenseFlavor: [
      "它没有给你重新站稳的时间。",
      "哥尔赞顺着你失去平衡的方向转过身体。"
    ],
    responses: [
      "哥尔赞把重量压向前脚。",
      "它猛地扬起头,地面也为之震动",
      "地下的震动声越来越近。"
    ],
    perfectHitFlavor: [
      "这一击打在它发力后的空档，让哥尔赞的整条右臂都被带得偏了出去。"
    ],
    skillReactions: {
      "hand-slash": ["光刃沿着肩甲切开,哥尔赞的右臂明显沉了一下。"],
      "zeppelion-ray": ["光线顶住了它的胸口,和它脚下刚刚隆起的地面一同被推平。"]
    },
    victoryText: "哥尔赞的吼声卡在了脖子里，当尘土再次落下时，它没有再站起来。"
  },
  arena: { durationMs: 7200 }
};

export const zettonBattleConfig = {
  id: "tiga-vs-zetton-showcase",
  meta: {
    key: "zetton",
    title: "杰顿",
    subtitle: "宇宙恐龙",
    mode: "方位格挡",
    difficulty: "TECHNICAL",
    blurb: "核心固定。判断来袭方向，把防御面转过去。杰顿不会替你解释第二遍。"
  },
  player: {
    ...basePlayer,
    energy: 58,
    actions: [
      {
        id: "analyze",
        effect: "telegraph",
        name: "分析",
        description: "开始仔细观察倾听，而不是盯着手。下一轮预警更长。",
        text: "你开始听那串叫声。",
        resultText: "每次真正攻击前，它的叫声都会快半拍。",
        repeatResults: [
          "规律还在。杰顿并不介意你听懂。",
          "你已经知道该听哪半拍了。"
        ]
      },
      {
        id: "bait",
        effect: "provoke",
        name: "诱导",
        description: "故意露出一个方向。攻势会更快，但防御会短暂松动。",
        text: "你故意慢了半拍。",
        resultText: "杰顿马上修正了角度。",
        repeatResults: ["它又跟了。至少算法没有自尊。"]
      },
      {
        id: "steady",
        effect: "guardAssist",
        name: "稳住",
        description: "不追假动作。下一轮格挡容错更高。",
        text: "你把注意力放回正面。",
        resultText: "多余的动作少了。",
        repeatResults: ["节奏已经稳住。杰顿仍然没有节奏可言。"]
      }
    ]
  },
  enemy: {
    id: "zetton",
    name: "杰顿",
    subtitle: "宇宙恐龙",
    maxHp: 260,
    hp: 260,
    attack: 15,
    defense: 5,
    rage: 0,
    defenseMode: "guard",
    patternSet: "zetton_guard",
    intro: ["杰顿登场。", "一声短促的电子音响起。"],
    flavorText: [
      "杰顿没有动。你希望是你没看到。",
      "电子音响了两声。反正不像是在笑。",
      "距离一分不多，一分不少。",
      "胸前的黄光亮了一下。没有后续。暂时。"
    ],
    angryFlavor: [
      "声音变急促了，看来恐龙也并非没有感情",
      "预警变短了。杰顿没有。"
    ],
    lowHpFlavor: [
      "你注意到叫声之间的间隔开始变得急促",
      "黄光停留得比之前更久。"
    ],
    cleanDefenseFlavor: [
      "最后一发也被挡下。电子音停了半拍。",
      "四个方向都没有空隙。杰顿重新开始计算。"
    ],
    hitDefenseFlavor: [
      "杰顿记住了你迟疑的方向。",
      "黄光一闪，杰顿似乎又在运算了"
    ],
    responses: [
      "杰顿抬起了一只手。",
      "黄光亮起。",
      "那串声音突然快了一拍。"
    ],
    perfectHitFlavor: [
      "攻击正中。电子音断了一拍，又接了回去。"
    ],
    skillReactions: {
      "hand-slash": ["光刃命中。杰顿只偏了一下头。"],
      "zeppelion-ray": ["光线逼近时，胸前的黄光骤然变亮。"]
    },
    victoryText: "令人心寒的声音戛然而止，杰顿回归了寂静"
  },
  arena: { durationMs: 7600 }
};

export const gatanothorBattleConfig = {
  id: "tiga-vs-gatanothor-showcase",
  meta: {
    key: "gatanothor",
    title: "加坦杰厄",
    subtitle: "邪神",
    mode: "黑暗终局 / 闪耀复苏",
    difficulty: "FINAL BOSS",
    recommendedPlayer: "tiga",
    blurb: "迪迦终局重制。前半仍是触腕、黑暗走廊与石化压迫；最终阶段会进入完整的石化处决、GUTS救援失败与世界之光复苏演出。"
  },
  player: {
    ...basePlayer,
    maxHp: 120,
    hp: 120,
    attack: 31,
    energy: 72,
    actions: [
      {
        id: "trace",
        effect: "telegraph",
        name: "追踪触腕",
        description: "把注意力转移到看海面被切开的方向，使下一轮特殊攻击预警更清楚。",
        text: "你把视线压到海面上。",
        resultText: "触腕总是晚海浪一步出现",
        repeatResults: ["海面仍在提前暴露它的路线。"]
      },
      {
        id: "call-light",
        effect: "light",
        name: "稳定身姿",
        description: "稳住颜色计时器同时恢复 EN，并减轻下一轮受到的伤害。",
        text: "你没有继续凝视那片不断扩大的黑暗。",
        resultText: "胸前的光变得重新稳定。",
        repeatResults: ["它没有变得更亮，但也没有熄灭。"]
      },
      {
        id: "hold-ground",
        effect: "bossFocus",
        name: "集中",
        description: "抵制海底传来的压迫，下一轮移动更快，并使下一次攻击更容易命中中心。",
        text: "你将脚踩进破碎的地面。",
        resultText: "黑暗没有后退，你也没有。",
        repeatResults: ["能够站立的地方越来越少。但你依旧站着。"]
      }
    ],
    items: [
      { id: "light-reserve", name: "光能储备", type: "heal", heal: 36, uses: 2, description: "恢复 36 点 HP。" },
      { id: "barrier-pulse", name: "屏障脉冲", type: "barrier", reduction: 0.5, uses: 1, description: "下一轮受到的伤害减半。" }
    ]
  },
  enemy: {
    id: "gatanothor",
    name: "加坦杰厄",
    subtitle: "邪神 · 黑海苏醒",
    encounterMode: "tiga_gatanothor_finale",
    boss: true,
    maxHp: 520,
    hp: 520,
    attack: 18,
    defense: 7,
    rage: 0,
    defenseMode: "boss",
    patternSet: "gatanothor_boss",
    intro: [
      "无风无波",
      "黑暗笼罩在你眼前",
      "巨大的壳从海雾里浮起。超古代邪神，黑暗支配者加坦杰厄降临"
    ],
    phases: [
      { id: "awakening", threshold: 1, title: "黑海苏醒", subtitle: "邪神 · 黑海苏醒", durationMs: 7600, text: [] },
      { id: "abyss", threshold: 0.66, title: "深渊下沉", subtitle: "邪神 · 深渊下沉", durationMs: 8300, text: ["就连海浪失去了方向。", "那并不是退潮，而是黑暗正在吞噬整个海面。"] },
      { id: "shining", threshold: 0.33, title: "致以辉煌的人们", subtitle: "邪神 · 光之海", durationMs: 9200, text: [] }
    ],
    flavorText: [
      "海面上依旧没有任何生命的痕迹，远处的城市里，灯在一盏接一盏暗下去。",
      "触腕从黑暗里升起，又沉回看不见的地方。",
      "浪声越来越近",
      "加坦杰厄没有追赶任何东西。黑暗自己在侵蚀着一切。"
    ],
    angryFlavor: [
      "黑暗变得更加深邃，你难以分辨自己身处何方。",
      "数道触腕在海下同时转向。"
    ],
    lowHpFlavor: [
      "巨壳深处传来了沉闷的裂响。",
      "黑暗仍覆盖着海面，但那裂缝里，若隐若现的光芒在破壳而出。"
    ],
    cleanDefenseFlavor: [
      "触腕将海面砸出了缺口，你依旧坚挺。",
      "石化的惨白光从身边掠过，颜色计时器还在亮着。"
    ],
    hitDefenseFlavor: [
      "你的呼吸被黑暗所剥夺，但下一道攻击已经到了。",
      "身体变得沉重，像有什么东西正在从光里抽走温度。"
    ],
    responses: [
      "黑暗变得更加的庞大了。",
      "触腕从黑暗里一根接一根抬起。",
      "加坦杰厄的眼中慢慢亮起惨白的光束。"
    ],
    phase2FlavorText: [
      "海面上漂着无数细小的光，它们没有被黑暗吞噬。",
      "闪耀迪迦矗立在光里，驱散着无边无际的黑暗。",
      "无声无响的光芒，所做的只有不断向前。"
    ],
    phase2CleanDefenseFlavor: [
      "石化之光撞上金色光层，却只是碎成一片惨白的雾。",
      "触腕被光弹开，波涛汹涌。"
    ],
    phase2HitDefenseFlavor: [
      "黑暗试图吞噬光芒，但无数细小的光前仆后继的在涌入，在升华。",
      "闪耀的轮廓晃动了，但不会倒下。"
    ],
    perfectHitFlavor: [
      "光在巨壳上炸开，闪烁出清晰的边缘。"
    ],
    skillReactions: {
      "hand-slash": ["光刃没入黑暗，斩断最近的触腕。"],
      "zeppelion-ray": ["哉佩利敖光线贯穿了整个海洋，在黑暗之中开出了一条通天大道。"],
      "glitter-zeppelion": ["金色的光线压过黑海，刹那间，黑暗如潮水般退去。"],
      "timer-flash-special": ["计时器的光向着邪神扩散出去，驱散一切黑暗。"]
    },
    victoryText: "黑海退去，第一束真正的晨光落在重新平静的海面上。"
  },
  arena: { durationMs: 7600 }
};

export const melbaBattleConfig = {
  id: "tiga-vs-melba-showcase",
  meta: {
    key: "melba",
    title: "美尔巴",
    subtitle: "超古代龙",
    mode: "高空追击",
    difficulty: "MOBILITY",
    blurb: "普通攻击够不到它。每轮先沿不断上升的平台追到足够高度，逼出弱点，再抓住一次攻击窗口。"
  },
  player: {
    ...basePlayer,
    energy: 52,
    actions: [
      {
        id: "read-wind",
        effect: "platformAssist",
        name: "看风",
        description: "看风向。下一次追击里，俯冲预警更早，起跳也更轻。",
        text: "你盯住平台边缘被卷起的尘土。",
        resultText: "风向先变，才轮到美尔巴。",
        repeatResults: ["你已经知道风从哪边来了。接下来只剩腿的问题。"]
      },
      {
        id: "bait-dive",
        effect: "provoke",
        name: "诱导俯冲",
        description: "故意留在开阔处。美尔巴会压低高度，也会露出更多破绽。",
        text: "你没有躲到平台后面。",
        resultText: "上方的影子立刻变大。",
        repeatResults: ["它又下来了。美尔巴对这招没有戒心，只有速度。"]
      },
      {
        id: "light-step",
        effect: "platformFocus",
        name: "轻身",
        description: "调整重心。下一轮跑得更快、跳得更高。",
        text: "你把重心压到前脚。",
        resultText: "下一次起跳会更干脆。",
        repeatResults: ["身体已经记住了这个节奏。"]
      }
    ]
  },
  enemy: {
    id: "melba",
    name: "美尔巴",
    subtitle: "超古代龙",
    maxHp: 210,
    hp: 210,
    attack: 14,
    defense: 4,
    rage: 0,
    defenseMode: "platform",
    patternSet: "melba_platform",
    requiresExposure: true,
    exposureDamageMultiplier: 1.45,
    intro: [
      "风先到了。",
      "下一秒，美尔巴从头顶掠过，抬升，消失在高处。"
    ],
    flavorText: [
      "美尔巴悬在够不到的高度。",
      "上面传来一声尖啸。它没有下来的意思。",
      "翼影从平台上掠过。只停了一瞬。",
      "你抬头。美尔巴也在看你。位置明显更舒服。"
    ],
    angryFlavor: [
      "美尔巴飞低了一点。不是为了方便你。",
      "俯冲越来越贴近平台。"
    ],
    lowHpFlavor: [
      "一侧翅膀慢了半拍。",
      "它还能升高。只是没之前那么快。"
    ],
    cleanDefenseFlavor: [
      "你追上了。至少这一次。",
      "高度终于不再属于它一个。"
    ],
    hitDefenseFlavor: [
      "脚下的平台从视野里掉了下去。",
      "美尔巴趁你落地时又拉开了一点距离。"
    ],
    chaseStartText: [
      "美尔巴再次拔高。要打到它，先追上去。",
      "它把高度拉开。你只能往上。"
    ],
    chaseFailFlavor: [
      "高度还差一点。美尔巴已经重新盘旋起来。",
      "你没追上。上方传来一声很满意的尖啸。"
    ],
    exposureFlavor: [
      "高度够了。翼根下的发光部位暴露在眼前。",
      "美尔巴就在这一层。现在它躲不开你的攻击。"
    ],
    exposureMissText: "光擦过弱点。美尔巴已经重新拉开高度。",
    exposureCloseText: "受击后，美尔巴猛地振翼，再次冲上高处。",
    responses: [
      "美尔巴振翼拔高。",
      "风压从上面压下来。",
      "它在更高的一层等你。"
    ],
    perfectHitFlavor: [
      "正中翼根。美尔巴的高度一下掉了下去。"
    ],
    skillReactions: {
      "hand-slash": ["光刃切过翼根。飞行轨迹立刻歪了一下。"],
      "zeppelion-ray": ["这一次，高度没能把它带出光线。"]
    },
    victoryText: "翅膀停止拍动。风声先落了地。"
  },
  arena: {
    durationMs: 15000,
    floorsPerRound: 9
  }
};


export const chaosLidoriasBattleConfig = {
  id: "cosmos-vs-chaos-lidorias-showcase",
  meta: {
    key: "chaos-lidorias",
    title: "混沌利多利阿斯",
    subtitle: "混沌怪兽",
    mode: "强攻 / 净化 · 高斯推荐",
    difficulty: "TECHNICAL",
    recommendedPlayer: "cosmos",
    requiredPlayer: "cosmos",
    blurb: "高斯路线的第一战。可在行动中切换月神/日冕；月神用近身净化脉冲救回利多利阿斯，日冕则用强攻突破混沌弹幕。"
  },
  actionsByPlayer: {
    tiga: [
      {
        id: "chaos-observe",
        effect: "telegraph",
        name: "观察",
        description: "辨认混沌能量爆发前的动作。下一轮预警更长。",
        text: "你观察着它的身体构造。",
        resultText: "混沌能量每次聚集时，胸前都会先亮起来。"
      },
      {
        id: "chaos-pressure",
        effect: "provoke",
        name: "压制",
        description: "逼它正面交锋。攻势更强，但防御会短暂松动。",
        text: "你向前逼近。",
        resultText: "利多利阿斯立刻迎了上来。"
      },
      {
        id: "chaos-focus",
        effect: "focus",
        name: "蓄势",
        description: "稳住节奏。下一次普通攻击更容易命中中心。",
        text: "你没有被它牵着鼻子走。",
        resultText: "下一次出手会更稳。"
      }
    ],
    cosmos: [
      {
        id: "cosmos-call",
        effect: "purifyPrep",
        name: "呼唤",
        description: "尝试让利多利阿斯听见高斯的声音。下一轮展开净化领域，可以直接净化混沌碎片。",
        text: "高斯放低了双手，试图唤醒利多利阿斯。",
        resultText: "利多利阿斯的动作停顿了一瞬。"
      },
      {
        id: "cosmos-approach",
        effect: "purifyFocus",
        name: "接近",
        description: "主动缩短距离。下一轮会出现更多可净化碎片，但攻击也更密集。",
        text: "高斯主动向前。",
        resultText: "黑紫色的能量开始从利多利阿斯身上剥离。"
      },
      {
        id: "cosmos-protect",
        effect: "mercyGuard",
        name: "守护",
        description: "下一轮展开净化领域，并减轻受到的伤害。",
        text: "高斯挡在利多利阿斯与远处的城市之间。",
        resultText: "它仍在攻击，你能看出，在攻击的时候，它的身体开始不住的挣扎。"
      }
    ]
  },
  player: {
    ...basePlayer,
    energy: 58,
    actions: []
  },
  enemy: {
    id: "chaos-lidorias",
    name: "混沌利多利阿斯",
    subtitle: "混沌怪兽",
    maxHp: 360,
    hp: 360,
    attack: 16,
    defense: 4,
    rage: 0,
    encounterMode: "cosmos_lidorias_forms",
    cosmosStartForm: "luna",
    defenseMode: "chaos",
    patternSet: "chaos_lidorias",
    intro: [
      "利多利阿斯痛苦地嘶鸣，黑紫色的混沌能量沿着身体不断扩散。",
      "它认得眼前的人，但身体不由自主的进行着破坏。"
    ],
    flavorText: [
      "混沌能量在羽翼之间不断闪动。",
      "利多利阿斯几次想停下来，但很快就被混沌重新掌控。",
      "黑紫色的光从胸前扩散到全身。",
      "它的攻击没有犹豫，可它的眼神中饱含痛苦。"
    ],
    angryFlavor: [
      "混沌能量开始失控。",
      "利多利阿斯的嘶鸣被更尖锐的杂音覆盖。"
    ],
    lowHpFlavor: [
      "利多利阿斯的动作明显慢了下来，混沌能量仍在驱使着它攻击。",
      "羽翼已经很难保持平衡。黑紫色的光还没有消失。"
    ],
    cleanDefenseFlavor: [
      "这一轮攻击没有碰到你。",
      "利多利阿斯重新抬起头，混沌能量再次聚集。"
    ],
    hitDefenseFlavor: [
      "混沌抓住了你的迟疑。",
      "利多利阿斯立刻跟上了下一次攻击。"
    ],
    purifyGoodFlavor: [
      "几块混沌碎片在高斯的光中消散，利多利阿斯的呼吸平稳了一些。",
      "黑紫色的光退开了一小片。利多利阿斯终于能自己停住了一次动作。",
      "混沌能量正在松动。"
    ],
    purifyPoorFlavor: [
      "混沌碎片重新没入利多利阿斯体内。它再次失控。",
      "黑紫色的光重新扩散，刚才的安抚做了白用功。"
    ],
    responses: [
      "利多利阿斯扬起双翼，混沌能量从胸前迸发。",
      "黑紫色的光沿着羽翼扩散。",
      "它发出一声痛苦的嘶鸣，随后再次冲了过来。"
    ],
    perfectHitFlavor: [
      "攻击正中，利多利阿斯被迫向后退开。"
    ],
    skillReactions: {
      "hand-slash": ["光刃命中，混沌能量在伤口附近剧烈闪烁。"],
      "zeppelion-ray": ["强光压过了混沌能量，利多利阿斯的整个身体被推了出去。"],
      "cosmos-luna-shot": ["月神光弹命中，利多利阿斯失去平衡，但混沌很快让它能够重新站稳。"]
    },
    mercy: {
      enabled: true,
      playerIds: ["ultraman_cosmos"],
      value: 0,
      threshold: 100,
      finishSkillId: "full-moon-rect",
      fragmentGain: 13,
      fragmentMissPenalty: 6,
      damagePenalty: 18,
      hitPenalty: 4,
      unsupportedText: "这道光没有得到回应。",
      lockedSkillText: "混沌能量还没有被压制。现在使用满月光波还太早。",
      successText: "满月光波穿过混沌能量，黑紫色的光逐渐散去，利多利阿斯终于恢复了意识。"
    },
    victoryText: "利多利阿斯倒了下去，混沌能量仍在它身上缓慢闪动。"
  },
  arena: {
    durationMs: 8200,
    chaosFragmentsPerRound: 5
  }
};



export const chaosUltramanBattleConfig = {
  id:"cosmos-vs-chaos-ultraman-showcase",
  meta:{key:"chaos-ultraman",title:"卡俄斯奥特曼",subtitle:"复制的光",mode:"COPY 归零 → 3 CORE 切断 → CALAMITY 决战",difficulty:"BOSS",recommendedPlayer:"cosmos",requiredPlayer:"cosmos",blurb:"这场战斗有三个明确目标：先用月神/日冕和敌方回合的 Z 操作把 COPY 降到 0；日蚀觉醒后切断 3 个标记 CORE 的复制节点；卡拉米提重构后 COPY 消失，此时才进入真正的 HP 决战。"},
  actionsByPlayer:{cosmos:[]},player:{...basePlayer,actions:[]},
  enemy:{id:"chaos-ultraman",name:"卡俄斯奥特曼",subtitle:"复制巨人",encounterMode:"cosmos_chaos_ultraman",cosmosStartForm:"luna",boss:true,maxHp:620,hp:620,attack:18,defense:5,rage:0,defenseMode:"chaos",patternSet:"chaos_ultraman_cosmos",cosmosEclipseUnlocked:false,
    interfaceGauge:{label:"COPY",value:68,threshold:100,passivePerTurn:8},
    intro:["卡俄斯的光变成了另一个高斯。"],
    phases:[
      {id:"copy",threshold:1,title:"COPY",subtitle:"卡俄斯奥特曼 · 模仿",durationMs:9000,text:[]},
      {id:"eclipse-break",threshold:.68,title:"ECLIPSE BREAK",subtitle:"慈爱与勇气 · 同一个答案",durationMs:9600,text:[]},
      {id:"calamity",threshold:.36,title:"CALAMITY",subtitle:"卡俄斯奥特曼卡拉米提 · 再构成",durationMs:10800,text:[]}
    ],
    flavorText:["它看着高斯，耐心地等待着，学习着。","一次次的模仿间，它的动作已经变得与高斯无异。","COPY 的光纹沿着胸口继续增长。"],
    responses:["卡俄斯奥特曼照着高斯的样子重新站好了。","它的双臂抬起，动作熟悉得让人不舒服。","赤紫色能量从复制出来的身体里溢出。"],
    cleanDefenseFlavor:["仓促的攻击擦过身边，高斯继续步步紧逼。"],hitDefenseFlavor:["一次命中之后，COPY 光纹又补全了一部分。"],lowHpFlavor:["复制体开始闪烁，它想要继续模仿，但很明显跟不上节奏。"],
    skillReactions:{"eclipse-blade":["三色光刃切进了复制结构，赤紫色细胞开始絮乱。"],"cosmium-beam":["克兹缪姆光线穿过它的身躯，OPY 光纹大片熄灭。"]},victoryText:"仿制出来的巨人失去同步。"
  },arena:{durationMs:8800}
};

export const chaosDarknessBattleConfig = {
  id:"cosmos-vs-chaos-darkness-showcase",
  meta:{key:"chaos-darkness",title:"卡俄斯头部 · 卡俄斯黑暗",subtitle:"全部卡俄斯海德的实体现身",mode:"三种答案亲手验证 → NO ANSWER → HEART",difficulty:"FINAL",recommendedPlayer:"cosmos",requiredPlayer:"cosmos",blurb:"前半不再靠削 HP 自动播剧情。玩家必须依次亲手尝试月神、日冕、日蚀三种答案；三种方法都被卡俄斯学习后进入 NO ANSWER 与顿悟。奇迹月神觉醒后，唯一目标改为 HEART 100%，最后使用露娜终结。"},
  actionsByPlayer:{cosmos:[]},player:{...basePlayer,actions:[]},
  enemy:{id:"chaos-darkness",name:"卡俄斯黑暗",subtitle:"卡俄斯海德 · 最终实体现",encounterMode:"cosmos_chaos_darkness",cosmosStartForm:"luna",cosmosEclipseUnlocked:true,boss:true,maxHp:780,hp:780,attack:21,defense:7,rage:0,defenseMode:"chaos",patternSet:"chaos_darkness_cosmos",
    interfaceGauge:{label:"ANSWER",value:0,threshold:3},
    intro:["卡俄斯黑暗重新出现。"],phases:[
      {id:"hatred",threshold:1,title:"HATRED",subtitle:"憎恨已经学会",durationMs:9800,text:[]},
      {id:"no-answer",threshold:.70,title:"NO ANSWER",subtitle:"更强的光也只会成为下一份敌意",durationMs:10400,text:[]},
      {id:"miracle",threshold:.40,title:"MIRACLE LUNA",subtitle:"憎恨的原野上能否开出和谐的花朵？",durationMs:11200,text:[]}
    ],
    flavorText:["它的每一次攻击都比上一次更像在回答人类的敌意。","黑暗没有失控。恰恰相反，它正在同化着一切。"],
    responses:["卡俄斯黑暗将光聚成了完全对称的阵列。","所有的黑紫色粒子同时转向高斯。","它无声地进行着越来越猛烈的攻击。"],
    cleanDefenseFlavor:["高斯从攻击之间穿过，第一次，黑暗没能补上缺口"],hitDefenseFlavor:["卡俄斯的光收紧了，它记住了这次伤害。"],
    lowHpFlavor:["黑暗的外壳仍然完整，只是攻击之间出现了短暂的停顿，它在产生情感吗？"],victoryText:"卡俄斯没有被消灭。"
  },arena:{durationMs:9400}
};



export const mephistoOneBattleConfig = {
  id: "nexus-vs-mephisto-one-showcase",
  meta: {
    key: "mephisto-one",
    title: "黑暗梅菲斯特",
    subtitle: "姬矢准 · 最后的宿命",
    mode: "负伤决战 / 塞拉 / 一滴光 / 夜袭队复苏",
    difficulty: "BOSS",
    recommendedPlayer: "nexus",
    requiredPlayer: "nexus",
    blurb: "奈克瑟斯路线第一战重构。姬矢准拖着已经到极限的身体迎战黑暗梅菲斯特：先败北，再在发光树林里重新理解这份光，随后以 1 HP 锁血坚持到夜袭队把能量送回核心。"
  },
  actionsByPlayer: { nexus: [] },
  player: { ...basePlayer, actions: [] },
  enemy: {
    id: "mephisto-one",
    name: "黑暗梅菲斯特",
    subtitle: "Dark Mephisto · 异形之海",
    boss: true,
    encounterMode: "nexus_mephisto_one_himeya",
    maxHp: 438,
    hp: 438,
    attack: 19,
    defense: 5,
    rage: 0,
    defenseMode: "nexus",
    patternSet: "mephisto_one_nexus",
    nexusBattle: true,
    intro: [],
    phases: [
      { id:"fate", threshold:1, title:"宿命", subtitle:"姬矢准 · 负伤", durationMs:7600, text:[] },
      { id:"one-light", threshold:.72, title:"ONE LIGHT", subtitle:"1 HP · 光不会熄灭", durationMs:8300, text:[] },
      { id:"junis-return", threshold:.38, title:"RESTORED", subtitle:"夜袭队能量照射 · 青年形态", durationMs:9000, text:[] }
    ],
    flavorText: [
      "梅菲斯特没有急着终结奈克瑟斯，它知道适能者的身体早已到达了极限。",
      "黑暗长矛贴着地面划过，奈克瑟斯的动作比之前更慢。",
      "异形之海里没有风，只有核心越来越急的闪烁。"
    ],
    phase1FlavorText: [
      "明明连光芒都没有，可梅菲斯特发现，无论如何都无法击溃巨人。",
      "姬矢的身体已经无法承受下一次冲击。可他没有把手放下。",
      "梅菲斯特开始连续逼近，它想证明这份选择仍然只是徒劳。"
    ],
    phase2FlavorText: [
      "夜袭队送来的能量还在胸前燃烧，而准的心脏也在燃烧着。",
      "奈克瑟斯向前一步。梅菲斯特竟第一次主动后退。",
      "这不是姬矢寻找的死地，这是他自己选择完成的战斗。"
    ],
    cleanDefenseFlavor: ["黑暗长矛擦过肩侧，奈克瑟斯没有浪费这一步。"],
    hitDefenseFlavor: ["未愈的伤口又被扯开，核心急促地闪烁着。"],
    victoryText: "白光吞没了异形之海。"
  },
  arena: { durationMs:7600 }
};

export const pedoleonBattleConfig = {
  id: "nexus-vs-pedoleon-showcase",
  meta: {
    key: "pedoleon",
    title: "佩德隆",
    subtitle: "异生兽 · 捕食型",
    mode: "生命循环 / 捕食切断",
    difficulty: "TECHNICAL",
    recommendedPlayer: "nexus",
    blurb: "奈克瑟斯的第一场专属战。生命会持续下降，技能直接消耗 HP；敌方回合还要主动切断被佩德隆吸收的捕食胞，用进攻把生命抢回来。"
  },
  actionsByPlayer: {
    nexus: [
      {
        id: "nexus-read-feeding",
        effect: "nexusRead",
        name: "看清输送",
        description: "下一轮捕食胞和触手预警更明显，切断距离也更宽。",
        text: "你没有追着触手看。",
        resultText: "真正需要切断的，是那些正在往它体内送东西的组织。"
      },
      {
        id: "nexus-stabilize-core",
        effect: "nexusStabilize",
        name: "压住核心",
        description: "下一轮获得一次伤害缓冲，并让本回合结束时的固定生命损耗减半。不会造成任何伤害。",
        text: "你按住胸前不断闪烁的核心。",
        resultText: "闪烁慢了下来。只是暂时。"
      },
      {
        id: "nexus-force-feedline",
        effect: "nexusPressure",
        name: "逼近捕食线",
        description: "下一轮会出现更多捕食胞。风险更高，但也意味着更多可以切断并回血的机会。",
        text: "你主动贴近了它的捕食范围。",
        resultText: "佩德隆的触手全都转了过来。"
      }
    ],
    tiga: [
      { id: "pedoleon-observe", effect: "telegraph", name: "观察", description: "下一轮预警更长。", text: "你盯住那些正在收缩的触手。", resultText: "它们总在捕食胞靠近前先让开一条路。" },
      { id: "pedoleon-focus", effect: "focus", name: "凝神", description: "下一次攻击更容易命中。", text: "你重新站稳。", resultText: "下一次出手会更稳。" }
    ],
    leo: [
      { id: "pedoleon-brace", effect: "leoBrace", name: "沉肩", description: "下一轮更容易接住正面攻击。", text: "雷欧压低了重心。", resultText: "触手正从正面靠近。" }
    ],
    cosmos: [
      { id: "pedoleon-watch", effect: "telegraph", name: "观察", description: "下一轮预警更长。", text: "高斯保持距离。", resultText: "这只异生兽只有饥饿，没有犹豫。" }
    ]
  },
  player: { ...basePlayer, actions: [] },
  enemy: {
    id: "pedoleon",
    name: "佩德隆",
    subtitle: "异生兽 · 古罗斯",
    maxHp: 276,
    hp: 276,
    attack: 15,
    defense: 3,
    rage: 0,
    defenseMode: "nexus",
    patternSet: "pedoleon_nexus",
    nexusBattle: true,
    predation: {
      value: 28,
      threshold: 100,
      feedGain: 14,
      severReduce: 11,
      feedHeal: 7,
      severDamage: 8
    },
    intro: [
      "隧道里只剩下车灯。",
      "油罐车被什么东西拖离了地面。佩德隆从混凝土后爬了出来。",
      "奈克瑟斯落地。胸前的核心已经在闪。"
    ],
    phases: [
      {
        id: "guros",
        threshold: 1,
        title: "捕食",
        subtitle: "异生兽 · 古罗斯",
        durationMs: 8200,
        text: []
      },
      {
        id: "fliegen",
        threshold: 0.52,
        title: "美塔领域",
        subtitle: "异生兽 · 弗利根",
        durationMs: 9000,
        nexusMetaField: true,
        text: [
          "佩德隆背部喷出了可燃气体。",
          "火焰卷过身体。它升了起来。",
          "相位转换波切开夜空。周围的景色被美塔领域吞没。"
        ]
      }
    ],
    flavorText: [
      "佩德隆的触手贴着地面寻找下一口食物。",
      "油味越来越重。",
      "它没有看你。它在找能吃的东西。"
    ],
    phase1FlavorText: [
      "美塔领域里没有车辆可吃。佩德隆开始把注意力全部放在你身上。",
      "它在半空收缩身体。捕食胞仍在向核心聚拢。",
      "领域边缘轻轻震了一下。"
    ],
    lowHpFlavor: [
      "几根触手已经缩了回去。",
      "它的身体开始失水，动作变得迟钝。"
    ],
    cleanDefenseFlavor: [
      "触手扑空。佩德隆立刻换了方向。",
      "这一轮没有抓到你。它的捕食没有停。"
    ],
    hitDefenseFlavor: [
      "核心的闪烁快了一拍。",
      "触手擦过身体。生命流失得更快了。"
    ],
    severGoodFlavor: [
      "送往佩德隆体内的捕食胞被切断了。",
      "几团组织在半路失去活性。佩德隆的身体随之收缩。"
    ],
    feedBadFlavor: [
      "捕食胞钻回了它的身体。佩德隆又鼓胀了一点。",
      "它吞了下去。伤口正在重新合拢。"
    ],
    predationHighFlavor: [
      "佩德隆吃得太多了。体内开始传出不稳定的沸腾声。",
      "它的身体已经鼓胀到几乎透明。"
    ],
    responses: [
      "佩德隆把几根触手伸进了阴影里。",
      "它的身体中央开始收缩。",
      "一团新的捕食胞从触手末端鼓了出来。"
    ],
    phase1Responses: [
      "佩德隆在领域上空转向。",
      "几条触手同时垂了下来。",
      "它把刚刚吸收的组织重新送向核心。"
    ],
    perfectHitFlavor: [
      "伤口被整个切开。佩德隆来不及收拢身体。"
    ],
    skillReactions: {
      "particle-feather": ["弧光切断一排触手。失去支撑的组织落了下来。"],
      "cross-ray-schtrom": ["十字光贯穿了半透明的身体。佩德隆内部的捕食组织一起亮了起来。"]
    },
    victoryText: "佩德隆的身体失去形状，最后一批捕食胞也停止了蠕动。"
  },
  arena: {
    durationMs: 8200,
    feedingCellsPerRound: 5
  }
};


export const mephistoZweiBattleConfig = {
  id: "nexus-vs-mephisto-zwei-showcase",
  meta: {
    key: "mephisto-zwei",
    title: "黑暗梅菲斯特·二代",
    subtitle: "赤眼的黑暗巨人",
    mode: "夕阳决战 / 青年蓝 / 黑暗梅菲斯特再临",
    difficulty: "BOSS",
    recommendedPlayer: "nexus",
    requiredPlayer: "nexus",
    blurb: "千树怜在夕阳与撤离的人群中重新选择‘为了活下去而战’，随后以青年蓝迎战梅菲斯特二代。敌方回合可以直接射击吸能体和赤眼标记；后段梅菲斯特二代会把怜瞬间压到濒死，沟吕木重新化为原本的黑暗梅菲斯特，以巨人之躯徒手聚光并锁住二代，为青年蓝撕开最后的攻击窗口。"
  },
  actionsByPlayer: { nexus: [] },
  player: { ...basePlayer, actions: [] },
  enemy: {
    id: "mephisto-zwei",
    name: "黑暗梅菲斯特·二代",
    subtitle: "Dark Mephisto Zwei",
    boss: true,
    encounterMode: "nexus_mephisto_zwei",
    maxHp: 382, hp: 382, attack: 19, defense: 4, rage: 0,
    defenseMode: "nexus",
    patternSet: "mephisto_zwei_nexus",
    nexusBattle: true,
    interfaceGauge: { label: "DARK DRAIN", value: 34, threshold: 100 },
    intro: [],
    phases: [
      { id: "blue-duel", threshold: 1, title: "赤眼", subtitle: "青年蓝 · Dark Field G", durationMs: 9200, text: [] },
      { id: "drain-hunt", threshold: .58, title: "吸收", subtitle: "光能夺取 · 赤眼追猎", durationMs: 9800, text: ["梅菲斯特二代不再只是追着身体打，它开始追着核心的闪烁移动。"] },
      { id: "mizorogi", threshold: .24, title: "活下去", subtitle: "沟吕木真也 · 黑暗梅菲斯特再临", durationMs: 9600, text: [] }
    ],
    flavorText: [
      "红色的眼睛一直没有从核心上移开。",
      "黑暗领域里的声音被吸走了，只剩下脚步。",
      "梅菲斯特二代每次消失，都会从你刚刚看过的方向回来。"
    ],
    phase1FlavorText: [
      "吸能体沿着黑暗纹路靠近。",
      "它没有急着进攻，因为怜的生命已如风中残烛一般。",
      "赤眼标记在远处一闪，又换了位置。"
    ],
    phase2FlavorText: [
      "那道白紫色的光还缠在梅菲斯特二代身上。",
      "沟吕木已经无法站稳，可那双手却始终没有放下。",
      "这一秒很短，但已经够用了。"
    ],
    cleanDefenseFlavor: ["你从黑暗爪痕之间穿了过去，黑暗梅菲斯特第一次跟丢了你。"],
    hitDefenseFlavor: ["黑暗顺着伤口向核心攀爬，DARK DRAIN 又高了一截。"],
    victoryText: "赤红的眼睛熄灭，黑暗领域里只剩下一道正在消散的轮廓。"
  },
  arena: { durationMs: 9400, shootTargetsPerRound: 5 }
};

export const darkZagiBattleConfig = {
  id: "nexus-vs-dark-zagi-showcase",
  meta: {
    key: "dark-zagi",
    title: "黑暗扎基",
    subtitle: "暗黑破坏神",
    mode: "四形态传承 / Nexus = 纽带",
    difficulty: "BOSS",
    recommendedPlayer: "nexus",
    requiredPlayer: "nexus",
    blurb: "最终战分为幼年形态、青年红、青年蓝与诺亚四个阶段。每次形态变化都不是普通强化，而是光在不同适能者之间留下的战斗方式重新被孤门接住。黑暗扎基拥有大量不同攻击语言，最终诺亚阶段把前面建立的纽带真正收束起来。"
  },
  actionsByPlayer: { nexus: [] },
  player: { ...basePlayer, actions: [] },
  enemy: {
    id: "dark-zagi",
    name: "黑暗扎基",
    subtitle: "Dark Zagi",
    boss: true,
    encounterMode: "nexus_dark_zagi_bond",
    maxHp: 1680, hp: 1680, attack: 22, defense: 6, rage: 0,
    defenseMode: "nexus",
    patternSet: "dark_zagi_nexus",
    nexusBattle: true,
    interfaceGauge: { label: "NEXUS", value: 18, threshold: 100 },
    intro: [],
    phases: [
      { id: "anphans", threshold: 1, title: "NEXUS", subtitle: "幼年形态 · 孤门一辉", durationMs: 8600, text: [] },
      { id: "junis", threshold: .76, title: "JUNIS", subtitle: "青年红 · 姬矢准", durationMs: 9400, text: [] },
      { id: "junis-blue", threshold: .50, title: "JUNIS BLUE", subtitle: "青年蓝 · 千树怜", durationMs: 9800, text: [] },
      { id: "noa", threshold: .24, title: "NOA", subtitle: "纽带 · 光的完整形态", durationMs: 10800, text: [] }
    ],
    flavorText: [
      "扎基没有任何保留，这是一场真正的生死搏斗。",
      "黑色巨人站在城市中央，吞噬着周围的光芒与希望。",
      "每一次猩红的灯光亮起，空气都变得难以忍受的沉重。"
    ],
    phase1FlavorText: [
      "红色形态的奈克瑟斯站稳以后，扎基第一次真正收回了拳。",
      "美塔领域的残光贴在脚下，这里没有人替你承受下一击。",
      "扎基的冲撞越来越直接。"
    ],
    phase2FlavorText: [
      "蓝色的光把战场拉得更快，扎基也跟着加速。",
      "黑暗的光束在空中乱舞。",
      "这一阶段没有安全角落，只有不断改变的位置。（这句我不知道哪里的）"
    ],
    phase3FlavorText: [
      "银色的双翼展开，城市重新被光芒沐浴。",
      "扎基把所有剩余的力量压进了红色闪电里。",
      "这不仅仅是光的交接，那连接着人们的纽带一直没有消失，一直在不断传承着。"
    ],
    cleanDefenseFlavor: ["红光掠过，下一道攻击已经接踵而至。"],
    hitDefenseFlavor: ["扎基没有停顿，被击中的一瞬间，就释放了狠厉的下一招。"],
    victoryText: "黑暗扎基的身体从胸口开始崩溃瓦解，银色的光把最后一道黑暗带离了城市。"
  },
  arena: { durationMs: 9600 }
};

export const girasBrothersBattleConfig = {
  id: "leo-vs-giras-magma-showcase",
  meta: {
    key: "giras-brothers",
    title: "马格马星人 / 红基拉斯 / 黑基拉斯",
    subtitle: "L77的仇敌",
    mode: "三方围杀 / Giras Spin",
    difficulty: "DUEL",
    recommendedPlayer: "leo",
    requiredPlayer: "leo",
    blurb: "三人从一开始就在场。双子怪兽用高速旋转形成几乎正面不可破的 Giras Spin，马格马星人负责封住你破阵的路线。雷欧必须在敌方回合主动迎击、逆着旋转拆开双子节奏，第二阶段还要在不断上涨的海潮里完成破阵。"
  },
  actionsByPlayer: {
    leo: [
      {
        id: "leo-reverse-spin",
        effect: "leoReverseSpin",
        name: "反向旋转",
        description: "把特训真正用出来。降低 GIRAS SPIN，并扩大下一轮迎击窗口。",
        text: "雷欧没有摸不着头脑的乱跑，而是先朝反方向迈了一步。",
        resultText: "旋转开始出现了偏差。"
      },
      {
        id: "leo-watch-magma",
        effect: "leoRead",
        name: "盯住马格马",
        description: "下一轮佩剑和双子冲阵的预警更长。",
        text: "你不再只是看着双子怪兽，你明白马格马星人才是命令的起点。",
        resultText: "它抬剑时，红基拉斯总会先动。"
      },
      {
        id: "leo-step-inside",
        effect: "leoBreakCommand",
        name: "切进内圈",
        formationReduce: 16,
        rage: 0.22,
        description: "主动踏进三人之间。SPIN 大幅下降，但下一轮攻势会更激进。",
        text: "雷欧没有退出包围圈，反而向里踏了一步。",
        resultText: "马格马星人的剑来不及同时照顾两头怪兽。"
      },
      {
        id: "leo-brace-tide",
        effect: "leoBrace",
        name: "压住海潮",
        minPhase: 1,
        description: "第二阶段用重心对抗海潮。下一轮减伤并保留迎击辅助。",
        text: "海水已经没过脚踝，雷欧把重心压得更低。",
        resultText: "汹涌的海浪和轰鸣的狂雷时刻提醒着雷欧事情还没有结束"
      }
    ]
  },
  player: { ...basePlayer, actions: [] },
  enemy: {
    id: "giras-brothers",
    name: "红基拉斯 / 黑基拉斯",
    subtitle: "双子怪兽 · 马格马星人指挥",
    boss: true,
    encounterMode: "leo_giras_rework",
    maxHp: 326,
    hp: 326,
    attack: 17,
    defense: 5,
    rage: 0,
    defenseMode: "leo",
    patternSet: "leo_giras_rework",
    formation: {
      value: 92,
      threshold: 100,
      phase0Label: "GIRAS SPIN",
      phase1Label: "GIRAS SPIN",
      recoverPerTurn: 7
    },
    intro: [
      "红基拉斯和黑基拉斯同时落下。",
      "马格马星人没有站到它们身后，而是站在正中指挥着。",
      "无需多言，这场战斗注定以一方的消亡而告终。"
    ],
    phases: [
      { id: "encirclement", threshold: 1, title: "围杀", subtitle: "三方围杀 · Giras Spin", durationMs: 8600, text: [] },
      {
        id: "great-submergence",
        threshold: .52,
        title: "大沉没",
        subtitle: "Giras Spin · 海潮上涨",
        durationMs: 9400,
        text: [
          "双子怪兽同时把角压向海面。",
          "海浪在上涨。",
          "马格马星人仍然站在唯一能破坏旋转的位置。"
        ]
      }
    ],
    flavorText: [
      "马格马星人只动了一下剑尖，两头怪兽便重新错开。",
      "双子怪兽没有追击，它们试图重新进行旋转。",
      "红与黑的身体开始围着同一点加速。"
    ],
    phase1FlavorText: [
      "海水一次比一次高，双子的旋转还没有停。",
      "浪头压过来时，马格马星人的剑也到了。",
      "旋转、海潮、佩剑——三件事正试图变成同一个节奏。"
    ],
    cleanDefenseFlavor: ["这一轮围杀没有闭合。Giras Spin 慢了一拍。"],
    hitDefenseFlavor: ["马格马星人把你逼回双子的旋转半径。"],
    formationBrokenFlavor: ["双子怪兽的圆心彻底散了，现在它们只是各自为战两头怪兽。"],
    perfectHitFlavor: ["这一击正好撞进旋转接缝，双子怪兽被迫分开。"],
    skillReactions: {
      "leo-kick": ["飞踢从红、黑两道身影之间穿了进去。"],
      "energy-light-ball": ["光球逼得马格马星人让开，旋转少了一层保护。"],
      "corkscrew-kick": ["回旋飞踢和 Giras Spin 正面对上。旋转第一次被反着拧开。"]
    },
    victoryText: "两头怪兽倒下时，马格马星人没有留下来报仇。它收起佩剑，转身逃离了海面。"
  },
  arena: { durationMs: 8600, leoCounterBase: 20 }
};

export const pressureBattleConfig = {
  id: "leo-vs-pressure-showcase",
  meta: {
    key: "pressure",
    title: "普雷夏星人",
    subtitle: "宇宙的魔法使",
    mode: "缩小 / 巨物逃生 / Ultra Mantle",
    difficulty: "TECHNICAL",
    recommendedPlayer: "leo",
    requiredPlayer: "leo",
    blurb: "普雷夏不是单纯发魔法弹。中段它会真的把雷欧缩成只有人偶大小：核心、碰撞和世界尺度一起改变，巨大的瓦砾与气球陷阱会占满战斗框。撑过缩小阶段后，奥特之王用 King Hammer 恢复雷欧，并把 Ultra Mantle 变成反射魔法的新操作。"
  },
  actionsByPlayer: {
    leo: [
      { id: "pressure-watch-staff", effect: "pressureRead", name: "看杖尖", maxPhase: 0, description: "下一轮魔法预警更长。", text: "雷欧盯住那根杖，而不是盯着普雷夏的脸。", resultText: "每次空间变形以前，杖尖都会先停一下。" },
      { id: "pressure-fly-small", effect: "pressureSmallFocus", name: "贴地飞", minPhase: 1, maxPhase: 1, description: "缩小状态下提高移动速度并扩大气球逃脱余量。", text: "身体只剩这么大，地面也变成了另一片天空。", resultText: "别和巨物硬碰硬。先活下来。" },
      { id: "pressure-dont-stop", effect: "pressureSmallGuard", name: "继续打", minPhase: 1, maxPhase: 1, description: "微小攻击几乎伤不到它，但下一轮获得减伤。", text: "雷欧还是朝那个巨大的影子冲了过去。", resultText: "力量没变小。只是世界突然大得离谱。" },
      { id: "pressure-open-mantle", effect: "pressureMantle", name: "展开披风", minPhase: 2, description: "下一轮扩大魔法反射范围，并获得一次减伤。", text: "银色披风从肩后张开。", resultText: "这一次，魔法会原路回去。" }
    ]
  },
  player: { ...basePlayer, actions: [] },
  enemy: {
    id: "pressure",
    name: "普雷夏星人",
    subtitle: "宇宙的魔法使",
    boss: true,
    encounterMode: "leo_pressure",
    maxHp: 274,
    hp: 274,
    attack: 15,
    defense: 3,
    rage: 0,
    defenseMode: "pressure",
    patternSet: "leo_pressure",
    interfaceGauge: { label: "SCALE LOSS", value: 0, threshold: 100 },
    intro: [
      "彩色的烟散开以后，普雷夏星人已经站在另一边。",
      "它把杖举起来。周围的东西先失去了重量。"
    ],
    phases: [
      { id: "magician", threshold: 1, title: "魔法使", subtitle: "空间魔法", durationMs: 8200, text: [] },
      { id: "one-inch-leo", threshold: .63, title: "一寸雷欧", subtitle: "微小化 · 巨物世界", durationMs: 8600, text: [] },
      { id: "king-gift", threshold: 0, title: "King Hammer", subtitle: "Ultra Mantle · 魔法反射", durationMs: 9000, text: [] }
    ],
    flavorText: ["普雷夏星人换了一个位置。你没看清它是怎么过去的。", "杖尖绕了一圈。旁边的瓦砾开始浮起来。"],
    phase1FlavorText: ["普雷夏星人的脚现在像一堵墙。", "一块普通碎石从头顶滚过，大小已经像陨石。", "远处的笑声比雷声还大。"],
    phase2FlavorText: ["普雷夏看见那件披风以后，第一次把杖收近了。", "银色披风没有被风吹动，它在等下一道魔法。"],
    cleanDefenseFlavor: ["魔法落空，普雷夏立刻换了位置。"],
    hitDefenseFlavor: ["空间像被杖尖折了一下。"],
    victoryText: "银色披风收回肩后。普雷夏的魔法再也没有落到地面。"
  },
  arena: { durationMs: 8200, shrunkRounds: 2, mantleReflectDamage: 18 }
};

export const blackEndBattleConfig = {
  id: "leo-vs-black-end-showcase",
  meta: {
    key: "black-end",
    title: "布莱克恩多",
    subtitle: "最后的圆盘生物",
    mode: "托奥尔 / 人质 / 孩子们的反击",
    difficulty: "BOSS",
    recommendedPlayer: "leo",
    requiredPlayer: "leo",
    blurb: "雷欧的结尾不是另一场‘大家给英雄加力量’。开战前玩家先控制托奥尔靠自己的双腿逃离；战斗中布莱克指令把他抓作人质，雷欧只能承受攻击，随后控制权真正交到孩子们手里。孩子们自己围住布莱克指令、夺下水晶，再把最后一击交回雷欧。"
  },
  actionsByPlayer: {
    leo: [
      { id: "black-end-read-horns", effect: "blackEndRead", name: "看角", description: "下一轮冲撞预警更长，折角迎击范围扩大。", text: "雷欧盯住布莱克恩多背后的角。", resultText: "它转身以前，背部会先抬起来。" },
      { id: "black-end-close", effect: "blackEndClose", name: "贴身", description: "主动逼近，HORN GUARD 下降，但下一轮更凶。", text: "雷欧没有给它喷火的距离。", resultText: "布莱克恩多开始用角硬顶。" },
      { id: "black-end-stand", effect: "leoBrace", name: "站稳", description: "下一轮减伤并保留迎击辅助。", text: "雷欧把脚重新踩进地面。", resultText: "这一次，谁也别想把他从这里推走。" }
    ]
  },
  player: { ...basePlayer, actions: [] },
  enemy: {
    id: "black-end",
    name: "布莱克恩多",
    subtitle: "最后的圆盘生物",
    boss: true,
    encounterMode: "leo_black_end",
    maxHp: 420,
    hp: 420,
    attack: 22,
    defense: 6,
    rage: 0,
    defenseMode: "leo",
    patternSet: "leo_black_end",
    formation: { value: 100, threshold: 100, phase0Label: "HORN GUARD", phase1Label: "HORN GUARD", recoverPerTurn: 0 },
    intro: [],
    phases: [
      { id: "last-saucer", threshold: 1, title: "最后的圆盘生物", subtitle: "角 / 火炎 / 近身战", durationMs: 9000, text: [] },
      { id: "hostage", threshold: .44, title: "人质", subtitle: "布莱克指挥官 · 托奥尔", durationMs: 9200, text: [] },
      { id: "crystal", threshold: 0, title: "最后的反扑", subtitle: "命令断开 · 暴走", durationMs: 11200, text: [] }
    ],
    flavorText: ["布莱克恩多没有寻找城市破坏，它一直在呼唤雷欧的名字。", "黑色水晶在远处闪了一下，布莱克恩多立刻改变了方向。", "背后的巨角从地面上刮过。"],
    phase2FlavorText: ["水晶已经不在布莱克指挥官的手里，布莱克恩多反而冲得更凶。", "它失去了命令。巨角、黑焰和圆盘刃开始毫无节制地一起落下。", "远处的孩子们没有跑，雷欧也没有退。"],
    cleanDefenseFlavor: ["火焰在身后爆炸，布莱克恩多转身比想象中更慢。"],
    hitDefenseFlavor: ["巨角撞过来时，地面一起陷了下去。"],
    formationBrokenFlavor: ["最后一根用于护身的巨角已经断了。"],
    victoryText: "最后的圆盘生物停了下来。"
  },
  arena: { durationMs: 10200, childSequenceSuccesses: 6 }
};


export const thunderDarambiaBattleConfig = {
  id: "ginga-vs-thunder-darambia-showcase",
  meta: {
    key: "thunder-darambia",
    title: "雷电达兰比尔",
    subtitle: "闪电怪兽",
    mode: "Ultra Live / 电路反转",
    difficulty: "TECHNICAL",
    recommendedPlayer: "ginga",
    requiredPlayer: "ginga",
    blurb: "第一阶段先 Ultra Live 布莱克王，在通电场地里用重踏接地；被大放电压制后，菜单只剩 LIVE。首次变身银河后，同一种雷电会从危险变成可主动导流的资源。"
  },
  actionsByPlayer: {
    ginga: [
      {
        id: "ginga-trace-circuit",
        effect: "gingaTrace",
        name: "看线路",
        maxPhase: 0,
        description: "下一轮的电路预警更长，黑王的重踏接地范围扩大。",
        text: "你开始关注电流的具体流向。",
        resultText: "亮起的节点似乎具有某种规律？"
      },
      {
        id: "ginga-anchor-ground",
        effect: "gingaAnchor",
        name: "压住地面",
        maxPhase: 0,
        description: "立刻压低 STATIC，并让下一轮第一次受击减轻。",
        text: "布莱克王把脚掌压进地面。",
        resultText: "电流从脚下散开。"
      },
      {
        id: "ginga-invite-overload",
        effect: "gingaOverload",
        name: "故意留电",
        maxPhase: 0,
        description: "STATIC 立刻上升；下一轮出现更多可接地节点，成功接地的收益也更大。",
        text: "你没有马上把最后一条电路砸断。",
        resultText: "雷电达兰比尔把更多电流送了过来。"
      },
      {
        id: "ginga-read-frequency",
        effect: "gingaConductRead",
        name: "仔细观察",
        minPhase: 1,
        description: "下一轮导流窗口更宽，雷击预警更清楚。",
        text: "你没有追着闪电不放。",
        resultText: "真正要注意的是亮度突然收紧的那一瞬。"
      },
      {
        id: "ginga-call-lightning",
        effect: "gingaConductBait",
        name: "引雷",
        minPhase: 1,
        description: "下一轮可导流雷击更多，但普通攻击也会更密。",
        text: "银河水晶的光主动亮了一下。",
        resultText: "雷电达兰比尔立刻把头转了过来。"
      },
      {
        id: "ginga-hold-charge",
        effect: "gingaHoldCharge",
        name: "稳住充能",
        minPhase: 1,
        description: "下一轮受到的第一次伤害减轻；如果已经有 Plasma Charge，不会因受击而散失。",
        text: "你把黄色光辉压回水晶内部。",
        resultText: "充能没有外泄。"
      }
    ]
  },
  player: {
    ...basePlayer,
    actions: []
  },
  enemy: {
    id: "thunder-darambia",
    name: "雷电达兰比尔",
    subtitle: "闪电怪兽 · 带电场",
    boss: true,
    encounterMode: "ginga_darambia",
    maxHp: 350,
    hp: 350,
    attack: 16,
    defense: 4,
    rage: 0,
    defenseMode: "ginga",
    patternSet: "thunder_darambia",
    static: {
      value: 12,
      threshold: 100,
      groundReduce: 15,
      missGain: 7
    },
    plasma: {
      value: 0,
      threshold: 3
    },
    intro: [
      "雷云压低了。",
      "雷电达兰比尔站在不断亮起的电路中央。",
      "银河火花扫过布莱克王的 Spark Doll。",
      "ULTRALIVE — BLACK KING."
    ],
    phases: [
      {
        id: "black-king-circuit",
        threshold: 1,
        title: "BLACK KING",
        subtitle: "ULTRALIVE · 接地战",
        durationMs: 7800,
        text: []
      },
      {
        id: "ginga-conduct",
        threshold: -1,
        title: "ULTRAMAN GINGA",
        subtitle: "银河奥特曼 · Plasma Conduct",
        durationMs: 8600,
        text: []
      }
    ],
    flavorText: [
      "地面上的节点又亮了一批。",
      "雷电达兰比尔把电流压进地面。",
      "布莱克王脚边传来低沉的震动。"
    ],
    phase1FlavorText: [
      "黄色电弧在银河水晶表面跳了一下。",
      "雷电达兰比尔还在放电，你已经能摸清楚它的规律了。",
      "几道电弧在场地中央互相交缠。"
    ],
    cleanDefenseFlavor: [
      "这一轮电流没能合拢。",
      "几条导线熄灭了。"
    ],
    hitDefenseFlavor: [
      "电流从身体表面炸开。",
      "场地再次亮成一片。"
    ],
    groundedFlavor: [
      "一整段电路被布莱克王踩灭了。",
      "电流被引进地面，节点暗了下去。"
    ],
    conductFlavor: [
      "黄色光辉进入银河水晶。",
      "你接住了那道雷电。"
    ],
    responses: [
      "雷电达兰比尔低下身体，地面的节点同时亮起。",
      "电路封住了你的位置。"
    ],
    phase1Responses: [
      "雷电达兰比尔再次放电。",
      "黄色闪光从它背上一路窜到角端。",
      "它再次开始了电击。"
    ],
    perfectHitFlavor: [
      "这一击把它身上的电弧打断了一下。"
    ],
    skillReactions: {
      "black-king-charge": ["布莱克王撞进了电光里，雷电达兰比尔被顶得向后滑了一段。"],
      "ginga-fireball": ["红色的光球穿过电弧，在它胸前炸开。"],
      "ginga-thunderbolt": ["黄色的雷光和它自己的放电撞在一起。"],
      "ginga-cross-shoot": ["十字光线贯穿了闪烁的带电层。"]
    },
    liveUnlockText: [
      "所有节点同时亮到刺眼。",
      "雷霆落下，布莱克王的身体僵住了。",
      "BLACK KING // PARALYZED"
    ],
    ultraLiveText: [
      "银河火花重新亮起。",
      "ULTRALIVE — ULTRAMAN GINGA."
    ],
    victoryText: "雷电达兰比尔身上的电流熄灭了。",
    sparkDoll: {
      id: "thunder-darambia",
      name: "THUNDER DARAMBIA"
    }
  },
  arena: {
    durationMs: 7800,
    forcedLiveAfterRounds: 3,
    circuitNodes: 6,
    conductBoltsPerRound: 4
  }
};



export const superGrandKingBattleConfig = {
  id: "ginga-vs-super-grand-king-showcase",
  meta: {
    key: "super-grand-king",
    title: "超级古兰德王",
    subtitle: "黑暗实体化 · 美铃",
    mode: "意识接触 / 围城突破",
    difficulty: "BOSS",
    requiredPlayer: "ginga",
    recommendedPlayer: "ginga",
    blurb: "不是把装甲磨穿。银河要进入美铃被黑暗封住的内心，把两个人共同经历过的记忆一段段重新送回她身边；当那些记忆真正产生回应，小光才能和美铃面对面把最后的话说完。救出她以后，伙伴们会直接加入火力压制，古兰德王才进入真正的击破战。"
  },
  actionsByPlayer: {
    ginga: [
      {
        id: "call-misuzu",
        effect: "gingaMindCall",
        name: "呼唤美铃",
        maxPhase: 0,
        description: "在下一轮进入美铃的意识深处,重新唤醒两个人共同的过去。",
        text: "银河不再继续追击着装甲。",
        resultText: "光从计时器向古兰德王的内部延伸。"
      },
      {
        id: "hold-fortress",
        effect: "gingaHoldSiege",
        name: "撑住炮火",
        maxPhase: 0,
        description: "下一轮第一次受击减半，延长重炮预警。",
        text: "银河把屏障压低。",
        resultText: "现在还不是倒下的时候。"
      },
      {
        id: "deeper-link",
        effect: "gingaDeepDive",
        name: "深度潜入",
        maxPhase: 0,
        description: "强行深入意识，黑暗触手与扫击会变得更加密集。",
        text: "那条光路依旧不断延伸着。",
        resultText: "回应的声音很弱，但你能感觉到她就在那。"
      },
      {
        id: "sync-with-misuzu",
        effect: "gingaRescueSync",
        name: "与她同步",
        minPhase: 1,
        description: "下一次攻击判定更宽，美铃的光会让装甲的裂缝保持得更久。",
        text: "两道光在古兰德王内部重叠。",
        resultText: "装甲的亮纹没有马上合拢。"
      },
      {
        id: "wait-for-cover",
        effect: "gingaAllyCover",
        name: "等待援护",
        minPhase: 1,
        description: "下一轮友军支援信号更多。接住支援光可以挡掉一次伤害，并反打古兰德王。",
        text: "银河没有抢先出手。",
        resultText: "远处的伙伴们已经开始移动。"
      },
      {
        id: "hyper-barrier",
        effect: "gingaHoldSiege",
        name: "银河屏障",
        minPhase: 1,
        description: "下一轮第一次受击减半，并延长大型光束预警。",
        text: "银河在身前摆出架势。",
        resultText: "屏障展开。"
      }
    ]
  },
  player: { ...basePlayer, actions: [] },
  enemy: {
    id: "super-grand-king",
    name: "超级古兰德王",
    subtitle: "黑暗实体化 · 重装甲",
    boss: true,
    encounterMode: "ginga_super_grand_king",
    gingaStartForm: "ginga",
    initialLiveForms: ["ginga", "black-king", "thunder-darambia"],
    maxHp: 520,
    hp: 520,
    attack: 19,
    defense: 8,
    rage: 0,
    defenseMode: "siege",
    patternSet: "super_grand_king",
    interfaceGauge: {
      id: "misuzu-signal",
      label: "MISUZU / RESONANCE",
      value: 0,
      threshold: 100,
      lowDamageMultiplier: .34,
      midDamageMultiplier: .48,
      highDamageMultiplier: 1
    },
    rescue: {
      uniqueGain: 25,
      deepUniqueGain: 28,
      repeatGain: 8,
      required: 100,
      phase0HpFloor: .62,
      allyCounterDamage: 14,
      allyAutoDamage: 7
    },
    intro: [
      "超级古兰德王挡在学校前。",
      "银河的攻击落在装甲上，只留下了短暂的亮痕。",
      "在古兰德王体内，美玲的光扑闪着。"
    ],
    phases: [
      {
        id: "reach-misuzu",
        threshold: 1,
        title: "INSIDE",
        subtitle: "意识传递 · 美铃",
        durationMs: 8200,
        text: []
      },
      {
        id: "light-and-darkness",
        threshold: -1,
        title: "DARKNESS AND LIGHT",
        subtitle: "装甲崩解 · 联合作战",
        durationMs: 9300,
        text: [
          "美铃的意识已经从黑暗里挣脱。",
          "她的光从古兰德王胸甲内部向外贯穿。",
          "远处的伙伴们没有等银河独自完成最后的战斗。"
        ]
      }
    ],
    flavorText: [
      "装甲上的亮痕很快又暗了下去。",
      "古兰德王没有后退。",
      "它的炮口转向银河，体内的微光还在闪烁。"
    ],
    phase1FlavorText: [
      "裂缝里有光漏出来。",
      "古兰德王的动作开始出现停顿。",
      "远处的支援光束擦过装甲，留下新的裂口。"
    ],
    cleanDefenseFlavor: [
      "重炮擦过地面，银河没有倒下。",
      "这一轮攻击没有命中，你能感受到装甲里的微光。"
    ],
    hitDefenseFlavor: [
      "爆炸将银河推开，和美玲意识的连接晃了一下。",
      "炮口再次转了回来。"
    ],
    memoryGoodFlavor: [
      "一段记忆在两个人的心中激荡，束缚美玲的黑暗变得松弛了。",
      "光被传递了进去，心中的回应变得更清楚。"
    ],
    memoryDropFlavor: [
      "携带的光被撞散了，但还不是放弃的时候。",
      "连接断开了一瞬，记忆之光重新散开。"
    ],
    allyGoodFlavor: [
      "支援光束先一步命中装甲，银河从裂口里跟了进去。",
      "几道援护光同时压住古兰德王的动作。"
    ],
    responses: [
      "古兰德王胸口亮起紫光。",
      "它将左臂抬起，装甲内部传来沉重的轰鸣。"
    ],
    phase1Responses: [
      "裂开的装甲重新发亮。重炮开始蓄能。",
      "古兰德王想把裂口重新合上，但伙伴们已经到了。"
    ],
    perfectHitFlavor: [
      "攻击正中裂开的装甲。"
    ],
    skillReactions: {
      "ginga-fireball": ["火球在装甲表面炸开，亮痕转瞬即逝。"],
      "ginga-thunderbolt": ["黄色的雷光沿着装甲缝隙跑了一圈。"],
      "ginga-cross-shoot": ["十字光线死死压制住了超级古兰德王。"],
      "darambia-discharge": ["电流在装甲上蔓延"]
    },
    phase1SkillReactions: {
      "ginga-fireball": ["火球钻进裂口，装甲从内部炸开。"],
      "ginga-thunderbolt": ["雷光顺着裂缝贯穿整片胸甲。"],
      "ginga-cross-shoot": ["十字光线与支援火力同时命中，装甲终于开始崩落。"],
      "darambia-discharge": ["电流穿过裂口，整块装甲失去亮光。"]
    },
    victoryText: "超级古兰德王失去支撑。黑暗从装甲缝隙里退去。",
    sparkDoll: { id: "grand-king", name: "GRAND KING" }
  },
  arena: {
    durationMs: 8200,
    memoryShardsPerDive: 3,
    allySignalsPerRound: 5
  }
};


export const darkLugielBattleConfig = {
  id: "ginga-vs-dark-lugiel-showcase",
  meta: {
    key: "dark-lugiel",
    title: "黑暗路基艾尔",
    subtitle: "停止生命的黑暗",
    mode: "时间停止 / 未来反击",
    difficulty: "FINAL BOSS",
    requiredPlayer: "ginga",
    recommendedPlayer: "ginga",
    blurb: "路基艾尔真正停止的是运动与未来。子弹会在空中被定格；停滞期间，银河把自己的意识投向‘下一刻’，给被冻结的攻击留下未来标记。时间恢复后，那些攻击会反过来射向路基艾尔。最终阶段则要在绝对停止中重新点亮已经走过的道路。"
  },
  actionsByPlayer: {
    ginga: [
      {
        id: "follow-the-flow",
        effect: "lugielFlow",
        name: "前进",
        description: "下一轮时间停止更短，未来意识移动更快，并稍微压低 STASIS。",
        text: "银河没有停滞不前。",
        resultText: "未来在视野里变得无比清晰。"
      },
      {
        id: "leave-a-future",
        effect: "lugielMark",
        name: "留下未来",
        description: "下一轮 Z / Enter 的未来标记范围更大，一次停止可以标记更多冻结弹。",
        text: "银河水晶依次亮起。",
        resultText: "被冻结的世界里，光线依旧在倔强的延伸。"
      },
      {
        id: "call-spark-dolls",
        effect: "lugielAnchor",
        name: "呼唤火花",
        minPhase: 2,
        description: "绝对停止阶段，让下一枚‘未来锚点’更早出现。已经取得的 Spark Doll 会作为光的坐标，而不是替你自动战斗。",
        text: "银河火花在静止的世界里闪烁着。",
        resultText: "奇迹发生了。"
      }
    ]
  },
  player: { ...basePlayer, actions: [] },
  enemy: {
    id: "dark-lugiel",
    name: "黑暗路基艾尔",
    subtitle: "Dark Spark · 停止未来",
    boss: true,
    encounterMode: "ginga_lugiel_future",
    gingaStartForm: "ginga",
    initialLiveForms: ["ginga", "black-king", "thunder-darambia", "grand-king"],
    maxHp: 680,
    hp: 680,
    attack: 21,
    defense: 7,
    rage: 0,
    defenseMode: "stasis",
    patternSet: "dark_lugiel_future",
    interfaceGauge: {
      id: "stasis",
      label: "STASIS",
      value: 26,
      threshold: 100,
      passivePerTurn: 4,
      returnReduce: 7,
      missGain: 3,
      lowDamageMultiplier: 1.24,
      midDamageMultiplier: 1,
      highDamageMultiplier: .66
    },
    stasis: {
      futureAnchorsRequired: 3,
      returnDamage: 11,
      // Future anchors progressively break the Absolute Stop layer instead of creating a hard 0-damage HP floor.
      lockedDamageMultiplier: .62,
      anchorDamageBonus: .14,
      unlockedDamageMultiplier: 1.12,
      lockedReturnMultiplier: .72,
      anchorReturnBonus: .1
    },
    intro: [
      "黑暗路基艾尔站在学校的废墟前。",
      "Dark Spark 抬起。",
      "万物皆静，你唯一能听见的只有自己狂乱的心跳。"
    ],
    phases: [
      {
        id: "halt-motion",
        threshold: 1,
        title: "HALT",
        subtitle: "时间停止 · 冻结攻击",
        durationMs: 9000,
        text: []
      },
      {
        id: "future-self",
        threshold: .62,
        title: "THE NEXT MOMENT",
        subtitle: "身体停止 · 未来意识",
        durationMs: 9900,
        text: [
          "下一次时停来得更为彻底。",
          "银河动弹不得。",
          "就连光芒都无法继续传递。"
        ]
      },
      {
        id: "absolute-stop",
        threshold: .28,
        title: "ABSOLUTE STOP",
        subtitle: "绝对停止 · 满血再战",
        durationMs: 11600,
        text: []
      }
    ],
    flavorText: [
      "黑暗的光弹倾泻在大地上。",
      "路基艾尔将所有的事物都拖向他心目中既定的结果。",
      "Dark Spark 的红光扫过天空。"
    ],
    phase1FlavorText: [
      "银河奋力将光传递下去。",
      "静止的时空中，一条由光组成的道路出现了。",
      "路基艾尔盯着静止的银河，没有看见那道来自未来的光。"
    ],
    phase2FlavorText: [
      "银河火花砸碎了静止的世界，路基艾尔依旧挺立着。",
      "泰罗留下的光充斥着身体，你的面前只剩路基艾尔。",
      "黑暗仍想把这一刻化作永恒，但银河已经跨进了未来。",
      "银河火花里，曾经并肩战斗过的光一个也没有熄灭。"
    ],
    cleanDefenseFlavor: [
      "时间恢复时，银河已经不在原来的位置。",
      "你躲过了所有的攻击。"
    ],
    hitDefenseFlavor: [
      "时间恢复的一瞬，积压的攻击同时落下。",
      "被停止的冲击包围着你。"
    ],
    stasisGoodFlavor: [
      "黑色光弹调转方向，撞回到路基艾尔身上。",
      "时间恢复，路基艾尔依旧凝视着你。"
    ],
    stasisBadFlavor: [
      "改写失败，与时间恢复一同而来的是无尽的光弹雨。",
      "所有没有被改写的光弹继续肆虐着。"
    ],
    futureGoodFlavor: [
      "光重新开始闪烁，静止的世界里，多了一件走向未来的东西。",
      "Spark Doll 的轮廓亮起，未来仍在前进。"
    ],
    responses: [
      "Dark Spark 向前一点，数枚黑色光弹同时射出。",
      "路基艾尔伸出手，飞到一半的攻击开始减速。"
    ],
    phase1Responses: [
      "红光掠过银河，刹那间，就连心灵也被冻结了。",
      "路基艾尔让整个战场静止，只留下既定的终局。"
    ],
    phase2Responses: [
      "Dark Spark 横扫而来，刀光、枪阵与停滞同时压向银河。",
      "路基艾尔把武器压向银河，远处的光芒还在闪烁着。",
      "绝对静止再次降临，没有谁替银河前进，因为他们一起在前进。"
    ],
    perfectHitFlavor: [
      "这一击发生在时间重新流动的第一瞬。"
    ],
    skillReactions: {
      "ginga-fireball": ["红色光球被黑暗压慢，但仍撞上了路基艾尔。"],
      "ginga-thunderbolt": ["黄色雷光在静止的边缘连续跳跃。"],
      "ginga-cross-shoot": ["十字光线切开了停滞层，逼得 Dark Spark 产生了偏差。"],
      "darambia-discharge": ["电流在被冻结的攻击之间建立了新的联结。"],
      "grand-streak-live": ["重装炮火把一整片停滞的空间都轰出裂口。"]
    },
    victoryText: "Dark Spark 的红光熄灭，熟悉的风重新拂过了人们的脸庞。"
  },
  arena: {
    durationMs: 9000,
    stasisCycleMs: 2450,
    futureAnchorsRequired: 3
  }
};

export const kyrieloidBattleConfig = {
  id: "tiga-vs-kyrieloid-showcase",
  meta: {
    key: "kyrieloid",
    title: "基里艾洛德人Ⅱ",
    subtitle: "炎魔战士",
    mode: "地狱之门 / 模仿",
    difficulty: "BOSS",
    recommendedPlayer: "tiga",
    blurb: "区域Boss重制：地狱之门会实际改变移动规则；基里艾洛德人会学习你反复使用的进攻类型，逼玩家主动打破自己的节奏。"
  },
  actionsByPlayer: {
    tiga: [
      {
        id: "read-gate",
        effect: "gateRead",
        name: "看向门扉",
        description: "把注意力从敌人身上移开，下一轮门扉预警更长，并压低少量开启度。",
        text: "你抬头看向那扇门。",
        resultText: "那妖异的景象让你恍惚间似乎看到了真正的地狱",
        repeatResults: ["那一瞬的收缩仍然存在，这足够判断了。"]
      },
      {
        id: "hold-ground",
        effect: "gateAnchor",
        name: "踩住地面",
        description: "把重心压低，使下一轮地狱之门的拖拽明显减弱。",
        text: "你把脚踩进开裂的路面。",
        resultText: "虽然上方的力量仍在拉扯，但地面先替你承受了一部分。",
        repeatResults: ["地面被撕出了更深的裂缝"]
      },
      {
        id: "reject-prophecy",
        effect: "gateDefy",
        name: "否定预言",
        description: "正面打断它的宣告，大幅压低门的开启度并清除当前模仿；代价是它会立刻抢攻。",
        text: "你没有回应门后的声音，只是继续坚定的走向基里艾洛德人",
        resultText: "它的动作停了一瞬，漫天的火光也随之收缩。",
        repeatResults: ["这一次它没有停下，但门扉却仍然被压回去了一截。"]
      }
    ],
    cosmos: [
      { id: "gate-observe", effect: "gateRead", name: "观察", description: "观察门与火焰的变化，下一轮预警更长。", text: "迪迦抬头看向门扉。", resultText: "门的开启和上方的引力同步。" },
      { id: "gate-guard", effect: "gateAnchor", name: "守住", description: "在下一轮减轻地狱之门的拖拽。", text: "迪迦稳住身体。", resultText: "你知道重心的重要性" },
      { id: "gate-pressure", effect: "focus", name: "压制", description: "稳住进攻节奏，下一次普通攻击更容易命中中心。", text: "迪迦重新摆正架势。", resultText: "下一次出手会更稳。" }
    ]
  },
  player: { ...basePlayer, energy: 60, actions: [] },
  enemy: {
    id: "kyrieloid",
    name: "基里艾洛德人Ⅱ",
    subtitle: "炎魔战士 · 地狱之门",
    encounterMode: "tiga_kyrieloid",
    boss: true,
    maxHp: 360,
    hp: 360,
    attack: 17,
    defense: 5,
    rage: 0,
    defenseMode: "prophecy",
    patternSet: "kyrieloid_prophecy",
    gate: { value: 18, threshold: 100, passivePerSecond: 2.7, lightReduce: 16, burstReset: 58 },
    adaptation: {
      enabled: true,
      current: null,
      resistMultiplier: 0.66,
      breakMultiplier: 1.16,
      phaseResistMultiplier: 0.54,
      phaseBreakMultiplier: 1.22,
      labels: { physical: "格斗", energy: "光线" }
    },
    intro: [
      "天空被火红的阎火撕裂了，无数妖魔的声音从中传来",
      "那究竟是天堂，还是地狱？",
      "基里艾洛德人从炼狱中走出，停在迪迦的面前。"
    ],
    phases: [
      { id: "prophecy", threshold: 1, title: "预言", subtitle: "炎魔战士 · 地狱之门", durationMs: 8300, text: [] },
      { id: "imitation", threshold: 0.48, title: "模仿", subtitle: "炎魔战士 · 模仿强化", durationMs: 9100, text: [] }
    ],
    flavorText: [
      "门扉在不断被撑开，但基里艾洛德人没有回头。",
      "火焰倒伏在街道上，仿佛都在朝拜上方的神明",
      "它不紧不慢，你看出来，它在适应你的战斗，你的一切。",
      "风声大作，地狱的野心仍在不断向外喷涌"
    ],
    angryFlavor: [
      "火焰围绕着门框，灼伤每一双敢于直视的眼睛",
      "基里艾洛德人缩短了距离，它已经胸有成竹。"
    ],
    lowHpFlavor: [
      "它胸前的火纹被打断了。",
      "它开始变得迟钝，但是不断开启"
    ],
    cleanDefenseFlavor: [
      "火焰席卷着大地，你在努力对抗着上方的引力",
      "这一轮攻击落空以后，它开始更谨慎地查看着你"
    ],
    hitDefenseFlavor: [
      "上方的拉扯放大了你的疲劳。",
      "你刚落地，它却早已重新摆好进攻的架势。"
    ],
    gateHighFlavor: [
      "门后，无间地狱就要侵入现界",
      "就连天空都已经要被巨门征服，吞噬，统治。"
    ],
    gateSuppressedFlavor: [
      "光将门扉合拢了一些",
      "基里艾洛德人第一次抬头看向那扇门，它带来的吸扯变轻了"
    ],
    gateBurstFlavor: [
      "门在一瞬之间完全的打开，铺天盖地的热浪正在把人间化作真正的地狱",
      "余火落下时，门重新合回半开。"
    ],
    responses: [
      "基里艾洛德人抬手，门后的火随它的动作一起亮起。",
      "沉重的开门声从天空传来。",
      "它退开半步，将攻击的位置留给了那扇门。"
    ],
    phase1FlavorText: [
      "它开始用与你相似的节奏移动。",
      "它如影随形，化作你的梦魇。",
      "门后的火映出两个几乎同时起手的动作。"
    ],
    phase1Responses: [
      "基里艾洛德人摆出了刚才见过的起手式。",
      "它的目光一直放在你的身上。",
      "同样的动作第二次出现时，已经难以判断了。"
    ],
    perfectHitFlavor: ["你在它准备复制下一步之前击中了它，打断了它的动作。"],
    skillReactions: {
      "hand-slash": ["光刃切过胸口，它没有后退，你知道它在学习这一招。"],
      "zeppelion-ray": ["强光压过门后的火色，它抬起双臂，开始寻找相同的节奏。"],
      "cosmos-luna-shot": ["月白色的光击中胸口的时候，它的姿势明显停了一瞬。"]
    },
    victoryText: "基里艾洛德人倒下，门也随之倾倒，落下的火雨如同诉说着恶魔的陨落。"
  },
  arena: { durationMs: 8300, gateLightIntervalMs: 2050 }
};



// ---------------------------------------------------------------------------
// ORIGINAL route
// The card/story decides why the fight happens and which Ultra powers are available.
// This runtime only executes the selected opponent and combat rules; it does not invent
// an extra training/archive storyline.
// ---------------------------------------------------------------------------

export const originalZettonBattleConfig = {
  id: "future-adapter-vs-zetton",
  meta: {
    key: "original-zetton",
    route: "original",
    title: "杰顿 → 海帕杰顿",
    subtitle: "宇宙恐龙",
    mode: "四向防御 / 瞬移追击",
    difficulty: "BOSS",
    blurb: "黄色发光器官在黑暗中闪烁。屏障、火球与瞬间移动几乎没有间隙；当黑色轮廓被强光吞没，留下来的将是速度完全不同的海帕杰顿。"
  },
  player: { ...basePlayer, actions: [] },
  enemy: {
    id: "original-zetton",
    name: "杰顿",
    subtitle: "宇宙恐龙",
    encounterMode: "original_zetton",
    boss: true,
    maxHp: 1040,
    hp: 1040,
    attack: 19,
    defense: 5,
    rage: .14,
    defenseMode: "original",
    patternSet: "original_zetton",
    intro: [
      "短促的电子音从前方响起。",
      "杰顿胸前的黄色发光器官一明一暗。"
    ],
    phases: [
      { id:"zetton", threshold:1, title:"ZETTON", subtitle:"屏障 · 火球 · 四向防御", durationMs:11200, text:[] },
      { id:"hyper", threshold:.50, title:"HYPER ZETTON", subtitle:"IMAGO · 瞬移 · 高速追击", durationMs:9800, text:[] }
    ],
    flavorText: [
      "杰顿没有追过来，只抬起了双臂。",
      "胸前的黄色光点突然加快了闪烁。",
      "它消失了一瞬，电子音却还留在原地。"
    ],
    angryFlavor: ["杰顿的电子音明显变急。", "火光与瞬移几乎同时出现。"],
    lowHpFlavor: ["海帕杰顿落地时没有发出脚步声。", "橙色发光器官在残影之间连续闪烁。"],
    cleanDefenseFlavor: ["最后一发火球被挡在正面。"],
    hitDefenseFlavor: ["防御慢了一步。火球擦过身体。"],
    responses: [
      "杰顿抬起一只手。",
      "透明屏障在它身前一闪而过。",
      "电子音再次响起。"
    ],
    victoryText: "海帕杰顿的橙色发光器官熄灭，残影也随之消失。"
  },
  arena: { durationMs: 9400 }
};

export const originalGreezaBattleConfig = {
  id: "future-adapter-vs-greeza",
  meta: {
    key: "original-greeza",
    route: "original",
    title: "格利扎",
    subtitle: "虚空怪兽",
    mode: "第一形态 / 第二形态 / 最终形态",
    difficulty: "TECHNICAL",
    blurb: "空间先发生扭曲，随后才勉强拼出格利扎的轮廓。它从球状虚无变成人形，又在吸收的力量中长出最终形态。"
  },
  player: { ...basePlayer, actions: [] },
  enemy: {
    id: "original-greeza-sphere",
    name: "格利扎",
    subtitle: "虚空怪兽 · 第一形态",
    encounterMode: "original_greeza",
    boss: true,
    maxHp: 1080,
    hp: 1080,
    attack: 18,
    defense: 3,
    rage: .18,
    defenseMode: "original",
    patternSet: "original_greeza",
    intro: [
      "战场中央的空间先向内凹了下去。",
      "一团无法固定轮廓的光从扭曲中穿了出来。"
    ],
    phases: [
      { id:"sphere", threshold:1, title:"FIRST FORM", subtitle:"球状虚无 · 攻击落空", durationMs:8500, text:[] },
      { id:"second", threshold:.99, title:"SECOND FORM", subtitle:"错位人形 · 背部光束", durationMs:9300, text:[] },
      { id:"final", threshold:.42, title:"FINAL FORM", subtitle:"实体化 · 怪兽能力释放", durationMs:9800, text:[] }
    ],
    flavorText: [
      "格利扎的轮廓比声音慢了一拍。",
      "身体向左晃动，攻击却从右侧出现。",
      "它的笑声像是从战场外传来的。"
    ],
    angryFlavor: ["空间连续错位，格利扎的身体在几处位置同时闪现。"],
    lowHpFlavor: ["尖刺状装甲逐渐稳定下来，格利扎终于完整地留在了现实里。"],
    cleanDefenseFlavor: ["攻击穿过你原先的位置，随后才补全了轨迹。"],
    hitDefenseFlavor: ["接触的一瞬，周围的颜色像被抽走了一块。"],
    responses: [
      "格利扎的身体弯成一个不自然的角度。",
      "背部同时亮起数道光。",
      "它从原来的位置消失，又在另一侧补全。"
    ],
    victoryText: "格利扎的轮廓被光贯穿，扭曲的空间终于恢复原状。"
  },
  arena: { durationMs: 8800, firstFormDodges:3 }
};

export const originalGrandKingBattleConfig = {
  id: "future-adapter-vs-grand-king",
  meta: {
    key: "original-grand-king",
    route: "original",
    title: "古兰特王",
    subtitle: "超合体怪兽",
    mode: "重火力 / 巨体压制",
    difficulty: "BOSS",
    blurb: "古兰特王的重甲与全身武器同时运转。感应光束、巨型手臂、重拳、密集炮火与古兰镭射会轮番压入战场。"
  },
  player: { ...basePlayer, actions: [] },
  enemy: {
    id: "original-grand-king",
    name: "古兰特王",
    subtitle: "超合体怪兽 · 重装形态",
    encounterMode: "original_grand_king",
    boss: true,
    maxHp: 1320,
    hp: 1320,
    attack: 21,
    defense: 8,
    rage: .17,
    defenseMode: "original",
    patternSet: "original_grand_king",
    intro: [
      "沉重的脚步落下，地面跟着震了一次。",
      "古兰特王从烟尘里向前走出，身上的炮口依次亮起。"
    ],
    phases: [
      { id:"armor", threshold:1, title:"HEAVY ARMOR", subtitle:"红外线感应 · 超级手臂", durationMs:10400, text:[] },
      { id:"cracked", threshold:.62, title:"ARMOR BREAK", subtitle:"重炮扫荡 · 超级毁灭拳", durationMs:11200, text:[] },
      { id:"core", threshold:.28, title:"CORE HEAT", subtitle:"古兰镭射 · 全炮门开放", durationMs:12000, text:[] }
    ],
    flavorText: [
      "炮口先亮，古兰特王随后才迈步。",
      "攻击在装甲表面炸开，红热的裂纹留了下来。",
      "它每向前一步，整个战场都像被压缩了一点。"
    ],
    angryFlavor: ["几处装甲同时裂开，内部的红光彻底暴露。"],
    lowHpFlavor: ["大片甲壳已经脱落，炮口却仍在转向。"],
    cleanDefenseFlavor: ["交叉炮火在身后合拢。"],
    hitDefenseFlavor: ["重炮把身体压向地面，下一轮炮口已经开始转动。"],
    responses: [
      "古兰特王抬起沉重的手臂。",
      "胸前与头部的炮口同时亮起。",
      "一块烧红的装甲从身上掉了下来。"
    ],
    victoryText: "最后一轮炮火熄灭，古兰特王沉重的身体终于停止向前。"
  },
  arena: { durationMs: 10400 }
};

export const originalFiveKingBattleConfig = {
  id: "future-adapter-vs-five-king",
  meta: {
    key: "original-five-king",
    route: "original",
    title: "五帝王",
    subtitle: "超合体怪兽",
    mode: "部位破坏 / 能力剥离",
    difficulty: "BOSS",
    blurb: "五种怪兽的身体与能力被强行压进同一具躯体。头部、双翼、左右两臂和胸部各自亮起不同的能量，受损的器官会直接从合体攻势中沉寂。"
  },
  player: { ...basePlayer, actions: [] },
  enemy: {
    id: "original-five-king",
    name: "五帝王",
    subtitle: "超合体怪兽 · 五重能力",
    encounterMode: "original_five_king",
    boss: true,
    maxHp: 620,
    hp: 620,
    attack: 21,
    defense: 5,
    rage: .19,
    defenseMode: "original",
    patternSet: "original_five_king",
    modules: {
      golza: { name:"火焰哥尔赞 · 头部", hp:128, maxHp:128 },
      melba: { name:"美尔巴 · 双翼", hp:112, maxHp:112 },
      ganq: { name:"眼Q · 左臂", hp:120, maxHp:120 },
      reicubas: { name:"雷丘巴斯 · 右臂", hp:120, maxHp:120 },
      cov: { name:"超戈布 · 胸部", hp:140, maxHp:140 }
    },
    intro: [
      "五种完全不同的叫声重叠在一起。",
      "五帝王展开双翼，左右两臂和胸部同时亮起。"
    ],
    phases: [
      { id:"fivefold", threshold:1, title:"FIVE KING", subtitle:"五种能力同时活动", durationMs:10400, text:[] },
      { id:"damaged", threshold:.52, title:"DAMAGED FUSION", subtitle:"残存部位 · 组合攻击", durationMs:11200, text:[] }
    ],
    flavorText: [
      "不同部位的能量颜色在身体上交替亮起。",
      "已经受损的部位拖慢了五帝王转身的动作。",
      "剩余的器官开始替被破坏的部分补上攻击空档。"
    ],
    angryFlavor: ["五帝王用还完整的部位同时发动攻击。"],
    lowHpFlavor: ["合体结构已经残缺，剩余的怪兽器官仍在强行维持身体。"],
    cleanDefenseFlavor: ["几种攻击第一次没有接上彼此的空档。"],
    hitDefenseFlavor: ["来自另一侧的怪兽能力立刻补了上来。"],
    responses: [
      "五帝王转动身体，让仍然完整的部位朝向前方。",
      "一处怪兽器官亮起，另一处紧跟着回应。",
      "合体身体里传出数种重叠的吼声。"
    ],
    victoryText: "最后一处怪兽器官熄灭，五帝王的合体身体随之崩解。"
  },
  arena: { durationMs: 10400 }
};

export const originalBelialBattleConfig = {
  id: "future-adapter-vs-belial",
  meta: {
    key: "original-belial",
    route: "original",
    title: "贝利亚奥特曼",
    subtitle: "黑暗奥特战士",
    mode: "终极战斗仪 / 银河追逐 / 帝斯修姆光线",
    difficulty: "FINAL",
    blurb: "贝利亚会亲自冲进战场。终极战斗仪、灭杀雷电、追踪光弹与帝斯修姆光线会把战斗一路推到最后一次正面硬撼。"
  },
  player: { ...basePlayer, actions: [] },
  enemy: {
    id: "original-belial",
    name: "贝利亚奥特曼",
    subtitle: "终极战斗仪",
    encounterMode: "original_belial",
    boss: true,
    maxHp: 1900,
    hp: 1900,
    attack: 24,
    defense: 7,
    rage: .28,
    defenseMode: "original",
    patternSet: "original_belial",
    intro: [
      "终极战斗仪砸在地面上。",
      "贝利亚弓着身体抬起头，猩红的双眼直视前方。"
    ],
    phases: [
      { id:"duel", threshold:1, title:"GIGA BATTLENIZER", subtitle:"贝利亚 · 终极战斗仪", durationMs:11600, text:[] },
      { id:"galaxy", threshold:.64, title:"GALAXY CHASE", subtitle:"银河追逐 · 追踪光球", durationMs:12400, text:[] },
      { id:"descium", threshold:.28, title:"DESCIUM", subtitle:"帝斯修姆光线 · 最终决战", durationMs:13400, text:[] }
    ],
    belialBarks: {
      roundStart: [
        "你这小鬼是谁？",
        "来啊！让我看看你还能撑多久！",
        "少说大话了！就凭你也想打败我？",
        "什么宇宙的和平，统统给我毁灭吧！只有力量才是一切！",
        "你那软弱的正义能保护什么？！",
        "只有黑暗才是宇宙的真理！",
        "冒牌货，别以为站到我面前就算真正的光！",
        "赝品就是赝品。拿出点能让我记住的本事来！"
      ],
      attacked: [
        "也就只有这点程度吗？",
        "你的攻击太无聊了，让老子砍点有趣的。",
        "哈！这也配叫攻击？",
        "别得意，赝品！",
        "就这点力量也敢来挑战老子？",
        "啧……有点意思。可还远远不够！",
        "继续！老子还没打痛快呢！"
      ],
      heavyHit: [
        "少得意忘形了！！",
        "很好……这才像点样子！",
        "哈！终于不是挠痒痒了！",
        "你这个冒牌货……还真敢下手啊！",
        "别以为打中一次就能赢！"
      ],
      playerHit: [
        "太弱了！太弱了！",
        "真是不堪一击啊！",
        "你的反抗毫无意义！",
        "哈！哈！哈！哈！",
        "跪下吧！这就是力量的差距！",
        "怎么了，冒牌货？刚才的气势呢？",
        "连这一下都接不住，也敢挡老子的路？"
      ],
      item: [
        "怎么？已经撑不住了吗？",
        "尽管用。老子倒要看看你能拖多久！",
        "真是个可悲的家伙……",
        "还要靠那种东西续命？",
        "慢慢挣扎吧，赝品。这样才有意思！"
      ],
      roundEndClean: [
        "躲得倒挺快。下一次我就把你连退路一起砸碎！",
        "哼，逃过去一次就这么高兴？",
        "不错嘛，冒牌货。再来！",
        "别只顾着逃！老子还没尽兴呢！"
      ],
      roundEndHit: [
        "真是不堪一击啊！",
        "看见了吗？这才叫力量！",
        "虫子再怎么挣扎，也终究只是虫子！",
        "你的反抗毫无意义！"
      ],
      galaxySelfHit: [
        "啧……小把戏！",
        "你这冒牌货……竟敢拿老子的攻击来对付我？！",
        "哈！有种！再试一次看看！"
      ],
      lowHp: [
        "绝望吧！连同这颗星球一起化为宇宙的尘埃吧！",
        "老子还没输！这点伤算得了什么！",
        "力量！只有力量才是一切！！",
        "你以为把老子逼到这里就赢了吗？！"
      ],
      finale: [
        "开什么玩笑……老子怎么可能输给你这种赝品！",
        "给老子——消失吧！！",
        "不可能！！老子可是贝利亚！！"
      ]
    },
    flavorText: [
      "贝利亚把终极战斗仪搭在肩上，猩红的双眼没有离开你。",
      "他在战场边缘慢慢移动，像是在挑下一次出手的位置。",
      "贝利亚咧开嘴，终极战斗仪在手中转了一圈。"
    ],
    angryFlavor: ["贝利亚猛地转过终极战斗仪，红黑色能量沿着武器两端炸开。"],
    lowHpFlavor: ["贝利亚身上的伤越来越明显，可他的笑声反而更响了。"],
    cleanDefenseFlavor: ["贝利亚盯着你刚才闪开的方向，重新调整了终极战斗仪的角度。"],
    hitDefenseFlavor: ["贝利亚没有追击倒退的动作，只是抬起手朝你勾了勾。"],
    responses: ["贝利亚动了。"],
    victoryText: "帝斯修姆光线被一点点顶了回去。红黑色光芒吞没贝利亚，他终于从战场上坠了下去。"
  },
  arena: { durationMs: 11600 }
};


export const trialKaiserBelialBattleConfig = {
  id: "trial-kaiser-belial",
  meta: {
    key: "trial-kaiser-belial",
    route: "trial",
    title: "恺撒贝利亚",
    subtitle: "银河帝国皇帝",
    mode: "披风皇帝 / 无框追猎 / 电弧贝利亚",
    difficulty: "TRIAL FINAL",
    blurb: "三形态完整试炼。披风支配、终极格斗仪近战、无框星海追逐、电弧灾变与最终矿石长廊全部由玩家亲自打完。"
  },
  player: { ...basePlayer, actions: [] },
  enemy: {
    id: "trial-kaiser-belial",
    name: "恺撒贝利亚",
    subtitle: "银河帝国皇帝 · 披风",
    encounterMode: "trial_kaiser_belial",
    boss: true,
    maxHp: 2850,
    hp: 2850,
    attack: 27,
    defense: 8,
    rage: .34,
    defenseMode: "kaiser",
    patternSet: "trial_kaiser_belial",
    intro: [
      "红色披风垂在身后。恺撒贝利亚没有急着抬起终极格斗仪。",
      "他只是看了你一眼。"
    ],
    phases: [
      { id:"emperor", threshold:1, title:"EMPEROR", subtitle:"恺撒贝利亚 · 披风", durationMs:12800, text:[] },
      { id:"unbound", threshold:.66, title:"UNBOUND", subtitle:"恺撒贝利亚 · 无披风", durationMs:14200, text:[] },
      { id:"arc", threshold:.30, title:"ARC BELIAL", subtitle:"电弧贝利亚 · 最终形态", durationMs:15800, text:[] }
    ],
    kaiserBarks: {
      roundStart: [
        "还敢站在这里？赝品。",
        "来。让本皇看看你还能躲几次。",
        "别把侥幸当成实力。",
        "冒牌货也敢走到本皇面前？"
      ],
      attacked: [
        "哼。就这点力气？",
        "打中了，然后呢？",
        "别急着高兴，赝品。",
        "很好。至少你还知道反抗。"
      ],
      playerHit: [
        "太慢了。",
        "这就是你的极限？",
        "跪下。",
        "本皇甚至不需要第二次提醒。"
      ],
      roundEnd: [
        "还活着？那就继续。",
        "不错。可惜离赢还早。",
        "这次躲过去了，赝品。",
        "别停。本皇还没尽兴。"
      ],
      roundClean: [
        "哼……倒是会躲。",
        "一次没碰到你？有点意思。",
        "继续。下一轮就没这么轻松了。"
      ],
      item: [
        "继续拖时间吧。",
        "连站着都需要那种东西？",
        "尽管恢复。本皇等得起。"
      ],
      phase2: [
        "披风已经碍事了。",
        "接下来，本皇亲自把你撕碎。"
      ],
      phase3: [
        "很好……逼到这一步了。",
        "那就连你和这片宇宙一起吞掉。"
      ],
      finale: [
        "冲过来。",
        "看看你能不能碰到本皇的心脏。"
      ]
    },
    flavorText: [
      "披风下摆缓慢起伏，恺撒贝利亚的视线始终停在你身上。",
      "终极格斗仪在他手中转过半圈。",
      "他没有后退。"
    ],
    responses: ["恺撒贝利亚抬起了眼。"],
    victoryText: "最后一块艾美拉鲁矿石在冲刺中粉碎。你撞穿核心，电弧贝利亚的心脏在长廊尽头炸成白光。"
  },
  arena: { durationMs: 12800 }
};

export const battleRegistry = {
  golza: golzaBattleConfig,
  zetton: zettonBattleConfig,
  melba: melbaBattleConfig,
  "chaos-lidorias": chaosLidoriasBattleConfig,
  "chaos-ultraman": chaosUltramanBattleConfig,
  "chaos-darkness": chaosDarknessBattleConfig,
  "mephisto-one": mephistoOneBattleConfig,
  "mephisto-zwei": mephistoZweiBattleConfig,
  "dark-zagi": darkZagiBattleConfig,
  "thunder-darambia": thunderDarambiaBattleConfig,
  "super-grand-king": superGrandKingBattleConfig,
  "dark-lugiel": darkLugielBattleConfig,
  "giras-brothers": girasBrothersBattleConfig,
  pressure: pressureBattleConfig,
  "black-end": blackEndBattleConfig,
  kyrieloid: kyrieloidBattleConfig,
  gatanothor: gatanothorBattleConfig,
  "original-zetton": originalZettonBattleConfig,
  "original-greeza": originalGreezaBattleConfig,
  "original-grand-king": originalGrandKingBattleConfig,
  "original-five-king": originalFiveKingBattleConfig,
  "original-belial": originalBelialBattleConfig,
  "trial-kaiser-belial": trialKaiserBelialBattleConfig
};

export const battleCatalog = Object.values(battleRegistry).map((battle) => ({
  key: battle.meta.key,
  ...battle.meta
}));
