import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ItemCategory, ItemStatus, ReportType } from "@/types/report";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function timeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  } catch {
    return dateString;
  }
}

export const CATEGORY_LABELS: Record<ItemCategory, { label: string; icon: string }> = {
  electronics: { label: "Electronics & Gadgets", icon: "Laptop" },
  id_cards: { label: "Student IDs & Cards", icon: "CreditCard" },
  keys: { label: "Keys & Keychains", icon: "Key" },
  bags: { label: "Bags & Backpacks", icon: "Backpack" },
  clothing: { label: "Clothing & Apparel", icon: "Shirt" },
  books: { label: "Books & Study Material", icon: "BookOpen" },
  accessories: { label: "Watches & Jewelry", icon: "Watch" },
  water_bottles: { label: "Bottles & Flasks", icon: "Coffee" },
  other: { label: "Other Belongings", icon: "Package" },
};

export const STATUS_CONFIG: Record<
  ItemStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  active: {
    label: "Active Listing",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  matched: {
    label: "Potential Match",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800",
    dot: "bg-indigo-500",
  },
  pending_claim: {
    label: "Claim in Progress",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  returned: {
    label: "Successfully Returned",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
  },
  closed: {
    label: "Closed / Resolved",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-300 dark:border-slate-700",
    dot: "bg-slate-400",
  },
};

export function generateReferenceNumber(prefix: 'LL' | 'FD' | 'CLM'): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${random}`;
}

