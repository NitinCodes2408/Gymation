/**
 * GymTrack AI - Local Biometric Device Diagnostic Tool (Step 2)
 * 
 * Usage:
 *   node bridge/src/diagnostic.js
 *   or: cd bridge && npm run test-device
 * 
 * Tests TCP reachability to the physical eSSL/Identix K20 attendance terminal
 * connected via Ethernet.
 */

const net = require("net");
const os = require("os");
const { getDeviceConfig, loadEnvFile } = require("./config");

const envLoadedFrom = loadEnvFile();

console.log("===============================================================");
console.log("   GymTrack AI - Biometric Terminal Diagnostic Probe (eSSL K20) ");
console.log("===============================================================");
if (envLoadedFrom) {
  console.log(`[Info] Loaded environment settings from: ${envLoadedFrom}`);
} else {
  console.log(`[Notice] No .env file found. Using default/environment parameters.`);
}

// 1. Detect local network interfaces (Ethernet / WiFi)
function getLocalEthernetInfo() {
  const interfaces = os.networkInterfaces();
  const ethList = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === "IPv4" && !addr.internal) {
        ethList.push({
          interface: name,
          ip: addr.address,
          netmask: addr.netmask,
        });
      }
    }
  }
  return ethList;
}

const localInterfaces = getLocalEthernetInfo();
const config = getDeviceConfig();

console.log("\n[1] Local Laptop Network Interfaces:");
if (localInterfaces.length === 0) {
  console.log("    - (No active IPv4 interfaces found)");
} else {
  localInterfaces.forEach((iface) => {
    console.log(`    - Interface [${iface.interface}]: IP ${iface.ip} (Mask: ${iface.netmask})`);
  });
}

console.log("\n[2] Target Device Configuration:");
console.log(`    - Target IP    : ${config.ip ? config.ip : "(NOT CONFIGURED - missing BIOMETRIC_DEVICE_IP)"}`);
console.log(`    - Target Port  : ${config.port}`);
console.log(`    - Device ID    : ${config.deviceId}`);
console.log(`    - Comm Key     : ${config.commKey ? "****** (Configured)" : "0 (Default)"}`);
if (config.serial) console.log(`    - Serial       : ${config.serial}`);

if (!config.ip) {
  console.log("\n❌ DIAGNOSTIC RESULT: CONFIGURATION_MISSING");
  console.log("---------------------------------------------------------------");
  console.log("Error: BIOMETRIC_DEVICE_IP is not defined in your environment.");
  console.log("===============================================================\n");
  process.exit(1);
}

// Check same-subnet match
const sameSubnet = localInterfaces.some((iface) => {
  const ipParts = iface.ip.split(".").slice(0, 3).join(".");
  const targetParts = config.ip.split(".").slice(0, 3).join(".");
  return ipParts === targetParts;
});

console.log(`    - Subnet Match : ${sameSubnet ? "✅ Local IP and Device IP are on the SAME /24 subnet" : "⚠️ Warning: No local adapter found on matching subnet"}`);

console.log(`\n[3] Probing TCP Handshake to ${config.ip}:${config.port} (Timeout: 4000ms)...`);

const startTime = Date.now();
const socket = new net.Socket();
const timeoutMs = 4000;
let completed = false;

socket.setTimeout(timeoutMs);

socket.on("connect", () => {
  if (completed) return;
  completed = true;
  const latency = Date.now() - startTime;
  socket.destroy();

  console.log("\n✅ DIAGNOSTIC RESULT: TCP_CONNECTED");
  console.log("---------------------------------------------------------------");
  console.log(`Status        : TCP socket connection established successfully!`);
  console.log(`Target        : ${config.ip}:${config.port}`);
  console.log(`Latency       : ${latency} ms`);
  console.log(`Socket State  : CONNECTED`);
  console.log("---------------------------------------------------------------");
  console.log("Protocol State Assessment:");
  console.log("  [✓] NETWORK CONNECTIVITY       : REACHABLE");
  console.log("  [✓] TCP SOCKET CONNECTIVITY    : CONNECTED (Port 4370)");
  console.log("  [ ] DEVICE PROTOCOL (ZK/eSSL)  : PENDING PROTOCOL CLIENT IMPLEMENTATION");
  console.log("  [ ] ATTENDANCE SYNC            : NOT STARTED");
  console.log("---------------------------------------------------------------");
  console.log("Notice: The device is physically connected and responding over LAN.");
  console.log("        Next phase will implement the eSSL/ZK communication protocol client.");
  console.log("===============================================================\n");
  process.exit(0);
});

socket.on("timeout", () => {
  if (completed) return;
  completed = true;
  socket.destroy();

  console.log("\n❌ DIAGNOSTIC RESULT: TCP_TIMEOUT");
  console.log("---------------------------------------------------------------");
  console.log(`Status    : Device at ${config.ip}:${config.port} did not respond within ${timeoutMs}ms.`);
  console.log("---------------------------------------------------------------");
  console.log("Troubleshooting Checklist for eSSL K20:");
  console.log("1. Physical Cable: Ensure Ethernet cable is securely plugged in.");
  console.log("2. Power: Confirm the eSSL K20 display is powered ON.");
  console.log("3. IP Address Verification:");
  console.log("   - On device: Press Menu -> Comm. -> Ethernet -> check IP Address.");
  console.log("4. Laptop Subnet Configuration:");
  console.log("   - Ensure laptop Ethernet is set to 192.168.1.100 (255.255.255.0).");
  console.log("===============================================================\n");
  process.exit(1);
});

socket.on("error", (err) => {
  if (completed) return;
  completed = true;
  socket.destroy();

  let resultCode = "NETWORK_UNREACHABLE";
  if (err.code === "ECONNREFUSED") {
    resultCode = "TCP_CONNECTION_REFUSED";
  } else if (err.code === "ETIMEDOUT") {
    resultCode = "TCP_TIMEOUT";
  } else if (err.code === "EHOSTUNREACH" || err.code === "ENETUNREACH") {
    resultCode = "NETWORK_UNREACHABLE";
  }

  console.log(`\n❌ DIAGNOSTIC RESULT: ${resultCode} [${err.code || "SOCKET_ERROR"}]`);
  console.log("---------------------------------------------------------------");
  console.log(`Error Message : ${err.message}`);
  console.log(`Error Code    : ${err.code || "UNKNOWN"}`);
  console.log("---------------------------------------------------------------");
  if (resultCode === "TCP_CONNECTION_REFUSED") {
    console.log(`Diagnosis : Host ${config.ip} responded, but port ${config.port} refused connection.`);
    console.log(`Fix       : Verify that port ${config.port} is enabled in the K20 device communication menu.`);
  } else if (resultCode === "NETWORK_UNREACHABLE") {
    console.log(`Diagnosis : The network route to ${config.ip} cannot be reached from this laptop.`);
    console.log(`Fix       : Confirm Ethernet cable is plugged in and adapter has static IP 192.168.1.100.`);
  }
  console.log("===============================================================\n");
  process.exit(1);
});

try {
  socket.connect(config.port, config.ip);
} catch (e) {
  if (completed) return;
  completed = true;
  console.log(`\n❌ Fatal Socket Error: ${e.message}`);
  process.exit(1);
}
