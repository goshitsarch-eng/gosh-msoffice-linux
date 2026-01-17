/**
 * Session Manager Module
 * Saves and restores window state across app restarts
 */

import { app } from "electron";
import { getValue, setValue } from "./store.js";
import { createWindow, getSessionState } from "./windowManager.js";
import { getDataDir } from "./xdg.js";
import { join } from "path";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";

const SESSION_FILE = "session.json";

/**
 * Get path to session file
 * @returns {string} Session file path
 */
function getSessionFilePath() {
  return join(getDataDir(), SESSION_FILE);
}

/**
 * Save current session state
 */
export function saveSession() {
  if (getValue("restoreSession") !== true) {
    return;
  }

  try {
    const state = getSessionState();
    const sessionData = {
      version: 1,
      timestamp: Date.now(),
      windows: state,
    };

    writeFileSync(getSessionFilePath(), JSON.stringify(sessionData, null, 2));
    console.log(`Session saved: ${state.length} windows`);
  } catch (error) {
    console.error("Failed to save session:", error);
  }
}

/**
 * Load and restore saved session
 * @returns {boolean} True if session was restored
 */
export function restoreSession() {
  if (getValue("restoreSession") !== true) {
    return false;
  }

  const sessionPath = getSessionFilePath();
  if (!existsSync(sessionPath)) {
    return false;
  }

  try {
    const data = readFileSync(sessionPath, "utf-8");
    const sessionData = JSON.parse(data);

    // Validate session data
    if (!sessionData.windows || !Array.isArray(sessionData.windows)) {
      return false;
    }

    // Check if session is too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - sessionData.timestamp > maxAge) {
      console.log("Session too old, not restoring");
      clearSession();
      return false;
    }

    // Restore windows
    const windowCount = sessionData.windows.length;
    if (windowCount === 0) {
      return false;
    }

    console.log(`Restoring session: ${windowCount} windows`);

    sessionData.windows.forEach((windowMeta, index) => {
      // Delay window creation slightly to prevent overwhelming the system
      setTimeout(() => {
        createWindow({
          url: windowMeta.url,
          appType: windowMeta.appType,
          accountType: windowMeta.accountType,
          bounds: windowMeta.bounds,
          isMaximized: windowMeta.isMaximized,
          show: true,
        });
      }, index * 100);
    });

    return true;
  } catch (error) {
    console.error("Failed to restore session:", error);
    return false;
  }
}

/**
 * Clear saved session
 */
export function clearSession() {
  try {
    const sessionPath = getSessionFilePath();
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }
  } catch (error) {
    console.error("Failed to clear session:", error);
  }
}

/**
 * Check if session restore is enabled
 * @returns {boolean}
 */
export function isSessionRestoreEnabled() {
  return getValue("restoreSession") === true;
}

/**
 * Enable session restore
 */
export function enableSessionRestore() {
  setValue("restoreSession", true);
}

/**
 * Disable session restore
 */
export function disableSessionRestore() {
  setValue("restoreSession", false);
  clearSession();
}

/**
 * Initialize session manager
 * Sets up auto-save on quit
 */
export function initializeSessionManager() {
  // Save session before quit
  app.on("before-quit", () => {
    saveSession();
  });

  // Also save periodically (every 5 minutes)
  setInterval(() => {
    if (getValue("restoreSession") === true) {
      saveSession();
    }
  }, 5 * 60 * 1000);
}

/**
 * Get session info without restoring
 * @returns {Object|null} Session info or null
 */
export function getSessionInfo() {
  const sessionPath = getSessionFilePath();
  if (!existsSync(sessionPath)) {
    return null;
  }

  try {
    const data = readFileSync(sessionPath, "utf-8");
    const sessionData = JSON.parse(data);
    return {
      windowCount: sessionData.windows?.length || 0,
      timestamp: sessionData.timestamp,
      age: Date.now() - sessionData.timestamp,
    };
  } catch {
    return null;
  }
}
