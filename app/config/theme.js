/**
 * Theme Sync Module
 * Follows system dark/light theme preference
 */

import { nativeTheme, BrowserWindow, app } from "electron";
import { getValue, setValue } from "./store.js";

let themeListenerInitialized = false;

/**
 * Get current theme preference
 * @returns {'system' | 'light' | 'dark'} Theme preference
 */
export function getThemePreference() {
  return getValue("theme") || "system";
}

/**
 * Set theme preference
 * @param {'system' | 'light' | 'dark'} theme - Theme preference
 */
export function setThemePreference(theme) {
  setValue("theme", theme);
  applyTheme(theme);
}

/**
 * Apply theme to the application
 * @param {'system' | 'light' | 'dark'} theme - Theme to apply
 */
export function applyTheme(theme) {
  switch (theme) {
    case "dark":
      nativeTheme.themeSource = "dark";
      break;
    case "light":
      nativeTheme.themeSource = "light";
      break;
    default:
      nativeTheme.themeSource = "system";
  }

  // Inject theme CSS into all windows
  injectThemeCSS();
}

/**
 * Check if system is using dark mode
 * @returns {boolean} True if dark mode
 */
export function isDarkMode() {
  return nativeTheme.shouldUseDarkColors;
}

/**
 * Get theme CSS for injection into web pages
 * This helps with scrollbars and other native elements
 */
function getThemeCSS() {
  const dark = isDarkMode();

  return `
    /* Theme-aware scrollbars */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: ${dark ? "#2d2d2d" : "#f1f1f1"};
    }

    ::-webkit-scrollbar-thumb {
      background: ${dark ? "#555" : "#c1c1c1"};
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: ${dark ? "#777" : "#a8a8a8"};
    }
  `;
}

/**
 * Inject theme CSS into all windows
 */
function injectThemeCSS() {
  BrowserWindow.getAllWindows().forEach(window => {
    if (window.webContents) {
      window.webContents.insertCSS(getThemeCSS()).catch(() => {
        // Ignore errors for windows that can't accept CSS
      });
    }
  });
}

/**
 * Initialize theme system
 * Should be called once at app startup
 */
export function initializeTheme() {
  // Apply saved theme preference
  const savedTheme = getThemePreference();
  applyTheme(savedTheme);

  // Set up listener for system theme changes
  if (!themeListenerInitialized) {
    nativeTheme.on("updated", () => {
      const preference = getThemePreference();
      if (preference === "system") {
        // Only react to system changes if we're following system theme
        injectThemeCSS();
        // Emit event for any listeners
        app.emit("theme-changed", isDarkMode() ? "dark" : "light");
      }
    });
    themeListenerInitialized = true;
  }
}

/**
 * Toggle between light and dark theme
 * If currently following system, switches to explicit light/dark
 */
export function toggleTheme() {
  const current = getThemePreference();

  if (current === "system") {
    // If following system, switch to opposite of current system theme
    setThemePreference(isDarkMode() ? "light" : "dark");
  } else if (current === "dark") {
    setThemePreference("light");
  } else {
    setThemePreference("dark");
  }
}

export { getThemeCSS };
