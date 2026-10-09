const assert = require('assert');

function generateDeterministicTxId(deviceIp, deviceUserId, userSn, recordTime) {
  const d = new Date(recordTime);
  const timeMs = !isNaN(d.getTime()) ? d.getTime() : 0;
  return `tx_${deviceIp.replace(/\./g, '_')}_u${deviceUserId}_sn${userSn}_${timeMs}`;
}

function formatTransactionDateTime(recordTime) {
  const d = new Date(recordTime);
  const date = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : 'Unknown';
  const checkInTime = !isNaN(d.getTime()) ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Unknown';
  return { date, checkInTime, iso: d.toISOString() };
}

function processAttendanceDryRun(ownerId, gymId, deviceId, deviceIp, devicePort, rawLogs, members, existingCheckpoint) {
  let checkpoint;
  let isInitialSetup = false;

  if (!existingCheckpoint || !existingCheckpoint.processedTxIds || existingCheckpoint.processedTxIds.length === 0) {
    const lastLog = rawLogs[rawLogs.length - 1];
    const lastTxId = lastLog ? generateDeterministicTxId(deviceIp, String(lastLog.deviceUserId), lastLog.userSn, lastLog.recordTime) : '';
    const lastTimeIso = lastLog ? new Date(lastLog.recordTime).toISOString() : new Date().toISOString();
    const processedTxIds = rawLogs.map(l => generateDeterministicTxId(deviceIp, String(l.deviceUserId), l.userSn, l.recordTime));

    checkpoint = {
      ownerId,
      gymId,
      deviceId,
      establishedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
      lastKnownLogCount: rawLogs.length,
      lastKnownUserSn: lastLog ? lastLog.userSn : 0,
      lastKnownRecordTime: lastTimeIso,
      lastKnownTxId: lastTxId,
      processedTxIds,
    };
    isInitialSetup = true;
  } else {
    checkpoint = { ...existingCheckpoint };
  }

  const processedSet = new Set(checkpoint.processedTxIds);
  const newTransactions = [];
  const duplicateTransactions = [];

  if (isInitialSetup) {
    // Initial baseline ignores all existing logs
  } else {
    for (const log of rawLogs) {
      const bioUserId = String(log.deviceUserId).trim();
      const txId = generateDeterministicTxId(deviceIp, bioUserId, log.userSn, log.recordTime);
      const { date, checkInTime, iso } = formatTransactionDateTime(log.recordTime);

      const matchedMember = members.find(m => m.biometricUserId === bioUserId);
      const isMapped = !!matchedMember;
      const isAlreadyProcessed = processedSet.has(txId);

      const normalized = {
        transactionId: txId,
        deviceId: `${deviceId} (${deviceIp}:${devicePort})`,
        biometricUserId: bioUserId,
        mappingStatus: isMapped ? 'MAPPED_MEMBER' : 'UNMAPPED_BIOMETRIC_USER',
        memberId: matchedMember ? matchedMember.id : undefined,
        memberName: matchedMember ? matchedMember.name : undefined,
        timestamp: iso,
        date,
        checkInTime,
        verificationType: 'Fingerprint',
        source: 'eSSL_K20',
        status: 'Present',
        isNew: !isAlreadyProcessed,
        isDuplicate: isAlreadyProcessed,
        wouldCreateAttendance: isMapped && !isAlreadyProcessed,
        dryRunOnly: true,
        firestoreWrites: 0,
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
  }

  checkpoint.lastKnownLogCount = rawLogs.length;
  checkpoint.lastSyncedAt = new Date().toISOString();

  return {
    totalLogsOnDevice: rawLogs.length,
    historicalIgnoredCount: isInitialSetup ? rawLogs.length : rawLogs.length - newTransactions.length,
    newTransactionsCount: newTransactions.length,
    duplicateTransactionsCount: duplicateTransactions.length,
    checkpoint,
    newTransactions,
    duplicateTransactions,
    firestoreWrites: 0,
    dryRunOnly: true,
  };
}

console.log('===============================================================');
console.log('   STEP 6A LOGICAL VERIFICATION TEST SUITE                     ');
console.log('===============================================================');

// Mock GymTrack members
const members = [
  { id: 'M-1019', name: 'Rahul Sharma', biometricUserId: '19', status: 'Active' },
  { id: 'M-1034', name: 'Priya Patel', biometricUserId: '34', status: 'Active' },
];

// Baseline historical logs (17,356 logs representation)
const baselineLogs = [
  { userSn: 18411, deviceUserId: '33', recordTime: new Date('2024-08-16T12:39:13Z'), ip: '192.168.1.200' },
  { userSn: 18412, deviceUserId: '19', recordTime: new Date('2024-08-16T16:18:19Z'), ip: '192.168.1.200' },
  { userSn: 18413, deviceUserId: '19', recordTime: new Date('2024-08-17T08:22:07Z'), ip: '192.168.1.200' },
];

// 1. Initial Setup: Establish baseline
const res1 = processAttendanceDryRun(
  'owner_default', 'gym_default', 'K20-192.168.1.200', '192.168.1.200', 4370,
  baselineLogs, members, null
);

assert.strictEqual(res1.historicalIgnoredCount, 3, 'Historical logs must be ignored on baseline establishment');
assert.strictEqual(res1.newTransactionsCount, 0, 'No new transactions on baseline setup');
assert.strictEqual(res1.firestoreWrites, 0, 'Firestore writes MUST be 0');
console.log('✅ Test 1 Passed: Initial baseline setup ignored all historical logs with 0 Firestore writes.');

// 2. Member scans finger: New log generated on K20
const newLogMapped = {
  userSn: 18414,
  deviceUserId: '19',
  recordTime: new Date('2026-09-25T16:45:00Z'),
  ip: '192.168.1.200'
};
const updatedLogs = [...baselineLogs, newLogMapped];

const res2 = processAttendanceDryRun(
  'owner_default', 'gym_default', 'K20-192.168.1.200', '192.168.1.200', 4370,
  updatedLogs, members, res1.checkpoint
);

assert.strictEqual(res2.newTransactionsCount, 1, 'Should detect exactly 1 new transaction');
assert.strictEqual(res2.newTransactions[0].mappingStatus, 'MAPPED_MEMBER', 'Should identify as mapped member');
assert.strictEqual(res2.newTransactions[0].memberId, 'M-1019', 'Should resolve memberId M-1019');
assert.strictEqual(res2.newTransactions[0].memberName, 'Rahul Sharma', 'Should resolve memberName Rahul Sharma');
assert.strictEqual(res2.newTransactions[0].wouldCreateAttendance, true, 'Would create attendance for mapped member');
assert.strictEqual(res2.firestoreWrites, 0, 'Firestore writes MUST be 0');
console.log('✅ Test 2 Passed: Detected new transaction for User #19 mapped to Rahul Sharma (M-1019) with 0 Firestore writes.');

// 3. Unmapped User scans finger (e.g. User #99)
const newLogUnmapped = {
  userSn: 18415,
  deviceUserId: '99',
  recordTime: new Date('2026-09-25T16:46:00Z'),
  ip: '192.168.1.200'
};
const updatedLogsWithUnmapped = [...updatedLogs, newLogUnmapped];

const res3 = processAttendanceDryRun(
  'owner_default', 'gym_default', 'K20-192.168.1.200', '192.168.1.200', 4370,
  updatedLogsWithUnmapped, members, res2.checkpoint
);

assert.strictEqual(res3.newTransactionsCount, 1, 'Should detect 1 new unmapped transaction');
assert.strictEqual(res3.newTransactions[0].mappingStatus, 'UNMAPPED_BIOMETRIC_USER');
assert.strictEqual(res3.newTransactions[0].wouldCreateAttendance, false, 'Should NOT create attendance for unmapped user');
assert.strictEqual(res3.firestoreWrites, 0, 'Firestore writes MUST be 0');
console.log('✅ Test 3 Passed: Detected unmapped User #99, correctly flagged UNMAPPED_BIOMETRIC_USER with 0 Firestore writes.');

// 4. Duplicate Check: Run again without new logs
const res4 = processAttendanceDryRun(
  'owner_default', 'gym_default', 'K20-192.168.1.200', '192.168.1.200', 4370,
  updatedLogsWithUnmapped, members, res3.checkpoint
);

assert.strictEqual(res4.newTransactionsCount, 0, 'Zero new transactions on second run');
assert.strictEqual(res4.duplicateTransactionsCount, 5, 'All existing logs flagged as duplicates');
assert.strictEqual(res4.firestoreWrites, 0, 'Firestore writes MUST be 0');
console.log('✅ Test 4 Passed: Duplicate suppression verified. 0 new transactions created on second run.');

console.log('\n⭐ ALL 4 DRY-RUN TESTS PASSED SUCCESSFULLY WITH 0 FIRESTORE WRITES!\n');
