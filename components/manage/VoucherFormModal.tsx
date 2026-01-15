import { ResponsiveText } from "@/components/ui/ResponsiveText";
import { Tables } from "@/database.types";
import {
  createVoucherAction,
  sendVoucherEmailAction,
  voucherCodeExists,
} from "@/lib/actions/voucherActions";
import { percentageHeight, scaleDimension } from "@/lib/utils/responsive";
import {
  generateUniqueVoucherCode,
  generateVoucherCode,
  isValidVoucherCode,
} from "@/lib/utils/voucherCodeGenerator";
import { zodResolver } from "@hookform/resolvers/zod";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar, RefreshCw, X } from "lucide-react-native";
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
  TextInput,
  View,
} from "react-native";
import { z } from "zod";
import CustomerSearchInput from "../bookings/CustomerSearchInput";
import { FormField } from "../form/FormField";
import { queryClient } from "../Providers/TanstackProvider";
import { useToast } from "../ui/toast";

const voucherSchema = z.object({
  code: z
    .string()
    .length(6, "Voucher code must be exactly 6 characters")
    .refine(
      (code) => isValidVoucherCode(code),
      "Voucher code must start with BF followed by 4 uppercase letters or numbers (e.g., BF1234)"
    ),
  value: z
    .number()
    .min(0.01, "Value must be greater than 0")
    .max(10000, "Value must be less than 10,000"),
  customerId: z.number().nullable().optional(),
  expiresOn: z.string().nullable().optional(),
});

type VoucherFormData = z.infer<typeof voucherSchema>;

interface VoucherFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function VoucherFormModal({
  visible,
  onClose,
  onSuccess,
}: VoucherFormModalProps) {
  const toast = useToast();
  const [selectedCustomer, setSelectedCustomer] =
    useState<Tables<"customer"> | null>(null);
  const [customerName, setCustomerName] = useState<string>("");
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const form = useForm<VoucherFormData>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      code: generateVoucherCode(),
      value: 0,
      customerId: null,
      expiresOn: null,
    },
  });

  const [showDatePicker, setShowDatePicker] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const watchedCode = watch("code");

  // Generate new code when modal opens
  useEffect(() => {
    if (visible) {
      let isMounted = true;

      // Generate a unique code with duplicate checking
      generateUniqueVoucherCode(voucherCodeExists)
        .then((newCode) => {
          if (isMounted) {
            reset({
              code: newCode,
              value: 0,
              customerId: null,
              expiresOn: null,
            });
            setSelectedCustomer(null);
            setCustomerName("");
          }
        })
        .catch((error) => {
          console.error("Failed to generate unique voucher code:", error);
          if (isMounted) {
            // Fallback to regular generation if unique generation fails
            const fallbackCode = generateVoucherCode();
            reset({
              code: fallbackCode,
              value: 0,
              customerId: null,
              expiresOn: null,
            });
            setSelectedCustomer(null);
            setCustomerName("");
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [visible, reset]);

  const handleGenerateCode = async () => {
    try {
      const newCode = await generateUniqueVoucherCode(voucherCodeExists);
      setValue("code", newCode);
    } catch (error) {
      console.error("Failed to generate unique code:", error);
      // Fallback to regular generation
      const fallbackCode = generateVoucherCode();
      setValue("code", fallbackCode);
    }
  };

  const handleCustomerSelect = (
    customerId: number,
    customer: Tables<"customer">
  ) => {
    setSelectedCustomer(customer);
    setValue("customerId", customerId);
    setCustomerName(customer.name);
  };

  const handleCustomerClear = () => {
    setSelectedCustomer(null);
    setValue("customerId", null);
    setCustomerName("");
  };

  const handleCustomerNameChange = (name: string) => {
    setCustomerName(name);
    if (!selectedCustomer) {
      setValue("customerId", null);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: VoucherFormData) => {
      // Create voucher
      const result = await createVoucherAction({
        code: data.code.toUpperCase(),
        value: data.value,
        customer_id: data.customerId || null,
        expires_on: data.expiresOn || null,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create voucher");
      }

      // Send email if customer is selected and has email
      if (selectedCustomer && selectedCustomer.email) {
        try {
          await sendVoucherEmailAction({
            customerEmail: selectedCustomer.email,
            customerName: selectedCustomer.name,
            voucherCode: data.code.toUpperCase(),
            voucherValue: data.value,
          });
        } catch (error) {
          console.error("Failed to send email:", error);
          // Don't fail the whole operation if email fails
        }
      }

      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-vouchers"] });
        toast.success(
          "Voucher Created",
          selectedCustomer && selectedCustomer.email
            ? "Voucher created and email sent successfully"
            : "Voucher created successfully"
        );
        reset();
        setSelectedCustomer(null);
        setCustomerName("");
        setShowDatePicker(false);
        onClose();
        onSuccess?.();
      } else {
        toast.error("Error", result.error || "Failed to create voucher");
      }
    },
    onError: (error) => {
      toast.error("Error", error.message || "Failed to create voucher");
    },
  });

  const handleClose = () => {
    reset();
    setSelectedCustomer(null);
    setCustomerName("");
    setShowDatePicker(false);
    onClose();
  };

  const iconSize = scaleDimension(24);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
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
                Create Voucher
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
                  label="Voucher Code (6 characters)"
                  placeholder="BF1234"
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

              <Controller
                control={control}
                name="value"
                render={({
                  field: { onChange, value },
                  fieldState: { error },
                }) => (
                  <View>
                    <ResponsiveText
                      variant="sm"
                      style={styles.sectionLabel}
                      numberOfLines={1}
                    >
                      Voucher Value
                    </ResponsiveText>
                    <TextInput
                      style={[
                        styles.input,
                        error ? styles.inputError : styles.inputNormal,
                      ]}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={
                        value === null || value === undefined
                          ? ""
                          : String(value)
                      }
                      onChangeText={(text) => {
                        const numValue = parseFloat(text) || 0;
                        onChange(numValue);
                      }}
                      placeholderTextColor="#9CA3AF"
                    />
                    {error && (
                      <ResponsiveText
                        variant="xs"
                        style={styles.errorText}
                        numberOfLines={1}
                      >
                        {error.message}
                      </ResponsiveText>
                    )}
                  </View>
                )}
              />

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

                  // Update tempDate when value changes or modal opens
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
                                        variant="md"
                                        style={styles.datePickerCancelText}
                                        numberOfLines={1}
                                      >
                                        Cancel
                                      </ResponsiveText>
                                    </Pressable>
                                    <ResponsiveText
                                      variant="md"
                                      style={styles.datePickerModalTitle}
                                      numberOfLines={1}
                                    >
                                      Select Date
                                    </ResponsiveText>
                                    <Pressable
                                      onPress={handleDone}
                                      style={styles.datePickerDoneButton}
                                    >
                                      <ResponsiveText
                                        variant="md"
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
                                    onChange={handleDateChange}
                                    minimumDate={today}
                                  />
                                </View>
                              </View>
                            </Modal>
                          ) : (
                            <DateTimePicker
                              value={selectedDate || new Date()}
                              mode="date"
                              display="default"
                              onChange={handleDateChange}
                              minimumDate={today}
                            />
                          )}
                        </>
                      )}
                      {error && (
                        <ResponsiveText
                          variant="xs"
                          style={styles.errorText}
                          numberOfLines={1}
                        >
                          {error.message}
                        </ResponsiveText>
                      )}
                    </View>
                  );
                }}
              />

              <View style={styles.customerSection}>
                <ResponsiveText
                  variant="sm"
                  style={styles.sectionLabel}
                  numberOfLines={1}
                >
                  Customer (Optional)
                </ResponsiveText>
                <CustomerSearchInput
                  value={selectedCustomer?.id || null}
                  customerName={customerName}
                  onSelect={handleCustomerSelect}
                  onNameChange={handleCustomerNameChange}
                  onClear={handleCustomerClear}
                  error={undefined}
                />
                {selectedCustomer && selectedCustomer.email && (
                  <ResponsiveText
                    variant="xs"
                    style={styles.emailNote}
                    numberOfLines={1}
                  >
                    Email will be sent to: {selectedCustomer.email}
                  </ResponsiveText>
                )}
                {selectedCustomer && !selectedCustomer.email && (
                  <ResponsiveText
                    variant="xs"
                    style={styles.emailWarning}
                    numberOfLines={1}
                  >
                    No email address for this customer. Email will not be sent.
                  </ResponsiveText>
                )}
              </View>

              <Pressable
                onPress={handleSubmit((data) => createMutation.mutate(data))}
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
                    <ActivityIndicator color="white" />
                  ) : (
                    <ResponsiveText
                      variant="md"
                      style={styles.submitButtonText}
                      numberOfLines={1}
                    >
                      Create Voucher
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
    maxHeight: percentageHeight(90),
    borderTopLeftRadius: scaleDimension(24),
    borderTopRightRadius: scaleDimension(24),
    overflow: "hidden",
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scaleDimension(20),
    paddingTop: scaleDimension(20),
    paddingBottom: scaleDimension(16),
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: {
    fontWeight: "800",
    color: "#111827",
  },
  closeButton: {
    padding: scaleDimension(4),
  },
  scrollContent: {
    paddingBottom: scaleDimension(20),
  },
  form: {
    paddingHorizontal: scaleDimension(20),
    paddingTop: scaleDimension(20),
    gap: scaleDimension(20),
  },
  codeSection: {
    gap: scaleDimension(12),
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
    paddingVertical: scaleDimension(8),
    paddingHorizontal: scaleDimension(12),
    backgroundColor: "#fdf2f8",
    borderRadius: scaleDimension(8),
    borderWidth: 1,
    borderColor: "#fce7f3",
    alignSelf: "flex-start",
  },
  generateButtonText: {
    color: "#ec4899",
    fontWeight: "600",
  },
  customerSection: {
    gap: scaleDimension(8),
  },
  sectionLabel: {
    fontWeight: "600",
    color: "#374151",
    marginBottom: scaleDimension(4),
  },
  emailNote: {
    color: "#16a34a",
    marginTop: scaleDimension(4),
    marginLeft: scaleDimension(4),
  },
  emailWarning: {
    color: "#f59e0b",
    marginTop: scaleDimension(4),
    marginLeft: scaleDimension(4),
  },
  submitButton: {
    marginTop: scaleDimension(20),
    borderRadius: scaleDimension(12),
    overflow: "hidden",
  },
  submitButtonGradient: {
    paddingVertical: scaleDimension(16),
    paddingHorizontal: scaleDimension(20),
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "white",
    fontWeight: "600",
  },
  input: {
    borderRadius: scaleDimension(12),
    paddingHorizontal: scaleDimension(16),
    paddingVertical: scaleDimension(14),
    fontSize: scaleDimension(16),
    color: "#111827",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    minHeight: scaleDimension(52),
    textAlignVertical: "center",
  },
  inputNormal: {
    borderColor: "#E5E7EB",
  },
  inputError: {
    borderWidth: 2,
    borderColor: "#F87171",
  },
  errorText: {
    color: "#EF4444",
    fontSize: scaleDimension(14),
    marginTop: scaleDimension(6),
    marginLeft: scaleDimension(4),
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
    color: "#9CA3AF",
  },
  clearDateButton: {
    padding: scaleDimension(4),
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  datePickerModalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: scaleDimension(20),
    borderTopRightRadius: scaleDimension(20),
    paddingBottom: scaleDimension(20),
  },
  datePickerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scaleDimension(20),
    paddingVertical: scaleDimension(16),
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  datePickerModalTitle: {
    fontWeight: "600",
    color: "#111827",
  },
  datePickerCancelButton: {
    paddingVertical: scaleDimension(8),
    paddingHorizontal: scaleDimension(12),
  },
  datePickerCancelText: {
    color: "#6b7280",
  },
  datePickerDoneButton: {
    paddingVertical: scaleDimension(8),
    paddingHorizontal: scaleDimension(12),
  },
  datePickerDoneText: {
    fontWeight: "600",
    color: "#ec4899",
  },
});
