import SalesChart from "@/components/sales/SalesChart";
import {
  getAppointmentStats,
  getSalesData,
  getSalesStats,
  getSalesSummary,
  type TimeSpan,
} from "@/lib/actions/salesActions";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatCurrency } from "@/lib/utils/currency";
import { scaleDimension, scaleFont } from "@/lib/utils/responsive";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Users,
  XCircle,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}

function StatCard({ title, value, icon, color = "#ec4899" }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View
          style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}
        >
          {icon}
        </View>
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text style={styles.statTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
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
    { label: "All", value: "all" },
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
  const { data: salesStats, isLoading: statsLoading } = useQuery({
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

  // Fetch sales summary (with/without deductions)
  const { data: salesSummaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["salesSummary", timeSpan],
    queryFn: () => getSalesSummary(timeSpan),
    enabled: isOwner,
  });

  const [showNetSales, setShowNetSales] = useState(false);
  const salesSummary = salesSummaryData?.data;

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
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBadge}>
                <BarChart3 size={20} color="#ec4899" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Analytics</Text>
                <Text style={styles.headerSubtitle}>Business Overview</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TimeSpanSelector selected={timeSpan} onSelect={setTimeSpan} />
            </View>
          </View>

          {/* Hero Sales Card */}
          {salesSummary && (
            <View style={styles.heroCardContainer}>
              <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <View>
                    <Text style={styles.heroLabel}>
                      {showNetSales ? "Net Sales" : "Gross Revenue"}
                    </Text>
                    <Text style={styles.heroAmount}>
                      {formatCurrency(
                        showNetSales
                          ? salesSummary.netSales
                          : salesSummary.totalSales
                      )}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setShowNetSales(!showNetSales)}
                    style={styles.togglePill}
                  >
                    <Text style={styles.togglePillText}>
                      {showNetSales ? "View Gross" : "View Net"}
                    </Text>
                  </Pressable>
                </View>

                {/* Divider */}
                <View style={styles.heroDivider} />

                {/* Breakdown */}
                <View style={styles.heroBreakdown}>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>Gross</Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(salesSummary.totalSales)}
                    </Text>
                  </View>
                  {salesSummary.totalSalesDeductions > 0 && (
                    <>
                      <View style={styles.verticalDivider} />
                      <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>Deductions</Text>
                        <Text
                          style={[styles.breakdownValue, styles.textDanger]}
                        >
                          -{formatCurrency(salesSummary.totalSalesDeductions)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Quick Stats Grid */}
          <View style={styles.sectionContainer}>
            <View style={styles.gridContainer}>
              <StatCard
                title="Total Bookings"
                value={isLoading ? "-" : String(stats?.totalBookings || 0)}
                icon={<Calendar size={18} color="#ec4899" />}
                color="#ec4899"
              />
              <StatCard
                title="New Clients"
                value={isLoading ? "-" : String(stats?.newCustomers || 0)}
                icon={<Users size={18} color="#8b5cf6" />}
                color="#8b5cf6"
              />
              <StatCard
                title="Avg Value"
                value={
                  isLoading
                    ? "-"
                    : formatCurrency(stats?.averageBookingValue || 0)
                }
                icon={<Coins size={18} color="#10b981" />}
                color="#10b981"
              />
              <StatCard
                title="Completion"
                value={
                  isLoading || !appointments
                    ? "-"
                    : `${Math.round(
                        (appointments.completed / (appointments.total || 1)) *
                          100
                      )}%`
                }
                icon={<CheckCircle2 size={18} color="#f59e0b" />}
                color="#f59e0b"
              />
            </View>
          </View>

          {/* Sales Chart */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Sales Trend</Text>
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#ec4899" />
              </View>
            ) : salesError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>Could not load chart data</Text>
              </View>
            ) : (
              <SalesChart data={salesData?.data || []} timeSpan={timeSpan} />
            )}
          </View>

          {/* Appointment Status Cards */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Appointment Status</Text>
            {appointments && (
              <View style={styles.appointmentGrid}>
                {/* Completed */}
                <View style={[styles.statusCard, styles.statusCardGreen]}>
                  <View style={styles.statusHeader}>
                    <Text style={[styles.statusValue, styles.textGreen]}>
                      {appointments.completed}
                    </Text>
                    <CheckCircle2 size={16} color="#15803d" />
                  </View>
                  <Text style={styles.statusLabel}>Completed</Text>
                </View>

                {/* Pending */}
                <View style={[styles.statusCard, styles.statusCardOrange]}>
                  <View style={styles.statusHeader}>
                    <Text style={[styles.statusValue, styles.textOrange]}>
                      {appointments.pending}
                    </Text>
                    <Clock size={16} color="#c2410c" />
                  </View>
                  <Text style={styles.statusLabel}>Pending</Text>
                </View>

                {/* Cancelled */}
                <View style={[styles.statusCard, styles.statusCardRed]}>
                  <View style={styles.statusHeader}>
                    <Text style={[styles.statusValue, styles.textRed]}>
                      {appointments.cancelled}
                    </Text>
                    <XCircle size={16} color="#b91c1c" />
                  </View>
                  <Text style={styles.statusLabel}>Cancelled</Text>
                </View>

                {/* Total */}
                <View style={[styles.statusCard, styles.statusCardBlue]}>
                  <View style={styles.statusHeader}>
                    <Text style={[styles.statusValue, styles.textBlue]}>
                      {appointments.total}
                    </Text>
                    <CreditCard size={16} color="#1d4ed8" />
                  </View>
                  <Text style={styles.statusLabel}>Total</Text>
                </View>
              </View>
            )}
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
    paddingBottom: scaleDimension(100),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  restrictedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: scaleDimension(24),
  },
  restrictedText: {
    fontSize: scaleFont(16),
    color: "#6b7280",
    textAlign: "center",
  },

  // Header
  headerContainer: {
    paddingHorizontal: scaleDimension(24),
    paddingTop: scaleDimension(24),
    paddingBottom: scaleDimension(16),
    flexDirection: "row", // Changed to row for side-by-side title and tabs if space allows, or column
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: scaleDimension(16),
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(12),
  },
  iconBadge: {
    width: scaleDimension(40),
    height: scaleDimension(40),
    borderRadius: scaleDimension(12),
    backgroundColor: "#fdf2f8",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: scaleFont(20),
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: scaleFont(12),
    color: "#6b7280",
    fontWeight: "500",
  },
  headerRight: {
    // If needed to push tabs to the right
  },

  // Time Span Selector
  timeSpanContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(4),
    gap: scaleDimension(2),
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  timeSpanButton: {
    paddingVertical: scaleDimension(6),
    paddingHorizontal: scaleDimension(12),
    borderRadius: scaleDimension(8),
  },
  timeSpanButtonActive: {
    backgroundColor: "#ec4899",
  },
  timeSpanText: {
    fontSize: scaleFont(12),
    color: "#6b7280",
    fontWeight: "600",
  },
  timeSpanTextActive: {
    color: "white",
  },

  // Hero Card
  heroCardContainer: {
    paddingHorizontal: scaleDimension(24),
    marginBottom: scaleDimension(24),
  },
  heroCard: {
    backgroundColor: "white",
    borderRadius: scaleDimension(24),
    padding: scaleDimension(20),
    ...Platform.select({
      ios: {
        shadowColor: "#ec4899",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: scaleDimension(16),
  },
  heroLabel: {
    fontSize: scaleFont(14),
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: scaleDimension(4),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroAmount: {
    fontSize: scaleFont(32),
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -1,
  },
  togglePill: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(6),
    borderRadius: scaleDimension(20),
  },
  togglePillText: {
    fontSize: scaleFont(12),
    fontWeight: "600",
    color: "#4b5563",
  },
  heroDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginBottom: scaleDimension(16),
  },
  heroBreakdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(16),
  },
  verticalDivider: {
    width: 1,
    height: scaleDimension(24),
    backgroundColor: "#e5e7eb",
  },
  breakdownItem: {
    gap: scaleDimension(2),
  },
  breakdownLabel: {
    fontSize: scaleFont(11),
    color: "#9ca3af",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  breakdownValue: {
    fontSize: scaleFont(14),
    fontWeight: "700",
    color: "#374151",
  },
  textDanger: {
    color: "#ef4444",
  },

  // Grid Layouts
  sectionContainer: {
    paddingHorizontal: scaleDimension(24),
    marginBottom: scaleDimension(24),
  },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: "700",
    color: "#111827",
    marginBottom: scaleDimension(12),
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleDimension(12),
  },

  // Stat Card
  statCard: {
    flex: 1,
    minWidth: "45%", // 2 columns
    backgroundColor: "white",
    borderRadius: scaleDimension(16),
    padding: scaleDimension(16),
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statHeader: {
    marginBottom: scaleDimension(12),
  },
  statIconContainer: {
    alignSelf: "flex-start",
    padding: scaleDimension(8),
    borderRadius: scaleDimension(10),
  },
  statContent: {
    gap: scaleDimension(4),
  },
  statValue: {
    fontSize: scaleFont(18),
    fontWeight: "700",
    color: "#111827",
  },
  statTitle: {
    fontSize: scaleFont(12),
    color: "#6b7280",
    fontWeight: "500",
  },

  // Loading/Error
  loadingBox: {
    height: scaleDimension(200),
    backgroundColor: "white",
    borderRadius: scaleDimension(16),
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    height: scaleDimension(200),
    backgroundColor: "#fef2f2",
    borderRadius: scaleDimension(16),
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#ef4444",
    fontWeight: "600",
  },

  // Appointment Status Grid
  appointmentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleDimension(12),
  },
  statusCard: {
    flex: 1,
    minWidth: "45%",
    padding: scaleDimension(14),
    borderRadius: scaleDimension(16),
    borderWidth: 1,
  },
  statusCardGreen: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  statusCardOrange: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
  },
  statusCardRed: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  statusCardBlue: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleDimension(4),
  },
  statusValue: {
    fontSize: scaleFont(20),
    fontWeight: "800",
  },
  statusLabel: {
    fontSize: scaleFont(12),
    fontWeight: "600",
    color: "#6b7280",
  },
  textGreen: { color: "#166534" },
  textOrange: { color: "#9a3412" },
  textRed: { color: "#991b1b" },
  textBlue: { color: "#1e40af" },
});
