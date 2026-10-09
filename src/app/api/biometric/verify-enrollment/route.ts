import { NextResponse } from "next/server";
import { getSanitizedDeviceSummary } from "@/lib/biometric/config";

/**
 * POST /api/biometric/verify-enrollment
 * 
 * Verifies with the physical eSSL K20 terminal whether a fingerprint
 * has been successfully registered under the specified User ID.
 * 
 * Payload: { biometricUserId: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { biometricUserId } = body;

    const cleanBioId = String(biometricUserId || "").trim();
    if (!cleanBioId) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: "Biometric User ID is required for verification.",
        },
        { status: 400 }
      );
    }

    const summary = getSanitizedDeviceSummary();
    if (!summary.isConfigured || !summary.deviceIp) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: "Biometric device is not configured.",
        },
        { status: 503 }
      );
    }

    let isEnrolled = false;
    let enrolledRecord: { uid?: number; userId: string; name?: string } | null = null;
    let allUserIds: string[] = [];

    if (typeof process !== "undefined" && process.versions?.node) {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const dynamicRequire = eval("require");
      const ZKLib = dynamicRequire("node-zklib");

      const zk = new ZKLib(summary.deviceIp, summary.devicePort, 4000);
      await zk.createSocket();

      const usersResult = await zk.getUsers();
      if (usersResult && usersResult.data && Array.isArray(usersResult.data)) {
        allUserIds = usersResult.data.map((u: { userId?: string; uid?: number }) => String(u.userId || u.uid));
        const found = usersResult.data.find(
          (u: { userId?: string; uid?: number; name?: string }) =>
            String(u.userId || u.uid) === cleanBioId
        );
        if (found) {
          isEnrolled = true;
          enrolledRecord = {
            uid: found.uid,
            userId: String(found.userId || found.uid),
            name: found.name ? String(found.name).trim() : undefined,
          };
        }
      }

      await zk.disconnect();
    }

    if (isEnrolled) {
      return NextResponse.json({
        success: true,
        verified: true,
        biometricUserId: cleanBioId,
        enrolledUser: enrolledRecord,
        message: `Fingerprint successfully verified on K20 terminal for User ID #${cleanBioId}.`,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({
        success: true,
        verified: false,
        biometricUserId: cleanBioId,
        detectedUserCount: allUserIds.length,
        error: `Fingerprint not yet detected on K20 for User ID #${cleanBioId}. Please complete 3 presses on the scanner.`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to verify enrollment with K20";
    return NextResponse.json(
      {
        success: false,
        verified: false,
        error: `Verification error: ${errMessage}`,
      },
      { status: 500 }
    );
  }
}
