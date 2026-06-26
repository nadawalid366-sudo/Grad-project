import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// stt-service lives at the project root, next to backend/.
// backend/src/stt -> ../../../stt-service
const STT_DIR = path.resolve(__dirname, "../../../stt-service");

let sttProcess = null;

function resolvePythonPath() {
  const isWindows = process.platform === "win32";
  const venvPython = isWindows
    ? path.join(STT_DIR, "venv", "Scripts", "python.exe")
    : path.join(STT_DIR, "venv", "bin", "python");

  if (fs.existsSync(venvPython)) {
    return venvPython;
  }

  // No venv yet — fall back to a system python so a clear error surfaces.
  return isWindows ? "python" : "python3";
}

/**
 * Spawns the Python Whisper speech-to-text service (FastAPI/uvicorn) alongside
 * the Node backend so "running the backend" also brings the STT API online.
 *
 * Controlled by env vars (set in backend/.env):
 *   STT_AUTOSTART=false   -> skip spawning (run it manually instead)
 *   STT_PORT=8000         -> port the service binds to
 */
export function startSttService() {
  if (String(process.env.STT_AUTOSTART || "true").toLowerCase() === "false") {
    console.log("[stt] STT_AUTOSTART=false — skipping speech-to-text service.");
    return;
  }

  if (!fs.existsSync(STT_DIR)) {
    console.warn(
      `[stt] Service folder not found at ${STT_DIR}. Skipping. ` +
        "Clone speech-intelligence-service into ./stt-service to enable voice transcription.",
    );
    return;
  }

  const venvPython = path.join(
    STT_DIR,
    "venv",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
  if (!fs.existsSync(venvPython)) {
    console.warn(
      "[stt] Python virtualenv not found. Set it up once with:\n" +
        "      cd stt-service\n" +
        "      python -m venv venv && venv\\Scripts\\python.exe -m pip install -r requirements.txt\n" +
        "[stt] Skipping auto-start for now.",
    );
    return;
  }

  const pythonPath = resolvePythonPath();
  const port = process.env.STT_PORT || "8000";

  console.log(`[stt] Starting speech-to-text service on port ${port}...`);

  sttProcess = spawn(
    pythonPath,
    ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", port],
    {
      cwd: STT_DIR,
      env: { ...process.env },
      shell: false,
    },
  );

  sttProcess.stdout.on("data", (data) => {
    process.stdout.write(`[stt] ${data}`);
  });
  sttProcess.stderr.on("data", (data) => {
    // uvicorn logs (including normal startup) go to stderr.
    process.stdout.write(`[stt] ${data}`);
  });

  sttProcess.on("error", (err) => {
    console.warn(`[stt] Failed to start speech-to-text service: ${err.message}`);
    sttProcess = null;
  });

  sttProcess.on("exit", (code, signal) => {
    if (code !== null && code !== 0) {
      console.warn(`[stt] Service exited with code ${code}.`);
    } else if (signal) {
      console.log(`[stt] Service stopped (${signal}).`);
    }
    sttProcess = null;
  });
}

/** Stops the spawned STT service. Safe to call multiple times. */
export function stopSttService() {
  if (!sttProcess || sttProcess.killed) {
    return;
  }

  const pid = sttProcess.pid;
  sttProcess = null;

  if (process.platform === "win32") {
    // child.kill() on Windows only signals the immediate process; uvicorn/python
    // can be left orphaned holding port 8000. taskkill /T kills the whole tree.
    try {
      execFileSync("taskkill", ["/pid", String(pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } catch {
      // Process may already be gone — ignore.
    }
  } else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Already gone — ignore.
    }
  }
}
