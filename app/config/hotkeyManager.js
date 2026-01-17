/**
 * Global Hotkey Manager
 * System-wide keyboard shortcuts for launching apps
 */

import { globalShortcut, app } from "electron";
import { getValue, setValue } from "./store.js";
import { launchApp } from "./appLauncher.js";
import { focusOrCreateWindow } from "./windowManager.js";
import { getDisplayServer } from "./wayland.js";

// Default hotkey bindings
const DEFAULT_HOTKEYS = {
  "Super+Shift+W": { action: "launch", app: "word" },
  "Super+Shift+E": { action: "launch", app: "excel" },
  "Super+Shift+P": { action: "launch", app: "powerpoint" },
  "Super+Shift+O": { action: "launch", app: "outlook" },
  "Super+Shift+D": { action: "launch", app: "onedrive" },
  "Super+Shift+N": { action: "launch", app: "onenote" },
  "Super+Shift+T": { action: "launch", app: "teams" },
  "Super+Shift+M": { action: "launch", app: "home" },
};

let registeredHotkeys = new Map();
let hotkeyEnabled = false;

/**
 * Check if global hotkeys are supported
 * Note: Global shortcuts have limited support on Wayland
 * @returns {boolean}
 */
export function areHotkeysSupported() {
  const displayServer = getDisplayServer();
  // Global shortcuts work on X11, limited on Wayland
  return displayServer === "x11" || displayServer === "unknown";
}

/**
 * Check if hotkeys are enabled
 * @returns {boolean}
 */
export function areHotkeysEnabled() {
  return hotkeyEnabled && getValue("globalHotkeys") === true;
}

/**
 * Enable global hotkeys
 * @returns {boolean} Success
 */
export function enableHotkeys() {
  if (!areHotkeysSupported()) {
    console.warn("Global hotkeys are not fully supported on Wayland");
  }

  setValue("globalHotkeys", true);
  hotkeyEnabled = true;
  return registerAllHotkeys();
}

/**
 * Disable global hotkeys
 */
export function disableHotkeys() {
  setValue("globalHotkeys", false);
  hotkeyEnabled = false;
  unregisterAllHotkeys();
}

/**
 * Get all hotkey bindings
 * @returns {Object} Hotkey bindings
 */
export function getHotkeyBindings() {
  const saved = getValue("hotkeyBindings");
  return saved || { ...DEFAULT_HOTKEYS };
}

/**
 * Set a hotkey binding
 * @param {string} accelerator - Keyboard shortcut
 * @param {Object} binding - Action binding
 */
export function setHotkeyBinding(accelerator, binding) {
  const bindings = getHotkeyBindings();
  bindings[accelerator] = binding;
  setValue("hotkeyBindings", bindings);

  // Re-register if enabled
  if (areHotkeysEnabled()) {
    registerHotkey(accelerator, binding);
  }
}

/**
 * Remove a hotkey binding
 * @param {string} accelerator - Keyboard shortcut
 */
export function removeHotkeyBinding(accelerator) {
  const bindings = getHotkeyBindings();
  delete bindings[accelerator];
  setValue("hotkeyBindings", bindings);

  // Unregister
  unregisterHotkey(accelerator);
}

/**
 * Reset hotkeys to defaults
 */
export function resetHotkeysToDefaults() {
  setValue("hotkeyBindings", { ...DEFAULT_HOTKEYS });
  if (areHotkeysEnabled()) {
    unregisterAllHotkeys();
    registerAllHotkeys();
  }
}

/**
 * Register a single hotkey
 * @param {string} accelerator - Keyboard shortcut
 * @param {Object} binding - Action binding
 * @returns {boolean} Success
 */
function registerHotkey(accelerator, binding) {
  try {
    // Unregister first if already registered
    if (registeredHotkeys.has(accelerator)) {
      globalShortcut.unregister(accelerator);
    }

    const success = globalShortcut.register(accelerator, () => {
      handleHotkeyAction(binding);
    });

    if (success) {
      registeredHotkeys.set(accelerator, binding);
      console.log(`Registered hotkey: ${accelerator}`);
    } else {
      console.warn(`Failed to register hotkey: ${accelerator}`);
    }

    return success;
  } catch (error) {
    console.error(`Error registering hotkey ${accelerator}:`, error);
    return false;
  }
}

/**
 * Unregister a single hotkey
 * @param {string} accelerator - Keyboard shortcut
 */
function unregisterHotkey(accelerator) {
  try {
    if (registeredHotkeys.has(accelerator)) {
      globalShortcut.unregister(accelerator);
      registeredHotkeys.delete(accelerator);
    }
  } catch (error) {
    console.error(`Error unregistering hotkey ${accelerator}:`, error);
  }
}

/**
 * Register all configured hotkeys
 * @returns {boolean} True if all registered successfully
 */
function registerAllHotkeys() {
  const bindings = getHotkeyBindings();
  let allSuccess = true;

  for (const [accelerator, binding] of Object.entries(bindings)) {
    if (!registerHotkey(accelerator, binding)) {
      allSuccess = false;
    }
  }

  return allSuccess;
}

/**
 * Unregister all hotkeys
 */
function unregisterAllHotkeys() {
  globalShortcut.unregisterAll();
  registeredHotkeys.clear();
}

/**
 * Handle hotkey action
 * @param {Object} binding - Action binding
 */
function handleHotkeyAction(binding) {
  switch (binding.action) {
    case "launch":
      focusOrCreateWindow(binding.app, binding.accountType);
      break;

    case "compose":
      launchApp("outlook", { action: "compose" });
      break;

    case "newDocument":
      launchApp(binding.app || "word", { action: "new" });
      break;

    default:
      console.warn(`Unknown hotkey action: ${binding.action}`);
  }
}

/**
 * Initialize hotkey manager
 */
export function initializeHotkeyManager() {
  // Check if hotkeys should be enabled
  if (getValue("globalHotkeys") === true) {
    hotkeyEnabled = true;
    // Delay registration until after app is ready
    if (app.isReady()) {
      registerAllHotkeys();
    } else {
      app.on("ready", () => {
        registerAllHotkeys();
      });
    }
  }

  // Clean up on quit
  app.on("will-quit", () => {
    unregisterAllHotkeys();
  });
}

/**
 * Check if an accelerator is valid
 * @param {string} accelerator - Keyboard shortcut
 * @returns {boolean}
 */
export function isValidAccelerator(accelerator) {
  try {
    // Try to register and immediately unregister
    const success = globalShortcut.register(accelerator, () => {});
    if (success) {
      globalShortcut.unregister(accelerator);
    }
    return success;
  } catch {
    return false;
  }
}

/**
 * Get list of registered hotkeys
 * @returns {string[]}
 */
export function getRegisteredHotkeys() {
  return Array.from(registeredHotkeys.keys());
}

export { DEFAULT_HOTKEYS };
