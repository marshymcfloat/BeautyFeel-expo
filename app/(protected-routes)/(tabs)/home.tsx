import { queryClient } from "@/components/Providers/TanstackProvider";
import { LoadingState } from "@/components/ui/LoadingState";
import { ResponsiveText } from "@/components/ui/ResponsiveText";
import { useAuth } from "@/lib/hooks/useAuth";
import { useResponsive } from "@/lib/hooks/useResponsive";
import {
  getContainerPadding,
  PLATFORM,
  scaleDimension,
} from "@/lib/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { RefreshCw, Sparkles } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

function ComponentLoader() {
  return <LoadingState variant="skeleton" />;
}

function LazyComponent({
  loadComponent,
  fallback,
  ...props
}: {
  loadComponent: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ReactNode;
  [key: string]: any;
}) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComponent()
      .then((module) => {
        setComponent(() => module.default);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading component:", error);
        setLoading(false);
      });
  }, [loadComponent]);

  if (loading || !Component) {
    return <>{fallback || <ComponentLoader />}</>;
  }

  return <Component {...props} />;
}

export default function HomeScreen() {
  const { hasRole, loading } = useAuth();
  const { isTablet, isSmallPhone } = useResponsive();
  const isOwner = hasRole("owner");
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (loading) {
    return null;
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const handleRefetch = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["employee-services"] }),
        queryClient.invalidateQueries({ queryKey: ["employee-salary"] }),
        queryClient.invalidateQueries({ queryKey: ["my-payslip-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["unpaid-services"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance"] }),
        // Owner dashboard queries
        queryClient.invalidateQueries({ queryKey: ["owner-stats"] }),
        queryClient.invalidateQueries({ queryKey: ["all-bookings"] }),
      ]);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const containerPadding = getContainerPadding();
  const iconSize = isTablet ? 32 : isSmallPhone ? 24 : 28;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#fdf2f8", "#fce7f3", "#f9fafb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.headerSection,
              { marginHorizontal: containerPadding },
            ]}
          >
            <LinearGradient
              colors={["#ec4899", "#d946ef", "#a855f7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <View style={styles.headerContent}>
                <View style={styles.headerIconContainer}>
                  <Sparkles size={iconSize} color="white" />
                </View>
                {/* Removed minWidth constraint and numberOfLines */}
                <View style={styles.headerTextContainer}>
                  <ResponsiveText variant="sm" style={styles.greetingText}>
                    {getGreeting()}
                  </ResponsiveText>
                  <ResponsiveText variant="2xl" style={styles.welcomeText}>
                    {isOwner ? "Welcome back, Owner" : "Ready to shine today?"}
                  </ResponsiveText>
                </View>
                <Pressable
                  onPress={handleRefetch}
                  disabled={isRefreshing}
                  style={({ pressed }) => [
                    styles.refreshButton,
                    (pressed || isRefreshing) && styles.refreshButtonPressed,
                  ]}
                >
                  <LinearGradient
                    colors={[
                      "rgba(255, 255, 255, 0.25)",
                      "rgba(255, 255, 255, 0.15)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.refreshButtonGradient}
                  >
                    {isRefreshing ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <RefreshCw size={18} color="white" />
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
              <View style={styles.decorativeCircle1} />
              <View style={styles.decorativeCircle2} />
            </LinearGradient>
          </View>

          {isOwner ? (
            <>
              <LazyComponent
                loadComponent={() =>
                  import("@/components/dashboard/OwnerDashboardStats")
                }
                fallback={<ComponentLoader />}
              />
            </>
          ) : (
            <>
              <LazyComponent
                loadComponent={() =>
                  import("@/components/employee/EmployeeStatsCards")
                }
                fallback={<ComponentLoader />}
              />
              <LazyComponent
                loadComponent={() =>
                  import("@/components/payslip/RequestPayslipSection")
                }
                fallback={<ComponentLoader />}
              />
              <LazyComponent
                loadComponent={() =>
                  import("@/components/employee/AttendanceCalendar")
                }
                fallback={<ComponentLoader />}
              />
            </>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  backgroundGradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scaleDimension(100),
  },
  headerSection: {
    marginTop: scaleDimension(24),
    marginBottom: scaleDimension(24),
    borderRadius: scaleDimension(24),
    overflow: "hidden",
    ...PLATFORM.shadowLg,
  },
  headerGradient: {
    padding: scaleDimension(24),
    position: "relative",
    overflow: "hidden",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  headerIconContainer: {
    width: scaleDimension(56),
    height: scaleDimension(56),
    borderRadius: scaleDimension(16),
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: scaleDimension(16),
    ...PLATFORM.shadowMd,
  },
  headerTextContainer: {
    flex: 1,
    // Removed minWidth: 0 to allow wrapping logic to work better if needed,
    // though flex:1 usually handles it.
  },
  greetingText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    marginBottom: scaleDimension(4),
    textTransform: "uppercase",
    letterSpacing: 1,
    flexWrap: "wrap", // Added wrap
  },
  welcomeText: {
    color: "white",
    fontWeight: "800",
    letterSpacing: -0.5,
    flexWrap: "wrap", // Added wrap
  },
  decorativeCircle1: {
    position: "absolute",
    width: scaleDimension(120),
    height: scaleDimension(120),
    borderRadius: scaleDimension(60),
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    top: scaleDimension(-40),
    right: scaleDimension(-40),
  },
  decorativeCircle2: {
    position: "absolute",
    width: scaleDimension(80),
    height: scaleDimension(80),
    borderRadius: scaleDimension(40),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    bottom: scaleDimension(-20),
    right: scaleDimension(40),
  },
  refreshButton: {
    width: scaleDimension(44),
    height: scaleDimension(44),
    borderRadius: scaleDimension(22),
    overflow: "hidden",
    ...PLATFORM.shadowMd,
  },
  refreshButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  refreshButtonGradient: {
    width: scaleDimension(44),
    height: scaleDimension(44),
    borderRadius: scaleDimension(22),
    alignItems: "center",
    justifyContent: "center",
  },
});
