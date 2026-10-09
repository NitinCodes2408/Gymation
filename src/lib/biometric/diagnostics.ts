/**
 * GymTrack AI - Biometric Network Diagnostics Service
 * 
 * Performs real TCP/IP reachability testing against the configured eSSL K20 biometric terminal.
 * 
 * IMPORTANT:
 * - Runs in Node.js server/bridge runtime (utilizing the native 'net' socket module).
 * - Accurately differentiates between:
 *   1. Missing configuration (no IP/Port set)
 *   2. Socket connection timeouts (device powered off, cable unplugged, incorrect IP/subnet)
 *   3. Connection refused (IP exists on network but port is closed/wrong)
 *   4. Host unreachable / network interface errors
 *   5. Connection successful (terminal reachable on TCP port)
 * - DOES NOT claim connection merely because the application started.
 */

import * as net from "net";
import { BiometricDeviceConfig, BiometricDiagnosticResult } from "./types";
import { getBiometricDeviceConfig } from "./config";

/**
 * Tests basic TCP socket reachability to a target IP and Port.
 * Returns detailed diagnostic metrics.
 */
export async function testTcpReachability(
  deviceConfig?: BiometricDeviceConfig,
  customTimeoutMs = 4000
): Promise<BiometricDiagnosticResult> {
  const timestamp = new Date().toISOString();

  // If no direct config passed, load from environment
  let activeConfig = deviceConfig;
  let configError: string | undefined;

  if (!activeConfig) {
    const loaded = getBiometricDeviceConfig();
    if (!loaded.isConfigured || !loaded.config) {
      return {
        timestamp,
        configuredIp: "NOT_SET",
        configuredPort: 0,
        configuredDeviceId: 0,
        isConfigMissing: true,
        configError: loaded.validationError || "Biometric device configuration is missing from environment variables.",
        tcpSuccess: false,
        isTimeout: false,
        errorMessage: "Device configuration missing. Please set BIOMETRIC_DEVICE_IP in your environment.",
        summary: "Configuration Missing: BIOMETRIC_DEVICE_IP is not defined.",
      };
    }
    activeConfig = loaded.config;
    configError = loaded.validationError;
  }

  const { deviceIp, devicePort, deviceId, timeoutMs } = activeConfig;
  const timeout = timeoutMs || customTimeoutMs;

  const startTime = Date.now();

  return new Promise<BiometricDiagnosticResult>((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(timeout);

    socket.on("connect", () => {
      if (isResolved) return;
      isResolved = true;
      const latencyMs = Date.now() - startTime;
      cleanup();

      resolve({
        timestamp,
        configuredIp: deviceIp,
        configuredPort: devicePort,
        configuredDeviceId: deviceId,
        isConfigMissing: false,
        tcpSuccess: true,
        isTimeout: false,
        latencyMs,
        summary: `TCP Connection Successful! Biometric terminal at ${deviceIp}:${devicePort} responded in ${latencyMs}ms.`,
      });
    });

    socket.on("timeout", () => {
      if (isResolved) return;
      isResolved = true;
      cleanup();

      resolve({
        timestamp,
        configuredIp: deviceIp,
        configuredPort: devicePort,
        configuredDeviceId: deviceId,
        isConfigMissing: false,
        tcpSuccess: false,
        isTimeout: true,
        errorCode: "ETIMEDOUT",
        errorMessage: `Connection timed out after ${timeout}ms. Terminal at ${deviceIp}:${devicePort} did not respond. Verify LAN cable, device power, and local subnet configuration.`,
        summary: `Connection Timeout (${timeout}ms): Device at ${deviceIp}:${devicePort} is unreachable.`,
      });
    });

    socket.on("error", (err: NodeJS.ErrnoException) => {
      if (isResolved) return;
      isResolved = true;
      const errorCode = err.code || "UNKNOWN_ERROR";
      const latencyMs = Date.now() - startTime;
      cleanup();

      let humanMessage = err.message;
      if (errorCode === "ECONNREFUSED") {
        humanMessage = `Connection refused by ${deviceIp}:${devicePort}. The IP address is reachable, but port ${devicePort} is not accepting connections. Verify the device port configuration.`;
      } else if (errorCode === "EHOSTUNREACH" || errorCode === "ENETUNREACH") {
        humanMessage = `Host ${deviceIp} is unreachable. Check that your laptop's Ethernet network adapter is on the same subnet as the biometric device (e.g. 192.168.1.x).`;
      }

      resolve({
        timestamp,
        configuredIp: deviceIp,
        configuredPort: devicePort,
        configuredDeviceId: deviceId,
        isConfigMissing: false,
        tcpSuccess: false,
        isTimeout: false,
        errorCode,
        errorMessage: humanMessage,
        latencyMs,
        summary: `TCP Error [${errorCode}]: ${humanMessage}`,
      });
    });

    try {
      socket.connect(devicePort, deviceIp);
    } catch (err: unknown) {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      const message = err instanceof Error ? err.message : String(err);
      resolve({
        timestamp,
        configuredIp: deviceIp,
        configuredPort: devicePort,
        configuredDeviceId: deviceId,
        isConfigMissing: false,
        tcpSuccess: false,
        isTimeout: false,
        errorMessage: `Failed to initiate socket connection: ${message}`,
        summary: `Socket Initialization Failure: ${message}`,
      });
    }
  });
}
