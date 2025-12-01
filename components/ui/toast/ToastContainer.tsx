import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Toast, ToastDescription, ToastTitle, useToastHook } from "./index";

/**
 * ToastContainer component that renders toasts
 * This should be added to the root layout
 * Renders all active toasts from the toast hook
 */
export function ToastContainer() {
  const toast = useToastHook();

  // Get all active toasts
  const activeToasts = toast.toasts || [];

  if (activeToasts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        {activeToasts.map((toastItem) => {
          const toastId = `toast-${toastItem.id}`;
          return (
            <View key={toastItem.id} style={styles.toastWrapper}>
              {toastItem.render ? (
                toastItem.render({ id: toastItem.id })
              ) : (
                <Toast
                  nativeID={toastId}
                  variant={toastItem.variant || "outline"}
                  action={toastItem.action || "info"}
                >
                  {toastItem.title && (
                    <ToastTitle>{toastItem.title}</ToastTitle>
                  )}
                  {toastItem.description && (
                    <ToastDescription>{toastItem.description}</ToastDescription>
                  )}
                </Toast>
              )}
            </View>
          );
        })}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    pointerEvents: "box-none",
    alignItems: "center",
  },
  safeArea: {
    width: "100%",
    alignItems: "center",
    pointerEvents: "box-none",
  },
  toastWrapper: {
    width: "90%",
    maxWidth: 400,
    marginBottom: 8,
  },
});

