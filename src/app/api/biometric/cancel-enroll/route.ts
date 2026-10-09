import { NextResponse } from "next/server";
import { getSanitizedDeviceSummary } from "@/lib/biometric/config";

/**
 * POST /api/biometric/cancel-enroll
 * 
 * Cancels active fingerprint capture on the physical K20 terminal
 * and returns it to normal standby/attendance mode.
 */
export async function POST() {
  try {
    const summary = getSanitizedDeviceSummary();
    if (!summary.isConfigured || !summary.deviceIp) {
      return NextResponse.json(
        {
          success: false,
          error: "Biometric device is not configured.",
        },
        { status: 503 }
      );
    }

    if (typeof process !== "undefined" && process.versions?.node) {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const dynamicRequire = eval("require");
      const ZKLib = dynamicRequire("node-zklib");
      const { COMMANDS } = dynamicRequire("node-zklib/constants");

      const zk = new ZKLib(summary.deviceIp, summary.devicePort, 3000);
      await zk.createSocket();
      await zk.executeCmd(COMMANDS.CMD_CANCELCAPTURE, "");
      await zk.disconnect();
    }

    return NextResponse.json({
      success: true,
      message: "Enrollment mode cancelled. K20 returned to standby.",
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to cancel enrollment";
    return NextResponse.json(
      {
        success: false,
        error: errMessage,
      },
      { status: 500 }
    );
  }
}
