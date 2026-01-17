import { getOptimalUserAgent } from "./arch.js";
import Store from "electron-store";

const store = new Store();

export function getValue(key) {
  return store.get(key);
}

export function setValue(key, value) {
  store.set(key, value);
}

export function getValueOrDefault(key, defaultValue) {
  const value = store.get(key);
  if (value === undefined) {
    store.set(key, defaultValue);
    return defaultValue;
  }
  return value;
}

/**
 * Delete a setting
 * @param {string} key - Setting key
 */
export function deleteValue(key) {
  store.delete(key);
}

/**
 * Get all settings
 * @returns {object} All settings
 */
export function getAllSettings() {
  return store.store;
}

/**
 * Clear all settings
 */
export function clearAll() {
  store.clear();
}

// Initialize default settings with architecture-aware user-agent
// Account settings
getValueOrDefault("enterprise-or-normal", "?auth=1");
getValueOrDefault("websites-in-new-window", "true");

// Window settings
getValueOrDefault("autohide-menubar", "false");
getValueOrDefault("windowWidth", 0.71);
getValueOrDefault("windowHeight", 0.74);
getValueOrDefault("customWindowSize", false);
getValueOrDefault("custompage", "home");

// Network settings
getValueOrDefault("useragentstring", getOptimalUserAgent());
getValueOrDefault("externalLinks", "true");

// Privacy settings
getValueOrDefault("blockadsandtrackers", "false");

// Feature settings
getValueOrDefault("discordrpcstatus", "false");
getValueOrDefault("dynamicicons", "true");
getValueOrDefault("autoupdater", "true");

// New feature settings
getValueOrDefault("theme", "system");
getValueOrDefault("restoreSession", false);
getValueOrDefault("startMinimized", false);
getValueOrDefault("minimizeToTray", false);
getValueOrDefault("notifications", true);
getValueOrDefault("globalHotkeys", false);

// Migration: convert old URL-style values to new format
if (getValue("enterprise-or-normal") === "https://microsoft365.com/?auth=1") {
  setValue("enterprise-or-normal", "?auth=1");
} else if (getValue("enterprise-or-normal") === "https://microsoft365.com/?auth=2") {
  setValue("enterprise-or-normal", "?auth=2");
}
