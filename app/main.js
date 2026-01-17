/**
 * MS 365 Electron - Main Process
 * Desktop client for Microsoft 365 on Linux
 */

import { app, Menu, BrowserWindow, dialog, shell, ipcMain, session } from "electron";
import { ElectronBlocker } from "@cliqz/adblocker-electron";
import { setValue, getValue } from "./config/store.js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Configuration imports
import { getScreenWidth, getScreenHeight } from "./config/dimensions.js";
import { configureWayland, getDisplayServer, configureScreenSharing, setupDesktopCapturerHandler } from "./config/wayland.js";
import { configureElectronPaths, initializeXdgDirs } from "./config/xdg.js";
import { initializeTray, destroyTray } from "./config/tray.js";
import { getOptimalUserAgent } from "./config/arch.js";
import { clearActivity, setActivity, loginToRPC } from "./config/rpc.js";

// New feature imports
import { processCLI, getAppForFile } from "./config/cli.js";
import { initializeTheme, getThemeCSS } from "./config/theme.js";
import { initPreferencesIPC } from "./config/preferences.js";
import { initializeSessionManager, restoreSession, saveSession } from "./config/sessionManager.js";
import { initNotificationIPC, injectNotificationObserver } from "./config/notifications.js";
import { initializeBadge, setTrayRef } from "./config/badge.js";
import { initializeFileHandler } from "./config/fileHandler.js";
import { initializeHotkeyManager } from "./config/hotkeyManager.js";
import { initializePowerManagement, injectCallDetection } from "./config/power.js";
import { initializeMediaState, injectMediaStateTracking } from "./config/mediaState.js";
import { initializeDropHandler, injectDropHandler } from "./config/dropHandler.js";
import { launchApp, getAppUrl, getAccountType } from "./config/appLauncher.js";

import useragents from "./useragents.json" with { type: "json" };
import domains from "./domains.json" with { type: "json" };
import checkInternetConnected from "check-internet-connected";
import contextMenu from "electron-context-menu";
import updaterpkg from "electron-updater";
import ElectronDl from "electron-dl";
import menulayout from "./config/menu.js";
import logpkg from "electron-log";

// Configure XDG paths and Wayland BEFORE app.ready
configureElectronPaths();
configureWayland();

// Set app name and WM class for GNOME/Wayland taskbar icon matching
app.setName("MS-365-Electron");
if (process.platform === "linux") {
  app.setDesktopName("ms-365-electron.desktop");
  // Set WM class to match StartupWMClass in .desktop file
  app.commandLine.appendSwitch("class", "ms-365-electron");
  app.commandLine.appendSwitch("name", "ms-365-electron");
}

const { transports, log: _log, functions } = logpkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { autoUpdater } = updaterpkg;

// Configure logging
transports.file.level = "verbose";
console.log = _log;
Object.assign(console, functions);

console.log(`Display server: ${getDisplayServer()}`);

// Track whether the app is quitting (for minimize to tray feature)
let isQuitting = false;

// Process CLI arguments early
const cliConfig = processCLI();
if (cliConfig.exit) {
  app.exit(cliConfig.code);
}

/**
 * Create the main application window
 */
function createWindow() {
  const enterpriseOrNormal = getValue("enterprise-or-normal");
  const custompage = getValue("custompage") || "home";
  const partition = enterpriseOrNormal === "?auth=1" ? "persist:personal" : "persist:work";

  const win = new BrowserWindow({
    width: Math.round(getScreenWidth() * getValue("windowWidth")),
    height: Math.round(getScreenHeight() * getValue("windowHeight")),
    icon: join(__dirname, "..", "assets", "icons", "png", "1024x1024.png"),
    show: false,
    autoHideMenuBar: getValue("autohide-menubar") === "true",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: true,
      partition: partition,
      preload: join(__dirname, "preload.js"),
    },
  });

  // Handle CLI startup options
  let startUrl = `https://microsoft365.com/${custompage}/${enterpriseOrNormal}`;

  if (cliConfig.startupApp) {
    const accountType = cliConfig.accountType || getAccountType();
    startUrl = getAppUrl(cliConfig.startupApp, accountType);
  }

  // Create splash screen
  const splash = new BrowserWindow({
    width: Math.round(getScreenWidth() * 0.49),
    height: Math.round(getScreenHeight() * 0.65),
    transparent: true,
    frame: false,
    icon: join(__dirname, "..", "assets", "icons", "png", "1024x1024.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  splash.loadURL("https://agam778.github.io/MS-365-Electron/loading");

  win.loadURL(startUrl, {
    userAgent: getValue("useragentstring") || getOptimalUserAgent(),
  });

  // Handle minimize to tray on close for main window
  win.on("close", (e) => {
    if (!isQuitting && getValue("minimizeToTray") === true) {
      e.preventDefault();
      win.hide();
    }
  });

  win.webContents.on("did-finish-load", () => {
    splash.destroy();

    // Check if should start minimized
    if (getValue("startMinimized") !== true) {
      win.show();
    }

    if (getValue("discordrpcstatus") === "true") {
      setActivity(`On "${win.webContents.getTitle()}"`);
    }

    if (getValue("blockadsandtrackers") === "true") {
      ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
        blocker.enableBlockingInSession(win.webContents.session);
      });
    }

    // Inject feature scripts
    injectNotificationObserver(win);
    injectCallDetection(win);
    injectMediaStateTracking(win);
    injectDropHandler(win);
  });

  return win;
}

// Configure downloads
ElectronDl({
  dlPath: "./downloads",
  onStarted: (item) => {
    dialog.showMessageBox({
      type: "info",
      title: "Downloading File",
      message: `Downloading "${item.getFilename()}" to "${item.getSavePath()}"`,
      buttons: ["OK"],
    });
  },
  onCompleted: () => {
    dialog.showMessageBox({
      type: "info",
      title: "Download Completed",
      message: 'Download completed! Please check your "Downloads" folder.',
      buttons: ["OK"],
    });
  },
  onError: (item) => {
    dialog.showMessageBox({
      type: "error",
      title: "Download Failed",
      message: `Downloading "${item.getFilename()}" failed.`,
      buttons: ["OK"],
    });
  },
});

// Context menu
contextMenu({
  showInspectElement: false,
  showServices: false,
});

// Set application menu
Menu.setApplicationMenu(Menu.buildFromTemplate(menulayout));

/**
 * App ready handler - initialize all modules
 */
app.on("ready", () => {
  // Set user agent at session level for all partitions
  const userAgent = getValue("useragentstring") || getOptimalUserAgent();
  session.defaultSession.setUserAgent(userAgent);
  session.fromPartition("persist:personal").setUserAgent(userAgent);
  session.fromPartition("persist:work").setUserAgent(userAgent);

  // Initialize XDG directories
  initializeXdgDirs();

  // Initialize system tray
  initializeTray();

  // Initialize theme system
  initializeTheme();

  // Initialize IPC handlers
  initPreferencesIPC();
  initNotificationIPC();
  setupDesktopCapturerHandler();

  // Initialize feature modules
  initializeBadge();
  initializeFileHandler();
  initializeHotkeyManager();
  initializePowerManagement();
  initializeMediaState();
  initializeDropHandler();
  initializeSessionManager();

  // Configure screen sharing permissions
  configureScreenSharing();

  // Try to restore previous session
  const sessionRestored = restoreSession();

  // Create main window if session not restored
  if (!sessionRestored) {
    createWindow();
  }

  // Check internet connectivity
  checkInternetConnected().catch(() => {
    dialog.showMessageBox(null, {
      type: "warning",
      buttons: ["OK"],
      title: "Warning",
      message: "You appear to be offline!",
      detail: "Please check your Internet Connectivity. This app cannot run without an Internet Connection!",
    });
  });

  // Auto updater
  if (getValue("autoupdater") === "true") {
    autoUpdater.checkForUpdatesAndNotify();
  }

  // Discord RPC
  if (getValue("discordrpcstatus") === "true") {
    loginToRPC();
    setActivity("Opening Microsoft 365...");
  }
});

/**
 * Handle new window creation and external links
 */
app.on("web-contents-created", (event, contents) => {
  const windowWidth = getValue("windowWidth");
  const windowHeight = getValue("windowHeight");

  contents.setWindowOpenHandler(({ url }) => {
    const urlObject = new URL(url);
    const domain = urlObject.hostname;
    const protocol = urlObject.protocol;

    if (getValue("externalLinks") === "true") {
      if (protocol === "http:" || protocol === "https:") {
        const isAllowedDomain = domains.domains.some((allowedDomain) =>
          new RegExp(`^${allowedDomain.replace("*.", ".*")}$`).test(domain)
        );

        if (isAllowedDomain) {
          if (getValue("websites-in-new-window") === "false") {
            if (url.includes("page=Download")) return { action: "allow" };
            const focused = BrowserWindow.getFocusedWindow();
            if (focused) focused.loadURL(url).catch(() => {});
            if (getValue("discordrpcstatus") === "true" && focused) {
              setActivity(`On "${focused.webContents.getTitle()}"`);
            }
            return { action: "deny" };
          } else {
            if (getValue("discordrpcstatus") === "true") {
              const focused = BrowserWindow.getFocusedWindow();
              if (focused) setActivity(`On "${focused.webContents.getTitle()}"`);
            }
            return {
              action: "allow",
              overrideBrowserWindowOptions: {
                width: Math.round(getScreenWidth() * (windowWidth - 0.07)),
                height: Math.round(getScreenHeight() * (windowHeight - 0.07)),
              },
            };
          }
        } else {
          shell.openExternal(url);
          return { action: "deny" };
        }
      } else {
        return { action: "deny" };
      }
    } else {
      if (getValue("websites-in-new-window") === "false") {
        if (url.includes("page=Download")) return { action: "allow" };
        const focused = BrowserWindow.getFocusedWindow();
        if (focused) focused.loadURL(url).catch(() => {});
        if (getValue("discordrpcstatus") === "true" && focused) {
          setActivity(`On "${focused.webContents.getTitle()}"`);
        }
        return { action: "deny" };
      } else {
        if (getValue("discordrpcstatus") === "true") {
          const focused = BrowserWindow.getFocusedWindow();
          if (focused) setActivity(`On "${focused.webContents.getTitle()}"`);
        }
        return {
          action: "allow",
          overrideBrowserWindowOptions: {
            width: Math.round(getScreenWidth() * (windowWidth - 0.07)),
            height: Math.round(getScreenHeight() * (windowHeight - 0.07)),
          },
        };
      }
    }
  });

  // Page load handler
  contents.on("did-finish-load", () => {
    // Dynamic icons detection
    if (getValue("dynamicicons") === "true") {
      const focused = BrowserWindow.getFocusedWindow();
      if (focused) {
        const url = focused.webContents.getURL();
        const title = focused.webContents.getTitle();
        let currentApp = "office";

        if (url.includes("&ithint=file%2cpptx") || title.includes(".pptx")) {
          currentApp = "powerpoint";
        } else if (url.includes("&ithint=file%2cdocx") || title.includes(".docx")) {
          currentApp = "word";
        } else if (url.includes("&ithint=file%2cxlsx") || title.includes(".xlsx")) {
          currentApp = "excel";
        } else if (url.includes("outlook.live.com") || url.includes("outlook.office.com")) {
          currentApp = "outlook";
        } else if (url.includes("onedrive.live.com") || url.includes("onedrive.aspx")) {
          currentApp = "onedrive";
        } else if (url.includes("teams.live.com") || url.includes("teams.microsoft.com")) {
          currentApp = "teams";
        } else if (url.includes("&ithint=onenote") || url.includes("onenote.com")) {
          currentApp = "onenote";
        }

        app.emit("office-app-changed", currentApp);
      }
    }

    // Remove Outlook ads
    BrowserWindow.getAllWindows().forEach((window) => {
      if (window.webContents.getURL().includes("outlook.live.com")) {
        window.webContents.executeJavaScript(`
          const observer = new MutationObserver((mutationsList) => {
            let adElementFound = false;
            for (const mutation of mutationsList) {
              if (mutation.type === 'childList') {
                const adElement = document.querySelector('div.GssDD');
                if (adElement) {
                  adElement.remove();
                  adElementFound = true;
                }
              }
            }
            if (adElementFound) {
              observer.disconnect();
            }
          });

          observer.observe(document.body, { childList: true, subtree: true });

          const adElement = document.querySelector('div.GssDD');
          if (adElement) {
            adElement.remove();
            observer.disconnect();
          }
        `).catch(() => {});
      }
    });

    // Inject theme CSS
    contents.insertCSS(getThemeCSS());

    // Inject feature scripts for new windows
    const window = BrowserWindow.fromWebContents(contents);
    if (window) {
      injectNotificationObserver(window);
      injectCallDetection(window);
      injectMediaStateTracking(window);
      injectDropHandler(window);
    }
  });
});

/**
 * Handle new browser window creation
 */
app.on("browser-window-created", (event, window) => {
  window.setAutoHideMenuBar(getValue("autohide-menubar") === "true");

  window.webContents.on("did-finish-load", () => {
    if (getValue("discordrpcstatus") === "true") {
      setActivity(`On "${window.webContents.getTitle()}"`);
    }
  });

  // Handle minimize to tray on close
  window.on("close", (e) => {
    if (!isQuitting && getValue("minimizeToTray") === true) {
      e.preventDefault();
      window.hide();
    }
  });

  if (getValue("blockadsandtrackers") === "true") {
    ElectronBlocker.fromPrebuiltAdsAndTracking(fetch).then((blocker) => {
      blocker.enableBlockingInSession(window.webContents.session);
    });
  }
});

/**
 * Handle all windows closed
 */
app.on("window-all-closed", () => {
  // Don't quit if minimize to tray is enabled - windows are just hidden
  if (getValue("minimizeToTray") === true) {
    return;
  }
  clearActivity();
  destroyTray();
  app.quit();
});

/**
 * Handle before quit - save session
 */
app.on("before-quit", () => {
  isQuitting = true;
  saveSession();
});

/**
 * IPC Handlers for app info
 */
ipcMain.handle("app:getVersion", () => app.getVersion());
ipcMain.handle("app:getArchitecture", () => process.arch);
ipcMain.handle("app:isWayland", () => getDisplayServer() === "wayland");
