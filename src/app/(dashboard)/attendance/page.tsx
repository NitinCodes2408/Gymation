"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/context/AppContext";
import { useAuth } from "@/lib/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Search, Fingerprint, Calendar as CalendarIcon, UserCheck, UserX, Clock, Users, ChevronLeft, ChevronRight, Download, RefreshCw, CheckCircle2, ShieldCheck, Sparkles, AlertCircle, Check, Radio, Zap } from "lucide-react";
import { toast } from "sonner";
import { subscribeToBiometricSyncState, type BiometricDeviceSyncState } from "@/lib/firebase/gymService";

export default function AttendancePage() {
  const { user } = useAuth();
  const { members, attendance, markAttendance, markBiometricAttendance, recordBulkBiometricAttendance, recordBiometricAttendance, activeGymId } = useApp();
  const [activeTab, setActiveTab] = useState<"daily" | "calendar">("daily");

  // Biometric device & sync state
  const [deviceStatus, setDeviceStatus] = useState<{ status: "ONLINE" | "OFFLINE" | "CHECKING"; ip: string; port: number }>({
    status: "ONLINE",
    ip: "192.168.1.200",
    port: 4370,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [syncState, setSyncState] = useState<BiometricDeviceSyncState | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  // Ticking timer for real-time last-sync freshness (updates every 5s)
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  // Real-time listener for biometric persistent sync state
  useEffect(() => {
    const gymId = activeGymId || "gym_default";
    const deviceId = `K20-${deviceStatus.ip}:${deviceStatus.port}`;
    const unsubscribe = subscribeToBiometricSyncState(gymId, deviceId, (state) => {
      setSyncState(state);
    });
    return () => {
      unsubscribe();
    };
  }, [activeGymId, deviceStatus.ip, deviceStatus.port]);

  const lastSyncDate = syncState?.lastSyncAt ? new Date(syncState.lastSyncAt) : null;
  const isRecentSync = Boolean(
    lastSyncDate && !isNaN(lastSyncDate.getTime()) && (nowMs - lastSyncDate.getTime() < 45000)
  );
  const autoSyncStatus = isSyncing ? "Syncing" : isRecentSync ? "ON" : "OFF";
  const formattedLastSync = lastSyncDate && !isNaN(lastSyncDate.getTime())
    ? (nowMs - lastSyncDate.getTime() < 10000
        ? "Just now"
        : lastSyncDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }))
    : "Never";

  const handleExportAttendance = () => {
    if (attendance.length === 0) {
      toast.error("No attendance data to export");
      return;
    }
    const headers = "ID,Member ID,Member Name,Date,Status,Check-in Time\n";
    const rows = attendance.map(a => `"${a.id}","${a.memberId}","${a.memberName}","${a.date}","${a.status}","${a.checkInTime || 'N/A'}"`).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `Gym_Attendance_${new Date().toISOString().split("T")[0]}.csv`);
    a.click();
    toast.success("Attendance report downloaded successfully!");
  };
  
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInMemberId, setCheckInMemberId] = useState("");
  const [checkInStatus, setCheckInStatus] = useState<"Present" | "Absent">("Present");

  // Biometric punch modal states
  const [isBiometricPunchOpen, setIsBiometricPunchOpen] = useState(false);
  const [biometricPunchMemberId, setBiometricPunchMemberId] = useState("");
  const [biometricPunchBioIdInput, setBiometricPunchBioIdInput] = useState("");
  const [biometricPunchDate, setBiometricPunchDate] = useState(new Date().toISOString().split("T")[0]);
  const [biometricPunchTime, setBiometricPunchTime] = useState("");
  const [biometricPunchMode, setBiometricPunchMode] = useState<"member" | "bioId">("member");
  const [isPunchingAnim, setIsPunchingAnim] = useState(false);

  // Calendar specific state
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [eventFilter, setEventFilter] = useState<"all" | "birthdays" | "renewals">("all");
  const [selectedDayModal, setSelectedDayModal] = useState<{ day: number; dateStr: string; events: any[] } | null>(null);

  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent">("all");
  const [isLiveListening, setIsLiveListening] = useState<boolean>(true);

  // Real-time live polling from eSSL K20 (every 12 seconds)
  useEffect(() => {
    if (!isLiveListening || activeTab !== "daily") return;

    const interval = setInterval(async () => {
      try {
        const payload = {
          ownerId: user?.id || "owner_default",
          gymId: activeGymId || "gym_default",
          maxRecords: 100,
          members: members.map((m) => ({
            id: m.id,
            name: m.name,
            biometricUserId: m.biometricUserId,
            status: m.status,
          })),
        };

        const res = await fetch("/api/biometric/sync-live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success && data.recordsWritten > 0) {
          if (Array.isArray(data.attendanceRecords) && data.attendanceRecords.length > 0) {
            recordBulkBiometricAttendance(data.attendanceRecords);
            toast.success(`⚡ Live Fingerprint scan detected! ${data.recordsWritten} attendance record(s) loaded.`);
          } else if (data.attendanceRecord) {
            recordBiometricAttendance(data.attendanceRecord);
            toast.success(`⚡ Fingerprint check-in: ${data.attendanceRecord.memberName} marked Present!`);
          }
        }
      } catch {
        // Silent background catch
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [isLiveListening, activeTab, user?.id, activeGymId, members, recordBulkBiometricAttendance, recordBiometricAttendance]);

  // Attendance lookup for selected date
  const attendanceMap = new Map<string, (typeof attendance)[0]>();
  attendance
    .filter((a) => a.date === selectedDate)
    .forEach((a) => {
      attendanceMap.set(a.memberId, a);
    });

  // Build unified roll call for all active members (plus any member with a scan on this date)
  const dailyRoster = members
    .filter((m) => m.status === "Active" || attendanceMap.has(m.id))
    .map((member) => {
      const attRecord = attendanceMap.get(member.id);
      const isPresent = attRecord?.status === "Present";
      return {
        member,
        status: isPresent ? ("Present" as const) : ("Absent" as const),
        checkInTime: isPresent ? attRecord?.checkInTime : undefined,
        source: attRecord?.source || (isPresent && (attRecord?.biometricUserId || member.biometricUserId) ? "biometric" : undefined),
        verificationType: attRecord?.verificationType || (attRecord?.source === "biometric" ? "Fingerprint" : undefined),
        biometricUserId: member.biometricUserId || attRecord?.biometricUserId,
        attendanceId: attRecord?.id,
      };
    })
    .sort((a, b) => {
      // Present members first, then Absent members alphabetically
      if (a.status === "Present" && b.status !== "Present") return -1;
      if (a.status !== "Present" && b.status === "Present") return 1;
      return a.member.name.localeCompare(b.member.name);
    });

  const presentCount = dailyRoster.filter((r) => r.status === "Present").length;
  const absentCount = dailyRoster.filter((r) => r.status === "Absent").length;
  const totalExpected = dailyRoster.length;
  const attendanceRate = totalExpected > 0 ? Math.round((presentCount / totalExpected) * 100) : 0;

  const searchedRoster = dailyRoster.filter((item) => {
    // 1. Status Filter Tab
    if (statusFilter === "present" && item.status !== "Present") return false;
    if (statusFilter === "absent" && item.status !== "Absent") return false;

    // 2. Search query matching
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const nameMatch = item.member.name.toLowerCase().includes(q);
    const idMatch = item.member.id.toLowerCase().includes(q);
    const bioIdMatch = item.biometricUserId ? String(item.biometricUserId).toLowerCase().includes(q) : false;
    const mobileMatch = item.member.mobile ? item.member.mobile.includes(q) : false;
    return nameMatch || idMatch || bioIdMatch || mobileMatch;
  });

  const handleQuickBiometricPunch = (memberId: string) => {
    const mem = members.find((m) => m.id === memberId);
    if (!mem) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    markBiometricAttendance(memberId, selectedDate, timeStr);
  };

  const handleQuickToggleAttendance = (memberId: string, currentStatus: "Present" | "Absent") => {
    const nextStatus = currentStatus === "Present" ? "Absent" : "Present";
    markAttendance(memberId, nextStatus, selectedDate);
  };

  const handleManualCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInMemberId) return;
    markAttendance(checkInMemberId, checkInStatus, selectedDate);
    setIsCheckInOpen(false);
    setCheckInMemberId("");
    setCheckInStatus("Present");
  };

  const openBiometricPunchModal = () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setBiometricPunchTime(timeStr);
    setBiometricPunchDate(selectedDate || new Date().toISOString().split("T")[0]);
    setIsBiometricPunchOpen(true);
  };

  const handleBiometricPunch = (e: React.FormEvent) => {
    e.preventDefault();
    let targetMember: (typeof members)[0] | undefined;

    if (biometricPunchMode === "bioId") {
      const cleanId = biometricPunchBioIdInput.trim();
      if (!cleanId) {
        toast.error("Please enter a Biometric Hardware User ID (e.g. 19, 34, 35)");
        return;
      }
      targetMember = members.find((m) => m.biometricUserId === cleanId);
      if (!targetMember) {
        toast.error(`No registered member mapped to Fingerprint User ID #${cleanId}. Please check member profile.`);
        return;
      }
    } else {
      if (!biometricPunchMemberId) {
        toast.error("Please select a gym member to punch attendance.");
        return;
      }
      targetMember = members.find((m) => m.id === biometricPunchMemberId);
    }

    if (!targetMember) return;

    setIsPunchingAnim(true);
    setTimeout(() => {
      markBiometricAttendance(targetMember.id, biometricPunchDate, biometricPunchTime);
      setIsPunchingAnim(false);
      setIsBiometricPunchOpen(false);
      setBiometricPunchMemberId("");
      setBiometricPunchBioIdInput("");
    }, 350);
  };

  const checkDeviceDiagnostics = async () => {
    setDiagLoading(true);
    try {
      const res = await fetch("/api/biometric/diagnostics");
      const data = await res.json();
      if (data.status === "ONLINE") {
        setDeviceStatus({
          status: "ONLINE",
          ip: data.device?.deviceIp || "192.168.1.200",
          port: data.device?.devicePort || 4370,
        });
        toast.success("eSSL / Identix K20 is ONLINE (TCP 4370 reachable)");
      } else {
        setDeviceStatus({
          status: "OFFLINE",
          ip: data.device?.deviceIp || "192.168.1.200",
          port: data.device?.devicePort || 4370,
        });
        toast.warning("Biometric device unreachable on TCP 4370");
      }
    } catch {
      setDeviceStatus({ status: "OFFLINE", ip: "192.168.1.200", port: 4370 });
      toast.error("Failed running biometric diagnostics");
    } finally {
      setDiagLoading(false);
    }
  };

  const handleSyncBiometric = async () => {
    setIsSyncing(true);
    try {
      const payload = {
        ownerId: user?.id || "owner_default",
        gymId: activeGymId || "gym_default",
        maxRecords: 100, // Load all daily biometric scans
        members: members.map((m) => ({
          id: m.id,
          name: m.name,
          biometricUserId: m.biometricUserId,
          status: m.status,
        })),
      };

      const res = await fetch("/api/biometric/sync-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Biometric sync failed");
        return;
      }

      if (data.recordsWritten > 0) {
        if (Array.isArray(data.attendanceRecords) && data.attendanceRecords.length > 0) {
          recordBulkBiometricAttendance(data.attendanceRecords);
          toast.success(`Loaded ${data.recordsWritten} daily biometric attendance records from K20!`);
        } else if (data.attendanceRecord) {
          recordBiometricAttendance(data.attendanceRecord);
          toast.success(`Loaded biometric attendance record for ${data.attendanceRecord.memberName}!`);
        }
      } else {
        toast.info(data.message || "All biometric logs up to date (0 duplicates written).");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      toast.error(`Sync error: ${msg}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Calendar calculations
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Generate calendar days
  const calendarDays = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null); // padding for empty days
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // Get events on a specific date (Year-Month-Day)
  const getEventsOnDate = (day: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

    const dayEvents: Array<{ type: string; label: string; member?: any; color: string }> = [];

    // 1. Membership Renewals
    const renewals = members.filter(m => m.expiryDate === dateStr);
    renewals.forEach(m => dayEvents.push({ 
      type: "Renewal", 
      label: `🔄 Renew: ${m.name}`, 
      member: m,
      color: "bg-amber-100 text-amber-900 border border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800" 
    }));

    // 2. Birthdays
    const bdays = members.filter(m => {
      if (!m.dob) return false;
      const parts = m.dob.split("-");
      return parts.length === 3 && parts[1] === formattedMonth && parts[2] === formattedDay;
    });
    bdays.forEach(m => dayEvents.push({ 
      type: "Birthday", 
      label: `🎂 Birthday: ${m.name}`, 
      member: m,
      color: "bg-pink-100 text-pink-900 border border-pink-200 dark:bg-pink-950/70 dark:text-pink-300 dark:border-pink-800" 
    }));

    // 3. Gym Holidays (Static Mock)
    if (day === 25 && currentMonth === 11) {
      dayEvents.push({ type: "Holiday", label: "🎄 Christmas Closed", color: "bg-red-100 text-red-900 border border-red-200 dark:bg-red-950/70 dark:text-red-300" });
    }
    if (day === 1 && currentMonth === 0) {
      dayEvents.push({ type: "Holiday", label: "🎆 New Year Closed", color: "bg-red-100 text-red-900 border border-red-200 dark:bg-red-950/70 dark:text-red-300" });
    }

    // 4. Maintenance (Mock)
    if (day === 15) {
      dayEvents.push({ type: "Maintenance", label: "⚙️ Equipment Service", color: "bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-300" });
    }

    // 5. PT Sessions (Mock for members with trainers)
    if (day % 3 === 0 && day <= 28) {
      const ptMembers = members.filter(m => m.trainerId !== "");
      if (ptMembers.length > 0) {
        dayEvents.push({ type: "PT Session", label: `🏋️ PT Sessions (${ptMembers.length})`, color: "bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-950/70 dark:text-blue-300" });
      }
    }

    if (eventFilter === "birthdays") {
      return dayEvents.filter(e => e.type === "Birthday");
    }
    if (eventFilter === "renewals") {
      return dayEvents.filter(e => e.type === "Renewal");
    }

    return dayEvents;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Attendance & Events Portal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track check-ins and look up calendar events.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setIsLiveListening(!isLiveListening);
              toast.info(isLiveListening ? "Auto-sync live listener paused" : "Auto-sync live listener activated (polling every 12s)");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-xs ${
              isLiveListening 
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" 
                : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
            }`}
            title="Auto-detect new fingerprint scans from eSSL K20 terminal in real time"
          >
            <Radio size={13} className={isLiveListening ? "animate-pulse text-emerald-600 dark:text-emerald-400" : ""} />
            <span>Live Scanner: {isLiveListening ? "Active (12s)" : "Paused"}</span>
          </button>
          <Button 
            onClick={openBiometricPunchModal} 
            className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs"
          >
            <Fingerprint size={14} /> Biometric Punch
          </Button>
          <Button 
            onClick={handleSyncBiometric} 
            disabled={isSyncing} 
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} /> 
            {isSyncing ? "Loading Device Logs..." : "Load K20 Scans"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportAttendance} className="gap-2 border-slate-200 dark:border-slate-800 dark:text-slate-300">
            <Download size={14} /> Export CSV
          </Button>
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 shadow-sm">
            <button 
              onClick={() => setActiveTab("daily")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === "daily" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
            >
              Daily Roll Call
            </button>
            <button 
              onClick={() => setActiveTab("calendar")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${activeTab === "calendar" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
            >
              Monthly Calendar
            </button>
          </div>
        </div>
      </div>

      {activeTab === "daily" ? (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Expected</p>
                  <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{totalExpected}</h4>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50/50 dark:bg-green-950/10 border border-green-100 dark:border-green-900/50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 rounded-xl">
                  <UserCheck size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Present Today</p>
                  <h4 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{presentCount}</h4>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
                  <UserX size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Absent Today</p>
                  <h4 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">{absentCount}</h4>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Attendance Rate</p>
                  <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{attendanceRate}%</h4>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
              {/* Filter Tabs Header */}
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/60">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      statusFilter === "all"
                        ? "bg-blue-600 text-white shadow-xs font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                    }`}
                  >
                    All Members ({totalExpected})
                  </button>
                  <button
                    onClick={() => setStatusFilter("present")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      statusFilter === "present"
                        ? "bg-emerald-600 text-white shadow-xs font-bold"
                        : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Present ({presentCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter("absent")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      statusFilter === "absent"
                        ? "bg-rose-600 text-white shadow-xs font-bold"
                        : "text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Absent ({absentCount})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs shadow-xs"
                  />
                  <Button 
                    onClick={() => setIsCheckInOpen(true)} 
                    variant="outline"
                    size="sm"
                    className="text-xs whitespace-nowrap border-slate-200 dark:border-slate-800 dark:text-slate-300"
                  >
                    Manual Roll
                  </Button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={15} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50/50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm shadow-xs"
                    placeholder="Search by Name, Member ID, or Fingerprint User ID (#19, #34)..."
                  />
                </div>
              </div>
              
              {/* Daily Roll Call Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-xs">
                      <TableHead>Member & Fingerprint</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Check-in Time</TableHead>
                      <TableHead>Attendance Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Quick Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchedRoster.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-400 dark:text-slate-500 py-10 space-y-1">
                          <Users size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                          <p className="font-semibold text-sm">No members match your filter</p>
                          <p className="text-xs">Try selecting &quot;All Members&quot; or clearing your search query.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      searchedRoster.map((item) => (
                        <TableRow key={item.member.id} className="dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          {/* Member Info */}
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                item.status === "Present" 
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" 
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              }`}>
                                {item.member.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
                                  {item.member.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {item.biometricUserId ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800">
                                      <Fingerprint size={10} /> FP #{item.biometricUserId}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400">No FP ID</span>
                                  )}
                                  <span className="text-[11px] text-slate-400 font-mono">• {item.member.mobile}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Member ID */}
                          <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400 font-medium">
                            {item.member.id}
                          </TableCell>

                          {/* Check-in Time */}
                          <TableCell>
                            {item.status === "Present" ? (
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                <Clock size={13} className="text-emerald-500" />
                                {item.checkInTime || "Recorded"}
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">
                                -- Not Scanned --
                              </span>
                            )}
                          </TableCell>

                          {/* Source / Method */}
                          <TableCell>
                            {item.status === "Present" ? (
                              item.source === "biometric" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
                                  <Fingerprint size={12} className="text-purple-600 dark:text-purple-400" /> Biometric FP
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                                  Manual Roll
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
                                No Scan / Absent
                              </span>
                            )}
                          </TableCell>

                          {/* Status Badge */}
                          <TableCell>
                            {item.status === "Present" ? (
                              <Badge variant="success" className="gap-1 font-semibold text-xs py-0.5 px-2.5">
                                <Check size={12} /> Present
                              </Badge>
                            ) : (
                              <Badge variant="danger" className="gap-1 font-semibold text-xs py-0.5 px-2.5">
                                <UserX size={12} /> Absent
                              </Badge>
                            )}
                          </TableCell>

                          {/* Quick Actions */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.status === "Absent" ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleQuickBiometricPunch(item.member.id)}
                                    className="h-7 text-xs px-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1 shadow-xs"
                                    title="Record biometric fingerprint punch for this member"
                                  >
                                    <Fingerprint size={12} /> Punch FP
                                  </Button>
                                  <button
                                    onClick={() => handleQuickToggleAttendance(item.member.id, "Absent")}
                                    className="h-7 text-[11px] px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Mark Present manually"
                                  >
                                    Present
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleQuickToggleAttendance(item.member.id, "Present")}
                                  className="h-7 text-[11px] px-2 rounded-lg border border-rose-200 text-rose-600 dark:border-rose-900 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                  title="Mark Absent"
                                >
                                  Mark Absent
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Biometric Status Widgets */}
            <Card className="h-fit dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="bg-slate-900 dark:bg-slate-950 text-white rounded-t-2xl">
                <CardTitle className="text-white flex items-center justify-between text-md">
                  <div className="flex items-center gap-2">
                    <Fingerprint size={20} className="text-blue-400" />
                    Biometric Terminal
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    deviceStatus.status === "ONLINE" 
                      ? "bg-green-500/20 text-green-300 border border-green-500/30" 
                      : "bg-red-500/20 text-red-300 border border-red-500/30"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${deviceStatus.status === "ONLINE" ? "bg-green-400 animate-pulse" : "bg-red-400"}`}></span>
                    {deviceStatus.status}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Device Model</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">eSSL / Identix K20</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Network Endpoint</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{deviceStatus.ip}:{deviceStatus.port}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Sync State Source</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">Firestore Persistent</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Automatic Sync</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <span className={`w-2 h-2 rounded-full ${
                        autoSyncStatus === "ON" 
                          ? "bg-emerald-500 animate-pulse" 
                          : autoSyncStatus === "Syncing" 
                          ? "bg-amber-500 animate-spin" 
                          : "bg-rose-500"
                      }`} />
                      <span className={
                        autoSyncStatus === "ON" 
                          ? "text-emerald-600 dark:text-emerald-400" 
                          : autoSyncStatus === "Syncing" 
                          ? "text-amber-600 dark:text-amber-400" 
                          : "text-rose-600 dark:text-rose-400"
                      }>
                        {autoSyncStatus}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Last Sync</span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                      {formattedLastSync}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <Button 
                    onClick={openBiometricPunchModal} 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs gap-2 py-2.5 shadow-sm font-semibold"
                  >
                    <Fingerprint size={15} />
                    Biometric Fingerprint Punch
                  </Button>

                  <Button 
                    onClick={handleSyncBiometric} 
                    disabled={isSyncing}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs gap-2 py-2.5 shadow-sm font-semibold"
                  >
                    <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? "Loading Device Attendance..." : "Load K20 Daily Attendance"}
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={checkDeviceDiagnostics} 
                    disabled={diagLoading}
                    className="w-full text-xs dark:border-slate-800 dark:text-slate-300 gap-2"
                  >
                    <CheckCircle2 size={14} className={diagLoading ? "animate-spin" : "text-slate-400"} />
                    {diagLoading ? "Checking Reachability..." : "Check Device Connectivity"}
                  </Button>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                  Watermark baseline active: 17,356 historical logs safely excluded.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* Monthly Calendar View */
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="dark:text-slate-100 flex items-center gap-2">
                <CalendarIcon size={20} className="text-blue-500" />
                Event Calendar: {monthNames[currentMonth]} {currentYear}
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Click any day to view detailed birthdays & renewal events.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Event category filter tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setEventFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${eventFilter === "all" ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm font-bold" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}
                >
                  All Events
                </button>
                <button
                  onClick={() => setEventFilter("birthdays")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${eventFilter === "birthdays" ? "bg-pink-500 text-white shadow-sm font-bold" : "text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40"}`}
                >
                  🎂 Birthdays
                </button>
                <button
                  onClick={() => setEventFilter("renewals")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${eventFilter === "renewals" ? "bg-amber-500 text-white shadow-sm font-bold" : "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"}`}
                >
                  🔄 Renewals
                </button>
              </div>

              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={handlePrevMonth} className="p-2 border-slate-200 dark:border-slate-800">
                  <ChevronLeft size={16} />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextMonth} className="p-2 border-slate-200 dark:border-slate-800">
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>
            
            <div className="grid grid-cols-7 gap-1 sm:gap-2 auto-rows-[100px] sm:auto-rows-[120px]">
              {calendarDays.map((day, idx) => {
                const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
                const events = day ? getEventsOnDate(day) : [];
                const formattedMonth = String(currentMonth + 1).padStart(2, '0');
                const formattedDay = day ? String(day).padStart(2, '0') : '';
                const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

                return (
                  <div 
                    key={idx} 
                    onClick={() => {
                      if (day && events.length > 0) {
                        setSelectedDayModal({ day, dateStr, events });
                      }
                    }}
                    className={`border border-slate-100 dark:border-slate-800 rounded-2xl p-1.5 flex flex-col justify-between transition-all ${day ? 'bg-white dark:bg-slate-900 hover:shadow-md cursor-pointer hover:border-blue-300 dark:hover:border-blue-800' : 'bg-slate-50/20 dark:bg-slate-900/5'} ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    {day ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className={`text-xs font-bold ${isToday ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center' : 'text-slate-800 dark:text-slate-200'}`}>
                            {day}
                          </span>
                          {events.length > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {events.length}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 overflow-y-auto mt-1 space-y-1 scrollbar-none max-h-[80px]">
                          {events.map((ev, evIdx) => (
                            <div 
                              key={evIdx} 
                              className={`text-[8px] sm:text-[10px] font-semibold truncate rounded px-1.5 py-0.5 shadow-xs ${ev.color}`}
                              title={ev.label}
                            >
                              {ev.label}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Check-in Modal */}
      <Modal isOpen={isCheckInOpen} onClose={() => setIsCheckInOpen(false)} title="Record Attendance Entry">
        <form onSubmit={handleManualCheckIn} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Gym Member *</label>
            <select 
              required 
              value={checkInMemberId} 
              onChange={(e) => setCheckInMemberId(e.target.value)} 
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
            >
              <option value="">Select Member</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
            <select 
              value={checkInStatus} 
              onChange={(e) => setCheckInStatus(e.target.value as "Present" | "Absent")} 
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
            >
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCheckInOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Record Check-in</Button>
          </div>
        </form>
      </Modal>

      {/* Biometric Fingerprint Attendance Modal */}
      <Modal 
        isOpen={isBiometricPunchOpen} 
        onClose={() => setIsBiometricPunchOpen(false)} 
        title="Biometric Fingerprint Attendance"
      >
        <form onSubmit={handleBiometricPunch} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Record biometric fingerprint check-in for an existing gym member. The punch will instantly update the roll call.
          </p>

          {/* Mode Switch Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBiometricPunchMode("member")}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                biometricPunchMode === "member"
                  ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Users size={13} />
              Select Existing Member
            </button>
            <button
              type="button"
              onClick={() => setBiometricPunchMode("bioId")}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                biometricPunchMode === "bioId"
                  ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Fingerprint size={13} />
              Punch by Fingerprint ID (#)
            </button>
          </div>

          {biometricPunchMode === "member" ? (
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Gym Member *
                </label>
                <select 
                  required 
                  value={biometricPunchMemberId} 
                  onChange={(e) => setBiometricPunchMemberId(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Select Member --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.id}) {m.biometricUserId ? `• FP #${m.biometricUserId}` : "• (No FP ID)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Member Preview Card */}
              {(() => {
                const sel = members.find(m => m.id === biometricPunchMemberId);
                if (!sel) return null;
                return (
                  <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                        {sel.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">{sel.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {sel.mobile} • Status: {sel.status}
                        </p>
                      </div>
                    </div>
                    {sel.biometricUserId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                        <Fingerprint size={12} /> FP #{sel.biometricUserId}
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                        Fingerprint Punch
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Hardware Fingerprint User ID (#) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-sm">
                    #
                  </span>
                  <input
                    type="number"
                    placeholder="Enter ID (e.g. 19, 34, 35)"
                    value={biometricPunchBioIdInput}
                    onChange={(e) => setBiometricPunchBioIdInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-mono outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Matched Member Card Preview */}
              {(() => {
                const cleanId = biometricPunchBioIdInput.trim();
                if (!cleanId) return null;
                const matched = members.find(m => m.biometricUserId === cleanId);
                if (matched) {
                  return (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          Matched: {matched.name}
                        </p>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                          Member ID: {matched.id} • Mobile: {matched.mobile}
                        </p>
                      </div>
                      <Badge variant="success">FP User #{cleanId}</Badge>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>No gym member is mapped to Fingerprint User #{cleanId}.</span>
                    </div>
                  );
                }
              })()}
            </div>
          )}

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Date</label>
              <input
                type="date"
                value={biometricPunchDate}
                onChange={(e) => setBiometricPunchDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Check-in Time</label>
              <input
                type="text"
                value={biometricPunchTime}
                onChange={(e) => setBiometricPunchTime(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs outline-none"
              />
            </div>
          </div>

          {/* Big Action Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isPunchingAnim}
              className={`w-full py-2.5 text-xs font-bold rounded-xl text-white shadow-sm flex items-center justify-center gap-2 ${
                isPunchingAnim 
                  ? "bg-purple-800" 
                  : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              <Fingerprint size={16} className={isPunchingAnim ? "animate-pulse" : ""} />
              {isPunchingAnim ? "Recording Fingerprint..." : "Record Fingerprint Attendance"}
            </Button>
          </div>

          {/* Shortcut to Sync from Device */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500">Have hardware logs to import?</span>
            <button
              type="button"
              disabled={isSyncing}
              onClick={() => {
                setIsBiometricPunchOpen(false);
                handleSyncBiometric();
              }}
              className="text-blue-600 dark:text-blue-400 font-semibold text-xs hover:underline flex items-center gap-1"
            >
              <RefreshCw size={11} className={isSyncing ? "animate-spin" : ""} />
              Load All from K20
            </button>
          </div>

          <div className="flex justify-end pt-1">
            <Button type="button" variant="ghost" onClick={() => setIsBiometricPunchOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Selected Day Events Modal */}
      <Modal 
        isOpen={selectedDayModal !== null} 
        onClose={() => setSelectedDayModal(null)} 
        title={`Calendar Events - ${selectedDayModal?.dateStr}`}
      >
        {selectedDayModal && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">Events scheduled for {monthNames[currentMonth]} {selectedDayModal.day}, {currentYear}:</p>
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {selectedDayModal.events.map((ev, idx) => (
                <div key={idx} className={`p-3 rounded-xl flex items-center justify-between ${ev.color}`}>
                  <div>
                    <p className="font-bold text-sm">{ev.label}</p>
                    {ev.member && (
                      <p className="text-xs opacity-80 mt-0.5">
                        Mobile: {ev.member.mobile} {ev.member.dob ? `| DOB: ${ev.member.dob}` : ""}
                      </p>
                    )}
                  </div>
                  {ev.type === "Birthday" && (
                    <Button 
                      size="sm" 
                      className="bg-pink-600 hover:bg-pink-700 text-white text-xs gap-1"
                      onClick={() => {
                        toast.success(`🎉 Birthday wishes sent to ${ev.member?.name || 'Member'}!`);
                        setSelectedDayModal(null);
                      }}
                    >
                      🎉 Send Wish
                    </Button>
                  )}
                  {ev.type === "Renewal" && (
                    <Button 
                      size="sm" 
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1"
                      onClick={() => {
                        toast.info(`Renewal reminder triggered for ${ev.member?.name || 'Member'}`);
                        setSelectedDayModal(null);
                      }}
                    >
                      🔄 Send Reminder
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setSelectedDayModal(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
