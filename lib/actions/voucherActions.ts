import type { Tables } from "../../database.types";
import { supabase } from "../utils/supabase";

type Voucher = Tables<"voucher">;

export async function checkVoucher(code: string) {
  try {
    // First, update any expired vouchers
    await updateExpiredVouchers();

    const { data, error } = await supabase
      .from("voucher")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: "Database error while checking voucher.",
      };
    }

    if (!data) {
      // Check if voucher exists but is not active
      const { data: voucherExists } = await supabase
        .from("voucher")
        .select("status, expires_on")
        .eq("code", code.toUpperCase())
        .maybeSingle();

      if (voucherExists) {
        if (voucherExists.status === "USED") {
          return {
            success: false,
            error: "This voucher has already been used.",
          };
        }
        if (voucherExists.status === "EXPIRED") {
          return { success: false, error: "This voucher has expired." };
        }
      }
      return { success: false, error: "Invalid voucher code." };
    }

    // Check if voucher is expired (double-check)
    if (data.expires_on) {
      const expiryDate = new Date(data.expires_on);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        // Mark as expired
        await supabase
          .from("voucher")
          .update({ status: "EXPIRED" })
          .eq("id", data.id);

        return { success: false, error: "This voucher has expired." };
      }
    }

    return { success: true, data };
  } catch (err) {
    console.error("Unexpected error checking voucher:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Update expired vouchers (vouchers with expires_on < today)
 */
async function updateExpiredVouchers() {
  try {
    // Try to call the RPC function first
    const { error: rpcError } = await supabase.rpc("update_expired_vouchers");

    // If RPC function doesn't exist or fails, do manual update
    if (rpcError) {
      const today = new Date().toISOString().split("T")[0];
      await supabase
        .from("voucher")
        .update({ status: "EXPIRED" })
        .eq("status", "ACTIVE")
        .not("expires_on", "is", null)
        .lt("expires_on", today);
    }
  } catch (err) {
    // Fallback: manual update on any error
    try {
      const today = new Date().toISOString().split("T")[0];
      await supabase
        .from("voucher")
        .update({ status: "EXPIRED" })
        .eq("status", "ACTIVE")
        .not("expires_on", "is", null)
        .lt("expires_on", today);
    } catch (fallbackErr) {
      console.error("Error updating expired vouchers:", fallbackErr);
    }
  }
}

/**
 * Get all vouchers
 */
export async function getAllVouchers() {
  try {
    // First try to get vouchers with customer relation
    const { data, error } = await supabase
      .from("voucher")
      .select("*, customer:customer_id(*)")
      .order("created_at", { ascending: false });

    if (error) {
      // If error is about customer_id column not existing, try without it
      if (
        error.message.includes("customer_id") ||
        error.message.includes("column")
      ) {
        const { data: voucherData, error: voucherError } = await supabase
          .from("voucher")
          .select("*")
          .order("created_at", { ascending: false });

        if (voucherError) {
          return {
            success: false,
            error: voucherError.message || "Failed to fetch vouchers",
          };
        }

        return {
          success: true,
          data: (voucherData || []) as Voucher[],
        };
      }

      return {
        success: false,
        error: error.message || "Failed to fetch vouchers",
      };
    }

    return {
      success: true,
      data:
        (data || []) as (Voucher & { customer?: Tables<"customer"> | null })[],
    };
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Check if a voucher code already exists
 */
export async function voucherCodeExists(code: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("voucher")
      .select("id")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    if (error) {
      console.error("Error checking voucher code:", error);
      // If there's an error, assume it doesn't exist to allow creation
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Unexpected error checking voucher code:", error);
    return false;
  }
}

/**
 * Create a new voucher
 */
export async function createVoucherAction(data: {
  code: string;
  value: number;
  customer_id?: number | null;
  expires_on?: string | null;
}) {
  try {
    const upperCode = data.code.toUpperCase();

    // Check if code already exists
    const exists = await voucherCodeExists(upperCode);
    if (exists) {
      return {
        success: false,
        error:
          `Voucher code ${upperCode} already exists. Please use a different code.`,
      };
    }

    // Build insert object - only include customer_id and expires_on if provided
    const insertData: any = {
      code: upperCode,
      value: data.value,
      status: "ACTIVE",
    };

    // Only include customer_id if it's provided (and if column exists in DB)
    if (data.customer_id !== null && data.customer_id !== undefined) {
      insertData.customer_id = data.customer_id;
    }

    // Only include expires_on if it's provided
    if (data.expires_on) {
      insertData.expires_on = data.expires_on;
    }

    const { data: voucher, error } = await supabase
      .from("voucher")
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      // Check if error is due to duplicate code (unique constraint violation)
      if (
        error.message.includes("duplicate") ||
        error.message.includes("unique") || error.code === "23505"
      ) {
        return {
          success: false,
          error:
            `Voucher code ${upperCode} already exists. Please use a different code.`,
        };
      }

      // If error is about customer_id column not existing, try without it
      if (error.message.includes("customer_id") && data.customer_id) {
        const { data: voucherRetry, error: retryError } = await supabase
          .from("voucher")
          .insert({
            code: upperCode,
            value: data.value,
          })
          .select("*")
          .single();

        if (retryError) {
          // Check for duplicate again
          if (
            retryError.message.includes("duplicate") ||
            retryError.message.includes("unique") || retryError.code === "23505"
          ) {
            return {
              success: false,
              error:
                `Voucher code ${upperCode} already exists. Please use a different code.`,
            };
          }

          return {
            success: false,
            error: retryError.message || "Failed to create voucher",
          };
        }

        return {
          success: true,
          data: voucherRetry as Voucher,
        };
      }

      return {
        success: false,
        error: error.message || "Failed to create voucher",
      };
    }

    return {
      success: true,
      data: voucher as Voucher & { customer?: Tables<"customer"> | null },
    };
  } catch (error) {
    console.error("Error creating voucher:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Delete a voucher
 */
export async function deleteVoucherAction(voucherId: number) {
  try {
    const { error } = await supabase
      .from("voucher")
      .delete()
      .eq("id", voucherId);

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to delete voucher",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting voucher:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Send voucher email to customer
 */
export async function sendVoucherEmailAction(data: {
  customerEmail: string;
  customerName: string;
  voucherCode: string;
  voucherValue: number;
}) {
  try {
    // Call Supabase edge function to send email
    const { data: result, error } = await supabase.functions.invoke(
      "send-voucher-email",
      {
        body: {
          email: data.customerEmail,
          customerName: data.customerName,
          voucherCode: data.voucherCode,
          voucherValue: data.voucherValue,
        },
      },
    );

    if (error) {
      console.error("Error calling email function:", error);
      // If edge function doesn't exist, we'll just log and continue
      // In production, you should have the edge function set up
      return {
        success: false,
        error: "Failed to send email. Please check email configuration.",
      };
    }

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("Error sending voucher email:", error);
    // Don't fail the whole operation if email fails
    return {
      success: false,
      error: "Email sending failed, but voucher was created",
    };
  }
}
