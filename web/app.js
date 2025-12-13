/* =========================================================
   Vein Server Dashboard — API v1
   ========================================================= */

const API_BASE = "/api";
const TEMP_PLAYER_OFFSET_C = -4; // players are colder than baseline

/* ----------------------------
   DOM references
---------------------------- */

const statusEl = document.getElementById("connectionStatus");
const lastUpdatedEl = document.getElementById("lastUpdated");

const uptimeEl = document.getElementById("uptime");
const playerCountEl = document.getElementById("playerCount");
const serverTimeEl = document.getElementById("serverTime");

const statusRawEl = document.getElementById("statusRaw");

const wxTempEl = document.getElementById("wxTemp");
const wxWindEl = document.getElementById("wxWind");
const wxCloudsEl = document.getElementById("wxClouds");
const wxHumidityEl = document.getElementById("wxHumidity");
const wxPrecipEl = document.getElementById("wxPrecip");
const wxPressureEl = document.getElementById("wxPressure");
const wxFogEl = document.getElementById("wxFog");
const wxRawEl = document.getElementById("weatherRaw");
const wxToggleEl = document.getElementById("wxToggle");

const playersTbodyEl = document.getElementById("playersTbody");
const charactersRawEl = document.getElementById("charactersRaw");

const refreshRateEl = document.getElementById("refreshRate");
const refreshNowBtn = document.getElementById("refreshNow");

/* ----------------------------
   State
---------------------------- */

let refreshHandle = null;
const characterCache = {};

/* ----------------------------
   Utilities
---------------------------- */

const setStatus = (text, variant = "idle") => {
  statusEl.textContent = text;
  statusEl.className = `pill ${variant}`;
};

const updateTimestamp = () => {
  lastUpdatedEl.textContent = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
};

const fetchJSON = async (path) => {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const formatSeconds = (seconds) => {
  if (seconds == null) return "--";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
};

const formatGameTimeUTC = (unixSeconds) => {
  if (!unixSeconds) return "--";
  return new Date(unixSeconds * 1000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19) + " UTC";
};

const clearTable = () => {
  playersTbodyEl.innerHTML = "";
};

/* ----------------------------
   Weather toggle
---------------------------- */

wxToggleEl.onclick = (e) => {
  e.preventDefault();
  wxRawEl.classList.toggle("hidden");
  wxToggleEl.textContent = wxRawEl.classList.contains("hidden") ? "show" : "hide";
};

/* ----------------------------
   STATUS
---------------------------- */

const loadStatus = async () => {
  const data = await fetchJSON("/status");

  uptimeEl.textContent = formatSeconds(data.uptime);
  playerCountEl.textContent = Object.keys(data.onlinePlayers || {}).length;
  statusRawEl.textContent = JSON.stringify(data, null, 2);

  return data.onlinePlayers || {};
};

/* ----------------------------
   TIME
---------------------------- */

const loadTime = async () => {
  const data = await fetchJSON("/time");
  serverTimeEl.textContent = formatGameTimeUTC(data.unixSeconds);
};

/* ----------------------------
   WEATHER (player-adjusted)
---------------------------- */

const loadWeather = async () => {
  const data = await fetchJSON("/weather");

  const playerTemp = data.temperature + TEMP_PLAYER_OFFSET_C;

  wxTempEl.innerHTML =
    `${playerTemp.toFixed(1)} °C <span class="muted">(player)</span><br>` +
    `<span class="muted mono">${data.temperature.toFixed(1)} °C (baseline)</span>`;

  wxWindEl.textContent = `${data.windForce.toFixed(1)} m/s @ ${Math.round(data.windDirection)}°`;
  wxCloudsEl.textContent = `${(data.cloudiness * 100).toFixed(1)}%`;
  wxHumidityEl.textContent = `${(data.relativeHumidity * 100).toFixed(1)}%`;
  wxPrecipEl.textContent = String(data.precipitation);
  wxPressureEl.textContent = `${data.pressure.toFixed(1)} hPa`;
  wxFogEl.textContent = String(data.fog);

  wxRawEl.textContent = JSON.stringify(
    { ...data, playerTemperature: playerTemp },
    null,
    2
  );
};

/* ----------------------------
   CHARACTER + INVENTORY
---------------------------- */

const loadCharacter = async (characterId) => {
  if (characterCache[characterId]) return characterCache[characterId];
  const data = await fetchJSON(`/characters/${characterId}`);
  characterCache[characterId] = data;
  charactersRawEl.textContent = JSON.stringify(characterCache, null, 2);
  return data;
};

const summarizeInventory = (inventory) => {
  if (!inventory?.items) return "—";
  const count = inventory.items.length;
  const weight = inventory.items.reduce((s, i) => s + (i.weight || 0), 0);
  return `${count} items, ${weight.toFixed(1)} kg`;
};

/* ----------------------------
   PLAYERS
---------------------------- */

const renderPlayers = async (onlinePlayers) => {
  clearTable();
  const ids = Object.keys(onlinePlayers);

  if (!ids.length) {
    playersTbodyEl.innerHTML =
      `<tr><td colspan="7" class="muted">No players online</td></tr>`;
    return;
  }

  for (const steamId of ids) {
    const p = onlinePlayers[steamId];
    let characterName = "Loading…";
    let inventorySummary = "—";

    try {
      const charData = await loadCharacter(p.characterId);
      characterName = charData.playerCharacterData?.name || "Unknown";
      inventorySummary = summarizeInventory(charData.inventory);
    } catch {
      characterName = "Error";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td class="mono">${steamId}</td>
      <td>${p.status}</td>
      <td class="mono">${formatSeconds(p.timeConnected)}</td>
      <td>${characterName}</td>
      <td class="mono">${p.characterId}</td>
      <td>${inventorySummary}</td>
    `;
    playersTbodyEl.appendChild(tr);
  }
};

/* ----------------------------
   MAIN REFRESH
---------------------------- */

const refreshAll = async () => {
  try {
    setStatus("Updating…", "idle");

    const onlinePlayers = await loadStatus();
    await loadTime();
    await loadWeather();
    await renderPlayers(onlinePlayers);

    updateTimestamp();
    setStatus("Connected", "ok");
  } catch (err) {
    setStatus("API error", "error");
    console.error(err);
  }
};

/* ----------------------------
   CONTROLS
---------------------------- */

const setupRefresh = () => {
  refreshRateEl.onchange = () => {
    if (refreshHandle) clearInterval(refreshHandle);
    const interval = Number(refreshRateEl.value);
    if (interval > 0) {
      refreshHandle = setInterval(refreshAll, interval * 1000);
    }
  };
  refreshNowBtn.onclick = refreshAll;
};

/* ----------------------------
   INIT
---------------------------- */

const init = () => {
  setupRefresh();
  refreshAll();

  const interval = Number(refreshRateEl.value);
  if (interval > 0) {
    refreshHandle = setInterval(refreshAll, interval * 1000);
  }
};

init();
