import type { Database } from "@/database.types";
import type { ServiceSetWithItems } from "@/lib/actions/serviceSetActions";
import { COLORS } from "@/lib/utils/constants";
import { formatCurrency } from "@/lib/utils/currency";
import { Minus, Plus } from "lucide-react-native";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Service = Database["public"]["Tables"]["service"]["Row"];

interface SelectedService {
  serviceId: number;
  quantity: number;
  service: Service;
}

interface SelectedServiceSet {
  serviceSetId: number;
  quantity: number;
  serviceSet: ServiceSetWithItems;
}

interface SelectedItemsListProps {
  services: SelectedService[];
  serviceSets: SelectedServiceSet[];
  onRemoveService: (serviceId: number) => void;
  onUpdateServiceQuantity: (serviceId: number, delta: number) => void;
  onRemoveServiceSet: (serviceSetId: number) => void;
  onUpdateServiceSetQuantity: (serviceSetId: number, delta: number) => void;
}

export function SelectedItemsList({
  services,
  serviceSets,
  onRemoveService,
  onUpdateServiceQuantity,
  onRemoveServiceSet,
  onUpdateServiceSetQuantity,
}: SelectedItemsListProps) {
  const servicesTotal = services.reduce(
    (sum, s) => sum + (s.service.price || 0) * s.quantity,
    0
  );
  const serviceSetsTotal = serviceSets.reduce(
    (sum, s) => sum + (s.serviceSet.price || 0) * s.quantity,
    0
  );
  const grandTotal = servicesTotal + serviceSetsTotal;

  const hasItems = services.length > 0 || serviceSets.length > 0;

  if (!hasItems) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No items selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Services Section */}
      {services.length > 0 && (
        <View style={styles.section}>
          {services.length > 0 && serviceSets.length > 0 && (
            <Text style={styles.sectionLabel}>Services</Text>
          )}
          <ScrollView
            style={styles.itemsListContainer}
            contentContainerStyle={styles.itemsList}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {services.map((selectedService) => {
              const itemPrice =
                (selectedService.service.price || 0) * selectedService.quantity;
              return (
                <View key={selectedService.serviceId} style={styles.item}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {selectedService.service.title}
                      </Text>
                      <Text style={styles.itemSubtitle}>
                        {formatCurrency(selectedService.service.price)} ×{" "}
                        {selectedService.quantity}
                      </Text>
                    </View>
                    <View style={styles.quantityControls}>
                      <Pressable
                        onPress={() =>
                          onUpdateServiceQuantity(selectedService.serviceId, -1)
                        }
                        style={({ pressed }) => [
                          styles.quantityButton,
                          pressed && styles.quantityButtonPressed,
                        ]}
                      >
                        <Minus size={14} color={COLORS.primary} />
                      </Pressable>
                      <Text style={styles.quantityText}>
                        {selectedService.quantity}
                      </Text>
                      <Pressable
                        onPress={() =>
                          onUpdateServiceQuantity(selectedService.serviceId, 1)
                        }
                        style={({ pressed }) => [
                          styles.quantityButton,
                          pressed && styles.quantityButtonPressed,
                        ]}
                        disabled={selectedService.quantity >= 10}
                      >
                        <Plus size={14} color={COLORS.primary} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.itemFooter}>
                    <Text style={styles.itemTotalPrice}>
                      {formatCurrency(itemPrice)}
                    </Text>
                    <Pressable
                      onPress={() => onRemoveService(selectedService.serviceId)}
                      style={({ pressed }) => [
                        styles.removeButton,
                        pressed && styles.removeButtonPressed,
                      ]}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Service Sets Section */}
      {serviceSets.length > 0 && (
        <View style={styles.section}>
          {services.length > 0 && serviceSets.length > 0 && (
            <Text style={styles.sectionLabel}>Service Sets</Text>
          )}
          <ScrollView
            style={styles.itemsListContainer}
            contentContainerStyle={styles.itemsList}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {serviceSets.map((selectedServiceSet) => {
              const itemPrice =
                (selectedServiceSet.serviceSet.price || 0) *
                selectedServiceSet.quantity;
              const servicesCount =
                selectedServiceSet.serviceSet.service_set_items?.length || 0;
              return (
                <View
                  key={selectedServiceSet.serviceSetId}
                  style={[styles.item, styles.serviceSetItem]}
                >
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <View style={styles.serviceSetTitleRow}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {selectedServiceSet.serviceSet.title}
                        </Text>
                        <View style={styles.serviceSetBadge}>
                          <Text style={styles.serviceSetBadgeText}>Set</Text>
                        </View>
                      </View>
                      <Text style={styles.itemSubtitle}>
                        {formatCurrency(selectedServiceSet.serviceSet.price)} ×{" "}
                        {selectedServiceSet.quantity} • {servicesCount} service
                        {servicesCount !== 1 ? "s" : ""}
                      </Text>
                      {selectedServiceSet.serviceSet.description && (
                        <Text style={styles.itemDescription} numberOfLines={1}>
                          {selectedServiceSet.serviceSet.description}
                        </Text>
                      )}
                    </View>
                    <View style={styles.quantityControls}>
                      <Pressable
                        onPress={() =>
                          onUpdateServiceSetQuantity(
                            selectedServiceSet.serviceSetId,
                            -1
                          )
                        }
                        style={({ pressed }) => [
                          styles.quantityButton,
                          pressed && styles.quantityButtonPressed,
                        ]}
                      >
                        <Minus size={14} color={COLORS.primary} />
                      </Pressable>
                      <Text style={styles.quantityText}>
                        {selectedServiceSet.quantity}
                      </Text>
                      <Pressable
                        onPress={() =>
                          onUpdateServiceSetQuantity(
                            selectedServiceSet.serviceSetId,
                            1
                          )
                        }
                        style={({ pressed }) => [
                          styles.quantityButton,
                          pressed && styles.quantityButtonPressed,
                        ]}
                        disabled={selectedServiceSet.quantity >= 10}
                      >
                        <Plus size={14} color={COLORS.primary} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.itemFooter}>
                    <Text style={styles.itemTotalPrice}>
                      {formatCurrency(itemPrice)}
                    </Text>
                    <Pressable
                      onPress={() =>
                        onRemoveServiceSet(selectedServiceSet.serviceSetId)
                      }
                      style={({ pressed }) => [
                        styles.removeButton,
                        pressed && styles.removeButtonPressed,
                      ]}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Grand Total */}
      {hasItems && (
        <View style={styles.grandTotalContainer}>
          <Text style={styles.grandTotalLabel}>Total</Text>
          <Text style={styles.grandTotalPrice}>
            {formatCurrency(grandTotal)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  itemsListContainer: {
    maxHeight: 300,
  },
  itemsList: {
    gap: 10,
    paddingBottom: 8,
  },
  item: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  serviceSetItem: {
    borderLeftWidth: 3,
    borderLeftColor: "#ec4899",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceSetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  serviceSetBadge: {
    backgroundColor: "#fdf2f8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  serviceSetBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ec4899",
  },
  itemSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
    marginTop: 2,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quantityButtonPressed: {
    opacity: 0.7,
    backgroundColor: "#f3f4f6",
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    minWidth: 24,
    textAlign: "center",
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  itemTotalPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  removeButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#fee2e2",
  },
  removeButtonPressed: {
    opacity: 0.7,
  },
  removeButtonText: {
    color: COLORS.error,
    fontSize: 11,
    fontWeight: "600",
  },
  grandTotalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  grandTotalPrice: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.primary,
  },
});
