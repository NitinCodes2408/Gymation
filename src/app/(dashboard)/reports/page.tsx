"use client";

import { useApp } from "@/lib/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Download, RefreshCw, Star, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const { members, trainers, payments, attendance, plans, settings } = useApp();

  // 1. Calculations
  const newMembersCount = members.length;
  const netRevenue = payments.reduce((acc, p) => p.status === "Paid" ? acc + p.amount : acc, 0);
  const avgAttendance = attendance.length > 0 ? Math.round(attendance.filter(a => a.status === "Present").length / Array.from(new Set(attendance.map(a => a.date))).length) : 0;
  
  // Trainer performance data (clients assigned)
  const trainerData = trainers.map(t => {
    const clients = members.filter(m => m.trainerId === t.id).length;
    return { name: t.name, clients };
  });

  // Payment Analytics (method distribution)
  const methodCounts = payments.reduce((acc: Record<string, number>, p) => {
    acc[p.method] = (acc[p.method] || 0) + p.amount;
    return acc;
  }, {});

  // EXPORT SIMULATION FUNCTIONS
  const triggerDownload = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", filename);
    a.click();
    toast.success(`${filename} exported successfully!`);
  };

  const handleExportCSV = () => {
    let csv = "Report,Gymation Analytics Summary\n";
    csv += `Total New Members,${newMembersCount}\n`;
    csv += `Net Revenue,${settings.currency}${netRevenue}\n`;
    csv += `Avg Daily Attendance,${avgAttendance}\n\n`;
    csv += "Trainer Performance:\nTrainer Name,Assigned Clients\n";
    trainerData.forEach(t => {
      csv += `"${t.name}",${t.clients}\n`;
    });
    triggerDownload("Gymation_Report.csv", csv, "text/csv");
  };

  const handleExportExcel = () => {
    // Excel XML mock or tab-delimited file
    let excel = "Gymation Analytics Summary Report\r\n";
    excel += `Date Created: \t${new Date().toLocaleDateString()}\r\n\r\n`;
    excel += `Metric\tValue\r\n`;
    excel += `Net Revenue\t${settings.currency}${netRevenue}\r\n`;
    excel += `New Members\t${newMembersCount}\r\n`;
    excel += `Daily Active\t${avgAttendance}\r\n`;
    triggerDownload("Gymation_Report.xls", excel, "application/vnd.ms-excel");
  };

  const handleExportPDF = () => {
    toast.success("Preparing PDF document... (Bi-printing simulation)");
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Detailed real-time insights into your gym's key metrics.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1.5 text-xs dark:border-slate-850 dark:text-slate-350" onClick={handleExportCSV}>
            <Download size={14} /> CSV
          </Button>
          <Button variant="outline" className="gap-1.5 text-xs dark:border-slate-850 dark:text-slate-350" onClick={handleExportExcel}>
            <Download size={14} /> Excel
          </Button>
          <Button className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={handleExportPDF}>
            <Download size={14} /> Print PDF
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">New Member Registrations</p>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{newMembersCount}</h4>
              <p className="text-[10px] text-green-600 dark:text-green-400 flex items-center mt-1 font-semibold">
                <TrendingUp size={12} className="mr-1" /> +100% (Real time)
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Net Revenue Generated</p>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{settings.currency}{netRevenue.toLocaleString()}</h4>
              <p className="text-[10px] text-green-600 dark:text-green-400 flex items-center mt-1 font-semibold">
                <TrendingUp size={12} className="mr-1" /> Revenue streaming active
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Avg Daily Attendance</p>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{avgAttendance}</h4>
              <p className="text-[10px] text-green-600 dark:text-green-400 flex items-center mt-1 font-semibold">
                <TrendingUp size={12} className="mr-1" /> rollcall verified
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
              <Star size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Fitness Coaches</p>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{trainers.length}</h4>
              <p className="text-[10px] text-slate-400 flex items-center mt-1 font-semibold">
                Client assignments ready
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Analytics bar list */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Revenue Contribution by Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(methodCounts).map(([method, amt]) => {
              const pct = netRevenue > 0 ? Math.round((amt / netRevenue) * 100) : 0;
              return (
                <div key={method} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-350">
                    <span>{method}</span>
                    <span>{settings.currency}{amt} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
            {Object.keys(methodCounts).length === 0 && (
              <p className="text-slate-400 text-xs py-6 text-center">No payment transactions recorded.</p>
            )}
          </CardContent>
        </Card>

        {/* Trainer Performance clients counts */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Coach Performance (Assigned Clients)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {trainerData.map((t) => {
              const pct = members.length > 0 ? Math.round((t.clients / members.length) * 100) : 0;
              return (
                <div key={t.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-355">
                    <span>{t.name}</span>
                    <span>{t.clients} Clients ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
            {trainerData.length === 0 && (
              <p className="text-slate-400 text-xs py-6 text-center">No coaches onboarded.</p>
            )}
          </CardContent>
        </Card>

        {/* Plan subscriptions distribution */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Membership Subscription Splits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {plans.map(p => {
              const clients = members.filter(m => m.planId === p.id).length;
              const pct = members.length > 0 ? Math.round((clients / members.length) * 100) : 0;
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-350">
                    <span>{p.name}</span>
                    <span>{clients} Subscribers ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Attendance trends */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Monthly Attendance Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40 flex items-end justify-between gap-1.5 pb-4">
              {[30, 45, 55, 60, 50, 75, 80, 70, 95, 85].map((h, i) => (
                <div key={i} className="w-full bg-blue-100 dark:bg-blue-950/20 rounded-t-sm hover:bg-blue-200 transition-colors relative group" style={{ height: `${h}%` }}>
                  <div className="absolute inset-x-0 bottom-0 bg-blue-500 rounded-t-sm w-full transition-all group-hover:opacity-90" style={{ height: `${h}%` }}></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] font-semibold text-slate-450 border-t border-slate-100 dark:border-slate-800 pt-3">
              <span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
