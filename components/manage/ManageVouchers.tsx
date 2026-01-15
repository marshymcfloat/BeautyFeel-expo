import { queryClient } from "@/components/Providers/TanstackProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ResponsiveText } from "@/components/ui/ResponsiveText";
import { useToast } from "@/components/ui/toast";
import {
  deleteVoucherAction,
  getAllVouchers,
} from "@/lib/actions/voucherActions";
import { formatCurrency } from "@/lib/utils/currency";
import {
  scaleDimension,
  getContainerPadding,
  PLATFORM,
} from "@/lib/utils/responsive";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Ticket } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import VoucherFormModal from "./VoucherFormModal";

type VoucherStatus = "ACTIVE" | "USED" | "EXPIRED";

type VoucherWithCustomer = {
  id: number;
  code: string;
  value: number;
  created_at: string;
  status: VoucherStatus;
  expires_on: string | null;
  customer_id?: number | null;
  customer?: {
    id: number;
    name: string;
    email: string | null;
  } | null;
};

export default function ManageVouchers({
  onRefetchReady,
}: {
  onRefetchReady?: (refetch: () => void) => void;
}) {
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const toast = useToast();

  // Fetch all vouchers
  const {
    data: vouchersData,
    isLoading: vouchersLoading,
    error: vouchersError,
    refetch: refetchVouchers,
  } = useQuery({
    queryKey: ["all-vouchers"],
    queryFn: getAllVouchers,
  });

  const vouchers: VoucherWithCustomer[] = vouchersData?.success
    ? (vouchersData.data as VoucherWithCustomer[]) || []
    : [];

  // Expose refetch function to parent
  React.useEffect(() => {
    if (onRefetchReady) {
      onRefetchReady(() => refetchVouchers());
    }
  }, [onRefetchReady, refetchVouchers]);

  const deleteMutation = useMutation({
    mutationFn: deleteVoucherAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-vouchers"] });
        toast.success("Voucher Deleted", "Voucher deleted successfully");
      } else {
        toast.error("Error", result.error || "Failed to delete voucher");
      }
    },
    onError: (error) => {
      toast.error("Error", error.message || "Failed to delete voucher");
    },
  });

  const handleDelete = (voucher: VoucherWithCustomer) => {
    Alert.alert(
      "Delete Voucher",
      `Are you sure you want to delete voucher ${voucher.code}? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(voucher.id),
        },
      ]
    );
  };

  const isLoading = vouchersLoading;
  const containerPadding = getContainerPadding();
  const iconSize = scaleDimension(20);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <LoadingState variant="list" count={5} />
      </View>
    );
  }

  if (vouchersError) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <ErrorState
          message={
            vouchersError instanceof Error
              ? vouchersError.message
              : "Failed to load vouchers"
          }
          title="Error Loading Vouchers"
        />
        <Pressable
          style={styles.retryButton}
          onPress={() => refetchVouchers()}
        >
          <ResponsiveText variant="md" style={styles.retryButtonText} numberOfLines={1}>
            Retry
          </ResponsiveText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <ResponsiveText variant="2xl" style={styles.headerTitle} numberOfLines={1}>
            Vouchers
          </ResponsiveText>
          <ResponsiveText variant="sm" style={styles.headerSubtitle} numberOfLines={1}>
            {vouchers.length} total voucher{vouchers.length !== 1 ? "s" : ""}
          </ResponsiveText>
        </View>
        <Pressable
          onPress={() => setShowVoucherModal(true)}
          style={styles.addButton}
        >
          <Plus size={iconSize} color="white" />
          <ResponsiveText variant="sm" style={styles.addButtonText} numberOfLines={1}>
            Create Voucher
          </ResponsiveText>
        </Pressable>
      </View>

      {vouchers.length === 0 ? (
        <EmptyState
          icon={<Ticket size={48} color="#9ca3af" />}
          title="No vouchers found"
          message="Create your first voucher to get started."
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {vouchers.map((voucher) => (
            <View key={voucher.id} style={styles.voucherCard}>
              <View style={styles.voucherContent}>
                <View style={styles.voucherHeader}>
                  <View style={styles.codeContainer}>
                    <Ticket size={18} color="#ec4899" />
                    <ResponsiveText variant="lg" style={styles.voucherCode} numberOfLines={1}>
                      {voucher.code}
                    </ResponsiveText>
                    {voucher.status === "USED" ? (
                      <View style={styles.usedBadge}>
                        <ResponsiveText variant="xs" style={styles.usedBadgeText} numberOfLines={1}>
                          Used
                        </ResponsiveText>
                      </View>
                    ) : voucher.status === "EXPIRED" ? (
                      <View style={styles.expiredBadge}>
                        <ResponsiveText variant="xs" style={styles.expiredBadgeText} numberOfLines={1}>
                          Expired
                        </ResponsiveText>
                      </View>
                    ) : (
                      <View style={styles.activeBadge}>
                        <ResponsiveText variant="xs" style={styles.activeBadgeText} numberOfLines={1}>
                          Active
                        </ResponsiveText>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.voucherDetails}>
                  <View style={styles.detailRow}>
                    <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                      Value:
                    </ResponsiveText>
                    <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                      {formatCurrency(voucher.value)}
                    </ResponsiveText>
                  </View>
                  {voucher.customer && (
                    <View style={styles.detailRow}>
                      <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                        Customer:
                      </ResponsiveText>
                      <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                        {voucher.customer.name}
                      </ResponsiveText>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                      Created:
                    </ResponsiveText>
                    <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                      {new Date(voucher.created_at).toLocaleDateString()}
                    </ResponsiveText>
                  </View>
                  {voucher.expires_on && (
                    <View style={styles.detailRow}>
                      <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                        Expires:
                      </ResponsiveText>
                      <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                        {new Date(voucher.expires_on).toLocaleDateString()}
                      </ResponsiveText>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                      Status:
                    </ResponsiveText>
                    <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                      {voucher.status}
                    </ResponsiveText>
                  </View>
                </View>
              </View>
              {voucher.status === "ACTIVE" && (
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDelete(voucher)}
                >
                  <Trash2 size={iconSize} color="#ef4444" />
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Modal */}
      <VoucherFormModal
        visible={showVoucherModal}
        onClose={() => {
          setShowVoucherModal(false);
        }}
        onSuccess={() => {
          setShowVoucherModal(false);
        }}
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
  addButtonText: {
    color: "white",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scaleDimension(100),
  },
  voucherCard: {
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
  voucherContent: {
    flex: 1,
    minWidth: 0,
  },
  voucherHeader: {
    marginBottom: scaleDimension(12),
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
    flexWrap: "wrap",
  },
  voucherCode: {
    fontWeight: "700",
    color: "#111827",
    fontFamily: "monospace",
  },
  usedBadge: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: scaleDimension(8),
    paddingVertical: scaleDimension(4),
    borderRadius: scaleDimension(6),
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  usedBadgeText: {
    color: "#dc2626",
    fontWeight: "600",
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
  voucherDetails: {
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
  deleteButton: {
    padding: scaleDimension(8),
    marginLeft: scaleDimension(12),
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

