import { ResponsiveText } from "@/components/ui/ResponsiveText";
import type { Database } from "@/database.types";
import { getServiceAppointmentSteps } from "@/lib/actions/appointmentSessionActions";
import {
  createServiceAction,
  updateServiceAction,
} from "@/lib/actions/serviceActions";
import { capitalizeWords } from "@/lib/utils";
import { percentageHeight, scaleDimension } from "@/lib/utils/responsive";
import { supabase } from "@/lib/utils/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Plus, Trash2, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";
import { FormField } from "../form/FormField";
import { queryClient } from "../Providers/TanstackProvider";
import { useToast } from "../ui/toast";

type Service = Database["public"]["Tables"]["service"]["Row"];
type Branch = Database["public"]["Enums"]["branch"];

const appointmentStepSchema = z.object({
  stepOrder: z.number().int().positive(),
  serviceIdForStep: z.number().int().positive(),
  recommendedAfterDays: z.number().int().min(0),
  label: z.string().optional().nullable(),
});

const serviceSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    price: z.coerce.number().positive("Price must be greater than 0"),
    duration_minutes: z.coerce
      .number()
      .int()
      .positive("Duration must be at least 1"),
    branch: z.enum(["NAILS", "SKIN", "LASHES", "MASSAGE"]),
    category: z.string().optional(),
    is_active: z.boolean().default(true),
    requires_appointments: z.boolean().default(false),
    total_appointments: z.preprocess((val) => {
      // Convert empty string to null
      if (val === "" || val === null || val === undefined) return null;
      return val;
    }, z.coerce.number().int().positive().optional().nullable()),
  })
  .refine(
    (data) => {
      // If requires_appointments is true, total_appointments must be set
      if (data.requires_appointments) {
        return (
          data.total_appointments !== null &&
          data.total_appointments !== undefined &&
          data.total_appointments > 0
        );
      }
      return true;
    },
    {
      message:
        "Total appointments is required when multi-appointment is enabled",
      path: ["total_appointments"],
    }
  );

type ServiceFormData = z.infer<typeof serviceSchema>;
type AppointmentStep = z.infer<typeof appointmentStepSchema>;

interface ServiceFormModalProps {
  visible: boolean;
  onClose: () => void;
  existingService?: Service | null;
  onSuccess?: () => void;
}

export default function ServiceFormModal({
  visible,
  onClose,
  existingService,
  onSuccess,
}: ServiceFormModalProps) {
  const isEditMode = !!existingService;
  const toast = useToast();
  const [appointmentSteps, setAppointmentSteps] = useState<AppointmentStep[]>(
    []
  );

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema) as any,
    defaultValues: existingService
      ? {
          title: existingService.title,
          description: existingService.description || "",
          price: existingService.price,
          duration_minutes: existingService.duration_minutes,
          branch: existingService.branch,
          category: existingService.category || "",
          is_active: existingService.is_active ?? true,
          requires_appointments: existingService.requires_appointments ?? false,
          total_appointments: existingService.total_appointments || null,
        }
      : {
          title: "",
          description: "",
          price: 0,
          duration_minutes: 30,
          branch: "NAILS",
          category: "",
          is_active: true,
          requires_appointments: false,
          total_appointments: null,
        },
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const watchedBranch = watch("branch");
  const watchedIsActive = watch("is_active");
  const watchedRequiresAppointments = watch("requires_appointments");
  const watchedTotalAppointments = watch("total_appointments");
  const iconSize = scaleDimension(24);

  // Fetch services for appointment step selection
  const { data: services } = useQuery({
    queryKey: ["services", watchedBranch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service")
        .select("id, title")
        .eq("is_active", true)
        .eq("branch", watchedBranch || "NAILS")
        .order("title");
      if (error) throw error;
      return data;
    },
    enabled: !!watchedBranch && watchedRequiresAppointments,
  });

  // Load existing appointment steps when editing
  useEffect(() => {
    if (visible && existingService && existingService.requires_appointments) {
      getServiceAppointmentSteps(existingService.id).then((result) => {
        if (result.success && result.data) {
          const steps = result.data.map((step) => ({
            stepOrder: step.step_order,
            serviceIdForStep: step.service_id_for_step,
            recommendedAfterDays: step.recommended_after_days,
            label: step.label,
          }));
          setAppointmentSteps(steps);
          if (steps.length > 0) {
            setValue("total_appointments", steps.length);
          }
        }
      });
    } else if (visible && !existingService) {
      setAppointmentSteps([]);
    }
  }, [visible, existingService, setValue]);

  // Reset form when modal opens or existingService changes (for edit mode)
  useEffect(() => {
    if (visible) {
      if (existingService) {
        // Pre-populate form with existing service data
        reset({
          title: existingService.title,
          description: existingService.description || "",
          price: existingService.price,
          duration_minutes: existingService.duration_minutes,
          branch: existingService.branch,
          category: existingService.category || "",
          is_active: existingService.is_active ?? true,
          requires_appointments: existingService.requires_appointments ?? false,
          total_appointments: existingService.total_appointments || null,
        });
      } else {
        // Reset to default values for create mode
        reset({
          title: "",
          description: "",
          price: 0,
          duration_minutes: 30,
          branch: "NAILS",
          category: "",
          is_active: true,
          requires_appointments: false,
          total_appointments: null,
        });
        setAppointmentSteps([]);
      }
    }
  }, [visible, existingService, reset]);

  // Handle modal close - reset form
  const handleClose = () => {
    reset();
    onClose();
  };

  const createMutation = useMutation({
    mutationFn: createServiceAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-services"] });
        queryClient.invalidateQueries({ queryKey: ["services"] });
        toast.success("Service Created", "Service created successfully");
        reset();
        onClose();
        onSuccess?.();
      } else {
        toast.error("Error", result.error || "Failed to create service");
      }
    },
    onError: (error) => {
      toast.error("Error", error.message || "Failed to create service");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ServiceFormData) => {
      if (!existingService) throw new Error("No service to update");
      return updateServiceAction(existingService.id, data);
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-services"] });
        queryClient.invalidateQueries({ queryKey: ["services"] });
        toast.success("Service Updated", "Service updated successfully");
        onClose();
        onSuccess?.();
      } else {
        toast.error("Error", result.error || "Failed to update service");
      }
    },
    onError: (error) => {
      toast.error("Error", error.message || "Failed to update service");
    },
  });

  const addAppointmentStep = () => {
    const nextOrder = appointmentSteps.length + 1;
    const newStep: AppointmentStep = {
      stepOrder: nextOrder,
      serviceIdForStep: existingService?.id || 0, // Default to current service
      recommendedAfterDays: 7, // Default 7 days
      label: `Step ${nextOrder}`,
    };
    setAppointmentSteps([...appointmentSteps, newStep]);
    setValue("total_appointments", nextOrder);
  };

  const removeAppointmentStep = (index: number) => {
    const updated = appointmentSteps.filter((_, i) => i !== index);
    // Reorder steps
    const reordered = updated.map((step, i) => ({
      ...step,
      stepOrder: i + 1,
    }));
    setAppointmentSteps(reordered);
    setValue("total_appointments", reordered.length || null);
  };

  const updateAppointmentStep = (
    index: number,
    updates: Partial<AppointmentStep>
  ) => {
    const updated = [...appointmentSteps];
    updated[index] = { ...updated[index], ...updates };
    setAppointmentSteps(updated);
  };

  const onSubmit = (data: ServiceFormData) => {
    console.log("onSubmit called with data:", data);
    console.log("appointmentSteps:", appointmentSteps);
    console.log("requires_appointments:", data.requires_appointments);

    // Validate appointment steps if requires_appointments is true
    if (data.requires_appointments) {
      if (!data.total_appointments || data.total_appointments < 1) {
        toast.error("Error", "Total appointments must be at least 1");
        return;
      }
      if (appointmentSteps.length !== data.total_appointments) {
        toast.error(
          "Error",
          `Please configure ${data.total_appointments} appointment step(s). Currently have ${appointmentSteps.length} step(s).`
        );
        return;
      }
      // Validate all steps have valid service IDs
      for (const step of appointmentSteps) {
        if (!step.serviceIdForStep || step.serviceIdForStep <= 0) {
          toast.error(
            "Error",
            "All appointment steps must have a valid service"
          );
          return;
        }
      }
    } else {
      // If not requiring appointments, clear appointment steps
      // This ensures we don't send stale step data
      if (appointmentSteps.length > 0) {
        setAppointmentSteps([]);
      }
    }

    // Format text fields with capitalizeWords
    const formattedData: any = {
      ...data,
      title: capitalizeWords(data.title),
      category: data.category ? capitalizeWords(data.category) : data.category,
      appointment_steps: data.requires_appointments
        ? appointmentSteps
        : undefined,
    };

    console.log("Calling mutation with formattedData:", formattedData);

    if (isEditMode) {
      updateMutation.mutate(formattedData);
    } else {
      createMutation.mutate(formattedData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
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
                {isEditMode ? "Edit Service" : "Create Service"}
              </ResponsiveText>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <X size={iconSize} color="#374151" />
              </Pressable>
            </View>

            <View style={styles.form}>
              <FormField<ServiceFormData>
                control={control as any}
                name="title"
                label="Service Title *"
                placeholder="e.g., Manicure, Facial, etc."
              />

              <FormField<ServiceFormData>
                control={control as any}
                name="description"
                label="Description"
                placeholder="Service description (optional)"
                multiline
                numberOfLines={3}
              />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <FormField<ServiceFormData>
                    control={control as any}
                    name="price"
                    label="Price (₱) *"
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfWidth}>
                  <FormField<ServiceFormData>
                    control={control as any}
                    name="duration_minutes"
                    label="Duration (minutes) *"
                    placeholder="30"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <ResponsiveText
                  variant="sm"
                  style={styles.label}
                  numberOfLines={1}
                >
                  Branch *
                </ResponsiveText>
                <View style={styles.branchContainer}>
                  {(["NAILS", "SKIN", "LASHES", "MASSAGE"] as const).map(
                    (branch) => (
                      <Pressable
                        key={branch}
                        onPress={() => form.setValue("branch", branch)}
                        style={[
                          styles.branchButton,
                          watchedBranch === branch
                            ? styles.branchButtonSelected
                            : styles.branchButtonUnselected,
                        ]}
                      >
                        <ResponsiveText
                          variant="sm"
                          style={[
                            styles.branchButtonText,
                            watchedBranch === branch
                              ? styles.branchButtonTextSelected
                              : styles.branchButtonTextUnselected,
                          ]}
                          numberOfLines={1}
                        >
                          {branch}
                        </ResponsiveText>
                      </Pressable>
                    )
                  )}
                </View>
                {errors.branch && (
                  <ResponsiveText
                    variant="xs"
                    style={styles.errorText}
                    numberOfLines={2}
                  >
                    {errors.branch.message}
                  </ResponsiveText>
                )}
              </View>

              <FormField<ServiceFormData>
                control={control as any}
                name="category"
                label="Category"
                placeholder="e.g., Nails, Facial, Massage (optional)"
              />

              <View style={styles.formSection}>
                <Pressable
                  onPress={() => form.setValue("is_active", !watchedIsActive)}
                  style={styles.toggleContainer}
                >
                  <ResponsiveText
                    variant="sm"
                    style={styles.label}
                    numberOfLines={1}
                  >
                    Active
                  </ResponsiveText>
                  <View
                    style={[
                      styles.toggle,
                      watchedIsActive && styles.toggleActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        watchedIsActive && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>
              </View>

              <View style={styles.formSection}>
                <Pressable
                  onPress={() =>
                    form.setValue(
                      "requires_appointments",
                      !watchedRequiresAppointments
                    )
                  }
                  style={styles.toggleContainer}
                >
                  <ResponsiveText
                    variant="sm"
                    style={styles.label}
                    numberOfLines={1}
                  >
                    Requires Multiple Appointments
                  </ResponsiveText>
                  <View
                    style={[
                      styles.toggle,
                      watchedRequiresAppointments && styles.toggleActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        watchedRequiresAppointments && styles.toggleThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>
              </View>

              {watchedRequiresAppointments && (
                <>
                  <View style={styles.formSection}>
                    <FormField<ServiceFormData>
                      control={control as any}
                      name="total_appointments"
                      label="Total Appointments *"
                      placeholder="e.g., 3"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formSection}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: scaleDimension(12),
                      }}
                    >
                      <ResponsiveText variant="sm" style={styles.label}>
                        Appointment Steps *
                      </ResponsiveText>
                      <Pressable
                        onPress={addAppointmentStep}
                        style={styles.addStepButton}
                      >
                        <Plus size={18} color="#ec4899" />
                        <ResponsiveText
                          variant="sm"
                          style={styles.addStepButtonText}
                        >
                          Add Step
                        </ResponsiveText>
                      </Pressable>
                    </View>

                    {appointmentSteps.map((step, index) => (
                      <View
                        key={index}
                        style={[
                          styles.stepContainer,
                          index < appointmentSteps.length - 1 &&
                            styles.stepContainerWithBorder,
                        ]}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: scaleDimension(8),
                          }}
                        >
                          <ResponsiveText variant="sm" style={styles.stepLabel}>
                            Step {step.stepOrder}
                          </ResponsiveText>
                          <Pressable
                            onPress={() => removeAppointmentStep(index)}
                            style={styles.deleteStepButton}
                          >
                            <Trash2 size={16} color="#ef4444" />
                          </Pressable>
                        </View>

                        <View style={styles.stepFields}>
                          <View style={styles.halfWidth}>
                            <ResponsiveText
                              variant="xs"
                              style={styles.stepFieldLabel}
                            >
                              Service *
                            </ResponsiveText>
                            <View style={styles.selectContainer}>
                              {services && services.length > 0 ? (
                                <ScrollView
                                  style={styles.selectScrollView}
                                  nestedScrollEnabled
                                >
                                  {services.map((service) => (
                                    <Pressable
                                      key={service.id}
                                      onPress={() =>
                                        updateAppointmentStep(index, {
                                          serviceIdForStep: service.id,
                                        })
                                      }
                                      style={[
                                        styles.selectOption,
                                        step.serviceIdForStep === service.id &&
                                          styles.selectOptionSelected,
                                      ]}
                                    >
                                      <ResponsiveText
                                        variant="sm"
                                        style={[
                                          styles.selectOptionText,
                                          step.serviceIdForStep ===
                                            service.id &&
                                            styles.selectOptionTextSelected,
                                        ]}
                                      >
                                        {service.title}
                                      </ResponsiveText>
                                    </Pressable>
                                  ))}
                                </ScrollView>
                              ) : (
                                <ResponsiveText
                                  variant="xs"
                                  style={styles.helperText}
                                >
                                  No services available
                                </ResponsiveText>
                              )}
                            </View>
                          </View>

                          <View style={styles.halfWidth}>
                            <ResponsiveText
                              variant="xs"
                              style={styles.stepFieldLabel}
                            >
                              Days After Previous *
                            </ResponsiveText>
                            <TextInput
                              style={styles.stepInput}
                              value={step.recommendedAfterDays.toString()}
                              onChangeText={(text) => {
                                const days = parseInt(text) || 0;
                                updateAppointmentStep(index, {
                                  recommendedAfterDays: days,
                                });
                              }}
                              keyboardType="numeric"
                              placeholder="7"
                            />
                          </View>
                        </View>

                        <View style={styles.stepFields}>
                          <View style={{ flex: 1 }}>
                            <ResponsiveText
                              variant="xs"
                              style={styles.stepFieldLabel}
                            >
                              Label (Optional)
                            </ResponsiveText>
                            <TextInput
                              style={styles.stepInput}
                              value={step.label || ""}
                              onChangeText={(text) =>
                                updateAppointmentStep(index, {
                                  label: text || null,
                                })
                              }
                              placeholder='e.g., "Initial", "Follow-Up"'
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                        </View>
                      </View>
                    ))}

                    {appointmentSteps.length === 0 && (
                      <ResponsiveText variant="xs" style={styles.helperText}>
                        Add appointment steps to configure the multi-appointment
                        flow
                      </ResponsiveText>
                    )}
                  </View>
                </>
              )}

              <Pressable
                onPress={() => {
                  console.log("Button pressed");
                  console.log("Form errors:", errors);
                  console.log("Form values:", form.getValues());
                  handleSubmit(onSubmit, (errors) => {
                    console.log("Form validation errors:", errors);
                    toast.error(
                      "Validation Error",
                      "Please fix the form errors before submitting"
                    );
                  })();
                }}
                disabled={isPending}
                style={[styles.submitButton, isPending && { opacity: 0.6 }]}
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
                    <ResponsiveText
                      variant="md"
                      style={styles.submitButtonText}
                      numberOfLines={1}
                    >
                      {isEditMode ? "Update Service" : "Create Service"}
                    </ResponsiveText>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  branchContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleDimension(8),
  },
  branchButton: {
    paddingHorizontal: scaleDimension(16),
    paddingVertical: scaleDimension(10),
    borderRadius: scaleDimension(8),
    borderWidth: 2,
    minWidth: scaleDimension(80),
  },
  branchButtonSelected: {
    backgroundColor: "#ec4899",
    borderColor: "#ec4899",
  },
  branchButtonUnselected: {
    backgroundColor: "white",
    borderColor: "#e5e7eb",
  },
  branchButtonText: {
    fontWeight: "500",
    textAlign: "center",
  },
  branchButtonTextSelected: {
    color: "white",
  },
  branchButtonTextUnselected: {
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
  addStepButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(4),
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(6),
    borderRadius: scaleDimension(8),
    backgroundColor: "#fdf2f8",
    borderWidth: 1,
    borderColor: "#fbcfe8",
  },
  addStepButtonText: {
    color: "#ec4899",
    fontWeight: "600",
  },
  stepContainer: {
    backgroundColor: "#f9fafb",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(16),
    marginBottom: scaleDimension(12),
  },
  stepContainerWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: scaleDimension(16),
    marginBottom: scaleDimension(16),
  },
  stepLabel: {
    fontWeight: "600",
    color: "#111827",
  },
  deleteStepButton: {
    padding: scaleDimension(4),
  },
  stepFields: {
    flexDirection: "row",
    gap: scaleDimension(12),
    marginTop: scaleDimension(8),
  },
  stepFieldLabel: {
    color: "#374151",
    fontWeight: "500",
    marginBottom: scaleDimension(4),
  },
  stepInput: {
    borderRadius: scaleDimension(8),
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(10),
    fontSize: scaleDimension(14),
    color: "#111827",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  selectContainer: {
    backgroundColor: "white",
    borderRadius: scaleDimension(8),
    borderWidth: 1,
    borderColor: "#e5e7eb",
    maxHeight: scaleDimension(150),
  },
  selectScrollView: {
    maxHeight: scaleDimension(150),
  },
  selectOption: {
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(10),
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  selectOptionSelected: {
    backgroundColor: "#fdf2f8",
    borderLeftWidth: 3,
    borderLeftColor: "#ec4899",
  },
  selectOptionText: {
    color: "#374151",
  },
  selectOptionTextSelected: {
    color: "#ec4899",
    fontWeight: "600",
  },
  helperText: {
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: scaleDimension(4),
  },
});
