import { supabase } from "../utils/supabase";
import { capitalizeWords } from "../utils";
import type { Tables, TablesInsert } from "../../database.types";

type Customer = Tables<"public", "customer">;

/**
 * Search customers by name
 */
export async function searchCustomers(searchTerm: string) {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return {
        success: true,
        data: [] as Customer[],
      };
    }

    const { data, error } = await supabase
      .from("customer")
      .select("*")
      .ilike("name", `%${searchTerm}%`)
      .order("name")
      .limit(10);

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to search customers",
      };
    }

    return {
      success: true,
      data: (data || []) as Customer[],
    };
  } catch (error) {
    console.error("Error searching customers:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Create a new customer
 */
export async function createCustomerAction(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
}) {
  try {
    if (!data.name || data.name.trim().length === 0) {
      return {
        success: false,
        error: "Customer name is required",
      };
    }

    const customerInsert: TablesInsert<"public", "customer"> = {
      name: capitalizeWords(data.name),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      spent: 0,
    };

    const { data: customer, error } = await supabase
      .from("customer")
      .insert(customerInsert)
      .select()
      .single();

    if (error) {
      console.error("Error creating customer:", error);
      return {
        success: false,
        error: error.message || "Failed to create customer",
      };
    }

    return {
      success: true,
      data: customer as Customer,
    };
  } catch (error) {
    console.error("Unexpected error creating customer:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

