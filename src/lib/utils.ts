import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a numeric amount into Indian Rupees (INR / ₹) with standard Indian numbering system grouping.
 * Examples:
 *  - formatCurrency(500) -> "₹500"
 *  - formatCurrency(1500) -> "₹1,500"
 *  - formatCurrency(10000) -> "₹10,000"
 *  - formatCurrency(25000) -> "₹25,000"
 *  - formatCurrency(100000) -> "₹1,00,000"
 *  - formatCurrency(2500000) -> "₹25,00,000"
 */
export function formatCurrency(amount: number | string | undefined | null, includeSymbol: boolean = true): string {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount || 0));
  const validNum = isNaN(num) ? 0 : num;
  const isNegative = validNum < 0;

  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Math.abs(validNum));

  if (!includeSymbol) {
    return isNegative ? `-${formatted}` : formatted;
  }
  return isNegative ? `-₹${formatted}` : `₹${formatted}`;
}

/**
 * Formats a number with Indian grouping (e.g. 1,00,000).
 */
export function formatIndianNumber(num: number | string | undefined | null): string {
  const n = typeof num === "number" ? num : parseFloat(String(num || 0));
  const validNum = isNaN(n) ? 0 : n;
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(validNum);
}
