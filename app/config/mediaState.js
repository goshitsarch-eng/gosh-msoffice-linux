/**
 * Media State Tracker
 * Tracks camera/microphone active state for tray indicators
 */

import { app, ipcMain, session, BrowserWindow } from "electron";

// Media state
let cameraActive = false;
let microphoneActive = false;
let screenShareActive = false;
const activeMediaWindows = new Set();

/**
 * Check if camera is active
 * @returns {boolean}
 */
export function isCameraActive() {
  return cameraActive;
}

/**
 * Check if microphone is active
 * @returns {boolean}
 */
export function isMicrophoneActive() {
  return microphoneActive;
}

/**
 * Check if screen sharing is active
 * @returns {boolean}
 */
export function isScreenShareActive() {
  return screenShareActive;
}

/**
 * Check if any media is active
 * @returns {boolean}
 */
export function isAnyMediaActive() {
  return cameraActive || microphoneActive || screenShareActive;
}

/**
 * Get current media state
 * @returns {Object} Media state
 */
export function getMediaState() {
  return {
    camera: cameraActive,
    microphone: microphoneActive,
    screenShare: screenShareActive,
    anyActive: isAnyMediaActive(),
    activeWindows: Array.from(activeMediaWindows),
  };
}

/**
 * Set camera state
 * @param {boolean} active
 * @param {number} [windowId] - Window ID
 */
export function setCameraActive(active, windowId = null) {
  const previousState = cameraActive;
  cameraActive = active;

  if (windowId) {
    if (active) {
      activeMediaWindows.add(windowId);
    }
  }

  if (previousState !== active) {
    app.emit("media-state-changed", getMediaState());
  }
}

/**
 * Set microphone state
 * @param {boolean} active
 * @param {number} [windowId] - Window ID
 */
export function setMicrophoneActive(active, windowId = null) {
  const previousState = microphoneActive;
  microphoneActive = active;

  if (windowId) {
    if (active) {
      activeMediaWindows.add(windowId);
    }
  }

  if (previousState !== active) {
    app.emit("media-state-changed", getMediaState());
  }
}

/**
 * Set screen share state
 * @param {boolean} active
 * @param {number} [windowId] - Window ID
 */
export function setScreenShareActive(active, windowId = null) {
  const previousState = screenShareActive;
  screenShareActive = active;

  if (windowId) {
    if (active) {
      activeMediaWindows.add(windowId);
    }
  }

  if (previousState !== active) {
    app.emit("media-state-changed", getMediaState());
  }
}

/**
 * Clear media state for a window
 * @param {number} windowId - Window ID
 */
export function clearWindowMediaState(windowId) {
  activeMediaWindows.delete(windowId);

  // If no windows have active media, clear all states
  if (activeMediaWindows.size === 0) {
    const hadActive = isAnyMediaActive();
    cameraActive = false;
    microphoneActive = false;
    screenShareActive = false;

    if (hadActive) {
      app.emit("media-state-changed", getMediaState());
    }
  }
}

/**
 * Clear all media states
 */
export function clearAllMediaState() {
  const hadActive = isAnyMediaActive();
  cameraActive = false;
  microphoneActive = false;
  screenShareActive = false;
  activeMediaWindows.clear();

  if (hadActive) {
    app.emit("media-state-changed", getMediaState());
  }
}

/**
 * JavaScript to inject for tracking media state changes
 */
export function getMediaStateScript() {
  return `
    (function() {
      // Track active media streams
      const activeStreams = new Set();

      // Override getUserMedia to track streams
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async function(constraints) {
        const stream = await originalGetUserMedia(constraints);

        // Track which media types are active
        const hasVideo = stream.getVideoTracks().length > 0;
        const hasAudio = stream.getAudioTracks().length > 0;

        activeStreams.add(stream.id);

        // Notify main process
        window.electronAPI?.send('media:state-changed', {
          camera: hasVideo,
          microphone: hasAudio,
          active: true,
          streamId: stream.id,
        });

        // Track when tracks end
        stream.getTracks().forEach(track => {
          track.onended = () => {
            activeStreams.delete(stream.id);

            // Check if any streams still active
            if (activeStreams.size === 0) {
              window.electronAPI?.send('media:state-changed', {
                camera: false,
                microphone: false,
                active: false,
              });
            }
          };
        });

        return stream;
      };

      // Track getDisplayMedia for screen sharing
      const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia?.bind(navigator.mediaDevices);
      if (originalGetDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia = async function(constraints) {
          const stream = await originalGetDisplayMedia(constraints);

          window.electronAPI?.send('media:screen-share-changed', {
            active: true,
            streamId: stream.id,
          });

          stream.getTracks().forEach(track => {
            track.onended = () => {
              window.electronAPI?.send('media:screen-share-changed', {
                active: false,
              });
            };
          });

          return stream;
        };
      }

      // Clean up on unload
      window.addEventListener('beforeunload', () => {
        window.electronAPI?.send('media:state-changed', {
          camera: false,
          microphone: false,
          active: false,
        });
        window.electronAPI?.send('media:screen-share-changed', {
          active: false,
        });
      });
    })();
  `;
}

/**
 * Initialize media state tracking
 */
export function initializeMediaState() {
  // Handle media state changes from renderer
  ipcMain.on("media:state-changed", (event, data) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const windowId = window?.id;

    if (data.active) {
      if (data.camera) setCameraActive(true, windowId);
      if (data.microphone) setMicrophoneActive(true, windowId);
    } else {
      if (windowId) {
        clearWindowMediaState(windowId);
      } else {
        setCameraActive(false);
        setMicrophoneActive(false);
      }
    }
  });

  ipcMain.on("media:screen-share-changed", (event, data) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    setScreenShareActive(data.active, window?.id);
  });

  // Clear state when all windows close
  app.on("window-all-closed", () => {
    clearAllMediaState();
  });

  // Clear state for individual window
  app.on("window-closed", (windowId) => {
    clearWindowMediaState(windowId);
  });
}

/**
 * Inject media state tracking into a window
 * @param {BrowserWindow} window - Window to inject into
 */
export function injectMediaStateTracking(window) {
  window.webContents.executeJavaScript(getMediaStateScript()).catch(() => {
    // Ignore errors
  });
}

/**
 * Get indicator icon name based on current state
 * @returns {string|null} Indicator type or null if no media active
 */
export function getMediaIndicatorType() {
  if (cameraActive && microphoneActive) return "camera-mic";
  if (cameraActive) return "camera";
  if (microphoneActive) return "microphone";
  if (screenShareActive) return "screen-share";
  return null;
}
