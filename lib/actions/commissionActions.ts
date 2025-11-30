import type { Database } from "../../database.types";
import { supabase } from "../utils/supabase";

type CommissionTransaction =
  Database["public"]["Tables"]["commission_transaction"]["Row"];

/**
 * Check if all services in a booking are served for 1+ minute and apply commissions
 */
export async function checkAndApplyCommissions(bookingId: number) {
  try {
    // Call the database function to check and apply commissions
    const { data, error } = await supabase.rpc(
      "check_and_apply_commissions_manual",
      {
        p_booking_id: bookingId,
      },
    );

    if (error) {
      console.error("Error checking/applying commissions:", error);
      return {
        success: false,
        error: error.message || "Failed to check/apply commissions",
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error("Unexpected error checking/applying commissions:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Apply commissions for a booking manually
 * This should be called when all services are confirmed served for 1+ minute
 */
export async function applyCommissionsForBooking(bookingId: number) {
  try {
    console.log(
      `[applyCommissionsForBooking] Starting commission application for booking ${bookingId}`,
    );

    // Call the database function to apply commissions
    const { data, error } = await supabase.rpc(
      "apply_commissions_for_booking",
      {
        p_booking_id: bookingId,
      },
    );

    if (error) {
      console.error(
        "[applyCommissionsForBooking] Error applying commissions:",
        error,
      );
      console.error(
        "[applyCommissionsForBooking] Error details:",
        JSON.stringify(error, null, 2),
      );
      return {
        success: false,
        error: error.message || "Failed to apply commissions",
      };
    }

    console.log(`[applyCommissionsForBooking] Commission result:`, data);

    if (!data || data.length === 0) {
      console.warn(
        `[applyCommissionsForBooking] No commissions were created for booking ${bookingId}. This might mean:
        - No employees found with commission-eligible roles (WORKER, MASSEUSE)
        - No services were served by employees
        - Services were served but employee records are missing
        - Commission rate is 0%`,
      );
    }

    return {
      success: true,
      data: data,
      message: `Commissions applied successfully for booking ${bookingId}`,
    };
  } catch (error) {
    console.error(
      "[applyCommissionsForBooking] Unexpected error applying commissions:",
      error,
    );
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Revert commissions for a booking
 * Used when booking status changes back to not completed
 */
export async function revertCommissionsForBooking(bookingId: number) {
  try {
    // Call the database function to revert commissions
    const { data, error } = await supabase.rpc(
      "revert_commissions_for_booking",
      {
        p_booking_id: bookingId,
      },
    );

    if (error) {
      console.error("Error reverting commissions:", error);
      return {
        success: false,
        error: error.message || "Failed to revert commissions",
      };
    }

    return {
      success: true,
      data: data,
      message: `Commissions reverted successfully for booking ${bookingId}`,
    };
  } catch (error) {
    console.error("Unexpected error reverting commissions:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get commission transactions for a booking
 */
export async function getCommissionTransactionsForBooking(bookingId: number) {
  try {
    const { data, error } = await supabase
      .from("commission_transaction")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching commission transactions:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch commission transactions",
      };
    }

    return {
      success: true,
      data: data as CommissionTransaction[],
    };
  } catch (error) {
    console.error("Unexpected error fetching commission transactions:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Check if all services in a booking have been served for 1+ minute
 */
export async function checkAllServicesServedForMinute(bookingId: number) {
  try {
    const { data, error } = await supabase.rpc(
      "all_services_served_for_minute",
      {
        p_booking_id: bookingId,
      },
    );

    if (error) {
      console.error("Error checking services served status:", error);
      return {
        success: false,
        error: error.message || "Failed to check services status",
      };
    }

    return {
      success: true,
      allServed: data === true,
    };
  } catch (error) {
    console.error("Unexpected error checking services status:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get commission transactions for an employee
 */
export async function getEmployeeCommissionTransactions(employeeId: string) {
  try {
    const { data, error } = await supabase
      .from("commission_transaction")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("transaction_type", "ADD")
      .in("status", ["APPLIED", "PENDING"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching employee commission transactions:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch commission transactions",
      };
    }

    return {
      success: true,
      data: data as CommissionTransaction[],
    };
  } catch (error) {
    console.error(
      "Unexpected error fetching employee commission transactions:",
      error,
    );
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Manually apply missing commissions for already served services
 * This can be used to retroactively apply commissions that weren't processed
 */
export async function applyMissingCommissions() {
  try {
    console.log(
      "[applyMissingCommissions] Starting to apply missing commissions...",
    );

    const { data, error } = await supabase.rpc(
      "apply_missing_commissions_for_served_services",
    );

    if (error) {
      console.error("[applyMissingCommissions] Error:", error);
      return {
        success: false,
        error: error.message || "Failed to apply missing commissions",
      };
    }

    console.log("[applyMissingCommissions] Result:", data);

    return {
      success: true,
      data: data,
      message: `Processed ${data?.length || 0} bookings`,
    };
  } catch (error) {
    console.error("[applyMissingCommissions] Unexpected error:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
