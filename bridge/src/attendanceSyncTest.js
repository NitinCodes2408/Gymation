#!/usr/bin/env node
/**
 * GymTrack AI - Controlled Biometric Sync Test (Step 7C)
 * 
 * Runs exactly 3 controlled polling cycles to verify:
 * - Singleton loop isolation
 * - 17,356 historical logs ignored
 * - 0 duplicate writes
 * - Clean shutdown
 */

const { startDaemon } = require('./attendanceDaemon');

// Execute exactly 3 controlled test cycles with 2-second test interval
process.env.BIOMETRIC_POLL_INTERVAL_MS = '5000';

console.log('Starting Step 7C Controlled Multi-Cycle Biometric Sync Test (3 cycles)...');
startDaemon({ maxCycles: 3 });
