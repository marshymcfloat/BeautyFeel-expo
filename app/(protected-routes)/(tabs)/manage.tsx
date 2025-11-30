import { GradientHeader } from "@/components/ui/GradientHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { ResponsiveText } from "@/components/ui/ResponsiveText";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getContainerPadding,
  PLATFORM,
  scaleDimension,
} from "@/lib/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { Settings } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Lazy load management screens using dynamic imports
function LazyManageBookings() {
  const [Component, setComponent] =
    React.useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import("@/components/manage/ManageBookings")
      .then((module) => {
        setComponent(() => module.default);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading ManageBookings:", error);
        setLoading(false);
      });
  }, []);

  if (loading || !Component) {
    return <LoadingState variant="skeleton" />;
  }

  return <Component />;
}

function LazyManageServices() {
  const [Component, setComponent] =
    React.useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import("@/components/manage/ManageServices")
      .then((module) => {
        setComponent(() => module.default);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading ManageServices:", error);
        setLoading(false);
      });
  }, []);

  if (loading || !Component) {
    return <LoadingState variant="skeleton" />;
  }

  return <Component />;
}

function LazyManageEmployees() {
  const [Component, setComponent] =
    React.useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import("@/components/manage/ManageEmployees")
      .then((module) => {
        setComponent(() => module.default);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading ManageEmployees:", error);
        setLoading(false);
      });
  }, []);

  if (loading || !Component) {
    return <LoadingState variant="skeleton" />;
  }

  return <Component />;
}

type ManageTab = "bookings" | "services" | "employees";

export default function ManageScreen() {
  const { hasRole, loading } = useAuth();
  const isOwner = hasRole("owner");
  const [activeTab, setActiveTab] = useState<ManageTab>("bookings");

  // Responsive variables
  const containerPadding = getContainerPadding();
  const iconSize = scaleDimension(24);

  if (loading) {
    return <LoadingState variant="skeleton" />;
  }

  if (!isOwner) {
    return (
      <View style={styles.container}>
        <ResponsiveText variant="md" style={styles.errorText}>
          Access denied
        </ResponsiveText>
      </View>
    );
  }

  const tabs: { id: ManageTab; label: string }[] = [
    { id: "bookings", label: "Bookings" },
    { id: "services", label: "Services" },
    { id: "employees", label: "Employees" },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#fdf2f8", "#fce7f3", "#f9fafb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <GradientHeader
            title="Manage"
            subtitle="Manage your business"
            icon={<Settings size={iconSize} color="white" />}
          />

          <View
            style={[styles.tabSelector, { marginHorizontal: containerPadding }]}
          >
            {tabs.map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tabButton,
                  activeTab === tab.id && styles.tabButtonActive,
                ]}
              >
                <ResponsiveText
                  variant="sm"
                  style={[
                    styles.tabButtonText,
                    activeTab === tab.id && styles.tabButtonTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </ResponsiveText>
              </Pressable>
            ))}
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "bookings" && <LazyManageBookings />}
            {activeTab === "services" && <LazyManageServices />}
            {activeTab === "employees" && <LazyManageEmployees />}
          </ScrollView>
        </SafeAreaView>
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
  safeArea: {
    flex: 1,
  },
  tabSelector: {
    flexDirection: "row",
    marginTop: scaleDimension(20),
    marginBottom: scaleDimension(16),
    backgroundColor: "white",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(4),
    ...PLATFORM.shadow,
  },
  tabButton: {
    flex: 1,
    paddingVertical: scaleDimension(10),
    paddingHorizontal: scaleDimension(16),
    borderRadius: scaleDimension(8),
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#fdf2f8",
  },
  tabButtonText: {
    fontWeight: "600",
    color: "#6b7280",
  },
  tabButtonTextActive: {
    color: "#ec4899",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: scaleDimension(100),
  },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
    marginTop: scaleDimension(40),
  },
});
