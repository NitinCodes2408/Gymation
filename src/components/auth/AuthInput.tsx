"use client";

import { useState } from "react";
import { Eye, EyeOff, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthInputProps {
  label: string;
  type?: "text" | "email" | "password" | "tel";
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  icon: LucideIcon;
  error?: string;
  showToggle?: boolean;
  required?: boolean;
  autoComplete?: string;
}

export default function AuthInput({
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  icon: Icon,
  error,
  showToggle = false,
  required = true,
  autoComplete,
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showToggle ? (showPassword ? "text" : "password") : type;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon size={18} className="text-slate-400" />
        </div>
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={cn(
            "block w-full pl-10 py-2.5 border rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm",
            showToggle && isPassword ? "pr-10" : "pr-3",
            error ? "border-red-300 focus:ring-red-500 focus:border-red-500" : "border-slate-200"
          )}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
        />
        {showToggle && isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 font-medium transition-all">{error}</p>
      )}
    </div>
  );
}
