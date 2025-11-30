import { getEmployeeSalaryBreakdown } from "@/lib/actions/employeeActions";
import { useAuth } from "@/lib/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils/currency";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import {
  Calendar,
  CheckCircle,
  DollarSign,
  X,
  XCircle,
} from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface SalaryBreakdownModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SalaryBreakdownModal({
  visible,
  onClose,
}: SalaryBreakdownModalProps) {
  const { employee } = useAuth();

  const {
    data: breakdownData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["salary-breakdown", employee?.id],
    queryFn: () => getEmployeeSalaryBreakdown(employee?.id || ""),
    enabled: visible && !!employee?.id,
  });

  // Refetch when modal becomes visible to get latest data
  React.useEffect(() => {
    if (visible) {
      refetch();
    }
  }, [visible, refetch]);

  const breakdown = breakdownData?.data;

  if (!visible) return null;

  const presentDays =
    breakdown?.attendanceRecords.filter((a) => a.isPresent).length || 0;
  const absentDays =
    breakdown?.attendanceRecords.filter((a) => !a.isPresent).length || 0;
  const totalDays = breakdown?.attendanceRecords.length || 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Salary Breakdown</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6b7280" />
            </Pressable>
          </View>

          {isLoading ? (
            <LoadingState message="Loading salary breakdown..." />
          ) : !breakdown ? (
            <ErrorState message="Unable to load salary breakdown" />
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Salary Summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Current Salary</Text>
                <Text style={styles.summaryAmount}>
                  {formatCurrency(breakdown.currentSalary)}
                </Text>
                <View style={styles.summaryBreakdown}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>From Commissions:</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(breakdown.totalCommission)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>From Daily Rate:</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(breakdown.totalDailyRate)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Attendance Summary */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Calendar size={20} color="#111827" />
                  <Text style={styles.sectionTitle}>Attendance Summary</Text>
                </View>
                <View style={styles.attendanceStats}>
                  <View style={styles.statItem}>
                    <CheckCircle size={20} color="#16a34a" />
                    <Text style={styles.statValue}>{presentDays}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                  </View>
                  <View style={styles.statItem}>
                    <XCircle size={20} color="#dc2626" />
                    <Text style={styles.statValue}>{absentDays}</Text>
                    <Text style={styles.statLabel}>Absent</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Calendar size={20} color="#6b7280" />
                    <Text style={styles.statValue}>{totalDays}</Text>
                    <Text style={styles.statLabel}>Total Days</Text>
                  </View>
                </View>
              </View>

              {/* Services Served */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <DollarSign size={20} color="#111827" />
                  <Text style={styles.sectionTitle}>
                    Services Served ({breakdown.servicesServed.length})
                  </Text>
                </View>
                {breakdown.servicesServed.length === 0 ? (
                  <Text style={styles.emptyText}>No services served yet</Text>
                ) : (
                  breakdown.servicesServed.map((service) => (
                    <View key={service.id} style={styles.serviceItem}>
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceName}>
                          {service.serviceName}
                        </Text>
                        <Text style={styles.serviceDate}>
                          {new Date(service.servedAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </Text>
                      </View>
                      <View style={styles.serviceAmounts}>
                        <Text style={styles.servicePrice}>
                          {formatCurrency(service.price)}
                        </Text>
                        {service.commissionAmount > 0 && (
                          <Text style={styles.commissionAmount}>
                            +{formatCurrency(service.commissionAmount)} commission
                          </Text>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Attendance History */}
              {breakdown.attendanceRecords.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Calendar size={20} color="#111827" />
                    <Text style={styles.sectionTitle}>Recent Attendance</Text>
                  </View>
                  {breakdown.attendanceRecords
                    .slice(0, 10)
                    .map((record, index) => (
                      <View key={index} style={styles.attendanceItem}>
                        <View style={styles.attendanceDate}>
                          <Text style={styles.attendanceDateText}>
                            {new Date(record.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </Text>
                        </View>
                        <View style={styles.attendanceStatus}>
                          {record.isPresent ? (
                            <>
                              <CheckCircle size={16} color="#16a34a" />
                              <Text style={styles.attendanceStatusTextPresent}>
                                Present
                              </Text>
                              {record.dailyRateApplied > 0 && (
                                <Text style={styles.attendanceAmount}>
                                  +{formatCurrency(record.dailyRateApplied)}
                                </Text>
                              )}
                            </>
                          ) : (
                            <>
                              <XCircle size={16} color="#dc2626" />
                              <Text style={styles.attendanceStatusTextAbsent}>
                                Absent
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                    ))}
                  {breakdown.attendanceRecords.length > 10 && (
                    <Text style={styles.moreText}>
                      +{breakdown.attendanceRecords.length - 10} more days
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    minHeight: "50%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  errorContainer: {
    padding: 40,
    alignItems: "center",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
  },
  summaryBreakdown: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  attendanceStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  serviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  serviceDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  serviceAmounts: {
    alignItems: "flex-end",
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  commissionAmount: {
    fontSize: 12,
    color: "#16a34a",
  },
  attendanceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  attendanceDate: {
    flex: 1,
  },
  attendanceDateText: {
    fontSize: 14,
    color: "#111827",
  },
  attendanceStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  attendanceStatusTextPresent: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "500",
  },
  attendanceStatusTextAbsent: {
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "500",
  },
  attendanceAmount: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "600",
  },
  emptyText: {
    color: "#6b7280",
    fontStyle: "italic",
    textAlign: "center",
    padding: 20,
  },
  moreText: {
    color: "#6b7280",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});
