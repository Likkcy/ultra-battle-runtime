import { BattleRuntime } from "./engine/BattleRuntime.js";
import { SoundSystem } from "./engine/SoundSystem.js";
import { battleRegistry, battleCatalog, golzaBattleConfig } from "./data/battles.js";
import { playerRegistry, playerCatalog, applyPlayerProfile } from "./data/players.js";

let runtime = null;
let activeBattleKey = null;
let activePlayerKey = "tiga";
let activeBridgeRequest = null;
const handledRequestIds = new Set();
const UBR_PROTOCOL_VERSION = "1.0.0";
const UBR_RUNTIME_VERSION = "2.7.4-card-bridge.1";
const routeRegistry = Object.freeze({
  tiga: { playerId: "tiga", battles: ["golza", "kyrieloid", "gatanothor"] },
  ginga: { playerId: "ginga", battles: ["thunder-darambia", "super-grand-king", "dark-lugiel"] },
  leo: { playerId: "leo", battles: ["giras-brothers", "pressure", "black-end"] },
  cosmos: { playerId: "cosmos", battles: ["chaos-lidorias", "chaos-ultraman", "chaos-darkness"] },
  nexus: { playerId: "nexus", battles: ["mephisto-one", "mephisto-zwei", "dark-zagi"] }
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
  return {
    requestId,
    route,
    battleId,
    playerId: routeInfo.playerId,
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
  document.body.classList.add("ubr-embedded");
  return startBattle(configuredBattle, { updateUrl: false });
}

function startShowcaseBattle(key) {
  const baseBattle = battleRegistry[key] ?? golzaBattleConfig;
  if (baseBattle.meta?.requiredPlayer && playerRegistry[baseBattle.meta.requiredPlayer]) {
    activePlayerKey = baseBattle.meta.requiredPlayer;
    renderPlayerCatalog();
    updateSelectedPlayerSummary();
  }
  const configuredBattle = applyPlayerProfile(baseBattle, activePlayerKey);
  const url = new URL(window.location.href);
  url.searchParams.set("player", activePlayerKey);
  history.replaceState(null, "", url);
  return startBattle(configuredBattle);
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
replayButton.addEventListener("click", () => { sound.play("confirm"); if (activeBattleKey && battleRegistry[activeBattleKey]) startShowcaseBattle(activeBattleKey); });
resultMenuButton.addEventListener("click", () => { sound.play("select"); showShowcaseMenu(); });

window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const embedded = params.get("embed") === "1";
  const playerId = params.get("player");
  if (playerId && playerRegistry[playerId]) activePlayerKey = playerId;

  renderPlayerCatalog();
  updateSelectedPlayerSummary();
  renderCatalog();

  if (embedded) {
    document.body.classList.add("ubr-embedded");
    menu.hidden = true;
    resultMenuButton.hidden = true;
    showMenuButton.hidden = true;
    const directRequest = {
      requestId: params.get("requestId"),
      route: params.get("route"),
      battleId: params.get("battleId") || params.get("battle"),
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
