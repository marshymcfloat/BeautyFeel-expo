import { ResponsiveText } from "@/components/ui/ResponsiveText";
import {
  createDiscountAction,
  updateDiscountAction,
  type DiscountWithServices,
} from "@/lib/actions/discountActions";
import { getAllServicesAction } from "@/lib/actions/serviceActions";
import type { Database } from "@/database.types";
import { scaleDimension, percentageHeight } from "@/lib/utils/responsive";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar, Check, X, Tag } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { z } from "zod";
import { FormField } from "../form/FormField";
import { queryClient } from "../Providers/TanstackProvider";
import { useToast } from "../ui/toast";

type Service = Database["public"]["Tables"]["service"]["Row"];
type Branch = Database["public"]["Enums"]["branch"];

const discountSchema = z
  .object({
    name: z.string().min(1, "Discount name is required"),
    description: z.string().optional(),
    discount_type: z.enum(["ABSOLUTE", "PERCENTAGE"]),
    discount_value: z.number().min(0.01, "Discount value must be greater than 0"),
    branch: z.enum(["NAILS", "SKIN", "LASHES", "MASSAGE"]).nullable().optional(),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    service_ids: z.array(z.number()).min(1, "At least one service must be selected"),
  })
  .refine(
    (data) => {
      if (data.discount_type === "PERCENTAGE") {
        return data.discount_value <= 100;
      }
      return true;
    },
    {
      message: "Percentage discount cannot exceed 100%",
      path: ["discount_value"],
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return end > start;
    },
    {
      message: "End date must be after start date",
      path: ["end_date"],
    }
  );

type DiscountFormData = z.infer<typeof discountSchema>;

type ServiceSelectionMode = "individual" | "group" | "branch";

interface DiscountFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  existingDiscount?: DiscountWithServices | null;
}

export default function DiscountFormModal({
  visible,
  onClose,
  onSuccess,
  existingDiscount,
}: DiscountFormModalProps) {
  const toast = useToast();
  const [serviceSelectionMode, setServiceSelectionMode] =
    useState<ServiceSelectionMode>("individual");
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date>(new Date());
  const [tempEndDate, setTempEndDate] = useState<Date>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  );

  const form = useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      name: "",
      description: "",
      discount_type: "PERCENTAGE",
      discount_value: 0,
      branch: null,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      service_ids: [],
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const watchedDiscountType = watch("discount_type");
  const watchedServiceIds = watch("service_ids");
  const watchedBranch = watch("branch");

  // Fetch all services
  const { data: servicesData } = useQuery({
    queryKey: ["all-services"],
    queryFn: getAllServicesAction,
  });

  const services: Service[] = servicesData?.success
    ? (servicesData.data || []).filter((s) => s.is_active)
    : [];

  // Group services by branch
  const servicesByBranch = useMemo(() => {
    const grouped: Record<Branch, Service[]> = {
      NAILS: [],
      SKIN: [],
      LASHES: [],
      MASSAGE: [],
    };
    services.forEach((service) => {
      grouped[service.branch].push(service);
    });
    return grouped;
  }, [services]);

  // Filter services based on selected branch (for individual mode)
  const filteredServices = useMemo(() => {
    if (!watchedBranch) {
      return services;
    }
    return services.filter((service) => service.branch === watchedBranch);
  }, [services, watchedBranch]);

  // Initialize form with existing discount data
  useEffect(() => {
    if (visible && existingDiscount) {
      const serviceIds =
        existingDiscount.discount_services?.map((ds) => ds.service_id) || [];
      reset({
        name: existingDiscount.name,
        description: existingDiscount.description || "",
        discount_type: existingDiscount.discount_type as "ABSOLUTE" | "PERCENTAGE",
        discount_value: Number(existingDiscount.discount_value),
        branch: existingDiscount.branch || null,
        start_date: existingDiscount.start_date,
        end_date: existingDiscount.end_date,
        service_ids: serviceIds,
      });
      setSelectedBranch(existingDiscount.branch || null);
    } else if (visible && !existingDiscount) {
      reset({
        name: "",
        description: "",
        discount_type: "PERCENTAGE",
        discount_value: 0,
        branch: null,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        service_ids: [],
      });
      setSelectedBranch(null);
      setServiceSelectionMode("individual");
    }
  }, [visible, existingDiscount, reset]);

  const createMutation = useMutation({
    mutationFn: createDiscountAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-discounts"] });
        toast.success("Discount Created", "Discount created successfully");
        onSuccess?.();
      } else {
        toast.error("Error", result.error || "Failed to create discount");
      }
    },
    onError: (error) => {
      toast.error("Error", error.message || "Failed to create discount");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateDiscountAction(id, data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-discounts"] });
        toast.success("Discount Updated", "Discount updated successfully");
        onSuccess?.();
      } else {
        toast.error("Error", result.error || "Failed to update discount");
      }
    },
    onError: (error) => {
      toast.error("Error", error.message || "Failed to update discount");
    },
  });

  const onSubmit = (data: DiscountFormData) => {
    if (existingDiscount) {
      updateMutation.mutate({
        id: existingDiscount.id,
        data: {
          name: data.name,
          description: data.description || null,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          branch: data.branch || null,
          start_date: data.start_date,
          end_date: data.end_date,
          service_ids: data.service_ids,
        },
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleServiceToggle = (serviceId: number) => {
    const currentIds = watchedServiceIds || [];
    if (currentIds.includes(serviceId)) {
      setValue(
        "service_ids",
        currentIds.filter((id) => id !== serviceId),
        { shouldValidate: true }
      );
    } else {
      setValue("service_ids", [...currentIds, serviceId], {
        shouldValidate: true,
      });
    }
  };

  const handleSelectAll = () => {
    const servicesToSelect = watchedBranch
      ? filteredServices
      : services;
    setValue("service_ids", servicesToSelect.map((s) => s.id), { shouldValidate: true });
  };

  const handleDeselectAll = () => {
    setValue("service_ids", [], { shouldValidate: true });
  };

  const handleSelectByBranch = (branch: Branch) => {
    const branchServices = servicesByBranch[branch];
    const branchServiceIds = branchServices.map((s) => s.id);
    setValue("service_ids", branchServiceIds, { shouldValidate: true });
    setSelectedBranch(branch);
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setTempStartDate(selectedDate);
      setValue("start_date", selectedDate.toISOString(), {
        shouldValidate: true,
      });
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setTempEndDate(selectedDate);
      setValue("end_date", selectedDate.toISOString(), {
        shouldValidate: true,
      });
    }
  };

  const iconSize = scaleDimension(24);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <ResponsiveText
                variant="2xl"
                style={styles.headerTitle}
                numberOfLines={1}
              >
                {existingDiscount ? "Edit Discount" : "Create Discount"}
              </ResponsiveText>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X size={iconSize} color="#374151" />
              </Pressable>
            </View>

            <View style={styles.form}>
              <FormField
                control={control}
                name="name"
                label="Discount Name"
                placeholder="e.g., Summer Sale 2024"
                autoCapitalize="words"
              />

              <FormField
                control={control}
                name="description"
                label="Description (Optional)"
                placeholder="Add a description for this discount"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Discount Type */}
              <View style={styles.section}>
                <ResponsiveText variant="sm" style={styles.sectionLabel} numberOfLines={1}>
                  Discount Type
                </ResponsiveText>
                <View style={styles.radioGroup}>
                  <Pressable
                    style={[
                      styles.radioOption,
                      watchedDiscountType === "PERCENTAGE" && styles.radioOptionActive,
                    ]}
                    onPress={() => setValue("discount_type", "PERCENTAGE")}
                  >
                    <View style={styles.radioCircle}>
                      {watchedDiscountType === "PERCENTAGE" && (
                        <View style={styles.radioCircleInner} />
                      )}
                    </View>
                    <ResponsiveText variant="sm" style={styles.radioLabel} numberOfLines={1}>
                      Percentage (%)
                    </ResponsiveText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.radioOption,
                      watchedDiscountType === "ABSOLUTE" && styles.radioOptionActive,
                    ]}
                    onPress={() => setValue("discount_type", "ABSOLUTE")}
                  >
                    <View style={styles.radioCircle}>
                      {watchedDiscountType === "ABSOLUTE" && (
                        <View style={styles.radioCircleInner} />
                      )}
                    </View>
                    <ResponsiveText variant="sm" style={styles.radioLabel} numberOfLines={1}>
                      Absolute Amount (₱)
                    </ResponsiveText>
                  </Pressable>
                </View>
              </View>

              {/* Discount Value */}
              <Controller
                control={control}
                name="discount_value"
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <View style={styles.fieldContainer}>
                    <ResponsiveText variant="sm" style={styles.label} numberOfLines={1}>
                      Discount Value
                      {watchedDiscountType === "PERCENTAGE" ? " (%)" : " (₱)"}
                    </ResponsiveText>
                    <TextInput
                      style={[styles.input, error && styles.inputError]}
                      placeholder={
                        watchedDiscountType === "PERCENTAGE"
                          ? "e.g., 20"
                          : "e.g., 500"
                      }
                      placeholderTextColor="#9CA3AF"
                      value={value ? String(value) : ""}
                      onChangeText={(text) => {
                        const num = parseFloat(text) || 0;
                        onChange(num);
                      }}
                      keyboardType="numeric"
                    />
                    {error && (
                      <ResponsiveText variant="xs" style={styles.errorText} numberOfLines={2}>
                        {error.message}
                      </ResponsiveText>
                    )}
                  </View>
                )}
              />

              {/* Branch Selection (Optional) */}
              <View style={styles.section}>
                <ResponsiveText variant="sm" style={styles.sectionLabel} numberOfLines={1}>
                  Branch Filter (Optional - Leave empty for all branches)
                </ResponsiveText>
                <View style={styles.branchButtons}>
                  <Pressable
                    style={[
                      styles.branchButton,
                      !watch("branch") && styles.branchButtonActive,
                    ]}
                    onPress={() => setValue("branch", null)}
                  >
                    <ResponsiveText variant="xs" style={styles.branchButtonText} numberOfLines={1}>
                      All Branches
                    </ResponsiveText>
                  </Pressable>
                  {(["NAILS", "SKIN", "LASHES", "MASSAGE"] as Branch[]).map((branch) => (
                    <Pressable
                      key={branch}
                      style={[
                        styles.branchButton,
                        watch("branch") === branch && styles.branchButtonActive,
                      ]}
                      onPress={() => setValue("branch", branch)}
                    >
                      <ResponsiveText variant="xs" style={styles.branchButtonText} numberOfLines={1}>
                        {branch}
                      </ResponsiveText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Date Pickers */}
              <View style={styles.dateSection}>
                <View style={styles.dateRow}>
                  <View style={styles.dateField}>
                    <ResponsiveText variant="sm" style={styles.label} numberOfLines={1}>
                      Start Date & Time
                    </ResponsiveText>
                    <Pressable
                      style={styles.dateButton}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Calendar size={18} color="#6b7280" />
                      <ResponsiveText variant="sm" style={styles.dateText} numberOfLines={1}>
                        {new Date(watch("start_date")).toLocaleString()}
                      </ResponsiveText>
                    </Pressable>
                    {showStartDatePicker && (
                      <DateTimePicker
                        value={tempStartDate}
                        mode="datetime"
                        display="default"
                        onChange={handleStartDateChange}
                        minimumDate={new Date()}
                      />
                    )}
                  </View>
                  <View style={styles.dateField}>
                    <ResponsiveText variant="sm" style={styles.label} numberOfLines={1}>
                      End Date & Time
                    </ResponsiveText>
                    <Pressable
                      style={styles.dateButton}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Calendar size={18} color="#6b7280" />
                      <ResponsiveText variant="sm" style={styles.dateText} numberOfLines={1}>
                        {new Date(watch("end_date")).toLocaleString()}
                      </ResponsiveText>
                    </Pressable>
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={tempEndDate}
                        mode="datetime"
                        display="default"
                        onChange={handleEndDateChange}
                        minimumDate={new Date(watch("start_date"))}
                      />
                    )}
                  </View>
                </View>
                {errors.start_date && (
                  <ResponsiveText variant="xs" style={styles.errorText} numberOfLines={2}>
                    {errors.start_date.message}
                  </ResponsiveText>
                )}
                {errors.end_date && (
                  <ResponsiveText variant="xs" style={styles.errorText} numberOfLines={2}>
                    {errors.end_date.message}
                  </ResponsiveText>
                )}
              </View>

              {/* Service Selection */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ResponsiveText variant="sm" style={styles.sectionLabel} numberOfLines={1}>
                    Select Services ({watchedServiceIds?.length || 0} selected)
                  </ResponsiveText>
                  <View style={styles.selectionModeButtons}>
                    <Pressable
                      style={[
                        styles.modeButton,
                        serviceSelectionMode === "individual" && styles.modeButtonActive,
                      ]}
                      onPress={() => setServiceSelectionMode("individual")}
                    >
                      <ResponsiveText variant="xs" style={styles.modeButtonText} numberOfLines={1}>
                        Individual
                      </ResponsiveText>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.modeButton,
                        serviceSelectionMode === "branch" && styles.modeButtonActive,
                      ]}
                      onPress={() => setServiceSelectionMode("branch")}
                    >
                      <ResponsiveText variant="xs" style={styles.modeButtonText} numberOfLines={1}>
                        By Branch
                      </ResponsiveText>
                    </Pressable>
                  </View>
                </View>

                {serviceSelectionMode === "individual" && (
                  <View style={styles.serviceSelectionContainer}>
                    <View style={styles.bulkActions}>
                      <Pressable style={styles.bulkButton} onPress={handleSelectAll}>
                        <ResponsiveText variant="xs" style={styles.bulkButtonText} numberOfLines={1}>
                          Select All
                        </ResponsiveText>
                      </Pressable>
                      <Pressable style={styles.bulkButton} onPress={handleDeselectAll}>
                        <ResponsiveText variant="xs" style={styles.bulkButtonText} numberOfLines={1}>
                          Deselect All
                        </ResponsiveText>
                      </Pressable>
                    </View>
                    <ScrollView
                      style={styles.servicesList}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      {filteredServices.map((service) => {
                        const isSelected = watchedServiceIds?.includes(service.id);
                        return (
                          <Pressable
                            key={service.id}
                            style={[
                              styles.serviceItem,
                              isSelected && styles.serviceItemSelected,
                            ]}
                            onPress={() => handleServiceToggle(service.id)}
                          >
                            <View style={styles.serviceCheckbox}>
                              {isSelected && <Check size={16} color="#ec4899" />}
                            </View>
                            <View style={styles.serviceInfo}>
                              <ResponsiveText variant="sm" style={styles.serviceName} numberOfLines={1}>
                                {service.title}
                              </ResponsiveText>
                              <ResponsiveText variant="xs" style={styles.serviceDetails} numberOfLines={1}>
                                {service.branch} • {service.price}₱
                              </ResponsiveText>
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {serviceSelectionMode === "branch" && (
                  <ScrollView
                    style={styles.branchSelectionContainer}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                  >
                    {(["NAILS", "SKIN", "LASHES", "MASSAGE"] as Branch[]).map((branch) => {
                      const branchServices = servicesByBranch[branch];
                      const allSelected =
                        branchServices.length > 0 &&
                        branchServices.every((s) =>
                          watchedServiceIds?.includes(s.id)
                        );
                      const someSelected = branchServices.some((s) =>
                        watchedServiceIds?.includes(s.id)
                      );

                      return (
                        <View key={branch} style={styles.branchGroup}>
                          <Pressable
                            style={styles.branchGroupHeader}
                            onPress={() => {
                              if (allSelected) {
                                // Deselect all in branch
                                const newIds = (watchedServiceIds || []).filter(
                                  (id) => !branchServices.some((s) => s.id === id)
                                );
                                setValue("service_ids", newIds, {
                                  shouldValidate: true,
                                });
                              } else {
                                // Select all in branch
                                const branchIds = branchServices.map((s) => s.id);
                                const newIds = [
                                  ...new Set([...(watchedServiceIds || []), ...branchIds]),
                                ];
                                setValue("service_ids", newIds, {
                                  shouldValidate: true,
                                });
                              }
                            }}
                          >
                            <View style={styles.branchCheckbox}>
                              {allSelected && <Check size={16} color="#ec4899" />}
                              {someSelected && !allSelected && (
                                <View style={styles.branchCheckboxPartial} />
                              )}
                            </View>
                            <ResponsiveText variant="sm" style={styles.branchGroupTitle} numberOfLines={1}>
                              {branch} ({branchServices.length} services)
                            </ResponsiveText>
                          </Pressable>
                          <View style={styles.branchServicesList}>
                            {branchServices.map((service) => {
                              const isSelected = watchedServiceIds?.includes(service.id);
                              return (
                                <Pressable
                                  key={service.id}
                                  style={[
                                    styles.serviceItem,
                                    isSelected && styles.serviceItemSelected,
                                  ]}
                                  onPress={() => handleServiceToggle(service.id)}
                                >
                                  <View style={styles.serviceCheckbox}>
                                    {isSelected && <Check size={16} color="#ec4899" />}
                                  </View>
                                  <View style={styles.serviceInfo}>
                                    <ResponsiveText variant="sm" style={styles.serviceName} numberOfLines={1}>
                                      {service.title}
                                    </ResponsiveText>
                                    <ResponsiveText variant="xs" style={styles.serviceDetails} numberOfLines={1}>
                                      {service.price}₱
                                    </ResponsiveText>
                                  </View>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}

                {errors.service_ids && (
                  <ResponsiveText variant="xs" style={styles.errorText} numberOfLines={2}>
                    {errors.service_ids.message}
                  </ResponsiveText>
                )}
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmit(onSubmit)}
                disabled={createMutation.isPending || updateMutation.isPending}
                style={[
                  styles.submitButton,
                  (createMutation.isPending || updateMutation.isPending) &&
                    styles.submitButtonDisabled,
                ]}
              >
                <LinearGradient
                  colors={
                    createMutation.isPending || updateMutation.isPending
                      ? ["#d1d5db", "#9ca3af"]
                      : ["#ec4899", "#d946ef"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <ResponsiveText
                      variant="md"
                      style={styles.submitButtonText}
                      numberOfLines={1}
                    >
                      {existingDiscount ? "Update Discount" : "Create Discount"}
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
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: scaleDimension(24),
    borderTopRightRadius: scaleDimension(24),
    maxHeight: percentageHeight(90),
    paddingBottom: scaleDimension(40),
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
  },
  closeButton: {
    padding: scaleDimension(8),
  },
  form: {
    paddingHorizontal: scaleDimension(24),
    paddingTop: scaleDimension(24),
  },
  section: {
    marginBottom: scaleDimension(20),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleDimension(12),
  },
  sectionLabel: {
    color: "#374151",
    fontWeight: "600",
    marginBottom: scaleDimension(8),
  },
  fieldContainer: {
    marginBottom: scaleDimension(16),
  },
  label: {
    color: "#374151",
    fontWeight: "500",
    marginBottom: scaleDimension(8),
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: scaleDimension(12),
    paddingHorizontal: scaleDimension(16),
    paddingVertical: scaleDimension(12),
    fontSize: scaleDimension(16),
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    marginTop: scaleDimension(4),
  },
  radioGroup: {
    flexDirection: "row",
    gap: scaleDimension(12),
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: scaleDimension(12),
    borderRadius: scaleDimension(12),
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    flex: 1,
  },
  radioOptionActive: {
    borderColor: "#ec4899",
    backgroundColor: "#fdf2f8",
  },
  radioCircle: {
    width: scaleDimension(20),
    height: scaleDimension(20),
    borderRadius: scaleDimension(10),
    borderWidth: 2,
    borderColor: "#d1d5db",
    marginRight: scaleDimension(8),
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleInner: {
    width: scaleDimension(10),
    height: scaleDimension(10),
    borderRadius: scaleDimension(5),
    backgroundColor: "#ec4899",
  },
  radioLabel: {
    color: "#111827",
    fontWeight: "500",
  },
  branchButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleDimension(8),
  },
  branchButton: {
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(8),
    borderRadius: scaleDimension(8),
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
  branchButtonActive: {
    borderColor: "#ec4899",
    backgroundColor: "#fdf2f8",
  },
  branchButtonText: {
    color: "#111827",
    fontWeight: "500",
  },
  dateSection: {
    marginBottom: scaleDimension(20),
  },
  dateRow: {
    flexDirection: "row",
    gap: scaleDimension(12),
  },
  dateField: {
    flex: 1,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: scaleDimension(12),
    paddingHorizontal: scaleDimension(16),
    paddingVertical: scaleDimension(12),
    backgroundColor: "#f9fafb",
  },
  dateText: {
    color: "#111827",
    fontWeight: "500",
  },
  selectionModeButtons: {
    flexDirection: "row",
    gap: scaleDimension(8),
  },
  modeButton: {
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(6),
    borderRadius: scaleDimension(8),
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
  modeButtonActive: {
    borderColor: "#ec4899",
    backgroundColor: "#fdf2f8",
  },
  modeButtonText: {
    color: "#111827",
    fontWeight: "500",
  },
  serviceSelectionContainer: {
    maxHeight: scaleDimension(300),
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: scaleDimension(12),
    backgroundColor: "#f9fafb",
  },
  bulkActions: {
    flexDirection: "row",
    gap: scaleDimension(8),
    padding: scaleDimension(12),
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  bulkButton: {
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(6),
    borderRadius: scaleDimension(8),
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  bulkButtonText: {
    color: "#111827",
    fontWeight: "500",
  },
  servicesList: {
    maxHeight: scaleDimension(250),
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: scaleDimension(12),
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    gap: scaleDimension(12),
  },
  serviceItemSelected: {
    backgroundColor: "#fdf2f8",
  },
  serviceCheckbox: {
    width: scaleDimension(20),
    height: scaleDimension(20),
    borderRadius: scaleDimension(4),
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  serviceInfo: {
    flex: 1,
    minWidth: 0,
  },
  serviceName: {
    color: "#111827",
    fontWeight: "500",
  },
  serviceDetails: {
    color: "#6b7280",
    marginTop: scaleDimension(2),
  },
  branchSelectionContainer: {
    maxHeight: scaleDimension(400),
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: scaleDimension(12),
    backgroundColor: "#f9fafb",
  },
  branchGroup: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  branchGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: scaleDimension(12),
    backgroundColor: "white",
    gap: scaleDimension(12),
  },
  branchCheckbox: {
    width: scaleDimension(20),
    height: scaleDimension(20),
    borderRadius: scaleDimension(4),
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  branchCheckboxPartial: {
    width: scaleDimension(10),
    height: scaleDimension(10),
    borderRadius: scaleDimension(2),
    backgroundColor: "#ec4899",
  },
  branchGroupTitle: {
    color: "#111827",
    fontWeight: "600",
  },
  branchServicesList: {
    paddingLeft: scaleDimension(44),
  },
  submitButton: {
    marginTop: scaleDimension(8),
    borderRadius: scaleDimension(12),
    overflow: "hidden",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    paddingVertical: scaleDimension(16),
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "white",
    fontWeight: "600",
  },
});

