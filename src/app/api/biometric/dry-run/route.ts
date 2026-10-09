import { NextResponse } from "next/server";
import { getSanitizedDeviceSummary } from "@/lib/biometric/config";
import { 
  processAttendanceDryRun, 
  RawK20AttendanceLog, 
  SyncCheckpoint 
} from "@/lib/biometric/syncEngine";
import fs from "fs";
import path from "path";

const CHECKPOINT_DIR = path.join(process.cwd(), "bridge", "data");

function getCheckpointPath(ownerId: string, gymId: string, deviceId: string): string {
  const safeName = `checkpoint_${ownerId}_${gymId}_${deviceId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
  return path.join(CHECKPOINT_DIR, safeName);
}

function loadCheckpoint(ownerId: string, gymId: string, deviceId: string): SyncCheckpoint | null {
  try {
    const filePath = getCheckpointPath(ownerId, gymId, deviceId);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content) as SyncCheckpoint;
    }
  } catch {
    // Return null if unreadable
  }
  return null;
}

function saveCheckpoint(checkpoint: SyncCheckpoint): void {
  try {
    if (!fs.existsSync(CHECKPOINT_DIR)) {
      fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
    }
    const filePath = getCheckpointPath(checkpoint.ownerId, checkpoint.gymId, checkpoint.deviceId);
    fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), "utf-8");
  } catch {
    // Non-fatal for dry-run
  }
}

/**
 * Baseline mapped members fallback if none passed by client
 */
const DEFAULT_MEMBERS = [
  { id: "M-1019", name: "Rahul Sharma", biometricUserId: "19", status: "Active" },
  { id: "M-1034", name: "New Member 34", biometricUserId: "34", status: "Active" },
  { id: "M-1006", name: "Naresh Chimalwar", biometricUserId: "6", status: "Active" },
  { id: "M-1033", name: "Payal Chandanbawane", biometricUserId: "33", status: "Active" },
];

/**
 * GET & POST /api/biometric/dry-run
 * 
 * Executes Step 6A Attendance Dry-Run:
 * - Reads physical K20 attendance transaction logs (17,356 records)
 * - Identifies transactions occurring beyond the established watermark
 * - Maps K20 User IDs to GymTrack members
 * - Suppresses duplicates
 * - STRICTLY 0 FIRESTORE WRITES
 */
export async function GET(request: Request) {
  return handleDryRun(request);
}

export async function POST(request: Request) {
  return handleDryRun(request);
}

async function handleDryRun(request: Request) {
  try {
    const summary = getSanitizedDeviceSummary();
    const { searchParams } = new URL(request.url);

    const ownerId = searchParams.get("ownerId") || "owner_default";
    const gymId = searchParams.get("gymId") || "gym_default";
    const resetBaseline = searchParams.get("resetBaseline") === "true";
    const deviceId = `K20-${summary.deviceIp}:${summary.devicePort}`;

    let clientMembers: any[] = DEFAULT_MEMBERS;
    if (request.method === "POST") {
      try {
        const body = await request.json();
        if (body.members && Array.isArray(body.members)) {
          clientMembers = body.members;
        }
      } catch {
        // Use default members
      }
    }

    let rawLogs: RawK20AttendanceLog[] = [];

    if (typeof process !== "undefined" && process.versions?.node && summary.isConfigured && summary.deviceIp) {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const dynamicRequire = eval("require");
      const ZKLib = dynamicRequire("node-zklib");

      const zk = new ZKLib(summary.deviceIp, summary.devicePort, 5000);
      await zk.createSocket();
      const logsResult = await zk.getAttendances();
      if (logsResult && logsResult.data && Array.isArray(logsResult.data)) {
        rawLogs = logsResult.data.map((l: any) => ({
          userSn: Number(l.userSn || 0),
          deviceUserId: String(l.deviceUserId || l.userId || ""),
          recordTime: l.recordTime,
          ip: l.ip || summary.deviceIp,
        }));
      }
      await zk.disconnect();
    }

    // Load existing checkpoint unless reset requested
    let existingCheckpoint: SyncCheckpoint | null = resetBaseline ? null : loadCheckpoint(ownerId, gymId, deviceId);

    const dryRunResult = processAttendanceDryRun(
      ownerId,
      gymId,
      deviceId,
      summary.deviceIp,
      summary.devicePort,
      rawLogs,
      clientMembers as any,
      existingCheckpoint
    );

    // Save updated checkpoint
    saveCheckpoint(dryRunResult.checkpoint);

    return NextResponse.json({
      success: true,
      mode: "DRY_RUN_ONLY",
      firestoreWrites: 0,
      totalLogsOnDevice: dryRunResult.totalLogsOnDevice,
      historicalIgnoredCount: dryRunResult.historicalIgnoredCount,
      newTransactionsCount: dryRunResult.newTransactionsCount,
      duplicateTransactionsCount: dryRunResult.duplicateTransactionsCount,
      unmappedTransactionsCount: dryRunResult.unmappedTransactionsCount,
      newTransactions: dryRunResult.newTransactions,
      duplicateTransactions: dryRunResult.duplicateTransactions.slice(-5), // Last 5 duplicates for diagnostics
      checkpoint: dryRunResult.checkpoint,
      timestamp: dryRunResult.timestamp,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to execute attendance dry-run";
    return NextResponse.json(
      {
        success: false,
        firestoreWrites: 0,
        error: errMessage,
      },
      { status: 500 }
    );
  }
}
