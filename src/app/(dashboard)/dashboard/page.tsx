"use client";

import { useState, useEffect } from "react";
import { useApp, Trainer, Payment, Expense, ExpenseCategory } from "@/lib/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatIndianNumber } from "@/lib/utils";
import { 
  Users, 
  UserCheck, 
  CalendarCheck, 
  CreditCard, 
  Volume2, 
  TrendingUp, 
  TrendingDown, 
  UserPlus, 
  Receipt, 
  FileText,
  Fingerprint
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";

// Animated counter component with Indian numbering format
function AnimatedCounter({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Math.abs(value);
    if (end === 0) {
      setCount(0);
      return;
    }
    const duration = 1000;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  const sign = value < 0 ? "-" : "";
  return <span>{sign}{prefix}{formatIndianNumber(count)}</span>;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Electricity",
  "Water",
  "Rent",
  "Equipment",
  "Equipment Maintenance",
  "Staff Salary",
  "Cleaning",
  "Marketing",
  "Internet",
  "Miscellaneous",
  "Other"
];

export default function Dashboard() {
  const { 
    members, 
    trainers, 
    plans, 
    payments, 
    expenses, 
    attendance, 
    activities, 
    settings,
    addMember,
    addTrainer,
    addPayment,
    addExpense,
    markAttendance,
    markBiometricAttendance,
    addNotification
  } = useApp();

  const [isLoading, setIsLoading] = useState(true);

  // Modal Open states
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddTrainerOpen, setIsAddTrainerOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isMarkAttendanceOpen, setIsMarkAttendanceOpen] = useState(false);
  const [isSendNotificationOpen, setIsSendNotificationOpen] = useState(false);

  // Form states
  const [memberForm, setMemberForm] = useState({
    name: "", mobile: "", email: "", gender: "male", dob: "", address: "", 
    emergencyContact: "", planId: "", trainerId: "", notes: ""
  });
  const [trainerForm, setTrainerForm] = useState({
    name: "", specialization: "", mobile: "", email: "", trainerType: "Personal Trainer" as Trainer["trainerType"], ptCharges: "2000", ptChargeType: "Monthly" as const
  });
  const [paymentForm, setPaymentForm] = useState({
    memberId: "", membershipAmount: "0", ptAmount: "0", method: "Card" as Payment["method"], status: "Paid" as Payment["status"]
  });
  const [expenseForm, setExpenseForm] = useState({
    title: "", category: "Electricity" as ExpenseCategory, amount: "", date: new Date().toISOString().split("T")[0], paymentMethod: "Bank Transfer" as Expense["paymentMethod"], description: ""
  });
  const [attendanceForm, setAttendanceForm] = useState({ 
    memberId: "", 
    status: "Present" as "Present" | "Absent",
    source: "biometric" as "biometric" | "manual"
  });
  const [notificationForm, setNotificationForm] = useState({ title: "", message: "", type: "info" as "info" | "success" | "warning" | "error" });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Stats & Financial calculation
  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === "Active").length;
  const todayDate = new Date().toISOString().split("T")[0];
  const todayAttendance = attendance.filter(a => a.date === todayDate && a.status === "Present").length;

  const totalRevenue = payments
    .filter(p => p.status === "Paid")
    .reduce((acc, p) => acc + p.amount, 0);

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const stats = [
    { title: "Total Members", value: totalMembers, icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950/50" },
    { title: "Active Members", value: activeMembers, icon: UserCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/50" },
    { title: "Total Revenue", value: totalRevenue, icon: CreditCard, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950/50", isCurrency: true },
    { title: "Total Expenses", value: totalExpenses, icon: TrendingDown, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-950/50", isCurrency: true },
    { title: "Net Profit", value: netProfit, icon: TrendingUp, color: netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400", bg: netProfit >= 0 ? "bg-emerald-100 dark:bg-emerald-950/50" : "bg-red-100 dark:bg-red-950/50", isCurrency: true },
    { title: "Today's Attendance", value: todayAttendance, icon: CalendarCheck, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-950/50" },
  ];

  // Expiring memberships logic (next 7 days)
  const expiringMembers = members.filter(m => {
    if (m.status !== "Active") return false;
    const exp = new Date(m.expiryDate);
    const now = new Date();
    const diff = (exp.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 14;
  }).map(m => {
    const exp = new Date(m.expiryDate);
    const now = new Date();
    const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return { ...m, daysLeft: diff };
  });

  // Modal Submit Handlers
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (plans.length === 0) {
      toast.error("Please create at least one membership plan before registering a member.");
      return;
    }
    const plan = plans.find(p => p.id === memberForm.planId) || plans[0];
    const duration = plan ? plan.durationMonths : 1;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + duration);

    const newMemberId = `M-${Math.floor(1000 + Math.random() * 9000)}`;

    addMember({
      name: memberForm.name,
      mobile: memberForm.mobile,
      email: memberForm.email,
      gender: memberForm.gender,
      dob: memberForm.dob ? memberForm.dob.trim() : "",
      address: memberForm.address,
      emergencyContact: memberForm.emergencyContact,
      planId: plan.id,
      trainerId: memberForm.trainerId,
      joinDate: new Date().toISOString().split("T")[0],
      expiryDate: expiry.toISOString().split("T")[0],
      status: "Active",
      photo: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=256&h=256&q=80",
      notes: memberForm.notes
    });

    // Auto-record registration payment
    const tr = trainers.find(t => t.id === memberForm.trainerId);
    const memFee = plan ? plan.price : 0;
    const ptFee = tr && tr.trainerType === "Personal Trainer" ? (tr.ptCharges || 0) : 0;
    addPayment({
      memberId: newMemberId,
      memberName: memberForm.name,
      planId: plan?.id || "",
      planName: plan?.name || "Membership Plan",
      membershipAmount: memFee,
      ptAmount: ptFee,
      amount: memFee + ptFee,
      date: new Date().toISOString().split("T")[0],
      method: "Cash",
      status: "Paid",
      notes: "Initial registration payment"
    });

    setIsAddMemberOpen(false);
    setMemberForm({
      name: "", mobile: "", email: "", gender: "male", dob: "", address: "", 
      emergencyContact: "", planId: "", trainerId: "", notes: ""
    });
  };

  const handleAddTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    const numCharges = trainerForm.trainerType === "General Trainer" ? 0 : parseFloat(trainerForm.ptCharges);
    addTrainer({
      name: trainerForm.name,
      specialization: trainerForm.specialization,
      mobile: trainerForm.mobile,
      email: trainerForm.email,
      status: "Active",
      photo: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=256&h=256&q=80",
      trainerType: trainerForm.trainerType,
      ptCharges: isNaN(numCharges) ? 0 : Math.max(0, numCharges),
      ptChargeType: trainerForm.ptChargeType,
      availability: "Mon-Sat: 08:00 AM - 04:00 PM"
    });
    setIsAddTrainerOpen(false);
    setTrainerForm({
      name: "", specialization: "", mobile: "", email: "", trainerType: "Personal Trainer", ptCharges: "2000", ptChargeType: "Monthly"
    });
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const member = members.find(m => m.id === paymentForm.memberId);
    const plan = plans.find(p => p.id === member?.planId);
    const memFee = parseFloat(paymentForm.membershipAmount) || 0;
    const ptFee = parseFloat(paymentForm.ptAmount) || 0;

    if (!member) {
      toast.error("Please select a valid member");
      return;
    }

    addPayment({
      memberId: member.id,
      memberName: member.name,
      planId: plan?.id || "",
      planName: plan?.name || "Membership Plan",
      membershipAmount: memFee,
      ptAmount: ptFee,
      amount: memFee + ptFee,
      date: new Date().toISOString().split("T")[0],
      method: paymentForm.method,
      status: paymentForm.status,
    });
    setIsAddPaymentOpen(false);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(expenseForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid expense amount");
      return;
    }

    addExpense({
      title: expenseForm.title.trim(),
      category: expenseForm.category,
      amount: numAmount,
      date: expenseForm.date,
      paymentMethod: expenseForm.paymentMethod,
      description: expenseForm.description.trim(),
      addedBy: "Admin",
    });
    setIsAddExpenseOpen(false);
    setExpenseForm({
      title: "", category: "Electricity", amount: "", date: new Date().toISOString().split("T")[0], paymentMethod: "Bank Transfer", description: ""
    });
  };

  const handleMarkAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceForm.memberId) return;
    if (attendanceForm.source === "biometric") {
      markBiometricAttendance(attendanceForm.memberId);
    } else {
      markAttendance(attendanceForm.memberId, attendanceForm.status);
    }
    setIsMarkAttendanceOpen(false);
  };

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    addNotification(notificationForm.title, notificationForm.message, notificationForm.type);
    toast.success("Broadcast notification sent!");
    setIsSendNotificationOpen(false);
    setNotificationForm({ title: "", message: "", type: "info" });
  };

  // Pre-calculated breakdown in Add Member Modal
  const addSelectedPlan = plans.find(p => p.id === memberForm.planId);
  const addSelectedTrainer = trainers.find(t => t.id === memberForm.trainerId);
  const addMemFee = addSelectedPlan ? addSelectedPlan.price : 0;
  const addPtFee = addSelectedTrainer && addSelectedTrainer.trainerType === "Personal Trainer" ? (addSelectedTrainer.ptCharges || 0) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner / Welcome Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Welcome back! Live summary of gym metrics, revenues in INR (₹), and operations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsSendNotificationOpen(true)}
            variant="outline" 
            className="gap-2 border-slate-200 dark:border-slate-800 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
          >
            <Volume2 size={16} />
            Broadcast Alert
          </Button>
          <Button 
            onClick={() => setIsAddPaymentOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <CreditCard size={16} />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Quick Action Dock */}
      <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm border border-slate-100">
        <CardHeader className="py-3 px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">Quick Actions Hub</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Button onClick={() => setIsAddMemberOpen(true)} className="flex flex-col items-center justify-center p-4 h-24 rounded-2xl bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 border border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-400 gap-2 hover:-translate-y-1 transition-all">
              <UserPlus size={20} />
              <span className="text-xs font-semibold">Add Member</span>
            </Button>
            <Button onClick={() => setIsAddTrainerOpen(true)} className="flex flex-col items-center justify-center p-4 h-24 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 gap-2 hover:-translate-y-1 transition-all">
              <Users size={20} />
              <span className="text-xs font-semibold">Add Trainer</span>
            </Button>
            <Button onClick={() => setIsAddExpenseOpen(true)} className="flex flex-col items-center justify-center p-4 h-24 rounded-2xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 border border-rose-100 dark:border-rose-900 text-rose-700 dark:text-rose-400 gap-2 hover:-translate-y-1 transition-all">
              <Receipt size={20} />
              <span className="text-xs font-semibold">Add Expense</span>
            </Button>
            <Button onClick={() => setIsAddPaymentOpen(true)} className="flex flex-col items-center justify-center p-4 h-24 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 border border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 gap-2 hover:-translate-y-1 transition-all">
              <CreditCard size={20} />
              <span className="text-xs font-semibold">Add Payment</span>
            </Button>
            <Button onClick={() => setIsMarkAttendanceOpen(true)} className="flex flex-col items-center justify-center p-4 h-24 rounded-2xl bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 border border-purple-100 dark:border-purple-900 text-purple-700 dark:text-purple-400 gap-2 hover:-translate-y-1 transition-all">
              <CalendarCheck size={20} />
              <span className="text-xs font-semibold">Mark Attendance</span>
            </Button>
            <Link href="/member-reports" className="w-full">
              <Button className="w-full flex flex-col items-center justify-center p-4 h-24 rounded-2xl bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 border border-amber-100 dark:border-amber-900 text-amber-700 dark:text-amber-400 gap-2 hover:-translate-y-1 transition-all">
                <FileText size={20} />
                <span className="text-xs font-semibold">Member Reports</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Statistics & Financial Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {isLoading 
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="dark:bg-slate-900 dark:border-slate-800">
                <CardContent className="p-5 flex flex-col gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <div>
                    <Skeleton className="w-20 h-4 mb-2" />
                    <Skeleton className="w-16 h-8" />
                  </div>
                </CardContent>
              </Card>
            ))
          : stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="hover:-translate-y-1 transition-all duration-300 dark:bg-slate-900 dark:border-slate-800 shadow-sm hover:shadow-md border border-slate-100 dark:border-slate-800">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{stat.title}</p>
                    <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                      <AnimatedCounter value={stat.value} prefix={stat.isCurrency ? settings.currency : ""} />
                    </h4>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
        ))}
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Membership Signups Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <>
                <div className="h-64 flex items-end justify-between gap-3 pb-4">
                  {[40, 55, 45, 70, 65, 80, 95].map((h, i) => (
                    <div key={i} className="w-full bg-blue-100 dark:bg-blue-950/20 rounded-t-lg hover:bg-blue-200 dark:hover:bg-blue-900 transition-colors relative group" style={{ height: `${h}%` }}>
                      <div className="absolute inset-x-0 bottom-0 bg-blue-600 rounded-t-lg w-full transition-all group-hover:opacity-90" style={{ height: `${h}%` }}></div>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap">
                        {Math.floor(h * (members.length / 50))} Signups
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Revenue vs Expenses Financial Tracker */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="dark:text-slate-100">Revenue vs Expenses Flow</CardTitle>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> Revenue
              </span>
              <span className="flex items-center gap-1 text-rose-600 font-semibold">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> Expenses
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <>
                <div className="h-64 flex items-end justify-between gap-4 pb-4">
                  {[
                    { rev: 65, exp: 35, month: "Feb", revAmt: 45000, expAmt: 25000 },
                    { rev: 70, exp: 40, month: "Mar", revAmt: 52000, expAmt: 28000 },
                    { rev: 80, exp: 45, month: "Apr", revAmt: 68000, expAmt: 35000 },
                    { rev: 75, exp: 38, month: "May", revAmt: 60000, expAmt: 32000 },
                    { rev: 90, exp: 50, month: "Jun", revAmt: 85000, expAmt: 42000 },
                    { rev: 95, exp: 48, month: "Jul", revAmt: 98000, expAmt: 45000 },
                  ].map((item, i) => (
                    <div key={i} className="w-full flex items-end justify-center gap-1.5 h-full group">
                      {/* Revenue Bar */}
                      <div className="w-1/2 bg-emerald-500 rounded-t-md relative transition-all group-hover:opacity-90" style={{ height: `${item.rev}%` }}>
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-10">
                          Rev: {formatCurrency(item.revAmt)}
                        </div>
                      </div>
                      {/* Expense Bar */}
                      <div className="w-1/2 bg-rose-500 rounded-t-md relative transition-all group-hover:opacity-90" style={{ height: `${item.exp}%` }}>
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-10">
                          Exp: {formatCurrency(item.expAmt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Live Activity Feed & Expiring Soon */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="dark:text-slate-100">Live Activity Feed</CardTitle>
            <div className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold px-2.5 py-1 rounded-full uppercase">Realtime</div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : activities.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">No activities recorded yet.</p>
            ) : (
              <div className="relative border-l border-slate-200 dark:border-slate-800 pl-4 ml-2 space-y-6 py-2">
                {activities.slice(0, 6).map((activity) => (
                  <div key={activity.id} className="relative group">
                    <div className="absolute -left-[21px] top-1 bg-white dark:bg-slate-950 border-2 border-blue-500 h-3.5 w-3.5 rounded-full group-hover:scale-125 transition-transform" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{activity.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Expiring Memberships</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="w-24 h-4" />
                        <Skeleton className="w-16 h-3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : expiringMembers.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 p-6 text-center">No subscriptions expiring soon.</p>
              ) : (
                expiringMembers.map((member) => (
                  <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <img src={member.photo} alt={member.name} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{member.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Expires: {member.expiryDate}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400">In {member.daysLeft} days</p>
                      <Link href="/membership-plans">
                        <span className="text-xs text-blue-600 dark:text-blue-400 mt-1 hover:underline font-medium cursor-pointer">Renew</span>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QUICK OPERATIONS MODALS */}
      {/* 1. Add Member Modal */}
      <Modal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} title="Register Gym Member">
        <form onSubmit={handleAddMember} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Full Name *</label>
            <input type="text" required value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" placeholder="Rahul Sharma" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Mobile *</label>
              <input type="text" required value={memberForm.mobile} onChange={(e) => setMemberForm({ ...memberForm, mobile: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" placeholder="+91 98765 00000" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
              <input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" placeholder="rahul@example.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Gender</label>
              <select value={memberForm.gender} onChange={(e) => setMemberForm({ ...memberForm, gender: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Date of Birth (DOB)</label>
              <input type="date" value={memberForm.dob} onChange={(e) => setMemberForm({ ...memberForm, dob: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Plan *</label>
              <select required value={memberForm.planId} onChange={(e) => setMemberForm({ ...memberForm, planId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                <option value="">Select Plan</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.durationMonths === 1 ? "1 Month" : p.durationMonths === 12 ? "1 Year" : `${p.durationMonths} Months`} — {formatCurrency(p.price)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Trainer & PT Charges</label>
              <select value={memberForm.trainerId} onChange={(e) => setMemberForm({ ...memberForm, trainerId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                <option value="">No Trainer</option>
                {trainers.map(t => {
                  const isPT = t.trainerType === "Personal Trainer";
                  const ptChargeDisplay = isPT 
                    ? `${formatCurrency(t.ptCharges || 0)}/${(t.ptChargeType || "month").toLowerCase()}` 
                    : "₹0";
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.trainerType || "Personal Trainer"} ({ptChargeDisplay})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Breakdown pill */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex justify-between">
            <span>Membership: <strong>{formatCurrency(addMemFee)}</strong></span>
            <span>PT Fee: <strong className="text-purple-600">{formatCurrency(addPtFee)}</strong></span>
            <span>Total: <strong className="text-blue-600 font-bold">{formatCurrency(addMemFee + addPtFee)}</strong></span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Member</Button>
          </div>
        </form>
      </Modal>

      {/* 2. Add Trainer Modal */}
      <Modal isOpen={isAddTrainerOpen} onClose={() => setIsAddTrainerOpen(false)} title="Add Certified Trainer">
        <form onSubmit={handleAddTrainer} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Full Name *</label>
            <input type="text" required value={trainerForm.name} onChange={(e) => setTrainerForm({ ...trainerForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="Coach Amit Patil" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Trainer Role *</label>
              <select
                value={trainerForm.trainerType}
                onChange={(e) => setTrainerForm({ ...trainerForm, trainerType: e.target.value as any })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm"
              >
                <option value="Personal Trainer">Personal Trainer (PT)</option>
                <option value="General Trainer">General Trainer</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Specialization *</label>
              <input type="text" required value={trainerForm.specialization} onChange={(e) => setTrainerForm({ ...trainerForm, specialization: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="CrossFit & HIIT" />
            </div>
          </div>
          {trainerForm.trainerType === "Personal Trainer" && (
            <div className="space-y-1 p-2.5 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/40">
              <label className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase">PT Charges Amount (₹)</label>
              <input type="number" min="0" value={trainerForm.ptCharges} onChange={(e) => setTrainerForm({ ...trainerForm, ptCharges: e.target.value })} className="w-full px-3 py-1.5 border border-purple-200 dark:border-purple-800 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Mobile *</label>
              <input type="text" required value={trainerForm.mobile} onChange={(e) => setTrainerForm({ ...trainerForm, mobile: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="+91 98765 00000" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Email *</label>
              <input type="email" required value={trainerForm.email} onChange={(e) => setTrainerForm({ ...trainerForm, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="coach@gymation.com" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddTrainerOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Trainer</Button>
          </div>
        </form>
      </Modal>

      {/* 3. Add Expense Modal */}
      <Modal isOpen={isAddExpenseOpen} onClose={() => setIsAddExpenseOpen(false)} title="Record Gym Expense">
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Expense Title *</label>
            <input type="text" required value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="e.g. Electric Bill July" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Category *</label>
              <select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Amount (₹) *</label>
              <input type="number" min="0.01" step="any" required value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="8500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Date *</label>
              <input type="date" required value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Payment Method</label>
              <select value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value as any })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddExpenseOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white">Save Expense</Button>
          </div>
        </form>
      </Modal>

      {/* 4. Add Payment Modal */}
      <Modal isOpen={isAddPaymentOpen} onClose={() => setIsAddPaymentOpen(false)} title="Record Billing Payment">
        <form onSubmit={handleAddPayment} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Member *</label>
            <select required value={paymentForm.memberId} onChange={(e) => {
              const mem = members.find(m => m.id === e.target.value);
              const p = plans.find(plan => plan.id === mem?.planId);
              const tr = trainers.find(t => t.id === mem?.trainerId);
              setPaymentForm({
                ...paymentForm,
                memberId: e.target.value,
                membershipAmount: String(p ? p.price : 0),
                ptAmount: String(tr && tr.trainerType === "Personal Trainer" ? tr.ptCharges || 0 : 0)
              });
            }} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
              <option value="">Select Member</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Membership Fee (₹)</label>
              <input type="number" min="0" value={paymentForm.membershipAmount} onChange={(e) => setPaymentForm({ ...paymentForm, membershipAmount: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">PT Fee (₹)</label>
              <input type="number" min="0" value={paymentForm.ptAmount} onChange={(e) => setPaymentForm({ ...paymentForm, ptAmount: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Payment Method</label>
              <select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as any })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                <option value="Card">Card</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
              <select value={paymentForm.status} onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value as any })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddPaymentOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Record Invoice</Button>
          </div>
        </form>
      </Modal>

      {/* 5. Mark Attendance Modal */}
      <Modal isOpen={isMarkAttendanceOpen} onClose={() => setIsMarkAttendanceOpen(false)} title="Mark Member Attendance">
        <form onSubmit={handleMarkAttendance} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Verification Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAttendanceForm({ ...attendanceForm, source: "biometric", status: "Present" })}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  attendanceForm.source === "biometric"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Fingerprint size={14} /> Biometric Punch
              </button>
              <button
                type="button"
                onClick={() => setAttendanceForm({ ...attendanceForm, source: "manual" })}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  attendanceForm.source === "manual"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                Manual Rollcall
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Gym Member *</label>
            <select required value={attendanceForm.memberId} onChange={(e) => setAttendanceForm({ ...attendanceForm, memberId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
              <option value="">Select Member</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id}) {m.biometricUserId ? `• FP #${m.biometricUserId}` : ""}
                </option>
              ))}
            </select>
          </div>
          {attendanceForm.source === "manual" && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
              <select value={attendanceForm.status} onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value as "Present" | "Absent" })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                <option value="Present">Present (Checked-in)</option>
                <option value="Absent">Absent</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsMarkAttendanceOpen(false)}>Cancel</Button>
            <Button type="submit" className={attendanceForm.source === "biometric" ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}>
              {attendanceForm.source === "biometric" ? "Record Biometric Punch" : "Record Rollcall"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Broadcast Notification Modal */}
      <Modal isOpen={isSendNotificationOpen} onClose={() => setIsSendNotificationOpen(false)} title="Send Alert Broadcast">
        <form onSubmit={handleSendNotification} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Alert Headline *</label>
            <input type="text" required value={notificationForm.title} onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="e.g. Gym Maintenance Notice" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Alert Type</label>
            <select value={notificationForm.type} onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value as any })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
              <option value="info">Information</option>
              <option value="warning">Warning Notice</option>
              <option value="success">Success</option>
              <option value="error">Urgent Alert</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Message Body *</label>
            <textarea required value={notificationForm.message} onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm h-20 outline-none resize-none" placeholder="Enter message details..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsSendNotificationOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Broadcast Alert</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
