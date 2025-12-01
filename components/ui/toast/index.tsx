import { scaleDimension, scaleFont } from "@/lib/utils/responsive";
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

type IMotionViewProps = React.ComponentProps<typeof View> &
  MotionComponentProps<typeof View, ViewStyle, unknown, unknown, unknown>;

const MotionView = Motion.View as React.ComponentType<IMotionViewProps>;

const useGluestackToast = createToastHook(MotionView, AnimatePresence);

export function useToastHook() {
  return useGluestackToast();
}

const useToast = () => {
  const toast = useGluestackToast();

  const showToast = (
    title: string,
    description?: string,
    options?: {
      action?: "error" | "warning" | "success" | "info" | "muted";
      variant?: "solid" | "outline";
      duration?: number;
      placement?: "top" | "bottom";
    }
  ) => {
    const toastId = `toast-${Date.now()}-${Math.random()}`;
    return toast.show({
      id: toastId,
      placement: options?.placement || "top",
      duration: options?.duration || 3000,
      render: ({ id }: { id: string }) => (
        <Toast
          variant={options?.variant || "outline"}
          action={options?.action || "info"}
          nativeID={`toast-${id}`}
        >
          <ToastTitle>{title}</ToastTitle>
          {description && <ToastDescription>{description}</ToastDescription>}
        </Toast>
      ),
    });
  };

  const success = (title: string, description?: string) => {
    return showToast(title, description, {
      action: "success",
      variant: "outline",
    });
  };

  const error = (title: string, description?: string) => {
    return showToast(title, description, {
      action: "error",
      variant: "outline",
    });
  };

  const warning = (title: string, description?: string) => {
    return showToast(title, description, {
      action: "warning",
      variant: "outline",
    });
  };

  const info = (title: string, description?: string) => {
    return showToast(title, description, {
      action: "info",
      variant: "outline",
    });
  };

  return {
    show: showToast,
    success,
    error,
    warning,
    info,
    close: toast.close,
    closeAll: toast.closeAll,
    toasts: (toast as any).toasts || [],
  };
};

type ToastContextType = {
  variant: "solid" | "outline";
  action: "error" | "warning" | "success" | "info" | "muted";
};

const ToastContext = createContext<ToastContextType>({
  variant: "solid",
  action: "muted",
});

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

type IToastProps = React.ComponentProps<typeof View> & {
  variant?: ToastContextType["variant"];
  action?: ToastContextType["action"];
};

const Toast = React.forwardRef<React.ComponentRef<typeof View>, IToastProps>(
  function Toast(
    { variant = "solid", action = "muted", style, ...props },
    ref
  ) {
    const containerStyle = useMemo(() => {
      const baseStyles: ViewStyle[] = [styles.toastBase];

      if (variant === "solid") {
        baseStyles.push({
          backgroundColor: COLORS[action].bg,
          borderColor: COLORS[action].bg,
        });
      } else {
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

type IToastTitleProps = React.ComponentProps<typeof Text> & {
  size?: "sm" | "md" | "lg";
};

const ToastTitle = React.forwardRef<
  React.ComponentRef<typeof Text>,
  IToastTitleProps
>(function ToastTitle({ size = "md", style, children, ...props }, ref) {
  const { variant, action } = useContext(ToastContext);

  React.useEffect(() => {
    if (typeof children === "string") {
      AccessibilityInfo.announceForAccessibility(children);
    }
  }, [children]);

  const dynamicStyles = useMemo(() => {
    const textColor = variant === "solid" ? COLORS.white : COLORS[action].text;
    const fontSize =
      size === "sm"
        ? scaleFont(14)
        : size === "lg"
        ? scaleFont(18)
        : scaleFont(16);

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

type IToastDescriptionProps = React.ComponentProps<typeof Text> & {
  size?: "sm" | "md" | "lg";
};

const ToastDescription = React.forwardRef<
  React.ComponentRef<typeof Text>,
  IToastDescriptionProps
>(function ToastDescription({ size = "md", style, ...props }, ref) {
  const { variant } = useContext(ToastContext);

  const dynamicStyles = useMemo(() => {
    const textColor = variant === "solid" ? "#F3F4F6" : COLORS.textDark;
    const fontSize =
      size === "sm"
        ? scaleFont(12)
        : size === "lg"
        ? scaleFont(16)
        : scaleFont(14);

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

const styles = StyleSheet.create({
  toastBase: {
    padding: scaleDimension(16),
    margin: scaleDimension(4),
    borderRadius: scaleDimension(8),
    gap: scaleDimension(4),
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: scaleDimension(2) },
        shadowOpacity: 0.15,
        shadowRadius: scaleDimension(3.84),
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
    marginBottom: scaleDimension(2),
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
