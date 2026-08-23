"use client";

import { getPasswordStrength } from "@/lib/auth/validation";

interface PasswordStrengthIndicatorProps {
  password: string;
}

export default function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const bars = [1, 2, 3, 4];

  return (
    <div className="space-y-1.5 transition-all">
      <div className="flex gap-1">
        {bars.map((bar) => (
          <div
            key={bar}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              bar <= strength.score ? strength.barColor : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${strength.color}`}>
        Password strength: {strength.label}
      </p>
    </div>
  );
}
