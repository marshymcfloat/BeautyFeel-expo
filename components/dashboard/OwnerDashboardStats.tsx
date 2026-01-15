import { StatCard } from "@/components/ui/StatCard";
import { useAuth } from "@/lib/hooks/useAuth";
import { useResponsive } from "@/lib/hooks/useResponsive";
import {
  getContainerPadding,
  scaleDimension,
} from "@/lib/utils/responsive";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
} from "lucide-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";
import type { Branch } from "@/lib/actions/salesActions";
import { getSalesStats, getBranchesForOwner } from "@/lib/actions/salesActions";
import { getAllBookings } from "@/lib/actions/bookingActions";

export default function OwnerDashboardStats() {
  const { isTablet, isSmallPhone } = useResponsive();
  const { profile } = useAuth();
  const containerPadding = getContainerPadding();
  const iconSize = isTablet ? 24 : isSmallPhone ? 18 : 20;

  // Get sales stats for the last 30 days
  const { data: salesStats, isLoading: statsLoading } = useQuery({
    queryKey: ["owner-stats", profile?.branch],
    queryFn: async () => {
      const result = await getSalesStats("month", profile?.branch as Branch);
      if (!result.success || !result.data) {
        return {
          totalSales: 0,
          totalBookings: 0,
          newCustomers: 0,
          averageBookingValue: 0,
        };
      }
      return result.data;
    },
  });

  // Get all bookings to count customers
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["all-bookings"],
    queryFn: async () => {
      const result = await getAllBookings();
      if (!result.success || !result.data) {
        return [];
      }
      return result.data;
    },
  });

  // Calculate unique customers (filtered by owner's branch logic)
  const uniqueCustomers = React.useMemo(() => {
    if (!bookingsData) return 0;
    
    const branchesToInclude = getBranchesForOwner(profile?.branch as Branch);
    const customerIds = new Set<number>();

    bookingsData.forEach((booking) => {
      // Check if booking has services from allowed branches
      const serviceBookings = booking.service_bookings || [];
      const hasAllowedService = serviceBookings.some((sb) => {
        const serviceBranch = sb?.service?.branch;
        return serviceBranch && branchesToInclude.includes(serviceBranch as Branch);
      });

      if (hasAllowedService && booking.customer_id) {
        customerIds.add(booking.customer_id);
      }
    });

    return customerIds.size;
  }, [bookingsData, profile?.branch]);

  // Calculate today's bookings (filtered by owner's branch logic)
  const todayBookings = React.useMemo(() => {
    if (!bookingsData) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const branchesToInclude = getBranchesForOwner(profile?.branch as Branch);

    return bookingsData.filter((booking) => {
      // Check date
      const bookingDate = new Date(booking.appointment_date || booking.created_at);
      bookingDate.setHours(0, 0, 0, 0);
      const isToday = bookingDate.getTime() === today.getTime();
      
      if (!isToday) return false;

      // Check branch permissions
      const serviceBookings = booking.service_bookings || [];
      return serviceBookings.some((sb) => {
        const serviceBranch = sb?.service?.branch;
        return serviceBranch && branchesToInclude.includes(serviceBranch as Branch);
      });
    }).length;
  }, [bookingsData, profile?.branch]);

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <View style={[styles.container, { marginHorizontal: containerPadding }]}>
      <View style={styles.statsGrid}>
        <StatCard
          label="Total Sales (30d)"
          value={
            statsLoading
              ? "Loading..."
              : formatCurrency(salesStats?.totalSales || 0)
          }
          icon={<DollarSign size={iconSize} color="white" />}
          gradientColors={["#10b981", "#059669", "#047857"]}
          loading={statsLoading}
        />
        <StatCard
          label="Bookings (30d)"
          value={statsLoading ? "..." : salesStats?.totalBookings || 0}
          icon={<Calendar size={iconSize} color="white" />}
          gradientColors={["#3b82f6", "#2563eb", "#1d4ed8"]}
          loading={statsLoading}
        />
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          label="Today's Bookings"
          value={bookingsLoading ? "..." : todayBookings}
          icon={<TrendingUp size={iconSize} color="white" />}
          gradientColors={["#f59e0b", "#d97706", "#b45309"]}
          loading={bookingsLoading}
        />
        <StatCard
          label="Total Customers"
          value={bookingsLoading ? "..." : uniqueCustomers}
          icon={<Users size={iconSize} color="white" />}
          gradientColors={["#ec4899", "#d946ef", "#a855f7"]}
          loading={bookingsLoading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: scaleDimension(16),
  },
  statsGrid: {
    flexDirection: "row",
    gap: scaleDimension(12),
    marginBottom: scaleDimension(12),
  },
});

