# Building MS-365-Electron

Instructions for building MS-365-Electron from source.

## Prerequisites

### Required Software

- **Node.js** 18.x or later
- **npm** 9.x or later (or **yarn** 4.x)
- **Git**

### Build Dependencies by Distribution

#### Fedora / RHEL

```bash
# Base requirements
sudo dnf install nodejs npm git

# For RPM builds with fpm
sudo dnf install rpm-build ruby ruby-devel gcc make
sudo gem install fpm
```

#### Ubuntu / Debian

```bash
# Base requirements
sudo apt install nodejs npm git

# For DEB builds with fpm
sudo apt install dpkg-dev ruby ruby-dev build-essential
sudo gem install fpm
```

#### Arch Linux

```bash
# Base requirements
sudo pacman -S nodejs npm git

# For package builds
sudo pacman -S ruby base-devel
sudo gem install fpm
```

## Getting the Source

```bash
git clone https://github.com/agam778/MS-365-Electron.git
cd MS-365-Electron
```

## Installing Dependencies

```bash
npm install
# or
yarn install
```

This installs all required dependencies including:
- Electron 35
- electron-builder 25
- @cliqz/adblocker-electron (ad blocking)
- @xhayper/discord-rpc (Discord Rich Presence)
- electron-store (settings persistence)
- electron-updater (auto-updates)

## Development

### Running in Development Mode

```bash
# Standard mode
npm start

# With Wayland support
npm run start:wayland
```

The app will auto-reload on file changes when running in development.

### Project Structure

```
MS-365-Electron/
├── app/
│   ├── main.js              # Main Electron process
│   ├── preload.js           # Secure preload script
│   ├── useragents.json      # Linux user agent strings
│   ├── domains.json         # Allowed domains whitelist
│   └── config/
│       ├── appLauncher.js   # Centralized app launching
│       ├── arch.js          # Architecture detection
│       ├── badge.js         # Unread badge count
│       ├── cli.js           # CLI argument parser
│       ├── dimensions.js    # Screen dimension helpers
│       ├── dropHandler.js   # Drag and drop handling
│       ├── fileHandler.js   # File association handling
│       ├── hotkeyManager.js # Global keyboard shortcuts
│       ├── mediaState.js    # Camera/microphone tracking
│       ├── menu.js          # Application menu
│       ├── notifications.js # Desktop notifications
│       ├── power.js         # Power management
│       ├── preferences.js   # Preferences window
│       ├── rpc.js           # Discord Rich Presence
│       ├── sessionManager.js# Session save/restore
│       ├── store.js         # Settings persistence
│       ├── theme.js         # Theme system
│       ├── tray.js          # System tray
│       ├── utils.js         # Utility functions
│       ├── wayland.js       # Wayland support
│       ├── windowManager.js # Window management
│       └── xdg.js           # XDG directory compliance
├── assets/
│   └── icons/
│       ├── png/             # App icons (16x16 to 1024x1024)
│       └── apps/            # Office app icons (word.png, excel.png, etc.)
├── docs/                    # GitHub Pages documentation
├── package.json
├── README.md
├── BUILDING.md
└── CHANGELOG.md
```

## Building Packages

### Using electron-builder

#### Build for Current Architecture

```bash
npm run dist
```

#### Build for Specific Architecture

```bash
# Build for x86_64
npm run dist:x64

# Build for ARM64
npm run dist:arm64

# Build for both architectures
npm run dist:all
```

#### Build Unpacked (for testing)

```bash
npm run pack
```

Output goes to the `release/` directory.

### Build Targets

Configured in package.json:

| Format | Architectures |
|--------|---------------|
| DEB | x64, arm64 |
| RPM | x64, arm64 |
| AppImage | x64, arm64 |
| tar.gz | x64, arm64 |

### Manual RPM Build with fpm

If electron-builder has issues with RPM on your system, use fpm directly:

#### Step 1: Build the unpacked app

```bash
# For ARM64
npx electron-builder --linux tar.gz --arm64

# For x86_64
npx electron-builder --linux tar.gz --x64
```

#### Step 2: Create staging directory

```bash
mkdir -p release/rpm-staging/{opt,usr/bin,usr/share/applications}
mkdir -p release/rpm-staging/usr/share/icons/hicolor/{16x16,24x24,32x32,48x48,64x64,128x128,256x256,512x512}/apps
```

#### Step 3: Copy files

```bash
# Copy app (adjust path for architecture)
cp -r release/linux-arm64-unpacked release/rpm-staging/opt/ms-365-electron

# Copy icons
for size in 16 24 32 48 64 128 256 512; do
  cp assets/icons/png/${size}x${size}.png \
    release/rpm-staging/usr/share/icons/hicolor/${size}x${size}/apps/ms-365-electron.png
done

# Create executable symlink
ln -sf /opt/ms-365-electron/ms-365-electron release/rpm-staging/usr/bin/ms-365-electron
```

#### Step 4: Create desktop entry

Create `release/rpm-staging/usr/share/applications/ms-365-electron.desktop`:

```ini
[Desktop Entry]
Name=MS 365 Electron
Comment=Unofficial Microsoft 365 Desktop Client
Exec=/opt/ms-365-electron/ms-365-electron --ozone-platform-hint=auto %U
Icon=ms-365-electron
Type=Application
Categories=Office;
MimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document;application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;application/vnd.openxmlformats-officedocument.presentationml.presentation;
StartupNotify=true
StartupWMClass=ms-365-electron
Terminal=false
```

#### Step 5: Build RPM with fpm

```bash
fpm -s dir -t rpm \
  --name ms-365-electron \
  --version 2.1.0 \
  --architecture aarch64 \
  --description "Unofficial Microsoft 365 Desktop Client for Linux" \
  --maintainer "Your Name <your@email.com>" \
  --license MIT \
  --url "https://github.com/agam778/MS-365-Electron" \
  --category "Office" \
  --package release/MS-365-Electron-v2.1.0-linux-aarch64.rpm \
  --depends "libnotify" \
  --depends "nss" \
  --depends "libXScrnSaver" \
  --depends "libdrm" \
  --depends "mesa-libgbm" \
  --depends "alsa-lib" \
  -C release/rpm-staging \
  .
```

For x86_64, change `--architecture aarch64` to `--architecture x86_64`.

### Manual DEB Build with fpm

Similar to RPM, but use `-t deb`:

```bash
fpm -s dir -t deb \
  --name ms-365-electron \
  --version 2.1.0 \
  --architecture arm64 \
  --description "Unofficial Microsoft 365 Desktop Client for Linux" \
  --maintainer "Your Name <your@email.com>" \
  --license MIT \
  --url "https://github.com/agam778/MS-365-Electron" \
  --category "Office" \
  --package release/MS-365-Electron-v2.1.0-linux-arm64.deb \
  --depends "libnotify4" \
  --depends "libnss3" \
  --depends "libxss1" \
  --depends "libdrm2" \
  --depends "libgbm1" \
  --depends "libasound2" \
  -C release/rpm-staging \
  .
```

For x86_64/amd64, change `--architecture arm64` to `--architecture amd64`.

## Build Outputs

After building, the `release/` directory contains:

| File | Description |
|------|-------------|
| `linux-arm64-unpacked/` | Unpacked app (ARM64) |
| `linux-unpacked/` | Unpacked app (x86_64) |
| `MS-365-Electron-v*.tar.gz` | Portable archive |
| `MS-365-Electron-v*.rpm` | RPM package |
| `MS-365-Electron-v*.deb` | DEB package |
| `MS-365-Electron-v*.AppImage` | AppImage |

## Testing the Build

### Test unpacked app

```bash
./release/linux-arm64-unpacked/ms-365-electron
```

### Test RPM installation

```bash
# Install
sudo dnf install ./release/MS-365-Electron-v2.1.0-linux-aarch64.rpm

# Verify files
rpm -ql ms-365-electron | head -20

# Launch
ms-365-electron

# Uninstall
sudo dnf remove ms-365-electron
```

### Test DEB installation

```bash
# Install
sudo dpkg -i ./release/MS-365-Electron-v2.1.0-linux-arm64.deb
sudo apt-get install -f  # Fix dependencies

# Launch
ms-365-electron

# Uninstall
sudo apt remove ms-365-electron
```

### Verify desktop integration

```bash
# Refresh icon cache
sudo gtk-update-icon-cache /usr/share/icons/hicolor/

# Validate desktop file
desktop-file-validate /usr/share/applications/ms-365-electron.desktop
```

## Troubleshooting

### electron-builder fails to download Electron

Set a mirror:

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm run dist
```

### Native module compilation fails

Install build tools:

```bash
# Fedora
sudo dnf install python3 make gcc-c++

# Ubuntu
sudo apt install python3 build-essential
```

### fpm not found

Install Ruby and fpm:

```bash
sudo gem install fpm
```

### RPM build fails silently

Ensure rpmbuild is installed:

```bash
sudo dnf install rpm-build  # Fedora
sudo apt install rpm         # Ubuntu
```

## Cross-Compilation

Building ARM64 packages on x86_64 (or vice versa) requires additional setup.

### Using Docker

```bash
# ARM64 build on x86_64
docker run --rm -v $(pwd):/app -w /app arm64v8/node:18 \
  bash -c "npm install && npm run dist:arm64"
```

### Using QEMU

```bash
# Install QEMU
sudo dnf install qemu-user-static

# Register ARM64 binary format
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes

# Build in ARM64 container
docker run --rm -v $(pwd):/app -w /app arm64v8/fedora:42 \
  bash -c "dnf install -y nodejs npm && npm install && npm run dist"
```

## Release Checklist

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Commit changes
4. Build all packages:
   ```bash
   npm run dist:all
   ```
5. Test installation on target systems
6. Create GitHub release with built packages
7. Tag the release:
   ```bash
   git tag v2.1.0
   git push origin v2.1.0
   ```

## Package Manager Configuration

The project uses yarn 4.7.0 as specified in package.json. To enable:

```bash
corepack enable
corepack prepare yarn@4.7.0 --activate
```

Or continue using npm if you prefer.
