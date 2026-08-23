"use client";

import { useState, useMemo } from "react";
import { useApp, Member, Payment, Attendance, Trainer, MembershipPlan } from "@/lib/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatIndianNumber } from "@/lib/utils";
import { 
  Search, 
  ArrowLeft, 
  Printer, 
  Download, 
  UserCheck, 
  CalendarCheck, 
  CreditCard, 
  Dumbbell, 
  Activity as ActivityIcon, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Users, 
  AlertCircle,
  FileText,
  Calendar,
  Sparkles,
  Award,
  TrendingUp,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

type ReportTab = "overview" | "payments" | "attendance" | "membership" | "training" | "activity";

export default function MemberReportsPage() {
  const { members, trainers, plans, payments, attendance, activities, settings } = useApp();

  // Search strictly by member name
  const [nameSearch, setNameSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");

  // Real-time suggestions filtering BY NAME ONLY (case-insensitive, partial matching)
  const searchResults = useMemo(() => {
    const query = nameSearch.trim().toLowerCase();
    if (!query) return [];
    return members.filter((m) => m.name.toLowerCase().includes(query));
  }, [nameSearch, members]);

  // Aggregated data for selected member
  const memberPlan = useMemo(() => {
    if (!selectedMember) return null;
    return plans.find((p) => p.id === selectedMember.planId) || null;
  }, [selectedMember, plans]);

  const memberTrainer = useMemo(() => {
    if (!selectedMember) return null;
    return trainers.find((t) => t.id === selectedMember.trainerId) || null;
  }, [selectedMember, trainers]);

  const memberPayments = useMemo(() => {
    if (!selectedMember) return [];
    return payments
      .filter((p) => p.memberId === selectedMember.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedMember, payments]);

  const memberAttendance = useMemo(() => {
    if (!selectedMember) return [];
    return attendance
      .filter((a) => a.memberId === selectedMember.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedMember, attendance]);

  // Financial calculations
  const totalAmountPaid = memberPayments
    .filter((p) => p.status === "Paid")
    .reduce((acc, p) => acc + p.amount, 0);

  const membershipAmountPaid = memberPayments
    .filter((p) => p.status === "Paid")
    .reduce((acc, p) => acc + (p.membershipAmount !== undefined ? p.membershipAmount : p.amount), 0);

  const ptAmountPaid = memberPayments
    .filter((p) => p.status === "Paid")
    .reduce((acc, p) => acc + (p.ptAmount || 0), 0);

  const pendingAmount = memberPayments
    .filter((p) => p.status === "Pending" || p.status === "Overdue" || p.status === "Partial")
    .reduce((acc, p) => acc + p.amount, 0);

  const lastPayment = memberPayments.length > 0 ? memberPayments[0] : null;

  // Attendance calculations
  const totalVisits = memberAttendance.filter((a) => a.status === "Present").length;

  const currentMonthPrefix = new Date().toISOString().substring(0, 7);
  const thisMonthVisits = memberAttendance.filter(
    (a) => a.status === "Present" && a.date.startsWith(currentMonthPrefix)
  ).length;

  const lastVisit = memberAttendance.find((a) => a.status === "Present")?.date || "No visits yet";

  const totalGymOperatingDays = Array.from(new Set(attendance.map((a) => a.date))).length || 1;
  const attendancePercentage = Math.min(100, Math.round((totalVisits / totalGymOperatingDays) * 100));

  const calculateStreak = () => {
    const presentDates = memberAttendance
      .filter((a) => a.status === "Present")
      .map((a) => a.date)
      .sort()
      .reverse();

    if (presentDates.length === 0) return 0;

    let streak = 1;
    for (let i = 0; i < presentDates.length - 1; i++) {
      const current = new Date(presentDates[i]);
      const prev = new Date(presentDates[i + 1]);
      const diffDays = Math.round((current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };
  const attendanceStreak = calculateStreak();

  const calculateDaysRemaining = () => {
    if (!selectedMember?.expiryDate) return 0;
    const expDate = new Date(selectedMember.expiryDate);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  const daysRemaining = calculateDaysRemaining();

  const monthlyAttendanceData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const count = memberAttendance.filter((a) => a.date.startsWith(yearMonth) && a.status === "Present").length;
      result.push({
        label: `${months[d.getMonth()]}`,
        count,
        heightPct: Math.min(100, Math.max(15, count * 10)),
      });
    }
    return result;
  }, [memberAttendance]);

  const memberActivities = useMemo(() => {
    if (!selectedMember) return [];
    const memberSpecific: Array<{ title: string; description: string; date: string; type: "join" | "payment" | "attendance" | "renewal" | "plan" }> = [];

    // 1. Join event
    memberSpecific.push({
      title: "Member Enrollment",
      description: `Enrolled in gym membership under ${memberPlan?.name || "Standard"} plan.`,
      date: selectedMember.joinDate,
      type: "join",
    });

    // 2. Payments
    memberPayments.forEach((p) => {
      memberSpecific.push({
        title: `Payment Processed (${formatCurrency(p.amount)})`,
        description: `Payment recorded via ${p.method} - Membership: ${formatCurrency(p.membershipAmount !== undefined ? p.membershipAmount : p.amount)}, PT: ${formatCurrency(p.ptAmount || 0)}`,
        date: p.date,
        type: "payment",
      });
    });

    // 3. Recent Attendance Check-ins
    memberAttendance.slice(0, 5).forEach((a) => {
      memberSpecific.push({
        title: `Gym Visit Check-in`,
        description: `Marked as ${a.status} ${a.checkInTime ? `at ${a.checkInTime}` : ""}`,
        date: a.date,
        type: "attendance",
      });
    });

    // 4. Renewals / Previous plans
    if (selectedMember.previousPlans) {
      selectedMember.previousPlans.forEach((prev) => {
        memberSpecific.push({
          title: `Subscription Renewal: ${prev.planName}`,
          description: `Completed term (${prev.startDate} to ${prev.expiryDate}) - ${formatCurrency(prev.amount)}`,
          date: prev.startDate,
          type: "renewal",
        });
      });
    }

    return memberSpecific.sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedMember, memberPlan, memberPayments, memberAttendance]);

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setNameSearch("");
    setActiveTab("overview");
    toast.success(`Generated gym report for ${member.name}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    toast.success(`Preparing printable PDF dossier for ${selectedMember?.name}...`);
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Search Header */}
      {!selectedMember ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Member Reports</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Search a member by name to view their complete gym-focused activity, billing, attendance, and training dossier.
              </p>
            </div>
          </div>

          {/* Search Card - NAME ONLY */}
          <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-md">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Search size={18} className="text-blue-500" />
                Member Name Search
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Type the member's name below to get real-time matching suggestions.
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="relative max-w-2xl">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search size={20} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  autoFocus
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-2xl leading-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 sm:text-base transition-all shadow-sm"
                  placeholder="Enter Member Name (e.g. Rahul, Alex, Sarah)..."
                />
              </div>

              {/* Real-time Search Suggestions */}
              {nameSearch.trim().length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Matching Members ({searchResults.length})
                  </p>
                  {searchResults.length === 0 ? (
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-center text-sm text-slate-500">
                      No members found matching "<strong>{nameSearch}</strong>".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {searchResults.map((member) => {
                        const plan = plans.find((p) => p.id === member.planId);
                        const trainer = trainers.find((t) => t.id === member.trainerId);
                        return (
                          <div
                            key={member.id}
                            onClick={() => handleSelectMember(member)}
                            className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-all flex items-center gap-3.5 group"
                          >
                            <img
                              src={member.photo}
                              alt={member.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700 group-hover:border-blue-500 transition-colors"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                                  {member.name}
                                </h4>
                                <Badge
                                  variant={member.status === "Active" ? "success" : member.status === "Expired" ? "danger" : "warning"}
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {member.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate mt-0.5">
                                {plan?.name || "Standard Plan"}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                Trainer: {trainer?.name || "None"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Directory Roster */}
              {nameSearch.trim().length === 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      All Gym Members ({members.length}) — Click to View Report
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {members.map((member) => {
                      const plan = plans.find((p) => p.id === member.planId);
                      const trainer = trainers.find((t) => t.id === member.trainerId);
                      return (
                        <div
                          key={member.id}
                          onClick={() => handleSelectMember(member)}
                          className="p-3.5 bg-slate-50/60 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-blue-500 transition-all cursor-pointer flex items-center gap-3 group"
                        >
                          <img
                            src={member.photo}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 group-hover:border-blue-500 transition-colors"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600">
                                {member.name}
                              </h4>
                              <Badge
                                variant={member.status === "Active" ? "success" : "danger"}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {member.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {plan?.name || "Standard Plan"} • Coach: {trainer?.name || "None"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Report View Mode */
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedMember(null)}
                className="gap-2 border-slate-200 dark:border-slate-800 dark:text-slate-300"
              >
                <ArrowLeft size={16} />
                Search Another Member
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                  Gym Report: {selectedMember.name}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comprehensive performance, membership, financial, and attendance report.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2 border-slate-200 dark:border-slate-800 dark:text-slate-300" onClick={handlePrint}>
                <Printer size={16} />
                Print Report
              </Button>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleDownloadPDF}>
                <Download size={16} />
                Download PDF
              </Button>
            </div>
          </div>

          {/* Member Banner Card */}
          <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-md overflow-hidden border border-slate-100">
            <div className="p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-5">
                <img
                  src={selectedMember.photo}
                  alt={selectedMember.name}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white/20 shadow-xl"
                />
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-extrabold tracking-tight">{selectedMember.name}</h2>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${selectedMember.status === "Active" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>
                      {selectedMember.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-blue-200 mt-2">
                    <span>Member ID: <strong className="text-white font-mono">{selectedMember.id}</strong></span>
                    <span>•</span>
                    <span>Plan: <strong className="text-white">{memberPlan?.name || "Standard Plan"}</strong></span>
                    <span>•</span>
                    <span>Assigned Coach: <strong className="text-white">{memberTrainer?.name || "None"}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10">
                <div className="text-right">
                  <p className="text-[11px] text-blue-200 uppercase font-semibold">Subscription Status</p>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {daysRemaining > 0 ? `${daysRemaining} Days Left` : "Expired"}
                  </p>
                  <p className="text-[10px] text-blue-300">Exp: {selectedMember.expiryDate}</p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto">
              {[
                { id: "overview", label: "Overview", icon: UserCheck },
                { id: "payments", label: "Payments", icon: CreditCard },
                { id: "attendance", label: "Attendance", icon: CalendarCheck },
                { id: "membership", label: "Membership", icon: Award },
                { id: "training", label: "Training", icon: Dumbbell },
                { id: "activity", label: "Activity", icon: ActivityIcon },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ReportTab)}
                    className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                      isActive
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900"
                        : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Metric Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Paid</p>
                      <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                        {formatCurrency(totalAmountPaid)}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Membership + PT total</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                      <CalendarCheck size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Visits</p>
                      <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{totalVisits} Days</h4>
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                        {thisMonthVisits} visits this month
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                      <Flame size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Current Streak</p>
                      <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{attendanceStreak} Days</h4>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">Active habit</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Dumbbell size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Assigned Coach</p>
                      <h4 className="text-lg font-bold text-slate-800 dark:text-white mt-1 truncate">
                        {memberTrainer?.name || "General Floor"}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {memberTrainer?.trainerType || "No PT assigned"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Overview Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="dark:text-slate-100">Membership Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                      <span className="text-slate-500">Plan Name</span>
                      <span className="font-bold text-slate-800 dark:text-white">{memberPlan?.name || "None"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                      <span className="text-slate-500">Duration</span>
                      <span className="font-semibold text-slate-800 dark:text-white">{memberPlan?.durationMonths} Months</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                      <span className="text-slate-500">Membership Start Date</span>
                      <span className="font-semibold text-slate-800 dark:text-white">{selectedMember.joinDate}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                      <span className="text-slate-500">Membership Expiry Date</span>
                      <span className="font-semibold text-slate-800 dark:text-white">{selectedMember.expiryDate}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-sm">
                      <span className="text-slate-500">Subscription Status</span>
                      <Badge variant={selectedMember.status === "Active" ? "success" : "danger"}>
                        {selectedMember.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="dark:text-slate-100">Gym Activity Key Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                      <span className="text-slate-500">Last Gym Check-in</span>
                      <span className="font-bold text-slate-800 dark:text-white">{lastVisit}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                      <span className="text-slate-500">Last Payment Recorded</span>
                      <span className="font-semibold text-slate-800 dark:text-white">
                        {lastPayment ? `${lastPayment.date} (${formatCurrency(lastPayment.amount)})` : "None"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                      <span className="text-slate-500">Attendance Percentage</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{attendancePercentage}%</span>
                    </div>
                    <div className="flex justify-between items-center py-2 text-sm">
                      <span className="text-slate-500">Personal Training Status</span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {memberTrainer?.trainerType === "Personal Trainer" ? "Active PT Client" : "General Access"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENTS */}
          {activeTab === "payments" && (
            <div className="space-y-6">
              {/* Payment Split Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Amount Paid</p>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {formatCurrency(totalAmountPaid)}
                    </h3>
                  </CardContent>
                </Card>
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Membership Amount Paid</p>
                    <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {formatCurrency(membershipAmountPaid)}
                    </h3>
                  </CardContent>
                </Card>
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">PT Amount Paid</p>
                    <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                      {formatCurrency(ptAmountPaid)}
                    </h3>
                  </CardContent>
                </Card>
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pending Amount</p>
                    <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                      {formatCurrency(pendingAmount)}
                    </h3>
                  </CardContent>
                </Card>
              </div>

              {/* Payment History Table */}
              <Card className="dark:bg-slate-900 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="dark:text-slate-100">Itemized Payment History</CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:border-slate-800">
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Membership Fee</TableHead>
                        <TableHead>PT Fee</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memberPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-slate-400 py-6">
                            No payment records found for this member.
                          </TableCell>
                        </TableRow>
                      ) : (
                        memberPayments.map((payment) => (
                          <TableRow key={payment.id} className="dark:border-slate-800">
                            <TableCell className="font-mono text-xs font-semibold">{payment.id}</TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-350 text-sm">{payment.date}</TableCell>
                            <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                              {formatCurrency(payment.membershipAmount !== undefined ? payment.membershipAmount : payment.amount)}
                            </TableCell>
                            <TableCell className="font-medium text-purple-600 dark:text-purple-400">
                              {formatCurrency(payment.ptAmount || 0)}
                            </TableCell>
                            <TableCell className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                                {payment.method}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={payment.status === "Paid" ? "success" : "warning"}>
                                {payment.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: ATTENDANCE */}
          {activeTab === "attendance" && (
            <div className="space-y-6">
              {/* Attendance KPI cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Visits</p>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalVisits} Days</h3>
                  </CardContent>
                </Card>
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">This Month's Visits</p>
                    <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{thisMonthVisits} Days</h3>
                  </CardContent>
                </Card>
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Attendance %</p>
                    <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{attendancePercentage}%</h3>
                  </CardContent>
                </Card>
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Current Streak</p>
                    <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{attendanceStreak} Days</h3>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Attendance Chart & Log */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="dark:text-slate-100">Monthly Attendance Frequency</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 flex items-end justify-between gap-3 pb-4">
                      {monthlyAttendanceData.map((item, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                          <div className="w-full bg-blue-100 dark:bg-blue-950/40 rounded-t-lg relative flex items-end justify-center" style={{ height: `${item.heightPct}%` }}>
                            <div className="w-full bg-blue-600 rounded-t-lg transition-all group-hover:bg-blue-500" style={{ height: "100%" }}></div>
                            <span className="absolute -top-7 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                              {item.count} check-ins
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="dark:text-slate-100">Recent Check-in Logs</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {memberAttendance.length === 0 ? (
                      <p className="p-6 text-center text-xs text-slate-400">No attendance records logged.</p>
                    ) : (
                      memberAttendance.map((rec) => (
                        <div key={rec.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                          <div className="flex items-center gap-2.5">
                            <Clock size={14} className="text-slate-400" />
                            <div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{rec.date}</p>
                              <p className="text-[11px] text-slate-400">{rec.checkInTime || "Check-in recorded"}</p>
                            </div>
                          </div>
                          <Badge variant={rec.status === "Present" ? "success" : "danger"}>
                            {rec.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 4: MEMBERSHIP */}
          {activeTab === "membership" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="dark:text-slate-100">Current Plan Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold text-blue-900 dark:text-blue-300">{memberPlan?.name || "Standard Plan"}</h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{memberPlan?.description}</p>
                        </div>
                        <span className="text-xl font-extrabold text-blue-700 dark:text-blue-300">
                          {formatCurrency(memberPlan?.price)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm pt-2">
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Plan Duration</span>
                        <span className="font-bold">{memberPlan?.durationMonths} Months</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Enrollment Start Date</span>
                        <span className="font-semibold">{selectedMember.joinDate}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500">Expiry Date</span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400">{selectedMember.expiryDate}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">Days Remaining</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {daysRemaining > 0 ? `${daysRemaining} Days` : "Expired"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="dark:text-slate-100">Previous Plans & Renewal History</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedMember.previousPlans && selectedMember.previousPlans.length > 0 ? (
                        selectedMember.previousPlans.map((prev, idx) => (
                          <div key={idx} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{prev.planName}</p>
                              <p className="text-slate-400 mt-0.5">
                                Term: {prev.startDate} → {prev.expiryDate}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(prev.amount)}</p>
                              <span className="text-[10px] text-emerald-600 font-semibold">Completed</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-xs text-slate-400">
                          No prior plan renewals. Member is on their initial registration subscription.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 5: TRAINING */}
          {activeTab === "training" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="dark:text-slate-100">Assigned Coach Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {memberTrainer ? (
                      <>
                        <div className="flex items-center gap-4">
                          <img
                            src={memberTrainer.photo}
                            alt={memberTrainer.name}
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-md"
                          />
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{memberTrainer.name}</h3>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{memberTrainer.specialization}</p>
                            <Badge variant={memberTrainer.trainerType === "Personal Trainer" ? "info" : "default"} className="mt-1">
                              {memberTrainer.trainerType}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2.5 text-sm pt-2">
                          <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500">Coach Contact</span>
                            <span className="font-medium">{memberTrainer.mobile}</span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500">Trainer Type</span>
                            <span className="font-bold">{memberTrainer.trainerType}</span>
                          </div>
                          <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500">PT Billing Rate</span>
                            <span className="font-bold text-purple-600 dark:text-purple-400">
                              {formatCurrency(memberTrainer.ptCharges)}/{memberTrainer.ptChargeType || "Month"}
                            </span>
                          </div>
                          <div className="flex justify-between py-1.5">
                            <span className="text-slate-500">Availability</span>
                            <span className="text-xs font-semibold">{memberTrainer.availability || "Standard Hours"}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400 py-6 text-center">No trainer assigned to this member.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="dark:bg-slate-900 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="dark:text-slate-100">Fitness & Training Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <strong>Trainer / Fitness Notes:</strong>
                      <p className="mt-1">{selectedMember.notes || "No specific workout goals or medical restrictions entered."}</p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Personal Training Overview</h4>
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/40 text-xs">
                        <p className="font-semibold text-purple-900 dark:text-purple-300">
                          {memberTrainer?.trainerType === "Personal Trainer" ? "Active 1-on-1 PT Enrollment" : "General Gym Floor Access"}
                        </p>
                        <p className="text-purple-700 dark:text-purple-400 mt-0.5">
                          Total PT charges contributed: <strong>{formatCurrency(ptAmountPaid)}</strong>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 6: ACTIVITY */}
          {activeTab === "activity" && (
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-slate-100">Chronological Gym Activity Log</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-6 ml-3 space-y-6">
                  {memberActivities.map((act, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[31px] top-1 bg-white dark:bg-slate-950 border-2 border-blue-500 h-4 w-4 rounded-full group-hover:scale-125 transition-transform" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{act.title}</h4>
                          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                            {act.date}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{act.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
