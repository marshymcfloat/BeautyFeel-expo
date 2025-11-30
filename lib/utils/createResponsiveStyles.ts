import { TextStyle, ViewStyle } from "react-native";
import {
  FONT_SIZES,
  isSmallPhone,
  scaleDimension,
  scaleFont,
  SCREEN_WIDTH,
  SPACING,
} from "./responsive";

/**
 * Create responsive text styles with proper line heights
 */
export function createResponsiveTextStyle(
  baseSize: number,
  options?: {
    fontWeight?: TextStyle["fontWeight"];
    lineHeightMultiplier?: number;
    letterSpacing?: number;
    color?: string;
  },
): TextStyle {
  const scaledSize = isSmallPhone()
    ? scaleFont(baseSize) * 0.95
    : scaleFont(baseSize);
  const lineHeight = Math.round(
    scaledSize * (options?.lineHeightMultiplier || 1.4),
  );

  return {
    fontSize: scaledSize,
    lineHeight: lineHeight,
    fontWeight: options?.fontWeight || "400",
    letterSpacing: options?.letterSpacing,
    color: options?.color,
  };
}

/**
 * Create responsive spacing
 */
export function createResponsiveSpacing(
  size: keyof typeof SPACING,
  multiplier: number = 1,
): number {
  return SPACING[size] * multiplier;
}

/**
 * Create responsive view style with padding/margin
 */
export function createResponsiveViewStyle(
  padding?: number | { horizontal?: number; vertical?: number; all?: number },
  margin?: number | { horizontal?: number; vertical?: number; all?: number },
): ViewStyle {
  const style: ViewStyle = {};

  if (padding) {
    if (typeof padding === "number") {
      style.padding = scaleDimension(padding);
    } else {
      if (padding.all) style.padding = scaleDimension(padding.all);
      if (padding.horizontal) {
        style.paddingHorizontal = scaleDimension(padding.horizontal);
      }
      if (padding.vertical) {
        style.paddingVertical = scaleDimension(padding.vertical);
      }
    }
  }

  if (margin) {
    if (typeof margin === "number") {
      style.margin = scaleDimension(margin);
    } else {
      if (margin.all) style.margin = scaleDimension(margin.all);
      if (margin.horizontal) {
        style.marginHorizontal = scaleDimension(margin.horizontal);
      }
      if (margin.vertical) {
        style.marginVertical = scaleDimension(margin.vertical);
      }
    }
  }

  return style;
}

/**
 * Responsive font sizes helper
 */
export const RFontSize = {
  xs: FONT_SIZES.xs,
  sm: FONT_SIZES.sm,
  base: FONT_SIZES.base,
  md: FONT_SIZES.md,
  lg: FONT_SIZES.lg,
  xl: FONT_SIZES.xl,
  "2xl": FONT_SIZES["2xl"],
  "3xl": FONT_SIZES["3xl"],
  "4xl": FONT_SIZES["4xl"],
  "5xl": FONT_SIZES["5xl"],
  custom: scaleFont,
} as const;

/**
 * Responsive spacing helper
 */
export const RSpacing = {
  ...SPACING,
  custom: scaleDimension,
} as const;

/**
 * Get responsive width percentage
 */
export function rWidth(percent: number): number {
  return (SCREEN_WIDTH * percent) / 100;
}

/**
 * Re-export getContainerPadding from responsive.ts
 */
export { getContainerPadding } from "./responsive";
