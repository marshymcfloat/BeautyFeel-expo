"use client";
import { createToastHook } from "@gluestack-ui/core/toast/creator";
import {
  AnimatePresence,
  Motion,
  MotionComponentProps,
} from "@legendapp/motion";
import React, { createContext, useContext, useMemo } from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

// 1. Setup Motion View
type IMotionViewProps = React.ComponentProps<typeof View> &
  MotionComponentProps<typeof View, ViewStyle, unknown, unknown, unknown>;

const MotionView = Motion.View as React.ComponentType<IMotionViewProps>;

// 2. Create the Hook
const useToast = createToastHook(MotionView, AnimatePresence);

// 3. Define Context to pass variant/action down to children
type ToastContextType = {
  variant: "solid" | "outline";
  action: "error" | "warning" | "success" | "info" | "muted";
};

const ToastContext = createContext<ToastContextType>({
  variant: "solid",
  action: "muted",
});

// 4. Define Colors (Tailwind approximation)
const COLORS = {
  error: { bg: "#991B1B", text: "#991B1B" }, // Red 800
  warning: { bg: "#9A3412", text: "#9A3412" }, // Orange 700
  success: { bg: "#15803D", text: "#15803D" }, // Green 700
  info: { bg: "#1D4ED8", text: "#1D4ED8" }, // Blue 700
  muted: { bg: "#1F2937", text: "#1F2937" }, // Gray 800
  white: "#FFFFFF",
  background: "#FFFFFF",
  border: "#E5E7EB", // Gray 200
  textDark: "#111827", // Gray 900
  textMuted: "#6B7280", // Gray 500
};

// 5. Toast Root Component
type IToastProps = React.ComponentProps<typeof View> & {
  variant?: ToastContextType["variant"];
  action?: ToastContextType["action"];
};

const Toast = React.forwardRef<React.ComponentRef<typeof View>, IToastProps>(
  function Toast(
    { variant = "solid", action = "muted", style, ...props },
    ref
  ) {
    // Determine container styles based on props
    const containerStyle = useMemo(() => {
      const baseStyles: ViewStyle[] = [styles.toastBase];

      if (variant === "solid") {
        baseStyles.push({
          backgroundColor: COLORS[action].bg,
          borderColor: COLORS[action].bg,
        });
      } else {
        // Outline
        baseStyles.push({
          backgroundColor: COLORS.background,
          borderColor: COLORS.border,
        });
      }

      return baseStyles;
    }, [variant, action]);

    return (
      <ToastContext.Provider value={{ variant, action }}>
        <View ref={ref} style={[containerStyle, style]} {...props} />
      </ToastContext.Provider>
    );
  }
);

// 6. Toast Title Component
type IToastTitleProps = React.ComponentProps<typeof Text> & {
  size?: "sm" | "md" | "lg";
};

const ToastTitle = React.forwardRef<
  React.ComponentRef<typeof Text>,
  IToastTitleProps
>(function ToastTitle({ size = "md", style, children, ...props }, ref) {
  const { variant, action } = useContext(ToastContext);

  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(children as string);
  }, [children]);

  // Determine text color and font size styles
  const dynamicStyles = useMemo(() => {
    const textColor = variant === "solid" ? COLORS.white : COLORS[action].text;
    const fontSize = size === "sm" ? 14 : size === "lg" ? 18 : 16;

    return {
      color: textColor,
      fontSize,
    };
  }, [variant, action, size]);

  return (
    <Text
      {...props}
      ref={ref}
      aria-live="assertive"
      aria-atomic="true"
      role="alert"
      style={[styles.toastTitleBase, dynamicStyles, style]}
    >
      {children}
    </Text>
  );
});

// 7. Toast Description Component
type IToastDescriptionProps = React.ComponentProps<typeof Text> & {
  size?: "sm" | "md" | "lg";
};

const ToastDescription = React.forwardRef<
  React.ComponentRef<typeof Text>,
  IToastDescriptionProps
>(function ToastDescription({ size = "md", style, ...props }, ref) {
  const { variant } = useContext(ToastContext);

  // Determine text color and font size styles
  const dynamicStyles = useMemo(() => {
    // If solid, usually lighter/white. If outline, dark gray.
    const textColor = variant === "solid" ? "#F3F4F6" : COLORS.textDark;
    const fontSize = size === "sm" ? 12 : size === "lg" ? 16 : 14;

    return {
      color: textColor,
      fontSize,
    };
  }, [variant, size]);

  return (
    <Text
      ref={ref}
      {...props}
      style={[styles.toastDescriptionBase, dynamicStyles, style]}
    />
  );
});

// 8. Define Styles
const styles = StyleSheet.create({
  toastBase: {
    padding: 16,
    margin: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    // Shadow for elevation
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow:
          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      },
    }),
  },
  toastTitleBase: {
    fontWeight: "600",
    textAlign: "left",
    marginBottom: 2,
  },
  toastDescriptionBase: {
    fontWeight: "400",
    textAlign: "left",
  },
});

Toast.displayName = "Toast";
ToastTitle.displayName = "ToastTitle";
ToastDescription.displayName = "ToastDescription";

export { Toast, ToastDescription, ToastTitle, useToast };
