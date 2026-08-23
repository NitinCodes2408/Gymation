import type { PasswordStrength } from "./types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$|^[+]?[\d\s()-]{7,20}$/;

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required";
  if (!EMAIL_REGEX.test(trimmed)) return "Please enter a valid email address";
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  return undefined;
}

export function validateLoginPassword(password: string): string | undefined {
  if (!password) return "Password is required";
  return undefined;
}

export function validateConfirmPassword(password: string, confirmPassword: string): string | undefined {
  if (!confirmPassword) return "Please confirm your password";
  if (password !== confirmPassword) return "Passwords do not match";
  return undefined;
}

export function validateName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Owner name is required";
  if (trimmed.length < 2) return "Owner name must be at least 2 characters";
  return undefined;
}

export function validateGymName(gymName: string): string | undefined {
  const trimmed = gymName.trim();
  if (!trimmed) return "Gym name is required";
  if (trimmed.length < 2) return "Gym name must be at least 2 characters";
  return undefined;
}

export function validatePhone(phone: string): string | undefined {
  const trimmed = phone.trim();
  if (!trimmed) return "Phone number is required";
  if (!PHONE_REGEX.test(trimmed)) return "Please enter a valid phone number";
  return undefined;
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "Weak", color: "text-slate-400", barColor: "bg-slate-200" };
  }

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) || /[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  if (password.length >= 10) score = Math.min(4, score + 1) as 0 | 1 | 2 | 3 | 4;

  const levels: PasswordStrength[] = [
    { score: 0, label: "Weak", color: "text-red-500", barColor: "bg-red-500" },
    { score: 1, label: "Fair", color: "text-orange-500", barColor: "bg-orange-500" },
    { score: 2, label: "Good", color: "text-amber-500", barColor: "bg-amber-500" },
    { score: 3, label: "Strong", color: "text-blue-500", barColor: "bg-blue-500" },
    { score: 4, label: "Very Strong", color: "text-emerald-500", barColor: "bg-emerald-500" },
  ];

  return levels[score] || levels[0];
}
