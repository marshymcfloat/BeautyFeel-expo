import type { Database } from "../../database.types";
import { supabase } from "../utils/supabase";

type Service = Database["public"]["Tables"]["service"]["Row"];
type Branch = Database["public"]["Enums"]["branch"];

// Service Set type (will match database structure after migration)
export interface ServiceSet {
  id: number;
  title: string;
  description: string | null;
  price: number;
  branch: Branch;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

// Service Set with its items
export interface ServiceSetWithItems extends ServiceSet {
  service_set_items: Array<{
    service_id: number;
    adjusted_price: number | null;
    service: Service;
  }>;
}

/**
 * Fetch all active service sets for a branch
 */
export async function getServiceSetsForBranch(branch: Branch) {
  try {
    const { data, error } = await supabase
      .from("service_set")
      .select(
        `
        *,
        service_set_items (
          service_id,
          adjusted_price,
          service:service_id (*)
        )
      `,
      )
      .eq("branch", branch)
      .eq("is_active", true)
      .order("title");

    if (error) {
      console.error("Error fetching service sets:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch service sets",
      };
    }

    return {
      success: true,
      data: (data as any[]) || [],
    };
  } catch (error) {
    console.error("Unexpected error fetching service sets:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Fetch a single service set by ID with its items
 */
export async function getServiceSetById(serviceSetId: number) {
  try {
    const { data, error } = await supabase
      .from("service_set")
      .select(
        `
        *,
        service_set_items (
          service_id,
          adjusted_price,
          service:service_id (*)
        )
      `,
      )
      .eq("id", serviceSetId)
      .single();

    if (error) {
      console.error("Error fetching service set:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch service set",
      };
    }

    return {
      success: true,
      data: data as any,
    };
  } catch (error) {
    console.error("Unexpected error fetching service set:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Create a new service set
 */
export async function createServiceSetAction(data: {
  title: string;
  description?: string | null;
  price: number;
  branch: Branch;
  service_ids: number[];
  service_prices?: Array<{ service_id: number; adjusted_price: number | null }>;
}) {
  try {
    // Validate services exist and are active
    if (data.service_ids.length === 0) {
      return {
        success: false,
        error: "At least one service is required in a service set",
      };
    }

    const { data: services, error: servicesError } = await supabase
      .from("service")
      .select("id, is_active")
      .in("id", data.service_ids);

    if (
      servicesError || !services || services.length !== data.service_ids.length
    ) {
      return {
        success: false,
        error: "One or more services not found",
      };
    }

    // Check all services are active
    const allActive = services.every((s) => s.is_active);
    if (!allActive) {
      return {
        success: false,
        error: "All services in a service set must be active",
      };
    }

    // Create service set
    const { data: serviceSet, error: setError } = await supabase
      .from("service_set")
      .insert({
        title: data.title,
        description: data.description || null,
        price: data.price,
        branch: data.branch,
        is_active: true,
      })
      .select()
      .single();

    if (setError || !serviceSet) {
      return {
        success: false,
        error: setError?.message || "Failed to create service set",
      };
    }

    // Create service set items with adjusted prices
    const priceMap = new Map<number, number | null>();
    if (data.service_prices) {
      data.service_prices.forEach((sp) => {
        priceMap.set(sp.service_id, sp.adjusted_price);
      });
    }

    const items = data.service_ids.map((serviceId) => ({
      service_set_id: serviceSet.id,
      service_id: serviceId,
      adjusted_price: priceMap.get(serviceId) ?? null,
    }));

    const { error: itemsError } = await supabase
      .from("service_set_items")
      .insert(items);

    if (itemsError) {
      // Rollback: delete the service set
      await supabase.from("service_set").delete().eq("id", serviceSet.id);
      return {
        success: false,
        error: itemsError.message || "Failed to create service set items",
      };
    }

    return {
      success: true,
      data: serviceSet,
    };
  } catch (error) {
    console.error("Unexpected error creating service set:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Update a service set
 */
export async function updateServiceSetAction(
  serviceSetId: number,
  data: {
    title?: string;
    description?: string | null;
    price?: number;
    branch?: Branch;
    is_active?: boolean;
    service_ids?: number[];
    service_prices?: Array<
      { service_id: number; adjusted_price: number | null }
    >;
  },
) {
  try {
    // If service_ids are being updated, validate them
    if (data.service_ids !== undefined) {
      if (data.service_ids.length === 0) {
        return {
          success: false,
          error: "At least one service is required in a service set",
        };
      }

      const { data: services, error: servicesError } = await supabase
        .from("service")
        .select("id, is_active")
        .in("id", data.service_ids);

      if (
        servicesError || !services ||
        services.length !== data.service_ids.length
      ) {
        return {
          success: false,
          error: "One or more services not found",
        };
      }

      const allActive = services.every((s) => s.is_active);
      if (!allActive) {
        return {
          success: false,
          error: "All services in a service set must be active",
        };
      }
    }

    // Update service set fields
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.price !== undefined) updateData.price = data.price;
    if (data.branch !== undefined) updateData.branch = data.branch;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    updateData.updated_at = new Date().toISOString();

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from("service_set")
        .update(updateData)
        .eq("id", serviceSetId);

      if (updateError) {
        return {
          success: false,
          error: updateError.message || "Failed to update service set",
        };
      }
    }

    // Update service set items if service_ids are provided
    if (data.service_ids !== undefined) {
      // Delete existing items
      const { error: deleteError } = await supabase
        .from("service_set_items")
        .delete()
        .eq("service_set_id", serviceSetId);

      if (deleteError) {
        return {
          success: false,
          error: deleteError.message || "Failed to update service set items",
        };
      }

      // Insert new items with adjusted prices
      const priceMap = new Map<number, number | null>();
      if (data.service_prices) {
        data.service_prices.forEach((sp) => {
          priceMap.set(sp.service_id, sp.adjusted_price);
        });
      }

      const items = data.service_ids.map((serviceId) => ({
        service_set_id: serviceSetId,
        service_id: serviceId,
        adjusted_price: priceMap.get(serviceId) ?? null,
      }));

      const { error: insertError } = await supabase
        .from("service_set_items")
        .insert(items);

      if (insertError) {
        return {
          success: false,
          error: insertError.message || "Failed to update service set items",
        };
      }
    } else if (data.service_prices && data.service_prices.length > 0) {
      // Update prices without changing service_ids
      for (const servicePrice of data.service_prices) {
        const { error: updateError } = await supabase
          .from("service_set_items")
          .update({ adjusted_price: servicePrice.adjusted_price })
          .eq("service_set_id", serviceSetId)
          .eq("service_id", servicePrice.service_id);

        if (updateError) {
          return {
            success: false,
            error: updateError.message || "Failed to update service prices",
          };
        }
      }
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Unexpected error updating service set:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Delete a service set
 */
export async function deleteServiceSetAction(serviceSetId: number) {
  try {
    // Delete service set items first (due to foreign key)
    const { error: itemsError } = await supabase
      .from("service_set_items")
      .delete()
      .eq("service_set_id", serviceSetId);

    if (itemsError) {
      return {
        success: false,
        error: itemsError.message || "Failed to delete service set items",
      };
    }

    // Delete service set
    const { error: deleteError } = await supabase
      .from("service_set")
      .delete()
      .eq("id", serviceSetId);

    if (deleteError) {
      return {
        success: false,
        error: deleteError.message || "Failed to delete service set",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Unexpected error deleting service set:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
