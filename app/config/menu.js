/**
 * Application Menu (GNOME HIG Compliant)
 * Clean, organized menu structure following GNOME Human Interface Guidelines
 */

import { app, dialog, BrowserWindow, clipboard, shell } from "electron";
import { launchApp, createNewWindow, goHome, getAppList } from "./appLauncher.js";
import { showPreferences } from "./preferences.js";
import { checkForUpdates, openExternalLink, openLogsFolder } from "./utils.js";

/**
 * Build the application menu template
 * @returns {Array} Menu template
 */
function buildMenuTemplate() {
  return [
    // File Menu
    {
      label: "File",
      submenu: [
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          click: () => createNewWindow("personal"),
        },
        {
          label: "New Window (Work Account)",
          accelerator: "CmdOrCtrl+Shift+N",
          click: () => createNewWindow("work"),
        },
        { type: "separator" },
        {
          label: "Open File...",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const result = await dialog.showOpenDialog({
              properties: ["openFile"],
              filters: [
                { name: "Office Documents", extensions: ["docx", "doc", "xlsx", "xls", "pptx", "ppt"] },
                { name: "All Files", extensions: ["*"] },
              ],
            });
            if (!result.canceled && result.filePaths.length > 0) {
              // Emit event for file handler to process
              app.emit("open-file", { preventDefault: () => {} }, result.filePaths[0]);
            }
          },
        },
        { type: "separator" },
        {
          label: "Close Window",
          accelerator: "CmdOrCtrl+W",
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused) focused.close();
          },
        },
        {
          role: "quit",
          accelerator: "CmdOrCtrl+Q",
        },
      ],
    },

    // Edit Menu
    {
      label: "Edit",
      submenu: [
        { role: "undo", accelerator: "CmdOrCtrl+Z" },
        { role: "redo", accelerator: "CmdOrCtrl+Shift+Z" },
        { type: "separator" },
        { role: "cut", accelerator: "CmdOrCtrl+X" },
        { role: "copy", accelerator: "CmdOrCtrl+C" },
        { role: "paste", accelerator: "CmdOrCtrl+V" },
        { role: "delete" },
        { type: "separator" },
        { role: "selectAll", accelerator: "CmdOrCtrl+A" },
      ],
    },

    // View Menu
    {
      label: "View",
      submenu: [
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused) focused.webContents.reload();
          },
        },
        {
          label: "Force Reload",
          accelerator: "CmdOrCtrl+Shift+R",
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused) focused.webContents.reloadIgnoringCache();
          },
        },
        { type: "separator" },
        {
          label: "Actual Size",
          accelerator: "CmdOrCtrl+0",
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused) focused.webContents.setZoomLevel(0);
          },
        },
        {
          label: "Zoom In",
          accelerator: "CmdOrCtrl+=",
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused) {
              const level = focused.webContents.getZoomLevel();
              focused.webContents.setZoomLevel(level + 0.5);
            }
          },
        },
        {
          label: "Zoom Out",
          accelerator: "CmdOrCtrl+-",
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused) {
              const level = focused.webContents.getZoomLevel();
              focused.webContents.setZoomLevel(level - 0.5);
            }
          },
        },
        { type: "separator" },
        {
          label: "Full Screen",
          accelerator: "F11",
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused) focused.setFullScreen(!focused.isFullScreen());
          },
        },
        {
          label: "Toggle Menu Bar",
          accelerator: "Alt",
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused) {
              const current = focused.isMenuBarAutoHide();
              focused.setAutoHideMenuBar(!current);
              focused.setMenuBarVisibility(current);
            }
          },
        },
      ],
    },

    // Go Menu (Navigation + Apps)
    {
      label: "Go",
      submenu: [
        {
          label: "Back",
          accelerator: "Alt+Left",
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused && focused.webContents.canGoBack()) {
              focused.webContents.goBack();
            }
          },
        },
        {
          label: "Forward",
          accelerator: "Alt+Right",
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused && focused.webContents.canGoForward()) {
              focused.webContents.goForward();
            }
          },
        },
        {
          label: "Home",
          accelerator: "Alt+Home",
          click: () => goHome(),
        },
        { type: "separator" },
        // App launchers - generated from app list
        ...getAppList().map(app => ({
          label: app.name,
          click: () => launchApp(app.id),
        })),
      ],
    },

    // Window Menu
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        {
          label: "Maximize",
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused) {
              if (focused.isMaximized()) {
                focused.unmaximize();
              } else {
                focused.maximize();
              }
            }
          },
        },
        { role: "close" },
        { type: "separator" },
        {
          label: "Copy URL to Clipboard",
          accelerator: "CmdOrCtrl+Shift+C",
          click: () => {
            const focused = BrowserWindow.getFocusedWindow();
            if (focused) {
              clipboard.writeText(focused.webContents.getURL());
            }
          },
        },
      ],
    },

    // Help Menu
    {
      label: "Help",
      submenu: [
        {
          label: "MS 365 Electron Help",
          accelerator: "F1",
          click: () => openExternalLink("https://github.com/agam778/MS-365-Electron/wiki"),
        },
        {
          label: "Keyboard Shortcuts",
          click: () => showKeyboardShortcuts(),
        },
        { type: "separator" },
        {
          label: "View Logs",
          click: () => openLogsFolder(),
        },
        {
          label: "Report Issue...",
          click: () => openExternalLink("https://github.com/agam778/MS-365-Electron/issues/new"),
        },
        { type: "separator" },
        {
          label: "Check for Updates...",
          click: () => checkForUpdates(),
        },
        {
          label: "Preferences",
          accelerator: "CmdOrCtrl+,",
          click: () => showPreferences(),
        },
        { type: "separator" },
        {
          label: "About MS 365 Electron",
          click: () => showAboutDialog(),
        },
      ],
    },
  ];
}

/**
 * Show keyboard shortcuts help dialog
 */
function showKeyboardShortcuts() {
  const shortcuts = `
Keyboard Shortcuts

Navigation
  Ctrl+R          Reload page
  Ctrl+Shift+R    Force reload
  Alt+Left        Go back
  Alt+Right       Go forward
  Alt+Home        Go to home page

Window
  Ctrl+N          New window (Personal)
  Ctrl+Shift+N    New window (Work)
  Ctrl+W          Close window
  Ctrl+Q          Quit
  F11             Toggle full screen

Zoom
  Ctrl+0          Reset zoom
  Ctrl++          Zoom in
  Ctrl+-          Zoom out

Edit
  Ctrl+Z          Undo
  Ctrl+Shift+Z    Redo
  Ctrl+X          Cut
  Ctrl+C          Copy
  Ctrl+V          Paste
  Ctrl+A          Select all

Other
  Ctrl+,          Open preferences
  Ctrl+Shift+C    Copy URL
  F1              Help
`.trim();

  dialog.showMessageBox({
    type: "info",
    title: "Keyboard Shortcuts",
    message: "MS 365 Electron Keyboard Shortcuts",
    detail: shortcuts,
    buttons: ["OK"],
  });
}

/**
 * Show about dialog
 */
async function showAboutDialog() {
  const version = app.getVersion();

  const result = await dialog.showMessageBox({
    type: "info",
    title: "About MS 365 Electron",
    message: "MS 365 Electron",
    detail: `Version ${version}\n\nA desktop client for Microsoft 365 on Linux.\n\nLicensed under MIT License.`,
    buttons: ["OK", "View on GitHub"],
  });

  if (result.response === 1) {
    openExternalLink("https://github.com/agam778/MS-365-Electron");
  }
}

// Build and export the menu template
const menulayout = buildMenuTemplate();

export default menulayout;
export { buildMenuTemplate, showKeyboardShortcuts, showAboutDialog };
