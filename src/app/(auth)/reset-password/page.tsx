"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthInput from "@/components/auth/AuthInput";
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";
import { validatePassword, validateConfirmPassword } from "@/lib/auth/validation";
import type { FieldErrors } from "@/lib/auth/types";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword } = useAuth();
  const token = searchParams.get("token") || "";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid reset link. Please request a new one.");
    }
  }, [token]);

  const validateField = (field: string) => {
    let error: string | undefined;
    if (field === "password") error = validatePassword(password);
    if (field === "confirmPassword") error = validateConfirmPassword(password, confirmPassword);
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Invalid reset link");
      return;
    }

    setTouched({ password: true, confirmPassword: true });
    const passwordValid = validateField("password");
    const confirmValid = validateField("confirmPassword");
    if (!passwordValid || !confirmValid) return;

    setIsSubmitting(true);
    const result = await resetPassword(token, password);

    if (result.success) {
      setSuccess(true);
      toast.success("Password reset successfully!");
      setTimeout(() => router.push("/login"), 2000);
    } else {
      toast.error(result.error || "Failed to reset password");
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Password reset!" subtitle="Your password has been updated successfully.">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
            <Lock size={28} className="text-blue-600" />
          </div>
          <p className="text-slate-600">Redirecting you to sign in...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset password" subtitle="Enter your new password below.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <AuthInput
            label="New Password"
            type="password"
            value={password}
            onChange={setPassword}
            onBlur={() => handleBlur("password")}
            placeholder="••••••••"
            icon={Lock}
            showToggle
            error={touched.password ? errors.password : undefined}
            autoComplete="new-password"
          />
          <PasswordStrengthIndicator password={password} />
        </div>

        <AuthInput
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          onBlur={() => handleBlur("confirmPassword")}
          placeholder="••••••••"
          icon={Lock}
          showToggle
          error={touched.confirmPassword ? errors.confirmPassword : undefined}
          autoComplete="new-password"
        />

        <Button type="submit" className="w-full h-11 text-base group" disabled={isSubmitting || !token}>
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              Reset Password
              <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-500">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Sign In
        </Link>
      </div>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
