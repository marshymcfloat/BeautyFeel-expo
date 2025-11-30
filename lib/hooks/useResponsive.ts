import { useEffect, useState } from "react";
import { Dimensions, ScaledSize } from "react-native";
import {
  getScreenSize,
  isScreenSize,
  isSmallPhone,
  isTablet,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  type ScreenSize,
} from "../utils/responsive";

/**
 * Hook to get current screen dimensions and size category
 */
export function useResponsive() {
  const [dimensions, setDimensions] = useState({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    screenSize: getScreenSize(),
    isTablet: isTablet(),
    isSmallPhone: isSmallPhone(),
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      "change",
      ({ window }: { window: ScaledSize }) => {
        setDimensions({
          width: window.width,
          height: window.height,
          screenSize: getScreenSize(),
          isTablet: isTablet(),
          isSmallPhone: isSmallPhone(),
        });
      },
    );

    return () => subscription?.remove();
  }, []);

  return dimensions;
}

/**
 * Hook to check if current screen matches a size
 */
export function useScreenSize(minSize: ScreenSize): boolean {
  const { screenSize } = useResponsive();
  return isScreenSize(minSize);
}

/**
 * Hook to get responsive value based on screen size
 */
export function useResponsiveValue<T>(values: {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  default?: T;
}): T {
  const { screenSize } = useResponsive();

  return (
    values[screenSize] ||
    values.default ||
    values.xl ||
    values.lg ||
    values.md ||
    values.sm ||
    values.xs ||
    (0 as T)
  );
}
