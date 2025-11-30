import { useAuth } from "@/lib/hooks/useAuth";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
    return <ActivityIndicator size="small" color="#ec4899" />;
  }

  return <LoginFormComponent onSuccess={onSuccess} />;
}

export default function Index() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [appReady, setAppReady] = useState(false);

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
    console.log("Auth state in index.tsx:", {
      hasUser: !!user,
      loading,
      userId: user?.id,
      hasModal: showAuthModal,
      redirectAttempted,
    });

    if (!loading && user && !redirectAttempted) {
      console.log("✅ User authenticated, preparing redirect...", {
        userId: user.id,
        hasModal: showAuthModal,
      });

      if (showAuthModal) {
        console.log("Closing modal before redirect...");
        setShowAuthModal(false);
        const timer = setTimeout(() => {
          console.log("Executing redirect after modal close...");
          setRedirectAttempted(true);
          const targetRoute = "/(protected-routes)/(tabs)/home";
          console.log("Navigating to:", targetRoute);
          router.replace(targetRoute as any);
          console.log("Router.replace called after modal close");
        }, 500);
        return () => clearTimeout(timer);
      } else {
        console.log("Executing redirect immediately (synchronously)...");
        setRedirectAttempted(true);
        const targetRoute = "/(protected-routes)/(tabs)/home";
        console.log("About to navigate to:", targetRoute);
        router.replace(targetRoute as any);
        console.log("Router.replace called synchronously");
      }
    } else if (!loading && !user) {
      setRedirectAttempted(false);
    }
  }, [user, loading, showAuthModal, router]);

  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setLoadingTimeout(true);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [loading]);

  if (loading || !appReady) {
    return (
      <LinearGradient
        colors={["#fdf2f8", "#fae8ff", "#f3e8ff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
      >
        <SafeAreaView
          style={[styles.safeArea, styles.loadingContainer]}
          pointerEvents="box-none"
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#ec4899" />
            <Text style={styles.loadingText}>Loading...</Text>
            {loadingTimeout && (
              <View style={styles.timeoutContainer}>
                <Text style={styles.timeoutText}>
                  Taking longer than expected...
                </Text>
                <Pressable
                  onPress={async () => {
                    console.log("Clear Session button pressed");
                    const { supabase } = await import("@/lib/utils/supabase");
                    await supabase.auth.signOut();
                    router.replace("/");
                  }}
                  style={({ pressed }) => [
                    styles.clearButton,
                    pressed && styles.clearButtonPressed,
                  ]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.clearButtonText}>
                    Clear Session & Retry
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (redirectAttempted && user && !loading) {
    return null;
  }

  return (
    <>
      <Modal
        visible={showAuthModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowAuthModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={["#ec4899", "#a855f7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                >
                  <View style={styles.iconInner}>
                    <Sparkles size={28} color="white" />
                  </View>
                </LinearGradient>
              </View>
              <Text style={styles.modalTitle}>Welcome Back</Text>
              <Text style={styles.modalSubtitle}>
                Sign in to your Beautyfeel account
              </Text>
            </View>

            <LazyLoginForm onSuccess={setShowAuthModal} />
          </View>
        </View>
      </Modal>

      <LinearGradient
        colors={["#fdf2f8", "#fae8ff", "#f3e8ff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <Pressable
              style={styles.signInButton}
              onPress={() => setShowAuthModal(true)}
            >
              <Text style={styles.signInText}>Sign In</Text>
            </Pressable>
          </View>

          <View style={styles.heroContent}>
            <View style={[styles.decorativeCircle, styles.decorativeCircle1]} />
            <View style={[styles.decorativeCircle, styles.decorativeCircle2]} />
            <View style={[styles.decorativeCircle, styles.decorativeCircle3]} />

            <View style={styles.logoSection}>
              <View style={styles.logoIconContainer}>
                <LinearGradient
                  colors={["#ec4899", "#d946ef", "#a855f7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                >
                  <View style={styles.logoIconInner}>
                    <Sparkles size={44} color="white" />
                  </View>
                </LinearGradient>
              </View>

              <Text style={styles.brandName}>BEAUTYFEEL</Text>

              <LinearGradient
                colors={["#ec4899", "#a855f7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.divider}
              />

              <Text style={styles.tagline}>Your Beauty, Our Passion</Text>
            </View>
          </View>

          <View style={styles.bottomSection}>
            <Pressable
              style={styles.getStartedButton}
              onPress={() => setShowAuthModal(true)}
            >
              <LinearGradient
                colors={["#ec4899", "#d946ef"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.getStartedGradient}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
              </LinearGradient>
            </Pressable>

            <Text style={styles.bottomText}>
              Join thousands of beauty professionals
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  signInButton: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  signInText: {
    color: "#ec4899",
    fontWeight: "600",
  },
  heroContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  decorativeCircle: {
    position: "absolute",
    borderRadius: 999,
  },
  decorativeCircle1: {
    top: 80,
    left: 32,
    width: 80,
    height: 80,
    backgroundColor: "rgba(244, 114, 182, 0.2)",
  },
  decorativeCircle2: {
    top: 160,
    right: 48,
    width: 56,
    height: 56,
    backgroundColor: "rgba(192, 132, 252, 0.3)",
  },
  decorativeCircle3: {
    bottom: 128,
    left: 64,
    width: 96,
    height: 96,
    backgroundColor: "rgba(232, 121, 249, 0.25)",
  },
  logoSection: {
    alignItems: "center",
  },
  logoIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    marginBottom: 32,
    overflow: "hidden",
  },
  logoIconInner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  brandName: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 8,
    color: "#1f1f1f",
    textTransform: "uppercase",
  },
  divider: {
    height: 4,
    width: 192,
    borderRadius: 999,
    marginTop: 16,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    color: "#4b5563",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  bottomSection: {
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  getStartedButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  getStartedGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  getStartedText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  bottomText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 24,
    width: "100%",
    maxWidth: 448,
    padding: 32,
    zIndex: 10,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 999,
    marginBottom: 16,
    overflow: "hidden",
  },
  iconInner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  modalSubtitle: {
    color: "#6b7280",
    marginTop: 4,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  loadingText: {
    marginTop: 16,
    color: "#6b7280",
    fontSize: 16,
  },
  timeoutContainer: {
    alignItems: "center",
    marginTop: 24,
    zIndex: 1,
  },
  timeoutText: {
    marginTop: 12,
    marginBottom: 16,
    color: "#ef4444",
    fontSize: 14,
    textAlign: "center",
  },
  clearButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 200,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  clearButtonPressed: {
    backgroundColor: "#dc2626",
    opacity: 0.8,
  },
  clearButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
