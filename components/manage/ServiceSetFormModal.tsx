import { ResponsiveText } from "@/components/ui/ResponsiveText";
import type { Database } from "@/database.types";
import { getAllServicesAction } from "@/lib/actions/serviceActions";
import type { ServiceSetWithItems } from "@/lib/actions/serviceSetActions";
import {
  createServiceSetAction,
  updateServiceSetAction,
} from "@/lib/actions/serviceSetActions";
import { capitalizeWords } from "@/lib/utils";
import { percentageHeight, scaleDimension } from "@/lib/utils/responsive";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Check, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { z } from "zod";
import { FormField } from "../form/FormField";
import { queryClient } from "../Providers/TanstackProvider";
import { Toast, ToastDescription, ToastTitle, useToast } from "../ui/toast";

type Service = Database["public"]["Tables"]["service"]["Row"];
type Branch = Database["public"]["Enums"]["branch"];

const serviceSetSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  price: z.coerce.number().positive("Price must be greater than 0"),
  branch: z.enum(["NAILS", "SKIN", "LASHES", "MASSAGE"]),
  is_active: z.boolean(),
  service_ids: z.array(z.number()).min(1, "At least one service is required"),
});

interface ServicePrice {
  service_id: number;
  adjusted_price: number | null;
}

type ServiceSetFormData = z.infer<typeof serviceSetSchema>;

interface ServiceSetFormModalProps {
  visible: boolean;
  onClose: () => void;
  existingServiceSet?: ServiceSetWithItems | null;
  onSuccess?: () => void;
}

export default function ServiceSetFormModal({
  visible,
  onClose,
  existingServiceSet,
  onSuccess,
}: ServiceSetFormModalProps) {
  const isEditMode = !!existingServiceSet;
  const toast = useToast();
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [servicePrices, setServicePrices] = useState<
    Map<number, number | null>
  >(new Map());

  const form = useForm<ServiceSetFormData>({
    resolver: zodResolver(serviceSetSchema),
    defaultValues: existingServiceSet
      ? {
          title: existingServiceSet.title,
          description: existingServiceSet.description || "",
          price: existingServiceSet.price,
          branch: existingServiceSet.branch,
          is_active: existingServiceSet.is_active,
          service_ids:
            existingServiceSet.service_set_items?.map(
              (item) => item.service_id
            ) || [],
        }
      : {
          title: "",
          description: "",
          price: 0,
          branch: "NAILS",
          is_active: true,
          service_ids: [],
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
  const iconSize = scaleDimension(24);
  const smallIconSize = scaleDimension(20);

  // Reset form when modal opens or existingServiceSet changes (for edit mode)
  useEffect(() => {
    if (visible) {
      if (existingServiceSet) {
        // Pre-populate form with existing service set data
        const serviceIds =
          existingServiceSet.service_set_items?.map(
            (item) => item.service_id
          ) || [];
        reset({
          title: existingServiceSet.title,
          description: existingServiceSet.description || "",
          price: existingServiceSet.price,
          branch: existingServiceSet.branch,
          is_active: existingServiceSet.is_active,
          service_ids: serviceIds,
        });
        setSelectedServiceIds(serviceIds);
      } else {
        // Reset to default values for create mode
        reset({
          title: "",
          description: "",
          price: 0,
          branch: "NAILS",
          is_active: true,
          service_ids: [],
        });
        setSelectedServiceIds([]);
      }
    }
  }, [visible, existingServiceSet, reset]);

  // Handle modal close - reset form
  const handleClose = () => {
    reset();
    setSelectedServiceIds([]);
    setServicePrices(new Map());
    onClose();
  };

  // Fetch all active services from all branches
  const { data: servicesData } = useQuery({
    queryKey: ["all-services"],
    queryFn: getAllServicesAction,
  });

  const allServices: Service[] = React.useMemo(() => {
    if (!servicesData?.success || !servicesData.data) {
      return [];
    }
    const data: Service[] = servicesData.data as Service[];
    return data.filter((s: Service) => (s.is_active ?? true) !== false);
  }, [servicesData]);

  // Filter services to show only those from the selected branch
  const services: Service[] = allServices.filter(
    (s) => s.branch === watchedBranch
  );

  // Get all selected services (from any branch) for display in summary
  const selectedServices: Service[] = allServices.filter((s) =>
    selectedServiceIds.includes(s.id)
  );

  const toggleService = (serviceId: number) => {
    const newSelection = selectedServiceIds.includes(serviceId)
      ? selectedServiceIds.filter((id) => id !== serviceId)
      : [...selectedServiceIds, serviceId];

    setSelectedServiceIds(newSelection);
    setValue("service_ids", newSelection, { shouldValidate: true });

    // Initialize price when service is added (null means use original service price)
    if (!selectedServiceIds.includes(serviceId)) {
      const newPrices = new Map(servicePrices);
      newPrices.set(serviceId, null); // Default to null (use original price)
      setServicePrices(newPrices);
    } else {
      // Remove price when service is removed
      const newPrices = new Map(servicePrices);
      newPrices.delete(serviceId);
      setServicePrices(newPrices);
    }
  };

  const updateServicePrice = (serviceId: number, price: string) => {
    const newPrices = new Map(servicePrices);
    const numPrice = price.trim() === "" ? null : parseFloat(price);
    newPrices.set(
      serviceId,
      numPrice !== null && !isNaN(numPrice) && numPrice > 0 ? numPrice : null
    );
    setServicePrices(newPrices);
  };

  // Calculate total price based on selected services and their prices
  const calculatedPrice = React.useMemo(() => {
    if (selectedServices.length === 0) return 0;

    return selectedServices.reduce((total, service) => {
      const adjustedPrice = servicePrices.get(service.id);
      const priceToUse =
        adjustedPrice !== null &&
        adjustedPrice !== undefined &&
        adjustedPrice > 0
          ? adjustedPrice
          : service.price;
      return total + priceToUse;
    }, 0);
  }, [selectedServices, servicePrices]);

  // Auto-update the price field when calculated price changes
  React.useEffect(() => {
    if (selectedServices.length > 0 && calculatedPrice > 0) {
      setValue("price", calculatedPrice, { shouldValidate: true });
    } else if (selectedServices.length === 0) {
      setValue("price", 0, { shouldValidate: true });
    }
  }, [calculatedPrice, selectedServices.length, setValue]);

  const createMutation = useMutation({
    mutationFn: createServiceSetAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["service-sets"] });
        queryClient.invalidateQueries({ queryKey: ["all-service-sets"] });
        toast.show({
          placement: "top",
          duration: 2000,
          render: ({ id }) => (
            <Toast action="success" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>
                Service set created successfully
              </ToastDescription>
            </Toast>
          ),
        });
        reset();
        setSelectedServiceIds([]);
        setServicePrices(new Map());
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
                {result.error || "Failed to create service set"}
              </ToastDescription>
            </Toast>
          ),
        });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ServiceSetFormData) => {
      if (!existingServiceSet) throw new Error("No service set to update");
      return updateServiceSetAction(existingServiceSet.id, data);
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["service-sets"] });
        queryClient.invalidateQueries({ queryKey: ["all-service-sets"] });
        toast.show({
          placement: "top",
          duration: 2000,
          render: ({ id }) => (
            <Toast action="success" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>
                Service set updated successfully
              </ToastDescription>
            </Toast>
          ),
        });
        reset();
        setSelectedServiceIds([]);
        setServicePrices(new Map());
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
                {result.error || "Failed to update service set"}
              </ToastDescription>
            </Toast>
          ),
        });
      }
    },
  });

  const onSubmit = (data: ServiceSetFormData): void => {
    // Format text fields with capitalizeWords
    const formattedData = {
      ...data,
      title: capitalizeWords(data.title),
      service_prices: Array.from(servicePrices.entries()).map(
        ([serviceId, adjustedPrice]) => ({
          service_id: serviceId,
          adjusted_price: adjustedPrice,
        })
      ),
    };

    if (isEditMode) {
      updateMutation.mutate(formattedData as any);
    } else {
      createMutation.mutate(formattedData as any);
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
                {isEditMode ? "Edit Service Set" : "Create Service Set"}
              </ResponsiveText>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <X size={iconSize} color="#374151" />
              </Pressable>
            </View>

            <View style={styles.form}>
              <FormField<ServiceSetFormData>
                control={control as any}
                name="title"
                label="Service Set Title *"
                placeholder="e.g., Full Package, Complete Care, etc."
              />

              <FormField<ServiceSetFormData>
                control={control as any}
                name="description"
                label="Description"
                placeholder="Service set description (optional)"
                multiline
                numberOfLines={3}
              />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <View style={styles.priceDisplayContainer}>
                    <ResponsiveText
                      variant="sm"
                      style={styles.label}
                      numberOfLines={1}
                    >
                      Total Price (₱) *
                    </ResponsiveText>
                    <ResponsiveText
                      variant="xs"
                      style={styles.priceDisplayHint}
                      numberOfLines={2}
                    >
                      Automatically calculated from selected services
                    </ResponsiveText>
                    <View style={styles.calculatedPriceDisplay}>
                      <ResponsiveText
                        variant="2xl"
                        style={styles.calculatedPriceText}
                        numberOfLines={1}
                      >
                        ₱{calculatedPrice.toFixed(2)}
                      </ResponsiveText>
                    </View>
                  </View>
                  {/* Hidden Controller for price field to maintain form validation */}
                  <Controller
                    control={control}
                    name="price"
                    render={() => <View />}
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
                <ResponsiveText
                  variant="xs"
                  style={styles.labelHint}
                  numberOfLines={3}
                >
                  Select a branch to view and add services from that branch. You
                  can switch branches to add services from multiple branches.
                </ResponsiveText>
                <View style={styles.branchContainer}>
                  {(["NAILS", "SKIN", "LASHES", "MASSAGE"] as const).map(
                    (branch) => (
                      <Pressable
                        key={branch}
                        onPress={() => {
                          form.setValue("branch", branch);
                        }}
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

              <View style={styles.formSection}>
                <ResponsiveText
                  variant="sm"
                  style={styles.label}
                  numberOfLines={1}
                >
                  Select Services *
                </ResponsiveText>
                {selectedServices.length > 0 && (
                  <View style={styles.selectedServicesContainer}>
                    <ResponsiveText
                      variant="xs"
                      style={styles.selectedServicesLabel}
                      numberOfLines={2}
                    >
                      Selected ({selectedServices.length}): Adjust prices for
                      commission calculation (leave empty to use original price)
                    </ResponsiveText>
                    <ScrollView
                      style={styles.selectedServicesListContainer}
                      contentContainerStyle={styles.selectedServicesList}
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                    >
                      {selectedServices.map((service) => {
                        const adjustedPrice = servicePrices.get(service.id);
                        const displayPrice =
                          adjustedPrice !== null && adjustedPrice !== undefined
                            ? adjustedPrice.toString()
                            : "";
                        return (
                          <View
                            key={service.id}
                            style={styles.selectedServiceWithPrice}
                          >
                            <View style={styles.selectedServiceInfo}>
                              <ResponsiveText
                                variant="sm"
                                style={styles.selectedServiceText}
                                numberOfLines={2}
                              >
                                {service.title} ({service.branch})
                              </ResponsiveText>
                              <ResponsiveText
                                variant="xs"
                                style={styles.originalPriceText}
                                numberOfLines={1}
                              >
                                Original: ₱{service.price}
                              </ResponsiveText>
                            </View>
                            <View style={styles.priceInputContainer}>
                              <ResponsiveText
                                variant="xs"
                                style={styles.priceInputLabel}
                                numberOfLines={1}
                              >
                                Adjusted:
                              </ResponsiveText>
                              <View style={styles.priceInputWrapper}>
                                <ResponsiveText
                                  variant="sm"
                                  style={styles.currencySymbol}
                                  numberOfLines={1}
                                >
                                  ₱
                                </ResponsiveText>
                                <TextInput
                                  style={styles.priceInput}
                                  placeholder={`₱${service.price}`}
                                  value={displayPrice}
                                  onChangeText={(text) =>
                                    updateServicePrice(service.id, text)
                                  }
                                  keyboardType="numeric"
                                  placeholderTextColor="#9CA3AF"
                                />
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
                {services.length === 0 ? (
                  <ResponsiveText
                    variant="sm"
                    style={styles.emptyText}
                    numberOfLines={2}
                  >
                    No active services available for {watchedBranch} branch
                  </ResponsiveText>
                ) : (
                  <ScrollView
                    style={styles.servicesListContainer}
                    contentContainerStyle={styles.servicesList}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {services.map((service) => {
                      const isSelected = selectedServiceIds.includes(
                        service.id
                      );
                      return (
                        <Pressable
                          key={service.id}
                          onPress={() => toggleService(service.id)}
                          style={[
                            styles.serviceItem,
                            isSelected && styles.serviceItemSelected,
                          ]}
                        >
                          <View style={styles.serviceItemContent}>
                            <ResponsiveText
                              variant="md"
                              style={styles.serviceItemTitle}
                              numberOfLines={2}
                            >
                              {service.title}
                            </ResponsiveText>
                            <ResponsiveText
                              variant="sm"
                              style={styles.serviceItemDetails}
                              numberOfLines={1}
                            >
                              ₱{service.price} • {service.duration_minutes} min
                            </ResponsiveText>
                          </View>
                          {isSelected && (
                            <View style={styles.checkIcon}>
                              <Check size={smallIconSize} color="white" />
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
                {errors.service_ids && (
                  <ResponsiveText
                    variant="xs"
                    style={styles.errorText}
                    numberOfLines={2}
                  >
                    {errors.service_ids.message}
                  </ResponsiveText>
                )}
              </View>

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
                      {isEditMode ? "Update Service Set" : "Create Service Set"}
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
  labelHint: {
    color: "#6b7280",
    marginBottom: scaleDimension(8),
    fontStyle: "italic",
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
  servicesListContainer: {
    maxHeight: scaleDimension(300),
  },
  servicesList: {
    gap: scaleDimension(8),
    paddingBottom: scaleDimension(8),
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: scaleDimension(12),
    borderRadius: scaleDimension(8),
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "white",
  },
  serviceItemSelected: {
    borderColor: "#ec4899",
    backgroundColor: "#fdf2f8",
  },
  serviceItemContent: {
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  serviceItemTitle: {
    fontWeight: "600",
    color: "#111827",
    marginBottom: scaleDimension(4),
  },
  serviceItemDetails: {
    color: "#6b7280",
  },
  checkIcon: {
    width: scaleDimension(24),
    height: scaleDimension(24),
    borderRadius: scaleDimension(12),
    backgroundColor: "#ec4899",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#6b7280",
    fontStyle: "italic",
    padding: scaleDimension(12),
  },
  selectedServicesContainer: {
    marginBottom: scaleDimension(12),
    padding: scaleDimension(12),
    backgroundColor: "#f9fafb",
    borderRadius: scaleDimension(8),
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  selectedServicesLabel: {
    fontWeight: "600",
    color: "#374151",
    marginBottom: scaleDimension(8),
  },
  selectedServicesListContainer: {
    maxHeight: scaleDimension(200),
  },
  selectedServicesList: {
    gap: scaleDimension(10),
    paddingBottom: scaleDimension(8),
  },
  selectedServiceWithPrice: {
    padding: scaleDimension(12),
    backgroundColor: "white",
    borderRadius: scaleDimension(8),
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  selectedServiceInfo: {
    marginBottom: scaleDimension(8),
  },
  selectedServiceText: {
    color: "#111827",
    fontWeight: "600",
    marginBottom: scaleDimension(4),
  },
  originalPriceText: {
    color: "#6b7280",
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
  },
  priceInputLabel: {
    fontWeight: "500",
    color: "#374151",
    minWidth: scaleDimension(60),
  },
  priceInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: scaleDimension(8),
    backgroundColor: "#f9fafb",
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(8),
  },
  currencySymbol: {
    color: "#6b7280",
    fontWeight: "500",
    marginRight: scaleDimension(4),
  },
  priceInput: {
    flex: 1,
    fontSize: scaleDimension(14),
    color: "#111827",
    padding: 0,
  },
  priceDisplayContainer: {
    marginBottom: scaleDimension(16),
  },
  priceDisplayHint: {
    color: "#6b7280",
    marginBottom: scaleDimension(8),
    fontStyle: "italic",
  },
  calculatedPriceDisplay: {
    backgroundColor: "#f0fdf4",
    borderWidth: 2,
    borderColor: "#22c55e",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(16),
    alignItems: "center",
  },
  calculatedPriceText: {
    fontWeight: "700",
    color: "#15803d",
  },
  branchBadge: {
    fontWeight: "600",
    color: "#6b7280",
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
