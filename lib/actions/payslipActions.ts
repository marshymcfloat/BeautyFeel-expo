import { supabase } from "../utils/supabase";
import type { Database } from "@/database.types";

type PayslipRequest = Database["public"]["Tables"]["payslip_request"]["Row"];
type PayslipRelease = Database["public"]["Tables"]["payslip_release"]["Row"];

export interface PayslipRequestWithEmployee extends PayslipRequest {
  employee: {
    id: string;
    user_id: string;
    role: string;
    name?: string | null;
  };
}

export interface PayslipUnpaidAmount {
  total_amount: number;
  attendance_amount: number;
  commission_amount: number;
}

export interface PayslipReleaseWithDeduction extends PayslipRelease {
  sales_deduction?: number;
}

export interface CreatePayslipRequestResult {
  success: boolean;
  payslip_request_id?: string;
  requested_amount?: number;
  error?: string;
}

export interface ApprovePayslipRequestParams {
  requestId: string;
  periodStartDate?: string;
  periodEndDate?: string;
  notes?: string;
}

export interface RejectPayslipRequestParams {
  requestId: string;
  rejectionReason: string;
}

/**
 * Calculate unpaid payslip amount for the current employee
 */
export async function calculateUnpaidPayslipAmount(
  employeeId: string
): Promise<{ success: boolean; data?: PayslipUnpaidAmount; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("calculate_unpaid_payslip_amount", {
      p_employee_id: employeeId,
    });

    if (error) {
      console.error("Error calculating unpaid payslip amount:", error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: { total_amount: 0, attendance_amount: 0, commission_amount: 0 },
      };
    }

    return {
      success: true,
      data: {
        total_amount: parseFloat(data[0].total_amount) || 0,
        attendance_amount: parseFloat(data[0].attendance_amount) || 0,
        commission_amount: parseFloat(data[0].commission_amount) || 0,
      },
    };
  } catch (error: any) {
    console.error("Unexpected error calculating unpaid payslip amount:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

/**
 * Create a payslip request for the current employee
 */
export async function createPayslipRequestAction(
  employeeId: string
): Promise<CreatePayslipRequestResult> {
  try {
    const { data, error } = await supabase.rpc("create_payslip_request", {
      p_employee_id: employeeId,
    });

    if (error) {
      console.error("Error creating payslip request:", error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: "No data returned from server" };
    }

    const result = data[0];

    if (!result.success) {
      return {
        success: false,
        error: result.error_message || "Failed to create payslip request",
      };
    }

    return {
      success: true,
      payslip_request_id: result.payslip_request_id,
      requested_amount: parseFloat(result.requested_amount) || 0,
    };
  } catch (error: any) {
    console.error("Unexpected error creating payslip request:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

/**
 * Get all payslip requests (for owners)
 */
export async function getAllPayslipRequests(): Promise<{
  success: boolean;
  data?: PayslipRequestWithEmployee[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("payslip_request")
      .select(
        `
        *,
        employee:employee_id (
          id,
          user_id,
          role,
          name
        )
      `
      )
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("Error fetching payslip requests:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as any };
  } catch (error: any) {
    console.error("Unexpected error fetching payslip requests:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

/**
 * Get payslip requests for current employee
 */
export async function getMyPayslipRequests(employeeId: string): Promise<{
  success: boolean;
  data?: PayslipRequest[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("payslip_request")
      .select("*")
      .eq("employee_id", employeeId)
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("Error fetching my payslip requests:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("Unexpected error fetching my payslip requests:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

/**
 * Approve a payslip request (owner only)
 */
export async function approvePayslipRequestAction(
  params: ApprovePayslipRequestParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    console.log("Approving payslip request:", {
      requestId: params.requestId,
      userId: user.id,
    });

    const { data, error } = await supabase.rpc("approve_payslip_request", {
      p_request_id: params.requestId,
      p_reviewer_user_id: user.id,
      p_period_start_date: params.periodStartDate || null,
      p_period_end_date: params.periodEndDate || null,
      p_notes: params.notes || null,
    });

    if (error) {
      console.error("Error approving payslip request:", error);
      return { success: false, error: error.message };
    }

    console.log("Approve RPC response:", data);

    if (!data || data.length === 0) {
      return { success: false, error: "No data returned from server" };
    }

    const result = data[0];

    if (!result.success) {
      return {
        success: false,
        error: result.error_message || "Failed to approve payslip request",
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error approving payslip request:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

/**
 * Reject a payslip request (owner only)
 */
export async function rejectPayslipRequestAction(
  params: RejectPayslipRequestParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    console.log("Rejecting payslip request:", {
      requestId: params.requestId,
      userId: user.id,
      reason: params.rejectionReason,
    });

    const { data, error } = await supabase.rpc("reject_payslip_request", {
      p_request_id: params.requestId,
      p_reviewer_user_id: user.id,
      p_rejection_reason: params.rejectionReason,
    });

    if (error) {
      console.error("Error rejecting payslip request:", error);
      return { success: false, error: error.message };
    }

    console.log("Reject RPC response:", data);

    if (!data || data.length === 0) {
      return { success: false, error: "No data returned from server" };
    }

    const result = data[0];

    if (!result.success) {
      return {
        success: false,
        error: result.error_message || "Failed to reject payslip request",
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error rejecting payslip request:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

/**
 * Toggle employee's ability to request payslips (owner only)
 */
export async function toggleEmployeePayslipPermission(
  employeeId: string,
  canRequest: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "User not authenticated" };
    }

    const { data, error } = await supabase.rpc("toggle_employee_payslip_permission", {
      p_employee_id: employeeId,
      p_owner_user_id: user.id,
      p_can_request: canRequest,
    });

    if (error) {
      console.error("Error toggling employee payslip permission:", error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, error: "No data returned from server" };
    }

    const result = data[0];

    if (!result.success) {
      return {
        success: false,
        error: result.error_message || "Failed to update employee permission",
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error toggling employee payslip permission:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

/**
 * Get payslip release details
 */
export async function getPayslipReleaseDetails(
  releaseId: string
): Promise<{ success: boolean; data?: PayslipRelease; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("payslip_release")
      .select("*")
      .eq("id", releaseId)
      .single();

    if (error) {
      console.error("Error fetching payslip release details:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || undefined };
  } catch (error: any) {
    console.error("Unexpected error fetching payslip release details:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
}

