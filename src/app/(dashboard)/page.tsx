"use client";

import { useState, useEffect } from "react";
import { useApp, Member, Trainer, MembershipPlan, Payment } from "@/lib/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { 
  Users, 
  UserCheck, 
  UserX, 
  CalendarCheck, 
  DollarSign, 
  Clock, 
  Plus, 
  Volume2, 
  Check, 
  Smartphone,
  TrendingUp,
  UserPlus
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";

// Animated counter component
function AnimatedCounter({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
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

  return <span>{prefix}{count.toLocaleString()}</span>;
}

export default function Dashboard() {
  const { 
    members, 
    trainers, 
    plans, 
    payments, 
    attendance, 
    activities,
    settings,
    addMember,
    addTrainer,
    addPlan,
    addPayment,
    markAttendance,
    addNotification
  } = useApp();

  const [isLoading, setIsLoading] = useState(true);

  // Modal Open states
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddTrainerOpen, setIsAddTrainerOpen] = useState(false);
  const [isAddPlanOpen, setIsAddPlanOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isMarkAttendanceOpen, setIsMarkAttendanceOpen] = useState(false);
  const [isSendNotificationOpen, setIsSendNotificationOpen] = useState(false);

  // Form states
  const [memberForm, setMemberForm] = useState({
    name: "", mobile: "", email: "", gender: "male", dob: "", address: "", 
    emergencyContact: "", planId: "", trainerId: "", notes: ""
  });
  const [trainerForm, setTrainerForm] = useState({ name: "", specialization: "", mobile: "", email: "" });
  const [planForm, setPlanForm] = useState({ name: "", price: 0, durationMonths: 1, description: "" });
  const [paymentForm, setPaymentForm] = useState({ memberId: "", amount: 0, method: "Card" as Payment["method"], status: "Paid" as Payment["status"] });
  const [attendanceForm, setAttendanceForm] = useState({ memberId: "", status: "Present" as "Present" | "Absent" });
  const [notificationForm, setNotificationForm] = useState({ title: "", message: "", type: "info" as "info" | "success" | "warning" | "error" });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Stats calculation
  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === "Active").length;
  const expiredMembers = members.filter(m => m.status === "Expired").length;
  const todayDate = new Date().toISOString().split("T")[0];
  const todayAttendance = attendance.filter(a => a.date === todayDate && a.status === "Present").length;
  const totalRevenue = payments.reduce((acc, p) => p.status === "Paid" ? acc + p.amount : acc, 0);
  const pendingPayments = payments.filter(p => p.status === "Pending").length;

  const stats = [
    { title: "Total Members", value: totalMembers, icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-950/50" },
    { title: "Active Members", value: activeMembers, icon: UserCheck, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-950/50" },
    { title: "Expired Members", value: expiredMembers, icon: UserX, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950/50" },
    { title: "Today's Attendance", value: todayAttendance, icon: CalendarCheck, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-950/50" },
    { title: "Monthly Revenue", value: totalRevenue, icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/50", isCurrency: true },
    { title: "Pending Payments", value: pendingPayments, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950/50" },
  ];

  // Expiring members (within next 30 days)
  const expiringMembers = members
    .filter(m => m.status === "Active")
    .map(m => {
      const diffTime = Math.abs(new Date(m.expiryDate).getTime() - new Date().getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...m, daysLeft: diffDays };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  // Form handlers
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const plan = plans.find(p => p.id === memberForm.planId);
    const duration = plan ? plan.durationMonths : 1;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + duration);

    addMember({
      name: memberForm.name,
      mobile: memberForm.mobile,
      email: memberForm.email,
      gender: memberForm.gender,
      dob: memberForm.dob,
      address: memberForm.address,
      emergencyContact: memberForm.emergencyContact,
      planId: memberForm.planId || plans[0]?.id || "",
      trainerId: memberForm.trainerId,
      joinDate: new Date().toISOString().split("T")[0],
      expiryDate: expiry.toISOString().split("T")[0],
      status: "Active",
      photo: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=256&h=256&q=80",
      notes: memberForm.notes
    });

    // Auto add payment
    if (plan) {
      addPayment({
        memberId: `M-${members.length + 1001}`, // rough sync
        memberName: memberForm.name,
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        date: new Date().toISOString().split("T")[0],
        method: "Cash",
        status: "Paid"
      });
    }

    setIsAddMemberOpen(false);
    setMemberForm({ name: "", mobile: "", email: "", gender: "male", dob: "", address: "", emergencyContact: "", planId: "", trainerId: "", notes: "" });
  };

  const handleAddTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    addTrainer({
      name: trainerForm.name,
      specialization: trainerForm.specialization,
      mobile: trainerForm.mobile,
      email: trainerForm.email,
      status: "Active",
      photo: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=256&h=256&q=80"
    });
    setIsAddTrainerOpen(false);
    setTrainerForm({ name: "", specialization: "", mobile: "", email: "" });
  };

  const handleAddPlan = (e: React.FormEvent) => {
    e.preventDefault();
    addPlan({
      name: planForm.name,
      price: planForm.price,
      durationMonths: planForm.durationMonths,
      description: planForm.description,
      status: "Active"
    });
    setIsAddPlanOpen(false);
    setPlanForm({ name: "", price: 0, durationMonths: 1, description: "" });
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const member = members.find(m => m.id === paymentForm.memberId);
    const plan = plans.find(p => p.id === member?.planId) || plans[0];
    if (!member) {
      toast.error("Invalid member selection");
      return;
    }
    addPayment({
      memberId: member.id,
      memberName: member.name,
      planId: plan?.id || "",
      planName: plan?.name || "Standard Plan",
      amount: paymentForm.amount || plan?.price || 0,
      date: new Date().toISOString().split("T")[0],
      method: paymentForm.method,
      status: paymentForm.status
    });
    setIsAddPaymentOpen(false);
    setPaymentForm({ memberId: "", amount: 0, method: "Card", status: "Paid" });
  };

  const handleMarkAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceForm.memberId) {
      toast.error("Select a member first");
      return;
    }
    markAttendance(attendanceForm.memberId, attendanceForm.status);
    setIsMarkAttendanceOpen(false);
    setAttendanceForm({ memberId: "", status: "Present" });
  };

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    addNotification(notificationForm.title, notificationForm.message, notificationForm.type);
    toast.success("Broadcast notification sent successfully!");
    setIsSendNotificationOpen(false);
    setNotificationForm({ title: "", message: "", type: "info" });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Title section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            Dashboard Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time analytics and controls for {settings.gymName}.
          </p>
        </div>
        <div className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-slate-500 shadow-sm">
          Last updated: Just now
        </div>
      </div>

      {/* Quick Action Hub */}
      <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-md">
        <CardHeader className="py-4 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-400">Quick Operations Manager</CardTitle>
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
            <Button onClick={() => setIsAddPlanOpen(true)} className="flex flex-col items-center justify-center p-4 h-24 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 border border-emerald-100 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 gap-2 hover:-translate-y-1 transition-all">
              <TrendingUp size={20} />
              <span className="text-xs font-semibold">Create Plan</span>
            </Button>
            <Button onClick={() => setIsAddPaymentOpen(true)} className="flex flex-col items-center justify-center p-4 h-24 rounded-2xl bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 border border-amber-100 dark:border-amber-900 text-amber-700 dark:text-amber-400 gap-2 hover:-translate-y-1 transition-all">
              <DollarSign size={20} />
              <span className="text-xs font-semibold">Add Payment</span>
            </Button>
            <Button onClick={() => setIsMarkAttendanceOpen(true)} className="flex flex-col items-center justify-center p-4 h-24 rounded-2xl bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 border border-purple-100 dark:border-purple-900 text-purple-700 dark:text-purple-400 gap-2 hover:-translate-y-1 transition-all">
              <CalendarCheck size={20} />
              <span className="text-xs font-semibold">Mark Attendance</span>
            </Button>
            <Button onClick={() => setIsSendNotificationOpen(true)} className="flex flex-col items-center justify-center p-4 h-24 rounded-2xl bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 border border-rose-100 dark:border-rose-900 text-rose-700 dark:text-rose-400 gap-2 hover:-translate-y-1 transition-all">
              <Volume2 size={20} />
              <span className="text-xs font-semibold">Broadcast Alert</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Statistics Grid */}
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
              <Card className="hover:-translate-y-1 transition-all duration-300 dark:bg-slate-900 dark:border-slate-800 shadow-sm hover:shadow-md border border-slate-100">
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

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Revenue Collections Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : (
              <>
                <div className="h-64 flex items-end justify-between gap-3 pb-4">
                  {[50, 60, 55, 75, 85, 70, 90].map((h, i) => (
                    <div key={i} className="w-full bg-emerald-100 dark:bg-emerald-950/20 rounded-t-lg hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors relative group" style={{ height: `${h}%` }}>
                      <div className="absolute inset-x-0 bottom-0 bg-emerald-500 rounded-t-lg w-full transition-all group-hover:opacity-90" style={{ height: `${h}%` }}></div>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap">
                        {settings.currency}{Math.floor(h * 150)}
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
      </div>

      {/* Bottom Grid: Recent Activity and Expiring Soon */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Log */}
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

        {/* Expiring Soon */}
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
                        <button className="text-xs text-blue-600 dark:text-blue-400 mt-1 hover:underline font-medium">Renew</button>
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

      {/* Add Member Modal */}
      <Modal isOpen={isAddMemberOpen} onClose={() => setIsAddMemberOpen(false)} title="Register Gym Member">
        <form onSubmit={handleAddMember} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Full Name *</label>
            <input type="text" required value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" placeholder="Jane Doe" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Mobile *</label>
              <input type="text" required value={memberForm.mobile} onChange={(e) => setMemberForm({ ...memberForm, mobile: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" placeholder="+1 555-000-0000" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
              <input type="email" value={memberForm.email} onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" placeholder="jane@example.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Plan *</label>
              <select required value={memberForm.planId} onChange={(e) => setMemberForm({ ...memberForm, planId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                <option value="">Select Plan</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name} - {settings.currency}{p.price}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Trainer (PT)</label>
              <select value={memberForm.trainerId} onChange={(e) => setMemberForm({ ...memberForm, trainerId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                <option value="">No Trainer</option>
                {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Member</Button>
          </div>
        </form>
      </Modal>

      {/* Add Trainer Modal */}
      <Modal isOpen={isAddTrainerOpen} onClose={() => setIsAddTrainerOpen(false)} title="Add Certified Trainer">
        <form onSubmit={handleAddTrainer} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Full Name *</label>
            <input type="text" required value={trainerForm.name} onChange={(e) => setTrainerForm({ ...trainerForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="Coach Carter" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Specialization *</label>
            <input type="text" required value={trainerForm.specialization} onChange={(e) => setTrainerForm({ ...trainerForm, specialization: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="CrossFit & HIIT" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Mobile *</label>
              <input type="text" required value={trainerForm.mobile} onChange={(e) => setTrainerForm({ ...trainerForm, mobile: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="+1 555-000-0000" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Email *</label>
              <input type="email" required value={trainerForm.email} onChange={(e) => setTrainerForm({ ...trainerForm, email: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="carter@gymation.com" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddTrainerOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Trainer</Button>
          </div>
        </form>
      </Modal>

      {/* Add Plan Modal */}
      <Modal isOpen={isAddPlanOpen} onClose={() => setIsAddPlanOpen(false)} title="Create Membership Plan">
        <form onSubmit={handleAddPlan} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Plan Name *</label>
            <input type="text" required value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="Gold Premium" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Price ({settings.currency}) *</label>
              <input type="number" required value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="99" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Duration (Months) *</label>
              <input type="number" required value={planForm.durationMonths} onChange={(e) => setPlanForm({ ...planForm, durationMonths: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="3" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
            <textarea value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm h-20 outline-none resize-none" placeholder="Details about this plan..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddPlanOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Plan</Button>
          </div>
        </form>
      </Modal>

      {/* Add Payment Modal */}
      <Modal isOpen={isAddPaymentOpen} onClose={() => setIsAddPaymentOpen(false)} title="Record Billing Payment">
        <form onSubmit={handleAddPayment} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Member *</label>
            <select required value={paymentForm.memberId} onChange={(e) => setPaymentForm({ ...paymentForm, memberId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
              <option value="">Select Member</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Amount ({settings.currency})</label>
              <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="Auto calculated if left blank" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Payment Method</label>
              <select value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as Payment["method"] })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
                <option value="Card">Card</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
            <select value={paymentForm.status} onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value as Payment["status"] })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAddPaymentOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Record Invoice</Button>
          </div>
        </form>
      </Modal>

      {/* Mark Attendance Modal */}
      <Modal isOpen={isMarkAttendanceOpen} onClose={() => setIsMarkAttendanceOpen(false)} title="Mark Member Attendance">
        <form onSubmit={handleMarkAttendance} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Gym Member *</label>
            <select required value={attendanceForm.memberId} onChange={(e) => setAttendanceForm({ ...attendanceForm, memberId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
              <option value="">Select Member</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.id})</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
            <select value={attendanceForm.status} onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value as "Present" | "Absent" })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
              <option value="Present">Present (Checked-in)</option>
              <option value="Absent">Absent</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsMarkAttendanceOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Record Rollcall</Button>
          </div>
        </form>
      </Modal>

      {/* Broadcast Alert Notification Modal */}
      <Modal isOpen={isSendNotificationOpen} onClose={() => setIsSendNotificationOpen(false)} title="Send Global Alert / Notification">
        <form onSubmit={handleSendNotification} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Alert Title *</label>
            <input type="text" required value={notificationForm.title} onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" placeholder="Maintenance Alert" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Alert Severity Level</label>
            <select value={notificationForm.type} onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value as any })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
              <option value="info">Info (Blue)</option>
              <option value="success">Success (Green)</option>
              <option value="warning">Warning (Yellow)</option>
              <option value="error">Error/Danger (Red)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Message *</label>
            <textarea required value={notificationForm.message} onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm h-24 outline-none resize-none" placeholder="Alert details..." />
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
