"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Save,
  Building2,
  Lock,
  Palette,
  Bell,
  Database,
  Check,
  Plus,
  ArrowRightCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    theme,
    toggleTheme,
    gyms,
    activeGym,
    switchGym,
    addNewGym,
    updateActiveGym,
  } = useApp();

  const [activeTab, setActiveTab] = useState<"gym" | "appearance" | "notifications" | "security" | "preferences">("gym");

  // Active Gym Form State
  const [gymForm, setGymForm] = useState({
    gymName: settings.gymName,
    email: settings.email,
    phone: settings.phone,
    address: settings.address,
    currency: settings.currency,
    taxRate: settings.taxRate,
  });

  // New Gym Form State
  const [showAddGymModal, setShowAddGymModal] = useState(false);
  const [newGymName, setNewGymName] = useState("");
  const [newGymPhone, setNewGymPhone] = useState("");
  const [newGymAddress, setNewGymAddress] = useState("");
  const [isAddingGym, setIsAddingGym] = useState(false);

  useEffect(() => {
    setGymForm({
      gymName: activeGym?.gymName || settings.gymName,
      email: activeGym?.email || settings.email,
      phone: activeGym?.phone || settings.phone,
      address: activeGym?.address || settings.address,
      currency: activeGym?.currency || settings.currency || "₹",
      taxRate: activeGym?.taxRate !== undefined ? activeGym.taxRate : settings.taxRate,
    });
  }, [activeGym, settings]);

  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [notificationConfig, setNotificationConfig] = useState({
    enableNotifications: settings.enableNotifications,
    emailAlerts: true,
    renewalAlerts: true,
  });

  const [prefForm, setPrefForm] = useState({
    timezone: "EST",
    dateFormat: "MM/DD/YYYY",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "gym") {
      updateSettings({
        gymName: gymForm.gymName,
        email: gymForm.email,
        phone: gymForm.phone,
        address: gymForm.address,
        currency: gymForm.currency,
        taxRate: Number(gymForm.taxRate),
      });
      await updateActiveGym({
        gymName: gymForm.gymName,
        email: gymForm.email,
        phone: gymForm.phone,
        address: gymForm.address,
        currency: gymForm.currency,
        taxRate: Number(gymForm.taxRate),
      });
    } else if (activeTab === "notifications") {
      updateSettings({
        enableNotifications: notificationConfig.enableNotifications,
      });
      toast.success("Notification preferences updated!");
    } else if (activeTab === "security") {
      if (securityForm.newPassword !== securityForm.confirmPassword) {
        toast.error("New passwords do not match!");
        return;
      }
      toast.success("Security settings updated successfully!");
      setSecurityForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else if (activeTab === "preferences") {
      toast.success("System preferences updated!");
    }
  };

  const handleCreateNewGym = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGymName.trim()) {
      toast.error("Gym name is required.");
      return;
    }

    setIsAddingGym(true);
    const result = await addNewGym({
      gymName: newGymName.trim(),
      phone: newGymPhone.trim(),
      address: newGymAddress.trim(),
    });

    if (result.success) {
      setNewGymName("");
      setNewGymPhone("");
      setNewGymAddress("");
      setShowAddGymModal(false);
    } else {
      toast.error(result.error || "Failed to create gym.");
    }
    setIsAddingGym(false);
  };

  const handleResetSystem = () => {
    if (confirm("WARNING: This will clear all members, payments, trainers, and settings from local storage. Are you sure you want to reset?")) {
      localStorage.clear();
      toast.info("System reset complete. Reloading page...");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleThemeChange = (newTheme: "light" | "dark") => {
    if (newTheme !== theme) {
      toggleTheme();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure your active gym profile, manage multiple gyms, appearance, and alerts.
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
          <Save size={16} />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 space-y-1">
          <button
            onClick={() => setActiveTab("gym")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl font-medium transition-colors ${
              activeTab === "gym"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
            }`}
          >
            <Building2 size={18} />
            Gym Information
          </button>
          <button
            onClick={() => setActiveTab("appearance")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl font-medium transition-colors ${
              activeTab === "appearance"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
            }`}
          >
            <Palette size={18} />
            Appearance
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl font-medium transition-colors ${
              activeTab === "notifications"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
            }`}
          >
            <Bell size={18} />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl font-medium transition-colors ${
              activeTab === "security"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
            }`}
          >
            <Lock size={18} />
            Security & Password
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl font-medium transition-colors ${
              activeTab === "preferences"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
            }`}
          >
            <Database size={18} />
            System Control
          </button>
        </div>

        {/* Setting Panel Content */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === "gym" && (
            <div className="space-y-6">
              {/* Multi-Gym Management Card */}
              <Card className="dark:bg-slate-900 dark:border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base font-semibold dark:text-slate-100">
                      My Registered Gyms ({gyms.length})
                    </CardTitle>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Switch between your gyms or register an additional branch under your account.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowAddGymModal(!showAddGymModal)}
                    variant="outline"
                    className="text-xs gap-1.5 h-8 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                  >
                    <Plus size={14} /> Add New Gym
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showAddGymModal && (
                    <form
                      onSubmit={handleCreateNewGym}
                      className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-3"
                    >
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                        Add New Gym Branch
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Gym Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Power Zone Gym"
                            value={newGymName}
                            onChange={(e) => setNewGymName(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Contact Phone
                          </label>
                          <input
                            type="text"
                            placeholder="+91 98765 00000"
                            value={newGymPhone}
                            onChange={(e) => setNewGymPhone(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Address
                          </label>
                          <input
                            type="text"
                            placeholder="Branch location or full address"
                            value={newGymAddress}
                            onChange={(e) => setNewGymAddress(e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setShowAddGymModal(false)}
                          className="h-8 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isAddingGym} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                          {isAddingGym ? "Creating..." : "Create & Switch"}
                        </Button>
                      </div>
                    </form>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {gyms.map((g) => {
                      const isActive = g.id === activeGym?.id;
                      return (
                        <div
                          key={g.id}
                          onClick={() => switchGym(g.id)}
                          className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                            isActive
                              ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-850"
                          }`}
                        >
                          <div className="space-y-0.5 truncate pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                                {g.gymName}
                              </span>
                              {isActive && (
                                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium shrink-0">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate">
                              {g.address || "Main Branch"}
                            </p>
                          </div>
                          {!isActive && (
                            <ArrowRightCircle size={18} className="text-slate-400 hover:text-blue-600 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Active Gym Details Card */}
              <Card className="dark:bg-slate-900 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="dark:text-slate-100">
                    Active Gym Details: <span className="text-blue-600 dark:text-blue-400">{activeGym?.gymName || "My Gym"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Gym Name *</label>
                      <input
                        type="text"
                        required
                        value={gymForm.gymName}
                        onChange={(e) => setGymForm({ ...gymForm, gymName: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Contact Number</label>
                      <input
                        type="text"
                        value={gymForm.phone}
                        onChange={(e) => setGymForm({ ...gymForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                      <input
                        type="email"
                        value={gymForm.email}
                        onChange={(e) => setGymForm({ ...gymForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
                      <textarea
                        rows={2}
                        value={gymForm.address}
                        onChange={(e) => setGymForm({ ...gymForm, address: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Currency Symbol</label>
                      <select
                        value={gymForm.currency}
                        onChange={(e) => setGymForm({ ...gymForm, currency: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                      >
                        <option value="₹">INR (₹) - Indian Rupee</option>
                        <option value="$">USD ($)</option>
                        <option value="€">EUR (€)</option>
                        <option value="£">GBP (£)</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tax Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={gymForm.taxRate}
                        onChange={(e) => setGymForm({ ...gymForm, taxRate: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "appearance" && (
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-slate-100">Appearance Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Theme Selection</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => handleThemeChange("light")}
                      className={`border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                        theme === "light"
                          ? "border-blue-500 bg-blue-50/20"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 shadow-sm"></div>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        Light Mode {theme === "light" && <Check size={14} className="text-blue-500" />}
                      </span>
                    </div>
                    <div
                      onClick={() => handleThemeChange("dark")}
                      className={`border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                        theme === "dark"
                          ? "border-blue-500 bg-slate-900"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 shadow-sm"></div>
                      <span className="text-sm font-semibold text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                        Dark Mode {theme === "dark" && <Check size={14} className="text-blue-500" />}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-slate-100">Notification Alerts Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Global Bell Notifications</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Toggle notification banners inside dashboard navbar.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationConfig.enableNotifications}
                    onChange={(e) =>
                      setNotificationConfig({
                        ...notificationConfig,
                        enableNotifications: e.target.checked,
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Email Alerts Summary</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Send a weekly automated revenue and attendance audit email.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationConfig.emailAlerts}
                    onChange={(e) =>
                      setNotificationConfig({
                        ...notificationConfig,
                        emailAlerts: e.target.checked,
                      })
                    }
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "security" && (
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-slate-100">Security Credentials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Password</label>
                  <input
                    type="password"
                    value={securityForm.currentPassword}
                    onChange={(e) =>
                      setSecurityForm({ ...securityForm, currentPassword: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
                    <input
                      type="password"
                      value={securityForm.newPassword}
                      onChange={(e) =>
                        setSecurityForm({ ...securityForm, newPassword: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
                    <input
                      type="password"
                      value={securityForm.confirmPassword}
                      onChange={(e) =>
                        setSecurityForm({ ...securityForm, confirmPassword: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "preferences" && (
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="dark:text-slate-100">System Preferences & Reset</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Default Timezone</label>
                    <select
                      value={prefForm.timezone}
                      onChange={(e) => setPrefForm({ ...prefForm, timezone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-100 text-sm outline-none"
                    >
                      <option value="EST">EST (Eastern Standard)</option>
                      <option value="PST">PST (Pacific Standard)</option>
                      <option value="IST">IST (Indian Standard)</option>
                      <option value="GMT">GMT (Greenwich Mean)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date Format</label>
                    <select
                      value={prefForm.dateFormat}
                      onChange={(e) => setPrefForm({ ...prefForm, dateFormat: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-100 text-sm outline-none"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                  <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-950 rounded-2xl">
                    <div>
                      <h4 className="text-sm font-bold text-red-800 dark:text-red-300">Factory Clean Reset</h4>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        This will permanently clear all members, coaching staff, and billing logs from localStorage.
                      </p>
                    </div>
                    <Button onClick={handleResetSystem} variant="danger">
                      Reset Gymation
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
