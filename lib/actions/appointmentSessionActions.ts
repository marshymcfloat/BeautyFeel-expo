import type { Database } from "../../database.types";
import { supabase } from "../utils/supabase";

type AppointmentSession =
  Database["public"]["Tables"]["customer_appointment_sessions"]["Row"];
type AppointmentSessionInsert =
  Database["public"]["Tables"]["customer_appointment_sessions"]["Insert"];
type AppointmentSessionUpdate =
  Database["public"]["Tables"]["customer_appointment_sessions"]["Update"];
type AppointmentSessionBooking =
  Database["public"]["Tables"]["appointment_session_bookings"]["Row"];
type AppointmentSessionBookingInsert =
  Database["public"]["Tables"]["appointment_session_bookings"]["Insert"];
type ServiceAppointmentStep =
  Database["public"]["Tables"]["service_appointment_steps"]["Row"];

export interface UpcomingAppointmentSession {
  session_id: number;
  service_id: number;
  service_title: string;
  current_step: number;
  total_steps: number | null;
  next_step_order: number | null;
  next_service_id: number | null;
  next_service_title: string | null;
  next_step_label: string | null;
  recommended_after_days: number | null;
  last_appointment_date: string | null;
  next_recommended_date: string | null;
  status: string;
  started_at: string;
}

/**
 * Get upcoming appointment sessions for a customer
 */
export async function getUpcomingAppointmentSessions(customerId: number) {
  try {
    const { data, error } = await supabase.rpc(
      "get_upcoming_appointment_sessions",
      {
        p_customer_id: customerId,
      },
    );

    if (error) {
      console.error("Error fetching upcoming appointment sessions:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch upcoming appointment sessions",
      };
    }

    return {
      success: true,
      data: (data || []) as UpcomingAppointmentSession[],
    };
  } catch (error) {
    console.error(
      "Unexpected error fetching upcoming appointment sessions:",
      error,
    );
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Create a new appointment session
 */
export async function createAppointmentSession(data: {
  customerId: number;
  serviceId: number;
}) {
  try {
    const insertData: AppointmentSessionInsert = {
      customer_id: data.customerId,
      service_id: data.serviceId,
      current_step: 1,
      status: "IN_PROGRESS",
      started_at: new Date().toISOString(),
    };

    const { data: session, error } = await supabase
      .from("customer_appointment_sessions")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating appointment session:", error);
      return {
        success: false,
        error: error.message || "Failed to create appointment session",
      };
    }

    return {
      success: true,
      data: session as AppointmentSession,
    };
  } catch (error) {
    console.error("Unexpected error creating appointment session:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Link a booking to an appointment session
 */
export async function linkBookingToSession(data: {
  sessionId: number;
  bookingId: number;
  stepOrder: number;
}) {
  try {
    // Check if this step already has a booking linked
    const { data: existingLink, error: checkError } = await supabase
      .from("appointment_session_bookings")
      .select("id, booking_id")
      .eq("session_id", data.sessionId)
      .eq("step_order", data.stepOrder)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is fine
      console.error("Error checking existing link:", checkError);
    }

    // If a link already exists for this step
    if (existingLink) {
      // If it's the same booking, that's fine - return success
      if (existingLink.booking_id === data.bookingId) {
        return {
          success: true,
          data: existingLink as AppointmentSessionBooking,
          message: "Booking already linked to this step",
        };
      }
      // If it's a different booking, return an error
      return {
        success: false,
        error:
          `Step ${data.stepOrder} already has a booking linked (booking ID: ${existingLink.booking_id})`,
      };
    }

    const insertData: AppointmentSessionBookingInsert = {
      session_id: data.sessionId,
      booking_id: data.bookingId,
      step_order: data.stepOrder,
    };

    const { data: link, error } = await supabase
      .from("appointment_session_bookings")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // If it's a duplicate key error, check if it's the same booking
      if (error.code === "23505") {
        const { data: existing } = await supabase
          .from("appointment_session_bookings")
          .select("*")
          .eq("session_id", data.sessionId)
          .eq("step_order", data.stepOrder)
          .eq("booking_id", data.bookingId)
          .single();

        if (existing) {
          return {
            success: true,
            data: existing as AppointmentSessionBooking,
            message: "Booking already linked to this step",
          };
        }
      }

      console.error("Error linking booking to session:", error);
      return {
        success: false,
        error: error.message || "Failed to link booking to session",
      };
    }

    return {
      success: true,
      data: link as AppointmentSessionBooking,
    };
  } catch (error) {
    console.error("Unexpected error linking booking to session:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Mark an appointment as attended
 */
export async function markAppointmentAttended(
  sessionId: number,
  bookingId: number,
) {
  try {
    // First, get the customer_id for this session so we can invalidate the query
    const { data: sessionData } = await supabase
      .from("customer_appointment_sessions")
      .select("customer_id")
      .eq("id", sessionId)
      .single();

    const { data, error } = await supabase.rpc("mark_appointment_attended", {
      p_session_id: sessionId,
      p_booking_id: bookingId,
    });

    if (error) {
      console.error("Error marking appointment as attended:", error);
      return {
        success: false,
        error: error.message || "Failed to mark appointment as attended",
        customerId: sessionData?.customer_id || null,
      };
    }

    const result = data as {
      success: boolean;
      current_step?: number;
      total_steps?: number;
      is_completed?: boolean;
      error?: string;
    };

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to mark appointment as attended",
      };
    }

    return {
      success: true,
      current_step: result.current_step,
      total_steps: result.total_steps,
      is_completed: result.is_completed || false,
      customerId: sessionData?.customer_id || null,
    };
  } catch (error) {
    console.error("Unexpected error marking appointment as attended:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get next recommended appointment date for a session
 */
export async function getNextRecommendedAppointmentDate(sessionId: number) {
  try {
    const { data, error } = await supabase.rpc(
      "get_next_recommended_appointment_date",
      {
        p_session_id: sessionId,
      },
    );

    if (error) {
      console.error("Error getting next recommended appointment date:", error);
      return {
        success: false,
        error: error.message ||
          "Failed to get next recommended appointment date",
      };
    }

    return {
      success: true,
      data: data as string | null,
    };
  } catch (error) {
    console.error(
      "Unexpected error getting next recommended appointment date:",
      error,
    );
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get appointment session by ID with related data
 */
export async function getAppointmentSession(sessionId: number) {
  try {
    const { data: session, error: sessionError } = await supabase
      .from("customer_appointment_sessions")
      .select(
        `
        *,
        customer:customer_id (*),
        service:service_id (*),
        appointment_session_bookings (
          *,
          booking:booking_id (*)
        )
      `,
      )
      .eq("id", sessionId)
      .single();

    if (sessionError) {
      console.error("Error fetching appointment session:", sessionError);
      return {
        success: false,
        error: sessionError.message || "Failed to fetch appointment session",
      };
    }

    return {
      success: true,
      data: session,
    };
  } catch (error) {
    console.error("Unexpected error fetching appointment session:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get service appointment steps for a service
 */
export async function getServiceAppointmentSteps(serviceId: number) {
  try {
    const { data: steps, error } = await supabase
      .from("service_appointment_steps")
      .select(
        `
        *,
        service_for_step:service_id_for_step (*)
      `,
      )
      .eq("service_id", serviceId)
      .order("step_order", { ascending: true });

    if (error) {
      console.error("Error fetching service appointment steps:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch service appointment steps",
      };
    }

    return {
      success: true,
      data: (steps || []) as ServiceAppointmentStep[],
    };
  } catch (error) {
    console.error(
      "Unexpected error fetching service appointment steps:",
      error,
    );
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Create or update service appointment steps
 */
export async function upsertServiceAppointmentSteps(
  serviceId: number,
  steps: Array<{
    stepOrder: number;
    serviceIdForStep: number;
    recommendedAfterDays: number;
    label?: string | null;
  }>,
) {
  try {
    // Delete existing steps for this service
    const { error: deleteError } = await supabase
      .from("service_appointment_steps")
      .delete()
      .eq("service_id", serviceId);

    if (deleteError) {
      console.error("Error deleting existing steps:", deleteError);
      return {
        success: false,
        error: deleteError.message || "Failed to delete existing steps",
      };
    }

    // Insert new steps
    if (steps.length > 0) {
      const insertData = steps.map((step) => ({
        service_id: serviceId,
        step_order: step.stepOrder,
        service_id_for_step: step.serviceIdForStep,
        recommended_after_days: step.recommendedAfterDays,
        label: step.label || null,
      }));

      const { data: newSteps, error: insertError } = await supabase
        .from("service_appointment_steps")
        .insert(insertData)
        .select();

      if (insertError) {
        console.error("Error inserting new steps:", insertError);
        return {
          success: false,
          error: insertError.message || "Failed to insert new steps",
        };
      }

      return {
        success: true,
        data: newSteps as ServiceAppointmentStep[],
      };
    }

    return {
      success: true,
      data: [] as ServiceAppointmentStep[],
    };
  } catch (error) {
    console.error(
      "Unexpected error upserting service appointment steps:",
      error,
    );
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Find or create appointment session for a booking
 * Checks if customer has an active session for the service, creates one if not
 */
export async function findOrCreateAppointmentSession(data: {
  customerId: number;
  serviceId: number;
}) {
  try {
    // Check if service requires appointments
    const { data: service, error: serviceError } = await supabase
      .from("service")
      .select("id, requires_appointments")
      .eq("id", data.serviceId)
      .single();

    if (serviceError || !service) {
      return {
        success: false,
        error: "Service not found",
      };
    }

    if (!service.requires_appointments) {
      // Service doesn't require appointments, return null session
      return {
        success: true,
        data: null,
      };
    }

    // Check for existing IN_PROGRESS session
    const { data: existingSession, error: sessionError } = await supabase
      .from("customer_appointment_sessions")
      .select("*")
      .eq("customer_id", data.customerId)
      .eq("service_id", data.serviceId)
      .eq("status", "IN_PROGRESS")
      .maybeSingle();

    if (sessionError) {
      console.error("Error checking for existing session:", sessionError);
      return {
        success: false,
        error: sessionError.message || "Failed to check for existing session",
      };
    }

    if (existingSession) {
      console.log(
        `✅ Found existing appointment session ${existingSession.id} for customer ${data.customerId}, service ${data.serviceId}, current step: ${existingSession.current_step}`,
      );
      return {
        success: true,
        data: existingSession as AppointmentSession,
      };
    }

    // Create new session only if no existing IN_PROGRESS session found
    console.log(
      `🆕 Creating new appointment session for customer ${data.customerId}, service ${data.serviceId}`,
    );
    return await createAppointmentSession(data);
  } catch (error) {
    console.error("Unexpected error finding or creating session:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
