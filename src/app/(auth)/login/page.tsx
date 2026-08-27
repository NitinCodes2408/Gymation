"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthInput from "@/components/auth/AuthInput";
import { validateEmail, validateLoginPassword } from "@/lib/auth/validation";
import type { FieldErrors } from "@/lib/auth/types";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: string) => {
    let error: string | undefined;
    if (field === "email") error = validateEmail(value);
    if (field === "password") error = validateLoginPassword(value);
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === "email") validateField("email", email);
    if (field === "password") validateField("password", password);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    const emailValid = validateField("email", email);
    const passwordValid = validateField("password", password);
    if (!emailValid || !passwordValid) return;

    setIsSubmitting(true);
    const result = await login(email, password, rememberMe);

    if (result.success) {
      toast.success("Welcome back to Gymation!");
      router.push("/dashboard");
    } else {
      toast.error(result.error || "Invalid email or password.");
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Gym Owner Sign In" subtitle="Enter your registered email and password to access your dashboard.">
      <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
        <AuthInput
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          onBlur={() => handleBlur("email")}
          placeholder="owner@example.com"
          icon={Mail}
          error={touched.email ? errors.email : undefined}
          autoComplete="off"
        />

        <AuthInput
          label="Password"
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

        <div className="flex items-center justify-between text-sm pb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-slate-600 dark:text-slate-400 font-medium">Remember me</span>
          </label>
          <Link href="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full h-11 text-base group" disabled={isSubmitting}>
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              Sign In to Console
              <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-8 text-center text-sm text-slate-500 space-y-3">
        <p>
          Don&apos;t have an owner account or want to register a gym?{" "}
          <Link href="/signup" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
            Register your gym
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
