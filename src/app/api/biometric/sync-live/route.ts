import { NextResponse } from "next/server";
import { getSanitizedDeviceSummary } from "@/lib/biometric/config";
import { 
  generateDeterministicTxId, 
  formatTransactionDateTime,
  convertCheckpointToSyncState,
  evaluateLogAgainstSyncState,
  RawK20AttendanceLog, 
  SyncCheckpoint 
} from "@/lib/biometric/syncEngine";
import { 
  recordBiometricAttendanceInFirestore, 
  getBiometricSyncState,
  saveBiometricSyncState,
  isAttendanceDocExists,
  getSafeDeviceDocId,
  FirestoreAttendanceDoc,
  BiometricDeviceSyncState
} from "@/lib/firebase/gymService";
import fs from "fs";
import path from "path";

const CHECKPOINT_DIR = path.join(process.cwd(), "bridge", "data");
const DEFAULT_CHECKPOINT_PATH = path.join(CHECKPOINT_DIR, "sync_checkpoint.json");

/**
 * Transitional local checkpoint loader for fallback/migration only.
 */
function loadLocalCheckpoint(ownerId: string, gymId: string, deviceId: string): SyncCheckpoint | null {
  try {
    const safeName = `checkpoint_${ownerId}_${gymId}_${deviceId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
    const specificPath = path.join(CHECKPOINT_DIR, safeName);

    if (fs.existsSync(specificPath)) {
      return JSON.parse(fs.readFileSync(specificPath, "utf-8")) as SyncCheckpoint;
    }
    if (fs.existsSync(DEFAULT_CHECKPOINT_PATH)) {
      return JSON.parse(fs.readFileSync(DEFAULT_CHECKPOINT_PATH, "utf-8")) as SyncCheckpoint;
    }
  } catch {
    // Return null on failure
  }
  return null;
}

/**
 * Transitional local backup saver.
 */
function saveLocalCheckpointBackup(checkpoint: SyncCheckpoint): void {
  try {
    if (!fs.existsSync(CHECKPOINT_DIR)) {
      fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
    }
    const safeName = `checkpoint_${checkpoint.ownerId}_${checkpoint.gymId}_${checkpoint.deviceId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
    const specificPath = path.join(CHECKPOINT_DIR, safeName);
    const content = JSON.stringify(checkpoint, null, 2);
    fs.writeFileSync(specificPath, content, "utf-8");
    fs.writeFileSync(DEFAULT_CHECKPOINT_PATH, content, "utf-8");
  } catch (err) {
    console.error("[LocalBackup] Notice saving local backup checkpoint:", err);
  }
}

/**
 * Baseline members list if none passed in request body
 */
const DEFAULT_MEMBERS = [
  { id: "M-1019", name: "Rahul Sharma", biometricUserId: "19", status: "Active" },
  { id: "M-1034", name: "New Member 34", biometricUserId: "34", status: "Active" },
  { id: "M-1035", name: "New Member 35", biometricUserId: "35", status: "Active" },
  { id: "M-1006", name: "Naresh Chimalwar", biometricUserId: "6", status: "Active" },
  { id: "M-1033", name: "Payal Chandanbawane", biometricUserId: "33", status: "Active" },
  { id: "M-1003", name: "Rahul Tiranagam", biometricUserId: "3", status: "Active" },
  { id: "M-1009", name: "Puja Chandanbawane", biometricUserId: "9", status: "Active" },
];

/**
 * POST /api/biometric/sync-live
 * 
 * STEP 7B: Incremental New-Scan Biometric Attendance Synchronization
 * - Uses Firestore `gyms/{gymId}/biometricDevices/{safeDeviceId}` as persistent sync state
 * - Evaluates raw K20 logs incrementally against the 17,356 historical baseline
 * - Supports dry-run mode (0 Firestore writes)
 * - Identifies UNMAPPED_BIOMETRIC_USER without losing events or advancing attendance watermark
 * - Atomic idempotent attendance writes to `gyms/{gymId}/attendance/{transactionId}`
 */
export async function POST(request: Request) {
  try {
    const summary = getSanitizedDeviceSummary();
    const body = await request.json().catch(() => ({}));

    const ownerId = String(body.ownerId || "owner_default").trim();
    const gymId = String(body.gymId || "gym_default").trim();
    const dryRun = Boolean(body.dryRun);
    const maxRecords = body.maxRecords !== undefined ? Number(body.maxRecords) : 100; // Default to 100 to sync all daily attendance records
    const deviceId = `K20-${summary.deviceIp}:${summary.devicePort}`;
    const safeDocId = getSafeDeviceDocId(deviceId);
    const membersList = Array.isArray(body.members) && body.members.length > 0 ? body.members : DEFAULT_MEMBERS;

    // 1. Fetch persistent Firestore sync state (Source of Truth)
    let syncState = await getBiometricSyncState(gymId, deviceId);
    let migratedFromLocal = false;

    if (!syncState || !syncState.historicalBaselineEstablished) {
      // Check local JSON checkpoint for safe baseline migration
      const localCheckpoint = loadLocalCheckpoint(ownerId, gymId, deviceId);
      if (localCheckpoint && localCheckpoint.lastKnownUserSn) {
        syncState = convertCheckpointToSyncState(localCheckpoint, summary.deviceIp, summary.devicePort);
        syncState.ownerId = ownerId;
        syncState.gymId = gymId;
        await saveBiometricSyncState(gymId, syncState);
        migratedFromLocal = true;
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Historical baseline sync state not found. Please establish baseline first.",
          },
          { status: 400 }
        );
      }
    }

    // 2. Query physical K20 attendance logs
    let rawLogs: RawK20AttendanceLog[] = [];
    if (Array.isArray(body.rawLogs) && body.rawLogs.length > 0) {
      rawLogs = body.rawLogs.map((l: any) => ({
        userSn: Number(l.userSn || 0),
        deviceUserId: String(l.deviceUserId || l.userId || ""),
        recordTime: l.recordTime,
        ip: l.ip || summary.deviceIp,
      }));
    } else if (typeof process !== "undefined" && process.versions?.node && summary.isConfigured && summary.deviceIp) {
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

    // 3. Incrementally evaluate logs against Firestore Sync State
    let historicalIgnoredCount = 0;
    let alreadySyncedCount = 0;
    const unmappedTransactions: Array<{ transactionId: string; deviceUserId: string; timestamp: string; reason: string }> = [];
    const newCandidates: Array<{ log: RawK20AttendanceLog; txId: string; member: any; date: string; checkInTime: string; iso: string }> = [];
    const inMemoryProcessed = new Set<string>();

    for (const log of rawLogs) {
      const evaluation = evaluateLogAgainstSyncState(log, syncState, summary.deviceIp, membersList, inMemoryProcessed);

      if (evaluation.classification === "HISTORICAL_BASELINE") {
        historicalIgnoredCount++;
        continue;
      }

      if (evaluation.classification === "ALREADY_SYNCED") {
        alreadySyncedCount++;
        inMemoryProcessed.add(evaluation.transactionId);
        continue;
      }

      if (evaluation.classification === "UNMAPPED_BIOMETRIC_USER") {
        unmappedTransactions.push({
          transactionId: evaluation.transactionId,
          deviceUserId: evaluation.deviceUserId,
          timestamp: evaluation.recordTime,
          reason: evaluation.reason,
        });
        continue;
      }

      if (evaluation.classification === "NEW_MAPPED_TRANSACTION" && evaluation.matchedMember) {
        // Multi-tier idempotency check: query Firestore document existence
        const docExists = await isAttendanceDocExists(gymId, evaluation.transactionId);
        if (docExists) {
          alreadySyncedCount++;
          inMemoryProcessed.add(evaluation.transactionId);
          continue;
        }

        newCandidates.push({
          log,
          txId: evaluation.transactionId,
          member: evaluation.matchedMember,
          date: evaluation.date,
          checkInTime: evaluation.checkInTime,
          iso: evaluation.recordTime,
        });
      }
    }

    // 4. Handle Dry-Run Mode (0 writes)
    const firestoreSyncStatePath = `gyms/${gymId}/biometricDevices/${safeDocId}`;

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        sourceOfTruth: "FIRESTORE_PERSISTENT",
        firestoreSyncStatePath,
        recordsWritten: 0,
        summary: {
          totalLogsOnDevice: rawLogs.length,
          historicalIgnoredCount: rawLogs.length > 0 ? historicalIgnoredCount : syncState.historicalBaselineLogCount,
          alreadySyncedCount,
          unmappedCount: unmappedTransactions.length,
          newMappedDetected: newCandidates.length,
          recordsWritten: 0,
        },
        newCandidateTransactions: newCandidates.map((c) => ({
          transactionId: c.txId,
          memberId: c.member.id,
          memberName: c.member.name,
          biometricUserId: c.member.biometricUserId,
          date: c.date,
          checkInTime: c.checkInTime,
          timestamp: c.iso,
          wouldWriteToFirestore: true,
        })),
        unmappedTransactions,
        syncState,
        migratedFromLocal,
        message: `Dry-run completed. ${newCandidates.length} new transactions detected, ${historicalIgnoredCount || syncState.historicalBaselineLogCount} historical logs ignored, 0 Firestore writes.`,
      });
    }

    // 5. Live Mode: Write candidates up to maxRecords
    const writtenRecords: FirestoreAttendanceDoc[] = [];

    for (const candidate of newCandidates) {
      if (writtenRecords.length >= maxRecords) {
        break;
      }

      const attendanceDoc: FirestoreAttendanceDoc = {
        id: `ATT-${candidate.txId}`,
        transactionId: candidate.txId,
        ownerId,
        gymId,
        deviceId,
        memberId: candidate.member.id,
        memberName: candidate.member.name,
        biometricUserId: String(candidate.log.deviceUserId).trim(),
        date: candidate.date,
        checkInTime: candidate.checkInTime,
        status: "Present",
        source: "biometric",
        verificationType: "Fingerprint",
        createdAt: candidate.iso,
      };

      // Perform atomic Firestore write
      const writeRes = await recordBiometricAttendanceInFirestore(ownerId, gymId, attendanceDoc);
      if (!writeRes.success) {
        console.error(`Firestore attendance write failed for ${candidate.txId}:`, writeRes.error);
        continue;
      }

      writtenRecords.push(attendanceDoc);

      // Update persistent Firestore sync state
      syncState.lastKnownUserSn = Math.max(syncState.lastKnownUserSn, candidate.log.userSn);
      syncState.lastKnownRecordTime = candidate.iso;
      syncState.lastKnownTxId = candidate.txId;
      syncState.lastSyncAt = new Date().toISOString();
      syncState.totalSyncedAttendanceCount = (syncState.totalSyncedAttendanceCount || 0) + 1;
      syncState.recentProcessedTxIds = [...(syncState.recentProcessedTxIds || []), candidate.txId].slice(-150);

      // Update transitional local backup
      const localBackup = loadLocalCheckpoint(ownerId, gymId, deviceId);
      if (localBackup) {
        localBackup.lastKnownUserSn = syncState.lastKnownUserSn;
        localBackup.lastKnownRecordTime = syncState.lastKnownRecordTime;
        localBackup.lastKnownTxId = syncState.lastKnownTxId;
        localBackup.lastSyncedAt = syncState.lastSyncAt;
        if (!localBackup.processedTxIds.includes(candidate.txId)) {
          localBackup.processedTxIds.push(candidate.txId);
        }
        saveLocalCheckpointBackup(localBackup);
      }
    }

    if (writtenRecords.length > 0) {
      await saveBiometricSyncState(gymId, syncState);

      return NextResponse.json({
        success: true,
        dryRun: false,
        sourceOfTruth: "FIRESTORE_PERSISTENT",
        firestoreSyncStatePath,
        recordsWritten: writtenRecords.length,
        attendanceRecords: writtenRecords,
        attendanceRecord: writtenRecords[0],
        firestoreDocPath: `gyms/${gymId}/attendance/${writtenRecords[0].transactionId}`,
        unmappedTransactions,
        summary: {
          totalLogsOnDevice: rawLogs.length,
          historicalIgnoredCount: rawLogs.length > 0 ? historicalIgnoredCount : syncState.historicalBaselineLogCount,
          alreadySyncedCount,
          unmappedCount: unmappedTransactions.length,
          newMappedDetected: newCandidates.length,
          recordsWritten: writtenRecords.length,
        },
        syncState,
        migratedFromLocal,
        message: `Successfully loaded ${writtenRecords.length} biometric attendance record${writtenRecords.length > 1 ? "s" : ""} from K20.`,
      });
    } else {
      // Update lastSyncAt on sync state even when 0 new records were written
      syncState.lastSyncAt = new Date().toISOString();
      await saveBiometricSyncState(gymId, syncState);

      return NextResponse.json({
        success: true,
        dryRun: false,
        sourceOfTruth: "FIRESTORE_PERSISTENT",
        firestoreSyncStatePath,
        recordsWritten: 0,
        duplicateDetected: true,
        unmappedTransactions,
        summary: {
          totalLogsOnDevice: rawLogs.length,
          historicalIgnoredCount: rawLogs.length > 0 ? historicalIgnoredCount : syncState.historicalBaselineLogCount,
          alreadySyncedCount,
          unmappedCount: unmappedTransactions.length,
          newMappedDetected: 0,
          recordsWritten: 0,
        },
        syncState,
        migratedFromLocal,
        message: "No new un-synced transactions found on K20. All existing logs are up to date.",
      });
    }
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Live sync error";
    return NextResponse.json(
      {
        success: false,
        recordsWritten: 0,
        error: errMessage,
      },
      { status: 500 }
    );
  }
}
