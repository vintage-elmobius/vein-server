/* ============================
   Vein Server Dashboard
   ============================ */

const API_BASE = `${window.location.origin}/api`;

/* ----------------------------
   DOM references
---------------------------- */

const statusEl = document.getElementById("status-output");
const playersEl = document.getElementById("players-output");
const weatherEl = document.getElementById("weather-output");

/* ----------------------------
   Helpers
---------------------------- */

const pretty = (obj) => JSON.stringify(obj, null, 2);

const fetchJson = async (path) => {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
};

/* ----------------------------
   Status
---------------------------- */

const loadStatus = async () => {
  try {
    const data = await fetchJson("/status");

    const uptime = `${data.uptime.toFixed(1)} seconds`;
    const onlineCount = Object.keys(data.onlinePlayers || {}).length;

    statusEl.textContent =
      `Uptime: ${uptime}\n` +
      `Online Players: ${onlineCount}`;

  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
};

/* ----------------------------
   Players
---------------------------- */

const loadPlayers = async () => {
  try {
    const data = await fetchJson("/status");
    const players = data.onlinePlayers || {};

    if (Object.keys(players).length === 0) {
      playersEl.textContent = "No players online";
      return;
    }

    const lines = Object.entries(players).map(
      ([steamId, p]) =>
        `${p.name} (${steamId})\n` +
        `  Character ID: ${p.characterId}\n` +
        `  Status: ${p.status}\n` +
        `  Connected: ${p.timeConnected.toFixed(1)}s`
    );

    playersEl.textContent = lines.join("\n\n");

  } catch (err) {
    playersEl.textContent = `Error: ${err.message}`;
  }
};

/* ----------------------------
   Weather
---------------------------- */

const loadWeather = async () => {
  try {
    const data = await fetchJson("/weather");

    weatherEl.textContent =
      `Temperature: ${data.temperature.toFixed(1)} °C\n` +
      `Cloudiness: ${data.cloudiness}\n` +
      `Precipitation: ${data.precipitation}\n` +
      `Fog: ${data.fog}\n` +
      `Humidity: ${(data.relativeHumidity * 100).toFixed(1)}%\n` +
      `Pressure: ${data.pressure.toFixed(1)} hPa\n` +
      `Wind: ${data.windForce.toFixed(1)} m/s @ ${data.windDirection.toFixed(0)}°`;

  } catch (err) {
    weatherEl.textContent = `Error: ${err.message}`;
  }
};

/* ----------------------------
   Init
---------------------------- */

const init = () => {
  loadStatus();
  loadPlayers();
  loadWeather();
};

init();
