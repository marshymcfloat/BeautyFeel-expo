import { ResponsiveText } from "@/components/ui/ResponsiveText";
import {
  checkGiftCertificate,
  claimGiftCertificateAction,
  type GiftCertificateWithRelations,
} from "@/lib/actions/giftCertificateActions";
import { isValidGiftCertificateCode } from "@/lib/utils/giftCertificateCodeGenerator";
import { percentageHeight, scaleDimension } from "@/lib/utils/responsive";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Gift, X } from "lucide-react-native";
import React, { useState } from "react";
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
import { useToast } from "../ui/toast";

const claimGiftCertificateSchema = z.object({
  code: z
    .string()
    .length(6, "Gift certificate code must be exactly 6 characters")
    .refine(
      (code) => isValidGiftCertificateCode(code),
      "Gift certificate code must start with GC followed by 4 uppercase letters or numbers (e.g., GC1234)"
    ),
});

type ClaimGiftCertificateFormData = z.infer<typeof claimGiftCertificateSchema>;

interface ClaimGiftCertificateModalProps {
  visible: boolean;
  onClose: () => void;
  onClaimSuccess: (giftCertificate: GiftCertificateWithRelations) => void;
}

export default function ClaimGiftCertificateModal({
  visible,
  onClose,
  onClaimSuccess,
}: ClaimGiftCertificateModalProps) {
  const toast = useToast();
  const [checkedGiftCertificate, setCheckedGiftCertificate] =
    useState<GiftCertificateWithRelations | null>(null);
  const [checking, setChecking] = useState(false);

  const form = useForm<ClaimGiftCertificateFormData>({
    resolver: zodResolver(claimGiftCertificateSchema),
    defaultValues: {
      code: "",
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = form;

  const code = watch("code");

  const checkMutation = useMutation({
    mutationFn: checkGiftCertificate,
    onSuccess: (result) => {
      setChecking(false);
      if (result.success && result.data) {
        setCheckedGiftCertificate(result.data);
        toast.success(
          "Gift Certificate Found",
          "Gift certificate is valid and ready to claim"
        );
      } else {
        toast.error("Error", result.error || "Invalid gift certificate code");
        setCheckedGiftCertificate(null);
      }
    },
    onError: (error) => {
      setChecking(false);
      toast.error("Error", error.message || "Failed to check gift certificate");
      setCheckedGiftCertificate(null);
    },
  });

  const claimMutation = useMutation({
    mutationFn: claimGiftCertificateAction,
    onSuccess: async (result) => {
      if (result.success) {
        toast.success(
          "Gift Certificate Claimed",
          "Gift certificate claimed and booking created successfully"
        );
        handleClose();
        // Refresh the bookings list by calling onClaimSuccess if needed
        // But don't open the booking form modal
        if (checkedGiftCertificate) {
          onClaimSuccess(checkedGiftCertificate);
        }
      } else {
        toast.error(
          "Error",
          result.error || "Failed to claim gift certificate"
        );
      }
    },
    onError: (error) => {
      toast.error("Error", error.message || "Failed to claim gift certificate");
    },
  });

  const handleClose = () => {
    reset();
    setCheckedGiftCertificate(null);
    setChecking(false);
    onClose();
  };

  const handleCheck = async (data: ClaimGiftCertificateFormData) => {
    setChecking(true);
    checkMutation.mutate(data.code.toUpperCase());
  };

  const handleClaim = () => {
    if (!checkedGiftCertificate) {
      toast.error("Error", "Please check the gift certificate first");
      return;
    }
    claimMutation.mutate(checkedGiftCertificate.id);
  };

  const iconSize = scaleDimension(24);

  const totalValue =
    (checkedGiftCertificate?.services?.reduce(
      (sum, s) => sum + (s.service.price || 0) * s.quantity,
      0
    ) || 0) +
    (checkedGiftCertificate?.service_sets?.reduce(
      (sum, s) => sum + (s.service_set.price || 0) * s.quantity,
      0
    ) || 0);

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
                Claim Gift Certificate
              </ResponsiveText>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <X size={iconSize} color="#374151" />
              </Pressable>
            </View>

            <View style={styles.form}>
              {!checkedGiftCertificate ? (
                <>
                  <FormField
                    control={control}
                    name="code"
                    label="Gift Certificate Code"
                    placeholder="GC1234"
                    autoCapitalize="characters"
                    maxLength={6}
                  />

                  <Pressable
                    onPress={handleSubmit(handleCheck)}
                    disabled={checking || !code || code.length !== 6}
                    style={[
                      styles.checkButton,
                      (checking || !code || code.length !== 6) &&
                        styles.checkButtonDisabled,
                    ]}
                  >
                    <LinearGradient
                      colors={
                        checking || !code || code.length !== 6
                          ? ["#d1d5db", "#9ca3af"]
                          : ["#ec4899", "#d946ef"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.checkButtonGradient}
                    >
                      {checking ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <ResponsiveText
                          variant="md"
                          style={styles.checkButtonText}
                          numberOfLines={1}
                        >
                          Check Gift Certificate
                        </ResponsiveText>
                      )}
                    </LinearGradient>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.successContainer}>
                    <View style={styles.successIconContainer}>
                      <Gift size={48} color="#10b981" />
                    </View>
                    <ResponsiveText
                      variant="lg"
                      style={styles.successTitle}
                      numberOfLines={1}
                    >
                      Gift Certificate Valid!
                    </ResponsiveText>
                    <ResponsiveText
                      variant="sm"
                      style={styles.successSubtitle}
                      numberOfLines={2}
                    >
                      Code: {checkedGiftCertificate.code}
                    </ResponsiveText>
                  </View>

                  {checkedGiftCertificate.services &&
                    checkedGiftCertificate.services.length > 0 && (
                      <View style={styles.servicesContainer}>
                        <ResponsiveText
                          variant="sm"
                          style={styles.sectionLabel}
                          numberOfLines={1}
                        >
                          Services Included:
                        </ResponsiveText>
                        {checkedGiftCertificate.services.map((item) => (
                          <View key={item.id} style={styles.serviceItem}>
                            <ResponsiveText
                              variant="sm"
                              style={styles.serviceName}
                              numberOfLines={1}
                            >
                              {item.service.title}
                            </ResponsiveText>
                            <ResponsiveText
                              variant="xs"
                              style={styles.serviceQuantity}
                              numberOfLines={1}
                            >
                              Qty: {item.quantity}
                            </ResponsiveText>
                          </View>
                        ))}
                      </View>
                    )}

                  {checkedGiftCertificate.service_sets &&
                    checkedGiftCertificate.service_sets.length > 0 && (
                      <View style={styles.servicesContainer}>
                        <ResponsiveText
                          variant="sm"
                          style={styles.sectionLabel}
                          numberOfLines={1}
                        >
                          Service Sets Included:
                        </ResponsiveText>
                        {checkedGiftCertificate.service_sets.map((item) => (
                          <View key={item.id} style={styles.serviceItem}>
                            <ResponsiveText
                              variant="sm"
                              style={styles.serviceName}
                              numberOfLines={1}
                            >
                              {item.service_set.title}
                            </ResponsiveText>
                            <ResponsiveText
                              variant="xs"
                              style={styles.serviceQuantity}
                              numberOfLines={1}
                            >
                              Qty: {item.quantity}
                            </ResponsiveText>
                          </View>
                        ))}
                      </View>
                    )}

                  {totalValue > 0 && (
                    <View style={styles.totalContainer}>
                      <ResponsiveText
                        variant="md"
                        style={styles.totalLabel}
                        numberOfLines={1}
                      >
                        Total Value:
                      </ResponsiveText>
                      <ResponsiveText
                        variant="lg"
                        style={styles.totalValue}
                        numberOfLines={1}
                      >
                        ₱{totalValue.toLocaleString()}
                      </ResponsiveText>
                    </View>
                  )}

                  <Pressable
                    onPress={handleClaim}
                    disabled={claimMutation.isPending}
                    style={[
                      styles.claimButton,
                      claimMutation.isPending && styles.claimButtonDisabled,
                    ]}
                  >
                    <LinearGradient
                      colors={
                        claimMutation.isPending
                          ? ["#d1d5db", "#9ca3af"]
                          : ["#10b981", "#059669"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.claimButtonGradient}
                    >
                      {claimMutation.isPending ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <ResponsiveText
                          variant="md"
                          style={styles.claimButtonText}
                          numberOfLines={1}
                        >
                          Claim & Create Booking
                        </ResponsiveText>
                      )}
                    </LinearGradient>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setCheckedGiftCertificate(null);
                      reset();
                    }}
                    style={styles.backButton}
                  >
                    <ResponsiveText
                      variant="sm"
                      style={styles.backButtonText}
                      numberOfLines={1}
                    >
                      Check Another Code
                    </ResponsiveText>
                  </Pressable>
                </>
              )}
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
  checkButton: {
    marginTop: scaleDimension(16),
    borderRadius: scaleDimension(12),
    overflow: "hidden",
  },
  checkButtonDisabled: {
    opacity: 0.6,
  },
  checkButtonGradient: {
    paddingVertical: scaleDimension(16),
    alignItems: "center",
    justifyContent: "center",
  },
  checkButtonText: {
    color: "white",
    fontWeight: "600",
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: scaleDimension(24),
    marginBottom: scaleDimension(16),
  },
  successIconContainer: {
    width: scaleDimension(80),
    height: scaleDimension(80),
    borderRadius: scaleDimension(40),
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scaleDimension(16),
  },
  successTitle: {
    fontWeight: "700",
    color: "#10b981",
    marginBottom: scaleDimension(8),
  },
  successSubtitle: {
    color: "#6b7280",
    fontWeight: "600",
  },
  servicesContainer: {
    marginBottom: scaleDimension(16),
    backgroundColor: "#f9fafb",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(16),
  },
  sectionLabel: {
    color: "#374151",
    fontWeight: "600",
    marginBottom: scaleDimension(12),
  },
  serviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: scaleDimension(8),
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  serviceItemLast: {
    borderBottomWidth: 0,
  },
  serviceName: {
    color: "#111827",
    fontWeight: "500",
    flex: 1,
  },
  serviceQuantity: {
    color: "#6b7280",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: scaleDimension(16),
    paddingHorizontal: scaleDimension(16),
    backgroundColor: "#f0fdf4",
    borderRadius: scaleDimension(12),
    marginBottom: scaleDimension(16),
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  totalLabel: {
    color: "#065f46",
    fontWeight: "600",
  },
  totalValue: {
    color: "#10b981",
    fontWeight: "800",
  },
  claimButton: {
    marginTop: scaleDimension(8),
    borderRadius: scaleDimension(12),
    overflow: "hidden",
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonGradient: {
    paddingVertical: scaleDimension(16),
    alignItems: "center",
    justifyContent: "center",
  },
  claimButtonText: {
    color: "white",
    fontWeight: "600",
  },
  backButton: {
    marginTop: scaleDimension(12),
    paddingVertical: scaleDimension(12),
    alignItems: "center",
  },
  backButtonText: {
    color: "#6b7280",
    fontWeight: "500",
  },
});
