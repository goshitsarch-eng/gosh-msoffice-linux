import { app, dialog, shell } from "electron";
import axios from "axios";
import { setValue } from "./store.js";

export async function checkForUpdates() {
  try {
    const res = await axios.get(
      "https://api.github.com/repos/goshitsarch-eng/gosh-msoffice-linux/releases/latest"
    );
    const data = res.data;
    const currentVersion = "v" + app.getVersion();
    const latestVersion = data.tag_name;

    if (currentVersion !== latestVersion) {
      const updatedialog = dialog.showMessageBoxSync({
        type: "info",
        title: "Update Available",
        message: `Current version: ${currentVersion}\nLatest version: ${latestVersion}\n\nPlease update to the latest version.`,
        buttons: ["Download", "Close"],
      });
      if (updatedialog === 0) {
        shell.openExternal("https://github.com/goshitsarch-eng/gosh-msoffice-linux/releases/latest");
      }
    } else {
      dialog.showMessageBoxSync({
        type: "info",
        title: "No Update Available",
        message: `Your App's version: ${currentVersion}\nLatest version: ${latestVersion}\n\nYou are already using the latest version.`,
        buttons: ["OK"],
      });
    }
  } catch (error) {
    console.error("Error checking for updates:", error);
  }
}

export async function openExternalLink(url) {
  await shell.openExternal(url);
}

export async function openLogsFolder() {
  // Use XDG_STATE_HOME if set, otherwise fall back to ~/.local/state
  const xdgStateHome = process.env.XDG_STATE_HOME || `${process.env.HOME}/.local/state`;
  const logsPath = `${xdgStateHome}/ms-365-electron/logs/`;
  await shell.openPath(logsPath);
}

export function setUserAgent(useragent) {
  setValue("useragentstring", useragent);
  const updatedialog = dialog.showMessageBoxSync({
    type: "info",
    title: "User-Agent string changed",
    message: `You have switched to the ${useragent} User-Agent string.\n\nPlease restart the app for the changes to take effect.`,
    buttons: ["Later", "Restart"],
  });
  if (updatedialog === 1) {
    app.relaunch();
    app.exit();
  }
}
