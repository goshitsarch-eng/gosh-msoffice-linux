# MS-365-Electron

Unofficial Microsoft 365 desktop client for Linux, built with Electron.

[![License](https://img.shields.io/github/license/agam778/MS-365-Electron?style=flat)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-35-blue?logo=Electron&logoColor=white)](https://electronjs.org)

## Overview

MS-365-Electron provides a native desktop experience for [Microsoft 365](https://microsoft365.com) on Linux. Access Word, Excel, PowerPoint, Outlook, OneDrive, OneNote, and Teams without browser tabs.

This is a Linux-focused fork with native support for:
- **x86_64** - Standard Linux distributions
- **ARM64 (aarch64)** - Fedora Asahi on Apple Silicon, Raspberry Pi, and other ARM64 devices

## Features

### Desktop Integration
- **System Tray** - Quick launch menu, dynamic app icons, unread badge counts, and media state indicators
- **Desktop Notifications** - Native notifications for Outlook emails, Teams messages, and calendar reminders
- **File Associations** - Open .docx, .xlsx, .pptx files from your file manager
- **Global Hotkeys** - System-wide keyboard shortcuts to launch apps (X11 only)

### Linux Support
- **Native Wayland** - Automatic Ozone platform detection and configuration
- **PipeWire Screen Sharing** - Native screen sharing support on Wayland
- **XDG Compliance** - Proper use of XDG base directories for config, cache, data, and logs
- **Architecture Detection** - Automatic user-agent selection for x86_64 or aarch64

### App Features
- **Multiple Accounts** - Switch between personal and work/school accounts with separate sessions
- **Session Restore** - Restore windows from your last session
- **Minimize to Tray** - Keep running in background when closing
- **Ad Blocking** - Built-in ad and tracker blocking
- **Discord Rich Presence** - Show what you're working on
- **Theme Support** - System, Light, or Dark themes

### Security
- Context isolation enabled
- Sandbox enabled for all windows
- Node integration disabled
- Secure preload script with whitelisted IPC channels

## Installation

### Fedora / RHEL / CentOS (RPM)

```bash
sudo dnf install ./MS-365-Electron-v2.1.0-linux-aarch64.rpm  # ARM64
sudo dnf install ./MS-365-Electron-v2.1.0-linux-x86_64.rpm   # x86_64
```

### Ubuntu / Debian (DEB)

```bash
sudo dpkg -i MS-365-Electron-v2.1.0-linux-arm64.deb   # ARM64
sudo dpkg -i MS-365-Electron-v2.1.0-linux-amd64.deb   # x86_64
sudo apt-get install -f  # Install dependencies if needed
```

### AppImage

```bash
chmod +x MS-365-Electron-v2.1.0-linux-arm64.AppImage
./MS-365-Electron-v2.1.0-linux-arm64.AppImage
```

### From Source

See [BUILDING.md](BUILDING.md) for detailed build instructions.

## Usage

### Command Line

```bash
# Standard launch
ms-365-electron

# Launch specific app
ms-365-electron --app word
ms-365-electron --app excel
ms-365-electron --app outlook

# Create new document
ms-365-electron --app word --new

# Compose new email
ms-365-electron --compose

# Use work account
ms-365-electron --app teams --account work

# Open a file (uploads to OneDrive)
ms-365-electron --open document.docx

# Show help
ms-365-electron --help
```

### Available Apps

`word`, `excel`, `powerpoint`, `outlook`, `onedrive`, `onenote`, `teams`, `allapps`

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New Window (Personal Account) |
| `Ctrl+Shift+N` | New Window (Work/School Account) |
| `Ctrl+W` | Close Window |
| `Ctrl+Q` | Quit |
| `Ctrl+R` | Reload |
| `Ctrl+Shift+R` | Force Reload |
| `Ctrl+0` | Reset Zoom |
| `Ctrl+=` | Zoom In |
| `Ctrl+-` | Zoom Out |
| `F11` | Toggle Full Screen |
| `Alt+Left` | Back |
| `Alt+Right` | Forward |
| `Alt+Home` | Home |
| `Ctrl+,` | Preferences |
| `Ctrl+Shift+C` | Copy URL to Clipboard |
| `F1` | Help |
| `Alt` | Show Menu Bar (when hidden) |

### Global Hotkeys (X11 Only)

Enable in Preferences > Advanced > Global keyboard shortcuts.

| Shortcut | Action |
|----------|--------|
| `Super+Shift+W` | Launch Word |
| `Super+Shift+E` | Launch Excel |
| `Super+Shift+P` | Launch PowerPoint |
| `Super+Shift+O` | Launch Outlook |
| `Super+Shift+D` | Launch OneDrive |
| `Super+Shift+N` | Launch OneNote |
| `Super+Shift+T` | Launch Teams |
| `Super+Shift+M` | Launch Home |

## Configuration

Access settings via **Help > Preferences** or `Ctrl+,`.

### Settings

| Category | Setting | Description |
|----------|---------|-------------|
| **General** | Account Type | Personal or Work/School |
| | Restore Session | Reopen windows from last session |
| | Start Minimized | Start in system tray |
| | Minimize to Tray | Hide to tray instead of quitting |
| | Default Home Page | Home, Create, My Content, or Apps |
| | Window Size | Default window size (60%-100%) |
| | Auto-hide Menu Bar | Press Alt to show |
| | Theme | System, Light, or Dark |
| **Apps** | Open in New Windows | Open Office apps in separate windows |
| | Dynamic Icons | Change tray icon based on active app |
| **Privacy** | Block Ads/Trackers | Block advertising and tracking |
| | External Links | Open non-Microsoft links in browser |
| **Network** | User Agent | Linux x86_64 or Linux aarch64 |
| **Advanced** | Auto Updates | Check for updates automatically |
| | Discord RPC | Show activity in Discord |
| | Global Hotkeys | System-wide shortcuts (X11 only) |

### File Locations

| Purpose | Path |
|---------|------|
| Config | `~/.config/ms-365-electron/` |
| Data | `~/.local/share/ms-365-electron/` |
| State | `~/.local/state/ms-365-electron/` |
| Cache | `~/.cache/ms-365-electron/` |
| Logs | `~/.local/state/ms-365-electron/logs/` |

Or set via `XDG_CONFIG_HOME`, `XDG_DATA_HOME`, `XDG_STATE_HOME`, `XDG_CACHE_HOME`.

## System Requirements

### Minimum

- Linux kernel 5.10+
- glibc 2.28+
- X11 or Wayland display server
- 4 GB RAM
- 500 MB disk space

### Recommended

- Wayland compositor (GNOME, KDE Plasma, Sway)
- 8 GB RAM
- PipeWire (for Wayland screen sharing)

### Dependencies

**Fedora/RHEL:**
```bash
sudo dnf install libnotify nss libXScrnSaver libdrm mesa-libgbm alsa-lib
```

**Ubuntu/Debian:**
```bash
sudo apt install libnotify4 libnss3 libxss1 libdrm2 libgbm1 libasound2
```

## Wayland Support

MS-365-Electron automatically detects Wayland and configures:
- Ozone platform layer for native Wayland rendering
- Wayland IME for text input
- PipeWire for screen sharing (if available)

To force Wayland mode:

```bash
ms-365-electron --ozone-platform-hint=auto
```

Or set the environment variable:

```bash
ELECTRON_OZONE_PLATFORM_HINT=auto ms-365-electron
```

## Troubleshooting

### App doesn't appear in menu after installation

Refresh the icon cache:

```bash
sudo gtk-update-icon-cache /usr/share/icons/hicolor/
```

### Blank screen on Wayland

Try forcing X11 mode:

```bash
GDK_BACKEND=x11 ms-365-electron
```

### Screen sharing doesn't work on Wayland

Ensure PipeWire is running:

```bash
systemctl --user status pipewire
```

### High memory usage

Disable hardware acceleration:

```bash
ms-365-electron --disable-gpu
```

### View Logs

Logs are at `~/.local/state/ms-365-electron/logs/` or use **Help > View Logs**.

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Quick Start

```bash
git clone https://github.com/agam778/MS-365-Electron.git
cd MS-365-Electron
npm install
npm start
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run in development mode |
| `npm run start:wayland` | Run with Wayland flags |
| `npm run dist` | Build for current architecture |
| `npm run dist:x64` | Build for x86_64 |
| `npm run dist:arm64` | Build for ARM64 |
| `npm run dist:all` | Build for all architectures |
| `npm run pack` | Create unpacked build |

## Project Structure

```
app/
├── main.js              # Main Electron process
├── preload.js           # Secure context bridge
├── useragents.json      # Linux user-agent strings
├── domains.json         # Allowed domains whitelist
└── config/
    ├── appLauncher.js   # Centralized app launching
    ├── arch.js          # Architecture detection
    ├── badge.js         # Unread badge count
    ├── cli.js           # CLI argument parser
    ├── dimensions.js    # Screen dimension helpers
    ├── dropHandler.js   # Drag and drop handling
    ├── fileHandler.js   # File association handling
    ├── hotkeyManager.js # Global keyboard shortcuts
    ├── mediaState.js    # Camera/microphone tracking
    ├── menu.js          # Application menu
    ├── notifications.js # Desktop notifications
    ├── power.js         # Sleep prevention during calls
    ├── preferences.js   # Preferences window
    ├── rpc.js           # Discord Rich Presence
    ├── sessionManager.js# Session save/restore
    ├── store.js         # Settings persistence
    ├── theme.js         # Theme system
    ├── tray.js          # System tray
    ├── utils.js         # Utility functions
    ├── wayland.js       # Wayland/PipeWire support
    ├── windowManager.js # Window management
    └── xdg.js           # XDG directory compliance
```

## License

[MIT License](LICENSE)

---

*Disclaimer: This is an unofficial project, not affiliated with Microsoft. Office, the name, website, images/icons are the intellectual properties of Microsoft.*

*This is a Linux-focused fork. Original project by [Agampreet Singh](https://github.com/agam778).*
