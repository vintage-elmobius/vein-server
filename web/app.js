/* ============================
   Vein Server Dashboard (API v1)
   ============================ */

/* ----------------------------
   API endpoint definitions
---------------------------- */

const endpoints = [
  {
    label: "Server Status",
    path: "/status",
    description: "Server uptime and online players",
  },
  {
    label: "Players (list)",
    path: "/players",
    description: "List of player Steam IDs",
  },
  {
    label: "World Time",
    path: "/time",
    description: "Current server time",
  },
  {
    label: "Weather",
    path: "/weather",
    description: "Current weather conditions",
  },
];

/* ----------------------------
   DOM references
---------------------------- */

const outputEl = document.getElementById("output");
const endpointList = document.getElementById("endpointList");
const endpointTemplate = document.getElementById("endpointTemplate");
const baseUrlEl = document.getElementById("baseUrl");
const refreshRateEl = document.getElementById("refreshRate");
const statusEl = document.getElementById("connectionStatus");
const activePathEl = document.getElementById("activePath");
const timestampEl = document.getElementById("timestamp");
const customPathInput = document.getElementById("customPath");
const customButton = document.getElementById("customButton");
const pingButton = document.getElementById("pingButton");

let refreshHandle = null;
let lastPath = null;

/* ----------------------------
   Utilities
---------------------------- */

const joinUrl = (base, path) => {
  const trimmed = base.replace(/\/$/, "");
  return `${trimmed}${path.startsWith("/") ? path : `/${path}`}`;
};

const formatJson = (data) => JSON.stringify(data, null, 2);

const renderOutput = (content) => {
  outputEl.textContent = content;
};

const setStatus = (text, variant = "idle") => {
  statusEl.textContent = text;
  statusEl.className = variant;
};

const savePreferences = () => {
  localStorage.setItem(
    "vein-dashboard",
    JSON.stringify({
      baseUrl: baseUrlEl.value,
      refreshRate: refreshRateEl.value,
    })
  );
};

const loadPreferences = () => {
  const raw = localStorage.getItem("vein-dashboard");
  if (!raw) return;
  try {
    const prefs = JSON.parse(raw);
    if (prefs.baseUrl) baseUrlEl.value = prefs.baseUrl;
    if (prefs.refreshRate) refreshRateEl.value = prefs.refreshRate;
  } catch {
    /* ignore */
  }
};

/* ----------------------------
   Core fetch logic
---------------------------- */

const handleResponse = async (response) => {
  const text = await response.text();
  try {
    return formatJson(JSON.parse(text));
  } catch {
    return text;
  }
};

const fetchPath = async (path) => {
  const baseUrl = baseUrlEl.value.trim();
  if (!baseUrl) {
    setStatus("Base URL required", "error");
    return;
  }

  const url = joinUrl(baseUrl, path);
  activePathEl.textContent = url;
  timestampEl.textContent = "Loading...";
  renderOutput("Requesting data...");
  setStatus("Requesting", "idle");

  try {
    const response = await fetch(url);
    const content = await handleResponse(response);

    if (!response.ok) {
      setStatus(`HTTP ${response.status}`, "error");
    } else {
      setStatus("Connected", "ok");
    }

    renderOutput(content || "<empty>");
    timestampEl.textContent = new Date().toLocaleString();
    lastPath = path;
    savePreferences();
  } catch (err) {
    setStatus("Network error", "error");
    renderOutput(String(err));
    timestampEl.textContent = new Date().toLocaleString();
  }
};

/* ----------------------------
   Rendering
---------------------------- */

const renderEndpoints = () => {
  const fragment = document.createDocumentFragment();

  endpoints.forEach((endpoint) => {
    const item = endpointTemplate.content.cloneNode(true);
    const button = item.querySelector("button");
    const label = item.querySelector(".label");
    const pathEl = item.querySelector(".path");

    label.textContent = endpoint.label;
    pathEl.textContent = endpoint.path;
    button.onclick = () => fetchPath(endpoint.path);

    fragment.appendChild(item);
  });

  endpointList.replaceChildren(fragment);
};

/* ----------------------------
   Custom & helper actions
---------------------------- */

const bindCustomRequest = () => {
  customButton.onclick = () => {
    const value = customPathInput.value.trim();
    if (!value) return;
    fetchPath(value.startsWith("/") ? value : `/${value}`);
  };
};

const bindPing = () => {
  pingButton.onclick = () => {
    baseUrlEl.value = window.location.origin;
    fetchPath("/status");
  };
};

const watchRefresh = () => {
  refreshRateEl.onchange = () => {
    savePreferences();
    if (refreshHandle) clearInterval(refreshHandle);
    const interval = Number(refreshRateEl.value);
    if (!interval || !lastPath) return;
    refreshHandle = setInterval(() => fetchPath(lastPath), interval * 1000);
  };
};

/* ----------------------------
   Initialization
---------------------------- */

const init = () => {
  loadPreferences();
  renderEndpoints();
  bindCustomRequest();
  bindPing();
  watchRefresh();

  // Default to same-origin proxy (/api)
  if (!baseUrlEl.value.trim()) {
    baseUrlEl.value = `${window.location.origin}/api`;
  }

  fetchPath("/status");
};

init();
