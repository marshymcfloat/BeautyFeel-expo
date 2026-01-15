import type { Tables, TablesInsert } from "../../database.types";
import { capitalizeWords } from "../utils";
import { supabase } from "../utils/supabase";

export type Customer = Tables<"customer">;

// --- Search Customers ---
export async function searchCustomers(searchTerm: string) {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return { success: true, data: [] as Customer[] };
    }

    const { data, error } = await supabase
      .from("customer")
      .select("*")
      .ilike("name", `%${searchTerm}%`)
      .order("name")
      .limit(10);

    if (error) throw error;

    return { success: true, data: (data || []) as Customer[] };
  } catch (error) {
    console.error("Error searching customers:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// --- Create Customer ---
export async function createCustomerAction(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
}) {
  try {
    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: "Customer name is required" };
    }

    const customerInsert: TablesInsert<"customer"> = {
      name: capitalizeWords(data.name),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      spent: 0,
    };

    const { data: customer, error } = await supabase
      .from("customer")
      .insert(customerInsert as any)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data: customer as Customer };
  } catch (error) {
    console.error("Error creating customer:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// --- Get Customers (Infinite Scroll Optimized) ---
export async function getCustomersAction(options?: {
  page?: number;
  pageSize?: number;
  sortBy?: "spent" | "name" | "created_at";
  order?: "asc" | "desc";
  searchTerm?: string;
}) {
  try {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const sortBy = options?.sortBy || "created_at";
    const order = options?.order || "desc";
    const searchTerm = options?.searchTerm?.trim() || "";

    let query = supabase.from("customer").select("*", { count: "exact" });

    // Filter
    if (searchTerm) {
      query = query.or(
        `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`,
      );
    }

    // Sort
    if (sortBy === "spent") {
      query = query.order("spent", {
        ascending: order === "asc",
        nullsFirst: false,
      });
    } else if (sortBy === "name") {
      query = query.order("name", { ascending: order === "asc" });
    } else {
      query = query.order("created_at", { ascending: order === "asc" });
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    const total = count || 0;
    const hasNextPage = (data?.length || 0) === pageSize && total > to + 1;

    return {
      success: true,
      data: (data || []) as Customer[],
      pagination: {
        page,
        pageSize,
        total,
        nextPage: hasNextPage ? page + 1 : null,
      },
    };
  } catch (error) {
    console.error("Error fetching customers:", error);
    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : "Failed to fetch customers",
    };
  }
}

// --- Get Customer By ID ---
export async function getCustomerByIdAction(customerId: number) {
  try {
    const { data, error } = await supabase
      .from("customer")
      .select("*")
      .eq("id", customerId)
      .single();

    if (error) throw error;
    if (!data) return { success: false, error: "Customer not found" };

    return { success: true, data: data as Customer };
  } catch (error) {
    return { success: false, error: "An unexpected error occurred" };
  }
}

// --- Update Customer ---
export async function updateCustomerAction(
  customerId: number,
  data: {
    name?: string;
    email?: string | null;
    phone?: string | null;
  },
) {
  try {
    const updateData: Partial<{
      name: string;
      email: string | null;
      phone: string | null;
    }> = {};

    if (data.name !== undefined) {
      updateData.name = capitalizeWords(data.name.trim());
    }
    if (data.email !== undefined) updateData.email = data.email?.trim() || null;
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;

    const updateQuery = supabase
      .from("customer")
      .update(updateData as never)
      .eq("id", customerId)
      .select()
      .single();

    const { data: customer, error } = await updateQuery;

    if (error) throw error;

    return { success: true, data: customer as Customer };
  } catch (error) {
    console.error("Error updating customer:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
