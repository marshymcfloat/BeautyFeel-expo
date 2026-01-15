import type { Database } from "../../database.types";
import { supabase } from "../utils/supabase";

type Employee = Database["public"]["Tables"]["employee"]["Row"];

export type EmployeeRole = "OWNER" | "CASHIER" | "WORKER" | "MASSEUSE";

export interface EmployeeWithRole {
  id: string;
  user_id: string;
  salary: number;
  last_payslip_release: string | null;
  role: EmployeeRole; // Single enum value, not an array
  branch: "NAILS" | "SKIN" | "LASHES" | "MASSAGE" | null;
  commission_rate: number;
  daily_rate?: number;
  can_request_payslip?: boolean;
  name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryBreakdown {
  currentSalary: number;
  totalCommission: number;
  totalDailyRate: number;
  attendanceRecords: Array<{
    date: string;
    isPresent: boolean;
    dailyRateApplied: number;
  }>;
  servicesServed: Array<{
    id: number;
    serviceName: string;
    price: number;
    servedAt: string;
    commissionAmount: number;
    bookingId: number;
  }>;
  commissionTransactions: Array<{
    id: string;
    amount: number;
    servicePrice: number;
    commissionRate: number;
    createdAt: string;
    bookingId: number;
  }>;
}

export interface SalesSummary {
  totalCommissions: number;
  totalSalesDeductions: number;
  netSales: number;
  totalCommissionTransactions: number;
}

/**
 * Fetch employee record by user_id (auth user ID)
 */
export async function getEmployeeByUserId(userId: string) {
  try {
    const { data, error } = await supabase
      .from("employee")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No employee record found - this is OK, not an error
        return {
          success: true,
          data: null,
        };
      }
      
      // Check if error message contains HTML (500 error from Cloudflare)
      const errorMessage = error.message || "";
      if (errorMessage.includes("<html>") || errorMessage.includes("500")) {
        // Silently handle 500 errors - they're expected during server issues
        // Return success with null data to prevent infinite loops
        // The app can still function without employee data
        return {
          success: true,
          data: null,
        };
      }
      
      console.error("Error fetching employee:", error);
      // For other errors, still return success with null to prevent blocking
      return {
        success: true,
        data: null,
      };
    }

    // Handle null/undefined data
    if (!data) {
      return {
        success: true,
        data: null,
      };
    }

    // Normalize role - handle both array and single value cases
    const employeeData = data as Employee;
    let normalizedRole: EmployeeRole;
    if (Array.isArray(employeeData.role)) {
      // If it's an array, take the first value and convert to uppercase
      normalizedRole =
        (employeeData.role[0]?.toUpperCase() || "WORKER") as EmployeeRole;
    } else if (typeof employeeData.role === "string") {
      // If it's a string, ensure it's uppercase
      normalizedRole =
        (employeeData.role.toUpperCase() || "WORKER") as EmployeeRole;
    } else {
      // Default fallback
      normalizedRole = "WORKER";
    }

    return {
      success: true,
      data: {
        ...employeeData,
        role: normalizedRole,
      } as EmployeeWithRole,
    };
  } catch (error: any) {
    console.error("Unexpected error fetching employee:", error);
    
    // Check if error contains HTML (500 error)
    const errorMessage = error?.message || error?.toString() || "";
    if (errorMessage.includes("<html>") || errorMessage.includes("500")) {
      // Silently handle 500 errors - they're expected during server issues
      return {
        success: true,
        data: null,
      };
    }
    
    // For any other error, return success with null to prevent blocking
    return {
      success: true,
      data: null,
    };
  }
}

/**
 * Create a new employee with auth user
 */
export async function createEmployeeAction(data: {
  name: string;
  email: string;
  password: string;
  role: EmployeeRole;
  branch?: "NAILS" | "SKIN" | "LASHES" | "MASSAGE" | null;
  salary?: number;
  commission_rate?: number;
  daily_rate?: number;
  can_request_payslip?: boolean;
}) {
  try {
    // Create auth user via Edge Function
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        error:
          "Missing Supabase configuration. Please check your environment variables.",
      };
    }

    // Get the current user's session token for authentication
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return {
        success: false,
        error: "You must be logged in to create employees.",
      };
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/create-employee-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: "Failed to create user account",
      }));
      console.error("Error creating auth user:", errorData);
      return {
        success: false,
        error: errorData.error || "Failed to create user account",
      };
    }

    const authResult = await response.json();
    const userId = authResult.user_id;

    if (!userId) {
      return {
        success: false,
        error: "Failed to get user ID from auth creation",
      };
    }

    // Set daily_rate based on role if not provided
    const role = data.role;
    const defaultDailyRate = data.daily_rate !== undefined
      ? data.daily_rate
      : role === "WORKER"
      ? 350.0
      : 0.0;

    // Create employee record
    const employeeInsert = {
      user_id: userId,
      name: data.name,
      salary: data.salary ?? 0,
      role: role,
      branch: data.branch ?? null,
      commission_rate: data.commission_rate ?? 0,
      daily_rate: defaultDailyRate,
      can_request_payslip: data.can_request_payslip ?? true,
    };

    const { data: employee, error: empError } = await supabase
      .from("employee")
      .insert(employeeInsert as any)
      .select()
      .single();

    if (empError) {
      console.error("Error creating employee:", empError);
      // If employee creation fails, we should ideally delete the auth user
      // For now, just return the error
      return {
        success: false,
        error: empError.message || "Failed to create employee record",
      };
    }

    return {
      success: true,
      data: employee as EmployeeWithRole,
    };
  } catch (error) {
    console.error("Unexpected error creating employee:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Update an existing employee
 */
export async function updateEmployeeAction(
  employeeId: string,
  data: {
    name?: string;
    email?: string;
    password?: string | null;
    role?: EmployeeRole;
    branch?: "NAILS" | "SKIN" | "LASHES" | "MASSAGE" | null;
    salary?: number;
    commission_rate?: number;
    daily_rate?: number;
    can_request_payslip?: boolean;
    sales_deduction_rate?: number;
  },
) {
  try {
    // First, get the existing employee to get user_id
    const { data: existingEmployee, error: fetchError } = await supabase
      .from("employee")
      .select("user_id")
      .eq("id", employeeId)
      .single<{ user_id: string }>();

    if (fetchError || !existingEmployee) {
      return {
        success: false,
        error: "Employee not found",
      };
    }

    // Update auth user if email or password is provided
    if (data.email || (data.password && data.password.trim() !== "")) {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return {
          success: false,
          error:
            "Missing Supabase configuration. Please check your environment variables.",
        };
      }

      // Get the current user's session token for authentication
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return {
          success: false,
          error: "You must be logged in to update employees.",
        };
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/update-employee-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            user_id: existingEmployee.user_id,
            email: data.email || undefined,
            password: data.password && data.password.trim() !== ""
              ? data.password
              : undefined,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Failed to update user account",
        }));
        console.error("Error updating auth user:", errorData);
        return {
          success: false,
          error: errorData.error || "Failed to update user account",
        };
      }
    }

    // Update employee record
    const employeeUpdate: Record<string, any> = {};
    if (data.name !== undefined) employeeUpdate.name = data.name;
    if (data.role !== undefined) employeeUpdate.role = data.role;
    if (data.branch !== undefined) employeeUpdate.branch = data.branch;
    if (data.salary !== undefined) employeeUpdate.salary = data.salary;
    if (data.commission_rate !== undefined) {
      employeeUpdate.commission_rate = data.commission_rate;
    }
    if (data.daily_rate !== undefined) {
      employeeUpdate.daily_rate = data.daily_rate;
    }
    if (data.can_request_payslip !== undefined) {
      employeeUpdate.can_request_payslip = data.can_request_payslip;
    }
    if (data.sales_deduction_rate !== undefined) {
      employeeUpdate.sales_deduction_rate = data.sales_deduction_rate;
    }
    employeeUpdate.updated_at = new Date().toISOString();

    const { data: employee, error: empError } = await (supabase
      .from("employee") as any)
      .update(employeeUpdate)
      .eq("id", employeeId)
      .select()
      .single();

    if (empError) {
      console.error("Error updating employee:", empError);
      return {
        success: false,
        error: empError.message || "Failed to update employee record",
      };
    }

    return {
      success: true,
      data: employee as EmployeeWithRole,
    };
  } catch (error) {
    console.error("Unexpected error updating employee:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get employee email by user_id
 */
export async function getEmployeeEmail(userId: string) {
  try {
    const { data, error } = await (supabase.rpc as any)(
      "get_employee_email",
      {
        p_user_id: userId,
      },
    ) as {
      data: string | null;
      error: any;
    };

    if (error) {
      console.error("Error fetching employee email:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch employee email",
      };
    }

    return {
      success: true,
      data: data || "",
    };
  } catch (error: any) {
    console.error("Unexpected error fetching employee email:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

/**
 * Get all employees (for owners)
 */
// Helper to determine branches to include based on owner's branch
function getBranchesForOwner(ownerBranch: Database["public"]["Enums"]["branch"] | null): Database["public"]["Enums"]["branch"][] {
  if (ownerBranch === "SKIN") {
    return ["NAILS", "SKIN", "MASSAGE"]; // All except LASHES
  }
  if (ownerBranch === "LASHES") {
    return ["LASHES"]; // Only LASHES
  }
  return ["NAILS", "SKIN", "LASHES", "MASSAGE"]; // All branches for other owners/admins
}

export async function getAllEmployees(ownerBranch: Database["public"]["Enums"]["branch"] | null = null) {
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
    
    const { data, error } = await query;

    if (error) {
      // Check if error message contains HTML (500 error from Cloudflare)
      const errorMessage = error.message || "";
      if (errorMessage.includes("<html>") || errorMessage.includes("500")) {
        // Silently handle 500 errors - return empty array
        return {
          success: true,
          data: [],
        };
      }
      
      // For other errors, return empty array to prevent app breakage
      return {
        success: true,
        data: [],
      };
    }

    return {
      success: true,
      data: data as EmployeeWithRole[],
    };
  } catch (error: any) {
    // Check if error contains HTML (500 error)
    const errorMessage = error?.message || error?.toString() || "";
    if (errorMessage.includes("<html>") || errorMessage.includes("500")) {
      // Silently handle 500 errors
      return {
        success: true,
        data: [],
      };
    }
    
    // For any other error, return empty array
    return {
      success: true,
      data: [],
    };
  }
}

/**
 * Get services served today by an employee
 * @param userId - The user_id (auth user ID), since served_by stores user_id
 */
export async function getServicesServedToday(userId: string) {
  try {
    if (!userId) {
      return {
        success: true,
        data: [],
        count: 0,
      };
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    // Get service bookings served by this user today
    // Note: served_by stores user_id, not employee_id
    const { data, error } = await supabase
      .from("service_bookings")
      .select("id, served_at, served_by, booking_transaction_id")
      .eq("served_by", userId)
      .gte("served_at", `${today}T00:00:00`)
      .lt("served_at", `${today}T23:59:59`)
      .not("served_at", "is", null);

    if (error) {
      // Check if error message contains HTML (500 error from Cloudflare)
      const errorMessage = error.message || "";
      if (errorMessage.includes("<html>") || errorMessage.includes("500")) {
        // Silently handle 500 errors - return empty data
        return {
          success: true,
          data: [],
          count: 0,
        };
      }
      
      // For other errors, return empty data to prevent app breakage
      return {
        success: true,
        data: [],
        count: 0,
      };
    }

    return {
      success: true,
      data: data || [],
      count: data?.length || 0,
    };
  } catch (error: any) {
    // Check if error contains HTML (500 error)
    const errorMessage = error?.message || error?.toString() || "";
    if (errorMessage.includes("<html>") || errorMessage.includes("500")) {
      // Silently handle 500 errors
      return {
        success: true,
        data: [],
        count: 0,
      };
    }
    
    // For any other error, return empty data
    return {
      success: true,
      data: [],
      count: 0,
    };
  }
}

/**
 * Get salary breakdown for an employee
 */
export async function getEmployeeSalaryBreakdown(employeeId: string) {
  try {
    // Get employee details
    const { data: employee, error: empError } = await supabase
      .from("employee")
      .select("*")
      .eq("id", employeeId)
      .single<Employee>();

    if (empError || !employee) {
      return {
        success: false,
        error: "Employee not found",
      };
    }

    // Get approved payslip requests for this employee (get this first to filter data)
    const { data: approvedRequests, error: requestsError } = await supabase
      .from("payslip_request")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("status", "APPROVED");

    if (requestsError) {
      console.error("Error fetching approved payslip requests:", requestsError);
    }

    const approvedRequestIds = (approvedRequests || []).map((req: any) =>
      req.id
    );

    // Get payslip release IDs for approved requests
    let approvedReleaseIds: string[] = [];
    if (approvedRequestIds.length > 0) {
      const { data: releases, error: releasesError } = await supabase
        .from("payslip_release")
        .select("id")
        .in("payslip_request_id", approvedRequestIds);

      if (releasesError) {
        console.error("Error fetching payslip releases:", releasesError);
      } else {
        approvedReleaseIds = (releases || []).map((release: any) => release.id);
      }
    }

    // Get attendance IDs that are already in approved payslip releases
    let approvedAttendanceIds: string[] = [];
    if (approvedReleaseIds.length > 0) {
      const { data: payslipAttendances, error: payslipAttError } =
        await supabase
          .from("payslip_attendance")
          .select("attendance_id")
          .in("payslip_release_id", approvedReleaseIds);

      if (payslipAttError) {
        console.error("Error fetching payslip attendances:", payslipAttError);
      } else {
        approvedAttendanceIds = (payslipAttendances || []).map(
          (pa: any) => pa.attendance_id,
        );
      }
    }

    // Get commission transaction IDs from approved payslip commissions
    let approvedCommissionIds: string[] = [];
    let serviceBookingIdsInPayslips: string[] = [];
    if (approvedReleaseIds.length > 0) {
      const { data: payslipCommissions, error: payslipCommError } =
        await supabase
          .from("payslip_commission")
          .select("commission_transaction_id")
          .in("payslip_release_id", approvedReleaseIds);

      if (payslipCommError) {
        console.error("Error fetching payslip commissions:", payslipCommError);
      } else {
        approvedCommissionIds = (payslipCommissions || []).map(
          (pc: any) => pc.commission_transaction_id,
        );

        // Get service booking IDs from these commission transactions
        if (approvedCommissionIds.length > 0) {
          const { data: commissionTransactions, error: ctError } =
            await supabase
              .from("commission_transaction")
              .select("service_booking_id")
              .in("id", approvedCommissionIds)
              .not("service_booking_id", "is", null);

          if (ctError) {
            console.error("Error fetching commission transactions:", ctError);
          } else {
            serviceBookingIdsInPayslips = (commissionTransactions || [])
              .map((ct: any) => ct.service_booking_id)
              .filter((id: any) => id !== null);
          }
        }
      }
    }

    // Get all attendance records (will filter out those in approved payslips later)
    const { data: allAttendance, error: attError } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .order("attendance_date", { ascending: false });

    if (attError) {
      console.error("Error fetching attendance:", attError);
    }

    // Filter out attendances that are already in approved payslip releases
    const attendance: Array<{
      id: string;
      attendance_date: string;
      is_present: boolean;
      daily_rate_applied: number;
    }> = (allAttendance || []).filter(
      (att: any) => !approvedAttendanceIds.includes(att.id),
    );

    // Get all services served with service details (will filter out those in approved payslips later)
    const { data: allServices, error: servError } = await supabase
      .from("service_bookings")
      .select(`
        id,
        served_at,
        price_at_booking,
        booking_transaction_id,
        service:service_id (
          id,
          title
        )
      `)
      .eq("served_by", employee?.user_id || "")
      .not("served_at", "is", null)
      .order("served_at", { ascending: false });

    if (servError) {
      console.error("Error fetching services:", servError);
    }

    // Filter out services that have commissions already in approved payslip releases
    const services: Array<{
      id: number;
      served_at: string;
      price_at_booking: number;
      booking_transaction_id: number;
      service: { id: number; title: string } | null;
    }> = (allServices || []).filter(
      (s: any) => !serviceBookingIdsInPayslips.includes(s.id),
    );

    // Get all commission transactions (excluding those already in approved payslip releases)
    const { data: allCommissions, error: commError } = await supabase
      .from("commission_transaction")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("transaction_type", "ADD")
      .in("status", ["APPLIED", "PENDING"])
      .order("created_at", { ascending: false });

    if (commError) {
      console.error("Error fetching commissions:", commError);
    }

    // Filter out commissions that are already in approved payslip releases
    type CommissionType = {
      id: string;
      amount: number;
      service_price: number;
      commission_rate: number;
      created_at: string;
      booking_id: number;
      service_booking_id: number;
    };
    const commissions = ((allCommissions || []) as any[]).filter(
      (ct: any) => !approvedCommissionIds.includes(ct.id),
    ) as CommissionType[];

    // Calculate totals
    const totalCommission = commissions?.reduce((sum, ct) =>
      sum + Number(ct.amount || 0), 0) || 0;
    const totalDailyRate = attendance?.reduce((sum, att) => {
      if (att.is_present) {
        return sum + Number(att.daily_rate_applied || 0);
      }
      return sum;
    }, 0) || 0;

    // Format attendance records
    const attendanceRecords = (attendance || []).map((att) => ({
      date: att.attendance_date,
      isPresent: att.is_present,
      dailyRateApplied: Number(att.daily_rate_applied || 0),
    }));

    // Format services served
    const servicesServed = (services || [])
      .filter((s) => s.service) // Only include services with service details
      .map((s) => {
        // Find corresponding commission transaction
        const commission = commissions?.find(
          (ct) => ct.service_booking_id === s.id,
        );
        return {
          id: s.id,
          serviceName: (s.service as any)?.title || "Unknown Service",
          price: Number(s.price_at_booking || 0),
          servedAt: s.served_at || "",
          commissionAmount: Number(commission?.amount || 0),
          bookingId: s.booking_transaction_id || 0,
        };
      });

    // Format commission transactions
    const commissionTransactions = (commissions || []).map((ct) => ({
      id: ct.id,
      amount: Number(ct.amount || 0),
      servicePrice: Number(ct.service_price || 0),
      commissionRate: Number(ct.commission_rate || 0),
      createdAt: ct.created_at,
      bookingId: ct.booking_id,
    }));

    const breakdown: SalaryBreakdown = {
      currentSalary: Number(employee.salary || 0),
      totalCommission,
      totalDailyRate,
      attendanceRecords,
      servicesServed,
      commissionTransactions,
    };

    return {
      success: true,
      data: breakdown,
    };
  } catch (error) {
    console.error("Unexpected error fetching salary breakdown:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get sales summary for an employee (with and without deductions)
 */
export async function getEmployeeSalesSummary(employeeId: string) {
  try {
    const { data, error } = await (supabase.rpc as any)(
      "get_employee_sales_summary",
      {
        p_employee_id: employeeId,
      },
    ) as {
      data:
        | Array<{
          total_commissions: number;
          total_sales_deductions: number;
          net_sales: number;
          total_commission_transactions: number;
        }>
        | null;
      error: any;
    };

    if (error) {
      console.error("Error fetching sales summary:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch sales summary",
      };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: {
          totalCommissions: 0,
          totalSalesDeductions: 0,
          netSales: 0,
          totalCommissionTransactions: 0,
        } as SalesSummary,
      };
    }

    const result = data[0];
    return {
      success: true,
      data: {
        totalCommissions: Number(result.total_commissions || 0),
        totalSalesDeductions: Number(result.total_sales_deductions || 0),
        netSales: Number(result.net_sales || 0),
        totalCommissionTransactions: Number(
          result.total_commission_transactions || 0,
        ),
      } as SalesSummary,
    };
  } catch (error: any) {
    console.error("Unexpected error fetching sales summary:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}
