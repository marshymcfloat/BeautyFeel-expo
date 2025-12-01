import { useResponsive } from "@/lib/hooks/useResponsive";
import { getLineHeight, scaleFont } from "@/lib/utils/responsive";
import React from "react";
import { Text, TextProps } from "react-native";

interface ResponsiveTextProps extends TextProps {
  /**
   * Base font size (will be scaled automatically)
   */
  size?: number;
  /**
   * Size variant (xs, sm, base, md, lg, xl, 2xl, etc.)
   */
  variant?:
    | "xs"
    | "sm"
    | "base"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl";
  /**
   * Number of lines (prevents wrapping beyond this)
   */
  numberOfLines?: number;
  /**
   * Adjust line height multiplier (default: 1.4)
   */
  lineHeightMultiplier?: number;
  /**
   * Whether text should allow font scaling from device settings
   */
  allowFontScaling?: boolean;
  /**
   * Maximum font scale (prevents text from getting too large)
   */
  maxFontSizeMultiplier?: number;
  children: React.ReactNode;
}

const VARIANT_SIZES = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 18, // Reduced from 20
  "2xl": 20, // Reduced from 24
  "3xl": 24, // Reduced from 30
  "4xl": 28, // Reduced from 36
  "5xl": 36, // Reduced from 48
} as const;

/**
 * Responsive Text component that prevents wrapping and scales based on screen size
 */
export function ResponsiveText({
  size,
  variant = "base",
  numberOfLines,
  lineHeightMultiplier = 1.4,
  allowFontScaling = true,
  maxFontSizeMultiplier = 1.2,
  style,
  children,
  ...props
}: ResponsiveTextProps) {
  const { isSmallPhone } = useResponsive();

  // Determine font size
  const baseSize = size || VARIANT_SIZES[variant];
  const scaledSize = scaleFont(baseSize);

  // Adjust for very small screens
  const finalSize = isSmallPhone ? scaledSize * 0.95 : scaledSize;

  // Calculate line height
  const lineHeight = getLineHeight(finalSize, lineHeightMultiplier);

  return (
    <Text
      {...props}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: finalSize,
          lineHeight: lineHeight,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
