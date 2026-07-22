// Web2App Studio — front-end controller
const $ = (id) => document.getElementById(id);

const dropzone = $("dropzone");
const fileInput = $("fileInput");
const fileList = $("fileList");
const buildBtn = $("buildBtn");
const logsCard = $("logsCard");
const logs = $("logs");
const statusEl = $("status");
const result = $("result");
const apkName = $("apkName");
const apkSize = $("apkSize");
const downloadApk = $("downloadApk");
const spinner = buildBtn.querySelector(".spinner");
const buildLabel = buildBtn.querySelector(".label");

let selectedFiles = [];

dropzone.addEventListener("click", () => fileInput.click());
["dragenter", "dragover"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add("drag"); })
);
["dragleave", "drop"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove("drag"); })
);
dropzone.addEventListener("drop", (e) => {
  if (e.dataTransfer && e.dataTransfer.files) addFiles([...e.dataTransfer.files]);
});
fileInput.addEventListener("change", () => addFiles([...fileInput.files]));

function addFiles(files) {
  selectedFiles = selectedFiles.concat(files);
  renderFileList();
}
function renderFileList() {
  fileList.innerHTML = selectedFiles
    .map((f) => `<li>• ${f.name} (${Math.round(f.size / 1024)} KB)</li>`)
    .join("");
}

buildBtn.addEventListener("click", async () => {
  const url = $("url").value.trim();
  const appName = $("appName").value.trim() || "Web2App";
  const iconFile = $("icon").files[0];

  if (!url && selectedFiles.length === 0) {
    alert("Please provide a URL or upload HTML files.");
    return;
  }

  setBuilding(true);
  resetLogs();

  const form = new FormData();
  if (url) form.append("url", url);
  form.append("appName", appName);
  if (iconFile) form.append("icon", iconFile);
  for (const f of selectedFiles) form.append("files", f);

  try {
    const res = await fetch("/build", { method: "POST", body: form });
    if (!res.ok) throw new Error((await res.json()).error || "Build failed to start");
    const { buildId, targetUrl } = await res.json();
    appendLog(`-> Build queued (${buildId})`);
    appendLog(`-> WebView will load: ${targetUrl}`);
    subscribeLogs(buildId);
  } catch (err) {
    appendLog(`Error: ${err.message}`);
    setStatus("error");
    setBuilding(false);
  }
});

function subscribeLogs(buildId) {
  const es = new EventSource(`/api/logs/${buildId}`);
  es.addEventListener("log", (e) => appendLog(JSON.parse(e.data).line));
  es.addEventListener("done", (e) => {
    const data = JSON.parse(e.data);
    appendLog(`OK Success - ${data.apkName} (${data.sizeMb} MB)`);
    apkName.textContent = data.apkName;
    apkSize.textContent = `${data.sizeMb} MB`;
    downloadApk.href = data.apkPath;
    result.hidden = false;
    setStatus("success");
    setBuilding(false);
    es.close();
  });
  es.addEventListener("error", (e) => {
    try { appendLog(`X ${JSON.parse(e.data).message}`); } catch { appendLog("Connection lost."); }
    setStatus("error");
    setBuilding(false);
    es.close();
  });
}

function setBuilding(b) {
  buildBtn.disabled = b;
  spinner.hidden = !b;
  buildLabel.textContent = b ? "Building..." : "Convert to APK";
  if (b) setStatus("building");
}
function setStatus(s) {
  statusEl.className = "pill " + s;
  statusEl.textContent = s;
}
function resetLogs() {
  logsCard.hidden = false;
  logs.textContent = "";
  result.hidden = true;
}
function appendLog(line) {
  logs.textContent += line + "\n";
  logs.scrollTop = logs.scrollHeight;
}

$("downloadSourceBtn").addEventListener("click", () => {
  window.location.href = "/api/download-source";
});

const dialog = $("saveFolderDialog");
const saveFolderInput = $("saveFolderInput");
$("saveFolderBtn").addEventListener("click", async () => {
  const res = await fetch("/api/settings");
  const data = await res.json();
  saveFolderInput.value = data.saveFolder || "";
  dialog.showModal();
});
$("saveFolderForm").addEventListener("submit", async (e) => {
  if (e.submitter && e.submitter.value === "cancel") return;
  e.preventDefault();
  const folder = saveFolderInput.value.trim();
  const res = await fetch("/api/settings/save-folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });
  const data = await res.json();
  if (!res.ok) { alert(data.error || "Failed to update"); return; }
  alert(`Save folder set to:\n${data.saveFolder}`);
  dialog.close();
});