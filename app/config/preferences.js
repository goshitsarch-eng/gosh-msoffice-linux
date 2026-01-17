/**
 * Preferences Window
 * GTK-style preferences dialog for MS-365-Electron
 */

import { BrowserWindow, ipcMain, nativeTheme, app } from "electron";
import { getValue, setValue } from "./store.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let preferencesWindow = null;

/**
 * Get all current preferences as an object
 * @returns {object} All preferences
 */
export function getAllPreferences() {
  return {
    // Account
    accountType: getValue("enterprise-or-normal") === "?auth=2" ? "work" : "personal",

    // Startup
    restoreSession: getValue("restoreSession") === true,
    startMinimized: getValue("startMinimized") === true,
    minimizeToTray: getValue("minimizeToTray") === true,

    // Home Page
    customPage: getValue("custompage") || "home",

    // Window
    windowSize: getWindowSizePreset(),
    customWindowSize: getValue("customWindowSize") === true,
    windowWidth: getValue("windowWidth") || 0.71,
    windowHeight: getValue("windowHeight") || 0.74,
    openInNewWindow: getValue("websites-in-new-window") === "true",
    autoHideMenuBar: getValue("autohide-menubar") === "true",

    // Theme
    theme: getValue("theme") || "system",

    // Privacy
    blockAdsAndTrackers: getValue("blockadsandtrackers") === "true",
    externalLinks: getValue("externalLinks") === "true",

    // Network
    userAgent: getValue("useragentstring"),

    // Advanced
    discordRpc: getValue("discordrpcstatus") === "true",
    autoUpdates: getValue("autoupdater") === "true",
    dynamicIcons: getValue("dynamicicons") === "true",
    globalHotkeys: getValue("globalHotkeys") === true,

    // System info
    systemTheme: nativeTheme.shouldUseDarkColors ? "dark" : "light",
  };
}

/**
 * Get window size preset from stored values
 */
function getWindowSizePreset() {
  if (getValue("customWindowSize") === true) return "custom";
  const width = getValue("windowWidth");
  const height = getValue("windowHeight");

  if (width === 0.71 && height === 0.74) return "default";
  if (width === 0.6 && height === 0.6) return "60";
  if (width === 0.7 && height === 0.7) return "70";
  if (width === 0.8 && height === 0.8) return "80";
  if (width === 0.9 && height === 0.9) return "90";
  if (width === 1 && height === 1) return "100";

  return "default";
}

/**
 * Apply a preference change
 * @param {string} key - Preference key
 * @param {any} value - New value
 * @returns {{success: boolean, requiresRestart: boolean}}
 */
export function setPreference(key, value) {
  let requiresRestart = false;

  switch (key) {
    case "accountType":
      setValue("enterprise-or-normal", value === "work" ? "?auth=2" : "?auth=1");
      requiresRestart = true;
      break;

    case "restoreSession":
      setValue("restoreSession", value);
      break;

    case "startMinimized":
      setValue("startMinimized", value);
      break;

    case "minimizeToTray":
      setValue("minimizeToTray", value);
      break;

    case "customPage":
      setValue("custompage", value);
      requiresRestart = true;
      break;

    case "windowSize":
      if (value === "custom") {
        setValue("customWindowSize", true);
      } else {
        setValue("customWindowSize", false);
        const sizeMap = {
          default: { w: 0.71, h: 0.74 },
          "60": { w: 0.6, h: 0.6 },
          "70": { w: 0.7, h: 0.7 },
          "80": { w: 0.8, h: 0.8 },
          "90": { w: 0.9, h: 0.9 },
          "100": { w: 1, h: 1 },
        };
        const size = sizeMap[value] || sizeMap.default;
        setValue("windowWidth", size.w);
        setValue("windowHeight", size.h);
      }
      requiresRestart = true;
      break;

    case "customWindowWidth":
      setValue("windowWidth", value);
      setValue("customWindowSize", true);
      requiresRestart = true;
      break;

    case "customWindowHeight":
      setValue("windowHeight", value);
      setValue("customWindowSize", true);
      requiresRestart = true;
      break;

    case "openInNewWindow":
      setValue("websites-in-new-window", value ? "true" : "false");
      break;

    case "autoHideMenuBar":
      setValue("autohide-menubar", value ? "true" : "false");
      requiresRestart = true;
      break;

    case "theme":
      setValue("theme", value);
      if (value === "dark") {
        nativeTheme.themeSource = "dark";
      } else if (value === "light") {
        nativeTheme.themeSource = "light";
      } else {
        nativeTheme.themeSource = "system";
      }
      break;

    case "blockAdsAndTrackers":
      setValue("blockadsandtrackers", value ? "true" : "false");
      break;

    case "externalLinks":
      setValue("externalLinks", value ? "true" : "false");
      break;

    case "userAgent":
      setValue("useragentstring", value);
      requiresRestart = true;
      break;

    case "discordRpc":
      setValue("discordrpcstatus", value ? "true" : "false");
      break;

    case "autoUpdates":
      setValue("autoupdater", value ? "true" : "false");
      break;

    case "dynamicIcons":
      setValue("dynamicicons", value ? "true" : "false");
      break;

    case "globalHotkeys":
      setValue("globalHotkeys", value);
      break;

    default:
      console.warn(`Unknown preference key: ${key}`);
      return { success: false, requiresRestart: false };
  }

  return { success: true, requiresRestart };
}

/**
 * Generate HTML for preferences window
 */
function getPreferencesHTML() {
  const prefs = getAllPreferences();
  const isDark = nativeTheme.shouldUseDarkColors;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
  <title>Preferences</title>
  <style>
    :root {
      --bg-primary: ${isDark ? "#1e1e1e" : "#fafafa"};
      --bg-secondary: ${isDark ? "#2d2d2d" : "#ffffff"};
      --bg-hover: ${isDark ? "#3d3d3d" : "#f0f0f0"};
      --text-primary: ${isDark ? "#ffffff" : "#1a1a1a"};
      --text-secondary: ${isDark ? "#b0b0b0" : "#666666"};
      --border-color: ${isDark ? "#404040" : "#e0e0e0"};
      --accent-color: #0078d4;
      --accent-hover: #106ebe;
      --sidebar-width: 180px;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
      font-size: 14px;
      background: var(--bg-primary);
      color: var(--text-primary);
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    .sidebar {
      width: var(--sidebar-width);
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      padding: 16px 8px;
      flex-shrink: 0;
    }

    .sidebar-item {
      padding: 10px 16px;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 4px;
      transition: background 0.15s;
    }

    .sidebar-item:hover {
      background: var(--bg-hover);
    }

    .sidebar-item.active {
      background: var(--accent-color);
      color: white;
    }

    .content {
      flex: 1;
      padding: 24px 32px;
      overflow-y: auto;
    }

    .content h2 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 24px;
    }

    .section {
      display: none;
    }

    .section.active {
      display: block;
    }

    .setting-group {
      margin-bottom: 24px;
    }

    .setting-group h3 {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }

    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-color);
    }

    .setting-row:last-child {
      border-bottom: none;
    }

    .setting-label {
      flex: 1;
    }

    .setting-label .title {
      font-weight: 500;
    }

    .setting-label .description {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .setting-control {
      margin-left: 16px;
    }

    /* Toggle Switch */
    .toggle {
      position: relative;
      width: 44px;
      height: 24px;
    }

    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--border-color);
      border-radius: 24px;
      transition: 0.2s;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.2s;
    }

    .toggle input:checked + .toggle-slider {
      background: var(--accent-color);
    }

    .toggle input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }

    /* Radio Group */
    .radio-group {
      display: flex;
      gap: 16px;
    }

    .radio-option {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }

    .radio-option input {
      width: 18px;
      height: 18px;
      accent-color: var(--accent-color);
    }

    /* Select */
    select {
      padding: 8px 12px;
      font-size: 14px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      min-width: 150px;
      cursor: pointer;
    }

    select:focus {
      outline: none;
      border-color: var(--accent-color);
    }

    /* Restart notice */
    .restart-notice {
      display: none;
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--accent-color);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 100;
    }

    .restart-notice.show {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .restart-notice button {
      background: white;
      color: var(--accent-color);
      border: none;
      padding: 6px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <nav class="sidebar">
    <div class="sidebar-item active" data-section="general">General</div>
    <div class="sidebar-item" data-section="apps">Apps</div>
    <div class="sidebar-item" data-section="privacy">Privacy</div>
    <div class="sidebar-item" data-section="network">Network</div>
    <div class="sidebar-item" data-section="advanced">Advanced</div>
  </nav>

  <main class="content">
    <!-- General Section -->
    <section id="general" class="section active">
      <h2>General</h2>

      <div class="setting-group">
        <h3>Account</h3>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Account Type</div>
            <div class="description">Choose which Microsoft account to use</div>
          </div>
          <div class="setting-control">
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" name="accountType" value="personal" ${prefs.accountType === "personal" ? "checked" : ""}>
                Personal
              </label>
              <label class="radio-option">
                <input type="radio" name="accountType" value="work" ${prefs.accountType === "work" ? "checked" : ""}>
                Work/School
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="setting-group">
        <h3>Startup</h3>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Restore previous session</div>
            <div class="description">Reopen windows from your last session</div>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" data-pref="restoreSession" ${prefs.restoreSession ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Start minimized to tray</div>
            <div class="description">Start the app in the system tray</div>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" data-pref="startMinimized" ${prefs.startMinimized ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Minimize to tray on close</div>
            <div class="description">Hide to tray instead of quitting when closing</div>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" data-pref="minimizeToTray" ${prefs.minimizeToTray ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="setting-group">
        <h3>Home Page</h3>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Default home page</div>
            <div class="description">Page to show when the app starts</div>
          </div>
          <div class="setting-control">
            <select data-pref="customPage">
              <option value="home" ${prefs.customPage === "home" ? "selected" : ""}>Home</option>
              <option value="create" ${prefs.customPage === "create" ? "selected" : ""}>Create</option>
              <option value="mycontent" ${prefs.customPage === "mycontent" ? "selected" : ""}>My Content</option>
              <option value="apps" ${prefs.customPage === "apps" ? "selected" : ""}>Apps</option>
            </select>
          </div>
        </div>
      </div>

      <div class="setting-group">
        <h3>Window</h3>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Window size</div>
            <div class="description">Default size for new windows</div>
          </div>
          <div class="setting-control">
            <select data-pref="windowSize">
              <option value="default" ${prefs.windowSize === "default" ? "selected" : ""}>Default (71%)</option>
              <option value="60" ${prefs.windowSize === "60" ? "selected" : ""}>60%</option>
              <option value="70" ${prefs.windowSize === "70" ? "selected" : ""}>70%</option>
              <option value="80" ${prefs.windowSize === "80" ? "selected" : ""}>80%</option>
              <option value="90" ${prefs.windowSize === "90" ? "selected" : ""}>90%</option>
              <option value="100" ${prefs.windowSize === "100" ? "selected" : ""}>100% (Maximize)</option>
            </select>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Auto-hide menu bar</div>
            <div class="description">Press Alt to show menu bar</div>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" data-pref="autoHideMenuBar" ${prefs.autoHideMenuBar ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="setting-group">
        <h3>Theme</h3>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Appearance</div>
            <div class="description">Choose your preferred theme</div>
          </div>
          <div class="setting-control">
            <div class="radio-group">
              <label class="radio-option">
                <input type="radio" name="theme" value="system" ${prefs.theme === "system" ? "checked" : ""}>
                System
              </label>
              <label class="radio-option">
                <input type="radio" name="theme" value="light" ${prefs.theme === "light" ? "checked" : ""}>
                Light
              </label>
              <label class="radio-option">
                <input type="radio" name="theme" value="dark" ${prefs.theme === "dark" ? "checked" : ""}>
                Dark
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Apps Section -->
    <section id="apps" class="section">
      <h2>Apps</h2>

      <div class="setting-group">
        <h3>Window Behavior</h3>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Open links in new windows</div>
            <div class="description">Open Office apps in separate windows</div>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" data-pref="openInNewWindow" ${prefs.openInNewWindow ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="setting-group">
        <h3>Appearance</h3>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Dynamic icons</div>
            <div class="description">Change tray icon based on active app</div>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" data-pref="dynamicIcons" ${prefs.dynamicIcons ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </section>

    <!-- Privacy Section -->
    <section id="privacy" class="section">
      <h2>Privacy</h2>

      <div class="setting-group">
        <h3>Content Blocking</h3>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Block ads and trackers</div>
            <div class="description">Block advertising and tracking scripts</div>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" data-pref="blockAdsAndTrackers" ${prefs.blockAdsAndTrackers ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="setting-group">
        <h3>External Links</h3>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Open external links in browser</div>
            <div class="description">Non-Microsoft links open in your default browser</div>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" data-pref="externalLinks" ${prefs.externalLinks ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </section>

    <!-- Network Section -->
    <section id="network" class="section">
      <h2>Network</h2>

      <div class="setting-group">
        <h3>User Agent</h3>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Browser identification</div>
            <div class="description">How the app identifies itself to websites</div>
          </div>
          <div class="setting-control">
            <select data-pref="userAgent">
              <option value="Linux_x86_64">Linux x86_64</option>
              <option value="Linux_aarch64">Linux aarch64</option>
            </select>
          </div>
        </div>
      </div>
    </section>

    <!-- Advanced Section -->
    <section id="advanced" class="section">
      <h2>Advanced</h2>

      <div class="setting-group">
        <h3>Updates</h3>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Automatic updates</div>
            <div class="description">Check for and install updates automatically</div>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" data-pref="autoUpdates" ${prefs.autoUpdates ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="setting-group">
        <h3>Integrations</h3>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Discord Rich Presence</div>
            <div class="description">Show current activity in Discord</div>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" data-pref="discordRpc" ${prefs.discordRpc ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-label">
            <div class="title">Global keyboard shortcuts</div>
            <div class="description">System-wide shortcuts to launch apps (X11 only)</div>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" data-pref="globalHotkeys" ${prefs.globalHotkeys ? "checked" : ""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </section>
  </main>

  <div class="restart-notice" id="restartNotice">
    <span>Restart required to apply changes</span>
    <button onclick="window.electronAPI.send('preferences:restart')">Restart Now</button>
  </div>

  <script>
    // Sidebar navigation
    document.querySelectorAll('.sidebar-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

        item.classList.add('active');
        document.getElementById(item.dataset.section).classList.add('active');
      });
    });

    // Handle preference changes
    let needsRestart = false;

    function showRestartNotice() {
      document.getElementById('restartNotice').classList.add('show');
    }

    // Toggle switches
    document.querySelectorAll('.toggle input').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const pref = e.target.dataset.pref;
        const value = e.target.checked;
        window.electronAPI.invoke('preferences:set', { key: pref, value }).then(result => {
          if (result.requiresRestart) {
            showRestartNotice();
          }
        });
      });
    });

    // Selects
    document.querySelectorAll('select[data-pref]').forEach(select => {
      select.addEventListener('change', (e) => {
        const pref = e.target.dataset.pref;
        const value = e.target.value;
        window.electronAPI.invoke('preferences:set', { key: pref, value }).then(result => {
          if (result.requiresRestart) {
            showRestartNotice();
          }
        });
      });
    });

    // Radio buttons
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const pref = e.target.name;
        const value = e.target.value;
        window.electronAPI.invoke('preferences:set', { key: pref, value }).then(result => {
          if (result.requiresRestart) {
            showRestartNotice();
          }
        });
      });
    });
  </script>
</body>
</html>
`;
}

/**
 * Create and show the preferences window
 */
export function showPreferences() {
  // If window already exists, focus it
  if (preferencesWindow && !preferencesWindow.isDestroyed()) {
    preferencesWindow.focus();
    return preferencesWindow;
  }

  preferencesWindow = new BrowserWindow({
    width: 700,
    height: 620,
    minWidth: 600,
    minHeight: 520,
    title: "Preferences",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: join(__dirname, "..", "preload.js"),
    },
  });

  // Load preferences HTML
  preferencesWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getPreferencesHTML())}`);

  preferencesWindow.on("closed", () => {
    preferencesWindow = null;
  });

  return preferencesWindow;
}

/**
 * Initialize IPC handlers for preferences
 */
export function initPreferencesIPC() {
  ipcMain.handle("preferences:get", () => {
    return getAllPreferences();
  });

  ipcMain.handle("preferences:set", (event, { key, value }) => {
    return setPreference(key, value);
  });

  ipcMain.on("preferences:restart", () => {
    app.relaunch();
    app.exit(0);
  });
}

/**
 * Get the preferences window instance
 */
export function getPreferencesWindow() {
  return preferencesWindow;
}
