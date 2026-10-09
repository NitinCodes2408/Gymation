"use client";

import { useState } from "react";
import { useApp } from "@/lib/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ArrowLeft, Save, X, Dumbbell, CreditCard, Fingerprint, CheckCircle2, AlertCircle, ShieldCheck, RefreshCw } from "lucide-react";
import { formatCurrency, formatIndianNumber } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { FingerprintEnrollModal } from "@/components/biometric/FingerprintEnrollModal";

export default function AddMemberPage() {
  const router = useRouter();
  const { plans, trainers, addMember, addPayment, settings, validateBiometricUserId } = useApp();

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
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
    biometricUserId: "",
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

    if (!formData.name.trim()) {
      toast.error("Please enter the member's full name.");
      return;
    }

    if (!formData.mobile.trim()) {
      toast.error("Please enter the member's mobile number.");
      return;
    }

    // MANDATORY FINGERPRINT ENROLLMENT REQUIREMENT
    const cleanBioId = formData.biometricUserId?.trim();
    if (!cleanBioId) {
      toast.error("Fingerprint enrollment is required to create this member.");
      setIsEnrollModalOpen(true);
      return;
    }

    if (plans.length === 0) {
      toast.error("Please create at least one membership plan before registering a member.");
      return;
    }

    const plan = selectedPlan || plans[0];
    const duration = plan ? plan.durationMonths : 1;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + duration);

    const bioCheck = validateBiometricUserId(cleanBioId);
    if (!bioCheck.valid) {
      toast.error(bioCheck.error || "Biometric User ID is already assigned to another member.");
      return;
    }

    const result = addMember({
      name: formData.name,
      mobile: formData.mobile,
      email: formData.email,
      gender: formData.gender,
      dob: formData.dob ? formData.dob.trim() : "",
      address: formData.address,
      emergencyContact: formData.emergencyContact,
      planId: plan.id,
      trainerId: formData.trainerId,
      biometricUserId: cleanBioId,
      joinDate: new Date().toISOString().split("T")[0],
      expiryDate: expiry.toISOString().split("T")[0],
      status: "Active",
      photo: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=256&h=256&q=80",
      notes: formData.notes
    });

    if (!result.success) {
      return;
    }

    // Create itemized payment in INR
    if (plan && result.memberId) {
      addPayment({
        memberId: result.memberId,
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

              {/* Mandatory Biometric Fingerprint Enrollment Card */}
              <div className="space-y-3 md:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Fingerprint size={18} className="text-purple-600 dark:text-purple-400" />
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Biometric Fingerprint Enrollment
                      </h4>
                      <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900">
                        REQUIRED
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      A physical fingerprint on the eSSL/Identix K20 is required to complete new member registration.
                    </p>
                  </div>

                  {formData.biometricUserId ? (
                    <Badge variant="success" className="gap-1.5 py-1 px-3">
                      <CheckCircle2 size={13} />
                      Enrolled (ID #{formData.biometricUserId})
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="gap-1.5 py-1 px-3">
                      <AlertCircle size={13} />
                      Not Enrolled
                    </Badge>
                  )}
                </div>

                {formData.biometricUserId ? (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-mono font-bold">
                        #{formData.biometricUserId}
                      </div>
                      <div>
                        <p className="font-semibold text-purple-900 dark:text-purple-200">
                          K20 Terminal Hardware User ID #{formData.biometricUserId}
                        </p>
                        <p className="text-[11px] text-purple-700 dark:text-purple-300">
                          Verified on physical device (192.168.1.200:4370)
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEnrollModalOpen(true)}
                      className="h-8 text-xs border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300"
                    >
                      <RefreshCw size={12} className="mr-1" /> Re-enroll / Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5">
                        <AlertCircle size={14} className="shrink-0" />
                        Enroll on K20 terminal to activate attendance tracking.
                      </p>
                      <Button
                        type="button"
                        onClick={() => setIsEnrollModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-sm text-xs h-9"
                      >
                        <Fingerprint size={15} />
                        Enroll Fingerprint on K20
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-700/80 text-xs">
                      <span className="text-slate-500 whitespace-nowrap">Already created on K20?</span>
                      <input
                        type="number"
                        placeholder="Enter K20 User ID (e.g. 35, 36)"
                        value={formData.biometricUserId}
                        onChange={(e) => setFormData((prev) => ({ ...prev, biometricUserId: e.target.value.trim() }))}
                        className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-48 font-mono outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}
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
          <Button 
            type="submit" 
            className={`gap-2 text-white ${formData.biometricUserId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}
          >
            <Save size={16} />
            {formData.biometricUserId ? "Save Member & Record Payment" : "Enroll Fingerprint & Save Member"}
          </Button>
        </div>
      </form>

      {/* Fingerprint Enrollment Modal */}
      <FingerprintEnrollModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        memberName={formData.name}
        onSuccess={(enrolledUserId) => {
          setFormData((prev) => ({ ...prev, biometricUserId: enrolledUserId }));
        }}
      />
    </div>
  );
}

