import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ResponsiveText } from "@/components/ui/ResponsiveText";
import type { Database } from "@/database.types";
import {
  getAllEmployeesForAttendance,
  markAttendanceAction,
} from "@/lib/actions/attendanceActions";
import { formatCurrency } from "@/lib/utils/currency";
import {
  getPhilippineDate,
  getPhilippineDateObject,
} from "@/lib/utils/dateTime";
import {
  getContainerPadding,
  PLATFORM,
  scaleDimension,
} from "@/lib/utils/responsive";
import { getRoleName } from "@/lib/utils/role";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { CheckCircle2, Clock, XCircle } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import { queryClient } from "../Providers/TanstackProvider";
import { useToast } from "../ui/toast";

type Branch = Database["public"]["Enums"]["branch"];

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
          <ResponsiveText variant="lg" style={styles.employeeName}>
            {displayName}
          </ResponsiveText>
          <ResponsiveText variant="xs" style={styles.employeeRole}>
            {roleDisplay}
          </ResponsiveText>
          {employee.daily_rate > 0 && (
            <ResponsiveText variant="xs" style={styles.dailyRate}>
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
                <ResponsiveText variant="sm" style={styles.toggleButtonText}>
                  Present
                </ResponsiveText>
              </>
            ) : (
              <>
                <XCircle size={iconSize} color="white" />
                <ResponsiveText variant="sm" style={styles.toggleButtonText}>
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

export default function AttendanceManager({ ownerBranch }: { ownerBranch?: Branch | null }) {
  const toast = useToast();
  const [currentDate, setCurrentDate] = useState(() => getPhilippineDate());

  useEffect(() => {
    const updateDate = () => {
      const newDate = getPhilippineDate();
      setCurrentDate(newDate);
    };
    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  const today = currentDate;

  const {
    data: employeesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["employees-attendance", today, ownerBranch],
    queryFn: () => getAllEmployeesForAttendance(ownerBranch || null),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
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
      <View style={styles.header}>
        <LinearGradient
          colors={["#fdf2f8", "#fce7f3"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <ResponsiveText variant="2xl" style={styles.sectionTitle}>
                Employee Attendance
              </ResponsiveText>
            </View>
            <View style={styles.dateBadge}>
              <ResponsiveText variant="xs" style={styles.dateText}>
                {getPhilippineDateObject().toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </ResponsiveText>
            </View>
          </View>
        </LinearGradient>
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
        <ResponsiveText variant="md" style={styles.summaryText}>
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
    alignItems: "center", // Align center vertically
    marginBottom: scaleDimension(20),
    paddingHorizontal: scaleDimension(4),
  },
  sectionTitle: {
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
    flexWrap: "wrap", // Allow title wrap
  },
  dateBadge: {
    backgroundColor: "#fdf2f8",
    paddingHorizontal: scaleDimension(14),
    paddingVertical: scaleDimension(8),
    borderRadius: scaleDimension(16),
    borderWidth: 1.5,
    borderColor: "#ec4899",
    marginLeft: scaleDimension(8), // Add margin for safety
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
    padding: scaleDimension(24),
    borderWidth: 1.5,
    borderColor: "#f3f4f6",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  employeeInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center", // Changed to flex-start for multi-line support
  },
  employeeMain: {
    flex: 1, // Takes available space
    marginRight: scaleDimension(8), // Space between text and button
  },
  employeeName: {
    fontWeight: "700",
    color: "#111827",
    marginBottom: scaleDimension(6),
    letterSpacing: -0.3,
    flexWrap: "wrap", // Enable wrapping
  },
  employeeRole: {
    color: "#6b7280",
    marginBottom: scaleDimension(6),
    fontWeight: "600",
    flexWrap: "wrap",
  },
  dailyRate: {
    color: "#ec4899",
    fontWeight: "700",
  },
  employeeRight: {
    // Keep button size stable
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaleDimension(20),
    paddingVertical: scaleDimension(14),
    borderRadius: scaleDimension(14),
    gap: scaleDimension(8),
    minWidth: scaleDimension(120),
    justifyContent: "center",
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
  summaryContainer: {
    marginTop: scaleDimension(20),
    padding: scaleDimension(20),
    backgroundColor: "#fdf2f8",
    borderRadius: scaleDimension(18),
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fce7f3",
    ...Platform.select({
      ios: {
        shadowColor: "#ec4899",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryText: {
    color: "#ec4899",
    fontWeight: "700",
    fontSize: scaleDimension(16),
  },
  header: {
    marginBottom: scaleDimension(24),
    borderRadius: scaleDimension(20),
    overflow: "hidden",
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
  headerGradient: {
    padding: scaleDimension(20),
  },
});
