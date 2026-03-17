const STORAGE_KEY = "colorSchemeMode";
const DEFAULT_MODE = "light";
const BADGE_COLORS = {
  dark: "#111111",
  light: "#f2f2f2"
};
const LOG_PREFIX = "[browser-color-mode-toggle]";
const TOGGLE_DEBOUNCE_MS = 500;
const DARK_MODE_CSS = `
  :root {
    color-scheme: dark !important;
    background: #111 !important;
  }

  html {
    background: #111 !important;
    filter: invert(1) hue-rotate(180deg) !important;
  }

  img,
  picture,
  video,
  canvas,
  svg,
  iframe,
  embed,
  object,
  [style*="background-image"] {
    filter: invert(1) hue-rotate(180deg) !important;
  }
`;

function log(message, details) {
  if (details === undefined) {
    console.log(LOG_PREFIX, message);
    return;
  }

  console.log(LOG_PREFIX, message, details);
}

let lastToggleRequestAt = 0;

function isSupportedUrl(url) {
  if (!url) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function isIgnorableTabAccessError(message) {
  const normalizedMessage = String(message || "").toLowerCase();
  return (
    normalizedMessage.includes("no tab with given id") ||
    normalizedMessage.includes("cannot access a chrome:// url") ||
    normalizedMessage.includes("cannot access contents of the page") ||
    normalizedMessage.includes("cannot access a chrome-extension:// url") ||
    normalizedMessage.includes("the extensions gallery cannot be scripted") ||
    normalizedMessage.includes("missing host permission for the tab") ||
    normalizedMessage.includes("frame with id 0 was removed") ||
    normalizedMessage.includes("frame with id 0 is showing error page")
  );
}

async function getMode() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const mode = stored[STORAGE_KEY] || DEFAULT_MODE;
  log("Loaded mode from storage", { mode, stored });
  return mode;
}

async function setMode(mode) {
  log("Persisting mode", { mode });
  await chrome.storage.local.set({ [STORAGE_KEY]: mode });
  await updateBadge(mode);
}

async function updateBadge(mode) {
  log("Updating badge", { mode });
  await chrome.action.setBadgeText({ text: mode === "dark" ? "D" : "L" });
  await chrome.action.setBadgeBackgroundColor({
    color: BADGE_COLORS[mode] || BADGE_COLORS.light
  });
  await chrome.action.setTitle({
    title: `Current color scheme override: ${mode}. Click to toggle.`
  });
}

async function applyModeToTab(tabId, mode) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!isSupportedUrl(tab.url)) {
      log("Skipping unsupported tab", { tabId, url: tab.url });
      return;
    }

    if (mode === "dark") {
      log("Applying dark mode to tab", { tabId, url: tab.url });
      await chrome.scripting.insertCSS({
        target: { tabId },
        css: DARK_MODE_CSS
      });
      return;
    }

    log("Removing dark mode from tab", { tabId, url: tab.url });
    await chrome.scripting.removeCSS({
      target: { tabId },
      css: DARK_MODE_CSS
    });
  } catch (error) {
    const message = error?.message || String(error) || "";
    if (isIgnorableTabAccessError(message)) {
      log("Ignoring tab access error", { tabId, mode, message });
      return;
    }

    console.error(`Failed to apply ${mode} mode to tab ${tabId}:`, error);
  }
}

async function applyModeToAllTabs(mode) {
  const tabs = await chrome.tabs.query({
    url: ["http://*/*", "https://*/*"]
  });
  log("Applying mode to all tabs", {
    mode,
    tabCount: tabs.length,
    tabIds: tabs.map((tab) => tab.id)
  });
  await Promise.all(tabs.map((tab) => applyModeToTab(tab.id, mode)));
}

async function toggleMode() {
  const currentMode = await getMode();
  const nextMode = currentMode === "dark" ? "light" : "dark";
  log("Toggling mode", { currentMode, nextMode });
  await setMode(nextMode);
  await applyModeToAllTabs(nextMode);
}

async function handleToggleRequest(source) {
  const now = Date.now();
  if (now - lastToggleRequestAt < TOGGLE_DEBOUNCE_MS) {
    log("Ignoring duplicate toggle request", {
      source,
      sinceLastMs: now - lastToggleRequestAt
    });
    return;
  }

  lastToggleRequestAt = now;
  log("Handling toggle request", { source });
  await toggleMode();
}

log("Service worker script evaluated");

chrome.runtime.onInstalled.addListener(async () => {
  log("runtime.onInstalled fired");
  const mode = await getMode();
  await setMode(mode);
  await applyModeToAllTabs(mode);
});

chrome.runtime.onStartup.addListener(async () => {
  log("runtime.onStartup fired");
  const mode = await getMode();
  await setMode(mode);
  await applyModeToAllTabs(mode);
});

chrome.action.onClicked.addListener(async () => {
  log("action.onClicked fired");
  await handleToggleRequest("action");
});

chrome.commands.onCommand.addListener(async (command) => {
  log("commands.onCommand fired", { command });
  if (command === "toggle-color-scheme") {
    await handleToggleRequest("command");
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log("runtime.onMessage fired", {
    message,
    url: sender.tab?.url
  });

  if (message?.type !== "toggle-color-scheme-shortcut") {
    return false;
  }

  handleToggleRequest(message.source || "message")
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      console.error("Failed to handle toggle request:", error);
      sendResponse({ ok: false, error: error?.message || String(error) });
    });

  return true;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  log("tabs.onUpdated fired", {
    tabId,
    status: changeInfo.status,
    url: tab.url
  });
  if (changeInfo.status !== "complete" || !isSupportedUrl(tab.url)) {
    return;
  }

  const mode = await getMode();
  await applyModeToTab(tabId, mode);
});
