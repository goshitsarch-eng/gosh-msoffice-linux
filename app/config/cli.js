/**
 * CLI Argument Parser
 * Handles command-line arguments for MS-365-Electron
 */

import { app } from "electron";
import { getAppList, APP_NAMES } from "./appLauncher.js";

// Exit codes
export const EXIT_CODES = {
  SUCCESS: 0,
  INVALID_ARGUMENT: 1,
  UNKNOWN_APP: 2,
  FILE_NOT_FOUND: 3,
};

/**
 * CLI argument definitions
 */
const CLI_ARGS = {
  "--app": {
    description: "Launch a specific Office app",
    value: "<app-name>",
    examples: ["--app word", "--app outlook"],
  },
  "--compose": {
    description: "Open Outlook with a new email composition",
    value: null,
    examples: ["--compose"],
  },
  "--new": {
    description: "Create a new document (use with --app)",
    value: null,
    examples: ["--app word --new"],
  },
  "--open": {
    description: "Open a file (will upload to OneDrive)",
    value: "<file-path>",
    examples: ["--open document.docx"],
  },
  "--account": {
    description: "Use specific account type",
    value: "<personal|work>",
    examples: ["--account work"],
  },
  "--help": {
    description: "Show this help message",
    value: null,
    examples: ["--help"],
  },
  "--version": {
    description: "Show version information",
    value: null,
    examples: ["--version"],
  },
};

/**
 * Parse command-line arguments
 * @returns {object} Parsed arguments
 */
export function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    app: null,
    action: null,
    file: null,
    account: null,
    help: false,
    version: false,
    unknownArgs: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    // Skip Electron/Chromium internal arguments
    if (arg.startsWith("--ozone") || arg.startsWith("--enable") ||
        arg.startsWith("--disable") || arg.startsWith("--no-") ||
        arg === "%U" || arg === "%u" || arg === "%F" || arg === "%f") {
      continue;
    }

    switch (arg) {
      case "--app":
        if (nextArg && !nextArg.startsWith("--")) {
          parsed.app = nextArg.toLowerCase();
          i++;
        }
        break;

      case "--compose":
        parsed.app = "outlook";
        parsed.action = "compose";
        break;

      case "--new":
        parsed.action = "new";
        break;

      case "--open":
        if (nextArg && !nextArg.startsWith("--")) {
          parsed.file = nextArg;
          i++;
        }
        break;

      case "--account":
        if (nextArg && !nextArg.startsWith("--")) {
          parsed.account = nextArg.toLowerCase();
          i++;
        }
        break;

      case "--help":
      case "-h":
        parsed.help = true;
        break;

      case "--version":
      case "-v":
        parsed.version = true;
        break;

      default:
        // Check if it's a file path (doesn't start with --)
        if (!arg.startsWith("--") && !arg.startsWith("-")) {
          // Could be a file path passed directly
          if (arg.match(/\.(docx?|xlsx?|pptx?|pdf)$/i)) {
            parsed.file = arg;
          } else {
            parsed.unknownArgs.push(arg);
          }
        } else {
          parsed.unknownArgs.push(arg);
        }
    }
  }

  return parsed;
}

/**
 * Generate help text
 * @returns {string} Formatted help text
 */
export function getHelpText() {
  const appVersion = app.getVersion();
  const appList = getAppList();

  let help = `
MS-365-Electron v${appVersion}
Microsoft 365 desktop client for Linux

USAGE:
  ms-365-electron [OPTIONS]

OPTIONS:
`;

  for (const [arg, info] of Object.entries(CLI_ARGS)) {
    const valueStr = info.value ? ` ${info.value}` : "";
    help += `  ${arg}${valueStr}\n`;
    help += `      ${info.description}\n`;
    if (info.examples.length > 0) {
      help += `      Examples: ${info.examples.join(", ")}\n`;
    }
    help += "\n";
  }

  help += `AVAILABLE APPS:\n`;
  help += `  ${appList.map(a => a.id).join(", ")}\n\n`;

  help += `EXAMPLES:\n`;
  help += `  ms-365-electron --app word              Launch Word\n`;
  help += `  ms-365-electron --app word --new        Create new Word document\n`;
  help += `  ms-365-electron --compose               Compose new email in Outlook\n`;
  help += `  ms-365-electron --open document.docx    Open a document\n`;
  help += `  ms-365-electron --app teams --account work\n`;
  help += `                                          Open Teams with work account\n`;

  return help;
}

/**
 * Get version text
 * @returns {string} Version information
 */
export function getVersionText() {
  return `MS-365-Electron v${app.getVersion()}`;
}

/**
 * Validate parsed arguments
 * @param {object} parsed - Parsed arguments from parseArgs()
 * @returns {{valid: boolean, error?: string}}
 */
export function validateArgs(parsed) {
  // Validate app name if provided
  if (parsed.app) {
    const validApps = getAppList().map(a => a.id);
    if (!validApps.includes(parsed.app)) {
      return {
        valid: false,
        error: `Unknown app: "${parsed.app}". Valid apps are: ${validApps.join(", ")}`,
        exitCode: EXIT_CODES.UNKNOWN_APP,
      };
    }
  }

  // Validate account type if provided
  if (parsed.account && !["personal", "work"].includes(parsed.account)) {
    return {
      valid: false,
      error: `Invalid account type: "${parsed.account}". Use "personal" or "work".`,
      exitCode: EXIT_CODES.INVALID_ARGUMENT,
    };
  }

  // --new requires --app
  if (parsed.action === "new" && !parsed.app) {
    return {
      valid: false,
      error: "--new requires --app to specify which app to create a new document in.",
      exitCode: EXIT_CODES.INVALID_ARGUMENT,
    };
  }

  return { valid: true };
}

/**
 * Process CLI arguments and return startup configuration
 * @returns {object|null} Startup config or null if handled (help/version printed)
 */
export function processCLI() {
  const parsed = parseArgs();

  // Handle help
  if (parsed.help) {
    console.log(getHelpText());
    return { exit: true, code: EXIT_CODES.SUCCESS };
  }

  // Handle version
  if (parsed.version) {
    console.log(getVersionText());
    return { exit: true, code: EXIT_CODES.SUCCESS };
  }

  // Validate arguments
  const validation = validateArgs(parsed);
  if (!validation.valid) {
    console.error(`Error: ${validation.error}`);
    console.error("Use --help for usage information.");
    return { exit: true, code: validation.exitCode };
  }

  // Return startup configuration
  return {
    exit: false,
    startupApp: parsed.app,
    startupAction: parsed.action,
    startupFile: parsed.file,
    accountType: parsed.account,
  };
}

/**
 * Handle file argument (for file associations)
 * @param {string} filePath - Path to the file
 * @returns {{app: string, shouldUpload: boolean}}
 */
export function getAppForFile(filePath) {
  const ext = filePath.toLowerCase().split(".").pop();

  const fileTypeMap = {
    doc: { app: "word", shouldUpload: true },
    docx: { app: "word", shouldUpload: true },
    xls: { app: "excel", shouldUpload: true },
    xlsx: { app: "excel", shouldUpload: true },
    ppt: { app: "powerpoint", shouldUpload: true },
    pptx: { app: "powerpoint", shouldUpload: true },
    pdf: { app: "onedrive", shouldUpload: true },
  };

  return fileTypeMap[ext] || { app: "onedrive", shouldUpload: true };
}

export { CLI_ARGS };
