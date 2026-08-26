"use client";

import { useState } from "react";
import { useApp } from "@/lib/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, Save, X, Dumbbell, CreditCard } from "lucide-react";
import { formatCurrency, formatIndianNumber } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AddMemberPage() {
  const router = useRouter();
  const { plans, trainers, addMember, addPayment, settings } = useApp();

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    gender: "male",
    dob: "",
    address: "",
    emergencyContact: "",
    planId: "",
    trainerId: "",
    notes: ""
  });

  const activePlanId = formData.planId || plans[0]?.id || "";
  const selectedPlan = plans.find((p) => p.id === activePlanId);
  const selectedTrainer = trainers.find((t) => t.id === formData.trainerId);

  const membershipFee = selectedPlan ? selectedPlan.price : 0;
  const ptFee = selectedTrainer
    ? (selectedTrainer.trainerType === "General Trainer" ? 0 : (selectedTrainer.ptCharges || 0))
    : 0;
  const totalAmount = membershipFee + ptFee;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (plans.length === 0) {
      toast.error("Please create at least one membership plan before registering a member.");
      return;
    }

    const plan = selectedPlan || plans[0];
    const duration = plan ? plan.durationMonths : 1;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + duration);

    const newMemberId = `M-${Math.floor(1000 + Math.random() * 9000)}`;

    addMember({
      name: formData.name,
      mobile: formData.mobile,
      email: formData.email,
      gender: formData.gender,
      dob: formData.dob ? formData.dob.trim() : "",
      address: formData.address,
      emergencyContact: formData.emergencyContact,
      planId: plan.id,
      trainerId: formData.trainerId,
      joinDate: new Date().toISOString().split("T")[0],
      expiryDate: expiry.toISOString().split("T")[0],
      status: "Active",
      photo: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=256&h=256&q=80",
      notes: formData.notes
    });

    // Create itemized payment in INR
    if (plan) {
      addPayment({
        memberId: newMemberId,
        memberName: formData.name,
        planId: plan.id,
        planName: plan.name,
        membershipAmount: membershipFee,
        ptAmount: ptFee,
        amount: totalAmount,
        date: new Date().toISOString().split("T")[0],
        method: "Cash",
        status: "Paid",
        notes: `Initial registration fee: Membership (${formatCurrency(membershipFee)}) + PT (${formatCurrency(ptFee)})`
      });
    }

    router.push("/members");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/members">
          <button className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
            <ArrowLeft size={18} className="text-slate-600 dark:text-slate-400" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Add New Member</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Register a new member and calculate billing plan and PT charges in INR (₹).</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name *</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                  placeholder="Rahul Sharma" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mobile Number *</label>
                <input 
                  type="tel" 
                  required 
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                  placeholder="+91 98765 00000" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                  placeholder="rahul@example.com" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
                  <select 
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date of Birth</label>
                  <input 
                    type="date" 
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Address</label>
              <textarea 
                rows={2} 
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none" 
                placeholder="123 Gym Road, Mumbai, Maharashtra" 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Emergency Contact</label>
              <input 
                type="text" 
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                placeholder="Name - Relationship - Phone Number" 
              />
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="dark:text-slate-100">Membership & Trainer Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Membership Plan *</label>
                {plans.length === 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">No membership plans created yet.</span>
                    <Link href="/membership-plans">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">+ Create Plan</span>
                    </Link>
                  </div>
                ) : (
                  <select 
                    required
                    value={activePlanId} 
                    onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} — {plan.durationMonths === 1 ? "1 Month" : plan.durationMonths === 12 ? "1 Year" : `${plan.durationMonths} Months`} — {formatCurrency(plan.price)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Trainer & PT Charges</label>
                <select 
                  value={formData.trainerId} 
                  onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                >
                  <option value="">No Trainer</option>
                  {trainers.map((trainer) => {
                    const isPT = trainer.trainerType === "Personal Trainer";
                    const ptChargeDisplay = isPT 
                      ? `${formatCurrency(trainer.ptCharges || 0)}/${(trainer.ptChargeType || "month").toLowerCase()}` 
                      : "₹0";
                    return (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.name} — {trainer.trainerType || "Personal Trainer"} ({ptChargeDisplay})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Live Fee Calculation Breakdown */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <CreditCard size={14} className="text-blue-500" />
                Live Payment Calculation Breakdown
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Membership Fee</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {formatCurrency(membershipFee)}
                  </p>
                  <p className="text-[10px] text-slate-400">{selectedPlan?.name || "No Plan"}</p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Personal Training Fee</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                    {formatCurrency(ptFee)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {selectedTrainer ? `${selectedTrainer.name} (${selectedTrainer.trainerType})` : "None"}
                  </p>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">Total Registration Fee</p>
                  <p className="text-xl font-extrabold text-blue-900 dark:text-blue-200 mt-0.5">
                    {formatCurrency(totalAmount)}
                  </p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Auto-recorded upon submit</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Additional Fitness Notes</label>
              <textarea 
                rows={2} 
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none" 
                placeholder="Fitness targets, preferred schedule, medical history..." 
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" className="gap-2 dark:text-slate-300" onClick={() => router.back()}>
            <X size={16} />
            Cancel
          </Button>
          <Button type="submit" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Save size={16} />
            Save Member & Record Payment
          </Button>
        </div>
      </form>
    </div>
  );
}

