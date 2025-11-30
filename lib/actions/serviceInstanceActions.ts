import type { Tables, TablesUpdate } from "../../database.types";
import { supabase } from "../utils/supabase";
import {
  applyCommissionsForBooking,
  checkAllServicesServedForMinute,
  revertCommissionsForBooking,
} from "./commissionActions";

type ServiceBooking = Tables<"public", "service_bookings">;

/**
 * Claim a service instance (mark as being served by current user)
 * Uses optimistic locking to prevent double-claiming
 */
export async function claimServiceInstanceAction(
  serviceInstanceId: number,
  userId: string,
) {
  try {
    // First, check current status
    const { data: instance, error: fetchError } = await supabase
      .from("service_bookings")
      .select("*")
      .eq("id", serviceInstanceId)
      .single();

    if (fetchError || !instance) {
      return {
        success: false,
        error: "Service instance not found",
      };
    }

    // Check if already claimed by someone else
    if (instance.status === "CLAIMED" && instance.claimed_by !== userId) {
      return {
        success: false,
        error: "This service is already being served by another staff member",
      };
    }

    // Check if already served
    if (instance.status === "SERVED") {
      return {
        success: false,
        error: "This service has already been completed",
      };
    }

    // Claim the instance atomically
    // Only update if status is UNCLAIMED or already claimed by this user
    const now = new Date().toISOString();

    // First try to update if UNCLAIMED
    const { data: updatedUnclaimed, error: unclaimedError } = await supabase
      .from("service_bookings")
      .update({
        status: "CLAIMED",
        claimed_by: userId,
        claimed_at: now,
      } as TablesUpdate<"public", "service_bookings">)
      .eq("id", serviceInstanceId)
      .eq("status", "UNCLAIMED")
      .select()
      .single();

    // If already claimed by this user, it's fine (idempotent)
    if (!updatedUnclaimed && instance.claimed_by === userId) {
      // Already claimed by this user, return success
      return {
        success: true,
        data: instance as ServiceBooking,
      };
    }

    // If update failed, check if it's because someone else claimed it
    if (
      !updatedUnclaimed && instance.claimed_by && instance.claimed_by !== userId
    ) {
      return {
        success: false,
        error: "This service is already being served by another staff member",
      };
    }

    // If still no update and there's an error, return error
    if (unclaimedError || !updatedUnclaimed) {
      return {
        success: false,
        error:
          "Failed to claim service. It may have been claimed by another staff member.",
      };
    }

    const updated = updatedUnclaimed!;

    // Check if this was the first service instance claimed, update booking status
    if (updated.status === "CLAIMED") {
      const { data: booking } = await supabase
        .from("booking")
        .select("id, status")
        .eq("id", updated.booking_transaction_id || -1)
        .single();

      // If booking is still PENDING, mark as IN_PROGRESS
      if (booking && booking.status === "PENDING") {
        await supabase
          .from("booking")
          .update({
            status: "IN_PROGRESS",
            started_at: now,
          })
          .eq("id", booking.id);
      }
    }

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error("Unexpected error claiming service instance:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Mark a service instance as served/completed
 */
export async function serveServiceInstanceAction(
  serviceInstanceId: number,
  userId: string,
) {
  try {
    // Check current status and ownership
    const { data: instance, error: fetchError } = await supabase
      .from("service_bookings")
      .select("*")
      .eq("id", serviceInstanceId)
      .single();

    if (fetchError || !instance) {
      return {
        success: false,
        error: "Service instance not found",
      };
    }

    // Verify user owns this claim
    if (instance.claimed_by !== userId) {
      return {
        success: false,
        error: "You can only complete services you have claimed",
      };
    }

    if (instance.status === "SERVED") {
      return {
        success: false,
        error: "This service has already been completed",
      };
    }

    const now = new Date().toISOString();
    const updateData: TablesUpdate<"public", "service_bookings"> = {
      status: "SERVED",
      served_at: now,
      served_by: userId, // Store who served it
    };

    const { data: updated, error: updateError } = await supabase
      .from("service_bookings")
      .update(updateData)
      .eq("id", serviceInstanceId)
      .eq("claimed_by", userId) // Ensure user still owns it
      .select()
      .single();

    if (updateError || !updated) {
      return {
        success: false,
        error: "Failed to mark service as served",
      };
    }

    const bookingId = updated.booking_transaction_id;

    // Check if all service instances in this booking are served
    const { data: allInstances, error: instancesError } = await supabase
      .from("service_bookings")
      .select("id, status, served_at")
      .eq("booking_transaction_id", bookingId);

    if (!instancesError && allInstances) {
      const allServed = allInstances.every((inst) => inst.status === "SERVED");

      if (allServed && bookingId) {
        // Check if all services have been served for 1+ minute
        const allServedForMinute = await checkAllServicesServedForMinute(
          bookingId,
        );

        if (allServedForMinute.success && allServedForMinute.allServed) {
          // All services served for 1+ minute, apply commissions
          console.log(`Applying commissions for booking ${bookingId}...`);
          const commissionResult = await applyCommissionsForBooking(bookingId);
          if (commissionResult.success) {
            console.log(
              "✅ Commissions applied successfully:",
              commissionResult.data,
            );
          } else {
            console.error(
              "❌ Failed to apply commissions:",
              commissionResult.error,
            );
          }
        } else {
          console.log(
            `⏳ Waiting for all services to be served for 1+ minute (booking ${bookingId})`,
          );
        }

        // Mark booking as completed
        await supabase
          .from("booking")
          .update({
            status: "COMPLETED",
            completed_at: now,
          })
          .eq("id", bookingId);
      }
    }

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error("Unexpected error serving service instance:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Unserve a service instance (mark as claimed again, not served)
 */
export async function unserveServiceInstanceAction(
  serviceInstanceId: number,
  userId: string,
) {
  try {
    // Check ownership
    const { data: instance, error: fetchError } = await supabase
      .from("service_bookings")
      .select("*")
      .eq("id", serviceInstanceId)
      .single();

    if (fetchError || !instance) {
      return {
        success: false,
        error: "Service instance not found",
      };
    }

    if (instance.served_by !== userId && instance.claimed_by !== userId) {
      return {
        success: false,
        error: "You can only unserve services you have served or claimed",
      };
    }

    if (instance.status !== "SERVED") {
      return {
        success: false,
        error: "Service is not marked as served",
      };
    }

    const updateData: TablesUpdate<"public", "service_bookings"> = {
      status: "CLAIMED",
      served_at: null,
      served_by: null,
      // Keep claimed_by and claimed_at as they were
    };

    const { data: updated, error: updateError } = await supabase
      .from("service_bookings")
      .update(updateData)
      .eq("id", serviceInstanceId)
      .select()
      .single();

    if (updateError || !updated) {
      return {
        success: false,
        error: "Failed to unserve service",
      };
    }

    // Check if commissions were already applied and need to be reverted
    const bookingId = updated.booking_transaction_id;
    if (bookingId) {
      // Check if booking has commissions processed
      const { data: booking } = await supabase
        .from("booking")
        .select("commission_processed_at")
        .eq("id", bookingId)
        .single();

      if (booking?.commission_processed_at) {
        // Commissions were applied, check if we should revert
        const allServed = await checkAllServicesServedForMinute(bookingId);

        // If not all services are served for 1+ minute, revert commissions
        if (allServed.success && !allServed.allServed) {
          await revertCommissionsForBooking(bookingId);
        }
      }
    }

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error("Unexpected error unserving service instance:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Release a claim on a service instance (unclaim it)
 */
export async function unclaimServiceInstanceAction(
  serviceInstanceId: number,
  userId: string,
) {
  try {
    // Check ownership
    const { data: instance, error: fetchError } = await supabase
      .from("service_bookings")
      .select("*")
      .eq("id", serviceInstanceId)
      .single();

    if (fetchError || !instance) {
      return {
        success: false,
        error: "Service instance not found",
      };
    }

    if (instance.claimed_by !== userId) {
      return {
        success: false,
        error: "You can only unclaim services you have claimed",
      };
    }

    if (instance.status === "SERVED") {
      return {
        success: false,
        error: "Cannot unclaim a completed service",
      };
    }

    const updateData: TablesUpdate<"public", "service_bookings"> = {
      status: "UNCLAIMED",
      claimed_by: null,
      claimed_at: null,
    };

    const { data: updated, error: updateError } = await supabase
      .from("service_bookings")
      .update(updateData)
      .eq("id", serviceInstanceId)
      .eq("claimed_by", userId)
      .select()
      .single();

    if (updateError || !updated) {
      return {
        success: false,
        error: "Failed to unclaim service",
      };
    }

    return {
      success: true,
      data: updated,
    };
  } catch (error) {
    console.error("Unexpected error unclaiming service instance:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get all service instances for a booking
 */
export async function getServiceInstancesForBooking(bookingId: number) {
  try {
    const { data: instances, error } = await supabase
      .from("service_bookings")
      .select(
        `
        *,
        service:service_id (*)
      `,
      )
      .eq("booking_transaction_id", bookingId)
      .order("sequence_order", { ascending: true });

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to fetch service instances",
      };
    }

    return {
      success: true,
      data: instances || [],
    };
  } catch (error) {
    console.error("Unexpected error fetching service instances:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
