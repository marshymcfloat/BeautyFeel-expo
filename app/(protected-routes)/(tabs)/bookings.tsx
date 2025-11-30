import { BookingCard } from "@/components/bookings/BookingCard";
import BookingDetailsModal from "@/components/bookings/BookingDetailsModal";
import BookingFormModal from "@/components/bookings/BookingFormModal";
import { DaySelector } from "@/components/bookings/DaySelector";
import type { BookingWithServices } from "@/components/bookings/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { GradientHeader } from "@/components/ui/GradientHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { ResponsiveText } from "@/components/ui/ResponsiveText";
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
import { Calendar, Plus, Sparkles } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

export default function BookingsScreen() {
  const { user } = useAuth();
  const { isSmallPhone } = useResponsive();
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

  const { bookings, loading, error } = useRealtimeBookings(selectedDate);

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
        console.error("Failed to claim service:", result.error);
      }
    } catch (error) {
      console.error("Error claiming service:", error);
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
        console.error("Failed to serve service:", result.error);
      }
    } catch (error) {
      console.error("Error serving service:", error);
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
        console.error("Failed to unclaim service:", result.error);
      }
    } catch (error) {
      console.error("Error unclaiming service:", error);
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
        console.error("Failed to unserve service:", result.error);
      }
    } catch (error) {
      console.error("Error unserving service:", error);
    } finally {
      setUnservingServiceId(null);
    }
  };

  const displayDate = formatFullDate(selectedDate);

  const AddButton = () => (
    <Pressable
      onPress={() => setShowBookingModal(true)}
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
          rightElement={<AddButton />}
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
                <ResponsiveText
                  variant="xl"
                  style={styles.bookingsCount}
                  numberOfLines={1}
                >
                  {bookings.length} appointment
                  {bookings.length !== 1 ? "s" : ""}
                </ResponsiveText>
                <ResponsiveText
                  variant="sm"
                  style={styles.bookingsDate}
                  numberOfLines={1}
                >
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
        onClose={() => setShowBookingModal(false)}
        defaultDate={selectedDate}
        onSuccess={() => {
          setShowBookingModal(false);
        }}
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
  },
  bookingsDate: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
