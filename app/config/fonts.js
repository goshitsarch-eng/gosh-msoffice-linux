import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

/**
 * Bundled font support for immutable distros and AppImage.
 * On systems where Chromium can't find system fonts (AppImage, rpm-ostree,
 * NixOS), this module writes a fontconfig configuration that adds bundled
 * Noto Sans fonts and cascades into the system font config.
 * Must be called before app.ready so Chromium's Skia picks up the config.
 */

/**
 * Get the path to bundled font files inside the app resources.
 * @returns {string} Absolute path to the fonts directory
 */
export function getBundledFontsPath() {
  return join(process.resourcesPath, "fonts");
}

/**
 * Check whether bundled fonts are present in the app resources.
 * @returns {boolean} True if the fonts directory and NotoSans-Regular.ttf exist
 */
export function hasBundledFonts() {
  try {
    const fontsDir = getBundledFontsPath();
    return existsSync(fontsDir) && existsSync(join(fontsDir, "NotoSans-Regular.ttf"));
  } catch {
    return false;
  }
}

/**
 * Detect whether the current environment needs bundled fonts.
 * Returns true for AppImage, rpm-ostree/immutable distros, and NixOS.
 * @returns {boolean} True if bundled fonts should be configured
 */
export function needsBundledFonts() {
  // Running as AppImage
  if (process.env.APPIMAGE) return true;

  // rpm-ostree / Fedora Atomic / Bazzite / Universal Blue
  if (existsSync("/run/ostree-booted")) return true;

  // NixOS
  if (existsSync("/nix/store")) return true;

  return false;
}

/**
 * Configure fontconfig to use bundled fonts.
 * Writes a fontconfig XML that adds the bundled font directory and cascades
 * into system fonts. Sets FONTCONFIG_FILE so Chromium picks it up.
 * No-op if bundled fonts aren't present or the environment doesn't need them.
 */
export function configureFonts() {
  if (!needsBundledFonts() || !hasBundledFonts()) return;

  const fontsPath = getBundledFontsPath();
  const cacheDir = join(homedir(), ".cache", "ms-365-electron", "fontconfig");
  const confPath = join(cacheDir, "fonts.conf");

  try {
    mkdirSync(cacheDir, { recursive: true });

    const fontconfigXml = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <!-- Bundled Noto Sans fonts for environments without system fontconfig -->
  <dir>${fontsPath}</dir>

  <!-- Cascade into system fonts when available -->
  <include ignore_missing="yes">/etc/fonts/fonts.conf</include>

  <!-- Cache directory -->
  <cachedir>${cacheDir}</cachedir>
</fontconfig>
`;

    writeFileSync(confPath, fontconfigXml);
    process.env.FONTCONFIG_FILE = confPath;

    console.log(`Bundled fonts configured: ${fontsPath}`);
  } catch (err) {
    console.warn("Failed to configure bundled fonts:", err);
  }
}
