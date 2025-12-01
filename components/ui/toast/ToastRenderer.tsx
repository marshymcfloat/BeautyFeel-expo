import { useToast as useGluestackToast } from "@gluestack-ui/core/toast/creator";
import React from "react";
import { View } from "react-native";
import { Toast, ToastDescription, ToastTitle } from "./index";

/**
 * ToastRenderer component that renders toasts from the toast hook
 * This needs to be added to the root layout to display toasts
 */
export function ToastRenderer() {
  const toast = useGluestackToast();

  return (
    <View
      style={{
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        zIndex: 9999,
        pointerEvents: "box-none",
        alignItems: "center",
      }}
    >
      {toast.toasts.map((toastItem) => {
        const toastId = `toast-${toastItem.id}`;
        return (
          <Toast
            key={toastItem.id}
            nativeID={toastId}
            variant={toastItem.variant || "outline"}
            action={toastItem.action || "info"}
          >
            {toastItem.title && <ToastTitle>{toastItem.title}</ToastTitle>}
            {toastItem.description && (
              <ToastDescription>{toastItem.description}</ToastDescription>
            )}
          </Toast>
        );
      })}
    </View>
  );
}

