import { app } from "electron";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * XDG Base Directory Specification compliance for Linux.
 * https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
 *
 * Environment variables:
 * - XDG_CONFIG_HOME: User-specific configuration files (~/.config)
 * - XDG_DATA_HOME: User-specific data files (~/.local/share)
 * - XDG_STATE_HOME: User-specific state files (~/.local/state)
 * - XDG_CACHE_HOME: User-specific cache files (~/.cache)
 */

const APP_NAME = "ms-365-electron";

/**
 * Get the XDG config directory
 * @returns {string} Path to config directory
 */
export function getConfigDir() {
  const xdgConfigHome = process.env.XDG_CONFIG_HOME || join(process.env.HOME, ".config");
  return join(xdgConfigHome, APP_NAME);
}

/**
 * Get the XDG data directory
 * @returns {string} Path to data directory
 */
export function getDataDir() {
  const xdgDataHome = process.env.XDG_DATA_HOME || join(process.env.HOME, ".local", "share");
  return join(xdgDataHome, APP_NAME);
}

/**
 * Get the XDG state directory (for logs, history, etc.)
 * @returns {string} Path to state directory
 */
export function getStateDir() {
  const xdgStateHome = process.env.XDG_STATE_HOME || join(process.env.HOME, ".local", "state");
  return join(xdgStateHome, APP_NAME);
}

/**
 * Get the XDG cache directory
 * @returns {string} Path to cache directory
 */
export function getCacheDir() {
  const xdgCacheHome = process.env.XDG_CACHE_HOME || join(process.env.HOME, ".cache");
  return join(xdgCacheHome, APP_NAME);
}

/**
 * Get the logs directory (inside state directory)
 * @returns {string} Path to logs directory
 */
export function getLogsDir() {
  return join(getStateDir(), "logs");
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param {string} dirPath - Path to the directory
 */
function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Initialize all XDG directories
 * Should be called early in app startup
 */
export function initializeXdgDirs() {
  ensureDir(getConfigDir());
  ensureDir(getDataDir());
  ensureDir(getStateDir());
  ensureDir(getCacheDir());
  ensureDir(getLogsDir());

  console.log("XDG directories initialized:");
  console.log(`  Config: ${getConfigDir()}`);
  console.log(`  Data: ${getDataDir()}`);
  console.log(`  State: ${getStateDir()}`);
  console.log(`  Cache: ${getCacheDir()}`);
  console.log(`  Logs: ${getLogsDir()}`);
}

/**
 * Configure Electron to use XDG paths
 * Must be called before app.ready
 */
export function configureElectronPaths() {
  // Set userData to XDG config directory
  app.setPath("userData", getConfigDir());

  // Set logs to XDG state directory
  app.setPath("logs", getLogsDir());

  // Set cache to XDG cache directory
  app.setPath("cache", getCacheDir());

  console.log("Electron paths configured for XDG compliance");
}

/**
 * Get all XDG paths as an object
 * @returns {Object} Object containing all XDG paths
 */
export function getAllPaths() {
  return {
    config: getConfigDir(),
    data: getDataDir(),
    state: getStateDir(),
    cache: getCacheDir(),
    logs: getLogsDir(),
  };
}
