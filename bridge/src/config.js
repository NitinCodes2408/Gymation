/**
 * GymTrack AI - Local Bridge Config Loader (Pure Node.js)
 */

const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  const possiblePaths = [
    path.join(process.cwd(), ".env"),
    path.join(__dirname, "..", ".env"),
    path.join(__dirname, "..", "..", ".env.local"),
    path.join(__dirname, "..", "..", ".env"),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, "utf-8");
        const lines = content.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const key = trimmed.substring(0, eqIdx).trim();
            const val = trimmed.substring(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
        return p;
      } catch (err) {
        console.warn(`[Config] Failed reading ${p}:`, err.message);
      }
    }
  }
  return null;
}

// Load env on initialization
loadEnvFile();

module.exports = {
  getDeviceConfig() {
    return {
      ip: process.env.BIOMETRIC_DEVICE_IP ? process.env.BIOMETRIC_DEVICE_IP.trim() : "",
      port: process.env.BIOMETRIC_DEVICE_PORT ? parseInt(process.env.BIOMETRIC_DEVICE_PORT, 10) : 4370,
      deviceId: process.env.BIOMETRIC_DEVICE_ID ? parseInt(process.env.BIOMETRIC_DEVICE_ID, 10) : 1,
      serial: process.env.BIOMETRIC_DEVICE_SERIAL ? process.env.BIOMETRIC_DEVICE_SERIAL.trim() : "",
      commKey: process.env.BIOMETRIC_COMM_KEY || "0",
    };
  },
  getCloudConfig() {
    return {
      apiUrl: process.env.GYMTRACK_API_URL || "http://localhost:3000",
      gymId: process.env.GYMTRACK_GYM_ID || "",
      bridgeSecret: process.env.GYMTRACK_BRIDGE_SECRET || "",
      syncIntervalSeconds: process.env.SYNC_INTERVAL_SECONDS ? parseInt(process.env.SYNC_INTERVAL_SECONDS, 10) : 10,
    };
  },
  getSyncConfig() {
    let intervalMs = 10000;
    if (process.env.BIOMETRIC_POLL_INTERVAL_MS) {
      intervalMs = parseInt(process.env.BIOMETRIC_POLL_INTERVAL_MS, 10);
    } else if (process.env.SYNC_INTERVAL_SECONDS) {
      intervalMs = parseInt(process.env.SYNC_INTERVAL_SECONDS, 10) * 1000;
    }
    // Enforce safe minimum of 5000 ms to prevent device socket exhaustion
    if (isNaN(intervalMs) || intervalMs < 5000) {
      intervalMs = 5000;
    }
    return {
      pollIntervalMs: intervalMs,
      maxBatchWrites: 1,
    };
  },
  loadEnvFile,
};
