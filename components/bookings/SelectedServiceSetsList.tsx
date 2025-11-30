import type { ServiceSetWithItems } from "@/lib/actions/serviceSetActions";
import { COLORS } from "@/lib/utils/constants";
import { formatCurrency } from "@/lib/utils/currency";
import { Minus, Plus } from "lucide-react-native";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

interface SelectedServiceSet {
  serviceSetId: number;
  quantity: number;
  serviceSet: ServiceSetWithItems;
}

interface SelectedServiceSetsListProps {
  serviceSets: SelectedServiceSet[];
  onRemove: (serviceSetId: number) => void;
  onUpdateQuantity: (serviceSetId: number, delta: number) => void;
}

export function SelectedServiceSetsList({
  serviceSets,
  onRemove,
  onUpdateQuantity,
}: SelectedServiceSetsListProps) {
  const totalPrice = serviceSets.reduce(
    (sum, s) => sum + (s.serviceSet.price || 0) * s.quantity,
    0
  );

  if (serviceSets.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {serviceSets.map((selectedServiceSet) => {
        const itemPrice =
          (selectedServiceSet.serviceSet.price || 0) *
          selectedServiceSet.quantity;
        const servicesCount =
          selectedServiceSet.serviceSet.service_set_items?.length || 0;

        return (
          <View
            key={selectedServiceSet.serviceSetId}
            style={styles.serviceSetItem}
          >
            <View style={styles.serviceSetInfo}>
              <Text style={styles.serviceSetName} numberOfLines={1}>
                {selectedServiceSet.serviceSet.title}
              </Text>
              <Text style={styles.serviceSetDescription}>
                {selectedServiceSet.serviceSet.description ||
                  `${servicesCount} service${servicesCount !== 1 ? "s" : ""}`}
              </Text>
              <Text style={styles.serviceSetPrice}>
                {formatCurrency(selectedServiceSet.serviceSet.price)} ×{" "}
                {selectedServiceSet.quantity}
              </Text>
            </View>
            <View style={styles.quantityControls}>
              <Pressable
                onPress={() =>
                  onUpdateQuantity(selectedServiceSet.serviceSetId, -1)
                }
                style={({ pressed }) => [
                  styles.quantityButton,
                  pressed && styles.quantityButtonPressed,
                ]}
              >
                <Minus size={16} color={COLORS.primary} />
              </Pressable>
              <Text style={styles.quantityText}>
                {selectedServiceSet.quantity}
              </Text>
              <Pressable
                onPress={() =>
                  onUpdateQuantity(selectedServiceSet.serviceSetId, 1)
                }
                style={({ pressed }) => [
                  styles.quantityButton,
                  pressed && styles.quantityButtonPressed,
                ]}
                disabled={selectedServiceSet.quantity >= 10}
              >
                <Plus size={16} color={COLORS.primary} />
              </Pressable>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.itemTotalPrice}>
                {formatCurrency(itemPrice)}
              </Text>
              <Pressable
                onPress={() => onRemove(selectedServiceSet.serviceSetId)}
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
      {serviceSets.length > 0 && (
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Service Sets Total</Text>
          <Text style={styles.totalPrice}>{formatCurrency(totalPrice)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 12,
  },
  serviceSetItem: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  serviceSetInfo: {
    marginBottom: 12,
  },
  serviceSetName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  serviceSetDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  serviceSetPrice: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quantityButtonPressed: {
    opacity: 0.7,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    minWidth: 30,
    textAlign: "center",
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  itemTotalPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#fee2e2",
  },
  removeButtonPressed: {
    opacity: 0.7,
  },
  removeButtonText: {
    color: COLORS.error,
    fontSize: 12,
    fontWeight: "600",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.primary,
  },
});
