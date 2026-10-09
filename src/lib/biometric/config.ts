/**
 * GymTrack AI - Biometric Configuration Loader
 * 
 * IMPORTANT:
 * Sensitive device configurations (such as raw IP, port, comm keys, bridge secrets)
 * must be configured via environment variables and NEVER hardcoded or exposed in client-side bundles.
 * 
 * Environment Variables:
 * - BIOMETRIC_DEVICE_IP       : Local IP of the eSSL K20 (e.g. 192.168.1.201)
 * - BIOMETRIC_DEVICE_PORT     : TCP communication port (e.g. 4370)
 * - BIOMETRIC_DEVICE_ID       : Machine / Terminal ID (e.g. 1)
 * - BIOMETRIC_DEVICE_SERIAL   : Terminal Serial Number (optional)
 * - BIOMETRIC_COMM_KEY        : Terminal Communication Password (optional, default 0)
 * - BIOMETRIC_BRIDGE_SECRET   : Shared secret key for authenticating Local Bridge requests
 */

import { BiometricDeviceConfig } from "./types";

/**
 * Validates and parses the biometric device configuration from environment variables.
 * Safe to call in server-side/bridge runtime contexts.
 */
export function getBiometricDeviceConfig(): {
  config: BiometricDeviceConfig | null;
  isConfigured: boolean;
  validationError?: string;
} {
  const ip = process.env.BIOMETRIC_DEVICE_IP?.trim();
  const rawPort = process.env.BIOMETRIC_DEVICE_PORT?.trim();
  const rawDeviceId = process.env.BIOMETRIC_DEVICE_ID?.trim();
  const serial = process.env.BIOMETRIC_DEVICE_SERIAL?.trim();
  const commKey = process.env.BIOMETRIC_COMM_KEY?.trim();

  // Validate required parameters
  if (!ip) {
    return {
      config: null,
      isConfigured: false,
      validationError: "BIOMETRIC_DEVICE_IP environment variable is missing.",
    };
  }

  // Basic IP format check (IPv4)
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipRegex.test(ip)) {
    return {
      config: null,
      isConfigured: false,
      validationError: `BIOMETRIC_DEVICE_IP format is invalid: "${ip}". Expected valid IPv4 address (e.g., 192.168.1.201).`,
    };
  }

  const port = rawPort ? parseInt(rawPort, 10) : 4370; // 4370 is standard ZK/eSSL default port
  if (isNaN(port) || port < 1 || port > 65535) {
    return {
      config: null,
      isConfigured: false,
      validationError: `BIOMETRIC_DEVICE_PORT must be a valid port number between 1 and 65535. Received: "${rawPort}".`,
    };
  }

  const deviceId = rawDeviceId ? parseInt(rawDeviceId, 10) : 1;
  if (isNaN(deviceId) || deviceId < 1) {
    return {
      config: null,
      isConfigured: false,
      validationError: `BIOMETRIC_DEVICE_ID must be a positive integer. Received: "${rawDeviceId}".`,
    };
  }

  const config: BiometricDeviceConfig = {
    deviceIp: ip,
    devicePort: port,
    deviceId: deviceId,
    deviceSerial: serial || undefined,
    commKey: commKey ? (isNaN(Number(commKey)) ? commKey : Number(commKey)) : 0,
    timeoutMs: 5000,
  };

  return {
    config,
    isConfigured: true,
  };
}

/**
 * Returns a sanitized summary of device configuration safe for diagnostic status logs,
 * masking secret keys.
 */
export function getSanitizedDeviceSummary(): {
  isConfigured: boolean;
  deviceIp: string;
  devicePort: number;
  deviceId: number;
  hasSerial: boolean;
  hasCommKey: boolean;
} {
  const { config, isConfigured } = getBiometricDeviceConfig();
  if (!isConfigured || !config) {
    return {
      isConfigured: false,
      deviceIp: "Not configured",
      devicePort: 0,
      deviceId: 0,
      hasSerial: false,
      hasCommKey: false,
    };
  }

  return {
    isConfigured: true,
    deviceIp: config.deviceIp,
    devicePort: config.devicePort,
    deviceId: config.deviceId,
    hasSerial: Boolean(config.deviceSerial),
    hasCommKey: Boolean(config.commKey && config.commKey !== 0),
  };
}
