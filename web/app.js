const endpoints = [
  { label: "Server summary", path: "/api/server" },
  { label: "Game state", path: "/api/game" },
  { label: "Players", path: "/api/players" },
  { label: "Player inventory", path: "/api/players/inventory" },
  { label: "World objects", path: "/api/objects" },
  { label: "Events / logs", path: "/api/events" },
];

const outputEl = document.getElementById("output");
const baseUrlEl = document.getElementById("baseUrl");
const authTokenEl = document.getElementById("authToken");
const endpointList = document.getElementById("endpointList");
const endpointTemplate = document.getElementById("endpointTemplate");
const activePathEl = document.getElementById("activePath");
const timestampEl = document.getElementById("timestamp");
const refreshRateEl = document.getElementById("refreshRate");
const statusEl = document.getElementById("connectionStatus");
let refreshHandle = null;
let lastPath = null;

const savePreferences = () => {
  const prefs = {
    baseUrl: baseUrlEl.value,
    token: authTokenEl.value,
    refreshRate: refreshRateEl.value,
  };
  localStorage.setItem("vein-dashboard-preferences", JSON.stringify(prefs));
};

const loadPreferences = () => {
  const raw = localStorage.getItem("vein-dashboard-preferences");
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.baseUrl) baseUrlEl.value = parsed.baseUrl;
    if (parsed.token) authTokenEl.value = parsed.token;
    if (parsed.refreshRate) refreshRateEl.value = parsed.refreshRate;
  } catch (err) {
    console.warn("Unable to parse saved preferences", err);
  }
};

const joinUrl = (base, path) => {
  const trimmedBase = base.replace(/\/$/, "");
  const cleanedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedBase}${cleanedPath}`;
};

const renderOutput = (content) => {
  outputEl.textContent = content;
};

const setStatus = (text, variant = "idle") => {
  statusEl.textContent = text;
  statusEl.classList.remove("idle", "ok", "error");
  statusEl.classList.add(variant);
};

const formatJson = (data) => JSON.stringify(data, null, 2);

const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (contentType.includes("application/json")) {
    try {
      const json = JSON.parse(text);
      return formatJson(json);
    } catch (err) {
      return text;
    }
  }
  return text;
};

const fetchPath = async (path) => {
  const baseUrl = baseUrlEl.value.trim();
  if (!baseUrl) {
    setStatus("Base URL required", "error");
    renderOutput("Please provide a base URL for the API to request data.");
    return;
  }

  const url = joinUrl(baseUrl, path);
  activePathEl.textContent = url;
  timestampEl.textContent = "Loading...";
  renderOutput("Requesting data...");
  setStatus("Requesting", "idle");

  try {
    const headers = {};
    if (authTokenEl.value) {
      headers.Authorization = authTokenEl.value;
    }

    const response = await fetch(url, { headers });
    const text = await handleResponse(response);

    if (!response.ok) {
      setStatus(`Error ${response.status}`, "error");
    } else {
      setStatus("Connected", "ok");
    }

    renderOutput(text || "<empty response>");
    timestampEl.textContent = new Date().toLocaleString();
    lastPath = path;
    savePreferences();
  } catch (err) {
    setStatus("Network error", "error");
    renderOutput(`${err}`);
    timestampEl.textContent = new Date().toLocaleString();
  }
};

const renderEndpoints = () => {
  const fragment = document.createDocumentFragment();
  endpoints.forEach((endpoint) => {
    const item = endpointTemplate.content.cloneNode(true);
    const button = item.querySelector("button");
    const label = item.querySelector(".label");
    const path = item.querySelector(".path");
    button.dataset.path = endpoint.path;
    label.textContent = endpoint.label;
    path.textContent = endpoint.path;
    button.addEventListener("click", () => fetchPath(endpoint.path));
    fragment.appendChild(item);
  });
  endpointList.replaceChildren(fragment);
};

const bindCustomRequest = () => {
  const input = document.getElementById("customPath");
  const button = document.getElementById("customButton");
  button.addEventListener("click", () => {
    const value = input.value.trim();
    if (!value) return;
    fetchPath(value.startsWith("/") ? value : `/${value}`);
  });
};

const bindPing = () => {
  const pingButton = document.getElementById("pingButton");
  pingButton.addEventListener("click", () => {
    const defaultUrl = baseUrlEl.value.trim() || window.location.origin;
    baseUrlEl.value = defaultUrl;
    fetchPath("/");
    activePathEl.textContent = `Ping: ${defaultUrl}`;
  });
};

const watchRefresh = () => {
  refreshRateEl.addEventListener("change", () => {
    savePreferences();
    if (refreshHandle) {
      clearInterval(refreshHandle);
      refreshHandle = null;
    }
    const interval = Number(refreshRateEl.value);
    if (!interval || !lastPath) return;
    refreshHandle = setInterval(() => fetchPath(lastPath), interval * 1000);
  });
};

const init = () => {
  loadPreferences();
  renderEndpoints();
  bindCustomRequest();
  bindPing();
  watchRefresh();

  // Always default to same-origin NGINX proxy
  if (!baseUrlEl.value.trim()) {
  baseUrlEl.value = window.location.origin;
}

fetchPath(endpoints[0].path);

};

init();
