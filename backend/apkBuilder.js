/**
 * Runs the Android Gradle build via child_process, streaming logs through
 * an EventEmitter that the SSE endpoint in server.js subscribes to.
 *
 * Requires a working local toolchain:
 *   - Java JDK 17+
 *   - Android SDK (with build-tools + platform for compileSdk 34)
 *   - ANDROID_HOME or ANDROID_SDK_ROOT env var pointing at the SDK
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { EventEmitter } = require("events");

const buildEvents = new EventEmitter();
buildEvents.setMaxListeners(0);

function emit(buildId, line) {
  buildEvents.emit("log", buildId, line);
  process.stdout.write(`[${buildId}] ${line}\n`);
}

function patchTemplate({ androidTemplate, targetUrl, appName, iconPath }) {
  const mainActivity = path.join(
    androidTemplate,
    "app/src/main/java/com/example/htmltoapk/MainActivity.java",
  );
  const stringsXml = path.join(androidTemplate, "app/src/main/res/values/strings.xml");

  let java = fs.readFileSync(mainActivity, "utf8");
  java = java.replace(/"(?:https?:\/\/[^"]*|__TARGET_URL__)"/, JSON.stringify(targetUrl));
  fs.writeFileSync(mainActivity, java);

  const xml = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="app_name">${escapeXml(appName)}</string>\n</resources>\n`;
  fs.writeFileSync(stringsXml, xml);

  if (iconPath && fs.existsSync(iconPath)) {
    const targets = [
      "app/src/main/res/mipmap-mdpi/ic_launcher.png",
      "app/src/main/res/mipmap-hdpi/ic_launcher.png",
      "app/src/main/res/mipmap-xhdpi/ic_launcher.png",
      "app/src/main/res/mipmap-xxhdpi/ic_launcher.png",
      "app/src/main/res/mipmap-xxxhdpi/ic_launcher.png",
    ];
    for (const rel of targets) {
      const abs = path.join(androidTemplate, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.copyFileSync(iconPath, abs);
    }
  }
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function buildApk({ buildId, appName, targetUrl, iconPath, androidTemplate, outputDir }) {
  try {
    emit(buildId, `Preparing template for ${appName}`);
    emit(buildId, `Target URL: ${targetUrl}`);
    patchTemplate({ androidTemplate, targetUrl, appName, iconPath });

    const isWin = process.platform === "win32";
    const gradlew = path.join(androidTemplate, isWin ? "gradlew.bat" : "gradlew");
    if (!isWin) {
      try { fs.chmodSync(gradlew, 0o755); } catch {}
    }

    emit(buildId, "Starting Gradle: assembleDebug");
    const child = spawn(gradlew, ["assembleDebug", "--console=plain"], {
      cwd: androidTemplate,
      env: { ...process.env },
      shell: isWin,
    });

    child.stdout.on("data", (b) => b.toString().split(/\r?\n/).forEach((l) => l && emit(buildId, l)));
    child.stderr.on("data", (b) => b.toString().split(/\r?\n/).forEach((l) => l && emit(buildId, l)));

    const code = await new Promise((resolve) => child.on("close", resolve));
    if (code !== 0) {
      buildEvents.emit("error", buildId, `Gradle exited with code ${code}. Check JDK + Android SDK setup.`);
      return;
    }

    const built = path.join(androidTemplate, "app/build/outputs/apk/debug/app-debug.apk");
    if (!fs.existsSync(built)) {
      buildEvents.emit("error", buildId, "Build succeeded but APK not found.");
      return;
    }

    fs.mkdirSync(outputDir, { recursive: true });
    const finalName = `${appName.replace(/[^a-zA-Z0-9_-]/g, "_")}_${buildId}.apk`;
    const finalPath = path.join(outputDir, finalName);
    fs.copyFileSync(built, finalPath);

    const sizeBytes = fs.statSync(finalPath).size;
    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);

    emit(buildId, `APK built: ${finalName} (${sizeMb} MB)`);
    buildEvents.emit("done", buildId, {
      apkPath: `/output/${finalName}`,
      apkName: finalName,
      sizeBytes,
      sizeMb,
    });
  } catch (err) {
    buildEvents.emit("error", buildId, err.message || String(err));
  }
}

module.exports = { buildApk, buildEvents };