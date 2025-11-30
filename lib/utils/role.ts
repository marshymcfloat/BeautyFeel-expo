/**
 * Role-related utilities
 */

export type Role = "OWNER" | "CASHIER" | "WORKER" | "MASSEUSE";

export function getRoleDisplayName(role: Role | null | undefined): string {
  if (!role) return "Employee";
  const roleMap: Record<Role, string> = {
    OWNER: "Owner",
    CASHIER: "Cashier",
    WORKER: "Worker",
    MASSEUSE: "Masseuse",
  };
  return roleMap[role] || role;
}

export function getRoleName(role: Role): string {
  const roleMap: Record<Role, string> = {
    WORKER: "Worker",
    MASSEUSE: "Masseuse",
    CASHIER: "Cashier",
    OWNER: "Owner",
  };
  return roleMap[role] || "Employee";
}

