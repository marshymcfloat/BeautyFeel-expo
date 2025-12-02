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
}

export interface SalesStats {
  totalSales: number;
  totalBookings: number;
  newCustomers: number;
  averageBookingValue: number;
}

export interface SalesSummary {
  totalSales: number;
  totalSalesDeductions: number;
  netSales: number;
}

export type TimeSpan = "all" | "month" | "week" | "day";

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
 */
export async function getSalesData(timeSpan: TimeSpan = "month"): Promise<{
  success: boolean;
  data?: SalesData[];
  error?: string;
}> {
  try {
    const startDate = getStartDate(timeSpan);

    let query = supabase
      .from("booking")
      .select(
        `
        id,
        grandTotal,
        grandDiscount,
        appointment_date,
        created_at,
        status
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

    // Group by date based on time span
    const salesMap = new Map<string, { sales: number; bookings: number }>();

    bookings.forEach((booking: any) => {
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

      const existing = salesMap.get(key) || { sales: 0, bookings: 0 };
      const grandTotal = booking.grandTotal || 0;
      const grandDiscount = booking.grandDiscount || 0;
      const finalTotal = grandTotal - grandDiscount;
      salesMap.set(key, {
        sales: existing.sales + finalTotal,
        bookings: existing.bookings + 1,
      });
    });

    const salesData: SalesData[] = Array.from(salesMap.entries())
      .map(([date, data]) => ({
        date,
        sales: data.sales,
        bookings: data.bookings,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, data: salesData };
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
 */
export async function getSalesStats(
  timeSpan: TimeSpan = "month",
): Promise<{ success: boolean; data?: SalesStats; error?: string }> {
  try {
    const startDate = getStartDate(timeSpan);

    let query = supabase
      .from("booking")
      .select("grandTotal, grandDiscount, created_at")
      .in("status", ["COMPLETED", "PAID"]);

    if (timeSpan !== "all") {
      query = query.gte("created_at", startDate.toISOString());
    }

    const { data: bookings, error: bookingsError } = await query;

    if (bookingsError) {
      return { success: false, error: bookingsError.message };
    }

    const totalSales = bookings?.reduce((sum, b: any) => {
      const grandTotal = b.grandTotal || 0;
      const grandDiscount = b.grandDiscount || 0;
      return sum + (grandTotal - grandDiscount);
    }, 0) || 0;
    const totalBookings = bookings?.length || 0;
    const averageBookingValue = totalBookings > 0
      ? totalSales / totalBookings
      : 0;

    // Get new customers
    let customerQuery = supabase
      .from("customer")
      .select("id", { count: "exact", head: true });

    if (timeSpan !== "all") {
      customerQuery = customerQuery.gte("created_at", startDate.toISOString());
    }

    const { count: newCustomers, error: customersError } = await customerQuery;

    if (customersError) {
      return { success: false, error: customersError.message };
    }

    return {
      success: true,
      data: {
        totalSales,
        totalBookings,
        newCustomers: newCustomers || 0,
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
 */
export async function getAppointmentStats(
  timeSpan: TimeSpan = "month",
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
    let query = supabase.from("booking").select("status");

    if (timeSpan !== "all") {
      query = query.gte("created_at", startDate.toISOString());
    }

    const { data: bookings, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    const stats = {
      total: bookings?.length || 0,
      completed: 0,
      pending: 0,
      cancelled: 0,
    };

    bookings?.forEach((booking: any) => {
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
 */
export async function getSalesSummary(
  timeSpan: TimeSpan = "month",
): Promise<{ success: boolean; data?: SalesSummary; error?: string }> {
  try {
    const { data, error } = (await supabase.rpc(
      "get_overall_sales_summary",
      {
        p_time_span: timeSpan,
      } as any,
    )) as {
      data: SalesSummaryResult[] | null;
      error: { message: string } | null;
    };

    if (error) {
      console.error("Error fetching sales summary:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch sales summary",
      };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: {
          totalSales: 0,
          totalSalesDeductions: 0,
          netSales: 0,
        },
      };
    }

    const result = data[0];
    return {
      success: true,
      data: {
        totalSales: Number(result.total_sales) || 0,
        totalSalesDeductions: Number(result.total_sales_deductions) || 0,
        netSales: Number(result.net_sales) || 0,
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
