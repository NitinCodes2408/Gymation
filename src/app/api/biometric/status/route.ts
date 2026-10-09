import { NextResponse } from "next/server";
import { getSanitizedDeviceSummary } from "@/lib/biometric/config";

/**
 * GET /api/biometric/status
 * 
 * Returns the current configuration state and integration parameters
 * without exposing sensitive communication keys or passwords.
 */
export async function GET() {
  try {
    const summary = getSanitizedDeviceSummary();

    return NextResponse.json(
      {
        integration: "eSSL / ZKTeco K20 Series",
        isConfigured: summary.isConfigured,
        device: summary,
        mode: "LOCAL_BRIDGE_REQUIRED",
        bridgeDocumentation: "/BIOMETRIC_INTEGRATION.md",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch biometric status";
    return NextResponse.json(
      { error: errMessage },
      { status: 500 }
    );
  }
}
