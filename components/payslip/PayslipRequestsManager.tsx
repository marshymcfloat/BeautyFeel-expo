import {
  approvePayslipRequestAction,
  getAllPayslipRequests,
  rejectPayslipRequestAction,
  type PayslipRequestWithEmployee,
} from "@/lib/actions/payslipActions";
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
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { queryClient } from "../Providers/TanstackProvider";
import { useToast } from "../ui/toast";
import { formatCurrency } from "@/lib/utils/currency";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";

export default function PayslipRequestsManager() {
  const toast = useToast();
  const [selectedRequest, setSelectedRequest] =
    useState<PayslipRequestWithEmployee | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null
  );
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch all payslip requests
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["payslip-requests"],
    queryFn: getAllPayslipRequests,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: approvePayslipRequestAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["payslip-requests"] });
        queryClient.invalidateQueries({ queryKey: ["my-payslip-requests"] });
        queryClient.invalidateQueries({ queryKey: ["all-employees"] });
        queryClient.invalidateQueries({ queryKey: ["unpaid-payslip-amount"] });

        toast.success(
          "Payslip Approved",
          "Payslip approved. Employee salary reset to ₱0.00 and payslip requests disabled."
        );
        setShowActionModal(false);
        setSelectedRequest(null);
      } else {
        toast.error("Error", result.error || "Failed to approve payslip request");
      }
    },
    onError: (error: Error) => {
      console.error("Approve mutation error:", error);
      toast.error("Error", error.message || "An unexpected error occurred");
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: rejectPayslipRequestAction,
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate all related queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["payslip-requests"] });
        queryClient.invalidateQueries({ queryKey: ["my-payslip-requests"] });
        queryClient.invalidateQueries({ queryKey: ["all-employees"] });
        toast.success("Payslip Rejected", "Payslip request has been rejected.");
        setShowActionModal(false);
        setSelectedRequest(null);
        setRejectionReason("");
      } else {
        toast.error("Error", result.error || "Failed to reject payslip request");
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
      console.log("No selected request, cannot confirm action");
      return;
    }

    console.log("Confirming action:", {
      actionType,
      requestId: selectedRequest.id,
    });

    if (actionType === "approve") {
      console.log("Calling approve mutation...");
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
      console.log("Calling reject mutation...");
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
          <Text style={styles.title}>Payslip Requests</Text>
        </View>
        <LoadingState variant="skeleton" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrapper}>
            <FileText size={22} color="#ec4899" />
          </View>
          <View>
            <Text style={styles.title}>Payslip Requests</Text>
            <Text style={styles.subtitle}>
              {pendingRequests.length} pending request
              {pendingRequests.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      </View>

      {pendingRequests.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={48} color="#9ca3af" />}
          title="No Pending Requests"
          message="There are no pending payslip requests at this time."
        />
      ) : (
        <ScrollView
          style={styles.requestsList}
          showsVerticalScrollIndicator={false}
        >
          {pendingRequests.map((request) => (
            <PayslipRequestCard
              key={request.id}
              request={request}
              onApprove={() => handleApprove(request)}
              onReject={() => handleReject(request)}
            />
          ))}
        </ScrollView>
      )}

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setShowActionModal(false)}
          />
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
                        `Employee ${selectedRequest.employee.id.slice(0, 8)}`
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
                    {formatCurrency(selectedRequest.calculated_attendance_amount)}
                  </Text>
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.infoLabel}>Commissions</Text>
                  <Text style={styles.infoValue}>
                    {formatCurrency(selectedRequest.calculated_commission_amount)}
                  </Text>
                </View>

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
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={confirmAction}
                style={[styles.modalButton, styles.confirmButton]}
                disabled={approveMutation.isPending || rejectMutation.isPending}
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
          <View>
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
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  header: {
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fdf2f8",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
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
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  requestsList: {
    gap: 16,
  },
  requestCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  requestCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  requestCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ec4899",
    alignItems: "center",
    justifyContent: "center",
  },
  requestEmployeeName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  requestDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#fef3c7",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f59e0b",
    textTransform: "uppercase",
  },
  requestAmountSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  amountLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "600",
  },
  amountValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  requestBreakdown: {
    marginBottom: 16,
    gap: 8,
  },
  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    color: "#6b7280",
    flex: 1,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  requestActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  rejectButton: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ef4444",
  },
  approveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  approveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
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
  modalContent: {
    backgroundColor: "white",
    borderRadius: 24,
    width: "90%",
    maxHeight: "80%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  requestInfo: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  rejectionReasonContainer: {
    marginTop: 8,
  },
  rejectionReasonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  rejectionReasonInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    minHeight: 100,
    backgroundColor: "#f9fafb",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  modalButton: {
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
  confirmButton: {
    overflow: "hidden",
  },
  confirmButtonGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
});
