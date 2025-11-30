import SalesChart from "@/components/sales/SalesChart";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getSalesData,
  getSalesStats,
  getAppointmentStats,
  type TimeSpan,
} from "@/lib/actions/salesActions";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  BarChart3,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconContainer}>{icon}</View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function TimeSpanSelector({
  selected,
  onSelect,
}: {
  selected: TimeSpan;
  onSelect: (span: TimeSpan) => void;
}) {
  const options: { label: string; value: TimeSpan }[] = [
    { label: "All Time", value: "all" },
    { label: "Month", value: "month" },
    { label: "Week", value: "week" },
    { label: "Today", value: "day" },
  ];

  return (
    <View style={styles.timeSpanContainer}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={[
            styles.timeSpanButton,
            selected === option.value && styles.timeSpanButtonActive,
          ]}
          onPress={() => onSelect(option.value)}
        >
          <Text
            style={[
              styles.timeSpanText,
              selected === option.value && styles.timeSpanTextActive,
            ]}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

import { formatCurrency } from "@/lib/utils/currency";

export default function SalesScreen() {
  const { hasRole, loading: authLoading } = useAuth();
  const isOwner = hasRole("owner");
  const [timeSpan, setTimeSpan] = useState<TimeSpan>("month");

  // Fetch sales data
  const {
    data: salesData,
    isLoading: salesLoading,
    error: salesError,
  } = useQuery({
    queryKey: ["salesData", timeSpan],
    queryFn: () => getSalesData(timeSpan),
    enabled: isOwner,
  });

  // Fetch sales stats
  const {
    data: salesStats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ["salesStats", timeSpan],
    queryFn: () => getSalesStats(timeSpan),
    enabled: isOwner,
  });

  // Fetch appointment stats
  const {
    data: appointmentStats,
    isLoading: appointmentLoading,
    error: appointmentError,
  } = useQuery({
    queryKey: ["appointmentStats", timeSpan],
    queryFn: () => getAppointmentStats(timeSpan),
    enabled: isOwner,
  });

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  if (!isOwner) {
    return (
      <View style={styles.restrictedContainer}>
        <Text style={styles.restrictedText}>
          This section is only available for owners.
        </Text>
      </View>
    );
  }

  const isLoading = salesLoading || statsLoading || appointmentLoading;
  const stats = salesStats?.data;
  const appointments = appointmentStats?.data;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#fdf2f8", "#fce7f3", "#f9fafb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Header */}
          <View style={styles.headerSection}>
            <LinearGradient
              colors={["#ec4899", "#d946ef", "#a855f7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <View style={styles.headerContent}>
                <View style={styles.headerIconContainer}>
                  <BarChart3 size={28} color="white" />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.greetingText}>Sales Analytics</Text>
                  <Text style={styles.welcomeText}>
                    Track your business performance
                  </Text>
                </View>
              </View>
              {/* Decorative circles */}
              <View style={styles.decorativeCircle1} />
              <View style={styles.decorativeCircle2} />
            </LinearGradient>
          </View>

      {/* Time Span Selector */}
      <View style={styles.selectorContainer}>
        <TimeSpanSelector selected={timeSpan} onSelect={setTimeSpan} />
      </View>

      {/* Stats Grid */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Sales"
            value={
              isLoading
                ? "Loading..."
                : formatCurrency(stats?.totalSales || 0)
            }
            icon={<DollarSign size={20} color="#ec4899" />}
          />
          <StatCard
            title="Total Bookings"
            value={isLoading ? "Loading..." : String(stats?.totalBookings || 0)}
            icon={<Calendar size={20} color="#ec4899" />}
          />
          <StatCard
            title="New Clients"
            value={isLoading ? "Loading..." : String(stats?.newCustomers || 0)}
            icon={<Users size={20} color="#ec4899" />}
          />
          <StatCard
            title="Avg Booking"
            value={
              isLoading
                ? "Loading..."
                : formatCurrency(stats?.averageBookingValue || 0)
            }
            icon={<TrendingUp size={20} color="#ec4899" />}
          />
        </View>
      </View>

      {/* Sales Chart */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Sales Trend</Text>
        {isLoading ? (
          <View style={styles.chartLoadingContainer}>
            <ActivityIndicator size="large" color="#ec4899" />
          </View>
        ) : salesError ? (
          <View style={styles.chartErrorContainer}>
            <Text style={styles.errorText}>
              Error loading chart data. Please try again.
            </Text>
          </View>
        ) : (
          <SalesChart
            data={salesData?.data || []}
            timeSpan={timeSpan}
          />
        )}
      </View>

      {/* Appointment Statistics */}
      <View style={styles.appointmentsSection}>
        <Text style={styles.sectionTitle}>Appointment Statistics</Text>
        {isLoading ? (
          <View style={styles.appointmentsLoadingContainer}>
            <ActivityIndicator size="large" color="#ec4899" />
          </View>
        ) : appointmentError ? (
          <View style={styles.appointmentsErrorContainer}>
            <Text style={styles.errorText}>
              Error loading appointment data. Please try again.
            </Text>
          </View>
        ) : appointments ? (
          <View style={styles.appointmentsGrid}>
            <View style={styles.appointmentStatCard}>
              <View style={styles.appointmentStatHeader}>
                <CheckCircle size={24} color="#22c55e" />
                <Text style={styles.appointmentStatValue}>
                  {appointments.completed}
                </Text>
              </View>
              <Text style={styles.appointmentStatLabel}>Completed</Text>
            </View>
            <View style={styles.appointmentStatCard}>
              <View style={styles.appointmentStatHeader}>
                <Clock size={24} color="#f59e0b" />
                <Text style={styles.appointmentStatValue}>
                  {appointments.pending}
                </Text>
              </View>
              <Text style={styles.appointmentStatLabel}>Pending</Text>
            </View>
            <View style={styles.appointmentStatCard}>
              <View style={styles.appointmentStatHeader}>
                <XCircle size={24} color="#ef4444" />
                <Text style={styles.appointmentStatValue}>
                  {appointments.cancelled}
                </Text>
              </View>
              <Text style={styles.appointmentStatLabel}>Cancelled</Text>
            </View>
            <View style={styles.appointmentStatCard}>
              <View style={styles.appointmentStatHeader}>
                <Calendar size={24} color="#ec4899" />
                <Text style={styles.appointmentStatValue}>
                  {appointments.total}
                </Text>
              </View>
              <Text style={styles.appointmentStatLabel}>Total</Text>
            </View>
          </View>
        ) : null}
        </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  backgroundGradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 24,
  },
  restrictedText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  headerSection: {
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 24,
    borderRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#ec4899",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerGradient: {
    padding: 24,
    position: "relative",
    overflow: "hidden",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerTextContainer: {
    flex: 1,
  },
  greetingText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  welcomeText: {
    color: "white",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  decorativeCircle1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    top: -40,
    right: -40,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    bottom: -20,
    right: 40,
  },
  selectorContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  timeSpanContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 4,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  timeSpanButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  timeSpanButtonActive: {
    backgroundColor: "#fdf2f8",
  },
  timeSpanText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  timeSpanTextActive: {
    color: "#ec4899",
    fontWeight: "600",
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  statCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    flex: 1,
    minWidth: "45%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fdf2f8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statTitle: {
    color: "#6b7280",
    fontSize: 14,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  chartSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  chartLoadingContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 40,
    marginHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  chartErrorContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 40,
    marginHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    textAlign: "center",
  },
  appointmentsSection: {
    marginBottom: 24,
  },
  appointmentsLoadingContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 40,
    marginHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  appointmentsErrorContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 40,
    marginHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  appointmentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    paddingHorizontal: 24,
  },
  appointmentStatCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    flex: 1,
    minWidth: "45%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  appointmentStatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  appointmentStatValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  appointmentStatLabel: {
    color: "#6b7280",
    fontSize: 14,
  },
});
