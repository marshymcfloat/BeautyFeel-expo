import React, { ComponentType, ReactNode, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * Hook for lazy loading components in React Native
 * This provides better compatibility than React.lazy for React Native
 */
export function useLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: ReactNode,
): T | ReactNode | null {
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    importFn()
      .then((module) => {
        if (mounted) {
          setComponent(() => module.default);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error lazy loading component:", error);
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [importFn]);

  if (loading) {
    return fallback ||
      React.createElement(ActivityIndicator, {
        size: "small",
        color: "#ec4899",
      });
  }

  return Component;
}

/**
 * Higher-order component for lazy loading
 */
export function lazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: ReactNode,
): T {
  return ((props: any) => {
    const Component = useLazyComponent(importFn, fallback);
    if (Component && typeof Component !== "object") {
      return React.createElement(Component as ComponentType<any>, props);
    }
    return fallback || React.createElement(View);
  }) as T;
}
