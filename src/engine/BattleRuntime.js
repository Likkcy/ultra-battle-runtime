import { StateMachine } from "./StateMachine.js";
import { BulletSystem } from "./BulletSystem.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export class BattleRuntime {
  constructor(root, config, services = {}) {
    this.root = root;
    this.config = structuredClone(config);
    this.sound = services.sound ?? null;
    this.bridgeContext = this.config.bridgeContext ?? null;
    this.routeState = this.config.routeState && typeof this.config.routeState === "object"
      ? structuredClone(this.config.routeState)
      : {};
    this.resultEmitted = false;

    this.player = this.config.player;
    this.enemy = this.config.enemy;

    if (this.enemy.encounterMode === "original_grand_king") {
      this.player.items ??= [];
      let supply = this.player.items.find((item) => item.id === "energy-recover" || item.name === "能量补给");
      if (!supply) {
        supply = { id:"energy-recover", name:"能量补给", type:"heal", heal:30, uses:5, description:"恢复 30 点 HP。" };
        this.player.items.unshift(supply);
      } else {
        supply.type = "heal"; supply.heal = supply.heal ?? 30; supply.uses = 5;
      }
    }

    this.player.maxEnergy ??= 100;
    this.player.energy ??= 0;
    this.enemy.rage = 0;
    this.enemy.exposedTurns = 0;
    this.enemyExposed = !this.enemy.requiresExposure;
    if (this.enemy.gate) this.enemy.gate.value = clamp(this.enemy.gate.value ?? 0, 0, this.enemy.gate.threshold ?? 100);
    if (this.enemy.adaptation) this.enemy.adaptation.current ??= null;
    if (this.enemy.formation) this.enemy.formation.value = clamp(this.enemy.formation.value ?? 100, 0, this.enemy.formation.threshold ?? 100);
    if (this.enemy.predation) this.enemy.predation.value = clamp(this.enemy.predation.value ?? 0, 0, this.enemy.predation.threshold ?? 100);
    if (this.enemy.static) this.enemy.static.value = clamp(this.enemy.static.value ?? 0, 0, this.enemy.static.threshold ?? 100);
    if (this.enemy.plasma) this.enemy.plasma.value = clamp(this.enemy.plasma.value ?? 0, 0, this.enemy.plasma.threshold ?? 3);
    if (this.enemy.interfaceGauge) this.enemy.interfaceGauge.value = clamp(this.enemy.interfaceGauge.value ?? 0, 0, this.enemy.interfaceGauge.threshold ?? 100);

    this.gingaBattle = String(this.enemy.encounterMode ?? "").startsWith("ginga_") && this.player.id === "ultraman_ginga";
    this.gingaLiveForm = this.gingaBattle ? (this.enemy.gingaStartForm ?? this.player.liveSystem?.startForm ?? "ginga") : null;
    this.gingaUnlocked = new Set();
    if (this.gingaBattle) {
      for (const key of this.enemy.initialLiveForms ?? [this.gingaLiveForm]) this.gingaUnlocked.add(key);
      this.gingaUnlocked.add(this.gingaLiveForm);
      try {
        const stored = Array.isArray(this.routeState?.sparkDolls)
          ? this.routeState.sparkDolls
          : JSON.parse(localStorage.getItem("ubr:ginga:sparkDolls") || "[]");
        for (const key of stored) this.gingaUnlocked.add(key);
      } catch (_) {}
    }
    this.gingaLiveForced = false;
    this.gingaPhase0EnemyTurns = 0;
    this.sparkDollAcquired = null;
    this.sparkDollsAcquired = [];
    this.frozenCommands = new Set();
    this.frozenLiveForms = new Set();
    this.pendingFreezeTargets = [];
    this.darkHijackedCommand = null;
    this.gingaMindDiveRounds = 0;
    this.gingaMisuzuMemories = new Set();
    this.gingaMisuzuEchoTimers = [];
    this.gingaMisuzuDialoguePlayed = false;
    this.lugielFutureAnchors = 0;
    this.lugielFutureUnlocked = false;
    this.lugielFinaleCinematicPlayed = false;
    this.lugielFinaleSupportActive = false;
    this.lugielFinaleSupportBeat = 0;
    this.lugielFinaleExecutionPlayed = false;
    this.lugielFinaleReviving = false;
    this.lugielFinaleReviveCount = 0;
    this.lugielFinaleImmortal = false;
    this.lugielFinaleBonds = new Set();
    this.lugielFinaleMemories = new Set();
    this.tigaGlitterActive = false;
    this.tigaFinaleCinematicPlayed = false;
    this.tigaFinaleExecutionPlayed = false;
    this.tigaLightMashCount = 0;
    this.tigaLightMashTarget = 30;
    this._tigaLightQteCleanup = null;
    this.pressureTinyRounds = 0;
    this.pressureRestored = false;
    this.blackEndHostagePlayed = false;
    this.blackEndCrystalReady = false;
    this.blackEndCrystalUsed = false;
    this.blackEndHornBroken = false;
    this.leoPreludePlayed = false;
    this._leoSequenceCleanup = null;
    this.golzaWeakReadActive = false;
    this.cosmosBattle = String(this.enemy.encounterMode ?? "").startsWith("cosmos_") && this.player.id === "ultraman_cosmos";
    this.cosmosForm = this.cosmosBattle ? (this.enemy.cosmosStartForm ?? "luna") : null;
    this.cosmosEclipseUnlocked = !!this.enemy.cosmosEclipseUnlocked;
    this.cosmosMiracleActive = false;
    this.cosmosHeart = this.enemy.encounterMode === "cosmos_chaos_darkness" ? (this.enemy.interfaceGauge?.value ?? 0) : 0;
    this.cosmosLidoriasBeat = 0;
    this.cosmosLidoriasReadyShown = false;
    this.cosmosHeartBeat = 0;
    this.cosmosDarknessNoAnswerPlayed = false;
    this.cosmosCalamityActive = false;
    this.cosmosObjectiveAdvancePending = false;
    this.cosmosDarknessTrialStep = 0;
    this.cosmosDarknessTrialForms = ["luna", "corona", "eclipse"];
    this.cosmosDarknessTrialHistory = [];
    this._cosmosFinaleHandled = false;
    this.nexusStoryMode = this.enemy.encounterMode ?? "";
    if (this.nexusStoryMode === "nexus_dark_zagi_bond") {
      // Final-boss-only endurance. Do not inflate Himeya/Ren encounters.
      const zagiPlayerMaxHp = 176;
      this.player.maxHp = Math.max(this.player.maxHp ?? 0, zagiPlayerMaxHp);
      this.player.hp = this.player.maxHp;
    }
    this.nexusForm = this.nexusStoryMode === "nexus_mephisto_zwei" ? "junis-blue" : "anphans";
    this.mizorogiAssist = false;
    this.nexusBondLinks = new Set();
    this.nexusFinaleCinematicPlayed = false;
    this._nexusFinalMashCleanup = null;
    this.nexusFinalMashCount = 0;
    this.himeyaMephistoBattle = this.enemy.encounterMode === "nexus_mephisto_one_himeya";
    this.himeyaOneHpLocked = false;
    this.himeyaEnemyTurns = 0;
    this.himeyaNightRaiderRestored = false;
    this.himeyaSeraPlayed = false;
    this.himeyaFinalePlayed = false;
    this.himeyaScriptedDefeatRunning = false;
    this.dialogueCharMs = this.config.ui?.dialogueCharMs ?? 31;
    this.storyCharMs = this.config.ui?.storyCharMs ?? 34;

    // Original route. The card/story chooses why the encounter happens; the runtime only
    // executes the selected Ultra form and the opponent-specific combat rules.
    this.originalBattle = String(this.enemy.encounterMode ?? "").startsWith("original_");
    this.originalAdapt = this.originalBattle ? 100 : 0;
    this.originalFormKey = this.originalBattle ? (this.player.originalForms?.default ?? null) : null;
    this.originalLastFormKey = this.originalFormKey;
    this.originalFiveKingModules = this.enemy.modules ? structuredClone(this.enemy.modules) : null;
    this.originalTargetPart = this.originalFiveKingModules ? Object.keys(this.originalFiveKingModules)[0] : null;
    this.originalUltimateEntered = false;
    this.originalBossPhaseShifted = false;
    this.originalEnemyTurnHits = 0;
    this.originalGreezaDodges = 0;
    this.originalGreezaSecondHits = 0;
    this.originalZettonBeamStored = false;
    this.originalBelialFinalePlayed = false;
    this.belialTransitionPending = null;
    this.belialTransitionSeen = new Set();
    this.belialBarkCounters = {};
    this.belialLastBark = null;
    this.belialHitBarkCooldownUntil = 0;
    this.belialClashProgress = 0;
    this.belialClashComplete = false;

    this.turn = 0;
    this.actionCounts = {};
    this.lastPlayerAction = null;
    this.phaseIndex = 0;
    this.currentPhase = this.enemy.phases?.[0] ?? null;
    this.nexusMetaField = !!this.currentPhase?.nexusMetaField;
    this.currentCommand = 0;
    this.currentChoice = 0;
    this.commandOrder = ["ATTACK", "SKILL", "ACT", "ITEM"];
    this.state = new StateMachine("INIT");

    this.flags = {
      nextAttackSlow: false,
      nextEnemyTelegraph: false,
      guardAssist: false,
      speedBoost: false,
      jumpBoost: false,
      platformAssist: false,
      purifyActive: false,
      purifyBoost: false,
      gatePullResist: false,
      leoCounterAssist: false,
      leoCrossBait: false,
      pressureMantleAssist: false,
      pressureSmallGuard: false,
      blackEndClose: false,
      nexusSlashAssist: false,
      nexusPressure: false,
      nexusDrainGuard: false,
      nexusShootAssist: false,
      nexusShootBait: false,
      nexusCounterAssist: false,
      nexusNoaGuard: false,
      gingaGroundAssist: false,
      gingaOverload: false,
      gingaConductAssist: false,
      gingaConductBait: false,
      gingaHoldCharge: false,
      mirrorRead: false,
      mirrorBait: false,
      freezeAssist: false,
      gingaMindDive: false,
      gingaDeepDive: false,
      gingaAllyCover: false,
      stasisAssist: false,
      stasisMarkBoost: false,
      stasisAnchorBoost: false,
      barrier: false,
      lightShield: false,
      tigaGlitterStrike: false,
      cosmosLunaAssist: false,
      cosmosCoronaAssist: false,
      cosmosEclipseAssist: false,
      cosmosGuard: false,
      cosmosMonsterTrust: false
    };

    this.refs = this.collectRefs();
    this.bullets = new BulletSystem(this.refs.canvas, {
      onHit: (damage) => this.damagePlayer(damage),
      onGuard: (special) => {
        this.sound?.play("guard");
        if (special) this.gainEnergy(4);
      },
      onPurify: (amount) => {
        if (!this.mercyRouteEnabled()) return;
        this.sound?.play("purify");
        this.adjustMercy(amount);
      },
      onChaosReach: (amount) => {
        if (!this.mercyRouteEnabled()) return;
        this.adjustMercy(-amount);
      },
      onCosmosPurifyPulse: (event = {}) => {
        if (!this.cosmosBattle) return;
        this.sound?.play("purify");
        const amount = event.amount ?? 0;
        if (this.enemy.encounterMode === "cosmos_chaos_darkness" && this.cosmosMiracleActive) {
          this.adjustInterfaceGauge(Math.max(1, amount));
        } else if (this.mercyRouteEnabled()) {
          this.adjustMercy(Math.max(2, amount));
        } else if (this.enemy.encounterMode === "cosmos_chaos_ultraman" && this.phaseIndex === 0) {
          this.adjustInterfaceGauge(-Math.max(3, amount));
          if ((this.enemy.interfaceGauge?.value ?? 1) <= 0) this.cosmosObjectiveAdvancePending = true;
        }
        this.gainEnergy(Math.min(7, 2 + (event.count ?? 0)));
      },
      onCosmosCoronaBreak: (event = {}) => {
        if (!this.cosmosBattle) return;
        this.sound?.play("guard");
        this.gainEnergy(3 + Math.min(5, event.count ?? 0));
        if (this.enemy.encounterMode === "cosmos_chaos_ultraman" && this.phaseIndex === 0) {
          this.adjustInterfaceGauge(-Math.max(2, event.count ?? 0) * 2);
          if ((this.enemy.interfaceGauge?.value ?? 1) <= 0) this.cosmosObjectiveAdvancePending = true;
        }
        if ((event.damage ?? 0) > 0) this.damageEnemy(event.damage, "counter");
      },
      onCosmosEclipseCut: (event = {}) => {
        if (!this.cosmosBattle) return;
        this.sound?.play("guard");
        if (this.enemy.encounterMode === "cosmos_chaos_ultraman") {
          if (this.phaseIndex === 0) {
            this.adjustInterfaceGauge(-(event.gaugeReduce ?? 8));
            if ((this.enemy.interfaceGauge?.value ?? 1) <= 0) this.cosmosObjectiveAdvancePending = true;
          } else if (this.phaseIndex === 1 && event.targetType === "chaosOrderNode") {
            this.adjustInterfaceGauge(-1);
            const remain = Math.max(0, this.enemy.interfaceGauge?.value ?? 0);
            this.showSupportCallout("COPY CORE", remain > 0 ? `剩余 ${remain} / 3` : "复制核心全部切断", 700);
            if (remain <= 0) this.cosmosObjectiveAdvancePending = true;
          }
        }
        if ((event.damage ?? 0) > 0) this.damageEnemy(event.damage, event.perfect ? "heavy" : "counter");
      },
      onCosmosEyesCover: (event = {}) => {
        if (this.enemy.encounterMode !== "cosmos_chaos_darkness" || !this.cosmosMiracleActive) return;
        if ((event.cleared ?? 0) > 0) this.showSupportCallout("TEAM EYES", "别让敌意碰到那束光。", 720);
      },
      onCosmosHeartCollect: (event = {}) => {
        if (this.enemy.encounterMode !== "cosmos_chaos_darkness" || !this.cosmosMiracleActive) return;
        this.sound?.play("purify");
        this.adjustInterfaceGauge(event.amount ?? 9);
        this.gainEnergy(4);
        this.showSupportCallout(event.source ?? "HEART", "它没有把这份回应推开。", 660);
      },
      onOriginalBreak: (event = {}) => {
        if (!this.originalBattle) return;
        this.gainOriginalAdapt(event.adapt ?? 1.5, "break");
      },
      onOriginalCounter: (event = {}) => {
        if (!this.originalBattle) return;
        if ((event.damage ?? 0) > 0) this.damageEnemy(event.damage, event.perfect ? "heavy" : "counter");
        this.gainOriginalAdapt(event.perfect ? 5 : 3, "counter");
      },
      onOriginalPose: (event = {}) => {
        if (!this.originalBattle) return;
        this.playOriginalBossPose(event.pose ?? "attack", event.duration ?? 620);
      },
      onBelialGuard: () => {
        if (this.enemy.encounterMode !== "original_belial") return;
        this.sound?.play("guard");
        this.refs.stage?.classList.add("belial-guard-flash");
        setTimeout(() => this.refs.stage?.classList.remove("belial-guard-flash"), 360);
      },
      onBelialSelfHit: (event = {}) => {
        if (this.enemy.encounterMode !== "original_belial") return;
        this.sound?.play("hit");
        this.damageEnemy(event.damage ?? 18, "counter");
        this.showBelialBark(this.belialPickBark("galaxySelfHit"), 1050, "belial-rage");
        const nextPhase=this.enemy.phases?.[this.phaseIndex+1];
        if (this.state.is("ENEMY_ATTACK") && (this.enemy.hp <= 0 || (nextPhase && this.enemy.hp <= Math.ceil(this.enemy.maxHp*nextPhase.threshold)))) this.bullets.stop();
      },
      onBelialClashProgress: (event = {}) => {
        if (this.enemy.encounterMode !== "original_belial") return;
        this.belialClashProgress = clamp(event.progress ?? 0, 0, 1);
        this.refs.stage?.style.setProperty("--belial-clash-progress", String(this.belialClashProgress));
        this.refs.stage?.classList.toggle("belial-clash-pushing", this.belialClashProgress >= .34);
      },
      onBelialClashComplete: () => {
        if (this.enemy.encounterMode !== "original_belial") return;
        this.belialClashComplete = true;
        this.refs.stage?.classList.add("belial-clash-returned");
        this.sound?.play("heavy");
      },
      onGrandLaserHit: (event = {}) => {
        if (this.enemy.encounterMode !== "original_grand_king") return;
        this.sound?.play("hit");
        this.refs.stage?.classList.add("grand-self-hit");
        this.refs.enemySprite?.classList.add("heavy-hit");
        setTimeout(() => { this.refs.stage?.classList.remove("grand-self-hit"); this.refs.enemySprite?.classList.remove("heavy-hit"); }, 460);
        this.damageEnemy(event.damage ?? 24, event.perfect ? "heavy" : "counter");
        this.gainEnergy(event.perfect ? 5 : 3);
        const nextPhase = this.enemy.phases?.[this.phaseIndex + 1];
        if (this.state.is("ENEMY_ATTACK") && (this.enemy.hp <= 0 || (nextPhase && this.enemy.hp <= Math.ceil(this.enemy.maxHp * nextPhase.threshold)))) this.bullets.stop();
      },
      onGatePressure: (value) => {
        if (!this.enemy.gate) return;
        const threshold = this.enemy.gate.threshold ?? 100;
        this.enemy.gate.value = clamp(value, 0, threshold);
        this.renderResources();
      },
      onGateLight: () => {
        this.sound?.play("guard");
        this.gainEnergy(3);
      },
      onCounter: (event = {}) => {
        if (!this.enemy.formation) return;
        this.sound?.play("guard");
        const amount = event.amount ?? 18;
        this.adjustFormation(-amount);
        if (this.enemy.encounterMode === "leo_black_end") {
          this.refs.stage.classList.add(event.perfect ? "leo-horn-perfect" : "leo-horn-counter");
          setTimeout(() => this.refs.stage.classList.remove("leo-horn-perfect", "leo-horn-counter"), 520);
          // A Leo counter is a collision, not merely a meter interaction.
          // It chips the monster while breaking the horn guard.
          const counterDamage = event.perfect ? 8 : 4;
          this.damageEnemy(counterDamage, event.perfect ? "heavy" : "counter");
        }
        this.gainEnergy(event.perfect ? 5 : 3);
      },
      onPressureReflect: (event = {}) => {
        if (this.enemy.encounterMode !== "leo_pressure" || this.phaseIndex < 2) return;
        this.sound?.play("guard");
        const damage = event.damage ?? this.config.arena.mantleReflectDamage ?? 18;
        this.damageEnemy(damage, event.perfect ? "heavy" : "counter");
        this.adjustInterfaceGauge(-(event.perfect ? 18 : 11));
        this.gainEnergy(event.perfect ? 6 : 3);
        this.refs.stage.classList.add("pressure-reflect-flash");
        setTimeout(() => this.refs.stage.classList.remove("pressure-reflect-flash"), 480);
        if (this.enemy.hp <= 0 && this.state.is("ENEMY_ATTACK")) this.bullets.stop();
      },
      onNexusSever: (event = {}) => {
        if (!this.enemy.predation) return;
        this.sound?.play("guard");
        this.adjustPredation(-(event.predationReduce ?? this.enemy.predation.severReduce ?? 10));
        const damage = event.damage ?? this.enemy.predation.severDamage ?? 8;
        this.damageEnemy(damage, "counter");
        if (this.enemy.hp <= 0 && this.state.is("ENEMY_ATTACK")) this.bullets.stop();
      },
      onNexusFeed: (event = {}) => {
        if (!this.enemy.predation) return;
        this.adjustPredation(event.predationGain ?? this.enemy.predation.feedGain ?? 12);
        const heal = event.heal ?? this.enemy.predation.feedHeal ?? 6;
        this.enemy.hp = Math.min(this.enemy.maxHp, this.enemy.hp + heal);
        this.renderResources();
      },
      onPredationChange: (value) => {
        if (!this.enemy.predation) return;
        this.enemy.predation.value = clamp(value, 0, this.enemy.predation.threshold ?? 100);
        this.renderResources();
      },
      onNexusShot: (event = {}) => {
        if (!String(this.enemy.encounterMode ?? "").startsWith("nexus_")) return;
        this.sound?.play("guard");
        if (this.enemy.encounterMode === "nexus_mephisto_zwei") {
          this.adjustInterfaceGauge(-(event.gaugeReduce ?? 8));
          this.damageEnemy(event.damage ?? 5, event.perfect ? "medium" : "counter");
        } else if (this.enemy.encounterMode === "nexus_dark_zagi_bond") {
          this.adjustInterfaceGauge(event.bondGain ?? 4);
          this.damageEnemy(event.damage ?? 4, event.perfect ? "medium" : "counter");
        }
        const nextPhase = this.enemy.phases?.[this.phaseIndex + 1];
        if (this.state.is("ENEMY_ATTACK") && (this.enemy.hp <= 0 || (nextPhase && this.enemy.hp <= Math.ceil(this.enemy.maxHp * nextPhase.threshold)))) this.bullets.stop();
      },
      onNexusDrain: (event = {}) => {
        if (this.enemy.encounterMode !== "nexus_mephisto_zwei") return;
        this.adjustInterfaceGauge(event.gain ?? 10);
      },
      onNexusParry: (event = {}) => {
        if (this.enemy.encounterMode !== "nexus_dark_zagi_bond") return;
        this.sound?.play("guard");
        this.adjustInterfaceGauge(event.bondGain ?? (event.perfect ? 7 : 4));
        this.damageEnemy(event.damage ?? (event.perfect ? 9 : 5), event.perfect ? "heavy" : "counter");
        const nextPhase = this.enemy.phases?.[this.phaseIndex + 1];
        if (this.state.is("ENEMY_ATTACK") && (this.enemy.hp <= 0 || (nextPhase && this.enemy.hp <= Math.ceil(this.enemy.maxHp * nextPhase.threshold)))) this.bullets.stop();
      },
      onNoaReturn: (event = {}) => {
        if (this.enemy.encounterMode !== "nexus_dark_zagi_bond") return;
        this.sound?.play("guard");
        this.adjustInterfaceGauge(event.bondGain ?? 5);
        this.damageEnemy(event.damage ?? 12, event.perfect ? "heavy" : "medium");
        const nextPhase = this.enemy.phases?.[this.phaseIndex + 1];
        if (this.state.is("ENEMY_ATTACK") && (this.enemy.hp <= 0 || (nextPhase && this.enemy.hp <= Math.ceil(this.enemy.maxHp * nextPhase.threshold)))) this.bullets.stop();
      },
      onStaticChange: (value) => {
        if (!this.enemy.static) return;
        this.enemy.static.value = clamp(value, 0, this.enemy.static.threshold ?? 100);
        this.renderResources();
      },
      onGroundNode: (event = {}) => {
        if (!this.gingaBattle) return;
        this.sound?.play("guard");
        const reduce = event.reduce ?? this.enemy.static?.groundReduce ?? 15;
        this.adjustStatic(-reduce);
        this.gainEnergy(event.perfect ? 5 : 3);
      },
      onConduct: (event = {}) => {
        if (!this.gingaBattle || this.phaseIndex === 0) return;
        this.sound?.play("guard");
        this.adjustPlasma(event.amount ?? 1);
        this.gainEnergy(event.perfect ? 5 : 3);
      },
      onMirrorVerify: (event = {}) => {
        if (this.enemy.encounterMode !== "ginga_dark_brothers") return;
        this.sound?.play("guard");
        const base = this.enemy.interfaceGauge?.verifyReduce ?? 18;
        const amount = base + (this.flags.mirrorBait ? 10 : 0) + (event.perfect ? 5 : 0);
        this.adjustInterfaceGauge(-amount);
        if (this.darkHijackedCommand) {
          this.frozenCommands.delete(this.darkHijackedCommand);
          this.darkHijackedCommand = null;
          this.renderCommandAvailability();
        }
        this.gainEnergy(event.perfect ? 7 : 4);
      },
      onMirrorFalse: (event = {}) => {
        if (this.enemy.encounterMode !== "ginga_dark_brothers") return;
        this.adjustInterfaceGauge(event.gain ?? this.enemy.interfaceGauge?.falseGain ?? 10);
        if (this.phaseIndex > 0 && !this.darkHijackedCommand) this.hijackOneCommand();
        this.damagePlayer(event.damage ?? 6);
      },
      onRescueMemory: (event = {}) => {
        if (this.enemy.encounterMode !== "ginga_super_grand_king") return;
        const memoryId = event.memoryId ?? `memory-${this.gingaMisuzuMemories.size + 1}`;
        const firstTime = !this.gingaMisuzuMemories.has(memoryId);
        if (firstTime) this.gingaMisuzuMemories.add(memoryId);
        const base = firstTime
          ? (this.flags.gingaDeepDive ? (this.enemy.rescue?.deepUniqueGain ?? 28) : (this.enemy.rescue?.uniqueGain ?? 25))
          : (this.enemy.rescue?.repeatGain ?? 8);
        this.adjustInterfaceGauge(event.gain ?? base);
        this.gainEnergy(firstTime ? 4 : 2);
        this.sound?.play("guard");
        this.showMisuzuMemoryEcho(memoryId, firstTime);
        if ((this.enemy.interfaceGauge?.value ?? 0) >= (this.enemy.rescue?.required ?? 100)) {
          this.refs.stage.classList.add("misuzu-signal-ready");
        }
      },
      onAllyLink: (event = {}) => {
        if (this.enemy.encounterMode !== "ginga_super_grand_king" || this.phaseIndex < 1) return;
        this.sound?.play("guard");
        this.gainEnergy(6);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 3);
        const damage = event.damage ?? this.enemy.rescue?.allyCounterDamage ?? 14;
        this.damageEnemy(damage, "support");
        this.refs.stage.classList.add("ally-volley-flash");
        setTimeout(() => this.refs.stage.classList.remove("ally-volley-flash"), 620);
        if (this.enemy.hp <= 0 && this.state.is("ENEMY_ATTACK")) this.bullets.stop();
      },
      onAllyStrike: (event = {}) => {
        if (this.enemy.encounterMode !== "ginga_super_grand_king" || this.phaseIndex < 1) return;
        const damage = event.damage ?? this.enemy.rescue?.allyAutoDamage ?? 7;
        this.damageEnemy(damage, "support");
        this.refs.stage.classList.add("ally-volley-flash");
        setTimeout(() => this.refs.stage.classList.remove("ally-volley-flash"), 560);
        this.showSupportCallout(event.name ?? "伙伴们", event.line ?? "火力压住装甲！", 760);
        if (this.enemy.hp <= 0 && this.state.is("ENEMY_ATTACK")) this.bullets.stop();
      },
      onStasisReturn: (event = {}) => {
        if (this.enemy.encounterMode !== "ginga_lugiel_future") return;
        this.sound?.play("guard");
        let damage = event.damage ?? this.enemy.stasis?.returnDamage ?? 11;
        if (this.phaseIndex >= 2) {
          const required = Math.max(1, this.enemy.stasis?.futureAnchorsRequired ?? 3);
          const awakened = clamp(this.lugielFutureAnchors ?? 0, 0, required);
          const lockedBase = this.enemy.stasis?.lockedReturnMultiplier ?? .72;
          const anchorBonus = this.enemy.stasis?.anchorReturnBonus ?? .1;
          const multiplier = this.lugielFutureUnlocked ? 1.18 : lockedBase + awakened * anchorBonus;
          damage = Math.max(1, Math.round(damage * multiplier));
        }
        if (damage > 0) this.damageEnemy(damage, event.perfect ? "heavy" : "counter");
        this.adjustInterfaceGauge(-(event.reduce ?? this.enemy.interfaceGauge?.returnReduce ?? 7));
        this.gainEnergy(event.perfect ? 4 : 2);
        if (this.enemy.hp <= 0 && this.state.is("ENEMY_ATTACK")) this.bullets.stop();
      },
      onStasisMiss: (event = {}) => {
        if (this.enemy.encounterMode !== "ginga_lugiel_future") return;
        this.adjustInterfaceGauge(event.gain ?? this.enemy.interfaceGauge?.missGain ?? 3);
      },
      onFutureAnchor: (event = {}) => {
        if (this.enemy.encounterMode !== "ginga_lugiel_future") return;
        const required = this.enemy.stasis?.futureAnchorsRequired ?? 3;
        this.lugielFutureAnchors = clamp(this.lugielFutureAnchors + 1, 0, required);
        this.adjustInterfaceGauge(-18);
        this.gainEnergy(5);
        this.refs.stage.dataset.futureAnchors = String(this.lugielFutureAnchors);
        this.refs.stage.classList.add("future-anchor-flash");
        setTimeout(() => this.refs.stage.classList.remove("future-anchor-flash"), 520);
        const anchorVoices = [
          ["美铃", "一个未来回来了。"],
          ["友也", "还能继续。"],
          ["泰罗", "就是现在！"]
        ];
        const voice = anchorVoices[Math.min(this.lugielFutureAnchors - 1, anchorVoices.length - 1)];
        if (voice) this.showSupportCallout(voice[0], voice[1], 900);

        if (this.lugielFutureAnchors >= required) {
          this.lugielFutureUnlocked = true;
          this.refs.stage.classList.add("future-awakened", "all-futures-lit");
          this.sound?.playHopeSpark?.();
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 12);
          this.gainEnergy(12);
          this.showSupportCallout("所有人的光", "未来已经打开。", 1250);
          setTimeout(() => this.refs.stage.classList.remove("all-futures-lit"), 1250);
        }
      },
      onLugielAttack: (event = {}) => {
        if (this.enemy.encounterMode !== "ginga_lugiel_future") return;
        const kind = String(event.kind ?? "slash");
        const classes = ["lugiel-slash", "lugiel-cross", "lugiel-spear", "lugiel-gate", "lugiel-clock"];
        this.refs.enemySprite.classList.remove(...classes);
        this.refs.stage.classList.remove("lugiel-attack-flash");
        void this.refs.enemySprite.offsetWidth;
        this.refs.enemySprite.classList.add(`lugiel-${kind}`);
        this.refs.stage.classList.add("lugiel-attack-flash");
        setTimeout(() => {
          this.refs.enemySprite.classList.remove(`lugiel-${kind}`);
          this.refs.stage.classList.remove("lugiel-attack-flash");
        }, kind === "clock" ? 880 : 620);
      },
      onStasisState: (active) => {
        if (this.enemy.encounterMode !== "ginga_lugiel_future") return;
        this.refs.stage.classList.toggle("time-stopped", !!active);
        this.refs.enemySprite.classList.toggle("time-stopped", !!active);
      },
      onCommandThaw: (event = {}) => {
        if (this.enemy.encounterMode !== "ginga_lugiel") return;
        const command = event.command;
        if (command) this.frozenCommands.delete(command);
        this.adjustInterfaceGauge(-(event.reduce ?? this.enemy.interfaceGauge?.thawReduce ?? 16));
        this.gainEnergy(event.perfect ? 6 : 3);
        this.renderCommandAvailability();
      },
      onDollThaw: (event = {}) => {
        if (this.enemy.encounterMode !== "ginga_lugiel") return;
        const form = event.form;
        if (form) this.frozenLiveForms.delete(form);
        this.adjustInterfaceGauge(-(event.reduce ?? this.enemy.interfaceGauge?.thawReduce ?? 16));
        this.gainEnergy(event.perfect ? 6 : 3);
      },
      onFreezeMiss: (event = {}) => {
        if (this.enemy.encounterMode !== "ginga_lugiel") return;
        this.adjustInterfaceGauge(event.gain ?? this.enemy.interfaceGauge?.failGain ?? 9);
      }
    });

    this.inputLocked = false;
    this.dialogueResolver = null;
    this.typingTimer = null;
    this.typingDone = true;
    this.fullDialogueText = "";

    this._onKeyDown = (event) => this.onKeyDown(event);
    this._onResize = () => {
      if (this.state.is("ENEMY_ATTACK")) this.bullets.resizeForDisplay();
    };
  }

  collectRefs() {
    const $ = (selector) => this.root.querySelector(selector);
    return {
      stage: $("#stage"),
      enemyName: $("#enemy-name"),
      enemyPhase: $("#enemy-phase"),
      bossTag: $("#boss-tag"),
      phaseBanner: $("#phase-banner"),
      phaseKicker: $("#phase-kicker"),
      phaseTitle: $("#phase-title"),
      finaleStarfield: $("#finale-starfield"),
      finaleAllies: $("#finale-allies"),
      storyCinematic: $("#story-cinematic"),
      storyExecution: $("#story-execution"),
      gingaRevivalVision: $("#ginga-revival-vision"),
      misuzuBondVision: $("#misuzu-bond-vision"),
      misuzuMemoryEcho: $("#misuzu-memory-echo"),
      misuzuMemoryTitle: $("#misuzu-memory-title"),
      misuzuMemoryLine: $("#misuzu-memory-line"),
      nexusLegacyVision: $("#nexus-legacy-vision"),
      nexusHimeyaVision: $("#nexus-himeya-vision"),
      nexusFinalMash: $("#nexus-final-mash"),
      tigaFinale: $("#tiga-finale"),
      cosmosVision: $("#cosmos-story-vision"),
      tigaWorldLightsStage: $("#tiga-world-lights-stage"),
      tigaLightQte: $("#tiga-light-qte"),
      tigaPlayerLight: $("#tiga-player-light"),
      tigaResponseBeams: $("#tiga-response-beams"),
      tigaWishStream: $("#tiga-wish-stream"),
      tigaPlayerColumn: $("#tiga-player-column"),
      tigaLightWhiteout: $("#tiga-light-whiteout"),
      tigaLightPrompt: $("#tiga-light-prompt"),
      tigaLightPromptTitle: $("#tiga-light-prompt-title"),
      tigaLightPromptKey: $("#tiga-light-prompt-key"),
      leoCinematic: $("#leo-cinematic"),
      leoToruRunner: $("#leo-toru-runner"),
      leoBlackDirective: $("#leo-black-directive"),
      leoStolenCrystal: $("#leo-stolen-crystal"),
      leoCinePrompt: $("#leo-cine-prompt"),
      leoCineTitle: $("#leo-cine-title"),
      leoCineSubtitle: $("#leo-cine-subtitle"),
      storySpeaker: $("#story-speaker"),
      storyLine: $("#story-line"),
      storyTaro: $("#story-taro"),
      supportCallout: $("#support-callout"),
      supportName: $("#support-name"),
      supportLine: $("#support-line"),
      enemyHpFill: $("#enemy-hp-fill"),
      mercyMeter: $("#mercy-meter"),
      mercyMeterText: $("#mercy-meter-text"),
      mercyFill: $("#mercy-fill"),
      gateMeter: $("#gate-meter"),
      gateMeterText: $("#gate-meter-text"),
      gateAdaptationText: $("#gate-adaptation-text"),
      gateFill: $("#gate-fill"),
      formationMeter: $("#formation-meter"),
      formationMeterLabel: $("#formation-meter-label"),
      formationMeterText: $("#formation-meter-text"),
      formationFill: $("#formation-fill"),
      predationMeter: $("#predation-meter"),
      predationMeterText: $("#predation-meter-text"),
      predationFill: $("#predation-fill"),
      staticMeter: $("#static-meter"),
      staticMeterText: $("#static-meter-text"),
      staticFill: $("#static-fill"),
      plasmaMeter: $("#plasma-meter"),
      plasmaMeterText: $("#plasma-meter-text"),
      plasmaFill: $("#plasma-fill"),
      interfaceMeter: $("#interface-meter"),
      interfaceMeterLabel: $("#interface-meter-label"),
      interfaceMeterText: $("#interface-meter-text"),
      interfaceFill: $("#interface-fill"),
      enemySprite: $("#enemy-sprite"),
      damagePop: $("#damage-pop"),
      battleFrame: $("#battle-frame"),
      canvas: $("#battle-canvas"),
      dialogueLayer: $("#dialogue-layer"),
      dialogueText: $("#dialogue-text"),
      continueHint: $("#continue-hint"),
      attackLayer: $("#attack-layer"),
      attackCursor: $("#attack-cursor"),
      perfectZone: $("#perfect-zone"),
      attackGrade: $("#attack-grade"),
      choiceLayer: $("#choice-layer"),
      choiceTitle: $("#choice-title"),
      choiceList: $("#choice-list"),
      choiceDescription: $("#choice-description"),
      playerName: $("#player-name"),
      playerForm: $("#player-form"),
      playerDrainStatus: $("#player-drain-status"),
      lifeRecoverPop: $("#life-recover-pop"),
      playerEnergyRow: $("#player-energy-row"),
      playerHpFill: $("#player-hp-fill"),
      playerHpText: $("#player-hp-text"),
      playerEnergyFill: $("#player-energy-fill"),
      playerEnergyText: $("#player-energy-text"),
      originalAdaptRow: $("#original-adapt-row"),
      originalAdaptFill: $("#original-adapt-fill"),
      originalAdaptText: $("#original-adapt-text"),
      commandMenu: $("#command-menu"),
      microHelp: this.root.querySelector(".micro-help"),
      commands: [...this.root.querySelectorAll(".command")]
    };
  }

  async start() {
    this.bind();
    if (this.gingaBattle) this.applyGingaLiveForm(this.gingaLiveForm, false);
    if (String(this.enemy.encounterMode ?? "").startsWith("nexus_")) this.applyNexusForm(this.nexusForm, false);
    if (this.cosmosBattle) this.applyCosmosForm(this.cosmosForm, false);
    if (this.originalBattle) this.applyOriginalForm(this.originalFormKey, false);
    this.renderStatic();
    this.renderResources();
    this.setCommandsEnabled(false);

    this.state.onChange(({ current }) => {
      this.root.dataset.battleState = current;
    });

    this.state.set("INTRO");

    if (this.enemy.encounterMode === "leo_black_end") {
      await this.leoBlackEndPrelude();
    }

    if (this.enemy.encounterMode === "cosmos_lidorias_forms") {
      await this.cosmosLidoriasIntroCinematic();
    } else if (this.enemy.encounterMode === "cosmos_chaos_ultraman") {
      await this.cosmosChaosUltramanIntroCinematic();
    } else if (this.enemy.encounterMode === "cosmos_chaos_darkness") {
      await this.cosmosChaosDarknessIntroCinematic();
    } else if (this.enemy.encounterMode === "nexus_mephisto_one_himeya") {
      await this.nexusMephistoOneIntroCinematic();
    } else if (this.enemy.encounterMode === "nexus_mephisto_zwei") {
      await this.nexusMephistoIntroCinematic();
    } else if (this.enemy.encounterMode === "nexus_dark_zagi_bond") {
      await this.nexusDarkZagiIntroCinematic();
    } else if (this.enemy.encounterMode === "tiga_golza") {
      await this.tigaGolzaIntroCinematic();
    } else if (this.enemy.encounterMode === "tiga_kyrieloid") {
      await this.tigaKyrieloidIntroCinematic();
    } else if (this.enemy.encounterMode === "tiga_gatanothor_finale") {
      await this.tigaGatanothorIntroCinematic();
    } else if (this.originalBattle) {
      await this.originalBossArrival();
      for (const line of this.enemy.intro ?? []) await this.say(`* ${line}`);
    } else {
      for (const line of this.enemy.intro) await this.say(line);
    }

    await this.startEncounterMusic();
    await this.enterPlayerMenu();
  }


  async startEncounterMusic() {
    if (!this.sound?.playMusic) return;
    const mode = this.enemy.encounterMode;
    if (mode === "tiga_golza") {
      await this.sound.playMusic("golza_battle", { volume: .22, fadeInMs: 1200, fadeOutMs: 0 });
    } else if (mode === "tiga_kyrieloid") {
      await this.sound.playMusic("kyrieloid_battle", { volume: .14, fadeInMs: 1500, fadeOutMs: 0 });
    } else if (mode === "tiga_gatanothor_finale") {
      await this.sound.playMusic("gatanothor_phase12", { volume: .16, fadeInMs: 1800, fadeOutMs: 0 });
    } else if (mode === "leo_giras_rework") {
      await this.sound.playMusic("leo_giras_battle", { volume: .20, fadeInMs: 1200, fadeOutMs: 0 });
    } else if (mode === "leo_pressure") {
      await this.sound.playMusic("leo_pressure_battle", { volume: .18, fadeInMs: 1400, fadeOutMs: 0 });
    } else if (mode === "leo_black_end") {
      await this.sound.playMusic("leo_black_end_battle", { volume: .14, fadeInMs: 1650, fadeOutMs: 0 });
    } else if (mode === "ginga_darambia") {
      await this.sound.playMusic("ginga_darambia_battle", { volume: .18, fadeInMs: 1500, fadeOutMs: 0 });
    } else if (mode === "ginga_super_grand_king") {
      await this.sound.playMusic("ginga_grand_king_battle", { volume: .16, fadeInMs: 1800, fadeOutMs: 0 });
    } else if (mode === "ginga_lugiel_future") {
      await this.sound.playMusic("ginga_lugiel_battle", { volume: .20, fadeInMs: 1900, fadeOutMs: 0 });
    } else if (mode === "cosmos_lidorias_forms") {
      await this.sound.playMusic("cosmos_lidorias_battle", { volume: .18, fadeInMs: 1800, fadeOutMs: 0 });
    } else if (mode === "cosmos_chaos_ultraman") {
      await this.sound.playMusic("cosmos_chaos_ultraman", { volume: .16, fadeInMs: 1900, fadeOutMs: 0 });
    } else if (mode === "cosmos_chaos_darkness") {
      await this.sound.playMusic("cosmos_darkness_battle", { volume: .20, fadeInMs: 1800, fadeOutMs: 0 });
    } else if (mode === "nexus_mephisto_one_himeya") {
      // Himeya's opening battle before Mephisto defeats him. The Sera scene and 1 HP revival replace this later.
      await this.sound.playMusic("nexus_himeya_phase1", { volume: .20, fadeInMs: 2200, fadeOutMs: 1800 });
    } else if (mode === "nexus_mephisto_zwei") {
      // Track 3 owns the sunset intro; once the transformation lands, crossfade into Track 2.
      await this.sound.playMusic("nexus_ren_blue", { volume: .112, fadeInMs: 3000, fadeOutMs: 2300 });
    } else if (mode === "nexus_dark_zagi_bond") {
      // Track 5: Zagi phase one. Later forms replace it from their cinematics.
      await this.sound.playMusic("nexus_zagi_phase1", { volume: .17, fadeInMs: 2500, fadeOutMs: 0 });
    } else if (mode === "original_zetton") {
      // The supplied track covers the entire encounter. Phase changes do not touch
      // currentMusic, so Zetton -> Hyper Zetton continues from the same playback point.
      await this.sound.playMusic("original_zetton_battle", { volume: .17, fadeInMs: 1500, fadeOutMs: 0 });
    } else if (mode === "original_greeza") {
      // One continuous Greeza track owns all three forms; form transitions keep the
      // same playback position rather than restarting the song.
      await this.sound.playMusic("original_greeza_battle", { volume: .17, fadeInMs: 1500, fadeOutMs: 0 });
    } else if (mode === "original_grand_king") {
      // Grand King's supplied battle track owns the whole encounter. Armour breaks
      // and phase changes keep the same playback position.
      await this.sound.playMusic("original_grand_king_battle", { volume: .17, fadeInMs: 1500, fadeOutMs: 0 });
    } else if (mode === "original_five_king") {
      // Five King's supplied track continues across every organ break. Destroying a
      // module changes the attack pool, not the playback position.
      await this.sound.playMusic("original_five_king_battle", { volume: .17, fadeInMs: 1500, fadeOutMs: 0 });
    } else if (mode === "original_belial") {
      // Belial owns one continuous battle track. Galaxy flight, the phase-three field
      // and the final Deathcium clash keep the same playback position.
      await this.sound.playMusic("original_belial_battle", { volume: .17, fadeInMs: 1500, fadeOutMs: 0 });
    }
  }

  bind() {
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("resize", this._onResize);
    this.bullets.mount();

    this._commandHandlers = this.refs.commands.map((button, index) => {
      const onEnter = () => {
        if (!this.state.is("PLAYER_MENU") || this.inputLocked || button.disabled) return;
        if (this.currentCommand !== index) this.sound?.play("select");
        this.currentCommand = index;
        this.renderCommandSelection();
      };

      const onClick = () => {
        if (!this.state.is("PLAYER_MENU") || this.inputLocked || button.disabled) return;
        this.sound?.play("confirm");
        this.currentCommand = index;
        this.renderCommandSelection();
        this.chooseCommand(this.commandOrder[this.currentCommand]);
      };

      button.addEventListener("mouseenter", onEnter);
      button.addEventListener("click", onClick);
      return { button, onEnter, onClick };
    });
  }

  destroy() {
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("resize", this._onResize);
    this.bullets.unmount();
    this.sound?.stopFinalePulse?.();
    this.sound?.stopTigaFinalePulse?.();
    this.sound?.stopMusic?.(260);
    this.sound?.stopAssetOneShots?.();
    this._tigaLightQteCleanup?.();
    this._tigaLightQteCleanup = null;
    this._leoSequenceCleanup?.();
    this._leoSequenceCleanup = null;
    this._nexusFinalMashCleanup?.();
    this._nexusFinalMashCleanup = null;
    cancelAnimationFrame(this.attackRAF);
    clearInterval(this.typingTimer);

    for (const handler of this._commandHandlers ?? []) {
      handler.button.removeEventListener("mouseenter", handler.onEnter);
      handler.button.removeEventListener("click", handler.onClick);
    }
  }

  renderStatic() {
    this.refs.enemyName.textContent = this.enemy.name;
    this.refs.enemyPhase.textContent = this.currentPhase?.subtitle ?? this.enemy.subtitle ?? "";
    if (this.refs.bossTag) this.refs.bossTag.hidden = !this.enemy.boss;
    if (this.refs.phaseKicker) this.refs.phaseKicker.textContent = "BOSS PHASE";
    if (this.refs.finaleStarfield) this.refs.finaleStarfield.hidden = true;
    if (this.refs.finaleAllies) this.refs.finaleAllies.hidden = true;
    if (this.refs.tigaWorldLightsStage) this.refs.tigaWorldLightsStage.hidden = true;
    if (this.refs.tigaFinale) { this.refs.tigaFinale.hidden = true; this.refs.tigaFinale.dataset.step = ""; }
    if (this.refs.tigaLightQte) {
      this.refs.tigaLightQte.hidden = true;
      this.refs.tigaLightQte.dataset.stage = "";
      this.refs.tigaLightQte.style.removeProperty("--core-size");
      this.refs.tigaLightQte.style.removeProperty("--core-glow");
      this.refs.tigaLightQte.style.removeProperty("--ring-scale");
    }
    if (this.refs.leoCinematic) { this.refs.leoCinematic.hidden = true; this.refs.leoCinematic.dataset.step = ""; }
    if (this.refs.storyExecution) {
      this.refs.storyExecution.hidden = true;
      this.refs.storyExecution.dataset.step = "";
    }
    if (this.refs.gingaRevivalVision) { this.refs.gingaRevivalVision.hidden = true; this.refs.gingaRevivalVision.dataset.step = ""; }
    if (this.refs.misuzuBondVision) { this.refs.misuzuBondVision.hidden = true; this.refs.misuzuBondVision.dataset.step = ""; }
    if (this.refs.misuzuMemoryEcho) { this.refs.misuzuMemoryEcho.hidden = true; this.refs.misuzuMemoryEcho.classList.remove("show"); }
    for (const timer of this.gingaMisuzuEchoTimers ?? []) clearTimeout(timer);
    this.gingaMisuzuEchoTimers = [];
    if (this.refs.nexusLegacyVision) { this.refs.nexusLegacyVision.hidden = true; this.refs.nexusLegacyVision.dataset.scene = ""; this.refs.nexusLegacyVision.classList.remove("active"); }
    if (this.refs.storyCinematic) {
      this.refs.storyCinematic.hidden = true;
      this.refs.storyCinematic.classList.remove("leave", "first-spark", "more-sparks", "crowd-light", "ginga-revival-cinematic");
      this.refs.storyCinematic.dataset.mood = "";
    }
    if (this.refs.supportCallout) {
      this.refs.supportCallout.hidden = true;
      this.refs.supportCallout.classList.remove("show");
    }
    this.refs.playerName.textContent = this.player.name;
    this.refs.playerForm.textContent = this.player.form ?? "";

    this.refs.enemySprite.classList.remove("hit", "dead", "roar", "charged", "phase-shift", "lugiel-overwhelm");
    this.refs.stage.classList.remove(
      "lugiel-despair", "ginga-reignite", "finale-hope", "golza-awakening", "golza-weak-mark", "golza-opening",
      "kyrieloid-opening", "kyrieloid-imitation", "tiga-petrified", "tiga-glitter-finale", "tiga-dawn",
      "black-end-unbound", "black-end-horns-broken", "leo-forced-stop", "nexus-blue-entry", "nexus-dark-field-g", "mizorogi-entry", "mizorogi-intercept",
      "zagi-awakening", "nexus-memory-himeya", "nexus-memory-ren", "nexus-noa-awakening", "nexus-noa-wings-open", "mephisto-zwei-overrun", "mephisto-zwei-siphon", "mephisto-zwei-final-claw", "nexus-lightning-noa-finish",
      "himeya-exhausted", "himeya-one-hp", "himeya-restored", "himeya-whiteout", "ginga-final-revive",
      "nexus-form-flash", "cosmos-intro-pending", "cosmos-intro-reveal"
    );
    this.refs.enemySprite.dataset.enemy = this.enemy.id;
    this.refs.stage.dataset.enemy = this.enemy.id;
    this.refs.stage.dataset.bossPhase = String(this.phaseIndex);
    this.refs.stage.dataset.mercyRoute = this.mercyRouteEnabled() ? "true" : "false";
    this.refs.stage.dataset.gateBattle = this.enemy.gate ? "true" : "false";
    this.refs.stage.dataset.leoBattle = String(this.enemy.encounterMode ?? "").startsWith("leo_") ? "true" : "false";
    this.refs.stage.dataset.pressureShrunk = "false";
    this.refs.stage.dataset.pressureMantle = "false";
    this.refs.stage.dataset.blackEndHostage = "false";
    this.refs.stage.dataset.nexusBattle = this.enemy.nexusBattle ? "true" : "false";
    this.refs.stage.dataset.cosmosBattle = this.cosmosBattle ? "true" : "false";
    this.refs.stage.dataset.cosmosEncounter = this.enemy.encounterMode ?? "";
    this.refs.stage.dataset.cosmosForm = this.cosmosForm ?? "";
    this.refs.stage.dataset.nexusEncounter = this.enemy.encounterMode ?? "";
    this.refs.stage.dataset.nexusForm = this.nexusForm ?? "";
    this.refs.stage.dataset.mizorogiAssist = this.mizorogiAssist ? "true" : "false";
    this.refs.stage.dataset.metaField = this.nexusMetaField ? "true" : "false";
    this.refs.stage.dataset.gingaBattle = this.gingaBattle ? "true" : "false";
    this.refs.stage.dataset.gingaEncounter = this.enemy.encounterMode ?? "";
    this.refs.stage.dataset.liveForm = this.gingaLiveForm ?? "";
    this.refs.stage.dataset.original = this.originalBattle ? "true" : "false";
    this.refs.stage.dataset.originalForm = this.originalFormKey ?? "";
    this.refs.stage.dataset.originalReady = this.originalBattle ? "true" : "false";
    this.refs.stage.dataset.futureAnchors = String(this.lugielFutureAnchors ?? 0);
    if (this.refs.playerEnergyRow) this.refs.playerEnergyRow.hidden = !!this.player.hideEnergy;
    if (this.refs.playerDrainStatus) {
      this.refs.playerDrainStatus.hidden = !this.lifeCycleEnabled();
      this.refs.playerDrainStatus.textContent = this.enemy.encounterMode === "nexus_mephisto_one_himeya"
        ? (this.himeyaOneHpLocked && !this.himeyaNightRaiderRestored ? "1 HP LOCKED · LIGHT REMAINS" : this.himeyaNightRaiderRestored ? "NIGHT RAIDER ENERGY · RESTORED" : "HIMEYA · EXHAUSTED")
        : this.lifeCycleEnabled() ? `ROUND -${this.currentLifeDrainAmount()} HP · HIT → RECOVER` : "";
    }
    this.renderTargetableState();
    this.refs.dialogueText.style.fontSize = "";
    this.refs.dialogueText.style.fontWeight = "";
    this.refs.attackGrade.textContent = "";
    this.refs.damagePop.textContent = "";
  }

  mercyRouteEnabled() {
    const mercy = this.enemy.mercy;
    if (!mercy?.enabled) return false;
    if (!mercy.playerIds?.length) return true;
    return mercy.playerIds.includes(this.player.id);
  }

  adjustMercy(amount) {
    if (!this.mercyRouteEnabled()) return 0;
    const mercy = this.enemy.mercy;
    const threshold = mercy.threshold ?? 100;
    mercy.value = clamp((mercy.value ?? 0) + amount, 0, threshold);
    this.renderResources();
    return mercy.value;
  }

  isMercyReady() {
    if (!this.mercyRouteEnabled()) return false;
    const mercy = this.enemy.mercy;
    return (mercy.value ?? 0) >= (mercy.threshold ?? 100);
  }

  skillBlockedByMercy(skill) {
    if (!skill || !this.mercyRouteEnabled()) return false;
    const mercy = this.enemy.mercy;
    return skill.kind === "mercy"
      && mercy.finishSkillId === skill.id
      && !this.isMercyReady();
  }

  renderResources() {
    const pRatio = clamp(this.player.hp / this.player.maxHp, 0, 1);
    const eRatio = clamp(this.enemy.hp / this.enemy.maxHp, 0, 1);
    const energyRatio = clamp(this.player.energy / this.player.maxEnergy, 0, 1);

    this.refs.playerHpFill.style.width = `${pRatio * 100}%`;
    this.refs.enemyHpFill.style.width = `${eRatio * 100}%`;
    this.refs.playerEnergyFill.style.width = `${energyRatio * 100}%`;

    this.refs.playerHpText.textContent = `${Math.max(0, Math.ceil(this.player.hp))} / ${this.player.maxHp}`;
    this.refs.playerEnergyText.textContent = `${Math.round(this.player.energy)} / ${this.player.maxEnergy}`;

    const showMercy = this.mercyRouteEnabled();
    if (this.refs.mercyMeter) this.refs.mercyMeter.hidden = !showMercy;
    if (showMercy) {
      const mercy = this.enemy.mercy;
      const threshold = mercy.threshold ?? 100;
      const value = clamp(mercy.value ?? 0, 0, threshold);
      const ratio = threshold > 0 ? value / threshold : 0;
      if (this.refs.mercyFill) this.refs.mercyFill.style.width = `${ratio * 100}%`;
      if (this.refs.mercyMeterText) this.refs.mercyMeterText.textContent = `${Math.round(ratio * 100)}%`;
      this.refs.stage.dataset.mercyReady = ratio >= 1 ? "true" : "false";
    } else {
      this.refs.stage.dataset.mercyReady = "false";
    }

    const showGate = !!this.enemy.gate;
    if (this.refs.gateMeter) this.refs.gateMeter.hidden = !showGate;
    if (showGate) {
      const gate = this.enemy.gate;
      const threshold = gate.threshold ?? 100;
      const value = clamp(gate.value ?? 0, 0, threshold);
      const ratio = threshold > 0 ? value / threshold : 0;
      if (this.refs.gateFill) this.refs.gateFill.style.width = `${ratio * 100}%`;
      if (this.refs.gateMeterText) this.refs.gateMeterText.textContent = `${Math.round(ratio * 100)}%`;
      if (this.refs.gateAdaptationText) {
        const adaptation = this.enemy.adaptation;
        const current = adaptation?.current;
        const label = current ? (adaptation.labels?.[current] ?? current) : null;
        this.refs.gateAdaptationText.textContent = label ? `模仿：${label}` : "未模仿";
      }
      this.refs.stage.dataset.gateHigh = ratio >= .75 ? "true" : "false";
    } else {
      this.refs.stage.dataset.gateHigh = "false";
    }

    const showFormation = !!this.enemy.formation;
    if (this.refs.formationMeter) this.refs.formationMeter.hidden = !showFormation;
    if (showFormation) {
      const formation = this.enemy.formation;
      const threshold = formation.threshold ?? 100;
      const value = clamp(formation.value ?? 0, 0, threshold);
      const ratio = threshold > 0 ? value / threshold : 0;
      if (this.refs.formationFill) this.refs.formationFill.style.width = `${ratio * 100}%`;
      if (this.refs.formationMeterText) this.refs.formationMeterText.textContent = `${Math.round(ratio * 100)}%`;
      if (this.refs.formationMeterLabel) {
        this.refs.formationMeterLabel.textContent = this.phaseIndex > 0
          ? (formation.phase1Label ?? "COMMAND")
          : (formation.phase0Label ?? "FORMATION");
      }
      this.refs.stage.dataset.formationBroken = ratio <= .02 ? "true" : "false";
    } else {
      this.refs.stage.dataset.formationBroken = "false";
    }

    const showPredation = !!this.enemy.predation;
    if (this.refs.predationMeter) this.refs.predationMeter.hidden = !showPredation;
    if (showPredation) {
      const predation = this.enemy.predation;
      const threshold = predation.threshold ?? 100;
      const value = clamp(predation.value ?? 0, 0, threshold);
      const ratio = threshold > 0 ? value / threshold : 0;
      if (this.refs.predationFill) this.refs.predationFill.style.width = `${ratio * 100}%`;
      if (this.refs.predationMeterText) this.refs.predationMeterText.textContent = `${Math.round(ratio * 100)}%`;
      this.refs.stage.dataset.predationHigh = ratio >= .72 ? "true" : "false";
    } else {
      this.refs.stage.dataset.predationHigh = "false";
    }

    const showStatic = this.gingaBattle && this.phaseIndex === 0 && !!this.enemy.static;
    if (this.refs.staticMeter) this.refs.staticMeter.hidden = !showStatic;
    if (showStatic) {
      const threshold = this.enemy.static.threshold ?? 100;
      const value = clamp(this.enemy.static.value ?? 0, 0, threshold);
      const ratio = threshold > 0 ? value / threshold : 0;
      this.refs.staticFill.style.width = `${ratio * 100}%`;
      this.refs.staticMeterText.textContent = `${Math.round(ratio * 100)}%`;
      this.refs.stage.dataset.staticHigh = ratio >= .72 ? "true" : "false";
    } else this.refs.stage.dataset.staticHigh = "false";

    const showPlasma = this.gingaBattle && this.phaseIndex > 0 && !!this.enemy.plasma;
    if (this.refs.plasmaMeter) this.refs.plasmaMeter.hidden = !showPlasma;
    if (showPlasma) {
      const threshold = this.enemy.plasma.threshold ?? 3;
      const value = clamp(this.enemy.plasma.value ?? 0, 0, threshold);
      const ratio = threshold > 0 ? value / threshold : 0;
      this.refs.plasmaFill.style.width = `${ratio * 100}%`;
      this.refs.plasmaMeterText.textContent = Array.from({ length: threshold }, (_, i) => i < value ? "●" : "○").join("");
      this.refs.stage.dataset.plasmaReady = value >= threshold ? "true" : "false";
    } else this.refs.stage.dataset.plasmaReady = "false";

    const hideChaosUltramanGauge = this.enemy.encounterMode === "cosmos_chaos_ultraman" && this.phaseIndex >= 2;
    const showInterface = !!this.enemy.interfaceGauge && !hideChaosUltramanGauge;
    if (this.refs.interfaceMeter) this.refs.interfaceMeter.hidden = !showInterface;
    if (showInterface) {
      const gauge = this.enemy.interfaceGauge;
      const threshold = gauge.threshold ?? 100;
      const value = clamp(gauge.value ?? 0, 0, threshold);
      const ratio = threshold > 0 ? value / threshold : 0;
      if (this.refs.interfaceMeterLabel) this.refs.interfaceMeterLabel.textContent = gauge.label ?? "SYSTEM";
      let interfaceVisualRatio = ratio;
      if (this.enemy.encounterMode === "original_five_king" && this.originalFiveKingModules) {
        const alive = this.aliveOriginalModules().length;
        const total = Object.keys(this.originalFiveKingModules).length || 5;
        const target = this.originalTargetPart ? this.originalFiveKingModules[this.originalTargetPart] : null;
        interfaceVisualRatio = alive / total;
        if (this.refs.interfaceMeterLabel) this.refs.interfaceMeterLabel.textContent = target ? `MODULES · ${target.name}` : "MODULES";
        if (this.refs.interfaceMeterText) this.refs.interfaceMeterText.textContent = `${alive} / ${total}`;
        if (this.refs.interfaceFill) this.refs.interfaceFill.style.width = `${interfaceVisualRatio * 100}%`;
      } else if (this.enemy.encounterMode === "cosmos_chaos_ultraman" && this.phaseIndex === 1) {
        if (this.refs.interfaceMeterLabel) this.refs.interfaceMeterLabel.textContent = "OBJECTIVE · COPY CORE";
        if (this.refs.interfaceMeterText) this.refs.interfaceMeterText.textContent = `${Math.round(value)} / ${Math.round(threshold)}`;
        if (this.refs.interfaceFill) this.refs.interfaceFill.style.width = `${ratio * 100}%`;
      } else if (this.enemy.encounterMode === "cosmos_chaos_darkness" && !this.cosmosMiracleActive) {
        if (this.refs.interfaceMeterLabel) this.refs.interfaceMeterLabel.textContent = "OBJECTIVE · ANSWER";
        if (this.refs.interfaceMeterText) this.refs.interfaceMeterText.textContent = `${Math.round(value)} / ${Math.round(threshold)}`;
        if (this.refs.interfaceFill) this.refs.interfaceFill.style.width = `${ratio * 100}%`;
      } else {
        if (this.enemy.encounterMode === "cosmos_chaos_ultraman" && this.phaseIndex === 0 && this.refs.interfaceMeterLabel) this.refs.interfaceMeterLabel.textContent = "OBJECTIVE · COPY";
        if (this.enemy.encounterMode === "cosmos_chaos_darkness" && this.cosmosMiracleActive && this.refs.interfaceMeterLabel) this.refs.interfaceMeterLabel.textContent = "OBJECTIVE · HEART";
        if (this.refs.interfaceMeterText) this.refs.interfaceMeterText.textContent = `${Math.round(ratio * 100)}%`;
        if (this.refs.interfaceFill) this.refs.interfaceFill.style.width = `${ratio * 100}%`;
      }
      this.refs.stage.dataset.interfaceHigh = interfaceVisualRatio >= .72 ? "true" : "false";
    } else {
      this.refs.stage.dataset.interfaceHigh = "false";
    }
    this.updateCosmosObjectiveHud();

    if (this.refs.originalAdaptRow) this.refs.originalAdaptRow.hidden = true;
    if (this.originalBattle) this.refs.stage.dataset.originalReady = "true";

    if (this.refs.playerDrainStatus && this.lifeCycleEnabled()) {
      this.refs.playerDrainStatus.textContent = this.enemy.encounterMode === "nexus_mephisto_one_himeya"
        ? (this.himeyaOneHpLocked && !this.himeyaNightRaiderRestored ? "1 HP LOCKED · LIGHT REMAINS" : this.himeyaNightRaiderRestored ? "NIGHT RAIDER ENERGY · RESTORED" : "HIMEYA · EXHAUSTED")
        : `ROUND -${this.currentLifeDrainAmount()} HP · HIT → RECOVER`;
    }
  }

  adjustStatic(amount) {
    if (!this.enemy.static) return 0;
    const threshold = this.enemy.static.threshold ?? 100;
    this.enemy.static.value = clamp((this.enemy.static.value ?? 0) + amount, 0, threshold);
    this.renderResources();
    return this.enemy.static.value;
  }

  adjustPlasma(amount) {
    if (!this.enemy.plasma) return 0;
    const threshold = this.enemy.plasma.threshold ?? 3;
    this.enemy.plasma.value = clamp((this.enemy.plasma.value ?? 0) + amount, 0, threshold);
    this.renderResources();
    return this.enemy.plasma.value;
  }

  adjustInterfaceGauge(amount) {
    if (!this.enemy.interfaceGauge) return 0;
    const gauge = this.enemy.interfaceGauge;
    const threshold = gauge.threshold ?? 100;
    gauge.value = clamp((gauge.value ?? 0) + amount, 0, threshold);
    this.renderResources();
    return gauge.value;
  }

  interfaceDamageMultiplier() {
    const gauge = this.enemy.interfaceGauge;
    if (!gauge) return 1;
    const ratio = clamp((gauge.value ?? 0) / Math.max(1, gauge.threshold ?? 100), 0, 1);
    if (ratio >= .7) return gauge.highDamageMultiplier ?? .72;
    if (ratio >= .3) return gauge.midDamageMultiplier ?? 1;
    return gauge.lowDamageMultiplier ?? 1.25;
  }

  applyGingaEncounterDamage(baseDamage) {
    let damage = Math.max(0, Math.round(baseDamage));
    if (damage <= 0) return 0;

    if (this.enemy.encounterMode === "ginga_super_grand_king") {
      if (this.phaseIndex === 0) {
        const floor = Math.ceil(this.enemy.maxHp * (this.enemy.rescue?.phase0HpFloor ?? .62));
        const room = Math.max(0, this.enemy.hp - floor);
        damage = Math.min(room, Math.max(0, Math.round(damage * .32)));
      } else {
        damage = Math.max(1, Math.round(damage * 1.08));
      }
      return damage;
    }

    if (this.enemy.encounterMode === "ginga_lugiel_future") {
      damage = Math.max(1, Math.round(damage * this.interfaceDamageMultiplier()));
      if (this.phaseIndex >= 2) {
        // ABSOLUTE STOP no longer turns normal attacks into a confusing 0-damage wall.
        // Future anchors now weaken the stasis layer progressively instead of acting as a hard HP lock.
        const required = Math.max(1, this.enemy.stasis?.futureAnchorsRequired ?? 3);
        const awakened = clamp(this.lugielFutureAnchors ?? 0, 0, required);
        const lockedBase = this.enemy.stasis?.lockedDamageMultiplier ?? .62;
        const unlockedBonus = this.enemy.stasis?.anchorDamageBonus ?? .14;
        const multiplier = this.lugielFutureUnlocked
          ? (this.enemy.stasis?.unlockedDamageMultiplier ?? 1.12)
          : lockedBase + awakened * unlockedBonus;
        damage = Math.max(1, Math.round(damage * multiplier));
      }
      return damage;
    }

    return damage;
  }

  hijackOneCommand() {
    if (this.enemy.encounterMode !== "ginga_dark_brothers") return null;
    const candidates = this.commandOrder.filter((command) => command !== "ITEM" && !this.frozenCommands.has(command));
    if (!candidates.length) return null;
    const command = candidates[Math.floor(Math.random() * candidates.length)];
    this.frozenCommands.add(command);
    this.darkHijackedCommand = command;
    this.renderCommandAvailability();
    return command;
  }

  thawOneFrozenThing() {
    const commands = [...this.frozenCommands];
    if (commands.length) {
      const command = commands[0];
      this.frozenCommands.delete(command);
      if (this.darkHijackedCommand === command) this.darkHijackedCommand = null;
      this.renderCommandAvailability();
      return `指令 ${command}`;
    }
    const forms = [...this.frozenLiveForms];
    if (forms.length) {
      const form = forms[0];
      this.frozenLiveForms.delete(form);
      return this.gingaFormProfile(form)?.name ?? form;
    }
    return null;
  }

  prepareLugielFreezeTargets() {
    if (this.enemy.encounterMode !== "ginga_lugiel") return [];
    const cfg = this.enemy.freeze ?? {};
    const commandCount = cfg.commandTargetsByPhase?.[this.phaseIndex] ?? 1;
    const liveCount = cfg.liveTargetsByPhase?.[this.phaseIndex] ?? 0;
    const labels = { ATTACK: "攻击", SKILL: "技能", ACT: "行动", ITEM: "LIVE" };

    // Existing frozen UI must remain physically reclaimable in the next enemy turn.
    // Otherwise a missed crystal could leave a command frozen forever with no crystal to break.
    const targets = [...this.frozenCommands].map((command) => ({
      type: "command", id: command, label: labels[command] ?? command
    }));
    for (const form of this.frozenLiveForms) {
      targets.push({
        type: "form",
        id: form,
        label: this.gingaFormProfile(form)?.displayName ?? this.gingaFormProfile(form)?.name ?? form
      });
    }

    const commandPool = this.commandOrder.filter((command) => !this.frozenCommands.has(command));
    for (let i = 0; i < commandCount && commandPool.length; i++) {
      const index = Math.floor(Math.random() * commandPool.length);
      const command = commandPool.splice(index, 1)[0];
      this.frozenCommands.add(command);
      targets.push({ type: "command", id: command, label: labels[command] ?? command });
    }

    const livePool = [...this.gingaUnlocked].filter((form) => form !== this.gingaLiveForm && !this.frozenLiveForms.has(form));
    for (let i = 0; i < liveCount && livePool.length; i++) {
      const index = Math.floor(Math.random() * livePool.length);
      const form = livePool.splice(index, 1)[0];
      this.frozenLiveForms.add(form);
      targets.push({
        type: "form",
        id: form,
        label: this.gingaFormProfile(form)?.displayName ?? this.gingaFormProfile(form)?.name ?? form
      });
    }

    // De-duplicate because phase transitions may pre-freeze a command before this round starts.
    const unique = new Map();
    for (const target of targets) unique.set(`${target.type}:${target.id}`, target);
    this.pendingFreezeTargets = [...unique.values()];
    this.renderCommandAvailability();
    return this.pendingFreezeTargets;
  }

  ensureLugielCommandLifeline() {
    if (this.enemy.encounterMode !== "ginga_lugiel") return false;
    const allFrozen = this.commandOrder.every((command) => this.frozenCommands.has(command));
    if (!allFrozen) return false;

    // Lugiel may nearly erase the UI, but the runtime must never soft-lock.
    // ATTACK becomes the one surviving pulse if the player failed to recover any crystal.
    this.frozenCommands.delete("ATTACK");
    this.renderCommandAvailability();
    return true;
  }

  gingaFormProfile(formKey = this.gingaLiveForm) {
    return this.player.liveSystem?.forms?.[formKey] ?? null;
  }

  applyGingaLiveForm(formKey, refresh = true) {
    if (!this.gingaBattle) return false;
    const form = this.gingaFormProfile(formKey);
    if (!form) return false;
    this.gingaLiveForm = formKey;
    this.player.attack = form.attack ?? this.player.attack;
    this.player.skills = structuredClone(form.skills ?? []);
    this.player.name = form.displayName ?? form.name ?? this.player.name;
    this.player.form = form.form ?? this.player.form;
    if (this.refs) {
      this.refs.playerName.textContent = this.player.name;
      this.refs.playerForm.textContent = this.player.form ?? "";
      this.refs.stage.dataset.liveForm = this.gingaLiveForm;
      if (refresh) { this.renderResources(); this.renderCommandAvailability(); }
    }
    return true;
  }

  getGingaLiveOptions() {
    if (!this.gingaBattle) return [];
    if (this.lugielFinaleActive()) return this.getLugielFinaleLiveOptions();
    const forms = this.player.liveSystem?.forms ?? {};
    const order = ["black-king", "thunder-darambia", "ultraman", "ultraseven", "ginga", ...Object.keys(forms)];
    const seen = new Set();
    return order
      .filter((key) => !seen.has(key) && seen.add(key) && forms[key] && this.gingaUnlocked.has(key))
      .map((key) => ({
        id: `live-${key}`,
        liveForm: key,
        name: forms[key].name ?? key,
        description: forms[key].description ?? "",
        current: key === this.gingaLiveForm,
        frozen: this.frozenLiveForms.has(key)
      }));
  }

  lugielFinaleActive() {
    return this.enemy.encounterMode === "ginga_lugiel_future" && this.phaseIndex >= 2 && this.lugielFinaleSupportActive;
  }

  lugielFinaleRevivalEligible() {
    // The rematch itself is the condition. Do not depend on a transient phase/UI flag:
    // if the final battle has been reignited once, Lugiel can no longer earn a normal DEFEAT.
    return this.enemy.encounterMode === "ginga_lugiel_future" && this.lugielFinaleImmortal;
  }

  getLugielFinaleSkills() {
    const required = this.enemy.stasis?.futureAnchorsRequired ?? 3;
    return [
      {
        id: "future-radiance",
        name: "未来闪光",
        damage: 48,
        cost: 18,
        attackClass: "energy",
        finaleStasisReduce: 7,
        finaleMark: true,
        description: "命中后压低 STASIS，并扩大下一轮 FUTURE 标记。",
        text: "银河水晶没有朝路基艾尔发射光线，它们先照亮了周围被冻结的空间。"
      },
      {
        id: "everyone-light",
        name: "大家的光",
        cost: 30,
        kind: "finaleLight",
        description: "把伙伴们留在这里的光重新汇到银河火花。恢复生命，并获得下一轮的光之保护。",
        text: "银河火花里，几道不同的光同时回应。"
      },
      {
        id: "ginga-especially-final",
        name: "银河Especially",
        damage: 118,
        cost: 58,
        attackClass: "energy",
        locked: !this.lugielFutureUnlocked,
        lockText: `FUTURE ${this.lugielFutureAnchors}/${required}`,
        description: this.lugielFutureUnlocked
          ? "所有未来都已点亮，让一路走来的光汇成最后的爆发。"
          : `还不够。先让 ${required} 个未来锚点重新运动。`,
        text: "银河全身的水晶同时亮起，那些被停止过的光，也一同汇入了银河的体内。"
      }
    ];
  }

  getLugielFinaleActions() {
    const used = this.lugielFinaleBonds;
    const bonds = [
      {
        id: "answer-misuzu",
        effect: "finaleMisuzu",
        name: "回应美铃",
        once: true,
        used: used.has("misuzu"),
        description: "两小无猜的二人，永远是彼此最坚实的后盾",
        text: "你回应了她。",
        resultText: "美铃：路基艾尔！未来的确充满了未知，也许真的会有悲伤和绝望……\n但是！这就是我们必须要走下去的路！ 我们绝对不接受你那种虚假的‘永恒幸福’！我们要靠自己的双脚，和小光一起，走向真正的明天！！"
      },
      {
        id: "answer-kenta-chigusa",
        effect: "finaleFriends",
        name: "听见健太与千草",
        once: true,
        used: used.has("friends"),
        description: "你知道无论经历了什么，永远有人会与你同行。",
        text: "你听见两道熟悉的声音。",
        resultText: "健太 / 千草：我的梦想……是成为世界第一的摄影师！我要拍下各种各样的景色！虽然未来可能会有痛苦，但我绝对不会逃避！因为没有痛苦，就拍不出真正美丽的照片啊！/我的梦想……是成为全宇宙最棒的偶像！\n我要在世界各地的大家面前唱歌，用歌声带给所有人笑容！我的梦想才刚刚开始，怎么可以在这里被停下来！"
      },
      {
        id: "answer-tomoya",
        effect: "finaleTomoya",
        name: "相信友也",
        once: true,
        used: used.has("tomoya"),
        description: "曾经的对手，现在，他是最不希望你倒下的伙伴之一",
        text: "你没有看脚下。你看向未来。",
        resultText: "友也：礼堂光，是你让我明白了，什么是真正的伙伴，什么又是真正的坚强。\n只要我们还活着，就能不断改变，不断变强！我们的未来……由我们自己来决定！"
      },
      {
        id: "answer-taro",
        effect: "finaleTaro",
        name: "和泰罗一起向前",
        once: true,
        used: used.has("taro"),
        description: "那道挡在 Dark Spark 前的光仍然没有退。",
        text: "你向前一步。泰罗也没有后退。",
        resultText: "泰罗：只要人们还拥有梦想，只要大家的心还在紧紧相连，光芒就绝对不会消失！路基艾尔，你休想夺走孩子们的未来！"
      }
    ];

    if (bonds.every((bond) => bond.used)) {
      return [{
        id: "answer-everyone",
        effect: "finaleEveryone",
        name: "回应所有人",
        description: "所有人的声音，所有人的希望，所有人的梦想，所有人的未来，都汇聚到了一起。",
        text: "你握紧银河火花。",
        resultText: "所有人的光都在这里。"
      }];
    }
    return bonds;
  }

  getLugielFinaleLiveOptions() {
    const used = this.lugielFinaleMemories;
    const options = [
      {
        id: "memory-black-king",
        memoryId: "black-king",
        name: "BLACK KING · 第一步",
        used: used.has("black-king"),
        description: "第一次 Ultra Live 的身体很沉，可那一步确确实实的迈出去了。"
      },
      {
        id: "memory-darambia",
        memoryId: "thunder-darambia",
        name: "THUNDER DARAMBIA · 雷",
        used: used.has("thunder-darambia"),
        description: "曾经致命的雷电，后来在银河水晶里变成了同伴。"
      },
      {
        id: "memory-grand-king",
        memoryId: "grand-king",
        name: "GRAND KING · 声音",
        used: used.has("grand-king"),
        description: "曾经在这里，唤醒了美玲。"
      },
      {
        id: "memory-ginga",
        memoryId: "ginga",
        name: "ULTRAMAN GINGA · 现在",
        used: used.has("ginga"),
        description: "不止是一枚 Spark Doll而已，是一路走到这里之后，仍然选择向前的你。"
      }
    ];
    return options;
  }

  async useGingaFinaleMemory(option) {
    if (!this.lugielFinaleActive() || !option?.memoryId) return this.enterPlayerMenu(false);
    if (this.lugielFinaleMemories.has(option.memoryId)) {
      this.refs.choiceDescription.textContent = "这段光已经回应过你。";
      this.inputLocked = false;
      return;
    }

    this.state.set("PLAYER_ITEM");
    this.lugielFinaleMemories.add(option.memoryId);
    this.refs.stage.classList.add("finale-memory-flash");
    this.sound?.playHopeSpark?.();

    const memory = {
      "black-king": {
        line: "纵使重压如山，你依旧充满了决心。",
        result: "BLACK KING 的轮廓在背后一闪，下一轮 FUTURE 范围扩大。",
        apply: () => { this.flags.stasisMarkBoost = true; this.flags.barrier = true; this.adjustInterfaceGauge(-7); }
      },
      "thunder-darambia": {
        line: "那道雷曾经把你逼得无处可走，后来，你学会了运用它。",
        result: "黄色水晶亮起，能量回到银河体内。",
        apply: () => { this.gainEnergy(18); this.flags.stasisMarkBoost = true; this.adjustInterfaceGauge(-9); }
      },
      "grand-king": {
        line: "你记得美玲没有被黑暗压倒的声音。",
        result: "胸前的光重新变得稳定，下一枚未来锚点会更早出现。",
        apply: () => { this.player.hp = Math.min(this.player.maxHp, this.player.hp + 16); this.flags.stasisAnchorBoost = true; this.adjustInterfaceGauge(-9); }
      },
      ginga: {
        line: "银河火花就在手中，一路走来的同伴们，也还在这里。",
        result: "所有水晶同时做出了回应，下一次出手会更容易抓住中心。",
        apply: () => { this.flags.nextAttackSlow = true; this.flags.speedBoost = true; this.adjustInterfaceGauge(-11); }
      }
    }[option.memoryId];

    memory?.apply?.();
    this.renderResources();
    await this.say(`* ${memory?.line ?? "一段光被重新想起。"}`, 500);
    if (memory?.result) await this.say(`* ${memory.result}`, 420);
    setTimeout(() => this.refs.stage.classList.remove("finale-memory-flash"), 720);
    return this.enemyResponse();
  }

  originalFormProfile(key = this.originalFormKey) {
    return this.player.originalForms?.forms?.[key] ?? null;
  }

  applyOriginalForm(key, announce = true) {
    if (!this.originalBattle) return false;
    const profile = this.originalFormProfile(key) ?? this.originalFormProfile(this.player.originalForms?.default);
    if (!profile) return false;
    this.originalLastFormKey = this.originalFormKey;
    this.originalFormKey = profile.key ?? key;
    this.player.form = profile.label ?? this.player.form;
    this.player.attack = profile.attack ?? this.player.attack;
    // Nexus' ultimate profile is usable here without the TV-route life-drain gimmick.
    if (this.player.id === "ultraman_nexus" && profile.noLifeDrain) {
      this.player.energy = Math.max(this.player.energy ?? 0, 64);
    }
    if (this.refs?.playerForm) this.refs.playerForm.textContent = this.player.form;
    if (this.refs?.stage) {
      this.refs.stage.dataset.originalForm = this.originalFormKey;
      this.refs.stage.classList.remove("original-form-shift");
      if (announce) {
        void this.refs.stage.offsetWidth;
        this.refs.stage.classList.add("original-form-shift");
        setTimeout(() => this.refs.stage.classList.remove("original-form-shift"), 680);
      }
    }
    this.renderResources?.();
    this.renderCommandAvailability?.();
    return true;
  }

  getOriginalSkills() {
    const profile = this.originalFormProfile();
    return structuredClone(profile?.skills ?? []);
  }

  getOriginalActions() {
    const forms = Object.values(this.player.originalForms?.forms ?? {});
    const actions = forms.map((form) => ({
      id: `original-form-${form.key}`,
      effect: "originalSwitch",
      formKey: form.key,
      name: form.key === this.originalFormKey ? `${form.label} · 当前` : form.label,
      description: form.description ?? "切换该奥特曼的战斗形态。",
      locked: false
    }));

    // Five King is the one original encounter where ACT is also a physical target selector.
    // No EXPOSED puzzle: choosing a limb means the next hit goes into that actual body part.
    if (this.enemy.encounterMode === "original_five_king" && this.originalFiveKingModules) {
      for (const [key, module] of this.aliveOriginalModules()) {
        const selected = key === this.originalTargetPart;
        const hpRatio = Math.max(0, Math.round((module.hp / Math.max(1, module.maxHp)) * 100));
        actions.push({
          id:`orig-five-target-${key}`,
          effect:"originalFiveTarget",
          moduleKey:key,
          name:`${selected ? "▶ " : ""}${module.name}`,
          description:`剩余 ${hpRatio}% · 直接锁定这个部位。破坏后，对应攻击会从战斗中消失。`,
          text:`锁定${module.name}。`
        });
      }
    }
    return actions;
  }

  gainOriginalAdapt(amount, source = "") {
    // Legacy compatibility hook. Original-route forms are powers the story has already
    // made available; combat no longer re-locks them behind a training meter.
    if (!this.originalBattle) return 0;
    this.originalAdapt = 100;
    return this.originalAdapt;
  }

  aliveOriginalModules() {
    if (!this.originalFiveKingModules) return [];
    return Object.entries(this.originalFiveKingModules).filter(([, module]) => (module.hp ?? 0) > 0);
  }

  setOriginalFiveKingTarget(key) {
    if (!this.originalFiveKingModules?.[key] || this.originalFiveKingModules[key].hp <= 0) return false;
    this.originalTargetPart = key;
    this.syncOriginalFiveKingModel();
    this.showSupportCallout?.("TARGET", this.originalFiveKingModules[key].name ?? key, 620);
    this.renderResources();
    return true;
  }

  syncOriginalFiveKingModel() {
    if (this.enemy.encounterMode !== "original_five_king" || !this.originalFiveKingModules) return;
    const stage = this.refs.stage;
    for (const key of ["golza","melba","ganq","reicubas","cov"]) {
      stage.dataset[`five${key[0].toUpperCase()}${key.slice(1)}`] = (this.originalFiveKingModules[key]?.hp ?? 0) > 0 ? "on" : "off";
    }
    stage.dataset.fiveTarget = this.originalTargetPart ?? "";
  }

  originalSpeedBonus() {
    if (!this.originalBattle) return 0;
    if (this.enemy.encounterMode === "original_greeza") return this.phaseIndex >= 2 ? 34 : this.phaseIndex === 1 ? 20 : 8;
    if (this.enemy.encounterMode === "original_belial") return this.phaseIndex >= 2 ? 24 : 12;
    return 0;
  }

  showOriginalGreezaMiss() {
    const sprite = this.refs.enemySprite;
    sprite.classList.remove("greeza-dodge");
    void sprite.offsetWidth;
    sprite.classList.add("greeza-dodge");
    setTimeout(() => sprite.classList.remove("greeza-dodge"), 540);
    this.refs.damagePop.textContent = "MISS";
    this.refs.damagePop.classList.remove("show", "heavy");
    void this.refs.damagePop.offsetWidth;
    this.refs.damagePop.classList.add("show");
  }

  advanceOriginalGreezaToSecond() {
    if (this.enemy.encounterMode !== "original_greeza" || this.phaseIndex !== 0) return;
    this.phaseIndex = 1;
    this.currentPhase = this.enemy.phases?.[1] ?? this.currentPhase;
    this.enemy.id = "original-greeza-second";
    this.enemy.subtitle = "虚空怪兽 · 第二形态";
    this.refs.stage.dataset.bossPhase = "1";
    this.refs.stage.dataset.enemy = this.enemy.id;
    this.refs.enemySprite.dataset.enemy = this.enemy.id;
    this.refs.enemyPhase.textContent = this.currentPhase?.subtitle ?? this.enemy.subtitle;
    this.refs.enemySprite.classList.add("greeza-form-change");
    setTimeout(() => this.refs.enemySprite.classList.remove("greeza-form-change"), 900);
    this.showSupportCallout?.("GREEZA", "SECOND FORM", 900);
    this.renderResources();
  }

  applyOriginalBossDamageRules(baseDamage, impact = "normal") {
    let damage = Math.max(0, Math.round(baseDamage || 0));
    const mode = this.enemy.encounterMode;

    if (mode === "original_greeza") {
      if (this.phaseIndex === 0) {
        this.originalGreezaDodges = (this.originalGreezaDodges ?? 0) + 1;
        this.showOriginalGreezaMiss();
        if (this.originalGreezaDodges >= (this.config.arena.firstFormDodges ?? 3)) this.advanceOriginalGreezaToSecond();
        return 0;
      }
      // Second form can still slip out of a light hit at a predictable cadence. The final
      // form is fully tangible, trading evasiveness for a much larger attack vocabulary.
      if (this.phaseIndex === 1) {
        this.originalGreezaSecondHits = (this.originalGreezaSecondHits ?? 0) + 1;
        if (impact === "normal" && this.originalGreezaSecondHits % 3 === 0) {
          this.showOriginalGreezaMiss();
          return 0;
        }
      }
      return Math.max(1, damage);
    }

    if (mode === "original_grand_king") {
      const multiplier = this.phaseIndex === 0 ? .40 : this.phaseIndex === 1 ? .76 : 1.10;
      return Math.max(1, Math.round(damage * multiplier));
    }

    if (mode === "original_five_king" && this.originalFiveKingModules) {
      const alive = this.aliveOriginalModules();
      if (!alive.length) return Math.max(1, this.enemy.hp);
      if (!this.originalFiveKingModules[this.originalTargetPart] || this.originalFiveKingModules[this.originalTargetPart].hp <= 0) {
        this.originalTargetPart = alive[0][0];
      }
      const key = this.originalTargetPart;
      const module = this.originalFiveKingModules[key];
      const before = module.hp;
      const moduleDamage = Math.min(before, Math.max(1, Math.round(damage * (impact === "heavy" ? 1.08 : 1))));
      module.hp = Math.max(0, before - moduleDamage);
      if (before > 0 && module.hp <= 0) {
        this.refs.stage?.classList.add("original-module-break");
        setTimeout(() => this.refs.stage?.classList.remove("original-module-break"), 760);
        this.showSupportCallout?.("PART BREAK", module.name, 900);
        this.gainOriginalAdapt(8, "module");
        const next = this.aliveOriginalModules()[0];
        this.originalTargetPart = next?.[0] ?? null;
      }
      this.syncOriginalFiveKingModel();
      this.renderResources();
      if (!this.aliveOriginalModules().length) return Math.max(1, this.enemy.hp);
      return moduleDamage;
    }

    return Math.max(1, damage);
  }


  belialPickBark(kind="roundStart") {
    const pool=this.enemy?.belialBarks?.[kind] ?? [];
    if(!pool.length)return null;
    const n=this.belialBarkCounters[kind]??0;
    let line=pool[(n+this.turn)%pool.length];
    if(line===this.belialLastBark&&pool.length>1)line=pool[(n+this.turn+1)%pool.length];
    this.belialBarkCounters[kind]=n+1;this.belialLastBark=line;return line;
  }

  showBelialBark(line, duration=1150, pose="belial-taunt") {
    if(this.enemy.encounterMode!=="original_belial"||!line)return;
    let bark=this.refs.stage?.querySelector?.(".belial-bark");
    if(!bark){bark=document.createElement("div");bark.className="belial-bark";this.refs.stage?.appendChild(bark);}
    const side=(pose.includes("shoot-left")||pose.includes("point"))?"left":"right";
    bark.dataset.side=side;
    bark.textContent=line;bark.classList.remove("show");void bark.offsetWidth;bark.classList.add("show");
    this.refs.enemySprite?.classList.add("belial-speaking");
    this.playOriginalBossPose(pose,duration);
    clearTimeout(this._belialBarkTimer);this._belialBarkTimer=setTimeout(()=>{
      bark?.classList.remove("show");
      this.refs.enemySprite?.classList.remove("belial-speaking");
    },duration);
  }

  resetBelialArenaPresentation({ dialogue=false }={}) {
    if(this.enemy?.encounterMode!=="original_belial")return;
    const stage=this.refs.stage,frame=this.refs.battleFrame,canvas=this.refs.canvas;
    stage?.classList.remove("belial-galaxy-flight","belial-abyss-field","belial-arena-active");
    frame?.style.removeProperty("width");
    frame?.style.removeProperty("min-height");
    frame?.style.removeProperty("height");
    canvas?.style.removeProperty("width");
    canvas?.style.removeProperty("height");
    canvas?.style.removeProperty("min-height");
    if(dialogue)this.setFrameMode("dialogue");
    // Force the browser to recalculate the ordinary frame before a menu/choice layer
    // measures itself. This prevents the 500px galaxy arena from leaking into SKILL/ITEM.
    void frame?.offsetWidth;
  }

  playOriginalBossPose(pose, duration = 620) {
    const sprite = this.refs?.enemySprite;
    if (!sprite || !pose) return;
    for (const cls of [...sprite.classList]) if (cls.startsWith("original-pose-")) sprite.classList.remove(cls);
    const cls = `original-pose-${pose}`;
    sprite.classList.add(cls);
    clearTimeout(this._originalPoseTimer);
    this._originalPoseTimer = setTimeout(() => sprite.classList.remove(cls), duration);
  }

  async originalBossArrival() {
    const mode = this.enemy.encounterMode;
    const sprite = this.refs.enemySprite;
    this.refs.stage.classList.add("original-arrival");
    sprite.classList.add("original-arriving");
    if (mode === "original_greeza") sprite.classList.add("greeza-void-arrival");
    if (mode === "original_belial") sprite.classList.add("belial-battlenizer-arrival");
    if (mode === "original_grand_king") sprite.classList.add("grand-king-arrival");
    if (mode === "original_five_king") this.syncOriginalFiveKingModel();
    await sleep(mode === "original_greeza" ? 1150 : 780);
    sprite.classList.remove("original-arriving", "greeza-void-arrival", "belial-battlenizer-arrival", "grand-king-arrival");
    this.refs.stage.classList.remove("original-arrival");
  }

  async originalPhaseCinematic() {
    const mode = this.enemy.encounterMode;
    const sprite = this.refs.enemySprite;
    this.refs.stage.classList.add("original-phase-shift-live");
    sprite.classList.add("phase-shift");

    if (mode === "original_zetton" && this.phaseIndex === 1) {
      await this.say("* 杰顿的身体被橙色强光包住。", 420);
      this.enemy.name = "海帕杰顿";
      this.enemy.subtitle = "超高速终极杰顿 · Imago";
      this.enemy.id = "original-hyper-zetton";
      this.refs.enemyName.textContent = this.enemy.name;
      this.refs.enemySprite.dataset.enemy = this.enemy.id;
      this.refs.stage.dataset.enemy = this.enemy.id;
      await this.say("* 光散开时，海帕杰顿已经站在原地。", 480);
    } else if (mode === "original_greeza" && this.phaseIndex === 2) {
      this.enemy.id = "original-greeza-final";
      this.enemy.subtitle = "虚空怪兽 · 最终形态";
      this.refs.enemySprite.dataset.enemy = this.enemy.id;
      this.refs.stage.dataset.enemy = this.enemy.id;
      // The final form is now tangible, so it receives a fresh, meaningful combat span.
      this.enemy.hp = Math.max(this.enemy.hp, Math.round(this.enemy.maxHp * .70));
      await this.say("* 格利扎的身体突然停止了错位。", 420);
      await this.say("* 大量尖刺与怪兽器官一样的结构从实体表面展开。", 520);
    } else if (mode === "original_grand_king") {
      if (this.phaseIndex === 1) await this.say("* 烧红的装甲裂开，碎片从古兰特王身上掉了下来。", 460);
      if (this.phaseIndex === 2) await this.say("* 胸前的甲壳彻底崩开，所有炮口同时转向前方。", 480);
    } else if (mode === "original_five_king") {
      await this.say("* 残存的怪兽器官同时亮起，五帝王强行维持着合体。", 440);
    } else if (mode === "original_belial") {
      this.belialTransitionPending = this.phaseIndex;
      // The transition itself is the next playable enemy window, not a cutaway.
      if (this.phaseIndex === 1) this.showBelialBark("跟上来，冒牌货！", 900, "belial-scythe-charge");
      if (this.phaseIndex === 2) this.showBelialBark("别以为活着追到这里就算赢了！", 900, "belial-rage");
    }

    this.refs.enemyPhase.textContent = this.currentPhase?.subtitle ?? this.enemy.subtitle ?? "";
    this.renderResources();
    await sleep(280);
    sprite.classList.remove("phase-shift");
    this.refs.stage.classList.remove("original-phase-shift-live");
  }

  applyNexusForm(form, announce = true) {
    const profiles = {
      anphans: { label:"幼年形态", className:"anphans" },
      junis: { label:"青年红", className:"junis" },
      "junis-blue": { label:"青年蓝", className:"junis-blue" },
      noa: { label:"诺亚奥特曼", className:"noa" }
    };
    const profile = profiles[form] ?? profiles.anphans;
    this.nexusForm = form;
    this.player.form = profile.label;
    if (this.refs?.playerForm) this.refs.playerForm.textContent = profile.label;
    if (this.refs?.stage) this.refs.stage.dataset.nexusForm = form;
    if (announce && this.refs?.stage) {
      this.refs.stage.classList.remove("nexus-form-flash");
      void this.refs.stage.offsetWidth;
      this.refs.stage.classList.add("nexus-form-flash");
      setTimeout(() => this.refs.stage.classList.remove("nexus-form-flash"), 900);
    }
    this.renderCommandAvailability?.();
  }

  getNexusFormSkills() {
    if (this.enemy.encounterMode === "nexus_mephisto_one_himeya") {
      if (this.himeyaOneHpLocked && !this.himeyaNightRaiderRestored) return [
        { id:"himeya-light-feather", name:"粒子之羽", damage:31, cost:0, attackClass:"energy", description:"只剩一滴光时仍能释放的短促光刃。不会消耗生命。", text:"胸前只剩一点光。腕部仍甩出一道短促的弧线。" },
        { id:"himeya-guard-ray", name:"核心光盾", kind:"nexusBarrier", cost:0, description:"用仅剩的光撑住下一轮。1 HP 阶段不会额外消耗生命。", text:"姬矢把最后一点光压在胸前，圆形光幕勉强展开。" }
      ];
      if (this.himeyaNightRaiderRestored || this.nexusForm === "junis") return [
        { id:"himeya-particle-feather", name:"粒子之羽", damage:41, hpCost:4, attackClass:"energy", description:"完全复苏后的高速光刃。", text:"恢复光芒的腕部甩出红白弧光。" },
        { id:"himeya-over-ray", name:"层叠光线·风暴", damage:80, hpCost:12, attackClass:"energy", description:"姬矢最后决战的主力光线。", text:"青年形态双臂展开，光能一层层叠到胸前。" },
        { id:"himeya-schtrom-sword", name:"施特罗姆剑", damage:58, hpCost:7, attackClass:"physical", description:"切进梅菲斯特的近身黑暗。", text:"腕部光刃延伸。姬矢没有退开。" }
      ];
      return [
        { id:"himeya-feather-exhausted", name:"粒子之羽", damage:27, cost:0, attackClass:"energy", description:"病痛与旧伤让光无比虚弱，但仍能出手。", text:"失去血色的手腕抬起，一道很薄的光刃飞出。" },
        { id:"himeya-shield-exhausted", name:"圆形护盾", kind:"nexusBarrier", cost:0, description:"拖着伤体争取时间。", text:"摇晃的身体前勉强撑开圆形光幕。" }
      ];
    }
    if (this.enemy.encounterMode === "nexus_mephisto_zwei") {
      return [
        { id:"blue-particle-feather", name:"粒子之羽", damage:38, hpCost:4, attackClass:"energy", nexusDrainReduce:3, description:"快速切断。消耗很低，也能稍微打断吸收。", text:"蓝白色弧光从腕部甩出。" },
        { id:"arrow-ray-schtrom", name:"弓箭光线·风暴", damage:66, hpCost:10, attackClass:"energy", nexusDrainReduce:8, description:"青年蓝的高速光线。DARK DRAIN 越低越容易打满。", text:"弓形光在腕部拉开，一线蓝光贯穿黑暗领域。" },
        { id:"schtrom-sword-blue", name:"施特罗姆剑", damage:52, hpCost:8, attackClass:"physical", nexusDrainReduce:5, description:"贴近以后直接切开吸能纹路。", text:"腕部光刃延伸。奈克瑟斯沿着赤眼的侧面切了进去。" }
      ];
    }
    const form = this.nexusForm;
    if (form === "junis") return [
      { id:"junis-feather", name:"粒子之羽", damage:40, hpCost:5, attackClass:"energy", nexusBondGain:3, description:"快速打断扎基起手。", text:"红色的身体没有停步，光刃先一步飞出。" },
      { id:"over-ray-schtrom", name:"层叠光线·风暴", damage:78, hpCost:14, attackClass:"energy", nexusBondGain:6, description:"青年红的重型终结光线。", text:"双臂展开，红色光能在胸前一层层叠起。" },
      { id:"junis-core-guard", name:"核心屏障", kind:"nexusBarrier", hpCost:7, description:"用生命换一次可靠防御。", text:"红色核心前展开一面圆形光盾。" }
    ];
    if (form === "junis-blue") return [
      { id:"blue-feather-zagi", name:"粒子之羽", damage:42, hpCost:4, attackClass:"energy", nexusBondGain:3, description:"高速出手，适合继续追击。", text:"蓝色弧光没有停在原地。" },
      { id:"arrow-ray-zagi", name:"弓箭光线·风暴", damage:70, hpCost:9, attackClass:"energy", nexusBondGain:6, description:"青年蓝的主力光线。", text:"弓形光束沿着扎基瞬移后的残影追了过去。" },
      { id:"schtrom-sword-zagi", name:"施特罗姆剑", damage:58, hpCost:8, attackClass:"physical", nexusBondGain:5, description:"高速贴身斩击。", text:"光刃在蓝色残影里腾转挪移。" }
    ];
    if (form === "noa") return [
      { id:"noa-gravity", name:"诺亚·重击", damage:72, cost:0, attackClass:"physical", nexusBondGain:3, description:"不再消耗适能者生命，直接将扎基从地面击飞。", text:"银色巨人一步踏进红光里，拳锋把空间都压出了白痕。" },
      { id:"noa-tempest", name:"诺亚·暴风", damage:90, cost:0, attackClass:"energy", nexusBondGain:4, description:"银色风暴横扫战场。", text:"双翼间的银光扩散成一整片风暴。" },
      { id:"noa-lightning", name:"诺亚·闪电", damage:122, cost:0, attackClass:"energy", nexusBondGain:6, description:"最终形态的高威力光线。", text:"银色闪电贯穿了扎基身后的黑暗，贯穿了所有的过往。" }
    ];
    return [
      { id:"anphans-feather", name:"粒子之羽", damage:34, hpCost:5, attackClass:"energy", nexusBondGain:2, description:"幼年形态的快速光刃。", text:"银色腕部甩出一线光。" },
      { id:"anphans-cross-ray", name:"十字光线·风暴", damage:68, hpCost:14, attackClass:"energy", nexusBondGain:4, description:"高负担的正面光线。", text:"银色双臂交成十字。" },
      { id:"anphans-shield", name:"圆形护盾", kind:"nexusBarrier", hpCost:7, description:"先活过扎基的下一轮。", text:"圆形光盾挡在身体前面。" }
    ];
  }

  getNexusFormActions() {
    if (this.enemy.encounterMode === "nexus_mephisto_one_himeya") {
      if (this.himeyaOneHpLocked && !this.himeyaNightRaiderRestored) return [
        { id:"himeya-endure", effect:"himeyaEndure", name:"撑住", description:"下一轮预警更长，并获得一次减伤。生命仍锁在 1。", text:"姬矢把脚重新踩稳。", resultText:"明明身体早已破碎不堪，可他还在战斗。" },
        { id:"himeya-important", effect:"himeyaImportant", name:"为了重要的人", description:"让下一次攻击判定更稳。", text:"他没有再把这场战斗当成赎罪，而是使命。", resultText:"这一次，是为了把重要的人带回去。" }
      ];
      if (this.himeyaNightRaiderRestored) return [
        { id:"himeya-forward", effect:"himeyaForward", name:"向前", description:"下一轮移动更快，并让下一次攻击更容易抓住中心。", text:"红色身体重新向前。", resultText:"夜袭队送来的光还留在核心里。" },
        { id:"himeya-fate", effect:"himeyaFate", name:"完成宿命", description:"下一轮预警更清晰，并获得一次伤害缓冲。", text:"宿命不再是等着他的死法。", resultText:"它成了姬矢自己选择要完成的事。" }
      ];
      return [
        { id:"himeya-breathe", effect:"himeyaEndure", name:"压住呼吸", description:"下一轮预警更长，并降低一次伤害。", text:"胸口的疼痛没有消失，姬矢强迫着自己不去感受。", resultText:"至少还能再站一轮。" },
        { id:"himeya-look", effect:"himeyaImportant", name:"看着梅菲斯特", description:"下一次攻击更容易抓中。", text:"他没有去看自己还剩多少生命。", resultText:"黑暗开始从疼痛里分离出来。" }
      ];
    }
    if (this.enemy.encounterMode === "nexus_mephisto_zwei") return [
      { id:"blue-sight", effect:"nexusBlueSight", name:"盯住赤眼", description:"下一轮预警更长，敌方回合射击判定更宽，同时压低 DARK DRAIN。", text:"你没有追逐残影，只等梅菲斯特二代真正停下。", resultText:"它慢了半拍。" },
      { id:"blue-pursuit", effect:"nexusBluePursuit", name:"追进黑暗", description:"下一轮出现更多可射击目标，同时攻势更凶；移动和射击辅助提高。", text:"青年蓝主动追进了 Dark Field G 更深处。", resultText:"梅菲斯特二代不得不把更多吸能体放出来。" },
      { id:"blue-steady", effect:"nexusBlueSteady", name:"压住呼吸", description:"下一轮减伤，并直接降低一部分 DARK DRAIN。", text:"怜没有去数还剩多少时间。", resultText:"核心的闪烁暂时稳定。" }
    ];
    if (this.nexusForm === "junis") return [
      { id:"bond-himeya", effect:"nexusBondHold", name:"不把伤丢下", bondGain:9, description:"青年红：迎击辅助和减伤，同时加深 NEXUS。", text:"孤门想起姬矢准不是因为他从不受伤，而是因为他受伤以后仍然一次次地站起来。", resultText:"下一次正面冲撞，可以迎上去。" },
      { id:"bond-field", effect:"nexusBondRead", name:"看完整个战场", bondGain:7, description:"下一轮预警更清晰，下一次攻击更容易抓到中心。", text:"摄影机留下的是一瞬间。战斗必须看见下一瞬间。", resultText:"扎基的起手终于不再像一道黑影。" }
    ];
    if (this.nexusForm === "junis-blue") return [
      { id:"bond-ren", effect:"nexusBondRun", name:"继续跑", bondGain:9, description:"青年蓝：高速移动、射击辅助，并让下一轮出现更多可击碎节点。", text:"他想起千树怜总在笑着往前跑，像是时间根本追不上他。", resultText:"蓝色残影先一步穿过了攻击线。" },
      { id:"bond-next", effect:"nexusBondRead", name:"预知", bondGain:7, description:"预警和下一次攻击判定提升。", text:"如果这一秒会结束，那就去下一秒。", resultText:"黑暗节点的排列开始有了顺序。" }
    ];
    if (this.nexusForm === "noa") return [
      { id:"bond-all", effect:"nexusNoaConnect", name:"纽带", bondGain:12, description:"恢复生命并获得一次光之保护。NEXUS 已不再只属于一个适能者。", text:"孤门感受着所有人的光。", resultText:"所有被传递过的光，都在同一具身体里回应。" },
      { id:"bond-trust", effect:"nexusBondRead", name:"被相信着", bondGain:9, description:"下一轮预警更长，下一击更稳定。", text:"城市里的人抬头看着银色巨人，这一次没有人替他们抹去记忆中的这一幕。", resultText:"扎基面前第一次出现了一个不再需要隐藏的光。" }
    ];
    return [
      { id:"bond-komon", effect:"nexusBondHold", name:"先站住", bondGain:6, description:"幼年形态：减伤并累积 NEXUS。", text:"孤门没有姬矢的经验，也没有怜的速度，但他也一样的不会退缩。", resultText:"光没有要求他成为别人。" },
      { id:"bond-listen", effect:"nexusBondRead", name:"听传承", bondGain:6, description:"下一轮预警更清晰，并让下一次攻击更稳定。", text:"进化信赖者里有太多人的战斗痕迹。", resultText:"那些痕迹不是命令，是一代代人为之努力的证明。" }
    ];
  }

  applyNexusEncounterDamage(baseDamage) {
    let damage = Math.max(0, Math.round(baseDamage));
    if (damage <= 0) return 0;
    if (this.enemy.encounterMode === "nexus_mephisto_one_himeya") {
      const mult = this.himeyaNightRaiderRestored ? 1.16 : this.himeyaOneHpLocked ? .92 : .72;
      return Math.max(1, Math.round(damage * mult));
    }
    if (this.enemy.encounterMode === "nexus_mephisto_zwei") {
      const drain = clamp((this.enemy.interfaceGauge?.value ?? 0) / 100, 0, 1);
      const mult = (1.08 - drain * .42) + (this.mizorogiAssist ? .18 : 0);
      return Math.max(1, Math.round(damage * mult));
    }
    if (this.enemy.encounterMode === "nexus_dark_zagi_bond") {
      const formMult = { anphans:.82, junis:1, "junis-blue":1.08, noa:1.34 }[this.nexusForm] ?? 1;
      const bond = clamp((this.enemy.interfaceGauge?.value ?? 0) / 100, 0, 1);
      return Math.max(1, Math.round(damage * formMult * (.9 + bond * .25)));
    }
    return damage;
  }

  setNexusLegacyScene(scene = "") {
    const vision = this.refs.nexusLegacyVision;
    if (!vision) return;
    vision.hidden = !scene;
    vision.dataset.scene = scene;
    vision.dataset.owner = scene ? (this.enemy.encounterMode ?? "") : "";
    if (scene) {
      void vision.offsetWidth;
      vision.classList.add("active");
    } else {
      vision.classList.remove("active");
    }
  }

  pulseNexusLegacyScene(scene = "", hold = 900) {
    this.setNexusLegacyScene("");
    const vision = this.refs.nexusLegacyVision;
    if (vision) void vision.offsetWidth;
    this.setNexusLegacyScene(scene);
    return sleep(hold);
  }

  scriptedNexusHp(value, hitClass = "nexus-script-hit") {
    this.player.hp = clamp(Math.round(value), 0, this.player.maxHp);
    this.renderResources();
    this.refs.stage.classList.remove("nexus-script-hit", "nexus-script-heavy-hit");
    void this.refs.stage.offsetWidth;
    this.refs.stage.classList.add(hitClass);
    setTimeout(() => this.refs.stage.classList.remove("nexus-script-hit", "nexus-script-heavy-hit"), 420);
  }

  async nexusMephistoIntroCinematic() {
    this.inputLocked = true;
    await this.sound?.playMusic?.("nexus_memory_prebattle", { volume: .18, fadeInMs: 3000, fadeOutMs: 0 });
    this.setCommandsEnabled(false);
    this.bullets.stop();
    this.refs.stage.classList.add("nexus-blue-entry", "nexus-sunset-entry");

    this.setNexusLegacyScene("ren-sunset");
    await this.storySilence(1500, "nexus-sunset");
    await this.storyBeat("", "人群沿着夕阳下的街道向外撤离，只有千树怜站在相反的方向。", 3100, "nexus-sunset");
    await this.storySilence(900, "nexus-sunset");

    this.setNexusLegacyScene("ren-nagi");
    await sleep(850);
    await this.storyBeat("西条凪", "你一直以来，都抱着死掉也没关系的想法在战斗，所以毫不顾忌自己受到的创伤。", 3850, "nexus-nagi");
    await this.storySilence(450, "nexus-nagi");
    await this.storyBeat("西条凪", "抱着必死的决心战斗，和想着死掉也无所谓地战斗，是完全不同的两回事！", 4000, "nexus-nagi");
    await this.storySilence(520, "nexus-nagi");
    await this.storyBeat("西条凪", "为了活下去而战斗吧！即使没有明天。", 3200, "nexus-nagi");

    this.setNexusLegacyScene("ren-memories");
    await this.storySilence(1200, "nexus-blue");
    await this.storyBeat("", "孤门，那些一起笑过的人们。最后，是瑞生。", 2600, "nexus-blue");
    await this.storyBeat("", "有人还在等他回去。", 2350, "nexus-blue");
    await this.storySilence(1050, "nexus-blue");
    await this.storyBeat("千树怜", "为了……活下去。", 2900, "nexus-blue");

    this.setNexusLegacyScene("ren-transform");
    await sleep(1000);
    await this.storyBeat("", "怜拔出进化信赖者，青白色的光把夕阳切开。", 3100, "nexus-blue");
    await this.storySilence(500, "nexus-blue");
    this.sound?.play("phase");
    await this.storyBeat("千树怜", "啊啊啊啊啊啊啊——！", 2700, "nexus-blue");
    await sleep(900);
    this.applyNexusForm("junis-blue", true);
    this.refs.stage.classList.add("nexus-blue-transform-flash");
    await sleep(950);
    this.hideStoryCinematic();
    this.setNexusLegacyScene("");
    this.refs.stage.classList.remove("nexus-blue-entry", "nexus-sunset-entry", "nexus-blue-transform-flash");
    this.inputLocked = false;
  }

  async nexusMizorogiAssistCinematic() {
    if (this.mizorogiAssist) return;
    this.mizorogiAssist = true;
    this.inputLocked = true;
    this.bullets.stop();
    this.refs.stage.dataset.mizorogiAssist = "mephisto";

    // Zwei first proves that Ren really has reached a dead end.
    this.refs.stage.classList.add("mephisto-zwei-overrun");
    this.setNexusLegacyScene("mephisto-overrun");
    await this.storyBeat("", "梅菲斯特二代突然不再继续追逐残影，反而提前一步切进了怜下一次的落点。", 2350, "nexus-dark");
    this.sound?.playNexusCrushHit?.(0);
    this.refs.stage.classList.add("mephisto-zwei-hit-a");
    this.scriptedNexusHp(Math.min(this.player.hp, Math.max(1, Math.round(this.player.maxHp * .38))));
    await sleep(720);
    this.refs.stage.classList.remove("mephisto-zwei-hit-a");
    await this.storyBeat("", "第一击把所有蓝色残影都一起砸碎。", 1550, "nexus-dark");

    this.sound?.playNexusCrushHit?.(1);
    this.refs.stage.classList.add("mephisto-zwei-hit-b", "mephisto-zwei-siphon");
    this.scriptedNexusHp(Math.min(this.player.hp, Math.max(1, Math.round(this.player.maxHp * .14))), "nexus-script-heavy-hit");
    this.adjustInterfaceGauge(24);
    await sleep(850);
    await this.storyBeat("", "那双赤眼压到了胸前，奈克瑟斯的光被强行抽走。", 1950, "nexus-dark");

    this.sound?.playNexusCrushHit?.(2);
    this.scriptedNexusHp(1, "nexus-script-heavy-hit");
    this.refs.stage.classList.remove("mephisto-zwei-hit-b");
    this.refs.stage.classList.add("mephisto-zwei-final-claw");
    await this.storyBeat("", "怜已经只剩下了一口气，而梅菲斯特二代的爪已经贴向颜色计时器。", 2250, "nexus-dark");
    await this.storySilence(1050, "nexus-dark");

    // TV-based turn: light gathers to Mizorogi, he transforms into the original Dark Mephisto,
    // then physically blocks Zwei. The hand light belongs to the giant form, not human Mizorogi.
    this.setNexusLegacyScene("mizorogi-light-gather");
    await this.storySilence(800, "nexus-mizorogi");
    await this.storyBeat("", "但地面上，原本已经失去黑暗力量的沟吕木身边，反而开始聚起白色的光。", 2850, "nexus-mizorogi");
    this.sound?.playNexusIntercept?.();
    this.setNexusLegacyScene("mizorogi-transform");
    await sleep(1050);
    await this.storyBeat("", "光向上拔起，沟吕木再次变成了梅菲斯特，可那双眼睛，是白色的，是光的颜色", 3100, "nexus-mizorogi");

    this.setNexusLegacyScene("mizorogi-mephisto-block");
    await sleep(650);
    await this.storyBeat("", "梅菲斯特一步挡到奈克瑟斯前面，双手之间压出一团白紫色的光，正面轰开二代的手。", 2950, "nexus-mizorogi");
    await this.storyBeat("沟吕木真也", "趁现在！不用管我，攻击吧！", 2350, "nexus-mizorogi");
    await this.storyBeat("沟吕木真也", "这是得到光的你——使命的所在！", 2600, "nexus-mizorogi");

    this.setNexusLegacyScene("mizorogi-mephisto-clash");
    await this.storyBeat("", "两个梅菲斯特撞在一起。一个用不断锤击着，另一个把那具身体硬生生拖离奈克瑟斯。", 2850, "nexus-mizorogi");
    this.adjustInterfaceGauge(-42);
    this.player.hp = Math.min(this.player.maxHp, Math.max(this.player.hp, 9));
    this.flags.barrier = true;
    this.renderResources();

    this.setNexusLegacyScene("");
    this.hideStoryCinematic();
    this.refs.stage.classList.remove("mephisto-zwei-overrun", "mephisto-zwei-siphon", "mephisto-zwei-final-claw");
    this.refs.enemyPhase.textContent = this.currentPhase?.subtitle ?? "沟吕木真也 · 最后的助战";
    this.refs.stage.dataset.bossPhase = String(this.phaseIndex);
    this.inputLocked = false;
  }

  async nexusDarkZagiIntroCinematic() {
    this.inputLocked = true;
    this.refs.stage.classList.add("zagi-awakening");
    await this.storyBeat("", "石堀光彦抬起头，那张脸像戴得太久的假面脱落。", 1550, "nexus-dark");
    await this.storyBeat("", "忘却之海被黑暗撑开，被仇恨所蒙蔽，西条凪的光被拖进了最深处。", 1750, "nexus-dark");
    await this.storyBeat("", "漆黑的巨人从那里站了起来。", 1450, "nexus-zagi");
    await this.storyBeat("", "黑暗扎基。", 1700, "nexus-zagi");
    await this.storyBeat("", "孤门冲进黑暗，把凪拉了回来，进化信赖者落进了他的掌心。", 1900, "nexus-silver");
    await this.storyBeat("", "这一次，没有其他适能者站在他的身前。", 1550, "nexus-silver");
    this.applyNexusForm("anphans", true);
    this.nexusBondLinks.add("nagi");
    this.adjustInterfaceGauge(4);
    await this.storyBeat("", "可没有一丝犹豫，银色的幼年形态落在了城市中央，轮到孤门了。", 1700, "nexus-silver");
    this.hideStoryCinematic();
    this.refs.stage.classList.remove("zagi-awakening");
    this.inputLocked = false;
  }

  async nexusZagiFormCinematic(form) {
    this.inputLocked = true;
    this.bullets.stop();

    if (form === "junis") {
      this.refs.stage.classList.add("nexus-memory-himeya");
      await this.storyBeat("", "扎基的射击把奈克瑟斯掀翻。银色身体竭力撑起了一次，又跪了下去。", 1900, "nexus-dark");
      await this.storySilence(1100, "nexus-dark");

      // Let Himeya arrive as an image first. The player should see him before reading him.
      await this.sound?.playMusic?.("nexus_bond_memories", { volume: .21, fadeInMs: 2700, fadeOutMs: 1900 });
      this.sound?.playNexusMemoryReveal?.("red");
      await this.pulseNexusLegacyScene("himeya-enter", 1450);
      await this.storyBeat("", "废墟后的暗红逆光里，一个人的身影慢慢变得清晰。他的相机垂在胸前，风把外套的下摆向后掀起。", 2600, "nexus-red");
      await this.storySilence(1050, "nexus-red");
      await this.storyBeat("姬矢准", "站起来，孤门！你无数次在绝望的边缘重新站起来，所以我才能继续战斗。", 4100, "nexus-red");
      await this.storySilence(950, "nexus-red");

      this.setNexusLegacyScene("himeya-thread");
      this.sound?.playNexusBondThread?.("red");
      await sleep(1750);
      this.nexusBondLinks.add("himeya");
      this.adjustInterfaceGauge(20);
      await this.sound?.playMusic?.("nexus_himeya_red", { volume: .135, fadeInMs: 3100, fadeOutMs: 2400 });
      this.applyNexusForm("junis", true);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 28);
      this.renderResources();
      this.setNexusLegacyScene("junis-burst");
      this.sound?.playNexusRibbonSurge?.("red");
      await this.storyBeat("", "姬矢身后的红光被拉成一缕又一缕丝带。它们越过废墟，在孤门身前交叠，再一圈圈缠上手臂、胸口和肩膀。", 2750, "nexus-red");
      await this.storyBeat("", "那并非覆盖，它像一段已经走过的路，被接到了孤门脚下。", 2250, "nexus-red");
      await this.storySilence(700, "nexus-red");
      await this.storyBeat("", "青年形态。", 1850, "nexus-red");
      this.setNexusLegacyScene("");
      this.refs.stage.classList.remove("nexus-memory-himeya");

    } else if (form === "junis-blue") {
      this.refs.stage.classList.add("nexus-memory-ren");
      await this.storyBeat("", "扎基把奈克瑟斯压进废墟。连续的黑暗闪电让孤门难以应对。", 2050, "nexus-dark");
      await this.storySilence(800, "nexus-dark");

      // Ren does not fade in like Himeya. His memory should run into the frame.
      await this.sound?.playMusic?.("nexus_bond_memories", { volume: .21, fadeInMs: 2600, fadeOutMs: 2000 });
      this.sound?.playNexusMemoryReveal?.("blue");
      await this.pulseNexusLegacyScene("ren-enter", 1350);
      await this.storyBeat("", "远处亮起了像游乐园一样的蓝色灯影。下一秒，一道永不疲惫的身影从那些灯之间跑了出来。", 2600, "nexus-blue");
      await this.storySilence(900, "nexus-blue");
      await this.storyBeat("千树怜", "不要输啊，孤门！多亏了孤门，我才能作为奥特曼战斗到最后！", 4100, "nexus-blue");
      await this.storySilence(900, "nexus-blue");

      this.setNexusLegacyScene("ren-thread");
      this.sound?.playNexusBondThread?.("blue");
      await sleep(1650);
      this.nexusBondLinks.add("ren");
      this.adjustInterfaceGauge(22);
      await this.sound?.playMusic?.("nexus_ren_blue", { volume: .112, fadeInMs: 3100, fadeOutMs: 2400 });
      this.applyNexusForm("junis-blue", true);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 32);
      this.renderResources();
      this.setNexusLegacyScene("blue-burst");
      this.sound?.playNexusRibbonSurge?.("blue");
      await this.storyBeat("", "蓝色的光丝追上姬矢留下的红线，它们没有把红色冲散，而是互相穿过、绕开，再朝同一个方向伸出去。", 2850, "nexus-blue");
      await this.storyBeat("", "孤门看见两道身影都在前面，却没有一个人替他迈出下一步，因为双方都知道，孤门能够走出自己的路。", 2250, "nexus-blue");
      await this.storySilence(650, "nexus-blue");
      await this.storyBeat("", "青年蓝形态。", 1850, "nexus-blue");
      this.setNexusLegacyScene("");
      this.refs.stage.classList.remove("nexus-memory-ren");

    } else if (form === "noa") {
      this.refs.stage.classList.add("nexus-noa-awakening");
      this.setNexusLegacyScene("blue-fall");
      await this.storyBeat("", "弓形光线被扎基一只手抹去。下一道红光正面命中奈克瑟斯。", 1700, "nexus-zagi");
      this.sound?.playNexusCrushHit?.(2);
      this.scriptedNexusHp(Math.max(1, Math.min(this.player.hp, Math.round(this.player.maxHp * .12))), "nexus-script-heavy-hit");
      await this.storyBeat("", "蓝色的身体从天空坠下，城市第一次看清：那个巨人也会倒下。", 1750, "nexus-dark");
      await this.storySilence(900, "nexus-dark");

      // Riko is not a generic support buff. She is the most private strand in Komon's bond.
      await this.sound?.playMusic?.("nexus_bond_memories", { volume: .21, fadeInMs: 2800, fadeOutMs: 2200 });
      this.sound?.playNexusMemoryReveal?.("white");
      await this.pulseNexusLegacyScene("riko-enter", 1100);
      await this.storyBeat("", "倒下的瞬间，纷乱的城市声忽然退远。白色的光里，孤门看见一张最不可能忘记的脸。", 2400, "nexus-silver");
      await this.storyBeat("斋田莉子", "我一直相信你。不是因为你从不会害怕，而是因为你每次都会为了别人再走回来。", 3000, "nexus-silver");
      await this.storySilence(800, "nexus-silver");
      await this.storyBeat("斋田莉子", "我相信着，如果是孤门的话，一定会保护我的。", 3800, "nexus-silver");
      await this.storySilence(900, "nexus-silver");
      this.setNexusLegacyScene("riko-thread");
      this.sound?.playNexusBondThread?.("white");
      this.nexusBondLinks.add("riko");
      await sleep(1050);

      // Nagi and the Night Raiders now trust the Ultra they once feared.
      await this.pulseNexusLegacyScene("nagi-raiders", 950);
      await this.storyBeat("西条凪", "我知道。奥特曼不会输。", 2350, "nexus-bond");
      await this.storyBeat("", "夜袭队没有再把枪口对准光。所有人都抬头看向同一个方向。", 1750, "nexus-bond");
      this.nexusBondLinks.add("night-raider");
      this.sound?.playNexusBondThread?.("silver");
      await sleep(900);

      // The public memory returns: not a list of allies, but hundreds of remembered threads.
      await this.pulseNexusLegacyScene("people-remember", 950);
      await this.storyBeat("", "街道上，一个孩子先认出了那个名字。", 2100, "nexus-bond");
      await this.storyBeat("孩子", "奥特曼……加油！", 1500, "nexus-bond");
      await this.storyBeat("", "像被忘却之海压住太久的记忆终于浮上水面。越来越多人想起：曾经有人站在新宿替他们挡住了黑暗。", 2350, "nexus-bond");
      this.nexusBondLinks.add("people");
      if (this.enemy.interfaceGauge) this.enemy.interfaceGauge.value = 100;

      // All strands weave rather than pile up as buffs: red, blue, Riko, Night Raiders, public trust.
      this.setNexusLegacyScene("bond-weave");
      this.sound?.playNexusBondWeave?.();
      await this.storySilence(1750, "nexus-bond");
      await this.storyBeat("", "红、蓝、白、银，一缕缕光没有涌进同一个人。它们彼此缠绕，像把曾经分开的生命重新接成了一条路。", 2450, "nexus-bond");
      await this.storyBeat("", "这就是 NEXUS。不是终点，是延续，是纽带。", 1900, "nexus-bond");

      // Zagi tries to crush the completed bond; the woven light visibly rejects the beam.
      this.setNexusLegacyScene("gravity-zagi");
      await this.storyBeat("", "扎基把重力波压向城市，云层刹那间就被撕破，红黑色的光像一堵墙从高空压下来。", 2450, "nexus-zagi");
      this.sound?.playNexusGravityZagi?.();
      await sleep(760);
      this.setNexusLegacyScene("bond-shield");
      await this.storyBeat("", "不同颜色的光丝同时绷紧，在孤门的身前一层层编织成银白的轨迹，把扎基的重力波一点一点地顶了回去。", 2850, "nexus-bond");

      this.refs.stage.classList.add("nexus-noa-wings-open");
      this.setNexusLegacyScene("noa-awaken");
      this.sound?.playNexusNoaAwaken?.();
      await this.sound?.playMusic?.("nexus_noa_final", { volume: .155, fadeInMs: 3800, fadeOutMs: 2700 });
      await sleep(1850);
      this.applyNexusForm("noa", true);
      this.player.hp = this.player.maxHp;
      this.nexusMetaField = false;
      this.renderResources();
      await this.storyBeat("", "所有光丝先向中央收束，像把一条走过许多人生命的路重新折进同一个点。银色的身体从那里重新站直。", 2850, "nexus-noa");
      await this.storyBeat("", "背后的两道细光逐渐展开成翼，城市的灯、云层和扎基的红光，乃至人们的内心，都被那对银翼映亮。", 2750, "nexus-noa");
      await this.storySilence(900, "nexus-noa");
      await this.storyBeat("", "诺亚奥特曼。", 2650, "nexus-noa");
      this.setNexusLegacyScene("");
      this.refs.stage.classList.remove("nexus-noa-awakening", "nexus-noa-wings-open");
    }

    this.hideStoryCinematic();
    this.refs.enemyPhase.textContent = this.currentPhase?.subtitle ?? this.enemy.subtitle ?? "";
    this.refs.stage.dataset.bossPhase = String(this.phaseIndex);
    this.renderResources();
    this.inputLocked = false;
  }

  lifeCycleEnabled() {
    if (this.originalBattle && this.originalFormProfile()?.noLifeDrain) return false;
    return !!this.player.lifeCycle;
  }

  currentLifeDrainAmount() {
    if (!this.lifeCycleEnabled()) return 0;
    if (this.enemy.encounterMode === "nexus_mephisto_one_himeya") return 0;
    let amount = this.player.lifeCycle.drainPerTurn ?? 0;
    if (this.enemy.encounterMode === "nexus_dark_zagi_bond" && this.nexusForm === "noa") return 0;
    if (this.nexusMetaField) amount *= this.player.lifeCycle.metaDrainMultiplier ?? 1;
    if (this.flags.nexusDrainGuard) amount *= .5;
    return Math.max(0, Math.round(amount));
  }

  applyTurnLifeDrain() {
    const amount = this.currentLifeDrainAmount();
    if (!this.lifeCycleEnabled() || amount <= 0 || this.player.hp <= 0) return 0;

    const before = this.player.hp;
    this.player.hp = Math.max(0, this.player.hp - amount);
    const actual = Math.max(0, Math.round(before - this.player.hp));
    this.renderResources();

    if (this.refs.playerDrainStatus && actual > 0) {
      this.refs.playerDrainStatus.textContent = `ROUND -${actual} HP · HIT → RECOVER`;
    }
    return actual;
  }

  spendPlayerLife(amount) {
    if (!amount || amount <= 0) return true;
    if (this.player.hp <= amount) return false;
    this.player.hp = Math.max(1, this.player.hp - amount);
    this.renderResources();
    return true;
  }

  recoverLifeFromDamage(actualDamage) {
    if (this.enemy.encounterMode === "nexus_mephisto_one_himeya" && this.himeyaOneHpLocked && !this.himeyaNightRaiderRestored) return 0;
    if (!this.lifeCycleEnabled() || actualDamage <= 0 || this.player.hp <= 0) return 0;
    let ratio = this.player.lifeCycle.damageLeech ?? 0;
    if (this.nexusMetaField) ratio += this.player.lifeCycle.metaLeechBonus ?? 0;
    const recovered = Math.max(1, Math.round(actualDamage * ratio));
    const before = this.player.hp;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + recovered);
    const actual = Math.max(0, Math.round(this.player.hp - before));
    if (actual > 0 && this.refs.lifeRecoverPop) {
      this.refs.lifeRecoverPop.textContent = `+${actual}`;
      this.refs.lifeRecoverPop.classList.remove("show");
      void this.refs.lifeRecoverPop.offsetWidth;
      this.refs.lifeRecoverPop.classList.add("show");
    }
    this.renderResources();
    return actual;
  }

  adjustPredation(amount) {
    if (!this.enemy.predation) return 0;
    const predation = this.enemy.predation;
    const threshold = predation.threshold ?? 100;
    predation.value = clamp((predation.value ?? 0) + amount, 0, threshold);
    this.renderResources();
    return predation.value;
  }

  updateNexusFieldVisual() {
    this.refs.stage.dataset.metaField = this.nexusMetaField ? "true" : "false";
    if (this.refs.playerDrainStatus && this.lifeCycleEnabled()) {
      this.refs.playerDrainStatus.textContent = `ROUND -${this.currentLifeDrainAmount()} HP · HIT → RECOVER`;
    }
  }

  adjustGate(amount) {
    if (!this.enemy.gate) return 0;
    const gate = this.enemy.gate;
    const threshold = gate.threshold ?? 100;
    gate.value = clamp((gate.value ?? 0) + amount, 0, threshold);
    this.renderResources();
    return gate.value;
  }

  adjustFormation(amount) {
    if (!this.enemy.formation) return 0;
    const formation = this.enemy.formation;
    const threshold = formation.threshold ?? 100;
    formation.value = clamp((formation.value ?? 0) + amount, 0, threshold);
    if (this.enemy.encounterMode === "leo_black_end" && formation.value <= 2) {
      this.blackEndHornBroken = true;
      formation.value = 0;
      this.refs.stage.classList.add("black-end-horns-broken");
    }
    this.renderResources();
    return formation.value;
  }

  phasePool(name) {
    if (this.phaseIndex > 0) {
      const phaseName = `phase${this.phaseIndex}${name[0].toUpperCase()}${name.slice(1)}`;
      if (this.enemy[phaseName]?.length) return this.enemy[phaseName];
    }
    return this.enemy[name];
  }

  applyLeoFormationDamage(baseDamage) {
    if (this.enemy.encounterMode !== "leo_giras_rework" || !this.enemy.formation || baseDamage <= 0) return baseDamage;
    const value = this.enemy.formation.value ?? 100;
    let multiplier = 1;
    if (this.phaseIndex === 0) multiplier = value <= 2 ? 1.74 : value <= 35 ? 1.2 : .62;
    else multiplier = value <= 2 ? 1.64 : value <= 35 ? 1.17 : .72;
    return Math.max(1, Math.round(baseDamage * multiplier));
  }

  applyLeoEncounterDamage(baseDamage) {
    let damage = Math.max(0, Math.round(baseDamage));
    if (damage <= 0) return 0;

    if (this.enemy.encounterMode === "leo_giras_rework") return this.applyLeoFormationDamage(damage);

    if (this.enemy.encounterMode === "leo_pressure") {
      // Tiny Leo can still fight, but the scale mismatch is real: ordinary hits barely register.
      if (this.phaseIndex === 1 && !this.pressureRestored) return Math.min(2, Math.max(1, Math.round(damage * .035)));
      if (this.phaseIndex >= 2) return Math.max(1, Math.round(damage * 1.08));
      return damage;
    }

    if (this.enemy.encounterMode === "leo_black_end" && this.enemy.formation) {
      const guard = this.enemy.formation.value ?? 100;
      const multiplier = guard <= 2 ? 1.36 : guard <= 35 ? 1.08 : .72;
      return Math.max(1, Math.round(damage * multiplier));
    }

    return damage;
  }

  resetAdaptation() {
    if (!this.enemy.adaptation?.enabled) return;
    this.enemy.adaptation.current = null;
    this.renderResources();
  }

  applyAdaptation(baseDamage, category) {
    const adaptation = this.enemy.adaptation;
    if (!adaptation?.enabled || baseDamage <= 0) {
      return { damage: baseDamage, resisted: false, broken: false };
    }

    const previous = adaptation.current;
    let multiplier = 1;
    let resisted = false;
    let broken = false;

    if (previous === category) {
      multiplier = this.phaseIndex > 0
        ? (adaptation.phaseResistMultiplier ?? adaptation.resistMultiplier ?? .68)
        : (adaptation.resistMultiplier ?? .68);
      resisted = true;
    } else if (previous && previous !== category) {
      multiplier = this.phaseIndex > 0
        ? (adaptation.phaseBreakMultiplier ?? adaptation.breakMultiplier ?? 1.15)
        : (adaptation.breakMultiplier ?? 1.15);
      broken = true;
    }

    adaptation.current = category;
    this.renderResources();
    return { damage: Math.max(1, Math.round(baseDamage * multiplier)), resisted, broken };
  }

  gainEnergy(amount) {
    this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + amount);
    this.renderResources();
  }

  setFrameMode(mode) {
    const frame = this.refs.battleFrame;
    const alreadyThere = frame.dataset.mode === mode;

    frame.dataset.mode = mode;
    this.refs.dialogueLayer.hidden = mode !== "dialogue";
    this.refs.attackLayer.hidden = mode !== "attack";
    this.refs.choiceLayer.hidden = mode !== "choice";

    if (!alreadyThere) {
      frame.classList.remove("mode-transition");
      void frame.offsetWidth;
      frame.classList.add("mode-transition");
      clearTimeout(this._modeTransitionTimer);
      this._modeTransitionTimer = setTimeout(() => frame.classList.remove("mode-transition"), 280);
    }
  }

  renderTargetableState() {
    const targetable = !this.enemy.requiresExposure || this.enemyExposed;
    this.refs.enemySprite.classList.toggle("targetable", targetable);
    this.refs.stage.dataset.targetable = targetable ? "true" : "false";
  }

  commandAllowed(command) {
    if (!this.commandsGloballyEnabled) return false;
    if (this.frozenCommands.has(command)) return false;
    if (this.gingaBattle && this.gingaLiveForced) return command === "ITEM";

    // Cosmos objective phases deliberately remove commands that cannot advance the current goal.
    // This avoids presenting HP damage as a fake second objective.
    if (this.enemy.encounterMode === "cosmos_chaos_ultraman") {
      if (this.phaseIndex === 0 && command === "ATTACK") return false;
      if (this.phaseIndex === 1 && (command === "ATTACK" || command === "SKILL")) return false;
    }
    if (this.enemy.encounterMode === "cosmos_chaos_darkness" && this.cosmosMiracleActive && command === "ATTACK") return false;

    if (!this.enemy.requiresExposure) return true;

    if (this.enemyExposed) {
      return command === "ATTACK" || command === "SKILL";
    }

    // When the flying target is out of reach, ATTACK becomes CHASE.
    // Skills cannot connect until the exposure window opens.
    return command === "ATTACK" || command === "ACT" || command === "ITEM";
  }

  renderCommandAvailability() {
    const labelMap = { ATTACK: "攻击", SKILL: "技能", ACT: "行动", ITEM: "道具" };

    this.refs.commands.forEach((button, index) => {
      const command = this.commandOrder[index];
      const allowed = this.commandAllowed(command);
      button.disabled = !allowed;
      button.classList.toggle("locked", this.commandsGloballyEnabled && !allowed);
      button.classList.toggle("frozen-command", this.frozenCommands.has(command));

      const label = button.querySelector("span:last-child");
      if (label) {
        const lugielFinale = this.enemy.encounterMode === "ginga_lugiel_future" && this.phaseIndex >= 2 && this.lugielFinaleSupportActive;
        const tigaFinale = this.tigaGatanothorFinaleActive();
        const nexusStory = ["nexus_mephisto_one_himeya", "nexus_mephisto_zwei", "nexus_dark_zagi_bond"].includes(this.enemy.encounterMode);
        const chaosCopyObjective = this.enemy.encounterMode === "cosmos_chaos_ultraman" && this.phaseIndex < 2;
        const chaosHeartObjective = this.enemy.encounterMode === "cosmos_chaos_darkness" && this.cosmosMiracleActive;
        label.textContent = chaosHeartObjective && command === "ATTACK"
          ? "停止攻击"
          : chaosHeartObjective && command === "SKILL"
            ? "回应"
            : chaosHeartObjective && command === "ACT"
              ? "倾听"
              : chaosCopyObjective && command === "ATTACK"
                ? "HP锁定"
                : tigaFinale && command === "SKILL"
          ? "闪耀"
          : tigaFinale && command === "ACT"
            ? "光"
            : lugielFinale && command === "SKILL"
              ? "光技"
              : lugielFinale && command === "ACT"
                ? "呼唤"
                : nexusStory && command === "SKILL"
                  ? "光技"
                  : nexusStory && command === "ACT"
                    ? (this.enemy.encounterMode === "nexus_dark_zagi_bond" ? "纽带" : "判断")
                : this.gingaBattle && command === "ITEM"
              ? "LIVE"
              : this.enemy.requiresExposure && !this.enemyExposed && command === "ATTACK"
                ? "追击"
                : labelMap[command];
      }
    });
  }

  setCommandsEnabled(enabled) {
    this.commandsGloballyEnabled = enabled;
    this.renderCommandAvailability();
    this.refs.commandMenu.classList.toggle("muted", !enabled);
    if (enabled) this.normalizeCommandSelection();
  }

  normalizeCommandSelection() {
    if (this.commandAllowed(this.commandOrder[this.currentCommand])) return;
    const index = this.commandOrder.findIndex((command) => this.commandAllowed(command));
    this.currentCommand = index >= 0 ? index : 0;
  }

  moveCommand(delta) {
    for (let step = 1; step <= this.commandOrder.length; step++) {
      const index = (this.currentCommand + delta * step + this.commandOrder.length * 4) % this.commandOrder.length;
      if (this.commandAllowed(this.commandOrder[index])) {
        this.currentCommand = index;
        return;
      }
    }
  }

  renderCommandSelection() {
    this.refs.commands.forEach((button, index) => {
      button.classList.toggle("active", index === this.currentCommand && !button.disabled);
    });
  }

  choiceState() {
    return this.state.is("PLAYER_SKILL_SELECT", "PLAYER_ACT_SELECT", "PLAYER_ITEM_SELECT");
  }

  onKeyDown(event) {
    const key = event.key.toLowerCase();

    if (this.dialogueResolver && ["z", "enter", " "].includes(key)) {
      event.preventDefault();

      if (!this.typingDone) {
        this.finishTyping();
      } else {
        const resolve = this.dialogueResolver;
        this.dialogueResolver = null;
        resolve();
      }
      return;
    }

    if (this.state.is("PLAYER_ATTACK") && ["z", "enter", " "].includes(key)) {
      event.preventDefault();
      this.resolveAttackTiming();
      return;
    }

    if (this.choiceState()) {
      if (["arrowup", "w", "arrowleft", "a"].includes(key)) {
        event.preventDefault();
        this.moveChoice(-1);
      } else if (["arrowdown", "s", "arrowright", "d"].includes(key)) {
        event.preventDefault();
        this.moveChoice(1);
      } else if (["z", "enter", " "].includes(key)) {
        event.preventDefault();
        this.confirmChoice();
      } else if (["x", "escape"].includes(key)) {
        event.preventDefault();
        this.enterPlayerMenu(false);
      }
      return;
    }

    if (!this.state.is("PLAYER_MENU") || this.inputLocked) return;

    if (["arrowleft", "a"].includes(key)) {
      event.preventDefault();
      this.moveCommand(-1);
      this.renderCommandSelection();
    } else if (["arrowright", "d"].includes(key)) {
      event.preventDefault();
      this.moveCommand(1);
      this.renderCommandSelection();
    } else if (["z", "enter", " "].includes(key)) {
      event.preventDefault();
      this.chooseCommand(this.commandOrder[this.currentCommand]);
    } else if (/^[1-4]$/.test(key)) {
      const requested = Number(key) - 1;
      if (!this.commandAllowed(this.commandOrder[requested])) return;
      this.currentCommand = requested;
      this.renderCommandSelection();
      this.chooseCommand(this.commandOrder[this.currentCommand]);
    }
  }

  typeDialogue(text) {
    clearInterval(this.typingTimer);
    this.typingDone = false;
    this.fullDialogueText = text;
    this.refs.dialogueText.textContent = "";
    this.refs.continueHint.style.opacity = "0";

    let i = 0;
    const chars = [...text];

    return new Promise((resolveTyping) => {
      this.typingTimer = setInterval(() => {
        this.refs.dialogueText.textContent += chars[i] ?? "";
        i += 1;

        if (i >= chars.length) {
          clearInterval(this.typingTimer);
          this.typingDone = true;
          this.refs.continueHint.style.opacity = "1";
          resolveTyping();
        }
      }, this.dialogueCharMs);

      this._typingResolve = resolveTyping;
    });
  }

  finishTyping() {
    clearInterval(this.typingTimer);
    this.refs.dialogueText.textContent = this.fullDialogueText;
    this.refs.continueHint.style.opacity = "1";
    this.typingDone = true;
    this._typingResolve?.();
    this._typingResolve = null;
  }

  async say(text, autoAdvanceMs = 0) {
    this.setFrameMode("dialogue");
    this.setCommandsEnabled(false);

    const typingPromise = this.typeDialogue(text);

    if (autoAdvanceMs > 0) {
      await typingPromise;
      await sleep(autoAdvanceMs);
      return;
    }

    return new Promise((resolve) => {
      this.dialogueResolver = resolve;
    });
  }

  getMenuFlavor() {
    const hpRatio = this.enemy.hp / this.enemy.maxHp;

    if (this.lastDefenseOutcome === "gateSuppressed" && this.enemy.gateSuppressedFlavor?.length) {
      const line = this.enemy.gateSuppressedFlavor[(this.turn - 1) % this.enemy.gateSuppressedFlavor.length];
      this.lastDefenseOutcome = null;
      return line;
    }

    if (this.lastDefenseOutcome === "gateBurst" && this.enemy.gateBurstFlavor?.length) {
      const line = this.enemy.gateBurstFlavor[(this.turn - 1) % this.enemy.gateBurstFlavor.length];
      this.lastDefenseOutcome = null;
      return line;
    }

    if (this.enemy.gate && (this.enemy.gate.value ?? 0) >= (this.enemy.gate.threshold ?? 100) * .75 && this.enemy.gateHighFlavor?.length) {
      return this.enemy.gateHighFlavor[(this.turn - 1) % this.enemy.gateHighFlavor.length];
    }

    if (this.lastDefenseOutcome === "purifyGood" && this.enemy.purifyGoodFlavor?.length) {
      const line = this.enemy.purifyGoodFlavor[this.turn % this.enemy.purifyGoodFlavor.length];
      this.lastDefenseOutcome = null;
      return line;
    }

    if (this.lastDefenseOutcome === "purifyPoor" && this.enemy.purifyPoorFlavor?.length) {
      const line = this.enemy.purifyPoorFlavor[this.turn % this.enemy.purifyPoorFlavor.length];
      this.lastDefenseOutcome = null;
      return line;
    }

    if (this.enemy.requiresExposure && this.enemyExposed && this.enemy.exposureFlavor?.length) {
      return this.enemy.exposureFlavor[(this.turn - 1) % this.enemy.exposureFlavor.length];
    }

    if (this.lastDefenseOutcome === "chaseFailed" && this.enemy.chaseFailFlavor?.length) {
      const line = this.enemy.chaseFailFlavor[(this.turn - 1) % this.enemy.chaseFailFlavor.length];
      this.lastDefenseOutcome = null;
      return line;
    }

    if (this.lastDefenseOutcome === "severGood" && this.enemy.severGoodFlavor?.length) {
      const line = this.enemy.severGoodFlavor[(this.turn - 1) % this.enemy.severGoodFlavor.length];
      this.lastDefenseOutcome = null;
      return line;
    }

    if (this.lastDefenseOutcome === "feedBad" && this.enemy.feedBadFlavor?.length) {
      const line = this.enemy.feedBadFlavor[(this.turn - 1) % this.enemy.feedBadFlavor.length];
      this.lastDefenseOutcome = null;
      return line;
    }

    if (this.enemy.predation && (this.enemy.predation.value ?? 0) >= (this.enemy.predation.threshold ?? 100) * .72 && this.enemy.predationHighFlavor?.length) {
      return this.enemy.predationHighFlavor[(this.turn - 1) % this.enemy.predationHighFlavor.length];
    }

    if (this.lastDefenseOutcome === "grounded" && this.enemy.groundedFlavor?.length) {
      const line = this.enemy.groundedFlavor[(this.turn - 1) % this.enemy.groundedFlavor.length];
      this.lastDefenseOutcome = null;
      return line;
    }

    if (this.lastDefenseOutcome === "conduct" && this.enemy.conductFlavor?.length) {
      const line = this.enemy.conductFlavor[(this.turn - 1) % this.enemy.conductFlavor.length];
      this.lastDefenseOutcome = null;
      return line;
    }

    if (this.lastDefenseOutcome === "mirrorGood" && this.enemy.mirrorGoodFlavor?.length) {
      const line = this.enemy.mirrorGoodFlavor[(this.turn - 1) % this.enemy.mirrorGoodFlavor.length];
      this.lastDefenseOutcome = null;
      return line;
    }
    if (this.lastDefenseOutcome === "mirrorBad" && this.enemy.mirrorBadFlavor?.length) {
      const line = this.enemy.mirrorBadFlavor[(this.turn - 1) % this.enemy.mirrorBadFlavor.length];
      this.lastDefenseOutcome = null;
      return line;
    }
    if (this.lastDefenseOutcome === "thawGood" && this.enemy.thawGoodFlavor?.length) {
      const line = this.enemy.thawGoodFlavor[(this.turn - 1) % this.enemy.thawGoodFlavor.length];
      this.lastDefenseOutcome = null;
      return line;
    }
    if (this.lastDefenseOutcome === "thawBad" && this.enemy.thawBadFlavor?.length) {
      const line = this.enemy.thawBadFlavor[(this.turn - 1) % this.enemy.thawBadFlavor.length];
      this.lastDefenseOutcome = null;
      return line;
    }

    if (this.lastDefenseOutcome === "clean" && this.phasePool("cleanDefenseFlavor")?.length) {
      const pool = this.phasePool("cleanDefenseFlavor");
      const line = pool[(this.turn - 1) % pool.length];
      this.lastDefenseOutcome = null;
      return line;
    }

    if (this.lastDefenseOutcome === "hit" && this.phasePool("hitDefenseFlavor")?.length) {
      const pool = this.phasePool("hitDefenseFlavor");
      const line = pool[(this.turn - 1) % pool.length];
      this.lastDefenseOutcome = null;
      return line;
    }

    if (hpRatio <= .3 && this.enemy.lowHpFlavor?.length) {
      return this.enemy.lowHpFlavor[(this.turn - 1) % this.enemy.lowHpFlavor.length];
    }

    if (this.enemy.rage > 0 && this.enemy.angryFlavor?.length) {
      return this.enemy.angryFlavor[(this.turn - 1) % this.enemy.angryFlavor.length];
    }

    if (this.enemy.formation && (this.enemy.formation.value ?? 100) <= 2 && this.enemy.formationBrokenFlavor?.length) {
      return this.enemy.formationBrokenFlavor[(this.turn - 1) % this.enemy.formationBrokenFlavor.length];
    }

    const phaseFlavor = this.phasePool("flavorText");
    const pool = phaseFlavor?.length ? phaseFlavor : [`${this.enemy.name}没有移开视线。`];
    return pool[(this.turn - 1) % pool.length];
  }

  async enterPlayerMenu(incrementTurn = true) {
    if (this.enemy.hp <= 0) return this.victory();
    if (this.player.hp <= 0) return this.defeat();

    const belialRoundOutcome=this.enemy.encounterMode === "original_belial" ? this.lastDefenseOutcome : null;
    if (incrementTurn) this.turn += 1;

    this.state.set("PLAYER_MENU");
    this.setFrameMode("dialogue");
    this.renderTargetableState();

    if (incrementTurn || this.enemyExposed) {
      this.refs.dialogueText.textContent = `* ${this.getMenuFlavor()}`;
    }

    this.refs.continueHint.style.opacity = "0";
    this.setCommandsEnabled(true);
    this.renderCommandSelection();
    this.inputLocked = false;

    if (this.refs.microHelp) {
      const originalControlHelp = {
        guard: "Z 短防御脉冲",
        breaker: "Z 震碎附近可破坏攻击",
        dash: "方向 + Z 高速位移",
        shot: "Z 发射精准光箭",
        parry: "贴身瞬间 Z 迎击",
        purify: "Z 范围净化",
        ultimate: "Z 大范围终极脉冲"
      }[this.originalFormProfile()?.control] ?? "Z 特殊防御";
      const cosmosObjectiveHelp = this.getCosmosObjectiveHelp();
      this.refs.microHelp.textContent = cosmosObjectiveHelp
        ? cosmosObjectiveHelp
        : this.originalBattle
        ? `ORIGINAL · ${this.player.form} · ${originalControlHelp} · 【行动】切换形态`
        : this.lugielFinaleActive()
        ? "FINAL PHASE · 【呼唤】回应伙伴 · 【LIVE】不再换形态，而是唤回一路走来的光"
        : this.gingaBattle && this.gingaLiveForced
        ? "BLACK KING // PARALYZED · 只有【LIVE】还能响应"
        : this.enemy.encounterMode === "ginga_dark_brothers"
          ? `当前 Live：${this.gingaFormProfile()?.name ?? this.gingaLiveForm} · DARK SYNC 越低，切换掩护越弱`
        : this.enemy.encounterMode === "ginga_lugiel"
          ? `当前 Live：${this.gingaFormProfile()?.name ?? this.gingaLiveForm} · 被冻结的指令必须在敌方回合里抢回来`
        : this.gingaBattle
          ? `当前 Live：${this.gingaFormProfile()?.name ?? this.gingaLiveForm} · 【LIVE】可切换已解锁形态`
        : this.enemy.requiresExposure && !this.enemyExposed
        ? "攻击目前够不到目标 · 选择【追击】进入高空追逐"
        : this.enemy.requiresExposure && this.enemyExposed
          ? "弱点暴露 · 这次机会只能用于攻击或技能"
          : "← → / A D 选择　·　Z / Enter 确认　·　X / Esc 返回";
    }
    if (this.enemy.encounterMode === "original_belial" && incrementTurn && ["clean","hit"].includes(belialRoundOutcome)) {
      const kind=belialRoundOutcome === "clean" ? "roundEndClean" : "roundEndHit";
      setTimeout(()=>this.showBelialBark(this.belialPickBark(kind),1200,belialRoundOutcome === "clean" ? "belial-taunt" : "belial-laugh"),120);
    }
  }

  async chooseCommand(command) {
    if (this.inputLocked || !this.state.is("PLAYER_MENU") || !this.commandAllowed(command)) return;

    this.inputLocked = true;
    this.setCommandsEnabled(false);

    if (command === "ATTACK" && this.enemy.requiresExposure && !this.enemyExposed) {
      return this.beginExposureChase();
    }

    if (command === "ATTACK") return this.playerAttack();
    if (command === "SKILL") return this.openChoiceMenu("SKILL");
    if (command === "ACT") return this.openChoiceMenu("ACT");
    if (command === "ITEM") return this.openChoiceMenu("ITEM");
  }

  async beginExposureChase() {
    const pool = this.enemy.chaseStartText?.length
      ? this.enemy.chaseStartText
      : [`${this.enemy.name}仍在攻击范围之外。`];
    const line = pool[(this.turn - 1) % pool.length];
    await this.say(`* ${line}`, 360);
    await this.enemyAttack();
  }

  consumeExposure() {
    if (!this.enemy.requiresExposure) return;
    this.enemyExposed = false;
    this.renderTargetableState();
  }

  getChoiceOptions(kind) {
    if (kind === "SKILL") return this.originalBattle
      ? this.getOriginalSkills()
      : this.cosmosBattle
      ? this.getCosmosFormSkills()
      : this.tigaGatanothorFinaleActive()
      ? this.getTigaGlitterSkills()
      : this.lugielFinaleActive() ? this.getLugielFinaleSkills()
      : ["nexus_mephisto_one_himeya", "nexus_mephisto_zwei", "nexus_dark_zagi_bond"].includes(this.enemy.encounterMode) ? this.getNexusFormSkills()
      : (this.player.skills ?? []);
    if (kind === "ACT") return this.originalBattle
      ? this.getOriginalActions()
      : this.cosmosBattle
      ? this.getCosmosFormActions()
      : this.tigaGatanothorFinaleActive()
      ? this.getTigaGlitterActions()
      : this.lugielFinaleActive()
        ? this.getLugielFinaleActions()
        : ["nexus_mephisto_one_himeya", "nexus_mephisto_zwei", "nexus_dark_zagi_bond"].includes(this.enemy.encounterMode)
          ? this.getNexusFormActions()
          : (this.player.actions ?? []).filter((action) => (action.minPhase ?? 0) <= this.phaseIndex && (action.maxPhase ?? 99) >= this.phaseIndex);
    if (kind === "ITEM") return this.gingaBattle ? this.getGingaLiveOptions() : (this.player.items ?? []);
    return [];
  }

  openChoiceMenu(kind) {
    const stateMap = {
      SKILL: "PLAYER_SKILL_SELECT",
      ACT: "PLAYER_ACT_SELECT",
      ITEM: "PLAYER_ITEM_SELECT"
    };

    this.currentChoiceKind = kind;
    this.currentChoice = 0;
    this.state.set(stateMap[kind]);
    this.setFrameMode("choice");
    this.inputLocked = false;

    const titleMap = { SKILL: "技能", ACT: "行动", ITEM: this.gingaBattle ? "ULTRA LIVE" : "道具" };
    if (this.originalBattle) {
      if (kind === "SKILL") titleMap.SKILL = `${this.player.form} / 光技`;
      if (kind === "ACT") titleMap.ACT = this.enemy.encounterMode === "original_five_king" ? "形态 / 部位" : "形态";
    }
    if (this.lugielFinaleActive()) {
      if (kind === "SKILL") titleMap.SKILL = "最后的光";
      if (kind === "ACT") titleMap.ACT = "回应";
      if (kind === "ITEM") titleMap.ITEM = "LIVE / 光的记忆";
    }
    if (this.cosmosBattle) {
      if (kind === "SKILL") titleMap.SKILL = this.cosmosForm === "miracle-luna" ? "奇迹月神" : "光技";
      if (kind === "ACT") titleMap.ACT = this.cosmosMiracleActive ? "心 / 回应" : "形态 / 行动";
    }
    if (this.tigaGatanothorFinaleActive()) {
      if (kind === "SKILL") titleMap.SKILL = "闪耀之光";
      if (kind === "ACT") titleMap.ACT = "人们的光";
    }
    if (["nexus_mephisto_one_himeya", "nexus_mephisto_zwei", "nexus_dark_zagi_bond"].includes(this.enemy.encounterMode)) {
      if (kind === "SKILL") titleMap.SKILL = this.nexusForm === "noa" ? "NOA" : "光技";
      if (kind === "ACT") titleMap.ACT = this.enemy.encounterMode === "nexus_dark_zagi_bond" ? "纽带" : "判断";
    }
    this.refs.choiceTitle.textContent = titleMap[kind];

    this.renderChoiceList();
  }

  renderChoiceList() {
    const options = this.getChoiceOptions(this.currentChoiceKind);
    this.refs.choiceList.innerHTML = "";

    options.forEach((option, index) => {
      const button = document.createElement("button");
      button.className = `choice-option ${index === this.currentChoice ? "active" : ""}`;

      const name = document.createElement("span");
      name.className = "choice-option-name";
      name.textContent = option.name;

      const meta = document.createElement("span");
      meta.className = "choice-option-meta";

      if (this.currentChoiceKind === "SKILL") {
        const mercyLocked = this.skillBlockedByMercy(option);
        const hpCost = option.hpCost ?? 0;
        const energyCost = option.cost ?? 0;
        meta.textContent = option.locked ? (option.lockText ?? "LOCKED") : mercyLocked ? "CALM 100%" : hpCost > 0 ? `${hpCost} HP` : `${energyCost} EN`;
        button.classList.toggle("unavailable", !!option.locked || (hpCost > 0 ? this.player.hp <= hpCost : this.player.energy < energyCost) || mercyLocked);
        if (mercyLocked || option.locked) button.classList.add("mercy-locked");
      } else if (this.currentChoiceKind === "ITEM") {
        if (this.gingaBattle && option.memoryId) {
          meta.textContent = option.used ? "REMEMBERED" : "REMEMBER";
          button.classList.toggle("unavailable", !!option.used);
        } else if (this.gingaBattle && option.liveForm) {
          meta.textContent = option.current ? "ACTIVE" : option.frozen ? "FROZEN" : "LIVE";
          button.classList.toggle("unavailable", !!option.current || !!option.frozen);
          button.classList.toggle("frozen-live", !!option.frozen);
        } else {
          meta.textContent = `×${option.uses ?? 0}`;
          button.classList.toggle("unavailable", (option.uses ?? 0) <= 0);
        }
      } else {
        meta.textContent = option.locked ? (option.lockText ?? "LOCKED") : option.used ? "HEARD" : "";
        button.classList.toggle("unavailable", !!option.locked || (!!option.once && !!option.used));
      }

      button.append(name, meta);

      button.addEventListener("mouseenter", () => {
        this.currentChoice = index;
        this.renderChoiceList();
      });

      button.addEventListener("click", () => {
        this.currentChoice = index;
        this.confirmChoice();
      });

      this.refs.choiceList.append(button);
    });

    const current = options[this.currentChoice];
    if (this.currentChoiceKind === "SKILL" && current?.locked) {
      this.refs.choiceDescription.textContent = `${current?.description ?? ""} · ${current?.lockText ?? "LOCKED"}`;
    } else if (this.currentChoiceKind === "SKILL" && this.skillBlockedByMercy(current)) {
      this.refs.choiceDescription.textContent = `${current?.description ?? ""} 需要先将 CALM 提升到 100%。`;
    } else if (this.currentChoiceKind === "ACT" && current?.locked) {
      this.refs.choiceDescription.textContent = `${current?.description ?? ""} · ${current?.lockText ?? "LOCKED"}`;
    } else if ((this.currentChoiceKind === "ACT" && current?.used) || (this.currentChoiceKind === "ITEM" && current?.used)) {
      this.refs.choiceDescription.textContent = `${current?.description ?? ""} 这道光已经回应过你。`;
    } else {
      this.refs.choiceDescription.textContent = current?.description ?? "暂无可用选项。";
    }
  }

  moveChoice(delta) {
    const options = this.getChoiceOptions(this.currentChoiceKind);
    if (!options.length) return;

    this.currentChoice = (this.currentChoice + delta + options.length) % options.length;
    this.renderChoiceList();
  }

  async confirmChoice() {
    const options = this.getChoiceOptions(this.currentChoiceKind);
    const option = options[this.currentChoice];
    if (!option || this.inputLocked) return;

    if (this.currentChoiceKind === "SKILL") {
      if (option.locked) {
        this.refs.choiceDescription.textContent = option.description ?? "这道光还没有准备好。";
        return;
      }
      if (this.skillBlockedByMercy(option)) {
        this.refs.choiceDescription.textContent = this.enemy.mercy?.lockedSkillText ?? "现在还无法使用这个技能完成净化。";
        return;
      }
      if ((option.hpCost ?? 0) > 0 && this.player.hp <= option.hpCost) {
        this.refs.choiceDescription.textContent = `生命不足：需要保留至少 1 HP，无法再支付 ${option.hpCost} HP。`;
        return;
      }
      if ((option.hpCost ?? 0) <= 0 && this.player.energy < (option.cost ?? 0)) {
        this.refs.choiceDescription.textContent = `能量不足：需要 ${option.cost ?? 0} EN。`;
        return;
      }

      this.inputLocked = true;
      return this.useSkill(option);
    }

    if (this.currentChoiceKind === "ACT") {
      if (option.locked) {
        this.refs.choiceDescription.textContent = option.lockText ?? "这个选项目前无法使用。";
        return;
      }
      if (option.once && option.used) {
        this.refs.choiceDescription.textContent = "你已经回应过这道光。";
        return;
      }
      this.inputLocked = true;
      return this.useAction(option);
    }

    if (this.currentChoiceKind === "ITEM") {
      if (this.gingaBattle && option.memoryId) {
        if (option.used) {
          this.refs.choiceDescription.textContent = "这段光已经回应过你。";
          return;
        }
        this.inputLocked = true;
        return this.useGingaFinaleMemory(option);
      }
      if (this.gingaBattle && option.liveForm) {
        if (option.current) {
          this.refs.choiceDescription.textContent = "这个形态已经实体化。";
          return;
        }
        if (option.frozen) {
          this.refs.choiceDescription.textContent = "Dark Spark 把这枚 Spark Doll 固定住了。";
          return;
        }
        this.inputLocked = true;
        return this.useGingaLive(option);
      }
      if ((option.uses ?? 0) <= 0) {
        this.refs.choiceDescription.textContent = "这个道具已经用完了。";
        return;
      }

      this.inputLocked = true;
      return this.useItem(option);
    }
  }

  async playerAttack() {
    this.state.set("PLAYER_ATTACK");
    this.setFrameMode("attack");
    this.refs.attackGrade.textContent = "";

    const focused = this.flags.nextAttackSlow;
    this.attackStartedAt = performance.now();
    this.attackResolved = false;
    this.attackDuration = focused ? 1650 : 1150;
    this.perfectThreshold = focused ? .14 : .08;
    this.refs.perfectZone.classList.toggle("focused", focused);

    this.animateAttackCursor();
  }

  animateAttackCursor() {
    if (!this.state.is("PLAYER_ATTACK") || this.attackResolved) return;

    const elapsed = (performance.now() - this.attackStartedAt) % this.attackDuration;
    let t = elapsed / this.attackDuration;
    t = t < .5 ? t * 2 : 2 - t * 2;

    this.attackPosition = t;
    this.refs.attackCursor.style.left = `calc(${t * 100}% - 2px)`;
    this.attackRAF = requestAnimationFrame(() => this.animateAttackCursor());
  }

  async resolveAttackTiming() {
    if (!this.state.is("PLAYER_ATTACK") || this.attackResolved) return;

    this.attackResolved = true;
    cancelAnimationFrame(this.attackRAF);

    const distance = Math.abs(this.attackPosition - .5) * 2;
    let grade = "MISS";
    let multiplier = .25;
    let energyGain = 3;

    if (distance <= this.perfectThreshold) {
      grade = "PERFECT";
      multiplier = 1.62;
      energyGain = 14;
    } else if (distance <= .24) {
      grade = "GOOD";
      multiplier = 1.2;
      energyGain = 9;
    } else if (distance <= .58) {
      grade = "NORMAL";
      multiplier = .86;
      energyGain = 6;
    }

    this.refs.attackGrade.textContent = grade;

    const exposureBattle = !!this.enemy.requiresExposure;
    const effectiveDefense = exposureBattle && this.enemyExposed
      ? 0
      : Math.max(0, this.enemy.defense - (this.enemy.exposedTurns > 0 ? 2 : 0));
    const exposureMultiplier = exposureBattle && this.enemyExposed ? (this.enemy.exposureDamageMultiplier ?? 1) : 1;
    let damage = grade === "MISS" && exposureBattle
      ? 0
      : Math.max(1, Math.round((this.player.attack * multiplier - effectiveDefense) * exposureMultiplier));
    const adaptationResult = this.applyAdaptation(damage, "physical");
    damage = adaptationResult.damage;
    if (this.enemy.encounterMode === "leo_giras_rework") {
      const formationBreak = grade === "PERFECT" ? 18 : grade === "GOOD" ? 12 : grade === "NORMAL" ? 7 : 0;
      if (formationBreak > 0) this.adjustFormation(-formationBreak);
    }
    if (this.enemy.encounterMode === "leo_black_end" && grade === "PERFECT") this.adjustFormation(-10);
    damage = this.applyLeoEncounterDamage(damage);
    damage = this.applyGingaEncounterDamage(damage);
    damage = this.applyTigaEncounterDamage(damage);
    damage = this.applyNexusEncounterDamage(damage);
    if (this.cosmosBattle && this.cosmosForm === "corona") damage = Math.round(damage * 1.12);
    if (this.cosmosBattle && this.cosmosForm === "luna") damage = Math.round(damage * .88);
    if (this.enemy.encounterMode === "cosmos_chaos_ultraman" && this.phaseIndex === 2) {
      damage = Math.max(1, Math.round(damage));
    }
    if (this.lifeCycleEnabled() && this.nexusMetaField && damage > 0) damage = Math.round(damage * 1.12);
    if (adaptationResult.resisted) this.refs.attackGrade.textContent = `${grade} · ADAPTED`;
    else if (adaptationResult.broken) this.refs.attackGrade.textContent = `${grade} · BREAK`;

    this.flags.nextAttackSlow = false;
    this.refs.perfectZone.classList.remove("focused");
    this.gainEnergy(energyGain);

    await sleep(150);

    if (damage > 0) {
      this.damageEnemy(damage, grade === "PERFECT" ? "heavy" : grade === "GOOD" ? "medium" : "normal");
    } else if (this.enemy.encounterMode === "ginga_super_grand_king" && this.phaseIndex === 0) {
      this.refs.stage.classList.add("armor-deny");
      setTimeout(() => this.refs.stage.classList.remove("armor-deny"), 420);
      await this.say("* 装甲没有再让步。继续打这里只是在浪费时间。", 360);
    } else if (this.enemy.requiresExposure) {
      await this.say(`* ${this.enemy.exposureMissText ?? "攻击擦过了弱点。"}`, 340);
    }

    await sleep(damage > 0 ? 420 : 120);

    if (this.enemy.encounterMode === "original_belial" && this.enemy.hp > 0) {
      const heavy=grade === "PERFECT" || damage >= Math.max(28, this.player.attack*.9);
      const line=this.belialPickBark(heavy?"heavyHit":"attacked");
      this.showBelialBark(line,1050,heavy?"belial-rage":"belial-taunt");
    }

    if (grade === "PERFECT" && this.enemy.perfectHitFlavor?.length && this.enemy.hp > 0) {
      const line = this.enemy.perfectHitFlavor[(this.turn - 1) % this.enemy.perfectHitFlavor.length];
      await this.say(`* ${line}`, 360);
    }

    if (this.enemy.exposedTurns > 0) this.enemy.exposedTurns -= 1;

    if (await this.handleCosmosPlayerMoveObjective()) return;
    if (this.enemy.hp <= 0) return this.victory();
    await this.maybeAdvancePhase();

    const wasExposureBattle = this.enemy.requiresExposure;
    this.consumeExposure();
    if (wasExposureBattle && damage > 0 && this.enemy.exposureCloseText) {
      await this.say(`* ${this.enemy.exposureCloseText}`, 320);
    }

    await this.enemyResponse();
  }

  async useSkill(skill) {
    this.state.set("PLAYER_SKILL");
    if ((skill.hpCost ?? 0) > 0) {
      if (!this.spendPlayerLife(skill.hpCost)) {
        await this.say("* 核心的光已经撑不起这次释放。");
        return this.enterPlayerMenu(false);
      }
    } else {
      this.player.energy -= skill.cost ?? 0;
      this.renderResources();
    }

    this.refs.enemySprite.classList.add("charged");
    this.refs.stage.classList.add("skill-cast");
    await this.say(`* ${skill.text}`, skill.id === "zeppelion-ray" ? 560 : 360);
    this.refs.enemySprite.classList.remove("charged");
    this.refs.stage.classList.remove("skill-cast");

    if (skill.kind === "cosmosHeart") {
      this.adjustInterfaceGauge(6);
      this.flags.cosmosGuard = true;
      await this.say("* 黑暗没有消失。可这一次，光没有被立刻推回来。", 520);
      const ready = await this.maybeCosmosChaosDarknessHeartBeat();
      return ready ? this.enterPlayerMenu(false) : this.enemyResponse();
    }
    if (skill.kind === "cosmosFinalMercy") {
      if ((this.enemy.interfaceGauge?.value ?? 0) < (this.enemy.interfaceGauge?.threshold ?? 100)) {
        await this.say("* 还没有。它听见了，但还没有做出自己的选择。", 520);
        return this.enterPlayerMenu(false);
      }
      return this.cosmosChaosDarknessVictory();
    }
    if (skill.kind === "mercy") {
      return this.resolveMercySkill(skill);
    }

    if (skill.kind === "nexusBarrier") {
      this.flags.barrier = true;
      this.flags.nexusDrainGuard = true;
      this.flags.nextEnemyTelegraph = true;
      await this.say("* 护盾没有让生命停止流失，但争到了一点时间。", 340);
      return this.enemyResponse();
    }

    if (skill.kind === "gingaBrace") {
      this.flags.barrier = true;
      this.flags.gingaGroundAssist = true;
      this.flags.nextEnemyTelegraph = true;
      await this.say("* 电流绕过黑王的脚边。", 300);
      return this.enemyResponse();
    }

    if (skill.kind === "finaleLight") {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
      this.flags.lightShield = true;
      this.flags.stasisMarkBoost = true;
      this.flags.stasisAnchorBoost = true;
      this.adjustInterfaceGauge(-12);
      this.refs.stage.classList.add("allies-light-skill");
      this.sound?.playHopeSpark?.();
      this.renderResources();
      await this.say("* 那些声音没有退回远处，它们汇进了银河火花。", 460);
      setTimeout(() => this.refs.stage.classList.remove("allies-light-skill"), 760);
      return this.enemyResponse();
    }

    const exposureBattle = !!this.enemy.requiresExposure;
    const effectiveDefense = exposureBattle && this.enemyExposed
      ? 0
      : Math.max(0, this.enemy.defense - (this.enemy.exposedTurns > 0 ? 2 : 0));
    const exposureMultiplier = exposureBattle && this.enemyExposed ? (this.enemy.exposureDamageMultiplier ?? 1) : 1;
    let damage = Math.max(1, Math.round((skill.damage - effectiveDefense) * exposureMultiplier));
    let plasmaOvercharge = false;
    if (this.gingaBattle && skill.plasmaFinisher && (this.enemy.plasma?.value ?? 0) >= (this.enemy.plasma?.threshold ?? 3)) {
      plasmaOvercharge = true;
      damage = Math.round(damage * 1.95);
      this.adjustPlasma(-(this.enemy.plasma?.threshold ?? 3));
      this.refs.stage.classList.add("plasma-overcharge");
    }
    const adaptationResult = this.applyAdaptation(damage, skill.attackClass ?? "energy");
    damage = adaptationResult.damage;
    if (this.enemy.encounterMode === "leo_giras_rework") {
      const formationBreak = skill.id === "corkscrew-kick" ? 30 : skill.id === "leo-kick" ? 18 : 11;
      this.adjustFormation(-formationBreak);
    }
    if (this.enemy.encounterMode === "leo_black_end") {
      const hornBreak = skill.id === "corkscrew-kick" ? 22 : skill.id === "leo-kick" ? 14 : 7;
      this.adjustFormation(-hornBreak);
    }
    damage = this.applyLeoEncounterDamage(damage);
    damage = this.applyGingaEncounterDamage(damage);
    damage = this.applyTigaEncounterDamage(damage);
    damage = this.applyNexusEncounterDamage(damage);
    if (this.cosmosBattle && this.cosmosForm === "corona") damage = Math.round(damage * 1.12);
    if (this.cosmosBattle && this.cosmosForm === "luna") damage = Math.round(damage * .88);
    if (this.enemy.encounterMode === "cosmos_chaos_ultraman") {
      if (this.phaseIndex === 0 && skill.cosmosCopyBreak) {
        this.adjustInterfaceGauge(-skill.cosmosCopyBreak);
        if ((this.enemy.interfaceGauge?.value ?? 1) <= 0) this.cosmosObjectiveAdvancePending = true;
      }
      if (this.phaseIndex === 2) damage = Math.max(1, Math.round(damage));
    }
    if (this.lifeCycleEnabled() && this.nexusMetaField && damage > 0) damage = Math.round(damage * 1.12);
    if (this.enemy.encounterMode === "original_zetton" && (skill.attackClass ?? "energy") === "energy" && (skill.damage ?? 0) >= 70) {
      this.originalZettonBeamStored = true;
      this.refs.enemySprite.classList.add("zetton-barrier-catch");
      setTimeout(() => this.refs.enemySprite.classList.remove("zetton-barrier-catch"), 760);
      if (this.phaseIndex === 0) {
        damage = 0;
        this.showSupportCallout?.("ZETTON", "光线被屏障吸收", 760);
      } else {
        damage = Math.max(1, Math.round(damage * .42));
        this.showSupportCallout?.("HYPER ZETTON", "BARRIER", 620);
      }
    }
    if (adaptationResult.broken) this.refs.stage.classList.add("adapt-break");
    if (adaptationResult.resisted) this.refs.stage.classList.add("adapt-resist");
    if (damage > 0) {
      if (skill.tigaLightShield && this.tigaGatanothorFinaleActive()) this.flags.lightShield = true;
      const finaleHeavy = ["ginga-especially-final"].includes(skill.id);
      this.damageEnemy(damage, finaleHeavy || ["zeppelion-ray", "cross-ray-schtrom", "corkscrew-kick", "noa-lightning", "over-ray-schtrom"].includes(skill.id) ? "heavy" : "medium");
      if (skill.nexusBondGain && this.enemy.encounterMode === "nexus_dark_zagi_bond") this.adjustInterfaceGauge(skill.nexusBondGain);
      if (skill.nexusDrainReduce && this.enemy.encounterMode === "nexus_mephisto_zwei") this.adjustInterfaceGauge(-skill.nexusDrainReduce);
      if (this.lugielFinaleActive()) {
        if (skill.finaleStasisReduce) this.adjustInterfaceGauge(-skill.finaleStasisReduce);
        if (skill.finaleMark) this.flags.stasisMarkBoost = true;
        if (skill.id === "ginga-especially-final") {
          this.refs.stage.classList.add("ginga-especially-skill");
          this.flags.stasisAnchorBoost = true;
          setTimeout(() => this.refs.stage.classList.remove("ginga-especially-skill"), 1000);
        }
      }
    } else if (this.enemy.encounterMode === "original_zetton" && this.originalZettonBeamStored) {
      await this.say("* 杰顿在身前展开屏障，强光被吸入其中。", 420);
    } else if (this.enemy.encounterMode === "ginga_super_grand_king" && this.phaseIndex === 0) {
      this.refs.stage.classList.add("armor-deny");
      setTimeout(() => this.refs.stage.classList.remove("armor-deny"), 420);
      await this.say("* 光在装甲表面散掉了。里面的人仍然没有回应。", 360);
    }
    setTimeout(() => this.refs.stage.classList.remove("adapt-break", "adapt-resist", "plasma-overcharge"), plasmaOvercharge ? 760 : 520);
    await sleep(skill.id === "zeppelion-ray" ? 560 : 400);

    const reactionTable = this.phaseIndex > 0 && this.enemy.phase1SkillReactions ? this.enemy.phase1SkillReactions : this.enemy.skillReactions;
    const reactionPool = reactionTable?.[skill.id];
    if (reactionPool?.length && this.enemy.hp > 0) {
      const line = reactionPool[(this.turn - 1) % reactionPool.length];
      await this.say(`* ${line}`, 380);
    }

    if (this.enemy.exposedTurns > 0) this.enemy.exposedTurns -= 1;

    if (await this.handleCosmosPlayerMoveObjective()) return;
    if (this.enemy.hp <= 0) return this.victory();
    await this.maybeAdvancePhase();

    const wasExposureBattle = this.enemy.requiresExposure;
    this.consumeExposure();
    if (wasExposureBattle && this.enemy.exposureCloseText) {
      await this.say(`* ${this.enemy.exposureCloseText}`, 320);
    }

    await this.enemyResponse();
  }

  async resolveMercySkill(skill) {
    const mercy = this.enemy.mercy;

    if (!mercy?.enabled || !this.mercyRouteEnabled()) {
      await this.say(`* ${mercy?.unsupportedText ?? "光停在怪兽身上。它没有回应。"}`, 360);
      await this.enemyResponse();
      return;
    }

    if (mercy.finishSkillId === skill.id) {
      if (!this.isMercyReady()) {
        await this.say(`* ${mercy.lockedSkillText ?? "现在还无法完成净化。"}`, 380);
        await this.enemyResponse();
        return;
      }
      return this.pacify();
    }

    mercy.value = Math.min(mercy.threshold ?? 100, (mercy.value ?? 0) + (skill.mercyPower ?? 0));
    const ratio = mercy.value / (mercy.threshold ?? 100);
    const pool = ratio >= .75
      ? mercy.highResponses
      : ratio >= .4
        ? mercy.midResponses
        : mercy.lowResponses;

    if (pool?.length) {
      const index = Math.max(0, Math.min(pool.length - 1, (this.actionCounts.__mercy ?? 0) % pool.length));
      this.actionCounts.__mercy = (this.actionCounts.__mercy ?? 0) + 1;
      await this.say(`* ${pool[index]}`, 420);
    }

    if (mercy.value >= (mercy.threshold ?? 100)) {
      return this.pacify();
    }

    await this.enemyResponse();
  }

  async pacify() {
    if (this.enemy.encounterMode === "cosmos_lidorias_forms") return this.cosmosLidoriasMercyCinematic();
    if (this.state.is("MERCY")) return;
    this.state.set("MERCY");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.setFrameMode("dialogue");

    this.refs.stage.classList.add("mercy-cast");
    this.refs.enemySprite.classList.add("purified");
    this.sound?.play("mercy");
    await sleep(720);

    const text = this.enemy.mercy?.successText ?? `${this.enemy.name}平静了下来。`;
    await this.say(`* ${text}`);
    this.refs.dialogueText.textContent = "MERCY";
    this.refs.dialogueText.style.fontSize = "34px";
    this.refs.dialogueText.style.fontWeight = "900";
    this.refs.continueHint.style.opacity = "0";
    this.emitResult("mercy");
  }

  async useAction(action) {
    this.state.set("PLAYER_ACT");

    const effect = action.effect ?? action.id;
    const count = (this.actionCounts[action.id] ?? 0) + 1;
    this.actionCounts[action.id] = count;
    this.lastPlayerAction = action.id;

    if (effect === "golzaWeakRead") {
      this.flags.nextEnemyTelegraph = true;
      this.golzaWeakReadActive = true;
      this.enemy.exposedTurns = Math.max(this.enemy.exposedTurns, 2);
      this.refs.stage.classList.add("golza-weak-mark");
    } else if (effect === "tigaGatherLight") {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 14);
      this.gainEnergy(16);
      this.flags.nextAttackSlow = true;
      this.flags.tigaGlitterStrike = true;
      this.sound?.playTigaLightRise?.(1);
      this.renderResources();
    } else if (effect === "tigaAdvanceLight") {
      this.flags.speedBoost = true;
      this.flags.lightShield = true;
      this.flags.nextEnemyTelegraph = true;
    } else if (effect === "tigaShine") {
      this.flags.tigaGlitterStrike = true;
      this.flags.nextAttackSlow = true;
      this.sound?.playTigaLightRise?.(2);
    } else if (effect === "telegraph" || effect === "observe") {
      this.flags.nextEnemyTelegraph = true;
    } else if (effect === "provoke") {
      this.enemy.rage += action.rage ?? 1;
      this.enemy.exposedTurns = Math.max(this.enemy.exposedTurns, action.exposedTurns ?? 2);
    } else if (effect === "focus") {
      this.flags.nextAttackSlow = true;
    } else if (effect === "guardAssist") {
      this.flags.guardAssist = true;
      this.flags.nextEnemyTelegraph = true;
    } else if (effect === "light") {
      this.gainEnergy(18);
      this.flags.lightShield = true;
    } else if (effect === "bossFocus") {
      this.flags.nextAttackSlow = true;
      this.flags.speedBoost = true;
    } else if (effect === "platformAssist") {
      this.flags.nextEnemyTelegraph = true;
      this.flags.jumpBoost = true;
      this.flags.platformAssist = true;
    } else if (effect === "platformFocus") {
      this.flags.speedBoost = true;
      this.flags.jumpBoost = true;
      this.flags.nextAttackSlow = true;
    } else if (effect === "originalSwitch") {
      const next = action.formKey ?? action.form;
      const profile = this.originalFormProfile(next);
      if (next === this.originalFormKey) {
        await this.say(`* 已经处于${profile?.label ?? this.player.form}。`, 280);
        return this.enterPlayerMenu(false);
      }
      if (profile?.ultimate) this.originalUltimateEntered = true;
      this.applyOriginalForm(next, true);
    } else if (effect === "originalFiveTarget") {
      this.setOriginalFiveKingTarget(action.moduleKey);
      // Picking a body part is target selection, not an ACT turn. The player can lock a
      // different organ and attack immediately instead of sacrificing a whole round just
      // to move a cursor.
      return this.enterPlayerMenu(false);
    } else if (effect === "cosmosSwitch") {
      const previous=this.cosmosForm;
      this.applyCosmosForm(action.form,true);
      if(this.enemy.encounterMode==="cosmos_chaos_ultraman"){
        if (this.phaseIndex === 0) {
          const change=previous===action.form?2:-18;this.adjustInterfaceGauge(change);
          if ((this.enemy.interfaceGauge?.value ?? 1) <= 0) this.cosmosObjectiveAdvancePending = true;
        }
        this.refs.stage.classList.add("cosmos-form-shift");setTimeout(()=>this.refs.stage.classList.remove("cosmos-form-shift"),620);
      }
    } else if (effect === "cosmosLidoriasCall") {
      this.flags.cosmosLunaAssist=true; this.flags.cosmosGuard=true; this.flags.nextEnemyTelegraph=true; this.adjustMercy(7);
    } else if (effect === "cosmosLunaField") {
      this.flags.cosmosLunaAssist=true; this.flags.nextEnemyTelegraph=true;
    } else if (effect === "cosmosCoronaDrive") {
      this.flags.cosmosCoronaAssist=true; this.flags.speedBoost=true;
    } else if (effect === "cosmosEclipseRead") {
      this.flags.cosmosEclipseAssist=true; this.flags.nextEnemyTelegraph=true;
    } else if (effect === "cosmosListenHeart") {
      this.flags.cosmosLunaAssist=true; this.flags.cosmosGuard=true; this.adjustInterfaceGauge(2);
    } else if (effect === "cosmosMonsterTrust") {
      this.flags.cosmosLunaAssist=true; this.flags.cosmosGuard=true; this.flags.nextEnemyTelegraph=true; this.flags.cosmosMonsterTrust=true; this.adjustInterfaceGauge(3);
    } else if (effect === "purifyPrep") {
      this.flags.purifyActive = true;
      this.flags.nextEnemyTelegraph = true;
    } else if (effect === "purifyFocus") {
      this.flags.purifyActive = true;
      this.flags.purifyBoost = true;
      this.enemy.rage += .35;
    } else if (effect === "gateRead") {
      this.flags.nextEnemyTelegraph = true;
      this.adjustGate(-(action.gateReduce ?? 5));
    } else if (effect === "gateAnchor") {
      this.flags.gatePullResist = true;
      this.flags.nextEnemyTelegraph = true;
    } else if (effect === "gateDefy") {
      this.adjustGate(-(action.gateReduce ?? 14));
      this.resetAdaptation();
      this.enemy.rage += action.rage ?? .25;
      this.enemy.exposedTurns = Math.max(this.enemy.exposedTurns, 1);
      if (this.enemy.encounterMode === "tiga_kyrieloid") {
        this.refs.stage.classList.add("kyrieloid-defied");
        this.sound?.playTigaGateBreak?.();
        setTimeout(() => this.refs.stage.classList.remove("kyrieloid-defied"), 760);
      }
    } else if (effect === "leoReverseSpin") {
      this.adjustFormation(-20);
      this.flags.leoCounterAssist = true;
      this.flags.nextEnemyTelegraph = true;
      this.refs.stage.classList.add("giras-spin-wobble");
      setTimeout(() => this.refs.stage.classList.remove("giras-spin-wobble"), 640);
    } else if (effect === "leoRead") {
      this.flags.nextEnemyTelegraph = true;
      this.flags.leoCounterAssist = true;
    } else if (effect === "leoBait") {
      this.adjustFormation(-(action.formationReduce ?? 13));
      this.flags.leoCrossBait = true;
      this.enemy.rage += .2;
    } else if (effect === "leoBrace") {
      this.flags.leoCounterAssist = true;
      this.flags.barrier = true;
    } else if (effect === "leoBreakCommand") {
      this.adjustFormation(-(action.formationReduce ?? 18));
      this.flags.leoCrossBait = true;
      this.flags.leoCounterAssist = true;
      this.enemy.rage += action.rage ?? .18;
    } else if (effect === "leoResolve") {
      this.flags.nextAttackSlow = true;
      this.flags.leoCounterAssist = true;
    } else if (effect === "pressureRead") {
      this.flags.nextEnemyTelegraph = true;
    } else if (effect === "pressureSmallFocus") {
      this.flags.speedBoost = true;
      this.flags.nextEnemyTelegraph = true;
    } else if (effect === "pressureSmallGuard") {
      this.flags.barrier = true;
      this.flags.pressureSmallGuard = true;
    } else if (effect === "pressureMantle") {
      this.flags.pressureMantleAssist = true;
      this.flags.barrier = true;
      this.flags.nextEnemyTelegraph = true;
      this.refs.stage.classList.add("pressure-mantle-open");
      setTimeout(() => this.refs.stage.classList.remove("pressure-mantle-open"), 700);
    } else if (effect === "blackEndRead") {
      this.flags.nextEnemyTelegraph = true;
      this.flags.leoCounterAssist = true;
    } else if (effect === "blackEndClose") {
      this.adjustFormation(-(action.formationReduce ?? 18));
      this.flags.leoCounterAssist = true;
      this.flags.blackEndClose = true;
      this.enemy.rage += action.rage ?? .2;
    } else if (effect === "nexusRead") {
      this.flags.nextEnemyTelegraph = true;
      this.flags.nexusSlashAssist = true;
    } else if (effect === "nexusStabilize") {
      this.flags.nexusDrainGuard = true;
      this.flags.barrier = true;
    } else if (effect === "nexusPressure") {
      this.flags.nexusPressure = true;
      this.flags.nexusSlashAssist = true;
      this.enemy.rage += .2;
    } else if (effect === "himeyaEndure") {
      this.flags.barrier = true;
      this.flags.nextEnemyTelegraph = true;
    } else if (effect === "himeyaImportant") {
      this.flags.nextAttackSlow = true;
    } else if (effect === "himeyaForward") {
      this.flags.speedBoost = true;
      this.flags.nextAttackSlow = true;
    } else if (effect === "himeyaFate") {
      this.flags.nextEnemyTelegraph = true;
      this.flags.lightShield = true;
    } else if (effect === "nexusBlueSight") {
      this.flags.nextEnemyTelegraph = true;
      this.flags.nexusShootAssist = true;
      if (this.enemy.encounterMode === "nexus_mephisto_zwei") this.adjustInterfaceGauge(-6);
    } else if (effect === "nexusBluePursuit") {
      this.flags.nexusShootAssist = true;
      this.flags.nexusShootBait = true;
      this.flags.speedBoost = true;
      this.enemy.rage += .18;
    } else if (effect === "nexusBlueSteady") {
      this.flags.nexusDrainGuard = true;
      this.flags.barrier = true;
      if (this.enemy.encounterMode === "nexus_mephisto_zwei") this.adjustInterfaceGauge(-9);
    } else if (effect === "nexusBondHold") {
      this.flags.barrier = true;
      this.flags.nexusCounterAssist = true;
      this.adjustInterfaceGauge(action.bondGain ?? 7);
    } else if (effect === "nexusBondRead") {
      this.flags.nextEnemyTelegraph = true;
      this.flags.nextAttackSlow = true;
      this.adjustInterfaceGauge(action.bondGain ?? 6);
    } else if (effect === "nexusBondRun") {
      this.flags.speedBoost = true;
      this.flags.nexusShootAssist = true;
      this.flags.nexusShootBait = true;
      this.adjustInterfaceGauge(action.bondGain ?? 7);
    } else if (effect === "nexusNoaConnect") {
      this.flags.lightShield = true;
      this.flags.nexusNoaGuard = true;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 16);
      this.adjustInterfaceGauge(action.bondGain ?? 10);
      this.renderResources();
    } else if (effect === "gingaTrace") {
      this.flags.nextEnemyTelegraph = true;
      this.flags.gingaGroundAssist = true;
    } else if (effect === "gingaAnchor") {
      this.adjustStatic(-12);
      this.flags.barrier = true;
      this.flags.gingaGroundAssist = true;
    } else if (effect === "gingaOverload") {
      this.adjustStatic(12);
      this.flags.gingaOverload = true;
      this.enemy.rage += .18;
    } else if (effect === "gingaConductRead") {
      this.flags.nextEnemyTelegraph = true;
      this.flags.gingaConductAssist = true;
    } else if (effect === "gingaConductBait") {
      this.flags.gingaConductBait = true;
      this.enemy.rage += .2;
    } else if (effect === "gingaHoldCharge") {
      this.flags.gingaHoldCharge = true;
      this.flags.barrier = true;
    } else if (effect === "gingaMindCall") {
      this.flags.gingaMindDive = true;
      this.flags.nextEnemyTelegraph = true;
    } else if (effect === "gingaHoldSiege") {
      this.flags.barrier = true;
      this.flags.nextEnemyTelegraph = true;
    } else if (effect === "gingaDeepDive") {
      this.flags.gingaMindDive = true;
      this.flags.gingaDeepDive = true;
      this.enemy.rage += .16;
    } else if (effect === "gingaRescueSync") {
      this.flags.nextAttackSlow = true;
    } else if (effect === "gingaAllyCover") {
      this.flags.gingaAllyCover = true;
      this.flags.nextEnemyTelegraph = true;
    } else if (effect === "lugielFlow") {
      this.adjustInterfaceGauge(-(action.gaugeReduce ?? 9));
      this.flags.stasisAssist = true;
      this.flags.speedBoost = true;
    } else if (effect === "lugielMark") {
      this.flags.stasisMarkBoost = true;
      this.flags.nextEnemyTelegraph = true;
    } else if (effect === "lugielAnchor") {
      this.flags.stasisAnchorBoost = true;
      this.flags.nextEnemyTelegraph = true;
    } else if (effect === "finaleMisuzu") {
      this.lugielFinaleBonds.add("misuzu");
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 14);
      this.flags.lightShield = true;
      this.adjustInterfaceGauge(-10);
      this.showSupportCallout("美铃", "我听见了。");
    } else if (effect === "finaleFriends") {
      this.lugielFinaleBonds.add("friends");
      this.gainEnergy(20);
      this.flags.nextAttackSlow = true;
      this.adjustInterfaceGauge(-8);
      this.showSupportCallout("健太 / 千草", "别停下来！");
    } else if (effect === "finaleTomoya") {
      this.lugielFinaleBonds.add("tomoya");
      this.flags.stasisMarkBoost = true;
      this.flags.speedBoost = true;
      this.adjustInterfaceGauge(-10);
      this.showSupportCallout("友也", "下一秒的坐标给你了。");
    } else if (effect === "finaleTaro") {
      this.lugielFinaleBonds.add("taro");
      this.flags.stasisAnchorBoost = true;
      this.flags.barrier = true;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 8);
      this.adjustInterfaceGauge(-14);
      this.showSupportCallout("泰罗", "一起向前。");
    } else if (effect === "finaleEveryone") {
      this.flags.stasisMarkBoost = true;
      this.flags.stasisAnchorBoost = true;
      this.flags.nextAttackSlow = true;
      this.flags.lightShield = true;
      this.gainEnergy(12);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 10);
      this.adjustInterfaceGauge(-12);
      this.refs.stage.classList.add("finale-all-answer");
      setTimeout(() => this.refs.stage.classList.remove("finale-all-answer"), 900);
      this.showSupportCallout("所有人的光", "我们都在这里。");
    } else if (effect === "mirrorRead") {
      this.flags.nextEnemyTelegraph = true;
      this.flags.mirrorRead = true;
    } else if (effect === "mirrorCut") {
      this.adjustInterfaceGauge(-(action.syncReduce ?? 16));
      this.enemy.rage += action.rage ?? .14;
    } else if (effect === "mirrorBait") {
      this.flags.mirrorBait = true;
      this.enemy.rage += .12;
    } else if (effect === "lugielRead") {
      this.flags.nextEnemyTelegraph = true;
      this.flags.freezeAssist = true;
    } else if (effect === "lugielFlowLegacy") {
      this.adjustInterfaceGauge(-(action.gaugeReduce ?? 12));
      this.flags.speedBoost = true;
    } else if (effect === "lugielIgnite") {
      const thawed = this.thawOneFrozenThing();
      if (thawed) {
        this.adjustInterfaceGauge(7);
        action.resultText = `${thawed}重新亮了。`;
      } else {
        this.adjustInterfaceGauge(-5);
        action.resultText = "没有结晶可解冻。黑暗火花反而暗了一点。";
      }
    } else if (effect === "mercyGuard") {
      this.flags.purifyActive = true;
      this.flags.barrier = true;
      this.flags.nextEnemyTelegraph = true;
    } else if (effect === "expose") {
      this.enemy.exposedTurns = Math.max(this.enemy.exposedTurns, action.exposedTurns ?? 1);
    }

    await this.say(`* ${action.text ?? "你做了点什么。至少看起来是。"}`);

    let resultText = action.resultText;
    if (count > 1 && action.repeatResults?.length) {
      resultText = action.repeatResults[Math.min(count - 2, action.repeatResults.length - 1)];
    }
    if (resultText) await this.say(`* ${resultText}`, 380);

    if (this.enemy.encounterMode === "cosmos_lidorias_forms") await this.maybeCosmosLidoriasCalmBeat();
    if (await this.maybeAdvanceCosmosObjective()) return this.enterPlayerMenu(false);
    if (this.enemy.encounterMode === "cosmos_chaos_darkness" && this.cosmosMiracleActive) {
      const ready = await this.maybeCosmosChaosDarknessHeartBeat();
      if (ready) return this.enterPlayerMenu(false);
    }
    await this.enemyResponse();
  }

  async useGingaLive(option) {
    if (!this.gingaBattle || !option?.liveForm) return this.enterPlayerMenu(false);
    const target = option.liveForm;

    if (this.enemy.encounterMode === "ginga_darambia" && target === "ginga" && this.phaseIndex === 0) {
      return this.enterGingaUltraLive();
    }

    this.state.set("PLAYER_ITEM");
    this.applyGingaLiveForm(target);
    this.refs.stage.classList.add("ultra-live-flash");
    this.sound?.play("phase");
    await this.say(`* ULTRALIVE — ${this.gingaFormProfile(target)?.name ?? target}.`, 420);
    this.refs.stage.classList.remove("ultra-live-flash");
    return this.enemyResponse();
  }

  async triggerGingaLiveUnlock() {
    if (!this.gingaBattle || this.phaseIndex > 0 || this.gingaLiveForced) return;
    this.gingaLiveForced = true;
    this.gingaUnlocked.add("ginga");
    this.enemy.static.value = this.enemy.static.threshold ?? 100;
    this.renderResources();
    this.setCommandsEnabled(false);
    this.refs.stage.classList.add("black-king-paralyzed");
    for (const line of this.enemy.liveUnlockText ?? []) await this.say(`* ${line}`);
    return this.enterPlayerMenu(false);
  }

  async enterGingaUltraLive() {
    if (!this.gingaBattle || this.phaseIndex > 0) return;
    this.state.set("PLAYER_ITEM");
    this.gingaLiveForced = false;
    this.phaseIndex = 1;
    this.currentPhase = this.enemy.phases?.[1] ?? this.currentPhase;
    this.enemy.plasma.value = 0;
    this.refs.stage.classList.remove("black-king-paralyzed");
    this.refs.stage.classList.add("ultra-live-flash");
    this.sound?.play("phase");

    if (this.refs.phaseBanner && this.refs.phaseTitle) {
      this.refs.phaseKicker.textContent = "ULTRALIVE";
      this.refs.phaseTitle.textContent = "ULTRAMAN GINGA";
      this.refs.phaseBanner.hidden = false;
      void this.refs.phaseBanner.offsetWidth;
      this.refs.phaseBanner.classList.add("show");
    }

    await sleep(520);
    this.applyGingaLiveForm("ginga");
    this.refs.enemyPhase.textContent = this.currentPhase?.subtitle ?? this.enemy.subtitle;
    this.refs.stage.dataset.bossPhase = "1";
    this.renderResources();
    for (const line of this.enemy.ultraLiveText ?? []) await this.say(`* ${line}`, 380);

    if (this.refs.phaseBanner) {
      this.refs.phaseBanner.classList.remove("show");
      this.refs.phaseBanner.hidden = true;
      this.refs.phaseKicker.textContent = "BOSS PHASE";
    }
    this.refs.stage.classList.remove("ultra-live-flash");
    return this.enemyResponse();
  }

  async useItem(item) {
    this.state.set("PLAYER_ITEM");
    if (item.type === "blackCrystal") return this.leoBlackCrystalFinisher(item);
    item.uses -= 1;

    if (item.type === "heal") {
      const before = this.player.hp;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.heal);
      const healed = Math.round(this.player.hp - before);
      this.renderResources();
      await this.say(`* ${item.name}恢复了 ${healed} 点 HP。`);
    } else if (item.type === "barrier") {
      this.flags.barrier = true;
      await this.say(`* ${item.name}亮了一下。`);
      await this.say("* 下一轮伤害会被挡掉一半。", 360);
    } else {
      await this.say(`* ${item.name}被用掉了。`);
    }

    if (this.enemy.encounterMode === "original_belial") {
      const line=this.belialPickBark("item");
      this.playOriginalBossPose("belial-laugh",850);
      await this.say(`* 贝利亚：“${line}”`, 420);
    }
    await this.enemyResponse();
  }

  damageEnemy(amount, impact = "normal") {
    amount = Math.max(0, Number(amount) || 0);
    if (this.originalBattle) amount = this.applyOriginalBossDamageRules(amount, impact);
    if (this.enemy.encounterMode === "original_greeza" && amount <= 0) {
      this.renderResources();
      return;
    }
    this.sound?.play("hit");
    const beforeHp = this.enemy.hp;
    this.enemy.hp = Math.max(0, this.enemy.hp - amount);
    // Thunder Darambia's opening Black King sequence is scripted to stop at 72% HP.
    // This floor must NOT leak into every Ginga encounter (it previously soft-locked Dark Lugiel at 72%).
    if (this.enemy.encounterMode === "ginga_darambia" && this.phaseIndex === 0) {
      this.enemy.hp = Math.max(this.enemy.hp, Math.ceil(this.enemy.maxHp * .72));
    }
    if (this.enemy.encounterMode === "leo_pressure" && this.phaseIndex === 0) {
      this.enemy.hp = Math.max(this.enemy.hp, Math.floor(this.enemy.maxHp * .63));
    }
    if (this.enemy.encounterMode === "leo_black_end") {
      if (!this.blackEndHostagePlayed && this.phaseIndex === 0) {
        this.enemy.hp = Math.max(this.enemy.hp, Math.floor(this.enemy.maxHp * .44));
      } else if (this.blackEndHostagePlayed && !this.blackEndCrystalUsed) {
        this.enemy.hp = Math.max(this.enemy.hp, 1);
      }
    }
    if (this.enemy.encounterMode === "cosmos_chaos_ultraman" && this.phaseIndex < 2) {
      // COPY / CORE are objective phases. HP is deliberately not a second hidden win condition.
      this.enemy.hp = beforeHp;
      amount = 0;
    }
    if (this.enemy.encounterMode === "cosmos_chaos_darkness") {
      // The entire final encounter is about proving that damage is not the answer.
      // Before Miracle Luna, hits are recorded only as failed approaches; after it, attacking hurts HEART.
      this.enemy.hp = beforeHp;
      if (this.cosmosMiracleActive && amount > 0) {
        this.adjustInterfaceGauge(-5);
        this.refs.stage.classList.add("cosmos-heart-recoil");
        setTimeout(() => this.refs.stage.classList.remove("cosmos-heart-recoil"), 520);
      }
      amount = 0;
    }
    if (["nexus_mephisto_one_himeya", "nexus_mephisto_zwei", "nexus_dark_zagi_bond"].includes(this.enemy.encounterMode)) {
      // Keep a heavy hit from skipping story forms, but land ON/BELOW the phase gate.
      // Using Math.ceil here produced ratios slightly above thresholds such as .58/.76,
      // so maybeAdvancePhase() never fired and every later hit displayed -0.
      const nextPhase = this.enemy.phases?.[this.phaseIndex + 1];
      if (nextPhase) {
        const gateHp = Math.max(1, Math.floor(this.enemy.maxHp * nextPhase.threshold));
        this.enemy.hp = Math.max(this.enemy.hp, gateHp);
      }
    }
    if (this.originalBattle) {
      // Original bosses use phase-specific combat languages. A high-damage finisher
      // must not skip an entire body/form phase before it can actually appear.
      const nextPhase = this.enemy.phases?.[this.phaseIndex + 1];
      if (nextPhase) {
        const gateHp = Math.max(1, Math.floor(this.enemy.maxHp * nextPhase.threshold));
        this.enemy.hp = Math.max(this.enemy.hp, gateHp);
      }
    }
    const actualDamage = Math.max(0, beforeHp - this.enemy.hp);
    if (actualDamage > 0 && this.mercyRouteEnabled()) {
      this.adjustMercy(-(this.enemy.mercy?.damagePenalty ?? 0));
    }
    if (actualDamage > 0) this.recoverLifeFromDamage(actualDamage);
    if (actualDamage > 0 && this.originalBattle) this.gainOriginalAdapt(Math.max(1, actualDamage * .24), "deal");
    this.renderResources();

    const sprite = this.refs.enemySprite;
    sprite.classList.remove("hit", "heavy-hit");
    this.refs.stage.classList.remove("impact-medium", "impact-heavy");
    void sprite.offsetWidth;

    sprite.classList.add(impact === "heavy" ? "heavy-hit" : "hit");
    if (impact === "medium" || impact === "heavy") {
      this.refs.stage.classList.add(impact === "heavy" ? "impact-heavy" : "impact-medium");
    }

    setTimeout(() => {
      sprite.classList.remove("hit", "heavy-hit");
      this.refs.stage.classList.remove("impact-medium", "impact-heavy");
    }, impact === "heavy" ? 620 : 420);

    this.refs.damagePop.textContent = `-${Math.round(actualDamage)}`;
    this.refs.damagePop.classList.remove("show", "heavy");
    if (impact === "heavy") this.refs.damagePop.classList.add("heavy");
    void this.refs.damagePop.offsetWidth;
    this.refs.damagePop.classList.add("show");
  }

  damagePlayer(amount) {
    if (!this.state.is("ENEMY_ATTACK") || this.player.hp <= 0) return;

    if (this.enemy.encounterMode === "nexus_mephisto_one_himeya" && this.himeyaOneHpLocked && !this.himeyaNightRaiderRestored) {
      this.sound?.play("hurt");
      this.player.hp = 1;
      this.renderResources();
      this.refs.stage.classList.remove("player-hit", "himeya-one-hp-hit");
      void this.refs.stage.offsetWidth;
      this.refs.stage.classList.add("player-hit", "himeya-one-hp-hit");
      return;
    }

    let reduction = this.flags.barrier ? .5 : 1;
    if (this.originalBattle) reduction *= this.originalFormProfile()?.incomingMultiplier ?? 1;
    if (this.flags.lightShield) reduction *= .78;
    if (this.flags.cosmosGuard) reduction *= .70;
    if (this.tigaGatanothorFinaleActive()) reduction *= .48;
    if (this.lugielFinaleSupportActive && this.enemy.encounterMode === "ginga_lugiel_future" && this.phaseIndex >= 2) reduction *= .88;
    const finalDamage = Math.max(1, Math.round(amount * reduction));

    this.sound?.play("hurt");
    this.player.hp = Math.max(0, this.player.hp - finalDamage);
    if (this.enemy.encounterMode === "original_belial" && this.player.hp > 0 && performance.now() >= (this.belialHitBarkCooldownUntil ?? 0)) {
      this.belialHitBarkCooldownUntil=performance.now()+1450;
      this.showBelialBark(this.belialPickBark("playerHit"),1180,(this.turn%2)?"belial-laugh":"belial-point");
    }
    if (this.originalBattle) this.gainOriginalAdapt(Math.max(1, finalDamage * .72), "receive");
    if (this.player.hp <= 0 && this.lugielFinaleRevivalEligible() && !this.lugielFinaleReviving) {
      this.renderResources();
      this.refs.stage.classList.remove("player-hit");
      void this.refs.stage.offsetWidth;
      this.refs.stage.classList.add("player-hit");
      this.bullets.stop();
      void this.gingaLugielReviveFromDefeat();
      return;
    }
    if (this.enemy.plasma && this.gingaBattle && this.phaseIndex > 0 && !this.flags.gingaHoldCharge && (this.enemy.plasma?.value ?? 0) > 0) {
      this.adjustPlasma(-1);
    }
    if (this.mercyRouteEnabled()) {
      this.adjustMercy(-(this.enemy.mercy?.hitPenalty ?? 0));
    }
    this.renderResources();

    this.refs.stage.classList.remove("player-hit");
    void this.refs.stage.offsetWidth;
    this.refs.stage.classList.add("player-hit");

    if (this.player.hp <= 0) {
      this.bullets.stop();
      this.defeat();
    }
  }

  showLeoCinematic(step, title = "", subtitle = "") {
    const panel = this.refs.leoCinematic;
    if (!panel) return;
    panel.hidden = false;
    panel.dataset.step = step;
    if (this.refs.leoCineTitle) this.refs.leoCineTitle.textContent = title;
    if (this.refs.leoCineSubtitle) this.refs.leoCineSubtitle.textContent = subtitle;
  }

  hideLeoCinematic() {
    if (!this.refs.leoCinematic) return;
    this.refs.leoCinematic.classList.add("leave");
    setTimeout(() => {
      if (!this.refs.leoCinematic) return;
      this.refs.leoCinematic.hidden = true;
      this.refs.leoCinematic.classList.remove("leave", "leo-hit", "leo-success", "leo-crystal-taken");
      this.refs.leoCinematic.dataset.step = "";
      if (this.refs.leoCineTitle) this.refs.leoCineTitle.textContent = "";
      if (this.refs.leoCineSubtitle) this.refs.leoCineSubtitle.textContent = "";
    }, 420);
  }

  waitForLeoAlternatingRun(target = 16) {
    return new Promise((resolve) => {
      let count = 0;
      let expected = "left";
      const panel = this.refs.leoCinematic;
      const update = () => {
        const ratio = count / target;
        panel?.style.setProperty("--leo-run-progress", String(ratio));
        if (this.refs.leoCineTitle) this.refs.leoCineTitle.textContent = expected === "left" ? "←" : "→";
        if (this.refs.leoCineSubtitle) this.refs.leoCineSubtitle.textContent = "交替按 A / D 或 ← / → · 靠自己的脚继续跑";
      };
      const cleanup = () => { window.removeEventListener("keydown", onKey, true); this._leoSequenceCleanup = null; };
      const onKey = (event) => {
        if (event.repeat) return;
        const key = String(event.key ?? "").toLowerCase();
        const dir = ["a", "arrowleft"].includes(key) ? "left" : ["d", "arrowright"].includes(key) ? "right" : null;
        if (!dir) return;
        event.preventDefault(); event.stopPropagation();
        if (dir !== expected) {
          panel?.classList.remove("leo-hit"); void panel?.offsetWidth; panel?.classList.add("leo-hit");
          return;
        }
        count += 1;
        expected = expected === "left" ? "right" : "left";
        panel?.classList.remove("leo-success"); void panel?.offsetWidth; panel?.classList.add("leo-success");
        this.sound?.play("select");
        update();
        if (count >= target) { cleanup(); resolve(count); }
      };
      this._leoSequenceCleanup?.();
      this._leoSequenceCleanup = cleanup;
      update();
      window.addEventListener("keydown", onKey, true);
    });
  }

  async leoBlackEndPrelude() {
    if (this.leoPreludePlayed) return;
    this.leoPreludePlayed = true;
    this.inputLocked = true;
    this.showLeoCinematic("toru-run", "←", "交替按 A / D 或 ← / → · 左脚，右脚，别停");
    await sleep(700);
    await this.waitForLeoAlternatingRun(16);
    if (this.refs.leoCineTitle) this.refs.leoCineTitle.textContent = "往后的路，需要他自己来跑。";
    if (this.refs.leoCineSubtitle) this.refs.leoCineSubtitle.textContent = "摔倒以后，再站起来。";
    await sleep(1900);
    this.hideLeoCinematic();
    await sleep(520);
    await this.storyBeat("凤源", "托奥尔。接下来不管看见什么，都别停下。", 1250, "leo-warm");
    await this.storyBeat("托奥尔", "源哥哥……？", 1100, "leo-warm");
    await this.storyBeat("凤源", "有件事，我一直没有告诉你。", 1300, "leo-red");
    this.refs.stage.classList.add("leo-transform-flash");
    this.sound?.play("phase");
    await sleep(900);
    this.hideStoryCinematic();
    this.refs.stage.classList.remove("leo-transform-flash");
    this.inputLocked = false;
  }

  async leoPressureShrinkCinematic() {
    this.inputLocked = true;
    this.bullets.stop();
    this.refs.stage.classList.add("pressure-shrink-cinematic");
    await this.storyBeat("", "杖尖在空中划了一个小得过分的圆。", 1000, "pressure");
    await this.storyBeat("", "雷欧身后的楼房没有变大。", 900, "pressure");
    await this.storyBeat("", "变小的是雷欧。", 1250, "pressure-red");
    this.refs.stage.dataset.pressureShrunk = "true";
    this.enemy.interfaceGauge.value = 100;
    this.renderResources();
    await sleep(900);
    await this.storyBeat("", "脚边的一块碎石，现在比胸口还高。", 1250, "pressure");
    this.hideStoryCinematic();
    this.refs.stage.classList.remove("pressure-shrink-cinematic");
    this.refs.enemyPhase.textContent = this.currentPhase?.subtitle ?? "微小化 · 巨物世界";
    this.inputLocked = false;
  }

  async leoPressureKingCinematic() {
    if (this.pressureRestored) return false;
    this.pressureRestored = true;
    this.inputLocked = true;
    this.bullets.stop();
    this.showLeoCinematic("pressure-king", "", "");
    await this.storyBeat("", "气球在高处破开。微小的雷欧又一次落回地面。", 1250, "pressure");
    await this.storyBeat("", "雷声没有从普雷夏的杖里传来。", 1350, "pressure-king");
    await sleep(650);
    this.sound?.play("phase");
    this.showLeoCinematic("pressure-hammer", "KING HAMMER", "");
    await sleep(1250);
    this.refs.stage.dataset.pressureShrunk = "false";
    this.refs.stage.dataset.pressureMantle = "true";
    this.enemy.interfaceGauge.value = 0;
    this.phaseIndex = 2;
    this.currentPhase = this.enemy.phases?.[2] ?? this.currentPhase;
    this.refs.stage.dataset.bossPhase = "2";
    this.refs.enemyPhase.textContent = this.currentPhase?.subtitle ?? "Ultra Mantle · 魔法反射";
    this.renderResources();
    await this.storyBeat("", "小槌落下。世界恢复了原来的大小。", 1250, "pressure-king");
    await this.storyBeat("", "银色披风随后落到雷欧肩上。", 1350, "pressure-king");
    await this.storyBeat("", "普雷夏再次举杖。这一次，魔法有了可以回去的方向。", 1350, "pressure-king");
    this.hideStoryCinematic();
    this.hideLeoCinematic();
    if (this.refs.phaseBanner && this.refs.phaseTitle) {
      this.refs.phaseKicker.textContent = "BOSS PHASE";
      this.refs.phaseTitle.textContent = "KING HAMMER";
      this.refs.phaseBanner.hidden = false;
      void this.refs.phaseBanner.offsetWidth;
      this.refs.phaseBanner.classList.add("show");
      await sleep(950);
      this.refs.phaseBanner.classList.remove("show"); this.refs.phaseBanner.hidden = true;
    }
    this.inputLocked = false;
    return this.enterPlayerMenu(false);
  }

  waitForLeoChildrenSequence(target = 6) {
    return new Promise((resolve) => {
      const gazeOrder = ["left", "up", "right", "down", "right", "left", "down", "up", "left", "right"];
      const opposite = { left:"right", right:"left", up:"down", down:"up" };
      const gazeGlyph = { left:"◀", right:"▶", up:"▲", down:"▼" };
      const keys = { arrowleft:"left", a:"left", arrowup:"up", w:"up", arrowright:"right", d:"right", arrowdown:"down", s:"down" };
      let progress = 0;
      let gazeIndex = 0;
      const panel = this.refs.leoCinematic;
      const children = [...(panel?.querySelectorAll(".leo-child-node") ?? [])];
      const beats = [
        "别让他同时看见所有人。",
        "再近一点。",
        "托奥尔在等他松手。"
      ];

      const update = (message = "看他的视线。绕到背后。") => {
        const gaze = gazeOrder[gazeIndex % gazeOrder.length];
        panel?.style.setProperty("--leo-child-progress", String(progress / Math.max(1,target)));
        if (panel) panel.dataset.gaze = gaze;
        children.forEach((node, i) => node.classList.toggle("active", i < progress));
        if (this.refs.leoCineTitle) this.refs.leoCineTitle.textContent = `视线 ${gazeGlyph[gaze]}`;
        if (this.refs.leoCineSubtitle) this.refs.leoCineSubtitle.textContent = `${message} · WASD / 方向键`;
      };

      const cleanup = () => {
        window.removeEventListener("keydown", onKey, true);
        this._leoSequenceCleanup = null;
      };

      const onKey = (event) => {
        if (event.repeat) return;
        const dir = keys[String(event.key ?? "").toLowerCase()];
        if (!dir) return;
        event.preventDefault(); event.stopPropagation();

        const gaze = gazeOrder[gazeIndex % gazeOrder.length];
        const expected = opposite[gaze];
        if (dir !== expected) {
          progress = Math.max(0, progress - 1);
          gazeIndex += 2;
          panel?.classList.remove("leo-hit"); void panel?.offsetWidth; panel?.classList.add("leo-hit");
          this.sound?.play("hurt");
          update("他转过来了。退回阴影，再找盲区。");
          return;
        }

        progress += 1;
        gazeIndex += 1 + (progress % 2);
        panel?.classList.remove("leo-success"); void panel?.offsetWidth; panel?.classList.add("leo-success");
        this.sound?.play("select");
        const beat = progress >= target ? "已经围住他了。别急。" : progress >= 4 ? beats[2] : progress >= 2 ? beats[1] : beats[0];
        update(beat);
        if (progress >= target) { cleanup(); resolve(progress); }
      };

      this._leoSequenceCleanup?.();
      this._leoSequenceCleanup = cleanup;
      update();
      window.addEventListener("keydown", onKey, true);
    });
  }

  waitForLeoTimingPress(timeoutMs = 850) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        window.removeEventListener("keydown", onKey, true);
        this._leoSequenceCleanup = null;
        resolve(value);
      };
      const onKey = (event) => {
        const key = String(event.key ?? "").toLowerCase();
        if (event.repeat || !["z", "enter", " "].includes(key)) return;
        event.preventDefault(); event.stopPropagation();
        finish(true);
      };
      const timer = setTimeout(() => finish(false), timeoutMs);
      this._leoSequenceCleanup?.();
      this._leoSequenceCleanup = () => finish(false);
      window.addEventListener("keydown", onKey, true);
    });
  }

  async waitForLeoCrystalOpening() {
    const panel = this.refs.leoCinematic;
    let attempts = 0;
    while (true) {
      attempts += 1;
      panel?.classList.remove("leo-crystal-opening");
      if (this.refs.leoCineTitle) this.refs.leoCineTitle.textContent = attempts === 1 ? "老实一点！" : "再等一次。";
      if (this.refs.leoCineSubtitle) this.refs.leoCineSubtitle.textContent = "他在来回盯着孩子们。等握水晶的手真正松开。";
      await sleep(720 + Math.min(420, attempts * 90));

      // A brief feint keeps this from becoming a second mash sequence.
      if (attempts === 1) {
        panel?.classList.add("leo-crystal-feint");
        await sleep(260);
        panel?.classList.remove("leo-crystal-feint");
        await sleep(420);
      }

      panel?.classList.add("leo-crystal-opening");
      this.sound?.play("guard");
      if (this.refs.leoCineTitle) this.refs.leoCineTitle.textContent = "现在。";
      if (this.refs.leoCineSubtitle) this.refs.leoCineSubtitle.textContent = "Z / ENTER / SPACE";
      const caught = await this.waitForLeoTimingPress(attempts > 2 ? 1080 : 860);
      panel?.classList.remove("leo-crystal-opening");
      if (caught) return true;

      panel?.classList.remove("leo-hit"); void panel?.offsetWidth; panel?.classList.add("leo-hit");
      if (this.refs.leoCineTitle) this.refs.leoCineTitle.textContent = "攥紧了。";
      if (this.refs.leoCineSubtitle) this.refs.leoCineSubtitle.textContent = "孩子们还围着他。再制造一次空隙。";
      await sleep(620);
    }
  }

  async leoBlackEndHostageCinematic() {
    if (this.blackEndHostagePlayed) return false;
    this.blackEndHostagePlayed = true;
    this.inputLocked = true;
    this.bullets.stop();
    this.refs.stage.dataset.blackEndHostage = "true";
    this.showLeoCinematic("hostage", "", "");
    await this.storyBeat("", "布莱克恩多后退了半步。远处的黑色水晶却忽然亮起来。", 1250, "leo-red");
    await this.storyBeat("", "布莱克指挥官没有命令怪兽继续进攻。", 1050, "leo-red");
    await this.storyBeat("", "他抓住了托奥尔。", 1300, "leo-red");
    await this.storyBeat("布莱克指挥官", "别动！雷欧，否则我就杀了他们！", 1150, "leo-red");
    this.refs.stage.classList.add("leo-forced-stop");
    await this.storyBeat("", "雷欧停下，巨角和火焰却没有停止宣泄。", 1300, "leo-red");

    const heldHp = this.player.hp;
    for (const ratio of [.84, .70, .58]) {
      this.refs.stage.classList.remove("black-end-punish-hit");
      void this.refs.stage.offsetWidth;
      this.refs.stage.classList.add("black-end-punish-hit");
      this.sound?.play("hurt");
      this.player.hp = Math.max(1, Math.round(heldHp * ratio));
      this.renderResources();
      await sleep(420);
    }
    this.refs.stage.classList.remove("black-end-punish-hit");
    await this.storySilence(750, "leo-red");
    await this.storyBeat("", "托奥尔抬头看了一眼雷欧。", 1050, "leo-warm");
    await this.storyBeat("", "然后，他没有再等。", 1350, "leo-warm");
    this.hideStoryCinematic();

    this.showLeoCinematic("children", "看他的视线。", "不要照着提示走。绕到他看不见的方向。 · WASD / 方向键");
    await this.waitForLeoChildrenSequence(this.config.arena.childSequenceSuccesses ?? 6);
    await sleep(420);
    if (this.refs.leoCineTitle) this.refs.leoCineTitle.textContent = "大家包围了它。";
    if (this.refs.leoCineSubtitle) this.refs.leoCineSubtitle.textContent = "没有人冲上去。孩子们只是从不同方向一起出声，让他不得不回头。";
    this.refs.leoCinematic?.classList.add("leo-children-distract");
    this.sound?.play("select");
    await sleep(980);
    if (this.refs.leoCineSubtitle) this.refs.leoCineSubtitle.textContent = "布莱克指挥官的开始来不及盯住所有人了，而托奥尔只看着握水晶的那只手。";
    await sleep(920);
    await this.waitForLeoCrystalOpening();
    this.refs.leoCinematic?.classList.remove("leo-children-distract");
    this.refs.leoCinematic?.classList.add("leo-crystal-taken");
    this.sound?.play("guard");
    await sleep(520);
    if (this.refs.leoCineTitle) this.refs.leoCineTitle.textContent = "托奥尔动了。";
    if (this.refs.leoCineSubtitle) this.refs.leoCineSubtitle.textContent = "他抓住了那一瞬间。";
    await sleep(950);
    if (this.refs.leoCineTitle) this.refs.leoCineTitle.textContent = "黑色水晶。";
    if (this.refs.leoCineSubtitle) this.refs.leoCineSubtitle.textContent = "孩子们为雷欧抢回了选择的机会。。";
    await sleep(1350);
    this.hideLeoCinematic();
    this.refs.stage.classList.remove("leo-forced-stop");
    this.refs.stage.dataset.blackEndHostage = "false";

    this.phaseIndex = 2;
    this.currentPhase = this.enemy.phases?.[2] ?? this.currentPhase;
    this.refs.stage.dataset.bossPhase = "2";
    this.refs.enemyPhase.textContent = this.currentPhase?.subtitle ?? "命令断开";
    this.enemy.formation.value = 62;
    this.blackEndHornBroken = false;
    this.refs.stage.classList.remove("black-end-horns-broken");
    this.enemy.hp = Math.max(1, Math.min(this.enemy.hp, Math.ceil(this.enemy.maxHp * .36)));
    this.refs.stage.classList.add("black-end-unbound");
    this.enemy.rage = Math.max(this.enemy.rage, .72);
    const exists = (this.player.items ?? []).some((item) => item.type === "blackCrystal" && (item.uses ?? 0) > 0);
    if (!exists) {
      this.player.items ??= [];
      this.player.items.unshift({ id:"black-crystal", name:"黑色水晶", type:"blackCrystal", uses:1, description:"托奥尔从布莱克指挥官手中抢下的水晶。折断布莱克恩多的护角后，就能把这颗水晶送回去。" });
    }
    this.blackEndCrystalReady = true;
    this.renderResources();
    if (this.refs.phaseBanner && this.refs.phaseTitle) {
      this.refs.phaseTitle.textContent = "水晶";
      this.refs.phaseBanner.hidden = false; void this.refs.phaseBanner.offsetWidth; this.refs.phaseBanner.classList.add("show");
      await sleep(900); this.refs.phaseBanner.classList.remove("show"); this.refs.phaseBanner.hidden = true;
    }
    await this.say("* 水晶到了雷欧手里。布莱克恩多却没有停下。", 560);
    await this.say("* 它失去了命令，也失去了最后一点节制。", 650);
    await this.say("* 先折断它最后的护角，再把水晶送进去。", 620);
    this.inputLocked = false;
    return this.enterPlayerMenu(false);
  }

  async leoBlackCrystalFinisher(item) {
    if (this.enemy.encounterMode !== "leo_black_end" || !this.blackEndCrystalReady) return this.enterPlayerMenu(false);
    const guard = this.enemy.formation?.value ?? 100;
    if (!this.blackEndHornBroken && guard > 2) {
      this.state.set("PLAYER_ITEM");
      this.inputLocked = true;
      await this.say("* 还不行。布莱克恩多仍用巨角封着投掷路线。", 560);
      this.inputLocked = false;
      return this.enterPlayerMenu(false);
    }
    // Once the horns are visibly broken, do not hide another HP requirement behind the item.
    // The TV ending is about the opening created by the children and the crystal itself, not an arbitrary 12% HP gate.
    this.blackEndHornBroken = true;
    if (this.enemy.formation) this.enemy.formation.value = 0;
    this.refs.stage.classList.add("black-end-horns-broken");
    item.uses = 0;
    this.blackEndCrystalUsed = true;
    this.state.set("PLAYER_ITEM");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    await this.say("* 托奥尔抢来的水晶在雷欧掌心里亮了一下。", 620);
    await this.say("* 布莱克恩多把最后一对巨角压到最低。", 620);
    await this.say("* 雷欧没有后退。他迎着最后一次冲撞，把水晶掷了出去。", 760);
    this.refs.stage.classList.add("black-end-final-charge", "black-crystal-throw");
    this.sound?.play("phase");
    await sleep(1150);
    this.refs.stage.classList.remove("black-end-final-charge");
    this.enemy.hp = 0;
    this.renderResources();
    return this.leoBlackEndVictory();
  }

  async leoGirasVictory() {
    this.state.set("VICTORY"); this.inputLocked = true; this.setCommandsEnabled(false); this.bullets.stop(); this.setFrameMode("dialogue");
    this.refs.enemySprite.classList.add("giras-defeated");
    await this.say("* 回旋飞踢切开了最后一次 Giras Spin。", 620);
    await this.say("* 红与黑同时倒下。海潮失去了源头。", 700);
    this.refs.enemySprite.classList.add("magma-retreat");
    await this.say("* 马格马星人看了一眼倒下的双子怪兽。", 620);
    await this.say("* 它没有留下来。佩剑一收，身影消失在海雾里。", 760);
    this.refs.enemySprite.classList.add("dead");
    this.refs.dialogueText.textContent = "VICTORY"; this.refs.dialogueText.style.fontSize = "34px"; this.refs.dialogueText.style.fontWeight = "900"; this.refs.continueHint.style.opacity = "0";
    this.sound?.play("victory"); this.emitResult("victory");
  }

  async leoPressureVictory() {
    this.state.set("VICTORY"); this.inputLocked = true; this.setCommandsEnabled(false); this.bullets.stop(); this.setFrameMode("dialogue");
    this.refs.stage.classList.add("pressure-finish");
    await this.say("* 普雷夏把最后一道魔法推向雷欧。", 620);
    await this.say("* 银色披风张开。魔法在半空折返。", 700);
    await this.say("* 雷欧和奥特之王同时出手。两道光从不同方向落下。", 780);
    this.refs.enemySprite.classList.add("dead");
    await sleep(700);
    this.refs.dialogueText.textContent = "VICTORY"; this.refs.dialogueText.style.fontSize = "34px"; this.refs.dialogueText.style.fontWeight = "900"; this.refs.continueHint.style.opacity = "0";
    this.sound?.play("victory"); this.emitResult("victory");
  }

  async leoBlackEndVictory() {
    if (this.state.is("VICTORY")) return;
    this.state.set("VICTORY"); this.inputLocked = true; this.setCommandsEnabled(false); this.bullets.stop(); this.setFrameMode("dialogue");
    this.refs.enemySprite.classList.add("black-end-crystal-hit");
    await this.say("* 水晶没入布莱克恩多体内。它第一次失去了布莱克指挥官的方向。", 720);
    this.refs.enemySprite.classList.add("dead");
    await this.say("* 最后的圆盘生物崩塌了。", 620);
    this.refs.stage.classList.add("black-star-approach");
    await this.storyBeat("", "天空没有立刻放晴。黑色的星体正在逼近地球。", 1350, "leo-red");
    await this.storyBeat("", "雷欧抬手。最后一道射击光束穿过云层。", 1250, "leo-red");
    this.refs.stage.classList.add("leo-shooting-beam");
    this.sound?.play("phase");
    await sleep(1100);
    await this.storyBeat("", "黑星在远处碎开。", 1100, "leo-warm");
    this.hideStoryCinematic();
    this.refs.stage.classList.remove("black-star-approach", "leo-shooting-beam");
    this.sound?.stopMusic?.(1150);
    await sleep(650);
    this.sound?.playMusic?.("leo_departure_ending", { volume: .28, loop: false, fadeInMs: 2600, fadeOutMs: 0 });

    this.showLeoCinematic("departure", "", "");
    await sleep(900);
    await this.storyBeat("", "后来，凤源没有再把托奥尔带去训练。", 1350, "leo-warm");
    await this.storyBeat("", "那个孩子已经知道，摔倒以后该怎么站起来。", 1450, "leo-warm");
    await this.storyBeat("托奥尔", "源哥哥，你还会回来吗？", 1250, "leo-warm");
    await this.storyBeat("凤源", "会吧。这里已经不是我借住的星球了。", 1450, "leo-warm");
    await this.storyBeat("凤源", "这里是我的故乡。", 1550, "leo-dawn");
    await this.storySilence(1700, "leo-dawn");
    this.hideStoryCinematic();
    this.showLeoCinematic("departure", "再见，雷欧。", "不是因为地球再也不需要英雄，而是因为这里的人已经学会自己向前。 ");
    await sleep(2200);
    this.hideLeoCinematic();
    this.refs.dialogueText.textContent = "向太阳出发";
    this.refs.dialogueText.style.fontSize = "30px"; this.refs.dialogueText.style.fontWeight = "900"; this.refs.continueHint.style.opacity = "0";
    this.sound?.play("victory"); this.emitResult("victory");
  }

  misuzuMemoryProfile(memoryId) {
    return ({
      childhood: { title:"小时候", line:"很久以前，两个人还不知道未来会走到哪里。至少那时，回头总能看见对方。" },
      shrine: { title:"银河神社", line:"那个秘密最先告诉了美铃，光不是从天上落下以后才开始的。" },
      dream: { title:"各自的梦想", line:"一个想去更远的地方，一个想做出能让重要的人露出笑容的点心。" },
      together: { title:"并肩作战", line:"美玲不止一次的站在小光的前面，对光来说，她绝对不是什么只会躲在别人背后的弱者" }
    })[memoryId] ?? { title:"记忆", line:"被黑暗压住的东西重新有了声音。" };
  }

  showMisuzuMemoryEcho(memoryId, firstTime = true) {
    const box = this.refs.misuzuMemoryEcho;
    if (!box) return;
    const profile = this.misuzuMemoryProfile(memoryId);
    if (this.refs.misuzuMemoryTitle) this.refs.misuzuMemoryTitle.textContent = profile.title;
    if (this.refs.misuzuMemoryLine) this.refs.misuzuMemoryLine.textContent = firstTime ? profile.line : "这段记忆已经回应过一次。它仍然没有被黑暗抹掉。";
    box.hidden = false;
    box.classList.remove("show");
    void box.offsetWidth;
    box.classList.add("show");
    this.refs.stage.classList.remove("misuzu-memory-pulse");
    void this.refs.stage.offsetWidth;
    this.refs.stage.classList.add("misuzu-memory-pulse");
    const timer = setTimeout(() => { box.classList.remove("show"); box.hidden = true; }, 1950);
    this.gingaMisuzuEchoTimers.push(timer);
  }

  setMisuzuBondStep(step) {
    const vision = this.refs.misuzuBondVision;
    if (!vision) return;
    vision.hidden = false;
    vision.dataset.step = step ?? "";
  }

  hideMisuzuBondVision() {
    if (!this.refs.misuzuBondVision) return;
    this.refs.misuzuBondVision.hidden = true;
    this.refs.misuzuBondVision.dataset.step = "";
  }

  async gingaMisuzuAwakeningCinematic() {
    if (this.gingaMisuzuDialoguePlayed) return;
    this.gingaMisuzuDialoguePlayed = true;
    this.state.set("CUTSCENE");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.setFrameMode("dialogue");
    this.bullets.stop();

    await this.sound?.playMusic?.("ginga_misuzu_dialogue", { volume:.25, fadeInMs:2600, fadeOutMs:1900 });
    this.refs.storyCinematic.hidden = false;
    this.refs.storyCinematic.dataset.mood = "misuzu-bond";
    this.setMisuzuBondStep("approach");
    await this.storySilence(1100, "misuzu-bond");
    await this.storyBeat("礼堂光", "美铃！！", 2550, "misuzu-bond");

    this.setMisuzuBondStep("memories");
    await this.storyBeat("美铃", "不要过来！不要看我！现在的我……已经变得污秽不堪了……", 3050, "misuzu-bond");
    await this.storyBeat("美铃", "爸爸他……做了坏事……我也实体化成了怪兽，去伤害了大家……我已经没有资格再去谈论梦想了……我的未来，已经是一片漆黑了！！", 3650, "misuzu-bond");
    await this.storySilence(950, "misuzu-bond");
    await this.storyBeat("礼堂光", "怎么会呢？美铃就是美铃啊。不管你变成什么样，你依然是那个美铃。", 2450, "misuzu-bond");
    await this.storyBeat("礼堂光", "未来是一片漆黑？那就由我来把它变成白纸！", 2850, "misuzu-bond");
    await this.storyBeat("美铃", "诶……？", 2250, "misuzu-bond");
    await this.storyBeat("礼堂光", "因为未来现在还什么都没有啊！正因为是一片空白，我们才可以用自己的双手，去描绘任何我们想要的蓝图！不管你想画什么都可以！", 2350, "misuzu-bond");
    await this.storySilence(900, "misuzu-bond");
    await this.storyBeat("美铃", "任何……蓝图都可以吗？可是我……", 2150, "misuzu-bond");

    this.setMisuzuBondStep("reach");
    await this.storyBeat("礼堂光", "对！别忘了，我们不是约定好了吗？我们要一起去实现梦想，一起去环游世界啊！我绝对不会把你一个人丢下的。所以，美铃……跟我一起走吧！", 2950, "misuzu-bond");
    await this.storyBeat("美铃", "（美铃看着小光伸出的手，想起了两人从小到大的羁绊，以及降星小学的大家，眼泪夺眶而出。她终于伸出手，紧紧抓住了小光的手。）\n “小光——！！”", 2600, "misuzu-bond");
    await sleep(720);

    this.setMisuzuBondStep("break");
    this.sound?.playHopeSpark?.();
    await sleep(1250);
    this.setMisuzuBondStep("return");
    await this.storyBeat("", "两个人之间的纽带从未被任何东西影响。", 3200, "misuzu-bond");
    await sleep(650);

    this.hideMisuzuBondVision();
    this.hideStoryCinematic();
    await sleep(560);
    await this.sound?.playMusic?.("ginga_grand_king_release", { volume:.15, fadeInMs:2600, fadeOutMs:1800 });
  }

  gingaFutureAnchorLabels() {
    const preferred = [
      ["black-king", "BLACK KING"],
      ["thunder-darambia", "THUNDER DARAMBIA"],
      ["grand-king", "GRAND KING"]
    ];
    const unlocked = preferred.filter(([key]) => this.gingaUnlocked.has(key));
    const source = unlocked.length >= 3 ? unlocked : preferred;
    return source.map(([id, label]) => ({ id, label }));
  }

  async enterSuperGrandKingReleasePhase() {
    if (this.enemy.encounterMode !== "ginga_super_grand_king" || this.phaseIndex > 0) return false;
    await this.gingaMisuzuAwakeningCinematic();
    this.phaseIndex = 1;
    this.currentPhase = this.enemy.phases?.[1] ?? null;
    this.flags.gingaMindDive = false;
    this.flags.gingaDeepDive = false;
    this.flags.gingaAllyCover = false;
    this.flags.nextEnemyTelegraph = false;
    this.flags.barrier = false;
    this.sound?.play("phase");
    this.refs.stage.dataset.bossPhase = "1";
    this.refs.stage.classList.add("rescue-break", "phase-flash", "ally-volley-flash");
    this.refs.enemySprite.classList.add("phase-shift", "armor-cracked");
    this.showSupportCallout("伙伴们", "美铃出来了——现在一起把装甲拆掉！", 1350);
    this.refs.enemyPhase.textContent = this.currentPhase?.subtitle ?? this.enemy.subtitle ?? "";
    if (this.refs.phaseBanner && this.refs.phaseTitle) {
      this.refs.phaseTitle.textContent = this.currentPhase?.title ?? "DARKNESS AND LIGHT";
      this.refs.phaseBanner.hidden = false;
      this.refs.phaseBanner.classList.remove("show");
      void this.refs.phaseBanner.offsetWidth;
      this.refs.phaseBanner.classList.add("show");
    }
    await sleep(900);
    if (this.refs.phaseBanner) { this.refs.phaseBanner.classList.remove("show"); this.refs.phaseBanner.hidden = true; }
    this.refs.stage.classList.remove("phase-flash");
    this.refs.enemySprite.classList.remove("phase-shift");
    for (const line of this.currentPhase?.text ?? []) await this.say(`* ${line}`, 430);
    this.renderResources();
    return this.enemyResponse();
  }


  cosmosFormLabel(form) {
    return ({ luna:"月神模式", corona:"日冕模式", eclipse:"日蚀模式", "miracle-luna":"奇迹月神模式" })[form] ?? form;
  }

  applyCosmosForm(form, announce = true) {
    if (!this.cosmosBattle) return;
    this.cosmosForm = form;
    this.player.form = this.cosmosFormLabel(form);
    this.player.attack = ({ luna:24, corona:34, eclipse:31, "miracle-luna":27 })[form] ?? 25;
    this.refs.stage.dataset.cosmosForm = form;
    if (this.refs.playerForm) this.refs.playerForm.textContent = this.player.form;
    this.refs.stage.classList.remove("cosmos-form-luna","cosmos-form-corona","cosmos-form-eclipse","cosmos-form-miracle");
    this.refs.stage.classList.add(form === "miracle-luna" ? "cosmos-form-miracle" : `cosmos-form-${form}`);
    if (announce) this.sound?.play("phase");
  }

  updateCosmosObjectiveHud() {
    if (!this.refs?.stage) return;
    if (!this.cosmosBattle) {
      delete this.refs.stage.dataset.cosmosObjective;
      return;
    }
    const mode = this.enemy.encounterMode;
    if (mode === "cosmos_chaos_ultraman") {
      if (this.phaseIndex === 0) {
        this.refs.stage.dataset.cosmosObjective = "copy";
        if (this.refs.enemyPhase) this.refs.enemyPhase.textContent = "HP 暂停 · 先让 COPY 降到 0%";
      } else if (this.phaseIndex === 1) {
        this.refs.stage.dataset.cosmosObjective = "core";
        const remain = Math.round(this.enemy.interfaceGauge?.value ?? 3);
        if (this.refs.enemyPhase) this.refs.enemyPhase.textContent = `HP 暂停 · COPY CORE 剩余 ${remain} / 3`;
      } else {
        this.refs.stage.dataset.cosmosObjective = "calamity";
        if (this.refs.enemyPhase) this.refs.enemyPhase.textContent = this.currentPhase?.subtitle ?? "卡俄斯奥特曼卡拉米提 · 正面对决";
      }
      return;
    }
    if (mode === "cosmos_chaos_darkness") {
      if (this.cosmosMiracleActive) {
        this.refs.stage.dataset.cosmosObjective = "heart";
        if (this.refs.enemyPhase) this.refs.enemyPhase.textContent = "HEART → 100% · 不再以 HP 为目标";
      } else {
        this.refs.stage.dataset.cosmosObjective = "answer";
        const expected = this.cosmosDarknessTrialForms[this.cosmosDarknessTrialStep] ?? "eclipse";
        if (this.refs.enemyPhase) this.refs.enemyPhase.textContent = `HP 无效 · 验证${this.cosmosFormLabel(expected)} ${Math.min(3, this.cosmosDarknessTrialStep + 1)} / 3`;
      }
      return;
    }
    delete this.refs.stage.dataset.cosmosObjective;
  }

  getCosmosObjectiveHelp() {
    if (!this.cosmosBattle) return "";
    const mode = this.enemy.encounterMode;
    if (mode === "cosmos_chaos_ultraman") {
      if (this.phaseIndex === 0) return "目标：COPY → 0% · 【行动】切换月神/日冕 · 敌方回合用 Z 净化/突进打乱复制 · HP 此阶段无效";
      if (this.phaseIndex === 1) return `目标：切断 3 个 COPY CORE · 敌方回合靠近标记 CORE 的节点并按 Z · 剩余 ${Math.round(this.enemy.interfaceGauge?.value ?? 3)} / 3`;
      return "CALAMITY · COPY 已结束 · 现在 HP 才是目标，正面击倒卡俄斯奥特曼卡拉米提";
    }
    if (mode === "cosmos_chaos_darkness") {
      if (this.cosmosMiracleActive) return `目标：HEART → 100% · Z 净化敌意/接住 HEART 光球 · 【行动】听它的声音/相信怪兽 · 当前 ${Math.round(this.enemy.interfaceGauge?.value ?? 0)}%`;
      const expected = this.cosmosDarknessTrialForms[this.cosmosDarknessTrialStep] ?? "eclipse";
      return `寻找答案 ${this.cosmosDarknessTrialStep} / 3 · 当前必须真正尝试${this.cosmosFormLabel(expected)}一次（攻击或光技）· HP 不会推进战斗`;
    }
    return "";
  }

  async setCosmosScriptedPhase(index) {
    if (!this.enemy.phases?.[index]) return false;
    this.phaseIndex = index;
    this.currentPhase = this.enemy.phases[index];
    this.refs.stage.dataset.bossPhase = String(index);
    if (this.refs.enemyPhase) this.refs.enemyPhase.textContent = this.currentPhase.subtitle ?? this.enemy.subtitle ?? "";
    this.renderResources();
    this.sound?.play("phase");
    this.refs.enemySprite.classList.add("phase-shift");
    this.refs.stage.classList.add("phase-flash");
    if (this.refs.phaseBanner && this.refs.phaseTitle) {
      this.refs.phaseTitle.textContent = this.currentPhase.title;
      this.refs.phaseBanner.hidden = false;
      this.refs.phaseBanner.classList.remove("show");
      void this.refs.phaseBanner.offsetWidth;
      this.refs.phaseBanner.classList.add("show");
    }
    await sleep(820);
    if (this.refs.phaseBanner) {
      this.refs.phaseBanner.classList.remove("show");
      this.refs.phaseBanner.hidden = true;
    }
    this.refs.enemySprite.classList.remove("phase-shift");
    this.refs.stage.classList.remove("phase-flash");
    return true;
  }

  async maybeAdvanceCosmosObjective() {
    if (this.enemy.encounterMode !== "cosmos_chaos_ultraman") return false;
    const value = this.enemy.interfaceGauge?.value ?? 1;
    if (value > 0 && !this.cosmosObjectiveAdvancePending) return false;
    this.cosmosObjectiveAdvancePending = false;

    if (this.phaseIndex === 0 && value <= 0) {
      if (this.enemy.interfaceGauge) {
        this.enemy.interfaceGauge.label = "COPY CORE";
        this.enemy.interfaceGauge.threshold = 3;
        this.enemy.interfaceGauge.value = 3;
        this.enemy.interfaceGauge.passivePerTurn = 0;
      }
      await this.setCosmosScriptedPhase(1);
      await this.cosmosChaosUltramanEclipseCinematic();
      this.renderResources();
      return true;
    }
    if (this.phaseIndex === 1 && value <= 0) {
      await this.setCosmosScriptedPhase(2);
      await this.cosmosChaosUltramanCalamityCinematic();
      this.renderResources();
      return true;
    }
    return false;
  }

  async handleCosmosPlayerMoveObjective() {
    if (!this.cosmosBattle) return false;
    if (await this.maybeAdvanceCosmosObjective()) {
      this.enterPlayerMenu(false);
      return true;
    }
    if (this.enemy.encounterMode !== "cosmos_chaos_darkness" || this.cosmosMiracleActive) return false;

    const expected = this.cosmosDarknessTrialForms[this.cosmosDarknessTrialStep];
    if (!expected) return false;
    if (this.cosmosForm !== expected) {
      await this.say(`* 现在要验证的是${this.cosmosFormLabel(expected)}。先换到那个形态。`, 420);
      this.enterPlayerMenu(false);
      return true;
    }

    this.cosmosDarknessTrialHistory.push(expected);
    this.cosmosDarknessTrialStep += 1;
    if (this.enemy.interfaceGauge) {
      this.enemy.interfaceGauge.label = "ANSWER";
      this.enemy.interfaceGauge.threshold = 3;
      this.enemy.interfaceGauge.value = this.cosmosDarknessTrialStep;
    }
    this.renderResources();
    await this.cosmosChaosDarknessTrialCinematic(expected);

    if (this.cosmosDarknessTrialStep < 3) {
      await this.enemyResponse();
      return true;
    }

    await this.setCosmosScriptedPhase(1);
    await this.cosmosChaosDarknessNoAnswerCinematic();
    await this.setCosmosScriptedPhase(2);
    await this.cosmosChaosDarknessMiracleCinematic();
    this.enterPlayerMenu(false);
    return true;
  }

  getCosmosFormSkills() {
    if (this.enemy.encounterMode === "cosmos_chaos_ultraman" && this.phaseIndex === 0) {
      if (this.cosmosForm === "corona") return [
        {id:"blazing-wave",name:"炽热波动",damage:46,cost:24,attackClass:"energy",description:"当前目标不是 HP。用正面冲击扰乱复制结构，降低 COPY。",text:"日冕模式正面推出灼热冲击。",cosmosCopyBreak:10}
      ];
      return [
        {id:"luna-pacification-wave",name:"月神净化波",damage:34,cost:22,attackClass:"energy",cosmosCopyBreak:12,description:"当前目标不是 HP。用净化波扰乱卡俄斯复制结构，直接降低 COPY。",text:"月白色的波纹在它的身体内扩散开来。"}
      ];
    }
    if (this.cosmosForm === "miracle-luna") return [
      {id:"miracle-embrace",name:"奇迹之光",kind:"cosmosHeart",cost:18,description:"把攻击转换为能够抵达卡俄斯内心的柔光。提高 HEART。",text:"金白色的波纹没有瞄准身体，而是努力的靠近着它的内心。"},
      {id:"luna-final",name:"露娜终结",kind:"cosmosFinalMercy",cost:36,locked:(this.enemy.interfaceGauge?.value??0)<(this.enemy.interfaceGauge?.threshold??100),lockText:"HEART 100%",description:"HEART 完全回应后才能使用。不是消灭，而是让卡俄斯自己选择新的形态。",text:"高斯把所有攻击姿势都放下，持之以恒地向卡俄斯释放着光波。"}
    ];
    if (this.cosmosForm === "corona") return [
      {id:"naybuster-ray",name:"内巴斯特光线",damage:67,cost:36,attackClass:"energy",description:"日冕模式的强攻光线。对纯粹敌意目标造成高伤害。",text:"赤色能量沿双臂汇聚。"},
      {id:"blazing-wave",name:"炽热波动",damage:46,cost:24,attackClass:"energy",description:"范围冲击。对 Chaos Ultraman 的 COPY 也会形成干扰。",text:"日冕模式正面推出灼热冲击。",cosmosCopyBreak:10}
    ];
    if (this.cosmosForm === "eclipse") return [
      {id:"eclipse-blade",name:"日蚀之刃",damage:54,cost:26,attackClass:"energy",description:this.enemy.encounterMode==="cosmos_chaos_darkness"&&!this.cosmosMiracleActive?"只切错误结构，验证‘分离敌意与生命’能不能成为答案。":"精确切断卡俄斯结构。COPY 已结束后，它就是日蚀的高精度战斗技。",text:"光芒在腕部拉成了锋刃。",cosmosCopyBreak:22},
      {id:"cosmium-beam",name:"克兹缪姆光线",damage:91,cost:52,attackClass:"energy",description:this.enemy.encounterMode==="cosmos_chaos_darkness"&&!this.cosmosMiracleActive?"把卡俄斯结构与生命本身分开，进行最后一次‘日蚀答案’验证。":"将邪恶与生命分离的高强度光线。",text:"光在双臂之间完成了聚焦。",cosmosCopyBreak:18}
    ];
    const lunaSkills = [
      {id:"cosmos-luna-shot",name:"月神光弹",damage:30,cost:15,attackClass:"energy",description:"柔和而克制的光弹。",text:"月白色的光从掌前掠出。"}
    ];
    if (this.mercyRouteEnabled()) {
      lunaSkills.push({id:"full-moon-rect",name:"满月光波",kind:"mercy",mercyPower:36,cost:30,description:"在 CALM 达到 100% 后，让没有恶意的生命恢复原本的心。",text:"月白色的光铺开，没有杀意。"});
    } else {
      lunaSkills.push({id:"luna-pacification-wave",name:"月神净化波",damage:34,cost:22,attackClass:"energy",cosmosCopyBreak:12,description:"不追求重伤目标，而是扰乱卡俄斯复制结构。COPY 阶段可明显降低复制率。",text:"月白色波纹贴着复制结构扩散。"});
    }
    return lunaSkills;
  }

  getCosmosFormActions() {
    if (this.cosmosMiracleActive) return [
      {id:"cosmos-listen-heart",effect:"cosmosListenHeart",name:"听它的声音",description:"不把黑暗当成攻击目标。下一轮 HEART 获取增加。",text:"高斯没有盯着光球看。",resultText:"杂音之外，犹豫滋生。"},
      {id:"cosmos-trust-monsters",effect:"cosmosMonsterTrust",name:"相信怪兽",description:"让利多利阿斯、莫古尔顿与波尔吉尔斯继续靠近。下一轮支援更频繁。",text:"没有人命令怪兽后退。",resultText:"不同的叫声传向卡俄斯的内心。"}
    ];

    if (this.enemy.encounterMode === "cosmos_chaos_ultraman" && this.phaseIndex === 1) {
      if (this.cosmosForm !== "eclipse") return [{id:"switch-eclipse",effect:"cosmosSwitch",form:"eclipse",name:"日蚀模式",description:"COPY 已经归零。现在只有日蚀能切断暴露出来的复制核心。",text:"金、赤、蓝三色在同一条轮廓上亮起。",resultText:"复制结构里出现了可以被分离的核心。"}];
      return [{id:"eclipse-read",effect:"cosmosEclipseRead",name:"锁定 CORE",description:"下一轮扩大日蚀切断范围。只要靠近标记 CORE 的复制节点并按 Z，就能真正切掉一枚核心。",text:"高斯只盯住复制结构里仍在发光的节点。",resultText:"三枚核心的位置开始变得清晰。"}];
    }

    if (this.enemy.encounterMode === "cosmos_chaos_darkness" && !this.cosmosMiracleActive) {
      const expected = this.cosmosDarknessTrialForms[this.cosmosDarknessTrialStep] ?? "eclipse";
      if (this.cosmosForm !== expected) {
        const label = this.cosmosFormLabel(expected);
        return [{id:`switch-${expected}`,effect:"cosmosSwitch",form:expected,name:label,description:`下一步必须真正验证${label}能不能成为答案。`,text:"高斯改变了站姿。",resultText:`现在只剩下一个问题：${label}能不能让卡俄斯停下来。`}];
      }
      if (expected === "luna") return [{id:"luna-open",effect:"cosmosLunaField",name:"先安抚它",description:"扩大月神净化范围，之后用攻击或光技真正尝试一次月神的答案",text:"高斯把双臂缓慢打开。",resultText:"这一次先不用更强的力量，只试着让它停下来。"}];
      if (expected === "corona") return [{id:"corona-forward",effect:"cosmosCoronaDrive",name:"正面阻止",description:"强化下一轮日冕突进。之后用攻击或光技真正尝试一次日冕的答案。",text:"日冕模式向前踏了一步。",resultText:"如果安抚不行，就正面阻止伤害继续造成。"}];
      return [{id:"eclipse-read",effect:"cosmosEclipseRead",name:"只切错误结构",description:"扩大日蚀切断范围。之后用攻击或光技真正尝试一次日蚀的答案。",text:"高斯凝视着黑暗中不属于生命本身的部分。",resultText:"最后再试一次：只切掉错误的部分。"}];
    }

    const opts=[];
    if (this.cosmosForm !== "luna") opts.push({id:"switch-luna",effect:"cosmosSwitch",form:"luna",name:"月神模式",description:"慈爱与安抚。敌方回合按 Z 可自动净化附近部分卡俄斯弹体。",text:"蓝色光沿身体重新铺开。",resultText:"动作变得更轻。"});
    if (this.cosmosForm !== "corona") opts.push({id:"switch-corona",effect:"cosmosSwitch",form:"corona",name:"日冕模式",description:"直面无法沟通的敌意。敌方回合按 Z 可短距离爆发突进，穿过并击碎附近卡俄斯弹体。",text:"蓝光收紧，赤色像火一样从胸口扩散。",resultText:"高斯把重心压向前方。"});
    if (this.cosmosEclipseUnlocked && this.cosmosForm !== "eclipse") opts.push({id:"switch-eclipse",effect:"cosmosSwitch",form:"eclipse",name:"日蚀模式",description:"勇气与慈爱的融合。Z 会精确切断附近最危险的卡俄斯结构。",text:"金、赤、蓝三色在同一条轮廓上亮起。",resultText:"光不再只是攻击或安抚，而是在寻找必须被驱除的部分。"});
    if (this.enemy.encounterMode === "cosmos_lidorias_forms" && this.cosmosForm === "luna") {
      opts.push({id:"lidorias-call",effect:"cosmosLidoriasCall",name:"叫它的名字",description:"不是向混沌能量说话，而是继续呼唤利多利阿斯本身。提高少量 CALM，并强化下一轮净化。",text:"高斯没有进攻，武藏只是再一次呼唤着自己的伙伴。",resultText:"尖锐的杂音里，利多利阿斯自己的叫声短暂地露了出来。"});
    }
    if (this.cosmosForm === "luna") opts.push({id:"luna-open",effect:"cosmosLunaField",name:"扩大月光",description:"下一轮月神脉冲范围扩大，并提高净化数量。",text:"高斯将双臂缓慢打开。",resultText:"月白色的光没有追逐任何目标，只是温暖的守在身边。"});
    if (this.cosmosForm === "corona") opts.push({id:"corona-forward",effect:"cosmosCoronaDrive",name:"正面突破",description:"下一轮日冕突进更远，撞碎更多混沌攻击。",text:"日冕模式向前踏了一步。",resultText:"下一次冲进攻击线时，不需要再绕开。"});
    if (this.cosmosForm === "eclipse") opts.push({id:"eclipse-read",effect:"cosmosEclipseRead",name:"分离目标",description:"下一轮日蚀切断范围扩大，并延长敌方关键结构预警。",text:"高斯凝视着黑暗中不属于生命本身的部分。",resultText:"真正需要切断的结构开始变得清晰。"});
    return opts;
  }

  async cosmosLidoriasIntroCinematic() {
    this.inputLocked = true;
    this.refs.stage.classList.add("cosmos-intro-pending");
    this.setCosmosVision("lidorias-dusk");
    await this.storySilence(1100, "cosmos-luna");
    await this.storyBeat("", "保护区的宁静被打破了，传来的是一声武藏绝不会认错的鸣叫。", 2500, "cosmos-luna");
    this.setCosmosVision("lidorias-chaos");
    await this.storyBeat("春野武藏", "利多利阿斯……听得到吗？", 2200, "cosmos-luna");
    await this.storySilence(700, "cosmos-luna");
    await this.storyBeat("", "利多利阿斯转过头。那一瞬间，它真的停住了，但紧接着，黑紫色的卡俄斯光再次沿着羽翼扎进身体，把它重新拖向攻击。", 3300, "cosmos-chaos");
    await this.storyBeat("春野武藏", "无论如何我都不会把你当成敌人，利多利阿斯，回应我吧！", 2800, "cosmos-luna");
    await this.finishCosmosIntroReveal();
  }

  async maybeCosmosLidoriasCalmBeat() {
    if (this.enemy.encounterMode !== "cosmos_lidorias_forms" || !this.mercyRouteEnabled()) return false;
    const calm = this.enemy.mercy?.value ?? 0;
    const next = calm >= 100 ? 4 : calm >= 82 ? 3 : calm >= 55 ? 2 : calm >= 28 ? 1 : 0;
    if (next <= this.cosmosLidoriasBeat) return false;
    this.cosmosLidoriasBeat = next;
    this.inputLocked = true;
    this.bullets.stop();
    if (next === 1) {
      this.setCosmosVision("lidorias-memory-one");
      await this.storyBeat("", "净化掉的不是利多利阿斯的一部分。黑紫色碎片散开以后，它先看见了高斯。", 2800, "cosmos-luna");
      await this.storyBeat("春野武藏", "对，是我，回来吧，利多利阿斯！", 1900, "cosmos-luna");
    } else if (next === 2) {
      this.setCosmosVision("lidorias-memory-two");
      await this.storyBeat("", "卡俄斯再次驱动着它的身体。利多利阿斯却第一次自己压住了正在扬起的翅膀。", 3000, "cosmos-chaos");
      await this.storyBeat("春野武藏", "加油，利多利阿斯！我相信你，不要向它屈服！", 2500, "cosmos-luna");
    } else if (next === 3) {
      this.setCosmosVision("lidorias-memory-three");
      await this.storyBeat("", "刺耳的杂音断了一拍。随后传来的鸣叫，终于和武藏记忆里的声音重合。", 3000, "cosmos-luna");
      await this.storySilence(700, "cosmos-luna");
      await this.storyBeat("春野武藏", "利多利阿斯，回家吧！", 2200, "cosmos-luna");
    } else {
      this.cosmosLidoriasReadyShown = true;
      this.setCosmosVision("lidorias-ready");
      await this.storyBeat("", "利多利阿斯没有继续冲过来。它只是站在原地，拼命压住身体里最后一层黑紫色光。", 3200, "cosmos-luna");
      await this.storyBeat("春野武藏", "高斯，帮帮我，一起让利多利阿斯回来吧！", 2700, "cosmos-luna");
      await this.storyBeat("", "FULL MOON RECT · READY", 1600, "cosmos-miracle");
    }
    this.hideCosmosVision();
    this.inputLocked = false;
    return next === 4;
  }

  async cosmosLidoriasMercyCinematic() {
    if (this.state.is("MERCY")) return;
    this.state.set("MERCY");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.bullets.stop();
    this.setFrameMode("dialogue");
    this.setCosmosVision("lidorias-final");
    await this.storySilence(850, "cosmos-miracle");
    await this.storyBeat("", "高斯放下手臂。满月光波没有撞上利多利阿斯，而是像水一样从它身上穿过去。", 3300, "cosmos-miracle");
    this.refs.stage.classList.add("mercy-cast");
    this.refs.enemySprite.classList.add("purified");
    this.sound?.play("mercy");
    await this.storyBeat("", "黑紫色的卡俄斯光一层层离开羽翼、胸口和双眼。每退去一层，利多利阿斯自己的颜色就重新亮一点。", 3500, "cosmos-miracle");
    this.setCosmosVision("lidorias-return");
    await this.storySilence(900, "cosmos-luna");
    await this.storyBeat("", "利多利阿斯没有倒下。它慢慢走到高斯面前，把额头靠进那只一直没有握成拳的手里。", 3500, "cosmos-luna");
    await this.storyBeat("春野武藏", "欢迎回来，利多利阿斯。", 2400, "cosmos-luna");
    this.hideCosmosVision();
    this.refs.dialogueText.textContent = "MERCY · RETURNED";
    this.refs.dialogueText.style.fontSize = "30px";
    this.refs.dialogueText.style.fontWeight = "900";
    this.refs.continueHint.style.opacity = "0";
    this.emitResult("mercy");
  }

  async cosmosChaosUltramanIntroCinematic() {
    this.inputLocked = true;
    this.refs.stage.classList.add("cosmos-intro-pending");
    this.setCosmosVision("copy-seed");
    await this.storySilence(1150, "cosmos-chaos");
    this.setCosmosVision("copy-awake");
    await this.storyBeat("", "诡异的宁静中，没有怪兽出现，卡俄斯光却在高斯正对面不断把自己压成人形。", 2800, "cosmos-chaos");
    this.setCosmosVision("copy-lidorias-echo");
    await this.storyBeat("", "成形前，与高斯交手的记录不断在卡俄斯的记忆中闪回", 3300, "cosmos-luna");
    await this.storyBeat("", "卡俄斯记住的不是“净化”和“慈爱”。它记住的是——高斯的迟疑与破绽。", 3300, "cosmos-copy");
    this.setCosmosVision("copy-faceoff");
    await this.storyBeat("", "银色身体、红色双眼、同样的站姿。甚至在高斯放低手臂以后，它也晚半拍放低了手臂。", 3000, "cosmos-copy");
    await this.storyBeat("春野武藏", "它不是想变成高斯……它是在学习高斯，超越高斯。", 2600, "cosmos-luna");
    await this.finishCosmosIntroReveal();
  }

  async cosmosChaosUltramanEclipseCinematic() {
    if (this.cosmosEclipseUnlocked) return;
    this.cosmosEclipseUnlocked = true;
    this.inputLocked = true;
    this.bullets.stop();
    this.setCosmosVision("copy-overrun");
    await this.storyBeat("", "月神形态的净化被同样的月白波纹推了回来。高斯变成日冕形态，但刚踏出第一步，复制体就已经提前站在突破路线的终点。", 3600, "cosmos-chaos");
    await this.storyBeat("", "COPY 已经不是模仿动作。它开始模仿高斯的思维。", 3000, "cosmos-copy");
    this.setCosmosVision("eyes-crossfire");
    await this.storyBeat("TEAM EYES", "我们把它的视线拉开！武藏，我们也要不断进步！", 3100, "cosmos-eyes");
    await this.storySilence(850, "cosmos-eyes");
    this.setCosmosVision("eclipse-choice");
    await this.storyBeat("春野武藏", "月神形态不是逃避战斗，日冕形态也从来不是为了破坏。", 3100, "cosmos-luna");
    await this.storyBeat("春野武藏", "我的愿望，从始至终都只有保护所有的生命啊！", 3500, "cosmos-final");
    this.setCosmosVision("eclipse-rise");
    this.applyCosmosForm("eclipse", false);
    if (this.enemy.interfaceGauge) this.enemy.interfaceGauge.value = Math.min(this.enemy.interfaceGauge.value ?? 100, 42);
    this.renderResources();
    await this.storyBeat("", "赤、蓝、金三种光芒没有互相覆盖，而是在同一具身体上同时稳定下来。", 3200, "cosmos-eclipse");
    await this.storyBeat("", "ECLIPSE MODE", 1900, "cosmos-eclipse");
    await this.storyBeat("", "复制体第一次没能同步，它晚了一步。", 2300, "cosmos-copy");
    this.refs.stage.dataset.bossPhase = String(this.phaseIndex);
    if (this.refs.enemyPhase) this.refs.enemyPhase.textContent = this.currentPhase?.subtitle ?? this.enemy.subtitle ?? "";
    this.hideCosmosVision();
    this.inputLocked = false;
  }

  async cosmosChaosUltramanCalamityCinematic() {
    if (this.cosmosCalamityActive) return;
    this.cosmosCalamityActive = true;
    this.inputLocked = true;
    this.bullets.stop();
    this.setCosmosVision("eclipse-separate");
    await this.storyBeat("", "日蚀之刃切进了卡俄斯的结构，让它无法继续复制。", 3200, "cosmos-eclipse");
    await this.storyBeat("", "克兹缪姆光线穿过复制体。银色的裂痕从它的中央出现，COPY 光纹一条接一条熄灭。", 3300, "cosmos-eclipse");
    await this.storySilence(1250, "cosmos-final");
    this.setCosmosVision("calamity-fragments");
    await this.storyBeat("", "没有碎片落到地面，每一片卡俄斯光都停在半空，像是在等待一次新的仿造。", 3200, "cosmos-chaos");
    this.setCosmosVision("calamity-learning");
    await this.storyBeat("", "月神的安抚、日冕的突破、日蚀的分离——被它学过的答案一层层从碎片里亮起。", 3900, "cosmos-copy");
    await this.storyBeat("", "然后它把“为什么这样做”全部丢掉，只留下每一种答案里最适合战斗的部分。", 3400, "cosmos-chaos");
    this.setCosmosVision("calamity-collapse");
    await this.storySilence(900, "cosmos-chaos");
    this.setCosmosVision("calamity-rise-v22");
    await this.storyBeat("", "碎片猛地向中心塌缩。新的肩刺、臂刃和核心从赤紫色光里挤出——这一次，它不再试图超越高斯，它要超越一切。", 3700, "cosmos-chaos");
    this.enemy.name = "卡俄斯奥特曼卡拉米提";
    this.enemy.subtitle = "再构成 · 战斗特化";
    this.enemy.attack = Math.max(this.enemy.attack, 22);
    this.enemy.hp = Math.max(this.enemy.hp, Math.floor(this.enemy.maxHp * .58));
    if (this.enemy.interfaceGauge) this.enemy.interfaceGauge.value = Math.max(this.enemy.interfaceGauge.value ?? 0, 68);
    if (this.refs.enemyName) this.refs.enemyName.textContent = this.enemy.name;
    this.renderResources();
    await this.storyBeat("", "CHAOS ULTRAMAN CALAMITY", 1900, "cosmos-chaos");
    await this.storyBeat("春野武藏", "那就让我看看，你自己选择的战斗，我们上，高斯！", 3000, "cosmos-final");
    this.refs.stage.dataset.bossPhase = String(this.phaseIndex);
    if (this.refs.enemyPhase) this.refs.enemyPhase.textContent = this.currentPhase?.subtitle ?? this.enemy.subtitle ?? "";
    this.hideCosmosVision();
    this.inputLocked = false;
  }

  async cosmosChaosDarknessIntroCinematic() {
    this.inputLocked = true;
    this.refs.stage.classList.add("cosmos-intro-pending");
    this.setCosmosVision("darkness-seed");
    await this.storySilence(1450, "cosmos-dark");
    this.setCosmosVision("darkness-learning-archive");
    await this.storyBeat("", "死寂笼罩了月面，阴影投射在整个地球上", 4100, "cosmos-chaos");
    await this.storyBeat("", "卡俄斯没有忘记任何一次相遇。它把每一次受伤、每一次阻止、每一次人类火力都理解成了“生命会如何对待我”的佐证。", 4200, "cosmos-dark");
    this.setCosmosVision("darkness-arrival");
    await this.storyBeat("", "所有记忆同时向中心倒流，它的双爪首先抬出黑暗，紧接着橙色核心一枚一枚的亮起，在最后连接成了卡俄斯黑暗的身体。", 3800, "cosmos-dark");
    await this.storyBeat("日浦队长", "武藏！我们不能再等了！", 2700, "cosmos-eyes");
    this.setCosmosVision("lidorias-call");
    await this.storyBeat("", "利多利阿斯没有冲上去。它只是站在卡俄斯黑暗能看见的位置，一遍又一遍发出没有攻击意味的鸣叫。", 3400, "cosmos-luna");
    await this.storyBeat("春野武藏", "可是，我已经不想再战斗了，我想要去相信，卡俄斯，我想要去相信你的感情是存在的！", 3200, "cosmos-final");
    await this.finishCosmosIntroReveal();
  }

  async cosmosChaosDarknessTrialCinematic(form) {
    this.inputLocked = true;
    this.bullets.stop();
    if (form === "luna") {
      this.setCosmosVision("no-answer-luna");
      await this.storyBeat("", "月神模式下的高斯将攻击姿势全部放低，用柔光净化掉了最前面的一片敌意——但黑暗在眨眼间完成了重构", 3900, "cosmos-luna");
      await this.storyBeat("", "那安抚无法抚平它深渊般的痛苦与恨意", 3200, "cosmos-chaos");
      await this.storyBeat("春野武藏", "停手吧，求求你了，请你理解我！\n", 2300, "cosmos-final");
    } else if (form === "corona") {
      this.setCosmosVision("no-answer-corona");
      await this.storyBeat("", "高斯正面撞进阵列，把黑暗硬生生撕开了一道缺口，可是下一秒，所有攻击同时改向，封死了所有前进的可能。", 4100, "cosmos-corona");
      await this.storyBeat("", "住手，混沌病毒，如果你能理解人类的心，也应该能理解讨厌争斗的感觉！", 2800, "cosmos-chaos");
      await this.storyBeat("春野武藏", "争斗……是没有意义的呀！", 2600, "cosmos-final");
    } else {
      this.setCosmosVision("no-answer-eclipse");
      await this.storyBeat("", "日蚀之刃不断切割着卡俄斯的结构，但被分离的部分才刚刚熄灭，更远处已经长出新的连接。", 4100, "cosmos-eclipse");
      await this.storyBeat("", "它依旧在不断地重构着", 3200, "cosmos-chaos");
      await this.storySilence(800, "cosmos-final");
    }
    this.hideCosmosVision();
    this.inputLocked = false;
    this.updateCosmosObjectiveHud();
  }

  async cosmosChaosDarknessNoAnswerCinematic() {
    if (this.cosmosDarknessNoAnswerPlayed) return;
    this.cosmosDarknessNoAnswerPlayed = true;
    this.inputLocked = true;
    this.bullets.stop();

    this.setCosmosVision("eyes-fire-fail");
    await this.storyBeat("TEAM EYES", "三种形态都不行……全机射击！至少先给高斯打开路！", 2600, "cosmos-eyes");
    await this.storyBeat("", "射线命中以后，卡俄斯黑暗没有后退。它挣扎的样子，究竟是在想什么呢？", 3400, "cosmos-chaos");

    this.setCosmosVision("no-answer-all");
    await this.storySilence(1050, "cosmos-final");
    await this.storyBeat("春野武藏", "卡俄斯，你的心里，正在流泪吗？", 4100, "cosmos-final");
    await this.storyBeat("日浦队长", "武藏！不要再迟疑下去了！", 3200, "cosmos-eyes");
    this.hideCosmosVision();
    this.inputLocked = false;
  }

  async cosmosChaosDarknessMiracleCinematic() {
    if (this.cosmosMiracleActive) return;
    this.inputLocked = true;
    this.bullets.stop();
    this.sound?.playMusic?.("cosmos_realization", { volume: .16, loop: false, fadeInMs: 2400, fadeOutMs: 1800 });
    this.player.hp = Math.min(this.player.hp, 6);
    this.renderResources();
    this.setCosmosVision("cosmos-fall");
    await this.storyBeat("", "高斯再一次站起，又再一次被打倒，愈发的衰弱，可每一次反击都只让卡俄斯黑暗变得更会战斗。", 3900, "cosmos-dark");
    await this.storySilence(1700, "cosmos-final");
    this.setCosmosVision("lidorias-memory-final");
    await this.storyBeat("春野武藏", "我要把我的心，通过光传达给它！", 3300, "cosmos-final");
    await this.storyBeat("春野武藏", "它只是终于被理解了", 3100, "cosmos-luna");
    this.setCosmosVision("eyes-shield-pre");
    await this.storyBeat("日浦队长", "那就去做吧，大家，我们来保护武藏和高斯！", 2600, "cosmos-eyes");
    await this.storySilence(900, "cosmos-final");
    this.setCosmosVision("pyroxene");
    await this.storyBeat("", "辉石从武藏胸前浮起来，一道比任何事物都更安静的光被唤醒了。", 3400, "cosmos-luna");
    await this.storyBeat("春野武藏", "高斯，再一次和我一起战斗吧！我想要帮助它。", 3500, "cosmos-final");
    this.setCosmosVision("miracle-rain");
    await this.storySilence(900, "cosmos-miracle");
    this.applyCosmosForm("miracle-luna", false);
    this.cosmosMiracleActive = true;
    // Miracle Luna should feel like the final transformation, not a six-second glass cannon.
    this.player.maxHp = Math.max(this.player.maxHp, 156);
    this.player.hp = this.player.maxHp;
    this.player.energy = this.player.maxEnergy;
    if (this.enemy.interfaceGauge) {
      this.enemy.interfaceGauge.label = "HEART";
      this.enemy.interfaceGauge.threshold = 100;
      this.enemy.interfaceGauge.value = 0;
    }
    this.renderResources();
    await this.storyBeat("", "细雨一样的光从辉石周围落下，高斯重新站了起来。", 2600, "cosmos-miracle");
    this.setCosmosVision("miracle-open-hands");
    await this.storyBeat("", "高斯将两只手完全张开，坚持地将治愈的光芒推向它", 3800, "cosmos-miracle");
    await this.storyBeat("", "MIRACLE LUNA MODE", 1900, "cosmos-miracle");
    this.sound?.playMusic?.("cosmos_miracle_final", { volume: .15, fadeInMs: 3200, fadeOutMs: 2400 });
    await this.storyBeat("", "HEART 不是敌人的弱点。它只是告诉所有人：卡俄斯有没有哪怕一次，愿意不把回应推回去。", 3200, "cosmos-final");
    this.refs.stage.dataset.bossPhase = String(this.phaseIndex);
    if (this.refs.enemyPhase) this.refs.enemyPhase.textContent = this.currentPhase?.subtitle ?? this.enemy.subtitle ?? "";
    this.hideCosmosVision();
    this.inputLocked = false;
  }

  async maybeCosmosChaosDarknessHeartBeat() {
    if (this.enemy.encounterMode !== "cosmos_chaos_darkness" || !this.cosmosMiracleActive) return false;
    const heart = this.enemy.interfaceGauge?.value ?? 0;
    const next = heart >= 100 ? 4 : heart >= 75 ? 3 : heart >= 50 ? 2 : heart >= 25 ? 1 : 0;
    if (next <= this.cosmosHeartBeat) return next >= 4;
    this.cosmosHeartBeat = next;
    this.inputLocked = true;
    this.bullets.stop();
    if (next === 1) {
      this.setCosmosVision("heart-first");
      await this.storyBeat("", "一颗被净化后的光停在卡俄斯黑暗面前。它没有立刻吞掉，也没有立刻击碎。", 3300, "cosmos-final");
      await this.storyBeat("春野武藏", "……你能听见吗？我的心意。", 2100, "cosmos-luna");
    } else if (next === 2) {
      this.setCosmosVision("monster-circle");
      await this.storyBeat("", "利多利阿斯率先靠近。随后是莫古尔顿、波尔吉尔斯。没有一只怪兽摆出战斗姿势。", 3500, "cosmos-monsters");
      await this.storyBeat("", "不同的叫声落进那本应该空无一物的胸膛", 3200, "cosmos-final");
    } else if (next === 3) {
      this.setCosmosVision("eyes-shield");
      await this.storyBeat("日浦队长", "EYES，全机停止对卡俄斯射击。", 2600, "cosmos-eyes");
      await this.storyBeat("", "战机绕到高斯外侧。之后每一道射线，都只用来击落飞向净化轨道的攻击。", 3400, "cosmos-eyes");
      await this.storyBeat("春野武藏", "谢谢。这样就够了！", 2200, "cosmos-luna");
    } else {
      this.setCosmosVision("heart-ready");
      await this.storySilence(950, "cosmos-final");
      await this.storyBeat("", "卡俄斯黑暗抬起了手。所有人都以为下一轮攻击要开始——可那只手停在了半空。", 3600, "cosmos-final");
      await this.storyBeat("", "它第一次自己中断了攻击。", 2500, "cosmos-final");
      await this.storyBeat("春野武藏", "高斯，最后一次，给予它选择的机会吧！", 2900, "cosmos-luna");
      await this.storyBeat("", "LUNA FINAL · READY", 1700, "cosmos-miracle");
    }
    this.hideCosmosVision();
    this.inputLocked = false;
    return next >= 4;
  }

  async finishCosmosIntroReveal() {
    this.hideCosmosVision();
    // hideStoryCinematic() uses a .52s fade; do not expose the battle UI underneath mid-fade.
    await sleep(560);
    this.refs.stage.classList.remove("cosmos-intro-pending");
    this.refs.stage.classList.add("cosmos-intro-reveal");
    this.refs.enemySprite.classList.add("cosmos-entry");
    await sleep(1120);
    this.refs.stage.classList.remove("cosmos-intro-reveal");
    this.refs.enemySprite.classList.remove("cosmos-entry");
  }

  setCosmosVision(scene="") {
    const panel=this.refs.storyCinematic, vision=this.refs.cosmosVision;
    if(!panel||!vision)return;
    panel.hidden=false; panel.dataset.mood="cosmos"; vision.hidden=false; vision.dataset.scene=scene;
  }
  hideCosmosVision(){
    if(this.refs.cosmosVision){this.refs.cosmosVision.hidden=true;this.refs.cosmosVision.dataset.scene="";}
    this.hideStoryCinematic();
  }

  async cosmosChaosUltramanVictory(){
    if(this._cosmosChaosUltraVictory)return;this._cosmosChaosUltraVictory=true;
    this.state.set("VICTORY");this.inputLocked=true;this.setCommandsEnabled(false);this.bullets.stop();this.setFrameMode("dialogue");
    this.setCosmosVision("eclipse-finish");
    await this.storyBeat("", "日蚀之刃划过卡俄斯的构造。模仿出来的细胞第一次失去同步。", 2850,"cosmos-eclipse");
    await this.storyBeat("", "它仍然摆出和高斯一致的姿势，却再也接不上下一步。", 2400,"cosmos-chaos");
    await this.storyBeat("", "克兹缪姆光线穿过了失稳的复制体。黑紫色碎片没有落地，而是逃回更深的卡俄斯光中。", 3100,"cosmos-eclipse");
    this.refs.enemySprite.classList.add("dead");
    await this.storySilence(900,"cosmos-eclipse");this.hideCosmosVision();
    this.refs.dialogueText.textContent="VICTORY";this.refs.dialogueText.style.fontSize="34px";this.refs.continueHint.style.opacity="0";this.sound?.play("victory");this.emitResult("victory");
  }

  async cosmosChaosDarknessVictory(){
    if(this._cosmosFinaleHandled)return;this._cosmosFinaleHandled=true;
    this.inputLocked=true;this.bullets.stop();this.setCommandsEnabled(false);this.setFrameMode("dialogue");
    this.setCosmosVision("luna-final");
    await this.storySilence(900,"cosmos-final");
    await this.storyBeat("", "高斯没有把最后的光举起，而是将双臂慢慢展开，月白色波纹从胸前向外扩散。", 3500,"cosmos-miracle");
    await this.storyBeat("", "露娜终结进入了黑色外壳，一层一层照亮着，呼唤着。", 3800,"cosmos-final");
    this.setCosmosVision("final-allies");
    await this.storyBeat("", "利多利阿斯的鸣叫、莫古尔顿低沉的回应、波尔吉尔斯的电光同时越过月面。", 3500,"cosmos-monsters");
    await this.storyBeat("日浦队长", "保护高斯！谁都不许向卡俄斯开火。", 2900,"cosmos-eyes");
    await this.storySilence(1000,"cosmos-final");
    this.setCosmosVision("shell-peel-one");
    await this.storyBeat("", "第一层黑色外壳从肩部裂开，高斯没有加大光压，只是维持着同样的月白波纹。", 3400,"cosmos-gold");
    this.setCosmosVision("shell-peel-two");
    await this.storyBeat("", "第二层从胸口脱落。橙色核心没有熄灭，反而第一次透出金色。", 3400,"cosmos-gold");
    await this.storyBeat("春野武藏", "你不需要变成我们，也不需要再变成敌人。", 3200,"cosmos-final");
    this.setCosmosVision("shell-peel-three");
    await this.storyBeat("", "最后几块黑暗没有被击碎，而是自己松开，像一个已经不再需要的伪装。", 3600,"cosmos-gold");
    this.setCosmosVision("header-zero");
    await this.storySilence(1200,"cosmos-gold");
    await this.storyBeat("", "当最后一层黑暗离开身体，留在月面上的是卡俄斯海德 0。", 3400,"cosmos-gold");
    await this.storyBeat("春野武藏", "去吧，卡俄斯！未来由你自己决定。", 2700,"cosmos-luna");
    this.setCosmosVision("zero-departure");
    await this.storySilence(1800,"cosmos-dawn");
    await this.storyBeat("", "金色生命慢慢地升向天空。高斯目送着它离开", 3900,"cosmos-dawn");
    await this.storyBeat("", "高斯没有教会卡俄斯如何成为人类，只是终于教会了它何为感情。", 3900,"cosmos-final");
    this.hideCosmosVision();
    this.refs.dialogueText.textContent="TRUE BRAVERY";this.refs.dialogueText.style.fontSize="30px";this.refs.continueHint.style.opacity="0";this.sound?.play("victory");this.emitResult("mercy");
  }

  tigaGatanothorFinaleActive() {
    return this.enemy.encounterMode === "tiga_gatanothor_finale" && this.phaseIndex >= 2 && this.tigaGlitterActive;
  }

  getTigaGlitterSkills() {
    return [
      {
        id: "glitter-zeppelion",
        name: "闪耀哉佩利敖光线",
        damage: 124,
        cost: 34,
        attackClass: "energy",
        description: "把汇聚而来的光一次送回黑暗深处，最终阶段伤害极高。",
        text: "金色的光沿着双臂汇聚，凝聚其中的，是大家的梦想与希望"
      },
      {
        id: "timer-flash-special",
        name: "计时器闪光·终式",
        damage: 92,
        cost: 26,
        attackClass: "energy",
        tigaLightShield: true,
        description: "以颜色计时器为中心释放大范围闪光。伤害较低，但会获得一次光之护持。",
        text: "胸前的光扩散开来，在那温暖炽热的金色波纹中，惨白的石化光被完全包裹其中"
      }
    ];
  }

  getTigaGlitterActions() {
    return [
      {
        id: "gather-world-light",
        effect: "tigaGatherLight",
        name: "齐心",
        description: "不分辨来自哪里，让仍在抵达的源源不断的光进入身体。恢复生命与能量，并强化下一次出手。",
        text: "数不尽的光带着所有人的呼喊与愿望而来。",
        resultText: "它们带来了温度，带来了闪耀世界的决心。"
      },
      {
        id: "walk-into-darkness",
        effect: "tigaAdvanceLight",
        name: "前进",
        description: "顶着黑暗继续接近加坦杰厄，下一轮移动更快，并获得光之护持。",
        text: "你向黑海深处走了一步。",
        resultText: "无垠的光芒支持着你"
      },
      {
        id: "shine-with-people",
        effect: "tigaShine",
        name: "成为光",
        description: "把下一次攻击变成大家共同完成的一击，只能强化一次出手。",
        text: "你没有把那些光留在身后。",
        resultText: "这一击不会只有迪迦一个人的力量。"
      }
    ];
  }

  applyTigaEncounterDamage(baseDamage) {
    let damage = Math.max(0, Math.round(baseDamage));
    if (damage <= 0) return 0;

    if (this.enemy.encounterMode === "tiga_golza" && this.golzaWeakReadActive) {
      damage = Math.max(1, Math.round(damage * 1.22));
      this.golzaWeakReadActive = false;
      this.refs.stage.classList.remove("golza-weak-mark", "golza-opening");
    }

    if (this.tigaGatanothorFinaleActive()) {
      let multiplier = 1.56;
      if (this.flags.tigaGlitterStrike) {
        multiplier *= 1.22;
        this.flags.tigaGlitterStrike = false;
      }
      damage = Math.max(1, Math.round(damage * multiplier));
    }
    return damage;
  }

  async tigaGolzaIntroCinematic() {
    this.refs.stage.classList.add("golza-awakening");
    this.sound?.playTigaQuake?.();
    await this.say("地面在颤抖", 820);
    await sleep(520);
    await this.say("烟尘裂开。哥尔赞从废墟中觉醒了", 980);
    await sleep(380);
    this.refs.stage.classList.remove("golza-awakening");
  }

  async tigaKyrieloidIntroCinematic() {
    this.refs.stage.classList.add("kyrieloid-opening");
    this.sound?.playTigaGate?.();
    for (const line of this.enemy.intro) await this.say(line, 720);
    await sleep(520);
    this.refs.stage.classList.remove("kyrieloid-opening");
  }

  async tigaKyrieloidImitationCinematic() {
    this.state.set("CUTSCENE");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.bullets.stop();
    this.refs.stage.classList.add("kyrieloid-imitation", "phase-flash");
    this.refs.enemySprite.classList.add("phase-shift");
    this.sound?.playTigaGate?.();
    await this.storyBeat("", "基里艾洛德人没有后退。", 1050, "red");
    await this.storyBeat("", "它沿着迪迦刚才的节奏重新摆正身体。", 1250, "red");
    await this.storyBeat("基里艾洛德人", "再来一次。", 1150, "red");
    this.hideStoryCinematic();
    await sleep(620);
    this.refs.stage.classList.remove("phase-flash");
    this.refs.enemySprite.classList.remove("phase-shift");
    this.inputLocked = false;
  }

  async tigaGatanothorIntroCinematic() {
    this.refs.stage.classList.add("gatanothor-arrival");
    this.sound?.playTigaAbyss?.();
    await this.say("无风无波", 900);
    await sleep(700);
    await this.say("黑暗笼罩在你眼前", 900);
    await sleep(620);
    await this.say("巨大的壳从海雾里浮起。超古代邪神，黑暗支配者加坦杰厄降临", 1150);
    await sleep(520);
    this.refs.stage.classList.remove("gatanothor-arrival");
  }

  setTigaFinaleStep(step) {
    if (!this.refs.tigaFinale) return;
    this.refs.tigaFinale.hidden = false;
    this.refs.tigaFinale.dataset.step = step ?? "";
  }

  scriptedTigaHp(value) {
    this.player.hp = clamp(Math.round(value), 0, this.player.maxHp);
    this.renderResources();
    this.refs.stage.classList.remove("execution-hud-hit");
    void this.refs.stage.offsetWidth;
    this.refs.stage.classList.add("execution-hud-hit");
  }

  addTigaWorldWish(text, index = 0) {
    const layer = this.refs.tigaWishStream;
    if (!layer) return;
    const positions = [[12,22],[76,18],[17,67],[71,72],[28,35],[62,31],[9,48],[80,49],[36,78],[56,14]];
    const [x, y] = positions[index % positions.length];
    const node = document.createElement("span");
    node.className = "tiga-world-wish";
    node.textContent = text;
    node.style.left = `${x}%`;
    node.style.top = `${y}%`;
    node.style.setProperty("--wish-delay", `${(index % 3) * .04}s`);
    layer.appendChild(node);
    setTimeout(() => node.remove(), 3300);
  }

  setTigaMashVisual(count, target) {
    const qte = this.refs.tigaLightQte;
    if (!qte) return;
    const ratio = clamp(count / target, 0, 1);
    this.tigaLightMashCount = count;
    qte.style.setProperty("--core-size", `${12 + ratio * 86}px`);
    qte.style.setProperty("--core-glow", `${18 + ratio * 118}px`);
    qte.style.setProperty("--ring-scale", `${.55 + ratio * 1.75}`);
    qte.style.setProperty("--qte-shake-x", `${(Math.random() * 2 - 1) * (1 + ratio * 8)}px`);
    qte.style.setProperty("--qte-shake-y", `${(Math.random() * 2 - 1) * (1 + ratio * 5)}px`);

    const stage = ratio >= 1 ? "ready" : ratio >= .76 ? "surge" : ratio >= .48 ? "rising" : ratio >= .2 ? "wake" : "seed";
    qte.dataset.stage = stage;
    const beams = [...(this.refs.tigaResponseBeams?.querySelectorAll(".tiga-response-beam") ?? [])];
    const activeCount = Math.floor(ratio * beams.length);
    beams.forEach((beam, i) => beam.classList.toggle("active", i < activeCount));

    qte.classList.remove("mash-hit");
    void qte.offsetWidth;
    qte.classList.add("mash-hit");
    this.sound?.playTigaPlayerLightHit?.(ratio);
  }

  waitForTigaMashPresses(target = 30) {
    return new Promise((resolve) => {
      let count = 0;
      const wishes = ["迪迦奥特曼，加油！","请站起来！","我们还在这里！","不要输！","把明天带回来！","光还没有消失！","我们相信你！","回到我们这里！"];
      const thresholds = [4,8,12,16,20,24,27,30];
      let wishIndex = 0;

      const cleanup = () => {
        window.removeEventListener("keydown", onKey, true);
        this._tigaLightQteCleanup = null;
      };
      const onKey = (event) => {
        const key = String(event.key ?? "").toLowerCase();
        if (!["z","enter"," "].includes(key) || event.repeat) return;
        event.preventDefault();
        event.stopPropagation();
        count += 1;
        this.setTigaMashVisual(count, target);
        while (wishIndex < thresholds.length && count >= thresholds[wishIndex]) {
          this.addTigaWorldWish(wishes[wishIndex], wishIndex);
          this.sound?.playTigaWorldAnswer?.(wishIndex / Math.max(1, thresholds.length - 1));
          wishIndex += 1;
        }
        if (count >= target) {
          cleanup();
          resolve(count);
        }
      };

      this._tigaLightQteCleanup?.();
      this._tigaLightQteCleanup = cleanup;
      window.addEventListener("keydown", onKey, true);
    });
  }

  waitForTigaFinalLightPress() {
    return new Promise((resolve) => {
      const cleanup = () => {
        window.removeEventListener("keydown", onKey, true);
        this._tigaLightQteCleanup = null;
      };
      const onKey = (event) => {
        const key = String(event.key ?? "").toLowerCase();
        if (!["z","enter"," "].includes(key) || event.repeat) return;
        event.preventDefault();
        event.stopPropagation();
        cleanup();
        resolve();
      };
      this._tigaLightQteCleanup?.();
      this._tigaLightQteCleanup = cleanup;
      window.addEventListener("keydown", onKey, true);
    });
  }

  async tigaPlayerLightQte() {
    const qte = this.refs.tigaLightQte;
    const panel = this.refs.storyCinematic;
    if (!qte || !panel) {
      await sleep(2200);
      return;
    }

    panel.hidden = false;
    panel.dataset.mood = "tiga-light";
    qte.hidden = false;
    qte.dataset.stage = "seed";
    this.setTigaFinaleStep("first-light");
    this.setTigaMashVisual(0, this.tigaLightMashTarget);

    if (this.refs.storySpeaker) this.refs.storySpeaker.textContent = "";
    if (this.refs.storyLine) this.refs.storyLine.textContent = "";
    if (this.refs.tigaLightPromptTitle) this.refs.tigaLightPromptTitle.textContent = "让他听见。";
    if (this.refs.tigaLightPromptKey) this.refs.tigaLightPromptKey.textContent = "猛击 Z / ENTER / SPACE";

    await this.waitForTigaMashPresses(this.tigaLightMashTarget);

    qte.dataset.stage = "ready";
    this.setTigaFinaleStep("many-lights");
    await sleep(620);
    await this.storyBeat("", "那一天，所有的人都变成了光。", 1900, "tiga-light");
    await this.storySilence(850, "tiga-light");

    if (this.refs.tigaLightPromptTitle) this.refs.tigaLightPromptTitle.textContent = "再给他一点光。";
    if (this.refs.tigaLightPromptKey) this.refs.tigaLightPromptKey.textContent = "Z / ENTER / SPACE";
    qte.dataset.stage = "final-press";

    await this.waitForTigaFinalLightPress();

    this.sound?.playTigaLightColumn?.();
    qte.dataset.stage = "release";
    this.setTigaFinaleStep("gather");
    panel.classList.add("tiga-qte-release");
    await sleep(580);

    qte.dataset.stage = "world-answer";
    const beams = [...(this.refs.tigaResponseBeams?.querySelectorAll(".tiga-response-beam") ?? [])];
    beams.forEach((beam) => beam.classList.add("active", "world-rush"));
    this.sound?.playTigaWorldConverge?.();
    await sleep(920);

    qte.dataset.stage = "whiteout";
    panel.classList.add("tiga-qte-whiteout");
    await sleep(1850);
    this.sound?.playTigaRevivalHeartbeat?.();
    await sleep(720);
    this.sound?.playTigaRevivalHeartbeat?.();
    await sleep(680);

    panel.classList.remove("tiga-qte-whiteout", "tiga-qte-release");
    qte.hidden = true;
    qte.dataset.stage = "";
    this.setTigaFinaleStep("revive-outline");
    await this.storySilence(1050, "tiga-glitter");
  }

  async tigaGatanothorFinaleCinematic() {
    if (this.tigaFinaleCinematicPlayed) return;
    this.tigaFinaleCinematicPlayed = true;
    this.state.set("CUTSCENE");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.setFrameMode("dialogue");
    this.bullets.stop();
    this.refs.stage.dataset.bossPhase = "2";
    this.refs.stage.classList.add("tiga-final-cinematic");
    this.sound?.stopTigaFinalePulse?.();
    this.sound?.stopMusic?.(1050);

    // 1. Gatanothor wins. This is not a near-death fakeout: Tiga is fully petrified.
    this.setTigaFinaleStep("petrify-charge");
    this.sound?.playTigaPetrify?.();
    await this.storyBeat("", "加坦杰厄的眼睛没有再追着迪迦移动。", 1200, "tiga-dark");
    await this.storyBeat("", "惨白的光先照亮海面，然后照在迪迦身上。", 1350, "tiga-dark");
    this.setTigaFinaleStep("petrify-hit");
    this.scriptedTigaHp(this.player.maxHp * .46);
    await sleep(920);
    this.setTigaFinaleStep("stone");
    this.sound?.playTigaStone?.();
    this.scriptedTigaHp(0);
    this.player.form = "石化";
    this.refs.playerForm.textContent = "石化";
    await this.storyBeat("", "颜色计时器变得灰暗，光从身体表面一寸寸退去。", 1450, "void");
    await sleep(800);
    this.setTigaFinaleStep("sink");
    await this.storyBeat("", "石像重重地沉入了黑海。", 1250, "void");
    await this.storySilence(2600, "void");

    // 2. Human technology tries first. It nearly reaches Daigo, then fails.
    this.setTigaFinaleStep("rescue-ready");
    this.sound?.playTigaRescue?.();
    await this.storyBeat("野瑞", "转换器接通，光量正在上升！", 1180, "tiga-guts");
    await this.storyBeat("宗方", "不要停，把能量全部送下去！", 1250, "tiga-guts");
    await this.storyBeat("丽娜", "……回来，大古。", 1450, "tiga-guts");
    this.setTigaFinaleStep("rescue-light");
    this.scriptedTigaHp(1);
    await sleep(1250);
    await this.storyBeat("", "人造的光终于碰到了石像，颜色计时器亮了一瞬。", 1450, "hope");
    this.setTigaFinaleStep("rescue-break");
    this.sound?.playTigaRescueBreak?.();
    this.scriptedTigaHp(0);
    await sleep(1150);
    await this.storyBeat("", "但一根触腕砸进海面，砸断了光束。", 1300, "tiga-dark");
    await this.storyBeat("", "监视器上的波形重新变成一条直线。", 1300, "void");

    // 3. Let the defeat exist. The rescue failed; do not rush to the miracle.
    this.setTigaFinaleStep("dark");
    await this.storySilence(5600, "void");
    await this.storyBeat("", "..........", 2600, "void");
    await this.storySilence(3200, "void");
    await this.storyBeat("", "人类已经用尽了最后的办法。", 1900, "void");
    await this.storyBeat("", "迪迦的石像沉在深渊般的海底。", 1900, "void");
    await this.storySilence(3000, "void");
    await this.storyBeat("", "故事……就这样结束了吗？", 2300, "void");
    await this.storySilence(2700, "void");

    // 4. The game finally turns to the person holding the controls.
    await this.storyBeat("", "可也许还有一个人没有放弃。", 1900, "void");
    await this.storySilence(1800, "void");
    await this.storyBeat("", "那就是屏幕前的你。", 2450, "tiga-address");
    await this.storySilence(1450, "tiga-address");
    await this.storyBeat("", "如果你还相信迪迦会回来——如果你相信光", 1900, "tiga-light");
    await this.storyBeat("", "那就高举你的双手吧，相信奇迹吧，相信我们的光之战士吧。", 2200, "tiga-light");
    await this.storySilence(900, "tiga-light");

    await this.tigaPlayerLightQte();

    // 5. Revival is a transformation of the whole battlefield, not a simple HP refill.
    await this.storyBeat("", "白光里，颜色计时器重新绽放出了色彩。", 1450, "tiga-glitter");
    this.setTigaFinaleStep("glitter");
    this.sound?.playTigaGlitterTransformation?.();
    this.sound?.playTigaGlitterBattleMusic?.();
    this.sound?.playTigaGlitterRise?.();
    this.tigaGlitterActive = true;
    this.player.form = "闪耀迪迦";
    this.player.attack = Math.max(this.player.attack, 38);
    this.player.hp = this.player.maxHp;
    this.player.energy = this.player.maxEnergy;
    // Glitter Tiga begins a real final round: Gatanothor recovers to full HP instead
    // of entering the climax with only the phase-gate sliver left.
    this.enemy.hp = this.enemy.maxHp;
    this.refs.playerForm.textContent = this.player.form;
    this.refs.stage.classList.remove("tiga-petrified");
    this.refs.stage.classList.add("tiga-glitter-finale");
    if (this.refs.tigaWorldLightsStage) this.refs.tigaWorldLightsStage.hidden = false;
    this.renderResources();
    await this.storyBeat("", "石像表面的第一道裂纹，是金色的。", 1550, "tiga-glitter");
    await this.storyBeat("", "随后，整片海都被照亮。", 1450, "tiga-glitter");
    await this.storyBeat("", "迪迦重新站了起来。", 1650, "tiga-glitter");
    this.hideStoryCinematic();
    await sleep(720);
    if (this.refs.tigaFinale) { this.refs.tigaFinale.hidden = true; this.refs.tigaFinale.dataset.step = ""; }
    this.refs.stage.classList.remove("tiga-final-cinematic");
    // The supplied final-phase track is already fading in beneath the transformation audio.

    if (this.refs.phaseBanner && this.refs.phaseTitle) {
      if (this.refs.phaseKicker) this.refs.phaseKicker.textContent = "FINAL PHASE";
      this.refs.phaseTitle.textContent = "致以辉煌的人们";
      this.refs.phaseBanner.hidden = false;
      this.refs.phaseBanner.classList.remove("show");
      void this.refs.phaseBanner.offsetWidth;
      this.refs.phaseBanner.classList.add("show");
      await sleep(1300);
      this.refs.phaseBanner.classList.remove("show");
      this.refs.phaseBanner.hidden = true;
    }
    this.refs.enemyPhase.textContent = "邪神 · 光之海";
    this.inputLocked = false;
    this.renderCommandAvailability();
  }

  async storyBeat(speaker, line, duration = 1100, mood = "") {
    const panel = this.refs.storyCinematic;
    if (!panel) {
      await this.say(`${speaker ? `${speaker}：` : ""}${line}`, Math.max(420, duration));
      return;
    }

    panel.hidden = false;
    panel.dataset.mood = mood || "normal";
    const cosmosFinalPace = ["cosmos-final","cosmos-miracle","cosmos-gold","cosmos-dawn"].includes(String(mood || ""));
    if (this.refs.storySpeaker) this.refs.storySpeaker.textContent = speaker ?? "";
    if (this.refs.storyLine) {
      const chars = [...String(line ?? "")];
      this.refs.storyLine.textContent = "";
      this.refs.storyLine.classList.remove("show");
      void this.refs.storyLine.offsetWidth;
      this.refs.storyLine.classList.add("show");
      const nexusPace = String(mood || "").startsWith("nexus-");
      const cosmosPace = String(mood || "").startsWith("cosmos-");
      const zagiLegacyScene = this.enemy.encounterMode === "nexus_dark_zagi_bond"
        && !!this.refs.nexusLegacyVision?.dataset.scene
        && !String(this.refs.nexusLegacyVision.dataset.scene).startsWith("zagi-finish");
      const storyCharDelay = nexusPace
        ? Math.max(this.storyCharMs, zagiLegacyScene ? 58 : 47)
        : cosmosPace
          ? Math.max(this.storyCharMs, cosmosFinalPace ? 52 : 42)
          : this.storyCharMs;
      for (const char of chars) {
        this.refs.storyLine.textContent += char;
        const punctuation = /[。！？!?…]/.test(char)
          ? (nexusPace ? (zagiLegacyScene ? 205 : 158) : cosmosPace ? (cosmosFinalPace ? 168 : 126) : 92)
          : /[，、；：]/.test(char)
            ? (nexusPace ? (zagiLegacyScene ? 112 : 88) : cosmosPace ? (cosmosFinalPace ? 96 : 72) : 54)
            : storyCharDelay;
        await sleep(punctuation);
      }
    }
    const moodName = String(mood || "");
    const zagiLegacyHold = this.enemy.encounterMode === "nexus_dark_zagi_bond"
      && !!this.refs.nexusLegacyVision?.dataset.scene
      && !String(this.refs.nexusLegacyVision.dataset.scene).startsWith("zagi-finish");
    const storyHold = moodName.startsWith("nexus-")
      ? Math.max(zagiLegacyHold ? 1750 : 1150, Math.round(duration * (zagiLegacyHold ? 1.52 : 1.28)))
      : moodName.startsWith("cosmos-")
        ? Math.max(cosmosFinalPace ? 1380 : 980, Math.round(duration * (cosmosFinalPace ? 1.34 : 1.16)))
        : Math.max(700, duration);
    await sleep(storyHold);
  }

  async storySilence(duration = 3200, mood = "void") {
    const panel = this.refs.storyCinematic;
    if (!panel) { await sleep(duration); return; }
    panel.hidden = false;
    panel.dataset.mood = mood;
    if (this.refs.storySpeaker) this.refs.storySpeaker.textContent = "";
    if (this.refs.storyLine) {
      this.refs.storyLine.classList.remove("show");
      this.refs.storyLine.textContent = "";
    }
    await sleep(duration);
  }

  hideStoryCinematic() {
    if (!this.refs.storyCinematic) return;
    this.refs.storyCinematic.classList.add("leave");
    setTimeout(() => {
      if (!this.refs.storyCinematic) return;
      this.refs.storyCinematic.hidden = true;
      this.refs.storyCinematic.classList.remove("leave", "first-spark", "more-sparks", "crowd-light", "execution-active", "execution-dead", "tiga-qte-release", "tiga-qte-whiteout", "ginga-revival-cinematic");
      this.refs.storyCinematic.dataset.mood = "";
      if (this.refs.storyExecution) { this.refs.storyExecution.hidden = true; this.refs.storyExecution.dataset.step = ""; }
      if (this.refs.gingaRevivalVision) { this.refs.gingaRevivalVision.hidden = true; this.refs.gingaRevivalVision.dataset.step = ""; }
      if (this.refs.misuzuBondVision) { this.refs.misuzuBondVision.hidden = true; this.refs.misuzuBondVision.dataset.step = ""; }
      if (this.refs.nexusLegacyVision) { this.refs.nexusLegacyVision.hidden = true; this.refs.nexusLegacyVision.dataset.scene = ""; this.refs.nexusLegacyVision.dataset.owner = ""; this.refs.nexusLegacyVision.classList.remove("active"); }
      if (this.refs.nexusHimeyaVision) { this.refs.nexusHimeyaVision.hidden = true; this.refs.nexusHimeyaVision.dataset.scene = ""; this.refs.nexusHimeyaVision.classList.remove("active"); }
      if (this.refs.storyTaro) this.refs.storyTaro.hidden = true;
      if (this.refs.tigaLightQte) { this.refs.tigaLightQte.hidden = true; this.refs.tigaLightQte.dataset.stage = ""; }
      if (this.refs.tigaWishStream) this.refs.tigaWishStream.textContent = "";
    }, 520);
  }

  showSupportCallout(name, line, duration = 1050) {
    const box = this.refs.supportCallout;
    if (!box) return;
    if (this._supportCalloutTimer) clearTimeout(this._supportCalloutTimer);
    this.refs.supportName.textContent = name;
    this.refs.supportLine.textContent = line;
    box.hidden = false;
    box.classList.remove("show");
    void box.offsetWidth;
    box.classList.add("show");
    this._supportCalloutTimer = setTimeout(() => {
      box.classList.remove("show");
      setTimeout(() => { if (box) box.hidden = true; }, 260);
    }, duration);
  }

  setGingaRevivalStep(step) {
    const vision = this.refs.gingaRevivalVision;
    if (!vision) return;
    vision.hidden = false;
    vision.dataset.step = step ?? "";
  }

  pulseGingaRevivalSpark() {
    const vision = this.refs.gingaRevivalVision;
    if (!vision) return;
    vision.classList.remove("light-hit");
    void vision.offsetWidth;
    vision.classList.add("light-hit");
    setTimeout(() => vision.classList.remove("light-hit"), 180);
  }

  setLugielExecutionStep(step) {
    if (!this.refs.storyExecution) return;
    this.refs.storyExecution.hidden = false;
    this.refs.storyExecution.dataset.step = step ?? "";
    this.refs.storyCinematic?.classList.add("execution-active");
  }

  scriptedFinaleHp(value) {
    this.player.hp = clamp(Math.round(value), 0, this.player.maxHp);
    this.renderResources();
    this.refs.stage.classList.remove("execution-hud-hit");
    void this.refs.stage.offsetWidth;
    this.refs.stage.classList.add("execution-hud-hit");
  }

  async lugielExecutionSequence() {
    if (this.lugielFinaleExecutionPlayed) return;
    this.lugielFinaleExecutionPlayed = true;
    const maxHp = this.player.maxHp;

    this.setLugielExecutionStep("lock");
    this.sound?.playExecutionLock?.();
    await this.storyBeat("黑暗路基艾尔", "你所选择的未来——就到这里划上句号。", 1250, "red");

    this.setLugielExecutionStep("spear-a");
    this.sound?.playExecutionHit?.(0);
    this.scriptedFinaleHp(Math.min(this.player.hp, maxHp * .62));
    await sleep(820);

    this.setLugielExecutionStep("spear-b");
    this.sound?.playExecutionHit?.(1);
    this.scriptedFinaleHp(maxHp * .34);
    await sleep(900);

    this.setLugielExecutionStep("cross");
    this.sound?.playExecutionHit?.(2);
    this.scriptedFinaleHp(maxHp * .12);
    await this.storyBeat("", "Dark Spark 把银河钉在静止的时间里。", 1180, "red");

    this.setLugielExecutionStep("crush");
    this.sound?.playExecutionHit?.(3);
    this.scriptedFinaleHp(1);
    await sleep(1050);

    this.setLugielExecutionStep("charge");
    this.sound?.playExecutionCharge?.();
    await this.storyBeat("黑暗路基艾尔", "停止吧。", 1250, "red");
    await sleep(620);

    this.setLugielExecutionStep("beam");
    this.sound?.playExecutionEnd?.();
    this.scriptedFinaleHp(0);
    await sleep(1450);

    this.setLugielExecutionStep("shatter");
    this.refs.storyCinematic?.classList.add("execution-dead");
    await sleep(1250);
    await this.storyBeat("", "银河的光，熄灭了。", 1500, "void");
    this.setLugielExecutionStep("after");
    await sleep(700);
  }

  async gingaLugielFinaleCinematic() {
    if (this.lugielFinaleCinematicPlayed) return;
    this.lugielFinaleCinematicPlayed = true;

    this.state.set("CUTSCENE");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.setFrameMode("dialogue");
    this.bullets.stop();
    this.refs.stage.dataset.bossPhase = "2";
    this.refs.enemyPhase.textContent = "绝对停止 · 最后的未来";
    this.refs.stage.classList.remove("time-stopped", "future-awakened");
    this.refs.stage.classList.add("lugiel-despair");
    this.refs.enemySprite.classList.add("lugiel-overwhelm");

    this.player.energy = 0;
    if (this.enemy.interfaceGauge) this.enemy.interfaceGauge.value = this.enemy.interfaceGauge.threshold ?? 100;
    this.renderResources();

    this.sound?.stopFinalePulse?.();
    this.sound?.playMusic?.("ginga_lugiel_despair", { volume:.20, fadeInMs:1800, fadeOutMs:1400 });
    this.sound?.playFinaleDespair?.();

    await this.storyBeat("黑暗路基艾尔", "这个宇宙，只需要永恒的静止就足够了，这就是我的终极天堂。", 1500, "red");
    await this.lugielExecutionSequence();
    await this.storySilence(4700, "void");
    await this.storyBeat("", "..........", 2300, "void");
    await this.storySilence(2500, "void");
    await this.storyBeat("", "世界不再运转。", 2150, "void");
    await this.storyBeat("", "没有风，没有声音，也没有未来。", 1900, "void");

    if (this.refs.storyExecution) { this.refs.storyExecution.hidden = true; this.refs.storyExecution.dataset.step = ""; }
    this.refs.storyCinematic?.classList.remove("execution-active", "execution-dead");
    this.refs.storyCinematic?.classList.add("ginga-revival-cinematic");

    // The light is no longer a generic starfield. Every response physically enters the Ginga Spark.
    this.setGingaRevivalStep("seed");
    this.sound?.playHopeSpark?.();
    await this.storyBeat("美铃", "小光！加油啊！你不是说过要成为世界第一的冒险家吗？ 你的冒险，不应该在这里结束！", 1600, "hope");
    this.pulseGingaRevivalSpark();
    await sleep(520);
    this.sound?.playMusic?.("ginga_lugiel_friends", { volume:.14, fadeInMs:2600, fadeOutMs:1800 });

    this.setGingaRevivalStep("friends");
    await this.storyBeat("健太", "小光！我以后还要拍好多好多你拍不到的世界美景呢！所以，绝对不能输啊！", 1700, "hope");
    this.pulseGingaRevivalSpark();
    await this.storyBeat("千草", "小光！我一定要成为偶像，要在大家面前唱歌！我的梦想才刚刚开始啊！", 1550, "hope");
    this.pulseGingaRevivalSpark();
    await this.storyBeat("友也", "礼堂光！是你教会了我什么是真正的坚强……我们的未来，绝对不会在这里被停下！", 1850, "hope");
    this.pulseGingaRevivalSpark();

    this.setGingaRevivalStep("crowd");
    await this.storyBeat("", "一道又一道光从被静止的世界里飞来。", 1750, "hope");
    await this.storyBeat("", "每一颗都带着大家的决心落进银河火花。", 1850, "hope");
    this.pulseGingaRevivalSpark();

    if (this.refs.storyTaro) {
      this.refs.storyTaro.hidden = false;
      this.refs.storyTaro.classList.remove("rise");
      void this.refs.storyTaro.offsetWidth;
      this.refs.storyTaro.classList.add("rise");
    }
    this.setGingaRevivalStep("taro");
    this.sound?.playTaroSupport?.();
    await this.storyBeat("泰罗", "小光！站起来，银河奥特曼！ 带着大家的梦想，去开辟未来吧！", 1900, "taro");
    this.pulseGingaRevivalSpark();
    await this.storyBeat("", "越来越多的光涌入，银河火花为人们的决心而产生了震颤。", 1750, "taro");

    // Light overload: the device swallows the entire frame, then returns as a rainbow object.
    this.sound?.playMusic?.("ginga_lugiel_transform", { volume:.15, fadeInMs:2200, fadeOutMs:1800 });
    if (this.refs.storySpeaker) this.refs.storySpeaker.textContent = "";
    if (this.refs.storyLine) this.refs.storyLine.textContent = "";
    if (this.refs.storyTaro) this.refs.storyTaro.hidden = true;
    this.setGingaRevivalStep("whiteout");
    this.sound?.playGingaSparkOverload?.();
    await sleep(1900);
    this.setGingaRevivalStep("rainbow");
    await sleep(1250);
    await this.storyBeat("礼堂光", "把我们的未来……还给我们！！", 1550, "ignite");
    await this.storyBeat("银河", "未来——开始移动。", 1500, "ignite");

    // The rainbow Ginga Spark does not fade the cutscene away: it physically breaks the frozen frame.
    this.setGingaRevivalStep("break");
    this.sound?.playGingaRainbowBreak?.();
    await sleep(1050);
    this.refs.stage.classList.remove("lugiel-despair");
    this.refs.stage.classList.add("ginga-reignite", "finale-hope", "ginga-rainbow-return");
    await sleep(420);

    // Full rematch: revival resets both sides. The final phase must feel like a new battle, not a cleanup hit.
    this.player.hp = this.player.maxHp;
    this.player.energy = this.player.maxEnergy;
    this.enemy.hp = this.enemy.maxHp;
    this.enemy.rage = Math.max(this.enemy.rage ?? 0, .42);
    if (this.enemy.interfaceGauge) this.enemy.interfaceGauge.value = 42;
    this.lugielFinaleSupportActive = true;
    this.lugielFinaleImmortal = true;
    this.flags.lightShield = true;
    this.renderResources();
    this.renderCommandAvailability();

    if (this.refs.finaleStarfield) this.refs.finaleStarfield.hidden = true;
    if (this.refs.finaleAllies) this.refs.finaleAllies.hidden = false;

    this.hideStoryCinematic();
    this.sound?.playMusic?.("ginga_lugiel_final_battle", { volume:.12, fadeInMs:3200, fadeOutMs:1600 });

    if (this.refs.phaseBanner && this.refs.phaseTitle) {
      if (this.refs.phaseKicker) this.refs.phaseKicker.textContent = "FINAL PHASE";
      this.refs.phaseTitle.textContent = "ABSOLUTE STOP / REMATCH";
      this.refs.phaseBanner.hidden = false;
      this.refs.phaseBanner.classList.remove("show");
      void this.refs.phaseBanner.offsetWidth;
      this.refs.phaseBanner.classList.add("show");
      await sleep(1050);
      this.refs.phaseBanner.classList.remove("show");
      this.refs.phaseBanner.hidden = true;
    }

    this.refs.enemySprite.classList.remove("lugiel-overwhelm");
    setTimeout(() => this.refs.stage.classList.remove("ginga-rainbow-return"), 1500);
    this.inputLocked = false;
  }

  applyGingaFinaleRoundSupport() {
    if (!this.lugielFinaleSupportActive || this.enemy.encounterMode !== "ginga_lugiel_future" || this.phaseIndex < 2) return;
    const beats = [
      { name: "美铃", line: "一起前进吧，小光！", hp: 7, stasis: -4 },
      { name: "健太 / 千草", line: "别让它停下来！", energy: 8, stasis: -5 },
      { name: "友也", line: "下一处落点，看见了！", mark: true, stasis: -4 },
      { name: "泰罗", line: "向前！小光。", shield: true, anchor: true, stasis: -7 }
    ];
    const beat = beats[this.lugielFinaleSupportBeat % beats.length];
    this.lugielFinaleSupportBeat += 1;

    if (beat.hp) this.player.hp = Math.min(this.player.maxHp, this.player.hp + beat.hp);
    if (beat.energy) this.gainEnergy(beat.energy);
    if (beat.stasis) this.adjustInterfaceGauge(beat.stasis);
    if (beat.mark) this.flags.stasisMarkBoost = true;
    if (beat.anchor) this.flags.stasisAnchorBoost = true;
    if (beat.shield) this.flags.lightShield = true;
    this.renderResources();
    this.showSupportCallout(beat.name, beat.line);
  }

  async maybeAdvancePhase() {
    if (["cosmos_chaos_ultraman", "cosmos_chaos_darkness"].includes(this.enemy.encounterMode)) return false;
    if (this.enemy.encounterMode === "nexus_mephisto_one_himeya") return false;
    if (!this.enemy.phases?.length) return false;
    const hpRatio = this.enemy.hp / this.enemy.maxHp;
    let changed = false;

    while (this.phaseIndex + 1 < this.enemy.phases.length && hpRatio <= this.enemy.phases[this.phaseIndex + 1].threshold) {
      this.phaseIndex += 1;
      this.sound?.play("phase");
      this.currentPhase = this.enemy.phases[this.phaseIndex];
      changed = true;

      if (this.enemy.encounterMode === "leo_pressure" && this.phaseIndex === 1) {
        await this.leoPressureShrinkCinematic();
        continue;
      }
      if (this.enemy.encounterMode === "leo_black_end" && this.phaseIndex === 1) {
        await this.leoBlackEndHostageCinematic();
        continue;
      }
      if (this.enemy.encounterMode === "ginga_lugiel_future" && this.phaseIndex === 2) {
        await this.gingaLugielFinaleCinematic();
        continue;
      }
      if (this.enemy.encounterMode === "tiga_gatanothor_finale" && this.phaseIndex === 2) {
        await this.tigaGatanothorFinaleCinematic();
        continue;
      }
      if (this.enemy.encounterMode === "tiga_kyrieloid" && this.phaseIndex === 1) {
        await this.tigaKyrieloidImitationCinematic();
      }
      if (this.enemy.encounterMode === "cosmos_chaos_ultraman" && this.phaseIndex === 1) {
        await this.cosmosChaosUltramanEclipseCinematic();
        continue;
      }
      if (this.enemy.encounterMode === "cosmos_chaos_ultraman" && this.phaseIndex === 2) {
        await this.cosmosChaosUltramanCalamityCinematic();
        continue;
      }
      if (this.enemy.encounterMode === "cosmos_chaos_darkness" && this.phaseIndex === 1) {
        await this.cosmosChaosDarknessNoAnswerCinematic();
        continue;
      }
      if (this.enemy.encounterMode === "cosmos_chaos_darkness" && this.phaseIndex === 2) {
        await this.cosmosChaosDarknessMiracleCinematic();
        continue;
      }
      if (this.enemy.encounterMode === "nexus_mephisto_zwei" && this.phaseIndex === 2) {
        await this.nexusMizorogiAssistCinematic();
        continue;
      }
      if (this.enemy.encounterMode === "nexus_dark_zagi_bond") {
        const form = ["anphans", "junis", "junis-blue", "noa"][this.phaseIndex] ?? "anphans";
        await this.nexusZagiFormCinematic(form);
        continue;
      }
      if (this.originalBattle) {
        await this.originalPhaseCinematic();
      }

      if (this.enemy.encounterMode === "ginga_dark_brothers" && this.phaseIndex === 1 && !this.darkHijackedCommand) this.hijackOneCommand();
      if (this.enemy.encounterMode === "ginga_lugiel" && this.phaseIndex === 2) {
        for (const command of ["SKILL", "ACT", "ITEM"]) this.frozenCommands.add(command);
        this.renderCommandAvailability();
      }
      if (this.currentPhase.nexusMetaField) {
        this.nexusMetaField = true;
        this.updateNexusFieldVisual();
      }

      this.refs.enemyPhase.textContent = this.currentPhase.subtitle ?? this.enemy.subtitle ?? "";
      this.refs.stage.dataset.bossPhase = String(this.phaseIndex);
      this.refs.enemySprite.classList.add("phase-shift");
      this.refs.stage.classList.add("phase-flash");

      if (this.refs.phaseBanner && this.refs.phaseTitle) {
        this.refs.phaseTitle.textContent = this.currentPhase.title;
        this.refs.phaseBanner.hidden = false;
        this.refs.phaseBanner.classList.remove("show");
        void this.refs.phaseBanner.offsetWidth;
        this.refs.phaseBanner.classList.add("show");
      }

      await sleep(850);
      if (this.refs.phaseBanner) { this.refs.phaseBanner.classList.remove("show"); this.refs.phaseBanner.hidden = true; }
      this.refs.enemySprite.classList.remove("phase-shift");
      this.refs.stage.classList.remove("phase-flash");

      for (const line of this.currentPhase.text ?? []) await this.say(line);
    }
    return changed;
  }

  async enemyResponse() {
    this.state.set("ENEMY_RESPONSE");

    const sprite = this.refs.enemySprite;
    sprite.classList.add("roar");
    setTimeout(() => sprite.classList.remove("roar"), 720);

    if (this.enemy.encounterMode === "original_belial") {
      const response=this.belialPickBark(this.phaseIndex>=2&&this.enemy.hp/this.enemy.maxHp<.18?"lowHp":"roundStart");
      const pose=(this.turn%4===0)?"belial-laugh":(this.turn%3===0)?"belial-point":"belial-taunt";
      // Belial speaks as a character on the stage. Do not freeze him inside the generic
      // dialogue box for half a second before every attack. The bubble and pose are the
      // dialogue; the battle moves on underneath it.
      this.setFrameMode("dialogue");
      this.showBelialBark(response,980,pose);
      await sleep(420);
    } else {
      const responsePool = this.phasePool("responses");
      const pool = responsePool?.length ? responsePool : [`${this.enemy.name}动了。`];
      const response = pool[(this.turn - 1) % pool.length];
      await this.say(`* ${response}`, 520);
    }

    if (this.player.hp <= 0) return this.defeat();
    await this.enemyAttack();
  }

  async enemyAttack() {
    this.state.set("ENEMY_ATTACK");
    this.setCommandsEnabled(false);

    let defenseMode = this.enemy.defenseMode ?? (this.gingaBattle ? "ginga" : "dodge");
    // Zetton's first phase changes the player's defensive language completely: the player
    // stands their ground and turns a four-direction guard instead of free-dodging.
    if (this.enemy.encounterMode === "original_zetton") {
      const zettonCycle = (Math.max(1, this.turn) - 1) % 3;
      defenseMode = this.phaseIndex === 0 ? (zettonCycle === 2 ? "original" : "guard") : "original";
    }
    if (this.enemy.encounterMode === "ginga_super_grand_king") {
      if (this.phaseIndex === 0 && this.flags.gingaMindDive) defenseMode = "memory";
      else defenseMode = "siege";
    }

    // Belial's phase changes are not cutscenes. The first enemy turn after each
    // threshold becomes one long, fully playable attack window, then combat
    // returns to the ordinary menu loop.
    let belialSpecial = null;
    let belialSpecialPhase = null;
    let patternSet = this.enemy.patternSet;
    if (this.enemy.encounterMode === "original_belial") {
      const pending = Number(this.belialTransitionPending ?? 0);
      if ((pending === 1 || pending === 2) && !this.belialTransitionSeen.has(pending)) {
        belialSpecialPhase = pending;
        belialSpecial = pending === 1 ? "galaxy" : "abyss";
        patternSet = pending === 1 ? "original_belial_galaxy" : "original_belial_abyss";
      }
    }
    if (this.refs.microHelp) {
      this.refs.microHelp.textContent = defenseMode === "memory"
        ? "意识连接：WASD / 方向键移动 · 碰到记忆之光后把它带回中央的美铃光点 · 受击会把携带的光震落"
        : defenseMode === "siege"
          ? (this.phaseIndex === 0 ? "重装围城：先活下来；古兰德王的装甲现在不是主要目标，使用 ACTION 进入意识连接" : "联合作战：WASD / 方向键移动 · 接住横穿战场的支援光可获得一次护持并反打装甲")
        : defenseMode === "stasis"
          ? (this.phaseIndex === 0 ? "时间停止：移动躲避 · 世界变灰时靠近冻结攻击并按 Z / Enter 留下未来标记" : "未来意识：时间停止后身体会留在原地；操控蓝色未来光靠近冻结攻击并按 Z / Enter 标记")
        : defenseMode === "mirror"
        ? "Dark Live：记住最初亮起的真 Sign · 靠近对应指令后按 Z / Enter 验证 · 假 Sign 会污染菜单"
        : defenseMode === "freeze"
          ? "Dark Spark：被冻结的指令会变成场内结晶 · 靠近后按 Z / Enter 打碎，才能把按钮抢回来"
        : defenseMode === "ginga" && this.gingaLiveForm === "black-king"
          ? "电路战：WASD / 方向键移动 · 靠近亮起节点后按 Z / Enter 重踏接地"
          : defenseMode === "ginga"
            ? "Plasma Conduct：WASD / 方向键移动 · 导流雷接近时按 Z / Enter 把雷电接入银河水晶"
        : defenseMode === "nexus" && this.enemy.encounterMode === "nexus_mephisto_one_himeya"
          ? (this.himeyaOneHpLocked && !this.himeyaNightRaiderRestored ? "姬矢准：生命只剩 1，但光不会在这里熄灭 · WASD / 方向键移动，先活过梅菲斯特的黑暗攻势" : "姬矢准：WASD / 方向键移动 · 看清长矛、爪击与十字光的预警")
        : defenseMode === "nexus" && this.enemy.encounterMode === "nexus_mephisto_zwei"
          ? "青年蓝：WASD / 方向键移动 · Z / Enter / Space 在敌方回合直接发射弓箭光束 · 优先击碎赤眼标记和吸能体"
        : defenseMode === "nexus" && this.enemy.encounterMode === "nexus_dark_zagi_bond" && this.nexusForm === "junis"
          ? "青年红：WASD / 方向键移动 · 扎基正面冲撞贴近时按 Z / Enter 迎击"
        : defenseMode === "nexus" && this.enemy.encounterMode === "nexus_dark_zagi_bond" && this.nexusForm === "junis-blue"
          ? "青年蓝：高速移动 · Z / Enter / Space 发射光箭，击碎空中的黑暗节点"
        : defenseMode === "nexus" && this.enemy.encounterMode === "nexus_dark_zagi_bond" && this.nexusForm === "noa"
          ? "NOA：高速移动 · 红色回返弹接近时按 Z / Enter 展开诺亚脉冲，把它送回扎基"
        : defenseMode === "nexus"
          ? "奈克瑟斯：WASD / 方向键移动 · Z / Enter 切断特殊目标"
        : this.enemy.encounterMode === "original_zetton" && this.phaseIndex === 0
          ? (defenseMode === "guard" ? "杰顿：WASD / 方向键转动防御方向" : "杰顿：WASD / 方向键自由移动 · 瞬移路线出现后立刻离开")
        : this.enemy.encounterMode === "original_belial"
          ? (belialSpecial === "galaxy"
            ? "银河追逐：WASD / 方向键飞行 · Z / Enter / Space 射击流星与陨石 · 把追踪光球引回贝利亚"
            : belialSpecial === "abyss"
              ? "终局领域：WASD / 方向键移动 · 看清四周结构与大型光线预警 · 帝斯修姆光线只有一击，但范围极大"
              : "贝利亚：WASD / 方向键移动 · 蓝色斩击时停下 · 橙色斩击时持续移动 · 巨镰光线临身时按 Z 格挡")
        : this.enemy.encounterMode === "original_five_king"
          ? "五帝王：WASD / 方向键移动 · 被破坏的身体部位不会再发动对应攻击"
        : this.enemy.encounterMode === "original_greeza"
          ? "格利扎：WASD / 方向键移动 · 身体的位置和攻击来源并不总是一致"
        : this.enemy.encounterMode === "original_grand_king"
          ? "古兰特王：WASD / 方向键移动 · 注意两侧感应光束、巨拳与炮口锁定"
        : defenseMode === "guard"
        ? "敌方回合：WASD / 方向键将防御面朝向来袭方向"
        : defenseMode === "boss" && this.phaseIndex === 1
          ? "敌方回合：WASD / 方向键移动 · 两条亮线之间是黑暗墙的安全区"
          : defenseMode === "boss" && this.enemy.encounterMode === "tiga_gatanothor_finale" && this.tigaGlitterActive
            ? "闪耀终局：WASD / 方向键移动 · 金色光层会减轻伤害，但石化光束仍然需要躲开"
        : defenseMode === "boss" && this.phaseIndex >= 2
            ? "敌方回合：WASD / 方向键移动 · 先看石化光束与触腕预警"
            : defenseMode === "boss"
              ? "敌方回合：WASD / 方向键移动 · 先看预警，再找安全区"
              : defenseMode === "prophecy"
                ? "地狱之门：WASD / 方向键移动 · 抵抗上方拖拽 · 接住金色光点压回门扉"
              : defenseMode === "nexus"
                ? "捕食战：WASD / 方向键移动 · 靠近橙色捕食胞后按 Z / Enter 切断 · 白色攻击照常躲"
              : defenseMode === "pressure"
                ? (this.phaseIndex === 1 ? "一寸雷欧：WASD / 方向键移动 · 巨物碰撞范围也变大 · 先从气球和瓦砾里活下来" : this.phaseIndex >= 2 ? "Ultra Mantle：WASD / 方向键移动 · 魔法靠近时按 Z / Enter 展开披风反射" : "魔法战：WASD / 方向键移动 · 先看杖尖和空间预警")
              : defenseMode === "leo"
                ? (this.enemy.encounterMode === "leo_black_end"
                    ? "最后的圆盘生物：WASD / 方向键移动 · 巨角冲撞贴近时按 Z / Enter 正面迎击折角"
                    : "三方围攻：WASD / 方向键移动 · 双子冲阵逼近时按 Z / Enter 迎击，别忘了马格马星人的佩剑")
              : defenseMode === "platform"
                ? `追击：A / D 移动 · W / ↑ / Z 跳跃 · 爬到 ${this.config.arena.floorsPerRound ?? 9} 层逼出弱点`
                : defenseMode === "chaos" && this.cosmosBattle
                  ? (this.enemy.encounterMode === "cosmos_chaos_ultraman" && this.phaseIndex === 1
                    ? "ECLIPSE BREAK：WASD移动 · 靠近带 CORE 标记的复制节点 · Z / Enter / Space 精确切断 · 一共 3 枚"
                    : this.cosmosForm === "luna" ? "月神：WASD移动 · Z / Enter / Space 发出短距离净化脉冲，自动清除身边部分卡俄斯弹体" : this.cosmosForm === "corona" ? "日冕：WASD移动 · 按住方向并按 Z / Enter / Space 突进，短暂无敌并撞碎路径附近的卡俄斯弹体" : this.cosmosForm === "eclipse" ? "日蚀：WASD移动 · Z / Enter / Space 精确切断附近最危险的卡俄斯结构" : "奇迹月神：WASD移动 · Z / Enter / Space 净化战场上的卡俄斯攻击，包括正在移动的墙与光束")
                  : defenseMode === "chaos" && this.flags.purifyActive && this.mercyRouteEnabled()
                  ? "净化：WASD / 方向键移动 · 接住黑紫色混沌碎片 · 白色攻击仍然要躲"
                  : defenseMode === "chaos"
                    ? "敌方回合：WASD / 方向键移动 · 白色攻击和混沌碎片都要避开"
                    : "敌方回合：WASD / 方向键移动";
    }

    if (this.enemy.encounterMode === "ginga_lugiel_future" && this.phaseIndex >= 2) {
      this.applyGingaFinaleRoundSupport();
      await sleep(280);
    }

    if (this.enemy.encounterMode === "original_belial") this.refs.stage.classList.add("belial-arena-active");
    if (belialSpecial === "galaxy") this.refs.stage.classList.add("belial-galaxy-flight");
    if (belialSpecial === "abyss") this.refs.stage.classList.add("belial-abyss-field");

    this.refs.enemySprite.classList.add("charged");
    await sleep(150);
    this.setFrameMode("arena");

    let intensity = this.enemy.boss
      ? Math.min(1.62, 1.04 + this.phaseIndex * .15 + this.enemy.rage * .1)
      : Math.min(1.72, 1 + (this.turn - 1) * .085 + this.enemy.rage * .14);
    if (this.enemy.encounterMode === "cosmos_chaos_ultraman" && this.phaseIndex === 0) {
      const copyRatio = clamp((this.enemy.interfaceGauge?.value ?? 0) / Math.max(1, this.enemy.interfaceGauge?.threshold ?? 100), 0, 1);
      intensity = Math.min(1.78, intensity * (1 + copyRatio * .18));
    }
    const telegraphScale = (this.flags.nextEnemyTelegraph ? 1.7 : 1) * (this.flags.guardAssist ? 1.12 : 1);
    const guardBonus = this.flags.guardAssist ? 8 : 0;
    const speedBonus = this.flags.speedBoost ? 48 : 0;
    let attackDuration = this.currentPhase?.durationMs ?? this.config.arena.durationMs;
    // Grand King's infrared sensor rounds deliberately breathe more than the other
    // artillery patterns. Keep the same number of blue/orange beams, but extend only
    // these rounds so each colour decision has a readable gap instead of stacking.
    if (this.enemy.encounterMode === "original_grand_king") {
      const grandVariant = (Math.max(1, this.turn) - 1) % (this.phaseIndex === 0 ? 4 : 5);
      if (this.phaseIndex === 0 && grandVariant === 0) attackDuration = 11000;
      else if (this.phaseIndex === 0 && grandVariant === 3) attackDuration = 14000;
      else if (this.phaseIndex === 2 && grandVariant === 2) attackDuration = 13600;
    }
    if (this.enemy.encounterMode === "original_belial" && !belialSpecial) {
      const belialVariant=(Math.max(1,this.turn)-1)%5;
      const phaseDurations=[
        [9600,9100,7600,12100,11600],
        [11600,10300,9000,13500,12400],
        [13400,13400,13400,16000,13400]
      ];
      attackDuration=phaseDurations[Math.min(2,this.phaseIndex)]?.[belialVariant] ?? attackDuration;
    }
    if (belialSpecial === "galaxy") attackDuration = 19000;
    if (belialSpecial === "abyss") attackDuration = 22000;
    if (defenseMode === "freeze") this.prepareLugielFreezeTargets();

    await sleep(this.enemy.encounterMode === "original_belial" ? 90 : 250);
    this.refs.enemySprite.classList.remove("charged");

    let result;
    try {
      result = await this.bullets.start(attackDuration, {
      mode: defenseMode,
      patternSet,
      intensity,
      rage: Math.min(1, this.enemy.rage * .22),
      telegraphScale,
      guardBonus,
      speedBonus: speedBonus + (this.lugielFinaleSupportActive && this.phaseIndex >= 2 ? 28 : 0) + (this.originalBattle ? this.originalSpeedBonus() : 0),
      jumpBonus: this.flags.jumpBoost ? 58 : 0,
      platformAssist: this.flags.platformAssist,
      platformFloorsTarget: this.config.arena.floorsPerRound ?? 9,
      purifyActive: this.flags.purifyActive && this.mercyRouteEnabled(),
      purifyBoost: this.flags.purifyBoost,
      cosmosForm: this.cosmosForm,
      cosmosLunaAssist: this.flags.cosmosLunaAssist,
      cosmosCoronaAssist: this.flags.cosmosCoronaAssist,
      cosmosEclipseAssist: this.flags.cosmosEclipseAssist,
      cosmosMiracleActive: this.cosmosMiracleActive,
      cosmosHeart: this.enemy.interfaceGauge?.value ?? 0,
      cosmosMonsterTrust: !!this.flags.cosmosMonsterTrust,
      chaosFragmentGain: this.enemy.mercy?.fragmentGain ?? 12,
      chaosMissPenalty: this.enemy.mercy?.fragmentMissPenalty ?? 5,
      chaosFragmentsTarget: this.config.arena.chaosFragmentsPerRound ?? 5,
      gatePressure: this.enemy.gate?.value ?? 0,
      gatePassivePerSecond: this.enemy.gate?.passivePerSecond ?? 0,
      gateLightReduce: this.enemy.gate?.lightReduce ?? 0,
      gateBurstReset: this.enemy.gate?.burstReset ?? 58,
      gatePullResist: this.flags.gatePullResist,
      gateLightIntervalMs: this.config.arena.gateLightIntervalMs ?? 2100,
      leoCounterAssist: this.flags.leoCounterAssist,
      leoCrossBait: this.flags.leoCrossBait,
      leoFormation: this.enemy.formation?.value ?? 100,
      leoEncounter: this.enemy.encounterMode,
      pressureShrunk: this.enemy.encounterMode === "leo_pressure" && this.phaseIndex === 1 && !this.pressureRestored,
      pressureMantleActive: this.enemy.encounterMode === "leo_pressure" && this.phaseIndex >= 2,
      pressureMantleAssist: this.flags.pressureMantleAssist,
      pressureReflectDamage: this.config.arena.mantleReflectDamage ?? 18,
      blackEndClose: this.flags.blackEndClose,
      playerRadius: this.enemy.encounterMode === "leo_pressure" && this.phaseIndex === 1 && !this.pressureRestored ? 2.8 : 7.1,
      nexusSlashAssist: this.flags.nexusSlashAssist,
      nexusPressure: this.flags.nexusPressure,
      nexusMetaField: this.nexusMetaField,
      nexusCombatStyle: this.enemy.encounterMode === "nexus_mephisto_zwei" ? "blue_shooter" : this.enemy.encounterMode === "nexus_dark_zagi_bond" ? "zagi" : "sever",
      nexusForm: this.nexusForm,
      nexusShootAssist: this.flags.nexusShootAssist || this.mizorogiAssist,
      nexusShootBait: this.flags.nexusShootBait,
      nexusCounterAssist: this.flags.nexusCounterAssist,
      nexusNoaGuard: this.flags.nexusNoaGuard,
      nexusGauge: this.enemy.interfaceGauge?.value ?? 0,
      mizorogiAssist: this.mizorogiAssist,
      tigaGlitter: this.tigaGlitterActive,
      predation: this.enemy.predation?.value ?? 0,
      predationThreshold: this.enemy.predation?.threshold ?? 100,
      predationFeedGain: this.enemy.predation?.feedGain ?? 14,
      predationSeverReduce: this.enemy.predation?.severReduce ?? 11,
      predationFeedHeal: this.enemy.predation?.feedHeal ?? 7,
      predationSeverDamage: this.enemy.predation?.severDamage ?? 8,
      feedingCellsTarget: (this.config.arena.feedingCellsPerRound ?? 5) + (this.flags.nexusPressure ? 2 : 0),
      gingaLiveForm: this.gingaLiveForm,
      gingaStatic: this.enemy.static?.value ?? 0,
      gingaStaticThreshold: this.enemy.static?.threshold ?? 100,
      gingaGroundReduce: this.enemy.static?.groundReduce ?? 15,
      gingaGroundAssist: this.flags.gingaGroundAssist,
      gingaOverload: this.flags.gingaOverload,
      gingaConductAssist: this.flags.gingaConductAssist,
      gingaConductBait: this.flags.gingaConductBait,
      gingaConductTarget: this.config.arena.conductBoltsPerRound ?? 4,
      mirrorGauge: this.enemy.interfaceGauge?.value ?? 0,
      mirrorRead: this.flags.mirrorRead,
      mirrorBait: this.flags.mirrorBait,
      mirrorTrialsTarget: this.phaseIndex > 0 ? (this.config.arena.mirrorTrialsPhase2 ?? 4) : (this.config.arena.mirrorTrialsPerRound ?? 3),
      freezeTargets: structuredClone(this.pendingFreezeTargets ?? []),
      freezeAssist: this.flags.freezeAssist,
      darkSpark: this.enemy.interfaceGauge?.value ?? 0,
      rescueGauge: this.enemy.interfaceGauge?.value ?? 0,
      rescueBoost: this.flags.gingaDeepDive,
      rescueShardTarget: (this.config.arena.memoryShardsPerDive ?? 3) + (this.flags.gingaDeepDive ? 1 : 0),
      rescueMemoryOffset: this.gingaMindDiveRounds * 3,
      allySignalTarget: (this.config.arena.allySignalsPerRound ?? 5) + (this.flags.gingaAllyCover ? 2 : 0),
      allyAutoSupport: this.enemy.encounterMode === "ginga_super_grand_king" && this.phaseIndex > 0,
      stasisGauge: this.enemy.interfaceGauge?.value ?? 0,
      stasisAssist: this.flags.stasisAssist,
      stasisMarkBoost: this.flags.stasisMarkBoost || (this.lugielFinaleSupportActive && this.phaseIndex >= 2),
      stasisAnchorBoost: this.flags.stasisAnchorBoost || (this.lugielFinaleSupportActive && this.phaseIndex >= 2),
      stasisCycleMs: this.config.arena.stasisCycleMs ?? 2450,
      futureAnchorLabels: this.gingaFutureAnchorLabels(),
      futureAnchorsAwakened: this.lugielFutureAnchors,
      futureAnchorsRequired: this.enemy.stasis?.futureAnchorsRequired ?? 3,
      bossPhase: this.phaseIndex,
      originalEncounter: this.originalBattle ? this.enemy.encounterMode : null,
      originalControl: this.originalBattle ? (this.originalFormProfile()?.control ?? "guard") : null,
      originalForm: this.originalBattle ? this.originalFormKey : null,
      originalFormSpeed: this.originalBattle ? (this.originalFormProfile()?.speedScale ?? 1) : 1,
      originalGauge: this.originalAdapt,
      originalModules: this.originalBattle && this.originalFiveKingModules ? structuredClone(this.originalFiveKingModules) : null,
      originalTargetPart: this.enemy.encounterMode === "original_five_king" ? this.originalTargetPart : null,
      originalZettonBeamStored: this.enemy.encounterMode === "original_zetton" ? this.originalZettonBeamStored : false,
      originalTurn: this.turn,
      belialSpecial
      });
    } finally {
      if (this.enemy.encounterMode === "original_belial") this.resetBelialArenaPresentation({ dialogue:true });
      else this.refs.stage.classList.remove("belial-galaxy-flight", "belial-abyss-field");
    }
    if (belialSpecialPhase != null) {
      this.belialTransitionSeen.add(belialSpecialPhase);
      if (Number(this.belialTransitionPending ?? 0) === belialSpecialPhase) this.belialTransitionPending = null;
    }

    if (this.player.hp <= 0) return this.defeat();
    if (this.enemy.hp <= 0) return this.victory();
    if (["nexus", "stasis"].includes(defenseMode)) await this.maybeAdvancePhase();

    if (defenseMode === "original") {
      const breaks = result.originalBreaks ?? 0;
      const counters = result.originalCounters ?? 0;
      this.gainEnergy(result.hits === 0 ? 10 : 5);
      if (breaks > 0 || counters > 0) this.gainEnergy(Math.min(8, breaks + counters * 2));
      this.lastDefenseOutcome = counters > 0 ? "originalCounter" : breaks > 0 ? "originalBreak" : (result.hits === 0 ? "clean" : "hit");
      if (this.enemy.encounterMode === "original_zetton") this.originalZettonBeamStored = false;
    } else if (defenseMode === "prophecy") {
      if (this.enemy.gate) {
        this.enemy.gate.value = clamp(result.gatePressure ?? this.enemy.gate.value ?? 0, 0, this.enemy.gate.threshold ?? 100);
        this.renderResources();
      }
      const lights = result.lightAnchorsCollected ?? 0;
      this.gainEnergy(lights > 0 ? 5 + lights * 2 : (result.hits === 0 ? 8 : 4));
      this.lastDefenseOutcome = (result.gateBursts ?? 0) > 0
        ? "gateBurst"
        : lights >= 2
          ? "gateSuppressed"
          : result.hits === 0 ? "clean" : "hit";
    } else if (defenseMode === "chaos") {
      if (this.cosmosBattle) {
        const purified=(result.cosmosPurified??0)+(result.purifiedFragments??0);
        const broken=result.cosmosBroken??0;
        this.gainEnergy(purified+broken>0?8:4);
        this.lastDefenseOutcome=purified+broken>=2?"purifyGood":result.hits===0?"clean":"hit";
        if(this.enemy.encounterMode==="cosmos_chaos_ultraman" && this.phaseIndex===0){
          const copyGain=this.enemy.interfaceGauge?.passivePerTurn??7;
          this.adjustInterfaceGauge(copyGain - Math.min(10,(purified+broken)*2));
          if ((this.enemy.interfaceGauge?.value ?? 1) <= 0) this.cosmosObjectiveAdvancePending = true;
        }
      } else if (this.flags.purifyActive && this.mercyRouteEnabled()) {
        const purified = result.purifiedFragments ?? 0;
        const reached = result.chaosReached ?? 0;
        this.gainEnergy(purified > 0 ? 10 : 5);
        this.lastDefenseOutcome = purified >= 2 && purified > reached ? "purifyGood" : reached > purified ? "purifyPoor" : (result.hits === 0 ? "clean" : "hit");
      } else {
        this.gainEnergy(result.hits === 0 ? 10 : 5);
        this.lastDefenseOutcome = result.hits === 0 ? "clean" : "hit";
      }
    } else if (defenseMode === "memory") {
      const delivered = result.memoryDelivered ?? 0;
      const dropped = result.memoryDropped ?? 0;
      this.gainEnergy(delivered > 0 ? 5 + delivered * 2 : 3);
      this.lastDefenseOutcome = delivered >= 2 ? "memoryGood" : dropped > 0 ? "memoryDrop" : (result.hits === 0 ? "clean" : "hit");
      this.gingaMindDiveRounds += 1;
      if ((this.enemy.interfaceGauge?.value ?? 0) >= (this.enemy.rescue?.required ?? 100)) {
        return this.enterSuperGrandKingReleasePhase();
      }
    } else if (defenseMode === "siege") {
      const allyLinks = result.allyLinks ?? 0;
      this.gainEnergy(allyLinks > 0 ? 6 + allyLinks * 2 : (result.hits === 0 ? 7 : 4));
      this.lastDefenseOutcome = allyLinks > 0 ? "allyGood" : (result.hits === 0 ? "clean" : "hit");
    } else if (defenseMode === "stasis") {
      const returned = result.stasisReturned ?? 0;
      const missed = result.stasisMissed ?? 0;
      const anchors = result.futureAnchors ?? 0;
      this.adjustInterfaceGauge(this.enemy.interfaceGauge?.passivePerTurn ?? 4);
      this.gainEnergy(returned > 0 ? 5 + returned * 2 : (result.hits === 0 ? 6 : 3));
      this.lastDefenseOutcome = anchors > 0 ? "futureGood" : returned > missed ? "stasisGood" : missed > returned ? "stasisBad" : (result.hits === 0 ? "clean" : "hit");
    } else if (defenseMode === "mirror") {
      const verified = result.mirrorVerified ?? 0;
      const falseCount = result.mirrorFalse ?? 0;
      this.gainEnergy(verified > 0 ? 6 + verified * 2 : (result.hits === 0 ? 6 : 3));
      this.lastDefenseOutcome = verified > falseCount ? "mirrorGood" : falseCount > 0 ? "mirrorBad" : (result.hits === 0 ? "clean" : "hit");
      this.adjustInterfaceGauge(this.enemy.interfaceGauge?.passivePerTurn ?? 7);
    } else if (defenseMode === "freeze") {
      const thawed = (result.commandsThawed ?? 0) + (result.formsThawed ?? 0);
      const missed = result.freezeMissed ?? 0;
      this.gainEnergy(thawed > 0 ? 5 + thawed * 2 : (result.hits === 0 ? 6 : 3));
      this.lastDefenseOutcome = thawed > missed ? "thawGood" : missed > 0 ? "thawBad" : (result.hits === 0 ? "clean" : "hit");
      this.adjustInterfaceGauge((this.enemy.interfaceGauge?.passivePerTurn ?? 8) + missed * 2);
      this.pendingFreezeTargets = [];
      this.ensureLugielCommandLifeline();
    } else if (defenseMode === "ginga") {
      if (this.enemy.static && this.phaseIndex === 0) {
        this.enemy.static.value = clamp(result.staticLevel ?? this.enemy.static.value ?? 0, 0, this.enemy.static.threshold ?? 100);
        const grounded = result.groundedNodes ?? 0;
        this.gainEnergy(grounded > 0 ? 5 + grounded * 2 : (result.hits === 0 ? 7 : 3));
        this.lastDefenseOutcome = grounded > 0 ? "grounded" : (result.hits === 0 ? "clean" : "hit");
        this.gingaPhase0EnemyTurns += 1;
      } else {
        const conducted = result.conductedBolts ?? 0;
        this.gainEnergy(conducted > 0 ? 6 + conducted * 2 : (result.hits === 0 ? 8 : 4));
        this.lastDefenseOutcome = conducted > 0 ? "conduct" : (result.hits === 0 ? "clean" : "hit");
      }
    } else if (defenseMode === "nexus") {
      if (this.enemy.encounterMode === "nexus_mephisto_one_himeya") {
        this.lastDefenseOutcome = result.hits === 0 ? "clean" : "hit";
      } else if (this.enemy.encounterMode === "nexus_mephisto_zwei") {
        const shotHits = result.nexusShotHits ?? 0;
        const drains = result.nexusDrains ?? 0;
        this.lastDefenseOutcome = shotHits >= 2 ? "shotGood" : drains > 0 ? "drainBad" : (result.hits === 0 ? "clean" : "hit");
        if (this.mizorogiAssist) {
          this.adjustInterfaceGauge(-5);
          if (this.enemy.hp > 1) this.damageEnemy(4, "counter");
          this.showSupportCallout("沟吕木真也", "别看我。看准它的眼睛。", 1200);
        }
      } else if (this.enemy.encounterMode === "nexus_dark_zagi_bond") {
        const interaction = (result.nexusShotHits ?? 0) + (result.nexusParries ?? 0) + (result.noaReturns ?? 0);
        if (result.hits === 0) this.adjustInterfaceGauge(3);
        if (interaction > 0) this.adjustInterfaceGauge(Math.min(8, interaction * 2));
        this.lastDefenseOutcome = interaction > 0 ? "bondAction" : (result.hits === 0 ? "clean" : "hit");
      } else {
        const severed = result.feedingCellsSevered ?? 0;
        const fed = result.feedingCellsFed ?? 0;
        this.lastDefenseOutcome = severed >= 2 && severed > fed ? "severGood" : fed > severed ? "feedBad" : (result.hits === 0 ? "clean" : "hit");
      }
    } else if (defenseMode === "pressure") {
      const reflected = result.pressureReflections ?? 0;
      this.gainEnergy(reflected > 0 ? 5 + reflected * 2 : (result.hits === 0 ? 7 : 3));
      this.lastDefenseOutcome = reflected > 0 ? "reflect" : (result.hits === 0 ? "clean" : "hit");
      if (this.phaseIndex === 1 && !this.pressureRestored) {
        this.pressureTinyRounds += 1;
        this.adjustInterfaceGauge(-Math.min(18, 7 + (result.hits === 0 ? 7 : 0)));
        if (this.pressureTinyRounds >= (this.config.arena.shrunkRounds ?? 2)) return this.leoPressureKingCinematic();
      }
    } else if (defenseMode === "leo") {
      const counters = result.counters ?? 0;
      if (counters > 0) this.gainEnergy(6 + counters * 2);
      else this.gainEnergy(result.hits === 0 ? 8 : 4);
      this.lastDefenseOutcome = result.hits === 0 ? "clean" : "hit";
      if (this.enemy.formation && this.enemy.encounterMode === "leo_giras_rework") {
        const recovery = this.enemy.formation.recoverPerTurn ?? 8;
        this.adjustFormation(recovery + (result.hits > 0 ? 5 : 0));
      }
    } else if (defenseMode === "platform" && result.goalReached && this.enemy.requiresExposure) {
      this.gainEnergy(14);
      this.enemyExposed = true;
      this.lastDefenseOutcome = null;
      this.renderTargetableState();
    } else if (defenseMode === "platform" && this.enemy.requiresExposure) {
      this.gainEnergy(result.hits === 0 ? 7 : 4);
      this.lastDefenseOutcome = "chaseFailed";
    } else if (defenseMode === "platform" && result.goalReached) {
      this.gainEnergy(18);
      this.lastDefenseOutcome = "clean";
    } else if (result.hits === 0) {
      this.gainEnergy(defenseMode === "guard" ? 14 : this.enemy.boss ? 15 : 12);
      this.lastDefenseOutcome = "clean";
      if (this.enemy.encounterMode === "tiga_golza") {
        this.golzaWeakReadActive = true;
        this.enemy.exposedTurns = Math.max(this.enemy.exposedTurns, 1);
        this.refs.stage.classList.add("golza-opening");
      }
    } else {
      this.gainEnergy(5);
      this.lastDefenseOutcome = "hit";
    }

    if (this.enemy.encounterMode === "ginga_darambia" && this.phaseIndex === 0) {
      const forceAfter = this.config.arena.forcedLiveAfterRounds ?? 3;
      if (this.gingaPhase0EnemyTurns >= forceAfter || (this.enemy.static?.value ?? 0) >= (this.enemy.static?.threshold ?? 100)) {
        this.flags.gingaGroundAssist = false;
        this.flags.gingaOverload = false;
        this.flags.barrier = false;
        return this.triggerGingaLiveUnlock();
      }
    }

    if (this.enemy.encounterMode === "cosmos_lidorias_forms") {
      await this.maybeCosmosLidoriasCalmBeat();
    }
    if (await this.maybeAdvanceCosmosObjective()) return this.enterPlayerMenu(false);
    if (this.enemy.encounterMode === "cosmos_chaos_darkness" && this.cosmosMiracleActive) {
      const heartReady = await this.maybeCosmosChaosDarknessHeartBeat();
      if (heartReady) return this.enterPlayerMenu(false);
    }

    if (this.enemy.encounterMode === "nexus_mephisto_one_himeya") {
      this.himeyaEnemyTurns += 1;
      if (!this.himeyaSeraPlayed && !this.himeyaOneHpLocked && this.himeyaEnemyTurns >= 2) {
        return this.nexusMephistoOneScriptedDefeat();
      }
      if (this.himeyaOneHpLocked && !this.himeyaNightRaiderRestored && this.himeyaEnemyTurns >= 5) {
        return this.nexusMephistoOneNightRaiderRestore();
      }
    }

    if (this.lifeCycleEnabled()) {
      const drained = this.applyTurnLifeDrain();
      if (this.player.hp <= 0) return this.defeat();
      if (drained > 0) await sleep(170);
    }

    this.flags.nextEnemyTelegraph = false;
    this.flags.guardAssist = false;
    this.flags.speedBoost = false;
    this.flags.jumpBoost = false;
    this.flags.platformAssist = false;
    this.flags.purifyActive = false;
    this.flags.purifyBoost = false;
    this.flags.cosmosLunaAssist = false;
    this.flags.cosmosCoronaAssist = false;
    this.flags.cosmosEclipseAssist = false;
    this.flags.cosmosGuard = false;
    this.flags.cosmosMonsterTrust = false;
    this.flags.gatePullResist = false;
    this.flags.leoCounterAssist = false;
    this.flags.leoCrossBait = false;
    this.flags.pressureMantleAssist = false;
    this.flags.pressureSmallGuard = false;
    this.flags.blackEndClose = false;
    this.flags.nexusSlashAssist = false;
    this.flags.nexusPressure = false;
    this.flags.nexusDrainGuard = false;
    this.flags.nexusShootAssist = false;
    this.flags.nexusShootBait = false;
    this.flags.nexusCounterAssist = false;
    this.flags.nexusNoaGuard = false;
    this.flags.gingaGroundAssist = false;
    this.flags.gingaOverload = false;
    this.flags.gingaConductAssist = false;
    this.flags.gingaConductBait = false;
    this.flags.gingaHoldCharge = false;
    this.flags.gingaMindDive = false;
    this.flags.gingaDeepDive = false;
    this.flags.gingaAllyCover = false;
    this.flags.stasisAssist = false;
    this.flags.stasisMarkBoost = false;
    this.flags.stasisAnchorBoost = false;
    this.flags.mirrorRead = false;
    this.flags.mirrorBait = false;
    this.flags.freezeAssist = false;
    this.flags.barrier = false;
    this.flags.lightShield = false;

    this.state.set("TURN_END");
    if(this.enemy.encounterMode === "original_belial") this.resetBelialArenaPresentation({dialogue:true});
    else this.setFrameMode("dialogue");
    await sleep(this.enemy.encounterMode === "original_belial" ? 40 : 210);

    if (defenseMode === "platform" && this.enemy.requiresExposure && this.enemyExposed) {
      return this.enterPlayerMenu(false);
    }

    return this.enterPlayerMenu();
  }

  async originalBelialFinale() {
    if (this.originalBelialFinalePlayed) return;
    this.originalBelialFinalePlayed = true;

    // HP really reached zero. Belial refuses to fall and forces one last live
    // Deathcium clash inside the same battle canvas. No QTE overlay, no cutaway.
    this.enemy.hp = 0;
    this.renderResources();
    this.state.set("ENEMY_ATTACK");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.bullets.stop();
    this.setFrameMode("arena");
    this.refs.enemySprite.classList.remove("dead");
    this.refs.stage.classList.add("belial-final-live");
    this.refs.stage.style.setProperty("--belial-clash-progress", "0");
    this.belialClashProgress = 0;
    this.belialClashComplete = false;

    const lastLine = this.belialPickBark("finale") ?? "开什么玩笑……老子怎么可能输给你这种赝品！";
    this.showBelialBark(lastLine, 1450, "belial-rage");
    this.sound?.play?.("phase");
    await sleep(720);
    if (this.player.hp <= 0) {
      this.refs.stage.classList.remove("belial-final-live", "belial-clash-pushing", "belial-clash-returned", "belial-arena-active");
      return;
    }

    if (this.refs.microHelp) this.refs.microHelp.textContent = "最后一击：按住 Z / Enter / Space 顶住帝斯修姆光线 · 不要松手，把它反推回去";
    this.showBelialBark("给老子——消失吧！！", 1100, "belial-deathcium");

    await this.bullets.start(24000, {
      mode: "original",
      patternSet: "original_belial_final",
      intensity: 1.65,
      rage: 1,
      telegraphScale: 1,
      guardBonus: 0,
      speedBonus: 0,
      bossPhase: 2,
      originalEncounter: "original_belial",
      originalControl: this.originalFormProfile()?.control ?? "guard",
      originalForm: this.originalFormKey,
      originalFormSpeed: this.originalFormProfile()?.speedScale ?? 1,
      originalGauge: this.originalAdapt,
      originalTurn: this.turn,
      belialSpecial: "final-clash"
    });

    if (this.player.hp <= 0 || this.state.is("DEFEAT")) {
      this.refs.stage.classList.remove("belial-final-live", "belial-clash-pushing", "belial-clash-returned");
      this.refs.stage.style.removeProperty("--belial-clash-progress");
      return;
    }

    // If the player failed to push it all the way back before the live window ends,
    // Belial wins the beam struggle instead of the runtime pretending it succeeded.
    if (!this.belialClashComplete) {
      this.damagePlayer(Math.max(999, this.player.maxHp ?? 999));
      this.refs.stage.classList.remove("belial-final-live", "belial-clash-pushing", "belial-clash-returned");
      this.refs.stage.style.removeProperty("--belial-clash-progress");
      return;
    }

    this.showBelialBark("不可能……！！", 920, "belial-rage");
    await sleep(760);
    this.refs.stage.classList.remove("belial-final-live", "belial-clash-pushing", "belial-clash-returned");
    this.refs.stage.style.removeProperty("--belial-clash-progress");
    this.refs.enemySprite.classList.add("dead");
    this.state.set("VICTORY");
    await this.say(`* ${this.enemy.victoryText ?? "帝斯修姆光线被正面推了回去。"}`, 620);
    this.refs.dialogueText.textContent = "VICTORY";
    this.refs.dialogueText.style.fontSize = "34px";
    this.refs.dialogueText.style.fontWeight = "900";
    this.refs.continueHint.style.opacity = "0";
    this.sound?.play?.("victory");
    this.emitResult("victory");
  }

  async victory() {
    if (this.enemy.encounterMode === "original_belial" && !this.originalBelialFinalePlayed) return this.originalBelialFinale();
    if (this.enemy.encounterMode === "nexus_mephisto_one_himeya" && !this.himeyaFinalePlayed) return this.nexusMephistoOneFinaleCinematic();
    if (this.enemy.encounterMode === "leo_giras_rework") return this.leoGirasVictory();
    if (this.enemy.encounterMode === "leo_pressure") return this.leoPressureVictory();
    if (this.enemy.encounterMode === "leo_black_end") {
      if (!this.blackEndCrystalUsed) {
        this.enemy.hp = 1;
        this.renderResources();
        return this.enterPlayerMenu(false);
      }
      return this.leoBlackEndVictory();
    }
    if (this.enemy.encounterMode === "ginga_darambia" && !this._gingaVictoryHandled) return this.gingaDarambiaVictory();
    if (this.enemy.encounterMode === "ginga_super_grand_king" && !this._gingaGrandVictoryHandled) return this.gingaSuperGrandKingVictory();
    if (this.enemy.encounterMode === "ginga_lugiel_future" && !this._gingaLugielVictoryHandled) return this.gingaLugielVictory();
    if (this.enemy.encounterMode === "tiga_gatanothor_finale" && this.tigaGlitterActive && !this._tigaGatanothorVictoryHandled) return this.tigaGatanothorVictory();
    if (this.enemy.encounterMode === "cosmos_chaos_ultraman" && !this._cosmosChaosUltraVictory) return this.cosmosChaosUltramanVictory();
    if (this.enemy.encounterMode === "cosmos_chaos_darkness") {
      if (this.cosmosMiracleActive && (this.enemy.interfaceGauge?.value ?? 0) >= (this.enemy.interfaceGauge?.threshold ?? 100)) return this.cosmosChaosDarknessVictory();
      this.enemy.hp=1;this.renderResources();return this.enterPlayerMenu(false);
    }
    if (this.enemy.encounterMode === "nexus_mephisto_zwei" && !this._nexusMephistoVictoryHandled) return this.nexusMephistoVictory();
    if (this.enemy.encounterMode === "nexus_dark_zagi_bond" && !this._nexusZagiVictoryHandled) return this.nexusDarkZagiVictory();
    if (this.state.is("VICTORY")) return;

    this.state.set("VICTORY");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.setFrameMode("dialogue");
    this.refs.enemySprite.classList.add("dead");

    await this.say(`* ${this.enemy.victoryText ?? `${this.enemy.name}失去了继续战斗的力量。`}`);

    this.refs.dialogueText.textContent = "VICTORY";
    this.refs.dialogueText.style.fontSize = "34px";
    this.refs.dialogueText.style.fontWeight = "900";
    this.refs.continueHint.style.opacity = "0";

    this.sound?.play("victory");
    this.emitResult("victory");
  }

  async tigaGatanothorVictory() {
    if (this._tigaGatanothorVictoryHandled) return;
    this._tigaGatanothorVictoryHandled = true;
    this.state.set("VICTORY");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.bullets.stop();
    this.setFrameMode("dialogue");
    this.sound?.stopTigaFinalePulse?.();
    this.refs.stage.classList.add("tiga-final-strike");
    this.refs.enemySprite.classList.add("heavy-hit", "tiga-final-collapse");
    this.sound?.playTigaFinalStrike?.();

    await this.say("* 所有的光芒，所有的愿望，所有的梦想，所有的未来，所有人的声音都聚集在了这里。", 760);
    await this.say("* 闪耀迪迦把最后的光汇向双臂。", 820);
    this.refs.stage.classList.add("tiga-final-beam");
    await sleep(1250);
    await this.say("*无边的黑暗由内而外被光芒击穿，再深邃的怨念也抵挡不住那纯粹的力量。", 900);
    this.refs.enemySprite.classList.add("dead");
    await sleep(920);
    this.refs.stage.classList.remove("tiga-final-beam");
    this.refs.stage.classList.add("tiga-dawn");
    await this.storyBeat("", "黑海退去。", 1450, "tiga-glitter");
    await this.storyBeat("", "第一束晨光落在重新平静的海面上。", 1800, "tiga-glitter");
    await this.storySilence(1300, "tiga-glitter");
    await this.storyBeat("", "光没有只留在迪迦身上。", 1500, "tiga-light");
    await this.storyBeat("", "它回到了每一个曾经发出光的人那里，时至今日，它依旧存在于所有人的心中。", 1900, "tiga-light");
    this.hideStoryCinematic();
    await sleep(650);

    this.refs.dialogueText.textContent = "致以辉煌的人们";
    this.refs.dialogueText.style.fontSize = "31px";
    this.refs.dialogueText.style.fontWeight = "900";
    this.refs.continueHint.style.opacity = "0";
    this.sound?.play("victory");
    this.emitResult("victory");
  }

  async gingaDarambiaVictory() {
    if (this._gingaVictoryHandled) return;
    this._gingaVictoryHandled = true;
    this.state.set("VICTORY");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.setFrameMode("dialogue");
    this.refs.enemySprite.classList.add("spark-collapse");
    this.sound?.play("victory");

    await this.say(`* ${this.enemy.victoryText}`);
    await sleep(280);
    await this.say("* LIVE SIGN", 420);

    const doll = this.enemy.sparkDoll;
    if (doll) {
      this.sparkDollAcquired = { id: doll.id, name: doll.name };
      try {
        const key = "ubr:ginga:sparkDolls";
        const stored = JSON.parse(localStorage.getItem(key) || "[]");
        if (!stored.includes(doll.id)) stored.push(doll.id);
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (_) {}
      this.refs.enemySprite.classList.add("spark-doll");
      await this.say(`* SPARK DOLL ACQUIRED — ${doll.name}`, 620);
    }

    this.refs.dialogueText.textContent = "ACQUIRED";
    this.refs.dialogueText.style.fontSize = "34px";
    this.refs.dialogueText.style.fontWeight = "900";
    this.refs.continueHint.style.opacity = "0";
    this.emitResult("victory");
  }

  async gingaSuperGrandKingVictory() {
    if (this._gingaGrandVictoryHandled) return;
    this._gingaGrandVictoryHandled = true;
    this.state.set("VICTORY");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.setFrameMode("dialogue");
    this.refs.stage.classList.add("ginga-sunshine-finale");
    this.refs.enemySprite.classList.add("armor-collapse");
    this.sound?.play("victory");

    await this.say(`* ${this.enemy.victoryText}`);
    await this.say("* 美铃的光从巨大的身体里离开。", 420);
    await sleep(260);
    await this.say("* GINGA SUNSHINE", 520);

    const doll = this.enemy.sparkDoll;
    if (doll) {
      this.sparkDollAcquired = { id: doll.id, name: doll.name };
      this.gingaUnlocked.add(doll.id);
      try {
        const key = "ubr:ginga:sparkDolls";
        const stored = JSON.parse(localStorage.getItem(key) || "[]");
        if (!stored.includes(doll.id)) stored.push(doll.id);
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (_) {}
      this.refs.enemySprite.classList.add("spark-collapse", "spark-doll");
      await this.say(`* SPARK DOLL ACQUIRED — ${doll.name}`, 620);
    }

    this.refs.dialogueText.textContent = "LIGHT RETURNED";
    this.refs.dialogueText.style.fontSize = "31px";
    this.refs.dialogueText.style.fontWeight = "900";
    this.refs.continueHint.style.opacity = "0";
    this.emitResult("victory");
  }

  async gingaDarkBrothersVictory() {
    if (this._gingaDarkVictoryHandled) return;
    this._gingaDarkVictoryHandled = true;
    this.state.set("VICTORY");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.setFrameMode("dialogue");
    this.refs.enemySprite.classList.add("spark-collapse");
    this.sound?.play("victory");

    await this.say(`* ${this.enemy.victoryText}`);
    await this.say("* 两枚黑色 Live Sign 先后熄灭。", 360);

    const dolls = this.enemy.sparkDolls ?? [];
    if (dolls.length) {
      try {
        const key = "ubr:ginga:sparkDolls";
        const stored = JSON.parse(localStorage.getItem(key) || "[]");
        for (const doll of dolls) {
          if (!stored.includes(doll.id)) stored.push(doll.id);
          this.gingaUnlocked.add(doll.id);
          this.sparkDollsAcquired.push({ id: doll.id, name: doll.name });
        }
        localStorage.setItem(key, JSON.stringify(stored));
      } catch (_) {
        this.sparkDollsAcquired = dolls.map((doll) => ({ id: doll.id, name: doll.name }));
      }
      await this.say(`* SPARK DOLLS RESTORED — ${dolls.map((doll) => doll.name).join(" / ")}`, 620);
    }

    this.refs.dialogueText.textContent = "RESTORED";
    this.refs.dialogueText.style.fontSize = "34px";
    this.refs.dialogueText.style.fontWeight = "900";
    this.refs.continueHint.style.opacity = "0";
    this.emitResult("victory");
  }

  async gingaLugielVictory() {
    if (this._gingaLugielVictoryHandled) return;
    this._gingaLugielVictoryHandled = true;
    this.state.set("VICTORY");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.setFrameMode("dialogue");
    this.sound?.stopFinalePulse?.();
    this.refs.stage.classList.remove("time-stopped");
    this.refs.stage.classList.add("future-release", "ginga-especially-finale");
    this.refs.enemySprite.classList.add("lugiel-collapse");
    this.sound?.play("victory");

    await this.say(`* ${this.enemy.victoryText}`);
    await this.say("* 被定格的光一颗接一颗重新移动。", 390);
    await this.say("* GINGA ESPECIALLY", 520);
    await sleep(320);
    await this.say("* 时间继续开始流动。", 420);

    this.refs.dialogueText.textContent = "THE FUTURE MOVES";
    this.refs.dialogueText.style.fontSize = "30px";
    this.refs.dialogueText.style.fontWeight = "900";
    this.refs.continueHint.style.opacity = "0";
    this.emitResult("victory");
  }

  setNexusHimeyaScene(scene = "") {
    const vision = this.refs.nexusHimeyaVision;
    if (!vision) return;
    vision.hidden = !scene;
    vision.dataset.scene = scene;
    if (scene) {
      vision.classList.remove("active");
      void vision.offsetWidth;
      vision.classList.add("active");
    }
  }

  async nexusMephistoOneIntroCinematic() {
    this.state.set("CUTSCENE");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.setFrameMode("dialogue");
    this.refs.storyCinematic.hidden = false;
    this.refs.storyCinematic.dataset.mood = "nexus-himeya-entry";
    this.setNexusHimeyaScene("entry");
    await this.storySilence(1200, "nexus-himeya-entry");
    await this.storyBeat("根来甚藏", "姬矢，让你这样追根究底的东西究竟是什么？你到底是在和什么东西战斗？", 2800, "nexus-himeya-entry");
    await this.storySilence(800, "nexus-himeya-entry");
    await this.storyBeat("姬矢准", "和我战斗着的东西——那就是，宿命。", 2500, "nexus-himeya-entry");
    this.setNexusHimeyaScene("device");
    await this.storySilence(900, "nexus-device");
    await this.storyBeat("", "姬矢把根来拦在入口外。手指已经因为疼痛有些发抖，进化信赖者却还是被重新握紧。", 2800, "nexus-device");
    this.setNexusHimeyaScene("transform");
    this.sound?.play("phase");
    await this.storySilence(1350, "nexus-device");
    this.hideStoryCinematic();
    this.setNexusHimeyaScene("");
    this.player.hp = Math.min(this.player.maxHp, 24);
    this.player.energy = 0;
    this.applyNexusForm("anphans", false);
    this.player.form = "姬矢准 · 幼年形态";
    if (this.refs.playerForm) this.refs.playerForm.textContent = this.player.form;
    this.refs.stage.classList.add("himeya-exhausted", "nexus-dark-field-g");
    this.refs.enemyPhase.textContent = "姬矢准 · 负伤决战";
    this.renderResources();
    await sleep(560);
  }

  async nexusMephistoOneScriptedDefeat() {
    if (this.himeyaScriptedDefeatRunning || this.himeyaSeraPlayed) return;
    this.himeyaScriptedDefeatRunning = true;
    this.state.set("CUTSCENE");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.bullets.stop();
    this.player.hp = 0;
    this.renderResources();
    this.refs.stage.classList.add("himeya-whiteout");
    await this.storyBeat("", "梅菲斯特的黑暗把准最后一点站立的力气也给打散，奈克瑟斯倒了下去。", 2450, "nexus-dark");
    await this.storySilence(1800, "nexus-dark");
    return this.nexusMephistoOneSeraCinematic();
  }

  async nexusMephistoOneSeraCinematic() {
    if (this.himeyaSeraPlayed) return;
    this.himeyaSeraPlayed = true;
    await this.sound?.playMusic?.("nexus_memory_prebattle", { volume: .18, fadeInMs: 2800, fadeOutMs: 900 });
    this.setNexusHimeyaScene("forest");
    await this.storySilence(1500, "nexus-sera");
    await this.storyBeat("", "没有战场，没有警报，发光的树林里只有风穿过树叶。", 2700, "nexus-sera");
    this.setNexusHimeyaScene("sera");
    await this.storySilence(900, "nexus-sera");
    await this.storyBeat("姬矢准", "塞拉……我没能保护你。", 2300, "nexus-sera");
    await this.storyBeat("姬矢准", "我一直觉得，被给予这份力量，是对我的惩罚。一个人战斗到最后，一个人死去……也许那才算赎罪。", 3600, "nexus-sera");
    await this.storySilence(800, "nexus-sera");
    await this.storyBeat("塞拉", "不是的，准。这不是惩罚。", 2450, "nexus-sera");
    this.setNexusHimeyaScene("lineage");
    await this.storyBeat("塞拉", "在你以前，也有人握住过这束光。有人失去过重要的东西，有人害怕过，可他们还是把光交给了下一个人。", 3800, "nexus-sera");
    await this.storyBeat("姬矢准", "那为什么会是我？我真的有这份资格吗？", 2800, "nexus-sera");
    await this.storySilence(650, "nexus-sera");
    await this.storyBeat("塞拉", "我最喜欢准拍的照片了。", 2450, "nexus-sera");
    await this.storyBeat("塞拉", "是准留下了我活过的证明。能和准相遇，我真的很高兴。", 3200, "nexus-sera");
    await this.storyBeat("塞拉", "所以回去吧。去保护那些对你来说重要的人。", 2900, "nexus-sera");
    this.setNexusHimeyaScene("sera-fade");
    await this.storySilence(1500, "nexus-sera");
    this.setNexusHimeyaScene("device-return");
    await this.storyBeat("姬矢准", "我这次一定要保护好给你看，用这份光明。", 2750, "nexus-device");
    await this.storyBeat("姬矢准", "因为那是给予我的使命啊。", 2600, "nexus-device");
    this.setNexusHimeyaScene("transform-return");
    this.sound?.play("phase");
    await this.sound?.playMusic?.("nexus_himeya_red", { volume: .135, fadeInMs: 3300, fadeOutMs: 2500 });
    await this.storySilence(1250, "nexus-device");

    this.hideStoryCinematic();
    this.setNexusHimeyaScene("");
    this.refs.stage.classList.remove("himeya-whiteout");
    this.refs.stage.classList.add("himeya-one-hp", "nexus-dark-field-g");
    this.phaseIndex = 1;
    this.currentPhase = this.enemy.phases?.[1] ?? this.currentPhase;
    this.refs.stage.dataset.bossPhase = "1";
    this.himeyaOneHpLocked = true;
    this.himeyaEnemyTurns = 2;
    this.player.hp = 1;
    this.player.energy = 0;
    this.applyNexusForm("anphans", false);
    this.player.form = "姬矢准 · 幼年形态 / 1 HP";
    this.refs.playerForm.textContent = this.player.form;
    this.refs.enemyPhase.textContent = "一滴光 · 不能熄灭";
    this.renderResources();
    this.himeyaScriptedDefeatRunning = false;
    this.inputLocked = false;
    return this.enterPlayerMenu(false);
  }

  async nexusMephistoOneNightRaiderRestore() {
    if (this.himeyaNightRaiderRestored) return;
    this.himeyaNightRaiderRestored = true;
    this.state.set("CUTSCENE");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.bullets.stop();
    this.setNexusHimeyaScene("night-raider");
    await this.storyBeat("", "奈克瑟斯已经连抬手都开始迟缓。远处，夜袭队的机体重新对准了这里。", 3000, "nexus-raider");
    await this.storyBeat("孤门一辉", "把能量送给他！", 2350, "nexus-raider");
    this.setNexusHimeyaScene("energy-transfer");
    this.sound?.play("phase");
    await this.storyBeat("", "被转换过的能量穿过黑暗，直接照进了奈克瑟斯胸前的能量核心。", 3100, "nexus-raider");
    await this.storySilence(900, "nexus-raider");
    this.player.hp = this.player.maxHp;
    this.player.energy = this.player.maxEnergy;
    this.himeyaOneHpLocked = false;
    this.phaseIndex = 2;
    this.currentPhase = this.enemy.phases?.[2] ?? this.currentPhase;
    this.applyNexusForm("junis", true);
    this.player.form = "姬矢准 · 青年形态";
    this.refs.playerForm.textContent = this.player.form;
    this.refs.stage.dataset.bossPhase = "2";
    this.refs.stage.classList.remove("himeya-exhausted", "himeya-one-hp");
    this.refs.stage.classList.add("himeya-restored");
    this.refs.enemyPhase.textContent = "完全复活 · 姬矢最后的决战";
    this.renderResources();
    await this.storyBeat("", "眼睛重新亮起。银色身体染上红色。姬矢第一次不是为了寻找死去的地方而站起来。", 3250, "nexus-red");
    this.hideStoryCinematic();
    this.setNexusHimeyaScene("");
    this.inputLocked = false;
    return this.enterPlayerMenu(false);
  }

  async nexusMephistoOneFinaleCinematic() {
    if (this.himeyaFinalePlayed) return;
    this.himeyaFinalePlayed = true;
    this.state.set("VICTORY");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.bullets.stop();
    this.setFrameMode("dialogue");

    this.setNexusHimeyaScene("final-beam");
    await this.storySilence(650, "nexus-final");
    await this.storyBeat("", "奈克瑟斯与梅菲斯特同时放出最后的光。银白与紫黑两道光线在异形之海中央咬住。", 3600, "nexus-final");
    await sleep(800);

    this.setNexusHimeyaScene("final-explosion");
    this.sound?.playNexusCrushHit?.(2);
    await this.storyBeat("", "碰撞核心失控。爆炎一下吞掉两人的上半身，梅菲斯特本能地向后退。", 3200, "nexus-final");
    await this.storySilence(850, "nexus-final");

    this.setNexusHimeyaScene("final-charge");
    await sleep(450);
    await this.storyBeat("", "可爆炎里先冲出来的，是奈克瑟斯。", 2350, "nexus-silver");
    await this.storyBeat("", "他没有重新拉开距离，而是穿过火焰，直冲梅菲斯特。", 2500, "nexus-final");

    this.setNexusHimeyaScene("final-punch");
    this.sound?.play("perfect");
    await this.storyBeat("", "一记正拳砸进梅菲斯特胸口。黑暗巨人的身体明显向后折了一下。", 2500, "nexus-final");
    await this.storySilence(500, "nexus-final");

    // Game-version coda: Himeya does not let the enemy escape the blast.
    this.setNexusHimeyaScene("final-grab");
    await this.storyBeat("", "姬矢没有松开。他顺势贴上去，双臂从两侧锁住梅菲斯特。", 2800, "nexus-final");
    await this.storyBeat("姬矢准", "这束光不会停在这里。", 2850, "nexus-silver");
    await this.storySilence(800, "nexus-final");

    this.setNexusHimeyaScene("final-core-bloom");
    await this.storyBeat("", "奈克瑟斯胸前的光越来越亮。梅菲斯特挣扎，却已经没有能退开的距离。", 3000, "nexus-final");
    await sleep(650);

    this.setNexusHimeyaScene("final-white");
    this.refs.stage.classList.add("himeya-whiteout");
    this.sound?.play("victory");
    await this.storySilence(3200, "nexus-final-white");
    this.player.hp = 0;
    this.enemy.hp = 0;
    this.renderResources();
    await this.storyBeat("", "白光吞没异形之海。等光退去，奈克瑟斯与梅菲斯特都已经不在原地。", 3300, "nexus-final-white");
    await this.storySilence(2100, "nexus-final-white");
    this.hideStoryCinematic();
    this.setNexusHimeyaScene("");
    this.refs.dialogueText.textContent = "THE LIGHT GOES ON";
    this.refs.dialogueText.style.fontSize = "30px";
    this.refs.dialogueText.style.fontWeight = "900";
    this.refs.continueHint.style.opacity = "0";
    this.emitResult("victory");
  }

  async nexusMephistoVictory() {
    if (this._nexusMephistoVictoryHandled) return;
    this._nexusMephistoVictoryHandled = true;
    this.state.set("VICTORY");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.bullets.stop();
    this.setFrameMode("dialogue");
    this.refs.stage.classList.add("nexus-mephisto-finale");
    this.sound?.play("phase");

    this.setNexusLegacyScene("mizorogi-mephisto-impaled");
    await this.storyBeat("", "二代反手将爪刺进沟吕木的梅菲斯特，白色双眼暗了一瞬。", 2850, "nexus-mizorogi");
    await this.storySilence(600, "nexus-mizorogi");

    this.setNexusLegacyScene("mizorogi-final-hold");
    await this.storyBeat("", "可沟吕木没有松开。他反而用最后的力气把二代从后面锁死。", 2850, "nexus-mizorogi");
    await this.storyBeat("沟吕木真也", "趁现在！不用管我——攻击！", 2150, "nexus-mizorogi");
    await this.storyBeat("沟吕木真也", "那是得到光的你，必须完成的事！", 2450, "nexus-mizorogi");

    await this.storyBeat("", "怜终于拉开弓箭，准星越过两个黑暗巨人的身体，只剩这一瞬。", 2500, "nexus-blue");
    this.refs.stage.classList.add("nexus-blue-finisher");
    this.sound?.play("perfect");
    this.setNexusLegacyScene("mizorogi-final-shot");
    await this.storyBeat("", "箭矢光线·奔流贯穿了它们，两具黑暗巨人的轮廓同时被蓝白光吞没。", 3000, "nexus-blue");
    this.refs.enemySprite.classList.add("dead");
    await sleep(1100);

    this.setNexusLegacyScene("mizorogi-human-after");
    await this.storySilence(850, "nexus-mizorogi");
    await this.storyBeat("沟吕木真也", "再一次……作为人类……", 2850, "nexus-mizorogi");
    await this.storySilence(1450, "nexus-dark");
    await this.storyBeat("", "黑暗巨人的轮廓已经不在。最后留下来的，只是沟吕木作为人的身影。", 2600, "nexus-dark");
    this.setNexusLegacyScene("mizorogi-fade-human");
    await this.storySilence(1700, "nexus-dark");
    this.setNexusLegacyScene("");
    this.hideStoryCinematic();
    this.refs.stage.classList.remove("nexus-blue-finisher", "nexus-mephisto-finale");

    this.refs.dialogueText.textContent = "SHADOW — CLOSED";
    this.refs.dialogueText.style.fontSize = "30px";
    this.refs.dialogueText.style.fontWeight = "900";
    this.refs.continueHint.style.opacity = "0";
    this.sound?.play("victory");
    this.emitResult("victory");
  }

  setNexusFinalBeamMash(count, target) {
    const ratio = clamp(count / Math.max(1, target), 0, 1);
    this.nexusFinalMashCount = count;
    const vision = this.refs.nexusLegacyVision;
    if (!vision) return;
    vision.style.setProperty("--nexus-final-push", String(ratio));
    vision.style.setProperty("--nexus-final-shake", `${1 + ratio * 9}px`);
    vision.dataset.finalMash = ratio >= 1 ? "break" : ratio >= .72 ? "surge" : ratio >= .36 ? "push" : "resist";
    vision.classList.remove("nexus-final-mash-hit");
    void vision.offsetWidth;
    vision.classList.add("nexus-final-mash-hit");
    if (count % 3 === 0) this.sound?.playNexusFinalClash?.("clash");
  }

  waitForNexusFinalBeamMash(target = 38) {
    return new Promise((resolve) => {
      let count = 0;
      const cleanup = () => {
        window.removeEventListener("keydown", onKey, true);
        this._nexusFinalMashCleanup = null;
      };
      const onKey = (event) => {
        const key = String(event.key ?? "").toLowerCase();
        if (!["z", "enter", " "].includes(key) || event.repeat) return;
        event.preventDefault(); event.stopPropagation();
        count += 1;
        this.setNexusFinalBeamMash(count, target);
        if (count >= target) { cleanup(); resolve(count); }
      };
      this._nexusFinalMashCleanup?.();
      this._nexusFinalMashCleanup = cleanup;
      this.setNexusFinalBeamMash(0, target);
      window.addEventListener("keydown", onKey, true);
    });
  }

  async nexusDarkZagiVictory() {
    if (this._nexusZagiVictoryHandled) return;
    this._nexusZagiVictoryHandled = true;
    this.state.set("VICTORY");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.bullets.stop();
    this.setFrameMode("dialogue");
    this.refs.stage.classList.add("nexus-noa-finale");
    this.refs.enemySprite.classList.add("zagi-collapse");

    // Do not cut straight to an epilogue. Let the final blow become an event of its own.
    this.sound?.playNexusFinalClash?.("rise");
    this.setNexusLegacyScene("zagi-finish-rise");
    await this.storySilence(1500, "nexus-final");
    await this.storyBeat("", "诺亚没有让扎基在城市上空停留。银色的光把它一路推离楼群，地面的灯火迅速缩小。", 2700, "nexus-final");

    this.setNexusLegacyScene("zagi-finish-clash");
    this.sound?.playNexusFinalClash?.("clash");
    await this.storySilence(1150, "nexus-final");
    await this.storyBeat("", "红与银在高空正面撞在一起，冲击把云海压扁，把夜色照成白昼，把世界重新照亮。", 3000, "nexus-final");
    await this.storySilence(850, "nexus-final");

    await this.storyBeat("", "扎基仍在挣扎着把红光往前压，冲击波一点点的逼近诺亚。", 2300, "nexus-final");
    await this.storySilence(650, "nexus-final");
    if (this.refs.nexusFinalMash) this.refs.nexusFinalMash.hidden = false;
    await this.waitForNexusFinalBeamMash(38);
    if (this.refs.nexusFinalMash) this.refs.nexusFinalMash.hidden = true;
    this.setNexusLegacyScene("zagi-finish-break");
    this.sound?.playNexusFinalClash?.("break");
    await this.storyBeat("", "但银色光流更加强大，扎基的光波开始倒退，被击退，被打败，被驱除。", 2750, "nexus-final");
    await this.storySilence(950, "nexus-final");
    this.refs.enemySprite.classList.add("dead");

    this.setNexusLegacyScene("zagi-finish-whiteout");
    await this.storySilence(2100, "nexus-final-white");
    this.sound?.play("victory");
    await this.storySilence(1050, "nexus-final-white");
    this.sound?.stopMusic?.(2600);

    // Only after the battle has visibly ended do we return to people and memory.
    this.setNexusLegacyScene("afterglow-city");
    await this.storySilence(1600, "nexus-afterglow");
    await this.storyBeat("", "光退去之后，城市之中，风如往常一般穿过楼宇，警报逐渐停下，人们仍然抬着头。", 2850, "nexus-afterglow");

    this.setNexusLegacyScene("afterglow-riko");
    await sleep(1250);
    await this.storySilence(1150, "nexus-silver");
    this.setNexusLegacyScene("afterglow-city");
    await this.storyBeat("", "没有人再次忘记。有人害怕，有人在哭，有人抱在一起，但无论如何，所有人都知道了，他们一直都被保护着。", 3050, "nexus-bond");
    await this.storyBeat("", "姬矢把光交下去。怜又把它交下去，凪没有让仇恨成为终点。孤门也不会是最后一个。", 3300, "nexus-bond");
    await this.storySilence(1500, "nexus-noa");
    await this.storyBeat("", "光是纽带,光是NEXUS", 2850, "nexus-noa");
    this.setNexusLegacyScene("");
    this.hideStoryCinematic();
    this.refs.stage.classList.remove("nexus-lightning-noa-finish");
    this.refs.dialogueText.textContent = "NEXUS";
    this.refs.dialogueText.style.fontSize = "34px";
    this.refs.dialogueText.style.fontWeight = "900";
    this.refs.continueHint.style.opacity = "0";
    this.emitResult("victory");
  }

  async gingaLugielReviveFromDefeat() {
    if (!this.lugielFinaleRevivalEligible() || this.lugielFinaleReviving) return;
    this.lugielFinaleReviving = true;
    this.lugielFinaleReviveCount += 1;
    const count = this.lugielFinaleReviveCount;
    this.state.set("CUTSCENE");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.bullets.stop();
    this.player.hp = 0;
    this.renderResources();
    this.refs.stage.classList.add("ginga-final-revive");
    this.refs.storyCinematic.hidden = false;
    this.refs.storyCinematic.dataset.mood = "ginga-final-revive";
    this.setGingaRevivalStep("rainbow");
    this.sound?.playHopeSpark?.();

    if (count === 1) {
      await this.storyBeat("", "路基艾尔的攻击确实奏效了，可银河火花没有丝毫黯淡。", 1900, "ginga-final-revive");
      await this.storyBeat("美铃", "小光，我们都在你的身边！", 2100, "ginga-final-revive");
    } else if (count === 2) {
      await this.storyBeat("", "黑暗又一次将银河打倒，可汇聚进去的光没有散开。", 2250, "ginga-final-revive");
      await this.storyBeat("健太 / 千草", "都走到这里了，哪能让它替我们决定结局！", 2350, "ginga-final-revive");
    } else {
      await this.storyBeat("", "路基艾尔切断了时间，光却依旧在无限延伸。", 2300, "ginga-final-revive");
      await this.storyBeat("", "你能感受到你的心脏在跳动，所有人的心脏都和你一起跳动着。", 2050, "ginga-final-revive");
    }

    this.refs.stage.classList.add("ginga-final-revive-burst");
    this.player.hp = this.player.maxHp;
    this.player.energy = this.player.maxEnergy;
    this.flags.lightShield = true;
    this.renderResources();
    await sleep(720);
    this.hideStoryCinematic();
    if (this.refs.gingaRevivalVision) { this.refs.gingaRevivalVision.hidden = true; this.refs.gingaRevivalVision.dataset.step = ""; }
    setTimeout(() => this.refs.stage.classList.remove("ginga-final-revive", "ginga-final-revive-burst"), 900);
    this.lugielFinaleReviving = false;
    this.inputLocked = false;
    return this.enterPlayerMenu(false);
  }

  async defeat() {
    if (this.lugielFinaleRevivalEligible()) {
      // During the revive cinematic enemyAttack() can still finish its awaited arena run.
      // Never let that late branch fall through to the generic DEFEAT screen.
      if (this.lugielFinaleReviving) return;
      return this.gingaLugielReviveFromDefeat();
    }
    if (this.enemy.encounterMode === "nexus_mephisto_one_himeya" && !this.himeyaSeraPlayed && !this.himeyaScriptedDefeatRunning) return this.nexusMephistoOneScriptedDefeat();
    if (this.state.is("DEFEAT")) return;

    this.state.set("DEFEAT");
    this.inputLocked = true;
    this.setCommandsEnabled(false);
    this.setFrameMode("dialogue");

    this.refs.dialogueText.textContent = "DEFEAT";
    this.refs.dialogueText.style.fontSize = "34px";
    this.refs.dialogueText.style.fontWeight = "900";
    this.refs.continueHint.style.opacity = "0";

    this.sound?.stopFinalePulse?.();
    this.sound?.play("defeat");
    this.emitResult("defeat");
  }

  emitResult(result) {
    if (this.resultEmitted) return;
    this.resultEmitted = true;
    this.sound?.stopMusic?.(1400);
    this.sound?.stopAssetOneShots?.();
    const detail = {
      type: "BATTLE_FINISHED",
      protocolVersion: this.bridgeContext?.protocolVersion ?? "1.0.0",
      runtimeVersion: this.bridgeContext?.runtimeVersion ?? "2.8.0-light-memory-terminal",
      resultId: this.bridgeContext?.requestId
        ? `${this.bridgeContext.requestId}:${result}`
        : `showcase:${Date.now()}:${result}`,
      requestId: this.bridgeContext?.requestId ?? null,
      route: this.bridgeContext?.route ?? null,
      battleId: this.bridgeContext?.battleId ?? this.config.meta?.key ?? this.enemy.id,
      outcome: result,
      result,
      turns: this.turn,
      player: {
        id: this.player.id,
        hp: this.player.hp,
        maxHp: this.player.maxHp,
        energy: this.player.energy,
        maxEnergy: this.player.maxEnergy
      },
      sparkDollAcquired: this.sparkDollAcquired,
      sparkDollsAcquired: this.sparkDollsAcquired,
      routeState: {
        ...this.routeState,
        ...(this.gingaBattle ? { sparkDolls: [...this.gingaUnlocked] } : {})
      },
      enemy: {
        id: this.enemy.id,
        hp: this.enemy.hp,
        maxHp: this.enemy.maxHp,
        rage: this.enemy.rage,
        phase: this.currentPhase?.id ?? null,
        calm: this.enemy.mercy?.value ?? null,
        calmThreshold: this.enemy.mercy?.threshold ?? null,
        gate: this.enemy.gate?.value ?? null,
        gateThreshold: this.enemy.gate?.threshold ?? null,
        adaptation: this.enemy.adaptation?.current ?? null,
        static: this.enemy.static?.value ?? null,
        plasma: this.enemy.plasma?.value ?? null,
        liveForm: this.gingaLiveForm ?? null,
        interfaceGauge: this.enemy.interfaceGauge?.value ?? null,
        frozenCommands: [...this.frozenCommands],
        frozenLiveForms: [...this.frozenLiveForms]
      }
    };

    window.dispatchEvent(new CustomEvent("ubr:battle-finished", { detail }));

    const targetOrigin = this.bridgeContext?.parentOrigin || "*";
    if (window.parent && window.parent !== window) window.parent.postMessage(detail, targetOrigin);
    if (window.opener && window.opener !== window) window.opener.postMessage(detail, targetOrigin);
  }
}
