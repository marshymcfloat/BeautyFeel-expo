import { useAuth } from "@/lib/hooks/useAuth";
import {
  scaleDimension,
  scaleFont,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from "@/lib/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { ArrowRight, Sparkles, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Lazy load the form to keep initial bundle size small
function LazyLoginForm({ onSuccess }: { onSuccess: (value: boolean) => void }) {
  const [LoginFormComponent, setLoginFormComponent] =
    useState<React.ComponentType<{
      onSuccess: (value: boolean) => void;
    }> | null>(null);

  useEffect(() => {
    import("@/components/auth/LoginForm").then((module) => {
      setLoginFormComponent(() => module.default);
    });
  }, []);

  if (!LoginFormComponent) {
    return (
      <View style={{ padding: 20, alignItems: "center" }}>
        <ActivityIndicator size="small" color="#ec4899" />
      </View>
    );
  }

  return <LoginFormComponent onSuccess={onSuccess} />;
}

export default function Index() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [appReady, setAppReady] = useState(false);

  // --- Auth & Redirect Logic (Kept exactly as original) ---
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setAppReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  useEffect(() => {
    if (!loading && user && !redirectAttempted) {
      if (showAuthModal) {
        setShowAuthModal(false);
        const timer = setTimeout(() => {
          setRedirectAttempted(true);
          router.replace("/(protected-routes)/(tabs)/home" as any);
        }, 500);
        return () => clearTimeout(timer);
      } else {
        setRedirectAttempted(true);
        router.replace("/(protected-routes)/(tabs)/home" as any);
      }
    } else if (!loading && !user) {
      setRedirectAttempted(false);
    }
  }, [user, loading, showAuthModal, router]);
  // ---------------------------------------------------------

  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) setLoadingTimeout(true);
    }, 10000);
    return () => clearTimeout(timeout);
  }, [loading]);

  // --- Loading Screen ---
  if (loading || !appReady) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#fff1f2", "#fdf4ff", "#f5f3ff"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <View style={styles.logoIconShadowWrapper}>
            <View style={styles.logoIconContainerSmall}>
              <LinearGradient
                colors={["#ec4899", "#d946ef"]}
                style={StyleSheet.absoluteFill}
              />
              <Sparkles size={24} color="white" />
            </View>
          </View>
          <ActivityIndicator
            size="large"
            color="#ec4899"
            style={{ marginTop: 20 }}
          />

          {loadingTimeout && (
            <Pressable
              onPress={async () => {
                const { supabase } = await import("@/lib/utils/supabase");
                await supabase.auth.signOut();
                router.replace("/");
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>Reload Session</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  if (redirectAttempted && user && !loading) return null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* --- Ambient Background --- */}
      <LinearGradient
        colors={["#fff1f2", "#fae8ff", "#ede9fe"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Floating Orbs for depth */}
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      <View style={[styles.orb, styles.orb3]} />

      {/* --- Main Content --- */}
      <SafeAreaView style={styles.safeArea}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.pillContainer}>
            <Text style={styles.pillText}>Professional Suite</Text>
          </View>
          <Pressable
            style={styles.signInButton}
            onPress={() => setShowAuthModal(true)}
          >
            <Text style={styles.signInText}>Login</Text>
          </Pressable>
        </View>

        {/* Center Hero */}
        <View style={styles.heroContent}>
          {/* Glass Card Effect */}
          <View style={styles.glassCard}>
            <View style={styles.logoWrapper}>
              <View style={styles.logoIconShadowWrapper}>
                <View style={styles.logoIconContainer}>
                  <LinearGradient
                    colors={["#ec4899", "#a855f7"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Sparkles size={40} color="white" />
                </View>
              </View>
            </View>

            <Text style={styles.brandName}>BEAUTYFEEL</Text>
            <Text style={styles.tagline}>
              Manage your salon with{"\n"}elegance and precision.
            </Text>

            <View style={styles.featureRow}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>Smart Booking</Text>
              <View style={[styles.featureDot, { marginLeft: 12 }]} />
              <Text style={styles.featureText}>POS</Text>
              <View style={[styles.featureDot, { marginLeft: 12 }]} />
              <Text style={styles.featureText}>Analytics</Text>
            </View>
          </View>
        </View>

        {/* Bottom Action */}
        <View style={styles.bottomSection}>
          <Pressable
            onPress={() => setShowAuthModal(true)}
            style={({ pressed }) => [
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <View style={styles.getStartedButtonShadowWrapper}>
              <View style={styles.getStartedButton}>
                <LinearGradient
                  colors={["#ec4899", "#d946ef", "#a855f7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.getStartedGradient}
                >
                  <Text style={styles.getStartedText}>Get Started</Text>
                  <ArrowRight
                    size={20}
                    color="white"
                    style={{ marginLeft: 8 }}
                  />
                </LinearGradient>
              </View>
            </View>
          </Pressable>
          <Text style={styles.versionText}>
            v1.0.0 • Employee & Owner Access
          </Text>
        </View>
      </SafeAreaView>

      {/* --- Auth Modal --- */}
      <Modal
        visible={showAuthModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowAuthModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          {/* Backdrop Pressable */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowAuthModal(false)}
          />

          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Welcome Back</Text>
              <Pressable
                onPress={() => setShowAuthModal(false)}
                style={styles.closeButton}
              >
                <X size={20} color="#6b7280" />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>Sign in to your dashboard</Text>

            <View style={styles.formContainer}>
              <LazyLoginForm onSuccess={setShowAuthModal} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const isSmall = SCREEN_WIDTH < 375;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  safeArea: {
    flex: 1,
  },

  // Ambient Orbs
  orb: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.5,
  },
  orb1: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    backgroundColor: "#fbcfe8", // pink-200
    top: -SCREEN_WIDTH * 0.2,
    left: -SCREEN_WIDTH * 0.2,
    // Note: blurRadius is not a valid ViewStyle property in React Native
    // Use expo-blur's BlurView component if blur effect is needed
  },
  orb2: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    backgroundColor: "#ddd6fe", // violet-200
    bottom: -SCREEN_WIDTH * 0.1,
    right: -SCREEN_WIDTH * 0.2,
  },
  orb3: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.5,
    backgroundColor: "#f5d0fe", // fuchsia-200
    top: SCREEN_HEIGHT * 0.4,
    left: SCREEN_WIDTH * 0.2,
    opacity: 0.3,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  pillContainer: {
    backgroundColor: "rgba(255,255,255,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#a855f7",
    letterSpacing: 0.5,
  },
  signInButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  signInText: {
    color: "#4b5563",
    fontWeight: "600",
    fontSize: 15,
  },

  // Hero Section
  heroContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    borderRadius: 32,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
    ...Platform.select({
      ios: {
        shadowColor: "#a855f7",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  logoWrapper: {
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#ec4899",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        // Elevation handled by wrapper
      },
    }),
  },
  logoIconShadowWrapper: {
    backgroundColor: "white", // Needed for elevation shadow to render
    borderRadius: 24,
    ...Platform.select({
      android: {
        elevation: 6,
      },
    }),
  },
  logoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  brandName: {
    fontSize: scaleFont(32),
    fontWeight: "900",
    color: "#1f2937", // gray-800
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: 12,
  },
  tagline: {
    fontSize: scaleFont(16),
    color: "#6b7280", // gray-500
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ec4899",
    marginRight: 6,
  },
  featureText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4b5563",
    textTransform: "uppercase",
  },

  // Bottom Section
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: scaleDimension(48),
  },
  getStartedButtonShadowWrapper: {
    borderRadius: 20,
    backgroundColor: "white", // Needed for elevation
    ...Platform.select({
      ios: {
        shadowColor: "#ec4899",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  getStartedButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  getStartedGradient: {
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  getStartedText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  versionText: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 20,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    minHeight: "60%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  closeButton: {
    padding: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 32,
  },
  formContainer: {
    flex: 1,
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoIconContainerSmall: {
    width: 64,
    height: 64,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#ec4899",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  retryText: {
    color: "#ef4444",
    fontWeight: "600",
  },
});
