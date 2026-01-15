import { ResponsiveText } from "@/components/ui/ResponsiveText";
import { getUpcomingAppointmentSessions } from "@/lib/actions/appointmentSessionActions";
import { scaleDimension } from "@/lib/utils/responsive";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CheckCircle2, Clock, X } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { EmptyState } from "../ui/EmptyState";

interface CustomerAppointmentsModalProps {
  visible: boolean;
  onClose: () => void;
  customerId: number | null;
  customerName: string;
}

export default function CustomerAppointmentsModal({
  visible,
  onClose,
  customerId,
  customerName,
}: CustomerAppointmentsModalProps) {
  const iconSize = scaleDimension(24);

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ["customer-appointments", customerId],
    queryFn: () => getUpcomingAppointmentSessions(customerId || 0),
    enabled: visible && !!customerId && customerId > 0,
  });

  const sessions =
    sessionsData?.success && sessionsData.data ? sessionsData.data : [];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <ResponsiveText variant="2xl" style={styles.headerTitle}>
                Appointment Sessions
              </ResponsiveText>
              <ResponsiveText variant="sm" style={styles.headerSubtitle}>
                {customerName}
              </ResponsiveText>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={iconSize} color="#374151" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ec4899" />
              </View>
            ) : sessions.length === 0 ? (
              <EmptyState
                icon={<Calendar size={48} color="#d1d5db" />}
                title="No active appointments"
                message="This customer doesn't have any active appointment sessions."
              />
            ) : (
              sessions.map((session) => (
                <View key={session.session_id} style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionTitleRow}>
                      <ResponsiveText
                        variant="lg"
                        style={styles.sessionTitle}
                        numberOfLines={2}
                      >
                        {session.service_title}
                      </ResponsiveText>
                      <View style={styles.statusBadge}>
                        <Clock size={12} color="#6366f1" />
                        <ResponsiveText
                          variant="xs"
                          style={styles.statusBadgeText}
                          numberOfLines={1}
                        >
                          {session.status}
                        </ResponsiveText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.sessionDetails}>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${
                                session.total_steps
                                  ? (session.current_step /
                                      session.total_steps) *
                                    100
                                  : 0
                              }%`,
                            },
                          ]}
                        />
                      </View>
                      <ResponsiveText
                        variant="sm"
                        style={styles.progressText}
                        numberOfLines={1}
                      >
                        Step {session.current_step}
                        {session.total_steps
                          ? ` of ${session.total_steps}`
                          : ""}
                      </ResponsiveText>
                    </View>

                    {session.next_step_label && (
                      <View style={styles.detailRow}>
                        <ResponsiveText
                          variant="sm"
                          style={styles.detailLabel}
                          numberOfLines={1}
                        >
                          Next Step:
                        </ResponsiveText>
                        <ResponsiveText
                          variant="sm"
                          style={styles.detailValue}
                          numberOfLines={1}
                        >
                          {session.next_step_label}
                        </ResponsiveText>
                      </View>
                    )}

                    {session.next_service_title && (
                      <View style={styles.detailRow}>
                        <ResponsiveText
                          variant="sm"
                          style={styles.detailLabel}
                          numberOfLines={1}
                        >
                          Next Service:
                        </ResponsiveText>
                        <ResponsiveText
                          variant="sm"
                          style={styles.detailValue}
                          numberOfLines={1}
                        >
                          {session.next_service_title}
                        </ResponsiveText>
                      </View>
                    )}

                    {session.last_appointment_date && (
                      <View style={styles.detailRow}>
                        <CheckCircle2 size={14} color="#10b981" />
                        <ResponsiveText
                          variant="sm"
                          style={styles.detailLabel}
                          numberOfLines={1}
                        >
                          Last Appointment:
                        </ResponsiveText>
                        <ResponsiveText
                          variant="sm"
                          style={styles.detailValue}
                          numberOfLines={1}
                        >
                          {formatDate(session.last_appointment_date)}
                        </ResponsiveText>
                      </View>
                    )}

                    {session.next_recommended_date && (
                      <View style={styles.detailRow}>
                        <Calendar size={14} color="#ec4899" />
                        <ResponsiveText
                          variant="sm"
                          style={styles.detailLabel}
                          numberOfLines={1}
                        >
                          Recommended:
                        </ResponsiveText>
                        <ResponsiveText
                          variant="sm"
                          style={styles.detailValue}
                          numberOfLines={1}
                        >
                          {formatDate(session.next_recommended_date)}
                        </ResponsiveText>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: scaleDimension(24),
    borderTopRightRadius: scaleDimension(24),
    maxHeight: "90%",
    minHeight: scaleDimension(300),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scaleDimension(20),
    paddingVertical: scaleDimension(20),
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: "700",
    color: "#111827",
    marginBottom: scaleDimension(4),
  },
  headerSubtitle: {
    color: "#6b7280",
  },
  closeButton: {
    padding: scaleDimension(4),
    marginLeft: scaleDimension(12),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: scaleDimension(20),
    paddingBottom: scaleDimension(40),
  },
  loadingContainer: {
    paddingVertical: scaleDimension(40),
    alignItems: "center",
  },
  sessionCard: {
    backgroundColor: "#f9fafb",
    borderRadius: scaleDimension(16),
    padding: scaleDimension(16),
    marginBottom: scaleDimension(12),
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sessionHeader: {
    marginBottom: scaleDimension(12),
  },
  sessionTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: scaleDimension(8),
  },
  sessionTitle: {
    flex: 1,
    fontWeight: "700",
    color: "#111827",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(4),
    backgroundColor: "#eef2ff",
    paddingHorizontal: scaleDimension(8),
    paddingVertical: scaleDimension(4),
    borderRadius: scaleDimension(6),
  },
  statusBadgeText: {
    color: "#6366f1",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  sessionDetails: {
    gap: scaleDimension(10),
  },
  progressContainer: {
    marginBottom: scaleDimension(8),
  },
  progressBar: {
    height: scaleDimension(8),
    backgroundColor: "#e5e7eb",
    borderRadius: scaleDimension(4),
    overflow: "hidden",
    marginBottom: scaleDimension(6),
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#6366f1",
    borderRadius: scaleDimension(4),
  },
  progressText: {
    color: "#6b7280",
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
  },
  detailLabel: {
    color: "#6b7280",
    fontWeight: "500",
    minWidth: scaleDimension(100),
  },
  detailValue: {
    flex: 1,
    color: "#111827",
    fontWeight: "600",
  },
});
