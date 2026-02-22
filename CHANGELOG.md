# Changelog

All notable changes to MS-365-Electron are documented in this file.

## [2.2.0] - 2026-02-22

### Added

#### AppImage Build Target
- AppImage packages now produced for both x64 and arm64 architectures
- CI/CD release workflow updated to upload AppImage artifacts alongside DEB, RPM, and tar.gz

#### Bundled Fonts for Immutable Distros (`app/config/fonts.js`)
- Noto Sans font family bundled as extra resources (Regular, Bold, Italic, BoldItalic, Mono)
- Automatic fontconfig integration for environments without system fonts
- Detects AppImage, rpm-ostree/Fedora Atomic/Bazzite, and NixOS
- Writes fontconfig XML with bundled font directory and system font cascade
- Configured before `app.ready` so Chromium's Skia picks up fonts immediately
- SIL Open Font License (OFL.txt) included

### Changed

#### Dependencies
- Electron 39 → 40 (Chromium 144, Node 24)
- electron-builder 26.4 → 26.8
- electron-updater 6.7 → 6.8
- electron-context-menu 4.0 → 4.1
- @xhayper/discord-rpc 1.0 → 1.3
- axios 1.4 → 1.13
- Ad blocker renamed from `@cliqz/adblocker-electron` to `@ghostery/adblocker-electron` 2.14

#### Repository Metadata
- Repository URL updated to `goshitsarch-eng/gosh-msoffice-linux`
- Author, maintainer, and appId updated to match this fork
- About dialog, help links, update checker, and issue reporter all point to correct repo
- Fixes auto-updater 404 errors caused by stale upstream URL

---

## [2.1.0] - 2026-01-16

### Overview

This release is a complete rewrite focused on Linux with native ARM64 support and comprehensive desktop integration.

### Added

#### Command Line Interface (`app/config/cli.js`)
- `--app <name>` - Launch specific app (word, excel, powerpoint, outlook, onedrive, onenote, teams)
- `--compose` - Open Outlook with new email composition
- `--new` - Create new document (use with --app)
- `--open <file>` - Open a file (uploads to OneDrive)
- `--account <personal|work>` - Use specific account type
- `--help` - Show help
- `--version` - Show version

#### System Tray (`app/config/tray.js`)
- System tray icon with context menu
- Quick launch menu for all Office apps
- Dynamic icon switching based on active app
- Unread badge count indicator
- Media state indicator (camera, microphone, screen share)
- Click to show/hide main window
- New Window options for Personal and Work accounts

#### Desktop Notifications (`app/config/notifications.js`)
- Native desktop notifications via Electron Notification API
- Unread count detection from page title
- Email notifications for Outlook
- Message notifications for Teams
- Calendar reminders
- Rate limiting to prevent notification spam

#### Session Management (`app/config/sessionManager.js`)
- Save window state on quit
- Restore windows on next launch
- Auto-save every 5 minutes
- Session expiry after 24 hours
- Window position, size, and maximized state preserved

#### Global Hotkeys (`app/config/hotkeyManager.js`)
- System-wide keyboard shortcuts (X11 only)
- Default bindings: Super+Shift+W/E/P/O/D/N/T/M for apps
- Customizable hotkey bindings
- Automatic cleanup on quit

#### Power Management (`app/config/power.js`)
- Prevent display sleep during video calls
- Automatic call detection for Teams
- Power save blocker management

#### File Handler (`app/config/fileHandler.js`)
- Open .docx, .xlsx, .pptx, .pdf files from file manager
- Support for legacy .doc, .xls, .ppt formats
- Support for ODF formats (.odt, .ods, .odp)
- File validation (existence, size limits)
- OneDrive upload integration

#### Preferences Window (`app/config/preferences.js`)
- GTK-style preferences dialog
- Categories: General, Apps, Privacy, Network, Advanced
- Account type selection
- Session restore toggle
- Start minimized option
- Minimize to tray option
- Theme selection (System, Light, Dark)
- Ad blocking toggle
- Discord RPC toggle
- Global hotkeys toggle

#### Theme System (`app/config/theme.js`)
- System theme detection via nativeTheme
- Light/Dark/System theme options
- CSS injection for web pages

#### Window Manager (`app/config/windowManager.js`)
- Multiple window tracking with metadata
- Window state persistence (position, size, maximized)
- App type detection from URL
- Account-specific windows
- Session state export for restore

#### App Launcher (`app/config/appLauncher.js`)
- Centralized app URL management
- Personal and Work account URLs
- Standard window creation options
- Security defaults (sandbox, context isolation)

#### Wayland Support (`app/config/wayland.js`)
- Automatic Wayland detection
- Ozone platform configuration
- PipeWire screen sharing support
- Wayland IME support
- Desktop capturer handler for screen sharing
- Permission handlers for media and display-capture

#### XDG Compliance (`app/config/xdg.js`)
- Config: `$XDG_CONFIG_HOME/ms-365-electron/`
- Data: `$XDG_DATA_HOME/ms-365-electron/`
- State: `$XDG_STATE_HOME/ms-365-electron/`
- Cache: `$XDG_CACHE_HOME/ms-365-electron/`
- Logs: `$XDG_STATE_HOME/ms-365-electron/logs/`
- Electron path configuration before app.ready

#### Architecture Detection (`app/config/arch.js`)
- Automatic CPU architecture detection
- Architecture-specific user-agent selection
- Support for x86_64 and aarch64

#### Badge Count (`app/config/badge.js`)
- Unread count from page title
- Tray icon badge updates
- Integration with notification system

#### Media State Tracking (`app/config/mediaState.js`)
- Camera active detection
- Microphone active detection
- Screen sharing detection
- Tray indicator updates

#### Drag and Drop (`app/config/dropHandler.js`)
- File drop handling on windows
- OneDrive upload integration

#### Secure Preload Script (`app/preload.js`)
- Context isolation enabled
- Whitelisted IPC channels
- Send, receive, and invoke methods
- Platform and app info exposure

### Changed

#### Main Process (`app/main.js`)
- Modular architecture with separate config modules
- XDG paths configured before app.ready
- Wayland configured before app.ready
- WM class set for GNOME taskbar matching
- Session restore on startup
- All feature modules initialized on ready

#### Application Menu (`app/config/menu.js`)
- GNOME HIG compliant structure
- File, Edit, View, Go, Window, Help menus
- Go menu with app launchers
- Keyboard shortcuts dialog
- About dialog

#### Settings Store (`app/config/store.js`)
- Architecture-aware default user-agent
- New defaults: theme, restoreSession, startMinimized, minimizeToTray
- Settings migration for old URL-style values

#### User Agents (`app/useragents.json`)
- Linux x86_64: Chrome/Edge on Linux x86_64
- Linux aarch64: Chrome/Edge on Linux aarch64

#### Package Configuration (`package.json`)
- Electron 35
- electron-builder 25
- Linux-only build targets
- ARM64 support for all package formats
- ES modules (type: module)
- yarn 4.7.0

### Removed

- Windows support and build targets
- macOS support and build targets
- Windows/macOS user agents
- Platform-specific icon directories
- ShareMenu integration (macOS only)
- Dock icon code (macOS only)
- Overlay icon code (Windows only)

### Security

All BrowserWindow instances use:
- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- Secure preload script

### Dependencies

**Runtime:**
- @cliqz/adblocker-electron ^1.26.6
- @xhayper/discord-rpc ^1.0.21
- axios ^1.4.0
- check-internet-connected ^2.0.6
- cross-fetch ^4.0.0
- electron-context-menu ^4.0.0
- electron-dl ^4.0.0
- electron-log ^5.0.0-beta.25
- electron-prompt ^1.7.0
- electron-store ^10.0.0
- electron-updater ^6.1.4

**Development:**
- electron ^35.0.0
- electron-builder ^25.0.0
- eslint ^9.0.0
- prettier ^3.1.0
- prettier-eslint ^16.1.2

---

## Previous Versions

For changelog of versions prior to this Linux-focused fork, see the original project:
https://github.com/agam778/MS-365-Electron
