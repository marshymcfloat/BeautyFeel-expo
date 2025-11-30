import { ResponsiveText } from "@/components/ui/ResponsiveText";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/toast";
import {
  getAllEmployees,
  type EmployeeWithRole,
} from "@/lib/actions/employeeActions";
import { formatCurrency } from "@/lib/utils/currency";
import { getRoleDisplayName } from "@/lib/utils/role";
import {
  scaleDimension,
  getContainerPadding,
  PLATFORM,
} from "@/lib/utils/responsive";
import { useQuery } from "@tanstack/react-query";
import { Edit, MoreVertical, Plus, Users } from "lucide-react-native";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import EmployeeFormModal from "./EmployeeFormModal";

export default function ManageEmployees() {
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeWithRole | null>(null);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(
    null
  );
  const toast = useToast();

  // Fetch all employees
  const {
    data: employeesData,
    isLoading: employeesLoading,
    error: employeesError,
    refetch: refetchEmployees,
  } = useQuery({
    queryKey: ["all-employees"],
    queryFn: getAllEmployees,
  });

  const employees = employeesData?.success ? employeesData.data || [] : [];

  const handleCreateEmployee = () => {
    setSelectedEmployee(null);
    setShowEmployeeModal(true);
  };

  const handleEditEmployee = (employee: EmployeeWithRole) => {
    setSelectedEmployee(employee);
    setShowEmployeeModal(true);
    setExpandedEmployeeId(null);
  };

  const toggleEmployeeActions = (employeeId: string) => {
    setExpandedEmployeeId(
      expandedEmployeeId === employeeId ? null : employeeId
    );
  };

  const isLoading = employeesLoading;
  const containerPadding = getContainerPadding();
  const iconSize = scaleDimension(20);
  const smallIconSize = scaleDimension(18);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <LoadingState variant="list" count={5} />
      </View>
    );
  }

  if (employeesError) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <ErrorState
          message={
            employeesError instanceof Error
              ? employeesError.message
              : "Failed to load employees"
          }
          title="Error Loading Employees"
        />
        <Pressable
          style={styles.retryButton}
          onPress={() => refetchEmployees()}
        >
          <ResponsiveText variant="md" style={styles.retryButtonText} numberOfLines={1}>
            Retry
          </ResponsiveText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <ResponsiveText variant="2xl" style={styles.headerTitle} numberOfLines={1}>
            Employees
          </ResponsiveText>
          <ResponsiveText variant="sm" style={styles.headerSubtitle} numberOfLines={1}>
            {employees.length} total employee
            {employees.length !== 1 ? "s" : ""}
          </ResponsiveText>
        </View>
        <Pressable onPress={handleCreateEmployee} style={styles.addButton}>
          <Plus size={iconSize} color="white" />
          <ResponsiveText variant="sm" style={styles.addButtonText} numberOfLines={1}>
            Add Employee
          </ResponsiveText>
        </Pressable>
      </View>

      {employees.length === 0 ? (
        <EmptyState
          icon={<Users size={48} color="#9ca3af" />}
          title="No employees found"
          message="Create your first employee to get started."
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {employees.map((employee) => (
            <View key={employee.id} style={styles.employeeCard}>
              <View style={styles.employeeContent}>
                <View style={styles.employeeHeader}>
                  <ResponsiveText variant="lg" style={styles.employeeName} numberOfLines={2}>
                    {employee.name || "Unnamed Employee"}
                  </ResponsiveText>
                  <View style={styles.roleBadge}>
                    <ResponsiveText variant="xs" style={styles.roleBadgeText} numberOfLines={1}>
                      {getRoleDisplayName(employee.role)}
                    </ResponsiveText>
                  </View>
                </View>
                <View style={styles.employeeDetails}>
                  <View style={styles.detailRow}>
                    <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                      Base Salary:
                    </ResponsiveText>
                    <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                      {formatCurrency(employee.salary || 0)}
                    </ResponsiveText>
                  </View>
                  <View style={styles.detailRow}>
                    <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                      Commission Rate:
                    </ResponsiveText>
                    <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                      {employee.commission_rate || 0}%
                    </ResponsiveText>
                  </View>
                  {employee.daily_rate !== undefined &&
                    employee.daily_rate > 0 && (
                      <View style={styles.detailRow}>
                        <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                          Daily Rate:
                        </ResponsiveText>
                        <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                          {formatCurrency(employee.daily_rate)}
                        </ResponsiveText>
                      </View>
                    )}
                  <View style={styles.detailRow}>
                    <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                      Can Request Payslip:
                    </ResponsiveText>
                    <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                      {employee.can_request_payslip ? "Yes" : "No"}
                    </ResponsiveText>
                  </View>
                </View>
              </View>
              <View style={styles.actionsContainer}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => toggleEmployeeActions(employee.id)}
                >
                  <MoreVertical size={iconSize} color="#6b7280" />
                </Pressable>
                {expandedEmployeeId === employee.id && (
                  <View style={styles.actionsMenu}>
                    <Pressable
                      style={styles.actionMenuItem}
                      onPress={() => handleEditEmployee(employee)}
                    >
                      <Edit size={smallIconSize} color="#3b82f6" />
                      <ResponsiveText variant="sm" style={styles.actionMenuText} numberOfLines={1}>
                        Edit
                      </ResponsiveText>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modal */}
      <EmployeeFormModal
        visible={showEmployeeModal}
        onClose={() => {
          setShowEmployeeModal(false);
          setSelectedEmployee(null);
        }}
        existingEmployee={selectedEmployee}
        onSuccess={() => {
          setShowEmployeeModal(false);
          setSelectedEmployee(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: scaleDimension(20),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleDimension(20),
  },
  headerTextContainer: {
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  headerTitle: {
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: "#6b7280",
    marginTop: scaleDimension(4),
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ec4899",
    paddingHorizontal: scaleDimension(16),
    paddingVertical: scaleDimension(10),
    borderRadius: scaleDimension(12),
    gap: scaleDimension(8),
    ...PLATFORM.shadowLg,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scaleDimension(100),
  },
  employeeCard: {
    backgroundColor: "white",
    borderRadius: scaleDimension(16),
    padding: scaleDimension(16),
    marginBottom: scaleDimension(12),
    borderWidth: 1,
    borderColor: "#f3f4f6",
    flexDirection: "row",
    justifyContent: "space-between",
    ...PLATFORM.shadow,
  },
  employeeContent: {
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  employeeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
    marginBottom: scaleDimension(12),
    flexWrap: "wrap",
  },
  employeeName: {
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  roleBadge: {
    backgroundColor: "#fdf2f8",
    paddingHorizontal: scaleDimension(10),
    paddingVertical: scaleDimension(4),
    borderRadius: scaleDimension(6),
    borderWidth: 1,
    borderColor: "#fce7f3",
  },
  roleBadgeText: {
    color: "#ec4899",
    fontWeight: "600",
  },
  employeeDetails: {
    gap: scaleDimension(8),
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  detailLabel: {
    color: "#6b7280",
    fontWeight: "500",
  },
  detailValue: {
    color: "#111827",
    fontWeight: "600",
  },
  actionsContainer: {
    position: "relative",
    marginLeft: scaleDimension(12),
  },
  actionButton: {
    padding: scaleDimension(8),
  },
  actionsMenu: {
    position: "absolute",
    top: scaleDimension(40),
    right: 0,
    backgroundColor: "white",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(8),
    minWidth: scaleDimension(160),
    ...PLATFORM.shadowLg,
    zIndex: 1000,
  },
  actionMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(12),
    paddingVertical: scaleDimension(12),
    paddingHorizontal: scaleDimension(12),
  },
  actionMenuText: {
    color: "#374151",
    fontWeight: "500",
  },
  retryButton: {
    marginTop: scaleDimension(16),
    padding: scaleDimension(12),
    backgroundColor: "#ec4899",
    borderRadius: scaleDimension(8),
    alignItems: "center",
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
