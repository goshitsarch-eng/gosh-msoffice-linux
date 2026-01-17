/**
 * Drag-and-Drop Handler
 * Handles file drops to upload/attach files
 */

import { ipcMain, dialog, BrowserWindow } from "electron";
import { existsSync, statSync } from "fs";
import { basename, extname } from "path";
import { isFileSupported, getAppForFile } from "./fileHandler.js";

// Maximum file size for drag-and-drop (50MB)
const MAX_DROP_FILE_SIZE = 50 * 1024 * 1024;

// Supported drop zones
const DROP_ZONES = {
  onedrive: {
    selectors: [".od-ItemContent-list", ".CommandBar", ".Files-list"],
    action: "upload",
  },
  outlook: {
    selectors: [".customScrollBar", ".ms-FocusZone", "[role='textbox']"],
    action: "attach",
  },
  word: {
    selectors: [".WACViewPanel", "#WACViewPanel"],
    action: "insert",
  },
  excel: {
    selectors: [".WACViewPanel", "#WACViewPanel"],
    action: "import",
  },
  powerpoint: {
    selectors: [".WACViewPanel", "#WACViewPanel"],
    action: "insert",
  },
};

/**
 * Validate dropped file
 * @param {string} filePath - File path
 * @returns {{valid: boolean, error?: string}}
 */
export function validateDroppedFile(filePath) {
  if (!filePath) {
    return { valid: false, error: "No file path" };
  }

  if (!existsSync(filePath)) {
    return { valid: false, error: "File does not exist" };
  }

  try {
    const stats = statSync(filePath);

    if (!stats.isFile()) {
      return { valid: false, error: "Not a file" };
    }

    if (stats.size > MAX_DROP_FILE_SIZE) {
      return { valid: false, error: "File too large (max 50MB)" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Detect which app/page is currently active
 * @param {string} url - Current URL
 * @returns {string} App type
 */
function detectActiveApp(url) {
  const urlLower = url.toLowerCase();

  if (urlLower.includes("onedrive")) return "onedrive";
  if (urlLower.includes("outlook")) return "outlook";
  if (urlLower.includes("word")) return "word";
  if (urlLower.includes("excel")) return "excel";
  if (urlLower.includes("powerpoint")) return "powerpoint";

  return "unknown";
}

/**
 * Get drop zone selectors for an app
 * @param {string} appType - App type
 * @returns {string[]} CSS selectors
 */
export function getDropZoneSelectors(appType) {
  return DROP_ZONES[appType]?.selectors || [];
}

/**
 * JavaScript to inject for drag-and-drop handling
 */
export function getDropHandlerScript() {
  return `
    (function() {
      // Prevent default drag behaviors
      document.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      document.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      document.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      // Handle drop
      document.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        // Get file paths
        const filePaths = files.map(f => f.path).filter(p => p);

        if (filePaths.length > 0) {
          // Send to main process
          window.electronAPI?.send('drop:files', {
            paths: filePaths,
            url: window.location.href,
            targetElement: e.target.tagName,
            targetClass: e.target.className,
          });
        }
      });

      // Add visual feedback
      let dropOverlay = null;

      function showDropOverlay() {
        if (dropOverlay) return;

        dropOverlay = document.createElement('div');
        dropOverlay.style.cssText = \`
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 120, 212, 0.1);
          border: 3px dashed rgba(0, 120, 212, 0.5);
          pointer-events: none;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
        \`;

        const text = document.createElement('div');
        text.style.cssText = \`
          background: rgba(0, 120, 212, 0.9);
          color: white;
          padding: 20px 40px;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 500;
        \`;
        text.textContent = 'Drop files here';
        dropOverlay.appendChild(text);

        document.body.appendChild(dropOverlay);
      }

      function hideDropOverlay() {
        if (dropOverlay) {
          dropOverlay.remove();
          dropOverlay = null;
        }
      }

      // Show overlay on drag enter
      let dragCounter = 0;

      document.addEventListener('dragenter', () => {
        dragCounter++;
        showDropOverlay();
      });

      document.addEventListener('dragleave', () => {
        dragCounter--;
        if (dragCounter <= 0) {
          hideDropOverlay();
          dragCounter = 0;
        }
      });

      document.addEventListener('drop', () => {
        hideDropOverlay();
        dragCounter = 0;
      });
    })();
  `;
}

/**
 * Handle dropped files
 * @param {string[]} filePaths - File paths
 * @param {string} url - Current URL
 * @param {BrowserWindow} window - Window that received the drop
 */
async function handleDroppedFiles(filePaths, url, window) {
  const appType = detectActiveApp(url);
  const action = DROP_ZONES[appType]?.action || "upload";

  // Validate files
  const validFiles = [];
  const errors = [];

  for (const filePath of filePaths) {
    const validation = validateDroppedFile(filePath);
    if (validation.valid) {
      validFiles.push({
        path: filePath,
        name: basename(filePath),
        ext: extname(filePath),
        supported: isFileSupported(filePath),
      });
    } else {
      errors.push(`${basename(filePath)}: ${validation.error}`);
    }
  }

  if (validFiles.length === 0) {
    dialog.showErrorBox(
      "Cannot Drop Files",
      errors.join("\n") || "No valid files to drop"
    );
    return;
  }

  // Show info dialog
  const fileList = validFiles.map((f) => f.name).join("\n");

  const result = await dialog.showMessageBox(window, {
    type: "info",
    title: "Upload Files",
    message: `${action === "attach" ? "Attach" : "Upload"} ${validFiles.length} file(s)?`,
    detail: `Files:\n${fileList}\n\nNote: Files will be uploaded via the web interface.`,
    buttons: ["Continue", "Cancel"],
    defaultId: 0,
    cancelId: 1,
  });

  if (result.response === 1) {
    return;
  }

  // For now, show instructions
  // A full implementation would use the Microsoft Graph API
  dialog.showMessageBox(window, {
    type: "info",
    title: "Upload Files",
    message: "Please use the upload button",
    detail:
      "Drag-and-drop directly into the web interface, or use the upload/attach button to add your files.",
    buttons: ["OK"],
  });
}

/**
 * Initialize drop handler
 */
export function initializeDropHandler() {
  // Handle file drops from renderer
  ipcMain.on("drop:files", async (event, data) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      await handleDroppedFiles(data.paths, data.url, window);
    }
  });
}

/**
 * Inject drop handler into a window
 * @param {BrowserWindow} window - Window to inject into
 */
export function injectDropHandler(window) {
  window.webContents.executeJavaScript(getDropHandlerScript()).catch(() => {
    // Ignore errors
  });
}

export { DROP_ZONES, MAX_DROP_FILE_SIZE };
