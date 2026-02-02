import { app, desktopCapturer, session, ipcMain } from "electron";
import { existsSync } from "fs";

/**
 * Wayland display server support for Electron.
 * This module detects and configures Wayland support using Electron's Ozone platform.
 * Includes PipeWire support for screen sharing on Wayland.
 * Must be called before app.ready event.
 */

/**
 * Check if currently running under Wayland
 * @returns {boolean} True if Wayland is detected
 */
export function isWayland() {
  return (
    process.env.XDG_SESSION_TYPE === "wayland" ||
    process.env.WAYLAND_DISPLAY !== undefined
  );
}

/**
 * Check if currently running under X11
 * @returns {boolean} True if X11 is detected
 */
export function isX11() {
  return (
    process.env.XDG_SESSION_TYPE === "x11" ||
    (process.env.DISPLAY !== undefined && !isWayland())
  );
}

/**
 * Get the current display server type
 * @returns {"wayland" | "x11" | "unknown"} The display server type
 */
export function getDisplayServer() {
  if (isWayland()) return "wayland";
  if (isX11()) return "x11";
  return "unknown";
}

/**
 * Configure Electron for optimal Wayland support.
 * This should be called before app.ready to set the appropriate flags.
 * When running under Wayland, this enables the Ozone platform layer.
 */
export function configureWayland() {
  // Only configure Ozone if we're actually under Wayland
  if (isWayland()) {
    // Enable Ozone platform with Wayland support
    // The 'auto' hint allows Electron to choose the best backend
    app.commandLine.appendSwitch("ozone-platform-hint", "auto");

    // Enable Wayland IME support for better text input
    app.commandLine.appendSwitch("enable-wayland-ime");

    // All features in a single call to avoid overwriting
    app.commandLine.appendSwitch("enable-features",
      "UseOzonePlatform,WaylandWindowDecorations,WebRTCPipeWireCapturer,VaapiVideoDecoder,VaapiVideoEncoder"
    );

    console.log("Wayland detected - Ozone platform and PipeWire screen sharing enabled");
  } else {
    // Enable PipeWire for WebRTC screen capture and hardware video acceleration
    app.commandLine.appendSwitch("enable-features",
      "WebRTCPipeWireCapturer,VaapiVideoDecoder,VaapiVideoEncoder"
    );

    console.log(`Display server: ${getDisplayServer()} - PipeWire screen sharing enabled`);
  }
}

/**
 * Get the recommended command-line flags for Wayland
 * Useful for documentation or manual configuration
 * @returns {string[]} Array of command-line flags
 */
export function getWaylandFlags() {
  return [
    "--ozone-platform-hint=auto",
    "--enable-wayland-ime",
    "--enable-features=UseOzonePlatform,WaylandWindowDecorations,WebRTCPipeWireCapturer"
  ];
}

/**
 * Configure session for proper screen sharing permissions
 * Should be called after app.ready
 * @param {Session} ses - Electron session to configure
 */
export function configureScreenSharing(ses = session.defaultSession) {
  // Set up permission handler for media requests
  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    // Allow camera and microphone
    if (permission === "media") {
      callback(true);
      return;
    }

    // Allow screen capture (for screen sharing)
    if (permission === "display-capture") {
      callback(true);
      return;
    }

    // Allow notifications
    if (permission === "notifications") {
      callback(true);
      return;
    }

    // Allow clipboard access
    if (permission === "clipboard-read" || permission === "clipboard-sanitized-write") {
      callback(true);
      return;
    }

    // Default: deny all other permissions
    console.log(`Denied permission request: ${permission}`);
    callback(false);
  });

  // Set up device permission handler (for persistent permissions)
  ses.setDevicePermissionHandler((details) => {
    // Only allow audio/video input devices (camera, microphone)
    const allowedTypes = ["audiooutput", "audioinput", "videoinput"];
    if (allowedTypes.includes(details.deviceType)) {
      return true;
    }
    console.log(`Denied device permission: ${details.deviceType}`);
    return false;
  });
}

/**
 * Set up desktop capturer source handler for screen sharing
 * This handles the "select screen" dialog for screen sharing
 */
export function setupDesktopCapturerHandler() {
  // Handle screen share source selection
  ipcMain.handle("get-desktop-sources", async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: { width: 320, height: 180 },
      });

      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        appIcon: source.appIcon?.toDataURL() || null,
      }));
    } catch (error) {
      console.error("Failed to get desktop sources:", error);
      return [];
    }
  });
}

/**
 * Check if PipeWire is available on the system
 * @returns {boolean} True if PipeWire appears to be available
 */
export function isPipeWireAvailable() {
  // Check for PipeWire socket
  const pipeWireSocket = process.env.PIPEWIRE_RUNTIME_DIR ||
    process.env.XDG_RUNTIME_DIR + "/pipewire-0";

  try {
    return existsSync(pipeWireSocket);
  } catch {
    return false;
  }
}

/**
 * Get screen sharing capabilities
 * @returns {Object} Capabilities object
 */
export function getScreenSharingCapabilities() {
  return {
    displayServer: getDisplayServer(),
    pipeWireAvailable: isPipeWireAvailable(),
    nativeScreenShare: isWayland() ? isPipeWireAvailable() : true,
  };
}
