const STORAGE_KEY = "ubr:light-memory-terminal:v1";

export const memoryRoutes = Object.freeze({
  tiga: { name: "迪迦世界", ultra: "迪迦奥特曼", playerId: "tiga", battles: ["golza", "kyrieloid", "gatanothor"] },
  ginga: { name: "银河世界", ultra: "银河奥特曼", playerId: "ginga", battles: ["thunder-darambia", "super-grand-king", "dark-lugiel"] },
  leo: { name: "雷欧世界", ultra: "雷欧奥特曼", playerId: "leo", battles: ["giras-brothers", "pressure", "black-end"] },
  cosmos: { name: "高斯世界", ultra: "高斯奥特曼", playerId: "cosmos", battles: ["chaos-lidorias", "chaos-ultraman", "chaos-darkness"] },
  nexus: { name: "奈克瑟斯世界", ultra: "奈克瑟斯奥特曼", playerId: "nexus", battles: ["mephisto-one", "mephisto-zwei", "dark-zagi"] }
});

export const originalTrials = Object.freeze([
  "original-zetton",
  "original-greeza",
  "original-grand-king",
  "original-five-king",
  "original-belial"
]);

function emptyState() {
  return {
    version: 1,
    completed: Object.fromEntries(Object.keys(memoryRoutes).map((route) => [route, []])),
    unlockedUltras: [],
    originalAccess: {},
    history: []
  };
}

function uniqueStrings(value) {
  return [...new Set(Array.isArray(value) ? value.map(String) : [])];
}

export function normalizeLightMemoryState(raw) {
  const state = emptyState();
  if (!raw || typeof raw !== "object") return state;
  for (const [route, meta] of Object.entries(memoryRoutes)) {
    state.completed[route] = uniqueStrings(raw.completed?.[route]).filter((id) => meta.battles.includes(id));
    if (state.completed[route].length === meta.battles.length) state.unlockedUltras.push(meta.playerId);
  }
  for (const trial of originalTrials) {
    const source = raw.originalAccess?.[trial];
    if (!source || typeof source !== "object") continue;
    state.originalAccess[trial] = {
      attempts: Math.max(0, Number(source.attempts) || 0),
      clears: Math.max(0, Number(source.clears) || 0),
      lastOutcome: String(source.lastOutcome || "")
    };
  }
  state.unlockedUltras = uniqueStrings([...state.unlockedUltras, ...uniqueStrings(raw.unlockedUltras)])
    .filter((id) => Object.values(memoryRoutes).some((route) => route.playerId === id));
  state.history = Array.isArray(raw.history) ? raw.history.slice(-80) : [];
  return state;
}

export function loadLightMemoryState() {
  try { return normalizeLightMemoryState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")); }
  catch { return emptyState(); }
}

export function saveLightMemoryState(state) {
  const normalized = normalizeLightMemoryState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function settleLightMemoryBattle(detail, context = {}) {
  const state = loadLightMemoryState();
  const route = String(detail?.route || context.route || "");
  const battleId = String(detail?.battleId || context.battleId || "");
  const outcome = String(detail?.outcome || detail?.result || "defeat");
  const success = outcome === "victory" || outcome === "mercy";
  const storyLaunch = context.storyLaunch === true || Boolean(detail?.requestId);

  if (memoryRoutes[route]?.battles.includes(battleId) && success) {
    state.completed[route] = uniqueStrings([...state.completed[route], battleId]);
    if (state.completed[route].length === memoryRoutes[route].battles.length) {
      state.unlockedUltras = uniqueStrings([...state.unlockedUltras, memoryRoutes[route].playerId]);
    }
  }

  if (route === "original" && originalTrials.includes(battleId) && storyLaunch) {
    const previous = state.originalAccess[battleId] || { attempts: 0, clears: 0, lastOutcome: "" };
    state.originalAccess[battleId] = {
      attempts: previous.attempts + 1,
      clears: previous.clears + (success ? 1 : 0),
      lastOutcome: outcome
    };
  }

  state.history.push({
    at: new Date().toISOString(), route, battleId, outcome,
    playerId: String(context.playerId || ""),
    turns: Math.max(0, Number(detail?.turns) || 0),
    storyLaunch
  });
  state.history = state.history.slice(-80);
  return saveLightMemoryState(state);
}

export function exportLightMemoryState() {
  return JSON.stringify(loadLightMemoryState(), null, 2);
}

export function importLightMemoryState(text) {
  return saveLightMemoryState(JSON.parse(text));
}
