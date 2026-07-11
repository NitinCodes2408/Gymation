"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  CalendarCheck, 
  Wallet, 
  BarChart3, 
  Settings, 
  LogOut,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Menu,
  X
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const menuItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Members", href: "/members", icon: Users },
  { name: "Trainers", href: "/trainers", icon: UserCheck },
  { name: "Membership Plans", href: "/membership-plans", icon: CreditCard },
  { name: "Attendance", href: "/attendance", icon: CalendarCheck },
  { name: "Payments", href: "/payments", icon: Wallet },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ isOpenMobile, setIsOpenMobile, isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    toast.error("Logged out successfully (frontend simulation).");
    // Redirect or simulate log out
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 dark:bg-slate-950 text-slate-300 border-r border-slate-800 dark:border-slate-900 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-slate-800 dark:border-slate-900">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-blue-600 p-1.5 rounded-lg text-white flex-shrink-0">
            <Dumbbell size={24} />
          </div>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-xl font-bold text-white tracking-tight whitespace-nowrap"
            >
              Gymation
            </motion.span>
          )}
        </div>

        {/* Mobile Close Button */}
        <button 
          onClick={() => setIsOpenMobile(false)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              onClick={() => setIsOpenMobile(false)}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all group relative",
                isActive 
                  ? "bg-blue-600 text-white" 
                  : "hover:bg-slate-800/60 hover:text-slate-100"
              )}
            >
              <item.icon size={20} className={clsx(isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200")} />
              
              {!isCollapsed && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-nowrap"
                >
                  {item.name}
                </motion.span>
              )}

              {/* Tooltip for Collapsed view */}
              {isCollapsed && (
                <div className="absolute left-16 scale-0 rounded bg-slate-950 px-2.5 py-1.5 text-xs text-white group-hover:scale-100 transition-all z-50 pointer-events-none whitespace-nowrap shadow-md">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Collapse Toggle Button (Desktop Only) */}
      <div className="hidden lg:flex px-6 py-3 border-t border-slate-800 dark:border-slate-900 justify-end">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-800 dark:border-slate-900">
        <button 
          onClick={handleLogout}
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 w-full rounded-xl font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-all group relative",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut size={20} className="group-hover:text-red-400" />
          {!isCollapsed && <span>Logout</span>}
          {isCollapsed && (
            <div className="absolute left-16 scale-0 rounded bg-slate-950 px-2.5 py-1.5 text-xs text-red-400 group-hover:scale-100 transition-all z-50 pointer-events-none whitespace-nowrap shadow-md">
              Logout
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={clsx(
          "fixed left-0 top-0 h-screen bg-slate-900 dark:bg-slate-950 text-slate-300 hidden lg:flex flex-col transition-all duration-300 z-20",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (AnimatePresence) */}
      <AnimatePresence>
        {isOpenMobile && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpenMobile(false)}
              className="fixed inset-0 bg-black z-30 lg:hidden"
            />
            {/* Drawer Body */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-screen w-64 z-40 lg:hidden shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
