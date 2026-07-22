/**
 * Handles uploads, save-folder configuration, and preparing the hosted
 * bundle that the Android WebView will load when the user uploads HTML.
 */
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_UPLOADS = path.join(ROOT, "uploads");
const SETTINGS_FILE = path.join(ROOT, ".settings.json");

function ensureDirs() {
  for (const d of [
    DEFAULT_UPLOADS,
    path.join(ROOT, "output"),
    path.join(ROOT, "hosted"),
  ]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeSettings(patch) {
  const next = { ...readSettings(), ...patch };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2));
  return next;
}

function getSaveFolder() {
  return readSettings().saveFolder || DEFAULT_UPLOADS;
}

function resolveSaveFolder() {
  const folder = getSaveFolder();
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

function setSaveFolder(folder) {
  const abs = path.isAbsolute(folder) ? folder : path.resolve(ROOT, folder);
  fs.mkdirSync(abs, { recursive: true });
  writeSettings({ saveFolder: abs });
  return abs;
}

/**
 * Prepare the URL the WebView should load.
 *  - If `url` is provided, we use it directly.
 *  - If files are uploaded, we copy/extract them into hosted/<buildId>/
 *    and return the emulator-reachable URL http://10.0.2.2:PORT/hosted/<id>/index.html.
 *    (Real devices should use the host machine's LAN IP instead of 10.0.2.2.)
 */
async function handleUpload({ buildId, url, files, hostedDir, publicBase }) {
  if (url && url.trim()) {
    return { targetUrl: url.trim() };
  }

  const dest = path.join(hostedDir, buildId);
  fs.mkdirSync(dest, { recursive: true });

  for (const f of files) {
    if (f.originalname.toLowerCase().endsWith(".zip")) {
      const zip = new AdmZip(f.path);
      zip.extractAllTo(dest, true);
    } else {
      fs.copyFileSync(f.path, path.join(dest, path.basename(f.originalname)));
    }
  }

  // If there's no index.html at the top level but there is one nested, hoist it.
  if (!fs.existsSync(path.join(dest, "index.html"))) {
    const found = findIndex(dest);
    if (found) {
      const nestedDir = path.dirname(found);
      for (const entry of fs.readdirSync(nestedDir)) {
        fs.renameSync(path.join(nestedDir, entry), path.join(dest, entry));
      }
    }
  }

  return { targetUrl: `${publicBase}/hosted/${buildId}/index.html` };
}

function findIndex(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = findIndex(full);
      if (nested) return nested;
    } else if (entry.name.toLowerCase() === "index.html") {
      return full;
    }
  }
  return null;
}

module.exports = {
  ensureDirs,
  handleUpload,
  resolveSaveFolder,
  getSaveFolder,
  setSaveFolder,
};