import DatePicker from "@/components/bookings/DatePicker";
import TimePicker from "@/components/bookings/TimePicker";
import type { BookingWithServices } from "@/components/bookings/types";
import { queryClient } from "@/components/Providers/TanstackProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/toast";
import { updateBookingAction } from "@/lib/actions/bookingActions";
import { formatDateString } from "@/lib/utils/dateTime";
import {
  updateBookingSchema,
  UpdateBookingSchema,
} from "@/lib/zod-schemas/booking";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import React, { useEffect } from "react";
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

interface BookingEditModalProps {
  visible: boolean;
  // Allow null so the parent can pass 'selectedBooking' directly even if initialized as null
  booking: BookingWithServices | null;
  onClose: () => void;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
] as const;

export default function BookingEditModal({
  visible,
  booking,
  onClose,
  onSuccess,
}: BookingEditModalProps) {
  const toast = useToast();

  // Initialize form with safe defaults
  const form = useForm<UpdateBookingSchema>({
    resolver: zodResolver(updateBookingSchema),
    defaultValues: {
      appointmentDate:
        booking?.appointment_date || formatDateString(new Date()),
      appointmentTime: booking?.appointment_time || "09:00",
      notes: booking?.notes || "",
      status: (booking?.status as any) || "PENDING",
    },
  });

  const { control, handleSubmit, reset, watch, setValue } = form;
  const selectedDate = watch("appointmentDate");
  const selectedTime = watch("appointmentTime");
  const selectedStatus = watch("status");

  useEffect(() => {
    if (visible && booking) {
      reset({
        appointmentDate:
          booking.appointment_date || formatDateString(new Date()),
        appointmentTime: booking.appointment_time || "09:00",
        notes: booking.notes || "",
        status: (booking.status as any) || "PENDING",
      });
    }
  }, [visible, booking, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBookingSchema) => {
      if (!booking) throw new Error("No booking selected");
      return updateBookingAction(booking.id, data);
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-bookings"] });
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        if (booking) {
          queryClient.invalidateQueries({ queryKey: ["booking", booking.id] });
        }
        onSuccess();
        toast.success("Success", "Booking updated successfully");
      } else {
        toast.error("Error", result.error || "Failed to update booking");
      }
    },
    onError: (error: Error) => {
      toast.error("Error", error.message || "An unexpected error occurred");
    },
  });

  const onSubmit = (data: UpdateBookingSchema) => {
    updateMutation.mutate(data);
  };

  return (
    <Modal
      visible={visible && !!booking}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {booking ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.overlay}
        >
          <View style={styles.modal}>
            {/* Header */}
            <LinearGradient
              colors={["#ec4899", "#d946ef", "#a855f7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.header}
            >
              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Edit Booking</Text>
                <Pressable onPress={onClose} style={styles.closeButton}>
                  <X size={24} color="white" />
                </Pressable>
              </View>
              <View style={styles.headerSubtitle}>
                <Text style={styles.headerSubtitleText}>
                  {booking.customer?.name || "Unknown Customer"}
                </Text>
              </View>
            </LinearGradient>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Date Picker */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Appointment Date</Text>
                <DatePicker
                  // Ensure value is never undefined
                  value={selectedDate || formatDateString(new Date())}
                  onChange={(date) => {
                    setValue("appointmentDate", date);
                  }}
                />
              </View>

              {/* Time Picker */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Appointment Time</Text>
                <TimePicker
                  // Ensure value is never undefined
                  value={selectedTime || "09:00"}
                  onChange={(time) => {
                    setValue("appointmentTime", time);
                  }}
                />
              </View>

              {/* Status */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.statusContainer}>
                  {STATUS_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setValue("status", option.value as any)}
                      style={[
                        styles.statusOption,
                        selectedStatus === option.value &&
                          styles.statusOptionActive,
                      ]}
                    >
                      {/* FIXED: Removed type="booking" prop */}
                      <StatusBadge status={option.value as any} />
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Notes */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Notes</Text>
                <Controller
                  control={control}
                  name="notes"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <View>
                      <TextInput
                        style={[
                          styles.notesInput,
                          error && styles.notesInputError,
                        ]}
                        placeholder="Add any notes about this booking..."
                        placeholderTextColor="#9CA3AF"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value || ""}
                      />
                      {error && (
                        <Text style={styles.errorText}>{error.message}</Text>
                      )}
                    </View>
                  )}
                />
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                onPress={onClose}
                style={[styles.actionButton, styles.cancelButton]}
                disabled={updateMutation.isPending}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit(onSubmit)}
                style={[styles.actionButton, styles.saveButton]}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerSubtitle: {
    marginTop: 4,
  },
  headerSubtitleText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    gap: 20,
  },
  fieldContainer: {
    gap: 8,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  notesInput: {
    minHeight: 120,
    textAlignVertical: "top",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    fontSize: 16,
    color: "#111827",
  },
  notesInputError: {
    borderWidth: 2,
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginTop: 6,
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  statusOption: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "white",
    minWidth: 100,
    alignItems: "center",
  },
  statusOptionActive: {
    borderColor: "#ec4899",
    backgroundColor: "#fdf2f8",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  saveButton: {
    backgroundColor: "#ec4899",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});
