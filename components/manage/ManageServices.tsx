import { queryClient } from "@/components/Providers/TanstackProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ResponsiveText } from "@/components/ui/ResponsiveText";
import {
  Toast,
  ToastDescription,
  ToastTitle,
  useToast,
} from "@/components/ui/toast";
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
} from "@/lib/utils/responsive";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Edit,
  MoreVertical,
  Plus,
  Restore,
  Sparkles,
  Trash2,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import ServiceFormModal from "./ServiceFormModal";
import ServiceSetFormModal from "./ServiceSetFormModal";

type Service = Database["public"]["Tables"]["service"]["Row"];
type Branch = Database["public"]["Enums"]["branch"];

type ManageTab = "services" | "serviceSets";

export default function ManageServices() {
  const [activeTab, setActiveTab] = useState<ManageTab>("services");
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showServiceSetModal, setShowServiceSetModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedServiceSet, setSelectedServiceSet] =
    useState<ServiceSetWithItems | null>(null);
  const [expandedServiceId, setExpandedServiceId] = useState<number | null>(
    null
  );
  const [expandedServiceSetId, setExpandedServiceSetId] = useState<
    number | null
  >(null);
  const toast = useToast();

  // Fetch all services
  const {
    data: servicesData,
    isLoading: servicesLoading,
    error: servicesError,
    refetch: refetchServices,
  } = useQuery({
    queryKey: ["all-services"],
    queryFn: getAllServicesAction,
  });

  const services = servicesData?.success ? servicesData.data || [] : [];

  // Fetch all service sets
  const { data: serviceSetsData, isLoading: serviceSetsLoading } = useQuery({
    queryKey: ["all-service-sets"],
    queryFn: async () => {
      // Fetch service sets for all branches
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

  // Group services by branch
  const servicesByBranch = useMemo(() => {
    const grouped: Record<Branch, Service[]> = {
      NAILS: [],
      SKIN: [],
      LASHES: [],
      MASSAGE: [],
    };

    services.forEach((service) => {
      if (grouped[service.branch]) {
        grouped[service.branch].push(service);
      }
    });

    return grouped;
  }, [services]);

  // Soft delete mutation
  const softDeleteMutation = useMutation({
    mutationFn: softDeleteServiceAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-services"] });
        queryClient.invalidateQueries({ queryKey: ["services"] });
        toast.show({
          placement: "top",
          duration: 2000,
          render: ({ id }) => (
            <Toast action="success" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>
                Service deactivated successfully
              </ToastDescription>
            </Toast>
          ),
        });
        setExpandedServiceId(null);
      } else {
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => (
            <Toast action="error" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>
                {result.error || "Failed to deactivate service"}
              </ToastDescription>
            </Toast>
          ),
        });
      }
    },
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: restoreServiceAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-services"] });
        queryClient.invalidateQueries({ queryKey: ["services"] });
        toast.show({
          placement: "top",
          duration: 2000,
          render: ({ id }) => (
            <Toast action="success" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>Service restored successfully</ToastDescription>
            </Toast>
          ),
        });
        setExpandedServiceId(null);
      } else {
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => (
            <Toast action="error" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>
                {result.error || "Failed to restore service"}
              </ToastDescription>
            </Toast>
          ),
        });
      }
    },
  });

  // Delete service set mutation
  const deleteServiceSetMutation = useMutation({
    mutationFn: deleteServiceSetAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-service-sets"] });
        queryClient.invalidateQueries({ queryKey: ["service-sets"] });
        toast.show({
          placement: "top",
          duration: 2000,
          render: ({ id }) => (
            <Toast action="success" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Success</ToastTitle>
              <ToastDescription>
                Service set deleted successfully
              </ToastDescription>
            </Toast>
          ),
        });
        setExpandedServiceSetId(null);
      } else {
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => (
            <Toast action="error" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>
                {result.error || "Failed to delete service set"}
              </ToastDescription>
            </Toast>
          ),
        });
      }
    },
  });

  const handleCreateService = () => {
    setSelectedService(null);
    setShowServiceModal(true);
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setShowServiceModal(true);
    setExpandedServiceId(null);
  };

  const handleDeleteService = (service: Service) => {
    Alert.alert(
      "Deactivate Service",
      `Are you sure you want to deactivate "${service.title}"? This will hide it from booking options but won't delete it.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: () => {
            softDeleteMutation.mutate(service.id);
          },
        },
      ]
    );
    setExpandedServiceId(null);
  };

  const handleRestoreService = (service: Service) => {
    restoreMutation.mutate(service.id);
    setExpandedServiceId(null);
  };

  const handleCreateServiceSet = () => {
    setSelectedServiceSet(null);
    setShowServiceSetModal(true);
  };

  const handleEditServiceSet = (serviceSet: ServiceSetWithItems) => {
    setSelectedServiceSet(serviceSet);
    setShowServiceSetModal(true);
    setExpandedServiceSetId(null);
  };

  const handleDeleteServiceSet = (serviceSet: ServiceSetWithItems) => {
    Alert.alert(
      "Delete Service Set",
      `Are you sure you want to delete "${serviceSet.title}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteServiceSetMutation.mutate(serviceSet.id);
          },
        },
      ]
    );
    setExpandedServiceSetId(null);
  };

  const toggleServiceActions = (serviceId: number) => {
    setExpandedServiceId(expandedServiceId === serviceId ? null : serviceId);
  };

  const toggleServiceSetActions = (serviceSetId: number) => {
    setExpandedServiceSetId(
      expandedServiceSetId === serviceSetId ? null : serviceSetId
    );
  };

  const isLoading = servicesLoading || serviceSetsLoading;
  const error = servicesError;
  const containerPadding = getContainerPadding();
  const iconSize = scaleDimension(20);
  const smallIconSize = scaleDimension(18);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <LoadingState variant="list" count={5} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <ErrorState
          message={
            error instanceof Error ? error.message : "Failed to load services"
          }
          title="Error Loading Services"
        />
        <Pressable style={styles.retryButton} onPress={() => refetchServices()}>
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

  return (
    <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
      {/* Tab Selector */}
      <View style={styles.tabSelector}>
        <Pressable
          onPress={() => setActiveTab("services")}
          style={[
            styles.tabButton,
            activeTab === "services" && styles.tabButtonActive,
          ]}
        >
          <ResponsiveText
            variant="sm"
            style={[
              styles.tabButtonText,
              activeTab === "services" && styles.tabButtonTextActive,
            ]}
            numberOfLines={1}
          >
            Services
          </ResponsiveText>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("serviceSets")}
          style={[
            styles.tabButton,
            activeTab === "serviceSets" && styles.tabButtonActive,
          ]}
        >
          <ResponsiveText
            variant="sm"
            style={[
              styles.tabButtonText,
              activeTab === "serviceSets" && styles.tabButtonTextActive,
            ]}
            numberOfLines={1}
          >
            Service Sets
          </ResponsiveText>
        </Pressable>
      </View>

      {/* Services Tab */}
      {activeTab === "services" && (
        <>
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <ResponsiveText
                variant="2xl"
                style={styles.headerTitle}
                numberOfLines={1}
              >
                Services
              </ResponsiveText>
              <ResponsiveText
                variant="sm"
                style={styles.headerSubtitle}
                numberOfLines={1}
              >
                {services.length} total service
                {services.length !== 1 ? "s" : ""}
              </ResponsiveText>
            </View>
            <Pressable onPress={handleCreateService} style={styles.addButton}>
              <Plus size={iconSize} color="white" />
              <ResponsiveText
                variant="sm"
                style={styles.addButtonText}
                numberOfLines={1}
              >
                Add Service
              </ResponsiveText>
            </Pressable>
          </View>

          {services.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={48} color="#9ca3af" />}
              title="No services found"
              message="Create your first service to get started."
            />
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {(["NAILS", "SKIN", "LASHES", "MASSAGE"] as Branch[]).map(
                (branch) => {
                  const branchServices = servicesByBranch[branch];
                  if (branchServices.length === 0) return null;

                  return (
                    <View key={branch} style={styles.branchSection}>
                      <ResponsiveText
                        variant="lg"
                        style={styles.branchTitle}
                        numberOfLines={1}
                      >
                        {branch}
                      </ResponsiveText>
                      {branchServices.map((service) => (
                        <View key={service.id} style={styles.serviceCard}>
                          <View style={styles.serviceContent}>
                            <View style={styles.serviceHeader}>
                              <ResponsiveText
                                variant="lg"
                                style={styles.serviceTitle}
                                numberOfLines={2}
                              >
                                {service.title}
                              </ResponsiveText>
                              {!service.is_active && (
                                <View style={styles.inactiveBadge}>
                                  <ResponsiveText
                                    variant="xs"
                                    style={styles.inactiveBadgeText}
                                    numberOfLines={1}
                                  >
                                    Inactive
                                  </ResponsiveText>
                                </View>
                              )}
                            </View>
                            {service.description && (
                              <ResponsiveText
                                variant="sm"
                                style={styles.serviceDescription}
                                numberOfLines={2}
                              >
                                {service.description}
                              </ResponsiveText>
                            )}
                            <View style={styles.serviceDetails}>
                              <ResponsiveText
                                variant="sm"
                                style={styles.serviceDetail}
                                numberOfLines={1}
                              >
                                {formatCurrency(service.price)}
                              </ResponsiveText>
                              <ResponsiveText
                                variant="sm"
                                style={styles.serviceDetailSeparator}
                                numberOfLines={1}
                              >
                                •
                              </ResponsiveText>
                              <ResponsiveText
                                variant="sm"
                                style={styles.serviceDetail}
                                numberOfLines={1}
                              >
                                {service.duration_minutes} min
                              </ResponsiveText>
                              {service.category && (
                                <>
                                  <ResponsiveText
                                    variant="sm"
                                    style={styles.serviceDetailSeparator}
                                    numberOfLines={1}
                                  >
                                    •
                                  </ResponsiveText>
                                  <ResponsiveText
                                    variant="sm"
                                    style={styles.serviceDetail}
                                    numberOfLines={1}
                                  >
                                    {service.category}
                                  </ResponsiveText>
                                </>
                              )}
                            </View>
                          </View>
                          <View style={styles.actionsContainer}>
                            <Pressable
                              style={styles.actionButton}
                              onPress={() => toggleServiceActions(service.id)}
                            >
                              <MoreVertical size={iconSize} color="#6b7280" />
                            </Pressable>
                            {expandedServiceId === service.id && (
                              <View style={styles.actionsMenu}>
                                <Pressable
                                  style={styles.actionMenuItem}
                                  onPress={() => handleEditService(service)}
                                >
                                  <Edit size={smallIconSize} color="#3b82f6" />
                                  <ResponsiveText
                                    variant="sm"
                                    style={styles.actionMenuText}
                                    numberOfLines={1}
                                  >
                                    Edit
                                  </ResponsiveText>
                                </Pressable>
                                <View style={styles.actionMenuDivider} />
                                {service.is_active ? (
                                  <Pressable
                                    style={[
                                      styles.actionMenuItem,
                                      styles.actionMenuItemDanger,
                                    ]}
                                    onPress={() => handleDeleteService(service)}
                                  >
                                    <Trash2
                                      size={smallIconSize}
                                      color="#ef4444"
                                    />
                                    <ResponsiveText
                                      variant="sm"
                                      style={[
                                        styles.actionMenuText,
                                        styles.actionMenuTextDanger,
                                      ]}
                                      numberOfLines={1}
                                    >
                                      Deactivate
                                    </ResponsiveText>
                                  </Pressable>
                                ) : (
                                  <Pressable
                                    style={styles.actionMenuItem}
                                    onPress={() =>
                                      handleRestoreService(service)
                                    }
                                  >
                                    <Restore
                                      size={smallIconSize}
                                      color="#10b981"
                                    />
                                    <ResponsiveText
                                      variant="sm"
                                      style={styles.actionMenuText}
                                      numberOfLines={1}
                                    >
                                      Restore
                                    </ResponsiveText>
                                  </Pressable>
                                )}
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                }
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* Service Sets Tab */}
      {activeTab === "serviceSets" && (
        <>
          <View style={styles.header}>
            <View style={styles.headerTextContainer}>
              <ResponsiveText
                variant="2xl"
                style={styles.headerTitle}
                numberOfLines={1}
              >
                Service Sets
              </ResponsiveText>
              <ResponsiveText
                variant="sm"
                style={styles.headerSubtitle}
                numberOfLines={1}
              >
                {serviceSets.length} total set
                {serviceSets.length !== 1 ? "s" : ""}
              </ResponsiveText>
            </View>
            <Pressable
              onPress={handleCreateServiceSet}
              style={styles.addButton}
            >
              <Plus size={iconSize} color="white" />
              <ResponsiveText
                variant="sm"
                style={styles.addButtonText}
                numberOfLines={1}
              >
                Add Set
              </ResponsiveText>
            </Pressable>
          </View>

          {serviceSets.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={48} color="#9ca3af" />}
              title="No service sets found"
              message="Create your first service set to bundle services together."
            />
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {serviceSets.map((serviceSet: any) => (
                <View key={serviceSet.id} style={styles.serviceCard}>
                  <View style={styles.serviceContent}>
                    <View style={styles.serviceHeader}>
                      <ResponsiveText
                        variant="lg"
                        style={styles.serviceTitle}
                        numberOfLines={2}
                      >
                        {serviceSet.title}
                      </ResponsiveText>
                      {!serviceSet.is_active && (
                        <View style={styles.inactiveBadge}>
                          <ResponsiveText
                            variant="xs"
                            style={styles.inactiveBadgeText}
                            numberOfLines={1}
                          >
                            Inactive
                          </ResponsiveText>
                        </View>
                      )}
                    </View>
                    {serviceSet.description && (
                      <ResponsiveText
                        variant="sm"
                        style={styles.serviceDescription}
                        numberOfLines={2}
                      >
                        {serviceSet.description}
                      </ResponsiveText>
                    )}
                    <View style={styles.serviceDetails}>
                      <ResponsiveText
                        variant="sm"
                        style={styles.serviceDetail}
                        numberOfLines={1}
                      >
                        {formatCurrency(serviceSet.price)}
                      </ResponsiveText>
                      <ResponsiveText
                        variant="sm"
                        style={styles.serviceDetailSeparator}
                        numberOfLines={1}
                      >
                        •
                      </ResponsiveText>
                      <ResponsiveText
                        variant="sm"
                        style={styles.serviceDetail}
                        numberOfLines={1}
                      >
                        {serviceSet.branch}
                      </ResponsiveText>
                      <ResponsiveText
                        variant="sm"
                        style={styles.serviceDetailSeparator}
                        numberOfLines={1}
                      >
                        •
                      </ResponsiveText>
                      <ResponsiveText
                        variant="sm"
                        style={styles.serviceDetail}
                        numberOfLines={1}
                      >
                        {serviceSet.service_set_items?.length || 0} services
                      </ResponsiveText>
                    </View>
                    {serviceSet.service_set_items &&
                      serviceSet.service_set_items.length > 0 && (
                        <View style={styles.serviceSetItems}>
                          <ResponsiveText
                            variant="xs"
                            style={styles.serviceSetItemsLabel}
                            numberOfLines={1}
                          >
                            Includes:
                          </ResponsiveText>
                          <ResponsiveText
                            variant="xs"
                            style={styles.serviceSetItemsList}
                            numberOfLines={3}
                          >
                            {serviceSet.service_set_items
                              .map(
                                (item: any) =>
                                  item.service?.title ||
                                  `Service ${item.service_id}`
                              )
                              .join(", ")}
                          </ResponsiveText>
                        </View>
                      )}
                  </View>
                  <View style={styles.actionsContainer}>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => toggleServiceSetActions(serviceSet.id)}
                    >
                      <MoreVertical size={iconSize} color="#6b7280" />
                    </Pressable>
                    {expandedServiceSetId === serviceSet.id && (
                      <View style={styles.actionsMenu}>
                        <Pressable
                          style={styles.actionMenuItem}
                          onPress={() => handleEditServiceSet(serviceSet)}
                        >
                          <Edit size={smallIconSize} color="#3b82f6" />
                          <ResponsiveText
                            variant="sm"
                            style={styles.actionMenuText}
                            numberOfLines={1}
                          >
                            Edit
                          </ResponsiveText>
                        </Pressable>
                        <View style={styles.actionMenuDivider} />
                        <Pressable
                          style={[
                            styles.actionMenuItem,
                            styles.actionMenuItemDanger,
                          ]}
                          onPress={() => handleDeleteServiceSet(serviceSet)}
                        >
                          <Trash2 size={smallIconSize} color="#ef4444" />
                          <ResponsiveText
                            variant="sm"
                            style={[
                              styles.actionMenuText,
                              styles.actionMenuTextDanger,
                            ]}
                            numberOfLines={1}
                          >
                            Delete
                          </ResponsiveText>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}

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
    paddingTop: scaleDimension(20),
  },
  tabSelector: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(4),
    marginBottom: scaleDimension(20),
    ...PLATFORM.shadowMd,
  },
  tabButton: {
    flex: 1,
    paddingVertical: scaleDimension(10),
    paddingHorizontal: scaleDimension(16),
    borderRadius: scaleDimension(8),
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#fdf2f8",
  },
  tabButtonText: {
    fontWeight: "600",
    color: "#6b7280",
  },
  tabButtonTextActive: {
    color: "#ec4899",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleDimension(20),
  },
  headerTextContainer: {
    flex: 1,
    minWidth: 0, // Prevents text overflow
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
  branchSection: {
    marginBottom: scaleDimension(24),
  },
  branchTitle: {
    fontWeight: "700",
    color: "#111827",
    marginBottom: scaleDimension(12),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  serviceCard: {
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
  serviceContent: {
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  serviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
    marginBottom: scaleDimension(8),
  },
  serviceTitle: {
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  inactiveBadge: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: scaleDimension(8),
    paddingVertical: scaleDimension(4),
    borderRadius: scaleDimension(6),
  },
  inactiveBadgeText: {
    color: "#dc2626",
    fontWeight: "600",
  },
  serviceDescription: {
    color: "#6b7280",
    marginBottom: scaleDimension(8),
  },
  serviceDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
    flexWrap: "wrap",
  },
  serviceDetail: {
    color: "#6b7280",
    fontWeight: "500",
  },
  serviceDetailSeparator: {
    color: "#d1d5db",
  },
  serviceSetItems: {
    marginTop: scaleDimension(8),
    paddingTop: scaleDimension(8),
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  serviceSetItemsLabel: {
    color: "#9ca3af",
    fontWeight: "600",
    marginBottom: scaleDimension(4),
  },
  serviceSetItemsList: {
    color: "#6b7280",
  },
  actionsContainer: {
    position: "relative",
    marginLeft: scaleDimension(12),
  },
  actionButton: {
    padding: scaleDimension(8),
  },
  actionsMenu: {
    position: "absolute",
    top: scaleDimension(40),
    right: 0,
    backgroundColor: "white",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(8),
    minWidth: scaleDimension(160),
    ...PLATFORM.shadowLg,
    zIndex: 1000,
  },
  actionMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(12),
    paddingVertical: scaleDimension(12),
    paddingHorizontal: scaleDimension(12),
  },
  actionMenuItemDanger: {
    // Styled via text color
  },
  actionMenuText: {
    color: "#374151",
    fontWeight: "500",
  },
  actionMenuTextDanger: {
    color: "#ef4444",
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: scaleDimension(4),
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
