import type {
  BookingWithServices,
  ServiceBooking,
} from "@/components/bookings/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import type { Database } from "../../database.types";
import { supabase } from "../utils/supabase";

type Service = Database["public"]["Tables"]["service"]["Row"];

type RealtimeChange<T> = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T | null;
  old: T | null;
};

/**
 * Subscribe to real-time booking changes for a specific date
 */
export function useRealtimeBookings(date: string) {
  const [bookings, setBookings] = useState<BookingWithServices[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBookings() {
      try {
        const { data, error: fetchError } = await supabase
          .from("booking")
          .select(
            `
            *,
            customer:customer_id (*),
            service_bookings:service_bookings!service_bookings_booking_transaction_id_fkey (
              *,
              service:service_id (*)
            )
          `,
          )
          .eq("appointment_date", date)
          .order("appointment_time", { ascending: true });

        if (fetchError) throw fetchError;

        setBookings((data || []) as BookingWithServices[]);
        setError(null);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch bookings",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();

    // Subscribe to booking changes
    const bookingChannel = supabase
      .channel(`bookings:${date}`)
      .on<Database["public"]["Tables"]["booking"]["Row"]>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking",
          filter: `appointment_date=eq.${date}`,
        },
        (
          payload: RealtimePostgresChangesPayload<
            Database["public"]["Tables"]["booking"]["Row"]
          >,
        ) => {
          handleBookingChange(payload);
        },
      )
      // Also listen for service_bookings changes for bookings on this date
      .on<Database["public"]["Tables"]["service_bookings"]["Row"]>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_bookings",
        },
        async (payload) => {
          // Refetch booking to get updated service instances
          const bookingId =
            (payload.new && "booking_transaction_id" in payload.new
              ? payload.new.booking_transaction_id
              : null) ||
            (payload.old && "booking_transaction_id" in payload.old
              ? payload.old.booking_transaction_id
              : null);
          if (bookingId) {
            const booking = await fetchBookingDetails(bookingId);
            if (booking && booking.appointment_date === date) {
              setBookings((prev) => {
                const index = prev.findIndex((b) => b.id === booking.id);
                if (index >= 0) {
                  const updated = [...prev];
                  updated[index] = booking;
                  return updated;
                } else if (payload.eventType === "INSERT") {
                  // New service added to existing booking
                  return [...prev, booking].sort((a, b) => {
                    const timeA = a.appointment_time || "";
                    const timeB = b.appointment_time || "";
                    return timeA.localeCompare(timeB);
                  });
                }
                return prev;
              });
            }
          }
        },
      )
      .subscribe();

    function handleBookingChange(
      payload: RealtimePostgresChangesPayload<
        Database["public"]["Tables"]["booking"]["Row"]
      >,
    ) {
      if (payload.eventType === "INSERT" && payload.new) {
        // Fetch full booking details with relations
        fetchBookingDetails(payload.new.id).then((booking) => {
          if (booking) {
            setBookings((prev) => {
              // Check if already exists (avoid duplicates)
              if (prev.some((b) => b.id === booking.id)) {
                return prev;
              }
              return [...prev, booking].sort((a, b) => {
                const timeA = a.appointment_time || "";
                const timeB = b.appointment_time || "";
                return timeA.localeCompare(timeB);
              });
            });
          }
        });
      } else if (payload.eventType === "UPDATE" && payload.new) {
        // Refetch full booking to get updated relations (like service_bookings)
        fetchBookingDetails(payload.new.id).then((booking) => {
          if (booking) {
            setBookings((prev) =>
              prev.map((b) => (b.id === booking.id ? booking : b))
            );
          }
        });
      } else if (payload.eventType === "DELETE" && payload.old) {
        setBookings((prev) =>
          prev.filter((booking) => booking.id !== payload.old!.id)
        );
      }
    }

    async function fetchBookingDetails(
      bookingId: number,
    ): Promise<BookingWithServices | null> {
      try {
        const { data, error } = await supabase
          .from("booking")
          .select(
            `
            *,
            customer:customer_id (*),
            service_bookings:service_bookings!service_bookings_booking_transaction_id_fkey (
              *,
              service:service_id (*)
            )
          `,
          )
          .eq("id", bookingId)
          .single();

        if (error || !data) return null;

        return data as BookingWithServices;
      } catch (err) {
        console.error("Error fetching booking details:", err);
        return null;
      }
    }

    return () => {
      bookingChannel.unsubscribe();
    };
  }, [date]);

  return { bookings, loading, error, refetch: () => setLoading(true) };
}

/**
 * Subscribe to real-time changes for a specific booking
 */
export function useRealtimeBooking(bookingId: number | null) {
  const [booking, setBooking] = useState<BookingWithServices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      setLoading(false);
      return;
    }

    // Initial fetch
    async function fetchBooking() {
      try {
        const { data, error: fetchError } = await supabase
          .from("booking")
          .select(
            `
            *,
            customer:customer_id (*),
            service_bookings:service_bookings!service_bookings_booking_transaction_id_fkey (
              *,
              service:service_id (*)
            )
          `,
          )
          .eq("id", bookingId!)
          .single();

        if (fetchError) throw fetchError;

        setBooking(data as BookingWithServices);
        setError(null);
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch booking",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();

    // Subscribe to booking changes
    const bookingChannel = supabase
      .channel(`booking:${bookingId}`)
      .on<Database["public"]["Tables"]["booking"]["Row"]>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking",
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE" && payload.new) {
            // Refetch to get full booking with relations
            fetchBooking().catch((err) => {
              console.error("Error refetching booking:", err);
            });
          } else if (payload.eventType === "DELETE") {
            setBooking(null);
          }
        },
      )
      .subscribe();

    // Subscribe to service_bookings changes for this booking
    const serviceBookingsChannel = supabase
      .channel(`service-bookings:${bookingId}`)
      .on<Database["public"]["Tables"]["service_bookings"]["Row"]>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_bookings",
          filter: `booking_transaction_id=eq.${bookingId}`,
        },
        async (payload) => {
          // Refetch full booking to get updated service instances
          await fetchBooking();
        },
      )
      .subscribe();

    return () => {
      bookingChannel.unsubscribe();
      serviceBookingsChannel.unsubscribe();
    };
  }, [bookingId]);

  return { booking, loading, error };
}

/**
 * Subscribe to real-time service instance changes
 */
export function useRealtimeServiceInstances(bookingId: number | null) {
  const [instances, setInstances] = useState<
    Array<ServiceBooking & { service: Service | null }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) {
      setInstances([]);
      setLoading(false);
      return;
    }

    // Initial fetch
    async function fetchInstances() {
      try {
        const { data, error } = await supabase
          .from("service_bookings")
          .select(
            `
            *,
            service:service_id (*)
          `,
          )
          .eq("booking_transaction_id", bookingId!)
          .order("sequence_order", { ascending: true });

        if (error) throw error;

        setInstances(
          (data || []) as Array<
            ServiceBooking & { service: Service | null }
          >,
        );
      } catch (err) {
        console.error("Error fetching service instances:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchInstances();

    // Subscribe to service_bookings changes
    const channel = supabase
      .channel(`service-instances:${bookingId}`)
      .on<Database["public"]["Tables"]["service_bookings"]["Row"]>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "service_bookings",
          filter: `booking_transaction_id=eq.${bookingId}`,
        },
        (payload) => {
          if (
            payload.eventType === "INSERT" && payload.new &&
            "service_id" in payload.new
          ) {
            // Fetch service details for new instance
            const serviceId = payload.new.service_id;
            if (serviceId) {
              supabase
                .from("service")
                .select("*")
                .eq("id", serviceId)
                .single()
                .then(({ data: service }) => {
                  setInstances((prev) => [
                    ...prev,
                    {
                      ...(payload.new as ServiceBooking),
                      service: service || null,
                    } as ServiceBooking & {
                      service: Service | null;
                    },
                  ]);
                });
            }
          } else if (
            payload.eventType === "UPDATE" && payload.new && "id" in payload.new
          ) {
            setInstances((prev) =>
              prev.map((inst) =>
                inst.id === (payload.new as ServiceBooking).id
                  ? { ...inst, ...(payload.new as ServiceBooking) } as
                    & ServiceBooking
                    & {
                      service: Service | null;
                    }
                  : inst
              )
            );
          } else if (
            payload.eventType === "DELETE" && payload.old && "id" in payload.old
          ) {
            setInstances((prev) =>
              prev.filter((inst) =>
                inst.id !== (payload.old as ServiceBooking).id
              )
            );
          }
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [bookingId]);

  return { instances, loading };
}
