import { ResponsiveText } from "@/components/ui/ResponsiveText";
import { BOOKING_STATUS, COLORS, SERVICE_STATUS } from "@/lib/utils/constants";
import {
  formatAppointmentDate,
  formatDuration,
  formatTime,
} from "@/lib/utils/dateTime";
import { PLATFORM, scaleDimension, scaleFont } from "@/lib/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  User,
} from "lucide-react-native";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { BookingCardProps } from "./types";

// Add this to your types definition if not present, or ignore if strict types aren't needed
interface ExtendedBookingCardProps extends BookingCardProps {
  renderHeaderRight?: () => React.ReactNode;
}

export function BookingCard({
  booking,
  currentUserId,
  onClaimService,
  onServeService,
  onViewDetails,
  renderHeaderRight,
}: ExtendedBookingCardProps) {
  const customerName = booking.customer?.name || "Unknown Customer";
  const location = booking.location || "No location";
  const appointmentDate = formatAppointmentDate(booking.appointment_date);
  const appointmentTime = booking.appointment_time
    ? formatTime(booking.appointment_time)
    : "No time";
  const duration = booking.duration_minutes
    ? formatDuration(booking.duration_minutes)
    : "Unknown";

  const isCompleted = useMemo(() => {
    const allServed = booking.service_bookings?.every(
      (sb) => sb.status === SERVICE_STATUS.SERVED
    );
    const statusCompleted = [
      BOOKING_STATUS.COMPLETED,
      BOOKING_STATUS.PAID,
      BOOKING_STATUS.CANCELLED,
      BOOKING_STATUS.NO_SHOW,
    ].includes(booking.status as any);
    return allServed || statusCompleted;
  }, [booking.service_bookings, booking.status]);

  const statusStyleMap: Record<
    string,
    {
      bg: string;
      text: string;
      border: string;
      label: string;
      icon?: React.ReactNode;
    }
  > = {
    [BOOKING_STATUS.PENDING]: {
      bg: "#fffbeb",
      text: "#b45309",
      border: "#fcd34d",
      label: "Pending",
      icon: <Loader2 size={12} color="#b45309" />,
    },
    [BOOKING_STATUS.CONFIRMED]: {
      bg: "#f0fdf4",
      text: "#15803d",
      border: "#86efac",
      label: "Confirmed",
      icon: <CheckCircle2 size={12} color="#15803d" />,
    },
    [BOOKING_STATUS.IN_PROGRESS]: {
      bg: "#eff6ff",
      text: "#1d4ed8",
      border: "#93c5fd",
      label: "In Progress",
      icon: <Clock size={12} color="#1d4ed8" />,
    },
    [BOOKING_STATUS.COMPLETED]: {
      bg: "#f3f4f6",
      text: "#374151",
      border: "#d1d5db",
      label: "Completed",
      icon: <Check size={12} color="#374151" />,
    },
    [BOOKING_STATUS.CANCELLED]: {
      bg: "#fef2f2",
      text: "#b91c1c",
      border: "#fca5a5",
      label: "Cancelled",
    },
    [BOOKING_STATUS.NO_SHOW]: {
      bg: "#fff1f2",
      text: "#be123c",
      border: "#fda4af",
      label: "No Show",
    },
    [BOOKING_STATUS.PAID]: {
      bg: "#faf5ff",
      text: "#7e22ce",
      border: "#d8b4fe",
      label: "Paid",
      icon: <Check size={12} color="#7e22ce" />,
    },
  };

  const status = booking.status || BOOKING_STATUS.PENDING;
  const statusStyle =
    statusStyleMap[status] || statusStyleMap[BOOKING_STATUS.PENDING];

  const servicesByType = useMemo(() => {
    const groups: Record<string, Array<any>> = {};
    booking.service_bookings?.forEach((sb) => {
      const serviceName = sb.service?.title || "Unknown Service";
      if (!groups[serviceName]) {
        groups[serviceName] = [];
      }
      groups[serviceName].push(sb);
    });
    return groups;
  }, [booking.service_bookings]);

  const serviceList = Object.keys(servicesByType).join(", ") || "No services";
  const totalPrice = (booking as any).final_total || booking.grandTotal || 0;

  return (
    <Pressable
      onPress={() => onViewDetails(booking)}
      style={({ pressed }) => [
        styles.bookingCard,
        isCompleted && styles.bookingCardCompleted,
        pressed && styles.bookingCardPressed,
      ]}
    >
      <View style={styles.cardContainer}>
        {/* Left Accent Bar */}
        <View
          style={[
            styles.accentBar,
            { backgroundColor: isCompleted ? "#d1d5db" : statusStyle.text },
          ]}
        />

        <View style={styles.mainContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[styles.avatar, isCompleted && styles.avatarCompleted]}
              >
                <LinearGradient
                  colors={
                    isCompleted
                      ? ["#e5e7eb", "#d1d5db"]
                      : [COLORS.primary, "#be185d"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                >
                  <View style={styles.avatarContent}>
                    <ResponsiveText
                      size={scaleFont(18)}
                      style={[
                        styles.avatarText,
                        isCompleted && styles.avatarTextCompleted,
                      ]}
                    >
                      {customerName.charAt(0).toUpperCase()}
                    </ResponsiveText>
                  </View>
                </LinearGradient>
              </View>
              <View style={styles.headerText}>
                <ResponsiveText
                  variant="lg"
                  style={[
                    styles.customerName,
                    isCompleted && styles.textCompleted,
                  ]}
                >
                  {customerName}
                </ResponsiveText>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: statusStyle.bg,
                      borderColor: statusStyle.border,
                    },
                  ]}
                >
                  {statusStyle.icon}
                  <ResponsiveText
                    variant="xs"
                    style={[styles.statusText, { color: statusStyle.text }]}
                  >
                    {statusStyle.label}
                  </ResponsiveText>
                </View>
              </View>
            </View>

            {/* Optional Right Action (for Manage Bookings) */}
            {renderHeaderRight && (
              <View style={styles.headerRight}>{renderHeaderRight()}</View>
            )}
          </View>

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Calendar size={14} color="#6b7280" />
              <ResponsiveText variant="xs" style={styles.infoText}>
                {appointmentDate}
              </ResponsiveText>
            </View>
            <View style={styles.infoItem}>
              <Clock size={14} color="#6b7280" />
              <ResponsiveText variant="xs" style={styles.infoText}>
                {appointmentTime} ({duration})
              </ResponsiveText>
            </View>
            <View style={styles.infoItem}>
              <MapPin size={14} color="#6b7280" />
              <ResponsiveText variant="xs" style={styles.infoText}>
                {location}
              </ResponsiveText>
            </View>
          </View>

          {/* Services Section */}
          {!isCompleted &&
            booking.service_bookings &&
            booking.service_bookings.length > 0 && (
              <View style={styles.servicesSection}>
                <View style={styles.dashedLine} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.servicesScroll}
                >
                  {Object.entries(servicesByType).map(
                    ([serviceName, instances]) => (
                      <View key={serviceName} style={styles.serviceGroup}>
                        <ResponsiveText variant="xs" style={styles.serviceName}>
                          {serviceName}
                        </ResponsiveText>
                        <View style={styles.instancesRow}>
                          {instances.map((instance: any) => {
                            const isUnclaimed =
                              instance.status === SERVICE_STATUS.UNCLAIMED;
                            const isClaimed =
                              instance.status === SERVICE_STATUS.CLAIMED;
                            const isServed =
                              instance.status === SERVICE_STATUS.SERVED;
                            const isMine =
                              instance.claimed_by === currentUserId;

                            let bg = "#f3f4f6";
                            let text = "#374151";
                            let border = "#e5e7eb";

                            if (isServed) {
                              bg = "#f0fdf4";
                              text = "#166534";
                              border = "#bbf7d0";
                            } else if (isClaimed && isMine) {
                              bg = "#eff6ff";
                              text = "#1e40af";
                              border = "#bfdbfe";
                            } else if (isClaimed && !isMine) {
                              bg = "#fff7ed";
                              text = "#9a3412";
                              border = "#fed7aa";
                            } else if (isUnclaimed) {
                              bg = "#ffffff";
                              text = "#4b5563";
                              border = "#d1d5db";
                            }

                            return (
                              <Pressable
                                key={instance.id}
                                disabled={
                                  isServed ||
                                  (isClaimed && !isMine) ||
                                  !currentUserId
                                }
                                onPress={(e) => {
                                  e.stopPropagation();
                                  if (isUnclaimed) onClaimService(instance.id);
                                  else if (isClaimed && isMine)
                                    onServeService(instance.id);
                                }}
                                style={[
                                  styles.instanceChip,
                                  {
                                    backgroundColor: bg,
                                    borderColor: border,
                                  },
                                ]}
                              >
                                {isServed && <Check size={10} color={text} />}
                                {isClaimed && isMine && !isServed && (
                                  <User size={10} color={text} />
                                )}
                                <ResponsiveText
                                  variant="xs"
                                  style={[styles.instanceText, { color: text }]}
                                >
                                  {isServed
                                    ? "Done"
                                    : isClaimed && isMine
                                    ? "Serve"
                                    : isClaimed
                                    ? "Taken"
                                    : "Claim"}
                                </ResponsiveText>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )
                  )}
                </ScrollView>
              </View>
            )}
        </View>

        {/* Price Footer */}
        <View style={styles.priceTag}>
          <ResponsiveText variant="sm" style={styles.priceLabel}>
            Total
          </ResponsiveText>
          <ResponsiveText variant="lg" style={styles.priceValue}>
            ₱{totalPrice.toLocaleString()}
          </ResponsiveText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bookingCard: {
    marginBottom: scaleDimension(16),
    borderRadius: scaleDimension(16),
    backgroundColor: "white",
    ...PLATFORM.shadow,
  },
  bookingCardCompleted: {
    opacity: 0.85,
  },
  bookingCardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  cardContainer: {
    borderRadius: scaleDimension(16),
    overflow: "hidden",
    backgroundColor: "white",
    flexDirection: "row",
  },
  accentBar: {
    width: scaleDimension(6),
    height: "100%",
  },
  mainContent: {
    flex: 1,
    padding: scaleDimension(16),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: scaleDimension(12),
  },
  headerLeft: {
    flexDirection: "row",
    gap: scaleDimension(12),
    flex: 1,
  },
  headerRight: {
    marginLeft: scaleDimension(8),
  },
  avatar: {
    width: scaleDimension(48),
    height: scaleDimension(48),
    borderRadius: scaleDimension(24),
    overflow: "hidden",
  },
  avatarCompleted: {
    opacity: 0.8,
  },
  avatarContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "white",
    fontWeight: "800",
  },
  avatarTextCompleted: {
    color: "#4b5563",
  },
  headerText: {
    flex: 1,
    justifyContent: "center",
  },
  customerName: {
    fontWeight: "700",
    color: "#111827",
    marginBottom: scaleDimension(4),
    flexWrap: "wrap",
  },
  textCompleted: {
    color: "#4b5563",
    textDecorationLine: "line-through",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: scaleDimension(8),
    paddingVertical: scaleDimension(4),
    borderRadius: scaleDimension(6),
    borderWidth: 1,
    gap: scaleDimension(4),
  },
  statusText: {
    fontWeight: "600",
    fontSize: scaleFont(10),
    textTransform: "uppercase",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleDimension(12),
    marginTop: scaleDimension(4),
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(6),
    backgroundColor: "#f9fafb",
    paddingHorizontal: scaleDimension(8),
    paddingVertical: scaleDimension(4),
    borderRadius: scaleDimension(6),
  },
  infoText: {
    color: "#4b5563",
    fontWeight: "500",
  },
  servicesSection: {
    marginTop: scaleDimension(12),
  },
  dashedLine: {
    height: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    marginBottom: scaleDimension(12),
  },
  servicesScroll: {
    gap: scaleDimension(16),
    paddingRight: scaleDimension(16),
  },
  serviceGroup: {
    alignItems: "flex-start",
  },
  serviceName: {
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: scaleDimension(6),
    textTransform: "uppercase",
    fontSize: scaleFont(10),
  },
  instancesRow: {
    flexDirection: "row",
    gap: scaleDimension(6),
  },
  instanceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(4),
    paddingHorizontal: scaleDimension(8),
    paddingVertical: scaleDimension(4),
    borderRadius: scaleDimension(12),
    borderWidth: 1,
  },
  instanceText: {
    fontWeight: "600",
    fontSize: scaleFont(10),
  },
  priceTag: {
    position: "absolute",
    bottom: scaleDimension(16),
    right: scaleDimension(16),
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: scaleFont(10),
    color: "#9ca3af",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  priceValue: {
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
});
