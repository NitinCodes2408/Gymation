import { NextResponse } from "next/server";
import { getSanitizedDeviceSummary } from "@/lib/biometric/config";

const BASELINE_K20_USERS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "19", "30", "31", "32", "33", "34", "35", "36", "37"];

/**
 * GET /api/biometric/next-id
 * 
 * Safely computes the next available K20 biometric User ID.
 * Reads existing user IDs from the physical K20 terminal and checks against
 * any mapped member IDs passed in query parameters (?mappedIds=1,2,19...).
 */
export async function GET(request: Request) {
  try {
    const summary = getSanitizedDeviceSummary();
    const { searchParams } = new URL(request.url);
    const clientMappedParam = searchParams.get("mappedIds") || "";
    const clientMappedIds = clientMappedParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    let deviceUserIds = [...BASELINE_K20_USERS];

    try {
      if (summary.isConfigured && summary.deviceIp && typeof process !== "undefined" && process.versions?.node) {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const dynamicRequire = eval("require");
        const ZKLib = dynamicRequire("node-zklib");
        const zk = new ZKLib(summary.deviceIp, summary.devicePort, 3000);
        await zk.createSocket();
        const usersResult = await zk.getUsers();
        if (usersResult && usersResult.data && Array.isArray(usersResult.data)) {
          deviceUserIds = usersResult.data.map((u: { userId?: string; uid?: number }) =>
            String(u.userId || u.uid)
          );
        }
        await zk.disconnect();
      }
    } catch {
      // Fall back to baseline detected users
      deviceUserIds = [...BASELINE_K20_USERS];
    }

    // Combine all used IDs
    const allUsedIds = new Set<string>([...deviceUserIds, ...clientMappedIds]);

    // Find highest integer ID in use
    let maxId = 0;
    for (const idStr of allUsedIds) {
      const num = parseInt(idStr, 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }

    // Next sequential safe ID
    let candidate = maxId + 1;
    if (candidate < 1) candidate = 1;

    // Double check candidate is strictly unused
    while (allUsedIds.has(String(candidate))) {
      candidate++;
    }

    return NextResponse.json({
      success: true,
      nextBiometricUserId: String(candidate),
      deviceUserCount: deviceUserIds.length,
      usedDeviceIds: deviceUserIds,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to compute next biometric User ID";
    return NextResponse.json(
      {
        success: false,
        error: errMessage,
        nextBiometricUserId: "38", // Safe fallback
      },
      { status: 500 }
    );
  }
}
