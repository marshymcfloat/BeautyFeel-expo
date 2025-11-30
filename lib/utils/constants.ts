/**
 * Shared constants and configuration
 */

export const COLORS = {
  primary: "#ec4899",
  primaryDark: "#d946ef",
  primaryLight: "#a855f7",
  background: "#f9fafb",
  backgroundLight: "#fdf2f8",
  backgroundMedium: "#fce7f3",
  white: "#ffffff",
  text: "#111827",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  success: "#16a34a",
  warning: "#d97706",
  error: "#ef4444",
  info: "#2563eb",
} as const;

export const GRADIENT_COLORS = {
  primary: ["#ec4899", "#d946ef", "#a855f7"],
  primaryShort: ["#ec4899", "#d946ef"],
  background: ["#fdf2f8", "#fce7f3", "#f9fafb"],
  backgroundShort: ["#fce7f3", "#e9d5ff"],
} as const;

export const BOOKING_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
  NO_SHOW: "NO_SHOW",
} as const;

export const SERVICE_STATUS = {
  UNCLAIMED: "UNCLAIMED",
  CLAIMED: "CLAIMED",
  SERVED: "SERVED",
} as const;
