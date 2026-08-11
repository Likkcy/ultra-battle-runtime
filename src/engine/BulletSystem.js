const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const CARDINAL_KEYS = {
  arrowup: "up", w: "up",
  arrowright: "right", d: "right",
  arrowdown: "down", s: "down",
  arrowleft: "left", a: "left"
};
const SIDES = ["up", "right", "down", "left"];

export class BulletSystem {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    if (typeof callbacks === "function") callbacks = { onHit: callbacks };
    this.callbacks = callbacks;
    this.running = false;
    this.keys = new Set();
    this.guardDirection = null;
    this.bullets = [];
    this.effects = [];
    this.elapsed = 0;
    this.lastTime = 0;
    this.spawnClock = 0;
    this.auxClock = 0;
    this.fragmentClock = 0;
    this.lightClock = 0;
    this.lastSegment = -1;
    this.chaosCoreWaveSegment = -1;
    this.raf = 0;
    this.player = { x: canvas.width / 2, y: canvas.height * .72, radius: 7.1, speed: 252, vx: 0, vy: 0, invulnerableUntil: 0 };
    // Colour-rule hazards (orange/blue) should react to actual motion, not merely
    // whether a direction key happens to be held on the collision frame.
    this.playerMovingThisFrame = false;
    this.playerMotionGraceUntil = 0;

    this._keydown = (event) => {
      const key = event.key.toLowerCase();
      const platformJump = this.mode === "platform" && ["w", "arrowup", "z", " "].includes(key);

      if (platformJump) {
        if (this.running) event.preventDefault();
        this.jumpQueued = true;
        this.jumpBufferUntil = performance.now() + 140;
        this.keys.add(key);
        return;
      }

      if (this.mode === "pressure" && ["z", "enter", " "].includes(key)) {
        if (this.running) event.preventDefault();
        if (this.pressureMantleActive) {
          const now = performance.now();
          this.pressureReflectQueuedUntil = now + (this.pressureMantleAssist ? 285 : 190);
          this.effects.push({ type: "pressureMantle", x: this.player.x, y: this.player.y, age: 0, life: 230, radius: (this.pressureMantleAssist ? 64 : 50) * this.dpr });
        }
        return;
      }

      if (this.mode === "leo" && ["z", "enter", " "].includes(key)) {
        if (this.running) event.preventDefault();
        this.counterQueuedUntil = performance.now() + (this.leoCounterAssist ? 220 : 135);
        return;
      }

      if (this.mode === "chaos" && this.cosmosForm && ["z", "enter", " "].includes(key)) {
        if (this.running) event.preventDefault();
        if (event.repeat) return;
        const now=performance.now();
        if(this.cosmosForm==="luna" || this.cosmosForm==="miracle-luna") this.resolveCosmosLunaPulse(now);
        else if(this.cosmosForm==="corona") this.resolveCosmosCoronaBurst(now);
        else if(this.cosmosForm==="eclipse") this.resolveCosmosEclipseCut(now);
        return;
      }

      if (this.mode === "nexus" && ["z", "enter", " "].includes(key)) {
        if (this.running) event.preventDefault();
        const now = performance.now();
        if (this.nexusCombatStyle === "blue_shooter" || (this.nexusCombatStyle === "zagi" && this.nexusForm === "junis-blue")) {
          this.fireNexusShot(now);
        } else if (this.nexusCombatStyle === "zagi" && this.nexusForm === "junis") {
          this.nexusParryQueuedUntil = now + (this.nexusCounterAssist ? 245 : 175);
          this.effects.push({ type:"nexusParry", x:this.player.x, y:this.player.y, age:0, life:210, radius:(this.nexusCounterAssist?58:44)*this.dpr });
        } else if (this.nexusCombatStyle === "zagi" && this.nexusForm === "noa") {
          this.noaReturnQueuedUntil = now + (this.nexusNoaGuard ? 310 : 225);
          this.effects.push({ type:"noaPulse", x:this.player.x, y:this.player.y, age:0, life:240, radius:(this.nexusNoaGuard?78:60)*this.dpr });
        } else if (this.nexusCombatStyle === "zagi") {
          this.resolveNexusAnphansPulse(now);
        } else {
          this.nexusSlashQueuedUntil = now + (this.nexusSlashAssist ? 220 : 150);
          this.effects.push({ type: "nexusSlash", x: this.player.x, y: this.player.y, age: 0, life: 180, radius: (this.nexusSlashAssist ? 62 : 48) * this.dpr });
        }
        return;
      }

      if (this.mode === "mirror" && ["z", "enter", " "].includes(key)) {
        if (this.running) event.preventDefault();
        const now = performance.now();
        this.effects.push({ type: "mirrorScan", x: this.player.x, y: this.player.y, age: 0, life: 210, radius: this.mirrorScanRadius() });
        this.resolveMirrorScan(now);
        return;
      }

      if (this.mode === "freeze" && ["z", "enter", " "].includes(key)) {
        if (this.running) event.preventDefault();
        const now = performance.now();
        const radius = this.freezePulseRadius();
        this.effects.push({ type: "freezePulse", x: this.player.x, y: this.player.y, age: 0, life: 240, radius });
        this.resolveFreezePulse(now, radius);
        return;
      }

      if (this.mode === "stasis" && ["z", "enter", " "].includes(key)) {
        if (this.running) event.preventDefault();
        const now = performance.now();
        if (this.stasisActive) this.resolveStasisMark(now);
        return;
      }

      if (this.mode === "ginga" && ["z", "enter", " "].includes(key)) {
        if (this.running) event.preventDefault();
        const now = performance.now();
        if (this.gingaLiveForm === "black-king") {
          this.gingaActionQueuedUntil = now + (this.gingaGroundAssist ? 240 : 165);
          this.effects.push({ type: "gingaStomp", x: this.player.x, y: this.player.y, age: 0, life: 260, radius: (this.gingaGroundAssist ? 72 : 54) * this.dpr });
          this.resolveGingaStomp(now);
        } else {
          this.gingaConductQueuedUntil = now + (this.gingaConductAssist ? 240 : 150);
          this.effects.push({ type: "gingaConduct", x: this.player.x, y: this.player.y, age: 0, life: 190, radius: (this.gingaConductAssist ? 52 : 38) * this.dpr });
        }
        return;
      }

      if (this.mode === "original" && ["z", "enter", " "].includes(key)) {
        if (this.running) event.preventDefault();
        if (this.belialFinalClashMode) {
          this.belialClashHeld = true;
          return;
        }
        if (event.repeat) return;
        this.resolveOriginalAction(performance.now());
        return;
      }

      if (!CARDINAL_KEYS[key]) return;
      if (this.running) event.preventDefault();
      this.keys.add(key);
      if (this.mode === "guard") this.guardDirection = CARDINAL_KEYS[key];
    };
    this._keyup = (event) => {
      const key = event.key.toLowerCase();
      this.keys.delete(key);
      if (this.belialFinalClashMode && ["z", "enter", " "].includes(key)) this.belialClashHeld = false;
    };
  }

  get dpr() { return Math.min(window.devicePixelRatio || 1, 2); }

  mount() {
    window.addEventListener("keydown", this._keydown, { passive: false });
    window.addEventListener("keyup", this._keyup);
  }
  unmount() {
    window.removeEventListener("keydown", this._keydown);
    window.removeEventListener("keyup", this._keyup);
    cancelAnimationFrame(this.raf);
  }

  resizeForDisplay() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = this.dpr;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.resetPlayerPosition();
  }

  resetPlayerPosition() {
    if (this.mode === "platform") {
      if (!this.platforms?.length) this.resetPlatformArena();
      this.resetPlatformPlayerToFloor(0);
      return;
    }

    this.player.x = this.canvas.width / 2;
    this.player.y = this.mode === "guard" ? this.canvas.height / 2 : this.canvas.height * .72;
    this.player.vx = 0;
    this.player.vy = 0;
    this.playerMovingThisFrame = false;
    this.playerMotionGraceUntil = 0;
  }

  start(durationMs = 7000, options = {}) {
    this.durationMs = durationMs;
    this.mode = options.mode ?? "dodge";
    this.patternSet = options.patternSet ?? "golza_dodge";
    this.intensity = options.intensity ?? 1;
    this.rage = options.rage ?? 0;
    this.telegraphScale = Math.max(.78, options.telegraphScale ?? 1);
    this.guardBonus = options.guardBonus ?? 0;
    this.speedBonus = options.speedBonus ?? 0;
    this.jumpBonus = options.jumpBonus ?? 0;
    this.platformAssist = options.platformAssist ?? false;
    this.platformFloorsTarget = Math.max(6, options.platformFloorsTarget ?? 9);
    this.purifyActive = options.purifyActive ?? false;
    this.purifyBoost = options.purifyBoost ?? false;
    this.cosmosForm = options.cosmosForm ?? null;
    this.cosmosLunaAssist = options.cosmosLunaAssist ?? false;
    this.cosmosCoronaAssist = options.cosmosCoronaAssist ?? false;
    this.cosmosEclipseAssist = options.cosmosEclipseAssist ?? false;
    this.cosmosMiracleActive = options.cosmosMiracleActive ?? false;
    this.cosmosHeart = options.cosmosHeart ?? 0;
    this.cosmosMonsterTrust = options.cosmosMonsterTrust ?? false;
    this.cosmosActionCooldownUntil = 0;
    this.chaosFragmentGain = options.chaosFragmentGain ?? 12;
    this.chaosMissPenalty = options.chaosMissPenalty ?? 5;
    this.chaosFragmentsTarget = options.chaosFragmentsTarget ?? 5;
    this.gatePressure = clamp(options.gatePressure ?? 0, 0, 100);
    this.gatePassivePerSecond = options.gatePassivePerSecond ?? 0;
    this.gateLightReduce = options.gateLightReduce ?? 16;
    this.gateBurstReset = options.gateBurstReset ?? 58;
    this.gatePullResist = options.gatePullResist ?? false;
    this.gateLightIntervalMs = options.gateLightIntervalMs ?? 2100;
    this.leoCounterAssist = options.leoCounterAssist ?? false;
    this.leoCrossBait = options.leoCrossBait ?? false;
    this.leoFormation = options.leoFormation ?? 100;
    this.leoEncounter = options.leoEncounter ?? "";
    this.pressureShrunk = options.pressureShrunk ?? false;
    this.pressureMantleActive = options.pressureMantleActive ?? false;
    this.pressureMantleAssist = options.pressureMantleAssist ?? false;
    this.pressureReflectDamage = options.pressureReflectDamage ?? 18;
    this.blackEndClose = options.blackEndClose ?? false;
    this.nexusSlashAssist = options.nexusSlashAssist ?? false;
    this.nexusPressure = options.nexusPressure ?? false;
    this.nexusMetaField = options.nexusMetaField ?? false;
    this.nexusCombatStyle = options.nexusCombatStyle ?? "sever";
    this.nexusForm = options.nexusForm ?? "anphans";
    this.nexusShootAssist = options.nexusShootAssist ?? false;
    this.nexusShootBait = options.nexusShootBait ?? false;
    this.nexusCounterAssist = options.nexusCounterAssist ?? false;
    this.nexusNoaGuard = options.nexusNoaGuard ?? false;
    this.nexusGauge = clamp(options.nexusGauge ?? 0, 0, 100);
    this.mizorogiAssist = options.mizorogiAssist ?? false;
    this.tigaGlitter = options.tigaGlitter ?? false;
    this.predation = clamp(options.predation ?? 0, 0, options.predationThreshold ?? 100);
    this.predationThreshold = options.predationThreshold ?? 100;
    this.predationFeedGain = options.predationFeedGain ?? 14;
    this.predationSeverReduce = options.predationSeverReduce ?? 11;
    this.predationFeedHeal = options.predationFeedHeal ?? 7;
    this.predationSeverDamage = options.predationSeverDamage ?? 8;
    this.feedingCellsTarget = Math.max(3, options.feedingCellsTarget ?? 5);
    this.gingaLiveForm = options.gingaLiveForm ?? "ginga";
    this.gingaStatic = clamp(options.gingaStatic ?? 0, 0, options.gingaStaticThreshold ?? 100);
    this.gingaStaticThreshold = options.gingaStaticThreshold ?? 100;
    this.gingaGroundReduce = options.gingaGroundReduce ?? 15;
    this.gingaGroundAssist = options.gingaGroundAssist ?? false;
    this.gingaOverload = options.gingaOverload ?? false;
    this.gingaConductAssist = options.gingaConductAssist ?? false;
    this.gingaConductBait = options.gingaConductBait ?? false;
    this.gingaConductTarget = Math.max(3, options.gingaConductTarget ?? 4);
    this.mirrorGauge = clamp(options.mirrorGauge ?? 0, 0, 100);
    this.mirrorRead = options.mirrorRead ?? false;
    this.mirrorBait = options.mirrorBait ?? false;
    this.mirrorTrialsTarget = Math.max(2, options.mirrorTrialsTarget ?? 3);
    this.freezeTargets = Array.isArray(options.freezeTargets) ? options.freezeTargets : [];
    this.freezeAssist = options.freezeAssist ?? false;
    this.darkSpark = clamp(options.darkSpark ?? 0, 0, 100);
    this.rescueGauge = clamp(options.rescueGauge ?? 0, 0, 100);
    this.rescueBoost = options.rescueBoost ?? false;
    this.rescueShardTarget = Math.max(3, options.rescueShardTarget ?? 4);
    this.rescueMemoryOffset = options.rescueMemoryOffset ?? 0;
    this.allySignalTarget = Math.max(2, options.allySignalTarget ?? 3);
    this.allyAutoSupport = options.allyAutoSupport ?? false;
    this.stasisGauge = clamp(options.stasisGauge ?? 0, 0, 100);
    this.stasisAssist = options.stasisAssist ?? false;
    this.stasisMarkBoost = options.stasisMarkBoost ?? false;
    this.stasisAnchorBoost = options.stasisAnchorBoost ?? false;
    this.stasisCycleMs = Math.max(1800, options.stasisCycleMs ?? 2450);
    this.futureAnchorLabels = Array.isArray(options.futureAnchorLabels) ? options.futureAnchorLabels : [];
    this.futureAnchorsAwakened = options.futureAnchorsAwakened ?? 0;
    this.futureAnchorsRequired = options.futureAnchorsRequired ?? 3;
    this.bossPhase = options.bossPhase ?? 0;
    this.originalEncounter = options.originalEncounter ?? null;
    this.originalControl = options.originalControl ?? null;
    this.originalForm = options.originalForm ?? null;
    this.originalFormSpeed = options.originalFormSpeed ?? 1;
    this.originalGauge = options.originalGauge ?? 0;
    this.originalModules = options.originalModules ?? null;
    this.originalTargetPart = options.originalTargetPart ?? null;
    this.originalZettonBeamStored = options.originalZettonBeamStored ?? false;
    this.originalTurn = Math.max(1, Number(options.originalTurn ?? 1) || 1);
    this.belialSpecial = options.belialSpecial ?? null;
    this.belialFlightMode = this.originalEncounter === "original_belial" && this.belialSpecial === "galaxy";
    this.belialAbyssMode = this.originalEncounter === "original_belial" && this.belialSpecial === "abyss";
    this.belialFinalClashMode = this.originalEncounter === "original_belial" && this.belialSpecial === "final-clash";
    this.belialClawMode = false;
    this.belialClashHeld = false;
    this.belialClashProgress = 0;
    this.belialClashComplete = false;
    this.belialClashLastElapsed = 0;
    this.belialClashPunishAt = 0;
    this.belialClashReportAt = 0;
    this.belialAvatarX = this.canvas.width * .68;
    this.belialAvatarY = this.canvas.height * .22;
    this.belialCanvasPose = "taunt";
    this.belialCanvasPoseUntil = 0;
    this.belialAvatarLastX = this.belialAvatarX;
    this.belialAvatarLastY = this.belialAvatarY;
    this.belialFlightShotAt = 0;
    this.fiveLaneMode = false;
    this.fiveLaneLeftX = this.canvas.width * .44;
    this.fiveLaneRightX = this.canvas.width * .56;
    this.fiveLaneCenterY = this.canvas.height * .54;
    this.fiveFallMode = false;
    this.fiveFallBoost = 0;
    this.fiveFrozenUntil = 0;
    this.fiveFreezeScale = 1;
    this.fivePlayerTrail = [];
    this.originalActionCooldownUntil = 0;
    this.originalParryQueuedUntil = 0;
    this.originalLastShotAt = 0;
    this.player.radius = options.playerRadius ?? 7.1;

    this.resizeForDisplay();
    this.running = true;
    this.bullets = [];
    this.effects = [];
    this.hitCount = 0;
    this.guardCount = 0;
    this.specialGuardCount = 0;
    this.elapsed = 0;
    this.spawnClock = 9999;
    this.auxClock = 9999;
    this.fragmentClock = 9999;
    this.lightClock = 9999;
    this.monsterClock = 9999;
    this.lastSegment = -1;
    this.chaosCoreWaveSegment = -1;
    this.originalPatternFired = new Set();
    this.lastTime = performance.now();
    this.player.invulnerableUntil = 0;
    this.guardDirection = null;
    this.jumpQueued = false;
    this.jumpBufferUntil = 0;
    this.goalReached = false;
    this.platformFalls = 0;
    this.highestFloorReached = 0;
    this.purifiedFragments = 0;
    this.cosmosPurified = 0;
    this.cosmosBroken = 0;
    this.cosmosEyesCleared = 0;
    this.cosmosHeartCollected = 0;
    this.chaosReached = 0;
    this.chaosFragmentsSpawned = 0;
    this.lightAnchorsCollected = 0;
    this.gateBursts = 0;
    this.gateBurstCooldownUntil = 0;
    this.gateBurstVisualUntil = 0;
    this.counterQueuedUntil = 0;
    this.counterCount = 0;
    this.perfectCounterCount = 0;
    this.pressureReflectQueuedUntil = 0;
    this.pressureReflections = 0;
    this.nexusSlashQueuedUntil = 0;
    this.nexusParryQueuedUntil = 0;
    this.noaReturnQueuedUntil = 0;
    this.lastNexusShotAt = 0;
    this.nexusShotHits = 0;
    this.nexusDrains = 0;
    this.nexusParries = 0;
    this.noaReturns = 0;
    this.nexusNeutralized = 0;
    this.feedingCellsSpawned = 0;
    this.feedingCellsSevered = 0;
    this.feedingCellsFed = 0;
    this.groundedNodes = 0;
    this.conductedBolts = 0;
    this.gingaConductSpawned = 0;
    this.gingaActionQueuedUntil = 0;
    this.gingaConductQueuedUntil = 0;
    this.mirrorTrialsSpawned = 0;
    this.mirrorVerified = 0;
    this.mirrorFalse = 0;
    this.commandsThawed = 0;
    this.formsThawed = 0;
    this.memoryShardsSpawned = 0;
    this.memoryDelivered = 0;
    this.memoryDropped = 0;
    this.memoryCarrying = false;
    this.memoryCarryingId = null;
    this.memoryHeart = null;
    this.allyLinks = 0;
    this.allySignalsSpawned = 0;
    this.allyStrikeCount = 0;
    this.allyShieldCharges = 0;
    this.stasisActive = false;
    this.stasisCycleIndex = -1;
    this.stasisMarked = 0;
    this.stasisReturned = 0;
    this.stasisMissed = 0;
    this.futureAnchors = 0;
    this.originalBreaks = 0;
    this.originalCounters = 0;
    this.originalShots = 0;
    this.grandAdvanceSpawned = false;
    this.futureAnchorSpawnedIds = new Set();
    this.futureSpark = null;
    this.lastReportedStatic = Math.round(this.gingaStatic);
    this.lastReportedGate = Math.round(this.gatePressure);
    if (this.mode === "platform") this.resetPlatformArena();
    if (this.mode === "ginga" && this.patternSet === "thunder_darambia") this.resetGingaCircuitArena();
    this.resetPlayerPosition();
    if (this.mode === "memory") this.resetMemoryArena();
    if (this.mode === "freeze") this.spawnFreezeTargets();

    return new Promise((resolve) => {
      this.resolve = resolve;
      this.raf = requestAnimationFrame((t) => this.frame(t));
    });
  }

  summary() {
    return {
      hits: this.hitCount,
      guards: this.guardCount,
      specialGuards: this.specialGuardCount,
      goalReached: !!this.goalReached,
      floorsReached: this.highestFloorReached ?? 0,
      floorsTarget: this.platformFloorsTarget ?? 0,
      falls: this.platformFalls ?? 0,
      purifiedFragments: this.purifiedFragments ?? 0,
      cosmosPurified: this.cosmosPurified ?? 0,
      cosmosBroken: this.cosmosBroken ?? 0,
      cosmosEyesCleared: this.cosmosEyesCleared ?? 0,
      cosmosHeartCollected: this.cosmosHeartCollected ?? 0,
      chaosReached: this.chaosReached ?? 0,
      chaosFragmentsSpawned: this.chaosFragmentsSpawned ?? 0,
      gatePressure: this.gatePressure ?? 0,
      lightAnchorsCollected: this.lightAnchorsCollected ?? 0,
      gateBursts: this.gateBursts ?? 0,
      counters: this.counterCount ?? 0,
      perfectCounters: this.perfectCounterCount ?? 0,
      pressureReflections: this.pressureReflections ?? 0,
      nexusShotHits: this.nexusShotHits ?? 0,
      nexusDrains: this.nexusDrains ?? 0,
      nexusParries: this.nexusParries ?? 0,
      noaReturns: this.noaReturns ?? 0,
      nexusNeutralized: this.nexusNeutralized ?? 0,
      feedingCellsSpawned: this.feedingCellsSpawned ?? 0,
      feedingCellsSevered: this.feedingCellsSevered ?? 0,
      feedingCellsFed: this.feedingCellsFed ?? 0,
      predation: this.predation ?? 0,
      staticLevel: this.gingaStatic ?? 0,
      groundedNodes: this.groundedNodes ?? 0,
      conductedBolts: this.conductedBolts ?? 0,
      mirrorVerified: this.mirrorVerified ?? 0,
      mirrorFalse: this.mirrorFalse ?? 0,
      commandsThawed: this.commandsThawed ?? 0,
      formsThawed: this.formsThawed ?? 0,
      freezeMissed: (this.bullets ?? []).filter((bullet) => bullet.type === "freezeCrystal" && !bullet.dead && !bullet.thawed).length,
      memoryDelivered: this.memoryDelivered ?? 0,
      memoryDropped: this.memoryDropped ?? 0,
      allyLinks: this.allyLinks ?? 0,
      stasisMarked: this.stasisMarked ?? 0,
      stasisReturned: this.stasisReturned ?? 0,
      stasisMissed: this.stasisMissed ?? 0,
      futureAnchors: this.futureAnchors ?? 0,
      originalBreaks: this.originalBreaks ?? 0,
      originalCounters: this.originalCounters ?? 0,
      originalShots: this.originalShots ?? 0
    };
  }

  stop() {
    const wasRunning = this.running;
    if (this.stasisActive) {
      this.stasisActive = false;
      this.callbacks.onStasisState?.(false);
    }
    this.running = false;
    this.bullets = [];
    this.effects = [];
    cancelAnimationFrame(this.raf);
    this.clear();
    if (wasRunning && this.resolve) {
      const resolve = this.resolve;
      this.resolve = null;
      resolve(this.summary());
    }
  }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, .033);
    this.lastTime = now;
    this.elapsed += dt * 1000;
    this.spawnClock += dt * 1000;
    this.auxClock += dt * 1000;
    this.fragmentClock += dt * 1000;
    this.lightClock += dt * 1000;
    this.monsterClock += dt * 1000;

    if (this.mode === "guard") this.updateGuardPlayer();
    else if (this.mode === "platform") this.updatePlatformPlayer(dt, now);
    else if (this.mode === "prophecy") this.updateProphecyPlayer(dt, now);
    else if (this.mode === "stasis") this.updateStasisPlayer(dt, now);
    else if (["ginga", "mirror", "freeze", "memory", "siege"].includes(this.mode)) this.updateGingaPlayer(dt, now);
    else this.updateDodgePlayer(dt);

    this.runPattern();
    this.updateBullets(dt, now);
    this.updateEffects(dt);
    this.draw(now);

    if (this.elapsed >= this.durationMs) {
      if (this.stasisActive) {
        this.stasisActive = false;
        this.callbacks.onStasisState?.(false);
      }
      this.running = false;
      this.bullets = [];
      this.effects = [];
      this.clear();
      const resolve = this.resolve;
      this.resolve = null;
      resolve?.(this.summary());
      return;
    }
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  updateDodgePlayer(dt) {
    let dx = 0, dy = 0;
    if (this.keys.has("arrowleft") || this.keys.has("a")) dx -= 1;
    if (this.keys.has("arrowright") || this.keys.has("d")) dx += 1;
    if (this.keys.has("arrowup") || this.keys.has("w")) dy -= 1;
    if (this.keys.has("arrowdown") || this.keys.has("s")) dy += 1;
    if (dx || dy) { const length = Math.hypot(dx, dy); dx /= length; dy /= length; }
    const padding = 15 * this.dpr;
    const nexusFormSpeed = this.mode === "nexus"
      ? ({ anphans:1, junis:.96, "junis-blue":1.20, noa:1.27 }[this.nexusForm] ?? 1)
      : 1;
    const originalScale = this.mode === "original" ? (this.originalFormSpeed ?? 1) : 1;
    let speed = (this.player.speed + this.speedBonus) * nexusFormSpeed * originalScale * this.dpr;
    if (this.originalEncounter === "original_five_king" && this.elapsed < (this.fiveFrozenUntil ?? 0)) {
      speed *= this.fiveFreezeScale ?? .58;
    }
    const beforeX = this.player.x, beforeY = this.player.y;
    // Five King's left arm collapses the arena into two vertical columns. During this
    // pattern the player chooses LEFT or RIGHT; there is no hidden third safe lane. Wings
    // keep their free-fall handling from v2.6.0.
    if (this.originalEncounter === "original_five_king" && this.fiveFallMode) dy *= .42;
    if (this.originalEncounter === "original_five_king" && this.fiveLaneMode) {
      const left = this.fiveLaneLeftX ?? this.canvas.width*.44;
      const right = this.fiveLaneRightX ?? this.canvas.width*.56;
      if (dx < -.1) this.player.x = left;
      else if (dx > .1) this.player.x = right;
      else this.player.x = Math.abs(this.player.x-left) <= Math.abs(this.player.x-right) ? left : right;
      this.player.y = this.fiveLaneCenterY ?? this.canvas.height*.54;
    } else {
      this.player.x = clamp(this.player.x + dx * speed * dt, padding, this.canvas.width - padding);
      this.player.y = clamp(this.player.y + dy * speed * dt, padding, this.canvas.height - padding);
      if (this.originalEncounter === "original_belial" && this.belialClawMode) {
        const left=this.canvas.width*.27, right=this.canvas.width*.73;
        this.player.x=clamp(this.player.x,left,right);
      }
      if (this.originalEncounter === "original_five_king" && this.fiveFallMode) {
        this.player.y = clamp(this.player.y + (17 + (this.fiveFallBoost ?? 0)*2.2) * this.dpr * dt, padding, this.canvas.height-padding);
      }
    }
    const moved = Math.hypot(this.player.x - beforeX, this.player.y - beforeY);
    this.playerMovingThisFrame = moved > Math.max(.18 * this.dpr, .02);
    if (this.playerMovingThisFrame) this.playerMotionGraceUntil = this.elapsed + 120;
    if (this.originalEncounter === "original_five_king") {
      this.fivePlayerTrail.push({ x:this.player.x, y:this.player.y, t:this.elapsed });
      const cutoff=this.elapsed-1450;
      while(this.fivePlayerTrail.length && this.fivePlayerTrail[0].t<cutoff) this.fivePlayerTrail.shift();
      if(this.fivePlayerTrail.length>90) this.fivePlayerTrail.splice(0,this.fivePlayerTrail.length-90);
    }
  }

  playerMovingForColorRule({ orangeGrace=false }={}) {
    if (this.playerMovingThisFrame) return true;
    return orangeGrace && this.elapsed <= (this.playerMotionGraceUntil ?? 0);
  }
  updateGingaPlayer(dt, now) {
    let dx = 0, dy = 0;
    if (this.keys.has("arrowleft") || this.keys.has("a")) dx -= 1;
    if (this.keys.has("arrowright") || this.keys.has("d")) dx += 1;
    if (this.keys.has("arrowup") || this.keys.has("w")) dy -= 1;
    if (this.keys.has("arrowdown") || this.keys.has("s")) dy += 1;
    if (dx || dy) { const length = Math.hypot(dx, dy); dx /= length; dy /= length; }
    const dpr = this.dpr;
    const padding = (this.gingaLiveForm === "black-king" ? 22 : 15) * dpr;
    const formScale = this.gingaLiveForm === "black-king" ? .57 : this.gingaLiveForm === "thunder-darambia" ? .86 : this.gingaLiveForm === "ultraseven" ? 1.06 : 1;
    const speed = (this.player.speed + this.speedBonus) * formScale * dpr;
    this.player.x = clamp(this.player.x + dx * speed * dt, padding, this.canvas.width - padding);
    this.player.y = clamp(this.player.y + dy * speed * dt, padding, this.canvas.height - padding);

    if (this.mode === "ginga" && this.patternSet === "thunder_darambia" && this.bossPhase === 0) {
      const passive = (this.gingaOverload ? 1.7 : 1.05) * dt;
      this.gingaStatic = clamp(this.gingaStatic + passive, 0, this.gingaStaticThreshold);
      this.reportGingaStatic();
    }
  }

  reportGingaStatic(force = false) {
    const rounded = Math.round(this.gingaStatic ?? 0);
    if (force || rounded !== this.lastReportedStatic) {
      this.lastReportedStatic = rounded;
      this.callbacks.onStaticChange?.(this.gingaStatic);
    }
  }

  resetGingaCircuitArena() {
    const w = this.canvas.width, h = this.canvas.height, dpr = this.dpr;
    const layout = [
      [.18,.26], [.50,.18], [.82,.27],
      [.25,.70], [.56,.62], [.80,.73]
    ];
    this.circuitNodes = layout.map(([x,y], i) => ({ id:i, x:w*x, y:h*y, groundedUntil:0, pulseOffset:i*.73 }));
    this.circuitLinks = [[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5]];
  }

  resolveGingaStomp(now) {
    if (this.mode !== "ginga" || this.gingaLiveForm !== "black-king") return false;
    const dpr = this.dpr;
    const radius = (this.gingaGroundAssist ? 82 : 62) * dpr;
    const activeNodeIds = new Set();
    for (const bullet of this.bullets ?? []) {
      if (bullet.type !== "circuitArc" || bullet.dead) continue;
      activeNodeIds.add(bullet.a);
      activeNodeIds.add(bullet.b);
    }
    let best = null;
    for (const node of this.circuitNodes ?? []) {
      if (!activeNodeIds.has(node.id)) continue;
      const distance = Math.hypot(node.x - this.player.x, node.y - this.player.y);
      if (distance <= radius && (!best || distance < best.distance)) best = { node, distance };
    }
    if (!best) return false;

    best.node.groundedUntil = this.elapsed + (this.gingaOverload ? 1850 : 1450);
    let killed = 0;
    for (const bullet of this.bullets) {
      if (bullet.type !== "circuitArc" || bullet.dead) continue;
      if (bullet.a === best.node.id || bullet.b === best.node.id) { bullet.dead = true; killed += 1; }
    }
    const perfect = best.distance <= 30 * dpr;
    const reduce = this.gingaGroundReduce + (this.gingaOverload ? 6 : 0) + (perfect ? 4 : 0);
    this.gingaStatic = clamp(this.gingaStatic - reduce, 0, this.gingaStaticThreshold);
    this.groundedNodes = (this.groundedNodes ?? 0) + 1;
    this.effects.push({ type:"gingaGround", x:best.node.x, y:best.node.y, age:0, life:430, radius:30*dpr, perfect });
    this.callbacks.onGroundNode?.({ reduce, perfect, killed });
    this.reportGingaStatic(true);
    return true;
  }

  mirrorScanRadius() {
    const dpr = this.dpr;
    let radius = this.gingaLiveForm === "thunder-darambia" ? 78 : this.gingaLiveForm === "black-king" ? 64 : 56;
    if (this.mirrorRead) radius += 24;
    return radius * dpr;
  }

  resolveMirrorScan(now) {
    if (this.mode !== "mirror") return false;
    const radius = this.mirrorScanRadius();
    let best = null;
    for (const sign of this.bullets) {
      if (sign.type !== "mirrorSign" || sign.dead || sign.resolved || sign.age < sign.scanAfter) continue;
      const dist = Math.hypot(sign.x - this.player.x, sign.y - this.player.y);
      if (dist <= radius && (!best || dist < best.dist)) best = { sign, dist };
    }
    if (!best) return false;
    const sign = best.sign;
    const siblings = this.bullets.filter((item) => item.type === "mirrorSign" && item.trialId === sign.trialId && !item.dead);
    const perfect = best.dist <= 24 * this.dpr;
    for (const item of siblings) { item.resolved = true; item.dead = true; }
    if (sign.correct) {
      this.mirrorVerified += 1;
      this.effects.push({ type:"mirrorVerify", x:sign.x, y:sign.y, age:0, life:430, radius:26*this.dpr, label: perfect ? "SIGN VERIFIED!" : "SIGN VERIFIED" });
      this.callbacks.onMirrorVerify?.({ perfect, label: sign.label });
    } else {
      this.mirrorFalse += 1;
      this.effects.push({ type:"mirrorFalse", x:sign.x, y:sign.y, age:0, life:430, radius:24*this.dpr, label:"FALSE SIGN" });
      this.callbacks.onMirrorFalse?.({ damage:6, gain:10, label:sign.label });
    }
    return true;
  }

  freezePulseRadius() {
    let radius = 58;
    if (this.gingaLiveForm === "black-king") radius = 88;
    else if (this.gingaLiveForm === "thunder-darambia") radius = 82;
    else if (this.gingaLiveForm === "ultraseven") radius = 76;
    else if (this.gingaLiveForm === "ultraman") radius = 64;
    if (this.freezeAssist) radius += 24;
    return radius * this.dpr;
  }

  resolveFreezePulse(now, radius = this.freezePulseRadius()) {
    if (this.mode !== "freeze") return false;
    const maxTargets = this.gingaLiveForm === "thunder-darambia" ? 2 : 1;
    const candidates = this.bullets
      .filter((crystal) => crystal.type === "freezeCrystal" && !crystal.dead && !crystal.thawed)
      .map((crystal) => ({ crystal, dist: Math.hypot(crystal.x - this.player.x, crystal.y - this.player.y) }))
      .filter((entry) => entry.dist <= radius)
      .sort((a,b) => a.dist - b.dist)
      .slice(0, maxTargets);
    if (!candidates.length) return false;
    for (const { crystal, dist } of candidates) {
      crystal.thawed = true;
      crystal.dead = true;
      const perfect = dist <= 26 * this.dpr;
      this.effects.push({ type:"freezeBreak", x:crystal.x, y:crystal.y, age:0, life:460, radius:28*this.dpr, label:crystal.label });
      if (crystal.targetType === "form") {
        this.formsThawed += 1;
        this.callbacks.onDollThaw?.({ form: crystal.targetId, perfect, reduce: perfect ? 20 : 16 });
      } else {
        this.commandsThawed += 1;
        this.callbacks.onCommandThaw?.({ command: crystal.targetId, perfect, reduce: perfect ? 20 : 16 });
      }
    }
    return true;
  }

  spawnFreezeTargets() {
    const targets = this.freezeTargets ?? [];
    if (!targets.length) return;
    const dpr = this.dpr;

    // Lugiel can eventually freeze up to four commands plus several Spark Dolls.
    // Keep every crystal inside the visible arena instead of stacking later rows off-screen.
    const cols = targets.length <= 2 ? targets.length : targets.length <= 4 ? 2 : 3;
    const rows = Math.ceil(targets.length / Math.max(1, cols));
    const xFor = (col) => this.canvas.width * ((col + 1) / (cols + 1));
    const yFor = (row) => this.canvas.height * (rows <= 1 ? .5 : .25 + (.5 * row / (rows - 1)));

    targets.forEach((target, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = xFor(col);
      const y = yFor(row);
      this.addBullet({ type:"freezeCrystal", x,y,vx:0,vy:0,r:22*dpr,life:this.durationMs+500,targetType:target.type,targetId:target.id,label:target.label??target.id,damage:0 });
    });
  }

  resetMemoryArena() {
    this.memoryHeart = {
      x: this.canvas.width / 2,
      y: this.canvas.height * .48,
      radius: 24 * this.dpr
    };
    this.player.x = this.canvas.width / 2;
    this.player.y = this.canvas.height * .78;
  }

  updateStasisPlayer(dt, now) {
    const dpr = this.dpr;
    if (this.stasisActive && this.bossPhase >= 1) {
      if (!this.futureSpark) this.futureSpark = { x: this.player.x, y: this.player.y };
      let dx = 0, dy = 0;
      if (this.keys.has("arrowleft") || this.keys.has("a")) dx -= 1;
      if (this.keys.has("arrowright") || this.keys.has("d")) dx += 1;
      if (this.keys.has("arrowup") || this.keys.has("w")) dy -= 1;
      if (this.keys.has("arrowdown") || this.keys.has("s")) dy += 1;
      if (dx || dy) { const len = Math.hypot(dx, dy); dx /= len; dy /= len; }
      const speed = (this.player.speed + this.speedBonus + (this.stasisAssist ? 45 : 0)) * 1.08 * dpr;
      const pad = 14 * dpr;
      this.futureSpark.x = clamp(this.futureSpark.x + dx * speed * dt, pad, this.canvas.width - pad);
      this.futureSpark.y = clamp(this.futureSpark.y + dy * speed * dt, pad, this.canvas.height - pad);
      this.resolveFutureAnchorTouch();
      return;
    }
    this.updateGingaPlayer(dt, now);
  }

  stasisControlPoint() {
    if (this.stasisActive && this.bossPhase >= 1 && this.futureSpark) return this.futureSpark;
    return this.player;
  }

  stasisMarkRadius() {
    // Slightly more generous FUTURE conversion radius so the mechanic reads as
    // "claim the nearby frozen cluster" instead of pixel-hunting individual shots.
    let radius = 64;
    if (this.gingaLiveForm === "grand-king") radius = 94;
    else if (this.gingaLiveForm === "thunder-darambia") radius = 80;
    else if (this.gingaLiveForm === "black-king") radius = 74;
    if (this.stasisMarkBoost) radius += 30;
    return radius * this.dpr;
  }

  stasisMarkLimit() {
    let limit = this.gingaLiveForm === "grand-king" ? 3 : this.gingaLiveForm === "thunder-darambia" ? 2 : 1;
    if (this.stasisMarkBoost) limit += 1;
    return limit;
  }

  resolveStasisMark(now) {
    if (!this.stasisActive) return false;
    const point = this.stasisControlPoint();
    const radius = this.stasisMarkRadius();
    const available = this.bullets
      .filter((b) => b.type === "stasisShard" && !b.dead && !b.marked && b.delay <= 0)
      .map((b) => ({ b, d: Math.hypot(b.x - point.x, b.y - point.y) }))
      .filter((entry) => entry.d <= radius)
      .sort((a, b) => a.d - b.d)
      .slice(0, this.stasisMarkLimit());
    if (!available.length) {
      this.effects.push({ type:"futurePing", x:point.x, y:point.y, age:0, life:220, radius:radius*.4 });
      return false;
    }
    for (const { b, d } of available) {
      b.marked = true;
      b.perfectMark = d <= radius * .36;
      this.stasisMarked += 1;
      this.effects.push({ type:"futureMark", x:b.x, y:b.y, age:0, life:360, radius:18*this.dpr, label:b.perfectMark?"FUTURE!":"FUTURE" });
    }
    return true;
  }

  beginStasisStop() {
    if (this.stasisActive) return;
    this.stasisActive = true;
    if (this.bossPhase >= 1) this.futureSpark = { x:this.player.x, y:this.player.y };
    this.callbacks.onStasisState?.(true);
    this.effects.push({ type:"timeStop", x:this.canvas.width/2, y:this.canvas.height/2, age:0, life:420, radius:50*this.dpr });
  }

  endStasisStop() {
    if (!this.stasisActive) return;
    this.stasisActive = false;
    if (this.bossPhase >= 1 && this.futureSpark) {
      this.player.x = this.futureSpark.x;
      this.player.y = this.futureSpark.y;
    }
    this.futureSpark = null;
    for (const b of this.bullets) {
      if (b.type !== "stasisShard" || b.dead || b.delay > 0) continue;
      if (b.marked) {
        b.returning = true;
        b.vx *= -.22;
        b.vy = -Math.max(205*this.dpr, Math.abs(b.vy)*1.45);
        b.damage = 0;
      } else {
        this.stasisMissed += 1;
        this.callbacks.onStasisMiss?.({ gain: this.stasisGauge >= 70 ? 4 : 3 });
      }
    }
    this.callbacks.onStasisState?.(false);
    this.effects.push({ type:"timeResume", x:this.player.x, y:this.player.y, age:0, life:360, radius:32*this.dpr });
  }

  updateStasisClock() {
    if (this.mode !== "stasis") return;
    const cycle = this.stasisCycleMs;
    const index = Math.floor(this.elapsed / cycle);
    const local = this.elapsed - index * cycle;
    const start = this.stasisAssist ? cycle * .56 : cycle * .48;
    const stopDuration = this.stasisAssist
      ? (this.bossPhase >= 2 ? 760 : 610)
      : (this.bossPhase === 0 ? 760 : this.bossPhase === 1 ? 930 : 1160);
    const shouldStop = local >= start && local < start + stopDuration;
    if (shouldStop && !this.stasisActive) this.beginStasisStop();
    else if (!shouldStop && this.stasisActive) this.endStasisStop();
  }

  resolveFutureAnchorTouch() {
    if (!this.stasisActive || this.bossPhase < 2 || !this.futureSpark) return;
    const dpr = this.dpr;
    for (const b of this.bullets) {
      if (b.type !== "futureAnchor" || b.dead || b.awakened) continue;
      if (Math.hypot(b.x - this.futureSpark.x, b.y - this.futureSpark.y) <= b.r + 10*dpr) {
        b.dead = true;
        b.awakened = true;
        this.futureAnchors += 1;
        this.effects.push({ type:"futureAnchor", x:b.x, y:b.y, age:0, life:620, radius:30*dpr, label:b.label });
        this.callbacks.onFutureAnchor?.({ id:b.anchorId, label:b.label });
      }
    }
  }

  updateProphecyPlayer(dt, now) {
    let dx = 0, dy = 0;
    if (this.keys.has("arrowleft") || this.keys.has("a")) dx -= 1;
    if (this.keys.has("arrowright") || this.keys.has("d")) dx += 1;
    if (this.keys.has("arrowup") || this.keys.has("w")) dy -= 1;
    if (this.keys.has("arrowdown") || this.keys.has("s")) dy += 1;
    if (dx || dy) { const length = Math.hypot(dx, dy); dx /= length; dy /= length; }

    const dpr = this.dpr;
    const padding = 15 * dpr;
    const speed = (this.player.speed + this.speedBonus) * dpr;
    const pullScale = this.gatePullResist ? .42 : 1;
    const pull = (18 + this.gatePressure * .78 + this.bossPhase * 9) * pullScale * dpr;

    this.player.x = clamp(this.player.x + dx * speed * dt, padding, this.canvas.width - padding);
    this.player.y = clamp(this.player.y + dy * speed * dt - pull * dt, padding, this.canvas.height - padding);

    const passive = this.gatePassivePerSecond * (1 + this.bossPhase * .22);
    this.gatePressure = clamp(this.gatePressure + passive * dt, 0, 100);
    this.reportGatePressure();

    if (this.player.y <= 22 * dpr && now >= this.player.invulnerableUntil) {
      this.hitCount += 1;
      this.player.invulnerableUntil = now + 760;
      this.callbacks.onHit?.(16);
      this.player.y = this.canvas.height * .72;
      this.gatePressure = Math.max(0, this.gatePressure - 8);
      this.reportGatePressure(true);
    }

    if (this.gatePressure >= 100 && now >= this.gateBurstCooldownUntil) {
      this.triggerGateBurst(now);
    }
  }

  reportGatePressure(force = false) {
    const rounded = Math.round(this.gatePressure ?? 0);
    if (force || rounded !== this.lastReportedGate) {
      this.lastReportedGate = rounded;
      this.callbacks.onGatePressure?.(this.gatePressure);
    }
  }

  triggerGateBurst(now) {
    this.gateBursts += 1;
    this.gateBurstCooldownUntil = now + 2600;
    this.gateBurstVisualUntil = this.elapsed + 1550;
    this.gatePressure = this.gateBurstReset;
    this.reportGatePressure(true);
    this.spawnGateRupture();
  }

  updateGuardPlayer() { this.player.x = this.canvas.width / 2; this.player.y = this.canvas.height / 2; }

  platformScreenY(worldY) {
    return worldY - (this.platformCameraY ?? 0);
  }

  nearestPlatformForAttack(offset = 0) {
    const floor = clamp(
      Math.max(this.player.lastPlatformFloor ?? 0, this.highestFloorReached ?? 0) + offset,
      0,
      Math.max(0, (this.platforms?.length ?? 1) - 1)
    );
    return this.platforms?.find((entry) => entry.floor === floor) ?? this.platforms?.[0] ?? null;
  }

  resetPlatformArena() {
    const dpr = this.dpr;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ph = 7 * dpr;
    const step = 74 * dpr;
    const target = this.platformFloorsTarget ?? 9;

    this.platformStep = step;
    this.platformInitialCameraY = -(h - 32 * dpr);
    this.platformCameraY = this.platformInitialCameraY;
    this.platforms = [];

    // Floor 0 is the only broad resting platform. Every platform above it is a step.
    this.platforms.push({
      floor: 0,
      x: w * .20,
      worldY: 0,
      w: w * .34,
      h: ph,
      start: true
    });

    for (let floor = 1; floor <= target + 2; floor++) {
      const side = floor % 2 === 1 ? "right" : "left";
      const wobble = Math.sin(floor * 1.71) * w * .035;
      const width = w * (.275 + (floor % 3) * .012);
      const baseX = side === "right" ? w * .44 : w * .27;

      this.platforms.push({
        floor,
        x: clamp(baseX + wobble, 14 * dpr, w - width - 14 * dpr),
        worldY: -floor * step,
        w: width,
        h: ph,
        goal: floor === target
      });
    }
  }

  resetPlatformPlayerToFloor(floor = 0) {
    const dpr = this.dpr;
    const targetFloor = clamp(floor, 0, this.platforms.length - 1);
    const platform = this.platforms.find((entry) => entry.floor === targetFloor) ?? this.platforms[0];
    const radius = this.player.radius * dpr;

    this.player.x = platform.x + platform.w / 2;
    this.player.worldY = platform.worldY - radius;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.onGround = true;
    this.player.lastGroundedAt = performance.now();
    this.player.lastPlatformFloor = platform.floor;

    const desiredCamera = Math.min(
      this.platformInitialCameraY,
      this.player.worldY - this.canvas.height * .60
    );
    this.platformCameraY = desiredCamera;
    this.player.y = this.player.worldY - this.platformCameraY;
  }

  updatePlatformPlayer(dt, now) {
    const dpr = this.dpr;
    const p = this.player;
    const left = this.keys.has("arrowleft") || this.keys.has("a");
    const right = this.keys.has("arrowright") || this.keys.has("d");
    const dir = (right ? 1 : 0) - (left ? 1 : 0);

    // This is intentionally closer to a platformer than the old "tiny hop" prototype.
    const moveSpeed = (274 + this.speedBonus) * dpr;
    const gravity = 1050 * dpr;
    const jumpSpeed = (535 + this.jumpBonus * 1.45) * dpr;
    const radius = p.radius * dpr;

    p.vx = dir * moveSpeed;

    const canCoyoteJump = p.onGround || (now - (p.lastGroundedAt ?? -9999) <= 105);
    if ((this.jumpQueued || this.jumpBufferUntil > now) && canCoyoteJump) {
      p.vy = -jumpSpeed;
      p.onGround = false;
      p.lastGroundedAt = -9999;
      this.jumpQueued = false;
      this.jumpBufferUntil = 0;
      this.effects.push({ type: "jump", x: p.x, worldY: p.worldY + radius, worldSpace: true, age: 0, life: 220, radius: 11 * dpr });
    }
    this.jumpQueued = false;

    const previousWorldY = p.worldY;
    p.vy += gravity * dt;
    p.x += p.vx * dt;
    p.worldY += p.vy * dt;
    p.x = clamp(p.x, radius + 5 * dpr, this.canvas.width - radius - 5 * dpr);
    p.onGround = false;

    if (p.vy >= 0) {
      const previousBottom = previousWorldY + radius;
      const currentBottom = p.worldY + radius;

      // Check higher floors first. It avoids snagging on a lower platform when two overlap in X.
      for (const platform of [...this.platforms].sort((a, b) => b.floor - a.floor)) {
        const withinX = p.x >= platform.x - radius * .22 && p.x <= platform.x + platform.w + radius * .22;
        const crossedTop = previousBottom <= platform.worldY + 2 * dpr && currentBottom >= platform.worldY;
        if (!withinX || !crossedTop) continue;

        p.worldY = platform.worldY - radius;
        p.vy = 0;
        p.onGround = true;
        p.lastGroundedAt = now;
        p.lastPlatformFloor = platform.floor;

        if (platform.floor > this.highestFloorReached) {
          this.highestFloorReached = platform.floor;
          this.effects.push({
            type: "floor",
            x: p.x,
            worldY: p.worldY,
            worldSpace: true,
            age: 0,
            life: 260,
            radius: 10 * dpr
          });
        }

        if (platform.goal && !this.goalReached) {
          this.goalReached = true;
          this.effects.push({
            type: "goal",
            x: p.x,
            worldY: p.worldY,
            worldSpace: true,
            age: 0,
            life: 620,
            radius: 28 * dpr
          });
          // Give the player a short beat to see the core, then close the chase phase.
          this.elapsed = Math.max(this.elapsed, this.durationMs - 420);
        }
        break;
      }
    }

    // Camera only moves upward. The result is a real staircase rather than six fixed shelves.
    const cameraTarget = Math.min(
      this.platformInitialCameraY,
      p.worldY - this.canvas.height * .59
    );
    const cameraEase = 1 - Math.exp(-dt * 7.5);
    this.platformCameraY += (cameraTarget - this.platformCameraY) * cameraEase;
    p.y = p.worldY - this.platformCameraY;

    // Falling no longer erases the whole climb. You lose HP and one floor of progress.
    if (p.y - radius > this.canvas.height + 30 * dpr) {
      this.platformFalls += 1;
      this.hitCount += 1;
      this.callbacks.onHit?.(9);
      this.player.invulnerableUntil = now + 700;
      const recoveryFloor = Math.max(0, (this.highestFloorReached ?? 0) - 1);
      this.resetPlatformPlayerToFloor(recoveryFloor);
    }
  }

  setSegment(progress, cuts) {
    let segment = 0;
    for (const cut of cuts) if (progress >= cut) segment += 1;
    if (segment !== this.lastSegment) { this.lastSegment = segment; this.spawnClock = 9999; this.auxClock = 9999; }
    return segment;
  }

  runPattern() {
    if (this.patternSet === "zetton_guard") return this.runZettonPattern();
    if (this.patternSet === "gatanothor_boss") return this.runGatanothorPattern();
    if (this.patternSet === "melba_platform") return this.runMelbaPattern();
    if (this.patternSet === "chaos_lidorias") return this.runChaosLidoriasPattern();
    if (this.patternSet === "chaos_ultraman_cosmos") return this.runChaosUltramanPattern();
    if (this.patternSet === "chaos_darkness_cosmos") return this.runChaosDarknessPattern();
    if (this.patternSet === "kyrieloid_prophecy") return this.runKirieloidPattern();
    if (this.patternSet === "leo_giras") return this.runLeoGirasPattern();
    if (this.patternSet === "leo_giras_rework") return this.runLeoGirasReworkPattern();
    if (this.patternSet === "leo_pressure") return this.runPressurePattern();
    if (this.patternSet === "leo_black_end") return this.runBlackEndPattern();
    if (this.patternSet === "pedoleon_nexus") return this.runPedoleonPattern();
    if (this.patternSet === "mephisto_one_nexus") return this.runMephistoOnePattern();
    if (this.patternSet === "mephisto_zwei_nexus") return this.runMephistoZweiPattern();
    if (this.patternSet === "dark_zagi_nexus") return this.runDarkZagiPattern();
    if (this.patternSet === "thunder_darambia") return this.runThunderDarambiaPattern();
    if (this.patternSet === "super_grand_king") return this.runSuperGrandKingPattern();
    if (this.patternSet === "dark_lugiel_future") return this.runDarkLugielFuturePattern();
    if (this.patternSet === "ginga_dark_brothers") return this.runDarkUltraBrothersPattern();
    if (this.patternSet === "dark_lugiel") return this.runDarkLugielPattern();
    if (this.patternSet === "original_zetton") return this.runOriginalZettonPattern();
    if (this.patternSet === "original_greeza") return this.runOriginalGreezaPattern();
    if (this.patternSet === "original_grand_king") return this.runOriginalGrandKingPattern();
    if (this.patternSet === "original_five_king") return this.runOriginalFiveKingPattern();
    if (this.patternSet === "original_belial_galaxy") return this.runBelialGalaxyPattern();
    if (this.patternSet === "original_belial_abyss") return this.runBelialAbyssPattern();
    if (this.patternSet === "original_belial_final") return this.runBelialFinalClashPattern();
    if (this.patternSet === "original_belial") return this.runOriginalBelialPattern();
    return this.runGolzaPattern();
  }

  originalBreakableTypes() {
    return new Set(["originalOrb", "originalNode"]);
  }

  resolveOriginalAction(now) {
    if (this.belialFinalClashMode) {
      this.belialClashHeld = true;
      return true;
    }
    if (now < (this.originalActionCooldownUntil ?? 0)) return false;
    if (this.belialFlightMode) {
      if (now - (this.belialFlightShotAt ?? 0) < 150) return false;
      this.belialFlightShotAt = now;
      const d=this.dpr;
      this.addBullet({type:"belialFriendlyShot",x:this.player.x,y:this.player.y-10*d,vx:0,vy:-520*d,r:4.2*d,damage:0,life:1500,friendly:true});
      this.effects.push({type:"originalShot",x:this.player.x,y:this.player.y,age:0,life:180,radius:18*d});
      return true;
    }
    const scythe=this.bullets.find((b)=>!b.dead&&b.type==="belialScytheGuard"&&b.delay<=0&&!b.blocked&&b.activeAge>=(b.guardStart??0)&&b.activeAge<=(b.guardEnd??b.life));
    if(scythe){
      scythe.blocked=true;
      scythe.dead=true;
      this.originalCounters=(this.originalCounters??0)+1;
      this.effects.push({type:"originalParryHit",x:this.player.x,y:this.player.y,age:0,life:460,radius:38*this.dpr,label:"BLOCK"});
      this.callbacks.onBelialGuard?.({kind:"scythe"});
      this.originalActionCooldownUntil=now+320;
      return true;
    }
    const control = this.originalControl ?? "guard";
    const dpr = this.dpr;
    let dx = 0, dy = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) dy -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dy += 1;

    if (control === "dash") {
      if (!dx && !dy) dy = -1;
      const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      const dist = 78 * dpr, pad = 16 * dpr;
      const sx = this.player.x, sy = this.player.y;
      this.player.x = clamp(sx + dx * dist, pad, this.canvas.width - pad);
      this.player.y = clamp(sy + dy * dist, pad, this.canvas.height - pad);
      this.player.invulnerableUntil = now + 265;
      this.originalActionCooldownUntil = now + 620;
      this.effects.push({type:"originalDash",x:this.player.x,y:this.player.y,age:0,life:330,radius:44*dpr,label:"SHIFT"});
      return true;
    }

    if (control === "shot") {
      if (now - (this.originalLastShotAt ?? 0) < 230) return false;
      this.originalLastShotAt = now;
      this.originalActionCooldownUntil = now + 210;
      this.addBullet({type:"originalFriendlyShot",x:this.player.x,y:this.player.y-12*dpr,vx:0,vy:-430*dpr,r:4.5*dpr,damage:0,life:1600,friendly:true});
      this.effects.push({type:"originalShot",x:this.player.x,y:this.player.y,age:0,life:220,radius:20*dpr});
      return true;
    }

    if (control === "parry") {
      this.originalParryQueuedUntil = now + 205;
      this.originalActionCooldownUntil = now + 360;
      this.effects.push({type:"originalParry",x:this.player.x,y:this.player.y,age:0,life:250,radius:48*dpr,label:"PARRY"});
      return true;
    }

    const ultimate = control === "ultimate";
    const purify = control === "purify";
    const breaker = control === "breaker" || purify || ultimate;
    if (breaker) {
      const radius = (ultimate ? 118 : purify ? 91 : 70) * dpr;
      const limit = ultimate ? 8 : purify ? 4 : 3;
      const targets = this.bullets
        .filter((b)=>!b.dead && b.delay<=0 && b.originalBreakable)
        .map((b)=>({b,dist:Math.hypot(b.x-this.player.x,b.y-this.player.y)}))
        .filter((x)=>x.dist<=radius)
        .sort((a,b)=>a.dist-b.dist)
        .slice(0,limit);
      for (const {b} of targets) {
        b.dead = true;
        this.originalBreaks += 1;
        this.effects.push({type:"originalBreak",x:b.x,y:b.y,age:0,life:360,radius:21*dpr,label:purify?"PURIFY":"BREAK"});
      }
      if (targets.length) this.callbacks.onOriginalBreak?.({count:targets.length,armor:ultimate?10:purify?7:5,domination:ultimate?8:5,adapt:ultimate?3:1.5});
      if (ultimate) this.player.invulnerableUntil = now + 250;
      this.originalActionCooldownUntil = now + (ultimate ? 760 : purify ? 570 : 520);
      this.effects.push({type:ultimate?"originalUltimate":"originalPulse",x:this.player.x,y:this.player.y,age:0,life:380,radius});
      return true;
    }

    // Balanced/guard form: a deliberately short pulse, not a full shield.
    this.player.invulnerableUntil = now + 245;
    this.originalActionCooldownUntil = now + 540;
    this.effects.push({type:"originalGuard",x:this.player.x,y:this.player.y,age:0,life:300,radius:42*dpr,label:"GUARD"});
    return true;
  }

  originalModuleAlive(key) {
    if (!this.originalModules) return true;
    return (this.originalModules[key]?.hp ?? 0) > 0;
  }

  spawnOriginalOrb({count=5,source="generic",breakable=true,damage=9,speed=175,spread=1.2,fromTop=true,homing=false}={}) {
    const d=this.dpr;
    const origin = fromTop
      ? {x:this.canvas.width*(.18+Math.random()*.64),y:-18*d}
      : {x:Math.random()>.5?-18*d:this.canvas.width+18*d,y:this.canvas.height*(.18+Math.random()*.62)};
    const base=Math.atan2(this.player.y-origin.y,this.player.x-origin.x);
    for(let i=0;i<count;i++){
      const a=base+(i-(count-1)/2)*(spread/Math.max(1,count-1));
      const sp=(speed+this.intensity*16)*d;
      this.addBullet({type:"originalOrb",source,x:origin.x,y:origin.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:(source==="belial"?7:6)*d,damage,originalBreakable:breakable,homing:homing?.55:0,delay:i*55});
    }
  }

  spawnOriginalCardinalBurst(source="zetton", count=4, hard=false) {
    const d=this.dpr;
    const side=["left","right","top","bottom"][Math.floor(Math.random()*4)];
    const speed=(hard?238:186)*d;
    for(let i=0;i<count;i++){
      const t=(i+1)/(count+1);
      let x,y,vx,vy;
      if(side==="left"||side==="right"){
        x=side==="left"?-16*d:this.canvas.width+16*d;
        y=this.canvas.height*(.14+t*.72);
        const a=Math.atan2(this.player.y-y,this.player.x-x)+(i-(count-1)/2)*.025;
        vx=Math.cos(a)*speed;vy=Math.sin(a)*speed;
      }else{
        x=this.canvas.width*(.12+t*.76);
        y=side==="top"?-16*d:this.canvas.height+16*d;
        const a=Math.atan2(this.player.y-y,this.player.x-x)+(i-(count-1)/2)*.025;
        vx=Math.cos(a)*speed;vy=Math.sin(a)*speed;
      }
      this.addBullet({type:"originalOrb",source,x,y,vx,vy,r:(hard?7:6)*d,damage:hard?12:9,delay:i*62,originalBreakable:false});
    }
  }

  originalBossPose(pose, duration = 620) {
    this.callbacks.onOriginalPose?.({ pose, duration });
  }

  originalCue(key, atMs, callback) {
    if (this.elapsed < atMs) return false;
    if (!this.originalPatternFired) this.originalPatternFired = new Set();
    if (this.originalPatternFired.has(key)) return false;
    this.originalPatternFired.add(key);
    callback?.();
    return true;
  }

  oppositeSide(side) {
    return { up:"down", down:"up", left:"right", right:"left" }[side] ?? side;
  }

  spawnOriginalRush(source="generic",hard=false) {
    if(source.includes("hyper")) this.originalBossPose("hyper-teleport",520);
    else if(source.includes("belial-monster-army")) this.originalBossPose("belial-command",560);
    else if(source.includes("belial")) this.originalBossPose("belial-thrust",620);
    else if(source.includes("melba")) this.originalBossPose("five-melba",560);
    else if(source.includes("grand-king")) this.originalBossPose("grand-rush",620);
    else if(source.includes("greeza")) this.originalBossPose("greeza-warp",500);
    const d=this.dpr,fromLeft=Math.random()>.5,y=this.canvas.height*(.24+Math.random()*.52);
    this.addBullet({type:"originalRush",source,x:fromLeft?-30*d:this.canvas.width+30*d,y,vx:(fromLeft?1:-1)*(hard?390:330)*d,vy:0,r:(hard?20:17)*d,damage:hard?17:14,delay:(hard?560:720)*this.telegraphScale,telegraphY:y});
  }

  spawnOriginalWall(source="generic",hard=false) {
    const d=this.dpr,horizontal=Math.random()>.5;
    const span=horizontal?this.canvas.height:this.canvas.width;
    const gap=span*(.28+Math.random()*.44);
    this.addBullet({type:"chaosPanel",originalSource:source,orientation:horizontal?"vertical":"horizontal",gap,width:(hard?68:86)*d,thickness:(hard?31:26)*d,delay:(hard?720:880)*this.telegraphScale,life:880,damage:hard?15:12});
  }

  spawnOriginalSweep(source="generic",hard=false) {
    if(source.includes("belial")) this.originalBossPose("belial-scythe",650);
    else if(source.includes("grand")) this.originalBossPose("grand-cannon",620);
    else if(source.includes("cov")) this.originalBossPose("five-cov",580);
    else if(source.includes("greeza")) this.originalBossPose("greeza-backbeam",560);
    else if(source.includes("hyper")) this.originalBossPose("hyper-barrier",560);
    const d=this.dpr;
    const y1=this.canvas.height*(.18+Math.random()*.64), y2=this.canvas.height*(.18+Math.random()*.64);
    this.addBullet({type:"zagiSweep",originalSource:source,x1:0,y1,x2:this.canvas.width,y2,width:(hard?29:23)*d,delay:(hard?690:850)*this.telegraphScale,life:500,damage:hard?16:13});
  }

  spawnBelialBattlenizerSweep(colorMode="blue", hard=false, orientation=null) {
    this.originalBossPose(colorMode==="blue"?"belial-sweep-blue":"belial-sweep-orange",760);
    const d=this.dpr;
    const orient=orientation ?? (Math.random()>.36?"horizontal":"vertical");
    const side=Math.random()>.5?"start":"end";
    this.addBullet({
      type:"belialBattlenizerSweep",
      colorMode,
      orientation:orient,
      side,
      width:(hard?30:25)*d,
      delay:(hard?740:920)*this.telegraphScale,
      life:hard?760:900,
      damage:hard?18:15
    });
  }

  spawnGrandKingAdvance() {
    if (this.grandAdvanceSpawned) return;
    this.grandAdvanceSpawned = true;
    this.originalBossPose("grand-step", 760);
    const phase = this.bossPhase ?? 0;
    const targetRatio = phase >= 2 ? .34 : phase === 1 ? .27 : .20;
    this.addBullet({
      type:"grandKingAdvance",
      delay:420*this.telegraphScale,
      life:Math.max(4200, (this.durationMs ?? 9000) - 600),
      startY:-18*this.dpr,
      targetY:this.canvas.height*targetRatio,
      damage:0
    });
  }


  spawnGrandSensorSequence({ hard=false, rewind=false, variant=0 }={}) {
    this.originalCue(`grand-sensor-pose-${variant}`, 0, () => this.originalBossPose("grand-sensor", 980));
    const colors = variant % 2 === 0
      ? ["blue","orange","blue","blue","orange","orange","blue","orange","blue","orange","orange","blue","orange","blue"]
      : ["orange","blue","orange","orange","blue","orange","blue","blue","orange","blue","orange","orange","blue","orange"];
    // v2.5.8: keep the sensor barrage dense, but stop consecutive colour checks from
    // arriving almost on top of each other. The round itself is extended by Runtime.
    const interval = hard ? 600 : 700;
    const rewindInterval = hard ? 560 : 640;
    const count = rewind ? (hard ? 9 : 8) : (hard ? 14 : 12);
    const addSensor=(key,at,color,direction=1)=>this.originalCue(key,at,()=>this.addBullet({
      type:"grandSensorBeam",colorMode:color,spawnElapsed:this.elapsed,
      warmup:hard?330:410,startY:direction>0?22*this.dpr:this.canvas.height-22*this.dpr,
      sensorDirection:direction,speed:(hard?188:158)*this.dpr,
      thickness:(hard?13:11)*this.dpr,tubeW:(hard?31:28)*this.dpr,
      life:hard?4100:4700,damage:hard?16:13,hitDown:false,hitUp:false
    }));
    for(let i=0;i<count;i++) addSensor(`grand-sensor-${variant}-${i}`,160+i*interval,colors[i%colors.length],1);
    if(rewind){
      const rewindAt=160+(count-1)*interval+(hard?1120:1260);
      this.originalCue(`grand-sensor-zero-${variant}`,rewindAt-250,()=>this.effects.push({type:"grandZeroGravity",x:this.canvas.width/2,y:this.canvas.height/2,age:0,life:650,radius:85*this.dpr,label:""}));
      for(let i=0;i<count;i++) addSensor(`grand-sensor-rewind-${variant}-${i}`,rewindAt+220+i*rewindInterval,colors[(count-1-i)%colors.length],-1);
    }
  }

  spawnGrandDebrisWave(wave=0, hard=false) {
    this.originalBossPose("grand-throw", 760);
    const d=this.dpr;
    const fromLeft = wave % 2 === 0;
    const safeScripts = hard ? [2,3,1,2,4,3,2,1,3,2] : [2,3,1,2,3,2,1,3];
    const safe = safeScripts[wave % safeScripts.length];
    const lanes = 6;
    const kinds=["rock","slab","scrap","rock","beam","slab"];
    this.addBullet({type:"grandThrowArm",side:fromLeft?"left":"right",life:760,damage:0,wave});
    for(let lane=0;lane<lanes;lane++){
      if (lane===safe || (!hard && lane===Math.max(0,Math.min(lanes-1,safe+(wave%2?1:-1))))) continue;
      const y=this.canvas.height*(.14+lane*(.72/(lanes-1)));
      const startX=fromLeft?-42*d:this.canvas.width+42*d;
      const endX=fromLeft?this.canvas.width+65*d:-65*d;
      const arc=(52+(lane%3)*18+(hard?18:0))*d;
      this.addBullet({
        type:"grandDebris",kind:kinds[(lane+wave)%kinds.length],
        startX,startY:y,endX,endY:y+(lane%2?18:-14)*d,
        controlX:this.canvas.width*(fromLeft?.45:.55),controlY:y-arc,
        x:startX,y,life:hard?1050:1220,damage:hard?15:12,
        radius:(kinds[(lane+wave)%kinds.length]==="rock"?16:kinds[(lane+wave)%kinds.length]==="slab"?20:13)*d,
        spin:(fromLeft?1:-1)*(.0028+lane*.0003)
      });
    }
  }

  spawnGrandDestructionFist(xRatio=.5, hard=false, index=0) {
    this.originalBossPose("grand-fist", 900);
    const d=this.dpr;
    const fistW=(hard?106:92)*d, fistH=(hard?132:116)*d;
    const warn=hard?390:500, fall=hard?330:430;
    const x=clamp(this.canvas.width*xRatio,fistW*.6,this.canvas.width-fistW*.6);
    this.addBullet({type:"grandFist",x,warningMs:warn,fallMs:fall,fistW,fistH,life:warn+fall+410,damage:hard?21:18,index});
    const dustDelay=warn+fall-20;
    for(const dir of [-1,1]){
      for(let layer=0;layer<3;layer++) this.addBullet({
        type:"grandDustWave",originX:x,dir,layer,
        delay:dustDelay+layer*75,life:hard?1100:1260,
        speed:(hard?245:210)*d, radius:(18+layer*3)*d,
        damage:hard?13:10
      });
    }
  }

  spawnGrandBarrageCannons(life=9000) {
    if (this.bullets.some(b=>!b.dead&&b.type==="grandBarrageCannons")) return;
    this.originalBossPose("grand-barrage", 980);
    this.addBullet({type:"grandBarrageCannons",life,damage:0});
  }

  spawnGrandBarrageWave(gapLane=4, index=0, hard=false) {
    this.spawnGrandBarrageCannons(Math.max(2600,(this.durationMs??10000)-this.elapsed+350));
    this.addBullet({
      type:"grandBarrageWave",gapLane,index,hard,
      columns:hard?34:30, gapColumns:hard?1.15:1.35,
      amplitude:(hard?27:23)*this.dpr,
      orbRadius:(hard?7.8:7.2)*this.dpr,
      phase:index*.78,
      life:hard?1020:1160,
      damage:hard?13:11
    });
  }

  grandRayToBoundary(sx,sy,tx,ty){
    const dx=tx-sx,dy=ty-sy;
    const candidates=[];
    const push=(t,edge)=>{if(t>0){const x=sx+dx*t,y=sy+dy*t;if(x>=-1&&x<=this.canvas.width+1&&y>=-1&&y<=this.canvas.height+1)candidates.push({t,x,y,edge});}};
    if(Math.abs(dx)>1e-6){push((0-sx)/dx,"left");push((this.canvas.width-sx)/dx,"right");}
    if(Math.abs(dy)>1e-6){push((0-sy)/dy,"top");push((this.canvas.height-sy)/dy,"bottom");}
    candidates.sort((a,b)=>a.t-b.t);
    return candidates[0] ?? {x:tx,y:ty,edge:"none",t:1};
  }

  spawnGrandLaserHole(xRatio=.5, yRatio=.82, hard=false, index=0) {
    this.originalBossPose("grand-laser", 860);
    const d=this.dpr;
    this.addBullet({
      type:"grandLaserHole",x:this.canvas.width*xRatio,y:this.canvas.height*yRatio,
      targetX:this.player.x,targetY:this.player.y,
      trackingMs:hard?470:570,lockMs:hard?330:410,beamMs:hard?700:620,
      life:(hard?1500:1600),width:(hard?13:11)*d,damage:hard?18:15,
      hitHalf:(hard?82:72)*d,index,locked:false,bossResolved:false
    });
  }

  spawnZettonGuardBeat(side, special = false, reverse = false) {
    // v2.5.3: reverse shots now behave like a real ricochet. The first approach is
    // always honest: guard the side the projectile actually comes from. If that
    // guard succeeds, the same yellow attack returns from the opposite side and
    // demands a second guard. Nothing is pre-flipped before the first block.
    const telegraphMs = special ? 250 : 200;
    const travelMs = special ? 360 : 410;
    this.spawnGuardProjectile(side, telegraphMs, special, {
      telegraphSide: side,
      reverse,
      fixedPattern: true,
      travelMs,
      zettonBounceBack: reverse
    });
  }

  runZettonGuardScript() {
    // Authored UNDERTALE-style defence phrases: no RNG in direction or timing.
    // The opening is readable, the middle accelerates, and the closing eight beats
    // deliberately pressure rapid direction changes without ever landing two impacts
    // on the same frame.
    const variant = (this.originalTurn - 1) % 4;
    const scripts = [
      [
        [180,"up",0,0],[720,"right",0,0],[1210,"down",0,0],[1670,"left",0,0],
        [2100,"up",1,0],[2510,"right",0,0],[2900,"down",0,1],[3270,"left",0,0],
        [3630,"right",0,0],[3980,"up",0,1],[4320,"left",1,0],[4650,"down",0,0],
        [4970,"right",0,1],[5280,"left",0,0],[5580,"up",0,0],[5870,"down",1,0],
        [6150,"right",0,0],[6420,"up",0,1],[6680,"left",0,0],[6940,"down",1,0],[7200,"right",0,1],[7460,"left",0,0],[7720,"up",1,0],[7980,"down",0,0]
      ],
      [
        [180,"left",0,0],[700,"up",0,0],[1180,"right",0,1],[1640,"down",0,0],
        [2070,"left",1,0],[2480,"down",0,0],[2870,"up",0,1],[3240,"right",0,0],
        [3600,"down",0,1],[3950,"left",0,0],[4290,"right",1,0],[4620,"up",0,0],
        [4940,"left",0,1],[5250,"down",0,0],[5550,"right",0,0],[5840,"up",1,0],
        [6120,"down",0,1],[6390,"left",0,0],[6650,"up",0,0],[6910,"right",1,0],[7170,"down",0,0],[7430,"up",0,1],[7690,"left",1,0],[7950,"right",0,0]
      ],
      [
        [180,"down",0,0],[710,"left",0,0],[1200,"up",0,0],[1660,"right",0,1],
        [2090,"down",1,0],[2500,"up",0,0],[2890,"left",0,1],[3260,"right",0,0],
        [3620,"up",0,1],[3970,"down",0,0],[4310,"left",1,0],[4640,"right",0,0],
        [4960,"down",0,1],[5270,"up",0,0],[5570,"right",0,0],[5860,"left",1,0],
        [6140,"up",0,0],[6410,"right",0,1],[6670,"down",0,0],[6930,"left",1,0],[7190,"up",0,1],[7450,"down",0,0],[7710,"right",1,0],[7970,"left",0,0]
      ],
      [
        [180,"right",0,0],[710,"down",0,0],[1200,"left",0,1],[1660,"up",0,0],
        [2090,"right",1,0],[2500,"left",0,0],[2890,"down",0,1],[3260,"up",0,0],
        [3620,"left",0,1],[3970,"right",0,0],[4310,"down",1,0],[4640,"up",0,0],
        [4960,"right",0,1],[5270,"left",0,0],[5570,"up",0,0],[5860,"down",1,0],
        [6140,"left",0,0],[6410,"up",0,1],[6670,"right",0,0],[6930,"down",1,0],[7190,"left",0,1],[7450,"right",0,0],[7710,"up",1,0],[7970,"down",0,0]
      ]
    ];
    let ricochetPadding = 0;
    scripts[variant].forEach(([at,side,special,reverse], i) => {
      const authoredAt = at + ricochetPadding;
      this.originalCue(`zetton-guard-${variant}-${i}`, authoredAt, () => {
        this.originalBossPose(special ? "zetton-fireball" : reverse ? "zetton-feint" : "zetton-guard", special ? 620 : 430);
        this.spawnZettonGuardBeat(side, !!special, !!reverse);
      });
      // A successful reverse shot adds a second input about 0.31 s after the first.
      // Push later authored beats back enough that the return can never collide with
      // the next required direction. The timeline stays deterministic and no RNG can
      // manufacture an impossible double-hit.
      if (reverse) ricochetPadding += 360;
    });
  }

  spawnZettonBlinkStrike({ orientation="horizontal", lane=.5, side="start", hard=false, hyper=false, delay=520, aimed=false } = {}) {
    const d=this.dpr;
    const horizontal=orientation==="horizontal";
    const arenaSpan=horizontal?this.canvas.height:this.canvas.width;
    const playerAxis=horizontal?this.player.y:this.player.x;
    // Free-movement Zetton rushes now snapshot the player's current axis. The old
    // authored lane ratios could leave a dramatic-looking yellow transit line safely
    // parked through the middle of the arena while the player idled in a corner.
    const lanePx=aimed
      ? clamp(playerAxis,arenaSpan*.10,arenaSpan*.90)
      : arenaSpan*lane;
    // A teleport charge should cross the box like a strike, not like a slow vehicle.
    const speed=(hyper?(hard?920:840):(hard?980:900))*d;
    const margin=34*d;
    let x,y,vx,vy;
    if(horizontal){
      x=side==="start"?-margin:this.canvas.width+margin; y=lanePx; vx=(side==="start"?1:-1)*speed; vy=0;
    }else{
      x=lanePx; y=side==="start"?-margin:this.canvas.height+margin; vx=0; vy=(side==="start"?1:-1)*speed;
    }
    this.originalBossPose(hyper?"hyper-teleport":"zetton-teleport",520);
    this.addBullet({
      type:"zettonBlinkStrike",x,y,vx,vy,r:(hyper?19:17)*d,damage:hyper?16:13,
      delay:delay*this.telegraphScale,life:1800,orientation,lane:lanePx,side,hyper,aimed,
      telegraphWindow:delay*this.telegraphScale
    });
  }

  spawnZettonFireballLock({ hard=false, delay=590 } = {}) {
    const d=this.dpr,pad=54*d;
    const x=clamp(this.player.x,pad,this.canvas.width-pad),y=clamp(this.player.y,pad,this.canvas.height-pad);
    this.originalBossPose("zetton-fireball",580);
    this.addBullet({type:"zettonFireballBurst",x,y,radius:(hard?50:44)*d,delay:delay*this.telegraphScale,life:380,damage:hard?16:13,telegraphWindow:delay*this.telegraphScale});
  }

  runZettonMobilityScript() {
    // The free-movement phrase is now a pursuit rather than a set of decorative lanes.
    // Each yellow teleport line snapshots the player's current row/column, then the next
    // rush comes from the perpendicular axis.  The timing remains fully authored: no RNG
    // can stack an impossible pair, but idling in a corner is no longer a solution.
    const variant=(this.originalTurn-1)%3;
    const scripts=[
      [
        [260,"rush","horizontal","start"],[720,"rush","vertical","end"],[1190,"fire"],
        [1660,"rush","vertical","start"],[2110,"rush","horizontal","end"],[2570,"fire"],
        [3030,"rush","horizontal","end"],[3480,"rush","vertical","start"],[3930,"fire"],
        [4380,"rush","vertical","end"],[4830,"rush","horizontal","start"],[5280,"fire"],
        [5730,"rush","horizontal","start"],[6180,"rush","vertical","end"],[6630,"fire"],
        [7080,"rush","vertical","start"],[7530,"rush","horizontal","end"],[7980,"fire"],
        [8430,"rush","horizontal","end"],[8880,"rush","vertical","start"],[9330,"fire"]
      ],
      [
        [260,"rush","vertical","start"],[720,"rush","horizontal","start"],[1190,"fire"],
        [1660,"rush","horizontal","end"],[2110,"rush","vertical","end"],[2570,"fire"],
        [3030,"rush","vertical","end"],[3480,"rush","horizontal","start"],[3930,"fire"],
        [4380,"rush","horizontal","end"],[4830,"rush","vertical","start"],[5280,"fire"],
        [5730,"rush","vertical","start"],[6180,"rush","horizontal","end"],[6630,"fire"],
        [7080,"rush","horizontal","start"],[7530,"rush","vertical","end"],[7980,"fire"],
        [8430,"rush","vertical","end"],[8880,"rush","horizontal","start"],[9330,"fire"]
      ],
      [
        [260,"rush","horizontal","end"],[720,"rush","vertical","start"],[1190,"fire"],
        [1660,"rush","vertical","end"],[2110,"rush","horizontal","start"],[2570,"fire"],
        [3030,"rush","horizontal","start"],[3480,"rush","vertical","end"],[3930,"fire"],
        [4380,"rush","vertical","start"],[4830,"rush","horizontal","end"],[5280,"fire"],
        [5730,"rush","horizontal","end"],[6180,"rush","vertical","start"],[6630,"fire"],
        [7080,"rush","vertical","end"],[7530,"rush","horizontal","start"],[7980,"fire"],
        [8430,"rush","horizontal","start"],[8880,"rush","vertical","end"],[9330,"fire"]
      ]
    ];
    scripts[variant].forEach(([at,type,orientation,side],i)=>this.originalCue(`zetton-free-${variant}-${i}`,at,()=>{
      if(type==="rush") this.spawnZettonBlinkStrike({orientation,side,hard:i>=9,delay:i>=12?360:410,aimed:true});
      else this.spawnZettonFireballLock({hard:i>=9,delay:i>=12?470:540});
    }));
  }

  spawnHyperAfterimageAttack(index=0, hard=false) {
    const variants=[
      {orientation:"horizontal",lane:.23,side:"start"},{orientation:"vertical",lane:.76,side:"end"},
      {orientation:"horizontal",lane:.71,side:"end"},{orientation:"vertical",lane:.29,side:"start"},
      {orientation:"horizontal",lane:.48,side:"start"},{orientation:"vertical",lane:.54,side:"end"},
      {orientation:"horizontal",lane:.81,side:"start"},{orientation:"vertical",lane:.18,side:"end"}
    ];
    const v=variants[(index+(this.originalTurn%variants.length))%variants.length];
    this.spawnZettonBlinkStrike({...v,hard,hyper:true,delay:hard?390:450});
  }

  runHyperZettonScript() {
    // Hyper Zetton keeps three recognizable attack languages, but each is now a boss
    // phrase rather than six isolated hazards.  Timings remain authored and repeatable.
    const style=(this.originalTurn-1)%3;
    if(style===0){
      [260,900,1510,2100,2680,3250,3810,4360,4900,5430,5950,6460,6960,7440,7900,8350].forEach((at,i)=>
        this.originalCue(`hyper-after-${i}`,at,()=>this.spawnHyperAfterimageAttack(i,i>=5))
      );
    }else if(style===1){
      [260,980,1680,2360,3020,3660,4290,4910,5520,6120,6710,7290,7810,8320,8820].forEach((at,i)=>
        this.originalCue(`hyper-lock-${i}`,at,()=>this.spawnZettonFireballLock({hard:i>=4,delay:i>=7?470:540}))
      );
    }else{
      const mix=[
        [260,"rush"],[820,"fire"],[1370,"rush"],[1910,"fire"],[2440,"rush"],[2960,"fire"],
        [3470,"rush"],[3970,"fire"],[4460,"rush"],[4940,"fire"],[5410,"rush"],[5870,"fire"],
        [6320,"rush"],[6760,"fire"],[7190,"rush"],[7600,"fire"],[8000,"rush"],[8390,"fire"],[8770,"rush"]
      ];
      mix.forEach(([at,type],i)=>this.originalCue(`hyper-mix-${i}`,at,()=>
        type==="rush"?this.spawnHyperAfterimageAttack(i,true):this.spawnZettonFireballLock({hard:true,delay:i>=8?450:520})
      ));
    }
    if(this.originalZettonBeamStored){
      this.originalCue("hyper-return",8050,()=>{
        const horizontal=(this.originalTurn%2)===0;
        const center=horizontal?this.canvas.height*.5:this.canvas.width*.5;
        this.originalBossPose("hyper-barrier",700);
        this.addBullet({type:"zettonReturnBeam",orientation:horizontal?"horizontal":"vertical",center,width:58*this.dpr,delay:650*this.telegraphScale,life:520,damage:18,telegraphWindow:650*this.telegraphScale});
      });
    }
  }

  runOriginalZettonPattern() {
    if(this.bossPhase===0){
      if(this.mode==="guard") this.runZettonGuardScript();
      else this.runZettonMobilityScript();
      return;
    }
    this.runHyperZettonScript();
  }

  spawnGreezaThunder({ hard=false, delay=660, x=null, y=null, radius=null, aimed=false } = {}) {
    const d=this.dpr,pad=52*d;
    const jitter=(hard?76:96)*d;
    const px=x??(aimed?clamp(this.player.x+(Math.random()-.5)*jitter,pad,this.canvas.width-pad):(pad+Math.random()*(this.canvas.width-pad*2)));
    const py=y??(aimed?clamp(this.player.y+(Math.random()-.5)*jitter*.65,pad,this.canvas.height-pad):(pad+Math.random()*(this.canvas.height-pad*2)));
    this.originalBossPose(hard?"greeza-dark-lightning":"greeza-lightning",500);
    this.addBullet({type:"greezaThunderSmash",x:px,y:py,radius:(radius??(hard?45:37))*d,delay:delay*this.telegraphScale,life:300,damage:hard?16:11,hard,telegraphWindow:delay*this.telegraphScale});
  }

  spawnGreezaVortexField(variant=0) {
    const d=this.dpr;
    // Six vortices with large, different Lissajous paths.  The old 18px local wobble
    // looked completely static on a desktop arena; these now cross meaningful portions
    // of the box and force continuous repositioning.
    const layouts=[
      [[.20,.27,.17,.19,1,0],[.47,.24,.20,.14,-1,1.3],[.77,.30,.16,.20,1,2.1],[.28,.66,.19,.17,-1,2.8],[.58,.69,.22,.15,1,3.7],[.79,.68,.15,.18,-1,4.4]],
      [[.18,.50,.19,.24,-1,.5],[.39,.27,.21,.15,1,1.6],[.68,.25,.18,.18,-1,2.6],[.82,.52,.17,.23,1,3.4],[.58,.72,.22,.16,-1,4.2],[.27,.75,.18,.17,1,5.1]],
      [[.21,.28,.20,.17,1,.8],[.51,.21,.23,.14,-1,1.9],[.79,.34,.17,.21,1,2.8],[.75,.70,.20,.18,-1,3.8],[.44,.73,.24,.14,1,4.7],[.20,.61,.18,.22,-1,5.5]]
    ];
    layouts[variant%layouts.length].forEach(([xr,yr,ax,ay,dir,phase],i)=>{
      this.addBullet({
        type:"greezaVortex",baseX:this.canvas.width*xr,baseY:this.canvas.height*yr,x:this.canvas.width*xr,y:this.canvas.height*yr,
        radius:(i%2?29:31)*d,ampX:this.canvas.width*ax,ampY:this.canvas.height*ay,dir,phase,
        angularSpeed:(1.05+i*.09)*(i%2?-1:1),delay:(300+i*170)*this.telegraphScale,life:9000,damage:12,telegraphWindow:(300+i*170)*this.telegraphScale
      });
    });
  }

  spawnGreezaSoundSequence(variant=0) {
    const d=this.dpr,cx=this.canvas.width/2,cy=this.canvas.height/2;
    this.originalCue(`greeza-sound-core-${variant}`,120,()=>this.addBullet({type:"greezaSoundCore",x:cx,y:cy,delay:140*this.telegraphScale,life:9400,damage:0,telegraphWindow:140*this.telegraphScale}));
    const scripts=[
      ["blue","orange","blue","orange","orange","blue","blue","orange","blue","orange","blue","orange"],
      ["orange","blue","orange","blue","blue","orange","orange","blue","orange","blue","orange","blue"],
      ["blue","orange","orange","blue","orange","blue","orange","blue","blue","orange","blue","orange"]
    ][variant%3];
    const times=[360,1120,1860,2580,3280,3970,4650,5320,5980,6630,7270,7900];
    scripts.forEach((color,i)=>this.originalCue(`greeza-sound-${variant}-${i}`,times[i],()=>{
      this.addBullet({type:"greezaSoundWave",x:cx,y:cy,colorMode:color,startRadius:22*d,endRadius:Math.hypot(this.canvas.width,this.canvas.height)*.67,width:13*d,delay:(i<3?560:480)*this.telegraphScale,life:900,damage:13,telegraphWindow:(i<3?560:480)*this.telegraphScale});
    }));
  }

  spawnGreezaDarkLightningSequence(variant=0) {
    const base=[[.18,.26],[.46,.24],[.76,.29],[.26,.55],[.62,.52],[.82,.69],[.43,.75],[.18,.70],[.70,.76],[.52,.34],[.32,.40],[.78,.46]];
    const times=[260,980,1680,2360,3020,3660,4280,4890,5490,6080,6660,7230];
    times.forEach((at,i)=>this.originalCue(`greeza-dark-thunder-${variant}-${i}`,at,()=>{
      const pos=base[(i+variant)%base.length];
      this.spawnGreezaThunder({hard:true,delay:i>=4?520:600,x:this.canvas.width*pos[0],y:this.canvas.height*pos[1],radius:i>=6?47:43,aimed:i%3===1});
      // Late chains add pressure but the second marker is staggered by a full reaction beat.
      if(i>=5 && i%2===1){
        const pos2=base[(i+variant+4)%base.length];
        this.addBullet({type:"greezaThunderSmash",x:this.canvas.width*pos2[0],y:this.canvas.height*pos2[1],radius:40*this.dpr,delay:850*this.telegraphScale,life:300,damage:14,hard:true,telegraphWindow:850*this.telegraphScale});
      }
    }));
  }

  greezaHelixFrame(bullet, ageMs=0) {
    const angle=(bullet.angle ?? (bullet.orientation==="vertical"?Math.PI/2:0)) + (bullet.rotationSpeed??0)*(ageMs/1000);
    const ux=Math.cos(angle),uy=Math.sin(angle),nx=-uy,ny=ux;
    return {
      cx:bullet.centerX??this.canvas.width/2, cy:bullet.centerY??this.canvas.height/2,
      ux,uy,nx,ny,angle,halfLength:bullet.halfLength??Math.hypot(this.canvas.width,this.canvas.height)*.62
    };
  }

  greezaHelixPoint(bullet, frame, s, strand=0, ageMs=0) {
    const wavePhase=(bullet.phase??0)+(bullet.waveSpeed??1.45)*(ageMs/1000)+strand*Math.PI;
    const offset=Math.sin(s*(Math.PI*2)/bullet.wavelength+wavePhase)*bullet.amplitude;
    return {x:frame.cx+frame.ux*s+frame.nx*offset,y:frame.cy+frame.uy*s+frame.ny*offset};
  }

  spawnGreezaHelix({ orientation="horizontal", angle=null, delay=520, hard=false, phase=0, rotationSpeed=0, life=null, widthScale=1 } = {}) {
    const d=this.dpr;
    const resolvedAngle=angle ?? (orientation==="vertical"?Math.PI/2:0);
    this.originalBossPose("greeza-double-spiral",620);
    this.addBullet({
      type:"greezaHelix",orientation,angle:resolvedAngle,centerX:this.canvas.width/2,centerY:this.canvas.height/2,
      halfLength:Math.hypot(this.canvas.width,this.canvas.height)*.64,
      amplitude:(hard?70:58)*d,wavelength:(hard?126:146)*d,width:(hard?10:8.5)*d*widthScale,
      phase,rotationSpeed,waveSpeed:hard?1.78:1.52,delay:delay*this.telegraphScale,
      life:life??(hard?1550:1650),damage:14,telegraphWindow:delay*this.telegraphScale
    });
  }

  greezaWaveEndpoint(bullet, ageMs=0) {
    const life=Math.max(1,bullet.life??1),t=clamp(ageMs/life,0,1),ease=t*t*(3-2*t);
    const tx2=Number.isFinite(bullet.targetEndX)?bullet.targetEndX:bullet.targetX;
    const ty2=Number.isFinite(bullet.targetEndY)?bullet.targetEndY:bullet.targetY;
    return {x:bullet.targetX+(tx2-bullet.targetX)*ease,y:bullet.targetY+(ty2-bullet.targetY)*ease};
  }

  spawnGreezaWaveCannon({ sourceX=null, sourceY=null, targetX=null, targetY=null, targetEndX=null, targetEndY=null, delay=430, hard=false, life=null, widthScale=1 } = {}) {
    const d=this.dpr;
    const sx=sourceX ?? this.canvas.width/2, sy=sourceY ?? -18*d;
    const tx=targetX ?? this.player.x, ty=targetY ?? (this.canvas.height+36*d);
    this.originalBossPose("greeza-wave-cannon",650);
    this.addBullet({
      type:"greezaWaveCannon",source:"greeza-wave",sourceX:sx,sourceY:sy,targetX:tx,targetY:ty,
      targetEndX:targetEndX??tx,targetEndY:targetEndY??ty,
      width:(hard?52:46)*d*widthScale,delay:delay*this.telegraphScale,life:life??(hard?560:520),damage:hard?18:15,
      telegraphWindow:delay*this.telegraphScale
    });
  }

  spawnGreezaWaveVolley(patternIndex=0, hard=false, delay=430) {
    // Final-form wave cannons now attack from different edges and sweep across a sector.
    // No corner remains a permanent bunker. Every pair is authored, and the warning
    // shows both the opening and closing ray before the sweep begins.
    const W=this.canvas.width,H=this.canvas.height,d=this.dpr;
    const patterns=[
      [
        [-.04,.25,1.04,.10,1.04,.52], [.70,-.05,.92,1.05,.52,1.05], [1.04,.88,-.04,.68,-.04,.40]
      ],
      [
        [1.04,.72,-.04,.90,-.04,.48], [.28,-.05,.08,1.05,.48,1.05], [-.04,.12,1.04,.34,1.04,.62]
      ],
      [
        [-.04,.72,1.04,.92,1.04,.55], [.76,1.05,.94,-.05,.54,-.05], [1.04,.15,-.04,.38,-.04,.70]
      ],
      [
        [1.04,.28,-.04,.08,-.04,.45], [.24,1.05,.06,-.05,.46,-.05], [-.04,.85,1.04,.62,1.04,.30]
      ],
      [
        [.50,-.05,.10,1.05,.70,1.05], [1.04,.52,-.04,.18,-.04,.78], [.06,1.05,.38,-.05,.68,-.05]
      ],
      [
        [.50,1.05,.88,-.05,.28,-.05], [-.04,.48,1.04,.82,1.04,.22], [.94,-.05,.62,1.05,.32,1.05]
      ],
      [
        [-.04,.18,1.04,.36,1.04,.78], [1.04,.82,-.04,.64,-.04,.22], [.50,-.05,.25,1.05,.75,1.05]
      ],
      [
        [.18,-.05,.42,1.05,.82,1.05], [.82,1.05,.58,-.05,.18,-.05], [-.04,.50,1.04,.20,1.04,.80]
      ]
    ];
    patterns[patternIndex%patterns.length].forEach(([sx,sy,tx,ty,ex,ey],i)=>this.spawnGreezaWaveCannon({
      sourceX:W*sx,sourceY:H*sy,targetX:W*tx,targetY:H*ty,targetEndX:W*ex,targetEndY:H*ey,
      delay:delay+(i*35),hard,life:hard?620:580,widthScale:i?0.96:1
    }));
  }

  spawnGreezaRainRow(safeLane=4, hard=false) {
    const d=this.dpr,lanes=11,sourceX=this.canvas.width/2,sourceY=-20*d;
    const safe=new Set([safeLane,Math.min(lanes-1,safeLane+1)]);
    for(let i=0;i<lanes;i++){
      if(safe.has(i)) continue;
      const targetX=this.canvas.width*(.07+.86*(i/(lanes-1)));
      const targetY=this.canvas.height+32*d;
      const a=Math.atan2(targetY-sourceY,targetX-sourceX),speed=(hard?395:360)*d;
      this.addBullet({type:"greezaRainShot",x:sourceX,y:sourceY,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:(hard?6.2:5.5)*d,damage:hard?12:10,life:1900,delay:70*this.telegraphScale,rainLane:i});
    }
    this.effects.push({type:"greezaRainMuzzle",x:sourceX,y:8*d,age:0,life:260,radius:28*d});
  }

  runOriginalGreezaPattern() {
    const phase=this.bossPhase;
    const variant=(this.originalTurn-1)%4;

    if(phase===0){
      // First form: a sustained thunderstorm.  Spatial placement still varies, but the
      // time axis is authored and later strikes increasingly snapshot the player.
      const beats=[220,880,1520,2140,2740,3320,3880,4420,4940,5440,5920,6380,6820,7250,7670];
      beats.forEach((at,i)=>this.originalCue(`greeza-first-thunder-${variant}-${i}`,at,()=>{
        this.spawnGreezaThunder({hard:i>=6,delay:i>=7?500:620,radius:i>=8?44:37,aimed:i%2===1 || i>=8});
      }));
      return;
    }

    if(phase===1){
      if(variant===0){
        this.originalCue("greeza-vortex-field",180,()=>this.spawnGreezaVortexField((this.originalTurn>>1)%3));
      }else if(variant===1){
        this.spawnGreezaSoundSequence((this.originalTurn>>1)%3);
      }else if(variant===2){
        this.spawnGreezaDarkLightningSequence((this.originalTurn>>1)%3);
      }else{
        // The double spiral is a full movement phrase now: horizontal/vertical are only
        // the opening vocabulary. It then cuts diagonally, rotates, and finishes with a
        // crossed pair. The pair is thinner and shorter-lived so there are still real
        // pockets to route through instead of an unavoidable screen wipe.
        const seq=[
          [180,0,false,0,0,1550,1.08],
          [1500,Math.PI*.30,false,1.0,0,1600,1.08],
          [2780,-Math.PI*.30,true,1.8,0,1600,1.12],
          [4060,Math.PI/2,true,2.6,0,1550,1.12],
          [5320,Math.PI*.10,true,3.2,.45,1780,1.04]
        ];
        seq.forEach(([at,angle,hard,phaseShift,rotationSpeed,life,widthScale],i)=>this.originalCue(`greeza-helix-${i}`,at,()=>this.spawnGreezaHelix({angle,hard,phase:phaseShift+(this.originalTurn%3)*.45,rotationSpeed,life,widthScale,delay:i>=2?350:420})));
        this.originalCue("greeza-helix-cross",6750,()=>{
          this.spawnGreezaHelix({angle:Math.PI/4,hard:true,phase:1.1,life:1450,widthScale:1.08,delay:340});
          this.spawnGreezaHelix({angle:-Math.PI/4,hard:true,phase:3.0,life:1450,widthScale:1.08,delay:380});
        });
        this.originalCue("greeza-helix-rotating-close",8000,()=>this.spawnGreezaHelix({angle:-Math.PI*.12,hard:true,phase:2.2,rotationSpeed:-.52,life:920,widthScale:1.04,delay:320}));
      }
      return;
    }

    // Final form alternates a multi-angle sweeping cannon barrage and a continuous chest
    // light-bullet rain.  The cannon emitters move around the arena edges, so hiding in a
    // corner cannot solve the entire phrase.
    if(variant%2===0){
      const offset=variant===0?0:4;
      const times=[180,1130,2080,3030,3980,4930,5880,6830,7780];
      times.forEach((at,i)=>this.originalCue(`greeza-wave-volley-${variant}-${i}`,at,()=>
        this.spawnGreezaWaveVolley(offset+i,i>=1,i>=3?320:370)
      ));
    }else{
      const safe=variant===1
        ? [2,3,4,5,6,7,7,6,5,4,3,2,3,4,5,6]
        : [7,6,5,4,3,2,2,3,4,5,6,7,6,5,4,3];
      safe.forEach((lane,i)=>this.originalCue(`greeza-rain-${variant}-${i}`,260+i*520,()=>this.spawnGreezaRainRow(lane,i>=7)));
    }
  }

  runOriginalGrandKingPattern() {
    const phase=this.bossPhase ?? 0;
    const turn=(this.originalTurn-1);
    if(phase===0){
      const variant=turn%4;
      if(variant===0) this.spawnGrandSensorSequence({hard:false,rewind:false,variant:turn});
      else if(variant===1){
        const beats=[180,1480,2780,4080,5380,6680,7980];
        beats.forEach((at,i)=>this.originalCue(`grand-debris-p0-${i}`,at,()=>this.spawnGrandDebrisWave(i,false)));
      }else if(variant===2){
        const xs=[.22,.68,.42,.80,.30,.58];
        xs.forEach((x,i)=>this.originalCue(`grand-fist-p0-${i}`,220+i*1420,()=>this.spawnGrandDestructionFist(x,false,i)));
      }else this.spawnGrandSensorSequence({hard:false,rewind:true,variant:turn});
      return;
    }
    if(phase===1){
      const variant=turn%5;
      if(variant===0){
        const gaps=[3,4,5,6,5,4,3,2,3,4,5,6,5,4];
        gaps.forEach((gap,i)=>this.originalCue(`grand-barrage-p1-${i}`,180+i*670,()=>this.spawnGrandBarrageWave(gap,i,false)));
      }else if(variant===1) this.spawnGrandSensorSequence({hard:true,rewind:false,variant:turn});
      else if(variant===2){
        const beats=[180,1160,2140,3120,4100,5080,6060,7040,8020,9000];
        beats.forEach((at,i)=>this.originalCue(`grand-debris-p1-${i}`,at,()=>this.spawnGrandDebrisWave(i,true)));
      }else if(variant===3){
        const xs=[.18,.53,.82,.34,.70,.24,.60];
        xs.forEach((x,i)=>this.originalCue(`grand-fist-p1-${i}`,180+i*1320,()=>this.spawnGrandDestructionFist(x,true,i)));
      }else{
        const gaps=[2,3,4,5,6,7,6,5,4,3,2,3,4,5,6];
        gaps.forEach((gap,i)=>this.originalCue(`grand-barrage-p1b-${i}`,160+i*625,()=>this.spawnGrandBarrageWave(gap,i,true)));
      }
      return;
    }
    const variant=turn%5;
    if(variant===0 || variant===4){
      const holes=[[.18,.84],[.82,.84],[.32,.76],[.68,.76],[.50,.86],[.24,.70],[.76,.70]];
      holes.forEach(([x,y],i)=>this.originalCue(`grand-laser-${variant}-${i}`,180+i*1280,()=>this.spawnGrandLaserHole(x,y,true,i)));
    }else if(variant===1){
      const gaps=[2,3,4,5,6,7,6,5,4,3,2,3,4,5,6,7,6];
      gaps.forEach((gap,i)=>this.originalCue(`grand-barrage-p2-${i}`,140+i*555,()=>this.spawnGrandBarrageWave(gap,i,true)));
    }else if(variant===2) this.spawnGrandSensorSequence({hard:true,rewind:true,variant:turn});
    else{
      const xs=[.16,.48,.80,.30,.67,.20,.55,.84];
      xs.forEach((x,i)=>this.originalCue(`grand-fist-p2-${i}`,160+i*1160,()=>this.spawnGrandDestructionFist(x,true,i)));
    }
  }

  distancePointToSegment(px,py,x1,y1,x2,y2) {
    const vx=x2-x1, vy=y2-y1, len2=vx*vx+vy*vy || 1;
    const t=clamp(((px-x1)*vx+(py-y1)*vy)/len2,0,1);
    const x=x1+vx*t, y=y1+vy*t;
    return Math.hypot(px-x,py-y);
  }

  fiveKingBoostLevel() {
    if (!this.originalModules) return 0;
    const alive=["golza","melba","ganq","reicubas","cov"].filter(k=>this.originalModuleAlive(k)).length;
    return clamp(5-alive,0,4);
  }

  fiveSonicCoordinate(bullet, coord, activeAge) {
    const warning=bullet.warningMs??420;
    const raw=Math.max(0,activeAge-warning)/1000;
    let t=raw;
    if(Number.isFinite(bullet.reflectAt) && activeAge>bullet.reflectAt){
      const pivot=Math.max(0,bullet.reflectAt-warning)/1000;
      t=pivot-(activeAge-bullet.reflectAt)/1000;
    }
    const phase=(bullet.phaseBase??0)+(bullet.phaseDir??1)*(bullet.phaseRate??3.2)*t;
    return (bullet.center??0)+(bullet.amplitude??50*this.dpr)*Math.sin((bullet.waveNumber??.03)*coord+phase);
  }

  spawnFiveSonicPair(boost=0,index=0) {
    this.originalBossPose("five-golza",760);
    const d=this.dpr;
    const warning=Math.max(270,500-boost*45);
    const life=2450+boost*170;
    const wavelength=Math.max(115,178-boost*12)*d;
    const amplitude=(44+boost*8)*d;
    const width=(10+boost*1.5)*d;
    const rate=3.0+boost*.48;
    const reflectAt=boost>=3 ? warning+1080 : null;
    const centers=[this.canvas.height*(.38+(index%3)*.045),this.canvas.height*(.62-(index%2)*.055)];
    const waves=[
      {orientation:"horizontal",center:centers[0],phaseDir:1,phaseBase:index*.74},
      {orientation:"horizontal",center:centers[1],phaseDir:-1,phaseBase:Math.PI*.65+index*.53}
    ];
    if(boost>=2 && index%2===1){
      waves.push({orientation:"vertical",center:this.canvas.width*(index%4===1?.43:.57),phaseDir:index%4===1?1:-1,phaseBase:index*.61});
    }
    for(const [w,desc] of waves.entries()) this.addBullet({
      type:"fiveSonicWave",...desc,warningMs:warning,life,width,damage:12+boost*2,
      amplitude,waveNumber:(Math.PI*2)/wavelength,phaseRate:rate+(w===2?.28:0),reflectAt,index:w+index*4
    });

    // The two main waveforms generate visible resonance points. Their timing is fixed,
    // so the player can read the moving waves and the coming bursts instead of guessing.
    const nodeXs=boost>=2?[.22,.42,.62,.80]:[.30,.52,.74];
    const trigger=warning+820;
    nodeXs.forEach((ratio,n)=>{
      const x=this.canvas.width*ratio;
      const a={center:centers[0],amplitude,waveNumber:(Math.PI*2)/wavelength,phaseBase:index*.74,phaseDir:1,phaseRate:rate,warningMs:warning,reflectAt};
      const b={center:centers[1],amplitude,waveNumber:(Math.PI*2)/wavelength,phaseBase:Math.PI*.65+index*.53,phaseDir:-1,phaseRate:rate,warningMs:warning,reflectAt};
      const y=(this.fiveSonicCoordinate(a,x,trigger)+this.fiveSonicCoordinate(b,x,trigger))/2;
      this.addBullet({
        type:"fiveResonanceNode",x,y,warningMs:trigger+n*70,burstMs:390,
        radius:(20+boost*2.8)*d,crossLength:(112+boost*24)*d,crossHalfWidth:(8+boost*1.4)*d,
        life:trigger+n*70+520,damage:14+boost*2,index:n,boost
      });
    });
  }

  spawnFiveLaneFrame(boost=0) {
    if(this.bullets.some(b=>!b.dead&&b.type==="fiveLaneFrame")) return;
    const d=this.dpr, center=this.canvas.width/2;
    const separation=(boost>=3?70:78)*d;
    const left=center-separation/2, right=center+separation/2, centerY=this.canvas.height*.55;
    const corridorHalf=(boost>=3?88:98)*d;
    this.fiveLaneMode=true; this.fiveLaneLeftX=left; this.fiveLaneRightX=right; this.fiveLaneCenterY=centerY;
    this.player.x=Math.abs(this.player.x-left)<=Math.abs(this.player.x-right)?left:right;
    this.player.y=centerY;
    this.addBullet({type:"fiveLaneFrame",left,right,centerX:center,centerY,corridorHalf,life:Math.max(2400,(this.durationMs??10000)-this.elapsed+180),damage:0});
  }

  spawnFiveLaneLaser(side="left",index=0,boost=0,fake=false) {
    this.originalBossPose("five-ganq",560);
    this.spawnFiveLaneFrame(boost);
    const warning=Math.max(115,285-boost*34), fireMs=Math.max(165,285-boost*22);
    this.addBullet({
      type:"fiveLaneLaser",side,fake,
      warningMs:warning,fireMs,life:warning+(fake?90:fireMs)+100,
      damage:13+boost*2,index
    });
  }

  fiveWindmillBeadPosition(bullet,arm,bead,layer,motionAge) {
    const arms=bullet.arms??4, beads=bullet.beads??8;
    const frac=(bead+1)/(beads+1);
    const rr=bullet.inner+(bullet.outer-bullet.inner)*frac;
    const base=(bullet.startAngle??0)+arm*Math.PI*2/arms;
    const theta=base+(bullet.angularSpeed??.72)*(motionAge/1000);
    return {active:true,x:bullet.x+Math.cos(theta)*rr,y:bullet.y+Math.sin(theta)*rr,theta,rr};
  }

  spawnFiveWindmill(boost=0,index=0) {
    this.originalBossPose("five-cov",900);
    const d=this.dpr;
    const speeds=[.62,.78,.96,1.14,1.34];
    const beads=[9,9,10,10,11];
    this.addBullet({
      type:"fiveWindmill",x:this.canvas.width/2,y:this.canvas.height/2,
      boost,layers:1,arms:4,beads:beads[boost]??11,
      inner:43*d,outer:Math.hypot(this.canvas.width/2,this.canvas.height/2)*.98,
      beadR:(5.45+Math.min(boost,4)*.08)*d,
      angularSpeed:(speeds[boost]??1.34)*(index%2?-1:1),
      warningMs:520,startAngle:index*.44,coreR:(20+boost*1.2)*d,
      life:Math.max(3900,(this.durationMs??10000)-this.elapsed-180),damage:12+boost*2,index
    });
  }

  spawnFiveChestDropWave(index=0,boost=0) {
    const d=this.dpr;
    const baseCount=boost<=1?1:2;
    const count=baseCount+((boost>=3 && index%4===3)?1:0)+(boost>=4 && index%5===4?1:0);
    const minGap=(boost>=4?78:boost>=3?84:92)*d;
    const xs=[];
    for(let i=0;i<count;i++){
      let x=this.canvas.width*(.08+Math.random()*.84);
      for(let tries=0;tries<10 && xs.some(v=>Math.abs(v-x)<minGap);tries++) x=this.canvas.width*(.08+Math.random()*.84);
      xs.push(x);
      this.addBullet({
        type:"pellet",fiveChestDrop:true,x,y:-14*d,
        vx:(Math.random()-.5)*(22+boost*5)*d,
        vy:(178+boost*15+Math.random()*34)*d,
        r:(4.6+Math.random()*.65)*d,damage:9+boost
      });
    }
  }

  spawnFiveFallField(boost=0) {
    if(this.bullets.some(b=>!b.dead&&b.type==="fiveFallField")) return;
    this.originalBossPose("five-melba",900);
    this.fiveFallMode=true; this.fiveFallBoost=boost;
    this.player.y=Math.min(this.player.y,this.canvas.height*.19);
    this.addBullet({type:"fiveFallField",life:Math.max(2800,(this.durationMs??10000)-this.elapsed+120),boost,damage:0});
  }

  spawnFiveFallDebrisWave(wave=0,boost=0) {
    this.spawnFiveFallField(boost);
    const d=this.dpr, lanes=boost>=3?8:7;
    const scripts=[[3,4,3,2,1,2,3,4,5,4,3,2,3,4,5,4,3],[2,3,4,5,4,3,2,1,2,3,4,5,4,3,2,3,4]];
    const safe=scripts[(this.originalTurn+boost)%scripts.length][wave%scripts[0].length]%(lanes-1);
    const gapWidth=boost>=3?1:2;
    for(let lane=0;lane<lanes;lane++){
      if(lane>=safe && lane<safe+gapWidth) continue;
      const laneShift=(wave%3===0?-.28:wave%3===1?.34:.06);
      const x=clamp(this.canvas.width*((lane+.5+laneShift)/lanes),18*d,this.canvas.width-18*d), r=(lane%3===0?14:lane%3===1?11:9)*d;
      const drift=((lane+wave)%2?1:-1)*(12+((lane*7+wave*3)%20))*d;
      this.addBullet({
        type:"fiveFallDebris",kind:(lane+wave)%3,x,y:this.canvas.height+36*d,startX:x,startY:this.canvas.height+36*d,
        vx:drift,vy:-(210+boost*26+((lane+wave)%3)*22)*d,
        r,life:2200,damage:11+boost*2,spin:((lane%2?1:-1)*(.0018+boost*.00015))
      });
    }
  }

  spawnFiveFreezeBeam(xRatio=.5,yRatio=.5,index=0,boost=0) {
    this.originalBossPose("five-reicubas",620);
    const d=this.dpr, x=this.canvas.width*xRatio,y=this.canvas.height*yRatio;
    const warning=Math.max(245,455-boost*34), fire=280;
    this.addBullet({
      type:"fiveFreezeBeam",targetX:x,targetY:y,warningMs:warning,fireMs:fire,life:warning+fire+120,
      width:(13+boost)*d,damage:8+boost,slowMs:2200+boost*180,slowScale:Math.max(.43,.60-boost*.035),index
    });
  }

  spawnFiveFireRay(index=0,boost=0) {
    this.originalBossPose("five-reicubas",620);
    const d=this.dpr;
    const ys=[.18,.74,.38,.62,.26,.80,.48,.32,.68,.20,.56,.76];
    this.addBullet({
      type:"fiveFireRay",x:this.canvas.width-3*d,y:this.canvas.height*ys[index%ys.length],
      targetX:this.player.x,targetY:this.player.y,
      trackingMs:Math.max(245,470-boost*42),lockMs:Math.max(105,220-boost*20),fireMs:boost===0?470:620+boost*45,
      life:Math.max(245,470-boost*42)+Math.max(105,220-boost*20)+(boost===0?470:620+boost*45)+100,
      width:(14+boost*1.2)*d,damage:15+boost*2,index
    });
  }

  runOriginalFiveKingPattern() {
    const order=["golza","ganq","cov","melba","reicubas"];
    const alive=order.filter(k=>this.originalModuleAlive(k));
    if(!alive.length) return;
    const boost=this.fiveKingBoostLevel();
    // Every enemy turn belongs to one surviving organ. Destroying an organ deletes its
    // pattern; the remaining patterns use boost 0..4 to become structurally harder.
    const module=alive[(Math.max(1,this.originalTurn)-1)%alive.length];

    if(module==="golza"){
      const interval=Math.max(1420,2200-boost*175), count=4+(boost>=2?1:0)+(boost>=4?1:0);
      for(let i=0;i<count;i++) this.originalCue(`five-sonic-${this.originalTurn}-${i}`,300+i*interval,()=>this.spawnFiveSonicPair(boost,i));
      return;
    }

    if(module==="ganq"){
      this.originalCue(`five-lane-frame-${this.originalTurn}`,0,()=>this.spawnFiveLaneFrame(boost));
      const scripts=[
        ["L","R","L","R","L","L","R","R","L","R","L","R","R","L"],
        ["L","L","L","L","R","R","L","R","R","L","L","R","L","R","R","L"],
        ["R","L","L","R","R","R","L","R","L","L","R","L","R","R","L","L","R"],
        ["L","L","FL","R","R","L","FR","L","L","L","R","R","L","R","L","R","R","L"],
        ["R","L","R","R","L","L","R","FR","L","R","R","R","L","FL","R","L","L","R","L","R"]
      ];
      const script=scripts[Math.min(boost,scripts.length-1)], intervals=[610,535,470,405,345], interval=intervals[boost];
      const count=Math.max(script.length,Math.ceil(((this.durationMs??10400)-950)/interval));
      for(let i=0;i<count;i++){
        const token=script[i%script.length], fake=token.startsWith("F"), side=token.endsWith("L")?"left":"right";
        this.originalCue(`five-lane-${this.originalTurn}-${i}`,430+i*interval,()=>this.spawnFiveLaneLaser(side,i,boost,fake));
      }
      return;
    }

    if(module==="cov"){
      this.originalCue(`five-wind-${this.originalTurn}`,220,()=>this.spawnFiveWindmill(boost,this.originalTurn));
      // Chest upgrades never become spirals or contract the arena. The same readable
      // four-arm windmill simply rotates faster while increasingly frequent light shots
      // fall from above and force short corrective movement.
      if(boost>=1){
        const intervals=[0,820,680,550,455];
        const starts=[0,1280,1120,960,820];
        const interval=intervals[boost], start=starts[boost];
        const count=Math.max(6,Math.floor(((this.durationMs??10400)-start-420)/interval));
        for(let i=0;i<count;i++) this.originalCue(`five-chest-drop-${this.originalTurn}-${i}`,start+i*interval,()=>this.spawnFiveChestDropWave(i,boost));
      }
      return;
    }

    if(module==="melba"){
      this.originalCue(`five-fall-field-${this.originalTurn}`,0,()=>this.spawnFiveFallField(boost));
      const interval=Math.max(430,720-boost*55), count=13+boost*2;
      for(let i=0;i<count;i++) this.originalCue(`five-fall-${this.originalTurn}-${i}`,360+i*interval,()=>this.spawnFiveFallDebrisWave(i,boost));
      return;
    }

    if(module==="reicubas"){
      const iceTargets=[[.28,.30],[.64,.56],[.78,.28],[.42,.76]];
      const iceTimes=boost>=3?[260,1180,4300]:boost>=1?[280,1260]:[320,1380];
      iceTimes.forEach((at,i)=>{const [x,y]=iceTargets[(i+boost)%iceTargets.length];this.originalCue(`five-freeze-${this.originalTurn}-${i}`,at,()=>this.spawnFiveFreezeBeam(x,y,i,boost));});
      const fireStart=2150;
      const intervals=[1000,610,520,450,390];
      const fireCount=Math.max(5,Math.ceil(((this.durationMs??10400)-fireStart-650)/intervals[boost]));
      for(let i=0;i<fireCount;i++) this.originalCue(`five-fire-${this.originalTurn}-${i}`,fireStart+i*intervals[boost],()=>this.spawnFiveFireRay(i,boost));
    }
  }


  belialRand(seed = 1) {
    const x=Math.sin((seed+this.originalTurn*17.37)*91.733)*43758.5453;
    return x-Math.floor(x);
  }

  setBelialCanvasPose(pose="taunt",x=null,y=null,duration=720){
    this.belialCanvasPose=pose;
    this.belialCanvasPoseUntil=this.elapsed+duration;
    if(Number.isFinite(x))this.belialAvatarX=x;
    if(Number.isFinite(y))this.belialAvatarY=y;
  }

  spawnBelialShotPattern(style="fan", boost=0, wave=0) {
    const d=this.dpr;
    const side=((wave+this.originalTurn)%2===0)?"left":"right";
    const ox=side==="left"?this.canvas.width*.16:this.canvas.width*.84;
    const oy=this.canvas.height*(.15+.09*((wave+boost)%3));
    this.setBelialCanvasPose("aim",ox,oy,900);
    this.originalBossPose(side==="left"?"belial-shoot-left":"belial-shoot-right",820);

    if(style==="fan"){
      // Toriel-like authored fan: Belial fires a broad petal curtain, but deliberately
      // leaves a readable two-projectile seam instead of aiming every pellet at the soul.
      const count=boost>=2?11:boost===1?10:9;
      const spread=boost>=2?1.34:1.22;
      const base=Math.atan2(this.player.y-oy,this.player.x-ox);
      const seam=(wave*3+this.originalTurn)%Math.max(3,count-2);
      for(let i=0;i<count;i++){
        if(i===seam||i===seam+1)continue;
        const a=base+(i-(count-1)/2)*(spread/Math.max(1,count-1));
        const sp=(190+boost*18)*d;
        this.addBullet({type:"belialShot",style:"fan",x:ox,y:oy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:(5.8+boost*.18)*d,damage:10+boost,delay:i*44,life:3500});
      }
      return;
    }

    if(style==="ghost"){
      // Napstablook-like drifting rain.  The safe corridor moves by only one lane per
      // phrase, so the player reads the fall rather than being trapped by curved shots.
      const lanes=9;
      const safe=(2+((wave+this.originalTurn)%5));
      const dir=(wave%2?1:-1);
      for(let lane=0;lane<lanes;lane++){
        if(Math.abs(lane-safe)<=1)continue;
        const x=this.canvas.width*(.09+lane*(.82/(lanes-1)));
        const y=-14*d-(lane%2)*22*d;
        const vy=(155+boost*16)*d;
        const vx=dir*(28+((lane*17+wave*11)%25))*d;
        this.addBullet({type:"belialShot",style:"ghost",x,y,vx,vy,r:(6.4+boost*.15)*d,damage:10+boost,curve:dir*(.10+boost*.015),life:4200,delay:lane*34});
      }
      return;
    }

    // MTT-like structured firing.  One call is a short four-beat wall phrase, not a
    // whole screen full of overlapping walls.  The gap has two lanes and can move at
    // most one lane each beat, keeping phase three aggressive but always traversable.
    const lanes=8, beats=4;
    const baseGap=1+((wave*2+this.originalTurn)%5);
    for(let beat=0;beat<beats;beat++){
      const fromLeft=(beat+wave)%2===0;
      const x=fromLeft?-16*d:this.canvas.width+16*d;
      const step=(beat%3===0?0:beat%3===1?1:-1);
      const gap=clamp(baseGap+step,1,lanes-3);
      for(let lane=0;lane<lanes;lane++){
        if(lane===gap||lane===gap+1)continue;
        const y=this.canvas.height*(.09+lane*(.82/(lanes-1)));
        const sp=(220+boost*16)*d;
        this.addBullet({type:"belialShot",style:"grid",x,y,vx:(fromLeft?1:-1)*sp,vy:0,r:5.2*d,damage:9+boost,life:3900,delay:beat*(boost>=2?390:440)});
      }
    }
  }

  spawnBelialLightningWave(boost=0, wave=0) {
    this.setBelialCanvasPose("thunder",this.canvas.width*(.34+.32*this.belialRand(wave+5)),this.canvas.height*.14,920);
    this.originalBossPose("belial-thunder",900);
    const d=this.dpr,count=2+Math.min(2,boost),pad=55*d;
    const used=[];
    for(let i=0;i<count;i++){
      let x,y;
      for(let tries=0;tries<8;tries++){
        const r1=this.belialRand(wave*13+i*7+tries),r2=this.belialRand(wave*19+i*11+tries+3);
        x=pad+r1*(this.canvas.width-pad*2);y=pad+r2*(this.canvas.height-pad*2);
        if(!used.some(([ux,uy])=>Math.hypot(x-ux,y-uy)<120*d))break;
      }
      used.push([x,y]);
      this.addBullet({type:"belialLightning",x,y,radius:(31+boost*3)*d,warningMs:Math.max(360,610-boost*65),strikeMs:260,life:1040,damage:13+boost*2,delay:i*(115-boost*10)});
    }
  }

  spawnBelialSlash(colorMode="blue", orientation="horizontal", boost=0, index=0) {
    this.setBelialCanvasPose("slash",index%2?this.canvas.width*.78:this.canvas.width*.22,this.canvas.height*(.24+.13*(index%3)),690);
    this.originalBossPose(colorMode==="blue"?"belial-eye-blue":"belial-eye-orange",330);
    const d=this.dpr;
    this.addBullet({type:"belialBattlenizerSweep",colorMode,orientation,side:(index%2?"end":"start"),width:(25+boost*2)*d,delay:Math.max(300,500-boost*45)*this.telegraphScale,life:Math.max(470,690-boost*45),damage:14+boost*2});
  }

  spawnBelialScytheGuard(boost=0) {
    // The late-phase extra slash must be a visible incoming attack, not an off-screen
    // arc with an invisible Z check.  Belial charges, a huge crescent forms at the
    // edge, then the wave actually crosses the arena and can be blocked while it is
    // approaching the player.
    const fromRight=((this.originalTurn+boost)%2===0);
    this.setBelialCanvasPose("scythe",fromRight?this.canvas.width*.78:this.canvas.width*.22,this.canvas.height*.23,1650);
    this.originalBossPose("belial-scythe-charge",1380);
    const d=this.dpr;
    const warningMs=720;
    const travelMs=920;
    this.addBullet({
      type:"belialScytheGuard",
      fromRight,
      warningMs,
      travelMs,
      crescentRadius:this.canvas.height*.58,
      width:(38+boost*3)*d,
      guardStart:warningMs+220,
      guardEnd:warningMs+760,
      life:warningMs+travelMs+260,
      damage:26+boost*3
    });
  }

  spawnBelialClawSequence(boost=0) {
    // Belial's claw round is one continuous authored sequence rather than several
    // disconnected one-shot hazards.  The jaws are already visible when the round
    // begins, exposing the first safe gap long before they close; after each bite
    // they reopen only to the ready position and immediately reveal the next gap.
    this.setBelialCanvasPose("claw",this.canvas.width*.50,this.canvas.height*.16,1280);
    this.originalBossPose("belial-claw",1000);
    const d=this.dpr;
    const cycleCount=boost>=2?7:boost===1?6:5;
    const gaps=[];
    for(let i=0;i<cycleCount;i++){
      // Keep gaps away from the corridor edges and avoid two nearly identical
      // consecutive answers so the player has a real relocation decision.
      let center=.34+this.belialRand(71+boost*17+i*23)*.32;
      if(i&&Math.abs(center-gaps[i-1])<.11) center=center<.5?Math.min(.66,center+.18):Math.max(.34,center-.18);
      gaps.push(center);
    }
    const firstWarningMs=1900;
    const warningMs=Math.max(900,1280-boost*120);
    const closeMs=Math.max(320,430-boost*35);
    const holdMs=190;
    const openMs=300;
    const cycleMs=warningMs+closeMs+holdMs+openMs;
    const life=firstWarningMs+closeMs+holdMs+openMs+(cycleCount-1)*cycleMs+120;
    this.addBullet({
      type:"belialClawClamp",
      gapFractions:gaps,
      gapHalf:(66-Math.min(2,boost)*5)*d,
      previewDepth:.36,
      firstWarningMs,warningMs,closeMs,holdMs,openMs,cycleMs,
      life,
      damage:17+boost*2
    });
  }

  belialClawState(bullet, activeAge) {
    const gaps=bullet.gapFractions??[.5];
    const close=bullet.closeMs??430,hold=bullet.holdMs??190,open=bullet.openMs??300;
    const firstWarn=bullet.firstWarningMs??1900,warn=bullet.warningMs??1200;
    const firstSpan=firstWarn+close+hold+open;
    let index=0,local=activeAge,warning=firstWarn;
    if(activeAge>=firstSpan){
      const laterSpan=warn+close+hold+open;
      index=1+Math.floor((activeAge-firstSpan)/Math.max(1,laterSpan));
      local=(activeAge-firstSpan)%Math.max(1,laterSpan);
      warning=warn;
    }
    index=Math.min(gaps.length-1,Math.max(0,index));
    const preview=bullet.previewDepth??.36;
    let q=preview,phase="warning";
    if(local<warning){q=preview;phase="warning";}
    else if(local<warning+close){q=preview+(1-preview)*clamp((local-warning)/Math.max(1,close),0,1);phase="closing";}
    else if(local<warning+close+hold){q=1;phase="hold";}
    else {q=1-(1-preview)*clamp((local-warning-close-hold)/Math.max(1,open),0,1);phase="opening";}
    return {index,phase,q,gapX:this.canvas.width*gaps[index],danger:phase==="closing"&&q>.78||phase==="hold"};
  }

  spawnBelialDeathcium(variant=0, boost=2) {
    this.setBelialCanvasPose("deathcium",this.canvas.width*.50,this.canvas.height*.20,1500);
    this.originalBossPose("belial-deathcium",1380);
    const d=this.dpr,kind=["horizontal","diag-down","vertical","diag-up"][variant%4];
    let x1,y1,x2,y2;
    if(kind==="horizontal"){x1=-80*d;y1=this.canvas.height*.50;x2=this.canvas.width+80*d;y2=this.canvas.height*.50;}
    else if(kind==="vertical"){x1=this.canvas.width*.50;y1=-80*d;x2=this.canvas.width*.50;y2=this.canvas.height+80*d;}
    else if(kind==="diag-down"){x1=-70*d;y1=-25*d;x2=this.canvas.width+70*d;y2=this.canvas.height+25*d;}
    else{x1=-70*d;y1=this.canvas.height+25*d;x2=this.canvas.width+70*d;y2=-25*d;}
    this.addBullet({type:"belialDeathciumBeam",x1,y1,x2,y2,width:(78+boost*10)*d,warningMs:760,fireMs:520,life:1420,damage:30+boost*2});
  }

  spawnBelialGalaxyOrb(index=0) {
    const d=this.dpr,a=Math.atan2(this.player.y-this.belialAvatarY,this.player.x-this.belialAvatarX),sp=(150+Math.min(60,index*3))*d;
    this.addBullet({type:"belialChaseOrb",x:this.belialAvatarX,y:this.belialAvatarY,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:9*d,damage:13,homing:.84,life:6200,canHitBelial:true});
  }

  spawnBelialMeteor(index=0, big=false) {
    const d=this.dpr,x=(.08+this.belialRand(index*7+31)*.84)*this.canvas.width;
    this.addBullet({type:big?"belialAsteroid":"belialMeteor",x,y:-30*d,vx:(this.belialRand(index*5+7)-.5)*50*d,vy:(big?205:285)*d,r:(big?19:8)*d,damage:big?18:10,life:4300,hp:big?3:1,breakableByBelialShot:true,spin:(this.belialRand(index+2)>.5?1:-1)*(big?1.1:2.2)});
  }

  spawnBelialGlyph(index=0, color="purple", dense=false, opts={}) {
    const d=this.dpr;
    const edge=opts.edge??(index%4),t=opts.edgeT??(.12+this.belialRand(index*13+7)*.76);
    let x=opts.x,y=opts.y;
    if(!Number.isFinite(x)||!Number.isFinite(y)){
      if(edge===0){x=-20*d;y=this.canvas.height*t;}
      else if(edge===1){x=this.canvas.width+20*d;y=this.canvas.height*t;}
      else if(edge===2){x=this.canvas.width*t;y=-20*d;}
      else{x=this.canvas.width*t;y=this.canvas.height+20*d;}
    }
    const tx=Number.isFinite(opts.targetX)?opts.targetX:this.canvas.width*(.34+this.belialRand(index*3+2)*.32);
    const ty=Number.isFinite(opts.targetY)?opts.targetY:this.canvas.height*(.28+this.belialRand(index*5+9)*.44);
    const a=Number.isFinite(opts.angle)?opts.angle:Math.atan2(ty-y,tx-x);
    const sp=(opts.speed??(dense?178:145))*d;
    this.addBullet({
      type:"belialGlyph",color,shape:opts.shape??"sigil",x,y,
      vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
      r:(opts.radius??(dense?8:7))*d,damage:opts.damage??(dense?12:10),
      curve:opts.curve??((edge%2?1:-1)*(dense?.26:.16)),
      spin:opts.spin??((edge%2?1:-1)*2.25),life:opts.life??4800,delay:opts.delay??0
    });
  }

  spawnBelialAbyssEdgeBurst(wave=0,color="red",dense=false){
    // Large outlined emblems enter from all four edges, leaving one quadrant less
    // crowded.  This mirrors the reference video's first red/purple field without
    // turning it into random pellet soup.
    const safeQuadrant=(wave+this.originalTurn)%4;
    for(let edge=0;edge<4;edge++){
      const perEdge=dense?2:1;
      for(let j=0;j<perEdge;j++){
        if(edge===safeQuadrant&&j===0)continue;
        const edgeT=.20+.60*((j*.47+this.belialRand(wave*31+edge*7+j*3))%1);
        this.spawnBelialGlyph(wave*20+edge*3+j,color,dense,{edge,edgeT,radius:dense?10.2:9.2,speed:dense?168:142,curve:(edge%2?1:-1)*(dense?.18:.12),delay:j*90});
      }
    }
  }

  spawnBelialAbyssDiagonalChain(wave=0,color="blue",reverse=false){
    // A diagonal ribbon of sigils crosses the screen with a two-slot break.  The
    // next chain alternates direction, reproducing the reference's moving diagonal
    // bands while preserving a real route through them.
    const d=this.dpr,slots=9,gap=2+((wave*2+this.originalTurn)%4);
    const speed=(160+Math.min(20,wave*2))*d;
    for(let i=0;i<slots;i++){
      if(i===gap||i===gap+1)continue;
      const u=i/(slots-1);
      const x=reverse?this.canvas.width+22*d:-22*d;
      const y=(.02+.96*u)*this.canvas.height;
      const tx=reverse?-60*d:this.canvas.width+60*d;
      const ty=(.96-.92*u)*this.canvas.height;
      const a=Math.atan2(ty-y,tx-x);
      this.addBullet({type:"belialGlyph",color,shape:"sigil",x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:8.2*d,damage:11,curve:reverse?.06:-.06,spin:(reverse?-1:1)*2.0,life:5200,delay:i*22});
    }
  }

  spawnBelialAbyssRadialRing(wave=0,color="red"){
    const d=this.dpr,cx=this.belialAvatarX,cy=this.belialAvatarY,count=14;
    const safeStart=(wave*3+this.originalTurn)%count;
    for(let i=0;i<count;i++){
      const dist=(i-safeStart+count)%count;
      if(dist<=1||dist>=count-1)continue; // about a three-projectile angular gate
      const a=(Math.PI*2*i/count)+(wave%2?Math.PI/count:0);
      const r0=28*d,sp=(132+wave*4)*d;
      this.addBullet({type:"belialGlyph",color,shape:"sigil",x:cx+Math.cos(a)*r0,y:cy+Math.sin(a)*r0,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:7.6*d,damage:11,curve:(wave%2?1:-1)*.035,spin:(wave%2?1:-1)*2.6,life:4500,delay:i*8});
    }
  }

  spawnBelialAbyssShardWave(wave=0){
    // Reference-video-style white shard storm.  It is authored in lanes with a
    // moving three-lane corridor rather than true random rain.
    const d=this.dpr,lanes=12,safe=2+((wave+this.originalTurn)%7);
    for(let lane=0;lane<lanes;lane++){
      if(Math.abs(lane-safe)<=1)continue;
      const x=this.canvas.width*(.04+lane*(.92/(lanes-1)));
      const drift=((lane+wave)%3-1)*22*d;
      this.addBullet({type:"belialGlyph",color:"white",shape:"shard",x,y:-20*d,vx:drift,vy:(235+wave*5)*d,r:5.4*d,damage:10,curve:0,spin:(lane%2?1:-1)*4.2,life:3200,delay:(lane%3)*32});
    }
  }

  runBelialGalaxyPattern() {
    const p=clamp(this.elapsed/Math.max(1,this.durationMs),0,1);
    this.belialAvatarX=this.canvas.width*(.5+.22*Math.sin(this.elapsed/1150));
    this.belialAvatarY=this.canvas.height*(.18+.07*Math.sin(this.elapsed/760+1.2));
    this.originalCue("belial-galaxy-field",0,()=>this.addBullet({type:"belialGalaxyField",life:this.durationMs+200,damage:0}));
    const orbInterval=880,meteorInterval=520;
    const oi=Math.floor(Math.max(0,this.elapsed-650)/orbInterval),mi=Math.floor(Math.max(0,this.elapsed-250)/meteorInterval);
    for(let i=0;i<=oi;i++)this.originalCue(`belial-galaxy-orb-${i}`,650+i*orbInterval,()=>this.spawnBelialGalaxyOrb(i));
    for(let i=0;i<=mi;i++)this.originalCue(`belial-galaxy-meteor-${i}`,250+i*meteorInterval,()=>this.spawnBelialMeteor(i,i%5===3));
    if(p>.72){const extra=Math.floor((this.elapsed-this.durationMs*.72)/900);for(let i=0;i<=extra;i++)this.originalCue(`belial-galaxy-extra-${i}`,this.durationMs*.72+i*900,()=>this.spawnBelialGalaxyOrb(i+20));}
  }

  runBelialAbyssPattern() {
    // Rebuilt from the user's reference video as an authored sequence rather than a
    // generic red/blue/purple glyph spray.  Each visual section has its own spatial
    // grammar and the Belial avatar remains inside the field throughout.
    const t=this.elapsed;
    this.belialAvatarX=this.canvas.width*(.50+.035*Math.sin(t/760));
    this.belialAvatarY=this.canvas.height*(.24+.025*Math.cos(t/620));
    this.originalCue("belial-abyss-field",0,()=>this.addBullet({type:"belialAbyssField",life:this.durationMs+300,damage:0}));

    // 0.9-4.6s: red -> purple edge emblems, large and sparse.
    for(let i=0;i<6;i++)this.originalCue(`belial-abyss-edge-${i}`,900+i*620,()=>this.spawnBelialAbyssEdgeBurst(i,i<3?"red":"purple",i>=4));

    // 4.9-9.1s: blue diagonal chains, alternating direction like the reference's
    // two long ribbons.  Each chain has a deliberate two-slot opening.
    for(let i=0;i<5;i++)this.originalCue(`belial-abyss-blue-chain-${i}`,4900+i*840,()=>this.spawnBelialAbyssDiagonalChain(i,"blue",i%2===1));

    // 9.4-12.2s: purple crossing ribbons.  The second ribbon follows after the first
    // is readable instead of appearing simultaneously.
    for(let i=0;i<4;i++)this.originalCue(`belial-abyss-purple-chain-${i}`,9400+i*700,()=>this.spawnBelialAbyssDiagonalChain(i+8,"purple",i%2===0));

    // 12.4-16.0s: red radial bursts from Belial.  The missing angular sector rotates
    // between rings, reproducing the flower-like expansion visible in the video.
    for(let i=0;i<5;i++)this.originalCue(`belial-abyss-ring-${i}`,12400+i*720,()=>this.spawnBelialAbyssRadialRing(i,"red"));

    // 16.1-18.7s: return to blue/purple edge pressure before the white shard storm.
    for(let i=0;i<4;i++)this.originalCue(`belial-abyss-return-${i}`,16100+i*620,()=>this.spawnBelialAbyssEdgeBurst(i+20,i%2?"purple":"blue",true));

    // 18.8-20.7s: white shards pour down in readable lane waves.
    for(let i=0;i<4;i++)this.originalCue(`belial-abyss-shards-${i}`,18800+i*480,()=>this.spawnBelialAbyssShardWave(i));

    // Final single huge diagonal Descium beam, matching the reference's last visual
    // punctuation instead of layering several beams at once.
    this.originalCue("belial-abyss-finisher",20500,()=>this.spawnBelialDeathcium(1,3));
  }

  runBelialFinalClashPattern() {
    this.originalCue("belial-final-beam",0,()=>this.addBullet({type:"belialFinalClash",life:this.durationMs+1000,damage:0}));
    const prev=this.belialClashLastElapsed??this.elapsed,dt=Math.max(0,(this.elapsed-prev)/1000);this.belialClashLastElapsed=this.elapsed;
    const held=!!this.belialClashHeld;
    if(held){
      const rate=this.belialClashProgress<.34?.20:.145;
      this.belialClashProgress=clamp(this.belialClashProgress+dt*rate,0,1);
    }else{
      this.belialClashProgress=clamp(this.belialClashProgress-dt*(this.belialClashProgress<.34?.035:.07),0,1);
    }
    if(!held&&this.elapsed>1500&&this.belialClashProgress<.07&&this.elapsed>(this.belialClashPunishAt??0)){
      this.belialClashPunishAt=this.elapsed+900;this.callbacks.onHit?.(7);
    }
    if(this.elapsed>(this.belialClashReportAt??0)){
      this.belialClashReportAt=this.elapsed+70;
      this.callbacks.onBelialClashProgress?.({progress:this.belialClashProgress,held});
    }
    if(this.belialClashProgress>=1&&!this.belialClashComplete){
      this.belialClashComplete=true;this.callbacks.onBelialClashComplete?.();
      setTimeout(()=>this.stop(),120);
    }
  }

  runOriginalBelialPattern() {
    const phase=this.bossPhase??0,boost=phase,turn=Math.max(1,this.originalTurn),variant=(turn-1)%5;
    const duration=this.durationMs??11600;
    const cue=(key,at,fn)=>this.originalCue(`belial-${turn}-${key}`,at,fn);
    this.originalCue(`belial-${turn}-duel-presence`,0,()=>this.addBullet({type:"belialDuelField",life:duration+180,damage:0}));
    if(this.elapsed>(this.belialCanvasPoseUntil??0)){
      this.belialCanvasPose="taunt";
      this.belialAvatarX=this.canvas.width*(.50+.27*Math.sin(this.elapsed/1180+turn*.7));
      this.belialAvatarY=this.canvas.height*(.17+.055*Math.sin(this.elapsed/640+turn));
    }
    if(variant===0){
      if(phase>=2){
        // Phase three is a sequence of distinct readable phrases instead of nine
        // overlapping MTT walls.  Pressure comes from variety and tempo, not from
        // filling every pixel at once.
        const phrases=[
          [420,"fan"],[1880,"ghost"],[3420,"mtt"],[5160,"fan"],
          [6760,"mtt"],[8420,"ghost"],[10020,"fan"]
        ];
        phrases.forEach(([at,style],i)=>cue(`shot-${i}`,at,()=>this.spawnBelialShotPattern(style,boost,i)));
        cue("deathcium",duration-1650,()=>this.spawnBelialDeathcium(turn%4,boost));
      }else{
        const style=phase===0?"fan":"ghost";
        const count=phase===0?7:8;
        const usable=Math.max(1,duration-2400);
        const gap=Math.min(1080,Math.max(760,(usable-420)/Math.max(1,count-1)));
        for(let i=0;i<count;i++)cue(`shot-${i}`,420+i*gap,()=>this.spawnBelialShotPattern(style,boost,i));
      }
      return;
    }
    if(variant===1){
      const count=phase===0?8:phase===1?9:11;
      const endAt=phase>=2?duration-2350:duration-1350;
      const gap=(endAt-340)/Math.max(1,count-1);
      for(let i=0;i<count;i++)cue(`thunder-${i}`,340+i*gap,()=>this.spawnBelialLightningWave(boost,i));
      if(phase>=2)cue("deathcium",duration-1650,()=>this.spawnBelialDeathcium((turn+1)%4,boost));
      return;
    }
    if(variant===2){
      const colors=phase>=2?["blue","orange","orange","blue","orange","blue","blue","orange","blue","orange","orange","blue"]:phase===1?["blue","orange","orange","blue","orange","blue","blue","orange","orange"]:["blue","orange","blue","orange","orange","blue","orange"];
      const reserve=phase>=2?2850:phase===1?1900:1150;
      const gap=Math.max(610,(duration-reserve-360)/Math.max(1,colors.length-1));
      colors.forEach((c,i)=>cue(`slash-${i}`,360+i*gap,()=>this.spawnBelialSlash(c,i%3===2?"vertical":"horizontal",boost,i)));
      // Reserve the full charge + travel time for the visible crescent.  v2.7.2
      // started phase-two scythe only ~700 ms before the round ended, so its warning
      // appeared but the actual wave was cut off by BulletSystem.stop().
      if(phase>=1)cue("scythe",Math.min(duration-1950,520+colors.length*gap),()=>this.spawnBelialScytheGuard(boost));
      // The battlenizer round ends on the Z-block crescent itself.  Do not stack an
      // unrelated Descium beam on top of the guard window.
      return;
    }
    if(variant===3){
      // One continuous claw sequence: visible safe gap from frame one, then 5/6/7
      // consecutive bites with no dead-air pause between them.
      cue("claw-sequence",0,()=>this.spawnBelialClawSequence(boost));
      if(phase>=2)cue("deathcium",duration-1450,()=>this.spawnBelialDeathcium(turn%4,boost));
      return;
    }
    // Mixed firing round.  Phase three is deliberately sequenced so fan, drifting
    // rain and lane walls hand off to one another instead of occupying the arena at
    // the same time.  (v2.7.2 also accidentally spawned the fan loop twice.)
    if(phase>=2){
      const phrases=[[320,"fan"],[1750,"ghost"],[3300,"mtt"],[5000,"fan"],[6620,"ghost"],[8250,"mtt"],[10000,"fan"]];
      phrases.forEach(([at,style],i)=>cue(`mixed-${i}`,at,()=>this.spawnBelialShotPattern(style,boost,i+8)));
      cue("deathcium",duration-1500,()=>this.spawnBelialDeathcium((turn+3)%4,boost));
    }else{
      const fanCount=3+phase,gridCount=3+phase;
      for(let i=0;i<fanCount;i++)cue(`fan-${i}`,320+i*1120,()=>this.spawnBelialShotPattern(i%2?"ghost":"fan",boost,i));
      const gridStart=Math.max(3300,duration*.40),gridGap=Math.max(820,(duration-gridStart-900)/Math.max(1,gridCount-1));
      for(let i=0;i<gridCount;i++)cue(`grid-${i}`,gridStart+i*gridGap,()=>this.spawnBelialShotPattern("mtt",boost,i+8));
    }
  }

  runGolzaPattern() {
    const segment = this.setSegment(this.elapsed / this.durationMs, [.22, .45, .68, .84]);
    const density = Math.max(.68, this.intensity);
    if (segment === 0 && this.spawnClock >= 310 / density) { this.spawnClock = 0; this.spawnPelletRain(); }
    else if (segment === 1 && this.spawnClock >= 610 / density) { this.spawnClock = 0; this.spawnAimedFan(); }
    else if (segment === 2 && this.spawnClock >= 1180 / density) { this.spawnClock = 0; this.spawnFissurePair(); }
    else if (segment === 3 && this.spawnClock >= 520 / density) { this.spawnClock = 0; this.spawnPelletGate(); }
    else if (segment === 4) {
      if (this.spawnClock >= 430 / density) { this.spawnClock = 0; this.spawnPelletGate(); }
      if (this.auxClock >= 1500 / density) { this.auxClock = 0; this.spawnFissurePair(); }
    }
  }

  runZettonPattern() {
    const segment = this.setSegment(this.elapsed / this.durationMs, [.24, .48, .72, .86]);
    const density = Math.max(.72, this.intensity);
    if (segment === 0 && this.spawnClock >= 680 / density) { this.spawnClock = 0; this.spawnGuardPellet(); }
    else if (segment === 1 && this.spawnClock >= 720 / density) { this.spawnClock = 0; this.spawnGuardSequence(2, 150); }
    else if (segment === 2 && this.spawnClock >= 1550 / density) { this.spawnClock = 0; this.spawnGuardFireball(); }
    else if (segment === 3 && this.spawnClock >= 780 / density) { this.spawnClock = 0; this.spawnGuardCross(); }
    else if (segment === 4) {
      if (this.spawnClock >= 610 / density) { this.spawnClock = 0; this.spawnGuardSequence(3, 115); }
      if (this.auxClock >= 2100 / density) { this.auxClock = 0; this.spawnGuardFireball(); }
    }
  }

  runMelbaPattern() {
    const segment = this.setSegment(this.elapsed / this.durationMs, [.18, .40, .63, .82]);
    const density = Math.max(.72, this.intensity);

    if (segment === 0 && this.spawnClock >= 820 / density) {
      this.spawnClock = 0;
      this.spawnPlatformPelletVolley(false);
    } else if (segment === 1 && this.spawnClock >= 1650 / density) {
      this.spawnClock = 0;
      this.spawnMelbaSwoop();
    } else if (segment === 2 && this.spawnClock >= 690 / density) {
      this.spawnClock = 0;
      this.spawnPlatformPelletVolley(true);
    } else if (segment === 3 && this.spawnClock >= 1380 / density) {
      this.spawnClock = 0;
      this.spawnMelbaSwoop();
      if (Math.random() > .45) this.spawnPlatformPelletVolley(false);
    } else if (segment === 4) {
      if (this.spawnClock >= 620 / density) {
        this.spawnClock = 0;
        this.spawnPlatformPelletVolley(true);
      }
      if (this.auxClock >= 1900 / density) {
        this.auxClock = 0;
        this.spawnMelbaSwoop();
      }
    }
  }

  runChaosLidoriasPattern() {
    const progress = this.elapsed / this.durationMs;
    const segment = this.setSegment(progress, [.22, .46, .7, .86]);
    const density = Math.max(.74, this.intensity);
    const fragmentInterval = this.purifyActive
      ? (this.purifyBoost ? 620 : 800)
      : 1180;

    if (segment === 0 && this.spawnClock >= 560 / density) {
      this.spawnClock = 0;
      this.spawnChaosPelletFan(false);
    } else if (segment === 1 && this.spawnClock >= 470 / density) {
      this.spawnClock = 0;
      this.spawnChaosSideVolley();
    } else if (segment === 2 && this.spawnClock >= 1350 / density) {
      this.spawnClock = 0;
      this.spawnChaosLance();
    } else if (segment === 3 && this.spawnClock >= 500 / density) {
      this.spawnClock = 0;
      this.spawnChaosPelletFan(true);
    } else if (segment === 4) {
      if (this.spawnClock >= 540 / density) {
        this.spawnClock = 0;
        Math.random() > .46 ? this.spawnChaosSideVolley() : this.spawnChaosPelletFan(true);
      }
      if (this.auxClock >= 1750 / density) {
        this.auxClock = 0;
        this.spawnChaosLance();
      }
    }

    const fragmentCap = this.chaosFragmentsTarget + (this.purifyBoost ? 2 : 0);
    if (this.fragmentClock >= fragmentInterval / density && this.chaosFragmentsSpawned < fragmentCap) {
      this.fragmentClock = 0;
      this.spawnChaosFragment();
      if (this.purifyBoost && this.chaosFragmentsSpawned < fragmentCap && Math.random() > .48) {
        this.spawnChaosFragment(130);
      }
    }
  }


  runChaosUltramanPattern() {
    const density=Math.max(.76,this.intensity);
    if (this.bossPhase === 1) {
      // ECLIPSE BREAK is an objective round, not a normal damage barrage.
      // Three slow, visibly marked CORE waves appear at predictable beats so the player can learn the rule by doing it.
      const segment=this.setSegment(this.elapsed/this.durationMs,[.2,.42,.64,.82,.92]);
      if ([0,2,4].includes(segment) && this.chaosCoreWaveSegment !== segment) {
        this.chaosCoreWaveSegment = segment;
        this.spawnChaosOrderNodes(true);
      }
      if(segment===1 && this.spawnClock>=980/density){this.spawnClock=0;this.spawnChaosMirrorCrescents();}
      else if(segment===3 && this.spawnClock>=1320/density){this.spawnClock=0;this.spawnChaosImpedanceWall();}
      else if(segment===5 && this.spawnClock>=620/density){this.spawnClock=0;this.spawnChaosMirrorCrescents(true);}
      return;
    }
    const segment=this.setSegment(this.elapsed/this.durationMs,[.18,.38,.58,.77,.9]);
    if(segment===0 && this.spawnClock>=620/density){this.spawnClock=0;this.spawnChaosMirrorCrescents();}
    else if(segment===1 && this.spawnClock>=1280/density){this.spawnClock=0;this.spawnChaosImpedanceWall();}
    else if(segment===2 && this.spawnClock>=720/density){this.spawnClock=0;this.spawnChaosOrderNodes();}
    else if(segment===3 && this.spawnClock>=1450/density){this.spawnClock=0;this.spawnChaosProminenceSweep();}
    else if(segment===4 && this.spawnClock>=620/density){this.spawnClock=0;Math.random()>.5?this.spawnChaosMirrorCrescents(true):this.spawnChaosOrderNodes();}
    else if(segment===5){if(this.spawnClock>=540/density){this.spawnClock=0;this.spawnChaosMirrorCrescents(true)}if(this.auxClock>=1650/density){this.auxClock=0;Math.random()>.5?this.spawnChaosImpedanceWall():this.spawnChaosProminenceSweep()}}
  }

  runChaosDarknessPattern() {
    const segment=this.setSegment(this.elapsed/this.durationMs,[.17,.35,.54,.72,.87]);
    const density=Math.max(.74,this.intensity)*(this.bossPhase===1?1.08:1);
    if(segment===0 && this.spawnClock>=620/density){this.spawnClock=0;this.spawnChaosHatredVolley();}
    else if(segment===1 && this.spawnClock>=1320/density){this.spawnClock=0;this.spawnChaosBrokenHalo();}
    else if(segment===2 && this.spawnClock>=850/density){this.spawnClock=0;this.spawnChaosAssimilationLines();}
    else if(segment===3 && this.spawnClock>=650/density){this.spawnClock=0;this.spawnChaosHeartFragments();}
    else if(segment===4 && this.spawnClock>=1250/density){this.spawnClock=0;this.spawnChaosHatredSweep();}
    else if(segment===5){if(this.spawnClock>=560/density){this.spawnClock=0;Math.random()>.5?this.spawnChaosHatredVolley():this.spawnChaosHeartFragments()}if(this.auxClock>=1750/density){this.auxClock=0;Math.random()>.5?this.spawnChaosBrokenHalo():this.spawnChaosAssimilationLines()}}
    if(this.cosmosMiracleActive && this.lightClock>=2200/density){this.lightClock=0;this.spawnEyesCoverShot();}
    if(this.cosmosMiracleActive && this.monsterClock>=(this.cosmosMonsterTrust?1850:3100)/density){this.monsterClock=0;this.spawnCosmosMonsterCallWave();}
  }

  cosmosChaosTypes(){return new Set(["chaosShard","chaosMirror","chaosOrderNode","chaosHatredOrb","chaosHeartOrb","chaosDarkOrb"])}
  cosmosMiracleHazardTypes(){return new Set(["chaosPanel","chaosProminence","chaosBrokenHalo","chaosAssimilation"])}
  resolveCosmosLunaPulse(now){
    if(now < (this.cosmosActionCooldownUntil??0))return;
    this.cosmosActionCooldownUntil=now+(this.cosmosMiracleActive?900:480);
    const radius=(this.cosmosMiracleActive?Math.max(this.canvas.width,this.canvas.height)*1.4:this.cosmosLunaAssist?92:72)*this.dpr;
    const normalTypes=this.cosmosChaosTypes();
    const miracleHazards=this.cosmosMiracleHazardTypes();
    let targets;
    if(this.cosmosMiracleActive){
      // Miracle Luna's purification is a real field clear. It also erases attacks that
      // are still telegraphing: once the pulse reaches the field, a Chaos wall/beam does
      // not get to finish materialising a frame later.
      targets=this.bullets.filter(x=>!x.dead&&(normalTypes.has(x.type)||miracleHazards.has(x.type))).map(x=>({x,dist:0}));
    }else{
      const limit=this.cosmosLunaAssist?4:2;
      targets=this.bullets.filter(x=>!x.dead&&x.delay<=0&&normalTypes.has(x.type)&&Number.isFinite(x.x)&&Number.isFinite(x.y)).map(x=>({x,dist:Math.hypot(x.x-this.player.x,x.y-this.player.y)})).filter(o=>o.dist<=radius).sort((a,z)=>a.dist-z.dist).slice(0,limit);
    }
    for(const o of targets){
      o.x.dead=true;this.cosmosPurified++;
      const fx=Number.isFinite(o.x.x)?o.x.x:this.player.x, fy=Number.isFinite(o.x.y)?o.x.y:this.player.y;
      this.effects.push({type:"cosmosPurifyPulse",x:fx,y:fy,age:0,life:430,radius:19*this.dpr});
    }
    this.effects.push({type:"cosmosLunaPulse",x:this.player.x,y:this.player.y,age:0,life:420,radius});
    // Clearing a crowded screen must not instantly finish HEART. Reward the act, not every object.
    const gain=this.cosmosMiracleActive?Math.min(3,targets.length):targets.length*4;
    if(targets.length)this.callbacks.onCosmosPurifyPulse?.({count:targets.length,amount:gain,miracle:this.cosmosMiracleActive});
  }
  resolveCosmosCoronaBurst(now){
    if(now<(this.cosmosActionCooldownUntil??0))return;
    this.cosmosActionCooldownUntil=now+650;
    let dx=0,dy=0;if(this.keys.has("a")||this.keys.has("arrowleft"))dx--;if(this.keys.has("d")||this.keys.has("arrowright"))dx++;if(this.keys.has("w")||this.keys.has("arrowup"))dy--;if(this.keys.has("s")||this.keys.has("arrowdown"))dy++;
    if(!dx&&!dy)dy=-1;const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
    const dist=(this.cosmosCoronaAssist?92:68)*this.dpr;const sx=this.player.x,sy=this.player.y;const pad=15*this.dpr;this.player.x=clamp(sx+dx*dist,pad,this.canvas.width-pad);this.player.y=clamp(sy+dy*dist,pad,this.canvas.height-pad);this.player.invulnerableUntil=now+(this.cosmosCoronaAssist?310:235);
    let broken=0;const r=(this.cosmosCoronaAssist?48:38)*this.dpr;
    for(const x of this.bullets){if(x.dead||x.delay>0||!this.cosmosChaosTypes().has(x.type))continue;const vx=this.player.x-sx,vy=this.player.y-sy,wx=x.x-sx,wy=x.y-sy,L=vx*vx+vy*vy||1,t=clamp((wx*vx+wy*vy)/L,0,1),cx=sx+vx*t,cy=sy+vy*t;if(Math.hypot(x.x-cx,x.y-cy)<=r){x.dead=true;broken++;}}
    this.cosmosBroken+=broken;this.effects.push({type:"cosmosCoronaBurst",x:this.player.x,y:this.player.y,age:0,life:330,radius:48*this.dpr});
    this.callbacks.onCosmosCoronaBreak?.({count:broken,damage:broken?Math.min(8,2+broken*2):0});
  }
  resolveCosmosEclipseCut(now){
    if(now<(this.cosmosActionCooldownUntil??0))return;this.cosmosActionCooldownUntil=now+520;
    const radius=(this.cosmosEclipseAssist?145:116)*this.dpr;
    const priority=this.bossPhase===1?new Set(["chaosOrderNode"]):new Set(["chaosOrderNode","chaosHeartOrb","chaosMirror","chaosHatredOrb","chaosShard"]);
    const candidates=this.bullets.filter(x=>!x.dead&&x.delay<=0&&priority.has(x.type)).map(x=>({x,dist:Math.hypot(x.x-this.player.x,x.y-this.player.y)})).filter(o=>o.dist<=radius).sort((a,z)=>a.dist-z.dist);
    const hit=candidates[0];this.effects.push({type:"cosmosEclipseCut",x:this.player.x,y:this.player.y,age:0,life:320,radius});
    if(hit){hit.x.dead=true;this.cosmosBroken++;const perfect=hit.dist<50*this.dpr;const targetType=hit.x.type;this.effects.push({type:"cosmosEclipseBreak",x:hit.x.x,y:hit.x.y,age:0,life:420,radius:24*this.dpr,label:targetType==="chaosOrderNode"&&this.bossPhase===1?"CORE CUT!":perfect?"SEPARATE!":"CUT"});this.callbacks.onCosmosEclipseCut?.({damage:perfect?7:4,gaugeReduce:perfect?12:8,perfect,targetType});}
  }

  spawnChaosMirrorCrescents(harder=false){const d=this.dpr,node=this.chaosNode(),count=harder?7:5,base=Math.atan2(this.player.y-node.y,this.player.x-node.x),speed=(180+this.intensity*22+(harder?28:0))*d;for(let k=0;k<count;k++){const a=base+(k-(count-1)/2)*(harder?.18:.23);this.addBullet({type:"chaosMirror",x:node.x,y:node.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:6*d,damage:harder?11:9,delay:k*45,chaosAffected:true});}}
  spawnChaosOrderNodes(objectiveCore=false){const d=this.dpr;for(let k=0;k<3;k++){const x=(.22+k*.28)*this.canvas.width,y=(.20+Math.random()*.2)*this.canvas.height;const a=Math.atan2(this.player.y-y,this.player.x-x),sp=((objectiveCore?72:135)+this.intensity*(objectiveCore?8:15))*d;this.addBullet({type:"chaosOrderNode",x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:(objectiveCore?10:9)*d,damage:objectiveCore?7:12,delay:(objectiveCore?180+k*180:300+k*150)*this.telegraphScale,chaosAffected:true,objectiveCore});}}
  spawnChaosImpedanceWall(){const d=this.dpr,horizontal=Math.random()>.5,gap=(horizontal?this.canvas.height:this.canvas.width)*(.24+Math.random()*.52);this.addBullet({type:"chaosPanel",orientation:horizontal?"horizontal":"vertical",gap,width:118*d,thickness:24*d,delay:900*this.telegraphScale,life:880,damage:13});}
  spawnChaosProminenceSweep(){const d=this.dpr,orientation=Math.random()>.5?"horizontal":"vertical",span=orientation==="horizontal"?this.canvas.width:this.canvas.height,gap=span*(.26+Math.random()*.48);this.addBullet({type:"chaosProminence",orientation,side:Math.random()>.5?"start":"end",gap,gapWidth:156*d,thickness:30*d,delay:1040*this.telegraphScale,life:1140,damage:13});}
  spawnChaosHatredVolley(){const d=this.dpr,count=6,node=this.chaosNode();for(let k=0;k<count;k++){const a=Math.PI*.18+(Math.PI*.64)*(k/(count-1)),sp=(170+this.intensity*18)*d;this.addBullet({type:"chaosHatredOrb",x:node.x,y:node.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:7*d,damage:11,delay:k*55,chaosAffected:true});}}
  spawnChaosHeartFragments(){const d=this.dpr;for(let k=0;k<3;k++){const side=k%2,x=side?-15*d:this.canvas.width+15*d,y=this.canvas.height*(.3+k*.2),a=Math.atan2(this.player.y-y,this.player.x-x),sp=(120+this.intensity*10)*d;this.addBullet({type:"chaosHeartOrb",x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:(this.cosmosMiracleActive?10:9)*d,damage:this.cosmosMiracleActive?0:10,heartGain:this.cosmosMiracleActive?2:0,sourceLabel:"卡俄斯的犹豫",delay:180*k,chaosAffected:true});}}
  spawnChaosAssimilationLines(){const d=this.dpr,gap=this.canvas.height*(.25+Math.random()*.5);for(let k=0;k<5;k++){const y=25*d+k*(this.canvas.height-50*d)/4;if(Math.abs(y-gap)<55*d)continue;this.addBullet({type:"chaosDarkOrb",x:-15*d,y,vx:(210+this.intensity*20)*d,vy:0,r:6*d,damage:10,delay:k*70,chaosAffected:true});}}
  spawnChaosBrokenHalo(){const d=this.dpr;this.addBullet({type:"chaosBrokenHalo",centerX:this.canvas.width/2,centerY:this.canvas.height/2,startRadius:18*d,endRadius:Math.max(this.canvas.width,this.canvas.height)*.62,gapAngle:Math.random()*Math.PI*2,gapHalf:.48,thickness:13*d,delay:1050*this.telegraphScale,life:1200,damage:14});}
  spawnChaosHatredSweep(){const d=this.dpr;this.addBullet({type:"chaosPanel",orientation:"horizontal",gap:this.canvas.height*(.24+Math.random()*.52),width:132*d,thickness:31*d,delay:960*this.telegraphScale,life:920,damage:14});}
  spawnEyesCoverShot(){const d=this.dpr;let targets=this.bullets.filter(x=>!x.dead&&x.delay<=0&&this.cosmosChaosTypes().has(x.type)).slice(0,2);for(const x of targets){x.dead=true;this.cosmosEyesCleared++;this.effects.push({type:"cosmosEyesShot",x:x.x,y:x.y,age:0,life:430,radius:22*d});}if(targets.length)this.callbacks.onCosmosEyesCover?.({cleared:targets.length});}
  spawnCosmosMonsterCallWave(){
    const d=this.dpr;
    const candidates=this.bullets.filter(x=>!x.dead&&x.delay<=0&&["chaosHatredOrb","chaosDarkOrb","chaosMirror"].includes(x.type));
    const target=candidates.sort((a,b)=>Math.hypot(a.x-this.player.x,a.y-this.player.y)-Math.hypot(b.x-this.player.x,b.y-this.player.y))[0];
    const labels=["LIDORIAS","MOGURUDON","BOLGILS"]; const label=labels[(this.cosmosEyesCleared+this.cosmosPurified+this.cosmosBroken)%labels.length];
    this.effects.push({type:"cosmosMonsterCall",x:this.canvas.width/2,y:this.canvas.height*.72,age:0,life:900,radius:110*d,label});
    if(target){target.type="chaosHeartOrb";target.damage=0;target.heartGain=this.cosmosMonsterTrust?3:2;target.sourceLabel=label;target.r=Math.max(target.r??6*d,9*d);target.chaosAffected=true;this.effects.push({type:"cosmosHeartTurn",x:target.x,y:target.y,age:0,life:650,radius:30*d,label:"HEARD"});}
  }

  runKirieloidPattern() {
    const progress = this.elapsed / this.durationMs;
    const cuts = this.bossPhase > 0 ? [.18, .39, .59, .78] : [.23, .47, .7, .86];
    const segment = this.setSegment(progress, cuts);
    const density = Math.max(.78, this.intensity);

    if (segment === 0 && this.spawnClock >= 520 / density) {
      this.spawnClock = 0;
      this.spawnProphecyRain();
    } else if (segment === 1 && this.spawnClock >= 1180 / density) {
      this.spawnClock = 0;
      this.spawnSacredFireBurst(this.bossPhase > 0 ? 3 : 2);
    } else if (segment === 2 && this.spawnClock >= 940 / density) {
      this.spawnClock = 0;
      this.spawnGateChain();
    } else if (segment === 3 && this.spawnClock >= 560 / density) {
      this.spawnClock = 0;
      this.spawnProphecyRain(true);
    } else if (segment === 4) {
      if (this.spawnClock >= 520 / density) {
        this.spawnClock = 0;
        Math.random() > .48 ? this.spawnProphecyRain(true) : this.spawnGateChain();
      }
      if (this.auxClock >= 1650 / density) {
        this.auxClock = 0;
        this.spawnSacredFireBurst(this.bossPhase > 0 ? 3 : 2);
      }
    }

    if (this.lightClock >= this.gateLightIntervalMs / density) {
      this.lightClock = 0;
      if (!this.bullets.some((bullet) => bullet.type === "gateLight" && !bullet.dead)) this.spawnGateLight();
    }
  }

  runPedoleonPattern() {
    const progress = this.elapsed / this.durationMs;
    const predRatio = clamp((this.predation ?? 0) / Math.max(1, this.predationThreshold ?? 100), 0, 1);
    const density = Math.max(.72, this.intensity) * (1 + predRatio * .28) * (this.nexusMetaField ? 1.08 : 1);
    const segment = this.setSegment(progress, [.22, .45, .68, .84]);

    if (this.feedingCellsSpawned < this.feedingCellsTarget) {
      const interval = this.durationMs / (this.feedingCellsTarget + 1);
      if (this.fragmentClock >= interval * (.82 + Math.random() * .12)) {
        this.fragmentClock = 0;
        this.spawnNexusFeedingCell();
        if (this.nexusPressure && this.feedingCellsSpawned < this.feedingCellsTarget && Math.random() > .5) this.spawnNexusFeedingCell(120);
      }
    }

    if (segment === 0) {
      if (this.spawnClock >= 520 / density) { this.spawnClock = 0; this.spawnNexusPelletFan(false); }
      if (this.auxClock >= 1550 / density) { this.auxClock = 0; this.spawnNexusTentacleLash(false); }
    } else if (segment === 1) {
      if (this.spawnClock >= 1180 / density) { this.spawnClock = 0; this.spawnNexusTentacleLash(true); }
      if (this.auxClock >= 610 / density) { this.auxClock = 0; this.spawnNexusPelletFan(false); }
    } else if (segment === 2) {
      if (this.spawnClock >= 470 / density) { this.spawnClock = 0; this.spawnNexusPelletFan(true); }
      if (this.auxClock >= 1360 / density) { this.auxClock = 0; this.spawnNexusTentacleLash(predRatio > .58); }
    } else if (segment === 3) {
      if (this.spawnClock >= 900 / density) { this.spawnClock = 0; this.spawnNexusTentacleCross(); }
      if (this.auxClock >= 460 / density) { this.auxClock = 0; this.spawnNexusPelletFan(true); }
    } else {
      if (this.spawnClock >= 410 / density) { this.spawnClock = 0; this.spawnNexusPelletFan(true); }
      if (this.auxClock >= (predRatio > .7 ? 720 : 1050) / density) {
        this.auxClock = 0;
        predRatio > .7 || this.nexusMetaField ? this.spawnNexusTentacleCross() : this.spawnNexusTentacleLash(true);
      }
    }
  }

  runThunderDarambiaPattern() {
    const progress = this.elapsed / this.durationMs;
    const density = Math.max(.72, this.intensity) * (this.gingaConductBait ? 1.12 : 1);

    if (this.bossPhase === 0) {
      const segment = this.setSegment(progress, [.24,.48,.72,.88]);
      if (this.spawnClock >= (this.gingaOverload ? 760 : 980) / density) {
        this.spawnClock = 0;
        this.spawnCircuitArc(segment >= 2);
      }
      if (this.auxClock >= (segment >= 2 ? 520 : 690) / density) {
        this.auxClock = 0;
        this.spawnDarambiaPelletWave(segment >= 3);
      }
      return;
    }

    const segment = this.setSegment(progress, [.22,.45,.68,.84]);
    if (this.spawnClock >= (segment >= 2 ? 500 : 620) / density) {
      this.spawnClock = 0;
      this.spawnDarambiaPelletWave(segment >= 2);
    }

    if (this.gingaLiveForm === "black-king") {
      if (this.fragmentClock >= (segment >= 2 ? 820 : 1050) / density) {
        this.fragmentClock = 0;
        this.spawnCircuitArc(segment >= 2);
      }
    } else {
      const target = this.gingaConductTarget + (this.gingaConductBait ? 2 : 0);
      if (this.fragmentClock >= (this.durationMs / (target + 1)) / density && this.gingaConductSpawned < target) {
        this.fragmentClock = 0;
        this.spawnConductBolt();
      }
    }

    if (this.auxClock >= (segment >= 3 ? 1250 : 1680) / density) {
      this.auxClock = 0;
      this.spawnLightningColumn(segment >= 3);
    }
  }

  runSuperGrandKingPattern() {
    const progress = this.elapsed / this.durationMs;
    const density = Math.max(.78, this.intensity);

    if (this.mode === "memory") {
      if (this.memoryShardsSpawned < this.rescueShardTarget) {
        const interval = this.durationMs / (this.rescueShardTarget + 1);
        if (this.fragmentClock >= interval) {
          this.fragmentClock = 0;
          this.spawnMemoryShard();
        }
      }
      if (this.spawnClock >= (this.rescueBoost ? 520 : 690) / density) {
        this.spawnClock = 0;
        this.spawnMemoryThorn(this.rescueBoost);
      }
      if (this.auxClock >= 1550 / density) {
        this.auxClock = 0;
        this.spawnMemorySweep(this.rescueBoost);
      }
      return;
    }

    const segment = this.setSegment(progress, [.23,.48,.72,.87]);
    if (segment === 0) {
      if (this.spawnClock >= 620/density) { this.spawnClock=0; this.spawnGrandArmorVolley(false); }
      if (this.auxClock >= 1650/density) { this.auxClock=0; this.spawnGrandBeam(false); }
    } else if (segment === 1) {
      if (this.spawnClock >= 520/density) { this.spawnClock=0; this.spawnGrandArmorVolley(this.bossPhase>0); }
      if (this.auxClock >= 1350/density) { this.auxClock=0; this.spawnGrandClawShock(); }
    } else if (segment === 2) {
      if (this.spawnClock >= 1180/density) { this.spawnClock=0; this.spawnGrandBeam(this.bossPhase>0); }
      if (this.auxClock >= 530/density) { this.auxClock=0; this.spawnGrandArmorVolley(true); }
    } else {
      if (this.spawnClock >= 470/density) { this.spawnClock=0; this.spawnGrandArmorVolley(true); }
      if (this.auxClock >= 1200/density) { this.auxClock=0; Math.random()>.5 ? this.spawnGrandBeam(true) : this.spawnGrandClawShock(); }
    }

    if (this.bossPhase > 0 && this.allySignalsSpawned < this.allySignalTarget && this.lightClock >= this.durationMs/(this.allySignalTarget+1)) {
      this.lightClock = 0;
      this.spawnAllySignal();
    }
    if (this.bossPhase > 0 && this.allyAutoSupport && this.monsterClock >= 2450/density) {
      this.monsterClock = 0;
      this.spawnAllyCrossfire();
    }
  }

  runDarkLugielFuturePattern() {
    this.updateStasisClock();
    const progress = this.elapsed / this.durationMs;
    const segment = this.setSegment(progress, [.17,.34,.51,.68,.84]);
    const final = this.bossPhase >= 2;
    const mid = this.bossPhase === 1;
    const density = Math.max(.8, this.intensity) * (1 + (this.stasisGauge/100)*.12) * (final ? 1.08 : 1);

    if (!this.stasisActive) {
      // Stasis shards remain the vocabulary of FUTURE, but Lugiel now fights around them instead of only firing them.
      const shardInterval = final ? 610 : mid ? 690 : 760;
      if (this.spawnClock >= shardInterval / density) {
        this.spawnClock = 0;
        this.spawnStasisShard(this.bossPhase > 0);
      }

      if (segment === 0 && this.auxClock >= (final ? 980 : 1220) / density) {
        this.auxClock = 0;
        this.spawnLugielDarkSlash(false, final || mid);
      } else if (segment === 1 && this.auxClock >= (final ? 1180 : 1450) / density) {
        this.auxClock = 0;
        this.spawnLugielSpearRain(final || mid);
      } else if (segment === 2 && this.auxClock >= (final ? 1250 : 1580) / density) {
        this.auxClock = 0;
        this.spawnLugielBladeGate(final);
      } else if (segment === 3 && this.auxClock >= (final ? 1180 : 1500) / density) {
        this.auxClock = 0;
        this.spawnLugielDarkSlash(true, final);
      } else if (segment === 4 && this.auxClock >= (final ? 1320 : 1660) / density) {
        this.auxClock = 0;
        this.spawnLugielClockSweep(final);
      } else if (segment === 5) {
        if (this.auxClock >= (final ? 980 : 1340) / density) {
          this.auxClock = 0;
          const pick = Math.floor(Math.random() * (final ? 4 : 3));
          if (pick === 0) this.spawnLugielDarkSlash(Math.random()>.45, final);
          else if (pick === 1) this.spawnLugielBladeGate(final);
          else if (pick === 2) this.spawnLugielSpearRain(final);
          else this.spawnLugielClockSweep(true);
        }
      }

      // In the rematch, a second pressure layer occasionally overlaps the main attack, but never at bullet-spam density.
      if (final && this.fragmentClock >= 2350 / density) {
        this.fragmentClock = 0;
        Math.random() > .5 ? this.spawnLugielLanceArc(true) : this.spawnLugielDarkSlash(false, false);
      }
    }

    if (final && this.stasisActive) {
      const remaining = Math.max(0, this.futureAnchorsRequired - this.futureAnchorsAwakened - this.futureAnchors);
      if (remaining > 0 && !this.bullets.some((x)=>x.type==="futureAnchor" && !x.dead)) {
        const delayThreshold = this.stasisAnchorBoost ? 120 : 360;
        if (this.lightClock >= delayThreshold) {
          this.lightClock = 0;
          this.spawnFutureAnchor();
        }
      }
    }
  }

  runDarkUltraBrothersPattern() {
    const progress = this.elapsed / this.durationMs;
    const density = Math.max(.76, this.intensity) * (1 + (this.mirrorGauge / 100) * .12) * (this.mirrorBait ? 1.08 : 1);
    const segment = this.setSegment(progress, [.22,.44,.66,.84]);
    const trialInterval = this.durationMs / (this.mirrorTrialsTarget + 1);
    if (this.mirrorTrialsSpawned < this.mirrorTrialsTarget && this.fragmentClock >= trialInterval / density) {
      this.fragmentClock = 0;
      if (!this.bullets.some((b) => b.type === "mirrorSign" && !b.dead)) this.spawnMirrorSignTrial();
    }
    if (segment === 0) {
      if (this.spawnClock >= 560 / density) { this.spawnClock = 0; this.spawnDarkBrotherPellets(false); }
      if (this.auxClock >= 1650 / density) { this.auxClock = 0; this.spawnDarkSpacium(); }
    } else if (segment === 1) {
      if (this.spawnClock >= 1180 / density) { this.spawnClock = 0; this.spawnDarkSluggerFan(); }
      if (this.auxClock >= 610 / density) { this.auxClock = 0; this.spawnDarkBrotherPellets(false); }
    } else if (segment === 2) {
      if (this.spawnClock >= 510 / density) { this.spawnClock = 0; this.spawnDarkBrotherPellets(true); }
      if (this.auxClock >= 1360 / density) { this.auxClock = 0; Math.random() > .5 ? this.spawnDarkSpacium(true) : this.spawnDarkSluggerFan(true); }
    } else {
      if (this.spawnClock >= 430 / density) { this.spawnClock = 0; this.spawnDarkBrotherPellets(true); }
      if (this.auxClock >= (this.bossPhase > 0 ? 980 : 1250) / density) { this.auxClock = 0; Math.random() > .5 ? this.spawnDarkSpacium(true) : this.spawnDarkSluggerFan(true); }
    }
  }

  runDarkLugielPattern() {
    const progress = this.elapsed / this.durationMs;
    const density = Math.max(.8, this.intensity) * (1 + (this.darkSpark / 100) * .22);
    const segment = this.setSegment(progress, [.2,.42,.64,.82]);
    if (segment === 0) {
      if (this.spawnClock >= 500 / density) { this.spawnClock = 0; this.spawnLugielPelletRing(); }
      if (this.auxClock >= 1750 / density) { this.auxClock = 0; this.spawnFreezeRay(); }
    } else if (segment === 1) {
      if (this.spawnClock >= 1100 / density) { this.spawnClock = 0; this.spawnFreezeRay(this.bossPhase > 0); }
      if (this.auxClock >= 560 / density) { this.auxClock = 0; this.spawnLugielPelletRing(true); }
    } else if (segment === 2) {
      if (this.spawnClock >= 520 / density) { this.spawnClock = 0; this.spawnLugielPelletRing(true); }
      if (this.auxClock >= 1420 / density) { this.auxClock = 0; this.spawnTimeStopBand(); }
    } else {
      if (this.spawnClock >= 420 / density) { this.spawnClock = 0; this.spawnLugielPelletRing(true); }
      if (this.auxClock >= (this.bossPhase >= 2 ? 840 : 1120) / density) { this.auxClock = 0; Math.random() > .46 ? this.spawnFreezeRay(true) : this.spawnTimeStopBand(); }
    }
  }

  runLeoGirasReworkPattern() {
    const progress = this.elapsed / this.durationMs;
    const density = Math.max(.76, this.intensity);

    // Magma is never a late reveal here: he is the conductor of the three-way kill from frame one.
    if (this.bossPhase === 0) {
      const segment = this.setSegment(progress, [.22,.45,.68,.84]);
      if (segment === 0) {
        if (this.spawnClock >= 720/density) { this.spawnClock=0; this.spawnLeoTwinRush(); }
        if (this.auxClock >= 1450/density) { this.auxClock=0; this.spawnMagmaSlash(); }
      } else if (segment === 1) {
        if (this.spawnClock >= 1050/density) { this.spawnClock=0; this.spawnLeoTwinCross(); }
        if (this.auxClock >= 1280/density) { this.auxClock=0; this.spawnMagmaSlash(); }
      } else if (segment === 2) {
        if (this.spawnClock >= 620/density) { this.spawnClock=0; this.spawnLeoSidePelletWave(); }
        if (this.auxClock >= 960/density) { this.auxClock=0; Math.random()>.45 ? this.spawnLeoTwinRush(true) : this.spawnMagmaSlash(); }
      } else {
        if (this.spawnClock >= 860/density) { this.spawnClock=0; this.spawnLeoTwinCross(true); }
        if (this.auxClock >= 900/density) { this.auxClock=0; this.spawnMagmaSlash(true); }
      }
      return;
    }

    // The second phase changes the arena itself: the twins weaponize the sea while Magma closes the seam.
    const segment = this.setSegment(progress,[.2,.42,.64,.82]);
    if (segment === 0) {
      if (this.spawnClock >= 1250/density) { this.spawnClock=0; this.spawnGirasTsunami(); }
      if (this.auxClock >= 790/density) { this.auxClock=0; this.spawnLeoTwinRush(true); }
    } else if (segment === 1) {
      if (this.spawnClock >= 920/density) { this.spawnClock=0; this.spawnMagmaSlash(); }
      if (this.auxClock >= 1450/density) { this.auxClock=0; this.spawnGirasTsunami(true); }
    } else if (segment === 2) {
      if (this.spawnClock >= 960/density) { this.spawnClock=0; this.spawnLeoTwinCross(true); }
      if (this.auxClock >= 1320/density) { this.auxClock=0; this.spawnGirasTsunami(true); }
    } else {
      if (this.spawnClock >= 720/density) { this.spawnClock=0; Math.random()>.5?this.spawnLeoTwinRush(true):this.spawnMagmaSlash(true); }
      if (this.auxClock >= 1220/density) { this.auxClock=0; this.spawnGirasTsunami(true); }
    }
  }

  runPressurePattern() {
    const progress = this.elapsed / this.durationMs;
    const density = Math.max(.72, this.intensity);

    if (this.bossPhase === 0) {
      const segment=this.setSegment(progress,[.24,.48,.7,.86]);
      if (segment===0 && this.spawnClock>=760/density) { this.spawnClock=0; this.spawnPressureOrbFan(false,false); }
      else if (segment===1 && this.spawnClock>=1180/density) { this.spawnClock=0; this.spawnPressureFloatDebris(false,false); }
      else if (segment===2 && this.spawnClock>=1320/density) { this.spawnClock=0; this.spawnPressureWarpSweep(); }
      else if (segment>=3) {
        if (this.spawnClock>=690/density) { this.spawnClock=0; this.spawnPressureOrbFan(true,false); }
        if (this.auxClock>=1550/density) { this.auxClock=0; this.spawnPressureFloatDebris(true,false); }
      }
      return;
    }

    if (this.bossPhase === 1) {
      // Tiny Leo is not facing "larger bullets"; the same mundane world has become architecture.
      const segment=this.setSegment(progress,[.22,.45,.68,.84]);
      if (segment===0 && this.spawnClock>=950/density) { this.spawnClock=0; this.spawnPressureFloatDebris(false,true); }
      else if (segment===1 && this.spawnClock>=1450/density) { this.spawnClock=0; this.spawnPressureBalloon(); }
      else if (segment===2 && this.spawnClock>=760/density) { this.spawnClock=0; this.spawnPressureOrbFan(true,false); }
      else if (segment>=3) {
        if (this.spawnClock>=810/density) { this.spawnClock=0; this.spawnPressureFloatDebris(true,true); }
        if (this.auxClock>=1850/density) { this.auxClock=0; this.spawnPressureBalloon(); }
      }
      return;
    }

    // Ultra Mantle turns Pressure's own magic into the attack language of the phase.
    const segment=this.setSegment(progress,[.22,.46,.69,.85]);
    if (segment===0 && this.spawnClock>=690/density) { this.spawnClock=0; this.spawnPressureOrbFan(false,true); }
    else if (segment===1 && this.spawnClock>=1040/density) { this.spawnClock=0; this.spawnPressureWarpSweep(true); }
    else if (segment===2 && this.spawnClock>=610/density) { this.spawnClock=0; this.spawnPressureOrbFan(true,true); }
    else if (segment>=3) {
      if (this.spawnClock>=590/density) { this.spawnClock=0; this.spawnPressureOrbFan(true,true); }
      if (this.auxClock>=1380/density) { this.auxClock=0; this.spawnPressureFloatDebris(true,false); }
    }
  }

  fireNexusShot(now = performance.now()) {
    const cooldown = this.nexusShootAssist ? 86 : 118;
    if (now - (this.lastNexusShotAt ?? 0) < cooldown) return false;
    this.lastNexusShotAt = now;
    const dpr = this.dpr;
    this.addBullet({
      type:"nexusFriendlyShot", friendly:true,
      x:this.player.x, y:this.player.y-9*dpr,
      vx:0, vy:-(this.nexusForm === "junis-blue" ? 535 : 470)*dpr,
      r:(this.nexusShootAssist?4.2:3.5)*dpr, damage:0, life:1600
    });
    this.effects.push({type:"nexusShot",x:this.player.x,y:this.player.y-10*dpr,age:0,life:150,radius:13*dpr});
    return true;
  }

  resolveNexusAnphansPulse(now = performance.now()) {
    const dpr=this.dpr;
    const radius=(this.nexusCounterAssist?68:52)*dpr;
    this.effects.push({type:"nexusPulse",x:this.player.x,y:this.player.y,age:0,life:220,radius});
    let best=null,bestDist=Infinity;
    for(const bullet of this.bullets){
      if(bullet.dead || !["zagiOrb","zagiNeedle"].includes(bullet.type)) continue;
      const dist=Math.hypot(bullet.x-this.player.x,bullet.y-this.player.y);
      if(dist<=radius+(bullet.r??0) && dist<bestDist){best=bullet;bestDist=dist;}
    }
    if(!best) return false;
    best.dead=true;
    this.nexusNeutralized=(this.nexusNeutralized??0)+1;
    this.effects.push({type:"nexusBreak",x:best.x,y:best.y,age:0,life:300,radius:18*dpr,label:"BREAK"});
    this.callbacks.onNexusShot?.({damage:1,bondGain:2,gaugeReduce:0,perfect:bestDist<=28*dpr,source:"anphans-pulse"});
    return true;
  }

  runMephistoOnePattern() {
    const progress=this.elapsed/this.durationMs;
    const density=Math.max(.70,this.intensity);
    const seg=this.setSegment(progress,[.17,.34,.52,.70,.86]);
    const phase=this.bossPhase??0;

    // Himeya's first section is intentionally readable: the drama comes from exhaustion, not unreadable spam.
    if(phase===0){
      if(seg===0 && this.spawnClock>=980/density){this.spawnClock=0;this.spawnMephistoSpearFan(false);}
      else if(seg===1 && this.spawnClock>=1380/density){this.spawnClock=0;this.spawnMephistoClaw(false);}
      else if(seg===2 && this.spawnClock>=1450/density){this.spawnClock=0;this.spawnMephistoCross(false);}
      else if(seg===3){
        if(this.spawnClock>=1080/density){this.spawnClock=0;this.spawnMephistoSpearFan(false);}
        if(this.auxClock>=1780/density){this.auxClock=0;this.spawnMephistoClaw(false);}
      } else if(seg>=4 && this.spawnClock>=1180/density){this.spawnClock=0;Math.random()>.48?this.spawnMephistoCross(false):this.spawnMephistoSpearFan(true);}
      return;
    }

    // At 1 HP the player cannot die, but the field should feel merciless and relentless.
    if(phase===1){
      if(seg===0 && this.spawnClock>=780/density){this.spawnClock=0;this.spawnMephistoSpearFan(true);}
      else if(seg===1 && this.spawnClock>=1080/density){this.spawnClock=0;this.spawnMephistoClaw(true);}
      else if(seg===2){
        if(this.spawnClock>=980/density){this.spawnClock=0;this.spawnMephistoCross(false);}
        if(this.auxClock>=1550/density){this.auxClock=0;this.spawnMephistoSpearFan(false);}
      } else if(seg===3 && this.spawnClock>=840/density){this.spawnClock=0;this.spawnMephistoSpearFan(true);}
      else if(seg>=4){
        if(this.spawnClock>=900/density){this.spawnClock=0;this.spawnMephistoClaw(Math.random()>.5);}
        if(this.auxClock>=1450/density){this.auxClock=0;this.spawnMephistoCross(true);}
      }
      return;
    }

    // Restored Junis: a proper final duel, with multiple attack languages and enough gaps to counterattack.
    if(seg===0){
      if(this.spawnClock>=700/density){this.spawnClock=0;this.spawnMephistoSpearFan(true);}
      if(this.auxClock>=1540/density){this.auxClock=0;this.spawnMephistoCross(false);}
    } else if(seg===1){
      if(this.spawnClock>=920/density){this.spawnClock=0;this.spawnMephistoClaw(true);}
      if(this.auxClock>=1710/density){this.auxClock=0;this.spawnMephistoSpearFan(false);}
    } else if(seg===2){
      if(this.spawnClock>=860/density){this.spawnClock=0;this.spawnMephistoCross(true);}
    } else {
      if(this.spawnClock>=740/density){this.spawnClock=0;Math.random()>.5?this.spawnMephistoSpearFan(true):this.spawnMephistoClaw(true);}
      if(this.auxClock>=1370/density){this.auxClock=0;this.spawnMephistoCross(Math.random()>.45);}
    }
  }

  runMephistoZweiPattern() {
    const progress=this.elapsed/this.durationMs;
    const density=Math.max(.74,this.intensity);
    const seg=this.setSegment(progress,[.18,.36,.55,.73,.88]);
    const phase=this.bossPhase??0;
    const assist=this.mizorogiAssist;
    const pace=assist?.92:1;

    if(phase===0){
      if(seg===0 && this.spawnClock>=760/density){this.spawnClock=0;this.spawnMephistoSpearFan(false);}
      else if(seg===1 && this.spawnClock>=1120/density){this.spawnClock=0;this.spawnMephistoEyeTargets(2);}
      else if(seg===2 && this.spawnClock>=1280/density){this.spawnClock=0;this.spawnMephistoClaw(false);}
      else if(seg===3){
        if(this.spawnClock>=820/density){this.spawnClock=0;this.spawnMephistoSpearFan(true);}
        if(this.auxClock>=1550/density){this.auxClock=0;this.spawnMephistoEyeTargets(1);}
      } else if(seg>=4){
        if(this.spawnClock>=980/density){this.spawnClock=0;this.spawnMephistoCross(false);}
        if(this.auxClock>=1260/density){this.auxClock=0;this.spawnMephistoEyeTargets(2);}
      }
      return;
    }

    if(phase===1){
      if(seg===0){
        if(this.spawnClock>=840/density){this.spawnClock=0;this.spawnMephistoDrainOrbs(this.nexusShootBait?3:2);}
        if(this.auxClock>=1420/density){this.auxClock=0;this.spawnMephistoSpearFan(false);}
      } else if(seg===1){
        if(this.spawnClock>=1040/density){this.spawnClock=0;this.spawnMephistoEyeTargets(this.nexusShootBait?3:2);}
        if(this.auxClock>=1380/density){this.auxClock=0;this.spawnMephistoClaw(true);}
      } else if(seg===2){
        if(this.spawnClock>=930/density){this.spawnClock=0;this.spawnMephistoDrainOrbs(2);}
        if(this.auxClock>=1560/density){this.auxClock=0;this.spawnMephistoCross(true);}
      } else if(seg===3){
        if(this.spawnClock>=700/density){this.spawnClock=0;this.spawnMephistoSpearFan(true);}
        if(this.auxClock>=1300/density){this.auxClock=0;this.spawnMephistoEyeTargets(2);}
      } else {
        if(this.spawnClock>=790/density){this.spawnClock=0;Math.random()>.5?this.spawnMephistoDrainOrbs(2):this.spawnMephistoSpearFan(true);}
        if(this.auxClock>=1480/density){this.auxClock=0;Math.random()>.5?this.spawnMephistoClaw(true):this.spawnMephistoCross(false);}
      }
      return;
    }

    // Mizorogi's restraint does not end the battle for the player. It creates cleaner, readable shots.
    if(seg===0){
      if(this.spawnClock>=980/(density*pace)){this.spawnClock=0;this.spawnMephistoEyeTargets(3,true);}
      if(this.auxClock>=1580/(density*pace)){this.auxClock=0;this.spawnMephistoSpearFan(false);}
    } else if(seg===1){
      if(this.spawnClock>=1060/(density*pace)){this.spawnClock=0;this.spawnMephistoDrainOrbs(2,true);}
      if(this.auxClock>=1750/(density*pace)){this.auxClock=0;this.spawnMephistoClaw(false);}
    } else if(seg===2){
      if(this.spawnClock>=930/(density*pace)){this.spawnClock=0;this.spawnMephistoEyeTargets(2,true);}
      if(this.auxClock>=1660/(density*pace)){this.auxClock=0;this.spawnMephistoCross(false);}
    } else {
      if(this.spawnClock>=820/(density*pace)){this.spawnClock=0;this.spawnMephistoEyeTargets(2,true);}
      if(this.auxClock>=1450/(density*pace)){this.auxClock=0;Math.random()>.5?this.spawnMephistoSpearFan(true):this.spawnMephistoDrainOrbs(1,true);}
    }
  }

  runDarkZagiPattern() {
    const progress=this.elapsed/this.durationMs;
    const density=Math.max(.76,this.intensity);
    const seg=this.setSegment(progress,[.16,.33,.50,.67,.83]);
    const phase=this.bossPhase??0;

    if(phase===0){
      // Anphans: survive, read, and break nearby darkness with a short pulse.
      if(seg===0 && this.spawnClock>=620/density){this.spawnClock=0;this.spawnZagiOrbFan(false);}
      else if(seg===1 && this.spawnClock>=1080/density){this.spawnClock=0;this.spawnZagiClawSweep(false);}
      else if(seg===2 && this.spawnClock>=1250/density){this.spawnClock=0;this.spawnZagiShockRing(false);}
      else if(seg===3){
        if(this.spawnClock>=720/density){this.spawnClock=0;this.spawnZagiAimedTriple();}
        if(this.auxClock>=1560/density){this.auxClock=0;this.spawnZagiClawSweep(false);}
      } else {
        if(this.spawnClock>=680/density){this.spawnClock=0;this.spawnZagiOrbFan(true);}
        if(this.auxClock>=1700/density){this.auxClock=0;this.spawnZagiShockRing(false);}
      }
      return;
    }

    if(phase===1){
      // Junis: Z becomes a close counter. Zagi deliberately enters striking distance.
      if(seg===0 && this.spawnClock>=930/density){this.spawnClock=0;this.spawnZagiRush(false);}
      else if(seg===1 && this.spawnClock>=1180/density){this.spawnClock=0;this.spawnZagiBeamSweep(false);}
      else if(seg===2){
        if(this.spawnClock>=760/density){this.spawnClock=0;this.spawnZagiOrbFan(true);}
        if(this.auxClock>=1320/density){this.auxClock=0;this.spawnZagiRush(true);}
      } else if(seg===3 && this.spawnClock>=1320/density){this.spawnClock=0;this.spawnZagiCrossLanes();}
      else {
        if(this.spawnClock>=850/density){this.spawnClock=0;Math.random()>.48?this.spawnZagiRush(true):this.spawnZagiAimedTriple();}
        if(this.auxClock>=1620/density){this.auxClock=0;this.spawnZagiBeamSweep(true);}
      }
      return;
    }

    if(phase===2){
      // Junis Blue: speed and shooting. Dark nodes are attack objects, not decorative targets.
      if(seg===0){
        if(this.spawnClock>=820/density){this.spawnClock=0;this.spawnZagiDarkNodes(this.nexusShootBait?3:2);}
        if(this.auxClock>=1330/density){this.auxClock=0;this.spawnZagiNeedleRain(false);}
      } else if(seg===1 && this.spawnClock>=1040/density){this.spawnClock=0;this.spawnZagiTeleportCross();}
      else if(seg===2){
        if(this.spawnClock>=760/density){this.spawnClock=0;this.spawnZagiNeedleRain(true);}
        if(this.auxClock>=1440/density){this.auxClock=0;this.spawnZagiDarkNodes(2);}
      } else if(seg===3){
        if(this.spawnClock>=980/density){this.spawnClock=0;this.spawnZagiHomingOrbs();}
        if(this.auxClock>=1570/density){this.auxClock=0;this.spawnZagiTeleportCross();}
      } else {
        if(this.spawnClock>=720/density){this.spawnClock=0;Math.random()>.48?this.spawnZagiNeedleRain(true):this.spawnZagiDarkNodes(2);}
        if(this.auxClock>=1550/density){this.auxClock=0;Math.random()>.5?this.spawnZagiHomingOrbs():this.spawnZagiTeleportCross();}
      }
      return;
    }

    // Noa: enormous attacks, but fewer overlapping hazards. Z returns specific red spheres.
    if(seg===0 && this.spawnClock>=1100/density){this.spawnClock=0;this.spawnZagiReturnOrb(false);}
    else if(seg===1 && this.spawnClock>=1480/density){this.spawnClock=0;this.spawnZagiLightning();}
    else if(seg===2){
      if(this.spawnClock>=1220/density){this.spawnClock=0;this.spawnZagiShockRing(true);}
      if(this.auxClock>=1780/density){this.auxClock=0;this.spawnZagiReturnOrb(false);}
    } else if(seg===3 && this.spawnClock>=1360/density){this.spawnClock=0;this.spawnZagiCosmicSweep();}
    else if(seg===4){
      if(this.spawnClock>=980/density){this.spawnClock=0;this.spawnZagiReturnOrb(true);}
      if(this.auxClock>=1840/density){this.auxClock=0;this.spawnZagiLightning();}
    } else {
      if(this.spawnClock>=1040/density){this.spawnClock=0;Math.random()>.5?this.spawnZagiReturnOrb(true):this.spawnZagiOrbFan(true);}
      if(this.auxClock>=1900/density){this.auxClock=0;Math.random()>.5?this.spawnZagiCosmicSweep():this.spawnZagiShockRing(true);}
    }
  }

  spawnMephistoSpearFan(harder=false){
    const dpr=this.dpr, count=harder?6:4;
    const fromLeft=Math.random()>.5, x=fromLeft?-16*dpr:this.canvas.width+16*dpr, y=this.canvas.height*(.18+Math.random()*.25);
    const base=Math.atan2(this.player.y-y,this.player.x-x),spread=harder?.72:.52,speed=(205+(harder?34:0)+this.intensity*18)*dpr;
    for(let i=0;i<count;i++){
      const a=base-spread/2+spread*(i/Math.max(1,count-1));
      this.addBullet({type:"mephistoSpear",x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:5.4*dpr,damage:harder?11:9,delay:(180+i*70)*this.telegraphScale,spin:(i%2?1:-1)*1.2});
    }
  }

  spawnMephistoEyeTargets(count=2, restrained=false){
    const dpr=this.dpr;
    for(let i=0;i<count;i++){
      const x=this.canvas.width*(.16+Math.random()*.68), y=(34+Math.random()*78)*dpr;
      this.addBullet({type:"mephistoTarget",shootable:true,x,y,vx:(Math.random()-.5)*18*dpr,vy:(restrained?18:30)*dpr,r:(restrained?10.5:9)*dpr,damage:8,life:3000,delay:(240+i*180)*this.telegraphScale,restrained});
    }
  }

  spawnMephistoDrainOrbs(count=2, restrained=false){
    const dpr=this.dpr;
    for(let i=0;i<count;i++){
      const x=this.canvas.width*(.18+Math.random()*.64), y=-18*dpr;
      const tx=this.player.x+(Math.random()-.5)*50*dpr,ty=this.player.y;
      const a=Math.atan2(ty-y,tx-x),speed=(restrained?130:158+this.intensity*12)*dpr;
      this.addBullet({type:"mephistoDrainOrb",shootable:true,x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:10*dpr,damage:12,life:3300,delay:(300+i*220)*this.telegraphScale,drainGain:restrained?7:11});
    }
  }

  spawnMephistoClaw(harder=false){
    const dpr=this.dpr,vertical=Math.random()>.5,center=vertical?this.canvas.width*(.22+Math.random()*.56):this.canvas.height*(.24+Math.random()*.52);
    this.addBullet({type:"mephistoClaw",orientation:vertical?"vertical":"horizontal",center,width:(harder?34:28)*dpr,delay:(harder?690:820)*this.telegraphScale,life:520,damage:harder?15:12});
  }

  spawnMephistoCross(harder=false){
    const dpr=this.dpr;
    this.addBullet({type:"mephistoCross",cx:this.canvas.width*(.25+Math.random()*.5),cy:this.canvas.height*(.26+Math.random()*.48),width:(harder?30:25)*dpr,delay:(harder?760:900)*this.telegraphScale,life:480,damage:harder?16:13});
  }

  spawnZagiOrbFan(harder=false){
    const dpr=this.dpr,count=harder?7:5, cx=this.canvas.width/2,cy=24*dpr;
    const base=Math.atan2(this.player.y-cy,this.player.x-cx),spread=harder?1.28:.92,speed=(175+this.intensity*22+(harder?25:0))*dpr;
    for(let i=0;i<count;i++){
      const a=base-spread/2+spread*(i/Math.max(1,count-1));
      this.addBullet({type:"zagiOrb",x:cx,y:cy,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:5.3*dpr,damage:harder?11:9,delay:(150+i*65)*this.telegraphScale});
    }
  }

  spawnZagiAimedTriple(){
    const dpr=this.dpr;
    for(let i=0;i<3;i++){
      const x=(i+1)*this.canvas.width/4,y=-10*dpr;
      const a=Math.atan2(this.player.y-y,this.player.x-x),speed=(235+this.intensity*18)*dpr;
      this.addBullet({type:"zagiNeedle",x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:4*dpr,damage:10,delay:(240+i*170)*this.telegraphScale,telegraph:{x1:x,y1:y,x2:this.player.x,y2:this.player.y}});
    }
  }

  spawnZagiClawSweep(harder=false){
    const dpr=this.dpr,fromLeft=Math.random()>.5;
    const y1=this.canvas.height*(fromLeft?.18:.82), y2=this.canvas.height*(fromLeft?.82:.18);
    this.addBullet({type:"zagiSweep",x1:0,y1,x2:this.canvas.width,y2,width:(harder?27:22)*dpr,delay:(harder?720:880)*this.telegraphScale,life:460,damage:harder?16:13});
  }

  spawnZagiShockRing(harder=false){
    const dpr=this.dpr;
    const safeAngle=Math.random()*Math.PI*2;
    this.addBullet({
      type:"zagiShockRing",
      x:this.canvas.width/2,
      y:this.canvas.height*.47,
      startRadius:18*dpr,
      endRadius:Math.hypot(this.canvas.width,this.canvas.height)*.66,
      width:(harder?15:12)*dpr,
      delay:(harder?900:1040)*this.telegraphScale,
      life:1280,
      damage:harder?15:12,
      // The old full 360° expanding ring was mathematically unavoidable without a dash.
      // Two opposite broken sectors turn it into a positioning read instead of guaranteed damage.
      safeAngle,
      safeHalfAngle:harder?.40:.52
    });
  }

  spawnZagiRush(harder=false){
    const dpr=this.dpr,fromLeft=Math.random()>.5,y=this.canvas.height*(.28+Math.random()*.48),speed=(325+this.intensity*28+(harder?45:0))*dpr;
    this.addBullet({type:"zagiRush",x:fromLeft?-42*dpr:this.canvas.width+42*dpr,y,vx:(fromLeft?1:-1)*speed,vy:0,r:17*dpr,damage:harder?18:15,delay:(harder?520:680)*this.telegraphScale,telegraphY:y,harder});
  }

  spawnZagiBeamSweep(harder=false){
    const dpr=this.dpr,vertical=Math.random()>.5,center=vertical?this.canvas.width*(.22+Math.random()*.56):this.canvas.height*(.22+Math.random()*.56);
    this.addBullet({type:"zagiLightning",orientation:vertical?"vertical":"horizontal",center,width:(harder?42:34)*dpr,delay:(harder?700:850)*this.telegraphScale,life:520,damage:harder?17:14});
  }

  spawnZagiCrossLanes(){
    const dpr=this.dpr,cx=this.canvas.width*(.28+Math.random()*.44),cy=this.canvas.height*(.28+Math.random()*.44);
    this.addBullet({type:"mephistoCross",zagi:true,cx,cy,width:28*dpr,delay:840*this.telegraphScale,life:520,damage:16});
  }

  spawnZagiDarkNodes(count=2){
    const dpr=this.dpr;
    for(let i=0;i<count;i++){
      const x=this.canvas.width*(.16+Math.random()*.68),y=(35+Math.random()*92)*dpr;
      this.addBullet({type:"zagiDarkNode",shootable:true,x,y,vx:(Math.random()-.5)*28*dpr,vy:(30+Math.random()*18)*dpr,r:10*dpr,damage:11,life:3300,delay:(220+i*180)*this.telegraphScale});
    }
  }

  spawnZagiNeedleRain(harder=false){
    const dpr=this.dpr,count=harder?8:6,gap=this.canvas.width*(.2+Math.random()*.6),spacing=this.canvas.width/(count+1);
    for(let i=1;i<=count;i++){
      const x=i*spacing;
      if(Math.abs(x-gap)<(harder?38:48)*dpr) continue;
      this.addBullet({type:"zagiNeedle",x,y:-10*dpr,vx:(Math.random()-.5)*16*dpr,vy:(235+(harder?35:0))*dpr,r:4.1*dpr,damage:10,delay:(Math.random()*160)*this.telegraphScale});
    }
  }

  spawnZagiTeleportCross(){
    const dpr=this.dpr;
    const cx=this.canvas.width*(.24+Math.random()*.52),cy=this.canvas.height*(.26+Math.random()*.46);
    this.addBullet({type:"mephistoCross",zagi:true,cx,cy,width:25*dpr,delay:720*this.telegraphScale,life:430,damage:15});
    this.spawnZagiDarkNodes(1);
  }

  spawnZagiHomingOrbs(){
    const dpr=this.dpr;
    for(let i=0;i<4;i++){
      const fromLeft=i%2===0,x=fromLeft?-12*dpr:this.canvas.width+12*dpr,y=this.canvas.height*(.18+i*.2);
      const a=Math.atan2(this.player.y-y,this.player.x-x),speed=(185+i*8)*dpr;
      this.addBullet({type:"zagiHoming",x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:6*dpr,damage:11,life:3000,homing:.72,delay:(i*130)*this.telegraphScale});
    }
  }

  spawnZagiReturnOrb(harder=false){
    const dpr=this.dpr,x=this.canvas.width*(.25+Math.random()*.5),y=-24*dpr;
    const a=Math.atan2(this.player.y-y,this.player.x-x),speed=(harder?185:155)*dpr;
    this.addBullet({type:"zagiReturnOrb",x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:(harder?14:12)*dpr,damage:harder?18:15,life:3600,delay:(harder?580:720)*this.telegraphScale,returning:false,harder});
  }

  spawnZagiLightning(){
    const dpr=this.dpr,center=this.canvas.width*(.18+Math.random()*.64);
    this.addBullet({type:"zagiLightning",orientation:"vertical",center,width:48*dpr,delay:980*this.telegraphScale,life:620,damage:20});
  }

  spawnZagiCosmicSweep(){
    const dpr=this.dpr,fromLeft=Math.random()>.5;
    this.addBullet({type:"zagiSweep",x1:0,y1:fromLeft?this.canvas.height*.18:this.canvas.height*.82,x2:this.canvas.width,y2:fromLeft?this.canvas.height*.82:this.canvas.height*.18,width:31*dpr,delay:980*this.telegraphScale,life:560,damage:19});
  }

  runBlackEndPattern() {
    const progress=this.elapsed/this.durationMs;
    const density=Math.max(.80,this.intensity + (this.bossPhase>=2 ? .05 : 0));

    // Opening: every segment has a named attack language. No more long empty stretches.
    if (this.bossPhase < 2) {
      const segment=this.setSegment(progress,[.18,.38,.58,.78,.9]);
      if (segment===0) {
        if (this.spawnClock>=620/density) { this.spawnClock=0; this.spawnBlackFlameCone(); }
        if (this.auxClock>=1180/density) { this.auxClock=0; this.spawnBlackEndCharge(); }
      } else if (segment===1) {
        if (this.spawnClock>=980/density) { this.spawnClock=0; this.spawnBlackEndFlameRain(false); }
        if (this.auxClock>=760/density) { this.auxClock=0; this.spawnBlackEndHornCross(); }
      } else if (segment===2) {
        if (this.spawnClock>=760/density) { this.spawnClock=0; this.spawnBlackEndDiscVolley(false); }
        if (this.auxClock>=1040/density) { this.auxClock=0; this.spawnBlackEndCharge(true); }
      } else if (segment===3) {
        if (this.spawnClock>=1260/density) { this.spawnClock=0; this.spawnBlackEndHornCage(false); }
        if (this.auxClock>=690/density) { this.auxClock=0; this.spawnBlackFlame(true); }
      } else {
        if (this.spawnClock>=670/density) { this.spawnClock=0; this.spawnBlackEndDiscVolley(true); }
        if (this.auxClock>=980/density) { this.auxClock=0; Math.random()>.45?this.spawnBlackEndHornCross(true):this.spawnBlackEndFlameRain(true); }
      }
      return;
    }

    // Command severed: Black End becomes less controlled and much more dangerous.
    // This is the real final combat stretch before the crystal can be used.
    const segment=this.setSegment(progress,[.16,.34,.52,.7,.86]);
    if (segment===0) {
      if (this.spawnClock>=790/density) { this.spawnClock=0; this.spawnBlackEndCharge(true); }
      if (this.auxClock>=1260/density) { this.auxClock=0; this.spawnBlackEndFlameRain(true); }
    } else if (segment===1) {
      if (this.spawnClock>=980/density) { this.spawnClock=0; this.spawnBlackEndDiscVolley(true); }
      if (this.auxClock>=1400/density) { this.auxClock=0; this.spawnBlackEndHornCross(true); }
    } else if (segment===2) {
      if (this.spawnClock>=1580/density) { this.spawnClock=0; this.spawnBlackEndHornCage(true); }
      if (this.auxClock>=970/density) { this.auxClock=0; this.spawnBlackFlameCone(); }
    } else if (segment===3) {
      if (this.spawnClock>=900/density) { this.spawnClock=0; this.spawnBlackEndDiscVolley(true); }
      if (this.auxClock>=1240/density) { this.auxClock=0; this.spawnBlackEndCharge(true); }
    } else {
      if (this.spawnClock>=800/density) { this.spawnClock=0; Math.random()>.5?this.spawnBlackEndCharge(true):this.spawnBlackEndDiscVolley(true); }
      if (this.auxClock>=1320/density) { this.auxClock=0; Math.random()>.5?this.spawnBlackEndHornCage(true):this.spawnBlackEndFlameRain(true); }
    }
  }

  runLeoGirasPattern() {
    const progress = this.elapsed / this.durationMs;
    const density = Math.max(.76, this.intensity);

    if (this.bossPhase === 0) {
      const segment = this.setSegment(progress, [.24, .48, .72, .88]);
      if (segment === 0) {
        if (this.spawnClock >= 720 / density) { this.spawnClock = 0; this.spawnLeoTwinRush(); }
        if (this.auxClock >= 430 / density) { this.auxClock = 0; this.spawnLeoSidePelletWave(); }
      } else if (segment === 1) {
        if (this.spawnClock >= 1180 / density) { this.spawnClock = 0; this.spawnLeoTwinCross(); }
        if (this.auxClock >= 520 / density) { this.auxClock = 0; this.spawnLeoSidePelletWave(); }
      } else if (segment === 2) {
        if (this.spawnClock >= 780 / density) { this.spawnClock = 0; this.spawnLeoTwinRush(true); }
        if (this.auxClock >= 390 / density) { this.auxClock = 0; this.spawnLeoSidePelletWave(); }
      } else {
        if (this.spawnClock >= 930 / density) { this.spawnClock = 0; this.leoCrossBait ? this.spawnLeoTwinCross(true) : this.spawnLeoTwinRush(true); }
        if (this.auxClock >= 370 / density) { this.auxClock = 0; this.spawnLeoSidePelletWave(); }
      }
      return;
    }

    const segment = this.setSegment(progress, [.22, .46, .7, .86]);
    if (segment === 0) {
      if (this.spawnClock >= 760 / density) { this.spawnClock = 0; this.spawnLeoTwinRush(true); }
      if (this.auxClock >= 1500 / density) { this.auxClock = 0; this.spawnMagmaSlash(); }
    } else if (segment === 1) {
      if (this.spawnClock >= 560 / density) { this.spawnClock = 0; this.spawnLeoSidePelletWave(true); }
      if (this.auxClock >= 1280 / density) { this.auxClock = 0; this.spawnMagmaSlash(); }
    } else if (segment === 2) {
      if (this.spawnClock >= 1060 / density) { this.spawnClock = 0; this.spawnLeoTwinCross(true); }
      if (this.auxClock >= 1180 / density) { this.auxClock = 0; this.spawnMagmaSlash(true); }
    } else {
      if (this.spawnClock >= 610 / density) { this.spawnClock = 0; Math.random() > .46 ? this.spawnLeoTwinRush(true) : this.spawnLeoSidePelletWave(true); }
      if (this.auxClock >= 980 / density) { this.auxClock = 0; this.spawnMagmaSlash(true); }
    }
  }

  runGatanothorPattern() {
    const progress = this.elapsed / this.durationMs;
    if (this.bossPhase === 0) {
      const segment = this.setSegment(progress, [.28, .56, .78]);
      if (segment === 0 && this.spawnClock >= 470 / this.intensity) { this.spawnClock = 0; this.spawnBossArc(false); }
      else if (segment === 1 && this.spawnClock >= 1450 / this.intensity) { this.spawnClock = 0; this.spawnTentacleThrust(); }
      else if (segment === 2 && this.spawnClock >= 560 / this.intensity) { this.spawnClock = 0; this.spawnBossArc(true); }
      else if (segment === 3) {
        if (this.spawnClock >= 760 / this.intensity) { this.spawnClock = 0; this.spawnBossArc(false); }
        if (this.auxClock >= 1750 / this.intensity) { this.auxClock = 0; this.spawnTentacleThrust(); }
      }
      return;
    }
    if (this.bossPhase === 1) {
      const segment = this.setSegment(progress, [.25, .5, .72, .86]);
      if (segment === 0 && this.spawnClock >= 420 / this.intensity) { this.spawnClock = 0; this.spawnBossArc(true); }
      else if (segment === 1 && this.spawnClock >= 1180 / this.intensity) { this.spawnClock = 0; this.spawnTentacleThrust(true); }
      else if (segment === 2 && this.spawnClock >= 720 / this.intensity) { this.spawnClock = 0; this.spawnDarkWalls(); }
      else if (segment >= 3) {
        if (this.spawnClock >= 480 / this.intensity) { this.spawnClock = 0; this.spawnBossArc(true); }
        if (this.auxClock >= 1500 / this.intensity) { this.auxClock = 0; this.spawnTentacleThrust(true); }
      }
      return;
    }
    const segment = this.setSegment(progress, [.22, .46, .66, .82]);
    if (segment === 0 && this.spawnClock >= 1180 / this.intensity) { this.spawnClock = 0; this.spawnPetrifyBeam(); }
    else if (segment === 1 && this.spawnClock >= 1050 / this.intensity) { this.spawnClock = 0; this.spawnTentacleThrust(true); }
    else if (segment === 2 && this.spawnClock >= 390 / this.intensity) { this.spawnClock = 0; this.spawnBossArc(true); }
    else if (segment === 3 && this.spawnClock >= 1040 / this.intensity) { this.spawnClock = 0; this.spawnPetrifyBeam(true); }
    else if (segment === 4) {
      if (this.spawnClock >= 430 / this.intensity) { this.spawnClock = 0; this.spawnBossArc(true); }
      if (this.auxClock >= 1550 / this.intensity) { this.auxClock = 0; Math.random() > .45 ? this.spawnPetrifyBeam(true) : this.spawnTentacleThrust(true); }
    }
  }

  addBullet(bullet) { this.bullets.push({ type: "pellet", delay: 0, age: 0, activeAge: 0, dead: false, hitResolved: false, ...bullet }); }

  spawnPelletRain() {
    const dpr = this.dpr, gapCenter = this.canvas.width * (.18 + Math.random() * .64), gapSize = 92 * dpr, spacing = 31 * dpr;
    const speed = (154 + this.intensity * 18 + this.rage * 30) * dpr;
    for (let x = 12 * dpr; x < this.canvas.width; x += spacing) {
      if (Math.abs(x - gapCenter) < gapSize) continue;
      this.addBullet({ x, y: -8 * dpr, vx: (-14 + Math.random() * 28) * dpr, vy: speed * (.94 + Math.random() * .12), r: 3.1 * dpr, damage: 7 });
    }
  }

  spawnAimedFan() {
    const dpr = this.dpr, fromLeft = Math.random() > .5, x = fromLeft ? -10 * dpr : this.canvas.width + 10 * dpr, baseY = (45 + Math.random() * 130) * dpr;
    for (let i = -2; i <= 2; i++) {
      const y = baseY + i * 19 * dpr, angle = Math.atan2(this.player.y - y + i * 8 * dpr, this.player.x - x), speed = (188 + this.rage * 35) * dpr;
      this.addBullet({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 3.1 * dpr, damage: 7, delay: (220 + Math.abs(i) * 35) * this.telegraphScale, telegraph: { x1: x, y1: y, x2: this.player.x, y2: this.player.y } });
    }
  }

  spawnPelletGate() {
    const dpr = this.dpr, fromLeft = Math.random() > .5, x = fromLeft ? -10 * dpr : this.canvas.width + 10 * dpr, dir = fromLeft ? 1 : -1;
    const gapY = this.canvas.height * (.25 + Math.random() * .5), gapSize = 72 * dpr, spacing = 29 * dpr, speed = (198 + this.intensity * 15) * dpr;
    for (let y = 12 * dpr; y < this.canvas.height; y += spacing) {
      if (Math.abs(y - gapY) < gapSize) continue;
      this.addBullet({ x, y, vx: dir * speed, vy: 0, r: 3.1 * dpr, damage: 7 });
    }
  }

  spawnFissurePair() {
    const dpr = this.dpr, centers = [];
    while (centers.length < 2) {
      const x = this.canvas.width * (.18 + Math.random() * .64);
      if (centers.every((v) => Math.abs(v - x) > 130 * dpr)) centers.push(x);
    }
    for (const x of centers) this.addBullet({ type: "fissure", x, width: 26 * dpr, delay: 720 * this.telegraphScale, life: 620, damage: 13 });
  }

  guardSpawnPoint(side, margin = 18) {
    const dpr = this.dpr, m = margin * dpr;
    if (side === "up") return { x: this.canvas.width / 2, y: -m };
    if (side === "right") return { x: this.canvas.width + m, y: this.canvas.height / 2 };
    if (side === "down") return { x: this.canvas.width / 2, y: this.canvas.height + m };
    return { x: -m, y: this.canvas.height / 2 };
  }
  randomSide(exclude = null) { const pool = SIDES.filter((s) => s !== exclude); return pool[Math.floor(Math.random() * pool.length)]; }

  spawnGuardProjectile(side, delay, special = false, options = {}) {
    const dpr = this.dpr, start = this.guardSpawnPoint(side, special ? 28 : 18), cx = this.canvas.width / 2, cy = this.canvas.height / 2;
    const zetton = this.patternSet === "original_zetton";
    const angle = Math.atan2(cy - start.y, cx - start.x);
    // Zetton's four-way defence must be learnable on any arena aspect ratio.  The old
    // speed-based approach made left/right attacks travel much farther than up/down,
    // so two authored warnings could still reach the player almost simultaneously.
    // For Zetton we normalize *time-to-centre* instead: every direction reaches the
    // shield after the same travel window. Other guard encounters keep their speed.
    const distance = Math.hypot(cx - start.x, cy - start.y);
    const minZettonTravelMs = options.zettonBounceReturn ? 220 : 360;
    const zettonTravelMs = Math.max(minZettonTravelMs, Number(options.travelMs ?? (special ? 500 : 660)));
    const speed = zetton
      ? distance / (zettonTravelMs / 1000)
      : (special ? 138 : 188 + this.rage * 36) * dpr;
    this.addBullet({
      type: special ? "fireball" : "pellet",
      guardProjectile: true,
      special,
      zettonWave: zetton && !special,
      zettonReverse: !!options.reverse,
      zettonBounceBack: !!options.zettonBounceBack,
      zettonBounceReturn: !!options.zettonBounceReturn,
      side,
      x: start.x, y: start.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      r: (special ? 10.5 : 3.2) * dpr,
      damage: special ? 18 : 8,
      delay: delay * this.telegraphScale,
      edgeTelegraph: options.telegraphSide ?? side,
      zettonTravelMs: zetton ? zettonTravelMs : undefined
    });
  }

  spawnZettonGuardReturn(sourceSide) {
    const returnSide = this.oppositeSide(sourceSide);
    // The ricochet is intentionally fast but readable: a short yellow edge flash,
    // then the returned projectile reaches the shield roughly 0.31 s after the first
    // successful block. It cannot ricochet a second time.
    this.spawnGuardProjectile(returnSide, 70, false, {
      telegraphSide: returnSide,
      reverse: true,
      fixedPattern: true,
      travelMs: 240,
      zettonBounceReturn: true
    });
  }
  spawnGuardPellet() { this.spawnGuardProjectile(this.randomSide(), 390); }
  spawnGuardSequence(count = 2, delayStep = 140) { let previous = null; for (let i = 0; i < count; i++) { const side = this.randomSide(previous); previous = side; this.spawnGuardProjectile(side, 360 + i * delayStep); } }
  spawnGuardFireball() { this.spawnGuardProjectile(this.randomSide(), 760, true); }
  spawnGuardCross() { const first = this.randomSide(), opposite = { up: "down", down: "up", left: "right", right: "left" }[first]; this.spawnGuardProjectile(first, 420); this.spawnGuardProjectile(opposite, 650); }

  spawnPlatformPelletVolley(aimed = false) {
    const dpr = this.dpr;
    const fromLeft = Math.random() > .5;
    const x = fromLeft ? -12 * dpr : this.canvas.width + 12 * dpr;
    const dir = fromLeft ? 1 : -1;
    const lanePlatform = this.nearestPlatformForAttack(Math.random() > .62 ? 1 : 0);
    const laneWorldY = lanePlatform
      ? lanePlatform.worldY - (30 + Math.random() * 18) * dpr
      : this.player.worldY;
    const speed = (190 + this.intensity * 18 + this.rage * 26) * dpr;

    for (let i = -1; i <= 1; i++) {
      if (!aimed && i === 0 && Math.random() > .66) continue;
      this.addBullet({
        worldSpace: true,
        x,
        y: laneWorldY + i * 20 * dpr,
        vx: dir * speed,
        vy: 0,
        r: 3.05 * dpr,
        damage: 7,
        delay: aimed ? (150 + Math.abs(i) * 40) * this.telegraphScale : 0
      });
    }
  }

  spawnMelbaSwoop() {
    const dpr = this.dpr;
    const fromLeft = Math.random() > .5;
    const platform = this.nearestPlatformForAttack(Math.random() > .52 ? 1 : 0);
    const worldY = platform
      ? platform.worldY - 26 * dpr
      : this.player.worldY;

    this.addBullet({
      type: "swoop",
      worldSpace: true,
      fromLeft,
      y: worldY,
      width: 112 * dpr,
      height: 18 * dpr,
      delay: (this.platformAssist ? 920 : 700) * this.telegraphScale,
      life: 720,
      damage: 14
    });
  }

  spawnNexusPelletFan(tight = false) {
    const dpr = this.dpr;
    const originX = this.canvas.width * (.24 + Math.random() * .52);
    const originY = -12 * dpr;
    const count = tight ? 7 : 5;
    const spread = tight ? 1.25 : 1.65;
    const base = Math.PI / 2 - spread / 2;
    const speed = (142 + this.intensity * 24 + (this.nexusMetaField ? 18 : 0)) * dpr;
    for (let i = 0; i < count; i++) {
      const t = count <= 1 ? .5 : i / (count - 1);
      const angle = base + spread * t;
      this.addBullet({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 3.1 * dpr,
        damage: 7,
        delay: (i % 2) * 45
      });
    }
  }

  spawnNexusFeedingCell(extraDelay = 0) {
    if (this.feedingCellsSpawned >= this.feedingCellsTarget) return;
    const dpr = this.dpr;
    const edge = Math.floor(Math.random() * 3);
    let x, y;
    if (edge === 0) { x = 18 * dpr; y = this.canvas.height * (.38 + Math.random() * .5); }
    else if (edge === 1) { x = this.canvas.width - 18 * dpr; y = this.canvas.height * (.38 + Math.random() * .5); }
    else { x = this.canvas.width * (.16 + Math.random() * .68); y = this.canvas.height + 18 * dpr; }
    const targetX = this.canvas.width / 2;
    const targetY = 30 * dpr;
    const angle = Math.atan2(targetY - y, targetX - x);
    const speed = (66 + this.intensity * 8 + (this.nexusMetaField ? 14 : 0)) * dpr;
    this.feedingCellsSpawned += 1;
    this.addBullet({
      type: "feedingCell",
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      targetX, targetY,
      r: 8.5 * dpr,
      damage: 0,
      delay: (320 + extraDelay) * this.telegraphScale,
      life: 7000
    });
  }

  spawnNexusTentacleLash(harder = false) {
    const dpr = this.dpr;
    const side = Math.floor(Math.random() * 4);
    let x1, y1;
    if (side === 0) { x1 = 0; y1 = this.canvas.height * Math.random(); }
    else if (side === 1) { x1 = this.canvas.width; y1 = this.canvas.height * Math.random(); }
    else if (side === 2) { x1 = this.canvas.width * Math.random(); y1 = 0; }
    else { x1 = this.canvas.width * Math.random(); y1 = this.canvas.height; }
    const lead = harder ? 36 * dpr : 18 * dpr;
    const x2 = clamp(this.player.x + (Math.random() - .5) * lead, 10 * dpr, this.canvas.width - 10 * dpr);
    const y2 = clamp(this.player.y + (Math.random() - .5) * lead, 10 * dpr, this.canvas.height - 10 * dpr);
    this.addBullet({
      type: "nexusTentacle",
      x1, y1, x2, y2,
      delay: (harder ? 520 : 690) * this.telegraphScale,
      life: harder ? 520 : 440,
      width: (harder ? 18 : 15) * dpr,
      damage: harder ? 14 : 11
    });
  }

  spawnNexusTentacleCross() {
    this.spawnNexusTentacleLash(true);
    const dpr = this.dpr;
    const x1 = this.canvas.width;
    const y1 = this.canvas.height * (.2 + Math.random() * .6);
    const x2 = clamp(this.player.x - 30 * dpr, 10 * dpr, this.canvas.width - 10 * dpr);
    const y2 = clamp(this.player.y + 30 * dpr, 10 * dpr, this.canvas.height - 10 * dpr);
    this.addBullet({ type: "nexusTentacle", x1, y1, x2, y2, delay: 760 * this.telegraphScale, life: 520, width: 18 * dpr, damage: 14 });
  }

  spawnCircuitArc(harder = false) {
    if (!this.circuitNodes?.length) this.resetGingaCircuitArena();
    const available = this.circuitLinks.filter(([a,b]) => {
      const now = this.elapsed;
      return (this.circuitNodes[a].groundedUntil ?? 0) <= now && (this.circuitNodes[b].groundedUntil ?? 0) <= now;
    });
    if (!available.length) return;
    const [a,b] = available[Math.floor(Math.random() * available.length)];
    const na = this.circuitNodes[a], nb = this.circuitNodes[b];
    this.addBullet({ type:"circuitArc", a,b, x1:na.x,y1:na.y,x2:nb.x,y2:nb.y, delay:(harder?430:570)*this.telegraphScale, life:harder?980:820, width:(harder?12:9)*this.dpr, damage:harder?13:10, staticGain:harder?8:6 });
  }

  spawnDarambiaPelletWave(harder = false) {
    const dpr = this.dpr;
    const fromLeft = Math.random() > .5;
    const x = fromLeft ? -8*dpr : this.canvas.width + 8*dpr;
    const vx = (fromLeft ? 1 : -1) * (155 + this.intensity*26 + (harder?28:0)) * dpr;
    const gapY = this.canvas.height * (.25 + Math.random()*.5);
    const gap = (harder?42:56)*dpr;
    for (let y=20*dpr; y<this.canvas.height-12*dpr; y+=30*dpr) {
      if (Math.abs(y-gapY)<gap) continue;
      this.addBullet({x,y,vx,vy:0,r:3*dpr,damage:7});
    }
  }

  spawnConductBolt() {
    const dpr = this.dpr;
    const side = Math.floor(Math.random()*4);
    let x,y;
    if (side===0) { x=10*dpr; y=this.canvas.height*(.18+Math.random()*.64); }
    else if (side===1) { x=this.canvas.width-10*dpr; y=this.canvas.height*(.18+Math.random()*.64); }
    else if (side===2) { x=this.canvas.width*(.16+Math.random()*.68); y=10*dpr; }
    else { x=this.canvas.width*(.16+Math.random()*.68); y=this.canvas.height-10*dpr; }
    const tx=this.player.x, ty=this.player.y;
    const dx=tx-x, dy=ty-y, len=Math.hypot(dx,dy)||1;
    const speed=(145+this.intensity*22)*dpr;
    this.addBullet({type:"conductBolt", x,y,vx:dx/len*speed,vy:dy/len*speed,r:8*dpr,damage:13,delay:520*this.telegraphScale,life:3200,targetX:tx,targetY:ty});
    this.gingaConductSpawned += 1;
  }

  spawnLightningColumn(harder = false) {
    const dpr=this.dpr;
    const x=this.canvas.width*(.18+Math.random()*.64);
    this.addBullet({type:"lightningColumn",x,width:(harder?48:38)*dpr,delay:(harder?610:760)*this.telegraphScale,life:430,damage:harder?16:13});
  }

  spawnMemoryShard() {
    const dpr = this.dpr;
    const heart = this.memoryHeart ?? {x:this.canvas.width/2,y:this.canvas.height*.48};
    let x, y;
    do {
      x = this.canvas.width * (.14 + Math.random()*.72);
      y = this.canvas.height * (.18 + Math.random()*.68);
    } while (Math.hypot(x-heart.x,y-heart.y) < 90*dpr);
    const memoryIds = ["childhood","shrine","dream","together"];
    const memoryId = memoryIds[(this.rescueMemoryOffset + this.memoryShardsSpawned) % memoryIds.length];
    this.memoryShardsSpawned += 1;
    this.addBullet({ type:"memoryShard", memoryId, x,y,vx:0,vy:0,r:8.5*dpr,damage:0,life:this.durationMs+600,delay:180*this.telegraphScale });
  }

  spawnMemoryThorn(harder=false) {
    const dpr=this.dpr, fromLeft=Math.random()>.5;
    const x=fromLeft?-10*dpr:this.canvas.width+10*dpr;
    const y=this.canvas.height*(.18+Math.random()*.68);
    const speed=(175+this.intensity*24+(harder?30:0))*dpr;
    this.addBullet({type:"memoryThorn",x,y,vx:(fromLeft?1:-1)*speed,vy:(Math.random()-.5)*28*dpr,r:5.5*dpr,damage:harder?11:9});
  }

  spawnMemorySweep(harder=false) {
    const dpr=this.dpr;
    const horizontal=Math.random()>.5;
    const center=horizontal?this.canvas.height*(.22+Math.random()*.56):this.canvas.width*(.2+Math.random()*.6);
    this.addBullet({type:"memorySweep",orientation:horizontal?"horizontal":"vertical",center,width:(harder?24:19)*dpr,delay:(harder?640:790)*this.telegraphScale,life:460,damage:12});
  }

  spawnGrandArmorVolley(harder=false) {
    const dpr=this.dpr, cx=this.canvas.width/2, cy=-8*dpr, amount=harder?8:6;
    const targetX=this.player.x, targetY=this.player.y;
    const base=Math.atan2(targetY-cy,targetX-cx), spread=harder?.88:.68;
    for(let i=0;i<amount;i++){
      const a=base-spread/2+spread*(i/Math.max(1,amount-1));
      const speed=(160+this.intensity*18+(harder?22:0))*dpr;
      this.addBullet({x:cx,y:cy,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:3.2*dpr,damage:8,delay:(i%2)*55});
    }
  }

  spawnGrandBeam(harder=false) {
    const dpr=this.dpr;
    const vertical=Math.random()>.5;
    const center=vertical?this.canvas.width*(.22+Math.random()*.56):this.canvas.height*(.24+Math.random()*.52);
    this.addBullet({type:"grandBeam",orientation:vertical?"vertical":"horizontal",center,width:(harder?46:38)*dpr,delay:(harder?680:850)*this.telegraphScale,life:520,damage:harder?18:15});
  }

  spawnGrandClawShock() {
    const dpr=this.dpr;
    const center=this.canvas.width*(.2+Math.random()*.6);
    this.addBullet({type:"grandShock",center,startHalfWidth:18*dpr,endHalfWidth:104*dpr,delay:720*this.telegraphScale,life:620,damage:14});
  }

  spawnAllySignal() {
    const dpr=this.dpr;
    this.allySignalsSpawned += 1;
    const fromLeft=Math.random()>.5;
    const x=fromLeft?-20*dpr:this.canvas.width+20*dpr;
    const y=this.canvas.height*(.22+Math.random()*.58);
    const palettes=["tiga","ultraman","seven","jean"];
    const ally=palettes[(this.allyLinks+Math.floor(Math.random()*palettes.length))%palettes.length];
    this.addBullet({type:"allySignal",ally,x,y,vx:(fromLeft?1:-1)*(132+this.intensity*10)*dpr,vy:0,r:9*dpr,damage:0,life:5200});
  }

  spawnAllyCrossfire() {
    const dpr=this.dpr;
    const y=this.canvas.height*(.22+Math.random()*.56);
    const names=["健太 / 千草","友也","伙伴们"];
    const lines=["两侧光束同时压住重炮。","詹奈的火力从侧面切进装甲缝隙。","别让裂口合上！"];
    const idx=this.allyStrikeCount++%names.length;
    this.effects.push({type:"allyCrossfire",x:this.canvas.width/2,y,age:0,life:760,radius:22*dpr,label:"SUPPORT"});
    this.callbacks.onAllyStrike?.({damage:7,name:names[idx],line:lines[idx]});
  }

  spawnStasisShard(harder=false) {
    const dpr=this.dpr;
    const side=Math.floor(Math.random()*3);
    let x,y;
    if(side===0){x=12*dpr;y=this.canvas.height*(.18+Math.random()*.64)}
    else if(side===1){x=this.canvas.width-12*dpr;y=this.canvas.height*(.18+Math.random()*.64)}
    else{x=this.canvas.width*(.12+Math.random()*.76);y=12*dpr}
    const dx=this.player.x-x,dy=this.player.y-y,len=Math.hypot(dx,dy)||1;
    const speed=(128+this.intensity*18+(harder?18:0))*dpr;
    this.addBullet({type:"stasisShard",x,y,vx:dx/len*speed,vy:dy/len*speed,r:6*dpr,damage:10,life:6200,marked:false,returning:false});
  }

  spawnLugielLanceArc(harder=false) {
    const dpr=this.dpr;
    const x=this.canvas.width*(.16+Math.random()*.68);
    this.addBullet({type:"lugielLance",x,width:(harder?31:25)*dpr,delay:(harder?690:820)*this.telegraphScale,life:520,damage:15});
  }


  spawnLugielDarkSlash(cross=false, harder=false) {
    this.callbacks.onLugielAttack?.({kind:cross?"cross":"slash"});
    const dpr=this.dpr,w=this.canvas.width,h=this.canvas.height;
    const make=(angle,delay=0)=>{
      const cx=w*(.34+Math.random()*.32),cy=h*(.3+Math.random()*.4);
      const length=Math.hypot(w,h)*1.18;
      const dx=Math.cos(angle)*length/2,dy=Math.sin(angle)*length/2;
      this.addBullet({type:"lugielSlash",x1:cx-dx,y1:cy-dy,x2:cx+dx,y2:cy+dy,width:(harder?18:15)*dpr,delay:((harder?700:840)+delay)*this.telegraphScale,life:harder?410:360,damage:harder?16:13});
    };
    const angle=(Math.random()>.5?1:-1)*(.55+Math.random()*.28);
    make(angle);
    if(cross) make(-angle,(harder?150:220));
  }

  spawnLugielSpearRain(harder=false) {
    this.callbacks.onLugielAttack?.({kind:"spear"});
    const dpr=this.dpr,count=harder?4:3,minGap=92*dpr,chosen=[];
    for(let i=0;i<count;i++){
      let x=this.canvas.width*(.12+Math.random()*.76);
      for(let tries=0;tries<8 && chosen.some(v=>Math.abs(v-x)<minGap);tries++) x=this.canvas.width*(.12+Math.random()*.76);
      chosen.push(x);
      this.addBullet({type:"lugielLance",x,width:(harder?27:23)*dpr,delay:((harder?650:760)+i*(harder?185:235))*this.telegraphScale,life:440,damage:harder?15:13});
    }
  }

  spawnLugielBladeGate(harder=false) {
    this.callbacks.onLugielAttack?.({kind:"gate"});
    const dpr=this.dpr;
    const verticalTravel=Math.random()>.5; // true = wall travels left/right and gap is vertical.
    const gap=verticalTravel?this.canvas.height*(.25+Math.random()*.5):this.canvas.width*(.22+Math.random()*.56);
    const safeHalf=(harder?58:70)*dpr;
    const side=Math.random()>.5?"start":"end";
    this.addBullet({type:"lugielBladeGate",orientation:verticalTravel?"vertical":"horizontal",side,gap,safeHalf,thickness:(harder?28:24)*dpr,delay:(harder?760:920)*this.telegraphScale,life:harder?920:1080,damage:harder?17:14});
  }

  spawnLugielClockSweep(harder=false) {
    this.callbacks.onLugielAttack?.({kind:"clock"});
    const dpr=this.dpr,cx=this.canvas.width/2,cy=this.canvas.height/2;
    const sweep=(harder?1.55:1.22)*(Math.random()>.5?1:-1);
    const startAngle=Math.random()*Math.PI*2;
    this.addBullet({type:"lugielClockSweep",cx,cy,startAngle,sweep,radius:Math.hypot(this.canvas.width,this.canvas.height)*.64,width:(harder?17:14)*dpr,delay:(harder?880:1040)*this.telegraphScale,life:harder?1180:1320,damage:harder?17:14,twin:harder});
  }

  spawnFutureAnchor() {
    const dpr=this.dpr;
    const labels=this.futureAnchorLabels?.length?this.futureAnchorLabels:[{id:"black-king",label:"BLACK KING"},{id:"thunder-darambia",label:"THUNDER DARAMBIA"},{id:"grand-king",label:"GRAND KING"}];
    const baseIndex=(this.futureAnchorsAwakened+this.futureAnchors)%labels.length;
    const ordered=[...labels.slice(baseIndex),...labels.slice(0,baseIndex)];
    const used=new Set(this.futureAnchorSpawnedIds??[]);
    const available=ordered.filter((entry)=>!used.has(entry.id));
    const entry=available[0]??ordered[0];
    if(!entry)return;
    this.futureAnchorSpawnedIds.add(entry.id);
    const x=this.canvas.width*(.18+Math.random()*.64),y=this.canvas.height*(.2+Math.random()*.58);
    this.addBullet({type:"futureAnchor",anchorId:entry.id,label:entry.label,x,y,vx:0,vy:0,r:14*dpr,damage:0,life:this.durationMs+600});
  }

  spawnMirrorSignTrial() {
    const dpr = this.dpr;
    const labels = ["攻击", "技能", "行动", "LIVE"];
    const baseXs = [.2,.4,.6,.8].map((v) => this.canvas.width * v);
    const shuffled = [...baseXs].sort(() => Math.random() - .5);
    const correctIndex = Math.floor(Math.random() * labels.length);
    const trialId = `mirror-${this.mirrorTrialsSpawned}-${Math.round(this.elapsed)}`;
    const y = this.canvas.height * (.38 + Math.random() * .24);
    labels.forEach((label, index) => this.addBullet({ type:"mirrorSign",x:baseXs[index],y,startX:baseXs[index],targetX:shuffled[index],vx:0,vy:0,r:20*dpr,label,correct:index===correctIndex,trialId,scanAfter:620*this.telegraphScale,revealUntil:620*this.telegraphScale,shuffleUntil:1120*this.telegraphScale,life:2450,damage:0 }));
    this.mirrorTrialsSpawned += 1;
  }

  spawnDarkBrotherPellets(harder = false) {
    const dpr=this.dpr, fromLeft=Math.random()>.5, x=fromLeft?-8*dpr:this.canvas.width+8*dpr, dir=fromLeft?1:-1;
    const gapY=this.canvas.height*(.28+Math.random()*.45), speed=(175+this.intensity*26+(harder?30:0))*dpr;
    for(let y=18*dpr;y<this.canvas.height-12*dpr;y+=27*dpr){ if(Math.abs(y-gapY)<(harder?38:50)*dpr) continue; this.addBullet({x,y,vx:dir*speed,vy:0,r:3.1*dpr,damage:8}); }
  }

  spawnDarkSpacium(double=false) {
    const dpr=this.dpr,count=double?2:1;
    for(let i=0;i<count;i++){ const horizontal=Math.random()>.45; const center=horizontal?this.canvas.height*(.24+Math.random()*.52):this.canvas.width*(.2+Math.random()*.6); this.addBullet({type:"darkBeam",orientation:horizontal?"horizontal":"vertical",center,width:(double?22:18)*dpr,delay:(720+i*160)*this.telegraphScale,life:470,damage:15}); }
  }

  spawnDarkSluggerFan(harder=false) {
    const dpr=this.dpr,fromRight=Math.random()>.5,x=fromRight?this.canvas.width+14*dpr:-14*dpr,baseY=this.canvas.height*(.25+Math.random()*.5),dir=fromRight?-1:1,amount=harder?5:3;
    for(let i=0;i<amount;i++) this.addBullet({type:"darkSlugger",x,y:baseY+(i-(amount-1)/2)*34*dpr,vx:dir*(205+this.intensity*25)*dpr,vy:Math.sin(i*1.7)*22*dpr,r:7*dpr,damage:10,spin:(Math.random()>.5?1:-1)});
  }

  spawnLugielPelletRing(harder=false) {
    const dpr=this.dpr,cx=this.canvas.width/2,cy=10*dpr,amount=harder?9:7,spread=harder?2.15:1.78,start=Math.PI/2-spread/2,speed=(145+this.intensity*18+(harder?18:0))*dpr;
    for(let i=0;i<amount;i++){const a=start+spread*(i/(amount-1));this.addBullet({x:cx,y:cy,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:3.1*dpr,damage:9,delay:(i%2)*70});}
  }

  spawnFreezeRay(double=false) {
    const dpr=this.dpr,count=double?2:1;
    for(let i=0;i<count;i++){const vertical=Math.random()>.5;const center=vertical?this.canvas.width*(.2+Math.random()*.6):this.canvas.height*(.22+Math.random()*.56);this.addBullet({type:"freezeRay",orientation:vertical?"vertical":"horizontal",center,width:(double?34:29)*dpr,delay:(800+i*150)*this.telegraphScale,life:520,damage:16});}
  }

  spawnTimeStopBand() {
    const dpr=this.dpr,vertical=Math.random()>.5,safeCenter=vertical?this.canvas.width*(.24+Math.random()*.52):this.canvas.height*(.24+Math.random()*.52);
    this.addBullet({type:"timeStopBand",orientation:vertical?"vertical":"horizontal",safeCenter,safeHalfWidth:58*dpr,delay:850*this.telegraphScale,life:800,damage:18});
  }

  spawnLeoSidePelletWave(harder = false) {
    const dpr = this.dpr;
    const fromLeft = Math.random() > .5;
    const x = fromLeft ? -10 * dpr : this.canvas.width + 10 * dpr;
    const dir = fromLeft ? 1 : -1;
    const gapY = this.canvas.height * (.28 + Math.random() * .44);
    const gap = (harder ? 47 : 58) * dpr;
    const speed = (176 + this.intensity * 24 + (harder ? 24 : 0)) * dpr;
    const spacing = 28 * dpr;
    for (let y = 18 * dpr; y < this.canvas.height - 10 * dpr; y += spacing) {
      if (Math.abs(y - gapY) < gap) continue;
      this.addBullet({ x, y, vx: dir * speed, vy: 0, r: 3.1 * dpr, damage: 7 });
    }
  }

  spawnLeoTwinRush(harder = false) {
    const dpr = this.dpr;
    const fromLeft = Math.random() > .5;
    const y = this.canvas.height * (.3 + Math.random() * .48);
    const speed = (310 + this.intensity * 32 + (harder ? 46 : 0)) * dpr;
    const source = fromLeft ? "red" : "black";
    this.addBullet({
      type: "twinRush", source,
      x: fromLeft ? -42 * dpr : this.canvas.width + 42 * dpr,
      y, vx: (fromLeft ? 1 : -1) * speed, vy: 0,
      r: 15 * dpr, damage: harder ? 15 : 12,
      delay: (harder ? 520 : 650) * this.telegraphScale,
      telegraphY: y, harder
    });
  }

  spawnLeoTwinCross(harder = false) {
    const dpr = this.dpr;
    const baseY = this.canvas.height * (.34 + Math.random() * .34);
    const offset = (harder ? 34 : 46) * dpr;
    for (const spec of [
      { fromLeft: true, y: baseY - offset, source: "red", extra: 0 },
      { fromLeft: false, y: baseY + offset, source: "black", extra: harder ? 85 : 150 }
    ]) {
      const speed = (315 + this.intensity * 34 + (harder ? 42 : 0)) * dpr;
      this.addBullet({
        type: "twinRush", source: spec.source,
        x: spec.fromLeft ? -42 * dpr : this.canvas.width + 42 * dpr,
        y: spec.y, vx: (spec.fromLeft ? 1 : -1) * speed, vy: 0,
        r: 15 * dpr, damage: harder ? 15 : 12,
        delay: (590 + spec.extra) * this.telegraphScale,
        telegraphY: spec.y, harder
      });
    }
  }

  spawnMagmaSlash(double = false) {
    const dpr = this.dpr;
    const count = double ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const descending = Math.random() > .5;
      const inset = (50 + Math.random() * 65) * dpr;
      const x1 = descending ? inset : this.canvas.width - inset;
      const y1 = 0;
      const x2 = descending ? this.canvas.width - inset : inset;
      const y2 = this.canvas.height;
      this.addBullet({ type: "magmaSlash", x1, y1, x2, y2, delay: (760 + i * 180) * this.telegraphScale, life: 390, width: (double ? 17 : 15) * dpr, damage: double ? 17 : 15, source: "magma" });
    }
  }

  spawnGirasTsunami(harder = false) {
    const dpr=this.dpr;
    const safeCenter=this.canvas.width*(.24+Math.random()*.52);
    const safeHalfWidth=(harder?42:52)*dpr;
    this.addBullet({type:"girasWave",safeCenter,safeHalfWidth,thickness:(harder?58:50)*dpr,delay:(820+(harder?0:100))*this.telegraphScale,life:1050,damage:harder?16:14});
  }

  spawnPressureOrbFan(harder=false, reflectable=false) {
    const dpr=this.dpr, count=harder?7:5;
    const originX=this.canvas.width*(Math.random()>.5?.18:.82), originY=this.canvas.height*(.16+Math.random()*.18);
    const base=Math.atan2(this.player.y-originY,this.player.x-originX);
    const spread=harder?1.18:.86;
    const speed=(145+this.intensity*18+(harder?18:0))*dpr;
    for(let i=0;i<count;i++){
      const a=base-spread/2+spread*(count===1?.5:i/(count-1));
      this.addBullet({type:"pressureOrb",x:originX,y:originY,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:(reflectable?7.6:6.3)*dpr,damage:reflectable?14:10,delay:(420+i*55)*this.telegraphScale,reflectable});
    }
  }

  spawnPressureFloatDebris(harder=false, giant=false) {
    const dpr=this.dpr,count=giant?(harder?4:3):(harder?6:4);
    for(let i=0;i<count;i++){
      const fromLeft=(i%2===0) !== (Math.random()>.5);
      const r=(giant?(22+Math.random()*13):(7+Math.random()*5))*dpr;
      const y=this.canvas.height*(.22+Math.random()*.62);
      const speed=(giant?92:142)+(harder?24:0);
      this.addBullet({type:"pressureDebris",x:fromLeft?-r*2:this.canvas.width+r*2,y,vx:(fromLeft?1:-1)*speed*dpr,vy:(Math.random()-.5)*22*dpr,r,damage:giant?16:9,delay:(350+i*120)*this.telegraphScale,spin:(Math.random()>.5?1:-1)*(giant?.55:1.2)});
    }
  }

  spawnPressureWarpSweep(harder=false) {
    const dpr=this.dpr,vertical=Math.random()>.5;
    const center=vertical?this.canvas.width*(.24+Math.random()*.52):this.canvas.height*(.25+Math.random()*.5);
    this.addBullet({type:"pressureWarp",orientation:vertical?"vertical":"horizontal",center,width:(harder?44:36)*dpr,delay:(920-(harder?100:0))*this.telegraphScale,life:560,damage:harder?16:13});
  }

  spawnPressureBalloon() {
    const dpr=this.dpr;
    const radius=Math.max(68*dpr,Math.min(this.canvas.width,this.canvas.height)*.31);
    this.addBullet({type:"pressureBalloon",x:this.player.x,y:this.player.y,radius,startRadius:radius,endRadius:25*dpr,delay:760*this.telegraphScale,life:1100,damage:18});
  }

  spawnBlackFlame(harder=false) {
    const dpr=this.dpr,fromLeft=Math.random()>.5,x=fromLeft?-12*dpr:this.canvas.width+12*dpr;
    const y=this.canvas.height*(.23+Math.random()*.58),speed=(190+this.intensity*24+(harder?28:0))*dpr;
    this.addBullet({type:"blackFlame",x,y,vx:(fromLeft?1:-1)*speed,vy:(Math.random()-.5)*16*dpr,r:(harder?7:6)*dpr,damage:harder?12:10});
  }

  spawnBlackFlameCone() {
    const dpr=this.dpr,fromLeft=Math.random()>.5,x=fromLeft?-12*dpr:this.canvas.width+12*dpr,dir=fromLeft?1:-1;
    const baseY=this.canvas.height*(.32+Math.random()*.36),speed=(205+this.intensity*23)*dpr;
    for(let i=-2;i<=2;i++) this.addBullet({type:"blackFlame",x,y:baseY+i*18*dpr,vx:dir*speed,vy:i*22*dpr,r:6*dpr,damage:10,delay:(Math.abs(i)*45)*this.telegraphScale});
  }

  spawnBlackEndCharge(harder=false) {
    const dpr=this.dpr,fromLeft=Math.random()>.5;
    const y=this.canvas.height*(.3+Math.random()*.46),speed=(305+this.intensity*30+(harder?42:0))*dpr;
    this.addBullet({type:"blackEndCharge",source:"horn",x:fromLeft?-48*dpr:this.canvas.width+48*dpr,y,vx:(fromLeft?1:-1)*speed,vy:0,r:18*dpr,damage:harder?18:15,delay:(harder?520:680)*this.telegraphScale,telegraphY:y,harder});
  }

  spawnBlackEndHornCross(harder=false) {
    const dpr=this.dpr,baseY=this.canvas.height*(.34+Math.random()*.3),offset=(harder?30:42)*dpr;
    for(const [fromLeft,y,extra] of [[true,baseY-offset,0],[false,baseY+offset,harder?70:150]]){
      const speed=(300+this.intensity*31+(harder?40:0))*dpr;
      this.addBullet({type:"blackEndCharge",source:"horn",x:fromLeft?-48*dpr:this.canvas.width+48*dpr,y,vx:(fromLeft?1:-1)*speed,vy:0,r:18*dpr,damage:harder?18:15,delay:(590+extra)*this.telegraphScale,telegraphY:y,harder});
    }
  }

  spawnBlackEndHornCage(harder=false) {
    const dpr=this.dpr;
    const lanes=[.24,.43,.62,.79];
    const safe=Math.floor(Math.random()*lanes.length);
    lanes.forEach((ratio,i)=>{
      if(i===safe) return;
      const fromLeft=(i%2===0);
      const y=this.canvas.height*ratio;
      const speed=(318+this.intensity*34+(harder?58:20))*dpr;
      this.addBullet({type:"blackEndCharge",source:"horn",x:fromLeft?-48*dpr:this.canvas.width+48*dpr,y,vx:(fromLeft?1:-1)*speed,vy:0,r:19*dpr,damage:harder?20:17,delay:(760+i*95-(harder?120:0))*this.telegraphScale,telegraphY:y,harder:true});
    });
  }

  spawnBlackEndFlameRain(harder=false) {
    const dpr=this.dpr;
    const gap=this.canvas.width*(.18+Math.random()*.64);
    const unbound=this.bossPhase>=2;
    const spacing=(harder?(unbound?62:46):58)*dpr;
    const speed=(190+this.intensity*28+(harder?(unbound?30:44):0))*dpr;
    for(let x=18*dpr;x<this.canvas.width-10*dpr;x+=spacing){
      if(Math.abs(x-gap)<(harder?52:66)*dpr) continue;
      this.addBullet({type:"blackFlame",x,y:-18*dpr,vx:(Math.random()-.5)*28*dpr,vy:speed,r:(harder?7:6)*dpr,damage:harder?12:10,delay:(Math.random()*180)*this.telegraphScale});
    }
  }

  spawnBlackEndDiscVolley(harder=false) {
    const dpr=this.dpr;
    const count=harder?(this.bossPhase>=2?3:5):3;
    for(let i=0;i<count;i++){
      const fromLeft=i%2===0;
      const x=fromLeft?-24*dpr:this.canvas.width+24*dpr;
      const y=28*dpr+i*(this.canvas.height-56*dpr)/(Math.max(1,count-1));
      const tx=this.player.x+(Math.random()-.5)*60*dpr,ty=this.player.y+(Math.random()-.5)*50*dpr;
      const a=Math.atan2(ty-y,tx-x),speed=(235+this.intensity*28+(harder?44:0))*dpr;
      this.addBullet({type:"blackEndDisc",x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:(harder?12:10)*dpr,damage:harder?13:11,delay:(i*95+(harder?210:320))*this.telegraphScale,spin:(fromLeft?1:-1)*(harder?1.55:1.15)});
    }
  }

  chaosNode() {
    return { x: this.canvas.width / 2, y: 42 * this.dpr };
  }

  spawnChaosPelletFan(tight = false) {
    const dpr = this.dpr;
    const node = this.chaosNode();
    const count = tight ? 7 : 5;
    const baseAngle = Math.atan2(this.player.y - node.y, this.player.x - node.x);
    const spread = tight ? .78 : 1.02;
    const speed = (170 + this.intensity * 16 + this.rage * 24) * dpr;

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? .5 : i / (count - 1);
      const angle = baseAngle - spread / 2 + spread * t;
      this.addBullet({
        x: node.x,
        y: node.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 3.05 * dpr,
        damage: 8,
        delay: i % 2 === 0 ? 0 : 65
      });
    }
  }

  spawnChaosSideVolley() {
    const dpr = this.dpr;
    const fromLeft = Math.random() > .5;
    const x = fromLeft ? -10 * dpr : this.canvas.width + 10 * dpr;
    const dir = fromLeft ? 1 : -1;
    const gapY = this.canvas.height * (.28 + Math.random() * .44);
    const speed = (205 + this.intensity * 17) * dpr;

    for (let i = 0; i < 7; i++) {
      const y = 34 * dpr + i * (this.canvas.height - 68 * dpr) / 6;
      if (Math.abs(y - gapY) < 48 * dpr) continue;
      this.addBullet({ x, y, vx: dir * speed, vy: 0, r: 3.05 * dpr, damage: 7 });
    }
  }

  spawnChaosFragment(extraDelay = 0) {
    this.chaosFragmentsSpawned += 1;
    const dpr = this.dpr;
    const node = this.chaosNode();
    const side = Math.floor(Math.random() * 3);
    let x, y;

    if (side === 0) {
      x = 28 * dpr + Math.random() * (this.canvas.width - 56 * dpr);
      y = this.canvas.height + 14 * dpr;
    } else if (side === 1) {
      x = -14 * dpr;
      y = this.canvas.height * (.34 + Math.random() * .56);
    } else {
      x = this.canvas.width + 14 * dpr;
      y = this.canvas.height * (.34 + Math.random() * .56);
    }

    const angle = Math.atan2(node.y - y, node.x - x);
    const speed = (102 + this.intensity * 10) * dpr;
    this.addBullet({
      type: "chaosShard",
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 7.2 * dpr,
      damage: 10,
      targetX: node.x,
      targetY: node.y,
      delay: extraDelay,
      special: true
    });
  }

  spawnChaosLance() {
    const dpr = this.dpr;
    const node = this.chaosNode();
    const dx = this.player.x - node.x;
    const dy = this.player.y - node.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / length;
    const uy = dy / length;
    const reach = Math.hypot(this.canvas.width, this.canvas.height) * 1.15;

    this.addBullet({
      type: "chaosLance",
      x1: node.x,
      y1: node.y,
      x2: node.x + ux * reach,
      y2: node.y + uy * reach,
      width: 18 * dpr,
      delay: 720 * this.telegraphScale,
      life: 430,
      damage: 15
    });
  }

  spawnProphecyRain(tight = false) {
    const dpr = this.dpr;
    const spacing = (tight ? 34 : 42) * dpr;
    const gapCenter = this.canvas.width * (.22 + Math.random() * .56);
    const gapSize = (tight ? 54 : 76) * dpr;
    const speed = (168 + this.intensity * 20 + this.bossPhase * 22) * dpr;
    for (let x = 14 * dpr; x < this.canvas.width; x += spacing) {
      if (Math.abs(x - gapCenter) < gapSize) continue;
      this.addBullet({
        x, y: -8 * dpr,
        vx: (Math.random() - .5) * 18 * dpr,
        vy: speed * (.95 + Math.random() * .1),
        r: 3.1 * dpr,
        damage: 7
      });
    }
  }

  spawnSacredFireBurst(count = 2) {
    const dpr = this.dpr;
    const used = [];
    for (let i = 0; i < count; i++) {
      let x = this.canvas.width * (.16 + Math.random() * .68);
      for (let tries = 0; tries < 6 && used.some((v) => Math.abs(v - x) < 90 * dpr); tries++) {
        x = this.canvas.width * (.16 + Math.random() * .68);
      }
      used.push(x);
      this.addBullet({
        type: "sacredFire",
        x,
        width: 34 * dpr,
        delay: (650 + i * 95) * this.telegraphScale,
        life: 620,
        damage: 13
      });
    }
  }

  spawnGateChain() {
    const dpr = this.dpr;
    const x1 = this.canvas.width / 2;
    const y1 = 13 * dpr;
    const targetX = clamp(this.player.x + (Math.random() - .5) * 36 * dpr, 25 * dpr, this.canvas.width - 25 * dpr);
    const targetY = clamp(this.player.y + (Math.random() - .5) * 22 * dpr, 55 * dpr, this.canvas.height - 24 * dpr);
    this.addBullet({
      type: "gateChain",
      x1, y1, x2: targetX, y2: targetY,
      width: (this.bossPhase > 0 ? 14 : 11) * dpr,
      delay: 720 * this.telegraphScale,
      life: 520,
      damage: 15
    });
  }

  spawnGateLight() {
    const dpr = this.dpr;
    this.addBullet({
      type: "gateLight",
      x: this.canvas.width * (.18 + Math.random() * .64),
      y: this.canvas.height * (.36 + Math.random() * .46),
      vx: 0, vy: 0,
      r: 7.5 * dpr,
      life: 2100,
      damage: 0
    });
  }

  spawnGateRupture() {
    const dpr = this.dpr;
    this.addBullet({
      type: "gateRupture",
      safeCenter: this.canvas.width * (.25 + Math.random() * .5),
      safeHalfWidth: 55 * dpr,
      thickness: 26 * dpr,
      delay: 360 * this.telegraphScale,
      life: 1200,
      damage: 19
    });
  }

  spawnBossArc(tight = false) {
    const dpr = this.dpr, centerX = this.canvas.width / 2, centerY = -18 * dpr, count = tight ? 9 : 7, spread = tight ? 1.65 : 2.05;
    const baseAngle = Math.PI / 2 - spread / 2, speed = (128 + this.intensity * 18) * dpr;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1), angle = baseAngle + spread * t;
      this.addBullet({ x: centerX, y: centerY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 3.1 * dpr, damage: 8, delay: (i % 2) * 55 });
    }
  }

  spawnTentacleThrust(paired = false) {
    const dpr = this.dpr, horizontal = Math.random() > .5, amount = paired ? 2 : 1, used = [];
    for (let i = 0; i < amount; i++) {
      let lane = horizontal ? this.canvas.height * (.22 + Math.random() * .56) : this.canvas.width * (.18 + Math.random() * .64);
      for (let tries = 0; tries < 5 && used.some((v) => Math.abs(v - lane) < 95 * dpr); tries++) lane = horizontal ? this.canvas.height * (.22 + Math.random() * .56) : this.canvas.width * (.18 + Math.random() * .64);
      used.push(lane);
      this.addBullet({ type: "tentacle", orientation: horizontal ? "horizontal" : "vertical", side: Math.random() > .5 ? "start" : "end", lane, delay: 780 * this.telegraphScale + i * 120, life: 980, thickness: 22 * dpr, damage: 14 });
    }
  }

  spawnDarkWalls() {
    const dpr = this.dpr;
    const center = this.canvas.width * (.38 + Math.random() * .24);

    // One object controls both walls. This prevents left/right collision regions
    // from ever crossing and makes the visible corridor match the hitbox exactly.
    this.addBullet({
      type: "darkcorridor",
      center,
      startHalfWidth: 150 * dpr,
      endHalfWidth: 78 * dpr,
      drift: (Math.random() > .5 ? 1 : -1) * (22 + Math.random() * 26) * dpr,
      delay: 760 * this.telegraphScale,
      life: 1250,
      damage: 12
    });
  }

  spawnPetrifyBeam(double = false) {
    const dpr = this.dpr, vertical = Math.random() > .42, count = double ? 2 : 1, centers = [];
    for (let i = 0; i < count; i++) {
      let center = vertical ? this.canvas.width * (.23 + Math.random() * .54) : this.canvas.height * (.25 + Math.random() * .5);
      for (let tries = 0; tries < 5 && centers.some((v) => Math.abs(v - center) < 125 * dpr); tries++) center = vertical ? this.canvas.width * (.23 + Math.random() * .54) : this.canvas.height * (.25 + Math.random() * .5);
      centers.push(center);
      this.addBullet({ type: "petrify", orientation: vertical ? "vertical" : "horizontal", center, width: 58 * dpr, delay: (920 + i * 130) * this.telegraphScale, life: 520, damage: 20 });
    }
  }

  updateBullets(dt, now) {
    const margin = 80 * this.dpr;

    // Carrying a memory is a player state, not a property of the pickup object.
    // Delivery must still work after the shard that was picked up has been removed.
    if (this.mode === "memory" && this.memoryCarrying && this.memoryHeart) {
      const heart = this.memoryHeart;
      if (Math.hypot(this.player.x - heart.x, this.player.y - heart.y) <= heart.radius + 10 * this.dpr) {
        this.memoryCarrying = false;
        this.memoryDelivered += 1;
        const memoryId = this.memoryCarryingId;
        this.memoryCarryingId = null;
        this.effects.push({ type:"memoryDeliver", x:heart.x, y:heart.y, age:0, life:620, radius:30*this.dpr, label:"RESONATE" });
        this.callbacks.onRescueMemory?.({ memoryId });
      }
    }

    for (const bullet of this.bullets) {
      bullet.age += dt * 1000;
      if (bullet.delay > 0) { bullet.delay -= dt * 1000; continue; }
      if (this.mode === "stasis" && this.stasisActive && ["lugielLance","lugielSlash","lugielBladeGate","lugielClockSweep"].includes(bullet.type)) continue;
      bullet.activeAge += dt * 1000;

      if (["fissure", "tentacle", "darkcorridor", "petrify", "swoop", "chaosLance", "sacredFire", "gateChain", "gateRupture", "magmaSlash", "nexusTentacle", "circuitArc", "lightningColumn", "darkBeam", "freezeRay", "timeStopBand", "memorySweep", "grandBeam", "grandShock", "lugielLance", "lugielSlash", "lugielBladeGate", "lugielClockSweep", "girasWave", "pressureWarp", "pressureBalloon", "mephistoClaw", "mephistoCross", "zagiSweep", "zagiLightning", "zagiShockRing", "chaosPanel", "chaosProminence", "chaosBrokenHalo", "belialBattlenizerSweep", "belialLightning", "belialScytheGuard", "belialClawClamp", "belialDeathciumBeam", "belialDuelField", "belialGalaxyField", "belialAbyssField", "belialFinalClash", "grandKingAdvance", "grandSensorBeam", "grandThrowArm", "grandDebris", "grandFist", "grandDustWave", "grandBarrageCannons", "grandBarrageWave", "grandLaserHole", "fiveSonicWave", "fiveResonanceNode", "fiveLaneFrame", "fiveLaneLaser", "fiveWindmill", "fiveFallField", "fiveFallDebris", "fiveFreezeBeam", "fiveFireRay", "zettonFireballBurst", "greezaThunderSmash", "greezaVortex", "greezaSoundCore", "greezaSoundWave", "greezaHelix", "greezaWaveCannon", "zettonReturnBeam"].includes(bullet.type)) {
        this.updateHazard(bullet, now);
        continue;
      }

      if (bullet.type === "mirrorSign") {
        const life = bullet.life ?? 2450;
        if (bullet.age >= bullet.revealUntil && bullet.age < bullet.shuffleUntil) {
          const t = clamp((bullet.age - bullet.revealUntil) / Math.max(1, bullet.shuffleUntil - bullet.revealUntil), 0, 1);
          const eased = .5 - Math.cos(Math.PI * t) / 2;
          bullet.x = bullet.startX + (bullet.targetX - bullet.startX) * eased;
        } else if (bullet.age >= bullet.shuffleUntil) bullet.x = bullet.targetX;
        if (bullet.age > life && !bullet.resolved) {
          bullet.resolved = true; bullet.dead = true;
          if (bullet.correct) { this.mirrorFalse += 1; this.callbacks.onMirrorFalse?.({ damage:0, gain:5, miss:true }); }
        }
        continue;
      }
      if (bullet.type === "freezeCrystal") continue;

      if (bullet.type === "memoryShard") {
        if (bullet.life && bullet.activeAge > bullet.life) { bullet.dead=true; continue; }
        if (!this.memoryCarrying && Math.hypot(bullet.x-this.player.x,bullet.y-this.player.y) <= bullet.r + 10*this.dpr) {
          bullet.dead=true;
          this.memoryCarrying=true;
          this.memoryCarryingId=bullet.memoryId ?? null;
          this.effects.push({type:"memoryPickup",x:this.player.x,y:this.player.y,age:0,life:360,radius:18*this.dpr});
        }
        continue;
      }

      if (bullet.type === "futureAnchor") continue;

      if (bullet.type === "allySignal") {
        bullet.x += bullet.vx*dt; bullet.y += bullet.vy*dt;
        if (Math.hypot(bullet.x-this.player.x,bullet.y-this.player.y) <= bullet.r + this.player.radius*this.dpr + 4*this.dpr) {
          bullet.dead=true;
          this.allyLinks += 1;
          this.allyShieldCharges += 1;
          this.effects.push({type:"allyLink",x:this.player.x,y:this.player.y,age:0,life:520,radius:26*this.dpr,label:"COVER"});
          this.callbacks.onAllyLink?.({damage:8,ally:bullet.ally});
        }
        continue;
      }

      if (bullet.type === "stasisShard") {
        if (!this.stasisActive || bullet.returning) {
          bullet.x += bullet.vx * dt;
          bullet.y += bullet.vy * dt;
        }
        if (bullet.returning) {
          if (bullet.y < -24*this.dpr) {
            bullet.dead=true;
            this.stasisReturned += 1;
            this.callbacks.onStasisReturn?.({perfect:!!bullet.perfectMark,damage:bullet.perfectMark?15:11,reduce:bullet.perfectMark?9:7});
          }
          continue;
        }
        if (!this.stasisActive && Math.hypot(bullet.x-this.player.x,bullet.y-this.player.y) < bullet.r + this.player.radius*this.dpr) {
          this.hitPlayer(bullet, now, bullet.damage);
        }
        continue;
      }

      if (bullet.type === "originalFriendlyShot") {
        bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;
        const targets=this.bullets.filter((target)=>!target.dead&&target!==bullet&&target.originalBreakable);
        let hit=null,hitDist=Infinity;
        for(const target of targets){const dist=Math.hypot(target.x-bullet.x,target.y-bullet.y);if(dist <= (target.r??0)+(bullet.r??0)+3*this.dpr&&dist<hitDist){hit=target;hitDist=dist;}}
        if(hit){bullet.dead=true;hit.dead=true;this.originalShots+=1;this.originalBreaks+=1;this.effects.push({type:"originalBreak",x:hit.x,y:hit.y,age:0,life:360,radius:22*this.dpr,label:"SHOT"});this.callbacks.onOriginalBreak?.({count:1,armor:6,domination:5,adapt:2});}
        continue;
      }

      if (bullet.type === "belialFriendlyShot") {
        bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;
        const targets=this.bullets.filter((target)=>!target.dead&&target!==bullet&&target.breakableByBelialShot);
        let hit=null,distBest=Infinity;
        for(const target of targets){const dist=Math.hypot(target.x-bullet.x,target.y-bullet.y);if(dist<=(target.r??0)+(bullet.r??0)+4*this.dpr&&dist<distBest){hit=target;distBest=dist;}}
        if(hit){
          bullet.dead=true;hit.hp=(hit.hp??1)-1;
          this.effects.push({type:"originalBreak",x:hit.x,y:hit.y,age:0,life:300,radius:20*this.dpr,label:hit.hp<=0?"BREAK":"HIT"});
          if(hit.hp<=0){hit.dead=true;this.originalBreaks=(this.originalBreaks??0)+1;}
        }
        continue;
      }

      if (bullet.type === "nexusFriendlyShot") {
        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;
        const targets=this.bullets.filter((target)=>!target.dead && target!==bullet && ["mephistoTarget","mephistoDrainOrb","zagiDarkNode"].includes(target.type));
        let hit=null,hitDist=Infinity;
        for(const target of targets){
          const dist=Math.hypot(target.x-bullet.x,target.y-bullet.y);
          if(dist <= (target.r??0)+(bullet.r??0)+3*this.dpr && dist<hitDist){hit=target;hitDist=dist;}
        }
        if(hit){
          bullet.dead=true;hit.dead=true;
          this.nexusShotHits=(this.nexusShotHits??0)+1;
          this.effects.push({type:"nexusBreak",x:hit.x,y:hit.y,age:0,life:330,radius:22*this.dpr,label:hit.type==="mephistoDrainOrb"?"CUT":"HIT"});
          if(hit.type==="mephistoDrainOrb"){
            this.callbacks.onNexusShot?.({damage:6,gaugeReduce:12,perfect:hitDist<9*this.dpr,source:"drain-orb"});
          }else if(hit.type==="mephistoTarget"){
            this.callbacks.onNexusShot?.({damage:hit.restrained?8:6,gaugeReduce:hit.restrained?13:9,perfect:hitDist<8*this.dpr,source:"red-eye"});
          }else{
            this.callbacks.onNexusShot?.({damage:6,bondGain:hitDist<8*this.dpr?7:5,perfect:hitDist<8*this.dpr,source:"dark-node"});
          }
        }
        continue;
      }

      if (bullet.type === "zagiHoming") {
        const desired=Math.atan2(this.player.y-bullet.y,this.player.x-bullet.x);
        const speed=Math.hypot(bullet.vx,bullet.vy)||1;
        const current=Math.atan2(bullet.vy,bullet.vx);
        let diff=Math.atan2(Math.sin(desired-current),Math.cos(desired-current));
        const maxTurn=(bullet.homing??.7)*dt;
        diff=clamp(diff,-maxTurn,maxTurn);
        const angle=current+diff;
        bullet.vx=Math.cos(angle)*speed;bullet.vy=Math.sin(angle)*speed;
      }

      if (bullet.type === "originalOrb" && bullet.homing) {
        const desired=Math.atan2(this.player.y-bullet.y,this.player.x-bullet.x),speed=Math.hypot(bullet.vx,bullet.vy)||1,current=Math.atan2(bullet.vy,bullet.vx);
        let diff=Math.atan2(Math.sin(desired-current),Math.cos(desired-current));
        const turn=(bullet.homing??.5)*dt;diff=clamp(diff,-turn,turn);const a=current+diff;bullet.vx=Math.cos(a)*speed;bullet.vy=Math.sin(a)*speed;
      }
      if (["belialShot","belialGlyph"].includes(bullet.type) && bullet.curve) {
        const speed=Math.hypot(bullet.vx,bullet.vy)||1,current=Math.atan2(bullet.vy,bullet.vx),a=current+bullet.curve*dt;
        bullet.vx=Math.cos(a)*speed;bullet.vy=Math.sin(a)*speed;
      }
      if (bullet.type === "belialChaseOrb") {
        const desired=Math.atan2(this.player.y-bullet.y,this.player.x-bullet.x),speed=Math.hypot(bullet.vx,bullet.vy)||1,current=Math.atan2(bullet.vy,bullet.vx);
        let diff=Math.atan2(Math.sin(desired-current),Math.cos(desired-current));
        const turn=(bullet.homing??.8)*dt;diff=clamp(diff,-turn,turn);const a=current+diff;bullet.vx=Math.cos(a)*speed;bullet.vy=Math.sin(a)*speed;
      }
      if (bullet.life && bullet.activeAge > bullet.life && ["belialShot","belialChaseOrb","belialGlyph","belialMeteor","belialAsteroid"].includes(bullet.type)) { bullet.dead=true; continue; }
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      if (bullet.type === "belialChaseOrb" && bullet.canHitBelial && Math.hypot(bullet.x-this.belialAvatarX,bullet.y-this.belialAvatarY) <= bullet.r + 26*this.dpr && bullet.activeAge>420) {
        bullet.dead=true;this.effects.push({type:"originalBreak",x:bullet.x,y:bullet.y,age:0,life:420,radius:30*this.dpr,label:"RETURN"});
        this.callbacks.onBelialSelfHit?.({damage:18});
        continue;
      }

      if (bullet.type === "zettonBlinkStrike") {
        const dist=Math.hypot(bullet.x-this.player.x,bullet.y-this.player.y);
        if(dist < bullet.r + this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      } else if (bullet.type === "greezaRainShot") {
        const dist=Math.hypot(bullet.x-this.player.x,bullet.y-this.player.y);
        if(dist < bullet.r + this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      } else if (bullet.type === "originalRush") {
        const dpr=this.dpr,dx=bullet.x-this.player.x,dy=bullet.y-this.player.y;
        const ready=performance.now() <= (this.originalParryQueuedUntil??0);
        const radius=58*dpr;
        if(!bullet.counterResolved && ready && Math.abs(dy)<=38*dpr && Math.abs(dx)<=radius){
          bullet.counterResolved=true;bullet.dead=true;this.originalParryQueuedUntil=0;
          const perfect=Math.abs(dx)<=27*dpr;this.originalCounters+=1;
          this.effects.push({type:"originalParryHit",x:this.player.x,y:this.player.y,age:0,life:420,radius:28*dpr,label:perfect?"PERFECT":"COUNTER"});
          this.callbacks.onOriginalCounter?.({damage:perfect?12:7,perfect});
        } else if(Math.hypot(dx,dy)<bullet.r+this.player.radius*dpr) this.hitPlayer(bullet,now,bullet.damage);
      } else if (bullet.type === "originalOrb") {
        const dist=Math.hypot(bullet.x-this.player.x,bullet.y-this.player.y);
        if(dist < bullet.r + this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      } else if (["belialShot","belialChaseOrb","belialGlyph","belialMeteor","belialAsteroid"].includes(bullet.type)) {
        const dist=Math.hypot(bullet.x-this.player.x,bullet.y-this.player.y);
        if(dist < bullet.r + this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      } else if (bullet.type === "mephistoTarget") {
        const dist=Math.hypot(bullet.x-this.player.x,bullet.y-this.player.y);
        if(dist < bullet.r + this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      } else if (bullet.type === "mephistoDrainOrb") {
        const dist=Math.hypot(bullet.x-this.player.x,bullet.y-this.player.y);
        if(dist < bullet.r + this.player.radius*this.dpr){
          if(!bullet.drainResolved){bullet.drainResolved=true;this.nexusDrains=(this.nexusDrains??0)+1;this.callbacks.onNexusDrain?.({gain:bullet.drainGain??10});}
          this.hitPlayer(bullet,now,bullet.damage);
        }
      } else if (bullet.type === "zagiRush") {
        const dpr=this.dpr,dx=bullet.x-this.player.x,dy=bullet.y-this.player.y;
        const ready=performance.now() <= (this.nexusParryQueuedUntil??0);
        const radius=(this.nexusCounterAssist?66:50)*dpr;
        if(!bullet.counterResolved && ready && Math.abs(dy)<=35*dpr && Math.abs(dx)<=radius){
          bullet.counterResolved=true;bullet.dead=true;this.nexusParryQueuedUntil=0;
          const perfect=Math.abs(dx)<=27*dpr;
          this.nexusParries=(this.nexusParries??0)+1;
          this.effects.push({type:"nexusParryHit",x:this.player.x,y:this.player.y,age:0,life:420,radius:26*dpr,label:perfect?"BREAK!":"PARRY"});
          this.callbacks.onNexusParry?.({damage:perfect?10:6,bondGain:perfect?8:5,perfect});
        } else if(Math.hypot(dx,dy)<bullet.r+this.player.radius*dpr) this.hitPlayer(bullet,now,bullet.damage);
      } else if (bullet.type === "zagiReturnOrb") {
        const dpr=this.dpr;
        if(bullet.returning){
          if(bullet.y < -30*dpr){
            bullet.dead=true;this.noaReturns=(this.noaReturns??0)+1;
            this.callbacks.onNoaReturn?.({damage:bullet.harder?18:14,bondGain:bullet.harder?7:5,perfect:!!bullet.perfectReturn});
          }
        } else {
          const dist=Math.hypot(bullet.x-this.player.x,bullet.y-this.player.y);
          const ready=performance.now() <= (this.noaReturnQueuedUntil??0);
          const radius=(this.nexusNoaGuard?82:62)*dpr;
          if(ready && dist<=radius){
            bullet.returning=true;bullet.perfectReturn=dist<=30*dpr;this.noaReturnQueuedUntil=0;
            const tx=this.canvas.width/2,ty=-80*dpr,a=Math.atan2(ty-bullet.y,tx-bullet.x),speed=(bullet.harder?390:340)*dpr;
            bullet.vx=Math.cos(a)*speed;bullet.vy=Math.sin(a)*speed;
            this.effects.push({type:"noaReturn",x:this.player.x,y:this.player.y,age:0,life:430,radius:31*dpr,label:bullet.perfectReturn?"RETURN!":"TURN"});
          } else if(dist < bullet.r+this.player.radius*dpr) this.hitPlayer(bullet,now,bullet.damage);
        }
      } else if (bullet.type === "conductBolt") {
        const dpr = this.dpr;
        const dist = Math.hypot(bullet.x - this.player.x, bullet.y - this.player.y);
        const radius = (this.gingaConductAssist ? 48 : 34) * dpr;
        const ready = performance.now() <= (this.gingaConductQueuedUntil ?? 0);
        if (this.gingaLiveForm === "ginga" && ready && dist <= radius) {
          bullet.dead = true;
          const perfect = dist <= 18*dpr;
          this.conductedBolts = (this.conductedBolts ?? 0) + 1;
          this.gingaConductQueuedUntil = 0;
          this.effects.push({type:"gingaAbsorb",x:this.player.x,y:this.player.y,age:0,life:420,radius:24*dpr,perfect});
          this.callbacks.onConduct?.({amount:1,perfect});
          continue;
        }
        if (dist < bullet.r + this.player.radius*dpr) this.hitPlayer(bullet, now, bullet.damage);
      } else if (bullet.type === "pressureOrb") {
        const dpr=this.dpr;
        const dist=Math.hypot(bullet.x-this.player.x,bullet.y-this.player.y);
        const reflectRadius=(this.pressureMantleAssist?66:50)*dpr;
        const ready=performance.now() <= (this.pressureReflectQueuedUntil ?? 0);
        if (bullet.reflectable && this.pressureMantleActive && ready && dist<=reflectRadius) {
          bullet.dead=true;
          this.pressureReflectQueuedUntil=0;
          this.pressureReflections=(this.pressureReflections??0)+1;
          const perfect=dist<=25*dpr;
          this.effects.push({type:"pressureReflect",x:this.player.x,y:this.player.y,age:0,life:430,radius:30*dpr,label:perfect?"RETURN!":"REFLECT"});
          this.callbacks.onPressureReflect?.({damage:Math.round((this.pressureReflectDamage??18)*(perfect?1.25:1)),perfect});
          continue;
        }
        if (dist < bullet.r + this.player.radius*dpr) this.hitPlayer(bullet,now,bullet.damage);
      } else if (bullet.type === "blackEndCharge") {
        const dpr=this.dpr,dx=bullet.x-this.player.x,dy=bullet.y-this.player.y,distance=Math.hypot(dx,dy);
        const counterRadius=(this.leoCounterAssist?67:50)*dpr;
        const perfectRadius=28*dpr;
        const counterReady=performance.now() <= (this.counterQueuedUntil ?? 0);
        if (!bullet.counterResolved && counterReady && Math.abs(dy)<=38*dpr && Math.abs(dx)<=counterRadius) {
          bullet.counterResolved=true;bullet.dead=true;
          const perfect=Math.abs(dx)<=perfectRadius;
          this.counterCount+=1;if(perfect)this.perfectCounterCount+=1;
          const amount=(perfect?30:20)+(this.blackEndClose?7:0);
          this.effects.push({type:"hornCounter",x:this.player.x,y:this.player.y,age:0,life:470,radius:25*dpr,label:perfect?"HORN BREAK":"COUNTER"});
          this.callbacks.onCounter?.({amount,perfect,source:"black-end"});
          this.counterQueuedUntil=0;
        } else if(distance < bullet.r+this.player.radius*dpr) this.hitPlayer(bullet,now,bullet.damage);
      } else if (bullet.type === "twinRush") {
        const dpr = this.dpr;
        const dx = bullet.x - this.player.x;
        const dy = bullet.y - this.player.y;
        const distance = Math.hypot(dx, dy);
        const counterRadius = (this.leoCounterAssist ? 61 : 45) * dpr;
        const perfectRadius = 27 * dpr;
        const counterReady = performance.now() <= (this.counterQueuedUntil ?? 0);
        if (!bullet.counterResolved && counterReady && Math.abs(dy) <= 34 * dpr && Math.abs(dx) <= counterRadius) {
          bullet.counterResolved = true;
          bullet.dead = true;
          const perfect = Math.abs(dx) <= perfectRadius;
          this.counterCount += 1;
          if (perfect) this.perfectCounterCount += 1;
          const amount = (perfect ? 27 : 18) + (this.leoCrossBait ? 8 : 0);
          this.effects.push({ type: "counter", x: this.player.x, y: this.player.y, age: 0, life: 430, radius: 22 * dpr, label: perfect ? "PERFECT COUNTER" : "COUNTER" });
          this.callbacks.onCounter?.({ amount, perfect, source: bullet.source });
          this.counterQueuedUntil = 0;
        } else if (distance < bullet.r + this.player.radius * dpr) {
          this.hitPlayer(bullet, now, bullet.damage);
        }
      } else if (bullet.type === "feedingCell") {
        this.resolveNexusFeedingCell(bullet, now);
      } else if (bullet.type === "chaosShard") {
        this.resolveChaosShard(bullet, now);
      } else if (bullet.type === "chaosHeartOrb" && this.cosmosMiracleActive) {
        const dist = Math.hypot(bullet.x - this.player.x, bullet.y - this.player.y);
        if (dist < bullet.r + this.player.radius * this.dpr + 7 * this.dpr) {
          bullet.dead = true;
          this.cosmosHeartCollected += 1;
          this.effects.push({type:"cosmosHeartCollect",x:bullet.x,y:bullet.y,age:0,life:520,radius:25*this.dpr,label:"HEART"});
          this.callbacks.onCosmosHeartCollect?.({amount:bullet.heartGain??9,source:bullet.sourceLabel??"回应"});
        }
      } else if (["chaosMirror","chaosOrderNode","chaosHatredOrb","chaosHeartOrb","chaosDarkOrb"].includes(bullet.type)) {
        // These are ordinary moving Chaos projectiles.  v1.8 accidentally pasted
        // Canvas rendering code into the physics/collision loop here, where no `ctx`
        // exists.  The first Chaos projectile therefore threw a ReferenceError and
        // stopped requestAnimationFrame, leaving the Battle Box completely empty.
        const dist = Math.hypot(bullet.x - this.player.x, bullet.y - this.player.y);
        if (dist < bullet.r + this.player.radius * this.dpr) this.hitPlayer(bullet, now, bullet.damage);
      } else if (bullet.type === "gateLight") {
        this.resolveGateLight(bullet);
      } else if (this.mode === "guard" && bullet.guardProjectile) {
        this.resolveGuardCollision(bullet, now);
      } else {
        const playerY = bullet.worldSpace && this.mode === "platform" ? this.player.worldY : this.player.y;
        const dist = Math.hypot(bullet.x - this.player.x, bullet.y - playerY);
        if (dist < bullet.r + this.player.radius * this.dpr) this.hitPlayer(bullet, now, bullet.damage);
      }
    }

    this.bullets = this.bullets.filter((bullet) => {
      if (bullet.dead) return false;
      if (bullet.delay > 0) return true;
      if (bullet.type === "gateLight" && bullet.activeAge > bullet.life) return false;
      if (bullet.type === "mirrorSign" || bullet.type === "freezeCrystal") return true;
      if (["fissure", "tentacle", "darkcorridor", "petrify", "swoop", "chaosLance", "sacredFire", "gateChain", "gateRupture", "magmaSlash", "nexusTentacle", "circuitArc", "lightningColumn", "darkBeam", "freezeRay", "timeStopBand", "memorySweep", "grandBeam", "grandShock", "lugielLance", "lugielSlash", "lugielBladeGate", "lugielClockSweep", "girasWave", "pressureWarp", "pressureBalloon", "mephistoClaw", "mephistoCross", "zagiSweep", "zagiLightning", "zagiShockRing", "chaosPanel", "chaosProminence", "chaosBrokenHalo", "belialBattlenizerSweep", "belialLightning", "belialScytheGuard", "belialClawClamp", "belialDeathciumBeam", "belialDuelField", "belialGalaxyField", "belialAbyssField", "belialFinalClash", "grandKingAdvance", "grandSensorBeam", "grandThrowArm", "grandDebris", "grandFist", "grandDustWave", "grandBarrageCannons", "grandBarrageWave", "grandLaserHole", "fiveSonicWave", "fiveResonanceNode", "fiveLaneFrame", "fiveLaneLaser", "fiveWindmill", "fiveFallField", "fiveFallDebris", "fiveFreezeBeam", "fiveFireRay", "zettonFireballBurst", "greezaThunderSmash", "greezaVortex", "greezaSoundCore", "greezaSoundWave", "greezaHelix", "greezaWaveCannon", "zettonReturnBeam"].includes(bullet.type)) return true;
      const screenY = bullet.worldSpace && this.mode === "platform" ? this.platformScreenY(bullet.y) : bullet.y;
      return bullet.x > -margin && bullet.x < this.canvas.width + margin && screenY > -margin && screenY < this.canvas.height + margin;
    });
  }

  updateHazard(bullet, now) {
    const activeAge = bullet.activeAge;
    if (activeAge > bullet.life) {
      if (bullet.type === "fiveLaneFrame") this.fiveLaneMode = false;
      if (bullet.type === "fiveFallField") this.fiveFallMode = false;
      if (bullet.type === "belialClawClamp") this.belialClawMode = false;
      if (bullet.type === "circuitArc" && !bullet.staticResolved) {
        bullet.staticResolved = true;
        this.gingaStatic = clamp(this.gingaStatic + (bullet.staticGain ?? 6), 0, this.gingaStaticThreshold);
        this.reportGingaStatic(true);
      }
      bullet.dead = true;
      return;
    }

    if (bullet.type === "belialLightning") {
      const warn=bullet.warningMs??560,strikeEnd=warn+(bullet.strikeMs??260);
      if(activeAge>=warn&&activeAge<=strikeEnd){
        const r=this.player.radius*this.dpr,dist=Math.hypot(this.player.x-bullet.x,this.player.y-bullet.y);
        if(dist<=bullet.radius+r)this.hitPlayer(bullet,now,bullet.damage);
      }
      return;
    }
    if (bullet.type === "belialScytheGuard") {
      const warn=bullet.warningMs??720,travel=bullet.travelMs??920;
      if(activeAge<warn||activeAge>warn+travel)return;
      const p=clamp((activeAge-warn)/Math.max(1,travel),0,1);
      const start=bullet.fromRight?this.canvas.width+bullet.width:-bullet.width;
      const end=bullet.fromRight?-bullet.width:this.canvas.width+bullet.width;
      const x=start+(end-start)*p;
      const near=Math.abs(this.player.x-x)<=bullet.width*.72+this.player.radius*this.dpr;
      if(near&&!bullet.blocked&&!bullet.hitResolved){bullet.hitResolved=true;this.hitPlayer(bullet,now,bullet.damage);}
      return;
    }
    if (bullet.type === "belialClawClamp") {
      this.belialClawMode=true;
      const state=this.belialClawState(bullet,activeAge);
      if(state.danger){
        const safe=Math.abs(this.player.x-state.gapX)<=bullet.gapHalf-this.player.radius*this.dpr*.35;
        if(!safe)this.hitPlayer(bullet,now,bullet.damage);
      }
      return;
    }
    if (bullet.type === "belialDeathciumBeam") {
      const warn=bullet.warningMs??760,fireEnd=warn+(bullet.fireMs??520);
      if(activeAge>=warn&&activeAge<=fireEnd){
        const vx=bullet.x2-bullet.x1,vy=bullet.y2-bullet.y1,wx=this.player.x-bullet.x1,wy=this.player.y-bullet.y1,len2=vx*vx+vy*vy||1;
        const t=clamp((wx*vx+wy*vy)/len2,0,1),cx=bullet.x1+vx*t,cy=bullet.y1+vy*t,dist=Math.hypot(this.player.x-cx,this.player.y-cy);
        if(dist<=bullet.width*.5+this.player.radius*this.dpr)this.hitPlayer(bullet,now,bullet.damage);
      }
      return;
    }
    if (["belialDuelField","belialGalaxyField","belialAbyssField","belialFinalClash"].includes(bullet.type)) return;

    if (bullet.type === "grandKingAdvance") {
      // A persistent physical boundary: the monster's bulk walks into the box and
      // pushes the usable arena downward. Crossing it is impossible rather than an
      // arbitrary damage check, so the player reads it as Grand King's body pressure.
      const t = clamp(activeAge / Math.min(1500, bullet.life), 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const frontY = (bullet.startY ?? 0) + ((bullet.targetY ?? 0) - (bullet.startY ?? 0)) * eased;
      bullet.frontY = frontY;
      const pad = this.player.radius * this.dpr + 7 * this.dpr;
      if (this.player.y < frontY + pad) {
        this.player.y = Math.min(this.canvas.height - pad, frontY + pad);
        this.player.vy = Math.max(0, this.player.vy ?? 0);
      }
      return;
    }

    if (bullet.type === "grandSensorBeam") {
      const warm=bullet.warmup??0,local=Math.max(0,this.elapsed-(bullet.spawnElapsed??0)),dir=bullet.sensorDirection??1;
      bullet.sensorDir=dir;
      bullet.y=(bullet.startY??0)+dir*(bullet.speed??0)*(Math.max(0,local-warm)/1000);
      if(local<warm) return;
      // Blue punishes actual movement; orange punishes actual stillness. Orange gets
      // a tiny motion grace window so crossing the beam is not misread because key-up
      // and collision happen on adjacent animation frames.
      const moving=bullet.colorMode==="orange"
        ? this.playerMovingForColorRule({orangeGrace:true})
        : this.playerMovingForColorRule();
      const unsafe=bullet.colorMode==="blue"?moving:!moving;
      const hitKey=dir>0?"hitDown":"hitUp";
      if(!bullet[hitKey] && unsafe && Math.abs(this.player.y-bullet.y)<=bullet.thickness/2+this.player.radius*this.dpr){
        bullet[hitKey]=true; this.hitPlayer(bullet,now,bullet.damage);
      }
      return;
    }
    if (bullet.type === "grandThrowArm" || bullet.type === "grandBarrageCannons") return;
    if (bullet.type === "grandDebris") {
      const t=clamp(activeAge/bullet.life,0,1),u=1-t;
      bullet.x=u*u*bullet.startX+2*u*t*bullet.controlX+t*t*bullet.endX;
      bullet.y=u*u*bullet.startY+2*u*t*bullet.controlY+t*t*bullet.endY;
      bullet.rotation=(bullet.spin??0)*activeAge;
      if(Math.hypot(this.player.x-bullet.x,this.player.y-bullet.y)<=bullet.radius+this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "grandFist") {
      const warn=bullet.warningMs??500,fall=bullet.fallMs??420;
      if(activeAge<warn){bullet.fistY=-bullet.fistH*.62;return;}
      const t=clamp((activeAge-warn)/fall,0,1),eased=1-Math.pow(1-t,3);
      bullet.fistY=-bullet.fistH*.62+(this.canvas.height-bullet.fistH*.48+bullet.fistH*.62)*eased;
      const px=this.player.x,py=this.player.y,r=this.player.radius*this.dpr;
      if(px>=bullet.x-bullet.fistW*.45-r&&px<=bullet.x+bullet.fistW*.45+r&&py>=bullet.fistY-bullet.fistH*.48-r&&py<=bullet.fistY+bullet.fistH*.48+r) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "grandDustWave") {
      const t=activeAge/1000;
      bullet.x=bullet.originX+bullet.dir*(bullet.speed*t+bullet.layer*22*this.dpr);
      bullet.y=this.canvas.height-(13+bullet.layer*5)*this.dpr;
      const rr=bullet.radius*(.82+.12*Math.sin(activeAge/90+bullet.layer));
      if(Math.hypot(this.player.x-bullet.x,this.player.y-bullet.y)<=rr+this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "grandBarrageWave") {
      const t=clamp(activeAge/bullet.life,0,1),cols=bullet.columns??16,gap=bullet.gapLane??4,gapHalf=bullet.gapColumns??2.4;
      const yBase=-36*this.dpr+(this.canvas.height+72*this.dpr)*t;
      const r=this.player.radius*this.dpr,orbR=bullet.orbRadius;
      for(let i=0;i<cols;i++){
        const lane=(i/(cols-1))*8;
        if(Math.abs(lane-gap)<=gapHalf/2) continue;
        const q=i/(cols-1),x=this.canvas.width*(.015+.97*q);
        const y=yBase+Math.sin(q*Math.PI*3.4+(bullet.phase??0))*bullet.amplitude;
        if(Math.hypot(this.player.x-x,this.player.y-y)<=orbR+r){this.hitPlayer(bullet,now,bullet.damage);break;}
      }
      return;
    }
    if (bullet.type === "grandLaserHole") {
      const track=bullet.trackingMs??520,lock=bullet.lockMs??380,fireAt=track+lock;
      if(activeAge<track){bullet.targetX=this.player.x;bullet.targetY=this.player.y;}
      else if(!bullet.locked){bullet.locked=true;bullet.targetX=this.player.x;bullet.targetY=this.player.y;}
      if(activeAge<fireAt) return;
      const end=this.grandRayToBoundary(bullet.x,bullet.y,bullet.targetX,bullet.targetY);
      bullet.beamEnd=end;
      if(!bullet.bossResolved){
        bullet.bossResolved=true;
        if(end.edge==="top"&&Math.abs(end.x-this.canvas.width/2)<=bullet.hitHalf){
          this.effects.push({type:"originalBreak",x:end.x,y:6*this.dpr,age:0,life:420,radius:30*this.dpr,label:""});
          this.callbacks.onGrandLaserHit?.({damage:24,perfect:Math.abs(end.x-this.canvas.width/2)<=bullet.hitHalf*.42});
        }
      }
      const vx=end.x-bullet.x,vy=end.y-bullet.y,len2=vx*vx+vy*vy||1;
      const wx=this.player.x-bullet.x,wy=this.player.y-bullet.y,tt=clamp((wx*vx+wy*vy)/len2,0,1);
      const cx=bullet.x+vx*tt,cy=bullet.y+vy*tt;
      if(Math.hypot(this.player.x-cx,this.player.y-cy)<=bullet.width/2+this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "fiveSonicWave") {
      const warning=bullet.warningMs??420;
      if(activeAge<warning) return;
      const pr=this.player.radius*this.dpr;
      const coord=bullet.orientation==="vertical"?this.player.y:this.player.x;
      const center=this.fiveSonicCoordinate(bullet,coord,activeAge);
      const delta=bullet.orientation==="vertical"?Math.abs(this.player.x-center):Math.abs(this.player.y-center);
      if(delta<=bullet.width/2+pr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "fiveResonanceNode") {
      const warning=bullet.warningMs??1200, burst=bullet.burstMs??390;
      if(activeAge<warning || activeAge>warning+burst) return;
      const p=clamp((activeAge-warning)/Math.min(140,burst),0,1);
      const eased=1-Math.pow(1-p,3);
      const arm=(bullet.crossLength??120*this.dpr)*eased;
      const half=(bullet.crossHalfWidth??9*this.dpr)+this.player.radius*this.dpr;
      const dx=Math.abs(this.player.x-bullet.x),dy=Math.abs(this.player.y-bullet.y);
      const core=(bullet.radius??20*this.dpr)+this.player.radius*this.dpr;
      const inCore=Math.hypot(dx,dy)<=core;
      const inHorizontal=dx<=arm&&dy<=half;
      const inVertical=dy<=arm&&dx<=half;
      if(inCore||inHorizontal||inVertical) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "fiveLaneFrame") {
      this.fiveLaneMode=true;
      this.fiveLaneLeftX=bullet.left; this.fiveLaneRightX=bullet.right; this.fiveLaneCenterY=bullet.centerY;
      return;
    }
    if (bullet.type === "fiveLaneLaser") {
      const warning=bullet.warningMs??240, fire=bullet.fireMs??240;
      if(activeAge<warning || activeAge>warning+fire || bullet.fake || bullet.hitResolved) return;
      const center=this.canvas.width/2, onLeft=this.player.x<center;
      if((bullet.side==="left"&&onLeft)||(bullet.side==="right"&&!onLeft)){
        bullet.hitResolved=true; this.hitPlayer(bullet,now,bullet.damage);
      }
      return;
    }
    if (bullet.type === "fiveWindmill") {
      const warning=bullet.warningMs??0; if(activeAge<warning) return;
      const motionAge=activeAge-warning, pr=this.player.radius*this.dpr;
      if(!bullet.coreHitResolved && Math.hypot(this.player.x-bullet.x,this.player.y-bullet.y)<=bullet.coreR+pr){bullet.coreHitResolved=true;this.hitPlayer(bullet,now,bullet.damage);return;}
      const layers=bullet.layers??1,arms=bullet.arms??4,beads=bullet.beads??8;
      for(let layer=0;layer<layers;layer++) for(let a=0;a<arms;a++) for(let j=0;j<beads;j++){
        const p=this.fiveWindmillBeadPosition(bullet,a,j,layer,motionAge);
        if(p.active===false) continue;
        if(Math.hypot(this.player.x-p.x,this.player.y-p.y)<=bullet.beadR+pr){this.hitPlayer(bullet,now,bullet.damage);return;}
      }
      return;
    }
    if (bullet.type === "fiveFallField") { this.fiveFallMode=true; return; }
    if (bullet.type === "fiveFallDebris") {
      const t=activeAge/1000;
      bullet.x=(bullet.startX??bullet.x)+(bullet.vx??0)*t+Math.sin(t*3.1+(bullet.kind??0))*12*this.dpr;
      bullet.y=(bullet.startY??bullet.y)+(bullet.vy??0)*t;
      bullet.rotation=(bullet.spin??0)*activeAge;
      if(Math.hypot(this.player.x-bullet.x,this.player.y-bullet.y)<=bullet.r+this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "fiveFreezeBeam") {
      const warning=bullet.warningMs??420, fire=bullet.fireMs??260;
      if(activeAge<warning || activeAge>warning+fire || bullet.hitResolved) return;
      const sx=this.canvas.width-2*this.dpr, sy=this.canvas.height*.5;
      if(this.distancePointToSegment(this.player.x,this.player.y,sx,sy,bullet.targetX,bullet.targetY)<=bullet.width/2+this.player.radius*this.dpr){
        bullet.hitResolved=true;
        this.fiveFrozenUntil=Math.max(this.fiveFrozenUntil??0,this.elapsed+(bullet.slowMs??2200));
        this.fiveFreezeScale=Math.min(this.fiveFreezeScale??1,bullet.slowScale??.58);
        this.effects.push({type:"fiveFrost",x:this.player.x,y:this.player.y,age:0,life:Math.min(900,bullet.slowMs??2200),radius:22*this.dpr,label:""});
        this.hitPlayer(bullet,now,bullet.damage);
      }
      return;
    }
    if (bullet.type === "fiveFireRay") {
      const track=bullet.trackingMs??400, lock=bullet.lockMs??200, fireAt=track+lock;
      if(activeAge<track){bullet.targetX=this.player.x;bullet.targetY=this.player.y;}
      else if(!bullet.locked){bullet.locked=true;bullet.targetX=this.player.x;bullet.targetY=this.player.y;}
      const end=this.grandRayToBoundary(bullet.x,bullet.y,bullet.targetX,bullet.targetY);
      bullet.beamEnd=end;
      if(activeAge<fireAt) return;
      const vx=end.x-bullet.x,vy=end.y-bullet.y,ll=vx*vx+vy*vy||1,wx=this.player.x-bullet.x,wy=this.player.y-bullet.y;
      const tt=clamp((wx*vx+wy*vy)/ll,0,1),cx=bullet.x+vx*tt,cy=bullet.y+vy*tt;
      if(Math.hypot(this.player.x-cx,this.player.y-cy)<=bullet.width/2+this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "zettonFireballBurst") {
      if (Math.hypot(this.player.x-bullet.x,this.player.y-bullet.y) <= bullet.radius + this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "greezaThunderSmash") {
      if (Math.hypot(this.player.x-bullet.x,this.player.y-bullet.y) <= bullet.radius + this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "greezaVortex") {
      const t=bullet.activeAge/1000,phase=bullet.phase??0,speed=bullet.angularSpeed??1;
      bullet.x=clamp(bullet.baseX+Math.sin(t*speed+phase)*(bullet.ampX??0),bullet.radius,this.canvas.width-bullet.radius);
      bullet.y=clamp(bullet.baseY+Math.cos(t*speed*1.31+phase*.73)*(bullet.ampY??0),bullet.radius,this.canvas.height-bullet.radius);
      if(Math.hypot(this.player.x-bullet.x,this.player.y-bullet.y) <= bullet.radius + this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "greezaSoundCore") return;
    if (bullet.type === "greezaSoundWave") {
      const t=clamp(activeAge/bullet.life,0,1),radius=bullet.startRadius+(bullet.endRadius-bullet.startRadius)*t;
      const dist=Math.hypot(this.player.x-bullet.x,this.player.y-bullet.y);
      const moving=["a","d","w","s","arrowleft","arrowright","arrowup","arrowdown"].some((key)=>this.keys.has(key));
      const unsafe=bullet.colorMode==="blue"?moving:!moving;
      if(!bullet.playerResolved && unsafe && Math.abs(dist-radius) <= bullet.width/2 + this.player.radius*this.dpr){
        bullet.playerResolved=true; this.hitPlayer(bullet,now,bullet.damage);
      }
      return;
    }
    if (bullet.type === "greezaHelix") {
      const d=this.dpr,r=this.player.radius*d,frame=this.greezaHelixFrame(bullet,activeAge);
      const dx=this.player.x-frame.cx,dy=this.player.y-frame.cy;
      const sLocal=dx*frame.ux+dy*frame.uy,pLocal=dx*frame.nx+dy*frame.ny;
      if(Math.abs(sLocal) <= frame.halfLength+r){
        const wavePhase=(bullet.phase??0)+(bullet.waveSpeed??1.45)*(activeAge/1000),k=(Math.PI*2)/bullet.wavelength;
        const p1=Math.sin(sLocal*k+wavePhase)*bullet.amplitude,p2=Math.sin(sLocal*k+wavePhase+Math.PI)*bullet.amplitude;
        if(Math.min(Math.abs(pLocal-p1),Math.abs(pLocal-p2)) <= bullet.width/2+r) this.hitPlayer(bullet,now,bullet.damage);
      }
      return;
    }
    if (bullet.type === "greezaWaveCannon") {
      const endpoint=this.greezaWaveEndpoint(bullet,activeAge);
      const vx=endpoint.x-bullet.sourceX,vy=endpoint.y-bullet.sourceY,len2=vx*vx+vy*vy||1;
      const wx=this.player.x-bullet.sourceX,wy=this.player.y-bullet.sourceY,t=clamp((wx*vx+wy*vy)/len2,0,1);
      const cx=bullet.sourceX+vx*t,cy=bullet.sourceY+vy*t;
      if(Math.hypot(this.player.x-cx,this.player.y-cy) <= bullet.width/2 + this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "zettonReturnBeam") {
      const delta=bullet.orientation==="vertical"?Math.abs(this.player.x-bullet.center):Math.abs(this.player.y-bullet.center);
      if(delta <= bullet.width/2 + this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "mephistoClaw" || bullet.type === "zagiLightning") {
      const delta=bullet.orientation==="vertical"?Math.abs(this.player.x-bullet.center):Math.abs(this.player.y-bullet.center);
      if(delta<=bullet.width/2+this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "mephistoCross") {
      const dx=Math.abs(this.player.x-bullet.cx),dy=Math.abs(this.player.y-bullet.cy),r=this.player.radius*this.dpr;
      if(dx<=bullet.width/2+r || dy<=bullet.width/2+r) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "zagiSweep") {
      const px=this.player.x,py=this.player.y,vx=bullet.x2-bullet.x1,vy=bullet.y2-bullet.y1,wx=px-bullet.x1,wy=py-bullet.y1;
      const len2=vx*vx+vy*vy||1,t=clamp((wx*vx+wy*vy)/len2,0,1),cx=bullet.x1+vx*t,cy=bullet.y1+vy*t;
      if(Math.hypot(px-cx,py-cy)<=bullet.width/2+this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "zagiShockRing") {
      const t=clamp(activeAge/bullet.life,0,1),radius=bullet.startRadius+(bullet.endRadius-bullet.startRadius)*t;
      const dx=this.player.x-bullet.x,dy=this.player.y-bullet.y,dist=Math.hypot(dx,dy);
      if(Math.abs(dist-radius)<=bullet.width/2+this.player.radius*this.dpr){
        const angle=Math.atan2(dy,dx);
        const angularDistance=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
        const safeA=angularDistance(angle,bullet.safeAngle??0)<= (bullet.safeHalfAngle??0);
        const safeB=angularDistance(angle,(bullet.safeAngle??0)+Math.PI)<= (bullet.safeHalfAngle??0);
        if(!safeA && !safeB) this.hitPlayer(bullet,now,bullet.damage);
      }
      return;
    }
    if (bullet.type === "circuitArc") {
      const px=this.player.x, py=this.player.y;
      const vx=bullet.x2-bullet.x1, vy=bullet.y2-bullet.y1;
      const wx=px-bullet.x1, wy=py-bullet.y1;
      const len2=vx*vx+vy*vy||1;
      const t=clamp((wx*vx+wy*vy)/len2,0,1);
      const cx=bullet.x1+vx*t, cy=bullet.y1+vy*t;
      const dist=Math.hypot(px-cx,py-cy);
      if (dist <= bullet.width/2 + this.player.radius*this.dpr) this.hitPlayer(bullet, now, bullet.damage);
      return;
    }
    if (bullet.type === "lightningColumn") {
      if (Math.abs(this.player.x-bullet.x) <= bullet.width/2 + this.player.radius*this.dpr) this.hitPlayer(bullet, now, bullet.damage);
      return;
    }
    if (bullet.type === "darkBeam" || bullet.type === "freezeRay") {
      const delta = bullet.orientation === "vertical" ? Math.abs(this.player.x - bullet.center) : Math.abs(this.player.y - bullet.center);
      if (delta <= bullet.width/2 + this.player.radius*this.dpr) this.hitPlayer(bullet, now, bullet.damage);
      return;
    }
    if (bullet.type === "timeStopBand") {
      const coord = bullet.orientation === "vertical" ? this.player.x : this.player.y;
      if (Math.abs(coord - bullet.safeCenter) > bullet.safeHalfWidth - this.player.radius*this.dpr) this.hitPlayer(bullet, now, bullet.damage);
      return;
    }
    if (bullet.type === "memorySweep" || bullet.type === "grandBeam") {
      const delta = bullet.orientation === "vertical" ? Math.abs(this.player.x-bullet.center) : Math.abs(this.player.y-bullet.center);
      if (delta <= bullet.width/2 + this.player.radius*this.dpr) this.hitPlayer(bullet, now, bullet.damage);
      return;
    }
    if (bullet.type === "grandShock") {
      const t=clamp(activeAge/bullet.life,0,1);
      const half=bullet.startHalfWidth+(bullet.endHalfWidth-bullet.startHalfWidth)*Math.sin(Math.PI*t);
      if (Math.abs(this.player.x-bullet.center)<=half && Math.abs(this.player.y-this.canvas.height*.72)<=42*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "lugielSlash") {
      const px=this.player.x,py=this.player.y,vx=bullet.x2-bullet.x1,vy=bullet.y2-bullet.y1,wx=px-bullet.x1,wy=py-bullet.y1;
      const len2=vx*vx+vy*vy||1,t=clamp((wx*vx+wy*vy)/len2,0,1),cx=bullet.x1+vx*t,cy=bullet.y1+vy*t;
      if(Math.hypot(px-cx,py-cy)<=bullet.width/2+this.player.radius*this.dpr)this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "lugielBladeGate") {
      const t=clamp(activeAge/bullet.life,0,1),r=this.player.radius*this.dpr;
      if(bullet.orientation==="vertical"){
        const x=bullet.side==="start"?(-bullet.thickness+(this.canvas.width+bullet.thickness*2)*t):(this.canvas.width+bullet.thickness-(this.canvas.width+bullet.thickness*2)*t);
        const touching=Math.abs(this.player.x-x)<=bullet.thickness/2+r;
        const outside=Math.abs(this.player.y-bullet.gap)>bullet.safeHalf-r;
        if(touching&&outside)this.hitPlayer(bullet,now,bullet.damage);
      }else{
        const y=bullet.side==="start"?(-bullet.thickness+(this.canvas.height+bullet.thickness*2)*t):(this.canvas.height+bullet.thickness-(this.canvas.height+bullet.thickness*2)*t);
        const touching=Math.abs(this.player.y-y)<=bullet.thickness/2+r;
        const outside=Math.abs(this.player.x-bullet.gap)>bullet.safeHalf-r;
        if(touching&&outside)this.hitPlayer(bullet,now,bullet.damage);
      }
      return;
    }
    if (bullet.type === "lugielClockSweep") {
      const t=clamp(activeAge/bullet.life,0,1),angles=[bullet.startAngle+bullet.sweep*t];
      if(bullet.twin)angles.push(angles[0]+Math.PI);
      for(const angle of angles){
        const x2=bullet.cx+Math.cos(angle)*bullet.radius,y2=bullet.cy+Math.sin(angle)*bullet.radius;
        const vx=x2-bullet.cx,vy=y2-bullet.cy,wx=this.player.x-bullet.cx,wy=this.player.y-bullet.cy,len2=vx*vx+vy*vy||1;
        const q=clamp((wx*vx+wy*vy)/len2,0,1),cx=bullet.cx+vx*q,cy=bullet.cy+vy*q;
        if(Math.hypot(this.player.x-cx,this.player.y-cy)<=bullet.width/2+this.player.radius*this.dpr){this.hitPlayer(bullet,now,bullet.damage);break;}
      }
      return;
    }
    if (bullet.type === "lugielLance") {
      if (Math.abs(this.player.x-bullet.x)<=bullet.width/2+this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "girasWave") {
      const t=clamp(activeAge/bullet.life,0,1);
      const y=this.canvas.height+bullet.thickness-(this.canvas.height+bullet.thickness*2)*t;
      const r=this.player.radius*this.dpr;
      const inWave=Math.abs(this.player.y-y)<=bullet.thickness/2+r;
      const outsideGap=Math.abs(this.player.x-bullet.safeCenter)>bullet.safeHalfWidth-r;
      if(inWave&&outsideGap)this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "pressureWarp") {
      const delta=bullet.orientation==="vertical"?Math.abs(this.player.x-bullet.center):Math.abs(this.player.y-bullet.center);
      if(delta<=bullet.width/2+this.player.radius*this.dpr)this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "pressureBalloon") {
      const t=clamp(activeAge/bullet.life,0,1);
      const radius=bullet.startRadius+(bullet.endRadius-bullet.startRadius)*t;
      const dist=Math.hypot(this.player.x-bullet.x,this.player.y-bullet.y);
      // The contracting balloon is a prison: when the skin closes around tiny Leo, he must already be outside it.
      if(t>.72 && dist < radius + this.player.radius*this.dpr) this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "fissure") {
      if (Math.abs(this.player.x - bullet.x) <= bullet.width / 2 + this.player.radius * this.dpr) this.hitPlayer(bullet, now, bullet.damage);
      return;
    }
    if (bullet.type === "tentacle") {
      const t = clamp(activeAge / bullet.life, 0, 1), extent = Math.sin(Math.PI * t), maxLength = (bullet.orientation === "horizontal" ? this.canvas.width : this.canvas.height) * .68, length = maxLength * extent;
      let hit = false;
      if (bullet.orientation === "horizontal") {
        const start = bullet.side === "start", minX = start ? 0 : this.canvas.width - length, maxX = start ? length : this.canvas.width;
        hit = this.player.x >= minX - this.player.radius * this.dpr && this.player.x <= maxX + this.player.radius * this.dpr && Math.abs(this.player.y - bullet.lane) <= bullet.thickness / 2 + this.player.radius * this.dpr;
      } else {
        const start = bullet.side === "start", minY = start ? 0 : this.canvas.height - length, maxY = start ? length : this.canvas.height;
        hit = this.player.y >= minY - this.player.radius * this.dpr && this.player.y <= maxY + this.player.radius * this.dpr && Math.abs(this.player.x - bullet.lane) <= bullet.thickness / 2 + this.player.radius * this.dpr;
      }
      if (hit) this.hitPlayer(bullet, now, bullet.damage); return;
    }
    if (bullet.type === "darkcorridor") {
      const t = clamp(activeAge / bullet.life, 0, 1);
      const eased = .5 - Math.cos(Math.PI * t) / 2;
      const halfWidth = bullet.startHalfWidth + (bullet.endHalfWidth - bullet.startHalfWidth) * eased;
      const center = bullet.center + bullet.drift * Math.sin(Math.PI * t);
      const left = center - halfWidth;
      const right = center + halfWidth;
      const radius = this.player.radius * this.dpr;

      // Only the darkness outside the two visible boundary lines is dangerous.
      if (this.player.x - radius < left || this.player.x + radius > right) {
        this.hitPlayer(bullet, now, bullet.damage);
      }
      return;
    }
    if (bullet.type === "swoop") {
      const t = clamp(activeAge / bullet.life, 0, 1);
      const travel = this.canvas.width + bullet.width * 2;
      const x = bullet.fromLeft ? -bullet.width + travel * t : this.canvas.width + bullet.width - travel * t;
      const left = x - bullet.width / 2;
      const right = x + bullet.width / 2;
      const hazardY = bullet.y;
      const playerY = bullet.worldSpace && this.mode === "platform" ? this.player.worldY : this.player.y;
      const top = hazardY - bullet.height / 2;
      const bottom = hazardY + bullet.height / 2;
      const r = this.player.radius * this.dpr;
      if (this.player.x + r >= left && this.player.x - r <= right && playerY + r >= top && playerY - r <= bottom) this.hitPlayer(bullet, now, bullet.damage);
      return;
    }
    if (bullet.type === "chaosLance") {
      const px = this.player.x;
      const py = this.player.y;
      const vx = bullet.x2 - bullet.x1;
      const vy = bullet.y2 - bullet.y1;
      const wx = px - bullet.x1;
      const wy = py - bullet.y1;
      const len2 = vx * vx + vy * vy || 1;
      const t = clamp((wx * vx + wy * vy) / len2, 0, 1);
      const cx = bullet.x1 + vx * t;
      const cy = bullet.y1 + vy * t;
      const dist = Math.hypot(px - cx, py - cy);
      if (dist <= bullet.width / 2 + this.player.radius * this.dpr) this.hitPlayer(bullet, now, bullet.damage);
      return;
    }
    if (bullet.type === "sacredFire") {
      if (Math.abs(this.player.x - bullet.x) <= bullet.width / 2 + this.player.radius * this.dpr) {
        this.hitPlayer(bullet, now, bullet.damage);
      }
      return;
    }
    if (bullet.type === "gateChain") {
      const px = this.player.x, py = this.player.y;
      const vx = bullet.x2 - bullet.x1, vy = bullet.y2 - bullet.y1;
      const wx = px - bullet.x1, wy = py - bullet.y1;
      const len2 = vx * vx + vy * vy || 1;
      const t = clamp((wx * vx + wy * vy) / len2, 0, 1);
      const cx = bullet.x1 + vx * t, cy = bullet.y1 + vy * t;
      if (Math.hypot(px - cx, py - cy) <= bullet.width / 2 + this.player.radius * this.dpr) {
        this.hitPlayer(bullet, now, bullet.damage);
      }
      return;
    }
    if (bullet.type === "gateRupture") {
      const t = clamp(activeAge / bullet.life, 0, 1);
      const y = -bullet.thickness + (this.canvas.height + bullet.thickness * 2) * t;
      const r = this.player.radius * this.dpr;
      const inWave = Math.abs(this.player.y - y) <= bullet.thickness / 2 + r;
      const inGap = Math.abs(this.player.x - bullet.safeCenter) <= bullet.safeHalfWidth - r;
      if (inWave && !inGap) this.hitPlayer(bullet, now, bullet.damage);
      return;
    }
    if (bullet.type === "magmaSlash") {
      const dpr = this.dpr;
      const px = this.player.x, py = this.player.y;
      const ax = bullet.x1, ay = bullet.y1, bx = bullet.x2, by = bullet.y2;
      const abx = bx - ax, aby = by - ay, apx = px - ax, apy = py - ay;
      const denom = abx * abx + aby * aby || 1;
      const u = clamp((apx * abx + apy * aby) / denom, 0, 1);
      const cx = ax + abx * u, cy = ay + aby * u;
      const distance = Math.hypot(px - cx, py - cy);
      const counterReady = performance.now() <= (this.counterQueuedUntil ?? 0);
      const counterRadius = (this.leoCounterAssist ? 46 : 34) * dpr;
      if (!bullet.counterResolved && counterReady && distance <= counterRadius) {
        bullet.counterResolved = true;
        bullet.dead = true;
        const perfect = distance <= 18 * dpr;
        this.counterCount += 1;
        if (perfect) this.perfectCounterCount += 1;
        this.effects.push({ type: "counter", x: px, y: py, age: 0, life: 450, radius: 24 * dpr, label: perfect ? "SABER BREAK" : "PARRY" });
        this.callbacks.onCounter?.({ amount: perfect ? 31 : 22, perfect, source: "magma" });
        this.counterQueuedUntil = 0;
        return;
      }
      if (distance <= bullet.width / 2 + this.player.radius * dpr) this.hitPlayer(bullet, now, bullet.damage);
      return;
    }
    if (bullet.type === "nexusTentacle") {
      const px = this.player.x, py = this.player.y;
      const vx = bullet.x2 - bullet.x1, vy = bullet.y2 - bullet.y1;
      const wx = px - bullet.x1, wy = py - bullet.y1;
      const len2 = vx * vx + vy * vy || 1;
      const t = clamp((wx * vx + wy * vy) / len2, 0, 1);
      const cx = bullet.x1 + vx * t, cy = bullet.y1 + vy * t;
      if (Math.hypot(px - cx, py - cy) <= bullet.width / 2 + this.player.radius * this.dpr) {
        this.hitPlayer(bullet, now, bullet.damage);
      }
      return;
    }
    if (bullet.type === "belialBattlenizerSweep") {
      const t=clamp(activeAge/bullet.life,0,1),r=this.player.radius*this.dpr;
      const moving=this.playerMovingForColorRule({orangeGrace:bullet.colorMode==="orange"});
      let inBand=false;
      if(bullet.orientation==="horizontal"){
        const y=bullet.side==="start"?(-bullet.width+(this.canvas.height+bullet.width*2)*t):(this.canvas.height+bullet.width-(this.canvas.height+bullet.width*2)*t);
        inBand=Math.abs(this.player.y-y)<=bullet.width/2+r;
      }else{
        const x=bullet.side==="start"?(-bullet.width+(this.canvas.width+bullet.width*2)*t):(this.canvas.width+bullet.width-(this.canvas.width+bullet.width*2)*t);
        inBand=Math.abs(this.player.x-x)<=bullet.width/2+r;
      }
      const unsafe=bullet.colorMode==="blue"?moving:!moving;
      if(inBand&&unsafe)this.hitPlayer(bullet,now,bullet.damage);
      return;
    }
    if (bullet.type === "chaosPanel") {
      const r=this.player.radius*this.dpr, horizontal=bullet.orientation==="horizontal";
      if(horizontal){const t=clamp(activeAge/bullet.life,0,1),x=-bullet.thickness+(this.canvas.width+bullet.thickness*2)*t,inBand=Math.abs(this.player.x-x)<=bullet.thickness/2+r,inGap=Math.abs(this.player.y-bullet.gap)<=bullet.width/2-r;if(inBand&&!inGap)this.hitPlayer(bullet,now,bullet.damage);}
      else {const t=clamp(activeAge/bullet.life,0,1),y=-bullet.thickness+(this.canvas.height+bullet.thickness*2)*t,inBand=Math.abs(this.player.y-y)<=bullet.thickness/2+r,inGap=Math.abs(this.player.x-bullet.gap)<=bullet.width/2-r;if(inBand&&!inGap)this.hitPlayer(bullet,now,bullet.damage);} return;
    }
    if (bullet.type === "chaosProminence") {
      const t=clamp(activeAge/bullet.life,0,1),r=this.player.radius*this.dpr,gapHalf=(bullet.gapWidth??118*this.dpr)/2;
      if(bullet.orientation==="horizontal"){const y=bullet.side==="start"?(-bullet.thickness+(this.canvas.height+bullet.thickness*2)*t):(this.canvas.height+bullet.thickness-(this.canvas.height+bullet.thickness*2)*t),inBand=Math.abs(this.player.y-y)<=bullet.thickness/2+r,inGap=Math.abs(this.player.x-bullet.gap)<=gapHalf-r;if(inBand&&!inGap)this.hitPlayer(bullet,now,bullet.damage);}else{const x=bullet.side==="start"?(-bullet.thickness+(this.canvas.width+bullet.thickness*2)*t):(this.canvas.width+bullet.thickness-(this.canvas.width+bullet.thickness*2)*t),inBand=Math.abs(this.player.x-x)<=bullet.thickness/2+r,inGap=Math.abs(this.player.y-bullet.gap)<=gapHalf-r;if(inBand&&!inGap)this.hitPlayer(bullet,now,bullet.damage);}return;
    }
    if (bullet.type === "chaosBrokenHalo") {
      const t=clamp(activeAge/bullet.life,0,1),radius=bullet.startRadius+(bullet.endRadius-bullet.startRadius)*t,dx=this.player.x-bullet.centerX,dy=this.player.y-bullet.centerY,dist=Math.hypot(dx,dy),ang=Math.atan2(dy,dx),diff=Math.atan2(Math.sin(ang-bullet.gapAngle),Math.cos(ang-bullet.gapAngle)),safe=Math.abs(diff)<=bullet.gapHalf||Math.abs(Math.abs(diff)-Math.PI)<=bullet.gapHalf;
      if(Math.abs(dist-radius)<=bullet.thickness/2+this.player.radius*this.dpr&&!safe)this.hitPlayer(bullet,now,bullet.damage);return;
    }
    if (bullet.type === "petrify") {
      const hit = bullet.orientation === "vertical" ? Math.abs(this.player.x - bullet.center) <= bullet.width / 2 + this.player.radius * this.dpr : Math.abs(this.player.y - bullet.center) <= bullet.width / 2 + this.player.radius * this.dpr;
      if (hit) this.hitPlayer(bullet, now, bullet.damage);
    }
  }

  resolveNexusFeedingCell(bullet, now) {
    if (bullet.dead) return;
    const dpr = this.dpr;
    const slashReady = performance.now() <= (this.nexusSlashQueuedUntil ?? 0);
    const slashRadius = (this.nexusSlashAssist ? 70 : 52) * dpr;
    const playerDist = Math.hypot(bullet.x - this.player.x, bullet.y - this.player.y);

    if (slashReady && playerDist <= slashRadius) {
      bullet.dead = true;
      this.nexusSlashQueuedUntil = 0;
      this.feedingCellsSevered += 1;
      this.predation = clamp(this.predation - this.predationSeverReduce, 0, this.predationThreshold);
      this.effects.push({ type: "nexusSever", x: bullet.x, y: bullet.y, age: 0, life: 380, radius: 18 * dpr });
      this.callbacks.onNexusSever?.({ damage: this.predationSeverDamage, predationReduce: this.predationSeverReduce });
      this.callbacks.onPredationChange?.(this.predation);
      return;
    }

    const targetDist = Math.hypot(bullet.x - bullet.targetX, bullet.y - bullet.targetY);
    if (targetDist <= 17 * dpr || bullet.activeAge > bullet.life) {
      bullet.dead = true;
      this.feedingCellsFed += 1;
      this.predation = clamp(this.predation + this.predationFeedGain, 0, this.predationThreshold);
      this.effects.push({ type: "nexusFeed", x: bullet.targetX, y: bullet.targetY, age: 0, life: 420, radius: 20 * dpr });
      this.callbacks.onNexusFeed?.({ heal: this.predationFeedHeal, predationGain: this.predationFeedGain });
      this.callbacks.onPredationChange?.(this.predation);
    }
  }

  resolveChaosShard(bullet, now) {
    if (bullet.dead) return;
    const dpr = this.dpr;
    const playerDist = Math.hypot(bullet.x - this.player.x, bullet.y - this.player.y);
    const collectRadius = bullet.r + this.player.radius * dpr + (this.purifyActive ? 8 * dpr : 0);

    if (playerDist <= collectRadius) {
      if (this.purifyActive) {
        bullet.dead = true;
        this.purifiedFragments += 1;
        this.effects.push({ type: "purify", x: bullet.x, y: bullet.y, age: 0, life: 380, radius: 13 * dpr });
        this.callbacks.onPurify?.(this.chaosFragmentGain);
      } else {
        this.hitPlayer(bullet, now, bullet.damage);
        bullet.dead = true;
      }
      return;
    }

    const nodeDist = Math.hypot(bullet.x - bullet.targetX, bullet.y - bullet.targetY);
    if (nodeDist <= 13 * dpr) {
      bullet.dead = true;
      this.chaosReached += 1;
      this.effects.push({ type: "chaosReach", x: bullet.targetX, y: bullet.targetY, age: 0, life: 260, radius: 15 * dpr });
      this.callbacks.onChaosReach?.(this.chaosMissPenalty);
    }
  }

  resolveGateLight(bullet) {
    if (bullet.dead) return;
    const dpr = this.dpr;
    const dist = Math.hypot(bullet.x - this.player.x, bullet.y - this.player.y);
    if (dist > bullet.r + this.player.radius * dpr + 5 * dpr) return;

    bullet.dead = true;
    this.lightAnchorsCollected += 1;
    this.gatePressure = Math.max(0, this.gatePressure - this.gateLightReduce);
    this.effects.push({ type: "gateLight", x: bullet.x, y: bullet.y, age: 0, life: 420, radius: 17 * dpr });
    this.reportGatePressure(true);
    this.callbacks.onGateLight?.(this.gateLightReduce);
  }

  hitPlayer(bullet, now, damage) {
    if (now < this.player.invulnerableUntil) return;
    if (["pellet","fireball","chaosShard","memoryThorn","mephistoTarget","mephistoDrainOrb","mephistoSpear","zagiOrb","zagiNeedle","zagiHoming","zagiRush","zagiDarkNode","zagiReturnOrb","chaosMirror","chaosOrderNode","chaosHatredOrb","chaosHeartOrb","chaosDarkOrb","originalOrb","originalRush","zettonBlinkStrike","greezaRainShot"].includes(bullet.type)) bullet.dead = true;
    if (this.allyShieldCharges > 0) {
      this.allyShieldCharges -= 1;
      this.player.invulnerableUntil = now + 420;
      this.effects.push({type:"allyShield",x:this.player.x,y:this.player.y,age:0,life:420,radius:24*this.dpr,label:"COVER"});
      return;
    }
    if (this.mode === "memory" && this.memoryCarrying) {
      const memoryId = this.memoryCarryingId;
      this.memoryCarrying = false;
      this.memoryCarryingId = null;
      this.memoryDropped += 1;
      this.addBullet({type:"memoryShard",memoryId,x:this.player.x+18*this.dpr,y:this.player.y-8*this.dpr,vx:0,vy:0,r:8.5*this.dpr,damage:0,life:2600,delay:120});
      this.effects.push({type:"memoryDrop",x:this.player.x,y:this.player.y,age:0,life:420,radius:24*this.dpr,label:"LOST"});
    }
    this.player.invulnerableUntil = now + 680;
    this.hitCount += 1;
    this.callbacks.onHit?.(damage);
  }

  resolveGuardCollision(bullet, now) {
    const dist = Math.hypot(bullet.x - this.player.x, bullet.y - this.player.y), blockRadius = (bullet.special ? 37 : 29 + this.guardBonus) * this.dpr;
    if (dist > blockRadius) return;
    bullet.dead = true;
    if (this.guardDirection === bullet.side) {
      this.guardCount += 1; if (bullet.special) this.specialGuardCount += 1;
      this.spawnBlockEffect(bullet.x, bullet.y, bullet.special);
      this.callbacks.onGuard?.(bullet.special);
      if (bullet.zettonBounceBack && !bullet.zettonBounceReturn) {
        this.effects.push({ type:"zettonRicochet", x:bullet.x, y:bullet.y, age:0, life:260, radius:24*this.dpr });
        this.spawnZettonGuardReturn(bullet.side);
      }
      return;
    }
    this.hitPlayer(bullet, now, bullet.damage);
  }

  spawnBlockEffect(x, y, special = false) { this.effects.push({ type: "block", x, y, age: 0, life: special ? 400 : 240, radius: (special ? 25 : 14) * this.dpr }); }
  updateEffects(dt) { for (const effect of this.effects) effect.age += dt * 1000; this.effects = this.effects.filter((effect) => effect.age < effect.life); }
  clear() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }

  drawArenaBackground(now) {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height, bg = ctx.createLinearGradient(0, 0, 0, h);
    if (this.mode === "original") { bg.addColorStop(0, "rgba(8,18,28,.99)"); bg.addColorStop(1, "rgba(2,5,10,1)"); }
    else if (this.mode === "guard") { bg.addColorStop(0, "rgba(10,13,23,.99)"); bg.addColorStop(1, "rgba(3,5,11,1)"); }
    else if (this.mode === "platform") { bg.addColorStop(0, "rgba(30,44,56,.99)"); bg.addColorStop(1, "rgba(6,11,16,1)"); }
    else if (this.mode === "chaos") { bg.addColorStop(0, "rgba(31,21,42,.99)"); bg.addColorStop(1, "rgba(8,8,14,1)"); }
    else if (this.mode === "prophecy") { bg.addColorStop(0, "rgba(34,18,17,.99)"); bg.addColorStop(1, "rgba(7,7,10,1)"); }
    else if (this.mode === "leo") { bg.addColorStop(0, "rgba(18,26,31,.99)"); bg.addColorStop(1, "rgba(5,9,12,1)"); }
    else if (this.mode === "nexus") { bg.addColorStop(0, this.nexusMetaField ? "rgba(37,40,47,.99)" : "rgba(22,31,34,.99)"); bg.addColorStop(1, this.nexusMetaField ? "rgba(8,9,13,1)" : "rgba(5,10,12,1)"); }
    else if (this.mode === "memory") { bg.addColorStop(0, "rgba(23,19,38,.99)"); bg.addColorStop(1, "rgba(5,7,15,1)"); }
    else if (this.mode === "siege") { bg.addColorStop(0, "rgba(38,31,28,.99)"); bg.addColorStop(1, "rgba(7,9,12,1)"); }
    else if (this.mode === "stasis") { bg.addColorStop(0, this.stasisActive ? "rgba(28,31,36,.99)" : "rgba(19,14,24,.99)"); bg.addColorStop(1, "rgba(4,6,10,1)"); }
    else if (this.mode === "ginga") { bg.addColorStop(0, this.bossPhase === 0 ? "rgba(35,38,28,.99)" : "rgba(18,30,43,.99)"); bg.addColorStop(1, "rgba(5,8,11,1)"); }
    else if (this.mode === "mirror") { bg.addColorStop(0, "rgba(31,18,27,.99)"); bg.addColorStop(1, "rgba(6,7,11,1)"); }
    else if (this.mode === "freeze") { bg.addColorStop(0, "rgba(18,24,35,.99)"); bg.addColorStop(1, "rgba(4,6,10,1)"); }
    else if (this.patternSet === "gatanothor_boss") { bg.addColorStop(0, "rgba(14,18,25,.99)"); bg.addColorStop(1, "rgba(3,7,10,1)"); }
    else { bg.addColorStop(0, "rgba(15,30,39,.99)"); bg.addColorStop(1, "rgba(5,12,18,1)"); }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    const driftX = w * (.5 + Math.sin(now / 2800) * .08), haze = ctx.createRadialGradient(driftX, h * .4, 0, driftX, h * .4, w * .42);
    haze.addColorStop(0, this.patternSet === "gatanothor_boss" ? "rgba(94,76,118,.09)" : this.mode === "chaos" ? "rgba(139,72,170,.12)" : this.mode === "prophecy" ? "rgba(202,84,46,.12)" : this.mode === "leo" ? "rgba(174,67,49,.09)" : this.mode === "nexus" ? (this.nexusMetaField ? "rgba(108,127,139,.12)" : "rgba(92,144,137,.08)") : this.mode === "memory" ? "rgba(113,80,168,.12)" : this.mode === "siege" ? "rgba(204,133,75,.09)" : this.mode === "stasis" ? "rgba(155,48,79,.09)" : this.mode === "guard" ? "rgba(110,91,170,.07)" : "rgba(74,157,183,.07)"); haze.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = haze; ctx.fillRect(0, 0, w, h);
    if (this.mode === "prophecy") this.drawGateBackdrop(now);
    if (this.mode === "ginga" && this.patternSet === "thunder_darambia") this.drawGingaCircuitBackdrop(now);
    if (this.mode === "memory") this.drawMemoryBackdrop(now);
    if (this.mode === "stasis") this.drawStasisBackdrop(now);

    if (this.mode === "chaos") {
      const node = this.chaosNode();
      const pulse = .72 + Math.sin(now / 120) * .12;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.shadowBlur = 18 * this.dpr;
      ctx.shadowColor = "rgba(194,86,223,.72)";
      ctx.fillStyle = "rgba(58,25,73,.94)";
      ctx.beginPath();
      ctx.arc(node.x, node.y, 12 * this.dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(219,151,235,.82)";
      ctx.lineWidth = 1.4 * this.dpr;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawGateBackdrop(now) {
    const ctx = this.ctx, dpr = this.dpr;
    const ratio = clamp((this.gatePressure ?? 0) / 100, 0, 1);
    const bursting = this.elapsed < (this.gateBurstVisualUntil ?? 0);
    const cx = this.canvas.width / 2;
    const top = 4 * dpr;
    const outerW = 170 * dpr;
    const outerH = 52 * dpr;
    const gap = (10 + ratio * 68 + (bursting ? 24 : 0)) * dpr;

    ctx.save();
    const glow = ctx.createRadialGradient(cx, top + outerH * .55, 0, cx, top + outerH * .55, outerW * .7);
    glow.addColorStop(0, `rgba(255,108,52,${.08 + ratio * .18 + (bursting ? .15 : 0)})`);
    glow.addColorStop(1, "rgba(255,80,35,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - outerW, 0, outerW * 2, outerH * 2.2);

    ctx.strokeStyle = "rgba(194,129,101,.46)";
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.arc(cx, top + outerH, outerW / 2, Math.PI, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(10,8,10,.96)";
    ctx.fillRect(cx - outerW / 2, top + outerH * .45, outerW / 2 - gap / 2, outerH * .62);
    ctx.fillRect(cx + gap / 2, top + outerH * .45, outerW / 2 - gap / 2, outerH * .62);

    ctx.fillStyle = `rgba(255,109,55,${.18 + ratio * .45 + (bursting ? .2 : 0)})`;
    ctx.shadowBlur = 20 * dpr;
    ctx.shadowColor = "rgba(255,82,42,.58)";
    ctx.fillRect(cx - gap / 2, top + outerH * .47, gap, outerH * .54);
    ctx.restore();
  }

  drawGingaCircuitBackdrop(now) {
    const ctx=this.ctx,dpr=this.dpr;
    if (!this.circuitNodes?.length) return;
    ctx.save();
    ctx.lineWidth=.8*dpr;
    for (const [a,b] of this.circuitLinks ?? []) {
      const na=this.circuitNodes[a], nb=this.circuitNodes[b];
      const grounded=(na.groundedUntil??0)>this.elapsed || (nb.groundedUntil??0)>this.elapsed;
      ctx.globalAlpha=grounded?.12:.24;
      ctx.strokeStyle=grounded?"rgba(91,116,91,.58)":"rgba(198,183,78,.42)";
      ctx.beginPath();ctx.moveTo(na.x,na.y);ctx.lineTo(nb.x,nb.y);ctx.stroke();
    }
    const activeNodeIds = new Set();
    for (const bullet of this.bullets ?? []) {
      if (bullet.type === "circuitArc" && !bullet.dead) { activeNodeIds.add(bullet.a); activeNodeIds.add(bullet.b); }
    }
    for (const node of this.circuitNodes) {
      const grounded=(node.groundedUntil??0)>this.elapsed;
      const active=activeNodeIds.has(node.id);
      const pulse=.65+Math.sin(now/140+node.pulseOffset)*.18;
      ctx.globalAlpha=grounded?.34:(active?Math.min(1,pulse+.2):pulse*.48);
      ctx.strokeStyle=grounded?"rgba(120,156,125,.7)":active?"rgba(255,238,122,.98)":"rgba(177,164,76,.58)";
      ctx.fillStyle=grounded?"rgba(76,100,79,.38)":active?"rgba(248,206,62,.34)":"rgba(150,131,47,.12)";
      ctx.lineWidth=(active?1.8:1.1)*dpr;
      ctx.beginPath();ctx.arc(node.x,node.y,(active?11:8)*dpr,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
    ctx.restore();
  }

  drawMemoryBackdrop(now) {
    const ctx=this.ctx,dpr=this.dpr,heart=this.memoryHeart??{x:this.canvas.width/2,y:this.canvas.height*.48,radius:24*dpr};
    ctx.save();
    const glow=ctx.createRadialGradient(heart.x,heart.y,0,heart.x,heart.y,90*dpr);
    glow.addColorStop(0,"rgba(215,239,255,.2)");glow.addColorStop(.35,"rgba(120,157,212,.08)");glow.addColorStop(1,"rgba(20,12,38,0)");
    ctx.fillStyle=glow;ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
    ctx.strokeStyle="rgba(128,75,158,.18)";ctx.lineWidth=1.2*dpr;
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2+now/2600;ctx.beginPath();ctx.moveTo(heart.x,heart.y);ctx.quadraticCurveTo(heart.x+Math.cos(a)*110*dpr,heart.y+Math.sin(a)*70*dpr,this.canvas.width*(i%2?.92:.08),this.canvas.height*(.18+i*.1));ctx.stroke();}
    ctx.fillStyle="rgba(225,242,255,.88)";ctx.shadowBlur=18*dpr;ctx.shadowColor="rgba(159,210,255,.65)";ctx.beginPath();ctx.arc(heart.x,heart.y,5.5*dpr,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=.75;ctx.font=`${Math.round(9*dpr)}px sans-serif`;ctx.textAlign="center";ctx.fillText("MISUZU",heart.x,heart.y-18*dpr);
    if(this.memoryCarrying){ctx.strokeStyle="rgba(242,249,255,.86)";ctx.lineWidth=1.1*dpr;ctx.setLineDash([4*dpr,5*dpr]);ctx.beginPath();ctx.moveTo(this.player.x,this.player.y);ctx.lineTo(heart.x,heart.y);ctx.stroke();}
    ctx.restore();
  }

  drawStasisBackdrop(now) {
    if(!this.stasisActive)return;
    const ctx=this.ctx,dpr=this.dpr;
    ctx.save();ctx.globalAlpha=.2;ctx.strokeStyle="rgba(196,218,232,.6)";ctx.lineWidth=1*dpr;
    const r=(40+((now/7)%220))*dpr;ctx.beginPath();ctx.arc(this.canvas.width/2,this.canvas.height/2,r,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=.13;ctx.fillStyle="rgba(215,227,235,.32)";ctx.fillRect(0,0,this.canvas.width,this.canvas.height);ctx.restore();
  }

  drawTelegraph(bullet) {
    if (bullet.delay <= 0) return;
    const ctx = this.ctx, dpr = this.dpr, pulse = .32 + .48 * Math.abs(Math.sin(performance.now() / 120));
    if (bullet.telegraph) {
      ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = .75 * dpr; ctx.setLineDash([4 * dpr, 8 * dpr]); ctx.beginPath(); ctx.moveTo(bullet.telegraph.x1, bullet.telegraph.y1); ctx.lineTo(bullet.telegraph.x2, bullet.telegraph.y2); ctx.stroke(); ctx.restore();
    }
    if (bullet.edgeTelegraph) {
      let x = this.canvas.width / 2, y = this.canvas.height / 2;
      if (bullet.edgeTelegraph === "up") y = 11 * dpr; if (bullet.edgeTelegraph === "right") x = this.canvas.width - 11 * dpr; if (bullet.edgeTelegraph === "down") y = this.canvas.height - 11 * dpr; if (bullet.edgeTelegraph === "left") x = 11 * dpr;
      ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = bullet.zettonReverse ? "rgba(255,226,78,.98)" : bullet.special ? "rgba(255,159,72,.95)" : "rgba(255,255,255,.92)"; ctx.lineWidth = bullet.zettonReverse ? 2.2*dpr : 1.5 * dpr; ctx.beginPath(); ctx.arc(x, y, (bullet.special ? 19 : bullet.zettonReverse ? 13 : 9) * dpr, 0, Math.PI * 2); ctx.stroke(); if(bullet.zettonReverse){ctx.beginPath();ctx.arc(x,y,5*dpr,0,Math.PI*2);ctx.stroke();} ctx.restore();
    }
    if (bullet.type === "zettonBlinkStrike") {
      const horizontal=bullet.orientation==="horizontal";ctx.save();ctx.globalAlpha=.28+pulse*.55;ctx.strokeStyle=bullet.hyper?"rgba(255,119,46,.98)":"rgba(255,218,102,.94)";ctx.lineWidth=1.5*dpr;ctx.setLineDash([10*dpr,7*dpr]);ctx.beginPath();if(horizontal){ctx.moveTo(0,bullet.lane);ctx.lineTo(this.canvas.width,bullet.lane)}else{ctx.moveTo(bullet.lane,0);ctx.lineTo(bullet.lane,this.canvas.height)}ctx.stroke();ctx.setLineDash([]);
      // Edge warning is a compressed Zetton afterimage (horns + eyes), not the old
      // trapezoid marker that read like a tiny vehicle.
      const sx=horizontal?(bullet.side==="start"?20*dpr:this.canvas.width-20*dpr):bullet.lane,sy=horizontal?bullet.lane:(bullet.side==="start"?20*dpr:this.canvas.height-20*dpr);const dir=horizontal?(bullet.side==="start"?0:Math.PI):(bullet.side==="start"?Math.PI/2:-Math.PI/2);ctx.translate(sx,sy);ctx.rotate(dir);ctx.fillStyle="rgba(6,7,10,.92)";ctx.strokeStyle=bullet.hyper?"rgba(255,116,52,.95)":"rgba(255,225,118,.9)";ctx.lineWidth=1.2*dpr;ctx.beginPath();ctx.moveTo(-11*dpr,-10*dpr);ctx.lineTo(-7*dpr,-21*dpr);ctx.lineTo(-2*dpr,-11*dpr);ctx.lineTo(10*dpr,-9*dpr);ctx.lineTo(15*dpr,0);ctx.lineTo(10*dpr,9*dpr);ctx.lineTo(-2*dpr,11*dpr);ctx.lineTo(-7*dpr,21*dpr);ctx.lineTo(-11*dpr,10*dpr);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=bullet.hyper?"#ff783e":"#ffe16f";ctx.fillRect(-1*dpr,-5*dpr,7*dpr,2.3*dpr);ctx.fillRect(-1*dpr,2.7*dpr,7*dpr,2.3*dpr);ctx.restore();return;
    }
    if (bullet.type === "zettonFireballBurst") {
      ctx.save();ctx.globalAlpha=.25+pulse*.55;ctx.strokeStyle="rgba(255,151,56,.98)";ctx.lineWidth=2*dpr;ctx.setLineDash([7*dpr,6*dpr]);ctx.beginPath();ctx.arc(bullet.x,bullet.y,bullet.radius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.fillStyle="rgba(255,207,84,.9)";ctx.beginPath();ctx.arc(bullet.x+Math.cos(a)*bullet.radius*.72,bullet.y+Math.sin(a)*bullet.radius*.72,3*dpr,0,Math.PI*2);ctx.fill()}ctx.restore();return;
    }
    if (bullet.type === "greezaThunderSmash") {
      ctx.save();ctx.globalAlpha=.28+pulse*.58;ctx.strokeStyle=bullet.hard?"rgba(207,110,255,.98)":"rgba(163,224,255,.96)";ctx.lineWidth=1.8*dpr;ctx.setLineDash([6*dpr,6*dpr]);const r=bullet.radius;ctx.strokeRect(bullet.x-r,bullet.y-r,r*2,r*2);ctx.beginPath();ctx.arc(bullet.x,bullet.y,r*.72,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="rgba(255,255,255,.96)";ctx.font=`900 ${Math.round(17*dpr)}px sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("!",bullet.x,bullet.y);ctx.restore();return;
    }
    if (bullet.type === "greezaVortex") {
      ctx.save();ctx.globalAlpha=.2+pulse*.4;ctx.strokeStyle="rgba(202,134,255,.9)";ctx.lineWidth=1.2*dpr;ctx.setLineDash([5*dpr,6*dpr]);ctx.beginPath();ctx.arc(bullet.baseX,bullet.baseY,bullet.radius*1.15,0,Math.PI*2);ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "greezaSoundCore") {
      ctx.save();ctx.translate(bullet.x,bullet.y);ctx.globalAlpha=.22+pulse*.45;ctx.strokeStyle="rgba(212,151,255,.94)";ctx.lineWidth=1.5*dpr;ctx.beginPath();ctx.arc(0,0,22*dpr,0,Math.PI*2);ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "greezaSoundWave") {
      ctx.save();ctx.globalAlpha=.3+pulse*.55;ctx.strokeStyle=bullet.colorMode==="blue"?"rgba(83,169,255,.98)":"rgba(255,153,51,.98)";ctx.lineWidth=3*dpr;ctx.beginPath();ctx.arc(bullet.x,bullet.y,28*dpr,0,Math.PI*2);ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "greezaHelix") {
      const frame=this.greezaHelixFrame(bullet,0);ctx.save();ctx.globalAlpha=.24+pulse*.5;ctx.strokeStyle="rgba(209,147,255,.92)";ctx.lineWidth=1.3*dpr;ctx.setLineDash([6*dpr,7*dpr]);
      for(let strand=0;strand<2;strand++){ctx.beginPath();const steps=46;for(let i=0;i<=steps;i++){const ss=-frame.halfLength+frame.halfLength*2*(i/steps),pt=this.greezaHelixPoint(bullet,frame,ss,strand,0);i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y)}ctx.stroke()}ctx.setLineDash([]);
      const emit=(x,y,rot)=>{ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle="rgba(19,6,29,.9)";ctx.strokeStyle="rgba(225,177,255,.94)";ctx.lineWidth=1.4*dpr;ctx.beginPath();ctx.moveTo(-13*dpr,-10*dpr);ctx.lineTo(11*dpr,-8*dpr);ctx.lineTo(17*dpr,0);ctx.lineTo(10*dpr,9*dpr);ctx.lineTo(-12*dpr,11*dpr);ctx.lineTo(-5*dpr,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="rgba(239,221,255,.95)";ctx.fillRect(3*dpr,-3*dpr,5*dpr,2*dpr);ctx.fillRect(3*dpr,2*dpr,5*dpr,2*dpr);ctx.restore();};
      emit(frame.cx-frame.ux*frame.halfLength,frame.cy-frame.uy*frame.halfLength,frame.angle);emit(frame.cx+frame.ux*frame.halfLength,frame.cy+frame.uy*frame.halfLength,frame.angle+Math.PI);ctx.restore();return;
    }
    if (bullet.type === "greezaWaveCannon") {
      const end={x:bullet.targetEndX??bullet.targetX,y:bullet.targetEndY??bullet.targetY};ctx.save();ctx.globalAlpha=.25+pulse*.52;ctx.strokeStyle="rgba(215,145,255,.98)";ctx.lineWidth=2*dpr;ctx.setLineDash([11*dpr,8*dpr]);
      ctx.beginPath();ctx.moveTo(bullet.sourceX,bullet.sourceY);ctx.lineTo(bullet.targetX,bullet.targetY);ctx.stroke();
      if(Math.hypot(end.x-bullet.targetX,end.y-bullet.targetY)>4*dpr){ctx.globalAlpha*=.62;ctx.beginPath();ctx.moveTo(bullet.sourceX,bullet.sourceY);ctx.lineTo(end.x,end.y);ctx.stroke();}
      ctx.setLineDash([]);
      const ix=clamp(bullet.sourceX,14*dpr,this.canvas.width-14*dpr),iy=clamp(bullet.sourceY,14*dpr,this.canvas.height-14*dpr);ctx.translate(ix,iy);ctx.fillStyle="rgba(29,7,35,.92)";ctx.strokeStyle="rgba(222,163,255,.92)";ctx.lineWidth=1.3*dpr;ctx.beginPath();ctx.moveTo(-14*dpr,-4*dpr);ctx.lineTo(-6*dpr,-13*dpr);ctx.lineTo(0,-7*dpr);ctx.lineTo(7*dpr,-14*dpr);ctx.lineTo(15*dpr,-3*dpr);ctx.lineTo(8*dpr,10*dpr);ctx.lineTo(-9*dpr,10*dpr);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="rgba(242,224,255,.95)";ctx.beginPath();ctx.arc(0,1*dpr,3.2*dpr,0,Math.PI*2);ctx.fill();ctx.restore();return;
    }
    if (bullet.type === "zettonReturnBeam") {
      ctx.save();ctx.globalAlpha=.24+pulse*.5;ctx.strokeStyle="rgba(255,137,55,.96)";ctx.lineWidth=2*dpr;ctx.setLineDash([11*dpr,8*dpr]);ctx.beginPath();if(bullet.orientation==="vertical"){ctx.moveTo(bullet.center,0);ctx.lineTo(bullet.center,this.canvas.height)}else{ctx.moveTo(0,bullet.center);ctx.lineTo(this.canvas.width,bullet.center)}ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "belialBattlenizerSweep") {
      const isBlue=bullet.colorMode==="blue";
      ctx.save();ctx.globalAlpha=.30+pulse*.58;ctx.strokeStyle=isBlue?"rgba(92,184,255,.98)":"rgba(255,171,65,.98)";ctx.lineWidth=2.2*dpr;ctx.setLineDash([12*dpr,8*dpr]);ctx.shadowBlur=12*dpr;ctx.shadowColor=isBlue?"rgba(58,149,255,.75)":"rgba(255,126,37,.75)";
      if(bullet.orientation==="horizontal"){const y=bullet.side==="start"?10*dpr:this.canvas.height-10*dpr;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(this.canvas.width,y);ctx.stroke();}
      else{const x=bullet.side==="start"?10*dpr:this.canvas.width-10*dpr;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,this.canvas.height);ctx.stroke();}
      ctx.setLineDash([]);ctx.restore();return;
    }
    if (bullet.type === "lugielSlash") {
      ctx.save();ctx.globalAlpha=.32+pulse*.56;ctx.strokeStyle="rgba(255,62,91,.94)";ctx.lineWidth=1.6*dpr;ctx.setLineDash([11*dpr,8*dpr]);ctx.shadowBlur=9*dpr;ctx.shadowColor="rgba(215,28,61,.6)";ctx.beginPath();ctx.moveTo(bullet.x1,bullet.y1);ctx.lineTo(bullet.x2,bullet.y2);ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "lugielBladeGate") {
      ctx.save();ctx.globalAlpha=.28+pulse*.48;ctx.strokeStyle="rgba(244,80,102,.88)";ctx.lineWidth=1.4*dpr;ctx.setLineDash([8*dpr,7*dpr]);
      if(bullet.orientation==="vertical"){
        const x=bullet.side==="start"?8*dpr:this.canvas.width-8*dpr;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,bullet.gap-bullet.safeHalf);ctx.moveTo(x,bullet.gap+bullet.safeHalf);ctx.lineTo(x,this.canvas.height);ctx.stroke();
        ctx.strokeStyle="rgba(190,238,255,.75)";ctx.setLineDash([]);for(const y of [bullet.gap-bullet.safeHalf,bullet.gap+bullet.safeHalf]){ctx.beginPath();ctx.moveTo(x-10*dpr,y);ctx.lineTo(x+10*dpr,y);ctx.stroke();}
      }else{
        const y=bullet.side==="start"?8*dpr:this.canvas.height-8*dpr;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(bullet.gap-bullet.safeHalf,y);ctx.moveTo(bullet.gap+bullet.safeHalf,y);ctx.lineTo(this.canvas.width,y);ctx.stroke();
        ctx.strokeStyle="rgba(190,238,255,.75)";ctx.setLineDash([]);for(const x of [bullet.gap-bullet.safeHalf,bullet.gap+bullet.safeHalf]){ctx.beginPath();ctx.moveTo(x,y-10*dpr);ctx.lineTo(x,y+10*dpr);ctx.stroke();}
      }ctx.restore();return;
    }
    if (bullet.type === "lugielClockSweep") {
      ctx.save();ctx.globalAlpha=.28+pulse*.5;ctx.strokeStyle="rgba(255,71,96,.9)";ctx.lineWidth=1.5*dpr;ctx.setLineDash([9*dpr,7*dpr]);
      const bases=bullet.twin?[bullet.startAngle,bullet.startAngle+Math.PI]:[bullet.startAngle];
      for(const base of bases){ctx.beginPath();ctx.arc(bullet.cx,bullet.cy,bullet.radius*.62,base,base+bullet.sweep,bullet.sweep<0);ctx.stroke();}
      ctx.setLineDash([]);ctx.strokeStyle="rgba(213,235,245,.62)";for(const base of bases){for(const a of [base,base+bullet.sweep]){ctx.beginPath();ctx.moveTo(bullet.cx,bullet.cy);ctx.lineTo(bullet.cx+Math.cos(a)*bullet.radius,bullet.cy+Math.sin(a)*bullet.radius);ctx.stroke();}}ctx.restore();return;
    }
    if (bullet.type === "mephistoClaw" || bullet.type === "zagiLightning") {
      ctx.save();ctx.globalAlpha=.3+pulse*.5;ctx.strokeStyle=bullet.type==="mephistoClaw"?"rgba(220,79,151,.92)":"rgba(255,72,77,.94)";ctx.lineWidth=1.4*dpr;ctx.setLineDash([8*dpr,7*dpr]);ctx.beginPath();
      if(bullet.orientation==="vertical"){ctx.moveTo(bullet.center,0);ctx.lineTo(bullet.center,this.canvas.height)}else{ctx.moveTo(0,bullet.center);ctx.lineTo(this.canvas.width,bullet.center)}ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "mephistoCross") {
      ctx.save();ctx.globalAlpha=.28+pulse*.52;ctx.strokeStyle=bullet.zagi?"rgba(255,67,72,.94)":"rgba(220,73,154,.92)";ctx.lineWidth=1.25*dpr;ctx.setLineDash([7*dpr,7*dpr]);ctx.beginPath();ctx.moveTo(bullet.cx,0);ctx.lineTo(bullet.cx,this.canvas.height);ctx.moveTo(0,bullet.cy);ctx.lineTo(this.canvas.width,bullet.cy);ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "zagiSweep") {
      ctx.save();ctx.globalAlpha=.32+pulse*.48;ctx.strokeStyle="rgba(255,73,78,.93)";ctx.lineWidth=1.5*dpr;ctx.setLineDash([9*dpr,7*dpr]);ctx.beginPath();ctx.moveTo(bullet.x1,bullet.y1);ctx.lineTo(bullet.x2,bullet.y2);ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "zagiShockRing") {
      const center=bullet.safeAngle??0,gap=bullet.safeHalfAngle??.5;
      const gaps=[center,center+Math.PI];
      const intervals=[];
      const norm=(a)=>{a%=Math.PI*2;if(a<0)a+=Math.PI*2;return a};
      const blocked=[];
      for(const g of gaps){const a=norm(g-gap),b=norm(g+gap);if(a<b)blocked.push([a,b]);else{blocked.push([0,b],[a,Math.PI*2])}}
      blocked.sort((a,b)=>a[0]-b[0]);
      let cursor=0;for(const [a,b] of blocked){if(a>cursor)intervals.push([cursor,a]);cursor=Math.max(cursor,b)}if(cursor<Math.PI*2)intervals.push([cursor,Math.PI*2]);
      ctx.save();ctx.globalAlpha=.28+pulse*.48;ctx.strokeStyle="rgba(245,87,95,.9)";ctx.lineWidth=1.3*dpr;ctx.setLineDash([6*dpr,7*dpr]);
      for(const [a,b] of intervals){ctx.beginPath();ctx.arc(bullet.x,bullet.y,bullet.startRadius,a,b);ctx.stroke()}
      ctx.setLineDash([]);ctx.strokeStyle="rgba(210,238,255,.72)";ctx.globalAlpha=.32+pulse*.3;ctx.lineWidth=.9*dpr;
      for(const g of gaps){for(const edge of [g-gap,g+gap]){ctx.beginPath();ctx.moveTo(bullet.x,bullet.y);ctx.lineTo(bullet.x+Math.cos(edge)*bullet.startRadius*2.4,bullet.y+Math.sin(edge)*bullet.startRadius*2.4);ctx.stroke()}}
      ctx.restore();return;
    }
    if (bullet.type === "chaosOrderNode" && this.bossPhase === 1) {
      ctx.save();
      ctx.globalAlpha=.72+pulse*.24;
      ctx.strokeStyle="rgba(188,244,255,.98)";
      ctx.fillStyle="rgba(202,249,255,.95)";
      ctx.lineWidth=2*dpr;
      ctx.setLineDash([4*dpr,4*dpr]);
      ctx.beginPath();ctx.arc(bullet.x,bullet.y,22*dpr,0,Math.PI*2);ctx.stroke();
      ctx.setLineDash([]);ctx.beginPath();ctx.arc(bullet.x,bullet.y,10*dpr,0,Math.PI*2);ctx.stroke();
      ctx.font=`700 ${10*dpr}px monospace`;ctx.textAlign="center";ctx.fillText("CORE",bullet.x,bullet.y-28*dpr);
      ctx.restore();
    }
    if (["zagiRush","zagiReturnOrb","chaosMirror","chaosOrderNode","chaosHatredOrb","chaosHeartOrb","chaosDarkOrb"].includes(bullet.type)) {
      const isChaos=bullet.type.startsWith("chaos");
      ctx.save();ctx.globalAlpha=.34+pulse*.48;ctx.strokeStyle=bullet.type==="zagiReturnOrb"?"rgba(255,91,112,.95)":isChaos?(bullet.type==="chaosHeartOrb"?"rgba(191,244,255,.96)":"rgba(215,104,235,.95)"):"rgba(255,82,76,.94)";ctx.lineWidth=1.2*dpr;ctx.setLineDash([8*dpr,7*dpr]);
      if(bullet.type==="zagiRush"){ctx.beginPath();ctx.moveTo(0,bullet.telegraphY);ctx.lineTo(this.canvas.width,bullet.telegraphY);ctx.stroke();}
      else{ctx.beginPath();ctx.arc(bullet.x,bullet.y,18*dpr,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(bullet.x,bullet.y);ctx.lineTo(this.player.x,this.player.y);ctx.stroke();}
      ctx.restore();
    }
    if (["mephistoTarget","mephistoDrainOrb","zagiDarkNode"].includes(bullet.type)) {
      ctx.save();ctx.globalAlpha=.25+pulse*.5;ctx.strokeStyle=bullet.type==="mephistoTarget"?"rgba(255,92,117,.94)":bullet.type==="mephistoDrainOrb"?"rgba(185,89,215,.94)":"rgba(255,73,85,.94)";ctx.lineWidth=1.2*dpr;ctx.beginPath();ctx.arc(bullet.x,bullet.y,14*dpr,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    if (bullet.type === "chaosPanel") {
      const horizontal=bullet.orientation==="horizontal";
      ctx.save();ctx.globalAlpha=.25+pulse*.5;ctx.strokeStyle="rgba(225,145,243,.94)";ctx.lineWidth=1.3*dpr;ctx.setLineDash([7*dpr,7*dpr]);
      if(horizontal){const top=bullet.gap-bullet.width/2,bottom=bullet.gap+bullet.width/2;for(const y of [top,bottom]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(this.canvas.width,y);ctx.stroke()}ctx.fillStyle="rgba(143,55,171,.10)";ctx.fillRect(0,0,this.canvas.width,Math.max(0,top));ctx.fillRect(0,bottom,this.canvas.width,Math.max(0,this.canvas.height-bottom));}
      else{const left=bullet.gap-bullet.width/2,right=bullet.gap+bullet.width/2;for(const x of [left,right]){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,this.canvas.height);ctx.stroke()}ctx.fillStyle="rgba(143,55,171,.10)";ctx.fillRect(0,0,Math.max(0,left),this.canvas.height);ctx.fillRect(right,0,Math.max(0,this.canvas.width-right),this.canvas.height);}
      ctx.restore();return;
    }
    if (bullet.type === "chaosProminence") {
      const gapHalf=(bullet.gapWidth??118*dpr)/2;
      ctx.save();ctx.globalAlpha=.28+pulse*.48;ctx.strokeStyle="rgba(255,105,118,.95)";ctx.lineWidth=1.5*dpr;ctx.setLineDash([10*dpr,7*dpr]);
      if(bullet.orientation==="horizontal"){const y=bullet.side==="start"?12*dpr:this.canvas.height-12*dpr,left=Math.max(0,bullet.gap-gapHalf),right=Math.min(this.canvas.width,bullet.gap+gapHalf);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(left,y);ctx.moveTo(right,y);ctx.lineTo(this.canvas.width,y);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle="rgba(205,246,255,.88)";ctx.beginPath();ctx.moveTo(left,y-8*dpr);ctx.lineTo(left,y+8*dpr);ctx.moveTo(right,y-8*dpr);ctx.lineTo(right,y+8*dpr);ctx.stroke()}else{const x=bullet.side==="start"?12*dpr:this.canvas.width-12*dpr,top=Math.max(0,bullet.gap-gapHalf),bottom=Math.min(this.canvas.height,bullet.gap+gapHalf);ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,top);ctx.moveTo(x,bottom);ctx.lineTo(x,this.canvas.height);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle="rgba(205,246,255,.88)";ctx.beginPath();ctx.moveTo(x-8*dpr,top);ctx.lineTo(x+8*dpr,top);ctx.moveTo(x-8*dpr,bottom);ctx.lineTo(x+8*dpr,bottom);ctx.stroke()}
      ctx.restore();return;
    }
    if (bullet.type === "chaosBrokenHalo") {
      const centers=[bullet.gapAngle,bullet.gapAngle+Math.PI],gap=bullet.gapHalf;
      ctx.save();ctx.globalAlpha=.28+pulse*.48;ctx.strokeStyle="rgba(212,100,232,.92)";ctx.lineWidth=1.4*dpr;ctx.setLineDash([7*dpr,7*dpr]);
      for(let part=0;part<2;part++){const center=centers[part];ctx.beginPath();ctx.arc(bullet.centerX,bullet.centerY,bullet.startRadius,center+gap,center+Math.PI-gap);ctx.stroke()}
      ctx.setLineDash([]);ctx.strokeStyle="rgba(190,241,255,.84)";ctx.globalAlpha=.32+pulse*.35;ctx.lineWidth=1*dpr;
      for(const center of centers){for(const edge of [center-gap,center+gap]){ctx.beginPath();ctx.moveTo(bullet.centerX,bullet.centerY);ctx.lineTo(bullet.centerX+Math.cos(edge)*bullet.endRadius,bullet.centerY+Math.sin(edge)*bullet.endRadius);ctx.stroke()}}
      ctx.restore();return;
    }
    if (bullet.type === "girasWave") {
      const left=bullet.safeCenter-bullet.safeHalfWidth,right=bullet.safeCenter+bullet.safeHalfWidth;ctx.save();ctx.globalAlpha=.5;ctx.strokeStyle="rgba(160,225,244,.78)";ctx.lineWidth=1.2*dpr;ctx.setLineDash([8*dpr,7*dpr]);ctx.beginPath();ctx.moveTo(left,0);ctx.lineTo(left,this.canvas.height);ctx.moveTo(right,0);ctx.lineTo(right,this.canvas.height);ctx.stroke();ctx.fillStyle="rgba(119,204,233,.08)";ctx.fillRect(0,0,left,this.canvas.height);ctx.fillRect(right,0,this.canvas.width-right,this.canvas.height);ctx.restore();return;
    }
    if (bullet.type === "pressureWarp") {
      ctx.save();ctx.globalAlpha=.42;ctx.strokeStyle="rgba(212,167,244,.86)";ctx.lineWidth=1.3*dpr;ctx.setLineDash([5*dpr,6*dpr]);ctx.beginPath();if(bullet.orientation==="vertical"){ctx.moveTo(bullet.center,0);ctx.lineTo(bullet.center,this.canvas.height)}else{ctx.moveTo(0,bullet.center);ctx.lineTo(this.canvas.width,bullet.center)}ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "pressureBalloon") {
      ctx.save();ctx.globalAlpha=.35;ctx.strokeStyle="rgba(244,193,231,.8)";ctx.lineWidth=1.4*dpr;ctx.setLineDash([4*dpr,5*dpr]);ctx.beginPath();ctx.arc(bullet.x,bullet.y,bullet.startRadius,0,Math.PI*2);ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "fissure") {
      ctx.save(); ctx.globalAlpha = .3 + pulse * .45; ctx.strokeStyle = "rgba(255,179,94,.78)"; ctx.lineWidth = 1.2 * dpr; ctx.setLineDash([7 * dpr, 7 * dpr]); ctx.beginPath(); ctx.moveTo(bullet.x, 0); ctx.lineTo(bullet.x, this.canvas.height); ctx.stroke(); ctx.restore();
    }
    if (bullet.type === "tentacle") {
      ctx.save(); ctx.globalAlpha = .2 + pulse * .34; ctx.strokeStyle = "rgba(180,151,205,.7)"; ctx.lineWidth = 1.2 * dpr; ctx.setLineDash([8 * dpr, 9 * dpr]); ctx.beginPath(); if (bullet.orientation === "horizontal") { ctx.moveTo(0, bullet.lane); ctx.lineTo(this.canvas.width, bullet.lane); } else { ctx.moveTo(bullet.lane, 0); ctx.lineTo(bullet.lane, this.canvas.height); } ctx.stroke(); ctx.restore();
    }
    if (bullet.type === "darkcorridor") {
      const left = bullet.center - bullet.startHalfWidth;
      const right = bullet.center + bullet.startHalfWidth;
      ctx.save();
      ctx.globalAlpha = .14 + pulse * .08;
      ctx.fillStyle = "rgba(76,58,92,.78)";
      ctx.fillRect(0, 0, Math.max(0, left), this.canvas.height);
      ctx.fillRect(Math.min(this.canvas.width, right), 0, Math.max(0, this.canvas.width - right), this.canvas.height);

      // These two lines are the exact collision boundaries.
      ctx.globalAlpha = .5 + pulse * .38;
      ctx.strokeStyle = "rgba(226,213,235,.88)";
      ctx.lineWidth = 1.35 * dpr;
      ctx.setLineDash([7 * dpr, 8 * dpr]);
      for (const x of [left, right]) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.canvas.height);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (bullet.type === "swoop") {
      const drawY = bullet.worldSpace && this.mode === "platform" ? this.platformScreenY(bullet.y) : bullet.y;
      ctx.save(); ctx.globalAlpha = .22 + pulse * .34; ctx.strokeStyle = "rgba(255,213,147,.82)"; ctx.lineWidth = 1.1 * dpr; ctx.setLineDash([8 * dpr, 9 * dpr]);
      ctx.beginPath(); ctx.moveTo(0, drawY); ctx.lineTo(this.canvas.width, drawY); ctx.stroke(); ctx.restore();
    }
    if (bullet.type === "chaosLance") {
      ctx.save();
      ctx.globalAlpha = .24 + pulse * .38;
      ctx.strokeStyle = "rgba(210,121,226,.86)";
      ctx.lineWidth = 1.1 * dpr;
      ctx.setLineDash([7 * dpr, 8 * dpr]);
      ctx.beginPath();
      ctx.moveTo(bullet.x1, bullet.y1);
      ctx.lineTo(bullet.x2, bullet.y2);
      ctx.stroke();
      ctx.restore();
    }
    if (bullet.type === "sacredFire") {
      ctx.save();
      ctx.globalAlpha = .16 + pulse * .28;
      ctx.fillStyle = "rgba(255,108,52,.54)";
      ctx.fillRect(bullet.x - bullet.width / 2, 0, bullet.width, this.canvas.height);
      ctx.restore();
    }
    if (bullet.type === "gateChain") {
      ctx.save();
      ctx.globalAlpha = .28 + pulse * .42;
      ctx.strokeStyle = "rgba(255,146,93,.88)";
      ctx.lineWidth = 1.15 * dpr;
      ctx.setLineDash([7 * dpr, 8 * dpr]);
      ctx.beginPath(); ctx.moveTo(bullet.x1, bullet.y1); ctx.lineTo(bullet.x2, bullet.y2); ctx.stroke();
      ctx.restore();
    }
    if (bullet.type === "gateRupture") {
      ctx.save();
      ctx.globalAlpha = .32 + pulse * .32;
      ctx.strokeStyle = "rgba(255,196,135,.82)";
      ctx.lineWidth = 1.2 * dpr;
      ctx.setLineDash([8 * dpr, 8 * dpr]);
      const left = bullet.safeCenter - bullet.safeHalfWidth;
      const right = bullet.safeCenter + bullet.safeHalfWidth;
      for (const x of [left, right]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvas.height); ctx.stroke(); }
      ctx.restore();
    }
    if (bullet.type === "twinRush") {
      ctx.save();
      ctx.globalAlpha = .35 + pulse * .48;
      ctx.strokeStyle = bullet.source === "red" ? "rgba(255,120,104,.88)" : "rgba(186,205,218,.82)";
      ctx.lineWidth = 1.2 * dpr;
      ctx.setLineDash([8 * dpr, 8 * dpr]);
      ctx.beginPath(); ctx.moveTo(0, bullet.telegraphY); ctx.lineTo(this.canvas.width, bullet.telegraphY); ctx.stroke();
      const edgeX = bullet.vx > 0 ? 16 * dpr : this.canvas.width - 16 * dpr;
      ctx.setLineDash([]); ctx.beginPath(); ctx.arc(edgeX, bullet.telegraphY, 10 * dpr, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    if (bullet.type === "magmaSlash") {
      ctx.save(); ctx.globalAlpha = .35 + pulse * .5; ctx.strokeStyle = "rgba(255,178,86,.9)"; ctx.lineWidth = 1.5 * dpr; ctx.setLineDash([10 * dpr, 8 * dpr]);
      ctx.beginPath(); ctx.moveTo(bullet.x1, bullet.y1); ctx.lineTo(bullet.x2, bullet.y2); ctx.stroke(); ctx.restore();
    }
    if (bullet.type === "nexusTentacle") {
      ctx.save();
      ctx.globalAlpha = .24 + pulse * .38;
      ctx.strokeStyle = "rgba(229,132,117,.84)";
      ctx.lineWidth = 1.15 * dpr;
      ctx.setLineDash([7 * dpr, 8 * dpr]);
      ctx.beginPath(); ctx.moveTo(bullet.x1, bullet.y1); ctx.lineTo(bullet.x2, bullet.y2); ctx.stroke();
      ctx.restore();
    }
    if (bullet.type === "petrify") {
      ctx.save(); ctx.globalAlpha = .12 + pulse * .22; ctx.fillStyle = "rgba(225,232,235,.52)"; if (bullet.orientation === "vertical") ctx.fillRect(bullet.center - bullet.width / 2, 0, bullet.width, this.canvas.height); else ctx.fillRect(0, bullet.center - bullet.width / 2, this.canvas.width, bullet.width); ctx.restore();
    }

    if (bullet.type === "circuitArc") {
      ctx.save(); ctx.globalAlpha=.24+pulse*.5; ctx.strokeStyle="rgba(249,224,105,.9)"; ctx.lineWidth=1.2*dpr; ctx.setLineDash([8*dpr,7*dpr]);
      ctx.beginPath();ctx.moveTo(bullet.x1,bullet.y1);ctx.lineTo(bullet.x2,bullet.y2);ctx.stroke();ctx.restore();
    }
    if (bullet.type === "lightningColumn") {
      ctx.save();ctx.globalAlpha=.25+pulse*.48;ctx.fillStyle="rgba(255,229,100,.22)";ctx.fillRect(bullet.x-bullet.width/2,0,bullet.width,this.canvas.height);ctx.restore();
    }
    if (bullet.type === "conductBolt") {
      ctx.save();ctx.globalAlpha=.35+pulse*.5;ctx.strokeStyle="rgba(255,232,111,.86)";ctx.lineWidth=1.1*dpr;ctx.beginPath();ctx.arc(bullet.x,bullet.y,13*dpr,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(bullet.x,bullet.y);ctx.lineTo(bullet.targetX,bullet.targetY);ctx.globalAlpha=.22;ctx.stroke();ctx.restore();
    }

    if (["darkBeam", "freezeRay"].includes(bullet.type)) {
      ctx.save();ctx.globalAlpha=.3+pulse*.48;ctx.strokeStyle=bullet.type==="freezeRay"?"rgba(174,218,244,.9)":"rgba(244,94,108,.9)";ctx.lineWidth=1.4*dpr;ctx.setLineDash([8*dpr,7*dpr]);ctx.beginPath();if(bullet.orientation==="vertical"){ctx.moveTo(bullet.center,0);ctx.lineTo(bullet.center,this.canvas.height);}else{ctx.moveTo(0,bullet.center);ctx.lineTo(this.canvas.width,bullet.center);}ctx.stroke();ctx.restore();
    }
    if (bullet.type === "memorySweep" || bullet.type === "grandBeam") {
      ctx.save();
      ctx.globalAlpha=.3+pulse*.42;
      ctx.strokeStyle=bullet.type==="grandBeam"?"rgba(210,129,255,.92)":"rgba(169,111,205,.84)";
      ctx.lineWidth=1.4*dpr;
      ctx.setLineDash([9*dpr,8*dpr]);
      ctx.beginPath();
      if(bullet.orientation==="vertical"){ctx.moveTo(bullet.center,0);ctx.lineTo(bullet.center,this.canvas.height);}
      else{ctx.moveTo(0,bullet.center);ctx.lineTo(this.canvas.width,bullet.center);}
      ctx.stroke();ctx.restore();
    }
    if (bullet.type === "grandShock") {
      ctx.save();ctx.globalAlpha=.28+pulse*.4;ctx.strokeStyle="rgba(239,168,114,.9)";ctx.lineWidth=1.3*dpr;ctx.setLineDash([6*dpr,7*dpr]);ctx.beginPath();ctx.arc(bullet.center,this.canvas.height*.72,bullet.endHalfWidth*.62,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    if (bullet.type === "lugielLance") {
      ctx.save();ctx.globalAlpha=.32+pulse*.44;ctx.strokeStyle="rgba(224,65,91,.9)";ctx.lineWidth=1.4*dpr;ctx.setLineDash([7*dpr,7*dpr]);ctx.beginPath();ctx.moveTo(bullet.x,0);ctx.lineTo(bullet.x,this.canvas.height);ctx.stroke();ctx.restore();
    }
    if (bullet.type === "timeStopBand") {
      const a=bullet.safeCenter-bullet.safeHalfWidth,b=bullet.safeCenter+bullet.safeHalfWidth;ctx.save();ctx.globalAlpha=.32+pulse*.36;ctx.fillStyle="rgba(126,161,197,.14)";if(bullet.orientation==="vertical"){ctx.fillRect(0,0,Math.max(0,a),this.canvas.height);ctx.fillRect(b,0,Math.max(0,this.canvas.width-b),this.canvas.height);}else{ctx.fillRect(0,0,this.canvas.width,Math.max(0,a));ctx.fillRect(0,b,this.canvas.width,Math.max(0,this.canvas.height-b));}ctx.strokeStyle="rgba(210,235,250,.8)";ctx.lineWidth=1.2*dpr;ctx.setLineDash([7*dpr,7*dpr]);for(const v of [a,b]){ctx.beginPath();if(bullet.orientation==="vertical"){ctx.moveTo(v,0);ctx.lineTo(v,this.canvas.height);}else{ctx.moveTo(0,v);ctx.lineTo(this.canvas.width,v);}ctx.stroke();}ctx.restore();
    }
  }

  drawBullet(bullet) {
    if (bullet.delay > 0) { this.drawTelegraph(bullet); return; }
    if (["fissure", "tentacle", "darkcorridor", "petrify", "swoop", "chaosLance", "sacredFire", "gateChain", "gateRupture", "magmaSlash", "nexusTentacle", "circuitArc", "lightningColumn", "darkBeam", "freezeRay", "timeStopBand", "memorySweep", "grandBeam", "grandShock", "lugielLance", "lugielSlash", "lugielBladeGate", "lugielClockSweep", "girasWave", "pressureWarp", "pressureBalloon", "mephistoClaw", "mephistoCross", "zagiSweep", "zagiLightning", "zagiShockRing", "chaosPanel", "chaosProminence", "chaosBrokenHalo", "belialBattlenizerSweep", "belialLightning", "belialScytheGuard", "belialClawClamp", "belialDeathciumBeam", "belialDuelField", "belialGalaxyField", "belialAbyssField", "belialFinalClash", "grandKingAdvance", "grandSensorBeam", "grandThrowArm", "grandDebris", "grandFist", "grandDustWave", "grandBarrageCannons", "grandBarrageWave", "grandLaserHole", "fiveSonicWave", "fiveResonanceNode", "fiveLaneFrame", "fiveLaneLaser", "fiveWindmill", "fiveFallField", "fiveFallDebris", "fiveFreezeBeam", "fiveFireRay", "zettonFireballBurst", "greezaThunderSmash", "greezaVortex", "greezaSoundCore", "greezaSoundWave", "greezaHelix", "greezaWaveCannon", "zettonReturnBeam"].includes(bullet.type)) { this.drawHazard(bullet); return; }
    const ctx = this.ctx, r = bullet.r, dpr = this.dpr;
    const drawY = bullet.worldSpace && this.mode === "platform" ? this.platformScreenY(bullet.y) : bullet.y;
    if (bullet.type === "zettonBlinkStrike") {
      ctx.save();ctx.translate(bullet.x,drawY);ctx.rotate(Math.atan2(bullet.vy,bullet.vx));ctx.strokeStyle=bullet.hyper?"rgba(255,104,45,.96)":"rgba(255,220,104,.9)";ctx.shadowBlur=20*dpr;ctx.shadowColor=ctx.strokeStyle;ctx.lineWidth=1.3*dpr;
      // Multiple translucent silhouettes sell instantaneous movement while the solid
      // horned core remains the collision body.
      for(let ghost=3;ghost>=1;ghost--){ctx.save();ctx.translate(-r*.82*ghost,0);ctx.globalAlpha=.10+(3-ghost)*.05;ctx.fillStyle=bullet.hyper?"rgba(255,83,33,.72)":"rgba(255,213,83,.58)";ctx.beginPath();ctx.ellipse(0,0,r*1.05,r*.48,0,0,Math.PI*2);ctx.fill();ctx.restore();}
      ctx.globalAlpha=.98;ctx.fillStyle="rgba(6,7,10,.98)";ctx.beginPath();ctx.moveTo(r*1.42,0);ctx.lineTo(r*.48,-r*.72);ctx.lineTo(-r*.05,-r*.78);ctx.lineTo(-r*.55,-r*1.35);ctx.lineTo(-r*.72,-r*.55);ctx.lineTo(-r*1.18,-r*.32);ctx.lineTo(-r*1.18,r*.32);ctx.lineTo(-r*.72,r*.55);ctx.lineTo(-r*.55,r*1.35);ctx.lineTo(-r*.05,r*.78);ctx.lineTo(r*.48,r*.72);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=bullet.hyper?"#ff7439":"#ffe06a";ctx.fillRect(-r*.05,-r*.27,r*.42,r*.14);ctx.fillRect(-r*.05,r*.13,r*.42,r*.14);ctx.restore();return;
    }
    if (bullet.type === "greezaRainShot") {
      ctx.save();ctx.translate(bullet.x,drawY);ctx.rotate(Math.atan2(bullet.vy,bullet.vx)+Math.PI/2);ctx.shadowBlur=12*dpr;ctx.shadowColor="rgba(197,104,255,.88)";const g=ctx.createLinearGradient(0,-r*2.4,0,r*1.2);g.addColorStop(0,"rgba(182,83,245,0)");g.addColorStop(.52,"rgba(190,95,248,.9)");g.addColorStop(1,"rgba(244,236,255,.98)");ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-r*2.5);ctx.lineTo(r*.72,r*.8);ctx.lineTo(0,r*1.25);ctx.lineTo(-r*.72,r*.8);ctx.closePath();ctx.fill();ctx.restore();return;
    }
    if (["belialShot","belialChaseOrb","belialGlyph","belialMeteor","belialAsteroid","belialFriendlyShot"].includes(bullet.type)) {
      ctx.save();ctx.translate(bullet.x,drawY);
      if(bullet.type==="belialFriendlyShot"){
        ctx.fillStyle="#f1fdff";ctx.shadowBlur=14*dpr;ctx.shadowColor="rgba(111,221,255,.95)";ctx.fillRect(-2*dpr,-10*dpr,4*dpr,20*dpr);ctx.restore();return;
      }
      if(bullet.type==="belialMeteor"||bullet.type==="belialAsteroid"){
        ctx.rotate((bullet.activeAge??0)/1000*(bullet.spin??1));const rr=bullet.r;ctx.shadowBlur=bullet.type==="belialAsteroid"?12*dpr:7*dpr;ctx.shadowColor="rgba(255,116,74,.45)";ctx.fillStyle=bullet.type==="belialAsteroid"?"rgba(67,55,58,.98)":"rgba(93,78,75,.96)";ctx.strokeStyle="rgba(202,145,111,.8)";ctx.lineWidth=1*dpr;ctx.beginPath();for(let i=0;i<9;i++){const a=i*Math.PI*2/9,rad=rr*(.78+((i*37)%5)*.06);const x=Math.cos(a)*rad,y=Math.sin(a)*rad;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();if((bullet.hp??1)>1){ctx.fillStyle="rgba(255,117,73,.76)";ctx.fillRect(-rr*.35,-rr*.12,rr*.7,rr*.24);}ctx.restore();return;
      }
      if(bullet.type==="belialGlyph"){
        ctx.rotate((bullet.activeAge??0)/1000*(bullet.spin??1));
        const color=bullet.color==="blue"?"rgba(113,151,255,.98)":bullet.color==="red"?"rgba(255,66,88,.98)":bullet.color==="white"?"rgba(246,249,255,.99)":"rgba(210,111,255,.98)";
        ctx.strokeStyle=color;ctx.fillStyle=bullet.color==="white"?"rgba(247,250,255,.92)":"rgba(0,0,0,0)";ctx.shadowBlur=bullet.color==="white"?20*dpr:16*dpr;ctx.shadowColor=color;ctx.lineWidth=1.7*dpr;const rr=bullet.r*1.45;
        if(bullet.shape==="shard"){ctx.beginPath();ctx.moveTo(0,-rr*1.45);ctx.lineTo(rr*.48,rr*.52);ctx.lineTo(0,rr*.22);ctx.lineTo(-rr*.48,rr*.52);ctx.closePath();ctx.fill();ctx.stroke();}
        else{ctx.beginPath();for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/4,rad=i%2?rr*.42:rr;const x=Math.cos(a)*rad,y=Math.sin(a)*rad;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.stroke();const inner=rr*.52;ctx.globalAlpha*=.62;ctx.beginPath();ctx.moveTo(0,-inner);ctx.lineTo(inner,0);ctx.lineTo(0,inner);ctx.lineTo(-inner,0);ctx.closePath();ctx.stroke();}
        ctx.restore();return;
      }
      const rr=bullet.r,ghost=bullet.type==="belialChaseOrb"||bullet.style==="ghost";const g=ctx.createRadialGradient(0,0,0,0,0,rr*1.8);g.addColorStop(0,"rgba(255,226,226,1)");g.addColorStop(.25,"rgba(255,54,74,.98)");g.addColorStop(.62,"rgba(97,0,18,.88)");g.addColorStop(1,"rgba(32,0,8,0)");ctx.fillStyle=g;ctx.shadowBlur=ghost?20*dpr:12*dpr;ctx.shadowColor="rgba(255,31,57,.88)";ctx.beginPath();ctx.arc(0,0,rr*1.8,0,Math.PI*2);ctx.fill();if(ghost){ctx.strokeStyle="rgba(255,119,136,.65)";ctx.lineWidth=1*dpr;ctx.beginPath();ctx.arc(0,0,rr*.8,0,Math.PI*2);ctx.stroke();}ctx.restore();return;
    }
    if (["originalOrb","originalRush","originalFriendlyShot"].includes(bullet.type)) {
      ctx.save();ctx.translate(bullet.x,drawY);
      if(bullet.type==="originalFriendlyShot"){ctx.fillStyle="#e7fbff";ctx.shadowBlur=12*dpr;ctx.shadowColor="#79ddff";ctx.fillRect(-2*dpr,-9*dpr,4*dpr,18*dpr);}
      else if(bullet.type==="originalRush"){
        const army=bullet.source?.includes("belial-monster-army");
        ctx.fillStyle=army?"rgba(32,13,18,.98)":bullet.source?.includes("belial")?"rgba(255,64,79,.96)":"rgba(255,155,73,.96)";
        ctx.shadowBlur=18*dpr;ctx.shadowColor=army?"rgba(255,51,70,.65)":ctx.fillStyle;
        ctx.beginPath();
        if(army){ctx.moveTo(r*1.6,0);ctx.lineTo(r*.45,-r*.92);ctx.lineTo(-r*.18,-r*.48);ctx.lineTo(-r*1.45,-r*.78);ctx.lineTo(-r*.86,0);ctx.lineTo(-r*1.45,r*.78);ctx.lineTo(-r*.18,r*.48);ctx.lineTo(r*.45,r*.92);}
        else{ctx.moveTo(-r*1.5,-r*.8);ctx.lineTo(r*1.6,0);ctx.lineTo(-r*1.5,r*.8);}
        ctx.closePath();ctx.fill();
        if(army){ctx.fillStyle="rgba(255,66,82,.9)";ctx.fillRect(r*.35,-r*.22,r*.42,r*.18);}
      }
      else {const belial=bullet.source?.includes("belial"),greeza=bullet.source?.includes("greeza");ctx.fillStyle=belial?"#ff4256":greeza?"#c97bff":"#ffd166";ctx.shadowBlur=15*dpr;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();if(bullet.originalBreakable){ctx.strokeStyle="rgba(255,255,255,.9)";ctx.lineWidth=1*dpr;ctx.stroke();}}
      ctx.restore();return;
    }
    ctx.save(); ctx.translate(bullet.x, drawY);
    if (bullet.type === "nexusFriendlyShot") {
      ctx.shadowBlur=12*dpr;ctx.shadowColor="rgba(109,221,255,.92)";ctx.fillStyle="#e9fbff";ctx.fillRect(-1.7*dpr,-9*dpr,3.4*dpr,18*dpr);
      ctx.strokeStyle="rgba(128,220,255,.72)";ctx.lineWidth=.8*dpr;ctx.beginPath();ctx.moveTo(0,8*dpr);ctx.lineTo(0,18*dpr);ctx.stroke();
    } else if (bullet.type === "mephistoTarget") {
      const pulse=.75+Math.sin(performance.now()/85)*.18;ctx.globalAlpha=pulse;ctx.shadowBlur=15*dpr;ctx.shadowColor="rgba(255,48,84,.88)";ctx.fillStyle="rgba(120,8,28,.9)";ctx.strokeStyle="rgba(255,112,133,.96)";ctx.lineWidth=1.5*dpr;ctx.beginPath();ctx.ellipse(0,0,r*1.25,r*.68,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="#fff0ed";ctx.beginPath();ctx.arc(0,0,r*.25,0,Math.PI*2);ctx.fill();
    } else if (bullet.type === "mephistoDrainOrb") {
      const pulse=.78+Math.sin(performance.now()/75)*.14;ctx.globalAlpha=pulse;const g=ctx.createRadialGradient(0,0,1,0,0,r*1.7);g.addColorStop(0,"rgba(255,136,206,.98)");g.addColorStop(.35,"rgba(142,44,170,.88)");g.addColorStop(1,"rgba(35,8,53,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*1.7,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(227,145,248,.9)";ctx.lineWidth=1*dpr;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
    } else if (bullet.type === "mephistoSpear") {
      ctx.rotate(Math.atan2(bullet.vy,bullet.vx)+Math.PI/2);ctx.fillStyle="rgba(80,18,77,.98)";ctx.strokeStyle="rgba(231,92,177,.9)";ctx.lineWidth=1*dpr;ctx.shadowBlur=9*dpr;ctx.shadowColor="rgba(229,54,164,.62)";ctx.beginPath();ctx.moveTo(0,-r*1.6);ctx.lineTo(r*.7,r*1.1);ctx.lineTo(0,r*.72);ctx.lineTo(-r*.7,r*1.1);ctx.closePath();ctx.fill();ctx.stroke();
    } else if (bullet.type === "zagiOrb" || bullet.type === "zagiHoming") {
      const g=ctx.createRadialGradient(0,0,0,0,0,r*1.8);g.addColorStop(0,"rgba(255,218,218,1)");g.addColorStop(.25,"rgba(255,62,75,.95)");g.addColorStop(1,"rgba(90,0,13,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*1.8,0,Math.PI*2);ctx.fill();
    } else if (bullet.type === "zagiNeedle") {
      ctx.rotate(Math.atan2(bullet.vy,bullet.vx)+Math.PI/2);ctx.fillStyle="rgba(255,84,88,.95)";ctx.shadowBlur=9*dpr;ctx.shadowColor="rgba(255,40,58,.75)";ctx.beginPath();ctx.moveTo(0,-r*1.9);ctx.lineTo(r*.62,r*1.15);ctx.lineTo(-r*.62,r*1.15);ctx.closePath();ctx.fill();
    } else if (bullet.type === "zagiRush") {
      ctx.rotate(bullet.vx<0?Math.PI:0);ctx.fillStyle="rgba(34,12,18,.98)";ctx.strokeStyle="rgba(255,70,76,.9)";ctx.lineWidth=1.2*dpr;ctx.shadowBlur=12*dpr;ctx.shadowColor="rgba(255,33,49,.66)";ctx.beginPath();ctx.moveTo(r*1.6,0);ctx.lineTo(-r*.45,-r);ctx.lineTo(-r*1.2,-r*.3);ctx.lineTo(-r*1.2,r*.3);ctx.lineTo(-r*.45,r);ctx.closePath();ctx.fill();ctx.stroke();
    } else if (bullet.type === "zagiDarkNode") {
      ctx.rotate(performance.now()/240);ctx.fillStyle="rgba(39,4,11,.98)";ctx.strokeStyle="rgba(255,75,87,.96)";ctx.lineWidth=1.3*dpr;ctx.shadowBlur=13*dpr;ctx.shadowColor="rgba(255,42,58,.7)";for(let i=0;i<2;i++){ctx.rotate(Math.PI/4);ctx.strokeRect(-r*.7,-r*.7,r*1.4,r*1.4)}
    } else if (bullet.type === "zagiReturnOrb") {
      const g=ctx.createRadialGradient(0,0,0,0,0,r*2);g.addColorStop(0,"#fff");g.addColorStop(.18,bullet.returning?"rgba(206,241,255,.98)":"rgba(255,92,103,.98)");g.addColorStop(.6,bullet.returning?"rgba(104,205,255,.75)":"rgba(130,4,18,.72)");g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*2,0,Math.PI*2);ctx.fill();
    } else if (bullet.type === "gateLight") {
      const pulse = .76 + Math.sin(performance.now() / 110) * .12;
      ctx.globalAlpha = pulse;
      ctx.shadowBlur = 15 * this.dpr;
      ctx.shadowColor = "rgba(255,226,141,.82)";
      ctx.strokeStyle = "rgba(255,244,205,.96)";
      ctx.lineWidth = 1.35 * this.dpr;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(255,226,139,.94)";
      ctx.beginPath(); ctx.arc(0, 0, r * .43, 0, Math.PI * 2); ctx.fill();
    } else if (bullet.type === "chaosShard") {
      ctx.rotate(performance.now() / 360);
      ctx.shadowBlur = 13 * this.dpr;
      ctx.shadowColor = this.purifyActive ? "rgba(126,225,255,.78)" : "rgba(190,71,218,.72)";
      ctx.fillStyle = this.purifyActive ? "rgba(180,239,250,.96)" : "rgba(76,27,90,.98)";
      ctx.strokeStyle = this.purifyActive ? "rgba(245,255,255,.9)" : "rgba(224,139,239,.86)";
      ctx.lineWidth = 1.1 * this.dpr;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.15);
      ctx.lineTo(r * .8, 0);
      ctx.lineTo(0, r * 1.15);
      ctx.lineTo(-r * .8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (bullet.type === "feedingCell") {
      const pulse = .82 + Math.sin(performance.now() / 105) * .12;
      ctx.globalAlpha = pulse;
      ctx.shadowBlur = 15 * this.dpr;
      ctx.shadowColor = "rgba(255,126,63,.64)";
      ctx.fillStyle = "rgba(124,62,42,.98)";
      ctx.strokeStyle = "rgba(255,174,111,.9)";
      ctx.lineWidth = 1.1 * this.dpr;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        const rr = r * (i % 2 ? .78 : 1.08);
        const xx = Math.cos(a) * rr, yy = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = .55;
      ctx.strokeStyle = "rgba(255,204,143,.64)";
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo((bullet.targetX - bullet.x) * .16, (bullet.targetY - bullet.y) * .16); ctx.stroke();
    } else if (bullet.type === "memoryShard") {
      const palette={childhood:["255,226,170","255,245,212"],shrine:["147,220,255","226,247,255"],dream:["241,178,255","255,235,255"],together:["154,245,210","230,255,247"]}[bullet.memoryId]??["177,221,255","231,246,255"];
      const pulse=.8+Math.sin(performance.now()/120)*.15;ctx.globalAlpha=pulse;ctx.shadowBlur=17*dpr;ctx.shadowColor=`rgba(${palette[0]},.76)`;ctx.fillStyle=`rgba(${palette[1]},.97)`;ctx.beginPath();ctx.arc(0,0,r*.54,0,Math.PI*2);ctx.fill();ctx.strokeStyle=`rgba(${palette[0]},.78)`;ctx.lineWidth=1.1*dpr;ctx.beginPath();ctx.arc(0,0,r*1.2,0,Math.PI*2);ctx.stroke();
    } else if (bullet.type === "memoryThorn") {
      ctx.rotate(Math.atan2(bullet.vy,bullet.vx));ctx.fillStyle="rgba(93,43,112,.96)";ctx.strokeStyle="rgba(181,108,207,.78)";ctx.lineWidth=1*dpr;ctx.beginPath();ctx.moveTo(r*1.4,0);ctx.lineTo(-r,-r*.65);ctx.lineTo(-r*.45,0);ctx.lineTo(-r,r*.65);ctx.closePath();ctx.fill();ctx.stroke();
    } else if (bullet.type === "allySignal") {
      const palette=bullet.ally==="tiga"?["#dff5ff","#8fd0ff"]:bullet.ally==="seven"?["#fff2dd","#ff9e78"]:bullet.ally==="jean"?["#ddfff2","#74d8b8"]:["#f2f7ff","#a9c7ff"];ctx.shadowBlur=18*dpr;ctx.shadowColor=palette[1];ctx.fillStyle=palette[0];ctx.beginPath();ctx.arc(0,0,r*.6,0,Math.PI*2);ctx.fill();ctx.strokeStyle=palette[1];ctx.lineWidth=1.5*dpr;ctx.beginPath();ctx.moveTo(-r*2.3,0);ctx.lineTo(r*2.3,0);ctx.stroke();
    } else if (bullet.type === "stasisShard") {
      const marked=bullet.marked;ctx.rotate(performance.now()/420);ctx.shadowBlur=marked?18*dpr:9*dpr;ctx.shadowColor=marked?"rgba(123,224,255,.85)":"rgba(213,51,87,.6)";ctx.fillStyle=marked?"rgba(188,241,255,.95)":"rgba(92,19,42,.96)";ctx.strokeStyle=marked?"rgba(239,253,255,.96)":"rgba(232,87,112,.85)";ctx.lineWidth=1.2*dpr;ctx.beginPath();ctx.moveTo(0,-r*1.3);ctx.lineTo(r*.9,0);ctx.lineTo(0,r*1.3);ctx.lineTo(-r*.9,0);ctx.closePath();ctx.fill();ctx.stroke();
    } else if (bullet.type === "futureAnchor") {
      const pulse=.75+Math.sin(performance.now()/130)*.18;ctx.globalAlpha=pulse;ctx.shadowBlur=20*dpr;ctx.shadowColor="rgba(152,221,255,.72)";ctx.strokeStyle="rgba(222,247,255,.94)";ctx.lineWidth=1.4*dpr;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.fillStyle="rgba(224,245,255,.94)";ctx.font=`${Math.round(8*dpr)}px sans-serif`;ctx.textAlign="center";ctx.fillText(bullet.label,0,-r-8*dpr);ctx.fillStyle="rgba(161,225,255,.8)";ctx.beginPath();ctx.moveTo(0,-r*.65);ctx.lineTo(r*.58,r*.5);ctx.lineTo(-r*.58,r*.5);ctx.closePath();ctx.fill();
    } else if (bullet.type === "conductBolt") {
      ctx.rotate(performance.now()/115);
      ctx.strokeStyle = "rgba(255,230,105,.96)";
      ctx.lineWidth = 2.1*this.dpr;
      ctx.shadowBlur = 12*this.dpr;
      ctx.shadowColor = "rgba(255,214,64,.72)";
      ctx.beginPath();
      for (let i=0;i<6;i++) { const a=i*Math.PI/3; const rr=i%2===0?r*1.25:r*.55; const xx=Math.cos(a)*rr, yy=Math.sin(a)*rr; i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy); }
      ctx.closePath();ctx.stroke();
    } else if (bullet.type === "pressureOrb") {
      ctx.rotate(performance.now()/170);
      const glow=ctx.createRadialGradient(0,0,0,0,0,r*2.1);glow.addColorStop(0,"rgba(255,246,255,.98)");glow.addColorStop(.28,"rgba(213,161,255,.92)");glow.addColorStop(.72,"rgba(106,43,161,.48)");glow.addColorStop(1,"rgba(70,25,120,0)");ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,r*2.1,0,Math.PI*2);ctx.fill();ctx.strokeStyle=bullet.reflectable?"rgba(244,247,255,.95)":"rgba(225,189,255,.76)";ctx.lineWidth=1.25*dpr;ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3,rr=i%2?r*.7:r*1.25;i?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.stroke();
    } else if (bullet.type === "pressureDebris") {
      ctx.rotate((bullet.age/480)*(bullet.spin??1));ctx.fillStyle="rgba(103,97,91,.96)";ctx.strokeStyle="rgba(193,182,165,.58)";ctx.lineWidth=1*dpr;ctx.shadowBlur=6*dpr;ctx.shadowColor="rgba(0,0,0,.45)";ctx.beginPath();for(let i=0;i<7;i++){const a=i*Math.PI*2/7,rr=r*(.72+(i%3)*.13);i?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill();ctx.stroke();
    } else if (bullet.type === "blackFlame") {
      const pulse=.86+Math.sin(performance.now()/55)*.08;ctx.globalAlpha=pulse;ctx.shadowBlur=13*dpr;ctx.shadowColor="rgba(255,91,42,.52)";ctx.fillStyle="rgba(49,18,23,.96)";ctx.strokeStyle="rgba(255,115,58,.9)";ctx.lineWidth=1.2*dpr;ctx.beginPath();ctx.moveTo(0,-r*1.7);ctx.quadraticCurveTo(r*1.2,-r*.3,r*.72,r*.75);ctx.quadraticCurveTo(0,r*1.35,-r*.72,r*.75);ctx.quadraticCurveTo(-r*1.2,-r*.3,0,-r*1.7);ctx.fill();ctx.stroke();
    } else if (bullet.type === "blackEndCharge") {
      ctx.rotate(bullet.vx>0?0:Math.PI);ctx.fillStyle="rgba(55,49,53,.98)";ctx.strokeStyle="rgba(245,221,193,.88)";ctx.lineWidth=1.2*dpr;ctx.shadowBlur=9*dpr;ctx.shadowColor="rgba(255,106,63,.36)";ctx.beginPath();ctx.moveTo(20*dpr,0);ctx.lineTo(5*dpr,-15*dpr);ctx.lineTo(-15*dpr,-13*dpr);ctx.lineTo(-21*dpr,0);ctx.lineTo(-15*dpr,13*dpr);ctx.lineTo(5*dpr,15*dpr);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeStyle="rgba(245,235,210,.96)";ctx.lineWidth=3*dpr;ctx.beginPath();ctx.moveTo(4*dpr,-10*dpr);ctx.lineTo(21*dpr,-19*dpr);ctx.moveTo(4*dpr,10*dpr);ctx.lineTo(21*dpr,19*dpr);ctx.stroke();
    } else if (bullet.type === "blackEndDisc") {
      ctx.rotate((bullet.age/115)*(bullet.spin??1));ctx.shadowBlur=14*dpr;ctx.shadowColor="rgba(201,42,45,.6)";ctx.fillStyle="rgba(24,19,22,.98)";ctx.strokeStyle="rgba(255,105,75,.9)";ctx.lineWidth=1.6*dpr;ctx.beginPath();for(let i=0;i<12;i++){const a=i*Math.PI/6,rr=i%2?r*1.45:r*.78;i?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="rgba(255,97,61,.95)";ctx.beginPath();ctx.arc(0,0,r*.28,0,Math.PI*2);ctx.fill();
    } else if (bullet.type === "twinRush") {
      ctx.rotate(bullet.vx > 0 ? 0 : Math.PI);
      ctx.fillStyle = bullet.source === "red" ? "rgba(235,81,63,.96)" : "rgba(169,186,198,.96)";
      ctx.shadowBlur = 10 * this.dpr;
      ctx.shadowColor = bullet.source === "red" ? "rgba(255,94,72,.5)" : "rgba(205,226,238,.42)";
      ctx.beginPath(); ctx.moveTo(16 * this.dpr, 0); ctx.lineTo(-12 * this.dpr, -10 * this.dpr); ctx.lineTo(-7 * this.dpr, 0); ctx.lineTo(-12 * this.dpr, 10 * this.dpr); ctx.closePath(); ctx.fill();
    } else if (bullet.type === "mirrorSign") {
      const reveal = bullet.age < bullet.revealUntil;
      const assisted = this.mirrorRead && bullet.correct;
      const w=84*dpr,h=32*dpr;
      ctx.fillStyle = reveal && bullet.correct ? "rgba(238,246,255,.18)" : "rgba(42,19,31,.92)";
      ctx.strokeStyle = reveal && bullet.correct ? "rgba(245,250,255,.98)" : assisted ? "rgba(197,221,244,.62)" : "rgba(186,67,90,.62)";
      ctx.lineWidth=(reveal && bullet.correct?2:1.1)*dpr;ctx.shadowBlur=reveal&&bullet.correct?16*dpr:assisted?8*dpr:0;ctx.shadowColor="rgba(235,245,255,.85)";
      ctx.fillRect(-w/2,-h/2,w,h);ctx.strokeRect(-w/2,-h/2,w,h);ctx.fillStyle=reveal&&bullet.correct?"rgba(255,255,255,.98)":"rgba(235,221,226,.9)";ctx.font=`${Math.round(11*dpr)}px sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(bullet.label,0,0);if(reveal&&bullet.correct){ctx.font=`${Math.round(8*dpr)}px sans-serif`;ctx.fillText("REAL",0,-22*dpr);}
    } else if (bullet.type === "freezeCrystal") {
      const pulse=.8+Math.sin(performance.now()/130)*.12;ctx.globalAlpha=pulse;ctx.fillStyle="rgba(115,151,187,.22)";ctx.strokeStyle="rgba(190,224,246,.88)";ctx.lineWidth=1.3*dpr;ctx.shadowBlur=12*dpr;ctx.shadowColor="rgba(117,178,221,.48)";ctx.beginPath();ctx.moveTo(0,-28*dpr);ctx.lineTo(24*dpr,-8*dpr);ctx.lineTo(18*dpr,24*dpr);ctx.lineTo(-19*dpr,24*dpr);ctx.lineTo(-25*dpr,-7*dpr);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="rgba(234,246,255,.94)";ctx.font=`${Math.round(9*dpr)}px sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(bullet.label,0,1*dpr);
    } else if (bullet.type === "darkSlugger") {
      ctx.rotate((bullet.age/110)*(bullet.spin??1));ctx.strokeStyle="rgba(234,99,101,.95)";ctx.lineWidth=2.2*dpr;ctx.shadowBlur=8*dpr;ctx.shadowColor="rgba(220,52,70,.65)";ctx.beginPath();ctx.arc(0,0,8*dpr,.2,Math.PI*1.75);ctx.stroke();
    } else if (bullet.type === "pellet" && bullet.zettonWave) {
      ctx.rotate(Math.atan2(bullet.vy,bullet.vx));
      ctx.strokeStyle="rgba(255,221,91,.98)";ctx.lineWidth=2*dpr;ctx.shadowBlur=12*dpr;ctx.shadowColor="rgba(255,183,48,.82)";
      ctx.beginPath();ctx.moveTo(-12*dpr,-5*dpr);ctx.lineTo(-3*dpr,0);ctx.lineTo(-12*dpr,5*dpr);ctx.moveTo(-4*dpr,-5*dpr);ctx.lineTo(5*dpr,0);ctx.lineTo(-4*dpr,5*dpr);ctx.stroke();
      ctx.fillStyle="rgba(255,245,190,.96)";ctx.beginPath();ctx.arc(7*dpr,0,2.4*dpr,0,Math.PI*2);ctx.fill();
    } else if (bullet.type === "pellet" && bullet.fiveChestDrop) {
      ctx.rotate(Math.atan2(bullet.vy,bullet.vx)-Math.PI/2);
      ctx.shadowBlur=15*dpr;ctx.shadowColor="rgba(255,125,72,.82)";
      const g=ctx.createLinearGradient(0,-r*2.4,0,r*1.3);g.addColorStop(0,"rgba(255,111,61,0)");g.addColorStop(.48,"rgba(255,136,71,.9)");g.addColorStop(1,"rgba(255,246,202,1)");
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-r*2.6);ctx.lineTo(r*.8,r*.75);ctx.lineTo(0,r*1.25);ctx.lineTo(-r*.8,r*.75);ctx.closePath();ctx.fill();
    } else if (bullet.type === "fireball") {
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.25); glow.addColorStop(0, "rgba(255,250,212,1)"); glow.addColorStop(.34, "rgba(255,177,75,.96)"); glow.addColorStop(.75, "rgba(255,75,38,.62)"); glow.addColorStop(1, "rgba(255,65,32,0)"); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, r * 2.25, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff0b9"; ctx.beginPath(); ctx.arc(0, 0, r * .55, 0, Math.PI * 2); ctx.fill();
    } else { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }


  drawBelialCanvasAvatar(x, y, scale=1, pose="flight", alpha=1) {
    const ctx=this.ctx,d=this.dpr,s=scale*d,t=(this.elapsed??0)/1000;
    const poly=(pts,fill,stroke=null,lw=1)=>{ctx.beginPath();pts.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke();}};
    const line=(x1,y1,x2,y2,w,col)=>{ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap="square";ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();};
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(s,s);
    const bob=Math.sin(t*7.4)*1.2,lean=pose==="flight"?-.24:pose==="slash"?.13:pose==="claw"?-.12:0;
    ctx.translate(0,bob);ctx.rotate(lean);
    // Hard cel-like shadow: no glossy gradients. The outline reads first, details second.
    ctx.shadowBlur=0;ctx.translate(2.4,3);ctx.globalAlpha*=.35;
    poly([[-18,-12],[-30,13],[-22,37],[-7,31],[0,45],[9,31],[25,37],[31,12],[18,-13]],"#000");
    ctx.translate(-2.4,-3);ctx.globalAlpha=alpha;
    // legs
    poly([[-12,25],[-2,25],[-5,51],[-18,52]],"#090a0d","#8e1c2d",1.1);
    poly([[2,25],[12,25],[18,52],[5,51]],"#090a0d","#8e1c2d",1.1);
    // torso / hunched shoulders
    poly([[-18,-13],[-9,-21],[10,-21],[19,-11],[15,26],[7,33],[-8,32],[-16,25]],"#08090c","#b72a3b",1.15);
    poly([[-14,-11],[-7,-18],[-1,25],[-8,29]],"#b62436");
    poly([[13,-10],[7,-18],[1,25],[8,29]],"#7d1524");
    // chest timer + slash marks
    ctx.fillStyle="#d7c779";ctx.fillRect(-2.1,-2.5,4.2,4.2);ctx.fillStyle="#72111e";ctx.fillRect(-7,5,14,2.4);
    // head / jaw / horns
    poly([[-16,-20],[-11,-31],[-6,-27],[-2,-35],[3,-28],[9,-34],[16,-22],[12,-9],[-10,-9]],"#07080a","#a92134",1.1);
    poly([[-14,-28],[-10,-42],[-5,-29]],"#777a80");poly([[7,-30],[13,-43],[11,-26]],"#777a80");
    poly([[-11,-15],[-4,-11],[5,-11],[12,-16],[8,-8],[-8,-8]],"#16171b");
    ctx.fillStyle="#ff3048";ctx.fillRect(-10,-21,7,2.5);ctx.fillRect(3,-21,7,2.5);
    // arms react to pose instead of being glued to the torso.
    let lHand=[-28,13],rHand=[27,13];
    if(pose==="aim"||pose==="deathcium"){lHand=[-25,5];rHand=[29,-13];}
    else if(pose==="thunder"){lHand=[-20,-27];rHand=[18,-31];}
    else if(pose==="slash"||pose==="scythe"){lHand=[-31,-4];rHand=[30,4];}
    else if(pose==="claw"){lHand=[-36,20];rHand=[36,18];}
    line(-13,-12,lHand[0],lHand[1],7,"#090a0d");line(-13,-12,lHand[0],lHand[1],2,"#a41d30");
    line(13,-12,rHand[0],rHand[1],7,"#090a0d");line(13,-12,rHand[0],rHand[1],2,"#a41d30");
    // Giga Battlenizer. Different poses deliberately change the silhouette.
    let ax=-37,ay=pose==="flight"?7:pose==="thunder"?-32:pose==="slash"?-12:pose==="scythe"?-18:14;
    let bx=38,by=pose==="aim"?-19:pose==="thunder"?-35:pose==="slash"?17:pose==="scythe"?24:4;
    line(ax,ay,bx,by,4.4,"#111217");line(ax,ay,bx,by,1.4,"#73767d");
    // weapon end caps/prongs
    const cap=(cx,cy,dir)=>{ctx.save();ctx.translate(cx,cy);ctx.rotate(dir);ctx.fillStyle="#303238";ctx.fillRect(-5,-6,10,12);ctx.fillStyle="#8d9096";ctx.fillRect(-5,-6,2,12);ctx.fillRect(3,-6,2,12);ctx.restore();};
    const a=Math.atan2(by-ay,bx-ax);cap(ax,ay,a);cap(bx,by,a);
    if(pose==="deathcium"){ctx.globalAlpha=.7+.25*Math.sin(t*16);ctx.strokeStyle="#ff324b";ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(0,2,20+Math.sin(t*12)*3,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }

  drawHazard(bullet) {
    const ctx = this.ctx, dpr = this.dpr, activeAge = bullet.activeAge, age = clamp(activeAge / bullet.life, 0, 1);
    if (bullet.type === "belialDuelField") {
      const px=this.belialAvatarX,py=this.belialAvatarY,pose=this.belialCanvasPose??"taunt";
      const dx=px-(this.belialAvatarLastX??px),dy=py-(this.belialAvatarLastY??py);
      if(Math.hypot(dx,dy)>4*dpr){
        this.drawBelialCanvasAvatar(px-dx*2.2,py-dy*2.2,1.40,pose,.10);
        this.drawBelialCanvasAvatar(px-dx*.95,py-dy*.95,1.40,pose,.18);
      }
      this.drawBelialCanvasAvatar(px,py,1.40,pose,1);
      this.belialAvatarLastX=px;this.belialAvatarLastY=py;return;
    }
    if (bullet.type === "belialGalaxyField") {
      ctx.save();const g=ctx.createLinearGradient(0,0,0,this.canvas.height);g.addColorStop(0,"rgba(4,8,24,.98)");g.addColorStop(.5,"rgba(11,16,42,.96)");g.addColorStop(1,"rgba(2,4,13,.99)");ctx.fillStyle=g;ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
      ctx.strokeStyle="rgba(185,220,255,.55)";ctx.lineWidth=1*dpr;const shift=(activeAge*.34)%(120*dpr);for(let i=-1;i<8;i++){const y=i*120*dpr+shift;ctx.globalAlpha=.16+.12*((i+8)%3);ctx.beginPath();ctx.moveTo(this.canvas.width*.12,y);ctx.lineTo(this.canvas.width*.18,y+38*dpr);ctx.stroke();ctx.beginPath();ctx.moveTo(this.canvas.width*.78,y-15*dpr);ctx.lineTo(this.canvas.width*.70,y+24*dpr);ctx.stroke();}ctx.restore();
      const trail=Math.sin(activeAge/420)*18*dpr;
      this.drawBelialCanvasAvatar(this.belialAvatarX-trail,this.belialAvatarY+8*dpr,1.32,"flight",.11);
      this.drawBelialCanvasAvatar(this.belialAvatarX-trail*.45,this.belialAvatarY+3*dpr,1.32,"flight",.20);
      this.drawBelialCanvasAvatar(this.belialAvatarX,this.belialAvatarY,1.32,"aim",1);return;
    }
    if (bullet.type === "belialAbyssField") {
      const p=clamp(activeAge/Math.max(1,bullet.life),0,1);
      const phase=p<.22?"red":p<.42?"purple":p<.58?"blue":p<.72?"purple":p<.86?"red":p<.95?"blue":"purple";
      const palette={purple:["rgba(111,18,132,.88)","rgba(12,4,25,.99)"],blue:["rgba(18,50,145,.90)","rgba(2,6,24,.99)"],red:["rgba(147,18,31,.88)","rgba(19,3,8,.99)"]}[phase];
      const cx=this.canvas.width*.5,cy=this.canvas.height*.42;ctx.save();
      const g=ctx.createRadialGradient(cx,cy,10*dpr,cx,cy,this.canvas.width*.72);g.addColorStop(0,palette[0]);g.addColorStop(.58,palette[0].replace(/\.8[89]\)/,'.26)'));g.addColorStop(1,palette[1]);ctx.fillStyle=g;ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
      // Layered rotating diamond/petal silhouettes imitate the reference video's
      // living energy field instead of generic concentric circles.
      for(let ring=0;ring<5;ring++){
        const rot=(activeAge/2100)*(ring%2?1:-1)+ring*.34,rad=(72+ring*52)*dpr;
        ctx.save();ctx.translate(cx,cy);ctx.rotate(rot);ctx.globalAlpha=.055+ring*.012;ctx.strokeStyle=phase==="blue"?"#a9c1ff":phase==="red"?"#ff7487":"#e6a4ff";ctx.lineWidth=(8-ring)*dpr;
        for(let k=0;k<8;k++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(rad*.54,0);ctx.lineTo(rad*.80,-rad*.17);ctx.lineTo(rad,0);ctx.lineTo(rad*.80,rad*.17);ctx.closePath();ctx.stroke();}
        ctx.restore();
      }
      ctx.globalAlpha=.16;ctx.strokeStyle=phase==="blue"?"rgba(169,194,255,.85)":phase==="red"?"rgba(255,104,126,.82)":"rgba(230,164,255,.82)";ctx.lineWidth=2*dpr;
      const sweep=(activeAge*.055)%(120*dpr);for(let y=-120*dpr;y<this.canvas.height+120*dpr;y+=120*dpr){ctx.beginPath();ctx.moveTo(0,y+sweep);ctx.lineTo(26*dpr,y+30*dpr+sweep);ctx.lineTo(0,y+60*dpr+sweep);ctx.stroke();ctx.beginPath();ctx.moveTo(this.canvas.width,y+35*dpr-sweep);ctx.lineTo(this.canvas.width-26*dpr,y+65*dpr-sweep);ctx.lineTo(this.canvas.width,y+95*dpr-sweep);ctx.stroke();}
      ctx.restore();
      ctx.save();ctx.shadowBlur=30*dpr;ctx.shadowColor=phase==="blue"?"rgba(130,168,255,.9)":phase==="red"?"rgba(255,52,76,.9)":"rgba(215,111,255,.9)";this.drawBelialCanvasAvatar(this.belialAvatarX,this.belialAvatarY,1.45,"flight");ctx.restore();return;
    }

    if (bullet.type === "belialFinalClash") {
      const p=clamp(this.belialClashProgress??0,0,1),coreX=this.canvas.width*(.32+.52*p),cy=this.canvas.height*.5;ctx.save();
      const bg=ctx.createRadialGradient(coreX,cy,0,coreX,cy,this.canvas.width*.52);bg.addColorStop(0,"rgba(255,255,255,.12)");bg.addColorStop(.34,"rgba(90,12,26,.18)");bg.addColorStop(1,"rgba(2,4,9,.98)");ctx.fillStyle=bg;ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
      ctx.lineCap="round";ctx.strokeStyle="rgba(205,242,255,.96)";ctx.shadowBlur=28*dpr;ctx.shadowColor="rgba(118,215,255,.9)";ctx.lineWidth=31*dpr;ctx.beginPath();ctx.moveTo(-30*dpr,cy);ctx.lineTo(coreX,cy);ctx.stroke();ctx.strokeStyle="rgba(255,43,69,.98)";ctx.shadowColor="rgba(255,22,52,.92)";ctx.lineWidth=38*dpr;ctx.beginPath();ctx.moveTo(this.canvas.width+30*dpr,cy);ctx.lineTo(coreX,cy);ctx.stroke();
      ctx.fillStyle="#fff";ctx.shadowColor="#fff";ctx.shadowBlur=34*dpr;ctx.beginPath();ctx.arc(coreX,cy,(13+5*Math.sin(activeAge/45))*dpr,0,Math.PI*2);ctx.fill();ctx.restore();
      this.drawBelialCanvasAvatar(this.canvas.width*.86,this.canvas.height*.40,1.35,"aim");return;
    }
    if (bullet.type === "belialLightning") {
      const warn=bullet.warningMs??560,active=activeAge>=warn;ctx.save();
      if(!active){ctx.globalAlpha=.38+.22*Math.sin(activeAge/55);ctx.strokeStyle="rgba(255,72,88,.95)";ctx.lineWidth=1.6*dpr;ctx.setLineDash([7*dpr,6*dpr]);ctx.beginPath();ctx.arc(bullet.x,bullet.y,bullet.radius,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(bullet.x-bullet.radius*1.35,bullet.y);ctx.lineTo(bullet.x+bullet.radius*1.35,bullet.y);ctx.moveTo(bullet.x,bullet.y-bullet.radius*1.35);ctx.lineTo(bullet.x,bullet.y+bullet.radius*1.35);ctx.stroke();ctx.restore();return;}
      ctx.globalAlpha=.94;ctx.strokeStyle="rgba(255,43,63,.98)";ctx.shadowBlur=24*dpr;ctx.shadowColor="rgba(255,36,55,.95)";ctx.lineWidth=5*dpr;ctx.beginPath();let x=bullet.x,y=0;ctx.moveTo(x,y);for(let i=1;i<=8;i++){y=bullet.y*i/8;x=bullet.x+(i===8?0:(this.belialRand(i+activeAge*.01)-.5)*26*dpr);ctx.lineTo(x,y);}ctx.stroke();ctx.fillStyle="rgba(255,85,72,.42)";ctx.beginPath();ctx.arc(bullet.x,bullet.y,bullet.radius,0,Math.PI*2);ctx.fill();ctx.restore();return;
    }
    if (bullet.type === "belialScytheGuard") {
      const warn=bullet.warningMs??720,travel=bullet.travelMs??920;ctx.save();
      if(activeAge<warn){
        const pulse=.34+.24*Math.sin(activeAge/48),side=bullet.fromRight?1:-1;
        const x=bullet.fromRight?this.canvas.width-24*dpr:24*dpr,y=this.canvas.height*.50;
        ctx.globalAlpha=pulse;ctx.strokeStyle="rgba(255,62,86,.98)";ctx.shadowBlur=22*dpr;ctx.shadowColor="rgba(255,30,55,.92)";ctx.lineWidth=3*dpr;ctx.setLineDash([12*dpr,9*dpr]);
        ctx.beginPath();ctx.arc(x,y,bullet.crescentRadius*.62,side>0?Math.PI*.62:-Math.PI*.38,side>0?Math.PI*1.38:Math.PI*.38,side<0);ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle="rgba(255,229,234,.95)";ctx.font=`900 ${16*dpr}px monospace`;ctx.textAlign="center";ctx.fillText("Z",x+(side>0?-32:32)*dpr,y+5*dpr);ctx.restore();return;
      }
      const p=clamp((activeAge-warn)/Math.max(1,travel),0,1),startX=bullet.fromRight?this.canvas.width+bullet.width:-bullet.width,endX=bullet.fromRight?-bullet.width:this.canvas.width+bullet.width,x=startX+(endX-startX)*p,y=this.canvas.height*.50;
      const facing=bullet.fromRight?1:-1;ctx.translate(x,y);ctx.scale(facing,1);ctx.globalAlpha=bullet.blocked?.42:.98;ctx.strokeStyle="rgba(255,31,58,.99)";ctx.shadowBlur=38*dpr;ctx.shadowColor="rgba(255,18,46,.98)";ctx.lineCap="round";ctx.lineWidth=bullet.width;ctx.beginPath();ctx.arc(0,0,bullet.crescentRadius,-1.02,1.02);ctx.stroke();ctx.strokeStyle="rgba(255,214,220,.96)";ctx.lineWidth=3*dpr;ctx.stroke();
      if(bullet.blocked){ctx.globalAlpha=.9;ctx.fillStyle="#fff";ctx.shadowColor="#fff";ctx.shadowBlur=28*dpr;ctx.beginPath();ctx.arc(0,0,12*dpr,0,Math.PI*2);ctx.fill();}
      ctx.restore();return;
    }

    if (bullet.type === "belialClawClamp") {
      const state=this.belialClawState(bullet,activeAge),q=state.q,gapX=state.gapX;
      const sideL=this.canvas.width*.27,sideR=this.canvas.width*.73,tooth=(this.canvas.height*.46)*q;ctx.save();ctx.fillStyle="rgba(4,4,7,.82)";ctx.fillRect(0,0,sideL,this.canvas.height);ctx.fillRect(sideR,0,this.canvas.width-sideR,this.canvas.height);ctx.strokeStyle="rgba(255,63,78,.7)";ctx.lineWidth=2*dpr;ctx.strokeRect(sideL,0,sideR-sideL,this.canvas.height);
      const drawTeeth=(top)=>{ctx.fillStyle="rgba(34,7,13,.98)";ctx.strokeStyle="rgba(255,54,74,.92)";ctx.shadowBlur=16*dpr;ctx.shadowColor="rgba(255,32,54,.56)";for(let x=sideL;x<sideR;x+=24*dpr){if(Math.abs(x+12*dpr-gapX)<bullet.gapHalf)continue;ctx.beginPath();if(top){ctx.moveTo(x,0);ctx.lineTo(x+24*dpr,0);ctx.lineTo(x+12*dpr,tooth);}else{ctx.moveTo(x,this.canvas.height);ctx.lineTo(x+24*dpr,this.canvas.height);ctx.lineTo(x+12*dpr,this.canvas.height-tooth);}ctx.closePath();ctx.fill();ctx.stroke();}};drawTeeth(true);drawTeeth(false);ctx.restore();return;
    }
    if (bullet.type === "belialDeathciumBeam") {
      const warn=bullet.warningMs??760,active=activeAge>=warn;ctx.save();ctx.lineCap="round";ctx.globalAlpha=active?.98:(.28+.2*Math.sin(activeAge/55));ctx.strokeStyle=active?"rgba(113,0,18,.98)":"rgba(255,69,84,.86)";ctx.shadowBlur=active?38*dpr:12*dpr;ctx.shadowColor="rgba(255,24,55,.96)";ctx.lineWidth=active?bullet.width:2*dpr;if(!active)ctx.setLineDash([12*dpr,10*dpr]);ctx.beginPath();ctx.moveTo(bullet.x1,bullet.y1);ctx.lineTo(bullet.x2,bullet.y2);ctx.stroke();if(active){ctx.strokeStyle="rgba(255,50,70,.98)";ctx.lineWidth=bullet.width*.48;ctx.stroke();ctx.strokeStyle="rgba(255,225,230,.94)";ctx.lineWidth=3*dpr;ctx.stroke();}ctx.restore();return;
    }
    if (bullet.type === "fiveSonicWave") {
      const warning=bullet.warningMs??420, active=activeAge>=warning;ctx.save();ctx.globalAlpha=active?.88:(.30+.16*Math.sin(activeAge/55));
      ctx.strokeStyle=active?"rgba(255,193,82,.98)":"rgba(245,199,113,.72)";ctx.lineWidth=active?bullet.width:2*dpr;ctx.shadowBlur=active?18*dpr:7*dpr;ctx.shadowColor="rgba(255,142,54,.74)";
      if(!active)ctx.setLineDash([8*dpr,7*dpr]);ctx.beginPath();const steps=72;
      for(let i=0;i<=steps;i++){
        if(bullet.orientation==="vertical"){
          const y=this.canvas.height*i/steps,x=this.fiveSonicCoordinate(bullet,y,activeAge);i?ctx.lineTo(x,y):ctx.moveTo(x,y);
        }else{
          const x=this.canvas.width*i/steps,y=this.fiveSonicCoordinate(bullet,x,activeAge);i?ctx.lineTo(x,y):ctx.moveTo(x,y);
        }
      }
      ctx.stroke();if(active){ctx.strokeStyle="rgba(255,250,218,.9)";ctx.lineWidth=1.5*dpr;ctx.stroke();}ctx.restore();return;
    }
    if (bullet.type === "fiveResonanceNode") {
      const warning=bullet.warningMs??1200,burst=bullet.burstMs??390;ctx.save();const active=activeAge>=warning;
      const pulse=.72+.22*Math.sin(activeAge/58),timeToBurst=warning-activeAge;
      ctx.shadowColor="rgba(255,106,40,.92)";
      if(!active){
        ctx.globalAlpha=.34+.18*Math.sin(activeAge/54);ctx.strokeStyle="rgba(255,214,126,.92)";ctx.lineWidth=1.6*dpr;ctx.shadowBlur=9*dpr;
        const rr=bullet.radius*pulse;ctx.beginPath();ctx.arc(bullet.x,bullet.y,rr,0,Math.PI*2);ctx.stroke();
        if(timeToBurst<190){
          const tele=(bullet.crossLength??120*dpr)*.58;ctx.globalAlpha=.28+.18*Math.sin(activeAge/34);ctx.setLineDash([7*dpr,7*dpr]);ctx.beginPath();
          ctx.moveTo(bullet.x-tele,bullet.y);ctx.lineTo(bullet.x+tele,bullet.y);ctx.moveTo(bullet.x,bullet.y-tele);ctx.lineTo(bullet.x,bullet.y+tele);ctx.stroke();
        }
        ctx.restore();return;
      }
      const p=clamp((activeAge-warning)/Math.min(140,burst),0,1),eased=1-Math.pow(1-p,3);
      const arm=(bullet.crossLength??120*dpr)*eased,half=bullet.crossHalfWidth??9*dpr;
      ctx.globalAlpha=.94;ctx.shadowBlur=24*dpr;ctx.fillStyle="rgba(255,91,38,.78)";
      ctx.fillRect(bullet.x-arm,bullet.y-half,arm*2,half*2);ctx.fillRect(bullet.x-half,bullet.y-arm,half*2,arm*2);
      ctx.fillStyle="rgba(255,242,190,.96)";const coreHalf=Math.max(2*dpr,half*.24);
      ctx.fillRect(bullet.x-arm,bullet.y-coreHalf,arm*2,coreHalf*2);ctx.fillRect(bullet.x-coreHalf,bullet.y-arm,coreHalf*2,arm*2);
      const rr=(bullet.radius??20*dpr)*(1+.55*Math.sin(Math.min(1,(activeAge-warning)/Math.max(1,burst))*Math.PI));ctx.beginPath();ctx.arc(bullet.x,bullet.y,rr,0,Math.PI*2);ctx.fill();
      ctx.restore();return;
    }
    if (bullet.type === "fiveLaneFrame") {
      const center=bullet.centerX??this.canvas.width/2,half=bullet.corridorHalf??95*dpr,leftEdge=center-half,rightEdge=center+half;ctx.save();
      ctx.fillStyle="rgba(9,5,16,.90)";ctx.fillRect(0,0,leftEdge,this.canvas.height);ctx.fillRect(rightEdge,0,this.canvas.width-rightEdge,this.canvas.height);
      ctx.strokeStyle="rgba(202,100,231,.82)";ctx.lineWidth=2*dpr;ctx.beginPath();ctx.moveTo(leftEdge,0);ctx.lineTo(leftEdge,this.canvas.height);ctx.moveTo(center,0);ctx.lineTo(center,this.canvas.height);ctx.moveTo(rightEdge,0);ctx.lineTo(rightEdge,this.canvas.height);ctx.stroke();
      ctx.globalAlpha=.18;ctx.fillStyle="rgba(206,113,239,.35)";ctx.fillRect(leftEdge,0,half,this.canvas.height);ctx.fillRect(center,0,half,this.canvas.height);ctx.restore();return;
    }
    if (bullet.type === "fiveLaneLaser") {
      const warning=bullet.warningMs??240,fire=bullet.fireMs??240,center=this.canvas.width/2;
      const frame=this.bullets.find(b=>!b.dead&&b.type==="fiveLaneFrame"),half=frame?.corridorHalf??95*dpr,leftEdge=center-half,rightEdge=center+half;
      const x1=bullet.side==="left"?leftEdge:center, x2=bullet.side==="left"?center:rightEdge;ctx.save();
      if(activeAge<warning){ctx.globalAlpha=(bullet.fake?.24:.48)+.22*Math.sin(activeAge/38);ctx.fillStyle=bullet.fake?"rgba(185,78,221,.28)":"rgba(236,124,255,.44)";ctx.fillRect(x1,0,x2-x1,this.canvas.height);ctx.strokeStyle="rgba(246,186,255,.95)";ctx.lineWidth=3*dpr;ctx.beginPath();const edge=bullet.side==="left"?x1:x2;ctx.moveTo(edge,0);ctx.lineTo(edge,this.canvas.height);ctx.stroke();ctx.restore();return;}
      if(!bullet.fake && activeAge<=warning+fire){ctx.globalAlpha=.94;ctx.fillStyle="rgba(221,69,255,.72)";ctx.shadowBlur=22*dpr;ctx.shadowColor="rgba(224,80,255,.88)";ctx.fillRect(x1,0,x2-x1,this.canvas.height);ctx.fillStyle="rgba(255,240,255,.92)";ctx.fillRect(x1,0,x2-x1,3*dpr);ctx.fillRect(x1,this.canvas.height-3*dpr,x2-x1,3*dpr);}ctx.restore();return;
    }
    if (bullet.type === "fiveWindmill") {
      const warning=bullet.warningMs??0,motionAge=Math.max(0,activeAge-warning),arms=bullet.arms??4,beads=bullet.beads??8,layers=bullet.layers??1;ctx.save();ctx.globalAlpha=activeAge<warning?.34:.96;
      const core=ctx.createRadialGradient(bullet.x,bullet.y,0,bullet.x,bullet.y,bullet.coreR*1.45);core.addColorStop(0,"rgba(255,246,178,1)");core.addColorStop(.32,"rgba(255,100,68,.96)");core.addColorStop(1,"rgba(85,13,45,0)");ctx.fillStyle=core;ctx.beginPath();ctx.arc(bullet.x,bullet.y,bullet.coreR*1.45,0,Math.PI*2);ctx.fill();
      for(let layer=0;layer<layers;layer++) for(let a=0;a<arms;a++) for(let j=0;j<beads;j++){
        const p=this.fiveWindmillBeadPosition(bullet,a,j,layer,motionAge);if(p.active===false)continue;const r=bullet.beadR*(layer? .92:1);const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*1.8);g.addColorStop(0,layer?"rgba(255,238,214,1)":"rgba(255,251,211,1)");g.addColorStop(.28,layer?"rgba(238,80,125,.96)":"rgba(255,117,64,.96)");g.addColorStop(1,"rgba(123,19,62,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r*1.8,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();return;
    }
    if (bullet.type === "fiveFallField") {
      ctx.save();ctx.globalAlpha=.34;ctx.strokeStyle="rgba(129,178,224,.68)";ctx.lineWidth=1.4*dpr;
      const speed=1.15+(bullet.boost??0)*.14;for(let i=0;i<22;i++){const x=((i*83.7)%this.canvas.width),phase=(activeAge*speed+i*137)%this.canvas.height,y=this.canvas.height-phase;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.sin(i*1.7)*8*dpr,y+36*dpr);ctx.stroke();}
      ctx.restore();return;
    }
    if (bullet.type === "fiveFallDebris") {
      ctx.save();ctx.translate(bullet.x,bullet.y);ctx.rotate(bullet.rotation??0);ctx.fillStyle=(bullet.kind??0)===0?"rgba(87,76,68,.98)":(bullet.kind??0)===1?"rgba(73,84,91,.98)":"rgba(99,72,63,.98)";ctx.strokeStyle="rgba(190,151,118,.72)";ctx.lineWidth=1.4*dpr;
      if((bullet.kind??0)===0){ctx.beginPath();ctx.moveTo(-bullet.r,-bullet.r*.25);ctx.lineTo(-bullet.r*.3,-bullet.r);ctx.lineTo(bullet.r*.85,-bullet.r*.55);ctx.lineTo(bullet.r*.7,bullet.r*.72);ctx.lineTo(-bullet.r*.55,bullet.r*.88);ctx.closePath();ctx.fill();ctx.stroke();}
      else if((bullet.kind??0)===1){ctx.fillRect(-bullet.r*1.25,-bullet.r*.48,bullet.r*2.5,bullet.r*.96);ctx.strokeRect(-bullet.r*1.25,-bullet.r*.48,bullet.r*2.5,bullet.r*.96);}
      else{ctx.beginPath();ctx.moveTo(0,-bullet.r*1.3);ctx.lineTo(bullet.r*.72,bullet.r*.8);ctx.lineTo(-bullet.r*.7,bullet.r*.62);ctx.closePath();ctx.fill();ctx.stroke();}
      ctx.restore();return;
    }
    if (bullet.type === "fiveFreezeBeam") {
      const warning=bullet.warningMs??420,sx=this.canvas.width-2*dpr,sy=this.canvas.height*.5;ctx.save();
      ctx.strokeStyle=activeAge<warning?"rgba(139,230,255,.82)":"rgba(191,249,255,.98)";ctx.lineWidth=activeAge<warning?2*dpr:bullet.width;ctx.shadowBlur=activeAge<warning?8*dpr:22*dpr;ctx.shadowColor="rgba(83,214,255,.8)";if(activeAge<warning)ctx.setLineDash([7*dpr,7*dpr]);ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(bullet.targetX,bullet.targetY);ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "fiveFireRay") {
      const track=bullet.trackingMs??400,fireAt=track+(bullet.lockMs??200),end=bullet.beamEnd??this.grandRayToBoundary(bullet.x,bullet.y,bullet.targetX,bullet.targetY);ctx.save();
      ctx.fillStyle="rgba(89,30,14,.98)";ctx.strokeStyle="rgba(255,113,52,.96)";ctx.lineWidth=2*dpr;ctx.beginPath();ctx.arc(bullet.x,bullet.y,10*dpr,0,Math.PI*2);ctx.fill();ctx.stroke();
      if(activeAge<fireAt){ctx.globalAlpha=activeAge<track?.42:.76;ctx.strokeStyle="rgba(255,127,62,.92)";ctx.lineWidth=1.6*dpr;ctx.setLineDash(activeAge<track?[7*dpr,7*dpr]:[3*dpr,4*dpr]);ctx.beginPath();ctx.moveTo(bullet.x,bullet.y);ctx.lineTo(end.x,end.y);ctx.stroke();}
      else{ctx.globalAlpha=.94;ctx.strokeStyle="rgba(255,74,29,.98)";ctx.shadowBlur=24*dpr;ctx.shadowColor="rgba(255,70,24,.88)";ctx.lineWidth=bullet.width;ctx.beginPath();ctx.moveTo(bullet.x,bullet.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.strokeStyle="rgba(255,235,190,.98)";ctx.lineWidth=2.4*dpr;ctx.stroke();}
      ctx.restore();return;
    }
    if (bullet.type === "zettonFireballBurst") {
      const t=clamp(bullet.activeAge/bullet.life,0,1),pulse=.75+Math.sin(t*Math.PI*5)*.16;ctx.save();ctx.globalAlpha=.9;const g=ctx.createRadialGradient(bullet.x,bullet.y,2*dpr,bullet.x,bullet.y,bullet.radius*1.15);g.addColorStop(0,"rgba(255,255,205,1)");g.addColorStop(.22,"rgba(255,214,65,.98)");g.addColorStop(.58,"rgba(255,94,28,.86)");g.addColorStop(1,"rgba(80,5,0,0)");ctx.fillStyle=g;ctx.shadowBlur=24*dpr;ctx.shadowColor="rgba(255,91,24,.86)";ctx.beginPath();ctx.arc(bullet.x,bullet.y,bullet.radius*pulse,0,Math.PI*2);ctx.fill();ctx.restore();return;
    }
    if (bullet.type === "greezaThunderSmash") {
      ctx.save();ctx.globalAlpha=.9;ctx.strokeStyle=bullet.hard?"rgba(208,98,255,.98)":"rgba(153,231,255,.98)";ctx.lineWidth=(bullet.hard?5:4)*dpr;ctx.shadowBlur=22*dpr;ctx.shadowColor=ctx.strokeStyle;let x=bullet.x,y0=0;ctx.beginPath();ctx.moveTo(x,y0);const steps=8;for(let i=1;i<=steps;i++){const y=bullet.y*(i/steps),j=((i%2?1:-1)*(7+(i%3)*4))*dpr;ctx.lineTo(x+j,y)}ctx.lineTo(bullet.x,bullet.y);ctx.stroke();const burst=bullet.radius*(.7+.25*Math.sin(Math.PI*age));ctx.lineWidth=3*dpr;for(let i=0;i<7;i++){const a=i*Math.PI*2/7;ctx.beginPath();ctx.moveTo(bullet.x,bullet.y);ctx.lineTo(bullet.x+Math.cos(a)*burst,bullet.y+Math.sin(a)*burst);ctx.stroke()}ctx.restore();return;
    }
    if (bullet.type === "greezaVortex") {
      ctx.save();ctx.translate(bullet.x,bullet.y);ctx.globalAlpha=.72;ctx.strokeStyle="rgba(196,119,240,.9)";ctx.lineWidth=2.2*dpr;ctx.shadowBlur=14*dpr;ctx.shadowColor="rgba(173,76,235,.72)";for(let ring=0;ring<4;ring++){ctx.beginPath();const base=bullet.radius*(.28+ring*.19);for(let i=0;i<=42;i++){const a=i/42*Math.PI*2+age*Math.PI*3*(bullet.dir??1),rr=base*(.72+.28*Math.sin(a*3+ring));const x=Math.cos(a)*rr,y=Math.sin(a)*rr*.72;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}ctx.restore();return;
    }
    if (bullet.type === "greezaSoundCore") {
      ctx.save();ctx.translate(bullet.x,bullet.y);ctx.globalAlpha=.88;ctx.shadowBlur=20*dpr;ctx.shadowColor="rgba(183,83,244,.82)";ctx.fillStyle="rgba(20,8,29,.96)";ctx.strokeStyle="rgba(215,167,250,.9)";ctx.lineWidth=1.5*dpr;ctx.beginPath();ctx.moveTo(-18*dpr,-9*dpr);ctx.quadraticCurveTo(-5*dpr,-25*dpr,5*dpr,-13*dpr);ctx.quadraticCurveTo(20*dpr,-25*dpr,18*dpr,-2*dpr);ctx.quadraticCurveTo(9*dpr,20*dpr,-8*dpr,17*dpr);ctx.quadraticCurveTo(-21*dpr,8*dpr,-18*dpr,-9*dpr);ctx.fill();ctx.stroke();ctx.fillStyle="rgba(232,196,255,.95)";ctx.beginPath();ctx.ellipse(-6*dpr,-3*dpr,3*dpr,1.5*dpr,-.2,0,Math.PI*2);ctx.ellipse(7*dpr,-5*dpr,3*dpr,1.5*dpr,.2,0,Math.PI*2);ctx.fill();ctx.restore();return;
    }
    if (bullet.type === "greezaSoundWave") {
      const radius=bullet.startRadius+(bullet.endRadius-bullet.startRadius)*age;ctx.save();ctx.globalAlpha=.62;ctx.strokeStyle=bullet.colorMode==="blue"?"rgba(65,155,255,.97)":"rgba(255,143,37,.97)";ctx.lineWidth=bullet.width;ctx.shadowBlur=18*dpr;ctx.shadowColor=ctx.strokeStyle;ctx.beginPath();ctx.arc(bullet.x,bullet.y,radius,0,Math.PI*2);ctx.stroke();ctx.strokeStyle="rgba(245,238,255,.78)";ctx.lineWidth=1.2*dpr;ctx.beginPath();ctx.arc(bullet.x,bullet.y,radius,0,Math.PI*2);ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "greezaHelix") {
      const frame=this.greezaHelixFrame(bullet,bullet.activeAge);ctx.save();ctx.globalAlpha=.77;ctx.lineCap="round";for(let strand=0;strand<2;strand++){ctx.strokeStyle=strand?"rgba(227,238,255,.94)":"rgba(183,89,242,.96)";ctx.shadowBlur=17*dpr;ctx.shadowColor=ctx.strokeStyle;ctx.lineWidth=bullet.width;ctx.beginPath();const steps=70;for(let i=0;i<=steps;i++){const ss=-frame.halfLength+frame.halfLength*2*(i/steps),pt=this.greezaHelixPoint(bullet,frame,ss,strand,bullet.activeAge);i?ctx.lineTo(pt.x,pt.y):ctx.moveTo(pt.x,pt.y)}ctx.stroke()}
      const emit=(x,y,rot)=>{ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalAlpha=.92;ctx.fillStyle="rgba(13,4,22,.98)";ctx.strokeStyle="rgba(220,165,255,.96)";ctx.lineWidth=1.6*dpr;ctx.shadowBlur=15*dpr;ctx.shadowColor="rgba(184,87,242,.78)";ctx.beginPath();ctx.moveTo(-14*dpr,-11*dpr);ctx.lineTo(11*dpr,-8*dpr);ctx.lineTo(18*dpr,0);ctx.lineTo(10*dpr,10*dpr);ctx.lineTo(-13*dpr,11*dpr);ctx.lineTo(-5*dpr,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle="rgba(248,231,255,.98)";ctx.fillRect(3*dpr,-3*dpr,6*dpr,2*dpr);ctx.fillRect(3*dpr,2*dpr,6*dpr,2*dpr);ctx.restore();};
      emit(frame.cx-frame.ux*frame.halfLength,frame.cy-frame.uy*frame.halfLength,frame.angle);emit(frame.cx+frame.ux*frame.halfLength,frame.cy+frame.uy*frame.halfLength,frame.angle+Math.PI);ctx.restore();return;
    }
    if (bullet.type === "greezaWaveCannon") {
      const endpoint=this.greezaWaveEndpoint(bullet,bullet.activeAge);ctx.save();ctx.globalAlpha=.82+.12*Math.sin(age*Math.PI*6);const col="rgba(172,74,235,.9)";ctx.strokeStyle=col;ctx.lineWidth=bullet.width;ctx.lineCap="round";ctx.shadowBlur=30*dpr;ctx.shadowColor=col;ctx.beginPath();ctx.moveTo(bullet.sourceX,bullet.sourceY);ctx.lineTo(endpoint.x,endpoint.y);ctx.stroke();ctx.strokeStyle="rgba(246,238,255,.96)";ctx.lineWidth=3.5*dpr;ctx.beginPath();ctx.moveTo(bullet.sourceX,bullet.sourceY);ctx.lineTo(endpoint.x,endpoint.y);ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "zettonReturnBeam") {
      ctx.save();ctx.globalAlpha=.78+.16*Math.sin(age*Math.PI*6);const col="rgba(255,110,40,.88)";ctx.fillStyle=col;ctx.shadowBlur=28*dpr;ctx.shadowColor=col;if(bullet.orientation==="vertical")ctx.fillRect(bullet.center-bullet.width/2,0,bullet.width,this.canvas.height);else ctx.fillRect(0,bullet.center-bullet.width/2,this.canvas.width,bullet.width);ctx.strokeStyle="rgba(255,242,215,.94)";ctx.lineWidth=3*dpr;ctx.beginPath();if(bullet.orientation==="vertical"){ctx.moveTo(bullet.center,0);ctx.lineTo(bullet.center,this.canvas.height)}else{ctx.moveTo(0,bullet.center);ctx.lineTo(this.canvas.width,bullet.center)}ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "grandSensorBeam") {
      const warm=bullet.warmup??0,local=Math.max(0,this.elapsed-(bullet.spawnElapsed??0));
      const y=Number.isFinite(bullet.y)?bullet.y:(bullet.startY??0),active=local>=warm;
      const blue=bullet.colorMode==="blue",col=blue?"rgba(74,161,255,.96)":"rgba(255,151,42,.98)";
      ctx.save();ctx.globalAlpha=active?.88:.42;ctx.strokeStyle=col;ctx.fillStyle="rgba(22,25,31,.98)";ctx.shadowBlur=active?20*dpr:10*dpr;ctx.shadowColor=col;
      const tw=bullet.tubeW??28*dpr,th=bullet.thickness??11*dpr;
      ctx.fillRect(0,y-tw*.42,tw,tw*.84);ctx.fillRect(this.canvas.width-tw,y-tw*.42,tw,tw*.84);
      ctx.fillStyle=col;ctx.fillRect(tw*.28,y-th*.18,tw*.44,th*.36);ctx.fillRect(this.canvas.width-tw*.72,y-th*.18,tw*.44,th*.36);
      ctx.lineWidth=active?th:2*dpr;if(!active)ctx.setLineDash([9*dpr,7*dpr]);ctx.beginPath();ctx.moveTo(tw,y);ctx.lineTo(this.canvas.width-tw,y);ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "grandThrowArm") {
      const t=clamp(activeAge/bullet.life,0,1),left=bullet.side==="left";ctx.save();ctx.globalAlpha=.96;const reach=Math.sin(Math.min(1,t*1.8)*Math.PI*.82)*85*dpr;ctx.translate(left?-24*dpr+reach:this.canvas.width+24*dpr-reach,this.canvas.height*.28);ctx.scale(left?1:-1,1);ctx.rotate(-.18+.32*Math.sin(t*Math.PI));ctx.fillStyle="rgba(68,48,42,.98)";ctx.strokeStyle="rgba(173,110,73,.9)";ctx.lineWidth=3*dpr;ctx.shadowBlur=16*dpr;ctx.shadowColor="rgba(255,95,43,.32)";ctx.fillRect(-92*dpr,-27*dpr,92*dpr,54*dpr);ctx.strokeRect(-92*dpr,-27*dpr,92*dpr,54*dpr);ctx.fillStyle="rgba(97,63,48,.98)";for(let i=0;i<4;i++){ctx.save();ctx.translate(-5*dpr,(i-1.5)*12*dpr);ctx.rotate((i-1.5)*.10);ctx.fillRect(0,-5*dpr,38*dpr,10*dpr);ctx.restore()}ctx.restore();return;
    }
    if (bullet.type === "grandDebris") {
      ctx.save();ctx.translate(bullet.x,bullet.y);ctx.rotate(bullet.rotation??0);ctx.shadowBlur=10*dpr;ctx.shadowColor="rgba(148,105,74,.45)";ctx.strokeStyle="rgba(198,155,112,.78)";ctx.lineWidth=1.4*dpr;
      if(bullet.kind==="rock"){ctx.fillStyle="rgba(92,75,64,.98)";ctx.beginPath();ctx.moveTo(-bullet.radius*.9,-bullet.radius*.2);ctx.lineTo(-bullet.radius*.35,-bullet.radius*.95);ctx.lineTo(bullet.radius*.75,-bullet.radius*.65);ctx.lineTo(bullet.radius,bullet.radius*.25);ctx.lineTo(bullet.radius*.2,bullet.radius*.9);ctx.lineTo(-bullet.radius*.8,bullet.radius*.55);ctx.closePath();ctx.fill();ctx.stroke();}
      else if(bullet.kind==="slab"){ctx.fillStyle="rgba(92,91,88,.97)";ctx.fillRect(-bullet.radius*1.15,-bullet.radius*.55,bullet.radius*2.3,bullet.radius*1.1);ctx.strokeRect(-bullet.radius*1.15,-bullet.radius*.55,bullet.radius*2.3,bullet.radius*1.1);}
      else{ctx.fillStyle="rgba(84,72,63,.98)";ctx.fillRect(-bullet.radius*.42,-bullet.radius*1.2,bullet.radius*.84,bullet.radius*2.4);ctx.strokeRect(-bullet.radius*.42,-bullet.radius*1.2,bullet.radius*.84,bullet.radius*2.4);}
      ctx.restore();return;
    }
    if (bullet.type === "grandFist") {
      const warn=bullet.warningMs??500;ctx.save();if(activeAge<warn){ctx.globalAlpha=.28+.26*Math.sin(activeAge/65);ctx.strokeStyle="rgba(255,116,65,.96)";ctx.lineWidth=2*dpr;ctx.setLineDash([9*dpr,7*dpr]);ctx.beginPath();ctx.ellipse(bullet.x,this.canvas.height-18*dpr,bullet.fistW*.48,22*dpr,0,0,Math.PI*2);ctx.stroke();ctx.restore();return;}
      ctx.translate(bullet.x,bullet.fistY??-bullet.fistH*.5);ctx.fillStyle="rgba(61,44,39,.99)";ctx.strokeStyle="rgba(163,99,68,.95)";ctx.lineWidth=3*dpr;ctx.shadowBlur=22*dpr;ctx.shadowColor="rgba(255,77,35,.36)";ctx.fillRect(-bullet.fistW*.38,-bullet.fistH*.5,bullet.fistW*.76,bullet.fistH*.74);ctx.strokeRect(-bullet.fistW*.38,-bullet.fistH*.5,bullet.fistW*.76,bullet.fistH*.74);ctx.fillStyle="rgba(100,63,48,.99)";for(let i=0;i<4;i++)ctx.fillRect((-bullet.fistW*.36+i*bullet.fistW*.18),bullet.fistH*.18,bullet.fistW*.16,bullet.fistH*.22);ctx.restore();return;
    }
    if (bullet.type === "grandDustWave") {
      ctx.save();ctx.translate(bullet.x,bullet.y);ctx.globalAlpha=.62;ctx.fillStyle="rgba(149,128,104,.72)";ctx.shadowBlur=14*dpr;ctx.shadowColor="rgba(185,148,109,.42)";for(let i=0;i<4;i++){const rr=bullet.radius*(.65+i*.16);ctx.beginPath();ctx.arc((i-1.5)*bullet.radius*.45,Math.sin(i*2.1+activeAge/120)*5*dpr,rr,0,Math.PI*2);ctx.fill()}ctx.restore();return;
    }
    if (bullet.type === "grandBarrageCannons") {
      ctx.save();const pulse=.72+.22*Math.sin(activeAge/90);ctx.globalAlpha=.96;for(const side of [-1,1]){ctx.save();ctx.translate(side<0?28*dpr:this.canvas.width-28*dpr,24*dpr);ctx.rotate(side<0?.58:Math.PI-.58);ctx.fillStyle="rgba(40,34,34,.98)";ctx.strokeStyle="rgba(255,119,65,.84)";ctx.lineWidth=2*dpr;ctx.fillRect(-12*dpr,-34*dpr,24*dpr,68*dpr);ctx.strokeRect(-12*dpr,-34*dpr,24*dpr,68*dpr);ctx.fillStyle=`rgba(255,112,55,${pulse})`;ctx.beginPath();ctx.arc(0,32*dpr,7*dpr,0,Math.PI*2);ctx.fill();ctx.restore()}ctx.restore();return;
    }
    if (bullet.type === "grandBarrageWave") {
      const t=clamp(activeAge/bullet.life,0,1),cols=bullet.columns??16,gap=bullet.gapLane??4,gapHalf=bullet.gapColumns??2.4,yBase=-36*dpr+(this.canvas.height+72*dpr)*t;ctx.save();
      for(let i=0;i<cols;i++){const lane=(i/(cols-1))*8;if(Math.abs(lane-gap)<=gapHalf/2)continue;const q=i/(cols-1),x=this.canvas.width*(.015+.97*q),y=yBase+Math.sin(q*Math.PI*3.4+(bullet.phase??0))*bullet.amplitude;const r=bullet.orbRadius;const g=ctx.createRadialGradient(x,y,0,x,y,r*1.8);g.addColorStop(0,"rgba(255,245,221,1)");g.addColorStop(.28,"rgba(255,124,56,.98)");g.addColorStop(1,"rgba(255,76,30,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*1.8,0,Math.PI*2);ctx.fill();}
      ctx.restore();return;
    }
    if (bullet.type === "grandLaserHole") {
      const track=bullet.trackingMs??520,fireAt=track+(bullet.lockMs??380),end=bullet.beamEnd??this.grandRayToBoundary(bullet.x,bullet.y,bullet.targetX,bullet.targetY);ctx.save();ctx.translate(bullet.x,bullet.y);ctx.fillStyle="rgba(32,29,30,.98)";ctx.strokeStyle="rgba(255,77,52,.92)";ctx.lineWidth=2*dpr;ctx.shadowBlur=16*dpr;ctx.shadowColor="rgba(255,61,42,.68)";ctx.beginPath();ctx.arc(0,0,14*dpr,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle="rgba(255,85,54,.96)";ctx.beginPath();ctx.arc(0,0,5*dpr,0,Math.PI*2);ctx.fill();ctx.restore();
      ctx.save();if(activeAge<fireAt){ctx.globalAlpha=activeAge<track?.42:.72;ctx.strokeStyle="rgba(255,95,73,.9)";ctx.lineWidth=1.4*dpr;ctx.setLineDash(activeAge<track?[8*dpr,7*dpr]:[3*dpr,4*dpr]);ctx.beginPath();ctx.moveTo(bullet.x,bullet.y);ctx.lineTo(end.x,end.y);ctx.stroke();}
      else{ctx.globalAlpha=.9;ctx.strokeStyle="rgba(255,60,44,.96)";ctx.shadowBlur=22*dpr;ctx.shadowColor="rgba(255,48,31,.85)";ctx.lineWidth=bullet.width;ctx.beginPath();ctx.moveTo(bullet.x,bullet.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.strokeStyle="rgba(255,229,211,.96)";ctx.lineWidth=2.5*dpr;ctx.stroke();}ctx.restore();return;
    }
    if (bullet.type === "grandKingAdvance") {
      const y = Number.isFinite(bullet.frontY) ? bullet.frontY : (bullet.startY ?? 0);
      ctx.save();
      const shade = ctx.createLinearGradient(0, Math.max(0, y - 72*dpr), 0, y + 8*dpr);
      shade.addColorStop(0, "rgba(30,11,6,.96)");
      shade.addColorStop(.72, "rgba(71,30,18,.92)");
      shade.addColorStop(1, "rgba(150,55,25,.74)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, this.canvas.width, Math.max(0, y));
      ctx.strokeStyle = "rgba(255,121,67,.88)";
      ctx.lineWidth = 3*dpr;
      ctx.shadowBlur = 15*dpr;
      ctx.shadowColor = "rgba(255,78,32,.58)";
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvas.width, y); ctx.stroke();
      // Three cannon apertures make the boundary read as the advancing body, not a laser.
      for (const x of [this.canvas.width*.22, this.canvas.width*.5, this.canvas.width*.78]) {
        ctx.fillStyle = "rgba(255,106,47,.78)";
        ctx.fillRect(x-18*dpr, Math.max(0,y-15*dpr), 36*dpr, 9*dpr);
      }
      ctx.restore();
      return;
    }
    if (bullet.type === "belialBattlenizerSweep") {
      const t=clamp(bullet.activeAge/bullet.life,0,1),isBlue=bullet.colorMode==="blue";
      ctx.save();ctx.globalAlpha=.78;ctx.strokeStyle=isBlue?"rgba(48,123,224,.98)":"rgba(234,111,24,.98)";ctx.lineWidth=bullet.width;ctx.lineCap="round";ctx.shadowBlur=24*dpr;ctx.shadowColor=isBlue?"rgba(49,157,255,.88)":"rgba(255,128,36,.88)";ctx.beginPath();
      if(bullet.orientation==="horizontal"){const y=bullet.side==="start"?(-bullet.width+(this.canvas.height+bullet.width*2)*t):(this.canvas.height+bullet.width-(this.canvas.height+bullet.width*2)*t);ctx.moveTo(-18*dpr,y);ctx.lineTo(this.canvas.width+18*dpr,y);}
      else{const x=bullet.side==="start"?(-bullet.width+(this.canvas.width+bullet.width*2)*t):(this.canvas.width+bullet.width-(this.canvas.width+bullet.width*2)*t);ctx.moveTo(x,-18*dpr);ctx.lineTo(x,this.canvas.height+18*dpr);}
      ctx.stroke();ctx.strokeStyle=isBlue?"rgba(208,235,255,.92)":"rgba(255,231,188,.92)";ctx.lineWidth=3*dpr;ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "lugielSlash") {
      const alpha=.52+Math.sin(Math.PI*age)*.46;ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle="rgba(92,4,18,.98)";ctx.lineWidth=bullet.width*1.75;ctx.lineCap="round";ctx.shadowBlur=28*dpr;ctx.shadowColor="rgba(255,31,65,.9)";ctx.beginPath();ctx.moveTo(bullet.x1,bullet.y1);ctx.lineTo(bullet.x2,bullet.y2);ctx.stroke();ctx.strokeStyle="rgba(255,76,101,.98)";ctx.lineWidth=bullet.width*.58;ctx.stroke();ctx.strokeStyle="rgba(255,224,229,.85)";ctx.lineWidth=1.5*dpr;ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "lugielBladeGate") {
      const t=clamp(bullet.activeAge/bullet.life,0,1);ctx.save();ctx.globalAlpha=.72;ctx.fillStyle="rgba(48,3,12,.9)";ctx.shadowBlur=23*dpr;ctx.shadowColor="rgba(239,27,61,.72)";ctx.strokeStyle="rgba(255,73,96,.9)";ctx.lineWidth=1.4*dpr;
      if(bullet.orientation==="vertical"){
        const x=bullet.side==="start"?(-bullet.thickness+(this.canvas.width+bullet.thickness*2)*t):(this.canvas.width+bullet.thickness-(this.canvas.width+bullet.thickness*2)*t);
        ctx.fillRect(x-bullet.thickness/2,0,bullet.thickness,Math.max(0,bullet.gap-bullet.safeHalf));ctx.fillRect(x-bullet.thickness/2,bullet.gap+bullet.safeHalf,bullet.thickness,Math.max(0,this.canvas.height-(bullet.gap+bullet.safeHalf)));
        for(const y of [bullet.gap-bullet.safeHalf,bullet.gap+bullet.safeHalf]){ctx.beginPath();ctx.moveTo(x-bullet.thickness*.7,y);ctx.lineTo(x+bullet.thickness*.7,y);ctx.stroke();}
      }else{
        const y=bullet.side==="start"?(-bullet.thickness+(this.canvas.height+bullet.thickness*2)*t):(this.canvas.height+bullet.thickness-(this.canvas.height+bullet.thickness*2)*t);
        ctx.fillRect(0,y-bullet.thickness/2,Math.max(0,bullet.gap-bullet.safeHalf),bullet.thickness);ctx.fillRect(bullet.gap+bullet.safeHalf,y-bullet.thickness/2,Math.max(0,this.canvas.width-(bullet.gap+bullet.safeHalf)),bullet.thickness);
        for(const x of [bullet.gap-bullet.safeHalf,bullet.gap+bullet.safeHalf]){ctx.beginPath();ctx.moveTo(x,y-bullet.thickness*.7);ctx.lineTo(x,y+bullet.thickness*.7);ctx.stroke();}
      }ctx.restore();return;
    }
    if (bullet.type === "lugielClockSweep") {
      const angle=bullet.startAngle+bullet.sweep*age,angles=[angle];if(bullet.twin)angles.push(angle+Math.PI);ctx.save();ctx.globalAlpha=.58+Math.sin(Math.PI*age)*.4;ctx.lineCap="round";
      for(const a of angles){const x2=bullet.cx+Math.cos(a)*bullet.radius,y2=bullet.cy+Math.sin(a)*bullet.radius;ctx.strokeStyle="rgba(47,2,11,.96)";ctx.lineWidth=bullet.width*1.8;ctx.shadowBlur=24*dpr;ctx.shadowColor="rgba(255,35,67,.85)";ctx.beginPath();ctx.moveTo(bullet.cx,bullet.cy);ctx.lineTo(x2,y2);ctx.stroke();ctx.strokeStyle="rgba(255,68,95,.96)";ctx.lineWidth=bullet.width*.58;ctx.stroke();}
      ctx.fillStyle="rgba(255,79,103,.9)";ctx.shadowBlur=18*dpr;ctx.beginPath();ctx.arc(bullet.cx,bullet.cy,7*dpr,0,Math.PI*2);ctx.fill();ctx.restore();return;
    }
    if (bullet.type === "mephistoClaw" || bullet.type === "zagiLightning") {
      const t=clamp(bullet.activeAge/bullet.life,0,1),alpha=.48+Math.sin(Math.PI*t)*.5;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=bullet.type==="mephistoClaw"?"rgba(210,53,145,.62)":"rgba(247,55,65,.72)";ctx.shadowBlur=20*dpr;ctx.shadowColor=bullet.type==="mephistoClaw"?"rgba(225,61,168,.72)":"rgba(255,36,54,.82)";if(bullet.orientation==="vertical")ctx.fillRect(bullet.center-bullet.width/2,0,bullet.width,this.canvas.height);else ctx.fillRect(0,bullet.center-bullet.width/2,this.canvas.width,bullet.width);ctx.restore();return;
    }
    if (bullet.type === "mephistoCross") {
      const t=clamp(bullet.activeAge/bullet.life,0,1),alpha=.42+Math.sin(Math.PI*t)*.52;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=bullet.zagi?"rgba(246,50,61,.7)":"rgba(213,54,148,.61)";ctx.shadowBlur=18*dpr;ctx.shadowColor=bullet.zagi?"rgba(255,33,46,.8)":"rgba(224,57,170,.72)";ctx.fillRect(bullet.cx-bullet.width/2,0,bullet.width,this.canvas.height);ctx.fillRect(0,bullet.cy-bullet.width/2,this.canvas.width,bullet.width);ctx.restore();return;
    }
    if (bullet.type === "zagiSweep") {
      const alpha=.48+Math.sin(Math.PI*age)*.5;ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle="rgba(255,61,70,.96)";ctx.lineWidth=bullet.width;ctx.lineCap="round";ctx.shadowBlur=20*dpr;ctx.shadowColor="rgba(255,31,47,.82)";ctx.beginPath();ctx.moveTo(bullet.x1,bullet.y1);ctx.lineTo(bullet.x2,bullet.y2);ctx.stroke();ctx.strokeStyle="rgba(255,214,217,.82)";ctx.lineWidth=2*dpr;ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "zagiShockRing") {
      const radius=bullet.startRadius+(bullet.endRadius-bullet.startRadius)*age;
      const center=bullet.safeAngle??0,gap=bullet.safeHalfAngle??.5,gaps=[center,center+Math.PI];
      const blocked=[],intervals=[],norm=(a)=>{a%=Math.PI*2;if(a<0)a+=Math.PI*2;return a};
      for(const g of gaps){const a=norm(g-gap),b=norm(g+gap);if(a<b)blocked.push([a,b]);else{blocked.push([0,b],[a,Math.PI*2])}}
      blocked.sort((a,b)=>a[0]-b[0]);let cursor=0;for(const [a,b] of blocked){if(a>cursor)intervals.push([cursor,a]);cursor=Math.max(cursor,b)}if(cursor<Math.PI*2)intervals.push([cursor,Math.PI*2]);
      ctx.save();ctx.globalAlpha=.42+Math.sin(Math.PI*age)*.52;ctx.strokeStyle="rgba(255,66,78,.94)";ctx.lineWidth=bullet.width;ctx.shadowBlur=18*dpr;ctx.shadowColor="rgba(255,27,47,.75)";ctx.lineCap="round";
      for(const [a,b] of intervals){ctx.beginPath();ctx.arc(bullet.x,bullet.y,radius,a,b);ctx.stroke()}
      ctx.strokeStyle="rgba(217,244,255,.72)";ctx.lineWidth=1.6*dpr;ctx.shadowBlur=8*dpr;ctx.shadowColor="rgba(169,230,255,.45)";
      for(const g of gaps){for(const edge of [g-gap,g+gap]){ctx.beginPath();ctx.moveTo(bullet.x+Math.cos(edge)*(radius-9*dpr),bullet.y+Math.sin(edge)*(radius-9*dpr));ctx.lineTo(bullet.x+Math.cos(edge)*(radius+9*dpr),bullet.y+Math.sin(edge)*(radius+9*dpr));ctx.stroke()}}
      ctx.restore();return;
    }
    if (bullet.type === "girasWave") {
      const y=this.canvas.height+bullet.thickness-(this.canvas.height+bullet.thickness*2)*age;
      const left=bullet.safeCenter-bullet.safeHalfWidth,right=bullet.safeCenter+bullet.safeHalfWidth;
      ctx.save();const grad=ctx.createLinearGradient(0,y-bullet.thickness,0,y+bullet.thickness);grad.addColorStop(0,"rgba(90,174,205,0)");grad.addColorStop(.35,"rgba(95,177,207,.48)");grad.addColorStop(.62,"rgba(195,238,246,.72)");grad.addColorStop(1,"rgba(45,112,151,0)");ctx.fillStyle=grad;ctx.shadowBlur=13*dpr;ctx.shadowColor="rgba(109,204,235,.45)";ctx.fillRect(0,y-bullet.thickness/2,Math.max(0,left),bullet.thickness);ctx.fillRect(right,y-bullet.thickness/2,Math.max(0,this.canvas.width-right),bullet.thickness);ctx.strokeStyle="rgba(224,249,255,.7)";ctx.lineWidth=1.2*dpr;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "pressureWarp") {
      const pulse=.54+Math.sin(performance.now()/45)*.18;ctx.save();ctx.globalAlpha=pulse;ctx.fillStyle="rgba(183,121,225,.42)";ctx.shadowBlur=22*dpr;ctx.shadowColor="rgba(170,105,231,.72)";if(bullet.orientation==="vertical")ctx.fillRect(bullet.center-bullet.width/2,0,bullet.width,this.canvas.height);else ctx.fillRect(0,bullet.center-bullet.width/2,this.canvas.width,bullet.width);ctx.strokeStyle="rgba(239,218,255,.82)";ctx.lineWidth=1.3*dpr;ctx.setLineDash([4*dpr,7*dpr]);ctx.beginPath();if(bullet.orientation==="vertical"){ctx.moveTo(bullet.center,0);ctx.lineTo(bullet.center,this.canvas.height)}else{ctx.moveTo(0,bullet.center);ctx.lineTo(this.canvas.width,bullet.center)}ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "pressureBalloon") {
      const radius=bullet.startRadius+(bullet.endRadius-bullet.startRadius)*age;ctx.save();ctx.globalAlpha=.45+age*.32;ctx.strokeStyle="rgba(245,183,227,.92)";ctx.lineWidth=(3+age*2)*dpr;ctx.shadowBlur=18*dpr;ctx.shadowColor="rgba(230,132,211,.72)";ctx.beginPath();ctx.arc(bullet.x,bullet.y,radius,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=.08+age*.08;ctx.fillStyle="rgba(226,137,213,.42)";ctx.beginPath();ctx.arc(bullet.x,bullet.y,radius,0,Math.PI*2);ctx.fill();ctx.restore();return;
    }
    if (bullet.type === "circuitArc") {
      const flicker=.72+Math.sin(performance.now()/43)*.13;
      ctx.save();ctx.globalAlpha=flicker;ctx.strokeStyle="rgba(255,226,91,.98)";ctx.lineWidth=bullet.width;ctx.shadowBlur=15*dpr;ctx.shadowColor="rgba(255,210,55,.75)";
      ctx.beginPath();ctx.moveTo(bullet.x1,bullet.y1);ctx.lineTo((bullet.x1+bullet.x2)/2+Math.sin(performance.now()/58)*5*dpr,(bullet.y1+bullet.y2)/2);ctx.lineTo(bullet.x2,bullet.y2);ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "lightningColumn") {
      const flicker=.68+Math.sin(performance.now()/40)*.16;
      ctx.save();ctx.globalAlpha=flicker;ctx.fillStyle="rgba(255,236,112,.84)";ctx.shadowBlur=20*dpr;ctx.shadowColor="rgba(255,211,58,.74)";ctx.fillRect(bullet.x-bullet.width/2,0,bullet.width,this.canvas.height);ctx.restore();return;
    }
    if (bullet.type === "memorySweep" || bullet.type === "grandBeam") {
      const t=clamp(bullet.activeAge/bullet.life,0,1),alpha=Math.sin(Math.PI*t);ctx.save();ctx.globalAlpha=.52+alpha*.42;ctx.fillStyle=bullet.type==="grandBeam"?"rgba(177,88,219,.58)":"rgba(116,66,150,.5)";ctx.shadowBlur=bullet.type==="grandBeam"?22*dpr:14*dpr;ctx.shadowColor=bullet.type==="grandBeam"?"rgba(189,91,232,.65)":"rgba(130,72,165,.5)";if(bullet.orientation==="vertical")ctx.fillRect(bullet.center-bullet.width/2,0,bullet.width,this.canvas.height);else ctx.fillRect(0,bullet.center-bullet.width/2,this.canvas.width,bullet.width);ctx.restore();return;
    }
    if (bullet.type === "grandShock") {
      const t=clamp(bullet.activeAge/bullet.life,0,1),half=bullet.startHalfWidth+(bullet.endHalfWidth-bullet.startHalfWidth)*Math.sin(Math.PI*t);ctx.save();ctx.globalAlpha=.65;ctx.strokeStyle="rgba(241,154,98,.9)";ctx.lineWidth=10*dpr;ctx.shadowBlur=16*dpr;ctx.shadowColor="rgba(237,98,53,.55)";ctx.beginPath();ctx.arc(bullet.center,this.canvas.height*.72,half,Math.PI,Math.PI*2);ctx.stroke();ctx.restore();return;
    }
    if (bullet.type === "lugielLance") {
      const t=clamp(bullet.activeAge/bullet.life,0,1),a=Math.sin(Math.PI*t);ctx.save();ctx.globalAlpha=.58+a*.4;ctx.fillStyle="rgba(178,34,63,.68)";ctx.shadowBlur=20*dpr;ctx.shadowColor="rgba(214,42,72,.68)";ctx.fillRect(bullet.x-bullet.width/2,0,bullet.width,this.canvas.height);ctx.restore();return;
    }
    if (bullet.type === "chaosPanel") {
      const t=clamp(bullet.activeAge/bullet.life,0,1);ctx.save();ctx.globalAlpha=.62;ctx.fillStyle="rgba(111,29,137,.62)";ctx.shadowBlur=18*dpr;ctx.shadowColor="rgba(200,90,231,.7)";
      if(bullet.orientation==="horizontal"){const x=-bullet.thickness+(this.canvas.width+bullet.thickness*2)*t;ctx.fillRect(x-bullet.thickness/2,0,bullet.thickness,Math.max(0,bullet.gap-bullet.width/2));ctx.fillRect(x-bullet.thickness/2,bullet.gap+bullet.width/2,bullet.thickness,Math.max(0,this.canvas.height-(bullet.gap+bullet.width/2)));}
      else{const y=-bullet.thickness+(this.canvas.height+bullet.thickness*2)*t;ctx.fillRect(0,y-bullet.thickness/2,Math.max(0,bullet.gap-bullet.width/2),bullet.thickness);ctx.fillRect(bullet.gap+bullet.width/2,y-bullet.thickness/2,Math.max(0,this.canvas.width-(bullet.gap+bullet.width/2)),bullet.thickness);}
      ctx.strokeStyle="rgba(235,186,247,.75)";ctx.lineWidth=1*dpr;ctx.restore();return;
    }
    if (bullet.type === "chaosProminence") {
      const t=clamp(bullet.activeAge/bullet.life,0,1),gapHalf=(bullet.gapWidth??118*dpr)/2;ctx.save();ctx.globalAlpha=.7;ctx.fillStyle="rgba(255,72,80,.58)";ctx.shadowBlur=22*dpr;ctx.shadowColor="rgba(255,55,91,.78)";
      if(bullet.orientation==="horizontal"){const y=bullet.side==="start"?(-bullet.thickness+(this.canvas.height+bullet.thickness*2)*t):(this.canvas.height+bullet.thickness-(this.canvas.height+bullet.thickness*2)*t),left=Math.max(0,bullet.gap-gapHalf),right=Math.min(this.canvas.width,bullet.gap+gapHalf);ctx.fillRect(0,y-bullet.thickness/2,left,bullet.thickness);ctx.fillRect(right,y-bullet.thickness/2,Math.max(0,this.canvas.width-right),bullet.thickness);}
      else{const x=bullet.side==="start"?(-bullet.thickness+(this.canvas.width+bullet.thickness*2)*t):(this.canvas.width+bullet.thickness-(this.canvas.width+bullet.thickness*2)*t),top=Math.max(0,bullet.gap-gapHalf),bottom=Math.min(this.canvas.height,bullet.gap+gapHalf);ctx.fillRect(x-bullet.thickness/2,0,bullet.thickness,top);ctx.fillRect(x-bullet.thickness/2,bottom,bullet.thickness,Math.max(0,this.canvas.height-bottom));}
      ctx.restore();return;
    }
    if (bullet.type === "chaosBrokenHalo") {
      const radius=bullet.startRadius+(bullet.endRadius-bullet.startRadius)*age;ctx.save();ctx.strokeStyle="rgba(196,73,218,.9)";ctx.lineWidth=bullet.thickness;ctx.lineCap="round";ctx.shadowBlur=18*dpr;ctx.shadowColor="rgba(151,39,183,.8)";
      for(let part=0;part<2;part++){const center=bullet.gapAngle+part*Math.PI;ctx.beginPath();ctx.arc(bullet.centerX,bullet.centerY,radius,center+bullet.gapHalf,center+Math.PI-bullet.gapHalf);ctx.stroke()}
      ctx.strokeStyle="rgba(205,245,255,.6)";ctx.lineWidth=1.4*dpr;for(const center of [bullet.gapAngle,bullet.gapAngle+Math.PI]){for(const edge of [center-bullet.gapHalf,center+bullet.gapHalf]){ctx.beginPath();ctx.moveTo(bullet.centerX+Math.cos(edge)*(radius-10*dpr),bullet.centerY+Math.sin(edge)*(radius-10*dpr));ctx.lineTo(bullet.centerX+Math.cos(edge)*(radius+10*dpr),bullet.centerY+Math.sin(edge)*(radius+10*dpr));ctx.stroke()}}
      ctx.restore();return;
    }
    if (bullet.type === "fissure") {
      const alpha = Math.sin(Math.PI * age); ctx.save(); ctx.globalAlpha = .35 + alpha * .55; ctx.strokeStyle = "rgba(255,175,89,.96)"; ctx.lineWidth = 3 * dpr; ctx.shadowBlur = 14 * dpr; ctx.shadowColor = "rgba(255,112,61,.55)"; ctx.beginPath(); let y = 0; ctx.moveTo(bullet.x, 0); while (y < this.canvas.height) { y += 22 * dpr; ctx.lineTo(bullet.x + Math.sin(y / 17) * 5 * dpr, y); } ctx.stroke(); ctx.restore(); return;
    }
    if (bullet.type === "tentacle") {
      const extent = Math.sin(Math.PI * age), maxLength = (bullet.orientation === "horizontal" ? this.canvas.width : this.canvas.height) * .68, length = maxLength * extent;
      ctx.save(); ctx.strokeStyle = "rgba(116,105,135,.98)"; ctx.lineWidth = bullet.thickness; ctx.lineCap = "round"; ctx.shadowBlur = 12 * dpr; ctx.shadowColor = "rgba(66,45,83,.8)"; ctx.beginPath();
      if (bullet.orientation === "horizontal") { const start = bullet.side === "start", x1 = start ? -20 * dpr : this.canvas.width + 20 * dpr, x2 = start ? length : this.canvas.width - length, wobble = Math.sin(performance.now() / 95) * 4 * dpr; ctx.moveTo(x1, bullet.lane); ctx.quadraticCurveTo((x1 + x2) / 2, bullet.lane + wobble, x2, bullet.lane); }
      else { const start = bullet.side === "start", y1 = start ? -20 * dpr : this.canvas.height + 20 * dpr, y2 = start ? length : this.canvas.height - length, wobble = Math.sin(performance.now() / 95) * 4 * dpr; ctx.moveTo(bullet.lane, y1); ctx.quadraticCurveTo(bullet.lane + wobble, (y1 + y2) / 2, bullet.lane, y2); }
      ctx.stroke(); ctx.restore(); return;
    }
    if (bullet.type === "darkcorridor") {
      const eased = .5 - Math.cos(Math.PI * age) / 2;
      const halfWidth = bullet.startHalfWidth + (bullet.endHalfWidth - bullet.startHalfWidth) * eased;
      const center = bullet.center + bullet.drift * Math.sin(Math.PI * age);
      const left = center - halfWidth;
      const right = center + halfWidth;

      ctx.save();

      let grad = ctx.createLinearGradient(0, 0, Math.max(1, left), 0);
      grad.addColorStop(0, "rgba(0,0,0,.99)");
      grad.addColorStop(.78, "rgba(18,13,24,.96)");
      grad.addColorStop(1, "rgba(102,78,118,.78)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, Math.max(0, left), this.canvas.height);

      grad = ctx.createLinearGradient(this.canvas.width, 0, Math.min(this.canvas.width - 1, right), 0);
      grad.addColorStop(0, "rgba(0,0,0,.99)");
      grad.addColorStop(.78, "rgba(18,13,24,.96)");
      grad.addColorStop(1, "rgba(102,78,118,.78)");
      ctx.fillStyle = grad;
      ctx.fillRect(Math.min(this.canvas.width, right), 0, Math.max(0, this.canvas.width - right), this.canvas.height);

      // Keep the safe corridor slightly brighter than the darkness.
      ctx.fillStyle = "rgba(206,226,230,.04)";
      ctx.fillRect(left, 0, right - left, this.canvas.height);

      // Draw the exact same left/right values used by collision detection.
      ctx.strokeStyle = "rgba(226,213,235,.84)";
      ctx.lineWidth = 1.4 * dpr;
      ctx.shadowBlur = 8 * dpr;
      ctx.shadowColor = "rgba(145,108,169,.48)";
      for (const x of [left, right]) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.canvas.height);
        ctx.stroke();
      }

      ctx.restore();
      return;
    }
    if (bullet.type === "swoop") {
      const t = clamp(bullet.activeAge / bullet.life, 0, 1);
      const travel = this.canvas.width + bullet.width * 2;
      const x = bullet.fromLeft ? -bullet.width + travel * t : this.canvas.width + bullet.width - travel * t;
      const drawY = bullet.worldSpace && this.mode === "platform" ? this.platformScreenY(bullet.y) : bullet.y;
      ctx.save();
      const grad = ctx.createLinearGradient(x - bullet.width / 2, 0, x + bullet.width / 2, 0);
      grad.addColorStop(0, "rgba(255,198,117,0)"); grad.addColorStop(.35, "rgba(255,224,171,.7)"); grad.addColorStop(.5, "rgba(255,245,221,.95)"); grad.addColorStop(.65, "rgba(255,224,171,.7)"); grad.addColorStop(1, "rgba(255,198,117,0)");
      ctx.fillStyle = grad; ctx.shadowBlur = 12 * dpr; ctx.shadowColor = "rgba(255,187,101,.48)";
      ctx.fillRect(x - bullet.width / 2, drawY - bullet.height / 2, bullet.width, bullet.height); ctx.restore(); return;
    }
    if (bullet.type === "chaosLance") {
      const pulse = .78 + Math.sin(performance.now() / 52) * .08;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = "rgba(181,75,205,.9)";
      ctx.lineWidth = bullet.width;
      ctx.lineCap = "round";
      ctx.shadowBlur = 18 * dpr;
      ctx.shadowColor = "rgba(167,59,199,.7)";
      ctx.beginPath();
      ctx.moveTo(bullet.x1, bullet.y1);
      ctx.lineTo(bullet.x2, bullet.y2);
      ctx.stroke();
      ctx.globalAlpha = .88;
      ctx.strokeStyle = "rgba(242,205,248,.88)";
      ctx.lineWidth = 2.2 * dpr;
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (bullet.type === "sacredFire") {
      const pulse = .74 + Math.sin(performance.now() / 62) * .11;
      ctx.save();
      ctx.globalAlpha = pulse;
      const grad = ctx.createLinearGradient(0, this.canvas.height, 0, 0);
      grad.addColorStop(0, "rgba(255,217,130,.95)");
      grad.addColorStop(.28, "rgba(255,103,45,.82)");
      grad.addColorStop(1, "rgba(121,25,18,.16)");
      ctx.fillStyle = grad;
      ctx.shadowBlur = 18 * dpr;
      ctx.shadowColor = "rgba(255,73,32,.55)";
      ctx.fillRect(bullet.x - bullet.width / 2, 0, bullet.width, this.canvas.height);
      ctx.restore();
      return;
    }
    if (bullet.type === "gateChain") {
      ctx.save();
      ctx.strokeStyle = "rgba(84,39,33,.98)";
      ctx.lineWidth = bullet.width;
      ctx.lineCap = "round";
      ctx.shadowBlur = 12 * dpr;
      ctx.shadowColor = "rgba(255,80,40,.45)";
      ctx.beginPath(); ctx.moveTo(bullet.x1, bullet.y1); ctx.lineTo(bullet.x2, bullet.y2); ctx.stroke();
      ctx.strokeStyle = "rgba(255,137,79,.78)";
      ctx.lineWidth = 1.8 * dpr;
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (bullet.type === "gateRupture") {
      const t = clamp(bullet.activeAge / bullet.life, 0, 1);
      const y = -bullet.thickness + (this.canvas.height + bullet.thickness * 2) * t;
      const left = bullet.safeCenter - bullet.safeHalfWidth;
      const right = bullet.safeCenter + bullet.safeHalfWidth;
      ctx.save();
      const grad = ctx.createLinearGradient(0, y - bullet.thickness, 0, y + bullet.thickness);
      grad.addColorStop(0, "rgba(255,96,45,0)");
      grad.addColorStop(.5, "rgba(255,165,88,.9)");
      grad.addColorStop(1, "rgba(255,96,45,0)");
      ctx.fillStyle = grad;
      ctx.shadowBlur = 16 * dpr;
      ctx.shadowColor = "rgba(255,84,41,.6)";
      ctx.fillRect(0, y - bullet.thickness / 2, Math.max(0, left), bullet.thickness);
      ctx.fillRect(right, y - bullet.thickness / 2, Math.max(0, this.canvas.width - right), bullet.thickness);
      ctx.restore();
      return;
    }
    if (bullet.type === "magmaSlash") {
      const alpha = Math.sin(Math.PI * age);
      ctx.save(); ctx.globalAlpha = .58 + alpha * .42; ctx.strokeStyle = "rgba(255,184,92,.98)"; ctx.lineWidth = bullet.width; ctx.shadowBlur = 18 * dpr; ctx.shadowColor = "rgba(255,91,47,.68)";
      ctx.beginPath(); ctx.moveTo(bullet.x1, bullet.y1); ctx.lineTo(bullet.x2, bullet.y2); ctx.stroke(); ctx.restore(); return;
    }
    if (bullet.type === "nexusTentacle") {
      const pulse = .72 + Math.sin(performance.now() / 90) * .08;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = "rgba(111,73,70,.98)";
      ctx.lineWidth = bullet.width;
      ctx.lineCap = "round";
      ctx.shadowBlur = 12 * dpr;
      ctx.shadowColor = "rgba(206,76,64,.38)";
      ctx.beginPath();
      const mx = (bullet.x1 + bullet.x2) / 2 + Math.sin(performance.now() / 80) * 5 * dpr;
      const my = (bullet.y1 + bullet.y2) / 2;
      ctx.moveTo(bullet.x1, bullet.y1);
      ctx.quadraticCurveTo(mx, my, bullet.x2, bullet.y2);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (bullet.type === "darkBeam" || bullet.type === "freezeRay") {
      const t=clamp(bullet.activeAge/bullet.life,0,1),alpha=Math.sin(Math.PI*t);ctx.save();ctx.globalAlpha=.55+alpha*.4;ctx.fillStyle=bullet.type==="freezeRay"?"rgba(169,220,244,.58)":"rgba(223,51,71,.62)";ctx.shadowBlur=16*dpr;ctx.shadowColor=bullet.type==="freezeRay"?"rgba(125,193,230,.6)":"rgba(215,38,60,.7)";if(bullet.orientation==="vertical")ctx.fillRect(bullet.center-bullet.width/2,0,bullet.width,this.canvas.height);else ctx.fillRect(0,bullet.center-bullet.width/2,this.canvas.width,bullet.width);ctx.restore();return;
    }
    if (bullet.type === "timeStopBand") {
      const t=clamp(bullet.activeAge/bullet.life,0,1),alpha=.5+Math.sin(Math.PI*t)*.35,a=bullet.safeCenter-bullet.safeHalfWidth,b=bullet.safeCenter+bullet.safeHalfWidth;ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle="rgba(79,108,145,.74)";ctx.shadowBlur=18*dpr;ctx.shadowColor="rgba(123,181,224,.52)";if(bullet.orientation==="vertical"){ctx.fillRect(0,0,Math.max(0,a),this.canvas.height);ctx.fillRect(b,0,Math.max(0,this.canvas.width-b),this.canvas.height);}else{ctx.fillRect(0,0,this.canvas.width,Math.max(0,a));ctx.fillRect(0,b,this.canvas.width,Math.max(0,this.canvas.height-b));}ctx.restore();return;
    }
    if (bullet.type === "petrify") {
      const pulse = .65 + Math.sin(performance.now() / 55) * .12; ctx.save(); ctx.globalAlpha = pulse; ctx.fillStyle = "rgba(224,233,235,.82)"; ctx.shadowBlur = 22 * dpr; ctx.shadowColor = "rgba(227,235,239,.78)"; if (bullet.orientation === "vertical") ctx.fillRect(bullet.center - bullet.width / 2, 0, bullet.width, this.canvas.height); else ctx.fillRect(0, bullet.center - bullet.width / 2, this.canvas.width, bullet.width); ctx.restore();
    }
  }

  drawDodgePlayer(now) {
    const ctx = this.ctx, invulnerable = now < this.player.invulnerableUntil; if (invulnerable && Math.floor(now / 82) % 2 !== 0) return;
    const dpr = this.dpr, x = this.player.x, y = this.player.y, r = this.player.radius * dpr;

    if (this.mode === "chaos" && this.purifyActive) {
      ctx.save();
      ctx.globalAlpha = .48 + Math.sin(now / 120) * .1;
      ctx.strokeStyle = "rgba(179,241,250,.86)";
      ctx.lineWidth = 1.25 * dpr;
      ctx.shadowBlur = 11 * dpr;
      ctx.shadowColor = "rgba(111,221,244,.62)";
      ctx.beginPath();
      ctx.arc(x, y, 17 * dpr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.mode === "nexus" && this.nexusMetaField) {
      ctx.save();
      ctx.globalAlpha = .26 + Math.sin(now / 150) * .05;
      ctx.strokeStyle = "rgba(202,224,231,.82)";
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath(); ctx.arc(x, y, 19 * dpr, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    if (this.mode === "nexus" && ["anphans","junis","junis-blue","noa"].includes(this.nexusForm)) {
      ctx.save();ctx.translate(x,y);
      const palette={anphans:["#dff7fb","rgba(119,229,255,.72)"],junis:["#ffe6e2","rgba(255,75,72,.78)"],"junis-blue":["#e2f4ff","rgba(76,171,255,.82)"],noa:["#ffffff","rgba(220,240,255,.95)"]}[this.nexusForm];
      const pulse=.84+Math.sin(now/110)*.12;ctx.globalAlpha=pulse;ctx.shadowBlur=(this.nexusForm==="noa"?22:12)*dpr;ctx.shadowColor=palette[1];ctx.fillStyle=palette[0];ctx.strokeStyle="rgba(255,255,255,.96)";ctx.lineWidth=1*dpr;
      ctx.beginPath();ctx.moveTo(0,-r*1.15);ctx.lineTo(r*.9,0);ctx.lineTo(0,r*1.15);ctx.lineTo(-r*.9,0);ctx.closePath();ctx.fill();ctx.stroke();
      if(this.nexusForm==="junis"||this.nexusForm==="junis-blue"){ctx.strokeStyle=this.nexusForm==="junis"?"rgba(255,78,72,.92)":"rgba(84,183,255,.94)";ctx.lineWidth=1.5*dpr;ctx.beginPath();ctx.arc(0,0,12*dpr,-2.4,-.7);ctx.stroke();}
      if(this.nexusForm==="noa"){
        ctx.globalAlpha=.6;ctx.strokeStyle="rgba(232,247,255,.92)";ctx.lineWidth=1.4*dpr;ctx.beginPath();ctx.moveTo(-4*dpr,-3*dpr);ctx.quadraticCurveTo(-25*dpr,-17*dpr,-29*dpr,4*dpr);ctx.moveTo(4*dpr,-3*dpr);ctx.quadraticCurveTo(25*dpr,-17*dpr,29*dpr,4*dpr);ctx.stroke();ctx.globalAlpha=.28;ctx.beginPath();ctx.arc(0,0,20*dpr,0,Math.PI*2);ctx.stroke();
      }
      ctx.restore();return;
    }

    if (this.tigaGlitter) {
      ctx.save();
      ctx.translate(x, y);
      const pulse = .75 + Math.sin(now / 105) * .16;
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = "rgba(255,232,142,.95)";
      ctx.lineWidth = 1.5 * dpr;
      ctx.shadowBlur = 18 * dpr;
      ctx.shadowColor = "rgba(255,218,103,.92)";
      ctx.beginPath(); ctx.arc(0, 0, 17 * dpr, 0, Math.PI * 2); ctx.stroke();
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#fff1ad";
      ctx.fillRect(-6.5 * dpr, -6.5 * dpr, 13 * dpr, 13 * dpr);
      ctx.restore();
      return;
    }

    if (this.mode === "chaos" && this.cosmosForm) {
      const palette={
        luna:{fill:"#dff8ff",glow:"rgba(93,207,255,.95)",ring:"rgba(174,239,255,.78)"},
        corona:{fill:"#fff0dc",glow:"rgba(255,91,60,.95)",ring:"rgba(255,155,91,.82)"},
        eclipse:{fill:"#fff8db",glow:"rgba(255,215,94,.95)",ring:"rgba(91,188,255,.8)"},
        "miracle-luna":{fill:"#ffffff",glow:"rgba(178,241,255,1)",ring:"rgba(255,246,186,.92)"}
      }[this.cosmosForm] ?? {fill:"#dff8ff",glow:"rgba(93,207,255,.95)",ring:"rgba(174,239,255,.78)"};
      ctx.save();ctx.translate(x,y);const pulse=.86+Math.sin(now/115)*.12;ctx.globalAlpha=pulse;ctx.shadowBlur=(this.cosmosForm==="miracle-luna"?22:14)*dpr;ctx.shadowColor=palette.glow;ctx.fillStyle=palette.fill;ctx.strokeStyle=palette.ring;ctx.lineWidth=1.2*dpr;
      ctx.beginPath();ctx.moveTo(0,-r*1.15);ctx.lineTo(r*.92,0);ctx.lineTo(0,r*1.15);ctx.lineTo(-r*.92,0);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.globalAlpha=.5;ctx.beginPath();ctx.arc(0,0,(this.cosmosForm==="corona"?14:this.cosmosForm==="eclipse"?16:this.cosmosForm==="miracle-luna"?19:13)*dpr,0,Math.PI*2);ctx.stroke();
      if(this.cosmosForm==="eclipse"){ctx.strokeStyle="rgba(255,98,72,.8)";ctx.beginPath();ctx.arc(0,0,12*dpr,-2.6,-1.05);ctx.stroke();ctx.strokeStyle="rgba(90,191,255,.85)";ctx.beginPath();ctx.arc(0,0,12*dpr,.54,2.08);ctx.stroke()}
      if(this.cosmosForm==="miracle-luna"){ctx.globalAlpha=.24;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,(22+i*7)*dpr,0,Math.PI*2);ctx.stroke()}}
      ctx.restore();return;
    }

    if (this.mode === "ginga" && this.gingaLiveForm === "black-king") {
      ctx.save();ctx.translate(x,y);ctx.shadowBlur=9*dpr;ctx.shadowColor="rgba(244,133,72,.45)";ctx.fillStyle="rgba(211,103,64,.96)";ctx.strokeStyle="rgba(255,225,188,.9)";ctx.lineWidth=1*dpr;
      ctx.beginPath();ctx.moveTo(-10*dpr,-9*dpr);ctx.lineTo(10*dpr,-9*dpr);ctx.lineTo(13*dpr,8*dpr);ctx.lineTo(0,13*dpr);ctx.lineTo(-13*dpr,8*dpr);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();return;
    }

    if (this.mode === "pressure" && this.pressureMantleActive) {
      ctx.save();ctx.translate(x,y);ctx.globalAlpha=.42+Math.sin(now/110)*.12;ctx.strokeStyle="rgba(227,236,244,.92)";ctx.lineWidth=1.4*dpr;ctx.shadowBlur=12*dpr;ctx.shadowColor="rgba(201,221,239,.72)";ctx.beginPath();ctx.arc(0,0,18*dpr,Math.PI*.15,Math.PI*1.85);ctx.stroke();ctx.restore();
    }

    if (this.originalEncounter === "original_five_king" && this.elapsed < (this.fiveFrozenUntil ?? 0)) {
      ctx.save();ctx.translate(x,y);ctx.globalAlpha=.48+.16*Math.sin(now/75);ctx.strokeStyle="rgba(184,241,255,.96)";ctx.lineWidth=2*dpr;ctx.shadowBlur=14*dpr;ctx.shadowColor="rgba(94,213,255,.82)";for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(Math.cos(a)*11*dpr,Math.sin(a)*11*dpr);ctx.lineTo(Math.cos(a)*18*dpr,Math.sin(a)*18*dpr);ctx.stroke();}ctx.restore();
    }

    ctx.save(); ctx.translate(x, y); ctx.shadowBlur = 9 * dpr; ctx.shadowColor = this.mode === "ginga" ? "rgba(120,189,255,.72)" : "rgba(118,235,255,.58)"; ctx.fillStyle = this.mode === "ginga" ? "#d7edff" : "#abf5ff"; ctx.beginPath(); ctx.moveTo(0, -r * 1.12); ctx.lineTo(r * .86, 0); ctx.lineTo(0, r * 1.12); ctx.lineTo(-r * .86, 0); ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(255,255,255,.93)"; ctx.lineWidth = .9 * dpr; ctx.stroke(); ctx.restore();
  }

  drawGuardPlayer(now) {
    const ctx = this.ctx, dpr = this.dpr, x = this.player.x, y = this.player.y, invulnerable = now < this.player.invulnerableUntil;
    if (!invulnerable || Math.floor(now / 82) % 2 === 0) { ctx.save(); ctx.translate(x, y); ctx.fillStyle = "#abf5ff"; ctx.shadowBlur = 10 * dpr; ctx.shadowColor = "rgba(117,233,255,.62)"; ctx.beginPath(); ctx.arc(0, 0, 6.2 * dpr, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (!this.guardDirection) return;
    const angle = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[this.guardDirection];
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.strokeStyle = "rgba(255,255,255,.98)"; ctx.lineWidth = 3.2 * dpr; ctx.lineCap = "round"; ctx.shadowBlur = 9 * dpr; ctx.shadowColor = "rgba(156,231,255,.55)"; ctx.beginPath(); ctx.arc(0, 0, 24 * dpr, -.67, .67); ctx.stroke(); ctx.restore();
  }

  drawPlatforms(now) {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const target = this.platformFloorsTarget ?? 9;

    // Wind streaks move with the camera and sell the feeling of gaining altitude.
    ctx.save();
    ctx.globalAlpha = .13;
    ctx.strokeStyle = "rgba(202,231,240,.55)";
    ctx.lineWidth = .8 * dpr;
    for (let i = 0; i < 8; i++) {
      const x = ((i * 137 + now * .018) % (this.canvas.width + 120 * dpr)) - 60 * dpr;
      const y = (i * 71 + Math.abs(this.platformCameraY) * .11) % this.canvas.height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 38 * dpr, y - 5 * dpr);
      ctx.stroke();
    }
    ctx.restore();

    for (const platform of this.platforms ?? []) {
      const screenY = platform.worldY - this.platformCameraY;
      if (screenY < -55 * dpr || screenY > this.canvas.height + 28 * dpr) continue;

      ctx.save();
      const goalPulse = platform.goal ? .62 + Math.sin(now / 120) * .18 : .28;
      ctx.fillStyle = platform.goal
        ? `rgba(218,240,222,${goalPulse})`
        : "rgba(139,169,181,.34)";
      ctx.shadowBlur = platform.goal ? 18 * dpr : 5 * dpr;
      ctx.shadowColor = platform.goal ? "rgba(187,245,207,.55)" : "rgba(104,165,188,.16)";
      ctx.fillRect(platform.x, screenY, platform.w, platform.h);

      ctx.globalAlpha = .74;
      ctx.fillStyle = "rgba(238,248,250,.65)";
      ctx.fillRect(platform.x, screenY, platform.w, 1.2 * dpr);

      if (platform.floor > 0) {
        ctx.globalAlpha = .26;
        ctx.fillStyle = "#fff";
        ctx.font = `${9 * dpr}px system-ui`;
        ctx.fillText(String(platform.floor), platform.x + 5 * dpr, screenY - 5 * dpr);
      }
      ctx.restore();

      if (platform.goal) {
        const coreX = platform.x + platform.w / 2;
        const coreY = screenY - 34 * dpr;
        const pulse = .8 + Math.sin(now / 105) * .12;
        ctx.save();

        // A small airborne silhouette makes it clear that the glowing point belongs to Melba,
        // instead of looking like a random checkpoint collectible.
        ctx.globalAlpha = .58;
        ctx.strokeStyle = "rgba(198,178,157,.78)";
        ctx.lineWidth = 4 * dpr;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(coreX - 7 * dpr, coreY);
        ctx.lineTo(coreX - 36 * dpr, coreY - 17 * dpr);
        ctx.moveTo(coreX + 7 * dpr, coreY);
        ctx.lineTo(coreX + 36 * dpr, coreY - 17 * dpr);
        ctx.stroke();
        ctx.fillStyle = "rgba(95,70,58,.92)";
        ctx.beginPath();
        ctx.ellipse(coreX, coreY, 12 * dpr, 16 * dpr, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = pulse;
        ctx.shadowBlur = 18 * dpr;
        ctx.shadowColor = "rgba(255,226,128,.85)";
        ctx.strokeStyle = "rgba(255,237,177,.95)";
        ctx.lineWidth = 1.6 * dpr;
        ctx.beginPath();
        ctx.arc(coreX, coreY, 10 * dpr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,235,161,.95)";
        ctx.beginPath();
        ctx.arc(coreX, coreY, 3.4 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Progress is gameplay information here, not a narrative turn counter.
    ctx.save();
    ctx.globalAlpha = .68;
    ctx.fillStyle = "rgba(233,246,250,.86)";
    ctx.font = `${10 * dpr}px system-ui`;
    ctx.fillText(`ASCENT  ${Math.min(this.highestFloorReached ?? 0, target)} / ${target}`, 14 * dpr, 21 * dpr);
    ctx.restore();
  }

  drawPlatformPlayer(now) {
    this.drawDodgePlayer(now);
  }

  drawEffects() {
    const ctx = this.ctx, dpr = this.dpr;
    for (const effect of this.effects) {
      const t = effect.age / effect.life;
      const drawY = effect.worldSpace && this.mode === "platform" ? this.platformScreenY(effect.worldY) : effect.y;
      if (effect.type === "allyCrossfire") {
        const a=Math.sin(Math.PI*Math.min(1,t));
        ctx.save();ctx.globalAlpha=Math.max(0,a);ctx.lineCap="round";
        const colors=["rgba(169,222,255,.95)","rgba(255,224,171,.9)","rgba(188,255,226,.88)"];
        for(let i=-1;i<=1;i++){ctx.strokeStyle=colors[i+1];ctx.lineWidth=(i===0?3.2:1.8)*dpr;ctx.shadowBlur=16*dpr;ctx.shadowColor=colors[i+1];ctx.beginPath();ctx.moveTo(-20*dpr,effect.y+i*13*dpr);ctx.lineTo(this.canvas.width+20*dpr,effect.y-i*9*dpr);ctx.stroke();}
        ctx.fillStyle="rgba(235,250,255,.92)";ctx.font=`${Math.round(9*dpr)}px sans-serif`;ctx.textAlign="center";ctx.fillText("SUPPORT FIRE",this.canvas.width/2,effect.y-22*dpr);
        ctx.restore();continue;
      }

      if (["memoryPickup","memoryDeliver","memoryDrop","allyLink","allyShield","futureMark","futurePing","timeStop","timeResume","futureAnchor"].includes(effect.type)) {
        ctx.save();ctx.globalAlpha=1-t;
        const bad=effect.type==="memoryDrop";
        const future=["futureMark","futurePing","timeResume","futureAnchor"].includes(effect.type);
        const ally=["allyLink","allyShield"].includes(effect.type);
        ctx.strokeStyle=bad?"rgba(196,101,215,.9)":future?"rgba(161,231,255,.98)":ally?"rgba(255,237,178,.96)":"rgba(223,244,255,.96)";
        ctx.lineWidth=(effect.type==="memoryDeliver"||effect.type==="futureAnchor"?2.2:1.5)*this.dpr;
        ctx.shadowBlur=12*this.dpr;ctx.shadowColor=ctx.strokeStyle;
        ctx.beginPath();ctx.arc(effect.x,drawY,effect.radius*(.55+t*1.45),0,Math.PI*2);ctx.stroke();
        if(effect.label){ctx.fillStyle=ctx.strokeStyle;ctx.font=`${Math.round(9*this.dpr)}px sans-serif`;ctx.textAlign="center";ctx.fillText(effect.label,effect.x,drawY-20*this.dpr-t*7*this.dpr);}
        ctx.restore();continue;
      }

      if (["gingaStomp","gingaGround","gingaConduct","gingaAbsorb"].includes(effect.type)) {
        ctx.save();ctx.globalAlpha=1-t;
        const ground=["gingaStomp","gingaGround"].includes(effect.type);
        ctx.strokeStyle=ground?"rgba(245,180,100,.96)":"rgba(255,235,111,.98)";
        ctx.lineWidth=(ground?2:1.6)*this.dpr;ctx.shadowBlur=10*this.dpr;ctx.shadowColor=ground?"rgba(235,105,58,.45)":"rgba(255,220,65,.65)";
        ctx.beginPath();ctx.arc(effect.x,drawY,effect.radius*(.55+t*1.35),0,Math.PI*2);ctx.stroke();
        if (effect.type === "gingaGround" || effect.type === "gingaAbsorb") { ctx.fillStyle="rgba(255,242,181,.96)";ctx.font=`${Math.round(10*this.dpr)}px sans-serif`;ctx.textAlign="center";ctx.fillText(effect.type === "gingaGround" ? (effect.perfect?"GROUND!":"GROUND") : (effect.perfect?"PERFECT CONDUCT":"CONDUCT"),effect.x,drawY-20*this.dpr-t*8*this.dpr); }
        ctx.restore();continue;
      }

      if (["mirrorScan","mirrorVerify","mirrorFalse","freezePulse","freezeBreak","fiveFrost"].includes(effect.type)) {
        ctx.save();ctx.globalAlpha=1-t;const good=["mirrorVerify","freezeBreak"].includes(effect.type),bad=effect.type==="mirrorFalse";ctx.strokeStyle=bad?"rgba(235,74,94,.96)":good?"rgba(222,244,255,.98)":"rgba(174,219,246,.9)";ctx.lineWidth=(good?2:1.4)*this.dpr;ctx.beginPath();ctx.arc(effect.x,drawY,effect.radius*(.55+t*1.35),0,Math.PI*2);ctx.stroke();if(effect.label){ctx.fillStyle=bad?"rgba(255,154,166,.96)":"rgba(235,249,255,.96)";ctx.font=`${Math.round(10*this.dpr)}px sans-serif`;ctx.textAlign="center";ctx.fillText(effect.label,effect.x,drawY-20*this.dpr-t*7*this.dpr);}ctx.restore();continue;
      }

      if (["cosmosLunaPulse","cosmosPurifyPulse","cosmosCoronaBurst","cosmosEclipseCut","cosmosEclipseBreak","cosmosEyesShot","cosmosMonsterCall","cosmosHeartTurn","cosmosHeartCollect"].includes(effect.type)) {
        ctx.save();ctx.globalAlpha=1-t;const luna=effect.type.includes("Luna")||effect.type.includes("Purify")||effect.type==="cosmosHeartTurn",corona=effect.type.includes("Corona"),eyes=effect.type==="cosmosEyesShot",monster=effect.type==="cosmosMonsterCall";ctx.strokeStyle=corona?"rgba(255,103,72,.98)":eyes?"rgba(255,244,176,.98)":monster?"rgba(176,246,197,.96)":"rgba(170,235,255,.98)";ctx.lineWidth=(corona?2.7:monster?2.2:1.8)*dpr;ctx.shadowBlur=18*dpr;ctx.shadowColor=ctx.strokeStyle;ctx.beginPath();ctx.arc(effect.x,drawY,(effect.radius??30*dpr)*(.45+t*1.1),0,Math.PI*2);ctx.stroke();if(effect.type==="cosmosEclipseCut"){ctx.beginPath();ctx.moveTo(effect.x-effect.radius*.55,drawY+effect.radius*.35);ctx.lineTo(effect.x+effect.radius*.6,drawY-effect.radius*.4);ctx.stroke()}if(monster){ctx.globalAlpha=(1-t)*.7;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(effect.x,drawY,(effect.radius??90*dpr)*(.2+t*.55+i*.18),Math.PI*1.08,Math.PI*1.92);ctx.stroke()}}if(effect.label){ctx.fillStyle="#fff";ctx.font=`${Math.round(10*dpr)}px sans-serif`;ctx.textAlign="center";ctx.fillText(effect.label,effect.x,drawY-22*dpr)}ctx.restore();continue;
      }

      if (effect.type === "grandZeroGravity") {
        ctx.save();
        const pulse=Math.sin(Math.PI*Math.min(1,t));
        ctx.globalAlpha=.18+pulse*.22;
        ctx.strokeStyle="rgba(255,189,116,.78)";
        ctx.lineWidth=1.2*dpr;
        ctx.setLineDash([8*dpr,9*dpr]);
        for(let y=18*dpr;y<this.canvas.height;y+=34*dpr){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(this.canvas.width,y-10*dpr*pulse);ctx.stroke();}
        ctx.setLineDash([]);ctx.globalAlpha=.08+pulse*.12;ctx.fillStyle="rgba(255,224,178,.35)";ctx.fillRect(0,0,this.canvas.width,this.canvas.height);ctx.restore();continue;
      }

      if (["originalDash","originalShot","originalParry","originalParryHit","originalBreak","originalAnchor","originalPulse","originalUltimate","originalGuard"].includes(effect.type)) {
        ctx.save();ctx.globalAlpha=1-t;
        const ultimate=effect.type==="originalUltimate", hit=effect.type==="originalParryHit", anchor=effect.type==="originalAnchor";
        ctx.strokeStyle=ultimate?"rgba(255,231,142,.98)":anchor?"rgba(146,240,255,.98)":hit?"rgba(255,190,116,.98)":"rgba(196,235,255,.96)";
        ctx.lineWidth=(ultimate?3:hit?2.4:1.6)*dpr;ctx.shadowBlur=18*dpr;ctx.shadowColor=ctx.strokeStyle;
        ctx.beginPath();ctx.arc(effect.x,drawY,(effect.radius??30*dpr)*(.45+t*1.1),0,Math.PI*2);ctx.stroke();
        if(effect.type==="originalDash"){ctx.beginPath();ctx.moveTo(effect.x-50*dpr,drawY);ctx.lineTo(effect.x+16*dpr,drawY);ctx.stroke();}
        if(effect.label){ctx.fillStyle="#fff";ctx.font=`${Math.round(10*dpr)}px sans-serif`;ctx.textAlign="center";ctx.fillText(effect.label,effect.x,drawY-22*dpr);}
        ctx.restore();continue;
      }

      if (["nexusShot","nexusPulse","nexusParry","nexusParryHit","nexusBreak","noaPulse","noaReturn"].includes(effect.type)) {
        ctx.save();ctx.globalAlpha=1-t;
        const noa=["noaPulse","noaReturn"].includes(effect.type),bad=false;
        ctx.strokeStyle=noa?"rgba(242,249,255,.98)":"rgba(158,226,255,.96)";
        ctx.lineWidth=(effect.type==="nexusParryHit"||effect.type==="noaReturn"?2.2:1.4)*this.dpr;
        ctx.shadowBlur=14*this.dpr;ctx.shadowColor=noa?"rgba(216,239,255,.86)":"rgba(92,198,255,.72)";
        ctx.beginPath();ctx.arc(effect.x,drawY,(effect.radius??18*this.dpr)*(.55+t*1.25),0,Math.PI*2);ctx.stroke();
        if(effect.label){ctx.fillStyle=noa?"rgba(255,255,255,.98)":"rgba(218,246,255,.96)";ctx.font=`${Math.round(10*this.dpr)}px sans-serif`;ctx.textAlign="center";ctx.fillText(effect.label,effect.x,drawY-20*this.dpr-t*7*this.dpr)}
        ctx.restore();continue;
      }

      if (effect.type === "nexusSlash" || effect.type === "nexusSever" || effect.type === "nexusFeed") {
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = effect.type === "nexusFeed" ? "rgba(255,132,83,.88)" : "rgba(195,235,243,.96)";
        ctx.lineWidth = effect.type === "nexusSlash" ? 1.2 * this.dpr : 2 * this.dpr;
        ctx.beginPath(); ctx.arc(effect.x, drawY, effect.radius * (.55 + t * 1.45), 0, Math.PI * 2); ctx.stroke();
        if (effect.type === "nexusSever") {
          ctx.fillStyle = "rgba(218,246,250,.92)";
          ctx.font = `${Math.round(10 * this.dpr)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("SEVER", effect.x, drawY - 18 * this.dpr - t * 8 * this.dpr);
        }
        ctx.restore();
        continue;
      }

      if (effect.type === "pressureMantle" || effect.type === "pressureReflect") {
        const t=clamp(effect.age/effect.life,0,1);ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle=effect.type==="pressureReflect"?"rgba(242,247,255,.96)":"rgba(213,229,242,.86)";ctx.lineWidth=(2.4-t)*dpr;ctx.shadowBlur=15*dpr;ctx.shadowColor="rgba(200,220,244,.72)";ctx.beginPath();ctx.arc(effect.x,effect.y,(effect.radius??40*dpr)*(0.45+t*.85),Math.PI*.1,Math.PI*1.9);ctx.stroke();if(effect.label){ctx.fillStyle="rgba(248,252,255,.95)";ctx.font=`${Math.round(9*dpr)}px sans-serif`;ctx.textAlign="center";ctx.fillText(effect.label,effect.x,effect.y-28*dpr)}ctx.restore();continue;
      }
      if (effect.type === "hornCounter") {
        const t=clamp(effect.age/effect.life,0,1);ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle="rgba(255,215,173,.95)";ctx.lineWidth=2*dpr;ctx.shadowBlur=13*dpr;ctx.shadowColor="rgba(255,94,48,.62)";ctx.beginPath();ctx.moveTo(effect.x-24*dpr*(1+t),effect.y+18*dpr);ctx.lineTo(effect.x+26*dpr*(1+t),effect.y-18*dpr);ctx.stroke();ctx.fillStyle="rgba(255,238,216,.96)";ctx.font=`${Math.round(9*dpr)}px sans-serif`;ctx.textAlign="center";ctx.fillText(effect.label??"COUNTER",effect.x,effect.y-26*dpr);ctx.restore();continue;
      }
      if (effect.type === "greezaRainMuzzle") {
        ctx.save();ctx.globalAlpha=1-t;ctx.translate(effect.x,drawY);ctx.strokeStyle="rgba(224,169,255,.96)";ctx.lineWidth=2*dpr;ctx.shadowBlur=17*dpr;ctx.shadowColor="rgba(189,79,246,.82)";for(let i=0;i<6;i++){const a=Math.PI*.2+Math.PI*.6*(i/5);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*effect.radius*(.8+t*.5),Math.sin(a)*effect.radius*(.8+t*.5));ctx.stroke()}ctx.restore();continue;
      }
      if (effect.type === "counter") {
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = "rgba(255,232,159,.96)";
        ctx.lineWidth = 1.8 * this.dpr;
        ctx.beginPath(); ctx.arc(effect.x, drawY, effect.radius * (.7 + t * 1.25), 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "rgba(255,241,190,.96)";
        ctx.font = `${Math.round(11 * this.dpr)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(effect.label ?? "COUNTER", effect.x, drawY - 22 * this.dpr - t * 8 * this.dpr);
        ctx.restore();
        continue;
      }

      ctx.save(); ctx.globalAlpha = 1 - t;
      ctx.strokeStyle = effect.type === "goal"
        ? "rgba(190,255,212,.98)"
        : effect.type === "purify"
          ? "rgba(186,246,255,.98)"
          : effect.type === "chaosReach"
            ? "rgba(213,114,231,.92)"
            : "rgba(255,255,255,.96)";
      ctx.lineWidth = effect.type === "goal" || effect.type === "purify" ? 2.2 * this.dpr : 1.6 * this.dpr;
      ctx.beginPath(); ctx.arc(effect.x, drawY, effect.radius * (.6 + t * (effect.type === "goal" ? 2.2 : 1.45)), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }

  draw(now) {
    this.clear();
    this.drawArenaBackground(now);
    if (this.mode === "platform") this.drawPlatforms(now);
    for (const bullet of this.bullets) this.drawBullet(bullet);
    this.drawEffects();
    if (this.mode === "memory" && this.memoryCarrying) {
      const ctx=this.ctx,dpr=this.dpr;ctx.save();ctx.strokeStyle="rgba(224,246,255,.9)";ctx.lineWidth=1.4*dpr;ctx.shadowBlur=10*dpr;ctx.shadowColor="rgba(150,218,255,.7)";ctx.beginPath();ctx.arc(this.player.x,this.player.y,13*dpr,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    if (this.mode === "stasis" && this.stasisActive && this.bossPhase >= 1 && this.futureSpark) {
      this.drawDodgePlayer(now);
      const ctx=this.ctx,dpr=this.dpr;ctx.save();ctx.translate(this.futureSpark.x,this.futureSpark.y);ctx.rotate(Math.PI/4);ctx.fillStyle="rgba(180,239,255,.95)";ctx.shadowBlur=18*dpr;ctx.shadowColor="rgba(105,213,255,.88)";ctx.fillRect(-6*dpr,-6*dpr,12*dpr,12*dpr);ctx.restore();
    } else if (this.mode === "guard") this.drawGuardPlayer(now);
    else if (this.mode === "platform") this.drawPlatformPlayer(now);
    else this.drawDodgePlayer(now);
  }
}
