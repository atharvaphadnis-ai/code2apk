# Web2App Studio

Turn any website URL or bundle of HTML files into an Android APK — locally,
with a clean web GUI. No API keys, no paid services, no cloud.

## Features

- URL input **or** drag-and-drop HTML / ZIP upload
- Custom app name and app icon (PNG)
- Live build logs streamed via Server-Sent Events
- Download the resulting APK and see its size
- **Download app files** — grab a ZIP of this project from the UI
- **Set save folder** — choose where uploaded files are stored on your disk

## Requirements

Install these on your machine before running:

1. **Node.js 18+**
2. **Java JDK 17** — `java -version` should print 17
3. **Android SDK** (with `platforms;android-34`, `build-tools;34.0.0`,
   `platform-tools`). Easiest via Android Studio → SDK Manager.
4. Set the SDK env var:
   - macOS / Linux: `export ANDROID_HOME="$HOME/Library/Android/sdk"`
   - Windows: `setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"`
5. Accept the SDK licenses: `sdkmanager --licenses`
6. **Gradle 8.5+** installed globally, once, to generate the wrapper jar.

## Setup

```bash
npm install

# One-time: generate the Gradle wrapper jar the Android build needs.
cd android-template && gradle wrapper --gradle-version 8.5 && cd ..

npm run dev
```

Then open **http://localhost:3000**.

## How it works

1. You enter a URL or drop HTML files.
2. The Express backend either uses your URL directly, or stages your files
   under `hosted/<buildId>/` and exposes them at
   `http://10.0.2.2:3000/hosted/<buildId>/index.html` (the Android emulator's
   loopback to your host machine).
3. `backend/apkBuilder.js` rewrites `MainActivity.java` and `strings.xml`,
   optionally replaces the launcher icon, then runs
   `./gradlew assembleDebug` via `child_process`.
4. The resulting APK is copied to `output/` and offered for download in the UI.

> **Real device (not emulator):** replace `10.0.2.2` with your computer's LAN
> IP in `backend/server.js` (`publicBase`) so the phone can reach the host.

## Project structure

```
web2app-studio/
├── frontend/               # Static GUI (HTML/CSS/vanilla JS)
├── backend/                # Express server + Gradle runner
├── android-template/       # Android WebView project (patched per build)
├── uploads/                # Default upload folder (configurable in UI)
├── output/                 # Built APKs land here
├── hosted/                 # Staged HTML bundles served to WebView
├── package.json
└── README.md
```

## Screenshots

_Add screenshots of the GUI here._

## License

MIT

---

**Made by Atharva Phadnis**
