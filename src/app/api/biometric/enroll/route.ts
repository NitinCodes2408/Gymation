import { NextResponse } from "next/server";
import { getSanitizedDeviceSummary } from "@/lib/biometric/config";

/**
 * POST /api/biometric/enroll
 * 
 * Arms the physical eSSL/Identix K20 scanner into fingerprint enrollment mode
 * for a specific, verified unallocated User ID.
 * 
 * Payload: { biometricUserId: string, memberName?: string, fingerIndex?: number }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { biometricUserId, memberName, fingerIndex = 0 } = body;

    const cleanBioId = String(biometricUserId || "").trim();
    if (!cleanBioId || isNaN(Number(cleanBioId))) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid positive numerical biometric User ID is required for enrollment.",
        },
        { status: 400 }
      );
    }

    const summary = getSanitizedDeviceSummary();
    if (!summary.isConfigured || !summary.deviceIp) {
      return NextResponse.json(
        {
          success: false,
          error: "Biometric device is not configured in environment.",
        },
        { status: 503 }
      );
    }

    let deviceResponseCode = 2000; // Default ACK_OK

    if (typeof process !== "undefined" && process.versions?.node) {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const dynamicRequire = eval("require");
      const ZKLib = dynamicRequire("node-zklib");
      const { COMMANDS } = dynamicRequire("node-zklib/constants");

      const zk = new ZKLib(summary.deviceIp, summary.devicePort, 4000);
      await zk.createSocket();

      // Check that this user ID does not overwrite an existing enrolled user on K20
      const existingUsers = await zk.getUsers();
      if (existingUsers && existingUsers.data && Array.isArray(existingUsers.data)) {
        const collision = existingUsers.data.find(
          (u: { userId?: string; uid?: number }) => String(u.userId || u.uid) === cleanBioId
        );
        if (collision) {
          await zk.disconnect();
          return NextResponse.json(
            {
              success: false,
              error: `Biometric User ID #${cleanBioId} is already enrolled on K20 as "${collision.name || 'User ' + cleanBioId}". Overwriting is blocked.`,
            },
            { status: 409 }
          );
        }
      }

      // Send CMD_STARTENROLL (61) to put K20 into enrollment mode
      const buf = Buffer.alloc(28);
      buf.write(cleanBioId, 0, "ascii");
      buf.writeUInt8(fingerIndex, 24); // Finger index (0-9)
      buf.writeUInt8(1, 25); // Flag

      const reply = await zk.executeCmd(COMMANDS.CMD_STARTENROLL, buf);
      if (reply && reply.length >= 2) {
        deviceResponseCode = reply.readUInt16LE(0);
      }

      await zk.disconnect();
    }

    return NextResponse.json({
      success: true,
      status: "ENROLLMENT_STARTED",
      biometricUserId: cleanBioId,
      memberName: memberName || `Member ${cleanBioId}`,
      deviceResponseCode,
      message: `K20 terminal is armed for User ID #${cleanBioId}. Please place finger on scanner 3 times.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to initiate K20 enrollment";
    return NextResponse.json(
      {
        success: false,
        error: `K20 Enrollment Error: ${errMessage}`,
      },
      { status: 500 }
    );
  }
}
