import { supabase } from "../utils/supabase";

export interface ServiceBreakdown {
  serviceId: number;
  serviceName: string;
  count: number;
  totalEarned: number;
}

export interface ProfileStats {
  totalServices: number;
  totalEarned: number;
  serviceBreakdown: ServiceBreakdown[];
}

/**
 * Get profile statistics for an employee including services and earnings
 */
export async function getProfileStats(
  employeeId: string
): Promise<{ success: boolean; data?: ProfileStats; error?: string }> {
  try {
    // First get employee to get user_id
    const { data: employee, error: employeeError } = await supabase
      .from("employee")
      .select("user_id")
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
          totalServices: 0,
          totalEarned: 0,
          serviceBreakdown: [],
        },
      };
    }

    // Get all served services with their details
    const { data: serviceBookings, error: bookingsError } = await supabase
      .from("service_bookings")
      .select(
        `
        service_id,
        price_at_booking,
        quantity,
        service:service_id (
          id,
          title
        )
      `
      )
      .eq("served_by", employee.user_id)
      .not("served_at", "is", null)
      .not("service_id", "is", null);

    if (bookingsError) {
      console.error("Error fetching service bookings:", bookingsError);
      return { success: false, error: bookingsError.message };
    }

    // Calculate breakdown and totals
    const breakdownMap = new Map<number, ServiceBreakdown>();
    let totalServices = 0;
    let totalEarned = 0;

    if (serviceBookings) {
      for (const booking of serviceBookings) {
        const serviceId = booking.service_id;
        if (!serviceId) continue;

        const service = booking.service as { id: number; title: string } | null;
        const serviceName = service?.title || `Service #${serviceId}`;
        const price = booking.price_at_booking || 0;
        const quantity = booking.quantity || 1;
        const earned = price * quantity;

        totalServices += quantity;
        totalEarned += earned;

        if (breakdownMap.has(serviceId)) {
          const existing = breakdownMap.get(serviceId)!;
          existing.count += quantity;
          existing.totalEarned += earned;
        } else {
          breakdownMap.set(serviceId, {
            serviceId,
            serviceName,
            count: quantity,
            totalEarned: earned,
          });
        }
      }
    }

    const serviceBreakdown = Array.from(breakdownMap.values()).sort(
      (a, b) => b.totalEarned - a.totalEarned
    );

    return {
      success: true,
      data: {
        totalServices,
        totalEarned,
        serviceBreakdown,
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
 * Change user password
 */
export async function changePasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First verify current password by attempting to sign in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return { success: false, error: "User not found" };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return { success: false, error: "Current password is incorrect" };
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error changing password:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

