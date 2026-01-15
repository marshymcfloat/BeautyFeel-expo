import { ResponsiveText } from "@/components/ui/ResponsiveText";
import type { Tables } from "@/database.types";
import {
  createCustomerAction,
  updateCustomerAction,
} from "@/lib/actions/customerActions";
import { scaleDimension } from "@/lib/utils/responsive";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { z } from "zod";
import { FormField } from "../form/FormField";
import { queryClient } from "../Providers/TanstackProvider";
import { useToast } from "../ui/toast";

type Customer = Tables<"customer">;

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormModalProps {
  visible: boolean;
  onClose: () => void;
  existingCustomer?: Customer | null | undefined;
  onSuccess?: () => void;
}

export default function CustomerFormModal({
  visible,
  onClose,
  existingCustomer,
  onSuccess,
}: CustomerFormModalProps) {
  const isEditMode = !!existingCustomer;
  const toast = useToast();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  const iconSize = scaleDimension(24);

  // Reset form when modal opens/closes or customer changes
  useEffect(() => {
    if (visible) {
      if (existingCustomer) {
        reset({
          name: existingCustomer.name || "",
          email: existingCustomer.email || "",
          phone: existingCustomer.phone || "",
        });
      } else {
        reset({
          name: "",
          email: "",
          phone: "",
        });
      }
    } else {
      // Reset form when modal closes
      reset({
        name: "",
        email: "",
        phone: "",
      });
    }
  }, [visible, existingCustomer, reset]);

  const createMutation = useMutation({
    mutationFn: createCustomerAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        toast.success("Customer Created", "Customer created successfully!");
        reset();
        onSuccess?.();
        onClose();
      } else {
        toast.error("Error", result.error || "Failed to create customer");
      }
    },
    onError: (error: Error) => {
      toast.error("Error", error.message || "An unexpected error occurred");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CustomerFormData }) =>
      updateCustomerAction(id, data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
        toast.success("Customer Updated", "Customer updated successfully!");
        reset();
        onSuccess?.();
        onClose();
      } else {
        toast.error("Error", result.error || "Failed to update customer");
      }
    },
    onError: (error: Error) => {
      toast.error("Error", error.message || "An unexpected error occurred");
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    if (isEditMode && existingCustomer) {
      updateMutation.mutate({
        id: existingCustomer.id,
        data: {
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
        },
      });
    } else {
      createMutation.mutate({
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <LinearGradient
            colors={["#ec4899", "#d946ef"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <ResponsiveText
              variant="2xl"
              style={styles.headerTitle}
              numberOfLines={1}
            >
              {isEditMode ? "Edit Customer" : "New Customer"}
            </ResponsiveText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={iconSize} color="white" />
            </Pressable>
          </LinearGradient>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <FormField
              control={control}
              name="name"
              label="Name *"
              placeholder="Enter customer name"
            />

            <FormField
              control={control}
              name="email"
              label="Email"
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FormField
              control={control}
              name="phone"
              label="Phone"
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />

            {isEditMode && existingCustomer && (
              <View style={styles.readOnlyField}>
                <ResponsiveText
                  variant="sm"
                  style={styles.readOnlyLabel}
                  numberOfLines={1}
                >
                  Total Spent (Read-only)
                </ResponsiveText>
                <ResponsiveText
                  variant="lg"
                  style={styles.readOnlyValue}
                  numberOfLines={1}
                >
                  ₱{existingCustomer.spent?.toLocaleString() || "0.00"}
                </ResponsiveText>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <Pressable
                onPress={onClose}
                style={[styles.button, styles.cancelButton]}
                disabled={isLoading}
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
                onPress={handleSubmit(onSubmit)}
                style={[styles.button, styles.submitButton]}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <ResponsiveText
                    variant="md"
                    style={styles.submitButtonText}
                    numberOfLines={1}
                  >
                    {isEditMode ? "Update" : "Create"}
                  </ResponsiveText>
                )}
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
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: scaleDimension(24),
    borderTopRightRadius: scaleDimension(24),
    maxHeight: "90%",
    minHeight: scaleDimension(400),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scaleDimension(20),
    paddingVertical: scaleDimension(20),
    borderTopLeftRadius: scaleDimension(24),
    borderTopRightRadius: scaleDimension(24),
  },
  headerTitle: {
    color: "white",
    fontWeight: "700",
  },
  closeButton: {
    padding: scaleDimension(4),
  },
  scrollView: {
    flexGrow: 1,
  },
  scrollContent: {
    padding: scaleDimension(20),
    paddingBottom: scaleDimension(40),
    gap: scaleDimension(16),
    flexGrow: 1,
  },
  readOnlyField: {
    padding: scaleDimension(16),
    backgroundColor: "#f9fafb",
    borderRadius: scaleDimension(12),
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  readOnlyLabel: {
    color: "#6b7280",
    marginBottom: scaleDimension(4),
  },
  readOnlyValue: {
    color: "#111827",
    fontWeight: "600",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: scaleDimension(12),
    marginTop: scaleDimension(8),
  },
  button: {
    flex: 1,
    paddingVertical: scaleDimension(14),
    borderRadius: scaleDimension(12),
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#ec4899",
  },
  submitButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
