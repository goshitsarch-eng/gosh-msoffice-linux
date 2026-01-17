/**
 * File Handler Module
 * Opens .docx, .xlsx, .pptx files from file manager
 */

import { app, dialog, BrowserWindow } from "electron";
import { getValue } from "./store.js";
import { launchApp, getAccountType, getPartition } from "./appLauncher.js";
import { createWindow } from "./windowManager.js";
import { existsSync, statSync } from "fs";
import { basename, extname } from "path";

// File extension to app mapping
const FILE_TYPE_MAP = {
  ".doc": { app: "word", mimeType: "application/msword" },
  ".docx": { app: "word", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  ".xls": { app: "excel", mimeType: "application/vnd.ms-excel" },
  ".xlsx": { app: "excel", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  ".ppt": { app: "powerpoint", mimeType: "application/vnd.ms-powerpoint" },
  ".pptx": { app: "powerpoint", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
  ".pdf": { app: "onedrive", mimeType: "application/pdf" },
  ".odt": { app: "word", mimeType: "application/vnd.oasis.opendocument.text" },
  ".ods": { app: "excel", mimeType: "application/vnd.oasis.opendocument.spreadsheet" },
  ".odp": { app: "powerpoint", mimeType: "application/vnd.oasis.opendocument.presentation" },
};

// Supported file extensions
const SUPPORTED_EXTENSIONS = Object.keys(FILE_TYPE_MAP);

/**
 * Check if file extension is supported
 * @param {string} filePath - File path
 * @returns {boolean}
 */
export function isFileSupported(filePath) {
  const ext = extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Get app for file type
 * @param {string} filePath - File path
 * @returns {{app: string, mimeType: string}|null}
 */
export function getAppForFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  return FILE_TYPE_MAP[ext] || null;
}

/**
 * Validate file exists and is accessible
 * @param {string} filePath - File path
 * @returns {{valid: boolean, error?: string}}
 */
export function validateFile(filePath) {
  if (!filePath) {
    return { valid: false, error: "No file path provided" };
  }

  if (!existsSync(filePath)) {
    return { valid: false, error: "File does not exist" };
  }

  try {
    const stats = statSync(filePath);
    if (!stats.isFile()) {
      return { valid: false, error: "Path is not a file" };
    }

    // Check file size (max 100MB for web upload)
    const maxSize = 100 * 1024 * 1024;
    if (stats.size > maxSize) {
      return { valid: false, error: "File is too large (max 100MB)" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Cannot access file: ${error.message}` };
  }
}

/**
 * Handle opening a file
 * This will open the appropriate Office web app and trigger upload to OneDrive
 * @param {string} filePath - Path to the file
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function handleOpenFile(filePath) {
  // Validate file
  const validation = validateFile(filePath);
  if (!validation.valid) {
    dialog.showErrorBox("Cannot Open File", validation.error);
    return { success: false, error: validation.error };
  }

  // Check if file type is supported
  if (!isFileSupported(filePath)) {
    const ext = extname(filePath);
    dialog.showErrorBox(
      "Unsupported File Type",
      `Files with extension "${ext}" are not supported.\n\nSupported types: ${SUPPORTED_EXTENSIONS.join(", ")}`
    );
    return { success: false, error: "Unsupported file type" };
  }

  const fileInfo = getAppForFile(filePath);
  const fileName = basename(filePath);
  const accountType = getAccountType();

  // Show info dialog about file handling
  const result = await dialog.showMessageBox({
    type: "info",
    title: "Open File in Microsoft 365",
    message: `Open "${fileName}" in ${fileInfo.app.charAt(0).toUpperCase() + fileInfo.app.slice(1)}?`,
    detail: "The file will be uploaded to OneDrive and opened in the web editor.\n\nNote: This will open OneDrive where you can upload and edit the file.",
    buttons: ["Open OneDrive", "Cancel"],
    defaultId: 0,
    cancelId: 1,
  });

  if (result.response === 1) {
    return { success: false, error: "User cancelled" };
  }

  // For now, open OneDrive where user can upload the file
  // A more advanced implementation would use the Microsoft Graph API
  // to upload directly and then open the file
  const oneDriveUrl = accountType === "work"
    ? "https://onedrive.live.com/upload"
    : "https://onedrive.live.com/?id=root";

  const window = createWindow({
    url: oneDriveUrl,
    appType: "onedrive",
    accountType,
  });

  // Show instruction to user
  window.webContents.once("did-finish-load", () => {
    dialog.showMessageBox(window, {
      type: "info",
      title: "Upload File",
      message: "Upload your file to OneDrive",
      detail: `Please upload "${fileName}" using the OneDrive interface, then open it to edit.`,
      buttons: ["OK"],
    });
  });

  return { success: true };
}

/**
 * Initialize file handler
 * Sets up listeners for file open events
 */
export function initializeFileHandler() {
  // Handle file open from command line or file manager
  app.on("open-file", async (event, filePath) => {
    event.preventDefault();
    await handleOpenFile(filePath);
  });

  // Handle files passed as command line arguments on startup
  const handleStartupFiles = () => {
    const args = process.argv.slice(1);
    for (const arg of args) {
      // Skip flags and electron internal args
      if (arg.startsWith("-") || arg.startsWith("--")) continue;
      if (arg === "." || arg.includes("node_modules")) continue;

      // Check if it's a supported file
      if (isFileSupported(arg)) {
        handleOpenFile(arg);
        break; // Only handle first file
      }
    }
  };

  // Run after app is ready
  if (app.isReady()) {
    handleStartupFiles();
  } else {
    app.on("ready", handleStartupFiles);
  }
}

/**
 * Get list of supported MIME types for .desktop file
 * @returns {string} Semicolon-separated MIME types
 */
export function getSupportedMimeTypes() {
  const mimeTypes = new Set();
  Object.values(FILE_TYPE_MAP).forEach(info => {
    mimeTypes.add(info.mimeType);
  });
  return Array.from(mimeTypes).join(";");
}

/**
 * Get list of supported extensions
 * @returns {string[]}
 */
export function getSupportedExtensions() {
  return [...SUPPORTED_EXTENSIONS];
}

export { FILE_TYPE_MAP, SUPPORTED_EXTENSIONS };
