/**
 * Window Manager Module
 * Manages multiple windows with metadata tracking
 */

import { BrowserWindow, app, screen } from "electron";
import { getValue } from "./store.js";
import { getPartition, getAppUrl } from "./appLauncher.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Track all managed windows
const managedWindows = new Map();
let windowIdCounter = 0;

/**
 * Window metadata structure
 * @typedef {Object} WindowMeta
 * @property {number} id - Unique window ID
 * @property {string} appType - Current app type (word, excel, etc.)
 * @property {'personal' | 'work'} accountType - Account type
 * @property {string} url - Current URL
 * @property {Object} bounds - Window bounds
 * @property {boolean} isMaximized - Whether window is maximized
 * @property {boolean} isFullScreen - Whether window is fullscreen
 */

/**
 * Create a new managed window
 * @param {Object} options - Window creation options
 * @param {string} [options.url] - URL to load
 * @param {string} [options.appType] - App type
 * @param {'personal' | 'work'} [options.accountType] - Account type
 * @param {Object} [options.bounds] - Window bounds
 * @param {boolean} [options.isMaximized] - Start maximized
 * @param {boolean} [options.show] - Show immediately
 * @returns {BrowserWindow} The created window
 */
export function createWindow(options = {}) {
  const {
    url = null,
    appType = "home",
    accountType = getValue("enterprise-or-normal") === "?auth=2" ? "work" : "personal",
    bounds = null,
    isMaximized = false,
    show = true,
  } = options;

  const windowId = ++windowIdCounter;
  const partition = getPartition(accountType);

  // Calculate window dimensions
  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const windowWidth = getValue("windowWidth") || 0.71;
  const windowHeight = getValue("windowHeight") || 0.74;

  const defaultBounds = {
    width: Math.round(workArea.width * windowWidth),
    height: Math.round(workArea.height * windowHeight),
    x: undefined,
    y: undefined,
  };

  const windowBounds = bounds || defaultBounds;

  const window = new BrowserWindow({
    ...windowBounds,
    icon: join(__dirname, "..", "..", "assets", "icons", "png", "1024x1024.png"),
    show: false,
    autoHideMenuBar: getValue("autohide-menubar") === "true",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: true,
      partition: partition,
      preload: join(__dirname, "..", "preload.js"),
    },
  });

  // Store window metadata
  const meta = {
    id: windowId,
    appType,
    accountType,
    url: url || getAppUrl(appType, accountType),
    bounds: windowBounds,
    isMaximized,
    isFullScreen: false,
  };
  managedWindows.set(window.id, meta);

  // Load URL
  const loadUrl = url || `https://microsoft365.com/${getValue("custompage") || "home"}/${accountType === "work" ? "?auth=2" : "?auth=1"}`;
  window.loadURL(loadUrl, {
    userAgent: getValue("useragentstring"),
  });

  // Show window when ready
  window.once("ready-to-show", () => {
    if (isMaximized) {
      window.maximize();
    }
    if (show) {
      window.show();
    }
  });

  // Track window state changes
  window.on("maximize", () => {
    const meta = managedWindows.get(window.id);
    if (meta) meta.isMaximized = true;
  });

  window.on("unmaximize", () => {
    const meta = managedWindows.get(window.id);
    if (meta) meta.isMaximized = false;
  });

  window.on("enter-full-screen", () => {
    const meta = managedWindows.get(window.id);
    if (meta) meta.isFullScreen = true;
  });

  window.on("leave-full-screen", () => {
    const meta = managedWindows.get(window.id);
    if (meta) meta.isFullScreen = false;
  });

  window.on("resize", () => {
    if (!window.isMaximized() && !window.isFullScreen()) {
      const meta = managedWindows.get(window.id);
      if (meta) meta.bounds = window.getBounds();
    }
  });

  window.on("move", () => {
    if (!window.isMaximized() && !window.isFullScreen()) {
      const meta = managedWindows.get(window.id);
      if (meta) meta.bounds = window.getBounds();
    }
  });

  // Track URL changes
  window.webContents.on("did-navigate", (event, newUrl) => {
    const meta = managedWindows.get(window.id);
    if (meta) {
      meta.url = newUrl;
      meta.appType = detectAppType(newUrl);
    }
  });

  window.webContents.on("did-navigate-in-page", (event, newUrl) => {
    const meta = managedWindows.get(window.id);
    if (meta) {
      meta.url = newUrl;
      meta.appType = detectAppType(newUrl);
    }
  });

  // Clean up on close
  window.on("closed", () => {
    managedWindows.delete(window.id);
    app.emit("window-closed", windowId);
  });

  // Emit window created event
  app.emit("window-created", window, meta);

  return window;
}

/**
 * Detect app type from URL
 * @param {string} url - URL to analyze
 * @returns {string} App type
 */
function detectAppType(url) {
  const urlLower = url.toLowerCase();

  if (urlLower.includes("word") || urlLower.includes(".docx")) return "word";
  if (urlLower.includes("excel") || urlLower.includes(".xlsx")) return "excel";
  if (urlLower.includes("powerpoint") || urlLower.includes(".pptx")) return "powerpoint";
  if (urlLower.includes("outlook")) return "outlook";
  if (urlLower.includes("onedrive")) return "onedrive";
  if (urlLower.includes("onenote")) return "onenote";
  if (urlLower.includes("teams")) return "teams";

  return "home";
}

/**
 * Get all managed windows
 * @returns {Map<number, WindowMeta>} Map of window ID to metadata
 */
export function getAllWindows() {
  return managedWindows;
}

/**
 * Get metadata for a specific window
 * @param {BrowserWindow} window - The window
 * @returns {WindowMeta|undefined} Window metadata
 */
export function getWindowMeta(window) {
  return managedWindows.get(window.id);
}

/**
 * Get window count
 * @returns {number} Number of managed windows
 */
export function getWindowCount() {
  return managedWindows.size;
}

/**
 * Get windows by account type
 * @param {'personal' | 'work'} accountType - Account type
 * @returns {BrowserWindow[]} Windows for that account type
 */
export function getWindowsByAccount(accountType) {
  const windows = [];
  BrowserWindow.getAllWindows().forEach(window => {
    const meta = managedWindows.get(window.id);
    if (meta && meta.accountType === accountType) {
      windows.push(window);
    }
  });
  return windows;
}

/**
 * Get windows by app type
 * @param {string} appType - App type
 * @returns {BrowserWindow[]} Windows for that app type
 */
export function getWindowsByApp(appType) {
  const windows = [];
  BrowserWindow.getAllWindows().forEach(window => {
    const meta = managedWindows.get(window.id);
    if (meta && meta.appType === appType) {
      windows.push(window);
    }
  });
  return windows;
}

/**
 * Get session state for all windows (for session manager)
 * @returns {WindowMeta[]} Array of window metadata
 */
export function getSessionState() {
  const state = [];
  BrowserWindow.getAllWindows().forEach(window => {
    const meta = managedWindows.get(window.id);
    if (meta) {
      state.push({
        ...meta,
        bounds: window.isMaximized() ? meta.bounds : window.getBounds(),
        isMaximized: window.isMaximized(),
        isFullScreen: window.isFullScreen(),
        url: window.webContents.getURL(),
      });
    }
  });
  return state;
}

/**
 * Focus or create window for an app
 * @param {string} appType - App type
 * @param {'personal' | 'work'} [accountType] - Account type
 * @returns {BrowserWindow} The window
 */
export function focusOrCreateWindow(appType, accountType) {
  const existing = getWindowsByApp(appType);
  if (existing.length > 0) {
    const window = existing[0];
    if (window.isMinimized()) window.restore();
    window.focus();
    return window;
  }

  return createWindow({
    appType,
    accountType,
    url: getAppUrl(appType, accountType),
  });
}

export { detectAppType };
