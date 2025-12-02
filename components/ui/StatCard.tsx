import { PLATFORM, scaleDimension } from "@/lib/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { ResponsiveText } from "./ResponsiveText";

interface StatCardProps {
  label: string;
  value: string | number | ReactNode;
  icon?: ReactNode;
  gradientColors?: [string, string, ...string[]];
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
          <ResponsiveText variant="xs" style={styles.label}>
            {label}
          </ResponsiveText>
          {loading ? (
            <ActivityIndicator
              size="small"
              color="white"
              style={styles.loader}
            />
          ) : typeof value === "number" || typeof value === "string" ? (
            <ResponsiveText variant="xl" style={styles.value}>
              {value}
            </ResponsiveText>
          ) : (
            value
          )}
          {hint && (
            <ResponsiveText variant="xs" style={styles.hint}>
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
    flex: 1, // Ensures gradient fills height if siblings force expansion
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center", // Vertically centers icon with text block
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
    // minWidth: 0 is still useful to force flex shrink logic,
    // but without numberOfLines, it will wrap.
    justifyContent: "center",
  },
  label: {
    color: "rgba(255, 255, 255, 0.95)",
    marginBottom: scaleDimension(4),
    fontWeight: "600",
    flexWrap: "wrap", // Explicitly allow wrapping
  },
  value: {
    color: "white",
    fontWeight: "700",
    letterSpacing: -0.3,
    flexWrap: "wrap", // Explicitly allow wrapping
  },
  hint: {
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: scaleDimension(4),
    fontWeight: "500",
    flexWrap: "wrap",
  },
  loader: {
    alignSelf: "flex-start",
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
