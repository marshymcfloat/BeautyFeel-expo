import { queryClient } from "@/components/Providers/TanstackProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ResponsiveText } from "@/components/ui/ResponsiveText";
import { useToast } from "@/components/ui/toast";
import {
  deleteGiftCertificateAction,
  getAllGiftCertificates,
  type GiftCertificateWithRelations,
} from "@/lib/actions/giftCertificateActions";
import { formatCurrency } from "@/lib/utils/currency";
import {
  scaleDimension,
  getContainerPadding,
  PLATFORM,
} from "@/lib/utils/responsive";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Gift, Plus, Trash2 } from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import GiftCertificateFormModal from "./GiftCertificateFormModal";

type GiftCertificateStatus = "ACTIVE" | "USED" | "EXPIRED";

export default function ManageGiftCertificates() {
  const [showGiftCertificateModal, setShowGiftCertificateModal] = useState(false);
  const toast = useToast();

  // Fetch all gift certificates
  const {
    data: giftCertificatesData,
    isLoading: giftCertificatesLoading,
    error: giftCertificatesError,
    refetch: refetchGiftCertificates,
  } = useQuery({
    queryKey: ["all-gift-certificates"],
    queryFn: getAllGiftCertificates,
  });

  const giftCertificates: GiftCertificateWithRelations[] = giftCertificatesData?.success
    ? (giftCertificatesData.data as GiftCertificateWithRelations[]) || []
    : [];

  const deleteMutation = useMutation({
    mutationFn: deleteGiftCertificateAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-gift-certificates"] });
        toast.success("Gift Certificate Deleted", "Gift certificate deleted successfully");
      } else {
        toast.error("Error", result.error || "Failed to delete gift certificate");
      }
    },
    onError: (error) => {
      toast.error("Error", error.message || "Failed to delete gift certificate");
    },
  });

  const handleDelete = (giftCertificate: GiftCertificateWithRelations) => {
    Alert.alert(
      "Delete Gift Certificate",
      `Are you sure you want to delete gift certificate ${giftCertificate.code}? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(giftCertificate.id),
        },
      ]
    );
  };

  const getStatusBadge = (status: GiftCertificateStatus) => {
    switch (status) {
      case "USED":
        return (
          <View style={styles.usedBadge}>
            <ResponsiveText variant="xs" style={styles.usedBadgeText} numberOfLines={1}>
              Used
            </ResponsiveText>
          </View>
        );
      case "EXPIRED":
        return (
          <View style={styles.expiredBadge}>
            <ResponsiveText variant="xs" style={styles.expiredBadgeText} numberOfLines={1}>
              Expired
            </ResponsiveText>
          </View>
        );
      default:
        return (
          <View style={styles.activeBadge}>
            <ResponsiveText variant="xs" style={styles.activeBadgeText} numberOfLines={1}>
              Active
            </ResponsiveText>
          </View>
        );
    }
  };

  const isLoading = giftCertificatesLoading;
  const containerPadding = getContainerPadding();
  const iconSize = scaleDimension(20);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <LoadingState variant="list" count={5} />
      </View>
    );
  }

  if (giftCertificatesError) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <ErrorState
          message={
            giftCertificatesError instanceof Error
              ? giftCertificatesError.message
              : "Failed to load gift certificates"
          }
          title="Error Loading Gift Certificates"
        />
        <Pressable
          style={styles.retryButton}
          onPress={() => refetchGiftCertificates()}
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
            Gift Certificates
          </ResponsiveText>
          <ResponsiveText variant="sm" style={styles.headerSubtitle} numberOfLines={1}>
            {giftCertificates.length} total gift certificate{giftCertificates.length !== 1 ? "s" : ""}
          </ResponsiveText>
        </View>
        <Pressable
          onPress={() => setShowGiftCertificateModal(true)}
          style={styles.addButton}
        >
          <Plus size={iconSize} color="white" />
          <ResponsiveText variant="sm" style={styles.addButtonText} numberOfLines={1}>
            Create Gift Certificate
          </ResponsiveText>
        </Pressable>
      </View>

      {giftCertificates.length === 0 ? (
        <EmptyState
          icon={<Gift size={48} color="#9ca3af" />}
          title="No gift certificates found"
          message="Create your first gift certificate to get started."
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {giftCertificates.map((gc) => {
            const totalValue =
              (gc.services?.reduce((sum, s) => sum + (s.service.price || 0) * s.quantity, 0) || 0) +
              (gc.service_sets?.reduce((sum, s) => sum + (s.service_set.price || 0) * s.quantity, 0) || 0);

            return (
              <View key={gc.id} style={styles.giftCertificateCard}>
                <View style={styles.giftCertificateContent}>
                  <View style={styles.giftCertificateHeader}>
                    <View style={styles.codeContainer}>
                      <Gift size={18} color="#ec4899" />
                      <ResponsiveText variant="lg" style={styles.giftCertificateCode} numberOfLines={1}>
                        {gc.code}
                      </ResponsiveText>
                      {getStatusBadge(gc.status as GiftCertificateStatus)}
                    </View>
                  </View>
                  <View style={styles.giftCertificateDetails}>
                    {totalValue > 0 && (
                      <View style={styles.detailRow}>
                        <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                          Total Value:
                        </ResponsiveText>
                        <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                          {formatCurrency(totalValue)}
                        </ResponsiveText>
                      </View>
                    )}
                    {gc.services && gc.services.length > 0 && (
                      <View style={styles.detailRow}>
                        <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                          Services:
                        </ResponsiveText>
                        <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                          {gc.services.length} service{gc.services.length !== 1 ? "s" : ""}
                        </ResponsiveText>
                      </View>
                    )}
                    {gc.service_sets && gc.service_sets.length > 0 && (
                      <View style={styles.detailRow}>
                        <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                          Service Sets:
                        </ResponsiveText>
                        <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                          {gc.service_sets.length} set{gc.service_sets.length !== 1 ? "s" : ""}
                        </ResponsiveText>
                      </View>
                    )}
                    {gc.customer && (
                      <View style={styles.detailRow}>
                        <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                          Customer:
                        </ResponsiveText>
                        <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                          {gc.customer.name}
                        </ResponsiveText>
                      </View>
                    )}
                    {gc.customer_name && !gc.customer && (
                      <View style={styles.detailRow}>
                        <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                          Customer:
                        </ResponsiveText>
                        <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                          {gc.customer_name}
                        </ResponsiveText>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                        Created:
                      </ResponsiveText>
                      <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                        {new Date(gc.created_at).toLocaleDateString()}
                      </ResponsiveText>
                    </View>
                    {gc.expires_on && (
                      <View style={styles.detailRow}>
                        <ResponsiveText variant="sm" style={styles.detailLabel} numberOfLines={1}>
                          Expires:
                        </ResponsiveText>
                        <ResponsiveText variant="sm" style={styles.detailValue} numberOfLines={1}>
                          {new Date(gc.expires_on).toLocaleDateString()}
                        </ResponsiveText>
                      </View>
                    )}
                  </View>
                </View>
                {gc.status === "ACTIVE" && (
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDelete(gc)}
                  >
                    <Trash2 size={iconSize} color="#ef4444" />
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Modal */}
      <GiftCertificateFormModal
        visible={showGiftCertificateModal}
        onClose={() => {
          setShowGiftCertificateModal(false);
        }}
        onSuccess={() => {
          setShowGiftCertificateModal(false);
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
  giftCertificateCard: {
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
  giftCertificateContent: {
    flex: 1,
    minWidth: 0,
  },
  giftCertificateHeader: {
    marginBottom: scaleDimension(12),
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
    flexWrap: "wrap",
  },
  giftCertificateCode: {
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
  giftCertificateDetails: {
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

