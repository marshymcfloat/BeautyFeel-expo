import { ResponsiveText } from "@/components/ui/ResponsiveText";
import type { Database } from "@/database.types";
import {
  createServiceAction,
  updateServiceAction,
} from "@/lib/actions/serviceActions";
import { capitalizeWords } from "@/lib/utils";
import { percentageHeight, scaleDimension } from "@/lib/utils/responsive";
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
import { z } from "zod";
import { FormField } from "../form/FormField";
import { queryClient } from "../Providers/TanstackProvider";
import { Toast, ToastDescription, ToastTitle, useToast } from "../ui/toast";

type Service = Database["public"]["Tables"]["service"]["Row"];
type Branch = Database["public"]["Enums"]["branch"];

const serviceSchema = z.object({
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
});

type ServiceFormData = z.infer<typeof serviceSchema>;

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

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: existingService
      ? {
          title: existingService.title,
          description: existingService.description || "",
          price: existingService.price,
          duration_minutes: existingService.duration_minutes,
          branch: existingService.branch,
          category: existingService.category || "",
          is_active: existingService.is_active ?? true,
        }
      : {
          title: "",
          description: "",
          price: 0,
          duration_minutes: 30,
          branch: "NAILS",
          category: "",
          is_active: true,
        },
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = form;

  const watchedBranch = watch("branch");
  const watchedIsActive = watch("is_active");
  const iconSize = scaleDimension(24);

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
        });
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
        toast.show({
          placement: "top",
          duration: 2000,
          render: ({ id }) => (
            <Toast action="success" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>Service created successfully</ToastDescription>
            </Toast>
          ),
        });
        reset();
        onClose();
        onSuccess?.();
      } else {
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => (
            <Toast action="error" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>
                {result.error || "Failed to create service"}
              </ToastDescription>
            </Toast>
          ),
        });
      }
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
        toast.show({
          placement: "top",
          duration: 2000,
          render: ({ id }) => (
            <Toast action="success" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>Service updated successfully</ToastDescription>
            </Toast>
          ),
        });
        onClose();
        onSuccess?.();
      } else {
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => (
            <Toast action="error" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>
                {result.error || "Failed to update service"}
              </ToastDescription>
            </Toast>
          ),
        });
      }
    },
  });

  const onSubmit = (data: ServiceFormData) => {
    // Format text fields with capitalizeWords
    const formattedData: ServiceFormData = {
      ...data,
      title: capitalizeWords(data.title),
      category: data.category ? capitalizeWords(data.category) : data.category,
    };

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
      <View style={styles.modalContainer}>
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
});
