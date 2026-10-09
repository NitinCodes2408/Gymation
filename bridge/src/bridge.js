/**
 * GymTrack AI - Local Biometric Bridge Service (eSSL / ZKTeco K20)
 * 
 * ARCHITECTURE ROLE:
 * This process runs locally on the gym's laptop / on-premise PC.
 * It handles the low-level TCP/IP socket communication with the local eSSL K20 hardware,
 * parses attendance logs, and securely forwards verified check-in transactions
 * to the GymTrack AI Cloud backend via HTTPS REST APIs.
 * 
 * STEP 1: Foundation Scaffolding
 * (Transaction synchronization will be enabled in subsequent integration steps).
 */

const { getDeviceConfig, getCloudConfig, loadEnvFile } = require("./config");
const net = require("net");

loadEnvFile();

const deviceConfig = getDeviceConfig();
const cloudConfig = getCloudConfig();

console.log("===============================================================");
console.log("   GymTrack AI - Local Biometric Bridge Daemon (eSSL K20)      ");
console.log("===============================================================");
console.log(`[Bridge] Device Target : ${deviceConfig.ip ? `${deviceConfig.ip}:${deviceConfig.port}` : "NOT CONFIGURED"}`);
console.log(`[Bridge] Device ID     : ${deviceConfig.deviceId}`);
console.log(`[Bridge] Cloud Backend : ${cloudConfig.apiUrl}`);
console.log(`[Bridge] Target Gym ID : ${cloudConfig.gymId || "(Auto / Default)"}`);
console.log("===============================================================");

const { startDaemon } = require("./attendanceDaemon");

if (!deviceConfig.ip) {
  console.warn("[Bridge WARNING] BIOMETRIC_DEVICE_IP is not set in environment.");
  console.warn("[Bridge WARNING] Please set BIOMETRIC_DEVICE_IP in bridge/.env before starting daemon.");
  console.warn("[Bridge] Run 'npm run biometric:test-device' to test your connection once configured.\n");
} else {
  console.log(`[Bridge] Local bridge initialized. Launching automatic sync daemon...`);
  startDaemon();
}

module.exports = {
  deviceConfig,
  cloudConfig,
};
