/**
 * Unread Badge Module
 * Shows unread count on tray icon and dock
 */

import { app, nativeImage } from "electron";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let currentBadgeCount = 0;
let trayRef = null;

/**
 * Set reference to tray for badge overlay
 * @param {Tray} tray - Tray instance
 */
export function setTrayRef(tray) {
  trayRef = tray;
}

/**
 * Get current badge count
 * @returns {number}
 */
export function getBadgeCount() {
  return currentBadgeCount;
}

/**
 * Set badge count
 * @param {number} count - Unread count
 */
export function setBadgeCount(count) {
  currentBadgeCount = count;

  // Update dock badge (Linux/macOS)
  if (app.setBadgeCount) {
    app.setBadgeCount(count);
  }

  // Update tray icon with badge overlay
  updateTrayBadge(count);

  // Emit event
  app.emit("badge-count-changed", count);
}

/**
 * Increment badge count
 * @param {number} [amount=1] - Amount to increment
 */
export function incrementBadgeCount(amount = 1) {
  setBadgeCount(currentBadgeCount + amount);
}

/**
 * Decrement badge count
 * @param {number} [amount=1] - Amount to decrement
 */
export function decrementBadgeCount(amount = 1) {
  setBadgeCount(Math.max(0, currentBadgeCount - amount));
}

/**
 * Clear badge count
 */
export function clearBadgeCount() {
  setBadgeCount(0);
}

/**
 * Create badge overlay image
 * @param {number} count - Badge count
 * @param {string} baseIconPath - Base icon path
 * @returns {nativeImage}
 */
function createBadgeOverlay(count, baseIconPath) {
  // For now, we'll just return the base icon
  // A more advanced implementation would draw the badge number on the icon
  // This would require canvas or a native module

  // Load base icon
  const baseIcon = nativeImage.createFromPath(baseIconPath);
  if (baseIcon.isEmpty()) {
    return null;
  }

  // If count is 0, return base icon without modification
  if (count === 0) {
    return baseIcon;
  }

  // For counts > 0, we'd ideally overlay a red badge
  // Since Electron doesn't have built-in canvas support,
  // we'll use a pre-made badge icon or just return the base
  // The actual badge is shown via app.setBadgeCount on supported systems

  return baseIcon;
}

/**
 * Update tray icon with badge
 * @param {number} count - Badge count
 */
function updateTrayBadge(count) {
  if (!trayRef) return;

  try {
    // Get current app icon path based on the current tray icon
    // This is a simplified version - the actual icon path should come from tray.js
    const iconPath = join(__dirname, "..", "assets", "icons", "tray", "32x32.png");
    const badgedIcon = createBadgeOverlay(count, iconPath);

    if (badgedIcon) {
      trayRef.setImage(badgedIcon);
    }

    // Update tooltip with count
    if (count > 0) {
      trayRef.setToolTip(`MS 365 Electron (${count} unread)`);
    } else {
      trayRef.setToolTip("MS 365 Electron");
    }
  } catch (error) {
    console.error("Failed to update tray badge:", error);
  }
}

/**
 * Parse unread count from page title
 * @param {string} title - Page title like "(5) - Outlook"
 * @returns {number} Unread count
 */
export function parseUnreadFromTitle(title) {
  const match = title.match(/^\((\d+)\)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Initialize badge module
 * Sets up listeners for unread count changes
 */
export function initializeBadge() {
  // Listen for unread count changes from notification module
  app.on("unread-count-changed", (count) => {
    setBadgeCount(count);
  });

  // Clear badge when all windows close
  app.on("window-all-closed", () => {
    clearBadgeCount();
  });
}

/**
 * Format badge count for display
 * @param {number} count - Count
 * @returns {string} Formatted count (e.g., "99+" for large numbers)
 */
export function formatBadgeCount(count) {
  if (count === 0) return "";
  if (count > 99) return "99+";
  return count.toString();
}
