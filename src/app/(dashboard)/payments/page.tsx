"use client";

import { useState } from "react";
import { useApp, Payment } from "@/lib/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { DollarSign, Download, ArrowUpRight, CreditCard, Search, X, Printer, Receipt } from "lucide-react";
import { toast } from "sonner";

export default function PaymentsPage() {
  const { payments, members, plans, addPayment, settings } = useApp();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Payment | null>(null);
  const [isCollectOpen, setIsCollectOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    memberId: "",
    amount: 0,
    method: "Card" as Payment["method"],
    status: "Paid" as Payment["status"]
  });

  // Calculate Metrics
  const totalRevenue = payments.reduce((acc, p) => p.status === "Paid" ? acc + p.amount : acc, 0);
  const pendingRevenue = payments.reduce((acc, p) => p.status === "Pending" ? acc + p.amount : acc, 0);
  const failedRevenue = payments.reduce((acc, p) => p.status === "Failed" ? acc + p.amount : acc, 0);

  // Filter Search
  const filteredPayments = payments.filter((p) => {
    const matchesSearch = p.memberName.toLowerCase().includes(search.toLowerCase()) || 
                          p.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCollect = () => {
    setFormData({
      memberId: "",
      amount: 0,
      method: "Card",
      status: "Paid"
    });
    setIsCollectOpen(true);
  };

  const handleMemberSelect = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    const plan = plans.find(p => p.id === member?.planId);
    setFormData(prev => ({
      ...prev,
      memberId,
      amount: plan ? plan.price : 0
    }));
  };

  const handleCollectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const member = members.find(m => m.id === formData.memberId);
    const plan = plans.find(p => p.id === member?.planId);
    
    if (!member) {
      toast.error("Please select a member");
      return;
    }

    addPayment({
      memberId: member.id,
      memberName: member.name,
      planId: plan?.id || "",
      planName: plan?.name || "Premium Plan",
      amount: formData.amount,
      date: new Date().toISOString().split("T")[0],
      method: formData.method,
      status: formData.status
    });

    setIsCollectOpen(false);
  };

  const handleDownloadInvoice = (invoice: Payment) => {
    toast.success(`Downloading invoice ${invoice.id}... (PDF Simulation)`);
    
    // Simulate invoice text compilation
    const invoiceContent = `
========================================
             ${settings.gymName.toUpperCase()}
========================================
Invoice ID: ${invoice.id}
Date: ${invoice.date}
Status: ${invoice.status.toUpperCase()}

BILL TO:
Member Name: ${invoice.memberName}
Member ID: ${invoice.memberId}

DESCRIPTION:
Plan: ${invoice.planName}
Payment Method: ${invoice.method}

Subtotal: ${settings.currency}${invoice.amount}
Tax Rate: ${settings.taxRate}%
Total Amount: ${settings.currency}${(invoice.amount * (1 + settings.taxRate / 100)).toFixed(2)}

Thank you for your business!
========================================
    `;

    const blob = new Blob([invoiceContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `Invoice_${invoice.id}.txt`);
    a.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Payments Console</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage billing, invoices, revenue flow, and receipts.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleOpenCollect} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <DollarSign size={16} />
            Collect Payment
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-0 shadow-lg relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-emerald-100 font-medium text-sm">Total Revenue (Paid)</p>
                <h3 className="text-3xl font-extrabold mt-2">{settings.currency}{totalRevenue.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-white/10 rounded-xl">
                <DollarSign size={24} className="text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-100">
              <span className="bg-white/15 px-2 py-0.5 rounded-full text-xs font-semibold">Active</span>
              <span>Updated just now</span>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm border border-slate-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm font-semibold">Pending Payments</p>
                <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-2">{settings.currency}{pendingRevenue.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                <CreditCard size={24} />
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide">
              Needs Immediate Collection
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm border border-slate-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm font-semibold">Failed/Declined Transactions</p>
                <h3 className="text-3xl font-extrabold text-slate-800 dark:text-white mt-2">{settings.currency}{failedRevenue.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-xl">
                <X size={24} />
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wide">
              Failed Gateways & UPI issues
            </div>
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
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400 py-6">No payments match the search criteria.</TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id} className="dark:border-slate-800">
                    <TableCell className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{payment.id}</TableCell>
                    <TableCell className="font-medium text-slate-800 dark:text-slate-200">{payment.memberName}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-450 text-sm">{payment.date}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-450 text-sm">{payment.method}</TableCell>
                    <TableCell className="font-extrabold text-slate-700 dark:text-slate-300">{settings.currency}{payment.amount}</TableCell>
                    <TableCell>
                      <Badge variant={
                        payment.status === "Paid" ? "success" : 
                        payment.status === "Pending" ? "warning" : "danger"
                      }>
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
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Gym Member *</label>
            <select 
              required 
              value={formData.memberId} 
              onChange={(e) => handleMemberSelect(e.target.value)} 
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
            >
              <option value="">Select Member</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount ({settings.currency}) *</label>
              <input 
                type="number" 
                required 
                value={formData.amount} 
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Method</label>
              <select 
                value={formData.method} 
                onChange={(e) => setFormData({ ...formData, method: e.target.value as any })} 
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
              >
                <option value="Card">Card</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Transaction Status</label>
            <select 
              value={formData.status} 
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} 
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
            >
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCollectOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">Record Invoice</Button>
          </div>
        </form>
      </Modal>

      {/* Invoice Receipt Modal Preview */}
      <Modal isOpen={selectedInvoice !== null} onClose={() => setSelectedInvoice(null)} title="Invoice Receipt Details">
        {selectedInvoice && (
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
                <p className="font-semibold text-slate-800 dark:text-white mt-1">{selectedInvoice.id}</p>
                <p className="text-xs text-slate-500">{selectedInvoice.date}</p>
              </div>
            </div>

            <div className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden text-sm">
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 font-bold flex justify-between">
                <span>Description</span>
                <span>Subtotal</span>
              </div>
              <div className="px-4 py-3 flex justify-between border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{selectedInvoice.planName}</p>
                  <p className="text-xs text-slate-500">Duration Monthly Access via {selectedInvoice.method}</p>
                </div>
                <span className="font-bold">{settings.currency}{selectedInvoice.amount}</span>
              </div>
              <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal</span>
                  <span>{settings.currency}{selectedInvoice.amount}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Tax Rate ({settings.taxRate}%)</span>
                  <span>{settings.currency}{(selectedInvoice.amount * settings.taxRate / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-1.5">
                  <span>Total Amount Paid</span>
                  <span>{settings.currency}{(selectedInvoice.amount * (1 + settings.taxRate / 100)).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Badge variant={selectedInvoice.status === "Paid" ? "success" : "danger"} className="text-sm px-3 py-1">
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
        )}
      </Modal>
    </div>
  );
}
