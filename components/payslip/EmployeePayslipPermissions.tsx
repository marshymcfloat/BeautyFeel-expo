import { ResponsiveText } from "@/components/ui/ResponsiveText";
import { getAllEmployees } from "@/lib/actions/employeeActions";
import { toggleEmployeePayslipPermission } from "@/lib/actions/payslipActions";
import {
  getContainerPadding,
  PLATFORM,
  scaleDimension,
} from "@/lib/utils/responsive";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ToggleLeft, ToggleRight, Users } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { queryClient } from "../Providers/TanstackProvider";
import { Toast, ToastDescription, ToastTitle, useToast } from "../ui/toast";

export default function EmployeePayslipPermissions() {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ["all-employees"],
    queryFn: getAllEmployees,
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      employeeId,
      canRequest,
    }: {
      employeeId: string;
      canRequest: boolean;
    }) => toggleEmployeePayslipPermission(employeeId, canRequest),
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-employees"] });
        toast.show({
          placement: "top",
          duration: 2000,
          render: ({ id }) => (
            <Toast action="success" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Permission Updated</ToastTitle>
              <ToastDescription>
                Employee can {variables.canRequest ? "now" : "no longer"}{" "}
                request payslips.
              </ToastDescription>
            </Toast>
          ),
        });
      } else {
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => (
            <Toast action="error" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>
                {result.error || "Failed to update permission"}
              </ToastDescription>
            </Toast>
          ),
        });
      }
    },
    onError: (error: Error) => {
      toast.show({
        placement: "top",
        duration: 3000,
        render: ({ id }) => (
          <Toast action="error" variant="outline" nativeID={"toast-" + id}>
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>
              {error.message || "An unexpected error occurred"}
            </ToastDescription>
          </Toast>
        ),
      });
    },
  });

  const employees = employeesData?.data || [];
  // Filter out owners
  const nonOwnerEmployees = employees.filter((emp) => emp.role !== "OWNER");

  const handleToggle = (employeeId: string, currentValue: boolean) => {
    toggleMutation.mutate({
      employeeId,
      canRequest: !currentValue,
    });
  };

  const containerPadding = getContainerPadding();
  const iconSize = scaleDimension(20);
  const toggleIconSize = scaleDimension(24);

  if (isLoading) {
    return (
      <View style={[styles.container, { marginHorizontal: containerPadding }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrapper}>
              <Users size={iconSize} color="#ec4899" />
            </View>
            <View>
              <ResponsiveText
                variant="lg"
                style={styles.title}
                numberOfLines={1}
              >
                Payslip Permissions
              </ResponsiveText>
              <ResponsiveText
                variant="xs"
                style={styles.subtitle}
                numberOfLines={1}
              >
                Manage employee access
              </ResponsiveText>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#ec4899" />
          <ResponsiveText
            variant="sm"
            style={styles.loadingText}
            numberOfLines={1}
          >
            Loading employees...
          </ResponsiveText>
        </View>
      </View>
    );
  }

  if (nonOwnerEmployees.length === 0) {
    return (
      <View style={[styles.container, { marginHorizontal: containerPadding }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrapper}>
              <Users size={iconSize} color="#ec4899" />
            </View>
            <View>
              <ResponsiveText
                variant="lg"
                style={styles.title}
                numberOfLines={1}
              >
                Payslip Permissions
              </ResponsiveText>
              <ResponsiveText
                variant="xs"
                style={styles.subtitle}
                numberOfLines={1}
              >
                Manage employee access
              </ResponsiveText>
            </View>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <ResponsiveText
            variant="sm"
            style={styles.emptyText}
            numberOfLines={1}
          >
            No employees found
          </ResponsiveText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { marginHorizontal: containerPadding }]}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={({ pressed }) => [
          styles.header,
          pressed && styles.headerPressed,
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrapper}>
            <Users size={iconSize} color="#ec4899" />
          </View>
          <View style={styles.headerTextContainer}>
            <ResponsiveText variant="lg" style={styles.title} numberOfLines={1}>
              Payslip Permissions
            </ResponsiveText>
            <ResponsiveText
              variant="xs"
              style={styles.subtitle}
              numberOfLines={2}
            >
              {nonOwnerEmployees.filter((e) => e.can_request_payslip).length} of{" "}
              {nonOwnerEmployees.length} employees can request
            </ResponsiveText>
          </View>
        </View>
        {expanded ? (
          <ToggleRight size={toggleIconSize} color="#ec4899" />
        ) : (
          <ToggleLeft size={toggleIconSize} color="#9ca3af" />
        )}
      </Pressable>

      {expanded && (
        <View style={styles.content}>
          <ScrollView
            style={styles.employeesList}
            showsVerticalScrollIndicator={false}
          >
            {nonOwnerEmployees.map((employee) => (
              <EmployeePermissionItem
                key={employee.id}
                employee={employee}
                onToggle={() =>
                  handleToggle(
                    employee.id,
                    employee.can_request_payslip || false
                  )
                }
                isToggling={toggleMutation.isPending}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

interface EmployeePermissionItemProps {
  employee: {
    id: string;
    user_id: string;
    role: string;
    can_request_payslip?: boolean;
    name?: string | null;
  };
  onToggle: () => void;
  isToggling: boolean;
}

function EmployeePermissionItem({
  employee,
  onToggle,
  isToggling,
}: EmployeePermissionItemProps) {
  const canRequest = employee.can_request_payslip ?? true;

  return (
    <View style={styles.employeeItem}>
      <View style={styles.employeeInfo}>
        <View style={styles.employeeAvatar}>
          <ResponsiveText
            size={scaleDimension(16)}
            style={styles.employeeAvatarText}
          >
            {employee.role.charAt(0).toUpperCase()}
          </ResponsiveText>
        </View>
        <View style={styles.employeeDetails}>
          <ResponsiveText
            variant="md"
            style={styles.employeeName}
            numberOfLines={1}
          >
            {employee.name || employee.role}
          </ResponsiveText>
          <ResponsiveText
            variant="xs"
            style={styles.employeeId}
            numberOfLines={1}
          >
            ID: {employee.id.slice(0, 8)}
          </ResponsiveText>
        </View>
      </View>
      <Pressable
        onPress={onToggle}
        disabled={isToggling}
        style={styles.toggleContainer}
      >
        {isToggling ? (
          <ActivityIndicator size="small" color="#ec4899" />
        ) : (
          <View style={[styles.toggle, canRequest && styles.toggleActive]}>
            <View
              style={[
                styles.toggleThumb,
                canRequest && styles.toggleThumbActive,
              ]}
            />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: scaleDimension(24),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: scaleDimension(16),
    backgroundColor: "white",
    borderRadius: scaleDimension(16),
    borderWidth: 1,
    borderColor: "#f3f4f6",
    ...PLATFORM.shadow,
  },
  headerPressed: {
    opacity: 0.9,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(12),
    flex: 1,
  },
  headerIconWrapper: {
    width: scaleDimension(40),
    height: scaleDimension(40),
    borderRadius: scaleDimension(12),
    backgroundColor: "#fdf2f8",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  title: {
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
    marginBottom: scaleDimension(2),
  },
  subtitle: {
    color: "#6b7280",
    fontWeight: "500",
  },
  loadingContainer: {
    padding: scaleDimension(20),
    alignItems: "center",
  },
  loadingText: {
    marginTop: scaleDimension(8),
    color: "#6b7280",
  },
  emptyContainer: {
    padding: scaleDimension(20),
    alignItems: "center",
  },
  emptyText: {
    color: "#6b7280",
  },
  content: {
    marginTop: scaleDimension(12),
    backgroundColor: "white",
    borderRadius: scaleDimension(16),
    borderWidth: 1,
    borderColor: "#f3f4f6",
    maxHeight: scaleDimension(300),
    ...PLATFORM.shadow,
  },
  employeesList: {
    padding: scaleDimension(12),
  },
  employeeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: scaleDimension(12),
    paddingHorizontal: scaleDimension(8),
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  employeeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(12),
    flex: 1,
  },
  employeeAvatar: {
    width: scaleDimension(40),
    height: scaleDimension(40),
    borderRadius: scaleDimension(20),
    backgroundColor: "#ec4899",
    alignItems: "center",
    justifyContent: "center",
  },
  employeeAvatarText: {
    color: "white",
    fontWeight: "700",
  },
  employeeDetails: {
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  employeeName: {
    fontWeight: "700",
    color: "#111827",
    marginBottom: scaleDimension(2),
  },
  employeeId: {
    color: "#6b7280",
  },
  toggleContainer: {
    marginLeft: scaleDimension(12),
  },
  toggle: {
    width: scaleDimension(48),
    height: scaleDimension(28),
    borderRadius: scaleDimension(14),
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    padding: scaleDimension(2),
  },
  toggleActive: {
    backgroundColor: "#ec4899",
  },
  toggleThumb: {
    width: scaleDimension(24),
    height: scaleDimension(24),
    borderRadius: scaleDimension(12),
    backgroundColor: "white",
    alignSelf: "flex-start",
  },
  toggleThumbActive: {
    alignSelf: "flex-end",
  },
});
