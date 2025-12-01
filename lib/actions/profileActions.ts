import { supabase } from "../utils/supabase";
import type { Database } from "@/database.types";

type PayslipRelease = Database["public"]["Tables"]["payslip_release"]["Row"];

export interface ProfileStats {
  totalAppointments: number;
  memberSince: string; // Date string
  memberYears: number;
}

export interface EarningsStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
  allTime: number;
}

/**
 * Get profile statistics for an employee
 */
export async function getProfileStats(
  employeeId: string,
): Promise<{ success: boolean; data?: ProfileStats; error?: string }> {
  try {
    // First get employee to get user_id
    const { data: employee, error: employeeError } = await supabase
      .from("employee")
      .select("created_at, user_id")
      .eq("id", employeeId)
      .single();

    if (employeeError) {
      console.error("Error fetching employee:", employeeError);
      return { success: false, error: employeeError.message };
    }

    if (!employee?.user_id) {
      return {
        success: true,
        data: {
          totalAppointments: 0,
          memberSince: employee?.created_at || new Date().toISOString(),
          memberYears: 0,
        },
      };
    }

    // Count services served by this employee (using user_id from employee)
    const { count: appointmentsCount, error: appointmentsError } =
      await supabase
        .from("service_bookings")
        .select("*", { count: "exact", head: true })
        .eq("served_by", employee.user_id)
        .eq("status", "SERVED");

    if (appointmentsError) {
      console.error("Error counting appointments:", appointmentsError);
      // Don't fail completely, just log and continue with 0 count
      console.warn("Could not count appointments, using 0");
    }

    const createdDate = new Date(employee.created_at);
    const now = new Date();
    const memberYears = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365),
    );

    return {
      success: true,
      data: {
        totalAppointments: appointmentsCount || 0,
        memberSince: createdDate.toISOString(),
        memberYears,
      },
    };
  } catch (error) {
    console.error("Error in getProfileStats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get payslip releases for an employee
 */
export async function getMyPayslipReleases(
  employeeId: string
): Promise<{ success: boolean; data?: PayslipRelease[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("payslip_release")
      .select("*")
      .eq("employee_id", employeeId)
      .order("released_at", { ascending: false });

    if (error) {
      console.error("Error fetching payslip releases:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error in getMyPayslipReleases:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get earnings statistics for different time spans
 */
export async function getEarningsStats(
  employeeId: string
): Promise<{ success: boolean; data?: EarningsStats; error?: string }> {
  try {
    // Get all payslip releases for this employee
    const { data: releases, error: releasesError } = await supabase
      .from("payslip_release")
      .select("total_amount, released_at")
      .eq("employee_id", employeeId);

    if (releasesError) {
      console.error("Error fetching payslip releases:", releasesError);
      return { success: false, error: releasesError.message };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);

    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;
    let yearTotal = 0;
    let allTimeTotal = 0;

    (releases || []).forEach((release) => {
      const releaseDate = new Date(release.released_at);
      const amount = Number(release.total_amount || 0);

      allTimeTotal += amount;

      if (releaseDate >= thisYear) {
        yearTotal += amount;
      }

      if (releaseDate >= thisMonth) {
        monthTotal += amount;
      }

      if (releaseDate >= thisWeek) {
        weekTotal += amount;
      }

      if (releaseDate >= today) {
        todayTotal += amount;
      }
    });

    return {
      success: true,
      data: {
        today: todayTotal,
        thisWeek: weekTotal,
        thisMonth: monthTotal,
        thisYear: yearTotal,
        allTime: allTimeTotal,
      },
    };
  } catch (error) {
    console.error("Error in getEarningsStats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update employee name
 */
export async function updateEmployeeName(
  employeeId: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("employee")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", employeeId);

    if (error) {
      console.error("Error updating employee name:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updateEmployeeName:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update user password
 */
export async function updatePassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("Error updating password:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in updatePassword:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
