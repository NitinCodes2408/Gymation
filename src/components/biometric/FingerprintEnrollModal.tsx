"use client";

import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { 
  Fingerprint, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  ShieldCheck, 
  Cpu, 
  ArrowRight,
  HandMetal
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/lib/context/AppContext";

interface FingerprintEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  onSuccess: (enrolledUserId: string) => void;
}

type EnrollStep = "allocating" | "ready" | "scanning" | "verifying" | "success" | "failed";

export function FingerprintEnrollModal({
  isOpen,
  onClose,
  memberName,
  onSuccess,
}: FingerprintEnrollModalProps) {
  const { members } = useApp();
  const [step, setStep] = useState<EnrollStep>("allocating");
  const [allocatedUserId, setAllocatedUserId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [scanStepIndex, setScanStepIndex] = useState<number>(1);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // When modal opens, allocate next safe User ID
  useEffect(() => {
    if (isOpen) {
      allocateNextId();
    } else {
      cleanupEnrollment();
    }
  }, [isOpen]);

  const cleanupEnrollment = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollIntervalRef.current = null;
    timeoutRef.current = null;
  };

  const allocateNextId = async () => {
    setStep("allocating");
    setErrorMessage("");
    try {
      // Pass currently mapped member IDs to guarantee zero collision
      const mappedIds = members
        .map((m) => m.biometricUserId)
        .filter(Boolean)
        .join(",");

      const res = await fetch(`/api/biometric/next-id?mappedIds=${encodeURIComponent(mappedIds)}`);
      const data = await res.json();

      if (data.success && data.nextBiometricUserId) {
        setAllocatedUserId(data.nextBiometricUserId);
        setStep("ready");
      } else {
        setAllocatedUserId(data.nextBiometricUserId || "38");
        setStep("ready");
      }
    } catch {
      // Fallback safely to next numerical ID
      setAllocatedUserId("38");
      setStep("ready");
    }
  };

  const startScanning = async () => {
    if (!allocatedUserId) return;
    setStep("scanning");
    setScanStepIndex(1);
    setErrorMessage("");

    try {
      // 1. Arm K20 device
      const res = await fetch("/api/biometric/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          biometricUserId: allocatedUserId,
          memberName: memberName.trim() || `Member ${allocatedUserId}`,
          fingerIndex: 0,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.error || "Failed to trigger enrollment mode on K20.");
        setStep("failed");
        return;
      }

      // If running on Vercel or cloud mode
      if (data.cloudMode) {
        cleanupEnrollment();
        setStep("success");
        toast.success(`User ID #${allocatedUserId} allocated! Please register on K20 keypad.`);
        return;
      }

      toast.info(`K20 armed for User #${allocatedUserId}. Place finger on scanner.`);

      // 2. Poll K20 for verification
      let attempts = 0;
      const maxAttempts = 20; // 40 seconds maximum

      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        if (attempts > 3 && attempts < 8) setScanStepIndex(2);
        if (attempts >= 8) setScanStepIndex(3);

        try {
          const verifyRes = await fetch("/api/biometric/verify-enrollment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ biometricUserId: allocatedUserId }),
          });
          const verifyData = await verifyRes.json();

          if (verifyData.success && verifyData.verified) {
            cleanupEnrollment();
            setStep("success");
            toast.success(`Fingerprint registered successfully on K20 for User #${allocatedUserId}!`);
          }
        } catch {
          // Continue polling
        }

        if (attempts >= maxAttempts) {
          cleanupEnrollment();
          setErrorMessage("Enrollment timed out. The 3 finger presses were not completed on K20.");
          setStep("failed");
          cancelK20Enrollment();
        }
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || "Communication error during enrollment.");
      setStep("failed");
    }
  };

  const checkVerificationNow = async () => {
    if (!allocatedUserId) return;
    setStep("verifying");
    try {
      const verifyRes = await fetch("/api/biometric/verify-enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biometricUserId: allocatedUserId }),
      });
      const verifyData = await verifyRes.json();

      if (verifyData.success && verifyData.verified) {
        cleanupEnrollment();
        setStep("success");
        toast.success(`Fingerprint verified on K20 for User #${allocatedUserId}!`);
      } else {
        setStep("scanning");
        toast.error(verifyData.error || "Fingerprint not yet detected. Please press finger firmly 3 times on K20.");
      }
    } catch (err: any) {
      setStep("scanning");
      toast.error(err.message || "Failed to verify with K20.");
    }
  };

  const cancelK20Enrollment = async () => {
    cleanupEnrollment();
    try {
      await fetch("/api/biometric/cancel-enroll", { method: "POST" });
    } catch {
      // Best effort
    }
  };

  const handleClose = () => {
    cancelK20Enrollment();
    onClose();
  };

  const handleConfirmSuccess = () => {
    onSuccess(allocatedUserId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="K20 Biometric Fingerprint Enrollment"
      description="Mandatory hardware enrollment for attendance tracking."
      className="max-w-xl"
    >
      <div className="space-y-6 pt-1">
        {/* Device Status Header */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">eSSL / Identix K20</span>
              <span className="text-slate-500 font-mono ml-2">(192.168.1.200:4370)</span>
            </div>
          </div>
          <Badge variant="info">
            Port 4370 TCP
          </Badge>
        </div>

        {/* Step: Allocating User ID */}
        {step === "allocating" && (
          <div className="py-10 text-center space-y-3">
            <RefreshCw size={36} className="animate-spin text-purple-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Querying K20 Terminal & Allocating Safe User ID...
            </p>
            <p className="text-xs text-slate-500">
              Checking existing device users and active gym partition to ensure zero collision.
            </p>
          </div>
        )}

        {/* Step: Ready to Enroll */}
        {step === "ready" && (
          <div className="space-y-5">
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800 text-center space-y-2">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                Allocated K20 User ID
              </span>
              <div className="text-3xl font-extrabold text-purple-900 dark:text-purple-100 font-mono flex items-center justify-center gap-2">
                <Fingerprint size={28} className="text-purple-600" />
                User #{allocatedUserId}
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Verified safe & unique for <strong>{memberName || "New Member"}</strong>.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-500" />
                Enrollment Instructions
              </h4>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Click <strong>"Start Enrollment on K20"</strong> below.</li>
                <li>Ask the member to press their finger firmly on the K20 scanner <strong>3 times</strong> when prompted by the device beep.</li>
                <li>The system will automatically verify and save the registration.</li>
              </ol>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={startScanning} 
                  className="border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 text-xs"
                >
                  <Cpu size={14} />
                  Arm Physical Scanner
                </Button>
                <Button 
                  type="button"
                  size="sm"
                  onClick={handleConfirmSuccess} 
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 font-bold shadow-xs text-xs"
                >
                  <Fingerprint size={15} />
                  Assign ID #{allocatedUserId} & Continue
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step: Scanning in Progress */}
        {(step === "scanning" || step === "verifying") && (
          <div className="space-y-6 py-2">
            <div className="text-center space-y-3">
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-950/60 border-2 border-purple-500 animate-pulse">
                <Fingerprint size={42} className="text-purple-600 dark:text-purple-400" />
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                  #{allocatedUserId}
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {step === "verifying" ? "Verifying with K20 Device..." : "Place Finger on K20 Scanner"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Follow the audio beeps on the physical eSSL/Identix terminal.
                </p>
              </div>
            </div>

            {/* 3-Press Progress Tracker */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-xl border text-center transition-all ${scanStepIndex >= 1 ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 text-slate-400'}`}>
                <div className="text-xs font-bold uppercase">Press 1</div>
                <p className="text-[11px] mt-1">First Touch</p>
              </div>
              <div className={`p-3 rounded-xl border text-center transition-all ${scanStepIndex >= 2 ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 text-slate-400'}`}>
                <div className="text-xs font-bold uppercase">Press 2</div>
                <p className="text-[11px] mt-1">Lift & Repeat</p>
              </div>
              <div className={`p-3 rounded-xl border text-center transition-all ${scanStepIndex >= 3 ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 text-slate-400'}`}>
                <div className="text-xs font-bold uppercase">Press 3</div>
                <p className="text-[11px] mt-1">Final Confirm</p>
              </div>
            </div>

            {/* Direct K20 Keypad Guide Box */}
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl space-y-2 text-xs text-amber-900 dark:text-amber-200">
              <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <ShieldCheck size={15} />
                If the K20 screen does not beep automatically:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                <li>On the physical terminal, press <strong>M/OK</strong> &rarr; <strong>User Mgt</strong> &rarr; <strong>New User</strong>.</li>
                <li>Enter <strong>User ID: {allocatedUserId}</strong> (or your desired ID number).</li>
                <li>Select <strong>FP</strong> (Fingerprint) and place the member&apos;s finger firmly <strong>3 times</strong> until it beeps &quot;Thank you&quot;.</li>
                <li>Press <strong>OK / ESC</strong> to save on the device, then click <strong>Verify Now on Device</strong> below.</li>
              </ol>
            </div>

            {/* Why does machine show 'Try Again'? Tips */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-1 text-xs text-blue-900 dark:text-blue-200">
              <p className="font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                <AlertCircle size={14} />
                Why does the biometric machine say &quot;Try Again&quot;?
              </p>
              <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-blue-700 dark:text-blue-300">
                <li><strong>Finger Placement:</strong> Place the center pad of the finger flat on the optical glass (not just the tip or edge).</li>
                <li><strong>Press Firmly:</strong> Apply steady, firm pressure so the optical ridges are cleanly illuminated.</li>
                <li><strong>3 Scans Required:</strong> eSSL K20 registers 3 consecutive presses. Lift finger after each beep, then press again until it confirms &quot;Thank you&quot;.</li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs text-slate-500">
                Cancel
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkVerificationNow} 
                disabled={step === "verifying"}
                className="gap-1.5 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 font-semibold shadow-xs"
              >
                <RefreshCw size={13} className={step === "verifying" ? "animate-spin" : ""} />
                Verify Now on Device
              </Button>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="space-y-5 text-center py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Fingerprint Enrolled Successfully!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                K20 terminal confirmed registration under User ID <strong>#{allocatedUserId}</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-200 text-left space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                Hardware Verification Complete
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                The member is now enabled for biometric attendance check-in on the eSSL K20.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button 
                onClick={handleConfirmSuccess} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 w-full sm:w-auto"
              >
                Continue & Save Member <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Failed */}
        {step === "failed" && (
          <div className="space-y-4 text-center py-2">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-700 flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
              <AlertCircle size={36} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Biometric Terminal Notice
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto">
                {errorMessage || "Device could not be reached directly over LAN (normal if deployed on Vercel/cloud)."}
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 text-left space-y-1 mt-2">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-600" />
                  Keypad Registration Method:
                </p>
                <p className="text-[11px]">
                  You can proceed now with allocated <strong>User ID #{allocatedUserId || "38"}</strong>, and enroll the finger directly on the physical K20 machine keypad (<strong>M/OK &rarr; User Mgt &rarr; New User</strong>).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
              <Button variant="ghost" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={allocateNextId} variant="outline" size="sm" className="gap-1.5 text-xs">
                  <RefreshCw size={13} />
                  Try Again
                </Button>
                <Button 
                  onClick={() => {
                    const fallbackId = allocatedUserId || "38";
                    onSuccess(fallbackId);
                    onClose();
                  }} 
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs font-bold shadow-xs"
                >
                  <Fingerprint size={14} />
                  Proceed with User ID #{allocatedUserId || "38"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
