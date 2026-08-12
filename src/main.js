import { BattleRuntime } from "./engine/BattleRuntime.js";
import { SoundSystem } from "./engine/SoundSystem.js";
import { battleRegistry, battleCatalog, golzaBattleConfig } from "./data/battles.js";
import { playerRegistry, playerCatalog, applyPlayerProfile } from "./data/players.js";
import { exportLightMemoryState, importLightMemoryState, loadLightMemoryState, memoryRoutes, originalTrials, settleLightMemoryBattle } from "./lightMemoryStore.js";

let runtime = null;
let activeBattleKey = null;
let activePlayerKey = "tiga";
let activeBridgeRequest = null;
let activeProgressContext = null;
let returnToTerminal = false;
const handledRequestIds = new Set();
const UBR_PROTOCOL_VERSION = "1.0.0";
const UBR_RUNTIME_VERSION = "2.8.0-light-memory-terminal";
const routeRegistry = Object.freeze({
  tiga: { playerId: "tiga", battles: ["golza", "kyrieloid", "gatanothor"] },
  ginga: { playerId: "ginga", battles: ["thunder-darambia", "super-grand-king", "dark-lugiel"] },
  leo: { playerId: "leo", battles: ["giras-brothers", "pressure", "black-end"] },
  cosmos: { playerId: "cosmos", battles: ["chaos-lidorias", "chaos-ultraman", "chaos-darkness"] },
  nexus: { playerId: "nexus", battles: ["mephisto-one", "mephisto-zwei", "dark-zagi"] },
  original: { playerId: "tiga", battles: [...originalTrials] }
});
const sound = new SoundSystem();

const app = document.querySelector("#app");
const menu = document.querySelector("#showcase-menu");
const cards = document.querySelector("#battle-cards");
const playerCards = document.querySelector("#ultraman-cards");
const selectedPlayerSummary = document.querySelector("#selected-player-summary");
const showMenuButton = document.querySelector("#show-menu-button");
const muteButton = document.querySelector("#mute-button");
const resultPanel = document.querySelector("#result-panel");
const resultTitle = document.querySelector("#result-title");
const resultText = document.querySelector("#result-text");
const replayButton = document.querySelector("#replay-button");
const resultMenuButton = document.querySelector("#result-menu-button");
const resultTransfer = document.querySelector("#result-transfer");
const resultPayload = document.querySelector("#result-payload");
const copyResultButton = document.querySelector("#copy-result-button");
const copyResultState = document.querySelector("#copy-result-state");
const memoryTerminal = document.querySelector("#light-memory-terminal");
const memoryRouteGrid = document.querySelector("#memory-route-grid");
const memoryUltraGrid = document.querySelector("#memory-ultra-grid");
const memoryTrialGrid = document.querySelector("#memory-trial-grid");
const memoryTrialPlayer = document.querySelector("#memory-trial-player");
const battleLabels = Object.fromEntries(Object.entries(battleRegistry).map(([id, battle]) => [id, battle.meta?.title || battle.enemy?.name || id]));

function buildLightTrialResultPayload(detail) {
  return `【提交光之记忆战果】\n<LightTrialBattleResult version="1.2.0">\n${JSON.stringify({
    resultId: detail.resultId,
    requestId: detail.requestId,
    route: detail.route,
    battleId: detail.battleId,
    outcome: detail.outcome ?? detail.result,
    turns: detail.turns,
    resultData: {
      player: detail.player,
      enemy: detail.enemy,
      sparkDollAcquired: detail.sparkDollAcquired,
      sparkDollsAcquired: detail.sparkDollsAcquired
    },
    routeState: detail.routeState ?? {}
  }, null, 2)}\n</LightTrialBattleResult>`;
}

async function copyBattleResult() {
  const text = resultPayload.value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    resultPayload.focus();
    resultPayload.select();
    document.execCommand("copy");
  }
  copyResultState.textContent = "已复制；回到酒馆粘贴并发送即可结算。";
}

function difficultyLabel(value) {
  if (value === "BOSS") return "BOSS";
  if (value === "TECHNICAL") return "技巧";
  if (value === "MOBILITY") return "机动";
  if (value === "DUEL") return "双打";
  if (value === "FINAL") return "FINAL";
  return "标准";
}

function renderPlayerCatalog() {
  playerCards.innerHTML = "";

  for (const player of playerCatalog) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `ultraman-card ultraman-card-${player.key}`;
    button.classList.toggle("active", player.key === activePlayerKey);

    const name = document.createElement("strong");
    name.className = "ultraman-card-name";
    name.textContent = player.name;

    const form = document.createElement("span");
    form.className = "ultraman-card-form";
    form.textContent = player.form;

    const style = document.createElement("span");
    style.className = "ultraman-card-style";
    style.textContent = player.style;

    const description = document.createElement("p");
    description.textContent = player.description;

    button.append(name, form, style, description);
    button.addEventListener("click", async () => {
      activePlayerKey = player.key;
      await sound.ensure();
      sound.play("select");
      renderPlayerCatalog();
      updateSelectedPlayerSummary();

      const url = new URL(window.location.href);
      url.searchParams.set("player", activePlayerKey);
      history.replaceState(null, "", url);
    });

    playerCards.append(button);
  }
}

function updateSelectedPlayerSummary() {
  const player = playerRegistry[activePlayerKey] ?? playerRegistry.tiga;
  if (selectedPlayerSummary) {
    selectedPlayerSummary.textContent = `当前：${player.name} · ${player.form}`;
  }
}

function renderCatalog() {
  cards.innerHTML = "";
  for (const battle of battleCatalog) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `battle-card battle-card-${battle.key}`;
    button.dataset.battle = battle.key;

    const top = document.createElement("div");
    top.className = "battle-card-top";
    const identity = document.createElement("div");
    const subtitle = document.createElement("span"); subtitle.className = "battle-card-subtitle"; subtitle.textContent = battle.subtitle;
    const title = document.createElement("strong"); title.className = "battle-card-title"; title.textContent = battle.title;
    identity.append(subtitle, title);
    const badge = document.createElement("span"); badge.className = `difficulty-badge difficulty-${battle.difficulty.toLowerCase()}`; badge.textContent = difficultyLabel(battle.difficulty);
    top.append(identity, badge);

    const mode = document.createElement("span"); mode.className = "battle-card-mode"; mode.textContent = battle.mode;
    const blurb = document.createElement("p"); blurb.textContent = battle.blurb;
    const cta = document.createElement("span"); cta.className = "battle-card-cta"; cta.textContent = "开始战斗 →";
    button.append(top, mode);
    if ((battle.requiredPlayer || battle.recommendedPlayer) && playerRegistry[battle.requiredPlayer || battle.recommendedPlayer]) {
      const playerKey = battle.requiredPlayer || battle.recommendedPlayer;
      const recommended = document.createElement("span");
      recommended.className = "battle-card-recommended";
      recommended.textContent = battle.requiredPlayer
        ? `限定：${playerRegistry[playerKey].name}`
        : `推荐：${playerRegistry[playerKey].name}`;
      button.append(recommended);
    }
    button.append(blurb, cta);

    button.addEventListener("click", async () => {
      await sound.ensure(); sound.play("confirm");
      startShowcaseBattle(battle.key);
    });
    cards.append(button);
  }
}

export async function startBattle(config = golzaBattleConfig, options = {}) {
  runtime?.destroy?.();
  memoryTerminal.hidden = true;
  app.hidden = false;
  resultPanel.hidden = true;
  menu.hidden = true;
  runtime = new BattleRuntime(app, config, { sound });
  activeBattleKey = config.meta?.key ?? config.enemy?.id ?? null;
  if (options.updateUrl !== false && activeBattleKey && battleRegistry[activeBattleKey]) {
    const url = new URL(window.location.href); url.searchParams.set("battle", activeBattleKey); history.replaceState(null, "", url);
  }
  await runtime.start();
  return runtime;
}

function normalizeBridgeRequest(value) {
  if (!value || typeof value !== "object") throw new Error("缺少战斗请求");
  const requestId = String(value.requestId || "").trim();
  const route = String(value.route || "").trim().toLowerCase();
  const battleId = String(value.battleId || "").trim().toLowerCase();
  const routeInfo = routeRegistry[route];
  if (!requestId || requestId.length > 120) throw new Error("requestId 无效");
  if (!routeInfo) throw new Error(`未知路线：${route || "(空)"}`);
  if (!routeInfo.battles.includes(battleId) || !battleRegistry[battleId]) {
    throw new Error(`路线 ${route} 不包含战斗 ${battleId || "(空)"}`);
  }
  const requestedPlayer = String(value.playerId || "").trim().toLowerCase();
  if (route === "original") {
    if (!playerRegistry[requestedPlayer]) throw new Error("本宇宙试炼缺少有效奥特曼形态");
    if (!loadLightMemoryState().unlockedUltras.includes(requestedPlayer)) {
      throw new Error("该奥特曼形态尚未通过三场记忆战解锁");
    }
  }
  return {
    requestId,
    route,
    battleId,
    playerId: route === "original" ? requestedPlayer : routeInfo.playerId,
    routeState: value.routeState && typeof value.routeState === "object" ? structuredClone(value.routeState) : {},
    parentOrigin: typeof value.parentOrigin === "string" ? value.parentOrigin : ""
  };
}

export async function startBattleById(value, options = {}) {
  const request = normalizeBridgeRequest(value);
  if (handledRequestIds.has(request.requestId)) throw new Error("该战斗请求已经处理");
  if (activeBridgeRequest && activeBridgeRequest.requestId !== request.requestId) throw new Error("已有战斗正在运行");
  if (activeBridgeRequest?.requestId === request.requestId) return runtime;
  const configuredBattle = applyPlayerProfile(battleRegistry[request.battleId], request.playerId);
  configuredBattle.bridgeContext = {
    protocolVersion: UBR_PROTOCOL_VERSION,
    runtimeVersion: UBR_RUNTIME_VERSION,
    requestId: request.requestId,
    route: request.route,
    battleId: request.battleId,
    parentOrigin: request.parentOrigin || options.parentOrigin || ""
  };
  configuredBattle.routeState = request.routeState;
  activePlayerKey = request.playerId;
  activeBridgeRequest = request;
  activeProgressContext = { route: request.route, battleId: request.battleId, playerId: request.playerId, storyLaunch: true };
  // Story encounters must never fall back to the public showcase selector.
  // Their only post-battle destination is the Light Memory Terminal.
  returnToTerminal = true;
  document.body.classList.add("ubr-embedded");
  return startBattle(configuredBattle, { updateUrl: false });
}

function startShowcaseBattle(key, options = {}) {
  const baseBattle = battleRegistry[key] ?? golzaBattleConfig;
  if (options.playerId && playerRegistry[options.playerId]) activePlayerKey = options.playerId;
  if (baseBattle.meta?.requiredPlayer && playerRegistry[baseBattle.meta.requiredPlayer]) {
    activePlayerKey = baseBattle.meta.requiredPlayer;
    renderPlayerCatalog();
    updateSelectedPlayerSummary();
  }
  const configuredBattle = applyPlayerProfile(baseBattle, activePlayerKey);
  activeProgressContext = options.progressContext || null;
  returnToTerminal = options.returnToTerminal === true;
  showMenuButton.hidden = returnToTerminal;
  resultMenuButton.hidden = false;
  const url = new URL(window.location.href);
  url.searchParams.set("player", activePlayerKey);
  history.replaceState(null, "", url);
  return startBattle(configuredBattle);
}

function createTerminalButton(label, enabled, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.disabled = !enabled;
  if (enabled) button.addEventListener("click", onClick);
  return button;
}

function renderLightMemoryTerminal() {
  const state = loadLightMemoryState();
  const total = Object.values(state.completed).reduce((sum, ids) => sum + ids.length, 0);
  document.querySelector("#memory-total").textContent = `${total} / 15`;
  memoryRouteGrid.replaceChildren();
  memoryUltraGrid.replaceChildren();
  memoryTrialGrid.replaceChildren();
  memoryTrialPlayer.replaceChildren();

  Object.entries(memoryRoutes).forEach(([route, meta], index) => {
    const done = new Set(state.completed[route]);
    const card = document.createElement("article");
    card.className = "memory-route-card";
    card.style.setProperty("--accent", ["#63e8ff", "#c682ff", "#ff736e", "#7da8ff", "#ffd275"][index]);
    card.innerHTML = `<span>MEMORY 0${index + 1}</span><h3>${meta.name}</h3><div class="memory-stamps"></div>`;
    const stamps = card.querySelector(".memory-stamps");
    for (const battleId of meta.battles) {
      const row = document.createElement("div");
      row.className = `memory-battle-row${done.has(battleId) ? " done" : ""}`;
      row.append(document.createElement("i"), Object.assign(document.createElement("b"), { textContent: battleLabels[battleId] || battleId }));
      row.append(createTerminalButton(done.has(battleId) ? "再次进入" : "尚未亲历", done.has(battleId), () => startShowcaseBattle(battleId, {
        playerId: meta.playerId,
        progressContext: { route, battleId, playerId: meta.playerId, storyLaunch: false },
        returnToTerminal: true
      })));
      stamps.append(row);
    }
    memoryRouteGrid.append(card);

    const unlocked = state.unlockedUltras.includes(meta.playerId);
    const ultra = document.createElement("article");
    ultra.className = `memory-ultra-card${unlocked ? "" : " locked"}`;
    ultra.style.setProperty("--accent", card.style.getPropertyValue("--accent"));
    ultra.innerHTML = `<span>${unlocked ? "LIGHT AWAKENED" : "LIGHT DORMANT"}</span><h3>${meta.ultra}</h3><b>${unlocked ? "已完成三场记忆战，可用于本宇宙试炼" : `${done.size} / 3 · 尚未解锁`}</b>`;
    memoryUltraGrid.append(ultra);
    if (unlocked) memoryTrialPlayer.append(new Option(meta.ultra, meta.playerId));
  });

  for (const trialId of originalTrials) {
    const access = state.originalAccess[trialId];
    const available = Boolean(access) && memoryTrialPlayer.options.length > 0;
    const card = document.createElement("article");
    card.className = "memory-trial-card";
    card.innerHTML = `<span>DISASTER STONE</span><h3>${battleLabels[trialId] || trialId}</h3><p>${access ? `正文遭遇 ${access.attempts} 次 · 成功 ${access.clears} 次 · 最近 ${access.lastOutcome || "未结算"}` : "尚未在正文中正式遭遇，终端不会提前开放。"}</p>`;
    card.append(createTerminalButton(available ? "进入复战" : "入口封闭", available, () => {
      const playerId = memoryTrialPlayer.value;
      startShowcaseBattle(trialId, {
        playerId,
        progressContext: { route: "original", battleId: trialId, playerId, storyLaunch: false },
        returnToTerminal: true
      });
    }));
    memoryTrialGrid.append(card);
  }
}

function showLightMemoryTerminal() {
  runtime?.destroy?.(); runtime = null;
  app.hidden = true;
  memoryTerminal.hidden = false;
  showMenuButton.hidden = true;
  resultMenuButton.hidden = false;
  renderLightMemoryTerminal();
  const url = new URL(location.href);
  url.search = "?terminal=1";
  history.replaceState(null, "", url);
}

function showShowcaseMenu() {
  runtime?.destroy?.(); runtime = null; resultPanel.hidden = true; menu.hidden = false;
  const url = new URL(window.location.href); url.searchParams.delete("battle"); history.replaceState(null, "", url);
}

window.startBattle = startBattle;
window.startBattleById = startBattleById;
window.UBR_BATTLES = battleRegistry;
window.UBR_PLAYERS = playerRegistry;
window.UBR_ROUTES = routeRegistry;
window.UBR_PROTOCOL_VERSION = UBR_PROTOCOL_VERSION;
window.UBR_RUNTIME_VERSION = UBR_RUNTIME_VERSION;
window.UBR_SHOW_MENU = showShowcaseMenu;
window.UBR_SHOW_LIGHT_MEMORY_TERMINAL = showLightMemoryTerminal;

window.addEventListener("message", async (event) => {
  const data = event.data;
  if (!data || data.type !== "START_BATTLE") return;
  if (event.source !== window.parent && event.source !== window.opener) return;
  const expectedOrigin = new URLSearchParams(location.search).get("parentOrigin");
  if (expectedOrigin && event.origin !== expectedOrigin) return;
  try {
    const request = normalizeBridgeRequest(data);
    await sound.ensure();
    await startBattleById({ ...request, parentOrigin: event.origin }, { parentOrigin: event.origin });
    event.source?.postMessage({
      type: "BATTLE_ACCEPTED",
      protocolVersion: UBR_PROTOCOL_VERSION,
      runtimeVersion: UBR_RUNTIME_VERSION,
      requestId: request.requestId,
      route: request.route,
      battleId: request.battleId
    }, event.origin);
  } catch (error) {
    event.source?.postMessage({
      type: "BATTLE_REJECTED",
      protocolVersion: UBR_PROTOCOL_VERSION,
      requestId: String(data.requestId || ""),
      error: String(error?.message || error)
    }, event.origin);
  }
});

window.addEventListener("ubr:battle-finished", (event) => {
  const detail = event.detail;
  settleLightMemoryBattle(detail, activeProgressContext || {});
  if (detail?.requestId) {
    handledRequestIds.add(detail.requestId);
    activeBridgeRequest = null;
  }
  setTimeout(() => {
    const restoredDolls = detail.sparkDollsAcquired ?? [];
    resultTitle.textContent = restoredDolls.length
      ? "RESTORED"
      : detail.sparkDollAcquired
        ? "ACQUIRED"
        : detail.result === "victory"
          ? "VICTORY"
          : detail.result === "mercy"
            ? "MERCY"
            : "DEFEAT";
    resultText.textContent = restoredDolls.length
      ? `SPARK DOLLS · ${restoredDolls.map((doll) => doll.name).join(" / ")}`
      : detail.sparkDollAcquired
        ? `SPARK DOLL · ${detail.sparkDollAcquired.name}`
        : detail.result === "victory" || detail.result === "mercy"
          ? (playerRegistry[activePlayerKey]?.hideEnergy ? `剩余 HP ${Math.ceil(detail.player.hp)}` : `剩余 HP ${Math.ceil(detail.player.hp)} · EN ${Math.round(detail.player.energy)}`)
          : "这场战斗结束了。你可以立即重试，或切换到另一只怪兽。";
    if (detail?.requestId && detail?.route && detail?.battleId) {
      resultPayload.value = buildLightTrialResultPayload(detail);
      resultTransfer.hidden = false;
      copyResultState.textContent = "若自动回填没有生效，请使用复制战果。";
    } else if (returnToTerminal) {
      resultTransfer.hidden = true;
      resultPayload.value = "";
      copyResultState.textContent = "战果已保存到本机光之记忆终端。";
    } else {
      resultTransfer.hidden = true;
      resultPayload.value = "";
      copyResultState.textContent = "";
    }
    resultPanel.hidden = false;
  }, 550);
});

showMenuButton.addEventListener("click", () => { sound.play("select"); showShowcaseMenu(); });
muteButton.addEventListener("click", async () => {
  if (sound.enabled) {
    sound.setEnabled(false); muteButton.classList.add("muted"); muteButton.textContent = "×";
  } else {
    sound.setEnabled(true); await sound.ensure(); muteButton.classList.remove("muted"); muteButton.textContent = "♪";
  }
});
replayButton.addEventListener("click", () => { sound.play("confirm"); if (activeBattleKey && battleRegistry[activeBattleKey]) startShowcaseBattle(activeBattleKey, { playerId: activePlayerKey, progressContext: activeProgressContext, returnToTerminal }); });
resultMenuButton.addEventListener("click", () => { sound.play("select"); returnToTerminal ? showLightMemoryTerminal() : showShowcaseMenu(); });
copyResultButton.addEventListener("click", copyBattleResult);

document.querySelectorAll("[data-memory-tab]").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll("[data-memory-tab]").forEach((item) => item.classList.toggle("active", item === button));
  document.querySelectorAll("[data-memory-panel]").forEach((panel) => { panel.hidden = panel.dataset.memoryPanel !== button.dataset.memoryTab; });
}));
document.querySelector("#memory-refresh").addEventListener("click", renderLightMemoryTerminal);
document.querySelector("#memory-export").addEventListener("click", () => {
  const blob = new Blob([exportLightMemoryState()], { type: "application/json" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "light-memory-terminal.json"; link.click(); URL.revokeObjectURL(link.href);
});
document.querySelector("#memory-import").addEventListener("change", async (event) => {
  const state = document.querySelector("#memory-data-state");
  try { importLightMemoryState(await event.target.files?.[0]?.text()); state.textContent = "进度已导入。"; renderLightMemoryTerminal(); }
  catch (error) { state.textContent = `导入失败：${error?.message || error}`; }
  event.target.value = "";
});

window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const embedded = params.get("embed") === "1";
  const terminal = params.get("terminal") === "1";
  const playerId = params.get("player");
  if (playerId && playerRegistry[playerId]) activePlayerKey = playerId;

  renderPlayerCatalog();
  updateSelectedPlayerSummary();
  renderCatalog();

  if (terminal) { showLightMemoryTerminal(); return; }
  if (embedded) {
    document.body.classList.add("ubr-embedded");
    menu.hidden = true;
    resultMenuButton.hidden = true;
    showMenuButton.hidden = true;
    const directRequest = {
      requestId: params.get("requestId"),
      route: params.get("route"),
      battleId: params.get("battleId") || params.get("battle"),
      playerId: params.get("player"),
      parentOrigin: params.get("parentOrigin") || ""
    };
    if (directRequest.requestId && directRequest.route && directRequest.battleId) {
      startBattleById(directRequest).catch((error) => {
        resultTitle.textContent = "无法启动战斗";
        resultText.textContent = String(error?.message || error);
        resultPanel.hidden = false;
      });
    }
    const ready = {
      type: "UBR_READY",
      protocolVersion: UBR_PROTOCOL_VERSION,
      runtimeVersion: UBR_RUNTIME_VERSION,
      battles: Object.keys(battleRegistry),
      routes: Object.keys(routeRegistry)
    };
    const targetOrigin = directRequest.parentOrigin || "*";
    if (window.parent && window.parent !== window) window.parent.postMessage(ready, targetOrigin);
    if (window.opener && window.opener !== window) window.opener.postMessage(ready, targetOrigin);
    return;
  }
  const battleId = params.get("battle");
  if (battleId && battleRegistry[battleId]) startShowcaseBattle(battleId);
  else showShowcaseMenu();
});
