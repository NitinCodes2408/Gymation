"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, Phone, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import AuthInput from "@/components/auth/AuthInput";
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateName,
  validateGymName,
  validatePhone,
} from "@/lib/auth/validation";
import type { FieldErrors } from "@/lib/auth/types";

export default function SignUpPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [gymName, setGymName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string) => {
    let error: string | undefined;
    switch (field) {
      case "name":
        error = validateName(name);
        break;
      case "gymName":
        error = validateGymName(gymName);
        break;
      case "email":
        error = validateEmail(email);
        break;
      case "phone":
        error = validatePhone(phone);
        break;
      case "password":
        error = validatePassword(password);
        break;
      case "confirmPassword":
        error = validateConfirmPassword(password, confirmPassword);
        break;
    }
    setErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fields = ["name", "gymName", "email", "phone", "password", "confirmPassword"];
    setTouched(Object.fromEntries(fields.map((f) => [f, true])));

    const allValid = fields.every((f) => validateField(f));
    if (!allValid) return;

    setIsSubmitting(true);
    const result = await register({ name, gymName, email, phone, password });

    if (result.success) {
      if (result.isNewGymForExistingOwner) {
        toast.success("New gym branch registered to your account! Please login to continue.");
      } else {
        toast.success("Account created successfully. Please login to continue.");
      }
      router.push("/login");
    } else {
      toast.error(result.error || "Registration failed");
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Register Gym Owner" subtitle="Create your dedicated gym management console.">
      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <AuthInput
          label="Owner Name *"
          type="text"
          value={name}
          onChange={setName}
          onBlur={() => handleBlur("name")}
          placeholder="e.g. Rajesh Sharma"
          icon={User}
          error={touched.name ? errors.name : undefined}
          autoComplete="off"
        />

        <AuthInput
          label="Gym Name *"
          type="text"
          value={gymName}
          onChange={setGymName}
          onBlur={() => handleBlur("gymName")}
          placeholder="e.g. Paradise Fitness"
          icon={Building2}
          error={touched.gymName ? errors.gymName : undefined}
          autoComplete="off"
        />

        <AuthInput
          label="Email Address *"
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
          label="Phone Number *"
          type="tel"
          value={phone}
          onChange={setPhone}
          onBlur={() => handleBlur("phone")}
          placeholder="+91 98765 43210"
          icon={Phone}
          error={touched.phone ? errors.phone : undefined}
          autoComplete="off"
        />

        <div className="space-y-2">
          <AuthInput
            label="Password *"
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
          label="Confirm Password *"
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

        <Button type="submit" className="w-full h-11 text-base group" disabled={isSubmitting}>
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              Register Gym & Owner
              <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        <p>
          Already have an owner account?{" "}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
