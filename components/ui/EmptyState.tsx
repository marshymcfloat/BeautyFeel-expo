import { COLORS, GRADIENT_COLORS } from "@/lib/utils/constants";
import { PLATFORM, scaleDimension } from "@/lib/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ResponsiveText } from "./ResponsiveText";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  actionIcon,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <ResponsiveText variant="xl" style={styles.title} numberOfLines={2}>
        {title}
      </ResponsiveText>
      {message && (
        <ResponsiveText variant="md" style={styles.message} numberOfLines={3}>
          {message}
        </ResponsiveText>
      )}
      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={styles.actionButton}>
          <LinearGradient
            colors={GRADIENT_COLORS.primaryShort}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButtonGradient}
          >
            {actionIcon}
            <ResponsiveText
              variant="md"
              style={styles.actionButtonText}
              numberOfLines={1}
            >
              {actionLabel}
            </ResponsiveText>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scaleDimension(60),
    paddingHorizontal: scaleDimension(32),
  },
  iconContainer: {
    width: scaleDimension(96),
    height: scaleDimension(96),
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scaleDimension(24),
  },
  title: {
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: scaleDimension(8),
    textAlign: "center",
  },
  message: {
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: scaleDimension(24),
  },
  actionButton: {
    borderRadius: scaleDimension(12),
    overflow: "hidden",
    ...PLATFORM.shadowMd,
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scaleDimension(14),
    paddingHorizontal: scaleDimension(24),
    gap: scaleDimension(8),
  },
  actionButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
