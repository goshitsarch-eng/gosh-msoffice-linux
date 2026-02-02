/**
 * Shared App Launcher Module
 * Centralizes all Office app launching logic to eliminate code duplication
 */

import { BrowserWindow } from "electron";
import { getValue } from "./store.js";
import { getScreenWidth, getScreenHeight } from "./dimensions.js";

// App URL configurations
const APP_URLS = {
  word: {
    personal: "https://microsoft365.com/launch/word?auth=1",
    work: "https://microsoft365.com/launch/word?auth=2",
  },
  excel: {
    personal: "https://microsoft365.com/launch/excel?auth=1",
    work: "https://microsoft365.com/launch/excel?auth=2",
  },
  powerpoint: {
    personal: "https://microsoft365.com/launch/powerpoint?auth=1",
    work: "https://microsoft365.com/launch/powerpoint?auth=2",
  },
  outlook: {
    personal: "https://outlook.live.com/mail/",
    work: "https://outlook.office.com/mail/",
  },
  onedrive: {
    personal: "https://microsoft365.com/launch/onedrive?auth=1",
    work: "https://microsoft365.com/launch/onedrive?auth=2",
  },
  onenote: {
    personal: "https://www.onenote.com/notebooks?auth=1",
    work: "https://www.onenote.com/notebooks?auth=2",
  },
  teams: {
    personal: "https://teams.live.com/",
    work: "https://teams.microsoft.com/",
  },
  allapps: {
    personal: "https://www.microsoft365.com/apps?auth=1",
    work: "https://www.microsoft365.com/apps?auth=2",
  },
  home: {
    personal: "https://microsoft365.com/?auth=1",
    work: "https://microsoft365.com/?auth=2",
  },
};

// App display names
const APP_NAMES = {
  word: "Word",
  excel: "Excel",
  powerpoint: "PowerPoint",
  outlook: "Outlook",
  onedrive: "OneDrive",
  onenote: "OneNote",
  teams: "Teams",
  allapps: "All Apps",
  home: "Home",
};

/**
 * Get the current account type
 * @returns {'personal' | 'work'} Account type
 */
export function getAccountType() {
  return getValue("enterprise-or-normal") === "?auth=2" ? "work" : "personal";
}

/**
 * Get the session partition for the current account type
 * @param {string} [accountType] - Optional override for account type
 * @returns {string} Session partition string
 */
export function getPartition(accountType) {
  const type = accountType || getAccountType();
  return type === "work" ? "persist:work" : "persist:personal";
}

/**
 * Get URL for a specific app
 * @param {string} appName - The app identifier
 * @param {string} [accountType] - Optional override for account type
 * @returns {string} The app URL
 */
export function getAppUrl(appName, accountType) {
  const type = accountType || getAccountType();
  const app = APP_URLS[appName.toLowerCase()];
  if (!app) {
    console.error(`Unknown app: ${appName}`);
    return APP_URLS.home[type];
  }
  return app[type];
}

/**
 * Get the display name for an app
 * @param {string} appName - The app identifier
 * @returns {string} Display name
 */
export function getAppDisplayName(appName) {
  return APP_NAMES[appName.toLowerCase()] || appName;
}

/**
 * Get standard window options
 * @param {object} [overrides] - Optional overrides for window options
 * @returns {object} Window creation options
 */
export function getWindowOptions(overrides = {}) {
  const windowWidth = getValue("windowWidth") || 0.71;
  const windowHeight = getValue("windowHeight") || 0.74;
  const sizeReduction = overrides.isMainWindow ? 0 : 0.07;

  return {
    width: Math.round(getScreenWidth() * (windowWidth - sizeReduction)),
    height: Math.round(getScreenHeight() * (windowHeight - sizeReduction)),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: true,
      partition: getPartition(overrides.accountType),
      ...overrides.webPreferences,
    },
    ...overrides,
  };
}

/**
 * Launch an Office app
 * @param {string} appName - The app to launch (word, excel, powerpoint, outlook, onedrive, onenote, teams, allapps)
 * @param {object} [options] - Launch options
 * @param {string} [options.accountType] - Override account type ('personal' or 'work')
 * @param {boolean} [options.forceNewWindow] - Force opening in a new window
 * @param {boolean} [options.focusedWindow] - Use focused window instead of creating new one
 * @param {string} [options.action] - Special action (e.g., 'compose' for new email)
 * @returns {BrowserWindow|null} The window containing the app, or null if loaded in existing window
 */
export function launchApp(appName, options = {}) {
  const {
    accountType = getAccountType(),
    forceNewWindow = false,
    focusedWindow = false,
    action = null,
  } = options;

  let url = getAppUrl(appName, accountType);

  // Handle special actions
  if (action === "compose" && appName.toLowerCase() === "outlook") {
    url = accountType === "work"
      ? "https://outlook.office.com/mail/deeplink/compose"
      : "https://outlook.live.com/mail/deeplink/compose";
  } else if (action === "new" && appName.toLowerCase() === "word") {
    url = accountType === "work"
      ? "https://microsoft365.com/launch/word?auth=2&action=new"
      : "https://microsoft365.com/launch/word?auth=1&action=new";
  }

  const openInNewWindow = forceNewWindow || getValue("websites-in-new-window") === "true";

  if (!openInNewWindow && !focusedWindow) {
    const focused = BrowserWindow.getFocusedWindow();
    if (focused) {
      focused.loadURL(url).catch((err) => console.warn("Failed to load URL:", err));
      return null;
    }
  }

  if (focusedWindow) {
    const focused = BrowserWindow.getFocusedWindow();
    if (focused) {
      focused.loadURL(url).catch((err) => console.warn("Failed to load URL:", err));
      return null;
    }
  }

  // Create new window
  const windowOptions = getWindowOptions({ accountType });
  const newWindow = new BrowserWindow(windowOptions);
  newWindow.loadURL(url).catch((err) => console.warn("Failed to load URL:", err));

  return newWindow;
}

/**
 * Create a new window for a specific account type
 * @param {'personal' | 'work'} accountType - The account type
 * @returns {BrowserWindow} The new window
 */
export function createNewWindow(accountType) {
  const custompage = getValue("custompage") || "home";
  const auth = accountType === "work" ? "?auth=2" : "?auth=1";
  const url = `https://microsoft365.com/${custompage}/${auth}`;

  const windowOptions = getWindowOptions({ accountType });
  const newWindow = new BrowserWindow(windowOptions);
  newWindow.loadURL(url).catch((err) => console.warn("Failed to load URL:", err));

  return newWindow;
}

/**
 * Navigate the focused window to home
 */
export function goHome() {
  const focused = BrowserWindow.getFocusedWindow();
  if (!focused) return;

  const custompage = getValue("custompage") || "home";
  const auth = getValue("enterprise-or-normal") || "?auth=1";
  focused.loadURL(`https://microsoft365.com/${custompage}/${auth}`).catch((err) => console.warn("Failed to load URL:", err));
}

/**
 * Get list of available apps for menu/tray generation
 * @returns {Array<{id: string, name: string}>}
 */
export function getAppList() {
  return [
    { id: "word", name: "Word" },
    { id: "excel", name: "Excel" },
    { id: "powerpoint", name: "PowerPoint" },
    { id: "outlook", name: "Outlook" },
    { id: "onedrive", name: "OneDrive" },
    { id: "onenote", name: "OneNote" },
    { id: "teams", name: "Teams" },
    { id: "allapps", name: "All Apps" },
  ];
}

export { APP_URLS, APP_NAMES };
