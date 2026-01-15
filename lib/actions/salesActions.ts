import type { Database } from "../../database.types";
import { supabase } from "../utils/supabase";

type Booking = Database["public"]["Tables"]["booking"]["Row"];
type Customer = Database["public"]["Tables"]["customer"]["Row"];
type SalesSummaryResult =
  Database["public"]["Functions"]["get_overall_sales_summary"]["Returns"][0];

export interface SalesData {
  date: string;
  sales: number;
  bookings: number;
  branch?: Branch;
}

export interface SalesDataByBranch {
  date: string;
  branches: Record<Branch, { sales: number; bookings: number }>;
}

export interface SalesStats {
  totalSales: number;
  totalBookings: number;
  newCustomers: number;
  averageBookingValue: number;
}

export interface SalesSummary {
  totalSales: number;
  totalSalesDeductions: number; // Payslip deductions
  totalManualDeductions: number; // Manual deductions (utilities, bills, etc.)
  netSales: number;
}

export type TimeSpan = "all" | "month" | "week" | "day";
export type Branch = "NAILS" | "SKIN" | "LASHES" | "MASSAGE";

// Helper to get branches to include based on owner branch
// SKIN owner: all branches except LASHES (NAILS, SKIN, MASSAGE)
// LASHES owner: only LASHES branch
export function getBranchesForOwner(ownerBranch: Branch | null): Branch[] {
  if (!ownerBranch) {
    // If no branch specified, return all branches
    return ["NAILS", "SKIN", "LASHES", "MASSAGE"];
  }

  if (ownerBranch === "SKIN") {
    // SKIN owner sees all branches except LASHES
    return ["NAILS", "SKIN", "MASSAGE"];
  } else if (ownerBranch === "LASHES") {
    // LASHES owner sees only LASHES
    return ["LASHES"];
  } else if (ownerBranch === "NAILS") {
    return ["NAILS", "SKIN", "MASSAGE"];
  } else if (ownerBranch === "MASSAGE") {
    return ["NAILS", "SKIN", "MASSAGE"];
  }

  // Fallback
  return ["NAILS", "SKIN", "LASHES", "MASSAGE"];
}

// Helper to get start date based on time span
function getStartDate(timeSpan: TimeSpan): Date {
  const now = new Date();
  let startDate: Date;

  switch (timeSpan) {
    case "day":
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "month":
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case "all":
    default:
      startDate = new Date(0); // Beginning of time
      break;
  }
  return startDate;
}

/**
 * Get sales data for a specific time span
 * @param timeSpan - Time period to fetch data for
 * @param ownerBranch - Owner's branch to filter by (SKIN or LASHES)
 */
export async function getSalesData(
  timeSpan: TimeSpan = "month",
  ownerBranch: Branch | null = null,
): Promise<{
  success: boolean;
  data?: SalesData[];
  dataByBranch?: SalesDataByBranch[];
  error?: string;
}> {
  try {
    const startDate = getStartDate(timeSpan);
    const branchesToInclude = getBranchesForOwner(ownerBranch);

    // Query bookings with service_bookings and service to filter by branch
    // We need price_at_booking and quantity from service_bookings to calculate individual service amounts
    let query = supabase
      .from("booking")
      .select(
        `
        id,
        grandTotal,
        grandDiscount,
        appointment_date,
        created_at,
        status,
        service_bookings!inner(
          id,
          price_at_booking,
          quantity,
          service:service_id(
            branch
          )
        )
      `,
      )
      .in("status", ["COMPLETED", "PAID"]);

    if (timeSpan !== "all") {
      query = query.gte("created_at", startDate.toISOString());
    }

    const { data: bookings, error } = await query
      .order("created_at", { ascending: true })
      .limit(10000);

    if (error) {
      console.error("Error fetching sales data:", error);
      return { success: false, error: error.message };
    }

    if (!bookings || bookings.length === 0) {
      return { success: true, data: [] };
    }

    // Group by date and branch
    const salesMap = new Map<
      string,
      Map<Branch, { sales: number; bookings: Set<number> }>
    >();

    bookings.forEach((booking: any) => {
      const serviceBookings = booking.service_bookings || [];

      // Group services by branch
      const branchSales = new Map<Branch, number>();
      let allServicesTotal = 0;

      serviceBookings.forEach((sb: any) => {
        const serviceBranch = sb?.service?.branch;
        const price = sb.price_at_booking || 0;
        const quantity = sb.quantity || 1;
        const serviceAmount = price * quantity;

        allServicesTotal += serviceAmount;

        // Only include services from allowed branches
        if (serviceBranch && branchesToInclude.includes(serviceBranch)) {
          const existing = branchSales.get(serviceBranch) || 0;
          branchSales.set(serviceBranch, existing + serviceAmount);
        }
      });

      // Skip if no services from allowed branches
      if (branchSales.size === 0) {
        return;
      }

      const bookingDate = new Date(booking.created_at);
      let key: string;

      switch (timeSpan) {
        case "day":
          // Group by hour
          key = `${bookingDate.getFullYear()}-${
            String(
              bookingDate.getMonth() + 1,
            ).padStart(2, "0")
          }-${
            String(bookingDate.getDate()).padStart(
              2,
              "0",
            )
          } ${String(bookingDate.getHours()).padStart(2, "0")}:00`;
          break;
        case "week":
        case "month":
          // Group by day
          key = `${bookingDate.getFullYear()}-${
            String(
              bookingDate.getMonth() + 1,
            ).padStart(2, "0")
          }-${String(bookingDate.getDate()).padStart(2, "0")}`;
          break;
        case "all":
        default:
          // Group by month
          key = `${bookingDate.getFullYear()}-${
            String(
              bookingDate.getMonth() + 1,
            ).padStart(2, "0")
          }`;
          break;
      }

      // Apply discount proportionally per branch
      const grandDiscount = booking.grandDiscount || 0;

      branchSales.forEach((branchAmount, branch) => {
        const discountRatio = allServicesTotal > 0
          ? branchAmount / allServicesTotal
          : 1;
        const proportionalDiscount = grandDiscount * discountRatio;
        const finalAmount = branchAmount - proportionalDiscount;

        if (!salesMap.has(key)) {
          salesMap.set(key, new Map());
        }
        const dateMap = salesMap.get(key)!;

        if (!dateMap.has(branch)) {
          dateMap.set(branch, { sales: 0, bookings: new Set<number>() });
        }

        const existing = dateMap.get(branch)!;
        existing.bookings.add(booking.id);
        dateMap.set(branch, {
          sales: existing.sales + finalAmount,
          bookings: existing.bookings,
        });
      });
    });

    // Convert to SalesDataByBranch format
    const allDates = Array.from(salesMap.keys()).sort();
    const salesDataByBranch: SalesDataByBranch[] = allDates.map((date) => {
      const branchesData: Record<Branch, { sales: number; bookings: number }> =
        {
          NAILS: { sales: 0, bookings: 0 },
          SKIN: { sales: 0, bookings: 0 },
          LASHES: { sales: 0, bookings: 0 },
          MASSAGE: { sales: 0, bookings: 0 },
        };

      const dateMap = salesMap.get(date);
      if (dateMap) {
        dateMap.forEach((data, branch) => {
          branchesData[branch] = {
            sales: data.sales,
            bookings: data.bookings.size,
          };
        });
      }

      return {
        date,
        branches: branchesData,
      };
    });

    // Also maintain backward compatibility with old format for now
    const salesData: SalesData[] = salesDataByBranch.map((item) => {
      const totalSales = Object.values(item.branches).reduce(
        (sum, b) => sum + b.sales,
        0,
      );
      const totalBookings = Object.values(item.branches).reduce(
        (sum, b) => sum + b.bookings,
        0,
      );
      return {
        date: item.date,
        sales: totalSales,
        bookings: totalBookings,
      };
    });

    return { success: true, data: salesData, dataByBranch: salesDataByBranch };
  } catch (error) {
    console.error("Error in getSalesData:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get sales statistics for a specific time span
 * @param timeSpan - Time period to fetch data for
 * @param ownerBranch - Owner's branch to filter by (SKIN or LASHES)
 */
export async function getSalesStats(
  timeSpan: TimeSpan = "month",
  ownerBranch: Branch | null = null,
): Promise<{ success: boolean; data?: SalesStats; error?: string }> {
  try {
    const startDate = getStartDate(timeSpan);
    const branchesToInclude = getBranchesForOwner(ownerBranch);

    let query = supabase
      .from("booking")
      .select(
        `
        id,
        grandTotal,
        grandDiscount,
        created_at,
        customer_id,
        service_bookings!inner(
          id,
          price_at_booking,
          quantity,
          service:service_id(
            branch
          )
        )
      `,
      )
      .in("status", ["COMPLETED", "PAID"]);

    if (timeSpan !== "all") {
      query = query.gte("created_at", startDate.toISOString());
    }

    const { data: bookings, error: bookingsError } = await query;

    if (bookingsError) {
      return { success: false, error: bookingsError.message };
    }

    // Calculate total sales from services in allowed branches only
    let totalSales = 0;
    const bookingIds = new Set<number>();
    const customerIds = new Set<string>();

    bookings?.forEach((booking: any) => {
      const serviceBookings = booking.service_bookings || [];

      // Calculate total amount from services in allowed branches only
      let allowedServicesTotal = 0;
      let allServicesTotal = 0;
      let hasAllowedService = false;

      serviceBookings.forEach((sb: any) => {
        const serviceBranch = sb?.service?.branch;
        const price = sb.price_at_booking || 0;
        const quantity = sb.quantity || 1;
        const serviceAmount = price * quantity;

        allServicesTotal += serviceAmount;

        // Only include services from allowed branches
        if (serviceBranch && branchesToInclude.includes(serviceBranch)) {
          allowedServicesTotal += serviceAmount;
          hasAllowedService = true;
        }
      });

      // Skip if no services from allowed branches
      if (allowedServicesTotal === 0) {
        return;
      }

      // Apply discount proportionally based on allowed services ratio
      const grandDiscount = booking.grandDiscount || 0;
      const discountRatio = allServicesTotal > 0
        ? allowedServicesTotal / allServicesTotal
        : 1;
      const proportionalDiscount = grandDiscount * discountRatio;
      const finalAmount = allowedServicesTotal - proportionalDiscount;

      totalSales += finalAmount;
      bookingIds.add(booking.id);

      // Track customer IDs from bookings with allowed services
      if (hasAllowedService && booking.customer_id) {
        customerIds.add(booking.customer_id);
      }
    });

    const totalBookings = bookingIds.size;
    const averageBookingValue = totalBookings > 0
      ? totalSales / totalBookings
      : 0;

    // Get new customers - count unique customers from filtered bookings
    // that were created within the time period
    let newCustomersCount = 0;

    if (customerIds.size > 0) {
      let customerQuery = supabase
        .from("customer")
        .select("id", { count: "exact", head: true })
        .in("id", Array.from(customerIds));

      if (timeSpan !== "all") {
        customerQuery = customerQuery.gte(
          "created_at",
          startDate.toISOString(),
        );
      }

      const { count, error: customersError } = await customerQuery;

      if (!customersError) {
        newCustomersCount = count || 0;
      }
    }

    return {
      success: true,
      data: {
        totalSales,
        totalBookings,
        newCustomers: newCustomersCount,
        averageBookingValue,
      },
    };
  } catch (error) {
    console.error("Error in getSalesStats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get appointment stats
 * @param timeSpan - Time period to fetch data for
 * @param ownerBranch - Owner's branch to filter by (SKIN or LASHES)
 */
export async function getAppointmentStats(
  timeSpan: TimeSpan = "month",
  ownerBranch: Branch | null = null,
): Promise<{
  success: boolean;
  data?: {
    total: number;
    completed: number;
    pending: number;
    cancelled: number;
  };
  error?: string;
}> {
  try {
    const startDate = getStartDate(timeSpan);
    const branchesToInclude = getBranchesForOwner(ownerBranch);

    let query = supabase
      .from("booking")
      .select(
        `
        status,
        service_bookings!inner(
          service:service_id(
            branch
          )
        )
      `,
      );

    if (timeSpan !== "all") {
      query = query.gte("created_at", startDate.toISOString());
    }

    const { data: bookings, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    // Filter bookings by branch
    const filteredBookings = bookings?.filter((booking: any) => {
      const serviceBookings = booking.service_bookings || [];
      return serviceBookings.some((sb: any) => {
        const serviceBranch = sb?.service?.branch;
        return serviceBranch && branchesToInclude.includes(serviceBranch);
      });
    }) || [];

    const stats = {
      total: filteredBookings.length,
      completed: 0,
      pending: 0,
      cancelled: 0,
    };

    filteredBookings.forEach((booking: any) => {
      const status = booking.status;
      if (status === "COMPLETED" || status === "PAID") {
        stats.completed++;
      } else if (
        status === "PENDING" ||
        status === "CONFIRMED" ||
        status === "IN_PROGRESS"
      ) {
        stats.pending++;
      } else if (status === "CANCELLED" || status === "NO_SHOW") {
        stats.cancelled++;
      }
    });

    return { success: true, data: stats };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get overall sales summary with payslip deductions
 * Uses the database function that properly matches deductions by payslip period
 * and only includes APPROVED payslip requests
 * @param timeSpan - Time period to fetch data for
 * @param ownerBranch - Owner's branch to filter by (SKIN or LASHES)
 */
export async function getSalesSummary(
  timeSpan: TimeSpan = "month",
  ownerBranch: Branch | null = null,
): Promise<{ success: boolean; data?: SalesSummary; error?: string }> {
  try {
    const branchesToInclude = getBranchesForOwner(ownerBranch);
    const startDate = getStartDate(timeSpan);

    // Since the database function might not support branch filtering,
    // we'll fetch bookings and calculate manually with branch filtering
    let query = supabase
      .from("booking")
      .select(
        `
        id,
        grandTotal,
        grandDiscount,
        created_at,
        status,
        service_bookings!inner(
          id,
          price_at_booking,
          quantity,
          service:service_id(
            branch
          )
        )
      `,
      )
      .in("status", ["COMPLETED", "PAID"]);

    if (timeSpan !== "all") {
      query = query.gte("created_at", startDate.toISOString());
    }

    const { data: bookings, error: bookingsError } = await query;

    if (bookingsError) {
      return {
        success: false,
        error: bookingsError.message || "Failed to fetch bookings",
      };
    }

    // Calculate total sales from services in allowed branches only
    let totalSales = 0;

    bookings?.forEach((booking: any) => {
      const serviceBookings = booking.service_bookings || [];

      // Calculate total amount from services in allowed branches only
      let allowedServicesTotal = 0;
      let allServicesTotal = 0;

      serviceBookings.forEach((sb: any) => {
        const serviceBranch = sb?.service?.branch;
        const price = sb.price_at_booking || 0;
        const quantity = sb.quantity || 1;
        const serviceAmount = price * quantity;

        allServicesTotal += serviceAmount;

        // Only include services from allowed branches
        if (serviceBranch && branchesToInclude.includes(serviceBranch)) {
          allowedServicesTotal += serviceAmount;
        }
      });

      // Skip if no services from allowed branches
      if (allowedServicesTotal === 0) {
        return;
      }

      // Apply discount proportionally based on allowed services ratio
      const grandDiscount = booking.grandDiscount || 0;
      const discountRatio = allServicesTotal > 0
        ? allowedServicesTotal / allServicesTotal
        : 1;
      const proportionalDiscount = grandDiscount * discountRatio;
      const finalAmount = allowedServicesTotal - proportionalDiscount;

      totalSales += finalAmount;
    });

    // Get payslip deductions from payslip_release (created when payslip is approved)
    // Filter by employee branch and time period
    let payslipQuery = supabase
      .from("payslip_release")
      .select(
        `
        sales_deduction,
        period_start_date,
        period_end_date,
        released_at,
        employee:employee_id(
          branch
        )
      `,
      );

    if (timeSpan !== "all") {
      // Filter payslips that overlap with the time period
      // A payslip overlaps if its period_end_date is >= our start date
      // (meaning the payslip period includes or overlaps with our time range)
      payslipQuery = payslipQuery.gte(
        "period_end_date",
        startDate.toISOString(),
      );
    }

    const { data: payslipReleases, error: payslipsError } = await payslipQuery;

    if (payslipsError) {
      console.error("Error fetching payslip deductions:", payslipsError);
      // Continue without deductions rather than failing
    }

    // Filter payslip releases by employee branch
    const filteredPayslipReleases = payslipReleases?.filter((pr: any) => {
      const employeeBranch = pr?.employee?.branch;
      // Include payslips where employee branch is in allowed branches
      return employeeBranch && branchesToInclude.includes(employeeBranch);
    }) || [];

    // Calculate total deductions from sales_deduction field
    const totalSalesDeductions = filteredPayslipReleases.reduce(
      (sum, pr: any) => {
        return sum + (Number(pr.sales_deduction) || 0);
      },
      0,
    );

    // Get manual deductions for the time period
    let manualDeductionsQuery = supabase
      .from("manual_deduction")
      .select("amount")
      .in("branch", branchesToInclude);

    if (timeSpan !== "all") {
      // Filter deductions that fall within the time period
      manualDeductionsQuery = manualDeductionsQuery.gte(
        "deduction_date",
        startDate.toISOString().split("T")[0],
      );
    }

    const { data: manualDeductions, error: manualDeductionsError } =
      await manualDeductionsQuery;

    if (manualDeductionsError) {
      console.error("Error fetching manual deductions:", manualDeductionsError);
      // Continue without manual deductions rather than failing
    }

    const totalManualDeductions = (manualDeductions || []).reduce(
      (sum, md: any) => sum + (Number(md.amount) || 0),
      0,
    );

    const netSales = totalSales - totalSalesDeductions - totalManualDeductions;

    return {
      success: true,
      data: {
        totalSales,
        totalSalesDeductions,
        totalManualDeductions,
        netSales,
      },
    };
  } catch (error) {
    console.error("Error in getSalesSummary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
