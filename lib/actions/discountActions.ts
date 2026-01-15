import type { Tables } from "../../database.types";
import { supabase } from "../utils/supabase";

type Discount = Tables<"discount">;
type DiscountService = Tables<"discount_services">;
type Service = Tables<"service">;

export interface DiscountWithServices extends Discount {
    discount_services?: Array<DiscountService & { service: Service }>;
}

/**
 * Get all discounts
 */
export async function getAllDiscounts() {
    try {
        // First, update expired discounts
        await updateExpiredDiscounts();

        const { data, error } = await supabase
            .from("discount")
            .select(
                `
        *,
        discount_services (
          id,
          service_id,
          service:service_id (
            id,
            title,
            price,
            branch,
            is_active
          )
        )
      `,
            )
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching discounts:", error);
            return {
                success: false,
                error: error.message || "Failed to fetch discounts",
            };
        }

        return {
            success: true,
            data: (data || []) as DiscountWithServices[],
        };
    } catch (error) {
        console.error("Unexpected error fetching discounts:", error);
        return {
            success: false,
            error: "An unexpected error occurred",
        };
    }
}

/**
 * Get active discounts
 */
export async function getActiveDiscounts() {
    try {
        await updateExpiredDiscounts();

        const { data, error } = await supabase
            .from("discount")
            .select(
                `
        *,
        discount_services (
          id,
          service_id,
          service:service_id (
            id,
            title,
            price,
            branch,
            is_active
          )
        )
      `,
            )
            .eq("status", "ACTIVE")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching active discounts:", error);
            return {
                success: false,
                error: error.message || "Failed to fetch active discounts",
            };
        }

        return {
            success: true,
            data: (data || []) as DiscountWithServices[],
        };
    } catch (error) {
        console.error("Unexpected error fetching active discounts:", error);
        return {
            success: false,
            error: "An unexpected error occurred",
        };
    }
}

/**
 * Create a new discount
 */
export async function createDiscountAction(data: {
    name: string;
    description?: string | null;
    discount_type: "ABSOLUTE" | "PERCENTAGE";
    discount_value: number;
    branch?: "NAILS" | "SKIN" | "LASHES" | "MASSAGE" | null;
    start_date: string; // ISO timestamp
    end_date: string; // ISO timestamp
    service_ids: number[];
}) {
    try {
        // Get current user ID
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return {
                success: false,
                error: "User not authenticated",
            };
        }

        // Create discount
        const { data: discount, error: discountError } = await supabase
            .from("discount")
            .insert({
                name: data.name,
                description: data.description || null,
                discount_type: data.discount_type,
                discount_value: data.discount_value,
                branch: data.branch || null,
                start_date: data.start_date,
                end_date: data.end_date,
                status: "ACTIVE",
                created_by: user.id,
            })
            .select()
            .single();

        if (discountError || !discount) {
            return {
                success: false,
                error: discountError?.message || "Failed to create discount",
            };
        }

        // Add services to discount
        if (data.service_ids.length > 0) {
            const discountServices = data.service_ids.map((service_id) => ({
                discount_id: discount.id,
                service_id,
            }));

            const { error: servicesError } = await supabase
                .from("discount_services")
                .insert(discountServices);

            if (servicesError) {
                // Rollback: delete the discount if services fail
                await supabase.from("discount").delete().eq("id", discount.id);
                return {
                    success: false,
                    error: "Failed to add services to discount",
                };
            }
        }

        return {
            success: true,
            data: discount,
        };
    } catch (error) {
        console.error("Unexpected error creating discount:", error);
        return {
            success: false,
            error: "An unexpected error occurred",
        };
    }
}

/**
 * Update a discount
 */
export async function updateDiscountAction(
    discountId: number,
    data: {
        name?: string;
        description?: string | null;
        discount_type?: "ABSOLUTE" | "PERCENTAGE";
        discount_value?: number;
        branch?: "NAILS" | "SKIN" | "LASHES" | "MASSAGE" | null;
        start_date?: string;
        end_date?: string;
        status?: "ACTIVE" | "EXPIRED" | "CANCELLED";
        service_ids?: number[];
    },
) {
    try {
        // Update discount
        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) {
            updateData.description = data.description;
        }
        if (data.discount_type !== undefined) {
            updateData.discount_type = data.discount_type;
        }
        if (data.discount_value !== undefined) {
            updateData.discount_value = data.discount_value;
        }
        if (data.branch !== undefined) updateData.branch = data.branch;
        if (data.start_date !== undefined) {
            updateData.start_date = data.start_date;
        }
        if (data.end_date !== undefined) updateData.end_date = data.end_date;
        if (data.status !== undefined) updateData.status = data.status;

        const { error: updateError } = await supabase
            .from("discount")
            .update(updateData)
            .eq("id", discountId);

        if (updateError) {
            return {
                success: false,
                error: updateError.message || "Failed to update discount",
            };
        }

        // Update services if provided
        if (data.service_ids !== undefined) {
            // Delete existing services
            const { error: deleteError } = await supabase
                .from("discount_services")
                .delete()
                .eq("discount_id", discountId);

            if (deleteError) {
                return {
                    success: false,
                    error: "Failed to update discount services",
                };
            }

            // Add new services
            if (data.service_ids.length > 0) {
                const discountServices = data.service_ids.map((service_id) => ({
                    discount_id: discountId,
                    service_id,
                }));

                const { error: insertError } = await supabase
                    .from("discount_services")
                    .insert(discountServices);

                if (insertError) {
                    return {
                        success: false,
                        error: "Failed to add services to discount",
                    };
                }
            }
        }

        return {
            success: true,
        };
    } catch (error) {
        console.error("Unexpected error updating discount:", error);
        return {
            success: false,
            error: "An unexpected error occurred",
        };
    }
}

/**
 * Delete a discount
 */
export async function deleteDiscountAction(discountId: number) {
    try {
        // Delete discount (services will be cascade deleted)
        const { error } = await supabase
            .from("discount")
            .delete()
            .eq("id", discountId);

        if (error) {
            return {
                success: false,
                error: error.message || "Failed to delete discount",
            };
        }

        return {
            success: true,
        };
    } catch (error) {
        console.error("Unexpected error deleting discount:", error);
        return {
            success: false,
            error: "An unexpected error occurred",
        };
    }
}

/**
 * Cancel a discount (set status to CANCELLED)
 */
export async function cancelDiscountAction(discountId: number) {
    try {
        const { error } = await supabase
            .from("discount")
            .update({ status: "CANCELLED" })
            .eq("id", discountId);

        if (error) {
            return {
                success: false,
                error: error.message || "Failed to cancel discount",
            };
        }

        return {
            success: true,
        };
    } catch (error) {
        console.error("Unexpected error cancelling discount:", error);
        return {
            success: false,
            error: "An unexpected error occurred",
        };
    }
}

/**
 * Update expired discounts
 */
async function updateExpiredDiscounts() {
    try {
        // Try to call RPC function first if it exists
        const { error: rpcError } = await supabase.rpc("expire_discounts");

        // If RPC function doesn't exist or fails, do manual update
        if (rpcError) {
            const now = new Date().toISOString();
            await supabase
                .from("discount")
                .update({ status: "EXPIRED" })
                .eq("status", "ACTIVE")
                .lt("end_date", now);
        }
    } catch (err) {
        // Fallback: manual update on any error
        try {
            const now = new Date().toISOString();
            await supabase
                .from("discount")
                .update({ status: "EXPIRED" })
                .eq("status", "ACTIVE")
                .lt("end_date", now);
        } catch (fallbackErr) {
            console.error("Error updating expired discounts:", fallbackErr);
        }
    }
}
