"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { formatCurrency, formatIndianNumber } from "@/lib/utils";
import { useAuth } from "@/lib/context/AuthContext";
import {
  getOwnerGyms,
  createGym,
  updateGym,
  type Gym,
} from "@/lib/firebase/gymService";
import type { User } from "@/lib/auth/types";

// --- TYPES & INTERFACES ---
export interface MemberPreviousPlan {
  planId: string;
  planName: string;
  startDate: string;
  expiryDate: string;
  amount: number;
}

export interface Member {
  id: string;
  name: string;
  mobile: string;
  email: string;
  gender: string;
  dob: string;
  address: string;
  emergencyContact: string;
  planId: string;
  trainerId: string;
  joinDate: string;
  expiryDate: string;
  status: "Active" | "Expired" | "Pending";
  photo: string;
  notes?: string;
  previousPlans?: MemberPreviousPlan[];
}

export interface Trainer {
  id: string;
  name: string;
  specialization: string;
  mobile: string;
  email: string;
  status: "Active" | "Inactive";
  photo: string;
  trainerType: "General Trainer" | "Personal Trainer";
  ptChargeType?: "Monthly" | "Per Session";
  ptCharges: number;
  availability?: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  durationMonths: number;
  description: string;
  status: "Active" | "Inactive";
}

export interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  planId: string;
  planName: string;
  membershipAmount?: number;
  ptAmount?: number;
  amount: number;
  date: string;
  method: "Cash" | "Card" | "UPI" | "Bank Transfer" | "Cheque";
  status: "Paid" | "Pending" | "Partial" | "Overdue" | "Failed";
  notes?: string;
}

export type ExpenseCategory =
  | "Electricity"
  | "Water"
  | "Rent"
  | "Equipment"
  | "Equipment Maintenance"
  | "Staff Salary"
  | "Cleaning"
  | "Marketing"
  | "Internet"
  | "Miscellaneous"
  | "Other";

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  paymentMethod: "Cash" | "Card" | "UPI" | "Bank Transfer" | "Cheque";
  description?: string;
  addedBy?: string;
}

export interface Attendance {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  status: "Present" | "Absent";
  checkInTime?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: "info" | "warning" | "success" | "error";
}

export interface Activity {
  id: string;
  type: "member_added" | "member_updated" | "payment_added" | "trainer_added" | "plan_updated" | "attendance_marked" | "expense_added" | "expense_deleted";
  description: string;
  timestamp: string;
}

export interface GymSettings {
  gymName: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  taxRate: number;
  enableNotifications: boolean;
  theme: "light" | "dark";
}

export interface GymDataPartition {
  gymId: string;
  members: Member[];
  trainers: Trainer[];
  plans: MembershipPlan[];
  payments: Payment[];
  expenses: Expense[];
  attendance: Attendance[];
  notifications: NotificationItem[];
  activities: Activity[];
  settings: GymSettings;
}

interface AppContextType {
  // Multi-Gym State
  gyms: Gym[];
  activeGym: Gym | null;
  activeGymId: string;
  switchGym: (gymId: string) => void;
  addNewGym: (gymData: { gymName: string; phone?: string; email?: string; address?: string }) => Promise<{ success: boolean; error?: string }>;
  updateActiveGym: (gymData: Partial<Gym>) => Promise<{ success: boolean; error?: string }>;

  // Operational Data for Active Gym
  members: Member[];
  trainers: Trainer[];
  plans: MembershipPlan[];
  payments: Payment[];
  expenses: Expense[];
  attendance: Attendance[];
  notifications: NotificationItem[];
  activities: Activity[];
  settings: GymSettings;
  theme: "light" | "dark";
  isInitialized: boolean;

  // Centralized Owner Data Management
  getCurrentUser: () => User | null;
  getCurrentOwnerData: () => GymDataPartition | null;
  saveOwnerData: (data: Partial<GymDataPartition>) => void;
  getOwnerMembers: () => Member[];
  getOwnerTrainers: () => Trainer[];
  getOwnerPayments: () => Payment[];
  getOwnerAttendance: () => Attendance[];
  getOwnerExpenses: () => Expense[];
  getOwnerMembershipPlans: () => MembershipPlan[];

  // Theme & Currency
  toggleTheme: () => void;
  formatCurrency: (amount: number | string | undefined | null, includeSymbol?: boolean) => string;
  formatIndianNumber: (num: number | string | undefined | null) => string;

  // Members API
  addMember: (member: Omit<Member, "id">) => void;
  updateMember: (id: string, member: Partial<Member>) => void;
  deleteMember: (id: string) => void;

  // Trainers API
  addTrainer: (trainer: Omit<Trainer, "id">) => void;
  updateTrainer: (id: string, trainer: Partial<Trainer>) => void;
  deleteTrainer: (id: string) => void;

  // Plans API
  addPlan: (plan: Omit<MembershipPlan, "id">) => void;
  updatePlan: (id: string, plan: Partial<MembershipPlan>) => void;
  deletePlan: (id: string) => void;

  // Payments API
  addPayment: (payment: Omit<Payment, "id">) => void;
  updatePayment: (id: string, payment: Partial<Payment>) => void;

  // Expenses API
  addExpense: (expense: Omit<Expense, "id">) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Attendance API
  markAttendance: (memberId: string, status: "Present" | "Absent", date?: string) => void;

  // Notifications API
  addNotification: (title: string, message: string, type?: NotificationItem["type"]) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // Settings API
  updateSettings: (settings: Partial<GymSettings>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Storage partition key per gymId and ownerId
export const getGymStorageKey = (ownerId: string, gymId: string): string => {
  return `gym_data_${ownerId}_${gymId}`;
};

const defaultSettings: GymSettings = {
  gymName: "Gymation Fitness",
  email: "admin@gymation.com",
  phone: "+91 98765 00000",
  address: "Plot 101, Gymation Tower, Bandra, Mumbai",
  currency: "₹",
  taxRate: 18.0,
  enableNotifications: true,
  theme: "light",
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  // Multi-Gym State
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [activeGymId, setActiveGymId] = useState<string>("");

  // Operational State for active gym
  const [members, setMembers] = useState<Member[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [settings, setSettings] = useState<GymSettings>(defaultSettings);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Track active loaded partition to prevent race conditions during gym switch
  const activePartitionRef = useRef<{ ownerId: string; gymId: string } | null>(null);

  const createInitialGymData = (gym: Gym, ownerUser: User): GymDataPartition => {
    const todayStr = new Date().toISOString().split("T")[0];
    return {
      gymId: gym.id,
      members: [],
      trainers: [],
      plans: [],
      payments: [],
      expenses: [],
      attendance: [],
      notifications: [
        {
          id: `NOT-WELCOME-${Date.now()}`,
          title: `Welcome to ${gym.gymName}!`,
          message: `Your management console for "${gym.gymName}" is active with Indian Rupee (₹) currency.`,
          date: todayStr,
          read: false,
          type: "success",
        },
      ],
      activities: [
        {
          id: `ACT-INIT-${Date.now()}`,
          type: "member_added",
          description: `Account initialized for ${gym.gymName}`,
          timestamp: "Just now",
        },
      ],
      settings: {
        gymName: gym.gymName || ownerUser.gymName || "My Gym",
        email: gym.email || ownerUser.email,
        phone: gym.phone || ownerUser.phone || "+91 98765 00000",
        address: gym.address || "Plot 101, Main Gym Hall",
        currency: gym.currency || "₹",
        taxRate: gym.taxRate !== undefined ? gym.taxRate : 18.0,
        enableNotifications: true,
        theme: "light",
      },
    };
  };

  // Load owner's gyms whenever user logs in or switches account
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!user) {
      // User logged out: clean memory state
      setGyms([]);
      setActiveGymId("");
      setMembers([]);
      setTrainers([]);
      setPlans([]);
      setPayments([]);
      setExpenses([]);
      setAttendance([]);
      setNotifications([]);
      setActivities([]);
      setSettings(defaultSettings);
      activePartitionRef.current = null;
      setIsInitialized(false);
      return;
    }

    let isMounted = true;

    async function loadOwnerGyms() {
      if (!user) return;
      let ownerGyms = await getOwnerGyms(user.id);

      // If owner has no gyms registered yet, auto-create their initial gym
      if (ownerGyms.length === 0) {
        const createResult = await createGym(user.id, {
          gymName: user.gymName || "My Gym",
          email: user.email,
          phone: user.phone,
        });
        if (createResult.gym) {
          ownerGyms = [createResult.gym];
        }
      }

      if (!isMounted) return;
      setGyms(ownerGyms);

      // Determine active gym ID
      const savedActiveGymId = localStorage.getItem(`gymation_active_gym_${user.id}`);
      const validActiveGym = ownerGyms.find((g) => g.id === savedActiveGymId) || ownerGyms[0];
      const initialGymId = validActiveGym ? validActiveGym.id : "";

      setActiveGymId(initialGymId);
    }

    loadOwnerGyms();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Load active gym operational data whenever activeGymId or user changes
  useEffect(() => {
    if (typeof window === "undefined" || !user || !activeGymId) return;

    const currentGym = gyms.find((g) => g.id === activeGymId);
    if (!currentGym) return;

    const storageKey = getGymStorageKey(user.id, activeGymId);
    activePartitionRef.current = { ownerId: user.id, gymId: activeGymId };

    const storedDataRaw = localStorage.getItem(storageKey);
    let gymData: GymDataPartition;

    if (storedDataRaw) {
      try {
        gymData = JSON.parse(storedDataRaw);
      } catch {
        gymData = createInitialGymData(currentGym, user);
      }
    } else {
      gymData = createInitialGymData(currentGym, user);
      localStorage.setItem(storageKey, JSON.stringify(gymData));
    }

    // Apply data partition to active state
    setMembers(gymData.members || []);
    setTrainers(gymData.trainers || []);
    setPlans(gymData.plans || []);
    setPayments(gymData.payments || []);
    setExpenses(gymData.expenses || []);
    setAttendance(gymData.attendance || []);
    setNotifications(gymData.notifications || []);
    setActivities(gymData.activities || []);

    const gymSettings = {
      ...defaultSettings,
      ...(gymData.settings || {}),
      gymName: currentGym.gymName || gymData.settings?.gymName || "My Gym",
      email: currentGym.email || gymData.settings?.email || user.email,
      phone: currentGym.phone || gymData.settings?.phone || user.phone || "+91 98765 00000",
      currency: currentGym.currency || gymData.settings?.currency || "₹",
    };
    setSettings(gymSettings);
    setTheme(gymSettings.theme || "light");

    setIsInitialized(true);
  }, [user, activeGymId, gyms]);

  // Persist active gym operational state to storage
  const syncToGymStorage = useCallback(() => {
    if (typeof window === "undefined" || !user || !activeGymId || !isInitialized) return;
    if (
      !activePartitionRef.current ||
      activePartitionRef.current.ownerId !== user.id ||
      activePartitionRef.current.gymId !== activeGymId
    ) {
      return;
    }

    const storageKey = getGymStorageKey(user.id, activeGymId);
    const gymData: GymDataPartition = {
      gymId: activeGymId,
      members,
      trainers,
      plans,
      payments,
      expenses,
      attendance,
      notifications,
      activities,
      settings,
    };
    localStorage.setItem(storageKey, JSON.stringify(gymData));
  }, [
    user,
    activeGymId,
    isInitialized,
    members,
    trainers,
    plans,
    payments,
    expenses,
    attendance,
    notifications,
    activities,
    settings,
  ]);

  // Synchronize state changes to active gym storage
  useEffect(() => {
    syncToGymStorage();
  }, [syncToGymStorage]);

  // Switch Active Gym
  const switchGym = useCallback(
    (newGymId: string) => {
      if (!user || newGymId === activeGymId) return;
      const targetGym = gyms.find((g) => g.id === newGymId);
      if (!targetGym) return;

      // Save current state before switching
      syncToGymStorage();

      setActiveGymId(newGymId);
      if (typeof window !== "undefined") {
        localStorage.setItem(`gymation_active_gym_${user.id}`, newGymId);
      }
      toast.success(`Switched to "${targetGym.gymName}"`);
    },
    [user, activeGymId, gyms, syncToGymStorage]
  );

  // Add an additional gym under the authenticated owner
  const addNewGym = useCallback(
    async (gymData: {
      gymName: string;
      phone?: string;
      email?: string;
      address?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return { success: false, error: "Authentication required." };
      }

      const result = await createGym(user.id, {
        ...gymData,
        email: gymData.email || user.email,
        phone: gymData.phone || user.phone,
      });

      if (!result.success || !result.gym) {
        return { success: false, error: result.error || "Failed to create gym." };
      }

      // Add to owner's gyms
      const updatedGyms = [...gyms, result.gym];
      setGyms(updatedGyms);

      // Switch to the newly created gym
      setActiveGymId(result.gym.id);
      if (typeof window !== "undefined") {
        localStorage.setItem(`gymation_active_gym_${user.id}`, result.gym.id);
      }

      toast.success(`Gym "${result.gym.gymName}" created successfully!`);
      return { success: true };
    },
    [user, gyms]
  );

  // Update details of active gym
  const updateActiveGym = useCallback(
    async (gymData: Partial<Gym>): Promise<{ success: boolean; error?: string }> => {
      if (!user || !activeGymId) {
        return { success: false, error: "No active gym selected." };
      }

      const result = await updateGym(activeGymId, user.id, gymData);
      if (!result.success) {
        return { success: false, error: result.error || "Failed to update gym." };
      }

      // Update state
      setGyms((prev) =>
        prev.map((g) => (g.id === activeGymId ? { ...g, ...gymData } : g))
      );

      if (gymData.gymName) {
        setSettings((prev) => ({ ...prev, gymName: gymData.gymName! }));
      }

      toast.success("Gym details updated successfully!");
      return { success: true };
    },
    [user, activeGymId]
  );

  const activeGym = gyms.find((g) => g.id === activeGymId) || null;

  // Centralized Owner Data Layer methods
  const getCurrentUser = useCallback(() => user, [user]);

  const getCurrentOwnerData = useCallback((): GymDataPartition | null => {
    if (!user || !activeGymId) return null;
    return {
      gymId: activeGymId,
      members,
      trainers,
      plans,
      payments,
      expenses,
      attendance,
      notifications,
      activities,
      settings,
    };
  }, [user, activeGymId, members, trainers, plans, payments, expenses, attendance, notifications, activities, settings]);

  const saveOwnerData = useCallback(
    (partial: Partial<GymDataPartition>) => {
      if (!user) return;
      if (partial.members !== undefined) setMembers(partial.members);
      if (partial.trainers !== undefined) setTrainers(partial.trainers);
      if (partial.plans !== undefined) setPlans(partial.plans);
      if (partial.payments !== undefined) setPayments(partial.payments);
      if (partial.expenses !== undefined) setExpenses(partial.expenses);
      if (partial.attendance !== undefined) setAttendance(partial.attendance);
      if (partial.notifications !== undefined) setNotifications(partial.notifications);
      if (partial.activities !== undefined) setActivities(partial.activities);
      if (partial.settings !== undefined) setSettings((prev) => ({ ...prev, ...partial.settings }));
    },
    [user]
  );

  const getOwnerMembers = useCallback(() => members, [members]);
  const getOwnerTrainers = useCallback(() => trainers, [trainers]);
  const getOwnerPayments = useCallback(() => payments, [payments]);
  const getOwnerAttendance = useCallback(() => attendance, [attendance]);
  const getOwnerExpenses = useCallback(() => expenses, [expenses]);
  const getOwnerMembershipPlans = useCallback(() => plans, [plans]);

  // Expiry notification cron check for the active gym's members
  useEffect(() => {
    if (!isInitialized || !user || members.length === 0) return;

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const newNotifications: NotificationItem[] = [];

    members.forEach((member) => {
      if (member.status === "Active" && member.expiryDate) {
        const expDate = new Date(member.expiryDate);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let title = "";
        let message = "";
        let type: NotificationItem["type"] = "warning";

        if (diffDays === 0) {
          title = `🔄 Renewal Due Today: ${member.name}`;
          message = `${member.name}'s membership expires today (${member.expiryDate}). Please collect renewal payment.`;
          type = "warning";
        } else if (diffDays > 0 && diffDays <= 7) {
          title = `🔄 Upcoming Renewal (${diffDays} days): ${member.name}`;
          message = `${member.name}'s subscription will expire on ${member.expiryDate} (in ${diffDays} days).`;
          type = "info";
        } else if (diffDays < 0 && Math.abs(diffDays) <= 30) {
          title = `⚠️ Membership Expired: ${member.name}`;
          message = `${member.name}'s membership expired on ${member.expiryDate}. Follow up for renewal.`;
          type = "error";
        }

        if (title) {
          const exists = notifications.some(
            (n) => n.title === title && n.date === todayStr
          );
          if (!exists) {
            newNotifications.push({
              id: `NOT-REN-${member.id}-${todayStr}`,
              title,
              message,
              date: todayStr,
              read: false,
              type,
            });
          }
        }
      }
    });

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...newNotifications, ...prev]);
    }
  }, [isInitialized, user, members]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    setSettings((prev) => ({ ...prev, theme: nextTheme }));
    toast.success(`Switched to ${nextTheme === "light" ? "Light" : "Dark"} mode`);
  };

  const addActivity = (type: Activity["type"], description: string) => {
    const newActivity: Activity = {
      id: `ACT-${Date.now()}`,
      type,
      description,
      timestamp: "Just now",
    };
    setActivities((prev) => [newActivity, ...prev]);
  };

  const addNotification = (title: string, message: string, type: NotificationItem["type"] = "info") => {
    const newNotif: NotificationItem = {
      id: `NOT-${Date.now()}`,
      title,
      message,
      date: new Date().toISOString().split("T")[0],
      read: false,
      type,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read.");
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    toast.success("Notifications cleared.");
  };

  // Members API — saves exclusively to active gym
  const addMember = (memberData: Omit<Member, "id">) => {
    const newId = `M-${Math.floor(1000 + Math.random() * 9000)}`;
    const newMember: Member = {
      ...memberData,
      dob: memberData.dob ? memberData.dob.trim() : "",
      id: newId,
    };
    setMembers((prev) => [...prev, newMember]);
    addActivity("member_added", `Registered new gym member: ${newMember.name}`);
    addNotification("New Member Registered", `${newMember.name} joined with ${newMember.status} status.`, "success");
    toast.success(`Member ${newMember.name} added successfully!`);
  };

  const updateMember = (id: string, updatedData: Partial<Member>) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        let previousPlans = m.previousPlans || [];
        if (updatedData.planId && updatedData.planId !== m.planId) {
          const oldPlan = plans.find((p) => p.id === m.planId);
          if (oldPlan) {
            previousPlans = [
              ...previousPlans,
              {
                planId: oldPlan.id,
                planName: oldPlan.name,
                startDate: m.joinDate,
                expiryDate: m.expiryDate,
                amount: oldPlan.price,
              },
            ];
          }
        }
        return {
          ...m,
          ...updatedData,
          dob: updatedData.dob !== undefined ? (updatedData.dob ? updatedData.dob.trim() : "") : m.dob,
          previousPlans,
        } as Member;
      })
    );
    addActivity("member_updated", `Updated member profile (${id})`);
    toast.success("Member record updated successfully!");
  };

  const deleteMember = (id: string) => {
    const memberName = members.find((m) => m.id === id)?.name || id;
    setMembers((prev) => prev.filter((m) => m.id !== id));
    addActivity("member_updated", `Deleted member ${memberName}`);
    toast.success(`Member deleted and records archived.`);
  };

  // Trainers API — saves exclusively to active gym
  const addTrainer = (trainerData: Omit<Trainer, "id">) => {
    const newId = `T-${Math.floor(2000 + Math.random() * 9000)}`;
    const newTrainer: Trainer = {
      ...trainerData,
      ptCharges: trainerData.trainerType === "General Trainer" ? 0 : Math.max(0, trainerData.ptCharges || 0),
      id: newId,
    };
    setTrainers((prev) => [...prev, newTrainer]);
    addActivity("trainer_added", `Onboarded new trainer ${newTrainer.name} (${newTrainer.trainerType})`);
    addNotification("New Trainer Onboarded", `${newTrainer.name} joined as ${newTrainer.trainerType}.`, "info");
    toast.success(`Trainer ${newTrainer.name} onboarded!`);
  };

  const updateTrainer = (id: string, updatedData: Partial<Trainer>) => {
    setTrainers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextType = updatedData.trainerType !== undefined ? updatedData.trainerType : t.trainerType;
        const nextCharges = nextType === "General Trainer" ? 0 : Math.max(0, updatedData.ptCharges !== undefined ? updatedData.ptCharges : t.ptCharges);
        return {
          ...t,
          ...updatedData,
          ptCharges: nextCharges,
        } as Trainer;
      })
    );
    toast.success("Trainer updated successfully!");
  };

  const deleteTrainer = (id: string) => {
    setTrainers((prev) => prev.filter((t) => t.id !== id));
    setMembers((prev) =>
      prev.map((m) => (m.trainerId === id ? { ...m, trainerId: "" } : m))
    );
    toast.success("Trainer removed successfully.");
  };

  // Plans API — saves exclusively to active gym
  const addPlan = (planData: Omit<MembershipPlan, "id">) => {
    const newId = `P-${Math.floor(3000 + Math.random() * 9000)}`;
    const newPlan: MembershipPlan = {
      ...planData,
      name: planData.name.trim(),
      price: Math.max(0, Number(planData.price) || 0),
      durationMonths: Math.max(1, Math.round(Number(planData.durationMonths) || 1)),
      description: planData.description ? planData.description.trim() : "",
      status: planData.status || "Active",
      id: newId,
    };
    setPlans((prev) => [...prev, newPlan]);
    addActivity("plan_updated", `Created a new plan: ${newPlan.name}`);
    toast.success(`Membership plan ${newPlan.name} created!`);
  };

  const updatePlan = (id: string, updatedData: Partial<MembershipPlan>) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return {
          ...p,
          ...updatedData,
          name: updatedData.name !== undefined ? updatedData.name.trim() : p.name,
          price: updatedData.price !== undefined ? Math.max(0, Number(updatedData.price) || 0) : p.price,
          durationMonths: updatedData.durationMonths !== undefined ? Math.max(1, Math.round(Number(updatedData.durationMonths) || 1)) : p.durationMonths,
          description: updatedData.description !== undefined ? updatedData.description.trim() : p.description,
          status: updatedData.status !== undefined ? updatedData.status : p.status,
        } as MembershipPlan;
      })
    );
    toast.success("Membership plan updated!");
  };

  const deletePlan = (id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
    toast.success("Membership plan deleted.");
  };

  // Payments API — saves exclusively to active gym
  const addPayment = (paymentData: Omit<Payment, "id">) => {
    const newId = `PAY-${Math.floor(4000 + Math.random() * 9000)}`;
    const membershipAmount = Math.max(0, paymentData.membershipAmount !== undefined ? paymentData.membershipAmount : paymentData.amount);
    const ptAmount = Math.max(0, paymentData.ptAmount || 0);
    const totalAmount = paymentData.amount !== undefined ? paymentData.amount : (membershipAmount + ptAmount);

    const newPayment: Payment = {
      ...paymentData,
      id: newId,
      membershipAmount,
      ptAmount,
      amount: totalAmount,
    };
    setPayments((prev) => [newPayment, ...prev]);
    addActivity("payment_added", `Received payment of ${formatCurrency(newPayment.amount)} from ${newPayment.memberName}`);
    addNotification("Payment Received", `Received ${formatCurrency(newPayment.amount)} from ${newPayment.memberName}.`, "success");
    toast.success(`Payment of ${formatCurrency(newPayment.amount)} recorded!`);
  };

  const updatePayment = (id: string, updatedData: Partial<Payment>) => {
    setPayments((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const membershipAmount = updatedData.membershipAmount !== undefined ? updatedData.membershipAmount : (p.membershipAmount !== undefined ? p.membershipAmount : p.amount);
        const ptAmount = updatedData.ptAmount !== undefined ? updatedData.ptAmount : (p.ptAmount !== undefined ? p.ptAmount : 0);
        const amount = updatedData.amount !== undefined ? updatedData.amount : (membershipAmount + ptAmount);
        return {
          ...p,
          ...updatedData,
          membershipAmount,
          ptAmount,
          amount,
        } as Payment;
      })
    );
    toast.success("Payment updated successfully!");
  };

  // Expenses API — saves exclusively to active gym
  const addExpense = (expenseData: Omit<Expense, "id">) => {
    const newId = `EXP-${Math.floor(8000 + Math.random() * 9000)}`;
    const newExpense: Expense = {
      ...expenseData,
      amount: Math.max(0, expenseData.amount),
      id: newId,
    };
    setExpenses((prev) => [newExpense, ...prev]);
    addActivity("expense_added", `Recorded expense of ${formatCurrency(newExpense.amount)} for "${newExpense.title}" [${newExpense.category}]`);
    toast.success(`Expense "${newExpense.title}" added successfully!`);
  };

  const updateExpense = (id: string, updatedData: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        return {
          ...e,
          ...updatedData,
          amount: updatedData.amount !== undefined ? Math.max(0, updatedData.amount) : e.amount,
        } as Expense;
      })
    );
    toast.success("Expense updated successfully!");
  };

  const deleteExpense = (id: string) => {
    const expenseTitle = expenses.find((e) => e.id === id)?.title || id;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    addActivity("expense_deleted", `Deleted expense "${expenseTitle}"`);
    toast.success(`Expense "${expenseTitle}" removed.`);
  };

  // Attendance API — saves exclusively to active gym
  const markAttendance = (memberId: string, status: "Present" | "Absent", date?: string) => {
    const recordDate = date || new Date().toISOString().split("T")[0];
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const existingIndex = attendance.findIndex(
      (a) => a.memberId === memberId && a.date === recordDate
    );

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    if (existingIndex >= 0) {
      setAttendance((prev) =>
        prev.map((a, idx) =>
          idx === existingIndex ? { ...a, status, checkInTime: status === "Present" ? timeStr : undefined } : a
        )
      );
      toast.success(`Updated attendance for ${member.name} as ${status}`);
    } else {
      const newAttendance: Attendance = {
        id: `ATT-${Date.now()}`,
        memberId: member.id,
        memberName: member.name,
        date: recordDate,
        status,
        checkInTime: status === "Present" ? timeStr : undefined,
      };
      setAttendance((prev) => [newAttendance, ...prev]);
      addActivity("attendance_marked", `Marked ${member.name} as ${status} on ${recordDate}`);
      toast.success(`Marked ${member.name} as ${status}`);
    }
  };

  const updateSettings = (newSettings: Partial<GymSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    toast.success("Gym settings saved successfully!");
  };

  return (
    <AppContext.Provider
      value={{
        gyms,
        activeGym,
        activeGymId,
        switchGym,
        addNewGym,
        updateActiveGym,
        members,
        trainers,
        plans,
        payments,
        expenses,
        attendance,
        notifications,
        activities,
        settings,
        theme,
        isInitialized,
        getCurrentUser,
        getCurrentOwnerData,
        saveOwnerData,
        getOwnerMembers,
        getOwnerTrainers,
        getOwnerPayments,
        getOwnerAttendance,
        getOwnerExpenses,
        getOwnerMembershipPlans,
        toggleTheme,
        formatCurrency,
        formatIndianNumber,
        addMember,
        updateMember,
        deleteMember,
        addTrainer,
        updateTrainer,
        deleteTrainer,
        addPlan,
        updatePlan,
        deletePlan,
        addPayment,
        updatePayment,
        addExpense,
        updateExpense,
        deleteExpense,
        markAttendance,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearAllNotifications,
        updateSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
