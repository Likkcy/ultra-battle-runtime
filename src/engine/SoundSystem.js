export class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.finaleTimer = null;
    this.finaleStep = 0;
    this.tigaFinaleTimer = null;
    this.tigaFinaleStep = 0;

    // Long-form soundtrack assets supplied for the Tiga route.
    // Volumes are deliberately conservative because the masters are loud.
    this.musicDefs = {
      tiga_glitter_transform: { url: new URL("../../assets/audio/tiga_glitter_transform.ogg", import.meta.url).href, volume: .55, loop: false },
      tiga_glitter_battle: { url: new URL("../../assets/audio/tiga_glitter_battle.mp3", import.meta.url).href, volume: .24, loop: true },
      gatanothor_phase12: { url: new URL("../../assets/audio/gatanothor_phase12.mp3", import.meta.url).href, volume: .16, loop: true },
      kyrieloid_battle: { url: new URL("../../assets/audio/kyrieloid_battle.mp3", import.meta.url).href, volume: .14, loop: true },
      golza_battle: { url: new URL("../../assets/audio/golza_battle.mp3", import.meta.url).href, volume: .22, loop: true },
      leo_giras_battle: { url: new URL("../../assets/audio/leo_giras_battle.mp3", import.meta.url).href, volume: .20, loop: true },
      leo_pressure_battle: { url: new URL("../../assets/audio/leo_pressure_battle.ogg", import.meta.url).href, volume: .18, loop: true },
      leo_black_end_battle: { url: new URL("../../assets/audio/leo_black_end_battle.mp3", import.meta.url).href, volume: .14, loop: true },
      leo_departure_ending: { url: new URL("../../assets/audio/leo_departure_ending.mp3", import.meta.url).href, volume: .28, loop: false },
      // Ginga route soundtrack pack supplied for the route rebuild.  Volumes are intentionally conservative.
      ginga_darambia_battle: { url: new URL("../../assets/audio/ginga_darambia_battle.ogg", import.meta.url).href, volume: .18, loop: true },
      ginga_grand_king_battle: { url: new URL("../../assets/audio/ginga_grand_king_battle.ogg", import.meta.url).href, volume: .16, loop: true },
      ginga_misuzu_dialogue: { url: new URL("../../assets/audio/ginga_misuzu_dialogue.ogg", import.meta.url).href, volume: .25, loop: true },
      ginga_grand_king_release: { url: new URL("../../assets/audio/ginga_grand_king_release.ogg", import.meta.url).href, volume: .15, loop: true },
      ginga_lugiel_battle: { url: new URL("../../assets/audio/ginga_lugiel_battle.ogg", import.meta.url).href, volume: .20, loop: true },
      ginga_lugiel_despair: { url: new URL("../../assets/audio/ginga_lugiel_despair.ogg", import.meta.url).href, volume: .20, loop: true },
      ginga_lugiel_friends: { url: new URL("../../assets/audio/ginga_lugiel_friends.ogg", import.meta.url).href, volume: .14, loop: true },
      ginga_lugiel_transform: { url: new URL("../../assets/audio/ginga_lugiel_transform.ogg", import.meta.url).href, volume: .15, loop: true },
      ginga_lugiel_final_battle: { url: new URL("../../assets/audio/ginga_lugiel_final_battle.mp3", import.meta.url).href, volume: .12, loop: true },
      // Nexus route soundtrack pack. Himeya phase-one battle uses its own pre-defeat track; the later 1 HP revival keeps Track 1.
      nexus_himeya_phase1: { url: new URL("../../assets/audio/nexus_himeya_phase1.ogg", import.meta.url).href, volume: .20, loop: true },
      nexus_himeya_red: { url: new URL("../../assets/audio/nexus_himeya_red.mp3", import.meta.url).href, volume: .135, loop: true },
      nexus_ren_blue: { url: new URL("../../assets/audio/nexus_ren_blue.mp3", import.meta.url).href, volume: .112, loop: true },
      nexus_memory_prebattle: { url: new URL("../../assets/audio/nexus_memory_prebattle.ogg", import.meta.url).href, volume: .18, loop: true },
      nexus_bond_memories: { url: new URL("../../assets/audio/nexus_bond_memories.ogg", import.meta.url).href, volume: .21, loop: true },
      nexus_zagi_phase1: { url: new URL("../../assets/audio/nexus_zagi_phase1.ogg", import.meta.url).href, volume: .17, loop: true },
      nexus_noa_final: { url: new URL("../../assets/audio/nexus_noa_final.ogg", import.meta.url).href, volume: .155, loop: true },
      // Cosmos route soundtrack pack supplied for the three-battle route.
      cosmos_lidorias_battle: { url: new URL("../../assets/audio/cosmos_lidorias_battle.ogg", import.meta.url).href, volume: .18, loop: true },
      cosmos_chaos_ultraman: { url: new URL("../../assets/audio/cosmos_chaos_ultraman.ogg", import.meta.url).href, volume: .16, loop: true },
      cosmos_darkness_battle: { url: new URL("../../assets/audio/cosmos_darkness_battle.ogg", import.meta.url).href, volume: .20, loop: true },
      cosmos_realization: { url: new URL("../../assets/audio/cosmos_realization.ogg", import.meta.url).href, volume: .16, loop: false },
      cosmos_miracle_final: { url: new URL("../../assets/audio/cosmos_miracle_final.mp3", import.meta.url).href, volume: .15, loop: true },
      // Original route soundtrack. Each monster owns one continuous track across its
      // internal form changes; transformations do not restart playback.
      original_zetton_battle: { url: new URL("../../assets/audio/original_zetton_battle.ogg", import.meta.url).href, volume: .17, loop: true },
      original_greeza_battle: { url: new URL("../../assets/audio/original_greeza_battle.ogg", import.meta.url).href, volume: .17, loop: true },
      original_grand_king_battle: { url: new URL("../../assets/audio/original_grand_king_battle.ogg", import.meta.url).href, volume: .17, loop: true },
      original_five_king_battle: { url: new URL("../../assets/audio/original_five_king_battle.ogg", import.meta.url).href, volume: .17, loop: true },
      original_belial_battle: { url: new URL("../../assets/audio/original_belial_battle.ogg", import.meta.url).href, volume: .17, loop: true }
    };
    this.musicBuffers = new Map();
    this.currentMusic = null;
    this.musicGeneration = 0;
    this.oneShotSources = new Set();
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopFinalePulse();
      this.stopTigaFinalePulse();
      this.stopMusic(0);
      this.stopAssetOneShots();
    }
  }
  async ensure() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") { try { await this.ctx.resume(); } catch {} }
    return this.ctx;
  }

  async loadMusicBuffer(key) {
    const def = this.musicDefs[key];
    if (!def) return null;
    if (this.musicBuffers.has(key)) return this.musicBuffers.get(key);
    const ctx = await this.ensure();
    if (!ctx) return null;
    try {
      const response = await fetch(def.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.arrayBuffer();
      const buffer = await ctx.decodeAudioData(data.slice(0));
      this.musicBuffers.set(key, buffer);
      return buffer;
    } catch (error) {
      console.warn(`[UBR audio] Failed to load ${key}`, error);
      return null;
    }
  }

  async playMusic(key, options = {}) {
    if (!this.enabled) return false;
    const def = this.musicDefs[key];
    if (!def) return false;
    const generation = ++this.musicGeneration;
    const ctx = await this.ensure();
    const buffer = await this.loadMusicBuffer(key);
    if (!ctx || !buffer || generation !== this.musicGeneration || !this.enabled) return false;

    const fadeOutMs = Math.max(0, options.fadeOutMs ?? 700);
    if (this.currentMusic) this.stopMusic(fadeOutMs, false);

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const target = Math.max(.0001, options.volume ?? def.volume ?? .2);
    const delayMs = Math.max(0, options.delayMs ?? 0);
    const fadeInMs = Math.max(0, options.fadeInMs ?? 900);
    const startAt = ctx.currentTime + delayMs / 1000;

    source.buffer = buffer;
    source.loop = options.loop ?? def.loop ?? true;
    source.connect(gain).connect(ctx.destination);
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(.0001, ctx.currentTime);
    gain.gain.setValueAtTime(.0001, startAt);
    if (fadeInMs > 0) gain.gain.exponentialRampToValueAtTime(target, startAt + fadeInMs / 1000);
    else gain.gain.setValueAtTime(target, startAt);

    const entry = { key, source, gain, target, generation };
    this.currentMusic = entry;
    source.onended = () => {
      if (this.currentMusic === entry) this.currentMusic = null;
    };
    try {
      source.start(startAt);
      return true;
    } catch (error) {
      console.warn(`[UBR audio] Failed to start ${key}`, error);
      if (this.currentMusic === entry) this.currentMusic = null;
      return false;
    }
  }

  stopMusic(fadeMs = 650, invalidate = true) {
    if (invalidate) this.musicGeneration += 1;
    const entry = this.currentMusic;
    if (!entry) return;
    this.currentMusic = null;
    const ctx = this.ctx;
    if (!ctx) {
      try { entry.source.stop(); } catch {}
      return;
    }
    const now = ctx.currentTime;
    const fade = Math.max(0, fadeMs) / 1000;
    try {
      entry.gain.gain.cancelScheduledValues(now);
      const current = Math.max(.0001, entry.gain.gain.value || entry.target || .1);
      entry.gain.gain.setValueAtTime(current, now);
      if (fade > 0) entry.gain.gain.exponentialRampToValueAtTime(.0001, now + fade);
      else entry.gain.gain.setValueAtTime(.0001, now);
      entry.source.stop(now + fade + .05);
    } catch {}
  }

  async playAssetOnce(key, options = {}) {
    if (!this.enabled) return false;
    const def = this.musicDefs[key];
    if (!def) return false;
    const ctx = await this.ensure();
    const buffer = await this.loadMusicBuffer(key);
    if (!ctx || !buffer || !this.enabled) return false;

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const volume = Math.max(.0001, options.volume ?? def.volume ?? .2);
    const delayMs = Math.max(0, options.delayMs ?? 0);
    source.buffer = buffer;
    source.loop = false;
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    this.oneShotSources.add(source);
    source.onended = () => this.oneShotSources.delete(source);
    try {
      source.start(ctx.currentTime + delayMs / 1000);
      return true;
    } catch {
      this.oneShotSources.delete(source);
      return false;
    }
  }

  stopAssetOneShots() {
    for (const source of this.oneShotSources) {
      try { source.stop(); } catch {}
    }
    this.oneShotSources.clear();
  }

  playTigaGlitterTransformation() {
    return this.playAssetOnce("tiga_glitter_transform", { volume: .55 });
  }

  playTigaGlitterBattleMusic() {
    // Start under the transformation sound, then rise gradually into the final fight.
    return this.playMusic("tiga_glitter_battle", {
      volume: .24,
      delayMs: 2800,
      fadeInMs: 7200,
      fadeOutMs: 0
    });
  }

  async tone(freq, duration = .06, type = "square", volume = .035, endFreq = null) {
    const ctx = await this.ensure(); if (!ctx) return;
    const osc = ctx.createOscillator(); const gain = ctx.createGain(); const now = ctx.currentTime;
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), now + duration);
    gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(Math.max(.0002, volume), now + .008); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain).connect(ctx.destination); osc.start(now); osc.stop(now + duration + .02);
  }
  stopFinalePulse() {
    if (this.finaleTimer) clearInterval(this.finaleTimer);
    this.finaleTimer = null;
    this.finaleStep = 0;
    this.tigaFinaleTimer = null;
    this.tigaFinaleStep = 0;
  }

  playFinaleDespair() {
    if (!this.enabled) return;
    [110, 82, 61, 46].forEach((f, i) => setTimeout(() => this.tone(f, .52, "sine", .025, Math.max(28, f * .68)), i * 150));
  }

  playExecutionLock() {
    if (!this.enabled) return;
    this.tone(74, .8, "sawtooth", .025, 38);
    setTimeout(() => this.tone(148, .42, "square", .012, 72), 180);
  }

  playExecutionHit(step = 0) {
    if (!this.enabled) return;
    const base = [118, 102, 86, 68][Math.min(3, step)] ?? 84;
    this.tone(base, .18, "sawtooth", .042, Math.max(34, base * .42));
    setTimeout(() => this.tone(base * 2.1, .08, "square", .018, base * 1.1), 28);
  }

  playExecutionCharge() {
    if (!this.enabled) return;
    [55, 62, 74, 91, 116].forEach((f, i) => setTimeout(() => this.tone(f, .62, i < 2 ? "sine" : "sawtooth", .012 + i * .0025, f * 1.18), i * 145));
  }

  playExecutionEnd() {
    if (!this.enabled) return;
    this.tone(210, .18, "sawtooth", .045, 42);
    setTimeout(() => this.tone(52, 1.15, "sine", .03, 24), 90);
  }

  playHopeSpark() {
    if (!this.enabled) return;
    [392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, .38, i < 2 ? "sine" : "triangle", .02, f * 1.015), i * 105));
  }

  playTaroSupport() {
    if (!this.enabled) return;
    [196, 294, 392, 587, 784].forEach((f, i) => setTimeout(() => this.tone(f, .48, i % 2 ? "triangle" : "sawtooth", .022, f * 1.04), i * 88));
  }


  playGingaSparkOverload() {
    if (!this.enabled) return;
    [262,330,392,494,587,698,784,988,1175].forEach((f,i)=>setTimeout(()=>this.tone(f,.6,i%3===0?"sine":"triangle",.009+i*.001,f*1.028),i*88));
    setTimeout(()=>this.tone(110,.95,"sine",.022,164),420);
  }

  playGingaRainbowBreak() {
    if (!this.enabled) return;
    this.tone(72,.55,"sawtooth",.035,185);
    [330,494,659,880,1175,1568].forEach((f,i)=>setTimeout(()=>this.tone(f,.42,"triangle",.013,f*1.06),90+i*52));
    setTimeout(()=>this.tone(196,.7,"sine",.025,392),260);
  }

  startFinalePulse() {
    if (!this.enabled || this.finaleTimer) return;
    const melody = [392, 494, 587, 659, 587, 494, 440, 523, 659, 784, 659, 587];
    const bass = [98, 98, 110, 123, 98, 110];
    const tick = () => {
      if (!this.enabled) return;
      const i = this.finaleStep++;
      const top = melody[i % melody.length];
      const low = bass[Math.floor(i / 2) % bass.length];
      this.tone(low, .48, "sine", .008, low * 1.01);
      this.tone(top, .22, "triangle", .009, top * 1.018);
      if (i % 4 === 3) this.tone(top * 2, .12, "sine", .0045, top * 2.02);
    };
    tick();
    this.finaleTimer = setInterval(tick, 430);
  }


  playCosmosPulse(kind="luna") {
    if(!this.enabled)return;
    const root=kind==="corona"?196:kind==="eclipse"?330:kind==="miracle"?440:294;
    [1,1.5,2].forEach((m,k)=>setTimeout(()=>this.tone(root*m,.26,k?"triangle":"sine",.008+k*.002,root*m*1.02),k*65));
  }
  playNexusCrushHit(level = 0) {
    if (!this.enabled) return;
    const roots = [142, 112, 88];
    const f = roots[Math.max(0, Math.min(2, level))];
    this.tone(f, .24 + level * .08, "sawtooth", .028 + level * .006, f * .42);
    setTimeout(() => this.tone(380 - level * 70, .08, "square", .012, 120), 45);
  }

  playNexusIntercept() {
    if (!this.enabled) return;
    this.tone(96, .42, "sawtooth", .025, 54);
    setTimeout(() => this.tone(440, .17, "triangle", .018, 690), 80);
    setTimeout(() => this.tone(620, .14, "sine", .012, 760), 155);
  }

  playNexusMemoryReveal(kind = "white") {
    if (!this.enabled) return;
    const root = kind === "red" ? 196 : kind === "blue" ? 247 : kind === "white" ? 330 : 294;
    this.tone(root, .82, "sine", .009, root * 1.035);
    setTimeout(() => this.tone(root * 1.5, .46, "triangle", .008, root * 1.58), 180);
    setTimeout(() => this.tone(root * 2, .22, "sine", .005, root * 2.04), 420);
  }

  playNexusRibbonSurge(kind = "white") {
    if (!this.enabled) return;
    const root = kind === "red" ? 220 : kind === "blue" ? 277 : 330;
    [1,1.25,1.5,2,2.5].forEach((r, i) => setTimeout(() => this.tone(root * r, .38, i < 2 ? "sine" : "triangle", .008 + i * .0015, root * r * 1.028), i * 90));
  }

  playNexusFinalClash(step = "clash") {
    if (!this.enabled) return;
    if (step === "rise") {
      this.tone(74, 1.0, "sine", .018, 98);
      [220,330,440].forEach((f,i)=>setTimeout(()=>this.tone(f,.42,"triangle",.008,f*1.03),180+i*120));
      return;
    }
    if (step === "break") {
      this.tone(61, 1.15, "sawtooth", .027, 35);
      [392,523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>this.tone(f,.46,i<2?"sine":"triangle",.012,f*1.03),i*72));
      return;
    }
    this.tone(82, .9, "sawtooth", .025, 48);
    [196,247,330,392,494,659,784].forEach((f,i)=>setTimeout(()=>this.tone(f,.36,i%2?"triangle":"sine",.009,f*1.022),i*85));
  }

  playNexusBondThread(kind = "white") {
    if (!this.enabled) return;
    const root = kind === "red" ? 330 : kind === "blue" ? 392 : kind === "silver" ? 494 : 440;
    [root, root * 1.25, root * 1.5].forEach((f, i) => setTimeout(() => this.tone(f, .34, i ? "triangle" : "sine", .009 + i * .002, f * 1.012), i * 125));
  }

  playNexusBondWeave() {
    if (!this.enabled) return;
    const notes = [262,330,392,494,587,659,784,988];
    notes.forEach((f, i) => setTimeout(() => this.tone(f, .52, i % 3 ? "triangle" : "sine", .009 + i * .0011, f * 1.018), i * 92));
    setTimeout(() => this.tone(131, 1.0, "sine", .018, 196), 310);
  }

  playNexusGravityZagi() {
    if (!this.enabled) return;
    this.tone(72, 1.05, "sawtooth", .032, 41);
    [118,104,91].forEach((f, i) => setTimeout(() => this.tone(f, .55, "square", .012, f * .7), 110 + i * 110));
  }

  playNexusNoaAwaken() {
    if (!this.enabled) return;
    [196,262,330,392,523,659,784,1047,1319].forEach((f, i) => setTimeout(() => this.tone(f, .65, i < 3 ? "sine" : "triangle", .012 + i * .0012, f * 1.025), i * 90));
    setTimeout(() => this.tone(98, 1.15, "sine", .022, 147), 380);
  }

  playTigaQuake() {
    if (!this.enabled) return;
    this.tone(58, .9, "sine", .028, 42);
    setTimeout(() => this.tone(87, .32, "sawtooth", .012, 53), 170);
  }

  playTigaGate() {
    if (!this.enabled) return;
    [92, 117, 146].forEach((f, i) => setTimeout(() => this.tone(f, .68, "sawtooth", .015, f * 1.15), i * 130));
  }

  playTigaGateBreak() {
    if (!this.enabled) return;
    this.tone(420, .09, "triangle", .024, 780);
    setTimeout(() => this.tone(156, .24, "sawtooth", .026, 68), 55);
  }

  playTigaAbyss() {
    if (!this.enabled) return;
    [64, 51, 43].forEach((f, i) => setTimeout(() => this.tone(f, .9, "sine", .022, f * .72), i * 210));
  }

  playTigaPetrify() {
    if (!this.enabled) return;
    [480, 390, 312, 248].forEach((f, i) => setTimeout(() => this.tone(f, .52, i < 2 ? "triangle" : "sine", .014, f * .62), i * 110));
  }

  playTigaStone() {
    if (!this.enabled) return;
    this.tone(94, .72, "sawtooth", .03, 39);
    setTimeout(() => this.tone(47, .95, "sine", .026, 28), 170);
  }

  playTigaRescue() {
    if (!this.enabled) return;
    [262, 330, 392, 523].forEach((f, i) => setTimeout(() => this.tone(f, .38, "sine", .011, f * 1.01), i * 130));
  }

  playTigaRescueBreak() {
    if (!this.enabled) return;
    this.tone(680, .08, "square", .022, 130);
    setTimeout(() => this.tone(113, .52, "sawtooth", .032, 44), 70);
  }


  playTigaPlayerLightHit(level = 0) {
    if (!this.enabled) return;
    const t = Math.max(0, Math.min(1, level));
    const freq = 280 + t * 560;
    this.tone(freq, .07, "triangle", .006 + t * .004, freq * 1.035);
    if (t > .7) this.tone(freq * 1.5, .045, "sine", .0035, freq * 1.53);
  }

  playTigaWorldAnswer(level = 0) {
    if (!this.enabled) return;
    const t = Math.max(0, Math.min(1, level));
    const root = 392 + t * 196;
    [root, root * 1.25].forEach((f, i) => setTimeout(() => this.tone(f, .24, "sine", .007 + t * .003, f * 1.015), i * 48));
  }

  playTigaLightColumn() {
    if (!this.enabled) return;
    this.tone(82, .85, "sine", .026, 126);
    [262,392,523,659,784,1047,1319].forEach((f,i) =>
      setTimeout(() => this.tone(f, .72, i < 2 ? "sine" : "triangle", .013 + i * .0015, f * 1.035), i * 62)
    );
  }

  playTigaWorldConverge() {
    if (!this.enabled) return;
    [330,392,494,587,659,784,988,1175].forEach((f,i) =>
      setTimeout(() => this.tone(f, .5, i % 3 === 0 ? "sine" : "triangle", .0095, f * 1.025), i * 52)
    );
    setTimeout(() => this.tone(110, .95, "sine", .019, 164), 180);
  }

  playTigaRevivalHeartbeat() {
    if (!this.enabled) return;
    this.tone(78, .14, "sine", .036, 62);
    setTimeout(() => this.tone(156, .08, "triangle", .012, 132), 45);
  }

  playTigaLightRise(level = 0) {
    if (!this.enabled) return;
    const roots = [[330,440,523],[392,523,659],[440,587,784]][Math.max(0,Math.min(2,level))];
    roots.forEach((f,i)=>setTimeout(()=>this.tone(f,.46,i===0?"sine":"triangle",.015+i*.002,f*1.012),i*135));
  }

  playTigaGlitterRise() {
    if (!this.enabled) return;
    [262,392,523,659,784,1047].forEach((f,i)=>setTimeout(()=>this.tone(f,.62,i%2?"triangle":"sine",.018,f*1.02),i*115));
  }

  stopTigaFinalePulse() {
    if (this.tigaFinaleTimer) clearInterval(this.tigaFinaleTimer);
    this.tigaFinaleTimer = null;
    this.tigaFinaleStep = 0;
  }

  startTigaFinalePulse() {
    if (!this.enabled || this.tigaFinaleTimer) return;
    const melody = [523,659,784,880,784,659,587,698,880,1047,880,784];
    const bass = [131,147,165,131,147,196];
    const tick = () => {
      if (!this.enabled) return;
      const i = this.tigaFinaleStep++;
      const top = melody[i % melody.length];
      const low = bass[Math.floor(i / 2) % bass.length];
      this.tone(low,.48,"sine",.0075,low*1.01);
      this.tone(top,.27,"triangle",.0095,top*1.015);
      if (i % 3 === 2) this.tone(top*1.5,.13,"sine",.0045,top*1.51);
    };
    tick();
    this.tigaFinaleTimer = setInterval(tick, 455);
  }

  playTigaFinalStrike() {
    if (!this.enabled) return;
    [196,294,392,587,784,1175].forEach((f,i)=>setTimeout(()=>this.tone(f,.48,i<2?"sine":"triangle",.017+i*.0015,f*1.03),i*85));
    setTimeout(()=>this.tone(82,.95,"sawtooth",.035,34),430);
  }

  play(name) {
    if (!this.enabled) return;
    if (name === "select") this.tone(330, .035, "square", .018, 390);
    if (name === "confirm") this.tone(520, .055, "square", .024, 760);
    if (name === "hit") { this.tone(130, .09, "sawtooth", .035, 65); setTimeout(() => this.tone(260, .045, "square", .018), 35); }
    if (name === "hurt") this.tone(170, .12, "sawtooth", .04, 70);
    if (name === "guard") this.tone(720, .05, "triangle", .025, 1100);
    if (name === "purify") { this.tone(620, .08, "sine", .02, 980); setTimeout(() => this.tone(930, .07, "triangle", .014, 1250), 45); }
    if (name === "mercy") { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, .32, "sine", .019), i * 105)); }
    if (name === "phase") { this.tone(120, .35, "sine", .028, 260); setTimeout(() => this.tone(280, .28, "triangle", .02, 520), 120); }
    if (name === "victory") [392, 523, 659].forEach((f, i) => setTimeout(() => this.tone(f, .22, "triangle", .022), i * 120));
    if (name === "defeat") [220, 185, 147].forEach((f, i) => setTimeout(() => this.tone(f, .28, "sine", .022), i * 150));
  }
}
