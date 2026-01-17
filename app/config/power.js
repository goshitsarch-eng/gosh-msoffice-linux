/**
 * Power Management Module
 * Prevents sleep during video calls
 */

import { powerSaveBlocker, app, BrowserWindow, ipcMain } from "electron";

let currentBlockerId = null;
let isCallActive = false;

/**
 * Check if power save is currently blocked
 * @returns {boolean}
 */
export function isPowerSaveBlocked() {
  if (currentBlockerId === null) return false;
  return powerSaveBlocker.isStarted(currentBlockerId);
}

/**
 * Start blocking power save (sleep)
 * @param {'prevent-app-suspension' | 'prevent-display-sleep'} type - Block type
 * @returns {number} Blocker ID
 */
export function startPowerSaveBlock(type = "prevent-display-sleep") {
  if (isPowerSaveBlocked()) {
    return currentBlockerId;
  }

  currentBlockerId = powerSaveBlocker.start(type);
  console.log(`Power save blocking started (ID: ${currentBlockerId})`);

  return currentBlockerId;
}

/**
 * Stop blocking power save
 */
export function stopPowerSaveBlock() {
  if (currentBlockerId !== null && powerSaveBlocker.isStarted(currentBlockerId)) {
    powerSaveBlocker.stop(currentBlockerId);
    console.log(`Power save blocking stopped (ID: ${currentBlockerId})`);
    currentBlockerId = null;
  }
}

/**
 * Set call active state
 * @param {boolean} active - Whether a call is active
 */
export function setCallActive(active) {
  isCallActive = active;
  if (active) {
    startPowerSaveBlock("prevent-display-sleep");
  } else {
    stopPowerSaveBlock();
  }
}

/**
 * Check if a call is active
 * @returns {boolean}
 */
export function isInCall() {
  return isCallActive;
}

/**
 * JavaScript to inject for detecting active calls
 * Detects Teams/Outlook video calls via DOM observation
 */
export function getCallDetectionScript() {
  return `
    (function() {
      let lastCallState = false;

      // Check for active call indicators
      function checkForActiveCall() {
        // Teams call indicators
        const teamsCallActive =
          document.querySelector('[data-tid="calling-screen"]') !== null ||
          document.querySelector('.ts-calling-screen') !== null ||
          document.querySelector('[data-test="in-call-banner"]') !== null;

        // General video/audio indicators
        const mediaActive =
          document.querySelector('video[autoplay]') !== null ||
          document.querySelector('.call-controls') !== null;

        const isInCall = teamsCallActive || mediaActive;

        if (isInCall !== lastCallState) {
          lastCallState = isInCall;
          window.electronAPI?.send('power:call-state-changed', { active: isInCall });
        }
      }

      // Check periodically
      setInterval(checkForActiveCall, 2000);

      // Also observe DOM changes
      const observer = new MutationObserver(() => {
        checkForActiveCall();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      });

      // Initial check
      checkForActiveCall();

      // Clean up
      window.addEventListener('beforeunload', () => {
        observer.disconnect();
        window.electronAPI?.send('power:call-state-changed', { active: false });
      });
    })();
  `;
}

/**
 * Initialize power management
 */
export function initializePowerManagement() {
  // Handle call state changes from renderer
  ipcMain.on("power:call-state-changed", (event, data) => {
    setCallActive(data.active);

    // Emit event for other modules (e.g., media state)
    app.emit("call-state-changed", data.active);
  });

  // Stop blocking on quit
  app.on("will-quit", () => {
    stopPowerSaveBlock();
  });

  // Stop blocking if all windows close
  app.on("window-all-closed", () => {
    stopPowerSaveBlock();
    isCallActive = false;
  });
}

/**
 * Inject call detection into a window
 * @param {BrowserWindow} window - Window to inject into
 */
export function injectCallDetection(window) {
  const url = window.webContents.getURL();

  // Only inject for Teams and Outlook
  if (url.includes("teams") || url.includes("outlook")) {
    window.webContents.executeJavaScript(getCallDetectionScript()).catch(() => {
      // Ignore errors
    });
  }
}

/**
 * Get power state info
 * @returns {Object} Power state
 */
export function getPowerState() {
  return {
    isBlocking: isPowerSaveBlocked(),
    blockerId: currentBlockerId,
    isInCall: isCallActive,
  };
}
