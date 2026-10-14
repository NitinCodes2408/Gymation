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
  Cpu, 
  UserCheck, 
  Clock, 
  Sparkles,
  ShieldCheck,
  UserX,
  Volume2
} from "lucide-react";
import { toast } from "sonner";
import type { Member } from "@/lib/context/AppContext";

interface BiometricScanAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMember: Member | null;
  allMembers: Member[];
  onSuccess: (member: Member, timeStr: string) => void;
  onOpenEnrollModal?: (member: Member) => void;
  onManualPresent?: (memberId: string) => void;
}

type ScanStatus = "idle" | "listening" | "success" | "mismatch" | "error";

export function BiometricScanAttendanceModal({
  isOpen,
  onClose,
  targetMember,
  allMembers,
  onSuccess,
  onOpenEnrollModal,
  onManualPresent,
}: BiometricScanAttendanceModalProps) {
  const [selectedMember, setSelectedMember] = useState<Member | null>(targetMember);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [scannedUserId, setScannedUserId] = useState<string>("");
  const [verifiedTime, setVerifiedTime] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const isListeningRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync targetMember when changed
  useEffect(() => {
    setSelectedMember(targetMember);
  }, [targetMember]);

  // When modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setScannedUserId("");
      setVerifiedTime("");

      // If a member is selected and has no FP ID
      if (selectedMember && !selectedMember.biometricUserId) {
        setStatus("idle");
      } else {
        startListeningForScan();
      }
    } else {
      stopListening();
    }

    return () => {
      stopListening();
    };
  }, [isOpen, selectedMember?.id]);

  const stopListening = () => {
    isListeningRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const startListeningForScan = async () => {
    stopListening();
    isListeningRef.current = true;
    setStatus("listening");
    setErrorMessage("");

    const targetBioId = selectedMember?.biometricUserId || undefined;

    // Listen loop while modal is open
    listenCycle(targetBioId);
  };

  const listenCycle = async (targetBioId?: string) => {
    if (!isListeningRef.current) return;

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/biometric/scan-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetBiometricUserId: targetBioId,
          timeoutMs: 12000,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await res.json();

      if (!isListeningRef.current) return;

      if (!data.success) {
        setErrorMessage(data.error || "K20 scanner communication error.");
        setStatus("error");
        return;
      }

      if (data.scanned && data.scannedBiometricUserId) {
        const scannedId = String(data.scannedBiometricUserId).trim();
        setScannedUserId(scannedId);

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setVerifiedTime(timeStr);

        // Find which member has this scanned biometric ID
        const matchedMem = allMembers.find((m) => String(m.biometricUserId).trim() === scannedId);

        if (targetBioId) {
          if (scannedId === String(targetBioId).trim()) {
            // Perfect match for targeted member!
            setStatus("success");
            const finalMember = selectedMember || matchedMem;
            if (finalMember) {
              onSuccess(finalMember, timeStr);
              toast.success(`⚡ Fingerprint Verified! ${finalMember.name} marked Present.`);
            }
          } else {
            // Someone else touched the scanner
            setStatus("mismatch");
          }
        } else {
          // Kiosk mode: whichever member scanned
          if (matchedMem) {
            setSelectedMember(matchedMem);
            setStatus("success");
            onSuccess(matchedMem, timeStr);
            toast.success(`⚡ Fingerprint Verified! ${matchedMem.name} marked Present.`);
          } else {
            setStatus("mismatch");
          }
        }
      } else {
        // Timeout with no finger touch: repeat listening cycle seamlessly
        if (isListeningRef.current) {
          listenCycle(targetBioId);
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      if (isListeningRef.current) {
        // Retry next cycle on momentary glitch
        setTimeout(() => {
          if (isListeningRef.current) listenCycle(targetBioId);
        }, 1500);
      }
    }
  };

  const handleManualConfirmHardwarePunch = () => {
    if (!selectedMember) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    stopListening();
    setStatus("success");
    setVerifiedTime(timeStr);
    onSuccess(selectedMember, timeStr);
    toast.success(`Biometric check-in recorded for ${selectedMember.name}!`);
  };

  const handleConfirmMismatchMember = () => {
    const matchedMem = allMembers.find((m) => String(m.biometricUserId).trim() === scannedUserId);
    if (matchedMem) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      stopListening();
      setStatus("success");
      setVerifiedTime(timeStr);
      onSuccess(matchedMem, timeStr);
      toast.success(`Attendance marked Present for ${matchedMem.name} (FP #${scannedUserId})!`);
    }
  };

  const handleClose = () => {
    stopListening();
    onClose();
  };

  const mismatchMember = scannedUserId
    ? allMembers.find((m) => String(m.biometricUserId).trim() === scannedUserId)
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Biometric Fingerprint Attendance Scan"
      description="Member must place their finger on the physical eSSL / Identix K20 scanner."
      className="max-w-lg"
    >
      <div className="space-y-6 pt-1">
        {/* Hardware Status Header */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">eSSL / Identix K20</span>
              <span className="text-slate-500 font-mono ml-2">(192.168.1.200:4370)</span>
            </div>
          </div>
          <Badge variant={status === "listening" ? "info" : status === "success" ? "success" : "default"} className="gap-1">
            {status === "listening" ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                Scanner Armed
              </>
            ) : status === "success" ? (
              "Verified"
            ) : (
              "Port 4370 TCP"
            )}
          </Badge>
        </div>

        {/* Member Info Card (if specific member selected) */}
        {selectedMember && (
          <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200/80 dark:border-purple-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                {selectedMember.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  {selectedMember.name}
                </h4>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                  <span>{selectedMember.id}</span>
                  <span>•</span>
                  {selectedMember.biometricUserId ? (
                    <span className="text-purple-700 dark:text-purple-300 font-bold flex items-center gap-1">
                      <Fingerprint size={12} />
                      FP ID #{selectedMember.biometricUserId}
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      No FP ID Assigned
                    </span>
                  )}
                </div>
              </div>
            </div>

            {selectedMember.biometricUserId && (
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                  Enrolled ID
                </span>
                <span className="text-xl font-extrabold font-mono text-purple-900 dark:text-purple-200">
                  #{selectedMember.biometricUserId}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Case 1: Member has NO fingerprint enrolled yet */}
        {selectedMember && !selectedMember.biometricUserId && (
          <div className="p-5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center mx-auto text-amber-700 dark:text-amber-300">
              <AlertCircle size={30} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Fingerprint Not Yet Enrolled on K20
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 max-w-sm mx-auto">
                <strong>{selectedMember.name}</strong> does not have a physical fingerprint registered on the eSSL K20 machine.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="text-xs"
              >
                Cancel
              </Button>
              {onOpenEnrollModal && (
                <Button
                  size="sm"
                  onClick={() => {
                    handleClose();
                    onOpenEnrollModal(selectedMember);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs font-bold shadow-xs"
                >
                  <Fingerprint size={14} />
                  Enroll Fingerprint on K20
                </Button>
              )}
              {onManualPresent && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    handleClose();
                    onManualPresent(selectedMember.id);
                  }}
                  className="text-xs border-slate-300 text-slate-700 dark:text-slate-300"
                >
                  Mark Manual Roll
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Case 2: Listening for Scan */}
        {status === "listening" && (
          <div className="py-6 text-center space-y-5">
            {/* Animated Laser Scanner Graphic */}
            <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-slate-900 border-2 border-purple-500 shadow-xl overflow-hidden group">
              {/* Radar pulse rings */}
              <div className="absolute inset-0 rounded-3xl border border-purple-400/40 animate-ping opacity-75"></div>
              
              {/* Fingerprint Icon */}
              <Fingerprint size={56} className="text-purple-400 transition-all duration-300" />
              
              {/* Sweeping Laser Line */}
              <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.9)] animate-bounce"></div>
              
              <span className="absolute bottom-1 text-[9px] font-mono font-bold uppercase tracking-widest text-cyan-300 bg-slate-950/80 px-2 py-0.5 rounded">
                Touch Glass
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Place Finger on K20 Scanner Pad
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto">
                Ask <strong>{selectedMember?.name || "the member"}</strong> to place their finger flat and firm on the physical optical reader.
              </p>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                <ShieldCheck size={15} className="text-purple-600" />
                <span>Live Verification Instructions:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                <li>Touch registered finger to the <strong>eSSL K20 optical glass</strong>.</li>
                <li>Wait for the device voice prompt: <em>&quot;Thank you&quot;</em>.</li>
                <li>Attendance will instantly register as <strong>Present</strong> with real timestamp.</li>
              </ol>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs text-slate-500">
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleManualConfirmHardwarePunch}
                  className="text-xs border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300"
                  title="If member already pressed scanner and device said Thank You"
                >
                  <UserCheck size={13} className="mr-1 text-emerald-600" />
                  Already Pressed? Confirm Present
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Case 3: SUCCESS */}
        {status === "success" && (
          <div className="py-6 text-center space-y-5">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 animate-in zoom-in-75 duration-300 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 size={46} />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-xs font-bold mb-2">
                <Sparkles size={13} />
                Biometric Fingerprint Verified!
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {selectedMember?.name || "Member"} Marked Present
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-1.5 font-medium">
                <Clock size={13} className="text-emerald-500" />
                Check-in recorded at <strong>{verifiedTime || "Just now"}</strong>
              </p>
            </div>

            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 text-left flex items-center gap-2.5">
              <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Hardware Authenticated</p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Transaction verified from eSSL K20 terminal hardware. Attendance roll has been updated.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full sm:w-auto text-xs px-6"
              >
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Case 4: MISMATCH */}
        {status === "mismatch" && (
          <div className="py-4 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <AlertCircle size={36} />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Different Fingerprint Scanned
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto">
                Detected hardware User ID <strong>#{scannedUserId}</strong>, but expected User ID <strong>#{selectedMember?.biometricUserId}</strong> ({selectedMember?.name}).
              </p>
            </div>

            {mismatchMember && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-xs text-left flex items-center justify-between gap-3">
                <div>
                  <p className="text-purple-700 dark:text-purple-300 font-bold">
                    Detected Member: {mismatchMember.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Matches registered Fingerprint ID #{scannedUserId}.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleConfirmMismatchMember}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shrink-0"
                >
                  Mark {mismatchMember.name} Present
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={startListeningForScan}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs font-bold"
              >
                <RefreshCw size={13} />
                Try Scanning Again
              </Button>
            </div>
          </div>
        )}

        {/* Case 5: ERROR */}
        {status === "error" && (
          <div className="py-4 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-700 flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
              <AlertCircle size={36} />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Scanner Communication Notice
              </h3>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1 max-w-sm mx-auto">
                {errorMessage || "Device could not be reached over local network."}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-left space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Keypad Direct Verification:</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                If the member touched the K20 scanner and the terminal confirmed with an audio beep, you can record their attendance now.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs">
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startListeningForScan}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw size={13} />
                  Retry Scan
                </Button>
                {selectedMember && (
                  <Button
                    size="sm"
                    onClick={handleManualConfirmHardwarePunch}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                  >
                    Confirm Hardware Punch
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
