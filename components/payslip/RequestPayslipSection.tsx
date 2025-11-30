import { getMyPayslipRequests } from "@/lib/actions/payslipActions";
import { useAuth } from "@/lib/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { FileText, AlertCircle } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, Platform } from "react-native";
import RequestPayslipModal from "./RequestPayslipModal";

export default function RequestPayslipSection() {
  const { employee } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Check for pending requests
  const { data: myRequestsData } = useQuery({
    queryKey: ["my-payslip-requests", employee?.id],
    queryFn: () => getMyPayslipRequests(employee?.id || ""),
    enabled: !!employee?.id,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const myRequests = myRequestsData?.data || [];
  const hasPendingRequest = myRequests.some((r) => r.status === "PENDING");

  // Don't show if employee can't request payslip
  if (!employee?.can_request_payslip) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        <Pressable
          onPress={() => setShowModal(true)}
          disabled={hasPendingRequest}
          style={({ pressed }) => [
            styles.button,
            hasPendingRequest && styles.buttonDisabled,
            pressed && !hasPendingRequest && styles.buttonPressed,
          ]}
        >
          <LinearGradient
            colors={
              hasPendingRequest
                ? ["#9ca3af", "#6b7280"]
                : ["#8b5cf6", "#a855f7", "#c084fc"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <View style={styles.buttonContent}>
              <View style={styles.iconContainer}>
                {hasPendingRequest ? (
                  <AlertCircle size={20} color="white" />
                ) : (
                  <FileText size={20} color="white" />
                )}
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.buttonText}>
                  {hasPendingRequest ? "Request Pending" : "Request Payslip"}
                </Text>
                <Text style={styles.buttonSubtext}>
                  {hasPendingRequest
                    ? "You already have a pending request"
                    : "Get your unpaid earnings"}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      <RequestPayslipModal
        visible={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  button: {
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#8b5cf6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonGradient: {
    padding: 16,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  buttonSubtext: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    fontWeight: "500",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

