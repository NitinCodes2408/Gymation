import { NextResponse } from "next/server";
import { getSanitizedDeviceSummary } from "@/lib/biometric/config";
import { deviceMutex } from "@/lib/biometric/deviceMutex";

/**
 * POST /api/biometric/scan-attendance
 * 
 * Arms the biometric listener to capture a real hardware fingerprint scan
 * from the eSSL / Identix K20 terminal in real time.
 * 
 * Payload:
 * {
 *   targetBiometricUserId?: string;  // If waiting for a specific member's scan
 *   targetMemberId?: string;
 *   timeoutMs?: number;              // Max wait time (default 10000ms)
 * }
 */
export async function POST(request: Request) {
  let releaseLock: (() => void) | null = null;
  let zkInstance: any = null;

  try {
    const body = await request.json().catch(() => ({}));
    const { targetBiometricUserId, timeoutMs = 10000 } = body;
    const cleanTargetId = targetBiometricUserId ? String(targetBiometricUserId).trim() : null;

    const summary = getSanitizedDeviceSummary();
    const targetIp = summary.deviceIp || "192.168.1.200";
    const targetPort = summary.devicePort || 4370;

    // Check environment support
    if (typeof process === "undefined" || !process.versions?.node) {
      return NextResponse.json({
        success: true,
        scanned: false,
        cloudMode: true,
        message: "Hardware socket listening unavailable in cloud environment.",
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynamicRequire = eval("require");
    const ZKLib = dynamicRequire("node-zklib");

    // Acquire singleton mutex lock so we don't collide with other sync operations
    try {
      releaseLock = await deviceMutex.acquire(10000);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Biometric scanner is currently busy with another operation. Please try again in a moment.",
        },
        { status: 429 }
      );
    }

    zkInstance = new ZKLib(targetIp, targetPort, 8000);
    await zkInstance.createSocket();

    // 1. Snapshot initial log count to detect real-time hardware punch increments
    const initialInfo = await zkInstance.getInfo().catch(() => null);
    const initialLogCount = typeof initialInfo?.logCounts === "number" ? initialInfo.logCounts : 0;

    // Listen for realtime fingerprint scan event via hybrid detection
    const listenPromise = new Promise<{
      scanned: boolean;
      userId?: string;
      rawLog?: any;
    }>(async (resolve) => {
      let isResolved = false;
      let pollInterval: NodeJS.Timeout | null = null;

      const finish = (result: { scanned: boolean; userId?: string; rawLog?: any }) => {
        if (!isResolved) {
          isResolved = true;
          if (pollInterval) clearInterval(pollInterval);
          clearTimeout(timer);
          resolve(result);
        }
      };

      const timer = setTimeout(() => {
        finish({ scanned: false });
      }, Math.min(Math.max(timeoutMs, 3000), 20000));

      // Strategy A: Realtime event push (if supported by terminal firmware)
      try {
        zkInstance.getRealTimeLogs((log: any) => {
          if (!isResolved && log && log.userId) {
            finish({
              scanned: true,
              userId: String(log.userId || "").trim(),
              rawLog: log,
            });
          }
        });
      } catch {
        // Fallback to active poll
      }

      // Strategy B: High-frequency metadata change polling (~650ms intervals)
      // When a member places their finger on the sensor, K20 verifies and increments logCounts in real time!
      pollInterval = setInterval(async () => {
        if (isResolved) return;
        try {
          const currentInfo = await zkInstance.getInfo().catch(() => null);
          if (currentInfo && typeof currentInfo.logCounts === "number") {
            if (currentInfo.logCounts > initialLogCount) {
              // Hardware punch detected! Fetch the latest log
              const attendances = await zkInstance.getAttendances().catch(() => null);
              if (attendances && attendances.data && attendances.data.length > 0) {
                const latestLog = attendances.data[attendances.data.length - 1];
                const bioId = String(latestLog.deviceUserId || latestLog.userId || "").trim();
                if (bioId) {
                  finish({
                    scanned: true,
                    userId: bioId,
                    rawLog: latestLog,
                  });
                }
              }
            }
          }
        } catch {
          // Silent best-effort in poll cycle
        }
      }, 650);
    });

    const result = await listenPromise;

    if (result.scanned && result.userId) {
      const scannedId = result.userId;
      const isMatch = cleanTargetId ? scannedId === cleanTargetId : true;

      return NextResponse.json({
        success: true,
        scanned: true,
        matched: isMatch,
        scannedBiometricUserId: scannedId,
        targetBiometricUserId: cleanTargetId,
        scanTime: new Date().toISOString(),
        message: isMatch
          ? `Fingerprint confirmed for User ID #${scannedId} on K20 scanner.`
          : `Fingerprint scanned for User #${scannedId}, but expected User #${cleanTargetId}.`,
      });
    }

    return NextResponse.json({
      success: true,
      scanned: false,
      timeout: true,
      message: "No fingerprint touch was detected within the waiting window.",
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Scanner communication error";
    return NextResponse.json(
      {
        success: false,
        error: `K20 Scanner Error: ${errMessage}`,
      },
      { status: 500 }
    );
  } finally {
    if (zkInstance) {
      try {
        await zkInstance.disconnect();
      } catch {
        // Disconnect best-effort
      }
    }
    if (releaseLock) {
      releaseLock();
    }
  }
}
