import { NextResponse } from "next/server";
import { testTcpReachability } from "@/lib/biometric/diagnostics";
import { getBiometricDeviceConfig, getSanitizedDeviceSummary } from "@/lib/biometric/config";

/**
 * GET /api/biometric/diagnostics
 * 
 * Runs a real-time TCP reachability diagnostic test against the configured
 * biometric device or reports missing environment variables.
 */
export async function GET() {
  try {
    const summary = getSanitizedDeviceSummary();

    if (!summary.isConfigured) {
      return NextResponse.json(
        {
          status: "UNCONFIGURED",
          message: "Biometric device configuration is missing in environment variables.",
          diagnostics: {
            configuredIp: "NOT_SET",
            configuredPort: 0,
            isConfigMissing: true,
            tcpSuccess: false,
            summary: "Missing BIOMETRIC_DEVICE_IP in environment settings.",
          },
        },
        { status: 200 }
      );
    }

    const { config } = getBiometricDeviceConfig();
    const diagnosticResult = await testTcpReachability(config || undefined, 3000);

    return NextResponse.json(
      {
        status: diagnosticResult.tcpSuccess ? "ONLINE" : "OFFLINE",
        device: summary,
        diagnostics: diagnosticResult,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Internal diagnostic failure";
    return NextResponse.json(
      {
        status: "ERROR",
        message: errMessage,
      },
      { status: 500 }
    );
  }
}
