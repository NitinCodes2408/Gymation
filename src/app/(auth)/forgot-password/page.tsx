"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthInput from "@/components/auth/AuthInput";
import { validateEmail } from "@/lib/auth/validation";

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);

  const handleBlur = () => {
    setTouched(true);
    setError(validateEmail(email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const emailError = validateEmail(email);
    setError(emailError);
    if (emailError) return;

    setIsSubmitting(true);
    const result = await requestPasswordReset(email);

    if (result.success) {
      setSent(true);
      toast.success("Password reset email sent! Please check your inbox.");
    } else {
      toast.error(result.error || "Failed to send reset link");
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a password reset link."
    >
      {sent ? (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
            <Mail size={28} className="text-blue-600" />
          </div>
          <p className="text-slate-600">
            A password reset email has been sent to{" "}
            <span className="font-medium text-slate-800">{email}</span>.
          </p>
          <p className="text-sm text-slate-500">
            Please check your inbox (and spam folder) for the password reset instructions.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthInput
            label="Email Address"
            type="email"
            value={email}
            onChange={setEmail}
            onBlur={handleBlur}
            placeholder="owner@example.com"
            icon={Mail}
            error={touched ? error : undefined}
            autoComplete="email"
          />

          <Button type="submit" className="w-full h-11 text-base group" disabled={isSubmitting}>
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                Send Reset Link
                <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>
      )}

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
