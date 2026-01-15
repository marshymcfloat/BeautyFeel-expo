import type { Database } from "../../database.types";
import { supabase } from "../utils/supabase";
import { getPhilippineDate } from "../utils/dateTime";

type Branch = Database["public"]["Enums"]["branch"];

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  attendance_date: string;
  is_present: boolean;
  daily_rate_applied: number;
  marked_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWithAttendance {
  id: string;
  user_id: string;
  name: string | null;
  salary: number;
  daily_rate: number;
  role: "OWNER" | "CASHIER" | "WORKER" | "MASSEUSE"; // Single enum value
  created_at: string;
  attendance?: AttendanceRecord | null;
}

// Helper to determine branches to include based on owner's branch
function getBranchesForOwner(ownerBranch: Branch | null): Branch[] {
  if (ownerBranch === "SKIN") {
    return ["NAILS", "SKIN", "MASSAGE"]; // All except LASHES
  }
  if (ownerBranch === "LASHES") {
    return ["LASHES"]; // Only LASHES
  }
  return ["NAILS", "SKIN", "LASHES", "MASSAGE"]; // All branches for other owners/admins
}

/**
 * Fetch all employees for owner to manage attendance
 */
export async function getAllEmployeesForAttendance(ownerBranch: Branch | null = null) {
  try {
    const branchesToInclude = getBranchesForOwner(ownerBranch);
    
    let query = supabase
      .from("employee")
      .select("*")
      .order("created_at", { ascending: true });
    
    // Filter by branch if ownerBranch is provided
    if (ownerBranch) {
      query = query.in("branch", branchesToInclude);
    }
    
    const { data: employees, error: employeesError } = await query;

    if (employeesError) {
      console.error("Error fetching employees:", employeesError);
      return {
        success: false,
        error: employeesError.message || "Failed to fetch employees",
      };
    }

    // Get today's date in YYYY-MM-DD format using Philippine time (UTC+8)
    const today = getPhilippineDate();

    // Fetch today's attendance for all employees
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance")
      .select("*")
      .eq("attendance_date", today);

    if (attendanceError) {
      console.error("Error fetching attendance:", attendanceError);
      // Continue without attendance data
    }

    // Fetch user emails/info for each employee
    // Note: We'll fetch user info separately as we can't join auth.users directly
    const employeesWithAttendance: EmployeeWithAttendance[] = employees.map(
      (emp) => {
        const todayAttendance = attendance?.find(
          (att) => att.employee_id === emp.id,
        );

        // Normalize role - handle both array and single value cases
        let normalizedRole: "OWNER" | "CASHIER" | "WORKER" | "MASSEUSE";
        if (Array.isArray(emp.role)) {
          // If it's an array, take the first value and convert to uppercase
          normalizedRole = (emp.role[0]?.toUpperCase() || "WORKER") as
            | "OWNER"
            | "CASHIER"
            | "WORKER"
            | "MASSEUSE";
        } else if (typeof emp.role === "string") {
          // If it's a string, ensure it's uppercase
          normalizedRole = (emp.role.toUpperCase() || "WORKER") as
            | "OWNER"
            | "CASHIER"
            | "WORKER"
            | "MASSEUSE";
        } else {
          // Default fallback
          normalizedRole = "WORKER";
        }

        return {
          id: emp.id,
          user_id: emp.user_id,
          name: emp.name ?? null,
          salary: emp.salary,
          daily_rate: emp.daily_rate ?? 0,
          role: normalizedRole,
          created_at: emp.created_at,
          attendance: todayAttendance || null,
        };
      },
    );

    return {
      success: true,
      data: employeesWithAttendance,
    };
  } catch (error) {
    console.error(
      "Unexpected error fetching employees with attendance:",
      error,
    );
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Mark employee attendance for today
 */
export async function markAttendanceAction(
  employeeId: string,
  isPresent: boolean,
  attendanceDate?: string,
) {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "Authentication required",
      };
    }

    // Use today's date in Philippine time if not provided
    const date = attendanceDate || getPhilippineDate();

    // Call the database function to mark attendance and update salary
    const { data, error } = await supabase.rpc(
      "mark_attendance_and_update_salary",
      {
        p_employee_id: employeeId,
        p_attendance_date: date,
        p_is_present: isPresent,
        p_marked_by: user.id,
      },
    );

    if (error) {
      console.error("Error marking attendance:", error);
      return {
        success: false,
        error: error.message || "Failed to mark attendance",
      };
    }

    // The function returns JSON, so we need to parse it
    const result = typeof data === "string" ? JSON.parse(data) : data;

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to mark attendance",
      };
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Unexpected error marking attendance:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get attendance records for an employee
 */
export async function getEmployeeAttendance(
  employeeId: string,
  startDate?: string,
  endDate?: string,
) {
  try {
    let query = supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .order("attendance_date", { ascending: false });

    if (startDate) {
      query = query.gte("attendance_date", startDate);
    }

    if (endDate) {
      query = query.lte("attendance_date", endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching attendance:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch attendance",
      };
    }

    return {
      success: true,
      data: data as AttendanceRecord[],
    };
  } catch (error) {
    console.error("Unexpected error fetching attendance:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
