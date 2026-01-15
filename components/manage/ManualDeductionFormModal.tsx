import { ResponsiveText } from "@/components/ui/ResponsiveText";
import type { Database } from "@/database.types";
import {
  createManualDeduction,
  updateManualDeduction,
  type ManualDeductionWithUser,
} from "@/lib/actions/manualDeductionActions";
import { scaleDimension, scaleFont } from "@/lib/utils/responsive";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";
import { FormField } from "../form/FormField";
import { queryClient } from "../Providers/TanstackProvider";
import { useToast } from "../ui/toast";

type Branch = Database["public"]["Enums"]["branch"];

const manualDeductionSchema = z.object({
  branch: z.enum(["NAILS", "SKIN", "LASHES", "MASSAGE"]),
  amount: z
    .number()
    .min(0.01, "Amount must be greater than 0")
    .max(10000000, "Amount is too large"),
  description: z.string().min(1, "Description is required"),
  deduction_date: z.string().min(1, "Date is required"),
});

type ManualDeductionFormData = z.infer<typeof manualDeductionSchema>;

interface ManualDeductionFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  existingDeduction?: ManualDeductionWithUser | null;
  defaultBranch?: Branch | null;
}

export default function ManualDeductionFormModal({
  visible,
  onClose,
  onSuccess,
  existingDeduction,
  defaultBranch,
}: ManualDeductionFormModalProps) {
  const toast = useToast();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isEdit = !!existingDeduction;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ManualDeductionFormData>({
    resolver: zodResolver(manualDeductionSchema),
    defaultValues: {
      branch: existingDeduction?.branch || defaultBranch || "SKIN",
      amount: existingDeduction?.amount || 0,
      description: existingDeduction?.description || "",
      deduction_date:
        existingDeduction?.deduction_date ||
        new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (visible) {
      if (existingDeduction) {
        reset({
          branch: existingDeduction.branch,
          amount: existingDeduction.amount,
          description: existingDeduction.description,
          deduction_date: existingDeduction.deduction_date,
        });
      } else {
        reset({
          branch: defaultBranch || "SKIN",
          amount: 0,
          description: "",
          deduction_date: new Date().toISOString().split("T")[0],
        });
      }
    }
  }, [visible, existingDeduction, defaultBranch, reset]);

  const createMutation = useMutation({
    mutationFn: createManualDeduction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manualDeductions"] });
      queryClient.invalidateQueries({ queryKey: ["salesSummary"] });
      toast.success("Success", "Manual deduction created successfully");
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast.error(
        "Error",
        error.message || "Failed to create manual deduction"
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateManualDeduction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manualDeductions"] });
      queryClient.invalidateQueries({ queryKey: ["salesSummary"] });
      toast.success("Success", "Manual deduction updated successfully");
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast.error(
        "Error",
        error.message || "Failed to update manual deduction"
      );
    },
  });

  const onSubmit = (data: ManualDeductionFormData) => {
    if (isEdit) {
      updateMutation.mutate({
        id: existingDeduction!.id,
        data: {
          branch: data.branch,
          amount: data.amount,
          description: data.description,
          deduction_date: data.deduction_date,
        },
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const branchOptions: Branch[] = ["NAILS", "SKIN", "LASHES", "MASSAGE"];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <LinearGradient
            colors={["#ffffff", "#f9fafb"]}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <ResponsiveText style={styles.headerTitle}>
                {isEdit ? "Edit Deduction" : "Add Manual Deduction"}
              </ResponsiveText>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Branch Selection */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Branch</Text>
                <View style={styles.branchContainer}>
                  {branchOptions.map((branch) => (
                    <Controller
                      key={branch}
                      control={control}
                      name="branch"
                      render={({ field: { onChange, value } }) => (
                        <Pressable
                          onPress={() => onChange(branch)}
                          style={[
                            styles.branchButton,
                            value === branch && styles.branchButtonActive,
                          ]}
                        >
                          <ResponsiveText
                            style={[
                              styles.branchButtonText,
                              value === branch && styles.branchButtonTextActive,
                            ]}
                          >
                            {branch}
                          </ResponsiveText>
                        </Pressable>
                      )}
                    />
                  ))}
                </View>
                {errors.branch && (
                  <Text style={styles.errorText}>{errors.branch.message}</Text>
                )}
              </View>

              {/* Description */}
              <FormField
                control={control}
                name="description"
                label="Description"
                placeholder="e.g., Electricity, Water, Internet"
              />

              {/* Amount */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Amount (₱)</Text>
                <Controller
                  control={control}
                  name="amount"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={[styles.input, errors.amount && styles.inputError]}
                      value={value.toString()}
                      onChangeText={(text) => {
                        const numValue = parseFloat(text) || 0;
                        onChange(numValue);
                      }}
                      onBlur={onBlur}
                      placeholder="0.00"
                      placeholderTextColor="#9ca3af"
                      keyboardType="decimal-pad"
                    />
                  )}
                />
                {errors.amount && (
                  <Text style={styles.errorText}>{errors.amount.message}</Text>
                )}
              </View>

              {/* Date */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Deduction Date</Text>
                <Controller
                  control={control}
                  name="deduction_date"
                  render={({ field: { onChange, value } }) => (
                    <>
                      <Pressable
                        onPress={() => setShowDatePicker(true)}
                        style={[
                          styles.dateButton,
                          errors.deduction_date && styles.inputError,
                        ]}
                      >
                        <Calendar size={20} color="#6b7280" />
                        <ResponsiveText style={styles.dateButtonText}>
                          {value
                            ? new Date(value).toLocaleDateString()
                            : "Select date"}
                        </ResponsiveText>
                      </Pressable>
                      {showDatePicker && (
                        <DateTimePicker
                          value={new Date(value || Date.now())}
                          mode="date"
                          display={
                            Platform.OS === "ios" ? "spinner" : "default"
                          }
                          onChange={(event, selectedDate) => {
                            setShowDatePicker(Platform.OS === "ios");
                            if (selectedDate) {
                              const dateString = selectedDate
                                .toISOString()
                                .split("T")[0];
                              onChange(dateString);
                            }
                          }}
                        />
                      )}
                    </>
                  )}
                />
                {errors.deduction_date && (
                  <Text style={styles.errorText}>
                    {errors.deduction_date.message}
                  </Text>
                )}
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmit(onSubmit)}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.submitButton,
                  (pressed || isLoading) && styles.submitButtonPressed,
                ]}
              >
                <LinearGradient
                  colors={["#ec4899", "#db2777"]}
                  style={styles.submitButtonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <ResponsiveText style={styles.submitButtonText}>
                      {isEdit ? "Update Deduction" : "Add Deduction"}
                    </ResponsiveText>
                  )}
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: scaleDimension(24),
    borderTopRightRadius: scaleDimension(24),
    height: "75%",
    width: "100%",
    paddingBottom: scaleDimension(40),
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: scaleDimension(20),
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: scaleFont(20),
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: scaleDimension(4),
  },
  scrollContent: {
    padding: scaleDimension(20),
    gap: scaleDimension(16),
    paddingBottom: scaleDimension(40),
  },
  branchContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleDimension(8),
  },
  branchButton: {
    paddingHorizontal: scaleDimension(16),
    paddingVertical: scaleDimension(10),
    borderRadius: scaleDimension(8),
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  branchButtonActive: {
    backgroundColor: "#ec4899",
    borderColor: "#ec4899",
  },
  branchButtonText: {
    fontSize: scaleFont(14),
    fontWeight: "600",
    color: "#6b7280",
  },
  branchButtonTextActive: {
    color: "white",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(14),
    fontSize: scaleFont(16),
    backgroundColor: "white",
    color: "#111827",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(12),
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(14),
    backgroundColor: "white",
  },
  dateButtonText: {
    fontSize: scaleFont(16),
    color: "#111827",
  },
  submitButton: {
    marginTop: scaleDimension(8),
    borderRadius: scaleDimension(12),
    overflow: "hidden",
  },
  submitButtonPressed: {
    opacity: 0.8,
  },
  submitButtonGradient: {
    padding: scaleDimension(16),
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: scaleFont(16),
    fontWeight: "700",
    color: "white",
  },
  fieldContainer: {
    marginBottom: scaleDimension(16),
  },
  label: {
    fontSize: scaleFont(14),
    fontWeight: "600",
    color: "#374151",
    marginBottom: scaleDimension(8),
  },
  errorText: {
    color: "#EF4444",
    fontSize: scaleFont(14),
    marginTop: scaleDimension(6),
    marginLeft: scaleDimension(4),
  },
  inputError: {
    borderWidth: 2,
    borderColor: "#F87171",
  },
});
