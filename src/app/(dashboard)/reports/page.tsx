"use client";

import { useApp } from "@/lib/context/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatIndianNumber } from "@/lib/utils";
import { BarChart3, TrendingUp, TrendingDown, Users, Calendar, Download, RefreshCw, Star, CreditCard, Receipt, Dumbbell } from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const { members, trainers, payments, expenses, attendance, plans, settings } = useApp();

  // 1. Financial & Member Calculations
  const newMembersCount = members.length;
  
  const totalRevenue = payments
    .filter((p) => p.status === "Paid")
    .reduce((acc, p) => acc + p.amount, 0);

  const membershipRevenue = payments
    .filter((p) => p.status === "Paid")
    .reduce((acc, p) => acc + (p.membershipAmount !== undefined ? p.membershipAmount : p.amount), 0);

  const ptRevenue = payments
    .filter((p) => p.status === "Paid")
    .reduce((acc, p) => acc + (p.ptAmount || 0), 0);

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const avgAttendance = attendance.length > 0
    ? Math.round(attendance.filter((a) => a.status === "Present").length / (Array.from(new Set(attendance.map((a) => a.date))).length || 1))
    : 0;
  
  // Trainer performance data (clients assigned)
  const trainerData = trainers.map((t) => {
    const clients = members.filter((m) => m.trainerId === t.id).length;
    return { name: t.name, type: t.trainerType, clients, ptCharges: t.ptCharges };
  });

  // Payment Analytics (method distribution)
  const methodCounts = payments.reduce((acc: Record<string, number>, p) => {
    acc[p.method] = (acc[p.method] || 0) + p.amount;
    return acc;
  }, {});

  // Expense by Category distribution
  const expenseCategoryCounts = expenses.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
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
    let csv = "Report,Gymation Financial & Operations Summary\n";
    csv += `Total New Members,${newMembersCount}\n`;
    csv += `Total Revenue,${formatCurrency(totalRevenue)}\n`;
    csv += `Membership Revenue,${formatCurrency(membershipRevenue)}\n`;
    csv += `PT Revenue,${formatCurrency(ptRevenue)}\n`;
    csv += `Total Expenses,${formatCurrency(totalExpenses)}\n`;
    csv += `Net Profit,${formatCurrency(netProfit)}\n`;
    csv += `Avg Daily Attendance,${avgAttendance}\n\n`;
    csv += "Trainer Performance:\nTrainer Name,Role,Assigned Clients,PT Charges (INR)\n";
    trainerData.forEach((t) => {
      csv += `"${t.name}","${t.type}",${t.clients},${t.ptCharges}\n`;
    });
    triggerDownload("Gymation_Report.csv", csv, "text/csv");
  };

  const handleExportExcel = () => {
    let excel = "Gymation Analytics Summary Report\r\n";
    excel += `Date Created: \t${new Date().toLocaleDateString()}\r\n\r\n`;
    excel += `Metric\tValue\r\n`;
    excel += `Total Revenue\t${formatCurrency(totalRevenue)}\r\n`;
    excel += `Membership Revenue\t${formatCurrency(membershipRevenue)}\r\n`;
    excel += `PT Revenue\t${formatCurrency(ptRevenue)}\r\n`;
    excel += `Total Expenses\t${formatCurrency(totalExpenses)}\r\n`;
    excel += `Net Profit\t${formatCurrency(netProfit)}\r\n`;
    excel += `New Members\t${newMembersCount}\r\n`;
    excel += `Daily Active\t${avgAttendance}\r\n`;
    triggerDownload("Gymation_Report.xls", excel, "application/vnd.ms-excel");
  };

  const handleExportPDF = () => {
    toast.success("Preparing PDF document... (Print simulation)");
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Detailed financial summary, revenue vs expenses, net profit, and operations metrics in INR (₹).
          </p>
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

      {/* Financial Summary & Core Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
              <CreditCard size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Revenue</p>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                {formatCurrency(totalRevenue)}
              </h4>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center mt-1 font-semibold">
                Membership + PT combined
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
              <Receipt size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Expenses</p>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                {formatCurrency(totalExpenses)}
              </h4>
              <p className="text-[10px] text-rose-600 dark:text-rose-400 flex items-center mt-1 font-semibold">
                {expenses.length} expense transactions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${netProfit >= 0 ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400" : "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400"}`}>
              {netProfit >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Net Profit</p>
              <h4 className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {formatCurrency(netProfit)}
              </h4>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                Revenue - Expenses
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Gym Members</p>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{newMembersCount}</h4>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center mt-1 font-semibold">
                {avgAttendance} avg daily visits
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown: Base Membership vs PT Fees */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Revenue Stream Composition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><CreditCard size={14} className="text-blue-500" /> Membership Subscriptions</span>
                <span>{formatCurrency(membershipRevenue)} ({totalRevenue > 0 ? Math.round((membershipRevenue / totalRevenue) * 100) : 0}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totalRevenue > 0 ? (membershipRevenue / totalRevenue) * 100 : 0}%` }}></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><Dumbbell size={14} className="text-purple-500" /> Personal Training (PT) Charges</span>
                <span>{formatCurrency(ptRevenue)} ({totalRevenue > 0 ? Math.round((ptRevenue / totalRevenue) * 100) : 0}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${totalRevenue > 0 ? (ptRevenue / totalRevenue) * 100 : 0}%` }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(expenseCategoryCounts).slice(0, 4).map(([category, amt]) => {
              const pct = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0;
              return (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>{category}</span>
                    <span>{formatCurrency(amt)} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
            {Object.keys(expenseCategoryCounts).length === 0 && (
              <p className="text-slate-400 text-xs py-6 text-center">No expense items recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Analytics bar list */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Revenue Contribution by Payment Method</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(methodCounts).map(([method, amt]) => {
              const pct = totalRevenue > 0 ? Math.round((amt / totalRevenue) * 100) : 0;
              return (
                <div key={method} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-350">
                    <span>{method}</span>
                    <span>{formatCurrency(amt)} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Trainer Performance clients counts */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Coach Client Roster Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {trainerData.map((t) => {
              const pct = members.length > 0 ? Math.round((t.clients / members.length) * 100) : 0;
              return (
                <div key={t.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-650 dark:text-slate-355">
                    <span>{t.name} ({t.type || "Trainer"})</span>
                    <span>{t.clients} Clients ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
