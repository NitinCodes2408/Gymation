/**
 * GymTrack AI - Biometric Attendance Synchronization & Dry-Run Engine
 * 
 * STEP 6A ONLY:
 * - Deterministic transaction identification
 * - Watermark / checkpoint isolation
 * - Historical log suppression (ignores existing 17,356 records)
 * - Safe member mapping by biometricUserId
 * - Duplicate detection
 * - STRICTLY DRY-RUN: 0 FIRESTORE WRITES
 */

import { Member } from "../context/AppContext";
import { BiometricDeviceSyncState } from "../firebase/gymService";

export interface RawK20AttendanceLog {
  userSn: number;
  deviceUserId: string;
  recordTime: Date | string;
  ip?: string;
  verifyType?: number;
}

export interface SyncCheckpoint {
  ownerId: string;
  gymId: string;
  deviceId: string;
  establishedAt: string;
  lastSyncedAt: string;
  lastKnownLogCount: number;
  lastKnownUserSn: number;
  lastKnownRecordTime: string;
  lastKnownTxId: string;
  processedTxIds: string[];
}

/**
 * Converts a legacy/local JSON SyncCheckpoint into a production Firestore BiometricDeviceSyncState.
 */
export function convertCheckpointToSyncState(
  checkpoint: SyncCheckpoint,
  deviceIp: string,
  devicePort: number
): BiometricDeviceSyncState {
  const boundedTxIds = Array.isArray(checkpoint.processedTxIds)
    ? checkpoint.processedTxIds.slice(-150)
    : [];

  return {
    deviceId: checkpoint.deviceId,
    deviceIp,
    devicePort,
    ownerId: checkpoint.ownerId,
    gymId: checkpoint.gymId,
    historicalBaselineEstablished: true,
    historicalBaselineLogCount: checkpoint.lastKnownLogCount || 17356,
    lastKnownUserSn: checkpoint.lastKnownUserSn || 18413,
    lastKnownRecordTime: checkpoint.lastKnownRecordTime || "2024-08-17T08:22:07.000Z",
    lastKnownTxId: checkpoint.lastKnownTxId || "",
    lastSyncAt: checkpoint.lastSyncedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalSyncedAttendanceCount: 0,
    recentProcessedTxIds: boundedTxIds,
  };
}

/**
 * Evaluates whether a raw K20 log belongs to the historical baseline watermark.
 */
export function isHistoricalBaselineLog(
  log: RawK20AttendanceLog,
  syncState: BiometricDeviceSyncState
): boolean {
  if (!syncState.historicalBaselineEstablished) return false;

  const baselineTimeMs = new Date(syncState.lastKnownRecordTime).getTime();
  const logDate = typeof log.recordTime === "string" ? new Date(log.recordTime) : log.recordTime;
  const logTimeMs = logDate instanceof Date && !isNaN(logDate.getTime()) ? logDate.getTime() : 0;

  // If userSn <= baseline lastKnownUserSn and record time is before or equal to baseline time
  if (log.userSn <= syncState.lastKnownUserSn && logTimeMs <= baselineTimeMs) {
    return true;
  }

  return false;
}

export type BiometricLogClassification =
  | "HISTORICAL_BASELINE"
  | "ALREADY_SYNCED"
  | "UNMAPPED_BIOMETRIC_USER"
  | "NEW_MAPPED_TRANSACTION";

export interface EvaluatedBiometricLog {
  classification: BiometricLogClassification;
  transactionId: string;
  deviceUserId: string;
  userSn: number;
  recordTime: string;
  date: string;
  checkInTime: string;
  matchedMember?: Member;
  reason: string;
}

/**
 * Robustly evaluates a raw K20 attendance log against the persistent Firestore sync state.
 * Multi-factor check: userSn + recordTime baseline + transactionId cache + member mapping.
 */
export function evaluateLogAgainstSyncState(
  log: RawK20AttendanceLog,
  syncState: BiometricDeviceSyncState,
  deviceIp: string,
  members: Member[],
  inMemoryProcessedIds?: Set<string>
): EvaluatedBiometricLog {
  const bioUserId = String(log.deviceUserId).trim();
  const txId = generateDeterministicTxId(deviceIp, bioUserId, log.userSn, log.recordTime);
  const { date, checkInTime, iso } = formatTransactionDateTime(log.recordTime);

  // 1. Check Historical Baseline Watermark
  if (syncState.historicalBaselineEstablished) {
    const baselineTimeMs = new Date(syncState.lastKnownRecordTime).getTime();
    const logDate = typeof log.recordTime === "string" ? new Date(log.recordTime) : log.recordTime;
    const logTimeMs = logDate instanceof Date && !isNaN(logDate.getTime()) ? logDate.getTime() : 0;

    if (log.userSn <= syncState.lastKnownUserSn && logTimeMs <= baselineTimeMs) {
      return {
        classification: "HISTORICAL_BASELINE",
        transactionId: txId,
        deviceUserId: bioUserId,
        userSn: log.userSn,
        recordTime: iso,
        date,
        checkInTime,
        reason: "Log is part of the established 17,356 historical baseline.",
      };
    }
  }

  // 2. Check in-memory/bounded cache
  if (
    inMemoryProcessedIds?.has(txId) ||
    syncState.recentProcessedTxIds?.includes(txId) ||
    txId === syncState.lastKnownTxId
  ) {
    return {
      classification: "ALREADY_SYNCED",
      transactionId: txId,
      deviceUserId: bioUserId,
      userSn: log.userSn,
      recordTime: iso,
      date,
      checkInTime,
      reason: "Transaction was already processed in recent sync cache.",
    };
  }

  // 3. Member Mapping Resolution
  const matchedMember = members.find((m) => String(m.biometricUserId).trim() === bioUserId);
  if (!matchedMember) {
    return {
      classification: "UNMAPPED_BIOMETRIC_USER",
      transactionId: txId,
      deviceUserId: bioUserId,
      userSn: log.userSn,
      recordTime: iso,
      date,
      checkInTime,
      reason: `Biometric User ID #${bioUserId} is not mapped to any active GymTrack member.`,
    };
  }

  // 4. Valid New Mapped Transaction
  return {
    classification: "NEW_MAPPED_TRANSACTION",
    transactionId: txId,
    deviceUserId: bioUserId,
    userSn: log.userSn,
    recordTime: iso,
    date,
    checkInTime,
    matchedMember,
    reason: `Verified check-in candidate for ${matchedMember.name} (${matchedMember.id}).`,
  };
}

export interface NormalizedAttendanceTransaction {
  transactionId: string;
  deviceId: string;
  biometricUserId: string;
  mappingStatus: "MAPPED_MEMBER" | "UNMAPPED_BIOMETRIC_USER";
  memberId?: string;
  memberName?: string;
  timestamp: string;
  date: string;
  checkInTime: string;
  verificationType: "Fingerprint" | "Password" | "Card" | "Unknown";
  source: string;
  status: "Present";
  isNew: boolean;
  isDuplicate: boolean;
  wouldCreateAttendance: boolean;
  dryRunOnly: true;
  firestoreWrites: 0;
  note?: string;
}

export interface DryRunSyncResult {
  deviceId: string;
  deviceIp: string;
  devicePort: number;
  totalLogsOnDevice: number;
  historicalIgnoredCount: number;
  newTransactionsCount: number;
  duplicateTransactionsCount: number;
  unmappedTransactionsCount: number;
  checkpoint: SyncCheckpoint;
  newTransactions: NormalizedAttendanceTransaction[];
  duplicateTransactions: NormalizedAttendanceTransaction[];
  firestoreWrites: 0;
  dryRunOnly: true;
  timestamp: string;
}

/**
 * Creates a deterministic, unique transaction ID from raw K20 log attributes.
 * Guarantee: The same physical device event produces the exact same transactionId.
 */
export function generateDeterministicTxId(
  deviceIp: string,
  deviceUserId: string,
  userSn: number,
  recordTime: Date | string
): string {
  const d = typeof recordTime === "string" ? new Date(recordTime) : recordTime;
  const timeMs = d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : 0;
  const isoStr = d instanceof Date && !isNaN(d.getTime()) ? d.toISOString() : String(recordTime);
  return `tx_${deviceIp.replace(/\./g, "_")}_u${deviceUserId}_sn${userSn}_${timeMs || isoStr}`;
}

/**
 * Formats a Date into standard local date (YYYY-MM-DD) and check-in time (hh:mm A).
 */
export function formatTransactionDateTime(recordTime: Date | string): { date: string; checkInTime: string; iso: string } {
  const d = typeof recordTime === "string" ? new Date(recordTime) : recordTime;
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    const now = new Date();
    return {
      date: now.toISOString().split("T")[0],
      checkInTime: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
      iso: now.toISOString(),
    };
  }

  const date = d.toISOString().split("T")[0];
  const checkInTime = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return {
    date,
    checkInTime,
    iso: d.toISOString(),
  };
}

/**
 * Creates a fresh default baseline checkpoint from a set of existing raw logs.
 * All existing logs are marked as historical baseline and ignored.
 */
export function createInitialBaselineCheckpoint(
  ownerId: string,
  gymId: string,
  deviceId: string,
  deviceIp: string,
  rawLogs: RawK20AttendanceLog[]
): SyncCheckpoint {
  const nowIso = new Date().toISOString();
  if (!rawLogs || rawLogs.length === 0) {
    return {
      ownerId,
      gymId,
      deviceId,
      establishedAt: nowIso,
      lastSyncedAt: nowIso,
      lastKnownLogCount: 0,
      lastKnownUserSn: 0,
      lastKnownRecordTime: nowIso,
      lastKnownTxId: "",
      processedTxIds: [],
    };
  }

  // Find the last known log
  const lastLog = rawLogs[rawLogs.length - 1];
  const lastTxId = generateDeterministicTxId(deviceIp, String(lastLog.deviceUserId), lastLog.userSn, lastLog.recordTime);
  const lastTimeIso = new Date(lastLog.recordTime).toISOString();

  // Collect all historical transaction IDs so they are never processed
  const processedTxIds: string[] = rawLogs.map((l) =>
    generateDeterministicTxId(deviceIp, String(l.deviceUserId), l.userSn, l.recordTime)
  );

  return {
    ownerId,
    gymId,
    deviceId,
    establishedAt: nowIso,
    lastSyncedAt: nowIso,
    lastKnownLogCount: rawLogs.length,
    lastKnownUserSn: lastLog.userSn,
    lastKnownRecordTime: lastTimeIso,
    lastKnownTxId: lastTxId,
    processedTxIds,
  };
}

/**
 * Processes raw device logs against an existing checkpoint and mapped members in DRY-RUN mode.
 * STRICTLY 0 FIRESTORE WRITES.
 */
export function processAttendanceDryRun(
  ownerId: string,
  gymId: string,
  deviceId: string,
  deviceIp: string,
  devicePort: number,
  rawLogs: RawK20AttendanceLog[],
  members: Member[],
  existingCheckpoint?: SyncCheckpoint | null
): DryRunSyncResult {
  // 1. Establish or use checkpoint
  let checkpoint: SyncCheckpoint;
  let isInitialSetup = false;

  if (!existingCheckpoint || existingCheckpoint.processedTxIds.length === 0) {
    checkpoint = createInitialBaselineCheckpoint(ownerId, gymId, deviceId, deviceIp, rawLogs);
    isInitialSetup = true;
  } else {
    checkpoint = { ...existingCheckpoint };
  }

  const processedSet = new Set<string>(checkpoint.processedTxIds);
  const newTransactions: NormalizedAttendanceTransaction[] = [];
  const duplicateTransactions: NormalizedAttendanceTransaction[] = [];
  let historicalIgnoredCount = 0;
  let unmappedCount = 0;

  if (isInitialSetup) {
    // On initial setup, all existing logs are part of the historical baseline
    historicalIgnoredCount = rawLogs.length;
  } else {
    // Process raw logs
    for (const log of rawLogs) {
      const bioUserId = String(log.deviceUserId).trim();
      const txId = generateDeterministicTxId(deviceIp, bioUserId, log.userSn, log.recordTime);
      const { date, checkInTime, iso } = formatTransactionDateTime(log.recordTime);

      // Check member mapping
      const matchedMember = members.find((m) => m.biometricUserId === bioUserId);
      const isMapped = !!matchedMember;
      if (!isMapped) {
        unmappedCount++;
      }

      const isAlreadyProcessed = processedSet.has(txId);

      const normalized: NormalizedAttendanceTransaction = {
        transactionId: txId,
        deviceId: `${deviceId} (${deviceIp}:${devicePort})`,
        biometricUserId: bioUserId,
        mappingStatus: isMapped ? "MAPPED_MEMBER" : "UNMAPPED_BIOMETRIC_USER",
        memberId: matchedMember?.id,
        memberName: matchedMember?.name,
        timestamp: iso,
        date,
        checkInTime,
        verificationType: "Fingerprint",
        source: "eSSL_K20",
        status: "Present",
        isNew: !isAlreadyProcessed,
        isDuplicate: isAlreadyProcessed,
        wouldCreateAttendance: isMapped && !isAlreadyProcessed,
        dryRunOnly: true,
        firestoreWrites: 0,
        note: !isMapped
          ? `Biometric User ID #${bioUserId} is not mapped to any GymTrack member. No attendance created.`
          : isAlreadyProcessed
          ? `Transaction ${txId} was already processed. Duplicate suppressed.`
          : `Valid check-in for ${matchedMember?.name} (${matchedMember?.id}).`,
      };

      if (isAlreadyProcessed) {
        duplicateTransactions.push(normalized);
      } else {
        newTransactions.push(normalized);
        processedSet.add(txId);
        checkpoint.processedTxIds.push(txId);
        checkpoint.lastKnownUserSn = Math.max(checkpoint.lastKnownUserSn, log.userSn);
        checkpoint.lastKnownRecordTime = iso;
        checkpoint.lastKnownTxId = txId;
      }
    }

    historicalIgnoredCount = rawLogs.length - newTransactions.length - duplicateTransactions.length;
    if (historicalIgnoredCount < 0) historicalIgnoredCount = 0;
  }

  checkpoint.lastKnownLogCount = rawLogs.length;
  checkpoint.lastSyncedAt = new Date().toISOString();

  return {
    deviceId,
    deviceIp,
    devicePort,
    totalLogsOnDevice: rawLogs.length,
    historicalIgnoredCount: isInitialSetup ? rawLogs.length : historicalIgnoredCount,
    newTransactionsCount: newTransactions.length,
    duplicateTransactionsCount: duplicateTransactions.length,
    unmappedTransactionsCount: unmappedCount,
    checkpoint,
    newTransactions,
    duplicateTransactions,
    firestoreWrites: 0,
    dryRunOnly: true,
    timestamp: new Date().toISOString(),
  };
}
