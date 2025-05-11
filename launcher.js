const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Konfiguration
const BOT_FILE = 'musikus.js';
const LOG_FILE = 'bot-log.txt';
const ERROR_LOG_FILE = 'bot-error.txt';
const MAX_RESTARTS = 10;
const RESTART_DELAY = 5000; // 5 Sekunden

// Zähler für Neustarts
let restartCount = 0;
let lastRestartTime = 0;

// Logging-Funktion
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

// Funktion zum Starten des Bots
function startBot() {
  // Prüfen, ob zu viele Neustarts in kurzer Zeit
  const now = Date.now();
  if (now - lastRestartTime < 60000) { // Weniger als 1 Minute seit letztem Neustart
    restartCount++;
    if (restartCount > MAX_RESTARTS) {
      log(`Zu viele Neustarts (${restartCount}) in kurzer Zeit. Beende Launcher.`);
      process.exit(1);
    }
  } else {
    // Zurücksetzen des Zählers, wenn genug Zeit vergangen ist
    restartCount = 0;
  }

  lastRestartTime = now;

  log(`Starte Bot (Neustart #${restartCount})...`);

  // Erstelle Logs-Verzeichnis, falls es nicht existiert
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }

  // Öffne Log-Dateien
  const out = fs.openSync(path.join(logsDir, LOG_FILE), 'a');
  const err = fs.openSync(path.join(logsDir, ERROR_LOG_FILE), 'a');

  // Starte den Bot-Prozess
  const botProcess = spawn('node', [BOT_FILE], {
    stdio: ['ignore', out, err],
    detached: true
  });

  // Event-Handler für den Bot-Prozess
  botProcess.on('exit', (code, signal) => {
    log(`Bot beendet mit Code ${code} und Signal ${signal}`);

    // Warte kurz und starte neu
    setTimeout(() => {
      log('Starte Bot neu...');
      startBot();
    }, RESTART_DELAY);
  });

  // Fehlerbehandlung für den Launcher selbst
  botProcess.on('error', (err) => {
    log(`Launcher-Fehler: ${err.message}`);

    // Warte kurz und starte neu
    setTimeout(() => {
      log('Starte Bot nach Fehler neu...');
      startBot();
    }, RESTART_DELAY);
  });

  log(`Bot gestartet mit PID ${botProcess.pid}`);
}

// Prozess-Fehlerbehandlung für den Launcher
process.on('uncaughtException', (err) => {
  log(`Unbehandelter Fehler im Launcher: ${err.message}`);
  log(err.stack);
});

// Starte den Bot initial
startBot();

log('Launcher gestartet. Überwache Bot-Prozess...');
