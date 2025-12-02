import type { Database } from "../../database.types";
import { supabase } from "../utils/supabase";

type Service = Database["public"]["Tables"]["service"]["Row"];
type ServiceInsert = Database["public"]["Tables"]["service"]["Insert"];
type ServiceUpdate = Database["public"]["Tables"]["service"]["Update"];
type Branch = Database["public"]["Enums"]["branch"];

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
