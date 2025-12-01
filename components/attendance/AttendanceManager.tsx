import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ResponsiveText } from "@/components/ui/ResponsiveText";
import {
  getAllEmployeesForAttendance,
  markAttendanceAction,
} from "@/lib/actions/attendanceActions";
import { formatCurrency } from "@/lib/utils/currency";
import {
  getContainerPadding,
  PLATFORM,
  scaleDimension,
} from "@/lib/utils/responsive";
import { getRoleName } from "@/lib/utils/role";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { queryClient } from "../Providers/TanstackProvider";
import { useToast } from "../ui/toast";

interface EmployeeAttendanceItemProps {
  employee: {
    id: string;
    user_id: string;
    name: string | null;
    salary: number;
    daily_rate: number;
    role: "OWNER" | "CASHIER" | "WORKER" | "MASSEUSE";
    attendance?: {
      id: string;
      is_present: boolean;
      daily_rate_applied: number;
    } | null;
  };
  onToggleAttendance: (employeeId: string, isPresent: boolean) => void;
  isLoading: boolean;
}

function EmployeeAttendanceItem({
  employee,
  onToggleAttendance,
  isLoading,
}: EmployeeAttendanceItemProps) {
  const isPresent = employee.attendance?.is_present ?? false;
  const roleDisplay = employee.role;
  const dailyRateDisplay =
    employee.daily_rate > 0 ? formatCurrency(employee.daily_rate) : "N/A";
  const iconSize = scaleDimension(18);

  const displayName =
    employee.name || `${getRoleName(employee.role)} ${employee.id.slice(0, 8)}`;

  return (
    <View style={styles.employeeCard}>
      <View style={styles.employeeInfo}>
        <View style={styles.employeeMain}>
          <ResponsiveText
            variant="lg"
            style={styles.employeeName}
            numberOfLines={1}
          >
            {displayName}
          </ResponsiveText>
          <ResponsiveText
            variant="xs"
            style={styles.employeeRole}
            numberOfLines={1}
          >
            {roleDisplay}
          </ResponsiveText>
          {employee.daily_rate > 0 && (
            <ResponsiveText
              variant="xs"
              style={styles.dailyRate}
              numberOfLines={1}
            >
              Daily Rate: {dailyRateDisplay}
            </ResponsiveText>
          )}
        </View>
        <View style={styles.employeeRight}>
          <Pressable
            onPress={() => onToggleAttendance(employee.id, !isPresent)}
            disabled={isLoading}
            style={[
              styles.toggleButton,
              isPresent
                ? styles.toggleButtonPresent
                : styles.toggleButtonAbsent,
              isLoading && styles.toggleButtonDisabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : isPresent ? (
              <>
                <CheckCircle2 size={iconSize} color="white" />
                <ResponsiveText
                  variant="sm"
                  style={styles.toggleButtonText}
                  numberOfLines={1}
                >
                  Present
                </ResponsiveText>
              </>
            ) : (
              <>
                <XCircle size={iconSize} color="white" />
                <ResponsiveText
                  variant="sm"
                  style={styles.toggleButtonText}
                  numberOfLines={1}
                >
                  Absent
                </ResponsiveText>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function AttendanceManager() {
  const toast = useToast();
  const today = new Date().toISOString().split("T")[0];

  const {
    data: employeesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["employees-attendance", today],
    queryFn: getAllEmployeesForAttendance,
    refetchInterval: 30000,
  });

  const markAttendanceMutation = useMutation({
    mutationFn: ({
      employeeId,
      isPresent,
    }: {
      employeeId: string;
      isPresent: boolean;
    }) => markAttendanceAction(employeeId, isPresent, today),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["employees-attendance"] });

        toast.success(
          "Attendance Updated",
          result.data?.salary_adjustment
            ? `Salary adjusted by ₱${result.data.salary_adjustment}`
            : "Attendance marked successfully"
        );
      } else {
        toast.error("Error", result.error || "Failed to update attendance");
      }
    },
    onError: (error: Error) => {
      toast.error("Error", error.message || "An unexpected error occurred");
    },
  });

  const handleToggleAttendance = (employeeId: string, isPresent: boolean) => {
    markAttendanceMutation.mutate({ employeeId, isPresent });
  };

  const containerPadding = getContainerPadding();
  const iconSize = scaleDimension(48);

  if (isLoading) {
    return (
      <View style={[styles.container, { marginHorizontal: containerPadding }]}>
        <View style={styles.sectionHeader}>
          <ResponsiveText
            variant="2xl"
            style={styles.sectionTitle}
            numberOfLines={1}
          >
            Employee Attendance
          </ResponsiveText>
        </View>
        <LoadingState variant="skeleton" />
      </View>
    );
  }

  if (error || !employeesData?.success || !employeesData.data) {
    return (
      <View style={[styles.container, { marginHorizontal: containerPadding }]}>
        <View style={styles.sectionHeader}>
          <ResponsiveText
            variant="2xl"
            style={styles.sectionTitle}
            numberOfLines={1}
          >
            Employee Attendance
          </ResponsiveText>
        </View>
        <ErrorState
          message={
            employeesData?.error ||
            (error as Error)?.message ||
            "Failed to load employees"
          }
        />
      </View>
    );
  }

  const employees = employeesData.data.filter((emp) => emp.role !== "OWNER");

  if (employees.length === 0) {
    return (
      <View style={[styles.container, { marginHorizontal: containerPadding }]}>
        <View style={styles.sectionHeader}>
          <ResponsiveText
            variant="2xl"
            style={styles.sectionTitle}
            numberOfLines={1}
          >
            Employee Attendance
          </ResponsiveText>
        </View>
        <EmptyState
          icon={<CheckCircle2 size={iconSize} color="#9ca3af" />}
          title="No Employees"
          message="No employees found for attendance tracking."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { marginHorizontal: containerPadding }]}>
      <View style={styles.sectionHeader}>
        <ResponsiveText
          variant="2xl"
          style={styles.sectionTitle}
          numberOfLines={1}
        >
          Employee Attendance
        </ResponsiveText>
        <View style={styles.dateBadge}>
          <ResponsiveText
            variant="xs"
            style={styles.dateText}
            numberOfLines={1}
          >
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </ResponsiveText>
        </View>
      </View>

      <View style={styles.attendanceList}>
        {employees.map((employee) => (
          <EmployeeAttendanceItem
            key={employee.id}
            employee={employee}
            onToggleAttendance={handleToggleAttendance}
            isLoading={markAttendanceMutation.isPending}
          />
        ))}
      </View>

      <View style={styles.summaryContainer}>
        <ResponsiveText
          variant="md"
          style={styles.summaryText}
          numberOfLines={1}
        >
          Present: {employees.filter((e) => e.attendance?.is_present).length} /{" "}
          {employees.length}
        </ResponsiveText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: scaleDimension(24),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleDimension(20),
    paddingHorizontal: scaleDimension(4),
  },
  sectionTitle: {
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  dateBadge: {
    backgroundColor: "#fdf2f8",
    paddingHorizontal: scaleDimension(14),
    paddingVertical: scaleDimension(8),
    borderRadius: scaleDimension(16),
    borderWidth: 1.5,
    borderColor: "#ec4899",
  },
  dateText: {
    color: "#ec4899",
    fontWeight: "700",
  },
  attendanceList: {
    gap: scaleDimension(16),
  },
  employeeCard: {
    backgroundColor: "white",
    borderRadius: scaleDimension(20),
    padding: scaleDimension(20),
    borderWidth: 1,
    borderColor: "#f3f4f6",
    ...PLATFORM.shadowMd,
  },
  employeeInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  employeeMain: {
    flex: 1,
    minWidth: 0,
  },
  employeeName: {
    fontWeight: "700",
    color: "#111827",
    marginBottom: scaleDimension(6),
    letterSpacing: -0.3,
  },
  employeeRole: {
    color: "#6b7280",
    marginBottom: scaleDimension(6),
    fontWeight: "600",
  },
  dailyRate: {
    color: "#ec4899",
    fontWeight: "700",
  },
  employeeRight: {
    marginLeft: scaleDimension(12),
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaleDimension(18),
    paddingVertical: scaleDimension(12),
    borderRadius: scaleDimension(14),
    gap: scaleDimension(8),
    minWidth: scaleDimension(110),
    justifyContent: "center",
    ...PLATFORM.shadow,
  },
  toggleButtonPresent: {
    backgroundColor: "#10b981",
  },
  toggleButtonAbsent: {
    backgroundColor: "#ef4444",
  },
  toggleButtonDisabled: {
    opacity: 0.6,
  },
  toggleButtonText: {
    color: "white",
    fontWeight: "600",
  },
  loadingContainer: {
    padding: scaleDimension(40),
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: scaleDimension(12),
    color: "#6b7280",
  },
  errorContainer: {
    padding: scaleDimension(40),
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
  },
  emptyContainer: {
    padding: scaleDimension(40),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#6b7280",
  },
  summaryContainer: {
    marginTop: scaleDimension(16),
    padding: scaleDimension(16),
    backgroundColor: "#fdf2f8",
    borderRadius: scaleDimension(16),
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fce7f3",
  },
  summaryText: {
    color: "#ec4899",
    fontWeight: "700",
  },
});
