import { ResponsiveText } from "@/components/ui/ResponsiveText";
import {
  createEmployeeAction,
  updateEmployeeAction,
  type EmployeeWithRole,
} from "@/lib/actions/employeeActions";
import { capitalizeWords } from "@/lib/utils";
import {
  scaleDimension,
  percentageHeight,
} from "@/lib/utils/responsive";
import {
  employeeSchema,
  type EmployeeFormData,
} from "@/lib/zod-schemas/employee";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { FormField } from "../form/FormField";
import { queryClient } from "../Providers/TanstackProvider";
import { useToast } from "../ui/toast";

interface EmployeeFormModalProps {
  visible: boolean;
  onClose: () => void;
  existingEmployee?: EmployeeWithRole | null;
  onSuccess?: () => void;
}

export default function EmployeeFormModal({
  visible,
  onClose,
  existingEmployee,
  onSuccess,
}: EmployeeFormModalProps) {
  const isEditMode = !!existingEmployee;
  const toast = useToast();

  // For update mode, make password optional
  const formSchema = isEditMode
    ? employeeSchema.extend({
        password: employeeSchema.shape.password.optional().nullable(),
      })
    : employeeSchema;

  const form = useForm<EmployeeFormData & { password?: string | null }>({
    resolver: zodResolver(formSchema as any),
        defaultValues: existingEmployee
      ? {
          name: existingEmployee.name || "",
          email: "", // Email will be fetched if needed, but we don't store it in employee table
          password: undefined,
          role: existingEmployee.role,
          salary: existingEmployee.salary || 0,
          commission_rate: existingEmployee.commission_rate || 0,
          daily_rate: existingEmployee.daily_rate || 0,
          can_request_payslip: existingEmployee.can_request_payslip ?? true,
        }
      : {
          name: "",
          email: "",
          password: undefined,
          role: "WORKER",
          salary: 0,
          commission_rate: 0,
          daily_rate: 0,
          can_request_payslip: true,
        },
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = form;

  const watchedRole = watch("role");
  const watchedCanRequestPayslip = watch("can_request_payslip");
  const iconSize = scaleDimension(24);

  // Reset form when modal opens or existingEmployee changes
  useEffect(() => {
    if (visible) {
      if (existingEmployee) {
        reset({
          name: existingEmployee.name || "",
          email: "", // Email not stored in employee table
          password: undefined,
          role: existingEmployee.role,
          salary: existingEmployee.salary || 0,
          commission_rate: existingEmployee.commission_rate || 0,
          daily_rate: existingEmployee.daily_rate || 0,
          can_request_payslip: existingEmployee.can_request_payslip ?? true,
        });
      } else {
        reset({
          name: "",
          email: "",
          password: "",
          role: "WORKER",
          salary: 0,
          commission_rate: 0,
          daily_rate: 0,
          can_request_payslip: true,
        });
      }
    }
  }, [visible, existingEmployee, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const createMutation = useMutation({
    mutationFn: createEmployeeAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        queryClient.invalidateQueries({ queryKey: ["all-employees"] });
        toast.success("Employee Created", "Employee created successfully");
        reset();
        onClose();
        onSuccess?.();
      } else {
        toast.error("Error", result.error || "Failed to create employee");
      }
    },
    onError: (error) => {
      toast.error("Error", error.message || "Failed to create employee");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: EmployeeFormData & { password?: string | null }) => {
      if (!existingEmployee) throw new Error("No employee to update");
      return updateEmployeeAction(existingEmployee.id, {
        name: data.name,
        email: data.email || undefined,
        password: data.password || undefined,
        role: data.role,
        salary: data.salary,
        commission_rate: data.commission_rate,
        daily_rate: data.daily_rate,
        can_request_payslip: data.can_request_payslip,
      });
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        queryClient.invalidateQueries({ queryKey: ["all-employees"] });
        toast.success("Employee Updated", "Employee updated successfully");
        onClose();
        onSuccess?.();
      } else {
        toast.error("Error", result.error || "Failed to update employee");
      }
    },
    onError: (error) => {
      toast.error("Error", error.message || "Failed to update employee");
    },
  });

  const onSubmit = (data: EmployeeFormData & { password?: string | null }) => {
    const formattedData = {
      ...data,
      name: capitalizeWords(data.name),
      password: isEditMode
        ? data.password && data.password.trim() !== ""
          ? data.password
          : undefined
        : data.password || "",
    };

    if (isEditMode) {
      updateMutation.mutate(formattedData);
    } else {
      createMutation.mutate(formattedData as any);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Auto-set daily_rate based on role when role changes
  useEffect(() => {
    if (!isEditMode && watchedRole) {
      const defaultDailyRate = watchedRole === "WORKER" ? 350 : 0;
      form.setValue("daily_rate", defaultDailyRate);
    }
  }, [watchedRole, isEditMode]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.modalContent}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <ResponsiveText variant="2xl" style={styles.headerTitle} numberOfLines={1}>
                {isEditMode ? "Edit Employee" : "Create Employee"}
              </ResponsiveText>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <X size={iconSize} color="#374151" />
              </Pressable>
            </View>

            <View style={styles.form}>
              <FormField<EmployeeFormData>
                control={control as any}
                name="name"
                label="Full Name *"
                placeholder="e.g., Juan Dela Cruz"
              />

              <FormField<EmployeeFormData>
                control={control as any}
                name="email"
                label="Email Address *"
                placeholder="employee@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <FormField<EmployeeFormData>
                control={control as any}
                name="password"
                label={
                  isEditMode
                    ? "New Password (leave blank to keep current)"
                    : "Password *"
                }
                placeholder={
                  isEditMode ? "Enter new password" : "At least 8 characters"
                }
                secureTextEntry
                autoCapitalize="none"
              />

              <View style={styles.formSection}>
                <ResponsiveText variant="sm" style={styles.label} numberOfLines={1}>
                  Role *
                </ResponsiveText>
                <View style={styles.roleContainer}>
                  {(["OWNER", "CASHIER", "MASSEUSE", "WORKER"] as const).map(
                    (role) => (
                      <Pressable
                        key={role}
                        onPress={() => form.setValue("role", role)}
                        style={[
                          styles.roleButton,
                          watchedRole === role
                            ? styles.roleButtonSelected
                            : styles.roleButtonUnselected,
                        ]}
                      >
                        <ResponsiveText
                          variant="sm"
                          style={[
                            styles.roleButtonText,
                            watchedRole === role
                              ? styles.roleButtonTextSelected
                              : styles.roleButtonTextUnselected,
                          ]}
                          numberOfLines={1}
                        >
                          {role}
                        </ResponsiveText>
                      </Pressable>
                    )
                  )}
                </View>
                {errors.role && (
                  <ResponsiveText variant="xs" style={styles.errorText} numberOfLines={2}>
                    {errors.role.message}
                  </ResponsiveText>
                )}
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <FormField<EmployeeFormData>
                    control={control as any}
                    name="salary"
                    label="Base Salary (₱) *"
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfWidth}>
                  <FormField<EmployeeFormData>
                    control={control as any}
                    name="commission_rate"
                    label="Commission Rate (%) *"
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <FormField<EmployeeFormData>
                control={control as any}
                name="daily_rate"
                label="Daily Rate (₱)"
                placeholder="0.00"
                keyboardType="numeric"
              />

              <View style={styles.formSection}>
                <Pressable
                  onPress={() =>
                    form.setValue(
                      "can_request_payslip",
                      !watchedCanRequestPayslip
                    )
                  }
                  style={styles.toggleContainer}
                >
                  <ResponsiveText variant="sm" style={styles.label} numberOfLines={1}>
                    Can Request Payslip
                  </ResponsiveText>
                  <View
                    style={[
                      styles.toggle,
                      watchedCanRequestPayslip && styles.toggleActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        watchedCanRequestPayslip && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>
              </View>

              <Pressable
                onPress={handleSubmit(onSubmit)}
                disabled={isPending}
                style={styles.submitButton}
              >
                <LinearGradient
                  colors={["#ec4899", "#d946ef"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  {isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <ResponsiveText variant="md" style={styles.submitButtonText} numberOfLines={1}>
                      {isEditMode ? "Update Employee" : "Create Employee"}
                    </ResponsiveText>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: scaleDimension(24),
    borderTopRightRadius: scaleDimension(24),
    maxHeight: percentageHeight(90),
    width: "100%",
  },
  scrollContent: {
    paddingBottom: scaleDimension(40),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scaleDimension(24),
    paddingTop: scaleDimension(24),
    paddingBottom: scaleDimension(16),
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontWeight: "bold",
    color: "#111827",
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  closeButton: {
    padding: scaleDimension(8),
  },
  form: {
    paddingHorizontal: scaleDimension(24),
    paddingTop: scaleDimension(24),
  },
  formSection: {
    marginBottom: scaleDimension(16),
  },
  label: {
    color: "#374151",
    fontWeight: "600",
    marginBottom: scaleDimension(8),
  },
  row: {
    flexDirection: "row",
    gap: scaleDimension(12),
  },
  halfWidth: {
    flex: 1,
  },
  roleContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleDimension(8),
  },
  roleButton: {
    paddingHorizontal: scaleDimension(16),
    paddingVertical: scaleDimension(10),
    borderRadius: scaleDimension(8),
    borderWidth: 2,
    minWidth: scaleDimension(90),
  },
  roleButtonSelected: {
    backgroundColor: "#ec4899",
    borderColor: "#ec4899",
  },
  roleButtonUnselected: {
    backgroundColor: "white",
    borderColor: "#e5e7eb",
  },
  roleButtonText: {
    fontWeight: "500",
    textAlign: "center",
  },
  roleButtonTextSelected: {
    color: "white",
  },
  roleButtonTextUnselected: {
    color: "#374151",
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: scaleDimension(8),
  },
  toggle: {
    width: scaleDimension(50),
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
  errorText: {
    color: "#ef4444",
    marginTop: scaleDimension(4),
    marginLeft: scaleDimension(4),
  },
  submitButton: {
    marginTop: scaleDimension(16),
    borderRadius: scaleDimension(12),
    overflow: "hidden",
  },
  submitButtonGradient: {
    paddingVertical: scaleDimension(16),
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
