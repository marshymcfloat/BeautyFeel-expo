import { Dimensions, PixelRatio, Platform } from "react-native";

// Screen size breakpoints
export const BREAKPOINTS = {
  xs: 0,
  sm: 375, // iPhone SE, small phones
  md: 414, // iPhone Plus, medium phones
  lg: 768, // iPad mini, tablets
  xl: 1024, // iPad Pro, large tablets
} as const;

// Get current screen dimensions
export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get(
  "window",
);

// Screen size categories
export type ScreenSize = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * Get current screen size category
 */
export function getScreenSize(): ScreenSize {
  if (SCREEN_WIDTH >= BREAKPOINTS.xl) return "xl";
  if (SCREEN_WIDTH >= BREAKPOINTS.lg) return "lg";
  if (SCREEN_WIDTH >= BREAKPOINTS.md) return "md";
  if (SCREEN_WIDTH >= BREAKPOINTS.sm) return "sm";
  return "xs";
}

/**
 * Check if screen size matches or is larger than breakpoint
 */
export function isScreenSize(size: ScreenSize): boolean {
  const currentSize = getScreenSize();
  const sizes: ScreenSize[] = ["xs", "sm", "md", "lg", "xl"];
  return sizes.indexOf(currentSize) >= sizes.indexOf(size);
}

/**
 * Responsive value based on screen size
 * Usage: responsive({ xs: 10, sm: 12, md: 14, lg: 16, xl: 18 })
 */
export function responsive<T>(values: {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  default?: T;
}): T {
  const size = getScreenSize();
  return (
    values[size] ||
    values.default ||
    values.xl ||
    values.lg ||
    values.md ||
    values.sm ||
    values.xs ||
    (0 as T)
  );
}

// ⬇️ CHANGED: Helper to calculate scale
const getScale = () => {
  const scale = SCREEN_WIDTH / BREAKPOINTS.sm;
  // Tweaked:
  // Min: 0.85 (Small phones get 85% size to prevent overflow)
  // Max: 1.25 (Large phones/Tablets get up to 125% size)
  // Your previous 1.05 was too strict for large devices
  return Math.max(0.85, Math.min(scale, 1.25));
};

/**
 * Scale font size based on screen width and pixel ratio
 */
export function scaleFont(size: number): number {
  const newSize = size * getScale();
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

/**
 * Scale dimension (width/height/padding/margin) based on screen width
 */
export function scaleDimension(size: number): number {
  const newSize = size * getScale();
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

/**
 * Responsive font sizes
 */
export const FONT_SIZES = {
  xs: scaleFont(10),
  sm: scaleFont(12),
  base: scaleFont(14),
  md: scaleFont(16),
  lg: scaleFont(18),
  xl: scaleFont(20),
  "2xl": scaleFont(24),
  "3xl": scaleFont(30),
  "4xl": scaleFont(36),
  "5xl": scaleFont(48),
} as const;

/**
 * Responsive spacing scale
 */
export const SPACING = {
  xs: scaleDimension(4),
  sm: scaleDimension(8),
  md: scaleDimension(12),
  base: scaleDimension(16),
  lg: scaleDimension(20),
  xl: scaleDimension(24),
  "2xl": scaleDimension(32),
  "3xl": scaleDimension(40),
  "4xl": scaleDimension(48),
  "5xl": scaleDimension(64),
} as const;

/**
 * Platform-specific adjustments
 */
export const PLATFORM = {
  isIOS: Platform.OS === "ios",
  isAndroid: Platform.OS === "android",
  padding: Platform.select({
    ios: 0,
    android: 0,
  }),
  shadow: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
  }),
  shadowMd: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
  }),
  shadowLg: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
  }),
} as const;

/**
 * Get responsive padding/margin
 */
export function getSpacing(
  size: keyof typeof SPACING = "base",
  multiplier: number = 1,
): number {
  return SPACING[size] * multiplier;
}

/**
 * Percentage width
 */
export function percentageWidth(percent: number): number {
  return (SCREEN_WIDTH * percent) / 100;
}

/**
 * Percentage height
 */
export function percentageHeight(percent: number): number {
  return (SCREEN_HEIGHT * percent) / 100;
}

/**
 * Check if device is tablet
 */
export function isTablet(): boolean {
  return SCREEN_WIDTH >= BREAKPOINTS.lg || SCREEN_HEIGHT >= BREAKPOINTS.lg;
}

/**
 * Check if device is small phone
 */
export function isSmallPhone(): boolean {
  return SCREEN_WIDTH < BREAKPOINTS.sm;
}

/**
 * Get line height multiplier for text
 */
export function getLineHeight(
  fontSize: number,
  multiplier: number = 1.4,
): number {
  return Math.round(fontSize * multiplier);
}

/**
 * Get responsive container padding
 * Adapts padding based on screen size: 16px (small) → 24px (standard) → 32px (tablet)
 */
export function getContainerPadding(): number {
  if (SCREEN_WIDTH >= BREAKPOINTS.lg) return SPACING["2xl"];
  if (SCREEN_WIDTH >= BREAKPOINTS.md) return SPACING.xl;
  if (SCREEN_WIDTH < BREAKPOINTS.sm) return SPACING.md;
  return SPACING.xl;
}
