import { queryClient } from "@/components/Providers/TanstackProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ResponsiveText } from "@/components/ui/ResponsiveText";
import { useToast } from "@/components/ui/toast";
import type { Database } from "@/database.types";
import {
  getAllServicesAction,
  restoreServiceAction,
  softDeleteServiceAction,
} from "@/lib/actions/serviceActions";
import type { ServiceSetWithItems } from "@/lib/actions/serviceSetActions";
import {
  deleteServiceSetAction,
  getServiceSetsForBranch,
} from "@/lib/actions/serviceSetActions";
import { formatCurrency } from "@/lib/utils/currency";
import {
  getContainerPadding,
  PLATFORM,
  scaleDimension,
  scaleFont,
} from "@/lib/utils/responsive";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Archive,
  Clock,
  Edit2,
  Layers,
  LayoutGrid,
  Plus,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import ServiceFormModal from "./ServiceFormModal";
import ServiceSetFormModal from "./ServiceSetFormModal";

type Service = Database["public"]["Tables"]["service"]["Row"];
type Branch = Database["public"]["Enums"]["branch"];

type ManageTab = "services" | "serviceSets";

export default function ManageServices({
  onRefetchReady,
}: {
  onRefetchReady?: (refetch: () => void) => void;
}) {
  const [activeTab, setActiveTab] = useState<ManageTab>("services");
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showServiceSetModal, setShowServiceSetModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedServiceSet, setSelectedServiceSet] =
    useState<ServiceSetWithItems | null>(null);

  const toast = useToast();
  const containerPadding = getContainerPadding();

  // --- Data Fetching ---
  const {
    data: servicesData,
    isLoading: servicesLoading,
    error: servicesError,
    refetch: refetchServices,
  } = useQuery({
    queryKey: ["all-services"],
    queryFn: getAllServicesAction,
  });

  const services: Service[] = servicesData?.success
    ? servicesData.data || []
    : [];

  const { data: serviceSetsData, isLoading: serviceSetsLoading } = useQuery({
    queryKey: ["all-service-sets"],
    queryFn: async () => {
      const branches: Branch[] = ["NAILS", "SKIN", "LASHES", "MASSAGE"];
      const allSets: ServiceSetWithItems[] = [];
      for (const branch of branches) {
        const result = await getServiceSetsForBranch(branch);
        if (result.success && result.data) {
          allSets.push(...(result.data as any[]));
        }
      }
      return { success: true, data: allSets };
    },
  });

  const serviceSets = serviceSetsData?.success
    ? (serviceSetsData.data as any[])
    : [];

  // Expose refetch function to parent
  React.useEffect(() => {
    if (onRefetchReady) {
      onRefetchReady(() => refetchServices());
    }
  }, [onRefetchReady, refetchServices]);

  const servicesByBranch = useMemo(() => {
    const grouped: Record<Branch, Service[]> = {
      NAILS: [],
      SKIN: [],
      LASHES: [],
      MASSAGE: [],
    };
    services.forEach((service) => {
      const branch = service.branch as keyof typeof grouped;
      if (grouped[branch]) {
        grouped[branch].push(service);
      }
    });
    return grouped;
  }, [services]);

  // --- Mutations ---
  const softDeleteMutation = useMutation({
    mutationFn: softDeleteServiceAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-services"] });
        queryClient.invalidateQueries({ queryKey: ["services"] });
        toast.success("Deactivated", "Service is now inactive.");
      } else {
        toast.error("Error", result.error || "Failed");
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: restoreServiceAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-services"] });
        queryClient.invalidateQueries({ queryKey: ["services"] });
        toast.success("Restored", "Service is active again.");
      } else {
        toast.error("Error", result.error || "Failed");
      }
    },
  });

  const deleteServiceSetMutation = useMutation({
    mutationFn: deleteServiceSetAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-service-sets"] });
        queryClient.invalidateQueries({ queryKey: ["service-sets"] });
        toast.success("Deleted", "Service set removed.");
      } else {
        toast.error("Error", result.error || "Failed");
      }
    },
  });

  // --- Handlers ---
  const handleCreateService = () => {
    setSelectedService(null);
    setShowServiceModal(true);
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setShowServiceModal(true);
  };

  const handleDeleteService = (service: Service) => {
    Alert.alert(
      "Deactivate Service",
      `Hide "${service.title}" from booking options?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: () => softDeleteMutation.mutate(service.id),
        },
      ]
    );
  };

  const handleCreateServiceSet = () => {
    setSelectedServiceSet(null);
    setShowServiceSetModal(true);
  };

  const handleEditServiceSet = (serviceSet: ServiceSetWithItems) => {
    setSelectedServiceSet(serviceSet);
    setShowServiceSetModal(true);
  };

  const handleDeleteServiceSet = (serviceSet: ServiceSetWithItems) => {
    Alert.alert(
      "Delete Service Set",
      `Permanently delete "${serviceSet.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteServiceSetMutation.mutate(serviceSet.id),
        },
      ]
    );
  };

  const isLoading = servicesLoading || serviceSetsLoading;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <LoadingState variant="list" count={5} />
      </View>
    );
  }

  if (servicesError) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <ErrorState message="Failed to load services" />
        <Pressable style={styles.retryButton} onPress={() => refetchServices()}>
          <ResponsiveText variant="md" style={styles.retryButtonText}>
            Retry
          </ResponsiveText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
      {/* Header & Tabs */}
      <View style={styles.topSection}>
        <View style={styles.tabContainer}>
          <Pressable
            onPress={() => setActiveTab("services")}
            style={[styles.tab, activeTab === "services" && styles.tabActive]}
          >
            <LayoutGrid
              size={16}
              color={activeTab === "services" ? "#ec4899" : "#6b7280"}
            />
            <ResponsiveText
              variant="sm"
              style={[
                styles.tabText,
                activeTab === "services" && styles.tabTextActive,
              ]}
            >
              Services
            </ResponsiveText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("serviceSets")}
            style={[
              styles.tab,
              activeTab === "serviceSets" && styles.tabActive,
            ]}
          >
            <Layers
              size={16}
              color={activeTab === "serviceSets" ? "#ec4899" : "#6b7280"}
            />
            <ResponsiveText
              variant="sm"
              style={[
                styles.tabText,
                activeTab === "serviceSets" && styles.tabTextActive,
              ]}
            >
              Service Sets
            </ResponsiveText>
          </Pressable>
        </View>

        <Pressable
          onPress={
            activeTab === "services"
              ? handleCreateService
              : handleCreateServiceSet
          }
          style={styles.addButton}
        >
          <Plus size={20} color="white" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "services" ? (
          services.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={48} color="#9ca3af" />}
              title="No services found"
              message="Create your first service to get started."
            />
          ) : (
            (["NAILS", "SKIN", "LASHES", "MASSAGE"] as Branch[]).map(
              (branch) => {
                const branchServices = servicesByBranch[branch];
                if (branchServices.length === 0) return null;

                return (
                  <View key={branch} style={styles.section}>
                    <ResponsiveText variant="lg" style={styles.sectionTitle}>
                      {branch}
                    </ResponsiveText>
                    {branchServices.map((service) => (
                      <View
                        key={service.id}
                        style={[
                          styles.card,
                          !service.is_active && styles.cardInactive,
                        ]}
                      >
                        <View style={styles.cardHeader}>
                          <View style={styles.cardHeaderLeft}>
                            <ResponsiveText
                              variant="lg"
                              style={[
                                styles.cardTitle,
                                !service.is_active && styles.textInactive,
                              ]}
                            >
                              {service.title}
                            </ResponsiveText>
                            {service.category && (
                              <View style={styles.categoryTag}>
                                <ResponsiveText
                                  variant="xs"
                                  style={styles.categoryText}
                                >
                                  {service.category}
                                </ResponsiveText>
                              </View>
                            )}
                          </View>
                          <ResponsiveText
                            variant="lg"
                            style={[
                              styles.priceText,
                              !service.is_active && styles.textInactive,
                            ]}
                          >
                            {formatCurrency(service.price)}
                          </ResponsiveText>
                        </View>

                        <View style={styles.cardMeta}>
                          <View style={styles.metaItem}>
                            <Clock size={14} color="#6b7280" />
                            <ResponsiveText
                              variant="sm"
                              style={styles.metaText}
                            >
                              {service.duration_minutes} min
                            </ResponsiveText>
                          </View>
                        </View>

                        {service.description && (
                          <ResponsiveText
                            variant="sm"
                            style={styles.description}
                            numberOfLines={2}
                          >
                            {service.description}
                          </ResponsiveText>
                        )}

                        <View style={styles.cardFooter}>
                          <Pressable
                            style={styles.footerButton}
                            onPress={() => handleEditService(service)}
                          >
                            <Edit2 size={16} color="#3b82f6" />
                            <ResponsiveText
                              variant="sm"
                              style={styles.footerButtonText}
                            >
                              Edit
                            </ResponsiveText>
                          </Pressable>

                          <View style={styles.footerDivider} />

                          {service.is_active ? (
                            <Pressable
                              style={styles.footerButton}
                              onPress={() => handleDeleteService(service)}
                            >
                              <Archive size={16} color="#ef4444" />
                              <ResponsiveText
                                variant="sm"
                                style={[
                                  styles.footerButtonText,
                                  styles.textDanger,
                                ]}
                              >
                                Deactivate
                              </ResponsiveText>
                            </Pressable>
                          ) : (
                            <Pressable
                              style={styles.footerButton}
                              onPress={() => restoreMutation.mutate(service.id)}
                            >
                              <RotateCcw size={16} color="#10b981" />
                              <ResponsiveText
                                variant="sm"
                                style={[
                                  styles.footerButtonText,
                                  styles.textSuccess,
                                ]}
                              >
                                Restore
                              </ResponsiveText>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              }
            )
          )
        ) : (
          /* Service Sets Tab */
          <>
            {serviceSets.length === 0 ? (
              <EmptyState
                icon={<Layers size={48} color="#9ca3af" />}
                title="No service sets"
                message="Bundle services together for packages."
              />
            ) : (
              serviceSets.map((serviceSet: any) => (
                <View key={serviceSet.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <ResponsiveText variant="lg" style={styles.cardTitle}>
                        {serviceSet.title}
                      </ResponsiveText>
                      <View style={styles.branchTag}>
                        <ResponsiveText variant="xs" style={styles.branchText}>
                          {serviceSet.branch}
                        </ResponsiveText>
                      </View>
                    </View>
                    <ResponsiveText variant="lg" style={styles.priceText}>
                      {formatCurrency(serviceSet.price)}
                    </ResponsiveText>
                  </View>

                  <ResponsiveText
                    variant="sm"
                    style={styles.description}
                    numberOfLines={2}
                  >
                    {serviceSet.description || "No description provided."}
                  </ResponsiveText>

                  <View style={styles.setIncludes}>
                    <ResponsiveText
                      variant="xs"
                      style={styles.setIncludesLabel}
                    >
                      Includes {serviceSet.service_set_items?.length || 0}{" "}
                      items:
                    </ResponsiveText>
                    <View style={styles.tagsRow}>
                      {serviceSet.service_set_items?.map(
                        (item: any, idx: number) => (
                          <View key={idx} style={styles.serviceTag}>
                            <Tag size={10} color="#6b7280" />
                            <ResponsiveText
                              variant="xs"
                              style={styles.serviceTagText}
                            >
                              {item.service?.title}
                            </ResponsiveText>
                          </View>
                        )
                      )}
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Pressable
                      style={styles.footerButton}
                      onPress={() => handleEditServiceSet(serviceSet)}
                    >
                      <Edit2 size={16} color="#3b82f6" />
                      <ResponsiveText
                        variant="sm"
                        style={styles.footerButtonText}
                      >
                        Edit
                      </ResponsiveText>
                    </Pressable>
                    <View style={styles.footerDivider} />
                    <Pressable
                      style={styles.footerButton}
                      onPress={() => handleDeleteServiceSet(serviceSet)}
                    >
                      <Trash2 size={16} color="#ef4444" />
                      <ResponsiveText
                        variant="sm"
                        style={[styles.footerButtonText, styles.textDanger]}
                      >
                        Delete
                      </ResponsiveText>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <ServiceFormModal
        visible={showServiceModal}
        onClose={() => {
          setShowServiceModal(false);
          setSelectedService(null);
        }}
        existingService={selectedService}
        onSuccess={() => {
          setShowServiceModal(false);
          setSelectedService(null);
        }}
      />

      <ServiceSetFormModal
        visible={showServiceSetModal}
        onClose={() => {
          setShowServiceSetModal(false);
          setSelectedServiceSet(null);
        }}
        existingServiceSet={selectedServiceSet}
        onSuccess={() => {
          setShowServiceSetModal(false);
          setSelectedServiceSet(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scaleDimension(16),
    gap: scaleDimension(12),
  },
  tabContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "white",
    padding: scaleDimension(4),
    borderRadius: scaleDimension(12),
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scaleDimension(8),
    gap: scaleDimension(6),
    borderRadius: scaleDimension(8),
  },
  tabActive: {
    backgroundColor: "#fdf2f8",
  },
  tabText: {
    fontWeight: "600",
    color: "#6b7280",
  },
  tabTextActive: {
    color: "#ec4899",
  },
  addButton: {
    width: scaleDimension(44),
    height: scaleDimension(44),
    backgroundColor: "#ec4899",
    borderRadius: scaleDimension(12),
    alignItems: "center",
    justifyContent: "center",
    ...PLATFORM.shadow,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scaleDimension(100),
  },
  section: {
    marginBottom: scaleDimension(24),
  },
  sectionTitle: {
    fontWeight: "800",
    color: "#111827",
    marginBottom: scaleDimension(12),
    textTransform: "uppercase",
    fontSize: scaleFont(14),
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "white",
    borderRadius: scaleDimension(16),
    marginBottom: scaleDimension(12),
    borderWidth: 1,
    borderColor: "#f3f4f6",
    overflow: "hidden",
    ...PLATFORM.shadow,
  },
  cardInactive: {
    opacity: 0.75,
    backgroundColor: "#f9fafb",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: scaleDimension(16),
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: scaleDimension(12),
  },
  cardTitle: {
    fontWeight: "700",
    color: "#111827",
    marginBottom: scaleDimension(4),
    flexWrap: "wrap",
  },
  textInactive: {
    color: "#6b7280",
    textDecorationLine: "line-through",
  },
  priceText: {
    fontWeight: "800",
    color: "#ec4899",
  },
  categoryTag: {
    alignSelf: "flex-start",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: scaleDimension(8),
    paddingVertical: scaleDimension(2),
    borderRadius: scaleDimension(4),
  },
  categoryText: {
    color: "#4b5563",
    fontWeight: "500",
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaleDimension(16),
    marginBottom: scaleDimension(8),
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(4),
  },
  metaText: {
    color: "#6b7280",
    fontWeight: "500",
  },
  description: {
    paddingHorizontal: scaleDimension(16),
    marginBottom: scaleDimension(16),
    color: "#6b7280",
  },
  cardFooter: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#fafafa",
  },
  footerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scaleDimension(12),
    gap: scaleDimension(8),
  },
  footerButtonText: {
    fontWeight: "600",
    color: "#374151",
  },
  footerDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: scaleDimension(8),
  },
  textDanger: {
    color: "#ef4444",
  },
  textSuccess: {
    color: "#10b981",
  },
  branchTag: {
    alignSelf: "flex-start",
    backgroundColor: "#eff6ff",
    paddingHorizontal: scaleDimension(8),
    paddingVertical: scaleDimension(2),
    borderRadius: scaleDimension(4),
    marginTop: scaleDimension(4),
  },
  branchText: {
    color: "#2563eb",
    fontWeight: "600",
    fontSize: scaleFont(10),
  },
  setIncludes: {
    paddingHorizontal: scaleDimension(16),
    marginBottom: scaleDimension(16),
  },
  setIncludesLabel: {
    color: "#9ca3af",
    marginBottom: scaleDimension(6),
    fontWeight: "600",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleDimension(6),
  },
  serviceTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: scaleDimension(8),
    paddingVertical: scaleDimension(4),
    borderRadius: scaleDimension(12),
    gap: scaleDimension(4),
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  serviceTagText: {
    color: "#4b5563",
    fontWeight: "500",
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
