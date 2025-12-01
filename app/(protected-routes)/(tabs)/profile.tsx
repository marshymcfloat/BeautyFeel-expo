import { queryClient } from "@/components/Providers/TanstackProvider";
import { ResponsiveText } from "@/components/ui/ResponsiveText";
import { useToast } from "@/components/ui/toast";
import {
  getEarningsStats,
  getMyPayslipReleases,
  updateEmployeeName,
  updatePassword,
} from "@/lib/actions/profileActions";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatCurrency } from "@/lib/utils/currency";
import { formatFullDate } from "@/lib/utils/dateTime";
import { scaleDimension, scaleFont } from "@/lib/utils/responsive";
import { getRoleDisplayName } from "@/lib/utils/role";
import { supabase } from "@/lib/utils/supabase";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Calendar,
  ChevronRight,
  FileText,
  Lock,
  LogOut,
  PhilippinePeso,
  User,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const toast = useToast();

  const updatePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      // First verify current password by attempting to sign in
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("User not found");
      }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      // Update password
      return updatePassword(password);
    },
    onSuccess: () => {
      toast.success("Password Updated", "Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    },
    onError: (error: Error) => {
      toast.error("Error", error.message || "Failed to update password");
    },
  });

  const handleSubmit = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Error", "Please fill in all fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Error", "Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Error", "Passwords do not match");
      return;
    }

    updatePasswordMutation.mutate(newPassword);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ResponsiveText variant="xl" style={styles.modalTitle}>
              Change Password
            </ResponsiveText>
            <Pressable onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <ResponsiveText variant="sm" style={styles.inputLabel}>
                Current Password
              </ResponsiveText>
              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <ResponsiveText variant="sm" style={styles.inputLabel}>
                New Password
              </ResponsiveText>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <ResponsiveText variant="sm" style={styles.inputLabel}>
                Confirm New Password
              </ResponsiveText>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Pressable
              style={styles.modalButton}
              onPress={handleSubmit}
              disabled={updatePasswordMutation.isPending}
            >
              <LinearGradient
                colors={["#ec4899", "#d946ef"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalButtonGradient}
              >
                {updatePasswordMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ResponsiveText variant="md" style={styles.modalButtonText}>
                    Update Password
                  </ResponsiveText>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface ChangeNameModalProps {
  visible: boolean;
  onClose: () => void;
  currentName: string | null;
}

function ChangeNameModal({
  visible,
  onClose,
  currentName,
}: ChangeNameModalProps) {
  const [name, setName] = useState(currentName || "");
  const toast = useToast();
  const { employee } = useAuth();

  const updateNameMutation = useMutation({
    mutationFn: (newName: string) => {
      if (!employee?.id) throw new Error("Employee not found");
      return updateEmployeeName(employee.id, newName);
    },
    onSuccess: () => {
      toast.success("Name Updated", "Name updated successfully");
      onClose();
      // Invalidate queries to refresh employee data
      queryClient.invalidateQueries({ queryKey: ["employee"] });
    },
    onError: (error: Error) => {
      toast.error("Error", error.message || "Failed to update name");
    },
  });

  React.useEffect(() => {
    if (visible) {
      setName(currentName || "");
    }
  }, [visible, currentName]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Error", "Name cannot be empty");
      return;
    }

    updateNameMutation.mutate(name.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ResponsiveText variant="xl" style={styles.modalTitle}>
              Change Name
            </ResponsiveText>
            <Pressable onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <ResponsiveText variant="sm" style={styles.inputLabel}>
                Name
              </ResponsiveText>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>

            <Pressable
              style={styles.modalButton}
              onPress={handleSubmit}
              disabled={updateNameMutation.isPending}
            >
              <LinearGradient
                colors={["#ec4899", "#d946ef"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalButtonGradient}
              >
                {updateNameMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <ResponsiveText variant="md" style={styles.modalButtonText}>
                    Update Name
                  </ResponsiveText>
                )}
              </LinearGradient>
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
  const toast = useToast();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeName, setShowChangeName] = useState(false);

  // Fetch earnings stats
  const { data: earningsData, isLoading: earningsLoading } = useQuery({
    queryKey: ["earningsStats", employee?.id],
    queryFn: () => getEarningsStats(employee!.id),
    enabled: !!employee?.id,
  });

  // Fetch payslip releases
  const { data: payslipData, isLoading: payslipLoading } = useQuery({
    queryKey: ["payslipReleases", employee?.id],
    queryFn: () => getMyPayslipReleases(employee!.id),
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

  const isLoading = authLoading || earningsLoading || payslipLoading;
  const displayName = employee?.name || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "No email";
  const initials = useMemo(
    () => getInitials(employee?.name || user?.email),
    [employee?.name, user?.email]
  );
  const roleDisplay = useMemo(
    () => getRoleDisplayName(employee?.role),
    [employee?.role]
  );
  const earnings = earningsData?.data;
  const payslipReleases = payslipData?.data || [];

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
                  <Text style={styles.profileEmail}>{displayEmail}</Text>
                  <View style={styles.badgeContainer}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{roleDisplay}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Earnings Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <PhilippinePeso size={20} color="#ec4899" />
              <ResponsiveText variant="lg" style={styles.sectionTitle}>
                Total Earned
              </ResponsiveText>
            </View>
            <View style={styles.earningsGrid}>
              <View style={styles.earningsCard}>
                <ResponsiveText variant="sm" style={styles.earningsLabel}>
                  Today
                </ResponsiveText>
                <ResponsiveText variant="xl" style={styles.earningsValue}>
                  {isLoading ? "..." : formatCurrency(earnings?.today || 0)}
                </ResponsiveText>
              </View>
              <View style={styles.earningsCard}>
                <ResponsiveText variant="sm" style={styles.earningsLabel}>
                  This Week
                </ResponsiveText>
                <ResponsiveText variant="xl" style={styles.earningsValue}>
                  {isLoading ? "..." : formatCurrency(earnings?.thisWeek || 0)}
                </ResponsiveText>
              </View>
              <View style={styles.earningsCard}>
                <ResponsiveText variant="sm" style={styles.earningsLabel}>
                  This Month
                </ResponsiveText>
                <ResponsiveText variant="xl" style={styles.earningsValue}>
                  {isLoading ? "..." : formatCurrency(earnings?.thisMonth || 0)}
                </ResponsiveText>
              </View>
              <View style={styles.earningsCard}>
                <ResponsiveText variant="sm" style={styles.earningsLabel}>
                  This Year
                </ResponsiveText>
                <ResponsiveText variant="xl" style={styles.earningsValue}>
                  {isLoading ? "..." : formatCurrency(earnings?.thisYear || 0)}
                </ResponsiveText>
              </View>
              <View style={[styles.earningsCard, styles.earningsCardAllTime]}>
                <ResponsiveText variant="sm" style={styles.earningsLabel}>
                  All Time
                </ResponsiveText>
                <ResponsiveText variant="xl" style={styles.earningsValue}>
                  {isLoading ? "..." : formatCurrency(earnings?.allTime || 0)}
                </ResponsiveText>
              </View>
            </View>
          </View>

          {/* Account Settings */}
          <View style={styles.section}>
            <ResponsiveText variant="sm" style={styles.sectionTitle}>
              ACCOUNT SETTINGS
            </ResponsiveText>
            <View style={styles.menuGroup}>
              <Pressable
                style={styles.menuItem}
                onPress={() => setShowChangeName(true)}
              >
                <View style={styles.menuIconContainer}>
                  <User size={20} color="#ec4899" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Change Name</Text>
                  <Text style={styles.menuSubtitle}>
                    Update your display name
                  </Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </Pressable>
              <View style={styles.menuDivider} />
              <Pressable
                style={styles.menuItem}
                onPress={() => setShowChangePassword(true)}
              >
                <View style={styles.menuIconContainer}>
                  <Lock size={20} color="#ec4899" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Change Password</Text>
                  <Text style={styles.menuSubtitle}>Update your password</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </Pressable>
            </View>
          </View>

          {/* Payslip History */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText size={20} color="#ec4899" />
              <ResponsiveText variant="lg" style={styles.sectionTitle}>
                Payslip History
              </ResponsiveText>
            </View>
            {payslipLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#ec4899" />
              </View>
            ) : payslipReleases.length === 0 ? (
              <View style={styles.emptyState}>
                <FileText size={48} color="#d1d5db" />
                <ResponsiveText variant="md" style={styles.emptyText}>
                  No payslip releases yet
                </ResponsiveText>
              </View>
            ) : (
              <ScrollView
                style={styles.payslipListContainer}
                contentContainerStyle={styles.payslipList}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {payslipReleases.map((release) => (
                  <View key={release.id} style={styles.payslipCard}>
                    <View style={styles.payslipHeader}>
                      <View>
                        <ResponsiveText
                          variant="md"
                          style={styles.payslipAmount}
                        >
                          {formatCurrency(release.total_amount)}
                        </ResponsiveText>
                        <ResponsiveText variant="sm" style={styles.payslipDate}>
                          {formatFullDate(release.released_at)}
                        </ResponsiveText>
                      </View>
                      <Calendar size={20} color="#6b7280" />
                    </View>
                    {release.period_start_date && release.period_end_date && (
                      <ResponsiveText variant="xs" style={styles.payslipPeriod}>
                        Period: {formatFullDate(release.period_start_date)} -{" "}
                        {formatFullDate(release.period_end_date)}
                      </ResponsiveText>
                    )}
                    {release.notes && (
                      <ResponsiveText variant="xs" style={styles.payslipNotes}>
                        {release.notes}
                      </ResponsiveText>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Sign Out */}
          <View style={styles.section}>
            <View style={styles.menuGroup}>
              <Pressable style={styles.menuItem} onPress={handleLogout}>
                <View style={[styles.menuIconContainer, styles.menuIconDanger]}>
                  <LogOut size={20} color="#ef4444" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={[styles.menuTitle, styles.menuTitleDanger]}>
                    Sign Out
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Version */}
          <Text style={styles.versionText}>Beautyfeel v1.0.0</Text>
        </ScrollView>
      </LinearGradient>

      {/* Modals */}
      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
      <ChangeNameModal
        visible={showChangeName}
        onClose={() => setShowChangeName(false)}
        currentName={employee?.name || null}
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
    paddingBottom: scaleDimension(100),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  header: {
    paddingHorizontal: scaleDimension(24),
    paddingTop: scaleDimension(16),
    paddingBottom: scaleDimension(24),
  },
  title: {
    fontSize: scaleFont(32),
    fontWeight: "bold",
    color: "#111827",
  },
  profileCardContainer: {
    marginHorizontal: scaleDimension(24),
    marginBottom: scaleDimension(24),
    borderRadius: scaleDimension(24),
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#ec4899",
        shadowOffset: { width: 0, height: scaleDimension(8) },
        shadowOpacity: 0.3,
        shadowRadius: scaleDimension(16),
      },
      android: {
        elevation: 8,
      },
    }),
  },
  profileCardGradient: {
    padding: scaleDimension(24),
  },
  profileCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: scaleDimension(80),
    height: scaleDimension(80),
    borderRadius: scaleDimension(999),
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  avatarText: {
    fontSize: scaleFont(32),
    fontWeight: "bold",
    color: "white",
  },
  profileInfo: {
    marginLeft: scaleDimension(16),
    flex: 1,
  },
  profileName: {
    fontSize: scaleFont(24),
    fontWeight: "bold",
    color: "white",
  },
  profileEmail: {
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  badge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(4),
    borderRadius: scaleDimension(999),
  },
  badgeText: {
    color: "white",
    fontSize: scaleFont(14),
    fontWeight: "500",
  },
  section: {
    paddingHorizontal: scaleDimension(24),
    marginBottom: scaleDimension(24),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
    marginBottom: scaleDimension(12),
  },
  sectionTitle: {
    color: "#111827",
    fontWeight: "700",
    fontSize: scaleFont(18),
  },
  earningsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleDimension(12),
  },
  earningsCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "white",
    borderRadius: scaleDimension(16),
    padding: scaleDimension(16),
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: scaleDimension(2) },
        shadowOpacity: 0.1,
        shadowRadius: scaleDimension(8),
      },
      android: {
        elevation: 3,
      },
    }),
  },
  earningsCardAllTime: {
    minWidth: "100%",
    backgroundColor: "#fdf2f8",
    borderWidth: 2,
    borderColor: "#ec4899",
  },
  earningsLabel: {
    color: "#6b7280",
    marginBottom: 8,
    fontWeight: "500",
  },
  earningsValue: {
    color: "#111827",
    fontWeight: "700",
  },
  menuGroup: {
    backgroundColor: "white",
    borderRadius: scaleDimension(16),
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: scaleDimension(2) },
        shadowOpacity: 0.1,
        shadowRadius: scaleDimension(8),
      },
      android: {
        elevation: 3,
      },
    }),
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: scaleDimension(16),
    paddingHorizontal: scaleDimension(16),
  },
  menuIconContainer: {
    width: scaleDimension(40),
    height: scaleDimension(40),
    borderRadius: scaleDimension(12),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fdf2f8",
  },
  menuIconDanger: {
    backgroundColor: "#fef2f2",
  },
  menuContent: {
    flex: 1,
    marginLeft: scaleDimension(12),
  },
  menuTitle: {
    fontWeight: "500",
    color: "#111827",
  },
  menuTitleDanger: {
    color: "#dc2626",
  },
  menuSubtitle: {
    color: "#6b7280",
    fontSize: scaleFont(14),
    marginTop: scaleDimension(2),
  },
  menuDivider: {
    height: scaleDimension(1),
    backgroundColor: "#f3f4f6",
    marginHorizontal: scaleDimension(16),
  },
  payslipListContainer: {
    maxHeight: scaleDimension(400),
  },
  payslipList: {
    gap: 12,
    paddingBottom: 8,
  },
  payslipCard: {
    backgroundColor: "white",
    borderRadius: scaleDimension(16),
    padding: scaleDimension(16),
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
  payslipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  payslipAmount: {
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  payslipDate: {
    color: "#6b7280",
  },
  payslipPeriod: {
    color: "#6b7280",
    marginTop: 4,
  },
  payslipNotes: {
    color: "#9ca3af",
    marginTop: 8,
    fontStyle: "italic",
  },
  emptyState: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 48,
    alignItems: "center",
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
  emptyText: {
    color: "#6b7280",
    marginTop: 12,
    textAlign: "center",
  },
  versionText: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: scaleFont(14),
    marginBottom: scaleDimension(24),
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontWeight: "700",
    color: "#111827",
  },
  modalClose: {
    fontSize: scaleFont(20),
    color: "#6b7280",
  },
  modalBody: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: scaleFont(16),
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  modalButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
  modalButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  modalButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
