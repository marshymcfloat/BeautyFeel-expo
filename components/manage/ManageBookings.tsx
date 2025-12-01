import { BookingCard } from "@/components/bookings/BookingCard";
import BookingDetailsModal from "@/components/bookings/BookingDetailsModal";
import type { BookingWithServices } from "@/components/bookings/types";
import { queryClient } from "@/components/Providers/TanstackProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/toast";
import {
  deleteBookingAction,
  getAllBookings,
} from "@/lib/actions/bookingActions";
import { sortBookings } from "@/lib/utils/bookingSorting";
import { SERVICE_STATUS } from "@/lib/utils/constants";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Calendar, Eye, MoreVertical, Trash2 } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function ManageBookings() {
  const [selectedBooking, setSelectedBooking] =
    useState<BookingWithServices | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(
    null
  );
  const toast = useToast();

  // Fetch all bookings
  const {
    data: bookingsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["all-bookings"],
    queryFn: async () => {
      const result = await getAllBookings();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch bookings");
      }
      return result.data || [];
    },
  });

  const bookings = bookingsData || [];
  const sortedBookings = useMemo(() => {
    if (!bookings || bookings.length === 0) return [];
    // Cast to the expected type for BookingCard
    return sortBookings(bookings as unknown as BookingWithServices[]);
  }, [bookings]);

  const handleViewDetails = (booking: BookingWithServices) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
    setExpandedBookingId(null);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedBooking(null);
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteBookingAction,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["all-bookings"] });
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        toast.success("Booking Deleted", "Booking deleted successfully");
        setExpandedBookingId(null);
      } else {
        toast.error("Error", result.error || "Failed to delete booking");
      }
    },
    onError: (error: Error) => {
      toast.error("Error", error.message || "An unexpected error occurred");
    },
  });

  // Check if booking has any served services
  const hasServedServices = (booking: BookingWithServices) => {
    return (
      booking.service_bookings?.some(
        (sb) => sb.status === SERVICE_STATUS.SERVED
      ) || false
    );
  };

  const handleDeleteBooking = (booking: BookingWithServices) => {
    // Check if any services are served
    if (hasServedServices(booking)) {
      Alert.alert(
        "Cannot Delete Booking",
        "This booking cannot be deleted because one or more services have already been served.",
        [{ text: "OK" }]
      );
      setExpandedBookingId(null);
      return;
    }

    Alert.alert(
      "Delete Booking",
      `Are you sure you want to delete this booking for ${
        booking.customer?.name || "this customer"
      }? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate(booking.id);
          },
        },
      ]
    );
    setExpandedBookingId(null);
  };

  const toggleActions = (bookingId: number) => {
    setExpandedBookingId(expandedBookingId === bookingId ? null : bookingId);
  };

  // Dummy handlers for BookingCard (not used in manage view)
  const handleClaimService = async () => {};
  const handleServeService = async () => {};
  const handleUnclaimService = async () => {};
  const handleUnserveService = async () => {};

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LoadingState variant="list" count={5} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorState
          message={
            error instanceof Error ? error.message : "Failed to load bookings"
          }
          title="Error Loading Bookings"
        />
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Bookings</Text>
        <Text style={styles.headerSubtitle}>
          {bookings.length} total booking{bookings.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {bookings.length === 0 ? (
        <EmptyState
          icon={<Calendar size={48} color="#9ca3af" />}
          title="No bookings found"
          message="There are no bookings in the system yet."
        />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {sortedBookings.map((booking) => (
            <View key={booking.id} style={styles.bookingWrapper}>
              <BookingCard
                booking={booking}
                currentUserId={null}
                onClaimService={handleClaimService}
                onServeService={handleServeService}
                onViewDetails={(booking) => {
                  // Only open details if actions menu is not open
                  if (expandedBookingId !== booking.id) {
                    handleViewDetails(booking);
                  }
                }}
              />
              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => toggleActions(booking.id)}
                >
                  <MoreVertical size={20} color="#6b7280" />
                </Pressable>
                {expandedBookingId === booking.id && (
                  <View style={styles.actionsMenu}>
                    <Pressable
                      style={styles.actionMenuItem}
                      onPress={() => {
                        handleViewDetails(booking);
                        setExpandedBookingId(null);
                      }}
                    >
                      <Eye size={18} color="#3b82f6" />
                      <Text style={styles.actionMenuText}>View Details</Text>
                    </Pressable>
                    <View style={styles.actionMenuDivider} />
                    <Pressable
                      style={[
                        styles.actionMenuItem,
                        styles.actionMenuItemDanger,
                        (deleteMutation.isPending ||
                          hasServedServices(booking)) &&
                          styles.actionMenuItemDisabled,
                      ]}
                      onPress={() => handleDeleteBooking(booking)}
                      disabled={
                        deleteMutation.isPending || hasServedServices(booking)
                      }
                    >
                      {deleteMutation.isPending &&
                      deleteMutation.variables === booking.id ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                      ) : (
                        <Trash2
                          size={18}
                          color={
                            hasServedServices(booking) ? "#9ca3af" : "#ef4444"
                          }
                        />
                      )}
                      <Text
                        style={[
                          styles.actionMenuText,
                          styles.actionMenuTextDanger,
                          hasServedServices(booking) &&
                            styles.actionMenuTextDisabled,
                        ]}
                      >
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <BookingDetailsModal
        visible={showDetailsModal}
        booking={selectedBooking}
        currentUserId={null}
        onClose={handleCloseDetailsModal}
        onClaimService={handleClaimService}
        onServeService={handleServeService}
        onUnclaimService={handleUnclaimService}
        onUnserveService={handleUnserveService}
        claimingServiceId={null}
        servingServiceId={null}
        unclaimingServiceId={null}
        unservingServiceId={null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  bookingWrapper: {
    marginBottom: 16,
    position: "relative",
  },
  actionsContainer: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  actionsMenu: {
    position: "absolute",
    top: 44,
    right: 0,
    backgroundColor: "white",
    borderRadius: 12,
    minWidth: 180,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  actionMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  actionMenuItemDanger: {
    // Additional styling if needed
  },
  actionMenuItemDisabled: {
    opacity: 0.5,
  },
  actionMenuText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  actionMenuTextDanger: {
    color: "#ef4444",
  },
  actionMenuTextDisabled: {
    color: "#9ca3af",
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: 4,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#ec4899",
    borderRadius: 12,
    alignSelf: "center",
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
