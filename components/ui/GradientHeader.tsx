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
  colors?: readonly [string, string, ...string[]];
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
          <View style={styles.mainInfoRow}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <View style={styles.textContainer}>
              <ResponsiveText variant="3xl" style={styles.title}>
                {title}
              </ResponsiveText>
              {subtitle && (
                <ResponsiveText variant="sm" style={styles.subtitle}>
                  {subtitle}
                </ResponsiveText>
              )}
            </View>
          </View>

          {/* Action buttons moved to their own row below the title */}
          {rightElement && (
            <View style={styles.actionsRow}>{rightElement}</View>
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
    // CHANGE 1: Stack vertically instead of horizontally
    flexDirection: "column",
    gap: scaleDimension(16), // Add space between Title and Buttons
    width: "100%",
    zIndex: 1,
  },
  mainInfoRow: {
    // This row contains Icon + Title
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
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
  },
  title: {
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.5,
    flexWrap: "wrap",
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: scaleDimension(4),
    fontWeight: "500",
    flexWrap: "wrap",
  },
  actionsRow: {
    // CHANGE 2: Buttons get their own row, aligned to the right
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    // Optional: Add a subtle top border or padding if you want separation
    // paddingTop: scaleDimension(12),
    // borderTopWidth: 1,
    // borderTopColor: "rgba(255,255,255,0.1)"
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
