import { queryClient } from "@/components/Providers/TanstackProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ResponsiveText } from "@/components/ui/ResponsiveText";
import { useToast } from "@/components/ui/toast";
import {
  cancelDiscountAction,
  deleteDiscountAction,
  getAllDiscounts,
  type DiscountWithServices,
} from "@/lib/actions/discountActions";
import { formatCurrency } from "@/lib/utils/currency";
import {
  getContainerPadding,
  PLATFORM,
  scaleDimension,
} from "@/lib/utils/responsive";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Tag, Trash2, X } from "lucide-react-native";
import React, { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import DiscountFormModal from "./DiscountFormModal";

export default function ManageDiscounts() {
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingDiscount, setEditingDiscount] =
    useState<DiscountWithServices | null>(null);
  const toast = useToast();

  // Fetch all discounts
  const {
    data: discountsData,
    isLoading: discountsLoading,
    error: discountsError,
    refetch: refetchDiscounts,
  } = useQuery({
    queryKey: ["all-discounts"],
    queryFn: getAllDiscounts,
  });

  const discounts: DiscountWithServices[] = discountsData?.success
    ? (discountsData.data as DiscountWithServices[]) || []
    : [];

  const activeDiscount = discounts.find((d) => d.status === "ACTIVE");

  const deleteMutation = useMutation({
    mutationFn: deleteDiscountAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-discounts"] });
        toast.success("Discount Deleted", "Discount deleted successfully");
      } else {
        toast.error("Error", result.error || "Failed to delete discount");
      }
    },
    onError: (error) => {
      toast.error("Error", error.message || "Failed to delete discount");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelDiscountAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-discounts"] });
        toast.success("Discount Cancelled", "Discount cancelled successfully");
      } else {
        toast.error("Error", result.error || "Failed to cancel discount");
      }
    },
    onError: (error) => {
      toast.error("Error", error.message || "Failed to cancel discount");
    },
  });

  const handleDelete = (discount: DiscountWithServices) => {
    Alert.alert(
      "Delete Discount",
      `Are you sure you want to delete "${discount.name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(discount.id),
        },
      ]
    );
  };

  const handleCancel = (discount: DiscountWithServices) => {
    Alert.alert(
      "Cancel Discount",
      `Are you sure you want to cancel "${discount.name}"?`,
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => cancelMutation.mutate(discount.id),
        },
      ]
    );
  };

  const handleEdit = (discount: DiscountWithServices) => {
    setEditingDiscount(discount);
    setShowDiscountModal(true);
  };

  const handleCloseModal = () => {
    setShowDiscountModal(false);
    setEditingDiscount(null);
  };

  const isLoading = discountsLoading;
  const containerPadding = getContainerPadding();
  const iconSize = scaleDimension(20);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <LoadingState variant="list" count={5} />
      </View>
    );
  }

  if (discountsError) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <ErrorState
          message={
            discountsError instanceof Error
              ? discountsError.message
              : "Failed to load discounts"
          }
          title="Error Loading Discounts"
        />
        <Pressable
          style={styles.retryButton}
          onPress={() => refetchDiscounts()}
        >
          <ResponsiveText
            variant="md"
            style={styles.retryButtonText}
            numberOfLines={1}
          >
            Retry
          </ResponsiveText>
        </Pressable>
      </View>
    );
  }

  const formatDiscountValue = (discount: DiscountWithServices) => {
    if (discount.discount_type === "PERCENTAGE") {
      return `${discount.discount_value}%`;
    }
    return formatCurrency(discount.discount_value);
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  };

  return (
    <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <ResponsiveText
            variant="2xl"
            style={styles.headerTitle}
            numberOfLines={1}
          >
            Discounts
          </ResponsiveText>
          <ResponsiveText
            variant="sm"
            style={styles.headerSubtitle}
            numberOfLines={1}
          >
            {discounts.length} total discount{discounts.length !== 1 ? "s" : ""}
            {activeDiscount && " • 1 active"}
          </ResponsiveText>
        </View>
        <Pressable
          onPress={() => {
            if (activeDiscount) {
              Alert.alert(
                "Active Discount Exists",
                "Only one active discount can exist at a time. Please cancel or wait for the current discount to expire before creating a new one.",
                [{ text: "OK" }]
              );
            } else {
              setShowDiscountModal(true);
            }
          }}
          style={[styles.addButton, activeDiscount && styles.addButtonDisabled]}
          disabled={!!activeDiscount}
        >
          <Plus size={iconSize} color="white" />
          <ResponsiveText
            variant="sm"
            style={styles.addButtonText}
            numberOfLines={1}
          >
            Create Discount
          </ResponsiveText>
        </Pressable>
      </View>

      {activeDiscount && (
        <View style={styles.activeDiscountBanner}>
          <Tag size={18} color="#16a34a" />
          <View style={styles.activeDiscountContent}>
            <ResponsiveText
              variant="sm"
              style={styles.activeDiscountTitle}
              numberOfLines={1}
            >
              Active Discount: {activeDiscount.name}
            </ResponsiveText>
            <ResponsiveText
              variant="xs"
              style={styles.activeDiscountSubtitle}
              numberOfLines={1}
            >
              {formatDateRange(
                activeDiscount.start_date,
                activeDiscount.end_date
              )}
            </ResponsiveText>
          </View>
          <Pressable
            onPress={() => handleCancel(activeDiscount)}
            style={styles.cancelButton}
          >
            <X size={16} color="#dc2626" />
          </Pressable>
        </View>
      )}

      {discounts.length === 0 ? (
        <EmptyState
          icon={<Tag size={48} color="#9ca3af" />}
          title="No discounts found"
          message="Create your first discount to get started."
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {discounts.map((discount) => (
            <View key={discount.id} style={styles.discountCard}>
              <View style={styles.discountContent}>
                <View style={styles.discountHeader}>
                  <View style={styles.nameContainer}>
                    <Tag size={18} color="#ec4899" />
                    <ResponsiveText
                      variant="lg"
                      style={styles.discountName}
                      numberOfLines={1}
                    >
                      {discount.name}
                    </ResponsiveText>
                    {discount.status === "ACTIVE" ? (
                      <View style={styles.activeBadge}>
                        <ResponsiveText
                          variant="xs"
                          style={styles.activeBadgeText}
                          numberOfLines={1}
                        >
                          Active
                        </ResponsiveText>
                      </View>
                    ) : discount.status === "EXPIRED" ? (
                      <View style={styles.expiredBadge}>
                        <ResponsiveText
                          variant="xs"
                          style={styles.expiredBadgeText}
                          numberOfLines={1}
                        >
                          Expired
                        </ResponsiveText>
                      </View>
                    ) : (
                      <View style={styles.cancelledBadge}>
                        <ResponsiveText
                          variant="xs"
                          style={styles.cancelledBadgeText}
                          numberOfLines={1}
                        >
                          Cancelled
                        </ResponsiveText>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.discountDetails}>
                  <View style={styles.detailRow}>
                    <ResponsiveText
                      variant="sm"
                      style={styles.detailLabel}
                      numberOfLines={1}
                    >
                      Discount:
                    </ResponsiveText>
                    <ResponsiveText
                      variant="sm"
                      style={styles.detailValue}
                      numberOfLines={1}
                    >
                      {formatDiscountValue(discount)}
                    </ResponsiveText>
                  </View>
                  <View style={styles.detailRow}>
                    <ResponsiveText
                      variant="sm"
                      style={styles.detailLabel}
                      numberOfLines={1}
                    >
                      Type:
                    </ResponsiveText>
                    <ResponsiveText
                      variant="sm"
                      style={styles.detailValue}
                      numberOfLines={1}
                    >
                      {discount.discount_type}
                    </ResponsiveText>
                  </View>
                  {discount.branch && (
                    <View style={styles.detailRow}>
                      <ResponsiveText
                        variant="sm"
                        style={styles.detailLabel}
                        numberOfLines={1}
                      >
                        Branch:
                      </ResponsiveText>
                      <ResponsiveText
                        variant="sm"
                        style={styles.detailValue}
                        numberOfLines={1}
                      >
                        {discount.branch}
                      </ResponsiveText>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <ResponsiveText
                      variant="sm"
                      style={styles.detailLabel}
                      numberOfLines={1}
                    >
                      Period:
                    </ResponsiveText>
                    <ResponsiveText
                      variant="sm"
                      style={styles.detailValue}
                      numberOfLines={1}
                    >
                      {formatDateRange(discount.start_date, discount.end_date)}
                    </ResponsiveText>
                  </View>
                  {discount.discount_services &&
                    discount.discount_services.length > 0 && (
                      <View style={styles.detailRow}>
                        <ResponsiveText
                          variant="sm"
                          style={styles.detailLabel}
                          numberOfLines={1}
                        >
                          Services:
                        </ResponsiveText>
                        <ResponsiveText
                          variant="sm"
                          style={styles.detailValue}
                          numberOfLines={1}
                        >
                          {discount.discount_services.length} service
                          {discount.discount_services.length !== 1 ? "s" : ""}
                        </ResponsiveText>
                      </View>
                    )}
                </View>
              </View>
              <View style={styles.actionsContainer}>
                {discount.status === "ACTIVE" && (
                  <Pressable
                    style={styles.cancelIconButton}
                    onPress={() => handleCancel(discount)}
                  >
                    <X size={iconSize} color="#dc2626" />
                  </Pressable>
                )}
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDelete(discount)}
                >
                  <Trash2 size={iconSize} color="#ef4444" />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modal */}
      <DiscountFormModal
        visible={showDiscountModal}
        onClose={handleCloseModal}
        onSuccess={() => {
          handleCloseModal();
        }}
        existingDiscount={editingDiscount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: scaleDimension(20),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleDimension(20),
  },
  headerTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: "#6b7280",
    marginTop: scaleDimension(4),
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ec4899",
    paddingHorizontal: scaleDimension(16),
    paddingVertical: scaleDimension(10),
    borderRadius: scaleDimension(12),
    gap: scaleDimension(8),
    ...PLATFORM.shadowLg,
  },
  addButtonDisabled: {
    backgroundColor: "#d1d5db",
    opacity: 0.6,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
  },
  activeDiscountBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    padding: scaleDimension(12),
    borderRadius: scaleDimension(12),
    marginBottom: scaleDimension(16),
    borderWidth: 1,
    borderColor: "#bbf7d0",
    gap: scaleDimension(8),
  },
  activeDiscountContent: {
    flex: 1,
    minWidth: 0,
  },
  activeDiscountTitle: {
    color: "#16a34a",
    fontWeight: "600",
  },
  activeDiscountSubtitle: {
    color: "#15803d",
    marginTop: scaleDimension(2),
  },
  cancelButton: {
    padding: scaleDimension(4),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scaleDimension(100),
  },
  discountCard: {
    backgroundColor: "white",
    borderRadius: scaleDimension(16),
    padding: scaleDimension(16),
    marginBottom: scaleDimension(12),
    borderWidth: 1,
    borderColor: "#f3f4f6",
    flexDirection: "row",
    justifyContent: "space-between",
    ...PLATFORM.shadow,
  },
  discountContent: {
    flex: 1,
    minWidth: 0,
  },
  discountHeader: {
    marginBottom: scaleDimension(12),
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
    flexWrap: "wrap",
  },
  discountName: {
    fontWeight: "700",
    color: "#111827",
  },
  activeBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: scaleDimension(8),
    paddingVertical: scaleDimension(4),
    borderRadius: scaleDimension(6),
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  activeBadgeText: {
    color: "#16a34a",
    fontWeight: "600",
  },
  expiredBadge: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: scaleDimension(8),
    paddingVertical: scaleDimension(4),
    borderRadius: scaleDimension(6),
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  expiredBadgeText: {
    color: "#dc2626",
    fontWeight: "600",
  },
  cancelledBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: scaleDimension(8),
    paddingVertical: scaleDimension(4),
    borderRadius: scaleDimension(6),
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cancelledBadgeText: {
    color: "#6b7280",
    fontWeight: "600",
  },
  discountDetails: {
    gap: scaleDimension(8),
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  detailLabel: {
    color: "#6b7280",
    fontWeight: "500",
  },
  detailValue: {
    color: "#111827",
    fontWeight: "600",
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
    marginLeft: scaleDimension(12),
  },
  cancelIconButton: {
    padding: scaleDimension(8),
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    padding: scaleDimension(8),
    justifyContent: "center",
    alignItems: "center",
  },
  retryButton: {
    marginTop: scaleDimension(16),
    padding: scaleDimension(12),
    backgroundColor: "#ec4899",
    borderRadius: scaleDimension(8),
    alignItems: "center",
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
