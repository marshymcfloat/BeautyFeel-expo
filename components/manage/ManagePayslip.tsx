import EmployeePayslipPermissions from "@/components/payslip/EmployeePayslipPermissions";
import PayslipRequestsManager from "@/components/payslip/PayslipRequestsManager";
import { queryClient } from "@/components/Providers/TanstackProvider";
import type { Database } from "@/database.types";
import { useAuth } from "@/lib/hooks/useAuth";
import { scaleDimension } from "@/lib/utils/responsive";
import React, { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

type Branch = Database["public"]["Enums"]["branch"];

export default function ManagePayslip({
  onRefetchReady,
}: {
  onRefetchReady?: (refetch: () => Promise<any>) => void;
}) {
  const { employee } = useAuth();
  const ownerBranch = (employee?.branch as Branch) || null;

  useEffect(() => {
    if (onRefetchReady) {
      onRefetchReady(async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["payslip-requests", ownerBranch],
          }),
          queryClient.invalidateQueries({
            queryKey: ["all-employees", ownerBranch],
          }),
        ]);
      });
    }
  }, [onRefetchReady, ownerBranch]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View style={styles.section}>
          <PayslipRequestsManager ownerBranch={ownerBranch} />
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <EmployeePayslipPermissions ownerBranch={ownerBranch} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  contentContainer: {
    paddingBottom: scaleDimension(100),
  },
  content: {
    paddingHorizontal: scaleDimension(16),
  },
  section: {
    marginBottom: scaleDimension(24),
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: scaleDimension(32),
    marginHorizontal: scaleDimension(16),
  },
});
