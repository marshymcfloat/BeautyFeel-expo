import { PLATFORM, scaleDimension } from "@/lib/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { ResponsiveText } from "./ResponsiveText";

interface StatCardProps {
  label: string;
  value: string | number | ReactNode;
  icon?: ReactNode;
  gradientColors?: string[];
  onPress?: () => void;
  loading?: boolean;
  hint?: string;
  rightElement?: ReactNode;
}

export function StatCard({
  label,
  value,
  icon,
  gradientColors = ["#f472b6", "#ec4899", "#d946ef"],
  onPress,
  loading = false,
  hint,
  rightElement,
}: StatCardProps) {
  const content = (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardGradient}
    >
      <View style={styles.cardContent}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <View style={styles.textContainer}>
          <ResponsiveText variant="xs" style={styles.label} numberOfLines={1}>
            {label}
          </ResponsiveText>
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : typeof value === "number" || typeof value === "string" ? (
            <ResponsiveText variant="xl" style={styles.value} numberOfLines={1}>
              {value}
            </ResponsiveText>
          ) : (
            value
          )}
          {hint && (
            <ResponsiveText variant="xs" style={styles.hint} numberOfLines={1}>
              {hint}
            </ResponsiveText>
          )}
        </View>
        {rightElement && !onPress && (
          <View style={styles.rightElement}>{rightElement}</View>
        )}
      </View>
    </LinearGradient>
  );

  if (onPress) {
    return (
      <View style={styles.container}>
        <Pressable style={styles.cardPressable} onPress={onPress}>
          {content}
        </Pressable>
        {rightElement && (
          <View style={styles.rightElementAbsolute}>{rightElement}</View>
        )}
      </View>
    );
  }

  return <View style={styles.container}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: scaleDimension(16),
    overflow: "visible",
    minHeight: scaleDimension(100),
    position: "relative",
    backgroundColor: "transparent",
    ...PLATFORM.shadowMd,
  },
  cardPressable: {
    flex: 1,
    borderRadius: scaleDimension(16),
    overflow: "hidden",
    minHeight: scaleDimension(100),
  },
  cardGradient: {
    padding: scaleDimension(14),
    minHeight: scaleDimension(100),
    borderRadius: scaleDimension(16),
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(10),
    flex: 1,
  },
  iconContainer: {
    width: scaleDimension(40),
    height: scaleDimension(40),
    borderRadius: scaleDimension(10),
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  label: {
    color: "rgba(255, 255, 255, 0.95)",
    marginBottom: scaleDimension(4),
    fontWeight: "600",
  },
  value: {
    color: "white",
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  hint: {
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: scaleDimension(4),
    fontWeight: "500",
  },
  rightElement: {
    marginLeft: "auto",
  },
  rightElementAbsolute: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 99,
  },
});
