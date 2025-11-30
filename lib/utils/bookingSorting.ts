import { BOOKING_STATUS } from "./constants";
import type { BookingWithServices } from "@/components/bookings/types";

/**
 * Check if booking has unserved services
 */
export function hasUnservedServices(booking: BookingWithServices): boolean {
  return (
    booking.service_bookings?.some((sb) => sb.status !== "SERVED") || false
  );
}

/**
 * Check if booking is completed
 */
export function isCompleted(booking: BookingWithServices): boolean {
  const allServed = booking.service_bookings?.every(
    (sb) => sb.status === "SERVED"
  );
  const statusCompleted = [
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.PAID,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.NO_SHOW,
  ].includes(booking.status as any);
  return allServed || statusCompleted;
}

/**
 * Get status priority for sorting
 */
export function getStatusPriority(status: string): number {
  switch (status) {
    case BOOKING_STATUS.IN_PROGRESS:
      return 1;
    case BOOKING_STATUS.CONFIRMED:
      return 2;
    case BOOKING_STATUS.PENDING:
      return 3;
    case BOOKING_STATUS.COMPLETED:
      return 5;
    case BOOKING_STATUS.PAID:
      return 6;
    case BOOKING_STATUS.CANCELLED:
      return 7;
    case BOOKING_STATUS.NO_SHOW:
      return 8;
    default:
      return 4;
  }
}

/**
 * Sort bookings by priority
 */
export function sortBookings(bookings: BookingWithServices[]): BookingWithServices[] {
  if (!bookings || bookings.length === 0) return [];

  return [...bookings].sort((a, b) => {
    const aHasUnserved = hasUnservedServices(a);
    const bHasUnserved = hasUnservedServices(b);
    const aCompleted = isCompleted(a);
    const bCompleted = isCompleted(b);

    // Priority 1: Bookings with unserved services come first
    if (aHasUnserved && !bHasUnserved) return -1;
    if (!aHasUnserved && bHasUnserved) return 1;

    // Priority 2: If both have unserved services, prioritize by:
    //   2a. Most recent bookings first
    //   2b. Then by status priority
    if (aHasUnserved && bHasUnserved) {
      const aRecentDate = a.appointment_date
        ? new Date(a.appointment_date).getTime()
        : new Date(a.created_at || 0).getTime();
      const bRecentDate = b.appointment_date
        ? new Date(b.appointment_date).getTime()
        : new Date(b.created_at || 0).getTime();

      if (aRecentDate !== bRecentDate) {
        return bRecentDate - aRecentDate;
      }

      const aStatusPriority = getStatusPriority(a.status || BOOKING_STATUS.PENDING);
      const bStatusPriority = getStatusPriority(b.status || BOOKING_STATUS.PENDING);
      if (aStatusPriority !== bStatusPriority) {
        return aStatusPriority - bStatusPriority;
      }

      const aTime = a.appointment_time || "";
      const bTime = b.appointment_time || "";
      return aTime.localeCompare(bTime);
    }

    // Priority 3: Completed bookings go to the bottom
    if (aCompleted && !bCompleted) return 1;
    if (!aCompleted && bCompleted) return -1;

    // Priority 4: Sort by status
    const aStatusPriority = getStatusPriority(a.status || BOOKING_STATUS.PENDING);
    const bStatusPriority = getStatusPriority(b.status || BOOKING_STATUS.PENDING);
    if (aStatusPriority !== bStatusPriority) {
      return aStatusPriority - bStatusPriority;
    }

    // Priority 5: Most recent first for non-unserved bookings
    const aCreated = new Date(a.created_at || 0).getTime();
    const bCreated = new Date(b.created_at || 0).getTime();
    if (aCreated !== bCreated) {
      return bCreated - aCreated;
    }

    // Priority 6: Finally, sort by appointment time
    const aTime = a.appointment_time || "";
    const bTime = b.appointment_time || "";
    return aTime.localeCompare(bTime);
  });
}

