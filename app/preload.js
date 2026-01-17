/**
 * Preload Script
 * Secure context isolation with expanded IPC APIs
 */

import { contextBridge, ipcRenderer } from "electron";

/**
 * Allowed IPC channels for security
 * Expanded for new features: notifications, media state, power management, etc.
 */
const validSendChannels = [
  // Settings
  "settings:set",

  // Navigation
  "navigation:back",
  "navigation:forward",
  "navigation:reload",
  "navigation:home",

  // Window management
  "window:minimize",
  "window:maximize",
  "window:close",

  // App
  "app:quit",

  // Preferences
  "preferences:restart",

  // Notifications
  "notification:unread-changed",
  "notification:show",

  // Media state
  "media:state-changed",
  "media:screen-share-changed",

  // Power management
  "power:call-state-changed",

  // Drag and drop
  "drop:files",
];

const validReceiveChannels = [
  // Settings
  "settings:changed",

  // App updates
  "app:update-available",
  "app:offline",

  // Theme
  "theme:changed",

  // Session
  "session:restored",
];

const validInvokeChannels = [
  // Settings
  "settings:get",
  "settings:getAll",

  // App info
  "app:getVersion",
  "app:getArchitecture",
  "app:isWayland",

  // Preferences
  "preferences:get",
  "preferences:set",

  // Screen sharing
  "get-desktop-sources",
];

// Expose protected methods to renderer
contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * Send a message to the main process (one-way)
   * @param {string} channel - The IPC channel
   * @param {any} data - The data to send
   */
  send: (channel, data) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
      console.warn(`Invalid send channel: ${channel}`);
    }
  },

  /**
   * Receive messages from the main process
   * @param {string} channel - The IPC channel
   * @param {Function} callback - The callback function
   * @returns {Function} Cleanup function
   */
  on: (channel, callback) => {
    if (validReceiveChannels.includes(channel)) {
      // Wrap callback to strip event object for security
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);

      // Return cleanup function
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    } else {
      console.warn(`Invalid receive channel: ${channel}`);
      return () => {};
    }
  },

  /**
   * Invoke a method in the main process and get a response
   * @param {string} channel - The IPC channel
   * @param {any} data - The data to send
   * @returns {Promise<any>} The response from main process
   */
  invoke: (channel, data) => {
    if (validInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    } else {
      console.warn(`Invalid invoke channel: ${channel}`);
      return Promise.reject(new Error(`Invalid channel: ${channel}`));
    }
  },

  /**
   * Remove all listeners for a channel
   * @param {string} channel - The IPC channel
   */
  removeAllListeners: (channel) => {
    if (validReceiveChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
});

// Expose platform information
contextBridge.exposeInMainWorld("platform", {
  isLinux: true,
  os: "linux",
});

// Expose app info
contextBridge.exposeInMainWorld("appInfo", {
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  getArchitecture: () => ipcRenderer.invoke("app:getArchitecture"),
  isWayland: () => ipcRenderer.invoke("app:isWayland"),
});

console.log("Preload script loaded - context isolation enabled");
