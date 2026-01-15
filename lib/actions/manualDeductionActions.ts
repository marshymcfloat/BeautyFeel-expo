import type { Database } from "../../database.types";
import { supabase } from "../utils/supabase";

type ManualDeduction = Database["public"]["Tables"]["manual_deduction"]["Row"];
type ManualDeductionInsert =
  Database["public"]["Tables"]["manual_deduction"]["Insert"];
type ManualDeductionUpdate =
  Database["public"]["Tables"]["manual_deduction"]["Update"];
type Employee = Database["public"]["Tables"]["employee"]["Row"];
export type Branch = "NAILS" | "SKIN" | "LASHES" | "MASSAGE";

export interface ManualDeductionWithUser extends ManualDeduction {
  created_by_user?: {
    email?: string;
  };
}

export interface CreateManualDeductionInput {
  branch: Branch;
  amount: number;
  description: string;
  deduction_date: string; // ISO date string
}

export interface UpdateManualDeductionInput {
  branch?: Branch;
  amount?: number;
  description?: string;
  deduction_date?: string;
}

/**
 * Get manual deductions for a specific time period and branch
 */
export async function getManualDeductions(
  startDate?: Date,
  endDate?: Date,
  ownerBranch: Branch | null = null,
): Promise<{
  success: boolean;
  data?: ManualDeductionWithUser[];
  error?: string;
}> {
  try {
    // Get branches this owner can access
    const branchesToInclude = getBranchesForOwner(ownerBranch);

    let query = supabase
      .from("manual_deduction")
      .select("*")
      .in("branch", branchesToInclude)
      .order("deduction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (startDate) {
      query = query.gte(
        "deduction_date",
        startDate.toISOString().split("T")[0],
      );
    }

    if (endDate) {
      query = query.lte("deduction_date", endDate.toISOString().split("T")[0]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching manual deductions:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as ManualDeductionWithUser[] };
  } catch (error) {
    console.error("Error in getManualDeductions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create a new manual deduction
 */
export async function createManualDeduction(
  input: CreateManualDeductionInput,
): Promise<{
  success: boolean;
  data?: ManualDeduction;
  error?: string;
}> {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    // Verify user has permission to create deduction for this branch
    const { data: employee, error: employeeError } = await supabase
      .from("employee")
      .select("branch, role")
      .eq("user_id", user.id)
      .single<Pick<Employee, "branch" | "role">>();

    if (employeeError || !employee) {
      console.error("Error fetching employee:", employeeError);
      return { success: false, error: "Employee record not found" };
    }

    if (employee.role !== "OWNER") {
      return { success: false, error: "Only owners can create deductions" };
    }

    const branchesAllowed = getBranchesForOwner(
      employee.branch as Branch | null,
    );
    if (!branchesAllowed.includes(input.branch)) {
      return {
        success: false,
        error: "You don't have permission to create deductions for this branch",
      };
    }

    const { data, error } = await (supabase
      .from("manual_deduction") as any)
      .insert({
        branch: input.branch,
        amount: input.amount,
        description: input.description,
        deduction_date: input.deduction_date,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating manual deduction:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in createManualDeduction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update an existing manual deduction
 */
export async function updateManualDeduction(
  id: string,
  input: UpdateManualDeductionInput,
): Promise<{
  success: boolean;
  data?: ManualDeduction;
  error?: string;
}> {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    // Get existing deduction to check branch
    const { data: existing, error: fetchError } = await (supabase
      .from("manual_deduction") as any)
      .select("branch")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "Deduction not found" };
    }

    // Verify user has permission
    const { data: employee, error: employeeError } = await supabase
      .from("employee")
      .select("branch, role")
      .eq("user_id", user.id)
      .single<Pick<Employee, "branch" | "role">>();

    if (employeeError || !employee) {
      console.error("Error fetching employee:", employeeError);
      return { success: false, error: "Employee record not found" };
    }

    if (employee.role !== "OWNER") {
      return { success: false, error: "Only owners can update deductions" };
    }

    const branchesAllowed = getBranchesForOwner(
      employee.branch as Branch | null,
    );
    const branchToUpdate = input.branch ||
      (existing as { branch: Branch }).branch;

    if (!branchesAllowed.includes(branchToUpdate)) {
      return {
        success: false,
        error: "You don't have permission to update deductions for this branch",
      };
    }

    const updateData: ManualDeductionUpdate = {};
    if (input.branch !== undefined) updateData.branch = input.branch;
    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.deduction_date !== undefined) {
      updateData.deduction_date = input.deduction_date;
    }

    const { data, error } = await (supabase
      .from("manual_deduction") as any)
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating manual deduction:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in updateManualDeduction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a manual deduction
 */
export async function deleteManualDeduction(
  id: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    // Get existing deduction to check branch
    const { data: existing, error: fetchError } = await (supabase
      .from("manual_deduction") as any)
      .select("branch")
      .eq("id", id)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "Deduction not found" };
    }

    // Verify user has permission
    const { data: employee, error: employeeError } = await supabase
      .from("employee")
      .select("branch, role")
      .eq("user_id", user.id)
      .single<Pick<Employee, "branch" | "role">>();

    if (employeeError || !employee) {
      console.error("Error fetching employee:", employeeError);
      return { success: false, error: "Employee record not found" };
    }

    if (employee.role !== "OWNER") {
      return { success: false, error: "Only owners can delete deductions" };
    }

    const branchesAllowed = getBranchesForOwner(
      employee.branch as Branch | null,
    );
    if (!branchesAllowed.includes((existing as { branch: Branch }).branch)) {
      return {
        success: false,
        error: "You don't have permission to delete deductions for this branch",
      };
    }

    const { error } = await supabase
      .from("manual_deduction")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting manual deduction:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in deleteManualDeduction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Helper to get branches to include based on owner branch
 * This matches the logic in salesActions.ts
 */
function getBranchesForOwner(ownerBranch: Branch | null): Branch[] {
  if (!ownerBranch) {
    return ["NAILS", "SKIN", "LASHES", "MASSAGE"];
  }

  if (ownerBranch === "SKIN") {
    return ["NAILS", "SKIN", "MASSAGE"];
  } else if (ownerBranch === "LASHES") {
    return ["LASHES"];
  } else if (ownerBranch === "NAILS") {
    return ["NAILS", "SKIN", "MASSAGE"];
  } else if (ownerBranch === "MASSAGE") {
    return ["NAILS", "SKIN", "MASSAGE"];
  }

  return ["NAILS", "SKIN", "LASHES", "MASSAGE"];
}
