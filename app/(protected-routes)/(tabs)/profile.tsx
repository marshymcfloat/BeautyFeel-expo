import { supabase } from "@/lib/utils/supabase";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getProfileStats,
  changePasswordAction,
} from "@/lib/actions/profileActions";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils/currency";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { LogOut, Lock, ChevronRight } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@/components/form/FormField";
import { Toast, ToastDescription, ToastTitle, useToast } from "@/components/ui/toast";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  onPress?: () => void;
  danger?: boolean;
}

function MenuItem({
  icon,
  title,
  onPress,
  danger = false,
}: MenuItemProps) {
  return (
    <Pressable
      style={styles.menuItem}
      onPress={onPress}
    >
      <View
        style={[
          styles.menuIconContainer,
          danger ? styles.menuIconDanger : styles.menuIconDefault,
        ]}
      >
        {icon}
      </View>
      <View style={styles.menuContent}>
        <Text
          style={[
            styles.menuTitle,
            danger ? styles.menuTitleDanger : styles.menuTitleDefault,
          ]}
        >
          {title}
        </Text>
      </View>
      {!danger && <ChevronRight size={20} color="#9CA3AF" />}
    </Pressable>
  );
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function ChangePasswordModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { control, handleSubmit, reset } = form;

  const changePasswordMutation = useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => changePasswordAction(currentPassword, newPassword),
    onSuccess: (result) => {
      if (result.success) {
        toast.show({
          placement: "top",
          duration: 2000,
          render: ({ id }) => (
            <Toast action="success" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Password Changed</ToastTitle>
              <ToastDescription>Your password has been updated successfully.</ToastDescription>
            </Toast>
          ),
        });
        reset();
        onClose();
      } else {
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => (
            <Toast action="error" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Error</ToastTitle>
              <ToastDescription>{result.error || "Failed to change password"}</ToastDescription>
            </Toast>
          ),
        });
      }
    },
    onError: (error: Error) => {
      toast.show({
        placement: "top",
        duration: 3000,
        render: ({ id }) => (
          <Toast action="error" variant="outline" nativeID={"toast-" + id}>
            <ToastTitle>Error</ToastTitle>
            <ToastDescription>{error.message || "An unexpected error occurred"}</ToastDescription>
          </Toast>
        ),
      });
    },
  });

  const onSubmit = (data: ChangePasswordFormData) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Password</Text>

          <FormField
            control={control}
            name="currentPassword"
            label="Current Password"
            placeholder="Enter current password"
            secureTextEntry
          />

          <FormField
            control={control}
            name="newPassword"
            label="New Password"
            placeholder="Enter new password"
            secureTextEntry
          />

          <FormField
            control={control}
            name="confirmPassword"
            label="Confirm Password"
            placeholder="Confirm new password"
            secureTextEntry
          />

          <View style={styles.modalButtons}>
            <Pressable
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, styles.modalButtonSubmit]}
              onPress={handleSubmit(onSubmit)}
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.modalButtonTextSubmit}>Change Password</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}


export default function ProfileScreen() {
  const router = useRouter();
  const { user, employee, loading: authLoading } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Fetch profile stats
  const {
    data: profileStats,
    isLoading: statsLoading,
  } = useQuery({
    queryKey: ["profileStats", employee?.id],
    queryFn: () => getProfileStats(employee!.id),
    enabled: !!employee?.id,
  });

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/");
        },
      },
    ]);
  };

  const isLoading = authLoading || statsLoading;
  const displayName = employee?.name || user?.email?.split("@")[0] || "User";
  const initials = useMemo(
    () => getInitials(employee?.name || user?.email),
    [employee?.name, user?.email]
  );
  const stats = profileStats?.data;

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
          </View>

          {/* Profile Card */}
          <View style={styles.profileCardContainer}>
            <LinearGradient
              colors={["#ec4899", "#d946ef", "#a855f7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileCardGradient}
            >
              <View style={styles.profileCardHeader}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{displayName}</Text>
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {isLoading ? "..." : stats?.totalServices || 0}
                  </Text>
                  <Text style={styles.statLabel}>Total Services</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {isLoading
                      ? "..."
                      : formatCurrency(stats?.totalEarned || 0)}
                  </Text>
                  <Text style={styles.statLabel}>Total Earned</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Service Breakdown */}
          {stats && stats.serviceBreakdown && stats.serviceBreakdown.length > 0 && (
            <View style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>SERVICE BREAKDOWN</Text>
              <View style={styles.menuGroup}>
                {stats.serviceBreakdown.map((service, index) => (
                  <React.Fragment key={service.serviceId}>
                    {index > 0 && <View style={styles.menuDivider} />}
                    <View style={styles.serviceItem}>
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceName}>{service.serviceName}</Text>
                        <Text style={styles.serviceCount}>
                          {service.count} {service.count === 1 ? "service" : "services"}
                        </Text>
                      </View>
                      <Text style={styles.serviceEarned}>
                        {formatCurrency(service.totalEarned)}
                      </Text>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}

          {/* Menu Sections */}
          <View style={styles.menuSection}>
            <View style={styles.menuGroup}>
              <MenuItem
                icon={<Lock size={20} color="#ec4899" />}
                title="Change Password"
                onPress={() => setShowChangePassword(true)}
              />
              <View style={styles.menuDivider} />
              <MenuItem
                icon={<LogOut size={20} color="#ef4444" />}
                title="Sign Out"
                onPress={handleLogout}
                danger
              />
            </View>
          </View>
        </ScrollView>
      </LinearGradient>

      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
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
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111827",
  },
  profileCardContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#ec4899",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  profileCardGradient: {
    padding: 24,
  },
  profileCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
    justifyContent: "center",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  statsContainer: {
    flexDirection: "row",
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  statLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  menuSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  menuSectionTitle: {
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconDefault: {
    backgroundColor: "#fdf2f8",
  },
  menuIconDanger: {
    backgroundColor: "#fef2f2",
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontWeight: "500",
  },
  menuTitleDefault: {
    color: "#111827",
  },
  menuTitleDanger: {
    color: "#dc2626",
  },
  menuSubtitle: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 16,
  },
  serviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  serviceCount: {
    fontSize: 14,
    color: "#6b7280",
  },
  serviceEarned: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ec4899",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#f3f4f6",
  },
  modalButtonSubmit: {
    backgroundColor: "#ec4899",
  },
  modalButtonTextCancel: {
    color: "#111827",
    fontWeight: "600",
  },
  modalButtonTextSubmit: {
    color: "white",
    fontWeight: "600",
  },
});
