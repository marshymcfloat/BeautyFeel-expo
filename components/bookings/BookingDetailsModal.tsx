import { ResponsiveText } from "@/components/ui/ResponsiveText";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useRealtimeBooking } from "@/lib/hooks/useRealtimeBookings";
import { useResponsive } from "@/lib/hooks/useResponsive";
import { BOOKING_STATUS } from "@/lib/utils/constants";
import { formatCurrency } from "@/lib/utils/currency";
import {
  formatAppointmentDate,
  formatDuration,
  formatTime,
} from "@/lib/utils/dateTime";
import {
  percentageHeight,
  scaleDimension,
  scaleFont,
} from "@/lib/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import {
  Calendar,
  Check,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  User,
  X,
} from "lucide-react-native";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import type { BookingWithServices } from "./types";

interface BookingDetailsModalProps {
  visible: boolean;
  booking: BookingWithServices | null;
  currentUserId: string | null;
  onClose: () => void;
  onClaimService: (instanceId: number) => Promise<void>;
  onServeService: (instanceId: number) => Promise<void>;
  onUnclaimService: (instanceId: number) => Promise<void>;
  onUnserveService: (instanceId: number) => Promise<void>;
  claimingServiceId: number | null;
  servingServiceId: number | null;
  unclaimingServiceId: number | null;
  unservingServiceId: number | null;
}

export default function BookingDetailsModal({
  visible,
  booking,
  currentUserId,
  onClose,
  onClaimService,
  onServeService,
  onUnclaimService,
  onUnserveService,
  claimingServiceId,
  servingServiceId,
  unclaimingServiceId,
  unservingServiceId,
}: BookingDetailsModalProps) {
  const { booking: realtimeBooking, loading: realtimeLoading } =
    useRealtimeBooking(visible && booking?.id ? booking.id : null);

  const displayBooking = realtimeBooking || booking;

  const calculatedTotal = useMemo(() => {
    if (!displayBooking) return 0;
    if (displayBooking.final_total != null && displayBooking.final_total > 0) {
      return displayBooking.final_total;
    }
    const total = (displayBooking.service_bookings || []).reduce((sum, sb) => {
      return sum + (Number(sb.price_at_booking) || 0);
    }, 0);
    return total;
  }, [displayBooking]);

  const sortedServiceBookings = useMemo(() => {
    if (!displayBooking) return [];
    return [...(displayBooking.service_bookings || [])].sort((a, b) => {
      if (a.sequence_order !== null && b.sequence_order !== null) {
        return a.sequence_order - b.sequence_order;
      }
      return a.id - b.id;
    });
  }, [displayBooking?.service_bookings]);

  const { isTablet } = useResponsive();
  const iconSize = scaleDimension(18);
  const closeIconSize = scaleDimension(20);

  if (!displayBooking || !visible) return null;

  const customerName = displayBooking.customer?.name || "Unknown Customer";
  const customerEmail = displayBooking.customer?.email || "No email";
  const customerPhone = displayBooking.customer?.phone || "No phone";
  const location = displayBooking.location || "No location";
  const appointmentDate = displayBooking.appointment_date
    ? formatAppointmentDate(displayBooking.appointment_date)
    : "No date";
  const appointmentTime = displayBooking.appointment_time
    ? formatTime(displayBooking.appointment_time)
    : "No time";
  const duration = displayBooking.duration_minutes
    ? formatDuration(displayBooking.duration_minutes)
    : "Unknown";

  const status = displayBooking.status || BOOKING_STATUS.PENDING;

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
            <ResponsiveText
              variant="2xl"
              style={styles.headerTitle}
              numberOfLines={1}
            >
              Booking Details
            </ResponsiveText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={closeIconSize} color="#374151" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            bounces={false}
          >
            <View style={styles.customerSection}>
              <View style={styles.customerHeader}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={["#ec4899", "#d946ef"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  >
                    <View style={styles.avatarContent}>
                      <ResponsiveText
                        size={scaleFont(24)}
                        style={styles.avatarText}
                      >
                        {customerName.charAt(0).toUpperCase()}
                      </ResponsiveText>
                    </View>
                  </LinearGradient>
                </View>
                <View style={styles.customerInfo}>
                  <ResponsiveText
                    variant="xl"
                    style={styles.customerName}
                    numberOfLines={1}
                  >
                    {customerName}
                  </ResponsiveText>
                  <ResponsiveText
                    variant="sm"
                    style={styles.customerEmail}
                    numberOfLines={1}
                  >
                    {customerEmail}
                  </ResponsiveText>
                </View>
                <StatusBadge status={status} size="medium" />
              </View>

              <View style={styles.customerDetails}>
                <View style={styles.detailRow}>
                  <User size={iconSize} color="#6B7280" />
                  <ResponsiveText
                    variant="base"
                    style={styles.detailText}
                    numberOfLines={1}
                  >
                    {customerPhone}
                  </ResponsiveText>
                </View>
              </View>
            </View>

            <View style={styles.appointmentSection}>
              <ResponsiveText
                variant="md"
                style={styles.sectionTitle}
                numberOfLines={1}
              >
                Appointment Details
              </ResponsiveText>
              <View style={styles.appointmentDetails}>
                <View style={styles.detailRow}>
                  <Calendar size={iconSize} color="#6B7280" />
                  <ResponsiveText
                    variant="base"
                    style={styles.detailText}
                    numberOfLines={1}
                  >
                    {appointmentDate}
                  </ResponsiveText>
                </View>
                <View style={styles.detailRow}>
                  <Clock size={iconSize} color="#6B7280" />
                  <ResponsiveText
                    variant="base"
                    style={styles.detailText}
                    numberOfLines={1}
                  >
                    {appointmentTime} • {duration}
                  </ResponsiveText>
                </View>
                <View style={styles.detailRow}>
                  <MapPin size={iconSize} color="#6B7280" />
                  <ResponsiveText
                    variant="base"
                    style={styles.detailText}
                    numberOfLines={1}
                  >
                    {location}
                  </ResponsiveText>
                </View>
              </View>
            </View>

            <View style={styles.servicesSection}>
              <ResponsiveText
                variant="md"
                style={styles.sectionTitle}
                numberOfLines={1}
              >
                Service Instances ({sortedServiceBookings.length})
              </ResponsiveText>
              <View>
                {sortedServiceBookings.map((instance, index) => {
                  const serviceName =
                    instance.service?.title || "Unknown Service";
                  const servicePrice = instance.price_at_booking || 0;
                  const isUnclaimed = instance.status === "UNCLAIMED";
                  const isClaimed = instance.status === "CLAIMED";
                  const isServed = instance.status === "SERVED";
                  const isMine = instance.claimed_by === currentUserId;
                  const isServedByMe =
                    instance.served_by === currentUserId ||
                    (isServed && isMine);
                  const isProcessing =
                    claimingServiceId === instance.id ||
                    servingServiceId === instance.id ||
                    unclaimingServiceId === instance.id ||
                    unservingServiceId === instance.id;

                  const getStatusBadgeStyle = () => {
                    if (isServed) return styles.instanceStatusServed;
                    if (isClaimed && isMine) return styles.instanceStatusYours;
                    if (isClaimed && !isMine) return styles.instanceStatusTaken;
                    return styles.instanceStatusAvailable;
                  };

                  return (
                    <View key={instance.id} style={styles.instanceCard}>
                      <View style={styles.instanceHeader}>
                        <View style={styles.instanceHeaderLeft}>
                          <View style={styles.instanceTitleRow}>
                            <ResponsiveText
                              variant="md"
                              style={styles.instanceTitle}
                              numberOfLines={2}
                            >
                              {serviceName}
                            </ResponsiveText>
                            <ResponsiveText
                              variant="sm"
                              style={styles.instanceId}
                              numberOfLines={1}
                            >
                              #{instance.id}
                            </ResponsiveText>
                          </View>
                          <ResponsiveText
                            variant="xs"
                            style={styles.instancePosition}
                            numberOfLines={1}
                          >
                            Instance{" "}
                            {(() => {
                              // Count only instances from THIS booking with the same service_id
                              const instancesOfSameService =
                                sortedServiceBookings.filter(
                                  (sb) => sb.service_id === instance.service_id
                                );
                              const position = instancesOfSameService.findIndex(
                                (sb) => sb.id === instance.id
                              );
                              return position >= 0 ? position + 1 : 1;
                            })()}{" "}
                            of{" "}
                            {
                              sortedServiceBookings.filter(
                                (sb) => sb.service_id === instance.service_id
                              ).length
                            }
                          </ResponsiveText>
                          <View style={styles.instancePriceRow}>
                            <ResponsiveText
                              variant="base"
                              style={styles.instancePrice}
                              numberOfLines={1}
                            >
                              {formatCurrency(servicePrice)}
                            </ResponsiveText>
                          </View>
                        </View>

                        {/* Status Badge */}
                        <View
                          style={[
                            styles.instanceStatusBadge,
                            getStatusBadgeStyle(),
                          ]}
                        >
                          <View style={styles.instanceStatusContent}>
                            {isServed ? (
                              <>
                                <Check
                                  size={scaleDimension(14)}
                                  color="#6B7280"
                                />
                                <ResponsiveText
                                  variant="xs"
                                  style={styles.instanceStatusTextServed}
                                  numberOfLines={1}
                                >
                                  Done
                                </ResponsiveText>
                              </>
                            ) : isClaimed && isMine ? (
                              <>
                                <User
                                  size={scaleDimension(14)}
                                  color="#3B82F6"
                                />
                                <ResponsiveText
                                  variant="xs"
                                  style={styles.instanceStatusTextYours}
                                  numberOfLines={1}
                                >
                                  Yours
                                </ResponsiveText>
                              </>
                            ) : isClaimed && !isMine ? (
                              <>
                                <Loader2
                                  size={scaleDimension(14)}
                                  color="#F97316"
                                />
                                <ResponsiveText
                                  variant="xs"
                                  style={styles.instanceStatusTextTaken}
                                  numberOfLines={1}
                                >
                                  Taken
                                </ResponsiveText>
                              </>
                            ) : (
                              <ResponsiveText
                                variant="xs"
                                style={styles.instanceStatusTextAvailable}
                                numberOfLines={1}
                              >
                                Available
                              </ResponsiveText>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Claimed By Info */}
                      {isClaimed && instance.claimed_by && (
                        <View style={styles.claimedInfo}>
                          <ResponsiveText
                            variant="xs"
                            style={styles.claimedInfoLabel}
                            numberOfLines={1}
                          >
                            Claimed by:
                          </ResponsiveText>
                          <ResponsiveText
                            variant="sm"
                            style={styles.claimedInfoText}
                            numberOfLines={1}
                          >
                            {isMine
                              ? "You"
                              : `Staff ID: ${instance.claimed_by}`}
                          </ResponsiveText>
                          {instance.claimed_at && (
                            <ResponsiveText
                              variant="xs"
                              style={styles.claimedInfoTime}
                              numberOfLines={1}
                            >
                              {new Date(instance.claimed_at).toLocaleString()}
                            </ResponsiveText>
                          )}
                        </View>
                      )}

                      {/* Action Buttons */}
                      <View style={styles.actionButtons}>
                        {isServed ? (
                          // Served - Show Unserve button if served by me
                          isServedByMe && (
                            <Pressable
                              disabled={isProcessing}
                              onPress={() => onUnserveService(instance.id)}
                              style={[
                                styles.actionButton,
                                styles.actionButtonUnserve,
                                isProcessing && styles.actionButtonDisabled,
                              ]}
                            >
                              {isProcessing ? (
                                <>
                                  <ActivityIndicator
                                    size="small"
                                    color="white"
                                    style={styles.buttonSpinner}
                                  />
                                  <ResponsiveText
                                    variant="sm"
                                    style={styles.actionButtonText}
                                    numberOfLines={1}
                                  >
                                    Processing...
                                  </ResponsiveText>
                                </>
                              ) : (
                                <ResponsiveText
                                  variant="sm"
                                  style={styles.actionButtonText}
                                  numberOfLines={1}
                                >
                                  Unserve
                                </ResponsiveText>
                              )}
                            </Pressable>
                          )
                        ) : isUnclaimed ? (
                          // Unclaimed - Show Claim button
                          <Pressable
                            disabled={isProcessing}
                            onPress={() => onClaimService(instance.id)}
                            style={[
                              styles.actionButton,
                              styles.actionButtonClaim,
                              isProcessing && styles.actionButtonDisabled,
                            ]}
                          >
                            {isProcessing ? (
                              <>
                                <ActivityIndicator
                                  size="small"
                                  color="white"
                                  style={styles.buttonSpinner}
                                />
                                <ResponsiveText
                                  variant="sm"
                                  style={styles.actionButtonText}
                                  numberOfLines={1}
                                >
                                  Processing...
                                </ResponsiveText>
                              </>
                            ) : (
                              <ResponsiveText
                                variant="sm"
                                style={styles.actionButtonText}
                                numberOfLines={1}
                              >
                                Claim Service
                              </ResponsiveText>
                            )}
                          </Pressable>
                        ) : isClaimed && isMine ? (
                          // Claimed by me - Show Serve and Unclaim buttons
                          <>
                            <Pressable
                              disabled={isProcessing}
                              onPress={() => onServeService(instance.id)}
                              style={[
                                styles.actionButton,
                                styles.actionButtonServe,
                                isProcessing && styles.actionButtonDisabled,
                              ]}
                            >
                              {isProcessing &&
                              servingServiceId === instance.id ? (
                                <>
                                  <ActivityIndicator
                                    size="small"
                                    color="white"
                                    style={styles.buttonSpinner}
                                  />
                                  <ResponsiveText
                                    variant="sm"
                                    style={styles.actionButtonText}
                                    numberOfLines={1}
                                  >
                                    Processing...
                                  </ResponsiveText>
                                </>
                              ) : (
                                <ResponsiveText
                                  variant="sm"
                                  style={styles.actionButtonText}
                                  numberOfLines={1}
                                >
                                  Mark as Served
                                </ResponsiveText>
                              )}
                            </Pressable>
                            <Pressable
                              disabled={isProcessing}
                              onPress={() => onUnclaimService(instance.id)}
                              style={[
                                styles.actionButton,
                                styles.actionButtonUnclaim,
                                isProcessing && styles.actionButtonDisabled,
                              ]}
                            >
                              {isProcessing &&
                              unclaimingServiceId === instance.id ? (
                                <>
                                  <ActivityIndicator
                                    size="small"
                                    color="white"
                                    style={styles.buttonSpinner}
                                  />
                                  <ResponsiveText
                                    variant="sm"
                                    style={styles.actionButtonText}
                                    numberOfLines={1}
                                  >
                                    Processing...
                                  </ResponsiveText>
                                </>
                              ) : (
                                <ResponsiveText
                                  variant="sm"
                                  style={styles.actionButtonText}
                                  numberOfLines={1}
                                >
                                  Unclaim
                                </ResponsiveText>
                              )}
                            </Pressable>
                          </>
                        ) : (
                          // Claimed by someone else
                          <View style={styles.actionButtonClaimed}>
                            <ResponsiveText
                              variant="sm"
                              style={styles.actionButtonClaimedText}
                              numberOfLines={1}
                            >
                              Already Claimed
                            </ResponsiveText>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Additional Info */}
            {displayBooking.notes && (
              <View style={styles.notesSection}>
                <ResponsiveText
                  variant="md"
                  style={styles.sectionTitle}
                  numberOfLines={1}
                >
                  Notes
                </ResponsiveText>
                <View style={styles.notesContent}>
                  <View style={styles.notesRow}>
                    <MessageSquare size={iconSize} color="#6B7280" />
                    <ResponsiveText
                      variant="base"
                      style={styles.notesText}
                      numberOfLines={4}
                    >
                      {displayBooking.notes}
                    </ResponsiveText>
                  </View>
                </View>
              </View>
            )}

            {/* Booking Totals */}
            {displayBooking && (
              <View style={styles.totalsSection}>
                <View style={styles.totalsCard}>
                  <View style={styles.totalsRow}>
                    <ResponsiveText
                      variant="base"
                      style={styles.totalsLabel}
                      numberOfLines={1}
                    >
                      Subtotal:
                    </ResponsiveText>
                    <ResponsiveText
                      variant="base"
                      style={styles.totalsValue}
                      numberOfLines={1}
                    >
                      {formatCurrency(calculatedTotal)}
                    </ResponsiveText>
                  </View>
                  {displayBooking.voucher_id && (
                    <View style={styles.totalsRow}>
                      <ResponsiveText
                        variant="base"
                        style={styles.totalsLabel}
                        numberOfLines={1}
                      >
                        Voucher Applied:
                      </ResponsiveText>
                      <ResponsiveText
                        variant="base"
                        style={styles.totalsValueVoucher}
                        numberOfLines={1}
                      >
                        Yes
                      </ResponsiveText>
                    </View>
                  )}
                  <View style={styles.totalsDivider}>
                    <View style={styles.totalsRow}>
                      <ResponsiveText
                        variant="md"
                        style={styles.totalsTotalLabel}
                        numberOfLines={1}
                      >
                        Total:
                      </ResponsiveText>
                      <ResponsiveText
                        variant="xl"
                        style={styles.totalsTotalValue}
                        numberOfLines={1}
                      >
                        {formatCurrency(calculatedTotal)}
                      </ResponsiveText>
                    </View>
                  </View>
                </View>
              </View>
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
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: scaleDimension(24),
    borderTopRightRadius: scaleDimension(24),
    maxHeight: percentageHeight(90),
    height: percentageHeight(90),
    width: "100%",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scaleDimension(24),
    paddingTop: scaleDimension(24),
    paddingBottom: scaleDimension(16),
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontWeight: "bold",
    color: "#111827",
  },
  closeButton: {
    width: scaleDimension(40),
    height: scaleDimension(40),
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scaleDimension(40),
  },
  customerSection: {
    paddingHorizontal: scaleDimension(24),
    paddingTop: scaleDimension(24),
  },
  customerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scaleDimension(16),
  },
  avatarContainer: {
    width: scaleDimension(64),
    height: scaleDimension(64),
    borderRadius: 999,
    overflow: "hidden",
  },
  avatarContent: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "white",
    fontWeight: "bold",
  },
  customerInfo: {
    marginLeft: scaleDimension(16),
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    color: "#111827",
    fontWeight: "bold",
  },
  customerEmail: {
    color: "#6b7280",
  },
  statusBadge: {
    paddingHorizontal: scaleDimension(16),
    paddingVertical: scaleDimension(8),
    borderRadius: 999,
  },
  statusBadgeText: {
    fontWeight: "500",
  },
  statusPendingBg: {
    backgroundColor: "#fef3c7",
  },
  statusPendingText: {
    color: "#d97706",
  },
  statusConfirmedBg: {
    backgroundColor: "#f0fdf4",
  },
  statusConfirmedText: {
    color: "#16a34a",
  },
  statusInProgressBg: {
    backgroundColor: "#eff6ff",
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
    backgroundColor: "#fef2f2",
  },
  statusCancelledText: {
    color: "#dc2626",
  },
  statusPaidBg: {
    backgroundColor: "#faf5ff",
  },
  statusPaidText: {
    color: "#9333ea",
  },
  customerDetails: {
    backgroundColor: "#f9fafb",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(16),
    marginBottom: scaleDimension(24),
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scaleDimension(12),
  },
  detailText: {
    color: "#4b5563",
    marginLeft: scaleDimension(12),
  },
  detailTextFlex: {
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  appointmentSection: {
    paddingHorizontal: scaleDimension(24),
    marginBottom: scaleDimension(24),
  },
  sectionTitle: {
    color: "#374151",
    fontWeight: "600",
    marginBottom: scaleDimension(12),
  },
  appointmentDetails: {
    backgroundColor: "#f9fafb",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(16),
  },
  servicesSection: {
    paddingHorizontal: scaleDimension(24),
    marginBottom: scaleDimension(24),
  },
  instanceCard: {
    backgroundColor: "#f9fafb",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(16),
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: scaleDimension(12),
  },
  instanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: scaleDimension(12),
  },
  instanceHeaderLeft: {
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  instanceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scaleDimension(4),
  },
  instanceTitle: {
    color: "#111827",
    fontWeight: "bold",
  },
  instanceId: {
    color: "#9ca3af",
    marginLeft: scaleDimension(8),
  },
  instancePosition: {
    color: "#6b7280",
  },
  instancePriceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: scaleDimension(4),
  },
  instancePrice: {
    color: "#4b5563",
  },
  instanceStatusBadge: {
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(6),
    borderRadius: 999,
  },
  instanceStatusContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(4),
  },
  instanceStatusAvailable: {
    backgroundColor: "#dcfce7",
  },
  instanceStatusYours: {
    backgroundColor: "#dbeafe",
  },
  instanceStatusTaken: {
    backgroundColor: "#fed7aa",
  },
  instanceStatusServed: {
    backgroundColor: "#e5e7eb",
  },
  instanceStatusTextAvailable: {
    color: "#166534",
    fontWeight: "500",
  },
  instanceStatusTextYours: {
    color: "#1e40af",
    fontWeight: "500",
  },
  instanceStatusTextTaken: {
    color: "#9a3412",
    fontWeight: "500",
  },
  instanceStatusTextServed: {
    color: "#374151",
    fontWeight: "500",
  },
  claimedInfo: {
    backgroundColor: "white",
    borderRadius: scaleDimension(8),
    padding: scaleDimension(8),
    marginBottom: scaleDimension(12),
  },
  claimedInfoLabel: {
    color: "#6b7280",
    marginBottom: scaleDimension(4),
  },
  claimedInfoText: {
    color: "#374151",
    fontWeight: "500",
  },
  claimedInfoTime: {
    color: "#9ca3af",
    marginTop: scaleDimension(4),
  },
  actionButtons: {
    flexDirection: "row",
    gap: scaleDimension(8),
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scaleDimension(12),
    borderRadius: scaleDimension(12),
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonClaim: {
    backgroundColor: "#22c55e",
  },
  actionButtonServe: {
    backgroundColor: "#3b82f6",
  },
  actionButtonUnclaim: {
    backgroundColor: "#6b7280",
  },
  actionButtonUnserve: {
    backgroundColor: "#f97316",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "600",
  },
  buttonSpinner: {
    marginRight: scaleDimension(8),
  },
  actionButtonClaimed: {
    flex: 1,
    paddingVertical: scaleDimension(12),
    borderRadius: scaleDimension(12),
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonClaimedText: {
    color: "#4b5563",
    fontWeight: "600",
  },
  notesSection: {
    paddingHorizontal: scaleDimension(24),
    marginBottom: scaleDimension(24),
  },
  notesContent: {
    backgroundColor: "#f9fafb",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(16),
  },
  notesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  notesText: {
    color: "#4b5563",
    marginLeft: scaleDimension(12),
    flex: 1,
    minWidth: 0, // Prevents text overflow
  },
  totalsSection: {
    paddingHorizontal: scaleDimension(24),
    marginBottom: scaleDimension(24),
  },
  totalsCard: {
    backgroundColor: "#fdf2f8",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(16),
    borderWidth: 1,
    borderColor: "#fce7f3",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleDimension(8),
  },
  totalsLabel: {
    color: "#4b5563",
  },
  totalsValue: {
    color: "#111827",
    fontWeight: "600",
  },
  totalsValueVoucher: {
    color: "#16a34a",
    fontWeight: "600",
  },
  totalsDivider: {
    borderTopWidth: 1,
    borderTopColor: "#fbcfe8",
    marginTop: scaleDimension(8),
    paddingTop: scaleDimension(8),
  },
  totalsTotalLabel: {
    color: "#111827",
    fontWeight: "bold",
  },
  totalsTotalValue: {
    color: "#111827",
    fontWeight: "bold",
  },
});
