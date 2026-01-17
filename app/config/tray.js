/**
 * System Tray Module
 * Manages system tray icon with badge overlay and media indicators
 */

import { app, Tray, Menu, BrowserWindow, nativeImage } from "electron";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { getValue } from "./store.js";
import { launchApp, getAppList, createNewWindow } from "./appLauncher.js";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let tray = null;
let currentApp = "office";
let badgeCount = 0;
let mediaIndicator = null; // 'camera', 'microphone', 'camera-mic', 'screen-share', or null

// Icon paths for each Office application (icons are in root assets/, not app/assets/)
const iconPaths = {
  office: join(__dirname, "..", "..", "assets", "icons", "png", "32x32.png"),
  word: join(__dirname, "..", "..", "assets", "icons", "apps", "word.png"),
  excel: join(__dirname, "..", "..", "assets", "icons", "apps", "excel.png"),
  powerpoint: join(__dirname, "..", "..", "assets", "icons", "apps", "powerpoint.png"),
  outlook: join(__dirname, "..", "..", "assets", "icons", "apps", "outlook.png"),
  onedrive: join(__dirname, "..", "..", "assets", "icons", "apps", "onedrive.png"),
  onenote: join(__dirname, "..", "..", "assets", "icons", "apps", "onenote.png"),
  teams: join(__dirname, "..", "..", "assets", "icons", "apps", "teams.png"),
};

// Fallback icon path if app-specific icon not found
const fallbackIconPath = join(__dirname, "..", "..", "assets", "icons", "png", "32x32.png");

/**
 * Create the tray context menu
 * @returns {Menu} The context menu for the tray
 */
function createContextMenu() {
  const quickLaunchItems = getAppList().map((appInfo) => ({
    label: appInfo.name,
    click: () => {
      launchApp(appInfo.id);
      showMainWindow();
    },
  }));

  return Menu.buildFromTemplate([
    {
      label: "Show/Hide Window",
      click: toggleMainWindow,
    },
    { type: "separator" },
    {
      label: "Quick Launch",
      submenu: quickLaunchItems,
    },
    { type: "separator" },
    {
      label: "New Window (Personal)",
      click: () => {
        createNewWindow("personal");
      },
    },
    {
      label: "New Window (Work)",
      click: () => {
        createNewWindow("work");
      },
    },
    { type: "separator" },
    {
      label: "Quit MS-365-Electron",
      click: () => app.quit(),
    },
  ]);
}

/**
 * Toggle main window visibility
 */
function toggleMainWindow() {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    const mainWindow = windows[0];
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  }
}

/**
 * Show main window
 */
function showMainWindow() {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    const mainWindow = windows[0];
    mainWindow.show();
    mainWindow.focus();
  }
}

/**
 * Get icon path for app, with fallback
 * @param {string} appName - App name
 * @returns {string} Icon path
 */
function getIconPath(appName) {
  const path = iconPaths[appName];
  if (path) {
    try {
      if (existsSync(path)) {
        return path;
      }
    } catch {
      // Fall through to fallback
    }
  }
  return fallbackIconPath;
}

/**
 * Build tooltip text
 * @returns {string} Tooltip text
 */
function buildTooltip() {
  let tooltip = "MS 365 Electron";

  // Add current app
  if (currentApp !== "office") {
    tooltip += ` - ${currentApp.charAt(0).toUpperCase() + currentApp.slice(1)}`;
  }

  // Add badge count
  if (badgeCount > 0) {
    tooltip += ` (${badgeCount} unread)`;
  }

  // Add media indicator
  if (mediaIndicator) {
    const mediaLabels = {
      camera: " [Camera Active]",
      microphone: " [Mic Active]",
      "camera-mic": " [Camera & Mic Active]",
      "screen-share": " [Sharing Screen]",
    };
    tooltip += mediaLabels[mediaIndicator] || "";
  }

  return tooltip;
}

/**
 * Update the tray icon based on the current Office application
 * @param {string} appName - The current application name
 */
export function updateTrayIcon(appName) {
  if (!tray) return;

  // Only update if dynamic icons are enabled
  if (getValue("dynamicicons") !== "true") {
    appName = "office";
  }

  currentApp = appName;
  refreshTrayIcon();
}

/**
 * Refresh the tray icon (called after any state change)
 */
function refreshTrayIcon() {
  if (!tray) return;

  const iconPath = getIconPath(currentApp);

  try {
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      tray.setImage(icon);
    }
    tray.setToolTip(buildTooltip());
  } catch (error) {
    console.error("Failed to update tray icon:", error);
  }
}

/**
 * Update badge count on tray
 * @param {number} count - Unread count
 */
export function updateTrayBadge(count) {
  badgeCount = count;
  refreshTrayIcon();
}

/**
 * Update media indicator on tray
 * @param {string|null} indicator - 'camera', 'microphone', 'camera-mic', 'screen-share', or null
 */
export function updateMediaIndicator(indicator) {
  mediaIndicator = indicator;
  refreshTrayIcon();
}

/**
 * Initialize the system tray
 * Should be called after app.ready
 */
export function initializeTray() {
  if (tray) return; // Already initialized

  try {
    const iconPath = getIconPath("office");
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);

    tray.setToolTip("MS 365 Electron");
    tray.setContextMenu(createContextMenu());

    // Single click to show/hide main window
    tray.on("click", toggleMainWindow);

    // Listen for app changes to update icon
    app.on("office-app-changed", (appName) => {
      updateTrayIcon(appName);
    });

    // Listen for badge count changes
    app.on("badge-count-changed", (count) => {
      updateTrayBadge(count);
    });

    // Listen for media state changes
    app.on("media-state-changed", (state) => {
      if (state.camera && state.microphone) {
        updateMediaIndicator("camera-mic");
      } else if (state.camera) {
        updateMediaIndicator("camera");
      } else if (state.microphone) {
        updateMediaIndicator("microphone");
      } else if (state.screenShare) {
        updateMediaIndicator("screen-share");
      } else {
        updateMediaIndicator(null);
      }
    });

    console.log("System tray initialized");
  } catch (error) {
    console.error("Failed to initialize system tray:", error);
  }
}

/**
 * Destroy the system tray
 */
export function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

/**
 * Get the current tray instance
 * @returns {Tray | null} The tray instance
 */
export function getTray() {
  return tray;
}

/**
 * Get current tray state
 * @returns {Object} Tray state
 */
export function getTrayState() {
  return {
    currentApp,
    badgeCount,
    mediaIndicator,
  };
}

export { iconPaths };
