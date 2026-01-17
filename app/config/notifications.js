/**
 * Desktop Notifications Module
 * Native notifications for Outlook emails, Teams messages, calendar reminders
 */

import { Notification, BrowserWindow, ipcMain, app } from "electron";
import { getValue, setValue } from "./store.js";

// Notification state
let notificationsEnabled = true;
let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 3000; // 3 seconds between notifications

/**
 * Check if notifications are supported
 * @returns {boolean}
 */
export function isNotificationSupported() {
  return Notification.isSupported();
}

/**
 * Check if notifications are enabled
 * @returns {boolean}
 */
export function areNotificationsEnabled() {
  return notificationsEnabled && getValue("notifications") !== false;
}

/**
 * Enable notifications
 */
export function enableNotifications() {
  notificationsEnabled = true;
  setValue("notifications", true);
}

/**
 * Disable notifications
 */
export function disableNotifications() {
  notificationsEnabled = false;
  setValue("notifications", false);
}

/**
 * Show a notification
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {string} [options.icon] - Icon path
 * @param {'email' | 'message' | 'calendar' | 'general'} [options.type] - Notification type
 * @param {Function} [options.onClick] - Click handler
 * @returns {Notification|null}
 */
export function showNotification(options) {
  if (!areNotificationsEnabled() || !isNotificationSupported()) {
    return null;
  }

  // Rate limiting
  const now = Date.now();
  if (now - lastNotificationTime < NOTIFICATION_COOLDOWN) {
    return null;
  }
  lastNotificationTime = now;

  const notification = new Notification({
    title: options.title,
    body: options.body,
    icon: options.icon,
    silent: false,
    urgency: options.type === "calendar" ? "critical" : "normal",
  });

  if (options.onClick) {
    notification.on("click", options.onClick);
  }

  notification.show();
  return notification;
}

/**
 * Show email notification
 * @param {string} from - Sender
 * @param {string} subject - Subject line
 * @param {Function} [onClick] - Click handler
 */
export function showEmailNotification(from, subject, onClick) {
  return showNotification({
    title: `New Email from ${from}`,
    body: subject,
    type: "email",
    onClick,
  });
}

/**
 * Show Teams message notification
 * @param {string} from - Sender
 * @param {string} message - Message preview
 * @param {Function} [onClick] - Click handler
 */
export function showTeamsNotification(from, message, onClick) {
  return showNotification({
    title: `Message from ${from}`,
    body: message,
    type: "message",
    onClick,
  });
}

/**
 * Show calendar reminder notification
 * @param {string} title - Event title
 * @param {string} time - Event time
 * @param {Function} [onClick] - Click handler
 */
export function showCalendarNotification(title, time, onClick) {
  return showNotification({
    title: "Calendar Reminder",
    body: `${title} - ${time}`,
    type: "calendar",
    onClick,
  });
}

/**
 * JavaScript code to inject into pages for detecting notifications
 * This observes DOM changes to detect unread counts and new messages
 */
export function getNotificationObserverScript() {
  return `
    (function() {
      // Track last known state
      let lastUnreadCount = 0;
      let lastTitle = document.title;

      // Parse unread count from title like "(5) - Outlook"
      function parseUnreadCount(title) {
        const match = title.match(/^\\((\\d+)\\)/);
        return match ? parseInt(match[1], 10) : 0;
      }

      // Observer for title changes (unread count)
      const titleObserver = new MutationObserver(() => {
        const newTitle = document.title;
        if (newTitle !== lastTitle) {
          const newCount = parseUnreadCount(newTitle);
          const oldCount = parseUnreadCount(lastTitle);

          if (newCount > oldCount) {
            // New unread items - send to main process
            window.electronAPI?.send('notification:unread-changed', {
              count: newCount,
              increased: true,
            });
          }

          lastTitle = newTitle;
          lastUnreadCount = newCount;
        }
      });

      // Observe the title element
      const titleElement = document.querySelector('title');
      if (titleElement) {
        titleObserver.observe(titleElement, { childList: true, characterData: true, subtree: true });
      }

      // Also observe document for title changes
      titleObserver.observe(document, { childList: true, subtree: true });

      // Send initial unread count
      const initialCount = parseUnreadCount(document.title);
      if (initialCount > 0) {
        window.electronAPI?.send('notification:unread-changed', {
          count: initialCount,
          increased: false,
        });
      }

      // Clean up on page unload
      window.addEventListener('beforeunload', () => {
        titleObserver.disconnect();
      });
    })();
  `;
}

/**
 * Initialize notification IPC handlers
 */
export function initNotificationIPC() {
  ipcMain.on("notification:unread-changed", (event, data) => {
    // Emit event for badge module
    app.emit("unread-count-changed", data.count);

    // Show notification if count increased
    if (data.increased && areNotificationsEnabled()) {
      // Determine which app based on sender window URL
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        const url = window.webContents.getURL();
        if (url.includes("outlook")) {
          showNotification({
            title: "New Email",
            body: `You have ${data.count} unread emails`,
            type: "email",
            onClick: () => {
              window.show();
              window.focus();
            },
          });
        } else if (url.includes("teams")) {
          showNotification({
            title: "New Message",
            body: `You have ${data.count} unread messages`,
            type: "message",
            onClick: () => {
              window.show();
              window.focus();
            },
          });
        }
      }
    }
  });

  ipcMain.on("notification:show", (event, options) => {
    showNotification(options);
  });
}

/**
 * Inject notification observer into a window
 * @param {BrowserWindow} window - Window to inject into
 */
export function injectNotificationObserver(window) {
  window.webContents.executeJavaScript(getNotificationObserverScript()).catch(() => {
    // Ignore errors - page might not be ready
  });
}
