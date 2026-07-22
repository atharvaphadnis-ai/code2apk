/**
 * Web2App Studio — local Express server.
 * Serves the GUI, accepts URL/HTML uploads, triggers the Android build,
 * and streams build logs back to the browser via Server-Sent Events.
 *
 * Nothing here calls any external API. Everything runs on your machine.
 */
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const archiver = require("archiver");

const { handleUpload, ensureDirs, resolveSaveFolder, setSaveFolder, getSaveFolder } = require("./fileHandler");
const { buildApk, buildEvents } = require("./apkBuilder");

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT = path.resolve(__dirname, "..");
const FRONTEND_DIR = path.join(ROOT, "frontend");
const OUTPUT_DIR = path.join(ROOT, "output");
const HOSTED_DIR = path.join(ROOT, "hosted");

ensureDirs();

app.use(cors());
app.use(express.json());
app.use(express.static(FRONTEND_DIR));
// The WebView (when set to "local HTML" mode) fetches from /hosted/<buildId>/index.html
app.use("/hosted", express.static(HOSTED_DIR));
// The download button pulls the finished APK from here
app.use("/output", express.static(OUTPUT_DIR));

// Multer: accept HTML files or a single ZIP bundle. Save folder is user-configurable.
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, resolveSaveFolder()),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}_${safe}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

/* --------------------------- Settings endpoints --------------------------- */

app.get("/api/settings", (_req, res) => {
  res.json({ saveFolder: getSaveFolder() });
});

app.post("/api/settings/save-folder", (req, res) => {
  const { folder } = req.body || {};
  if (!folder || typeof folder !== "string") {
    return res.status(400).json({ error: "folder (string) is required" });
  }
  try {
    setSaveFolder(folder);
    res.json({ ok: true, saveFolder: getSaveFolder() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* -------------------------- Build log SSE stream -------------------------- */

app.get("/api/logs/:buildId", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  const { buildId } = req.params;
  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const onLog = (id, line) => id === buildId && send("log", { line });
  const onDone = (id, payload) => {
    if (id !== buildId) return;
    send("done", payload);
    cleanup();
    res.end();
  };
  const onError = (id, message) => {
    if (id !== buildId) return;
    send("error", { message });
    cleanup();
    res.end();
  };

  buildEvents.on("log", onLog);
  buildEvents.on("done", onDone);
  buildEvents.on("error", onError);

  const cleanup = () => {
    buildEvents.off("log", onLog);
    buildEvents.off("done", onDone);
    buildEvents.off("error", onError);
  };
  req.on("close", cleanup);
});

/* ------------------------------ Build endpoint ---------------------------- */

// Accept URL body OR one/more uploaded files under field "files"
app.post(
  "/build",
  upload.fields([
    { name: "files", maxCount: 50 },
    { name: "icon", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { url, appName } = req.body;
      const files = (req.files && req.files.files) || [];
      const iconFile = (req.files && req.files.icon && req.files.icon[0]) || null;

      if (!url && files.length === 0) {
        return res.status(400).json({ error: "Provide a URL or upload HTML/ZIP files." });
      }

      const buildId = `build_${Date.now()}`;
      const { targetUrl } = await handleUpload({
        buildId,
        url,
        files,
        hostedDir: HOSTED_DIR,
        publicBase: `http://10.0.2.2:${PORT}`, // Android emulator loopback to host
      });

      // Kick off the build asynchronously; client subscribes to SSE for logs.
      buildApk({
        buildId,
        appName: (appName && appName.trim()) || "Web2App",
        targetUrl,
        iconPath: iconFile ? iconFile.path : null,
        androidTemplate: path.join(ROOT, "android-template"),
        outputDir: OUTPUT_DIR,
      }).catch((err) => {
        // The builder itself emits errors on the event bus, but log to server console too.
        console.error(`[${buildId}] build failed:`, err);
      });

      res.json({ buildId, targetUrl });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },
);

/* -------------------------- Download the source zip ----------------------- */

app.get("/api/download-source", (_req, res) => {
  res.attachment("web2app-studio-source.zip");
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => res.status(500).send({ error: err.message }));
  archive.pipe(res);

  // Include everything except runtime junk
  const exclude = new Set(["node_modules", "output", "uploads", "hosted", ".gradle", "build"]);
  const walk = (dir, base = "") => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (exclude.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const rel = path.join(base, entry.name);
      if (entry.isDirectory()) walk(full, rel);
      else archive.file(full, { name: rel });
    }
  };
  walk(ROOT);
  archive.finalize();
});

app.listen(PORT, () => {
  console.log("\n Web2App Studio");
  console.log(` → http://localhost:${PORT}`);
  console.log(" Made by Atharva Phadnis\n");
});