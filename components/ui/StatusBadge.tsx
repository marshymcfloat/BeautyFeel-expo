import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BOOKING_STATUS, COLORS } from "@/lib/utils/constants";

interface StatusBadgeProps {
  status: string;
  size?: "small" | "medium" | "large";
  icon?: ReactNode;
}

const statusConfig: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  [BOOKING_STATUS.PENDING]: {
    bg: "#fef3c7",
    text: "#d97706",
    label: "Pending",
  },
  [BOOKING_STATUS.CONFIRMED]: {
    bg: "#dcfce7",
    text: "#16a34a",
    label: "Confirmed",
  },
  [BOOKING_STATUS.IN_PROGRESS]: {
    bg: "#dbeafe",
    text: "#2563eb",
    label: "In Progress",
  },
  [BOOKING_STATUS.COMPLETED]: {
    bg: "#f3f4f6",
    text: "#4b5563",
    label: "Completed",
  },
  [BOOKING_STATUS.CANCELLED]: {
    bg: "#fee2e2",
    text: "#dc2626",
    label: "Cancelled",
  },
  [BOOKING_STATUS.NO_SHOW]: {
    bg: "#fee2e2",
    text: "#dc2626",
    label: "No Show",
  },
  [BOOKING_STATUS.PAID]: {
    bg: "#f3e8ff",
    text: "#9333ea",
    label: "Paid",
  },
};

const sizeConfig = {
  small: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    iconSize: 10,
  },
  medium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    iconSize: 12,
  },
  large: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    iconSize: 14,
  },
};

export function StatusBadge({ status, size = "medium", icon }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig[BOOKING_STATUS.PENDING];
  const sizeStyle = sizeConfig[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
        },
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          styles.text,
          {
            color: config.text,
            fontSize: sizeStyle.fontSize,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    gap: 6,
  },
  iconContainer: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

