import { ResponsiveText } from "@/components/ui/ResponsiveText";
import type { Database } from "@/database.types";
import { Tables } from "@/database.types";
import {
  createGiftCertificateAction,
  giftCertificateCodeExists,
  sendGiftCertificateEmailAction,
} from "@/lib/actions/giftCertificateActions";
import type { ServiceSetWithItems } from "@/lib/actions/serviceSetActions";
import { formatCurrency } from "@/lib/utils/currency";
import {
  generateGiftCertificateCode,
  generateUniqueGiftCertificateCode,
  isValidGiftCertificateCode,
} from "@/lib/utils/giftCertificateCodeGenerator";
import { percentageHeight, scaleDimension } from "@/lib/utils/responsive";
import { supabase } from "@/lib/utils/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar, Plus, RefreshCw, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
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
import { z } from "zod";
import CustomerSearchInput from "../bookings/CustomerSearchInput";
import { SelectedItemsList } from "../bookings/SelectedItemsList";
import { FormField } from "../form/FormField";
import { queryClient } from "../Providers/TanstackProvider";
import { useToast } from "../ui/toast";

const giftCertificateSchema = z.object({
  code: z
    .string()
    .length(6, "Gift certificate code must be exactly 6 characters")
    .refine(
      (code) => isValidGiftCertificateCode(code),
      "Gift certificate code must start with GC followed by 4 uppercase letters or numbers (e.g., GC1234)"
    ),
  customerId: z.number().nullable().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  expiresOn: z.string().nullable().optional(),
});

type GiftCertificateFormData = z.infer<typeof giftCertificateSchema>;

type Service = Database["public"]["Tables"]["service"]["Row"];

interface SelectedService {
  serviceId: number;
  quantity: number;
  service: Service;
}

interface SelectedServiceSet {
  serviceSetId: number;
  quantity: number;
  serviceSet: ServiceSetWithItems;
}

interface GiftCertificateFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function GiftCertificateFormModal({
  visible,
  onClose,
  onSuccess,
}: GiftCertificateFormModalProps) {
  const toast = useToast();
  const [selectedCustomer, setSelectedCustomer] =
    useState<Tables<"customer"> | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(
    []
  );
  const [selectedServiceSets, setSelectedServiceSets] = useState<
    SelectedServiceSet[]
  >([]);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [servicePickerType, setServicePickerType] = useState<
    "services" | "serviceSets"
  >("services");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const form = useForm<GiftCertificateFormData>({
    resolver: zodResolver(giftCertificateSchema),
    defaultValues: {
      code: generateGiftCertificateCode(),
      customerId: null,
      customerName: "",
      customerEmail: "",
      expiresOn: null,
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

  const watchedCode = watch("code");
  const watchedCustomerId = watch("customerId");
  const watchedCustomerName = watch("customerName");

  // Fetch services and service sets for picker
  // CHANGED: Query Key is now unique ("active-services-list") to avoid cache collisions with "all-services"
  const { data: servicesData, isLoading: isLoadingServices } = useQuery({
    queryKey: ["active-services-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service")
        .select("*")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return (data || []) as Service[];
    },
    enabled: visible, // Only fetch when modal is visible
  });

  // CHANGED: Query Key is now unique ("active-service-sets-list")
  const { data: serviceSetsData, isLoading: isLoadingServiceSets } = useQuery({
    queryKey: ["active-service-sets-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_set")
        .select(
          `
          *,
          service_set_items (
            *,
            service:service_id (*)
          )
        `
        )
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return (data || []) as ServiceSetWithItems[];
    },
    enabled: visible, // Only fetch when modal is visible
  });

  // CHANGED: Robust check for array type to prevent .map crashes
  const services = Array.isArray(servicesData) ? servicesData : [];
  const serviceSets = Array.isArray(serviceSetsData) ? serviceSetsData : [];

  // Generate new code when modal opens
  useEffect(() => {
    if (visible) {
      let isMounted = true;

      generateUniqueGiftCertificateCode(giftCertificateCodeExists)
        .then((newCode) => {
          if (isMounted) {
            setValue("code", newCode);
          }
        })
        .catch((error) => {
          console.error("Error generating gift certificate code:", error);
          if (isMounted) {
            toast.error("Error", "Failed to generate code. Please try again.");
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [visible, setValue, toast]);

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      reset();
      setSelectedCustomer(null);
      setCustomerName("");
      setCustomerEmail("");
      setSelectedServices([]);
      setSelectedServiceSets([]);
      setShowDatePicker(false);
    }
  }, [visible, reset]);

  const handleGenerateCode = async () => {
    try {
      const newCode = await generateUniqueGiftCertificateCode(
        giftCertificateCodeExists
      );
      setValue("code", newCode);
    } catch (error) {
      toast.error("Error", "Failed to generate code. Please try again.");
    }
  };

  const handleCustomerSelect = (
    customerId: number,
    customer: Tables<"customer">
  ) => {
    setSelectedCustomer(customer);
    setValue("customerId", customerId);
    setValue("customerName", customer.name);
    setCustomerName(customer.name);
    setCustomerEmail(customer.email || "");
    setValue("customerEmail", customer.email || "");
  };

  const handleCustomerNameChange = (name: string) => {
    setCustomerName(name);
    setValue("customerName", name);
    if (name.trim() === "") {
      setValue("customerId", null);
      setSelectedCustomer(null);
    }
  };

  const handleCustomerClear = () => {
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerEmail("");
    setValue("customerId", null);
    setValue("customerName", "");
    setValue("customerEmail", "");
  };

  const addService = (service: Service) => {
    const existing = selectedServices.find((s) => s.serviceId === service.id);
    let updated: SelectedService[];
    if (existing) {
      updated = selectedServices.map((s) =>
        s.serviceId === service.id
          ? { ...s, quantity: Math.min(s.quantity + 1, 10) }
          : s
      );
    } else {
      updated = [
        ...selectedServices,
        { serviceId: service.id, quantity: 1, service },
      ];
    }
    setSelectedServices(updated);
    setShowServicePicker(false);
  };

  const removeService = (serviceId: number) => {
    setSelectedServices(
      selectedServices.filter((s) => s.serviceId !== serviceId)
    );
  };

  const updateQuantity = (serviceId: number, delta: number) => {
    setSelectedServices(
      selectedServices.map((s) =>
        s.serviceId === serviceId
          ? { ...s, quantity: Math.max(1, Math.min(10, s.quantity + delta)) }
          : s
      )
    );
  };

  const addServiceSet = (serviceSet: ServiceSetWithItems) => {
    const existing = selectedServiceSets.find(
      (s) => s.serviceSetId === serviceSet.id
    );
    let updated: SelectedServiceSet[];
    if (existing) {
      updated = selectedServiceSets.map((s) =>
        s.serviceSetId === serviceSet.id
          ? { ...s, quantity: Math.min(s.quantity + 1, 10) }
          : s
      );
    } else {
      updated = [
        ...selectedServiceSets,
        { serviceSetId: serviceSet.id, quantity: 1, serviceSet },
      ];
    }
    setSelectedServiceSets(updated);
    setShowServicePicker(false);
  };

  const removeServiceSet = (serviceSetId: number) => {
    setSelectedServiceSets(
      selectedServiceSets.filter((s) => s.serviceSetId !== serviceSetId)
    );
  };

  const updateServiceSetQuantity = (serviceSetId: number, delta: number) => {
    setSelectedServiceSets(
      selectedServiceSets.map((s) =>
        s.serviceSetId === serviceSetId
          ? { ...s, quantity: Math.max(1, Math.min(10, s.quantity + delta)) }
          : s
      )
    );
  };

  const createMutation = useMutation({
    mutationFn: createGiftCertificateAction,
    onSuccess: async (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-gift-certificates"] });

        // Send email if customer email is provided
        if (customerEmail && customerEmail.trim()) {
          const servicesList = selectedServices.map((s) => ({
            name: s.service.title,
            quantity: s.quantity,
          }));
          const serviceSetsList = selectedServiceSets.map((s) => ({
            name: s.serviceSet.title,
            quantity: s.quantity,
          }));

          await sendGiftCertificateEmailAction({
            email: customerEmail.trim(),
            customerName: customerName || selectedCustomer?.name || "Customer",
            giftCertificateCode: watchedCode,
            services: servicesList.length > 0 ? servicesList : undefined,
            serviceSets:
              serviceSetsList.length > 0 ? serviceSetsList : undefined,
            expiresOn: watch("expiresOn"),
          });
        }

        toast.success(
          "Gift Certificate Created",
          customerEmail && customerEmail.trim()
            ? "Gift certificate created and email sent successfully"
            : "Gift certificate created successfully"
        );
        reset();
        setSelectedCustomer(null);
        setCustomerName("");
        setCustomerEmail("");
        setSelectedServices([]);
        setSelectedServiceSets([]);
        setShowDatePicker(false);
        onClose();
        onSuccess?.();
      } else {
        toast.error(
          "Error",
          result.error || "Failed to create gift certificate"
        );
      }
    },
    onError: (error) => {
      toast.error(
        "Error",
        error.message || "Failed to create gift certificate"
      );
    },
  });

  const handleClose = () => {
    reset();
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerEmail("");
    setSelectedServices([]);
    setSelectedServiceSets([]);
    setShowDatePicker(false);
    onClose();
  };

  const iconSize = scaleDimension(24);

  const onSubmit = (data: GiftCertificateFormData) => {
    if (selectedServices.length === 0 && selectedServiceSets.length === 0) {
      toast.error("Error", "Please select at least one service or service set");
      return;
    }

    if (!data.customerName || data.customerName.trim().length === 0) {
      toast.error("Error", "Please enter a customer name");
      return;
    }

    createMutation.mutate({
      code: data.code.toUpperCase(),
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail || null,
      expiresOn: data.expiresOn || null,
      serviceIds: selectedServices.map((s) => ({
        serviceId: s.serviceId,
        quantity: s.quantity,
      })),
      serviceSetIds: selectedServiceSets.map((s) => ({
        serviceSetId: s.serviceSetId,
        quantity: s.quantity,
      })),
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
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
                Create Gift Certificate
              </ResponsiveText>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <X size={iconSize} color="#374151" />
              </Pressable>
            </View>

            <View style={styles.form}>
              <View style={styles.codeSection}>
                <FormField
                  control={control}
                  name="code"
                  label="Gift Certificate Code (6 characters)"
                  placeholder="GC1234"
                  autoCapitalize="characters"
                  maxLength={6}
                />
                <Pressable
                  onPress={handleGenerateCode}
                  style={styles.generateButton}
                >
                  <RefreshCw size={18} color="#ec4899" />
                  <ResponsiveText
                    variant="sm"
                    style={styles.generateButtonText}
                    numberOfLines={1}
                  >
                    Generate
                  </ResponsiveText>
                </Pressable>
              </View>

              <View style={styles.formSection}>
                <ResponsiveText
                  variant="sm"
                  style={styles.sectionLabel}
                  numberOfLines={1}
                >
                  Customer (Optional)
                </ResponsiveText>
                <CustomerSearchInput
                  value={watchedCustomerId || null}
                  customerName={watchedCustomerName || customerName}
                  onSelect={handleCustomerSelect}
                  onNameChange={handleCustomerNameChange}
                  onClear={handleCustomerClear}
                  error={errors.customerName?.message}
                />
              </View>

              <View style={styles.formSection}>
                <ResponsiveText
                  variant="sm"
                  style={styles.sectionLabel}
                  numberOfLines={1}
                >
                  Customer Email (Optional)
                </ResponsiveText>
                <TextInput
                  style={[
                    styles.input,
                    errors.customerEmail
                      ? styles.inputError
                      : styles.inputNormal,
                  ]}
                  placeholder="customer@example.com"
                  value={customerEmail}
                  onChangeText={(text) => {
                    setCustomerEmail(text);
                    setValue("customerEmail", text);
                  }}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.customerEmail && (
                  <ResponsiveText
                    variant="xs"
                    style={styles.errorText}
                    numberOfLines={2}
                  >
                    {errors.customerEmail.message}
                  </ResponsiveText>
                )}
              </View>

              <Controller
                control={control}
                name="expiresOn"
                render={({
                  field: { onChange, value },
                  fieldState: { error },
                }) => {
                  const selectedDate = value ? new Date(value) : null;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  useEffect(() => {
                    if (value) {
                      setTempDate(new Date(value));
                    } else if (visible) {
                      setTempDate(new Date());
                    }
                  }, [value, visible]);

                  const handleDateChange = (event: any, date?: Date) => {
                    if (Platform.OS === "android") {
                      setShowDatePicker(false);
                    }

                    if (event.type === "dismissed") {
                      setShowDatePicker(false);
                      return;
                    }

                    if (date) {
                      if (Platform.OS === "ios") {
                        setTempDate(date);
                      } else {
                        const dateStr = date.toISOString().split("T")[0];
                        onChange(dateStr);
                        setShowDatePicker(false);
                      }
                    }
                  };

                  const handleDone = () => {
                    const dateStr = tempDate.toISOString().split("T")[0];
                    onChange(dateStr);
                    setShowDatePicker(false);
                  };

                  return (
                    <View>
                      <ResponsiveText
                        variant="sm"
                        style={styles.sectionLabel}
                        numberOfLines={1}
                      >
                        Expiration Date (Optional)
                      </ResponsiveText>
                      <Pressable
                        onPress={() => setShowDatePicker(true)}
                        style={[
                          styles.input,
                          styles.dateInput,
                          error ? styles.inputError : styles.inputNormal,
                        ]}
                      >
                        <Calendar size={20} color="#6b7280" />
                        <ResponsiveText
                          variant="sm"
                          style={[
                            styles.dateText,
                            !selectedDate && styles.datePlaceholder,
                          ]}
                          numberOfLines={1}
                        >
                          {selectedDate
                            ? selectedDate.toLocaleDateString()
                            : "No expiration date"}
                        </ResponsiveText>
                        {selectedDate && (
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              onChange(null);
                            }}
                            style={styles.clearDateButton}
                          >
                            <X size={16} color="#6b7280" />
                          </Pressable>
                        )}
                      </Pressable>
                      {showDatePicker && (
                        <>
                          {Platform.OS === "ios" ? (
                            <Modal
                              visible={showDatePicker}
                              transparent
                              animationType="slide"
                              onRequestClose={() => setShowDatePicker(false)}
                            >
                              <View style={styles.datePickerModalOverlay}>
                                <View style={styles.datePickerModalContent}>
                                  <View style={styles.datePickerModalHeader}>
                                    <Pressable
                                      onPress={() => setShowDatePicker(false)}
                                      style={styles.datePickerCancelButton}
                                    >
                                      <ResponsiveText
                                        variant="sm"
                                        style={styles.datePickerCancelText}
                                        numberOfLines={1}
                                      >
                                        Cancel
                                      </ResponsiveText>
                                    </Pressable>
                                    <ResponsiveText
                                      variant="md"
                                      style={styles.datePickerTitle}
                                      numberOfLines={1}
                                    >
                                      Select Date
                                    </ResponsiveText>
                                    <Pressable
                                      onPress={handleDone}
                                      style={styles.datePickerDoneButton}
                                    >
                                      <ResponsiveText
                                        variant="sm"
                                        style={styles.datePickerDoneText}
                                        numberOfLines={1}
                                      >
                                        Done
                                      </ResponsiveText>
                                    </Pressable>
                                  </View>
                                  <DateTimePicker
                                    value={tempDate}
                                    mode="date"
                                    display="spinner"
                                    minimumDate={today}
                                    onChange={handleDateChange}
                                  />
                                </View>
                              </View>
                            </Modal>
                          ) : (
                            <DateTimePicker
                              value={tempDate}
                              mode="date"
                              display="default"
                              minimumDate={today}
                              onChange={handleDateChange}
                            />
                          )}
                        </>
                      )}
                      {error && (
                        <ResponsiveText
                          variant="xs"
                          style={styles.errorText}
                          numberOfLines={2}
                        >
                          {error.message}
                        </ResponsiveText>
                      )}
                    </View>
                  );
                }}
              />

              <View style={styles.formSection}>
                <View style={styles.servicesHeader}>
                  <ResponsiveText
                    variant="sm"
                    style={styles.sectionLabel}
                    numberOfLines={1}
                  >
                    Services & Service Sets *
                  </ResponsiveText>
                  <View style={styles.addButtonsContainer}>
                    <Pressable
                      onPress={() => {
                        setServicePickerType("services");
                        setShowServicePicker(true);
                      }}
                      style={styles.addButtonSmall}
                    >
                      <Plus size={18} color="#ec4899" />
                      <ResponsiveText
                        variant="sm"
                        style={styles.addButtonSmallText}
                        numberOfLines={1}
                      >
                        Service
                      </ResponsiveText>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setServicePickerType("serviceSets");
                        setShowServicePicker(true);
                      }}
                      style={styles.addButtonSmall}
                    >
                      <Plus size={18} color="#ec4899" />
                      <ResponsiveText
                        variant="sm"
                        style={styles.addButtonSmallText}
                        numberOfLines={1}
                      >
                        Set
                      </ResponsiveText>
                    </Pressable>
                  </View>
                </View>
                <SelectedItemsList
                  services={selectedServices}
                  serviceSets={selectedServiceSets}
                  onRemoveService={removeService}
                  onUpdateServiceQuantity={updateQuantity}
                  onRemoveServiceSet={removeServiceSet}
                  onUpdateServiceSetQuantity={updateServiceSetQuantity}
                />
              </View>

              <Pressable
                onPress={handleSubmit(onSubmit)}
                disabled={createMutation.isPending}
                style={styles.submitButton}
              >
                <LinearGradient
                  colors={["#ec4899", "#d946ef"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <ResponsiveText
                      variant="md"
                      style={styles.submitButtonText}
                      numberOfLines={1}
                    >
                      Create Gift Certificate
                    </ResponsiveText>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Service/Service Set Picker Modal */}
      {showServicePicker && (
        <Modal
          visible={showServicePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowServicePicker(false)}
        >
          <View style={styles.pickerOverlay}>
            <Pressable
              style={styles.pickerBackdrop}
              onPress={() => setShowServicePicker(false)}
            />
            <View style={styles.pickerContent}>
              <View style={styles.pickerHeader}>
                <ResponsiveText
                  variant="lg"
                  style={styles.pickerTitle}
                  numberOfLines={1}
                >
                  Select{" "}
                  {servicePickerType === "services" ? "Service" : "Service Set"}
                </ResponsiveText>
                <Pressable
                  onPress={() => setShowServicePicker(false)}
                  style={styles.pickerCloseButton}
                >
                  <X size={24} color="#374151" />
                </Pressable>
              </View>
              <ScrollView style={styles.pickerScrollView}>
                {servicePickerType === "services" ? (
                  isLoadingServices ? (
                    <View style={styles.pickerLoading}>
                      <ActivityIndicator size="small" color="#ec4899" />
                    </View>
                  ) : services.length === 0 ? (
                    <View style={styles.pickerEmpty}>
                      <ResponsiveText
                        variant="sm"
                        style={styles.pickerEmptyText}
                        numberOfLines={2}
                      >
                        No services available
                      </ResponsiveText>
                    </View>
                  ) : (
                    services.map((service) => (
                      <Pressable
                        key={service.id}
                        onPress={() => addService(service)}
                        style={styles.pickerItem}
                      >
                        <View style={styles.pickerItemInfo}>
                          <ResponsiveText
                            variant="sm"
                            style={styles.pickerItemTitle}
                            numberOfLines={1}
                          >
                            {service.title}
                          </ResponsiveText>
                          <ResponsiveText
                            variant="xs"
                            style={styles.pickerItemSubtitle}
                            numberOfLines={1}
                          >
                            {formatCurrency(service.price)} •{" "}
                            {service.duration_minutes} min
                          </ResponsiveText>
                        </View>
                        <Plus size={20} color="#ec4899" />
                      </Pressable>
                    ))
                  )
                ) : servicePickerType === "serviceSets" ? (
                  isLoadingServiceSets ? (
                    <View style={styles.pickerLoading}>
                      <ActivityIndicator size="small" color="#ec4899" />
                    </View>
                  ) : serviceSets.length === 0 ? (
                    <View style={styles.pickerEmpty}>
                      <ResponsiveText
                        variant="sm"
                        style={styles.pickerEmptyText}
                        numberOfLines={2}
                      >
                        No service sets available
                      </ResponsiveText>
                    </View>
                  ) : (
                    serviceSets.map((serviceSet) => (
                      <Pressable
                        key={serviceSet.id}
                        onPress={() => addServiceSet(serviceSet)}
                        style={styles.pickerItem}
                      >
                        <View style={styles.pickerItemInfo}>
                          <ResponsiveText
                            variant="sm"
                            style={styles.pickerItemTitle}
                            numberOfLines={1}
                          >
                            {serviceSet.title}
                          </ResponsiveText>
                          <ResponsiveText
                            variant="xs"
                            style={styles.pickerItemSubtitle}
                            numberOfLines={1}
                          >
                            {formatCurrency(serviceSet.price)}
                          </ResponsiveText>
                        </View>
                        <Plus size={20} color="#ec4899" />
                      </Pressable>
                    ))
                  )
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
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
  codeSection: {
    marginBottom: scaleDimension(16),
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(6),
    marginTop: scaleDimension(8),
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(8),
    backgroundColor: "#fdf2f8",
    borderRadius: scaleDimension(8),
    alignSelf: "flex-start",
  },
  generateButtonText: {
    color: "#ec4899",
    fontWeight: "600",
  },
  formSection: {
    marginBottom: scaleDimension(16),
  },
  sectionLabel: {
    color: "#374151",
    fontWeight: "600",
    marginBottom: scaleDimension(8),
  },
  input: {
    borderRadius: scaleDimension(12),
    paddingHorizontal: scaleDimension(16),
    paddingVertical: scaleDimension(14),
    fontSize: scaleDimension(16),
    color: "#111827",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    minHeight: scaleDimension(52),
  },
  inputNormal: {
    borderColor: "#e5e7eb",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(12),
  },
  dateText: {
    flex: 1,
    color: "#111827",
  },
  datePlaceholder: {
    color: "#9ca3af",
  },
  clearDateButton: {
    padding: scaleDimension(4),
  },
  errorText: {
    color: "#ef4444",
    marginTop: scaleDimension(6),
    marginLeft: scaleDimension(4),
  },
  servicesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleDimension(8),
  },
  addButtonsContainer: {
    flexDirection: "row",
    gap: scaleDimension(8),
  },
  addButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(4),
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(6),
    backgroundColor: "#fdf2f8",
    borderRadius: scaleDimension(8),
  },
  addButtonSmallText: {
    color: "#ec4899",
    fontWeight: "600",
  },
  submitButton: {
    marginTop: scaleDimension(16),
    borderRadius: scaleDimension(12),
    overflow: "hidden",
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
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  datePickerModalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: scaleDimension(24),
    borderTopRightRadius: scaleDimension(24),
    paddingBottom: scaleDimension(40),
  },
  datePickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scaleDimension(24),
    paddingTop: scaleDimension(16),
    paddingBottom: scaleDimension(12),
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  datePickerCancelButton: {
    padding: scaleDimension(8),
  },
  datePickerCancelText: {
    color: "#6b7280",
  },
  datePickerTitle: {
    fontWeight: "600",
    color: "#111827",
  },
  datePickerDoneButton: {
    padding: scaleDimension(8),
  },
  datePickerDoneText: {
    color: "#ec4899",
    fontWeight: "600",
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  pickerContent: {
    backgroundColor: "white",
    borderTopLeftRadius: scaleDimension(24),
    borderTopRightRadius: scaleDimension(24),
    maxHeight: percentageHeight(80),
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scaleDimension(24),
    paddingTop: scaleDimension(24),
    paddingBottom: scaleDimension(16),
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  pickerTitle: {
    fontWeight: "bold",
    color: "#111827",
  },
  pickerCloseButton: {
    padding: scaleDimension(8),
  },
  pickerScrollView: {
    maxHeight: percentageHeight(60),
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scaleDimension(24),
    paddingVertical: scaleDimension(16),
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  pickerItemInfo: {
    flex: 1,
    marginRight: scaleDimension(12),
  },
  pickerItemTitle: {
    fontWeight: "600",
    color: "#111827",
    marginBottom: scaleDimension(4),
  },
  pickerItemSubtitle: {
    color: "#6b7280",
  },
  pickerEmpty: {
    padding: scaleDimension(40),
    alignItems: "center",
  },
  pickerEmptyText: {
    color: "#6b7280",
    textAlign: "center",
  },
  pickerLoading: {
    padding: scaleDimension(40),
    alignItems: "center",
  },
});
