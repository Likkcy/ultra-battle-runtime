const make = (prefix, count) => Array.from({ length: count }, (_, i) => `${prefix}_${String(i).padStart(2, "0")}.webp`);

export const KAISER_SEQUENCES = Object.freeze({
  cloakPortrait: ["cloak_portrait_00.webp"],
  noCloakPortrait: ["nocloak_portrait_00.webp"],
  arcPortrait: ["arc_portrait_00.webp"],
  cloakIdle: make("cloak_idle", 10),
  cloakIdleAlt: make("cloak_idle_alt", 10),
  noCloakIdle: make("nocloak_idle", 10),
  noCloakIdleAggro: make("nocloak_idle_aggro", 10),
  arcIdle: make("arc_idle", 12),
  arcIdleAggro: make("arc_idle_aggro", 12),
  noCloakAction: make("nocloak_action", 8),
  tearTransition: make("tear_transition", 12),
  staffH: make("staff_h", 8),
  staffD: make("staff_d", 8),
  staffR: make("staff_r", 8),
  clawAction: make("claw_action", 10),
  beamAction: make("beam_action", 10),
  waveAction: make("wave_action", 12),
  chaseA: make("chasea", 10),
  chaseB: make("chaseb", 10),
  chaseC: make("chasec", 10),
  chaseD: make("chased", 10),
  chaseE: make("chasee", 10),
  phase2ShiftA: make("phase2shifta", 8),
  phase2ShiftB: make("phase2shiftb", 8),
  phase2ShiftC: make("phase2shiftc", 8),
  phase2ShiftD: make("phase2shiftd", 8),
  emeraldAbsorbA: make("emeraldabsorba", 8),
  emeraldAbsorbB: make("emeraldabsorbb", 8),
  emeraldAbsorbC: make("emeraldabsorbc", 8),
  whiteoutA: make("whiteouta", 8),
  whiteoutB: make("whiteoutb", 8),
  arcAttackA: make("arcattacka", 8),
  arcAttackB: make("arcattackb", 8),
  arcAttackC: make("arcattackc", 10),
  arcAttackD: make("arcattackd", 8),
  arcAttackE: make("arcattacke", 8),
  arcAttackF: make("arcattackf", 8),
  arcKick: make("arckick", 8),
  arcFinalA: make("arcfinala", 4),
  arcFinalB: make("arcfinalb", 4),
  arcFinalC: make("arcfinalc", 6),
  lightningA: make("lightninga", 8),
  lightningB: make("lightningb", 8),
  lightningBigA: make("lightningbiga", 8),
  lightningBigB: make("lightningbigb", 8),
  slashOrangeH: make("slashorangeh", 6),
  slashBlueH: make("slashblueh", 6),
  slashOrangeD: make("slashoranged", 6),
  slashBlueD: make("slashblued", 6),
  slashOrangeR: make("slashoranger", 6),
  slashBlueR: make("slashbluer", 6),
  eyeOrange: make("eye_orange", 4),
  eyeBlue: make("eye_blue", 4),
  clawFxA: make("clawfxa", 8),
  clawFxB: make("clawfxb", 8),
  scytheA: make("scythea", 6),
  scytheB: make("scytheb", 6),
  scytheC: make("scythec", 6),
  scytheD: make("scythed", 6),
  scytheImpact: make("scytheimpact", 6),
  meteorA: make("meteora", 8),
  meteorB: make("meteorb", 8),
  meteorC: make("meteorc", 8),
  arcProjectile: make("arcprojectile", 8),
  arcImpact: make("arcimpact", 12),
  arcScythe: make("arcscythe", 8),
  emeraldSmall: make("emeraldsmall", 8),
  emeraldMed: make("emeraldmed", 8),
  emeraldLarge: make("emeraldlarge", 8),
  emeraldImpact: make("emeraldimpact", 8),
  heartA: make("hearta", 12),
  heartB: make("heartb", 8),
  heartBreak: make("heartbreak", 10),
  heartShards: make("heartshards", 8)
});

export const kaiserAssetUrl = (file) => new URL(`../../assets/kaiser/${file}`, import.meta.url).href;
export const kaiserSequence = (key) => KAISER_SEQUENCES[key] ?? [];
export const kaiserFrameUrl = (key, index = 0) => {
  const frames = kaiserSequence(key);
  if (!frames.length) return "";
  return kaiserAssetUrl(frames[((index % frames.length) + frames.length) % frames.length]);
};

const imageCache = new Map();
export function getKaiserImage(fileOrKey, index = 0) {
  const file = KAISER_SEQUENCES[fileOrKey]
    ? KAISER_SEQUENCES[fileOrKey][((index % KAISER_SEQUENCES[fileOrKey].length) + KAISER_SEQUENCES[fileOrKey].length) % KAISER_SEQUENCES[fileOrKey].length]
    : fileOrKey;
  if (!file || typeof Image === "undefined") return null;
  const url = kaiserAssetUrl(file);
  if (!imageCache.has(url)) {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    imageCache.set(url, img);
  }
  return imageCache.get(url);
}

export function preloadKaiserSequences(keys = Object.keys(KAISER_SEQUENCES)) {
  for (const key of keys) for (let i = 0; i < (KAISER_SEQUENCES[key]?.length ?? 0); i++) getKaiserImage(key, i);
}
