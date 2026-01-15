import ManualDeductionFormModal from "@/components/manage/ManualDeductionFormModal";
import { queryClient } from "@/components/Providers/TanstackProvider";
import SalesChart from "@/components/sales/SalesChart";
import { useToast } from "@/components/ui/toast";
import {
  deleteManualDeduction,
  getManualDeductions,
} from "@/lib/actions/manualDeductionActions";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  XCircle,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// --- Components ---

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

// --- Main Screen ---

export default function SalesScreen() {
  const { hasRole, loading: authLoading, employee } = useAuth();
  const isOwner = hasRole("owner");
  const [timeSpan, setTimeSpan] = useState<TimeSpan>("month");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<any>(null);
  const toast = useToast();

  // Get owner's branch for filtering
  const ownerBranch = employee?.branch || null;

  // Queries
  const {
    data: salesData,
    isLoading: salesLoading,
    refetch: refetchSalesData,
  } = useQuery({
    queryKey: ["salesData", timeSpan, ownerBranch],
    queryFn: () => getSalesData(timeSpan, ownerBranch),
    enabled: isOwner,
  });

  const {
    data: salesStats,
    isLoading: statsLoading,
    refetch: refetchSalesStats,
  } = useQuery({
    queryKey: ["salesStats", timeSpan, ownerBranch],
    queryFn: () => getSalesStats(timeSpan, ownerBranch),
    enabled: isOwner,
  });

  const {
    data: appointmentStats,
    isLoading: appointmentLoading,
    refetch: refetchAppointmentStats,
  } = useQuery({
    queryKey: ["appointmentStats", timeSpan, ownerBranch],
    queryFn: () => getAppointmentStats(timeSpan, ownerBranch),
    enabled: isOwner,
  });

  const {
    data: salesSummaryData,
    isLoading: summaryLoading,
    refetch: refetchSalesSummary,
  } = useQuery({
    queryKey: ["salesSummary", timeSpan, ownerBranch],
    queryFn: () => getSalesSummary(timeSpan, ownerBranch),
    enabled: isOwner,
  });

  // Get manual deductions
  const startDate = (() => {
    const now = new Date();
    switch (timeSpan) {
      case "day":
        return new Date(now.setHours(0, 0, 0, 0));
      case "week":
        return new Date(now.setDate(now.getDate() - 7));
      case "month":
        return new Date(now.setMonth(now.getMonth() - 1));
      default:
        return undefined;
    }
  })();

  const {
    data: manualDeductionsData,
    isLoading: deductionsLoading,
    refetch: refetchDeductions,
  } = useQuery({
    queryKey: ["manualDeductions", timeSpan, ownerBranch],
    queryFn: () => getManualDeductions(startDate, undefined, ownerBranch),
    enabled: isOwner,
  });

  const deleteDeductionMutation = useMutation({
    mutationFn: deleteManualDeduction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manualDeductions"] });
      queryClient.invalidateQueries({ queryKey: ["salesSummary"] });
      toast.success("Success", "Deduction deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Error", error.message || "Failed to delete deduction");
    },
  });

  const handleDeleteDeduction = (id: string) => {
    Alert.alert(
      "Delete Deduction",
      "Are you sure you want to delete this deduction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteDeductionMutation.mutate(id),
        },
      ]
    );
  };

  const [showNetSales, setShowNetSales] = useState(false);
  const salesSummary = salesSummaryData?.data;
  const isLoading =
    salesLoading || statsLoading || appointmentLoading || summaryLoading;
  const stats = salesStats?.data;
  const appointments = appointmentStats?.data;

  const handleRefetch = async () => {
    if (!isOwner) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchSalesData(),
        refetchSalesStats(),
        refetchAppointmentStats(),
        refetchSalesSummary(),
        refetchDeductions(),
      ]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  if (authLoading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#ec4899" />
      </View>
    );
  if (!isOwner)
    return (
      <View style={styles.loadingContainer}>
        <Text>Access Restricted</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#fefce8", "#fce7f3", "#f8fafc"]} // Softer, premium gradient
        locations={[0, 0.4, 1]}
        style={styles.backgroundGradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <View>
              <Text style={styles.headerTitle}>Dashboard</Text>
              <Text style={styles.headerSubtitle}>Overview & Analytics</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.refreshButtonShadowWrapper}>
                <Pressable
                  onPress={handleRefetch}
                  disabled={isRefreshing || !isOwner}
                  style={({ pressed }) => [
                    styles.refreshButton,
                    (pressed || isRefreshing || !isOwner) &&
                      styles.refreshButtonPressed,
                  ]}
                >
                  <LinearGradient
                    colors={[
                      "rgba(236, 72, 153, 0.2)",
                      "rgba(236, 72, 153, 0.1)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.refreshButtonGradient}
                  >
                    {isRefreshing ? (
                      <ActivityIndicator size="small" color="#ec4899" />
                    ) : (
                      <RefreshCw size={18} color="#ec4899" />
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
              <View style={styles.headerSpacer} />
              <TimeSpanSelector selected={timeSpan} onSelect={setTimeSpan} />
            </View>
          </View>

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
            </View>
          </View>

          {/* Sales Chart Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Sales Trend</Text>
            </View>

            {isLoading ? (
              <View
                style={[styles.loadingBox, { height: scaleDimension(240) }]}
              >
                <ActivityIndicator color="#ec4899" />
              </View>
            ) : (
              // The component is now designed to fill this container width
              <SalesChart
                data={salesData?.data || []}
                dataByBranch={salesData?.dataByBranch}
                timeSpan={timeSpan}
                ownerBranch={ownerBranch}
              />
            )}
          </View>

          {/* Appointment Status */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Appointment Status</Text>
            {appointments && (
              <View style={styles.appointmentGrid}>
                <View style={[styles.statusCard, styles.statusCardGreen]}>
                  <View style={styles.statusHeader}>
                    <Text style={[styles.statusValue, styles.textGreen]}>
                      {appointments.completed}
                    </Text>
                    <CheckCircle2 size={16} color="#15803d" />
                  </View>
                  <Text style={styles.statusLabel}>Completed</Text>
                </View>

                <View style={[styles.statusCard, styles.statusCardOrange]}>
                  <View style={styles.statusHeader}>
                    <Text style={[styles.statusValue, styles.textOrange]}>
                      {appointments.pending}
                    </Text>
                    <Clock size={16} color="#c2410c" />
                  </View>
                  <Text style={styles.statusLabel}>Pending</Text>
                </View>

                <View style={[styles.statusCard, styles.statusCardRed]}>
                  <View style={styles.statusHeader}>
                    <Text style={[styles.statusValue, styles.textRed]}>
                      {appointments.cancelled}
                    </Text>
                    <XCircle size={16} color="#b91c1c" />
                  </View>
                  <Text style={styles.statusLabel}>Cancelled</Text>
                </View>

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

          {/* Summary Card */}
          {salesSummary && (
            <View style={styles.sectionContainer}>
              <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <View>
                    <Text style={styles.heroLabel}>
                      {showNetSales ? "Net Income" : "Gross Revenue"}
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
                      {showNetSales ? "Show Gross" : "Show Net"}
                    </Text>
                  </Pressable>
                </View>
                {(salesSummary.totalSalesDeductions > 0 ||
                  salesSummary.totalManualDeductions > 0) && (
                  <View style={styles.deductionsContainer}>
                    {salesSummary.totalSalesDeductions > 0 && (
                      <View style={styles.deductionRow}>
                        <Text style={styles.deductionLabel}>
                          Payslip Deductions:
                        </Text>
                        <Text style={styles.deductionText}>
                          {formatCurrency(salesSummary.totalSalesDeductions)}
                        </Text>
                      </View>
                    )}
                    {salesSummary.totalManualDeductions > 0 && (
                      <View style={styles.deductionRow}>
                        <Text style={styles.deductionLabel}>
                          Manual Deductions:
                        </Text>
                        <Text style={styles.deductionText}>
                          {formatCurrency(salesSummary.totalManualDeductions)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Manual Deductions Section */}
          {isOwner && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Manual Deductions</Text>
                <Pressable
                  onPress={() => {
                    setEditingDeduction(null);
                    setShowDeductionModal(true);
                  }}
                  style={styles.addButton}
                >
                  <Plus size={18} color="#ec4899" />
                  <Text style={styles.addButtonText}>Add</Text>
                </Pressable>
              </View>
              {deductionsLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color="#ec4899" />
                </View>
              ) : manualDeductionsData?.data &&
                manualDeductionsData.data.length > 0 ? (
                <View style={styles.deductionsList}>
                  {manualDeductionsData.data.map((deduction: any) => (
                    <View key={deduction.id} style={styles.deductionItem}>
                      <View style={styles.deductionItemContent}>
                        <View style={styles.deductionItemHeader}>
                          <Text style={styles.deductionItemDescription}>
                            {deduction.description}
                          </Text>
                          <Text style={styles.deductionItemAmount}>
                            {formatCurrency(deduction.amount)}
                          </Text>
                        </View>
                        <View style={styles.deductionItemMeta}>
                          <Text style={styles.deductionItemBranch}>
                            {deduction.branch}
                          </Text>
                          <Text style={styles.deductionItemDate}>
                            {new Date(
                              deduction.deduction_date
                            ).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.deductionItemActions}>
                        <Pressable
                          onPress={() => {
                            setEditingDeduction(deduction);
                            setShowDeductionModal(true);
                          }}
                          style={styles.editButton}
                        >
                          <Text style={styles.editButtonText}>Edit</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteDeduction(deduction.id)}
                          style={styles.deleteButton}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyDeductions}>
                  <Text style={styles.emptyDeductionsText}>
                    No manual deductions for this period
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Manual Deduction Form Modal */}
          <ManualDeductionFormModal
            visible={showDeductionModal}
            onClose={() => {
              setShowDeductionModal(false);
              setEditingDeduction(null);
            }}
            existingDeduction={editingDeduction}
            defaultBranch={ownerBranch}
          />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  backgroundGradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scaleDimension(120),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  headerContainer: {
    paddingHorizontal: scaleDimension(24),
    paddingTop: scaleDimension(20), // Reduced top padding
    paddingBottom: scaleDimension(24),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
  },
  headerSpacer: {
    width: scaleDimension(8),
  },
  refreshButtonShadowWrapper: {
    width: scaleDimension(40),
    height: scaleDimension(40),
    borderRadius: scaleDimension(20),
    backgroundColor: "white", // Assuming white background or transparent if needed but elevation needs solid bg usually
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  refreshButton: {
    width: "100%",
    height: "100%",
    borderRadius: scaleDimension(20),
    overflow: "hidden",
  },
  refreshButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  refreshButtonGradient: {
    width: scaleDimension(40),
    height: scaleDimension(40),
    borderRadius: scaleDimension(20),
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: scaleFont(24),
    fontWeight: "800",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: scaleFont(13),
    color: "#6b7280",
    marginTop: 2,
  },

  // Time Selector
  timeSpanContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: scaleDimension(10),
    padding: scaleDimension(3),
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
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

  // Section Layouts
  sectionContainer: {
    paddingHorizontal: scaleDimension(24), // Consistent padding
    marginBottom: scaleDimension(24),
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleDimension(12),
  },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: scaleDimension(12),
  },

  // Grid
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleDimension(12),
  },
  statCard: {
    width: "48%", // Ensure 2 columns fit perfectly with gap
    backgroundColor: "white",
    borderRadius: scaleDimension(20),
    padding: scaleDimension(16),
    ...Platform.select({
      ios: {
        shadowColor: "#ec4899",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 2 },
    }),
  },
  statHeader: {
    marginBottom: scaleDimension(12),
  },
  statIconContainer: {
    alignSelf: "flex-start",
    padding: scaleDimension(10),
    borderRadius: scaleDimension(14),
  },
  statContent: {
    gap: scaleDimension(2),
  },
  statValue: {
    fontSize: scaleFont(20),
    fontWeight: "800",
    color: "#111827",
  },
  statTitle: {
    fontSize: scaleFont(12),
    color: "#6b7280",
    fontWeight: "600",
  },

  // Status Cards
  appointmentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleDimension(12),
  },
  statusCard: {
    width: "48%",
    padding: scaleDimension(16),
    borderRadius: scaleDimension(20),
    borderWidth: 1,
  },
  statusCardGreen: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" },
  statusCardOrange: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  statusCardRed: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  statusCardBlue: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },

  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleDimension(6),
  },
  statusValue: {
    fontSize: scaleFont(22),
    fontWeight: "800",
  },
  statusLabel: {
    fontSize: scaleFont(12),
    fontWeight: "600",
    color: "#6b7280",
  },
  textGreen: { color: "#166534" },
  textOrange: { color: "#c2410c" },
  textRed: { color: "#991b1b" },
  textBlue: { color: "#1e40af" },

  // Hero/Summary Card
  heroCard: {
    backgroundColor: "white",
    borderRadius: scaleDimension(20),
    padding: scaleDimension(20),
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLabel: {
    fontSize: scaleFont(12),
    color: "#6b7280",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  heroAmount: {
    fontSize: scaleFont(24),
    fontWeight: "800",
    color: "#111827",
  },
  togglePill: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  togglePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
  },
  deductionsContainer: {
    marginTop: 12,
    gap: 6,
  },
  deductionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deductionLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  deductionText: {
    fontSize: 12,
    color: "#ef4444",
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(6),
    backgroundColor: "#fdf2f8",
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(6),
    borderRadius: scaleDimension(8),
    borderWidth: 1,
    borderColor: "#fce7f3",
  },
  addButtonText: {
    fontSize: scaleFont(12),
    fontWeight: "600",
    color: "#ec4899",
  },
  deductionsList: {
    gap: scaleDimension(12),
  },
  deductionItem: {
    backgroundColor: "white",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(16),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  deductionItemContent: {
    flex: 1,
    gap: scaleDimension(4),
  },
  deductionItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deductionItemDescription: {
    fontSize: scaleFont(15),
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  deductionItemAmount: {
    fontSize: scaleFont(16),
    fontWeight: "700",
    color: "#ef4444",
  },
  deductionItemMeta: {
    flexDirection: "row",
    gap: scaleDimension(12),
    alignItems: "center",
  },
  deductionItemBranch: {
    fontSize: scaleFont(12),
    color: "#6b7280",
    fontWeight: "500",
  },
  deductionItemDate: {
    fontSize: scaleFont(12),
    color: "#9ca3af",
  },
  deductionItemActions: {
    flexDirection: "row",
    gap: scaleDimension(8),
    alignItems: "center",
    marginLeft: scaleDimension(12),
  },
  editButton: {
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(6),
    backgroundColor: "#f3f4f6",
    borderRadius: scaleDimension(6),
  },
  editButtonText: {
    fontSize: scaleFont(12),
    fontWeight: "600",
    color: "#4b5563",
  },
  deleteButton: {
    padding: scaleDimension(6),
  },
  emptyDeductions: {
    backgroundColor: "#f9fafb",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(24),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  emptyDeductionsText: {
    fontSize: scaleFont(14),
    color: "#6b7280",
  },
  loadingBox: {
    backgroundColor: "white",
    borderRadius: scaleDimension(20),
    alignItems: "center",
    justifyContent: "center",
  },
});
