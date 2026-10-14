import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./config";

export interface Gym {
  id: string;
  ownerId: string;
  gymName: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  taxRate: number;
  createdAt: string;
}

export interface OwnerProfile {
  ownerId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

const LOCAL_GYMS_KEY = "gymation_all_gyms_registry";
const LOCAL_OWNERS_KEY = "gymation_owners_registry";

function normalizeGymName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function getLocalGymsRegistry(): Gym[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_GYMS_KEY);
    if (raw) {
      return JSON.parse(raw) as Gym[];
    }
  } catch {
    // Ignore error
  }
  return [];
}

function saveLocalGymsRegistry(gyms: Gym[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_GYMS_KEY, JSON.stringify(gyms));
  } catch {
    // Ignore error
  }
}

/**
 * Checks whether a gym with this name is already registered anywhere (globally unique).
 * Uses case-insensitive comparison.
 */
export async function checkGymNameAvailable(
  gymName: string,
  excludeGymId?: string
): Promise<boolean> {
  const normalized = normalizeGymName(gymName);
  if (!normalized) return false;

  // 1. Check local registry
  const localGyms = getLocalGymsRegistry();
  const localDuplicate = localGyms.some(
    (g) =>
      normalizeGymName(g.gymName) === normalized &&
      (!excludeGymId || g.id !== excludeGymId)
  );
  if (localDuplicate) {
    return false;
  }

  // 2. Check Firestore gyms collection
  try {
    const gymsRef = collection(db, "gyms");
    const q = query(gymsRef);
    const snap = await getDocs(q);
    let firestoreDuplicate = false;
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (
        data.gymName &&
        normalizeGymName(data.gymName) === normalized &&
        (!excludeGymId || docSnap.id !== excludeGymId)
      ) {
        firestoreDuplicate = true;
      }
    });
    if (firestoreDuplicate) {
      return false;
    }
  } catch {
    // If Firestore rules are locked, local registry is primary source
  }

  return true;
}

/**
 * Creates or updates an owner profile document in /owners/{ownerId}.
 */
export async function createOwnerProfile(
  ownerId: string,
  profileData: { name: string; email: string; phone: string }
): Promise<OwnerProfile> {
  const profile: OwnerProfile = {
    ownerId,
    name: profileData.name.trim(),
    email: profileData.email.trim().toLowerCase(),
    phone: profileData.phone.trim(),
    createdAt: new Date().toISOString(),
  };

  // Local storage cache
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_OWNERS_KEY) || "{}";
      const ownersMap = JSON.parse(raw);
      ownersMap[ownerId] = profile;
      localStorage.setItem(LOCAL_OWNERS_KEY, JSON.stringify(ownersMap));
    } catch {
      // Ignore error
    }
  }

  // Firestore
  try {
    await setDoc(doc(db, "owners", ownerId), profile);
  } catch (err) {
    console.warn("Firestore owner profile notice:", err);
  }

  return profile;
}

/**
 * Creates a new gym under the given ownerId.
 */
export async function createGym(
  ownerId: string,
  gymData: {
    gymName: string;
    email?: string;
    phone?: string;
    address?: string;
    currency?: string;
    taxRate?: number;
  }
): Promise<{ success: boolean; gym?: Gym; error?: string }> {
  const isAvailable = await checkGymNameAvailable(gymData.gymName);
  if (!isAvailable) {
    return {
      success: false,
      error: "A gym with this name is already registered.",
    };
  }

  const gymId = `gym_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newGym: Gym = {
    id: gymId,
    ownerId,
    gymName: gymData.gymName.trim(),
    email: gymData.email ? gymData.email.trim() : "",
    phone: gymData.phone ? gymData.phone.trim() : "",
    address: gymData.address ? gymData.address.trim() : "Plot 101, Main Gym Hall",
    currency: gymData.currency || "₹",
    taxRate: gymData.taxRate !== undefined ? gymData.taxRate : 18.0,
    createdAt: new Date().toISOString(),
  };

  // Save to local registry
  const localGyms = getLocalGymsRegistry();
  saveLocalGymsRegistry([...localGyms, newGym]);

  // Save to Firestore
  try {
    await setDoc(doc(db, "gyms", gymId), newGym);
  } catch (err) {
    console.warn("Firestore gym document notice:", err);
  }

  return { success: true, gym: newGym };
}

/**
 * Fetches all gyms belonging to a specific ownerId.
 */
export async function getOwnerGyms(ownerId: string): Promise<Gym[]> {
  const gymsList: Gym[] = [];
  const seenIds = new Set<string>();

  // 1. From local registry
  const localGyms = getLocalGymsRegistry().filter((g) => g.ownerId === ownerId);
  localGyms.forEach((g) => {
    gymsList.push(g);
    seenIds.add(g.id);
  });

  // 2. From Firestore
  try {
    const gymsRef = collection(db, "gyms");
    const q = query(gymsRef, where("ownerId", "==", ownerId));
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      if (!seenIds.has(docSnap.id)) {
        const gymData = docSnap.data() as Gym;
        gymsList.push({ ...gymData, id: docSnap.id });
        seenIds.add(docSnap.id);
      }
    });
  } catch {
    // Ignore error
  }

  return gymsList;
}

/**
 * Updates details of an existing gym.
 */
export async function updateGym(
  gymId: string,
  ownerId: string,
  updatedData: Partial<Gym>
): Promise<{ success: boolean; error?: string }> {
  if (updatedData.gymName) {
    const isAvailable = await checkGymNameAvailable(updatedData.gymName, gymId);
    if (!isAvailable) {
      return {
        success: false,
        error: "A gym with this name is already registered.",
      };
    }
  }

  // Update local registry
  const localGyms = getLocalGymsRegistry();
  const updatedGyms = localGyms.map((g) => {
    if (g.id === gymId && g.ownerId === ownerId) {
      return { ...g, ...updatedData };
    }
    return g;
  });
  saveLocalGymsRegistry(updatedGyms);

  // Update Firestore
  try {
    await setDoc(doc(db, "gyms", gymId), updatedData, { merge: true });
  } catch (err) {
    console.warn("Firestore gym update notice:", err);
  }

  return { success: true };
}

export interface FirestoreAttendanceDoc {
  id: string;
  transactionId: string;
  ownerId: string;
  gymId: string;
  deviceId: string;
  memberId: string;
  memberName: string;
  biometricUserId: string;
  date: string;
  checkInTime: string;
  status: "Present" | "Absent";
  source: "biometric";
  verificationType: "Fingerprint";
  createdAt: string;
}

export interface BiometricDeviceSyncState {
  deviceId: string;
  deviceIp: string;
  devicePort: number;
  ownerId: string;
  gymId: string;
  historicalBaselineEstablished: boolean;
  historicalBaselineLogCount: number;
  lastKnownLogCount?: number;
  lastKnownUserSn: number;
  lastKnownRecordTime: string;
  lastKnownTxId: string;
  lastSyncAt: string;
  updatedAt: string;
  totalSyncedAttendanceCount: number;
  recentProcessedTxIds?: string[];
}

/**
 * Normalizes device ID to a safe Firestore document ID (e.g. K20-192_168_1_200_4370).
 */
export function getSafeDeviceDocId(deviceId: string): string {
  return deviceId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Retrieves the persistent, gym-scoped biometric sync state from Firestore.
 * Path: gyms/{gymId}/biometricDevices/{safeDeviceId}
 */
export async function getBiometricSyncState(
  gymId: string,
  deviceId: string
): Promise<BiometricDeviceSyncState | null> {
  try {
    const safeDocId = getSafeDeviceDocId(deviceId);
    const docRef = doc(db, "gyms", gymId, "biometricDevices", safeDocId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as BiometricDeviceSyncState;
    }
  } catch (err) {
    console.warn(`[BiometricSyncState] Notice fetching sync state for ${deviceId}:`, err);
  }
  return null;
}

/**
 * Saves or updates the persistent biometric sync state in Firestore.
 * Path: gyms/{gymId}/biometricDevices/{safeDeviceId}
 */
export async function saveBiometricSyncState(
  gymId: string,
  syncState: BiometricDeviceSyncState
): Promise<{ success: boolean; error?: string; docPath?: string }> {
  try {
    const safeDocId = getSafeDeviceDocId(syncState.deviceId);
    const docRef = doc(db, "gyms", gymId, "biometricDevices", safeDocId);
    
    // Ensure bounded recent transaction IDs (last 150 items max to respect Firestore document bounds)
    const boundedTxIds = Array.isArray(syncState.recentProcessedTxIds)
      ? syncState.recentProcessedTxIds.slice(-150)
      : [];

    const payload: BiometricDeviceSyncState = {
      ...syncState,
      recentProcessedTxIds: boundedTxIds,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(docRef, payload, { merge: true });
    return {
      success: true,
      docPath: `gyms/${gymId}/biometricDevices/${safeDocId}`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to save biometric sync state to Firestore",
    };
  }
}

/**
 * Checks if a specific attendance document already exists in Firestore.
 * Path: gyms/{gymId}/attendance/{transactionId}
 */
export async function isAttendanceDocExists(
  gymId: string,
  transactionId: string
): Promise<boolean> {
  try {
    const docRef = doc(db, "gyms", gymId, "attendance", transactionId);
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch {
    return false;
  }
}

/**
 * Records a single verified biometric attendance record to Firestore.
 * Idempotent by transactionId: gyms/{gymId}/attendance/{transactionId}.
 */
export async function recordBiometricAttendanceInFirestore(
  ownerId: string,
  gymId: string,
  attendanceRecord: FirestoreAttendanceDoc
): Promise<{ success: boolean; error?: string; docPath?: string }> {
  try {
    const docRef = doc(db, "gyms", gymId, "attendance", attendanceRecord.transactionId);
    await setDoc(docRef, attendanceRecord, { merge: true });
    return {
      success: true,
      docPath: `gyms/${gymId}/attendance/${attendanceRecord.transactionId}`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to write attendance to Firestore",
    };
  }
}

/**
 * Subscribes to live attendance records for a specific gym in real time.
 * Scoped strictly to gyms/{gymId}/attendance.
 */
export function subscribeToGymAttendance(
  gymId: string,
  onRecords: (records: FirestoreAttendanceDoc[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!gymId) return () => {};
  try {
    const attendanceColRef = collection(db, "gyms", gymId, "attendance");
    const unsubscribe = onSnapshot(
      attendanceColRef,
      (snapshot) => {
        const records: FirestoreAttendanceDoc[] = [];
        snapshot.forEach((docSnap) => {
          records.push(docSnap.data() as FirestoreAttendanceDoc);
        });
        onRecords(records);
      },
      (err) => {
        if (onError) onError(err);
        console.warn(`[Firestore Attendance Listener] Notice for gym ${gymId}:`, err);
      }
    );
    return unsubscribe;
  } catch (err: any) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Subscribes to live biometric sync state for a device in a specific gym.
 * Scoped strictly to gyms/{gymId}/biometricDevices/{safeDeviceId}.
 */
export function subscribeToBiometricSyncState(
  gymId: string,
  deviceId: string,
  onSyncState: (state: BiometricDeviceSyncState | null) => void
): () => void {
  if (!gymId || !deviceId) return () => {};
  try {
    const safeDocId = getSafeDeviceDocId(deviceId);
    const docRef = doc(db, "gyms", gymId, "biometricDevices", safeDocId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onSyncState(snapshot.data() as BiometricDeviceSyncState);
        } else {
          onSyncState(null);
        }
      },
      (err) => {
        console.warn(`[Firestore SyncState Listener] Notice for ${deviceId}:`, err);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}


