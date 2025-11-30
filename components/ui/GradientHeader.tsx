import { GRADIENT_COLORS } from "@/lib/utils/constants";
import {
  getContainerPadding,
  PLATFORM,
  scaleDimension,
} from "@/lib/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { ResponsiveText } from "./ResponsiveText";

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  rightElement?: ReactNode;
  colors?: string[];
}

export function GradientHeader({
  title,
  subtitle,
  icon,
  rightElement,
  colors = GRADIENT_COLORS.primary,
}: GradientHeaderProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.leftSection}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <View style={styles.textContainer}>
              <ResponsiveText
                variant="3xl"
                style={styles.title}
                numberOfLines={2}
              >
                {title}
              </ResponsiveText>
              {subtitle && (
                <ResponsiveText
                  variant="sm"
                  style={styles.subtitle}
                  numberOfLines={1}
                >
                  {subtitle}
                </ResponsiveText>
              )}
            </View>
          </View>
          {rightElement && (
            <View style={styles.rightSection}>{rightElement}</View>
          )}
        </View>
        {/* Decorative circles */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: getContainerPadding(),
    marginTop: scaleDimension(24),
    marginBottom: scaleDimension(20),
    borderRadius: scaleDimension(24),
    overflow: "hidden",
    ...PLATFORM.shadowLg,
  },
  gradient: {
    padding: scaleDimension(24),
    position: "relative",
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    zIndex: 1,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: scaleDimension(12),
    minWidth: 0, // Prevents text overflow
  },
  iconContainer: {
    width: scaleDimension(56),
    height: scaleDimension(56),
    borderRadius: scaleDimension(16),
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: scaleDimension(16),
    ...PLATFORM.shadowMd,
  },
  textContainer: {
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  title: {
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: scaleDimension(4),
    fontWeight: "500",
  },
  rightSection: {
    alignItems: "center",
    justifyContent: "center",
  },
  decorativeCircle1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    top: -40,
    right: -40,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    bottom: -20,
    right: 40,
  },
});
