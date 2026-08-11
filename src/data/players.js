const sharedItems = [
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

export const playerRegistry = {
  tiga: {
    key: "tiga",
    id: "ultraman_tiga",
    name: "迪迦奥特曼",
    form: "复合型",
    style: "均衡 / 强攻",
    description: "当前展示版的标准角色。攻击稳定，能量技能偏向直接结束战斗。",
    maxHp: 100,
    hp: 100,
    attack: 29,
    maxEnergy: 100,
    energy: 46,
    skills: [
      {
        id: "hand-slash",
        name: "手掌光箭",
        damage: 35,
        cost: 18,
        description: "快速的远程攻击。",
        text: "光从掌缘甩出。"
      },
      {
        id: "zeppelion-ray",
        name: "哉佩利敖光线",
        damage: 78,
        cost: 50,
        description: "高消耗的强力光线。",
        text: "双臂展开。光开始汇向同一点。"
      }
    ],
    originalForms: {
      default: "multi",
      forms: {
        multi: {
          key: "multi", label: "复合型", attack: 29, speedScale: 1, incomingMultiplier: 1, control: "guard",
          description: "均衡形态。Z / Enter / Space 可展开极短的防御脉冲。",
          skills: [
            { id:"orig-tiga-hand", name:"手掌光箭", damage:35, cost:18, attackClass:"energy", description:"稳定快速的远程光弹。", text:"复合型从掌缘甩出一道光。" },
            { id:"orig-tiga-zeperion", name:"哉佩利敖光线", damage:78, cost:50, attackClass:"energy", description:"复合型高威力终结光线。", text:"迪迦展开双臂，光汇向同一点。" }
          ]
        },
        power: {
          key: "power", label: "强力型", attack: 37, speedScale: .80, incomingMultiplier: .84, control: "breaker",
          description: "高力量形态。Z 可震碎身边少量可破坏攻击。",
          skills: [
            { id:"orig-tiga-power-punch", name:"强力重击", damage:55, cost:24, attackClass:"physical", description:"近身强攻，适合破甲。", text:"红色力量沿肩臂压向拳锋。" },
            { id:"orig-tiga-delacium", name:"迪拉休姆光流", damage:84, cost:48, attackClass:"energy", description:"强力型的重型能量技。", text:"热量与光在胸前汇聚成沉重的一击。" }
          ]
        },
        sky: {
          key: "sky", label: "空中型", attack: 25, speedScale: 1.34, incomingMultiplier: 1.04, control: "dash",
          description: "高速形态。按住方向并按 Z 可进行短距离高速位移。",
          skills: [
            { id:"orig-tiga-sky-shot", name:"空中光弹", damage:32, cost:14, attackClass:"energy", description:"低消耗高速光弹。", text:"紫蓝色光在高速移动中切过战场。" },
            { id:"orig-tiga-runboldt", name:"兰帕尔特光弹", damage:58, cost:32, attackClass:"energy", description:"高速形态的集中射击。", text:"空中型的光在指尖压成一道锋利直线。" }
          ]
        },
        glitter: {
          key: "glitter", label: "闪耀迪迦", ultimate: true, attack: 46, speedScale: 1.16, incomingMultiplier: .70, control: "ultimate",
          description: "闪耀形态。Z 可释放大范围闪耀脉冲。",
          skills: [
            { id:"orig-tiga-glitter-zeperion", name:"闪耀哉佩利敖光线", damage:116, cost:60, attackClass:"energy", description:"闪耀形态的决战光线。", text:"无数光点汇入双臂，白金色光束贯穿前方。" },
            { id:"orig-tiga-timer-flash", name:"计时器闪光", damage:72, cost:36, attackClass:"energy", description:"爆发式全身光。", text:"胸前的光向整个身体铺开。" }
          ]
        }
      }
    },
    items: sharedItems
  },

  leo: {
    key: "leo",
    id: "ultraman_leo",
    name: "雷欧奥特曼",
    form: "基本形态",
    style: "格斗 / 迎击",
    description: "偏近身格斗。敌方回合里可以主动迎击特定招式，把防守回合变成反攻机会。",
    maxHp: 128,
    hp: 128,
    attack: 32,
    maxEnergy: 100,
    energy: 44,
    skills: [
      {
        id: "leo-kick",
        name: "雷欧飞踢",
        damage: 64,
        cost: 38,
        attackClass: "physical",
        description: "高威力格斗技。对已经失去围攻节奏的敌人尤其有效。",
        text: "雷欧跃起。右脚燃起红光。"
      },
      {
        id: "energy-light-ball",
        name: "能量光球",
        damage: 43,
        cost: 22,
        attackClass: "energy",
        description: "用能量拉开距离。威力稳定。",
        text: "红色能量在掌间凝成光球。"
      },
      {
        id: "corkscrew-kick",
        name: "回旋飞踢",
        damage: 91,
        cost: 60,
        attackClass: "physical",
        description: "高消耗终结技。需要明显空档才能发挥全部威力。",
        text: "雷欧在半空扭转身体。火光绕过一整圈。"
      }
    ],
    originalForms: {
      default: "leo",
      forms: {
        leo: {
          key:"leo", label:"基本形态", attack:32, speedScale:1.10, incomingMultiplier:.94, control:"parry",
          description:"格斗迎击。Z 在短暂窗口内可正面化解冲撞型攻击。",
          skills:[
            { id:"orig-leo-kick", name:"雷欧飞踢", damage:68, cost:38, attackClass:"physical", description:"高威力格斗技。", text:"雷欧跃起，右脚燃起红光。" },
            { id:"orig-leo-ball", name:"能量光球", damage:44, cost:22, attackClass:"energy", description:"稳定的远程能量攻击。", text:"红色能量在掌间凝成光球。" }
          ]
        },
        mantle: {
          key:"mantle", label:"王者披风", ultimate:true, attack:39, speedScale:1.12, incomingMultiplier:.70, control:"ultimate",
          description:"展开王者披风。并非新形态，而是雷欧线取得的最高级战斗支援。",
          skills:[
            { id:"orig-leo-mantle-kick", name:"披风·雷欧飞踢", damage:103, cost:56, attackClass:"physical", description:"披风护持下的决战飞踢。", text:"银色披风向后展开，红光从脚下爆开。" },
            { id:"orig-leo-mantle-return", name:"披风反照", damage:62, cost:30, attackClass:"energy", description:"把正面的能量压回去。", text:"披风张开，敌人的能量沿着银光折返。" }
          ]
        }
      }
    },
    items: sharedItems
  },


  nexus: {
    key: "nexus",
    id: "ultraman_nexus",
    name: "奈克瑟斯奥特曼",
    form: "幼年形态",
    style: "生命循环 / 以战续命",
    description: "每个完整回合结束都会损失生命，技能直接消耗 HP；但每次真正伤到异生兽，都能从命中中回收生命。越保守，反而越危险。",
    maxHp: 118,
    hp: 118,
    attack: 31,
    maxEnergy: 100,
    energy: 0,
    hideEnergy: true,
    lifeCycle: {
      drainPerTurn: 4,
      damageLeech: 0.34,
      metaDrainMultiplier: 1.25,
      metaLeechBonus: 0.12
    },
    skills: [
      {
        id: "particle-feather",
        name: "粒子之羽",
        damage: 38,
        hpCost: 5,
        attackClass: "energy",
        description: "快速切割。消耗少，适合把生命抢回来。",
        text: "腕部的光沿着弧线甩了出去。"
      },
      {
        id: "circle-shield",
        name: "圆形护盾",
        kind: "nexusBarrier",
        hpCost: 7,
        description: "以生命换取一次稳定防御。下一轮所受伤害减半，并让本回合结束时的生命损耗减半。",
        text: "蓝色的光幕在身前展开。"
      },
      {
        id: "cross-ray-schtrom",
        name: "十字光线·风暴",
        damage: 82,
        hpCost: 16,
        attackClass: "energy",
        description: "高负担终结光线。命中后能回收大量生命，但空耗会非常危险。",
        text: "双臂交叠。核心的光沿着腕部汇到十字中心。"
      }
    ],
    originalForms: {
      default:"anphans",
      forms:{
        anphans:{
          key:"anphans", label:"幼年形态", attack:31, speedScale:1.02, incomingMultiplier:.96, control:"guard",
          description:"基础适配。Z 以短距离光脉冲保护自身。",
          skills:[
            { id:"orig-nexus-feather", name:"粒子之羽", damage:38, hpCost:4, attackClass:"energy", description:"快速切割。", text:"腕部的光沿弧线甩出。" },
            { id:"orig-nexus-storm", name:"十字光线·风暴", damage:80, hpCost:14, attackClass:"energy", description:"高负担终结光线。", text:"双臂交叠，光在十字中心汇聚。" }
          ]
        },
        junis:{
          key:"junis", label:"青年形态", attack:37, speedScale:.98, incomingMultiplier:.88, control:"parry",
          description:"红色青年形态。Z 更偏向正面迎击与反打。",
          skills:[
            { id:"orig-nexus-overray", name:"层叠光线·风暴", damage:89, hpCost:16, attackClass:"energy", description:"青年形态高威力光线。", text:"红色光沿腕部交汇成一束。" },
            { id:"orig-nexus-junis-strike", name:"青年重击", damage:58, hpCost:8, attackClass:"physical", description:"压进近身距离后的强攻。", text:"奈克瑟斯迎着冲击踏进近身。" }
          ]
        },
        "junis-blue":{
          key:"junis-blue", label:"青年蓝", attack:30, speedScale:1.30, incomingMultiplier:.97, control:"shot",
          description:"高速青年蓝。Z 可发射短促光箭，击碎可破坏目标。",
          skills:[
            { id:"orig-nexus-arrow", name:"弓形光箭", damage:43, hpCost:7, attackClass:"energy", description:"高速精准射击。", text:"蓝色弓形光在手臂前展开。" },
            { id:"orig-nexus-blue-storm", name:"阿罗瑞·舒特罗姆", damage:92, hpCost:16, attackClass:"energy", description:"青年蓝的高速终结射线。", text:"蓝色光弓收束成贯穿战场的一击。" }
          ]
        },
        noa:{
          key:"noa", label:"诺亚奥特曼", ultimate:true, attack:49, speedScale:1.22, incomingMultiplier:.66, control:"ultimate", noLifeDrain:true,
          description:"诺亚形态。停止奈克瑟斯的自然生命损耗，并获得强力光脉冲。",
          skills:[
            { id:"orig-noa-lightning", name:"Lightning Noa", damage:124, cost:0, attackClass:"energy", description:"诺亚终极光线。", text:"银色双翼后的光同时向双臂聚合。" },
            { id:"orig-noa-inferno", name:"Noa Inferno", damage:82, cost:0, attackClass:"energy", description:"强力近中距离能量爆发。", text:"银色火焰从诺亚掌前爆开。" }
          ]
        }
      }
    },
    items: sharedItems
  },


  ginga: {
    key: "ginga",
    id: "ultraman_ginga",
    name: "银河奥特曼",
    form: "银河",
    style: "Ultra Live / 规则切换",
    description: "能够通过银河火花进行 Ultra Live。不同 Spark Doll 不是数值装备，而会改变敌方回合里的移动与交互规则。",
    maxHp: 110,
    hp: 110,
    attack: 30,
    maxEnergy: 100,
    energy: 48,
    liveSystem: {
      startForm: "black-king",
      forms: {
        "black-king": {
          key: "black-king",
          name: "BLACK KING",
          displayName: "黑王",
          form: "ULTRALIVE",
          attack: 34,
          speedScale: 0.57,
          description: "重量级 Spark Doll。移动缓慢，但能用重踏把导电节点接地。",
          skills: [
            {
              id: "black-king-charge",
              name: "怪力冲撞",
              damage: 42,
              cost: 18,
              attackClass: "physical",
              description: "用体重正面撞开敌人。第一阶段无法直接结束战斗。",
              text: "黑王压低身体，向前撞了过去。"
            },
            {
              id: "black-king-brace",
              name: "岩壁架势",
              kind: "gingaBrace",
              cost: 14,
              description: "下一轮受到的伤害减半，并扩大重踏接地范围。",
              text: "黑王把脚死死钉在地面上。"
            }
          ]
        },
        ginga: {
          key: "ginga",
          name: "ULTRAMAN GINGA",
          displayName: "银河奥特曼",
          form: "银河",
          attack: 31,
          speedScale: 1,
          description: "高速形态。可以在闪电进入导流范围时按 Z / Enter，把危险转为黄色 Plasma Charge。",
          skills: [
            {
              id: "ginga-fireball",
              name: "银河火焰球",
              damage: 37,
              cost: 18,
              attackClass: "energy",
              description: "稳定的红色能量攻击。",
              text: "红色光辉从银河水晶向掌间聚拢。"
            },
            {
              id: "ginga-thunderbolt",
              name: "银河雷电击",
              damage: 48,
              cost: 26,
              attackClass: "energy",
              plasmaFinisher: true,
              description: "黄色 Plasma Charge 达到 3 格时会进入 OVERCHARGE，威力大幅提升并消耗全部充能。",
              text: "银河水晶亮起黄色光芒。"
            },
            {
              id: "ginga-cross-shoot",
              name: "银河十字光线",
              damage: 76,
              cost: 50,
              attackClass: "energy",
              description: "高消耗强力光线。",
              text: "双臂在胸前交叉，水晶的光汇成一道直线。"
            }
          ]
        },
        "thunder-darambia": {
          key: "thunder-darambia",
          name: "THUNDER DARAMBIA",
          displayName: "雷电达兰比尔",
          form: "ULTRALIVE",
          attack: 33,
          speedScale: .86,
          description: "带电 Spark Doll。移动略慢；在时间停止战中一次可以给更多冻结攻击留下 FUTURE 标记。",
          skills: [
            {
              id: "darambia-electric-ram",
              name: "带电冲撞",
              damage: 44,
              cost: 22,
              attackClass: "physical",
              description: "用带电身体撞击目标。",
              text: "电弧沿着雷电达兰比尔的身体炸开。"
            },
            {
              id: "darambia-discharge",
              name: "全身放电",
              damage: 58,
              cost: 34,
              attackClass: "energy",
              description: "高输出放电。",
              text: "积蓄的电流同时向外释放。"
            }
          ]
        },
        "grand-king": {
          key: "grand-king",
          name: "GRAND KING",
          displayName: "古兰德王",
          form: "ULTRALIVE",
          attack: 37,
          speedScale: .62,
          description: "重装 Spark Doll。移动慢，但在时间停止战里未来标记范围很大，适合一次改写多枚冻结攻击。",
          skills: [
            {
              id: "grand-streak-live",
              name: "Gran Streak",
              damage: 68,
              cost: 38,
              attackClass: "energy",
              description: "从重装甲中释放集中能量。速度慢，命中很重。",
              text: "古兰德王胸前的装甲一层层亮起。"
            },
            {
              id: "grand-crash-live",
              name: "Gran Crash",
              damage: 52,
              cost: 27,
              attackClass: "physical",
              description: "用重装身体正面压过去。",
              text: "古兰德王把重量全部压向前方。"
            }
          ]
        },
        ultraman: {
          key: "ultraman",
          name: "ULTRAMAN",
          displayName: "奥特曼",
          form: "ULTRALIVE",
          attack: 32,
          speedScale: 1,
          description: "均衡的 Ultra Live。没有特殊规则加成，适合作为稳定的标准形态。",
          skills: [
            {
              id: "specium-ray-live",
              name: "斯派修姆光线",
              damage: 72,
              cost: 46,
              attackClass: "energy",
              description: "稳定而强力的光线。",
              text: "双臂交成十字。白色光束贯穿前方。"
            }
          ]
        },
        ultraseven: {
          key: "ultraseven",
          name: "ULTRASEVEN",
          displayName: "赛文奥特曼",
          form: "ULTRALIVE",
          attack: 33,
          speedScale: 1.06,
          description: "高速 Ultra Live。移动更灵活，适合需要快速重新定位的战场。",
          skills: [
            {
              id: "wide-shot-live",
              name: "集束射线",
              damage: 69,
              cost: 43,
              attackClass: "energy",
              description: "正面高威力射线。",
              text: "双臂在胸前交叠，强光直射出去。"
            },
            {
              id: "eye-slugger-live",
              name: "头镖斩击",
              damage: 48,
              cost: 26,
              attackClass: "physical",
              description: "快速切割。",
              text: "头镖脱离头部，划出一道银色弧线。"
            }
          ]
        }
      }
    },
    skills: [],
    originalForms:{
      default:"ginga",
      forms:{
        ginga:{
          key:"ginga", label:"银河", attack:31, speedScale:1.05, incomingMultiplier:.94, control:"breaker",
          description:"银河基础形态。Z 让水晶释放短距离能量爆发，击碎附近可破坏攻击。",
          skills:[
            { id:"orig-ginga-fireball", name:"银河火焰球", damage:40, cost:18, attackClass:"energy", description:"稳定能量攻击。", text:"红色光辉从银河水晶向掌间聚拢。" },
            { id:"orig-ginga-cross", name:"银河十字光线", damage:80, cost:48, attackClass:"energy", description:"高消耗强力光线。", text:"双臂交叉，银河水晶同时亮起。" }
          ]
        },
        strium:{
          key:"strium", label:"银河斯特利姆", ultimate:true, attack:45, speedScale:1.14, incomingMultiplier:.73, control:"ultimate",
          description:"强化形态。Z 释放多色斯特利姆爆发。",
          skills:[
            { id:"orig-ginga-strium", name:"斯特利姆光线", damage:116, cost:60, attackClass:"energy", description:"强化形态的主终结技。", text:"多种光在银河身体上同时亮起。" },
            { id:"orig-ginga-thunder", name:"银河雷电击", damage:78, cost:36, attackClass:"energy", description:"黄色等离子强化攻击。", text:"黄色雷光从水晶间连续跳跃。" }
          ]
        }
      }
    },
    items: sharedItems
  },

  cosmos: {
    key: "cosmos",
    id: "ultraman_cosmos",
    name: "高斯奥特曼",
    form: "月神模式",
    style: "战斗 / 饶恕",
    description: "通过行动在月神、日冕与剧情解锁的日蚀形态间切换。月神在敌方回合净化，日冕主动突破攻击线；最终路线会把‘是否消灭敌人’本身变成战斗规则。",
    maxHp: 120,
    hp: 120,
    attack: 25,
    maxEnergy: 100,
    energy: 58,
    skills: [
      {
        id: "cosmos-luna-shot",
        name: "月神光弹",
        damage: 31,
        cost: 16,
        description: "较轻的远程攻击。用于普通战斗路线。",
        text: "柔和的光凝成一束，向前掠去。"
      },
      {
        id: "full-moon-rect",
        name: "满月光波",
        kind: "mercy",
        mercyPower: 36,
        cost: 30,
        description: "高斯的安抚技。只有具备饶恕条件的怪兽才会真正响应。",
        text: "月白色的光铺开，没有杀意。"
      }
    ],
    originalForms:{
      default:"luna",
      forms:{
        luna:{
          key:"luna", label:"月神模式", attack:25, speedScale:1.10, incomingMultiplier:.90, control:"purify",
          description:"Z 可净化身边少量可破坏攻击。",
          skills:[
            { id:"orig-cosmos-luna", name:"月神光弹", damage:31, cost:16, attackClass:"energy", description:"温和而稳定的光弹。", text:"柔和的蓝光从掌前掠去。" },
            { id:"orig-cosmos-moon", name:"满月光波·冲击", damage:52, cost:28, attackClass:"energy", description:"在原创路线中可作为压制用的月神光。", text:"月白色波纹沿前方展开。" }
          ]
        },
        corona:{
          key:"corona", label:"日冕模式", attack:35, speedScale:1.02, incomingMultiplier:.88, control:"dash",
          description:"高强度战斗形态。按方向 + Z 可短距离突进穿过攻击线。",
          skills:[
            { id:"orig-cosmos-corona-strike", name:"日冕重击", damage:55, cost:24, attackClass:"physical", description:"近距离重击。", text:"赤色能量沿拳锋爆开。" },
            { id:"orig-cosmos-naybuster", name:"内巴斯特光线", damage:84, cost:48, attackClass:"energy", description:"日冕模式高威力光线。", text:"赤色光在双臂之间压成一道直线。" }
          ]
        },
        eclipse:{
          key:"eclipse", label:"日蚀模式", attack:34, speedScale:1.17, incomingMultiplier:.82, control:"shot",
          description:"慈爱与勇气的融合。Z 发射精准切断光，适合处理特殊目标。",
          skills:[
            { id:"orig-cosmos-eclipse-shot", name:"日蚀光刃", damage:48, cost:20, attackClass:"energy", description:"精准切断攻击结构。", text:"金赤蓝三色光在腕部一闪。" },
            { id:"orig-cosmos-cosmium", name:"克兹缪姆光线", damage:91, cost:52, attackClass:"energy", description:"日蚀模式的高强度光线。", text:"复合色光在胸前汇聚后直射出去。" }
          ]
        },
        miracle:{
          key:"miracle", label:"奇迹月神", ultimate:true, attack:43, speedScale:1.22, incomingMultiplier:.68, control:"ultimate",
          description:"奇迹月神。Z 释放大范围奇迹净化脉冲。",
          skills:[
            { id:"orig-cosmos-miracle-ray", name:"奇迹月神光", damage:108, cost:56, attackClass:"energy", description:"奇迹月神的高强度光。", text:"蓝白色光几乎没有边界地向外展开。" },
            { id:"orig-cosmos-luna-final", name:"露娜终结", damage:76, cost:36, attackClass:"energy", description:"将强光集中成终结波。", text:"月白色光汇聚成一道没有杂质的线。" }
          ]
        }
      }
    },
    items: sharedItems
  }
};

export const playerCatalog = Object.values(playerRegistry).map((player) => ({
  key: player.key,
  name: player.name,
  form: player.form,
  style: player.style,
  description: player.description
}));

export function applyPlayerProfile(battleConfig, playerKey = "tiga") {
  const requiredKey = battleConfig?.meta?.requiredPlayer;
  const resolvedKey = requiredKey && playerRegistry[requiredKey] ? requiredKey : playerKey;
  const profile = playerRegistry[resolvedKey] ?? playerRegistry.tiga;
  const battle = structuredClone(battleConfig);
  const battleActions = battle.actionsByPlayer?.[profile.key]
    ?? battle.player?.actions
    ?? [];

  battle.player = {
    ...structuredClone(profile),
    actions: structuredClone(battleActions)
  };

  battle.showcasePlayerKey = profile.key;
  return battle;
}
