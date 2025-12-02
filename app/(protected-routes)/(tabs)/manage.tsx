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

function LazyManageBookings() {
  const [Component, setComponent] =
    React.useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;

    import("@/components/manage/ManageBookings")
      .then((module) => {
        if (isMounted) {
          setComponent(() => module.default as React.ComponentType<any>);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error loading ManageBookings:", error);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading || !Component) {
    return <LoadingState variant="skeleton" />;
  }

  return <Component />;
}

function LazyManageServices() {
  const [Component, setComponent] =
    React.useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [shouldLoad, setShouldLoad] = React.useState(false);

  React.useEffect(() => {
    const checkLoad = () => {
      if (!shouldLoad) {
        setShouldLoad(true);
      }
    };

    checkLoad();
  }, []);

  React.useEffect(() => {
    if (!shouldLoad) return;

    let isMounted = true;
    setLoading(true);

    import("@/components/manage/ManageServices")
      .then((module) => {
        if (isMounted) {
          setComponent(() => module.default as React.ComponentType<any>);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error loading ManageServices:", error);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [shouldLoad]);

  if (loading || !Component) {
    return <LoadingState variant="skeleton" />;
  }

  return <Component />;
}

function LazyManageEmployees() {
  const [Component, setComponent] =
    React.useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [shouldLoad, setShouldLoad] = React.useState(false);

  React.useEffect(() => {
    if (!shouldLoad) {
      setShouldLoad(true);
    }
  }, []);

  React.useEffect(() => {
    if (!shouldLoad) return;

    let isMounted = true;
    setLoading(true);

    import("@/components/manage/ManageEmployees")
      .then((module) => {
        if (isMounted) {
          setComponent(() => module.default as React.ComponentType<any>);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error loading ManageEmployees:", error);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [shouldLoad]);

  if (loading || !Component) {
    return <LoadingState variant="skeleton" />;
  }

  return <Component />;
}

function LazyManageVouchers() {
  const [Component, setComponent] =
    React.useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [shouldLoad, setShouldLoad] = React.useState(false);

  React.useEffect(() => {
    if (!shouldLoad) {
      setShouldLoad(true);
    }
  }, []);

  React.useEffect(() => {
    if (!shouldLoad) return;

    let isMounted = true;
    setLoading(true);

    import("@/components/manage/ManageVouchers")
      .then((module) => {
        if (isMounted) {
          setComponent(() => module.default as React.ComponentType<any>);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error loading ManageVouchers:", error);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [shouldLoad]);

  if (loading || !Component) {
    return <LoadingState variant="skeleton" />;
  }

  return <Component />;
}

function LazyManageGiftCertificates() {
  const [Component, setComponent] =
    React.useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [shouldLoad, setShouldLoad] = React.useState(false);

  React.useEffect(() => {
    if (!shouldLoad) {
      setShouldLoad(true);
    }
  }, []);

  React.useEffect(() => {
    if (!shouldLoad) return;

    let isMounted = true;
    setLoading(true);

    import("@/components/manage/ManageGiftCertificates")
      .then((module) => {
        if (isMounted) {
          setComponent(() => module.default as React.ComponentType<any>);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error loading ManageGiftCertificates:", error);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [shouldLoad]);

  if (loading || !Component) {
    return <LoadingState variant="skeleton" />;
  }

  return <Component />;
}

function LazyManageDiscounts() {
  const [Component, setComponent] =
    React.useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [shouldLoad, setShouldLoad] = React.useState(false);

  React.useEffect(() => {
    if (!shouldLoad) {
      setShouldLoad(true);
    }
  }, []);

  React.useEffect(() => {
    if (!shouldLoad) return;

    let isMounted = true;
    setLoading(true);

    import("@/components/manage/ManageDiscounts")
      .then((module) => {
        if (isMounted) {
          setComponent(() => module.default as React.ComponentType<any>);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Error loading ManageDiscounts:", error);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [shouldLoad]);

  if (loading || !Component) {
    return <LoadingState variant="skeleton" />;
  }

  return <Component />;
}

type ManageTab =
  | "bookings"
  | "services"
  | "employees"
  | "vouchers"
  | "giftCertificates"
  | "discounts";

export default function ManageScreen() {
  const { hasRole, loading } = useAuth();
  const isOwner = hasRole("owner");
  const [activeTab, setActiveTab] = useState<ManageTab>("bookings");

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
    { id: "vouchers", label: "Vouchers" },
    { id: "giftCertificates", label: "Gift Certificates" },
    { id: "discounts", label: "Discounts" },
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

          <View style={styles.tabsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.tabSelectorContainer,
                { paddingHorizontal: containerPadding },
              ]}
              style={styles.tabSelectorScrollView}
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
                    variant="xs"
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
            </ScrollView>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.tabContent,
                activeTab !== "bookings" && styles.hiddenTab,
              ]}
              pointerEvents={activeTab === "bookings" ? "auto" : "none"}
            >
              <LazyManageBookings />
            </View>
            <View
              style={[
                styles.tabContent,
                activeTab !== "services" && styles.hiddenTab,
              ]}
              pointerEvents={activeTab === "services" ? "auto" : "none"}
            >
              <LazyManageServices />
            </View>
            <View
              style={[
                styles.tabContent,
                activeTab !== "employees" && styles.hiddenTab,
              ]}
              pointerEvents={activeTab === "employees" ? "auto" : "none"}
            >
              <LazyManageEmployees />
            </View>
            <View
              style={[
                styles.tabContent,
                activeTab !== "vouchers" && styles.hiddenTab,
              ]}
              pointerEvents={activeTab === "vouchers" ? "auto" : "none"}
            >
              <LazyManageVouchers />
            </View>
            <View
              style={[
                styles.tabContent,
                activeTab !== "giftCertificates" && styles.hiddenTab,
              ]}
              pointerEvents={activeTab === "giftCertificates" ? "auto" : "none"}
            >
              <LazyManageGiftCertificates />
            </View>
            <View
              style={[
                styles.tabContent,
                activeTab !== "discounts" && styles.hiddenTab,
              ]}
              pointerEvents={activeTab === "discounts" ? "auto" : "none"}
            >
              <LazyManageDiscounts />
            </View>
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
  tabsWrapper: {
    maxHeight: scaleDimension(60),
  },
  tabSelectorScrollView: {
    marginTop: scaleDimension(12),
    marginBottom: scaleDimension(8),
    flexGrow: 0,
  },
  tabSelectorContainer: {
    flexDirection: "row",
    gap: scaleDimension(8),
    alignItems: "center",
  },
  tabButton: {
    paddingVertical: scaleDimension(6),
    paddingHorizontal: scaleDimension(14),
    borderRadius: scaleDimension(20),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.5)",
    ...PLATFORM.shadow,
    shadowOpacity: 0.05,
  },
  tabButtonActive: {
    backgroundColor: "#fdf2f8",
    borderColor: "#fbcfe8",
  },
  tabButtonText: {
    fontWeight: "500",
    color: "#6b7280",
  },
  tabButtonTextActive: {
    color: "#db2777",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: scaleDimension(100),
  },
  tabContent: {
    flex: 1,
  },
  hiddenTab: {
    position: "absolute",
    opacity: 0,
    width: 0,
    height: 0,
    overflow: "hidden",
  },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
    marginTop: scaleDimension(40),
  },
});
