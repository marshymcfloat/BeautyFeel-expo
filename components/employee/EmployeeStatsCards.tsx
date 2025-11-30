import { LoadingState } from "@/components/ui/LoadingState";
import { StatCard } from "@/components/ui/StatCard";
import {
  getEmployeeSalaryBreakdown,
  getServicesServedToday,
} from "@/lib/actions/employeeActions";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatCurrency } from "@/lib/utils/currency";
import {
  getContainerPadding,
  PLATFORM,
  scaleDimension,
} from "@/lib/utils/responsive";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, PhilippinePeso, RefreshCw } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import RotatingSpinner from "../ui/RotatingSpinner";
import SalaryBreakdownModal from "./SalaryBreakdownModal";

export default function EmployeeStatsCards() {
  const { employee, user } = useAuth();
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ["services-served-today", user?.id],
    queryFn: () => getServicesServedToday(user?.id || ""),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const {
    data: salaryData,
    isLoading: salaryLoading,
    refetch: refetchSalary,
    isRefetching: isRefetchingSalary,
  } = useQuery({
    queryKey: ["salary-breakdown", employee?.id],
    queryFn: () => getEmployeeSalaryBreakdown(employee?.id || ""),
    enabled: !!employee?.id,
    refetchInterval: 60000,
  });

  // Stop manual animation when refetch completes
  React.useEffect(() => {
    if (!isRefetchingSalary && isAnimating) {
      // Keep animation running for at least 500ms
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isRefetchingSalary, isAnimating]);

  const servicesCount = servicesData?.count || 0;
  const salary = salaryData?.data?.currentSalary || employee?.salary || 0;

  const shouldAnimate = isRefetchingSalary || isAnimating;

  if (servicesLoading) {
    return (
      <View style={styles.container}>
        <LoadingState variant="skeleton" />
      </View>
    );
  }

  const containerPadding = getContainerPadding();
  const iconSize = scaleDimension(20);
  const refreshIconSize = scaleDimension(16);

  return (
    <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
      <StatCard
        label="Services Served Today"
        value={servicesCount}
        icon={<Briefcase size={iconSize} color="white" />}
        gradientColors={["#f472b6", "#ec4899", "#d946ef"]}
      />

      <StatCard
        label="Current Salary"
        value={salaryLoading ? "" : formatCurrency(salary)}
        icon={<PhilippinePeso size={iconSize} color="white" />}
        gradientColors={["#10b981", "#059669"]}
        onPress={() => setShowSalaryModal(true)}
        loading={salaryLoading}
        hint="Tap to view breakdown"
        rightElement={
          <Pressable
            style={styles.refetchButton}
            onPress={(e) => {
              e.stopPropagation();
              setIsAnimating(true);
              refetchSalary();
            }}
            disabled={isRefetchingSalary || isAnimating}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <RotatingSpinner isAnimating={shouldAnimate} size={refreshIconSize}>
              <RefreshCw size={refreshIconSize} color="#10b981" />
            </RotatingSpinner>
          </Pressable>
        }
      />

      <SalaryBreakdownModal
        visible={showSalaryModal}
        onClose={() => setShowSalaryModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: scaleDimension(12),
    marginBottom: scaleDimension(24),
  },
  refetchButton: {
    width: scaleDimension(32),
    height: scaleDimension(32),
    borderRadius: scaleDimension(16),
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    ...PLATFORM.shadowLg,
  },
});
