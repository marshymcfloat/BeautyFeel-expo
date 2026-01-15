import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import type { Database } from "@/database.types";
import {
  approvePayslipRequestAction,
  getAllPayslipRequests,
  rejectPayslipRequestAction,
  type PayslipRequestWithEmployee,
} from "@/lib/actions/payslipActions";
import { formatCurrency } from "@/lib/utils/currency";
import { scaleDimension } from "@/lib/utils/responsive";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  User,
  XCircle,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { queryClient } from "../Providers/TanstackProvider";
import { useToast } from "../ui/toast";

type Branch = Database["public"]["Enums"]["branch"];

export default function PayslipRequestsManager({
  ownerBranch,
}: {
  ownerBranch?: Branch | null;
}) {
  const toast = useToast();
  const [selectedRequest, setSelectedRequest] =
    useState<PayslipRequestWithEmployee | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["payslip-requests", ownerBranch],
    queryFn: () => getAllPayslipRequests(ownerBranch || null),
    refetchInterval: 10000,
  });

  const approveMutation = useMutation({
    mutationFn: approvePayslipRequestAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["payslip-requests"] });
        queryClient.invalidateQueries({ queryKey: ["my-payslip-requests"] });
        queryClient.invalidateQueries({ queryKey: ["all-employees"] });
        queryClient.invalidateQueries({ queryKey: ["unpaid-payslip-amount"] });
        queryClient.invalidateQueries({ queryKey: ["employees-attendance"] });

        toast.success(
          "Payslip Approved",
          "Payslip approved. Employee salary reset to ₱0.00 and payslip requests disabled."
        );
        setShowActionModal(false);
        setSelectedRequest(null);
      } else {
        toast.error(
          "Error",
          result.error || "Failed to approve payslip request"
        );
      }
    },
    onError: (error: Error) => {
      console.error("Approve mutation error:", error);
      toast.error("Error", error.message || "An unexpected error occurred");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectPayslipRequestAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["payslip-requests"] });
        queryClient.invalidateQueries({ queryKey: ["my-payslip-requests"] });
        queryClient.invalidateQueries({ queryKey: ["all-employees"] });
        queryClient.invalidateQueries({ queryKey: ["employees-attendance"] });
        toast.success("Payslip Rejected", "Payslip request has been rejected.");
        setShowActionModal(false);
        setSelectedRequest(null);
        setRejectionReason("");
      } else {
        toast.error(
          "Error",
          result.error || "Failed to reject payslip request"
        );
      }
    },
    onError: (error: Error) => {
      console.error("Reject mutation error:", error);
      toast.error("Error", error.message || "An unexpected error occurred");
    },
  });

  const requests = requestsData?.data || [];
  const pendingRequests = requests.filter((r) => r.status === "PENDING");

  const handleApprove = (request: PayslipRequestWithEmployee) => {
    setSelectedRequest(request);
    setActionType("approve");
    setShowActionModal(true);
  };

  const handleReject = (request: PayslipRequestWithEmployee) => {
    setSelectedRequest(request);
    setActionType("reject");
    setRejectionReason("");
    setShowActionModal(true);
  };

  const confirmAction = () => {
    if (!selectedRequest) {
      return;
    }

    if (actionType === "approve") {
      approveMutation.mutate({
        requestId: selectedRequest.id,
        periodStartDate: undefined,
        periodEndDate: undefined,
      });
    } else if (actionType === "reject") {
      if (!rejectionReason.trim()) {
        toast.error("Error", "Please provide a rejection reason");
        return;
      }
      rejectMutation.mutate({
        requestId: selectedRequest.id,
        rejectionReason: rejectionReason.trim(),
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <LinearGradient
            colors={["#fdf2f8", "#fce7f3"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrapper}>
                <LinearGradient
                  colors={["#ec4899", "#db2777"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <FileText size={scaleDimension(22)} color="white" />
                </LinearGradient>
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.title}>Payslip Requests</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
        <LoadingState variant="skeleton" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerShadowWrapper}>
        <View style={styles.header}>
          <LinearGradient
            colors={["#fdf2f8", "#fce7f3"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrapper}>
                <LinearGradient
                  colors={["#ec4899", "#db2777"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <FileText size={scaleDimension(22)} color="white" />
                </LinearGradient>
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.title}>Payslip Requests</Text>
                <View style={styles.badgeContainer}>
                  <View style={styles.badge}>
                    <Clock size={scaleDimension(14)} color="#f59e0b" />
                    <Text style={styles.badgeText}>
                      {pendingRequests.length} Pending
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>

      {pendingRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon={<CheckCircle2 size={64} color="#d1d5db" />}
            title="No Pending Requests"
            message="There are no pending payslip requests at this time."
          />
        </View>
      ) : (
        <View style={styles.requestsList}>
          {pendingRequests.map((request) => (
            <PayslipRequestCard
              key={request.id}
              request={request}
              onApprove={() => handleApprove(request)}
              onReject={() => handleReject(request)}
            />
          ))}
        </View>
      )}

      <Modal
        visible={showActionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowActionModal(false)}
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setShowActionModal(false)}
          />
          <Pressable
            style={styles.modalContentWrapper}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalShadowWrapper}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {actionType === "approve"
                      ? "Approve Payslip"
                      : "Reject Payslip"}
                  </Text>
                  <Pressable onPress={() => setShowActionModal(false)}>
                    <XCircle size={24} color="#6b7280" />
                  </Pressable>
                </View>

                {selectedRequest && (
                  <View style={styles.modalBody}>
                    <View style={styles.requestInfo}>
                      <Text style={styles.infoLabel}>Employee</Text>
                      <Text style={styles.infoValue}>
                        {typeof selectedRequest.employee === "object" &&
                        selectedRequest.employee
                          ? selectedRequest.employee.name ||
                            `Employee ${selectedRequest.employee.id.slice(
                              0,
                              8
                            )}`
                          : "Unknown"}
                      </Text>
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.infoLabel}>Amount</Text>
                      <Text style={styles.infoValue}>
                        {formatCurrency(selectedRequest.requested_amount)}
                      </Text>
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.infoLabel}>Attendance</Text>
                      <Text style={styles.infoValue}>
                        {formatCurrency(
                          selectedRequest.calculated_attendance_amount
                        )}
                      </Text>
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.infoLabel}>Commissions</Text>
                      <Text style={styles.infoValue}>
                        {formatCurrency(
                          selectedRequest.calculated_commission_amount
                        )}
                      </Text>
                    </View>
                    {actionType === "approve" &&
                      selectedRequest.calculated_commission_amount > 0 && (
                        <View style={styles.requestInfo}>
                          <Text style={styles.infoLabel}>Note</Text>
                          <Text style={styles.infoNote}>
                            Sales deduction will be applied based on employee's
                            deduction rate
                          </Text>
                        </View>
                      )}

                    {actionType === "reject" && (
                      <View style={styles.rejectionReasonContainer}>
                        <Text style={styles.rejectionReasonLabel}>
                          Rejection Reason *
                        </Text>
                        <TextInput
                          style={styles.rejectionReasonInput}
                          placeholder="Enter reason for rejection..."
                          value={rejectionReason}
                          onChangeText={setRejectionReason}
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                        />
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.modalFooter}>
                  <Pressable
                    onPress={() => setShowActionModal(false)}
                    style={[styles.modalButton, styles.cancelButton]}
                    disabled={
                      approveMutation.isPending || rejectMutation.isPending
                    }
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <View
                    style={[
                      styles.modalButton,
                      styles.confirmButtonShadowWrapper,
                    ]}
                  >
                    <Pressable
                      onPress={confirmAction}
                      style={[styles.modalButton, styles.confirmButton]}
                      disabled={
                        approveMutation.isPending || rejectMutation.isPending
                      }
                    >
                      {approveMutation.isPending || rejectMutation.isPending ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <LinearGradient
                          colors={
                            actionType === "approve"
                              ? ["#10b981", "#059669"]
                              : ["#ef4444", "#dc2626"]
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.confirmButtonGradient}
                        >
                          <Text style={styles.confirmButtonText}>
                            {actionType === "approve" ? "Approve" : "Reject"}
                          </Text>
                        </LinearGradient>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

interface PayslipRequestCardProps {
  request: PayslipRequestWithEmployee;
  onApprove: () => void;
  onReject: () => void;
}

function PayslipRequestCard({
  request,
  onApprove,
  onReject,
}: PayslipRequestCardProps) {
  const employee =
    typeof request.employee === "object" ? request.employee : null;

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestCardHeader}>
        <View style={styles.requestCardLeft}>
          <View style={styles.requestAvatar}>
            <User size={18} color="white" />
          </View>
          <View style={styles.requestInfoContainer}>
            <Text style={styles.requestEmployeeName}>
              {employee
                ? employee.name || `Employee ${employee.id.slice(0, 8)}`
                : "Unknown Employee"}
            </Text>
            <Text style={styles.requestDate}>
              {new Date(request.requested_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>
        {/* Status badge stays top right, flexible text to left pushes against it */}
        <View style={styles.statusBadge}>
          <Clock size={14} color="#f59e0b" />
          <Text style={styles.statusText}>PENDING</Text>
        </View>
      </View>

      <View style={styles.requestAmountSection}>
        <Text style={styles.amountLabel}>Requested Amount</Text>
        <Text style={styles.amountValue}>
          {formatCurrency(request.requested_amount)}
        </Text>
      </View>

      <View style={styles.requestBreakdown}>
        <View style={styles.breakdownItem}>
          <DollarSign size={14} color="#6b7280" />
          <Text style={styles.breakdownLabel}>Attendance:</Text>
          <Text style={styles.breakdownValue}>
            {formatCurrency(request.calculated_attendance_amount)}
          </Text>
        </View>
        <View style={styles.breakdownItem}>
          <DollarSign size={14} color="#6b7280" />
          <Text style={styles.breakdownLabel}>Commissions:</Text>
          <Text style={styles.breakdownValue}>
            {formatCurrency(request.calculated_commission_amount)}
          </Text>
        </View>
      </View>

      <View style={styles.requestActions}>
        <Pressable
          onPress={onReject}
          style={[styles.actionButton, styles.rejectButton]}
        >
          <XCircle size={16} color="#ef4444" />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </Pressable>
        <View style={[styles.actionButton, styles.approveButtonShadowWrapper]}>
          <Pressable onPress={onApprove} style={styles.approveButton}>
            <LinearGradient
              colors={["#10b981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.approveButtonGradient}
            >
              <CheckCircle2 size={16} color="white" />
              <Text style={styles.approveButtonText}>Approve</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: scaleDimension(8),
    backgroundColor: "transparent",
  },
  headerShadowWrapper: {
    marginBottom: scaleDimension(24),
    borderRadius: scaleDimension(24),
    backgroundColor: "white",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  header: {
    borderRadius: scaleDimension(24),
    overflow: "hidden",
  },
  headerGradient: {
    padding: scaleDimension(20),
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(16),
  },
  headerIconWrapper: {
    width: scaleDimension(56),
    height: scaleDimension(56),
    borderRadius: scaleDimension(16),
    overflow: "hidden",
  },
  iconGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: scaleDimension(24),
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
    marginBottom: scaleDimension(8),
    flexWrap: "wrap",
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(4),
    paddingHorizontal: scaleDimension(10),
    paddingVertical: scaleDimension(6),
    borderRadius: scaleDimension(12),
    backgroundColor: "rgba(236, 72, 153, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(236, 72, 153, 0.2)",
  },
  badgeText: {
    fontSize: scaleDimension(12),
    fontWeight: "700",
    color: "#ec4899",
  },
  emptyContainer: {
    paddingVertical: scaleDimension(40),
  },
  requestsList: {
    gap: scaleDimension(16),
  },
  requestCard: {
    backgroundColor: "white",
    borderRadius: scaleDimension(20),
    padding: scaleDimension(24),
    borderWidth: 1.5,
    borderColor: "#f3f4f6",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  requestCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: scaleDimension(20),
  },
  requestCardLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scaleDimension(14),
    flex: 1,
    marginRight: scaleDimension(8),
  },
  requestAvatar: {
    width: scaleDimension(48),
    height: scaleDimension(48),
    borderRadius: scaleDimension(24),
    backgroundColor: "#ec4899",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#ec4899",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  requestInfoContainer: {
    flex: 1, // Allow text to take up space and wrap
  },
  requestEmployeeName: {
    fontSize: scaleDimension(18),
    fontWeight: "700",
    color: "#111827",
    marginBottom: scaleDimension(4),
    flexWrap: "wrap",
    letterSpacing: -0.3,
  },
  requestDate: {
    fontSize: scaleDimension(13),
    color: "#6b7280",
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(6),
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(8),
    borderRadius: scaleDimension(16),
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  statusText: {
    fontSize: scaleDimension(11),
    fontWeight: "700",
    color: "#f59e0b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  requestAmountSection: {
    marginBottom: scaleDimension(16),
    paddingBottom: scaleDimension(16),
    borderBottomWidth: 1.5,
    borderBottomColor: "#e5e7eb",
  },
  amountLabel: {
    fontSize: scaleDimension(13),
    color: "#6b7280",
    marginBottom: scaleDimension(6),
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: scaleDimension(28),
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  requestBreakdown: {
    marginBottom: scaleDimension(20),
    gap: scaleDimension(10),
    backgroundColor: "#f9fafb",
    padding: scaleDimension(16),
    borderRadius: scaleDimension(12),
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
  },
  breakdownLabel: {
    fontSize: scaleDimension(14),
    color: "#6b7280",
    flex: 1,
    fontWeight: "500",
  },
  breakdownValue: {
    fontSize: scaleDimension(15),
    fontWeight: "700",
    color: "#111827",
  },
  requestActions: {
    flexDirection: "row",
    gap: scaleDimension(12),
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scaleDimension(14),
    borderRadius: scaleDimension(14),
    gap: scaleDimension(8),
  },
  rejectButton: {
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderColor: "#fee2e2",
  },
  rejectButtonText: {
    fontSize: scaleDimension(15),
    fontWeight: "700",
    color: "#ef4444",
  },
  approveButtonShadowWrapper: {
    flex: 1,
    borderRadius: scaleDimension(14),
    backgroundColor: "white",
    ...Platform.select({
      ios: {
        shadowColor: "#10b981",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  approveButton: {
    flex: 1,
    borderRadius: scaleDimension(14),
    overflow: "hidden",
  },
  approveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scaleDimension(14),
    gap: scaleDimension(8),
  },
  approveButtonText: {
    fontSize: scaleDimension(15),
    fontWeight: "700",
    color: "white",
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContentWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: scaleDimension(20),
  },
  modalShadowWrapper: {
    width: "100%",
    maxWidth: scaleDimension(400),
    maxHeight: "80%",
    borderRadius: scaleDimension(28),
    backgroundColor: "white",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  modalContent: {
    borderRadius: scaleDimension(28),
    overflow: "hidden",
    height: "100%", // Ensure content fills the wrapper
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: scaleDimension(24),
    borderBottomWidth: 1.5,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  modalTitle: {
    fontSize: scaleDimension(22),
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  modalBody: {
    padding: scaleDimension(24),
    maxHeight: 400,
  },
  requestInfo: {
    marginBottom: scaleDimension(18),
    paddingBottom: scaleDimension(16),
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoLabel: {
    fontSize: scaleDimension(12),
    color: "#6b7280",
    marginBottom: scaleDimension(6),
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: scaleDimension(18),
    fontWeight: "700",
    color: "#111827",
    flexWrap: "wrap",
    letterSpacing: -0.3,
  },
  rejectionReasonContainer: {
    marginTop: scaleDimension(12),
  },
  rejectionReasonLabel: {
    fontSize: scaleDimension(14),
    fontWeight: "600",
    color: "#111827",
    marginBottom: scaleDimension(10),
  },
  infoNote: {
    fontSize: scaleDimension(12),
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: scaleDimension(6),
    flexWrap: "wrap",
    lineHeight: scaleDimension(18),
  },
  rejectionReasonInput: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: scaleDimension(14),
    padding: scaleDimension(14),
    fontSize: scaleDimension(14),
    color: "#111827",
    minHeight: scaleDimension(120),
    backgroundColor: "#f9fafb",
  },
  modalFooter: {
    flexDirection: "row",
    padding: scaleDimension(24),
    gap: scaleDimension(12),
    borderTopWidth: 1.5,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  modalButton: {
    flex: 1,
    height: scaleDimension(52),
    borderRadius: scaleDimension(14),
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cancelButtonText: {
    fontSize: scaleDimension(16),
    fontWeight: "600",
    color: "#374151",
  },
  confirmButtonShadowWrapper: {
    borderRadius: scaleDimension(14),
    backgroundColor: "white",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  confirmButton: {
    flex: 1,
    borderRadius: scaleDimension(14),
    overflow: "hidden",
  },
  confirmButtonGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    fontSize: scaleDimension(16),
    fontWeight: "700",
    color: "white",
    letterSpacing: 0.3,
  },
});
