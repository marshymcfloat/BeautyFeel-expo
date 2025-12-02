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
import { getContainerPadding, scaleDimension } from "@/lib/utils/responsive";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Eye,
  Filter,
  MoreVertical,
  Search,
  Trash2,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  const containerPadding = getContainerPadding();

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
    return sortBookings(bookings as unknown as BookingWithServices[]);
  }, [bookings]);

  const handleViewDetails = (booking: BookingWithServices) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
    setExpandedBookingId(null);
  };

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

  const handleDeleteBooking = (booking: BookingWithServices) => {
    const hasServed = booking.service_bookings?.some(
      (sb) => sb.status === SERVICE_STATUS.SERVED
    );

    if (hasServed) {
      Alert.alert(
        "Cannot Delete",
        "This booking has served services and cannot be deleted.",
        [{ text: "OK" }]
      );
      setExpandedBookingId(null);
      return;
    }

    Alert.alert("Delete Booking", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(booking.id),
      },
    ]);
    setExpandedBookingId(null);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <LoadingState variant="list" count={5} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <ErrorState message="Failed to load bookings" />
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search & Filter Header (Visual Only for now) */}
      <View style={[styles.header, { paddingHorizontal: containerPadding }]}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9ca3af" />
          <TextInput
            placeholder="Search bookings..."
            style={styles.searchInput}
            placeholderTextColor="#9ca3af"
          />
        </View>
        <Pressable style={styles.filterButton}>
          <Filter size={20} color="#6b7280" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: containerPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>All Bookings</Text>
          <Text style={styles.listCount}>
            {bookings.length} result{bookings.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {bookings.length === 0 ? (
          <EmptyState
            icon={<Calendar size={48} color="#9ca3af" />}
            title="No bookings found"
            message="There are no bookings in the system yet."
          />
        ) : (
          sortedBookings.map((booking) => (
            <View
              key={booking.id}
              style={styles.bookingWrapper}
              className="my-2"
            >
              <BookingCard
                booking={booking}
                currentUserId={null}
                onClaimService={async (_instanceId: number) => {}}
                onServeService={async (_instanceId: number) => {}}
                onViewDetails={handleViewDetails}
                // Inject the Menu Button into the Card Header
                renderHeaderRight={() => (
                  <View style={styles.menuContainer}>
                    <Pressable
                      style={styles.menuButton}
                      hitSlop={10}
                      onPress={(e) => {
                        e.stopPropagation();
                        setExpandedBookingId(
                          expandedBookingId === booking.id ? null : booking.id
                        );
                      }}
                    >
                      <MoreVertical size={20} color="#9ca3af" />
                    </Pressable>

                    {expandedBookingId === booking.id && (
                      <View style={styles.popupMenu}>
                        <Pressable
                          style={styles.popupMenuItem}
                          onPress={() => handleViewDetails(booking)}
                        >
                          <Eye size={16} color="#3b82f6" />
                          <Text style={styles.popupMenuText}>View</Text>
                        </Pressable>
                        <View style={styles.menuDivider} />
                        <Pressable
                          style={styles.popupMenuItem}
                          onPress={() => handleDeleteBooking(booking)}
                        >
                          {deleteMutation.isPending &&
                          deleteMutation.variables === booking.id ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                          ) : (
                            <Trash2 size={16} color="#ef4444" />
                          )}
                          <Text
                            style={[
                              styles.popupMenuText,
                              styles.popupMenuTextDanger,
                            ]}
                          >
                            Delete
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
              />
            </View>
          ))
        )}
      </ScrollView>

      <BookingDetailsModal
        visible={showDetailsModal}
        booking={selectedBooking}
        currentUserId={null}
        onClose={() => setShowDetailsModal(false)}
        onClaimService={async (_instanceId: number) => {}}
        onServeService={async (_instanceId: number) => {}}
        onUnclaimService={async (_instanceId: number) => {}}
        onUnserveService={async (_instanceId: number) => {}}
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
    paddingTop: scaleDimension(16),
  },
  header: {
    flexDirection: "row",
    gap: scaleDimension(12),
    marginBottom: scaleDimension(16),
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: scaleDimension(12),
    paddingHorizontal: scaleDimension(12),
    height: scaleDimension(44),
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchInput: {
    flex: 1,
    marginLeft: scaleDimension(8),
    fontSize: scaleDimension(14),
    color: "#111827",
  },
  filterButton: {
    width: scaleDimension(44),
    height: scaleDimension(44),
    backgroundColor: "white",
    borderRadius: scaleDimension(12),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scaleDimension(100),
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: scaleDimension(12),
  },
  listTitle: {
    fontSize: scaleDimension(18),
    fontWeight: "800",
    color: "#111827",
  },
  listCount: {
    fontSize: scaleDimension(12),
    color: "#6b7280",
    fontWeight: "500",
  },
  bookingWrapper: {
    zIndex: 1, // Needed for dropdown to show on top if overlaps
  },
  menuContainer: {
    position: "relative",
    zIndex: 999,
  },
  menuButton: {
    padding: scaleDimension(4),
  },
  popupMenu: {
    position: "absolute",
    top: scaleDimension(24),
    right: 0,
    backgroundColor: "white",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(4),
    minWidth: scaleDimension(120),
    borderWidth: 1,
    borderColor: "#e5e7eb",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  popupMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
    paddingVertical: scaleDimension(10),
    paddingHorizontal: scaleDimension(12),
    borderRadius: scaleDimension(8),
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginVertical: scaleDimension(2),
  },
  popupMenuText: {
    fontSize: scaleDimension(14),
    fontWeight: "500",
    color: "#374151",
  },
  popupMenuTextDanger: {
    color: "#ef4444",
  },
  retryButton: {
    marginTop: scaleDimension(16),
    paddingHorizontal: scaleDimension(24),
    paddingVertical: scaleDimension(12),
    backgroundColor: "#ec4899",
    borderRadius: scaleDimension(12),
    alignSelf: "center",
  },
  retryButtonText: {
    color: "white",
    fontSize: scaleDimension(16),
    fontWeight: "600",
  },
});
