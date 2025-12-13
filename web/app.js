/* =========================================================
   Vein Server Dashboard — API v1 (Corrected)
   ========================================================= */

const API_BASE = "/api";
const PLAYER_TEMP_OFFSET = -4; // player is colder than baseline

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
  lastUpdatedEl.textContent = new Date().toLocaleString();
};

const fetchJSON = async (path) => {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const formatSeconds = (seconds) => {
  if (seconds === undefined || seconds === null) return "--";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
};

/**
 * IMPORTANT:
 * Game time is NOT real UTC time.
 * We display it as raw in-game time without timezone math.
 */
const formatGameTime = (unixSeconds) => {
  if (!unixSeconds) return "--";

  const totalSeconds = Math.floor(unixSeconds);
  const hours = Math.floor((totalSeconds / 3600) % 24);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:` +
         `${minutes.toString().padStart(2, "0")}:` +
         `${seconds.toString().padStart(2, "0")} (game time)`;
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
  wxToggleEl.textContent = wxRawEl.classList.contains("hidden")
    ? "show"
    : "hide";
};

/* ----------------------------
   STATUS
---------------------------- */

const loadStatus = async () => {
  const data = await fetchJSON("/status");

  uptimeEl.textContent = formatSeconds(data.uptime);
  const players = data.onlinePlayers || {};
  playerCountEl.textContent = Object.keys(players).length;
  statusRawEl.textContent = JSON.stringify(data, null, 2);

  return players;
};

/* ----------------------------
   TIME
---------------------------- */

const loadTime = async () => {
  const data = await fetchJSON("/time");
  serverTimeEl.textContent = formatGameTime(data.unixSeconds);
};

/* ----------------------------
   WEATHER
---------------------------- */

const loadWeather = async () => {
  const data = await fetchJSON("/weather");

  const playerTemp = data.temperature + PLAYER_TEMP_OFFSET;

  wxTempEl.textContent = `${playerTemp.toFixed(1)} °C`;
  wxWindEl.textContent = `${data.windForce.toFixed(1)} m/s @ ${Math.round(
    data.windDirection
  )}°`;
  wxCloudsEl.textContent = `${(data.cloudiness * 100).toFixed(1)}%`;
  wxHumidityEl.textContent = `${(data.relativeHumidity * 100).toFixed(1)}%`;
  wxPrecipEl.textContent = data.precipitation.toString();
  wxPressureEl.textContent = `${data.pressure.toFixed(1)} hPa`;
  wxFogEl.textContent = data.fog.toString();

  wxRawEl.textContent = JSON.stringify(data, null, 2);
};

/* ----------------------------
   Characters (cached)
---------------------------- */

const loadCharacter = async (characterId) => {
  if (characterCache[characterId]) return characterCache[characterId];

  const data = await fetchJSON(`/characters/${characterId}`);
  characterCache[characterId] = data;
  charactersRawEl.textContent = JSON.stringify(characterCache, null, 2);
  return data;
};

/* ----------------------------
   Inventory summary
---------------------------- */

const summarizeInventory = (inventory) => {
  if (!inventory || !inventory.items) return "—";

  const itemCount = inventory.items.length;
  const totalWeight = inventory.items.reduce(
    (sum, i) => sum + (i.weight || 0),
    0
  );

  return `${itemCount} items, ${totalWeight.toFixed(1)} kg`;
};

/* ----------------------------
   Players table
---------------------------- */

const renderPlayers = async (onlinePlayers) => {
  clearTable();

  const ids = Object.keys(onlinePlayers);
  if (ids.length === 0) {
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
   Main refresh
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
    console.error(err);
    setStatus("API error", "error");
  }
};

/* ----------------------------
   Refresh controls
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
   Init
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
