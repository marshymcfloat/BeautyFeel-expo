import { BookingCard } from "@/components/bookings/BookingCard";
import BookingDetailsModal from "@/components/bookings/BookingDetailsModal";
import BookingFormModal from "@/components/bookings/BookingFormModal";
import ClaimGiftCertificateModal from "@/components/bookings/ClaimGiftCertificateModal";
import { DaySelector } from "@/components/bookings/DaySelector";
import type { BookingWithServices } from "@/components/bookings/types";
import { queryClient } from "@/components/Providers/TanstackProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { GradientHeader } from "@/components/ui/GradientHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { ResponsiveText } from "@/components/ui/ResponsiveText";
import { useToast } from "@/components/ui/toast";
import type { GiftCertificateWithRelations } from "@/lib/actions/giftCertificateActions";
import {
  claimServiceInstanceAction,
  serveServiceInstanceAction,
  unclaimServiceInstanceAction,
  unserveServiceInstanceAction,
} from "@/lib/actions/serviceInstanceActions";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRealtimeBookings } from "@/lib/hooks/useRealtimeBookings";
import { useResponsive } from "@/lib/hooks/useResponsive";
import { sortBookings } from "@/lib/utils/bookingSorting";
import { COLORS, GRADIENT_COLORS } from "@/lib/utils/constants";
import { formatDateString, formatFullDate } from "@/lib/utils/dateTime";
import {
  getContainerPadding,
  PLATFORM,
  scaleDimension,
} from "@/lib/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar, Gift, Plus, RefreshCw, Sparkles } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

export default function BookingsScreen() {
  const { user } = useAuth();
  const { isSmallPhone } = useResponsive();
  const toast = useToast();
  const today = formatDateString(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const containerPadding = getContainerPadding();
  const [claimingServiceId, setClaimingServiceId] = useState<number | null>(
    null
  );
  const [servingServiceId, setServingServiceId] = useState<number | null>(null);
  const [unclaimingServiceId, setUnclaimingServiceId] = useState<number | null>(
    null
  );
  const [unservingServiceId, setUnservingServiceId] = useState<number | null>(
    null
  );
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] =
    useState<BookingWithServices | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showClaimGiftCertificateModal, setShowClaimGiftCertificateModal] =
    useState(false);
  const [giftCertificateForBooking, setGiftCertificateForBooking] =
    useState<GiftCertificateWithRelations | null>(null);

  const { bookings, loading, error, refetch } =
    useRealtimeBookings(selectedDate);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const sortedBookings = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];
    return sortBookings(bookings as BookingWithServices[]);
  }, [bookings]);

  const handleClaimService = async (instanceId: number) => {
    if (!user?.id) return;
    setClaimingServiceId(instanceId);
    try {
      const result = await claimServiceInstanceAction(instanceId, user.id);
      if (!result.success) {
        toast.error("Error", result.error || "Failed to claim service");
      } else {
        toast.success("Service Claimed", "Service claimed successfully");
        // Invalidate bookings query to refresh ManageBookings
        queryClient.invalidateQueries({ queryKey: ["all-bookings"] });
      }
    } catch (error) {
      console.error("Error claiming service:", error);
      toast.error(
        "Error",
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setClaimingServiceId(null);
    }
  };

  const handleServeService = async (instanceId: number) => {
    if (!user?.id) return;
    setServingServiceId(instanceId);
    try {
      const result = await serveServiceInstanceAction(instanceId, user.id);
      if (!result.success) {
        toast.error("Error", result.error || "Failed to serve service");
      } else {
        toast.success(
          "Service Served",
          "Service marked as served successfully"
        );
        // Invalidate bookings query to refresh ManageBookings
        queryClient.invalidateQueries({ queryKey: ["all-bookings"] });
      }
    } catch (error) {
      console.error("Error serving service:", error);
      toast.error(
        "Error",
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setServingServiceId(null);
    }
  };

  const handleUnclaimService = async (instanceId: number) => {
    if (!user?.id) return;
    setUnclaimingServiceId(instanceId);
    try {
      const result = await unclaimServiceInstanceAction(instanceId, user.id);
      if (!result.success) {
        toast.error("Error", result.error || "Failed to unclaim service");
      } else {
        toast.success("Service Unclaimed", "Service unclaimed successfully");
        // Invalidate bookings query to refresh ManageBookings
        queryClient.invalidateQueries({ queryKey: ["all-bookings"] });
      }
    } catch (error) {
      console.error("Error unclaiming service:", error);
      toast.error(
        "Error",
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setUnclaimingServiceId(null);
    }
  };

  const handleUnserveService = async (instanceId: number) => {
    if (!user?.id) return;
    setUnservingServiceId(instanceId);
    try {
      const result = await unserveServiceInstanceAction(instanceId, user.id);
      if (!result.success) {
        toast.error("Error", result.error || "Failed to unserve service");
      } else {
        toast.success("Service Unserved", "Service unserved successfully");
        // Invalidate bookings query to refresh ManageBookings
        queryClient.invalidateQueries({ queryKey: ["all-bookings"] });
      }
    } catch (error) {
      console.error("Error unserving service:", error);
      toast.error(
        "Error",
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setUnservingServiceId(null);
    }
  };

  const displayDate = formatFullDate(selectedDate);

  const handleRefetch = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleGiftCertificateClaimed = (
    giftCertificate: GiftCertificateWithRelations
  ) => {
    // Booking is automatically created, just refresh the list
    setShowClaimGiftCertificateModal(false);
    // Refresh bookings to show the newly created booking
    refetch();
  };

  const AddButton = () => (
    <Pressable
      onPress={() => {
        setGiftCertificateForBooking(null);
        setShowBookingModal(true);
      }}
      style={({ pressed }) => [
        styles.addButton,
        pressed && styles.addButtonPressed,
      ]}
    >
      <LinearGradient
        colors={["rgba(255, 255, 255, 0.3)", "rgba(255, 255, 255, 0.2)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.addButtonGradient}
      >
        <Plus size={22} color="white" />
      </LinearGradient>
    </Pressable>
  );

  const ClaimGiftCertificateButton = () => (
    <Pressable
      onPress={() => setShowClaimGiftCertificateModal(true)}
      style={({ pressed }) => [
        styles.claimGiftButton,
        pressed && styles.claimGiftButtonPressed,
      ]}
    >
      <LinearGradient
        colors={["rgba(255, 255, 255, 0.3)", "rgba(255, 255, 255, 0.2)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.claimGiftButtonGradient}
      >
        <Gift size={20} color="white" />
      </LinearGradient>
    </Pressable>
  );


  return (
    <View style={styles.container}>
      <LinearGradient
        colors={GRADIENT_COLORS.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <GradientHeader
          title="Bookings"
          subtitle="Manage your appointments"
          icon={<Calendar size={28} color="white" />}
          rightElement={
            <View style={styles.headerButtons}>
              <Pressable
                onPress={handleRefetch}
                disabled={isRefreshing || loading}
                style={({ pressed }) => [
                  styles.refreshButton,
                  (pressed || isRefreshing || loading) && styles.refreshButtonPressed,
                ]}
              >
                <LinearGradient
                  colors={["rgba(255, 255, 255, 0.25)", "rgba(255, 255, 255, 0.15)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.refreshButtonGradient}
                >
                  {isRefreshing || loading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <RefreshCw size={18} color="white" />
                  )}
                </LinearGradient>
              </Pressable>
              <View style={styles.buttonSpacer} />
              <ClaimGiftCertificateButton />
              <View style={styles.buttonSpacer} />
              <AddButton />
            </View>
          }
        />

        <DaySelector
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />

        <View
          style={[styles.bookingsList, { paddingHorizontal: containerPadding }]}
        >
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} />
          ) : bookings.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={isSmallPhone ? 40 : 48} color="#d1d5db" />}
              title="No bookings yet"
              message={`No appointments scheduled for ${displayDate}`}
              actionLabel="Create Booking"
              actionIcon={<Plus size={18} color="white" />}
              onAction={() => setShowBookingModal(true)}
            />
          ) : (
            <>
              <View style={styles.bookingsHeader}>
                <ResponsiveText variant="xl" style={styles.bookingsCount}>
                  {bookings.length} appointment
                  {bookings.length !== 1 ? "s" : ""}
                </ResponsiveText>
                <ResponsiveText variant="sm" style={styles.bookingsDate}>
                  {displayDate}
                </ResponsiveText>
              </View>
              {sortedBookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  currentUserId={user?.id || null}
                  onClaimService={handleClaimService}
                  onServeService={handleServeService}
                  onViewDetails={(booking) => {
                    setSelectedBooking(booking);
                    setShowDetailsModal(true);
                  }}
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>

      <BookingFormModal
        visible={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setSelectedBooking(null);
          setGiftCertificateForBooking(null);
        }}
        defaultDate={selectedDate}
        existingBooking={selectedBooking}
        giftCertificate={giftCertificateForBooking}
        onSuccess={() => {
          setShowBookingModal(false);
          setSelectedBooking(null);
          setGiftCertificateForBooking(null);
        }}
      />
      <ClaimGiftCertificateModal
        visible={showClaimGiftCertificateModal}
        onClose={() => setShowClaimGiftCertificateModal(false)}
        onClaimSuccess={handleGiftCertificateClaimed}
      />

      <BookingDetailsModal
        visible={showDetailsModal}
        booking={selectedBooking}
        currentUserId={user?.id || null}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedBooking(null);
        }}
        onClaimService={handleClaimService}
        onServeService={handleServeService}
        onUnclaimService={handleUnclaimService}
        onUnserveService={handleUnserveService}
        claimingServiceId={claimingServiceId}
        servingServiceId={servingServiceId}
        unclaimingServiceId={unclaimingServiceId}
        unservingServiceId={unservingServiceId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    position: "relative",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scaleDimension(100),
  },
  addButton: {
    width: scaleDimension(52),
    height: scaleDimension(52),
    borderRadius: scaleDimension(26),
    overflow: "hidden",
    ...PLATFORM.shadowMd,
  },
  addButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  addButtonGradient: {
    width: scaleDimension(52),
    height: scaleDimension(52),
    borderRadius: scaleDimension(26),
    alignItems: "center",
    justifyContent: "center",
  },
  bookingsList: {
    gap: scaleDimension(8),
  },
  bookingsHeader: {
    marginBottom: scaleDimension(20),
    paddingHorizontal: scaleDimension(4),
  },
  bookingsCount: {
    color: COLORS.text,
    fontWeight: "800",
    marginBottom: scaleDimension(6),
    letterSpacing: -0.3,
    flexWrap: "wrap", // Added wrap
  },
  bookingsDate: {
    color: COLORS.primary,
    fontWeight: "600",
    flexWrap: "wrap", // Added wrap
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
  },
  buttonSpacer: {
    width: scaleDimension(8),
  },
  refreshButton: {
    width: scaleDimension(44),
    height: scaleDimension(44),
    borderRadius: scaleDimension(22),
    overflow: "hidden",
    ...PLATFORM.shadowMd,
  },
  refreshButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  refreshButtonGradient: {
    width: scaleDimension(44),
    height: scaleDimension(44),
    borderRadius: scaleDimension(22),
    alignItems: "center",
    justifyContent: "center",
  },
  claimGiftButton: {
    width: scaleDimension(44),
    height: scaleDimension(44),
    borderRadius: scaleDimension(22),
    overflow: "hidden",
    ...PLATFORM.shadowMd,
  },
  claimGiftButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  claimGiftButtonGradient: {
    width: scaleDimension(44),
    height: scaleDimension(44),
    borderRadius: scaleDimension(22),
    alignItems: "center",
    justifyContent: "center",
  },
});
