"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.replace("/login");
    }
  }, [isLoading, isAuthenticated]);

  // Mobile Back-Forward Cache (bfcache) protection for iOS Safari & Android Chrome
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && !isAuthenticated) {
        window.location.replace("/login");
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Redirecting to login...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
