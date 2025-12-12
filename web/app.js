/* ==========================================================
   Vein Server Dashboard – API v1
   ========================================================== */

const API_BASE = "/api";

/* ---------------------------
   DOM references
--------------------------- */

const el = (id) => document.getElementById(id);

const statusPill = el("connectionStatus");
const lastUpdatedEl = el("lastUpdated");

const uptimeEl = el("uptime");
const playerCountEl = el("playerCount");
const serverTimeEl = el("serverTime");
const statusRawEl = el("statusRaw");

const wxTempEl = el("wxTemp");
const wxWindEl = el("wxWind");
const wxCloudsEl = el("wxClouds");
const wxHumidityEl = el("wxHumidity");
const wxPrecipEl = el("wxPrecip");
const wxPressureEl = el("wxPressure");
const wxFogEl = el("wxFog");
const weatherRawEl = el("weatherRaw");
const wxToggleEl = el("wxToggle");

const playersTbody = el("playersTbody");
const charactersRawEl = el("charactersRaw");

const refreshRateEl = el("refreshRate");
const refreshNowBtn = el("refreshNow");
const apiBaseEl = el("apiBase");

/* ---------------------------
   State & cache
--------------------------- */

let refreshTimer = null;

// Cache character payloads by characterId
const characterCache = new Map();

/* ---------------------------
   Helpers
--------------------------- */

const setStatus = (text, cls) => {
  statusPill.textContent = text;
  statusPill.className = `pill ${cls}`;
};

const nowString = () => new Date().toLocaleString();

const fmtSeconds = (s) => `${s.toFixed(1)}s`;

const fmtInventorySummary = (inv) => {
  if (!inv || !inv.items) return "—";
  const count = inv.items.length;
  if (!count) return "Empty";
  return `${count} item${count !== 1 ? "s" : ""}`;
};

const fetchJSON = async (path) => {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
};

/* ---------------------------
   API loaders
--------------------------- */

async function loadStatus() {
  const data = await fetchJSON("/status");

  uptimeEl.textContent = fmtSeconds(data.uptime);
  playerCountEl.textContent = Object.keys(data.onlinePlayers || {}).length;
  statusRawEl.textContent = JSON.stringify(data, null, 2);

  return data.onlinePlayers || {};
}

async function loadTime() {
  const data = await fetchJSON("/time");
  serverTimeEl.textContent = new Date(data.unixSeconds * 1000).toLocaleString();
}

async function loadWeather() {
  const w = await fetchJSON("/weather");

  wxTempEl.textContent = `${w.temperature.toFixed(1)} °C`;
  wxWindEl.textContent = `${w.windForce.toFixed(1)} m/s @ ${Math.round(w.windDirection)}°`;
  wxCloudsEl.textContent = (w.cloudiness * 100).toFixed(1) + "%";
  wxHumidityEl.textContent = (w.relativeHumidity * 100).toFixed(1) + "%";
  wxPrecipEl.textContent = w.precipitation;
  wxPressureEl.textContent = `${w.pressure.toFixed(1)} hPa`;
  wxFogEl.textContent = w.fog;

  weatherRawEl.textContent = JSON.stringify(w, null, 2);
}

async function loadCharacter(characterId) {
  if (characterCache.has(characterId)) {
    return characterCache.get(characterId);
  }

  const data = await fetchJSON(`/characters/${characterId}`);
  characterCache.set(characterId, data);

  charactersRawEl.textContent = JSON.stringify(
    Object.fromEntries(characterCache),
    null,
    2
  );

  return data;
}

/* ---------------------------
   Players table
--------------------------- */

async function renderPlayers(onlinePlayers) {
  playersTbody.innerHTML = "";

  const entries = Object.entries(onlinePlayers);

  if (!entries.length) {
    playersTbody.innerHTML =
      `<tr><td colspan="7" class="muted">No players online</td></tr>`;
    return;
  }

  for (const [steamId, p] of entries) {
    const tr = document.createElement("tr");

    // Fetch character data
    let charName = "Loading…";
    let invSummary = "—";

    try {
      const charData = await loadCharacter(p.characterId);
      charName = charData.playerCharacterData?.name ?? "Unknown";
      invSummary = fmtInventorySummary(charData.inventory);
    } catch {
      charName = "Error";
    }

    tr.innerHTML = `
      <td>${p.name}</td>
      <td class="mono">${steamId}</td>
      <td>${p.status}</td>
      <td class="mono">${fmtSeconds(p.timeConnected)}</td>
      <td>${charName}</td>
      <td class="mono">${p.characterId}</td>
      <td>${invSummary}</td>
    `;

    playersTbody.appendChild(tr);
  }
}

/* ---------------------------
   Main refresh loop
--------------------------- */

async function refreshAll() {
  try {
    setStatus("Connected", "ok");

    const players = await loadStatus();
    await Promise.all([loadTime(), loadWeather()]);
    await renderPlayers(players);

    lastUpdatedEl.textContent = nowString();
  } catch (err) {
    setStatus("API Error", "error");
    console.error(err);
  }
}

/* ---------------------------
   Controls
--------------------------- */

function resetRefreshTimer() {
  if (refreshTimer) clearInterval(refreshTimer);

  const interval = Number(refreshRateEl.value);
  if (!interval) return;

  refreshTimer = setInterval(refreshAll, interval * 1000);
}

refreshRateEl.addEventListener("change", resetRefreshTimer);
refreshNowBtn.addEventListener("click", refreshAll);

wxToggleEl.addEventListener("click", (e) => {
  e.preventDefault();
  weatherRawEl.classList.toggle("hidden");
  wxToggleEl.textContent = weatherRawEl.classList.contains("hidden")
    ? "show"
    : "hide";
});

/* ---------------------------
   Init
--------------------------- */

function init() {
  apiBaseEl.textContent = API_BASE;
  setStatus("Loading…", "idle");
  resetRefreshTimer();
  refreshAll();
}

init();
