import type { Database } from "../../database.types";
import { supabase } from "../utils/supabase";
import {
  getServiceAppointmentSteps,
  upsertServiceAppointmentSteps,
} from "./appointmentSessionActions";

type Service = Database["public"]["Tables"]["service"]["Row"];
type ServiceInsert = Database["public"]["Tables"]["service"]["Insert"];
type ServiceUpdate = Database["public"]["Tables"]["service"]["Update"];
type Branch = Database["public"]["Enums"]["branch"];

export interface ServiceWithAppointmentSteps extends Service {
  appointment_steps?: Array<{
    step_order: number;
    service_id_for_step: number;
    recommended_after_days: number;
    label: string | null;
  }>;
}

/**
 * Get all services (including inactive ones for management)
 */
export async function getAllServicesAction() {
  try {
    const { data, error } = await supabase
      .from("service")
      .select("*")
      .order("branch", { ascending: true })
      .order("title", { ascending: true });

    if (error) {
      console.error("Error fetching services:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch services",
      };
    }

    return {
      success: true,
      data: (data || []) as Service[],
    };
  } catch (error) {
    console.error("Unexpected error fetching services:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get service with appointment steps
 */
export async function getServiceWithAppointmentSteps(serviceId: number) {
  try {
    const { data: service, error: serviceError } = await supabase
      .from("service")
      .select("*")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      return {
        success: false,
        error: serviceError?.message || "Service not found",
      };
    }

    // Get appointment steps if service requires appointments
    let appointmentSteps: any[] = [];
    if (service.requires_appointments) {
      const stepsResult = await getServiceAppointmentSteps(serviceId);
      if (stepsResult.success) {
        appointmentSteps = stepsResult.data || [];
      }
    }

    return {
      success: true,
      data: {
        ...service,
        appointment_steps: appointmentSteps,
      } as ServiceWithAppointmentSteps,
    };
  } catch (error) {
    console.error("Unexpected error fetching service with steps:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get services by branch
 */
export async function getServicesByBranchAction(branch: Branch) {
  try {
    const { data, error } = await supabase
      .from("service")
      .select("*")
      .eq("branch", branch)
      .order("title", { ascending: true });

    if (error) {
      console.error("Error fetching services:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch services",
      };
    }

    return {
      success: true,
      data: (data || []) as Service[],
    };
  } catch (error) {
    console.error("Unexpected error fetching services:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Create a new service
 */
export async function createServiceAction(data: {
  title: string;
  description?: string | null;
  price: number;
  duration_minutes: number;
  branch: Branch;
  category?: string | null;
  is_active?: boolean;
  requires_appointments?: boolean;
  total_appointments?: number | null;
  appointment_steps?: Array<{
    stepOrder: number;
    serviceIdForStep: number;
    recommendedAfterDays: number;
    label?: string | null;
  }>;
}) {
  try {
    const insertData: ServiceInsert = {
      title: data.title,
      description: data.description || null,
      price: data.price,
      duration_minutes: data.duration_minutes,
      branch: data.branch,
      category: data.category || null,
      is_active: data.is_active !== undefined ? data.is_active : true,
      requires_appointments: data.requires_appointments || false,
      total_appointments: data.total_appointments || null,
    };

    const { data: service, error } = await supabase
      .from("service")
      // @ts-ignore - Supabase proxy typing issue
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating service:", error);
      return {
        success: false,
        error: error.message || "Failed to create service",
      };
    }

    // Create appointment steps if provided
    if (data.requires_appointments && data.appointment_steps && data.appointment_steps.length > 0) {
      const stepsResult = await upsertServiceAppointmentSteps(
        service.id,
        data.appointment_steps
      );

      if (!stepsResult.success) {
        // Rollback service creation if steps fail
        await supabase.from("service").delete().eq("id", service.id);
        return {
          success: false,
          error: stepsResult.error || "Failed to create appointment steps",
        };
      }
    }

    return {
      success: true,
      data: service as Service,
    };
  } catch (error) {
    console.error("Unexpected error creating service:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Update a service
 */
export async function updateServiceAction(
  serviceId: number,
  data: {
    title?: string;
    description?: string | null;
    price?: number;
    duration_minutes?: number;
    branch?: Branch;
    category?: string | null;
    is_active?: boolean;
    requires_appointments?: boolean;
    total_appointments?: number | null;
    appointment_steps?: Array<{
      stepOrder: number;
      serviceIdForStep: number;
      recommendedAfterDays: number;
      label?: string | null;
    }>;
  },
) {
  try {
    const updateData: ServiceUpdate = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.price !== undefined) updateData.price = data.price;
    if (data.duration_minutes !== undefined) {
      updateData.duration_minutes = data.duration_minutes;
    }
    if (data.branch !== undefined) updateData.branch = data.branch;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.requires_appointments !== undefined) {
      updateData.requires_appointments = data.requires_appointments;
    }
    if (data.total_appointments !== undefined) {
      updateData.total_appointments = data.total_appointments;
    }
    updateData.updated_at = new Date().toISOString();

    const { data: service, error } = await supabase
      .from("service")
      // @ts-ignore - Supabase proxy typing issue
      .update(updateData)
      .eq("id", serviceId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error updating service:", error);
      return {
        success: false,
        error: error.message || "Failed to update service",
      };
    }

    if (!service) {
      return {
        success: false,
        error: "Service not found",
      };
    }

    // Update appointment steps if provided
    if (data.appointment_steps !== undefined) {
      if (data.requires_appointments && data.appointment_steps.length > 0) {
        const stepsResult = await upsertServiceAppointmentSteps(
          serviceId,
          data.appointment_steps
        );

        if (!stepsResult.success) {
          return {
            success: false,
            error: stepsResult.error || "Failed to update appointment steps",
          };
        }
      } else if (!data.requires_appointments) {
        // If requires_appointments is false, delete all steps
        await supabase
          .from("service_appointment_steps")
          .delete()
          .eq("service_id", serviceId);
      }
    }

    return {
      success: true,
      data: service as Service,
    };
  } catch (error) {
    console.error("Unexpected error updating service:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Soft delete a service (set is_active to false)
 */
export async function softDeleteServiceAction(serviceId: number) {
  try {
    const { data: service, error } = await supabase
      .from("service")
      // @ts-ignore - Supabase proxy typing issue
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", serviceId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error soft deleting service:", error);
      return {
        success: false,
        error: error.message || "Failed to delete service",
      };
    }

    if (!service) {
      return {
        success: false,
        error: "Service not found",
      };
    }

    return {
      success: true,
      data: service as Service,
    };
  } catch (error) {
    console.error("Unexpected error soft deleting service:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Restore a soft-deleted service (set is_active to true)
 */
export async function restoreServiceAction(serviceId: number) {
  try {
    const { data: service, error } = await supabase
      .from("service")
      // @ts-ignore - Supabase proxy typing issue
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", serviceId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Error restoring service:", error);
      return {
        success: false,
        error: error.message || "Failed to restore service",
      };
    }

    if (!service) {
      return {
        success: false,
        error: "Service not found",
      };
    }

    return {
      success: true,
      data: service as Service,
    };
  } catch (error) {
    console.error("Unexpected error restoring service:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
