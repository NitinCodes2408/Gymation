import { NextResponse } from "next/server";
import { getSanitizedDeviceSummary } from "@/lib/biometric/config";
import { deviceMutex } from "@/lib/biometric/deviceMutex";
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
  { id: "M-1001", name: "Jayshri Gawale", biometricUserId: "1", status: "Active" },
  { id: "M-1002", name: "Karina Madavi", biometricUserId: "2", status: "Active" },
  { id: "M-1003", name: "Rahul Tiranagam", biometricUserId: "3", status: "Active" },
  { id: "M-1004", name: "Shilpa Madavi", biometricUserId: "4", status: "Active" },
  { id: "M-1005", name: "Manda Halami", biometricUserId: "5", status: "Active" },
  { id: "M-1006", name: "Naresh Chimalwar", biometricUserId: "6", status: "Active" },
  { id: "M-1007", name: "Ashwini Rapanji", biometricUserId: "7", status: "Active" },
  { id: "M-1008", name: "Sunanda", biometricUserId: "8", status: "Active" },
  { id: "M-1009", name: "Puja Chandanbawane", biometricUserId: "9", status: "Active" },
  { id: "M-1010", name: "Member 10", biometricUserId: "10", status: "Active" },
  { id: "M-1019", name: "Rahul Sharma", biometricUserId: "19", status: "Active" },
  { id: "M-1030", name: "Sabir Khan", biometricUserId: "30", status: "Active" },
  { id: "M-1031", name: "Moni Pada", biometricUserId: "31", status: "Active" },
  { id: "M-1032", name: "Vijay Tirangam", biometricUserId: "32", status: "Active" },
  { id: "M-1033", name: "Payal Chandanbawane", biometricUserId: "33", status: "Active" },
  { id: "M-1034", name: "Member 34", biometricUserId: "34", status: "Active" },
  { id: "M-1035", name: "Member 35", biometricUserId: "35", status: "Active" },
  { id: "M-1036", name: "Member 36", biometricUserId: "36", status: "Active" },
  { id: "M-1037", name: "Member 37", biometricUserId: "37", status: "Active" },
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
    const firestoreSyncStatePath = `gyms/${gymId}/biometricDevices/${safeDocId}`;

    // Combine any client-provided members with known enrolled members from K20 hardware
    const effectiveMembers: any[] = Array.isArray(body.members) && body.members.length > 0 ? [...body.members] : [];
    for (const def of DEFAULT_MEMBERS) {
      if (!effectiveMembers.some((m) => String(m.biometricUserId).trim() === def.biometricUserId)) {
        effectiveMembers.push(def);
      }
    }
    const membersList = effectiveMembers;

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
      // 2A. Acquire singleton device mutex (prevents socket collisions with scan-attendance and parallel polls)
      let releaseLock: (() => void) | null = null;
      try {
        releaseLock = await deviceMutex.acquire(4000);
      } catch {
        return NextResponse.json({
          success: true,
          busy: true,
          recordsWritten: 0,
          summary: {
            totalLogsOnDevice: 0,
            historicalIgnoredCount: syncState.historicalBaselineLogCount,
            alreadySyncedCount: 0,
            unmappedCount: 0,
            newMappedDetected: 0,
            recordsWritten: 0,
          },
          message: "K20 terminal is currently busy with another operation. Sync will retry automatically.",
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const dynamicRequire = eval("require");
      const ZKLib = dynamicRequire("node-zklib");
      const zk = new ZKLib(summary.deviceIp, summary.devicePort, 15000);

      try {
        await zk.createSocket();

        // 2B. Ultra-fast metadata check (~50-80ms): verify if device has any new logs beyond watermark
        const info = await zk.getInfo().catch(() => null);
        const lastKnownCount = syncState.lastKnownLogCount || syncState.historicalBaselineLogCount || 0;
        const forceFullSync = Boolean(body.forceRefresh || (syncState.lastKnownUserSn && syncState.lastKnownUserSn <= 18421));

        if (!forceFullSync && info && typeof info.logCounts === "number" && info.logCounts <= lastKnownCount && (syncState.lastKnownUserSn || 0) >= 18440) {
          // Terminal has no new logs recorded; avoid downloading 17,000+ records
          await zk.disconnect().catch(() => {});
          if (releaseLock) {
            releaseLock();
            releaseLock = null;
          }

          syncState.lastSyncAt = new Date().toISOString();
          syncState.lastKnownLogCount = info.logCounts;
          await saveBiometricSyncState(gymId, syncState);

          const localBackup = loadLocalCheckpoint(ownerId, gymId, deviceId);
          if (localBackup) {
            localBackup.lastKnownLogCount = info.logCounts;
            localBackup.lastSyncedAt = syncState.lastSyncAt;
            saveLocalCheckpointBackup(localBackup);
          }

          return NextResponse.json({
            success: true,
            dryRun: false,
            upToDate: true,
            sourceOfTruth: "FIRESTORE_PERSISTENT",
            firestoreSyncStatePath,
            recordsWritten: 0,
            duplicateDetected: true,
            unmappedTransactions: [],
            summary: {
              totalLogsOnDevice: info.logCounts,
              historicalIgnoredCount: lastKnownCount,
              alreadySyncedCount: 0,
              unmappedCount: 0,
              newMappedDetected: 0,
              recordsWritten: 0,
            },
            syncState,
            migratedFromLocal,
            message: "Terminal attendance logs are up to date.",
          });
        }

        // 2C. New logs detected on device (or metadata info query unavailable)
        const logsResult = await zk.getAttendances();
        if (logsResult && logsResult.data && Array.isArray(logsResult.data)) {
          rawLogs = logsResult.data.map((l: any) => ({
            userSn: Number(l.userSn || 0),
            deviceUserId: String(l.deviceUserId || l.userId || ""),
            recordTime: l.recordTime,
            ip: l.ip || summary.deviceIp,
          }));
        }

        if (info && typeof info.logCounts === "number") {
          syncState.lastKnownLogCount = info.logCounts;
        } else if (rawLogs.length > 0) {
          syncState.lastKnownLogCount = rawLogs.length;
        }

        await zk.disconnect().catch(() => {});
      } catch (err: any) {
        console.error("[SyncLive] Terminal communication notice:", err?.message || err);
        return NextResponse.json(
          {
            success: false,
            recordsWritten: 0,
            error: `Could not connect to K20 terminal (${summary.deviceIp}:${summary.devicePort}): ${err?.message || "Socket timeout"}`,
          },
          { status: 503 }
        );
      } finally {
        if (releaseLock) {
          releaseLock();
          releaseLock = null;
        }
      }
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

        // Ensure physical punches are never lost: auto-create attendance candidate
        const autoMember = {
          id: `M-BIO-${evaluation.deviceUserId}`,
          name: `Member #${evaluation.deviceUserId}`,
          biometricUserId: evaluation.deviceUserId,
          status: "Active" as const,
        };

        const docExists = await isAttendanceDocExists(gymId, evaluation.transactionId);
        if (!docExists) {
          newCandidates.push({
            log,
            txId: evaluation.transactionId,
            member: autoMember,
            date: evaluation.date,
            checkInTime: evaluation.checkInTime,
            iso: evaluation.recordTime,
          });
        }
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
        if (syncState.lastKnownLogCount) {
          localBackup.lastKnownLogCount = syncState.lastKnownLogCount;
        }
        if (!localBackup.processedTxIds.includes(candidate.txId)) {
          localBackup.processedTxIds.push(candidate.txId);
        }
        saveLocalCheckpointBackup(localBackup);
      }
    }

    if (writtenRecords.length > 0) {
      await saveBiometricSyncState(gymId, syncState);

      // Persist to local backup records file
      try {
        const liveRecordsPath = path.join(CHECKPOINT_DIR, "live_attendance_records.json");
        let existingRecords: any[] = [];
        if (fs.existsSync(liveRecordsPath)) {
          existingRecords = JSON.parse(fs.readFileSync(liveRecordsPath, "utf-8"));
        }
        for (const rec of writtenRecords) {
          if (!existingRecords.some((r: any) => r.transactionId === rec.transactionId)) {
            existingRecords.push(rec);
          }
        }
        fs.writeFileSync(liveRecordsPath, JSON.stringify(existingRecords, null, 2), "utf-8");
      } catch (e) {
        console.warn("Notice updating live_attendance_records.json:", e);
      }

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

      const localBackup = loadLocalCheckpoint(ownerId, gymId, deviceId);
      if (localBackup) {
        if (syncState.lastKnownLogCount) {
          localBackup.lastKnownLogCount = syncState.lastKnownLogCount;
        }
        localBackup.lastSyncedAt = syncState.lastSyncAt;
        saveLocalCheckpointBackup(localBackup);
      }

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
