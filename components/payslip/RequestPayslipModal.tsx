import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  calculateUnpaidPayslipAmount,
  createPayslipRequestAction,
} from "@/lib/actions/payslipActions";
import { useAuth } from "@/lib/hooks/useAuth";
import { GRADIENT_COLORS } from "@/lib/utils/constants";
import { formatCurrency } from "@/lib/utils/currency";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { AlertCircle, DollarSign, X } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { queryClient } from "../Providers/TanstackProvider";
import { Toast, ToastDescription, ToastTitle, useToast } from "../ui/toast";

interface RequestPayslipModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function RequestPayslipModal({
  visible,
  onClose,
}: RequestPayslipModalProps) {
  const { employee } = useAuth();
  const toast = useToast();

  const { data: unpaidData, isLoading: calculating } = useQuery({
    queryKey: ["unpaid-payslip-amount", employee?.id],
    queryFn: () => calculateUnpaidPayslipAmount(employee?.id || ""),
    enabled: visible && !!employee?.id,
  });

  const createRequestMutation = useMutation({
    mutationFn: () => createPayslipRequestAction(employee?.id || ""),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["my-payslip-requests"] });
        queryClient.invalidateQueries({ queryKey: ["payslip-requests"] });
        queryClient.invalidateQueries({ queryKey: ["unpaid-payslip-amount"] });

        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => (
            <Toast action="success" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Payslip Request Created</ToastTitle>
              <ToastDescription>
                Your request for {formatCurrency(result.requested_amount)} has
                been submitted.
              </ToastDescription>
            </Toast>
          ),
        });
        onClose();
      } else {
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => (
            <Toast action="error" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>
                {result.error || "Failed to create payslip request"}
              </ToastDescription>
            </Toast>
          ),
        });
      }
    },
    onError: (error: Error) => {
      toast.show({
        placement: "top",
        duration: 3000,
        render: ({ id }) => (
          <Toast action="error" variant="outline" nativeID={"toast-" + id}>
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>
              {error.message || "An unexpected error occurred"}
            </ToastDescription>
          </Toast>
        ),
      });
    },
  });

  const unpaidAmount = unpaidData?.data;
  const hasUnpaidAmount = unpaidAmount && unpaidAmount.total_amount > 0;

  const handleRequest = () => {
    if (hasUnpaidAmount) {
      createRequestMutation.mutate();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <LinearGradient
            colors={GRADIENT_COLORS.primaryShort}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.header}>
              <View style={styles.headerIconContainer}>
                <DollarSign size={24} color="white" />
              </View>
              <Text style={styles.headerTitle}>Request Payslip</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X size={20} color="white" />
              </Pressable>
            </View>
          </LinearGradient>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {calculating ? (
              <LoadingState variant="skeleton" />
            ) : !hasUnpaidAmount ? (
              <EmptyState
                icon={<AlertCircle size={48} color="#9ca3af" />}
                title="No Unpaid Amount"
                message="You don't have any unpaid attendance or commissions at this time."
              />
            ) : (
              <>
                <View style={styles.amountSection}>
                  <Text style={styles.sectionLabel}>Available for Payslip</Text>
                  <Text style={styles.totalAmount}>
                    {formatCurrency(unpaidAmount.total_amount)}
                  </Text>
                </View>

                <View style={styles.breakdownSection}>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>Attendance</Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(unpaidAmount.attendance_amount)}
                    </Text>
                  </View>
                  <View style={styles.breakdownItem}>
                    <Text style={styles.breakdownLabel}>Commissions</Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(unpaidAmount.commission_amount)}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    This amount includes all unpaid attendance bonuses and
                    commissions that haven&apos;t been included in previous
                    payslip releases.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>

          {!calculating && hasUnpaidAmount && (
            <View style={styles.footer}>
              <Pressable
                onPress={onClose}
                style={[styles.button, styles.cancelButton]}
                disabled={createRequestMutation.isPending}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleRequest}
                style={[styles.button, styles.submitButton]}
                disabled={createRequestMutation.isPending}
              >
                {createRequestMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <LinearGradient
                    colors={GRADIENT_COLORS.primaryShort}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitButtonGradient}
                  >
                    <Text style={styles.submitButtonText}>Request Payslip</Text>
                  </LinearGradient>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  headerGradient: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 22,
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 24,
    maxHeight: 400,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "#6b7280",
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  amountSection: {
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  sectionLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
    fontWeight: "600",
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -1,
  },
  breakdownSection: {
    marginBottom: 24,
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  breakdownLabel: {
    fontSize: 15,
    color: "#6b7280",
    fontWeight: "500",
  },
  breakdownValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "700",
  },
  infoBox: {
    backgroundColor: "#fdf2f8",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fce7f3",
  },
  infoText: {
    fontSize: 13,
    color: "#9f1239",
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  button: {
    flex: 1,
    height: 50,
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
  submitButton: {
    overflow: "hidden",
  },
  submitButtonGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
});
