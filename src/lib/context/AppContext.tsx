"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

// Types
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
}

export interface Trainer {
  id: string;
  name: string;
  specialization: string;
  mobile: string;
  email: string;
  status: "Active" | "Inactive";
  photo: string;
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
  amount: number;
  date: string;
  method: "Cash" | "Card" | "UPI" | "Bank Transfer";
  status: "Paid" | "Pending" | "Failed";
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
  type: "info" | "success" | "warning" | "error";
}

export interface Activity {
  id: string;
  type: "member_added" | "payment_added" | "attendance_marked" | "plan_updated" | "trainer_added" | "plan_added" | "member_updated";
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

interface AppContextType {
  members: Member[];
  trainers: Trainer[];
  plans: MembershipPlan[];
  payments: Payment[];
  attendance: Attendance[];
  notifications: NotificationItem[];
  activities: Activity[];
  settings: GymSettings;
  theme: "light" | "dark";
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  toggleTheme: () => void;
  
  // Members CRUD
  addMember: (member: Omit<Member, "id">) => void;
  updateMember: (id: string, member: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  
  // Trainers CRUD
  addTrainer: (trainer: Omit<Trainer, "id">) => void;
  updateTrainer: (id: string, trainer: Partial<Trainer>) => void;
  deleteTrainer: (id: string) => void;
  
  // Plans CRUD
  addPlan: (plan: Omit<MembershipPlan, "id">) => void;
  updatePlan: (id: string, plan: Partial<MembershipPlan>) => void;
  deletePlan: (id: string) => void;
  
  // Payments CRUD
  addPayment: (payment: Omit<Payment, "id">) => void;
  updatePayment: (id: string, payment: Partial<Payment>) => void;
  
  // Attendance
  markAttendance: (memberId: string, status: "Present" | "Absent", date?: string) => void;
  
  // Notifications
  addNotification: (title: string, message: string, type?: NotificationItem["type"]) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Settings
  updateSettings: (settings: Partial<GymSettings>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial Mock Data
const defaultPlans: MembershipPlan[] = [
  { id: "P-3001", name: "Basic Monthly", price: 29, durationMonths: 1, description: "Access to gym floor and standard equipment", status: "Active" },
  { id: "P-3002", name: "Pro 6-Months", price: 149, durationMonths: 6, description: "Includes group classes and lockroom facilities", status: "Active" },
  { id: "P-3003", name: "VIP Yearly", price: 299, durationMonths: 12, description: "All-access pass, personal trainer consultation, and spa", status: "Active" },
];

const defaultTrainers: Trainer[] = [
  { id: "T-2001", name: "Marcus Aurelius", specialization: "Strength & Conditioning", mobile: "+1 555-101-1001", email: "marcus@gymation.com", status: "Active", photo: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=256&h=256&q=80" },
  { id: "T-2002", name: "Serena Williams", specialization: "CrossFit & HIIT", mobile: "+1 555-101-1002", email: "serena@gymation.com", status: "Active", photo: "https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=256&h=256&q=80" },
  { id: "T-2003", name: "David Beckham", specialization: "Cardio & Weight Loss", mobile: "+1 555-101-1003", email: "david@gymation.com", status: "Active", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&q=80" },
];

const defaultMembers: Member[] = [
  { id: "M-1001", name: "Alex Johnson", mobile: "+1 234-567-8900", email: "alex@example.com", gender: "male", dob: "1994-05-15", address: "123 Main St, New York, NY", emergencyContact: "Jane Johnson - Spouse - +1 234-567-8999", planId: "P-3003", trainerId: "T-2001", joinDate: "2026-01-12", expiryDate: "2027-01-12", status: "Active", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&q=80", notes: "Prefers morning workouts." },
  { id: "M-1002", name: "Sarah Williams", mobile: "+1 234-567-8901", email: "sarah@example.com", gender: "female", dob: "1997-08-22", address: "456 Oak Ave, Brooklyn, NY", emergencyContact: "Robert Williams - Father - +1 234-567-8998", planId: "P-3001", trainerId: "T-2002", joinDate: "2026-07-01", expiryDate: "2026-08-01", status: "Active", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&q=80", notes: "Focusing on HIIT." },
  { id: "M-1003", name: "Michael Brown", mobile: "+1 234-567-8902", email: "michael@example.com", gender: "male", dob: "1988-11-03", address: "789 Pine Rd, Queens, NY", emergencyContact: "Helen Brown - Mother - +1 234-567-8997", planId: "P-3002", trainerId: "T-2003", joinDate: "2026-01-15", expiryDate: "2026-07-15", status: "Expired", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&q=80", notes: "Injured shoulder." },
  { id: "M-1004", name: "Emily Davis", mobile: "+1 234-567-8903", email: "emily@example.com", gender: "female", dob: "1999-02-14", address: "101 Elm St, Manhattan, NY", emergencyContact: "Tom Davis - Brother - +1 234-567-8996", planId: "P-3003", trainerId: "T-2001", joinDate: "2026-05-10", expiryDate: "2027-05-10", status: "Active", photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&h=256&q=80", notes: "Preparing for a marathon." },
];

const defaultPayments: Payment[] = [
  { id: "PAY-4001", memberId: "M-1001", memberName: "Alex Johnson", planId: "P-3003", planName: "VIP Yearly", amount: 299, date: "2026-01-12", method: "Card", status: "Paid" },
  { id: "PAY-4002", memberId: "M-1002", memberName: "Sarah Williams", planId: "P-3001", planName: "Basic Monthly", amount: 29, date: "2026-07-01", method: "UPI", status: "Paid" },
  { id: "PAY-4003", memberId: "M-1003", memberName: "Michael Brown", planId: "P-3002", planName: "Pro 6-Months", amount: 149, date: "2026-01-15", method: "Bank Transfer", status: "Paid" },
  { id: "PAY-4004", memberId: "M-1004", memberName: "Emily Davis", planId: "P-3003", planName: "VIP Yearly", amount: 299, date: "2026-05-10", method: "Card", status: "Paid" },
];

const defaultAttendance: Attendance[] = [
  { id: "ATT-5001", memberId: "M-1001", memberName: "Alex Johnson", date: "2026-07-11", status: "Present", checkInTime: "07:30 AM" },
  { id: "ATT-5002", memberId: "M-1002", memberName: "Sarah Williams", date: "2026-07-11", status: "Present", checkInTime: "08:15 AM" },
  { id: "ATT-5003", memberId: "M-1004", memberName: "Emily Davis", date: "2026-07-11", status: "Present", checkInTime: "09:00 AM" },
  { id: "ATT-5004", memberId: "M-1001", memberName: "Alex Johnson", date: "2026-07-10", status: "Present", checkInTime: "07:45 AM" },
  { id: "ATT-5005", memberId: "M-1003", memberName: "Michael Brown", date: "2026-07-10", status: "Absent" },
];

const defaultNotifications: NotificationItem[] = [
  { id: "NOT-6001", title: "New Member Registered", message: "Emily Davis registered as a new member with VIP Yearly plan.", date: "2026-07-11", read: false, type: "success" },
  { id: "NOT-6002", title: "Payment Received", message: "Payment of $29 received from Sarah Williams.", date: "2026-07-01", read: true, type: "info" },
  { id: "NOT-6003", title: "Membership Expired", message: "Michael Brown's subscription expired on 2026-07-15.", date: "2026-07-15", read: false, type: "warning" },
];

const defaultActivities: Activity[] = [
  { id: "ACT-7001", type: "member_added", description: "Registered new member Emily Davis", timestamp: "Today at 09:00 AM" },
  { id: "ACT-7002", type: "attendance_marked", description: "Marked Alex Johnson as Present for today", timestamp: "Today at 07:30 AM" },
  { id: "ACT-7003", type: "payment_added", description: "Processed payment of $29 for Sarah Williams", timestamp: "Jul 01, 2026" },
  { id: "ACT-7004", type: "trainer_added", description: "Added new trainer David Beckham", timestamp: "Jun 15, 2026" },
];

const defaultSettings: GymSettings = {
  gymName: "Gymation Fitness",
  email: "admin@gymation.com",
  phone: "+1 555-GYM-INFO",
  address: "500 Fitness Blvd, Muscle City",
  currency: "$",
  taxRate: 8.25,
  enableNotifications: true,
  theme: "light",
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [settings, setSettings] = useState<GymSettings>(defaultSettings);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [searchQuery, setSearchQuery] = useState("");

  // Load from Local Storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const getOrSet = <T,>(key: string, defaultValue: T): T => {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            return JSON.parse(stored) as T;
          } catch {
            return defaultValue;
          }
        }
        localStorage.setItem(key, JSON.stringify(defaultValue));
        return defaultValue;
      };

      setMembers(getOrSet("gym_members", defaultMembers));
      setTrainers(getOrSet("gym_trainers", defaultTrainers));
      setPlans(getOrSet("gym_plans", defaultPlans));
      setPayments(getOrSet("gym_payments", defaultPayments));
      setAttendance(getOrSet("gym_attendance", defaultAttendance));
      setNotifications(getOrSet("gym_notifications", defaultNotifications));
      setActivities(getOrSet("gym_activities", defaultActivities));
      
      const savedSettings = getOrSet("gym_settings", defaultSettings);
      setSettings(savedSettings);
      setTheme(savedSettings.theme || "light");
      
      setIsInitialized(true);
    }
  }, []);

  // Sync state to local storage when it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("gym_members", JSON.stringify(members));
    }
  }, [members, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("gym_trainers", JSON.stringify(trainers));
    }
  }, [trainers, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("gym_plans", JSON.stringify(plans));
    }
  }, [plans, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("gym_payments", JSON.stringify(payments));
    }
  }, [payments, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("gym_attendance", JSON.stringify(attendance));
    }
  }, [attendance, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("gym_notifications", JSON.stringify(notifications));
    }
  }, [notifications, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("gym_activities", JSON.stringify(activities));
    }
  }, [activities, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("gym_settings", JSON.stringify(settings));
      // Update HTML class for dark mode
      const root = window.document.documentElement;
      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [settings, theme, isInitialized]);

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

  // Members API
  const addMember = (memberData: Omit<Member, "id">) => {
    const newId = `M-${Math.floor(1000 + Math.random() * 9000)}`;
    const newMember: Member = {
      ...memberData,
      id: newId,
    };
    setMembers((prev) => [newMember, ...prev]);
    addActivity("member_added", `Registered new member ${newMember.name}`);
    addNotification("New Member Registered", `${newMember.name} has joined the gym.`, "success");
    toast.success(`Member ${newMember.name} added successfully!`);
  };

  const updateMember = (id: string, updatedData: Partial<Member>) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updatedData } as Member : m))
    );
    const memberName = members.find((m) => m.id === id)?.name || "Member";
    addActivity("member_updated", `Updated member profile for ${memberName}`);
    toast.success(`Member profile updated!`);
  };

  const deleteMember = (id: string) => {
    const memberName = members.find((m) => m.id === id)?.name || "Member";
    setMembers((prev) => prev.filter((m) => m.id !== id));
    // Clean up attendance and payments
    setAttendance((prev) => prev.filter((a) => a.memberId !== id));
    setPayments((prev) => prev.filter((p) => p.memberId !== id));
    addActivity("member_updated", `Deleted member ${memberName}`);
    toast.success(`Member deleted and records archived.`);
  };

  // Trainers API
  const addTrainer = (trainerData: Omit<Trainer, "id">) => {
    const newId = `T-${Math.floor(2000 + Math.random() * 9000)}`;
    const newTrainer: Trainer = {
      ...trainerData,
      id: newId,
    };
    setTrainers((prev) => [...prev, newTrainer]);
    addActivity("trainer_added", `Onboarded new trainer ${newTrainer.name}`);
    addNotification("New Trainer Onboarded", `${newTrainer.name} joined as a personal trainer.`, "info");
    toast.success(`Trainer ${newTrainer.name} onboarded!`);
  };

  const updateTrainer = (id: string, updatedData: Partial<Trainer>) => {
    setTrainers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updatedData } as Trainer : t))
    );
    toast.success("Trainer updated successfully!");
  };

  const deleteTrainer = (id: string) => {
    setTrainers((prev) => prev.filter((t) => t.id !== id));
    // Reset assigned trainer for members
    setMembers((prev) =>
      prev.map((m) => (m.trainerId === id ? { ...m, trainerId: "" } : m))
    );
    toast.success("Trainer removed successfully.");
  };

  // Plans API
  const addPlan = (planData: Omit<MembershipPlan, "id">) => {
    const newId = `P-${Math.floor(3000 + Math.random() * 9000)}`;
    const newPlan: MembershipPlan = {
      ...planData,
      id: newId,
    };
    setPlans((prev) => [...prev, newPlan]);
    addActivity("plan_updated", `Created a new plan: ${newPlan.name}`);
    toast.success(`Membership plan ${newPlan.name} created!`);
  };

  const updatePlan = (id: string, updatedData: Partial<MembershipPlan>) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updatedData } as MembershipPlan : p))
    );
    toast.success("Membership plan updated!");
  };

  const deletePlan = (id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
    toast.success("Membership plan deleted.");
  };

  // Payments API
  const addPayment = (paymentData: Omit<Payment, "id">) => {
    const newId = `PAY-${Math.floor(4000 + Math.random() * 9000)}`;
    const newPayment: Payment = {
      ...paymentData,
      id: newId,
    };
    setPayments((prev) => [newPayment, ...prev]);
    addActivity("payment_added", `Received payment of ${settings.currency}${newPayment.amount} from ${newPayment.memberName}`);
    addNotification("Payment Received", `Received ${settings.currency}${newPayment.amount} for plan renewal.`, "success");
    toast.success(`Payment of ${settings.currency}${newPayment.amount} recorded!`);
  };

  const updatePayment = (id: string, updatedData: Partial<Payment>) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updatedData } as Payment : p))
    );
  };

  // Attendance API
  const markAttendance = (memberId: string, status: "Present" | "Absent", date?: string) => {
    const today = date || new Date().toISOString().split("T")[0];
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    // Check if attendance record already exists for this member on this date
    setAttendance((prev) => {
      const existingIdx = prev.findIndex((a) => a.memberId === memberId && a.date === today);
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          status,
          checkInTime: status === "Present" ? currentTime : undefined,
        };
        return updated;
      } else {
        const newRecord: Attendance = {
          id: `ATT-${Date.now()}`,
          memberId,
          memberName: member.name,
          date: today,
          status,
          checkInTime: status === "Present" ? currentTime : undefined,
        };
        return [newRecord, ...prev];
      }
    });

    addActivity("attendance_marked", `Marked ${member.name} as ${status}`);
    toast.success(`Marked ${member.name} as ${status} for today.`);
  };

  // Notifications API
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
    toast.success("Notification center cleared.");
  };

  // Settings API
  const updateSettings = (updatedSettings: Partial<GymSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updatedSettings };
      if (updatedSettings.theme) {
        setTheme(updatedSettings.theme);
      }
      return next;
    });
    toast.success("Settings updated successfully!");
  };

  return (
    <AppContext.Provider
      value={{
        members,
        trainers,
        plans,
        payments,
        attendance,
        notifications,
        activities,
        settings,
        theme,
        searchQuery,
        setSearchQuery,
        toggleTheme,
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
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
