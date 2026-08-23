"use client";

import { useState } from "react";
import { useApp, Payment } from "@/lib/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency, formatIndianNumber } from "@/lib/utils";
import { Download, ArrowUpRight, CreditCard, Search, X, Printer, Receipt, Dumbbell, Clock } from "lucide-react";
import { toast } from "sonner";

export default function PaymentsPage() {
  const { payments, members, plans, trainers, addPayment, updatePayment, settings } = useApp();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Payment | null>(null);
  const [isCollectOpen, setIsCollectOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    memberId: string;
    membershipAmount: string;
    ptAmount: string;
    method: Payment["method"];
    status: Payment["status"];
    notes: string;
  }>({
    memberId: "",
    membershipAmount: "0",
    ptAmount: "0",
    method: "Card",
    status: "Paid",
    notes: "",
  });

  // Calculate Metrics
  const totalRevenue = payments
    .filter((p) => p.status === "Paid")
    .reduce((acc, p) => acc + p.amount, 0);

  const membershipRevenue = payments
    .filter((p) => p.status === "Paid")
    .reduce((acc, p) => acc + (p.membershipAmount !== undefined ? p.membershipAmount : p.amount), 0);

  const ptRevenue = payments
    .filter((p) => p.status === "Paid")
    .reduce((acc, p) => acc + (p.ptAmount || 0), 0);

  const pendingRevenue = payments
    .filter((p) => p.status === "Pending" || p.status === "Overdue" || p.status === "Partial")
    .reduce((acc, p) => acc + p.amount, 0);

  // Filter Search
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.memberName.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.memberId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCollect = () => {
    setFormData({
      memberId: "",
      membershipAmount: "0",
      ptAmount: "0",
      method: "Card",
      status: "Paid",
      notes: "",
    });
    setIsCollectOpen(true);
  };

  const handleMemberSelect = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    const plan = plans.find((p) => p.id === member?.planId);
    const trainer = trainers.find((t) => t.id === member?.trainerId);

    const mFee = plan ? plan.price : 0;
    const ptFee = trainer
      ? (trainer.trainerType === "General Trainer" ? 0 : (trainer.ptCharges || 0))
      : 0;

    setFormData((prev) => ({
      ...prev,
      memberId,
      membershipAmount: String(mFee),
      ptAmount: String(ptFee),
      notes: `Billing collection for ${member?.name || "Member"} (${plan?.name || "Plan"}${trainer ? ` + ${trainer.name}` : ""})`,
    }));
  };

  const formMemAmount = parseFloat(formData.membershipAmount) || 0;
  const formPtAmount = parseFloat(formData.ptAmount) || 0;
  const formTotalAmount = formMemAmount + formPtAmount;

  const handleCollectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const member = members.find((m) => m.id === formData.memberId);
    const plan = plans.find((p) => p.id === member?.planId);

    if (!member) {
      toast.error("Please select a valid gym member");
      return;
    }

    if (formMemAmount < 0 || formPtAmount < 0) {
      toast.error("Payment amounts cannot be negative");
      return;
    }

    if (formTotalAmount <= 0) {
      toast.error("Total payment amount must be greater than 0");
      return;
    }

    addPayment({
      memberId: member.id,
      memberName: member.name,
      planId: plan?.id || "",
      planName: plan?.name || "Premium Plan",
      membershipAmount: formMemAmount,
      ptAmount: formPtAmount,
      amount: formTotalAmount,
      date: new Date().toISOString().split("T")[0],
      method: formData.method,
      status: formData.status,
      notes: formData.notes.trim() || undefined,
    });

    setIsCollectOpen(false);
  };

  const handleExportCSV = () => {
    if (payments.length === 0) {
      toast.error("No payment data to export");
      return;
    }
    const headers = "Invoice ID,Member ID,Member Name,Plan Name,Membership Fee (INR),PT Fee (INR),Total Amount (INR),Payment Date,Payment Method,Status,Notes\n";
    const rows = filteredPayments
      .map(
        (p) =>
          `"${p.id}","${p.memberId}","${p.memberName}","${p.planName}",${p.membershipAmount !== undefined ? p.membershipAmount : p.amount},${p.ptAmount || 0},${p.amount},"${p.date}","${p.method}","${p.status}","${(p.notes || "").replace(/"/g, '""')}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `Gym_Payments_${new Date().toISOString().split("T")[0]}.csv`);
    a.click();
    toast.success("Payments exported to CSV successfully!");
  };

  const handleDownloadInvoice = (invoice: Payment) => {
    toast.success(`Preparing printable PDF invoice for ${invoice.id}...`);
    window.print();
  };

  const getStatusBadgeVariant = (status: Payment["status"]) => {
    switch (status) {
      case "Paid":
        return "success";
      case "Pending":
      case "Partial":
        return "warning";
      case "Overdue":
      case "Failed":
        return "danger";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Payments Console</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage billing, invoices, Membership vs PT fee splits in INR (₹), and receipts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 border-slate-200 dark:border-slate-800 dark:text-slate-300" onClick={handleExportCSV}>
            <Download size={16} />
            Export CSV
          </Button>
          <Button onClick={handleOpenCollect} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <CreditCard size={16} />
            Collect Payment
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-0 shadow-lg relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-emerald-100 font-medium text-xs uppercase tracking-wide">Total Revenue (Paid)</p>
                <h3 className="text-2xl font-extrabold mt-1">{formatCurrency(totalRevenue)}</h3>
              </div>
              <div className="p-2.5 bg-white/10 rounded-xl">
                <CreditCard size={20} className="text-white" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-100">
              <span className="bg-white/15 px-2 py-0.5 rounded-full text-[10px] font-semibold">Active Inflow</span>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm border border-slate-100">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide">Membership Revenue</p>
                <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {formatCurrency(membershipRevenue)}
                </h3>
              </div>
              <div className="p-2.5 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                <CreditCard size={20} />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-3 font-semibold">Base subscription fees</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm border border-slate-100">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide">Personal Training (PT)</p>
                <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {formatCurrency(ptRevenue)}
                </h3>
              </div>
              <div className="p-2.5 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-xl">
                <Dumbbell size={20} />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-3 font-semibold">Trainer charge revenue</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm border border-slate-100">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wide">Pending / Overdue</p>
                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {formatCurrency(pendingRevenue)}
                </h3>
              </div>
              <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                <Clock size={20} />
              </div>
            </div>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-3 font-semibold">Outstanding collections</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 rounded-t-2xl">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:text-sm shadow-sm transition-all"
              placeholder="Search by invoice ID or member name..."
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
              <option value="Overdue">Overdue</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="dark:border-slate-800">
                <TableHead>Invoice ID</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Membership Fee</TableHead>
                <TableHead>PT Fee</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-400 py-6">
                    No payments match the search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id} className="dark:border-slate-800">
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100 text-sm font-mono">
                      {payment.id}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">{payment.memberName}</div>
                        <div className="text-xs text-slate-400 font-mono">{payment.memberId}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 text-sm">{payment.date}</TableCell>
                    <TableCell className="font-medium text-blue-600 dark:text-blue-400">
                      {formatCurrency(payment.membershipAmount !== undefined ? payment.membershipAmount : payment.amount)}
                    </TableCell>
                    <TableCell className="font-medium text-purple-600 dark:text-purple-400">
                      {formatCurrency(payment.ptAmount || 0)}
                    </TableCell>
                    <TableCell className="font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                        {payment.method}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        onClick={() => setSelectedInvoice(payment)}
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-xs font-semibold gap-1.5"
                      >
                        <Receipt size={14} /> Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Collect Payment Modal */}
      <Modal isOpen={isCollectOpen} onClose={() => setIsCollectOpen(false)} title="Record Billing Payment">
        <form onSubmit={handleCollectSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Member *</label>
            <select 
              required 
              value={formData.memberId} 
              onChange={(e) => handleMemberSelect(e.target.value)} 
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
            >
              <option value="">Select Member</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Membership Fee (₹)</label>
              <input 
                type="number" 
                min="0"
                step="any"
                required 
                value={formData.membershipAmount} 
                onChange={(e) => setFormData({ ...formData, membershipAmount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Personal Training Fee (₹)</label>
              <input 
                type="number" 
                min="0"
                step="any"
                required 
                value={formData.ptAmount} 
                onChange={(e) => setFormData({ ...formData, ptAmount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" 
              />
            </div>
          </div>

          {/* Live Total Calculation Preview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
            <span className="text-slate-500">Calculated Total:</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(formTotalAmount)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Method</label>
              <select 
                value={formData.method} 
                onChange={(e) => setFormData({ ...formData, method: e.target.value as Payment["method"] })} 
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              >
                <option value="Card">Card</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Transaction Status</label>
              <select 
                value={formData.status} 
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Payment["status"] })} 
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Overdue">Overdue</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Notes / Memo</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              placeholder="e.g. Plan renewal + PT session"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCollectOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Record Invoice</Button>
          </div>
        </form>
      </Modal>

      {/* Invoice Receipt Modal Preview */}
      <Modal isOpen={selectedInvoice !== null} onClose={() => setSelectedInvoice(null)} title="Invoice Receipt Details">
        {selectedInvoice && (() => {
          const memAmt = selectedInvoice.membershipAmount !== undefined ? selectedInvoice.membershipAmount : selectedInvoice.amount;
          const ptAmt = selectedInvoice.ptAmount || 0;
          const taxAmt = Number((selectedInvoice.amount * settings.taxRate / 100).toFixed(2));
          const grandTotal = Number((selectedInvoice.amount + taxAmt).toFixed(2));

          return (
            <div className="space-y-6">
              <div className="border-b border-dashed border-slate-200 dark:border-slate-800 pb-4 text-center">
                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{settings.gymName}</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{settings.address}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{settings.phone}</p>
              </div>

              <div className="flex justify-between items-start text-sm">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Bill To</p>
                  <p className="font-semibold text-slate-800 dark:text-white mt-1">{selectedInvoice.memberName}</p>
                  <p className="text-xs text-slate-500 font-mono">ID: {selectedInvoice.memberId}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Receipt Reference</p>
                  <p className="font-semibold text-slate-800 dark:text-white mt-1 font-mono">{selectedInvoice.id}</p>
                  <p className="text-xs text-slate-500">{selectedInvoice.date}</p>
                </div>
              </div>

              <div className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden text-sm">
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 font-bold flex justify-between text-xs uppercase text-slate-500">
                  <span>Item Description</span>
                  <span>Amount</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="px-4 py-2.5 flex justify-between">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white text-xs">{selectedInvoice.planName} (Membership Fee)</p>
                      <p className="text-[11px] text-slate-400">Gym facility access</p>
                    </div>
                    <span className="font-bold text-xs">{formatCurrency(memAmt)}</span>
                  </div>

                  {ptAmt > 0 && (
                    <div className="px-4 py-2.5 flex justify-between">
                      <div>
                        <p className="font-semibold text-purple-700 dark:text-purple-300 text-xs">Personal Training (PT) Charges</p>
                        <p className="text-[11px] text-slate-400">Dedicated trainer coaching session</p>
                      </div>
                      <span className="font-bold text-xs text-purple-600 dark:text-purple-400">{formatCurrency(ptAmt)}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedInvoice.amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>GST / Tax ({settings.taxRate}%)</span>
                    <span>{formatCurrency(taxAmt)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-1.5">
                    <span>Total Amount</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {selectedInvoice.notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                  <strong>Notes:</strong> {selectedInvoice.notes}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Badge variant={getStatusBadgeVariant(selectedInvoice.status)} className="text-sm px-3 py-1">
                  {selectedInvoice.status}
                </Badge>
                <div className="flex gap-2">
                  <Button onClick={() => window.print()} variant="outline" className="gap-1.5 dark:border-slate-800 dark:text-slate-300">
                    <Printer size={14} /> Print
                  </Button>
                  <Button onClick={() => handleDownloadInvoice(selectedInvoice)} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                    <Download size={14} /> Download PDF
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
