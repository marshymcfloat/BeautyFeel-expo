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
  Clock,
  Loader2,
  MapPin,
  User,
} from "lucide-react-native";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { BookingCardProps } from "./types";

export function BookingCard({
  booking,
  currentUserId,
  onClaimService,
  onServeService,
  onViewDetails,
}: BookingCardProps) {
  const customerName = booking.customer?.name || "Unknown Customer";
  const location = booking.location || "No location";
  const appointmentDate = formatAppointmentDate(booking.appointment_date);
  const appointmentTime = booking.appointment_time
    ? formatTime(booking.appointment_time)
    : "No time";
  const duration = booking.duration_minutes
    ? formatDuration(booking.duration_minutes)
    : "Unknown";

  const hasUnservedServices = useMemo(() => {
    return (
      booking.service_bookings?.some(
        (sb) => sb.status !== SERVICE_STATUS.SERVED
      ) || false
    );
  }, [booking.service_bookings]);

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
    { bg: any; text: any; label: string; icon?: React.ReactNode }
  > = {
    [BOOKING_STATUS.PENDING]: {
      bg: styles.statusPendingBg,
      text: styles.statusPendingText,
      label: "Pending",
      icon: <Loader2 size={12} color="#d97706" />,
    },
    [BOOKING_STATUS.CONFIRMED]: {
      bg: styles.statusConfirmedBg,
      text: styles.statusConfirmedText,
      label: "Confirmed",
      icon: <Check size={12} color="#16a34a" />,
    },
    [BOOKING_STATUS.IN_PROGRESS]: {
      bg: styles.statusInProgressBg,
      text: styles.statusInProgressText,
      label: "In Progress",
      icon: <Clock size={12} color="#2563eb" />,
    },
    [BOOKING_STATUS.COMPLETED]: {
      bg: styles.statusCompletedBg,
      text: styles.statusCompletedText,
      label: "Completed",
      icon: <Check size={12} color="#4b5563" />,
    },
    [BOOKING_STATUS.CANCELLED]: {
      bg: styles.statusCancelledBg,
      text: styles.statusCancelledText,
      label: "Cancelled",
    },
    [BOOKING_STATUS.NO_SHOW]: {
      bg: styles.statusCancelledBg,
      text: styles.statusCancelledText,
      label: "No Show",
    },
    [BOOKING_STATUS.PAID]: {
      bg: styles.statusPaidBg,
      text: styles.statusPaidText,
      label: "Paid",
      icon: <Check size={12} color="#9333ea" />,
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
      <View
        style={[
          styles.bookingCardContent,
          isCompleted && styles.bookingCardContentCompleted,
        ]}
      >
        {/* Header Section */}
        <View style={styles.bookingCardHeader}>
          <View style={styles.bookingCardLeft}>
            <View
              style={[
                styles.bookingAvatar,
                isCompleted && styles.bookingAvatarCompleted,
              ]}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              >
                <View style={styles.bookingAvatarContent}>
                  <ResponsiveText
                    size={isCompleted ? scaleFont(16) : scaleFont(22)}
                    style={[
                      styles.bookingAvatarText,
                      isCompleted && styles.bookingAvatarTextCompleted,
                    ]}
                  >
                    {customerName.charAt(0).toUpperCase()}
                  </ResponsiveText>
                </View>
              </LinearGradient>
            </View>
            <View style={styles.bookingInfo}>
              <ResponsiveText
                variant={isCompleted ? "md" : "lg"}
                style={[
                  styles.customerName,
                  isCompleted && styles.customerNameCompleted,
                ]}
                numberOfLines={1}
              >
                {customerName}
              </ResponsiveText>
              <ResponsiveText
                variant={isCompleted ? "xs" : "sm"}
                style={[
                  styles.serviceList,
                  isCompleted && styles.serviceListCompleted,
                ]}
                numberOfLines={1}
              >
                {serviceList}
              </ResponsiveText>
            </View>
          </View>
          <View style={[styles.statusBadge, statusStyle.bg]}>
            {statusStyle.icon && (
              <View style={styles.statusIconContainer}>{statusStyle.icon}</View>
            )}
            <ResponsiveText
              variant="xs"
              style={[styles.statusText, statusStyle.text]}
            >
              {statusStyle.label}
            </ResponsiveText>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Details Section */}
        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetailRow}>
            <View style={styles.bookingDetailIcon}>
              <Calendar size={scaleDimension(18)} color={COLORS.primary} />
            </View>
            <View style={styles.bookingDetailContent}>
              <ResponsiveText variant="xs" style={styles.bookingDetailLabel}>
                Date
              </ResponsiveText>
              <ResponsiveText
                variant={isCompleted ? "sm" : "md"}
                style={[
                  styles.bookingDetailText,
                  isCompleted && styles.bookingDetailTextCompleted,
                ]}
                numberOfLines={1}
              >
                {appointmentDate}
              </ResponsiveText>
            </View>
          </View>
          <View style={styles.bookingDetailRow}>
            <View style={styles.bookingDetailIcon}>
              <Clock size={scaleDimension(18)} color={COLORS.primary} />
            </View>
            <View style={styles.bookingDetailContent}>
              <ResponsiveText variant="xs" style={styles.bookingDetailLabel}>
                Time & Duration
              </ResponsiveText>
              <ResponsiveText
                variant={isCompleted ? "sm" : "md"}
                style={[
                  styles.bookingDetailText,
                  isCompleted && styles.bookingDetailTextCompleted,
                ]}
                numberOfLines={1}
              >
                {appointmentTime} • {duration}
              </ResponsiveText>
            </View>
          </View>
          <View style={styles.bookingDetailRow}>
            <View style={styles.bookingDetailIcon}>
              <MapPin size={scaleDimension(18)} color={COLORS.primary} />
            </View>
            <View style={styles.bookingDetailContent}>
              <ResponsiveText variant="xs" style={styles.bookingDetailLabel}>
                Branch
              </ResponsiveText>
              <ResponsiveText
                variant={isCompleted ? "sm" : "md"}
                style={[
                  styles.bookingDetailText,
                  isCompleted && styles.bookingDetailTextCompleted,
                ]}
                numberOfLines={1}
              >
                {location}
              </ResponsiveText>
            </View>
          </View>
        </View>

        {!isCompleted &&
          booking.service_bookings &&
          booking.service_bookings.length > 0 && (
            <View style={styles.servicesSection}>
              <ResponsiveText
                variant="sm"
                style={styles.servicesTitle}
                numberOfLines={1}
              >
                Service Status
              </ResponsiveText>
              <ScrollView
                style={styles.servicesGridContainer}
                contentContainerStyle={styles.servicesGrid}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {Object.entries(servicesByType).map(
                  ([serviceName, instances]) => (
                    <View key={serviceName} style={styles.serviceGroup}>
                      <ResponsiveText
                        variant="sm"
                        style={styles.serviceGroupName}
                        numberOfLines={1}
                      >
                        {serviceName}
                      </ResponsiveText>
                      <ScrollView
                        horizontal
                        style={styles.serviceInstancesContainer}
                        contentContainerStyle={styles.serviceInstances}
                        showsHorizontalScrollIndicator={true}
                        nestedScrollEnabled={true}
                      >
                        {instances.map((instance: any) => {
                          const isUnclaimed =
                            instance.status === SERVICE_STATUS.UNCLAIMED;
                          const isClaimed =
                            instance.status === SERVICE_STATUS.CLAIMED;
                          const isServed =
                            instance.status === SERVICE_STATUS.SERVED;
                          const isMine = instance.claimed_by === currentUserId;

                          const getInstanceStyle = () => {
                            if (isServed) return styles.instanceBadgeServed;
                            if (isClaimed && isMine)
                              return styles.instanceBadgeYours;
                            if (isClaimed && !isMine)
                              return styles.instanceBadgeTaken;
                            return styles.instanceBadgeAvailable;
                          };

                          const getInstanceTextStyle = () => {
                            if (isServed) return styles.instanceTextServed;
                            if (isClaimed && isMine)
                              return styles.instanceTextYours;
                            if (isClaimed && !isMine)
                              return styles.instanceTextTaken;
                            return styles.instanceTextAvailable;
                          };

                          const getInstanceLabel = () => {
                            if (isServed) return "Done";
                            if (isClaimed && isMine) return "Yours";
                            if (isClaimed && !isMine) return "Taken";
                            return "Available";
                          };

                          return (
                            <Pressable
                              key={instance.id}
                              disabled={isServed || (isClaimed && !isMine)}
                              onPress={(e) => {
                                e.stopPropagation();
                                if (isUnclaimed) {
                                  onClaimService(instance.id);
                                } else if (isClaimed && isMine) {
                                  onServeService(instance.id);
                                }
                              }}
                              style={[
                                styles.instanceBadge,
                                getInstanceStyle(),
                                (isServed || (isClaimed && !isMine)) &&
                                  styles.instanceBadgeDisabled,
                              ]}
                            >
                              <View style={styles.instanceBadgeContent}>
                                {isServed ? (
                                  <Check size={12} color="#6B7280" />
                                ) : isClaimed && isMine ? (
                                  <User size={12} color="#3B82F6" />
                                ) : isClaimed && !isMine ? (
                                  <Loader2 size={12} color="#F97316" />
                                ) : null}
                                <ResponsiveText
                                  variant="xs"
                                  style={[
                                    styles.instanceBadgeText,
                                    getInstanceTextStyle(),
                                  ]}
                                  numberOfLines={1}
                                >
                                  {getInstanceLabel()}
                                </ResponsiveText>
                              </View>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )
                )}
              </ScrollView>
            </View>
          )}

        {/* Price Footer */}
        <View style={styles.priceFooter}>
          <ResponsiveText
            variant="sm"
            style={styles.priceLabel}
            numberOfLines={1}
          >
            Total
          </ResponsiveText>
          <ResponsiveText
            variant="xl"
            style={styles.priceValue}
            numberOfLines={1}
          >
            ₱{totalPrice.toFixed(2)}
          </ResponsiveText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bookingCard: {
    marginBottom: scaleDimension(12),
    ...PLATFORM.shadow,
  },
  bookingCardCompleted: {
    marginBottom: scaleDimension(12),
    ...PLATFORM.shadow,
  },
  bookingCardPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.98 }],
  },
  bookingCardContent: {
    backgroundColor: "white",
    borderRadius: scaleDimension(24),
    padding: scaleDimension(20),
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...PLATFORM.shadowMd,
  },
  bookingCardContentCompleted: {
    padding: scaleDimension(12),
    borderRadius: scaleDimension(14),
    borderColor: COLORS.border,
    opacity: 0.75,
  },
  bookingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: scaleDimension(12),
  },
  bookingCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: scaleDimension(12),
    minWidth: 0,
  },
  bookingAvatar: {
    width: scaleDimension(60),
    height: scaleDimension(60),
    borderRadius: scaleDimension(999),
    overflow: "hidden",
    ...PLATFORM.shadowMd,
  },
  bookingAvatarCompleted: {
    width: scaleDimension(44),
    height: scaleDimension(44),
  },
  bookingAvatarContent: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  bookingAvatarText: {
    color: "white",
    fontWeight: "bold",
    fontSize: scaleFont(18),
  },
  bookingAvatarTextCompleted: {
    fontSize: scaleFont(14),
  },
  bookingInfo: {
    marginLeft: scaleDimension(14),
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    color: COLORS.text,
    fontWeight: "700",
    marginBottom: scaleDimension(4),
    letterSpacing: -0.3,
  },
  customerNameCompleted: {
    marginBottom: scaleDimension(2),
  },
  serviceList: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  serviceListCompleted: {},
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(6),
    borderRadius: scaleDimension(999),
    gap: scaleDimension(6),
  },
  statusIconContainer: {
    width: scaleDimension(16),
    height: scaleDimension(16),
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusPendingBg: {
    backgroundColor: "#fef3c7",
  },
  statusPendingText: {
    color: "#d97706",
  },
  statusConfirmedBg: {
    backgroundColor: "#dcfce7",
  },
  statusConfirmedText: {
    color: "#16a34a",
  },
  statusInProgressBg: {
    backgroundColor: "#dbeafe",
  },
  statusInProgressText: {
    color: "#2563eb",
  },
  statusCompletedBg: {
    backgroundColor: "#f3f4f6",
  },
  statusCompletedText: {
    color: "#4b5563",
  },
  statusCancelledBg: {
    backgroundColor: "#fee2e2",
  },
  statusCancelledText: {
    color: "#dc2626",
  },
  statusPaidBg: {
    backgroundColor: "#f3e8ff",
  },
  statusPaidText: {
    color: "#9333ea",
  },
  cardDivider: {
    height: scaleDimension(1),
    backgroundColor: COLORS.borderLight,
    marginBottom: scaleDimension(12),
  },
  bookingDetails: {
    marginBottom: scaleDimension(12),
  },
  bookingDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scaleDimension(10),
  },
  bookingDetailIcon: {
    width: scaleDimension(36),
    height: scaleDimension(36),
    borderRadius: scaleDimension(10),
    backgroundColor: COLORS.backgroundLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: scaleDimension(12),
  },
  bookingDetailContent: {
    flex: 1,
    minWidth: 0,
  },
  bookingDetailLabel: {
    color: COLORS.textSecondary,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: scaleDimension(2),
  },
  bookingDetailText: {
    color: COLORS.text,
    fontWeight: "600",
  },
  bookingDetailTextCompleted: {},
  servicesSection: {
    marginBottom: scaleDimension(16),
    paddingTop: scaleDimension(16),
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  servicesTitle: {
    color: "#374151",
    fontWeight: "700",
    marginBottom: scaleDimension(12),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  servicesGridContainer: {
    maxHeight: scaleDimension(200),
  },
  servicesGrid: {
    gap: scaleDimension(12),
    paddingBottom: scaleDimension(8),
  },
  serviceGroup: {
    marginBottom: scaleDimension(8),
  },
  serviceGroupName: {
    color: "#4b5563",
    fontWeight: "600",
    marginBottom: scaleDimension(8),
  },
  serviceInstancesContainer: {
    marginVertical: scaleDimension(4),
  },
  serviceInstances: {
    flexDirection: "row",
    gap: scaleDimension(8),
    paddingRight: scaleDimension(8),
  },
  instanceBadge: {
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(8),
    borderRadius: scaleDimension(10),
    ...PLATFORM.shadow,
  },
  instanceBadgeDisabled: {
    opacity: 0.6,
  },
  instanceBadgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(6),
  },
  instanceBadgeText: {
    fontWeight: "600",
  },
  instanceBadgeAvailable: {
    backgroundColor: "#dcfce7",
  },
  instanceBadgeYours: {
    backgroundColor: "#dbeafe",
  },
  instanceBadgeTaken: {
    backgroundColor: "#fed7aa",
  },
  instanceBadgeServed: {
    backgroundColor: "#e5e7eb",
  },
  instanceTextAvailable: {
    color: "#166534",
  },
  instanceTextYours: {
    color: "#1e40af",
  },
  instanceTextTaken: {
    color: "#9a3412",
  },
  instanceTextServed: {
    color: "#4b5563",
  },
  priceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: scaleDimension(16),
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  priceLabel: {
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  priceValue: {
    color: COLORS.text,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
});
