"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import AuthGuard from "@/components/auth/AuthGuard";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace("/");
      } else {
        window.location.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <AuthGuard>
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </AuthGuard>
  );
}
