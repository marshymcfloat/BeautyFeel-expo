import { Minus, Plus } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View, Platform } from "react-native";
import { formatCurrency } from "@/lib/utils/currency";
import { COLORS } from "@/lib/utils/constants";
import type { Database } from "@/database.types";

type Service = Database["public"]["Tables"]["service"]["Row"];

interface SelectedService {
  serviceId: number;
  quantity: number;
  service: Service;
}

interface SelectedServicesListProps {
  services: SelectedService[];
  onRemove: (serviceId: number) => void;
  onUpdateQuantity: (serviceId: number, delta: number) => void;
}

export function SelectedServicesList({
  services,
  onRemove,
  onUpdateQuantity,
}: SelectedServicesListProps) {
  const totalPrice = services.reduce(
    (sum, s) => sum + (s.service.price || 0) * s.quantity,
    0
  );

  if (services.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No services selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {services.map((selectedService) => {
        const itemPrice = (selectedService.service.price || 0) * selectedService.quantity;
        return (
          <View key={selectedService.serviceId} style={styles.serviceItem}>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {selectedService.service.title}
              </Text>
              <Text style={styles.servicePrice}>
                {formatCurrency(selectedService.service.price)} × {selectedService.quantity}
              </Text>
            </View>
            <View style={styles.quantityControls}>
              <Pressable
                onPress={() => onUpdateQuantity(selectedService.serviceId, -1)}
                style={({ pressed }) => [
                  styles.quantityButton,
                  pressed && styles.quantityButtonPressed,
                ]}
              >
                <Minus size={16} color={COLORS.primary} />
              </Pressable>
              <Text style={styles.quantityText}>{selectedService.quantity}</Text>
              <Pressable
                onPress={() => onUpdateQuantity(selectedService.serviceId, 1)}
                style={({ pressed }) => [
                  styles.quantityButton,
                  pressed && styles.quantityButtonPressed,
                ]}
                disabled={selectedService.quantity >= 10}
              >
                <Plus size={16} color={COLORS.primary} />
              </Pressable>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.itemTotalPrice}>{formatCurrency(itemPrice)}</Text>
              <Pressable
                onPress={() => onRemove(selectedService.serviceId)}
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
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalPrice}>{formatCurrency(totalPrice)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  serviceItem: {
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
  serviceInfo: {
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  servicePrice: {
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

