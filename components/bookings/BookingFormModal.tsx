import { ResponsiveText } from "@/components/ui/ResponsiveText";
import type { Database } from "@/database.types";
import {
  createBookingAction,
  updateBookingAction,
} from "@/lib/actions/bookingActions";
import type { GiftCertificateWithRelations } from "@/lib/actions/giftCertificateActions";
import type { ServiceSetWithItems } from "@/lib/actions/serviceSetActions";
import { getServiceSetsForBranch } from "@/lib/actions/serviceSetActions";
import { BOOKING_STATUS, SERVICE_STATUS } from "@/lib/utils/constants";
import { percentageHeight, scaleDimension } from "@/lib/utils/responsive";
import { supabase } from "@/lib/utils/supabase";
import {
  createBookingSchema,
  CreateBookingSchema,
} from "@/lib/zod-schemas/booking";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Plus, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { FormField } from "../form/FormField";
import VoucherInput from "../form/Input fields/voucher-input";
import { queryClient } from "../Providers/TanstackProvider";
import { useToast } from "../ui/toast";
import CustomerSearchInput from "./CustomerSearchInput";
import DatePicker from "./DatePicker";
import { SelectedItemsList } from "./SelectedItemsList";
import TimePicker from "./TimePicker";
import type { BookingWithServices } from "./types";

type Customer = Database["public"]["Tables"]["customer"]["Row"];
type Service = Database["public"]["Tables"]["service"]["Row"];

interface BookingFormModalProps {
  visible: boolean;
  onClose: () => void;
  defaultDate?: string;
  existingBooking?: BookingWithServices | null;
  giftCertificate?: GiftCertificateWithRelations | null;
  onSuccess?: () => void;
}

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

export default function BookingFormModal({
  visible,
  onClose,
  defaultDate,
  existingBooking,
  giftCertificate,
  onSuccess,
}: BookingFormModalProps) {
  const isEditMode = !!existingBooking;
  const toast = useToast();
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
  const [isCancelling, setIsCancelling] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  const iconSize = scaleDimension(24);
  const smallIconSize = scaleDimension(18);

  const getInitialValues = () => {
    if (existingBooking) {
      const services =
        existingBooking.service_bookings
          ?.filter((sb) => sb.service_id !== null)
          .map((sb) => ({
            serviceId: sb.service_id!,
            quantity: 1,
          })) || [];

      return {
        customerId: existingBooking.customer_id || 0,
        customerName: existingBooking.customer?.name || "",
        appointmentDate: existingBooking.appointment_date || defaultDate || "",
        appointmentTime: existingBooking.appointment_time || "",
        branch:
          (existingBooking.location as
            | "NAILS"
            | "SKIN"
            | "LASHES"
            | "MASSAGE") || "NAILS",
        customerEmail: existingBooking.customer?.email || "",
        services: services,
        serviceSets: [],
        notes: existingBooking.notes || "",
        voucherCode: "",
        voucher: existingBooking.voucher_id || null,
        grandDiscount: existingBooking.grandDiscount || 0,
      };
    }

    return {
      customerId: 0,
      customerName: "",
      appointmentDate: defaultDate || "",
      appointmentTime: "",
      branch: "NAILS" as const,
      customerEmail: "",
      services: [],
      serviceSets: [],
      notes: "",
      voucherCode: "",
      voucher: null,
      grandDiscount: 0,
    };
  };

  const form = useForm<CreateBookingSchema>({
    resolver: zodResolver(
      createBookingSchema
    ) as unknown as Resolver<CreateBookingSchema>,
    defaultValues: getInitialValues(),
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
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ["services", watchedBranch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service")
        .select("*")
        .eq("is_active", true)
        .eq("branch", watchedBranch || "NAILS")
        .order("title");
      if (error) throw error;
      return data as Service[];
    },
    enabled: !!watchedBranch,
  });

  const { data: serviceSetsData, isLoading: serviceSetsLoading } = useQuery({
    queryKey: ["service-sets", watchedBranch],
    queryFn: async () => {
      if (!watchedBranch) return { success: false, data: [] };
      const result = await getServiceSetsForBranch(watchedBranch || "NAILS");
      return result;
    },
    enabled: !!watchedBranch,
  });

  const serviceSets = serviceSetsData?.success
    ? (serviceSetsData.data as any[])
    : [];

  const watchedDate = watch("appointmentDate");
  const watchedTime = watch("appointmentTime");
  const watchedCustomerEmail = watch("customerEmail");
  const watchedCustomerName = watch("customerName");

  const handleCustomerSelect = (customerId: number, customer: Customer) => {
    setSelectedCustomer(customer);
    setValue("customerId", customerId, { shouldValidate: true });
    setValue("customerName", "", { shouldValidate: true });
    if (customer.email) {
      setValue("customerEmail", customer.email);
    }
  };

  const handleCustomerNameChange = (name: string) => {
    if (!selectedCustomer) {
      setValue("customerName", name, { shouldValidate: true });
      setValue("customerId", 0, { shouldValidate: true });
    }
  };

  const handleCustomerClear = () => {
    setSelectedCustomer(null);
    setValue("customerId", 0, { shouldValidate: true });
    setValue("customerName", "", { shouldValidate: true });
    setValue("customerEmail", "");
  };

  // Reset form when modal opens/closes or when existingBooking/giftCertificate changes
  useEffect(() => {
    if (visible && existingBooking) {
      const initialValues = getInitialValues();
      reset(initialValues);

      if (existingBooking.customer) {
        setSelectedCustomer(existingBooking.customer);
      }
    } else if (visible && !existingBooking) {
      // If gift certificate is provided, pre-fill customer info
      const customerId = giftCertificate?.customer_id || 0;
      const customerName =
        giftCertificate?.customer_name || giftCertificate?.customer?.name || "";
      const customerEmail =
        giftCertificate?.customer_email ||
        giftCertificate?.customer?.email ||
        "";

      reset({
        customerId,
        customerName,
        appointmentDate: defaultDate || "",
        appointmentTime: "",
        branch: "NAILS" as const,
        customerEmail,
        services: [],
        serviceSets: [],
        notes: "",
        voucherCode: "",
        voucher: null,
        grandDiscount: 0,
      });
      setSelectedServices([]);
      setSelectedServiceSets([]);
      if (giftCertificate?.customer) {
        // Fetch full customer data if needed
        setSelectedCustomer({
          id: giftCertificate.customer.id,
          name: giftCertificate.customer.name,
          email: giftCertificate.customer.email,
          phone: null,
          spent: null,
          last_transaction: null,
          created_at: "",
          updated_at: "",
        });
      } else {
        setSelectedCustomer(null);
      }
    }
  }, [visible, existingBooking, giftCertificate, defaultDate, reset]);

  // Map services for edit mode when services data is available
  useEffect(() => {
    if (isEditMode && existingBooking && services) {
      if (existingBooking.service_bookings) {
        const mapped = existingBooking.service_bookings
          .map((sb) => {
            const service = services.find((s) => s.id === sb.service_id);
            if (!service) return null;
            return {
              serviceId: sb.service_id,
              quantity: 1,
              service,
            };
          })
          .filter((s): s is SelectedService => s !== null);
        setSelectedServices(mapped);
      }
    }
  }, [isEditMode, existingBooking, services]);

  useEffect(() => {
    if (isEditMode) return;

    const formServices = watch("services") || [];
    if (formServices.length > 0 && selectedServices.length === 0) {
      const mapped = formServices
        .map((fs) => {
          const service = services?.find((s) => s.id === fs.serviceId);
          if (!service) return null;
          return {
            serviceId: fs.serviceId,
            quantity: fs.quantity,
            service,
          };
        })
        .filter((s): s is SelectedService => s !== null);
      setSelectedServices(mapped);
    }
  }, [services, watch, isEditMode, selectedServices.length]);

  // Clear selected services and service sets when branch changes
  // Use a ref to track the previous branch to avoid clearing on initial mount
  const prevBranchRef = React.useRef<string | undefined>(watchedBranch);

  useEffect(() => {
    if (isEditMode) return;

    // Clear selected services and service sets when branch changes
    // This ensures that services from one branch don't persist when switching to another
    if (
      prevBranchRef.current !== undefined &&
      prevBranchRef.current !== watchedBranch
    ) {
      setSelectedServices([]);
      setSelectedServiceSets([]);
      setValue("services", [], { shouldValidate: true });
      setValue("serviceSets", [], { shouldValidate: true });
    }

    prevBranchRef.current = watchedBranch;
  }, [watchedBranch, isEditMode, setValue]);

  // Pre-fill services and service sets from gift certificate
  useEffect(() => {
    if (isEditMode || !giftCertificate || !visible) return;

    // Load services from gift certificate
    if (
      giftCertificate.services &&
      giftCertificate.services.length > 0 &&
      services
    ) {
      const mappedServices = giftCertificate.services
        .map((gcService) => {
          const service = services.find((s) => s.id === gcService.service_id);
          if (!service || !service.is_active) return null;
          return {
            serviceId: gcService.service_id,
            quantity: gcService.quantity,
            service,
          };
        })
        .filter((s): s is SelectedService => s !== null);

      if (mappedServices.length > 0) {
        setSelectedServices(mappedServices);
        setValue(
          "services",
          mappedServices.map((s) => ({
            serviceId: s.serviceId,
            quantity: s.quantity,
          })),
          { shouldValidate: true }
        );
      }
    }

    // Load service sets from gift certificate
    if (
      giftCertificate.service_sets &&
      giftCertificate.service_sets.length > 0 &&
      serviceSets
    ) {
      const mappedServiceSets = giftCertificate.service_sets
        .map((gcServiceSet) => {
          const serviceSet = serviceSets.find(
            (ss) => ss.id === gcServiceSet.service_set_id
          );
          if (!serviceSet || !serviceSet.is_active) return null;
          return {
            serviceSetId: gcServiceSet.service_set_id,
            quantity: gcServiceSet.quantity,
            serviceSet,
          };
        })
        .filter((ss): ss is SelectedServiceSet => ss !== null);

      if (mappedServiceSets.length > 0) {
        setSelectedServiceSets(mappedServiceSets);
        setValue(
          "serviceSets",
          mappedServiceSets.map((ss) => ({
            serviceSetId: ss.serviceSetId,
            quantity: ss.quantity,
          })),
          { shouldValidate: true }
        );
      }
    }
  }, [giftCertificate, services, serviceSets, visible, isEditMode, setValue]);

  const { mutate: createBooking, isPending: isCreating } = useMutation({
    mutationFn: createBookingAction,
    onSuccess: (data) => {
      if (!data.success) {
        toast.error("Error", data.error);
        return;
      }

      toast.success("Booking Created", "Booking created successfully!");

      queryClient.invalidateQueries({ queryKey: ["services-served-today"] });
      queryClient.invalidateQueries({ queryKey: ["all-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });

      reset({
        customerId: 0,
        customerName: "",
        appointmentDate: defaultDate || "",
        appointmentTime: "",
        branch: "NAILS" as const,
        customerEmail: "",
        services: [],
        serviceSets: [],
        notes: "",
        voucherCode: "",
        voucher: null,
        grandDiscount: 0,
      });
      setSelectedServices([]);
      setSelectedServiceSets([]);
      setSelectedCustomer(null);
      onClose();
      onSuccess?.();
    },
  });

  const hasServedServices = React.useMemo(() => {
    if (!existingBooking?.service_bookings) return false;
    return existingBooking.service_bookings.some(
      (sb) => sb.status === SERVICE_STATUS.SERVED
    );
  }, [existingBooking]);

  const { mutate: updateBooking, isPending: isUpdating } = useMutation({
    mutationFn: (data: {
      appointmentDate: string;
      appointmentTime: string;
      branch: string;
      notes?: string;
      status?:
        | "PENDING"
        | "CONFIRMED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELLED"
        | "NO_SHOW";
    }) => {
      if (!existingBooking) throw new Error("No booking to update");
      setIsCancelling(data.status === BOOKING_STATUS.CANCELLED);
      return updateBookingAction(existingBooking.id, {
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        branch: data.branch as "NAILS" | "SKIN" | "LASHES" | "MASSAGE",
        notes: data.notes,
        status: data.status,
      });
    },
    onSuccess: (data) => {
      if (!data.success) {
        setIsCancelling(false);
        toast.error("Error", data.error);
        return;
      }

      toast.success(
        "Success",
        isCancelling
          ? "Booking cancelled successfully!"
          : "Booking updated successfully!"
      );

      queryClient.invalidateQueries({ queryKey: ["all-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({
        queryKey: ["booking", existingBooking?.id],
      });

      setIsCancelling(false);
      onClose();
      onSuccess?.();
    },
  });

  const handleCancelBooking = () => {
    if (!existingBooking) return;

    if (hasServedServices) {
      Alert.alert(
        "Cannot Cancel Booking",
        "This booking cannot be cancelled because one or more services have already been served.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Cancel Booking",
      `Are you sure you want to cancel this booking for ${
        existingBooking.customer?.name || "this customer"
      }? This action cannot be undone.`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => {
            updateBooking({
              appointmentDate: existingBooking.appointment_date || "",
              appointmentTime: existingBooking.appointment_time || "",
              branch: existingBooking.location || "NAILS",
              notes: existingBooking.notes || "",
              status: BOOKING_STATUS.CANCELLED,
            });
          },
        },
      ]
    );
  };

  const isPending = isCreating || isUpdating;

  const onSubmit = (data: CreateBookingSchema) => {
    if (isEditMode && existingBooking) {
      updateBooking({
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        branch: data.branch,
        notes: data.notes,
      });
      return;
    }

    if (selectedServices.length === 0 && selectedServiceSets.length === 0) {
      toast.error("Error", "Please select at least one service or service set");
      return;
    }

    if (
      (!data.customerId || data.customerId === 0) &&
      (!data.customerName || data.customerName.trim().length === 0)
    ) {
      toast.error("Error", "Please select a customer or enter a customer name");
      return;
    }

    let dateStr = data.appointmentDate.trim();
    let timeStr = data.appointmentTime.trim();

    if (timeStr.includes(":")) {
      const timeParts = timeStr.split(":");
      if (timeParts.length >= 2) {
        const hours = timeParts[0].padStart(2, "0");
        const minutes = timeParts[1].padStart(2, "0");
        timeStr = `${hours}:${minutes}`;
      }
    }

    createBooking({
      ...data,
      appointmentDate: dateStr,
      appointmentTime: timeStr,
      services: selectedServices.map((s) => ({
        serviceId: s.serviceId,
        quantity: s.quantity,
      })),
      serviceSets: selectedServiceSets.map((s) => ({
        serviceSetId: s.serviceSetId,
        quantity: s.quantity,
      })),
    });
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
    setTimeout(() => {
      setValue(
        "services",
        updated.map((s) => ({
          serviceId: s.serviceId,
          quantity: s.quantity,
        })),
        { shouldValidate: true }
      );
    }, 0);
  };

  const removeService = (serviceId: number) => {
    const updated = selectedServices.filter((s) => s.serviceId !== serviceId);
    setSelectedServices(updated);
    setValue(
      "services",
      updated.map((s) => ({
        serviceId: s.serviceId,
        quantity: s.quantity,
      })),
      { shouldValidate: true }
    );
  };

  const updateQuantity = (serviceId: number, delta: number) => {
    const updated = selectedServices.map((s) => {
      if (s.serviceId === serviceId) {
        const newQuantity = Math.max(1, Math.min(10, s.quantity + delta));
        return { ...s, quantity: newQuantity };
      }
      return s;
    });
    setSelectedServices(updated);
    setValue(
      "services",
      updated.map((s) => ({
        serviceId: s.serviceId,
        quantity: s.quantity,
      })),
      { shouldValidate: true }
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
    setTimeout(() => {
      setValue(
        "serviceSets",
        updated.map((s) => ({
          serviceSetId: s.serviceSetId,
          quantity: s.quantity,
        })),
        { shouldValidate: true }
      );
    }, 0);
  };

  const removeServiceSet = (serviceSetId: number) => {
    const updated = selectedServiceSets.filter(
      (s) => s.serviceSetId !== serviceSetId
    );
    setSelectedServiceSets(updated);
    setValue(
      "serviceSets",
      updated.map((s) => ({
        serviceSetId: s.serviceSetId,
        quantity: s.quantity,
      })),
      { shouldValidate: true }
    );
  };

  const updateServiceSetQuantity = (serviceSetId: number, delta: number) => {
    const updated = selectedServiceSets.map((s) => {
      if (s.serviceSetId === serviceSetId) {
        const newQuantity = Math.max(1, Math.min(10, s.quantity + delta));
        return { ...s, quantity: newQuantity };
      }
      return s;
    });
    setSelectedServiceSets(updated);
    setValue(
      "serviceSets",
      updated.map((s) => ({
        serviceSetId: s.serviceSetId,
        quantity: s.quantity,
      })),
      { shouldValidate: true }
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          reset({
            customerId: 0,
            customerName: "",
            appointmentDate: defaultDate || "",
            appointmentTime: "",
            branch: "NAILS" as const,
            customerEmail: "",
            services: [],
            serviceSets: [],
            notes: "",
            voucherCode: "",
            voucher: null,
            grandDiscount: 0,
          });
          setSelectedServices([]);
          setSelectedServiceSets([]);
          setSelectedCustomer(null);
          onClose();
        }}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.backdrop}
            onPress={() => {
              reset({
                customerId: 0,
                customerName: "",
                appointmentDate: defaultDate || "",
                appointmentTime: "",
                branch: "NAILS" as const,
                customerEmail: "",
                services: [],
                serviceSets: [],
                notes: "",
                voucherCode: "",
                voucher: null,
                grandDiscount: 0,
              });
              setSelectedServices([]);
              setSelectedServiceSets([]);
              setSelectedCustomer(null);
              onClose();
            }}
          />
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
                  {isEditMode ? "Edit Booking" : "New Booking"}
                </ResponsiveText>
                <Pressable
                  onPress={() => {
                    reset();
                    setSelectedServices([]);
                    setSelectedServiceSets([]);
                    onClose();
                  }}
                  style={styles.closeButton}
                >
                  <X size={iconSize} color="#374151" />
                </Pressable>
              </View>

              <View style={styles.form}>
                <View style={styles.formSection}>
                  <ResponsiveText
                    variant="sm"
                    style={styles.label}
                    numberOfLines={1}
                  >
                    Customer *
                  </ResponsiveText>
                  {isEditMode ? (
                    <View style={[styles.input, styles.inputDisabled]}>
                      <ResponsiveText
                        variant="base"
                        style={styles.disabledText}
                        numberOfLines={1}
                      >
                        {existingBooking?.customer?.name || "Unknown Customer"}
                      </ResponsiveText>
                    </View>
                  ) : (
                    <CustomerSearchInput
                      value={watch("customerId") || null}
                      customerName={watchedCustomerName}
                      onSelect={handleCustomerSelect}
                      onNameChange={handleCustomerNameChange}
                      onClear={handleCustomerClear}
                      error={
                        errors.customerId?.message ||
                        errors.customerName?.message
                      }
                    />
                  )}
                </View>

                {!isEditMode && (
                  <View style={styles.formSection}>
                    <ResponsiveText
                      variant="sm"
                      style={styles.label}
                      numberOfLines={1}
                    >
                      Customer Email
                    </ResponsiveText>
                    <TextInput
                      style={[
                        styles.input,
                        errors.customerEmail && styles.inputError,
                      ]}
                      placeholder="customer@example.com"
                      value={watchedCustomerEmail || ""}
                      onChangeText={(text) => setValue("customerEmail", text)}
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
                )}

                <View style={styles.formSection}>
                  <ResponsiveText
                    variant="sm"
                    style={styles.label}
                    numberOfLines={1}
                  >
                    Appointment Date *
                  </ResponsiveText>
                  <DatePicker
                    value={watchedDate || ""}
                    onChange={(date) => setValue("appointmentDate", date)}
                    error={errors.appointmentDate?.message}
                    minimumDate={new Date()}
                  />
                </View>

                <View style={styles.formSection}>
                  <ResponsiveText
                    variant="sm"
                    style={styles.label}
                    numberOfLines={1}
                  >
                    Appointment Time *
                  </ResponsiveText>
                  <TimePicker
                    value={watchedTime || ""}
                    onChange={(time) => setValue("appointmentTime", time)}
                    error={errors.appointmentTime?.message}
                  />
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
                          onPress={() => setValue("branch", branch)}
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
                  <View style={styles.servicesHeader}>
                    <ResponsiveText
                      variant="sm"
                      style={styles.label}
                      numberOfLines={1}
                    >
                      Selected Items *
                    </ResponsiveText>
                    {!isEditMode && (
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
                    )}
                  </View>
                  {isEditMode ? (
                    <View>
                      <SelectedItemsList
                        services={selectedServices}
                        serviceSets={[]}
                        onRemoveService={() => {}}
                        onUpdateServiceQuantity={() => {}}
                        onRemoveServiceSet={() => {}}
                        onUpdateServiceSetQuantity={() => {}}
                      />
                      <View
                        style={[
                          styles.addServiceButton,
                          styles.addServiceButtonDisabled,
                        ]}
                      >
                        <ResponsiveText
                          variant="sm"
                          style={styles.disabledText}
                          numberOfLines={2}
                        >
                          Items cannot be modified when editing
                        </ResponsiveText>
                      </View>
                    </View>
                  ) : (
                    <SelectedItemsList
                      services={selectedServices}
                      serviceSets={selectedServiceSets}
                      onRemoveService={removeService}
                      onUpdateServiceQuantity={updateQuantity}
                      onRemoveServiceSet={removeServiceSet}
                      onUpdateServiceSetQuantity={updateServiceSetQuantity}
                      grandDiscount={watch("grandDiscount") || 0}
                    />
                  )}
                </View>

                <FormField<CreateBookingSchema>
                  control={control as any}
                  name="notes"
                  label="Notes (Optional)"
                  placeholder="Additional notes..."
                  multiline
                  numberOfLines={3}
                />

                {!isEditMode && (
                  <VoucherInput control={control as any} setValue={setValue} />
                )}

                {isEditMode ? (
                  <View style={styles.editActions}>
                    <Pressable
                      onPress={onClose}
                      disabled={isPending}
                      style={[styles.actionButton, styles.cancelButton]}
                    >
                      <ResponsiveText
                        variant="md"
                        style={styles.cancelButtonText}
                        numberOfLines={1}
                      >
                        Cancel
                      </ResponsiveText>
                    </Pressable>
                    <Pressable
                      onPress={handleSubmit(
                        onSubmit as (data: CreateBookingSchema) => void
                      )}
                      disabled={isPending}
                      style={[styles.actionButton, styles.updateButton]}
                    >
                      <LinearGradient
                        colors={["#ec4899", "#d946ef"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.updateButtonGradient}
                      >
                        {isPending ? (
                          <ActivityIndicator color="white" />
                        ) : (
                          <ResponsiveText
                            variant="md"
                            style={styles.updateButtonText}
                            numberOfLines={1}
                          >
                            Update Booking
                          </ResponsiveText>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={handleSubmit(
                      onSubmit as (data: CreateBookingSchema) => void
                    )}
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
                          Create Booking
                        </ResponsiveText>
                      )}
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </View>

          {showServicePicker && (
            <View style={styles.servicePickerOverlay}>
              <Pressable
                style={styles.servicePickerBackdrop}
                onPress={() => setShowServicePicker(false)}
              />
              <Pressable
                style={styles.servicePickerContent}
                onPress={(e) => e.stopPropagation()}
              >
                <View style={styles.servicePickerHeader}>
                  <ResponsiveText
                    variant="lg"
                    style={styles.servicePickerTitle}
                    numberOfLines={2}
                  >
                    {`Select ${
                      servicePickerType === "services"
                        ? "Service"
                        : "Service Set"
                    } (${watchedBranch || "NAILS"})`}
                  </ResponsiveText>
                  <Pressable onPress={() => setShowServicePicker(false)}>
                    <X size={iconSize} color="#374151" />
                  </Pressable>
                </View>
                <View style={styles.servicePickerToggle}>
                  <Pressable
                    onPress={() => setServicePickerType("services")}
                    style={[
                      styles.servicePickerToggleButton,
                      servicePickerType === "services" &&
                        styles.servicePickerToggleButtonActive,
                    ]}
                  >
                    <ResponsiveText
                      variant="sm"
                      style={[
                        styles.servicePickerToggleText,
                        servicePickerType === "services" &&
                          styles.servicePickerToggleTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      Services
                    </ResponsiveText>
                  </Pressable>
                  <Pressable
                    onPress={() => setServicePickerType("serviceSets")}
                    style={[
                      styles.servicePickerToggleButton,
                      servicePickerType === "serviceSets" &&
                        styles.servicePickerToggleButtonActive,
                    ]}
                  >
                    <ResponsiveText
                      variant="sm"
                      style={[
                        styles.servicePickerToggleText,
                        servicePickerType === "serviceSets" &&
                          styles.servicePickerToggleTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      Service Sets
                    </ResponsiveText>
                  </Pressable>
                </View>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={styles.servicePickerScrollView}
                >
                  {servicePickerType === "services" ? (
                    <>
                      {servicesLoading ? (
                        <View style={styles.servicePickerLoading}>
                          <ActivityIndicator size="large" color="#ec4899" />
                        </View>
                      ) : services && services.length > 0 ? (
                        services.map((service) => (
                          <Pressable
                            key={service.id}
                            onPress={() => addService(service)}
                            style={styles.serviceOption}
                          >
                            <ResponsiveText
                              variant="md"
                              style={styles.serviceOptionTitle}
                              numberOfLines={2}
                            >
                              {service.title}
                            </ResponsiveText>
                            <ResponsiveText
                              variant="sm"
                              style={styles.serviceOptionDetails}
                              numberOfLines={1}
                            >
                              {`₱${service.price} • ${service.duration_minutes} min`}
                            </ResponsiveText>
                          </Pressable>
                        ))
                      ) : (
                        <View style={styles.servicePickerEmpty}>
                          <ResponsiveText
                            variant="sm"
                            style={styles.servicePickerEmptyText}
                            numberOfLines={3}
                          >
                            {`No services available for ${
                              watchedBranch || "NAILS"
                            } branch`}
                          </ResponsiveText>
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      {serviceSetsLoading ? (
                        <View style={styles.servicePickerLoading}>
                          <ActivityIndicator size="large" color="#ec4899" />
                        </View>
                      ) : serviceSets && serviceSets.length > 0 ? (
                        serviceSets.map((serviceSet: ServiceSetWithItems) => {
                          const servicesCount =
                            serviceSet.service_set_items?.length || 0;
                          return (
                            <Pressable
                              key={serviceSet.id}
                              onPress={() => addServiceSet(serviceSet)}
                              style={styles.serviceOption}
                            >
                              <ResponsiveText
                                variant="md"
                                style={styles.serviceOptionTitle}
                                numberOfLines={2}
                              >
                                {serviceSet.title}
                              </ResponsiveText>
                              <ResponsiveText
                                variant="sm"
                                style={styles.serviceOptionDetails}
                                numberOfLines={1}
                              >
                                {`₱${
                                  serviceSet.price
                                } • ${servicesCount} service${
                                  servicesCount !== 1 ? "s" : ""
                                }`}
                              </ResponsiveText>
                              {serviceSet.description && (
                                <ResponsiveText
                                  variant="xs"
                                  style={styles.serviceOptionDescription}
                                  numberOfLines={2}
                                >
                                  {serviceSet.description}
                                </ResponsiveText>
                              )}
                            </Pressable>
                          );
                        })
                      ) : (
                        <View style={styles.servicePickerEmpty}>
                          <ResponsiveText
                            variant="sm"
                            style={styles.servicePickerEmptyText}
                            numberOfLines={3}
                          >
                            {`No service sets available for ${
                              watchedBranch || "NAILS"
                            } branch`}
                          </ResponsiveText>
                        </View>
                      )}
                    </>
                  )}
                </ScrollView>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </>
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
    backgroundColor: "white",
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
  formSection: {
    marginBottom: scaleDimension(16),
  },
  label: {
    color: "#374151",
    fontWeight: "600",
    marginBottom: scaleDimension(8),
  },
  helperText: {
    color: "#9ca3af",
    marginTop: scaleDimension(4),
  },
  input: {
    borderRadius: scaleDimension(12),
    paddingHorizontal: scaleDimension(16),
    paddingVertical: scaleDimension(14),
    fontSize: scaleDimension(16),
    color: "#111827",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    marginTop: scaleDimension(4),
    marginLeft: scaleDimension(4),
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
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(12),
    marginBottom: scaleDimension(8),
  },
  serviceItemContent: {
    flex: 1,
    minWidth: 0,
  },
  serviceItemTitle: {
    color: "#111827",
    fontWeight: "500",
  },
  serviceItemPrice: {
    color: "#6b7280",
  },
  serviceItemControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(12),
  },
  quantityButton: {
    width: scaleDimension(32),
    height: scaleDimension(32),
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    color: "#111827",
    fontWeight: "600",
    width: scaleDimension(32),
    textAlign: "center",
  },
  removeButton: {
    marginLeft: scaleDimension(8),
    padding: scaleDimension(4),
  },
  addServiceButton: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(16),
    alignItems: "center",
  },
  addServiceButtonDisabled: {
    borderStyle: "solid",
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  addServiceText: {
    color: "#6b7280",
    marginTop: scaleDimension(8),
  },
  servicesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleDimension(12),
  },
  addButtonsContainer: {
    flexDirection: "row",
    gap: scaleDimension(8),
  },
  addButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(4),
    paddingHorizontal: scaleDimension(10),
    paddingVertical: scaleDimension(6),
    borderRadius: scaleDimension(8),
    backgroundColor: "#fdf2f8",
    borderWidth: 1,
    borderColor: "#fbcfe8",
  },
  addButtonSmallText: {
    color: "#ec4899",
    fontWeight: "600",
  },
  servicePickerToggle: {
    flexDirection: "row",
    gap: scaleDimension(8),
    marginBottom: scaleDimension(16),
    backgroundColor: "#f9fafb",
    borderRadius: scaleDimension(8),
    padding: scaleDimension(4),
  },
  servicePickerToggleButton: {
    flex: 1,
    paddingVertical: scaleDimension(8),
    paddingHorizontal: scaleDimension(16),
    borderRadius: scaleDimension(6),
    alignItems: "center",
  },
  servicePickerToggleButtonActive: {
    backgroundColor: "#ec4899",
  },
  servicePickerToggleText: {
    fontWeight: "500",
    color: "#6b7280",
  },
  servicePickerToggleTextActive: {
    color: "white",
    fontWeight: "600",
  },
  serviceOptionDescription: {
    color: "#9ca3af",
    marginTop: scaleDimension(4),
    fontStyle: "italic",
  },
  inputDisabled: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
  },
  disabledText: {
    color: "#6b7280",
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
  editActions: {
    flexDirection: "row",
    gap: scaleDimension(12),
    marginTop: scaleDimension(16),
  },
  actionButton: {
    flex: 1,
    borderRadius: scaleDimension(12),
    overflow: "hidden",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: scaleDimension(16),
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonDisabled: {
    backgroundColor: "#e5e7eb",
    opacity: 0.6,
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "600",
  },
  cancelButtonTextDisabled: {
    color: "#9ca3af",
  },
  updateButton: {
    // Gradient will be applied via updateButtonGradient
  },
  updateButtonGradient: {
    paddingVertical: scaleDimension(16),
    alignItems: "center",
    justifyContent: "center",
  },
  updateButtonText: {
    color: "white",
    fontWeight: "600",
  },
  servicePickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  servicePickerBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  servicePickerContent: {
    backgroundColor: "white",
    borderRadius: scaleDimension(24),
    padding: scaleDimension(24),
    maxHeight: percentageHeight(80),
    width: "90%",
    zIndex: 1001,
  },
  servicePickerScrollView: {
    maxHeight: scaleDimension(400),
  },
  servicePickerLoading: {
    padding: scaleDimension(40),
    alignItems: "center",
  },
  servicePickerEmpty: {
    padding: scaleDimension(40),
    alignItems: "center",
  },
  servicePickerEmptyText: {
    color: "#6b7280",
    textAlign: "center",
  },
  servicePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleDimension(16),
  },
  servicePickerTitle: {
    fontWeight: "bold",
    color: "#111827",
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  serviceOption: {
    padding: scaleDimension(16),
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  serviceOptionTitle: {
    color: "#111827",
    fontWeight: "600",
  },
  serviceOptionDetails: {
    color: "#6b7280",
    marginTop: scaleDimension(4),
  },
});
