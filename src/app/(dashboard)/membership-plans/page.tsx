"use client";

import { useState } from "react";
import { useApp, MembershipPlan, Member } from "@/lib/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Check, Star, Plus, Edit, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function MembershipPlansPage() {
  const { plans, members, addPlan, updatePlan, deletePlan, updateMember, addPayment, settings } = useApp();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);

  // Form States for Plan
  const [planForm, setPlanForm] = useState({
    name: "",
    price: 0,
    durationMonths: 1,
    description: "",
    status: "Active" as "Active" | "Inactive"
  });

  // Form States for Renewal
  const [renewForm, setRenewForm] = useState({
    memberId: "",
    planId: "",
    paymentMethod: "Card" as "Cash" | "Card" | "UPI" | "Bank Transfer"
  });

  const getMemberCount = (planId: string) => {
    return members.filter(m => m.planId === planId).length;
  };

  const handleOpenCreate = () => {
    setPlanForm({ name: "", price: 0, durationMonths: 1, description: "", status: "Active" });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
    setPlanForm({
      name: plan.name,
      price: plan.price,
      durationMonths: plan.durationMonths,
      description: plan.description,
      status: plan.status
    });
    setIsEditOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPlan(planForm);
    setIsCreateOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlan) {
      updatePlan(selectedPlan.id, planForm);
      setIsEditOpen(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this membership plan?")) {
      deletePlan(id);
    }
  };

  const handleOpenRenew = (planId: string) => {
    setRenewForm({
      memberId: "",
      planId: planId,
      paymentMethod: "Card"
    });
    setIsRenewOpen(true);
  };

  const handleRenewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { memberId, planId, paymentMethod } = renewForm;
    const member = members.find(m => m.id === memberId);
    const plan = plans.find(p => p.id === planId);

    if (!member || !plan) {
      toast.error("Please select a valid member and plan");
      return;
    }

    // Calculate new expiry date from join date or today
    const currentExpiry = new Date(member.expiryDate);
    const startRenewal = currentExpiry > new Date() ? currentExpiry : new Date();
    startRenewal.setMonth(startRenewal.getMonth() + plan.durationMonths);
    const newExpiryDate = startRenewal.toISOString().split("T")[0];

    // Update Member details
    updateMember(member.id, {
      planId: plan.id,
      expiryDate: newExpiryDate,
      status: "Active"
    });

    // Add Payment Record
    addPayment({
      memberId: member.id,
      memberName: member.name,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      date: new Date().toISOString().split("T")[0],
      method: paymentMethod,
      status: "Paid"
    });

    toast.success(`Membership renewed successfully! New Expiry: ${newExpiryDate}`);
    setIsRenewOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Membership Plans</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage pricing plans, packages, subscriptions, and renewals.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsRenewOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            <RefreshCw size={16} />
            Renew Member
          </Button>
          <Button onClick={handleOpenCreate} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus size={16} />
            Create Plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-4">
        {plans.map((plan) => {
          const count = getMemberCount(plan.id);
          const isVip = plan.name.toLowerCase().includes("vip");
          const isPro = plan.name.toLowerCase().includes("pro");
          return (
            <div key={plan.id} className={`relative flex flex-col rounded-3xl border ${isPro ? 'border-2 border-blue-500 shadow-xl' : 'border-slate-200 dark:border-slate-850 shadow-sm'} bg-white dark:bg-slate-900 overflow-hidden transition-transform hover:-translate-y-2 duration-300`}>
              {isPro && (
                <div className="absolute top-0 inset-x-0 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider py-1.5 text-center flex items-center justify-center gap-1">
                  Most Popular
                </div>
              )}
              
              <div className={`p-8 ${isPro ? 'pt-12' : ''} border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50`}>
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">{plan.name}</h3>
                  <Badge variant={plan.status === "Active" ? "success" : "danger"}>
                    {plan.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 h-8">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{settings.currency}{plan.price}</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/ {plan.durationMonths} Mo</span>
                </div>
              </div>
              
              <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
                <div>
                  <div className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Subscription Metrics</div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-350">
                    Active Subscribers: <strong className="text-slate-900 dark:text-white font-bold">{count} members</strong>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Button onClick={() => handleOpenRenew(plan.id)} variant={isPro ? "primary" : "outline"} className="w-full h-10 text-xs font-semibold rounded-xl">
                    Renew Member Subscription
                  </Button>
                  <div className="flex gap-2">
                    <Button onClick={() => handleOpenEdit(plan)} variant="ghost" className="w-full text-xs gap-1.5"><Edit size={12} /> Edit</Button>
                    <Button onClick={() => handleDelete(plan.id)} variant="ghost" className="w-full text-xs text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1.5"><Trash2 size={12} /> Delete</Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Plan Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Membership Plan">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plan Name *</label>
            <input type="text" required value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" placeholder="e.g. Bronze Standard" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Price ({settings.currency}) *</label>
              <input type="number" required value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Duration (Months) *</label>
              <input type="number" required value={planForm.durationMonths} onChange={(e) => setPlanForm({ ...planForm, durationMonths: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm h-16 resize-none outline-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Plan</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Plan Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Plan Details">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plan Name *</label>
            <input type="text" required value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Price ({settings.currency}) *</label>
              <input type="number" required value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Duration (Months) *</label>
              <input type="number" required value={planForm.durationMonths} onChange={(e) => setPlanForm({ ...planForm, durationMonths: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
            <textarea value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm h-16 resize-none outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
            <select value={planForm.status} onChange={(e) => setPlanForm({ ...planForm, status: e.target.value as any })} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Renew Member Subscription Modal */}
      <Modal isOpen={isRenewOpen} onClose={() => setIsRenewOpen(false)} title="Renew Member Subscription Plan">
        <form onSubmit={handleRenewSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Member *</label>
            <select 
              required 
              value={renewForm.memberId} 
              onChange={(e) => setRenewForm({ ...renewForm, memberId: e.target.value })} 
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
            >
              <option value="">Select Member</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.id}) - Expires: {m.expiryDate}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Plan *</label>
            <select 
              required 
              value={renewForm.planId} 
              onChange={(e) => setRenewForm({ ...renewForm, planId: e.target.value })} 
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
            >
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({settings.currency}{p.price})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Payment Method</label>
            <select 
              value={renewForm.paymentMethod} 
              onChange={(e) => setRenewForm({ ...renewForm, paymentMethod: e.target.value as any })} 
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm outline-none"
            >
              <option value="Card">Card</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsRenewOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Process Renewal</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
