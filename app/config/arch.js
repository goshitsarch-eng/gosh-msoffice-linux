import { arch } from "os";
import useragents from "../useragents.json" with { type: "json" };

/**
 * Detects the system architecture and returns the appropriate user-agent string.
 * Supports x86_64 (x64) and aarch64 (arm64) architectures.
 */

/**
 * Get the current system architecture
 * @returns {"x86_64" | "aarch64"} The architecture identifier
 */
export function getArchitecture() {
  const cpuArch = arch();
  switch (cpuArch) {
    case "arm64":
      return "aarch64";
    case "x64":
    default:
      return "x86_64";
  }
}

/**
 * Get the optimal user-agent string based on detected architecture
 * @returns {string} The appropriate user-agent string for the current architecture
 */
export function getOptimalUserAgent() {
  const architecture = getArchitecture();
  if (architecture === "aarch64") {
    return useragents.Linux_aarch64;
  }
  return useragents.Linux_x86_64;
}

/**
 * Check if running on ARM64 architecture
 * @returns {boolean} True if running on ARM64/aarch64
 */
export function isARM64() {
  return getArchitecture() === "aarch64";
}

/**
 * Check if running on x86_64 architecture
 * @returns {boolean} True if running on x86_64
 */
export function isX86_64() {
  return getArchitecture() === "x86_64";
}
