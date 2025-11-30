import { supabase } from "../utils/supabase";
import {
  sendBookingConfirmation,
  sendBookingReminder,
  type BookingEmailData,
} from "../services/emailService";
import type { Database } from "../../database.types";

type Booking = Database["public"]["Tables"]["booking"]["Row"];
type Customer = Database["public"]["Tables"]["customer"]["Row"];
type Service = Database["public"]["Tables"]["service"]["Row"];
type ServiceBooking = Database["public"]["Tables"]["service_bookings"]["Row"];

interface BookingWithDetails extends Booking {
  customer: Customer | null;
  service_bookings: Array<
    ServiceBooking & {
      service: Service | null;
    }
  >;
}

/**
 * Check if booking is more than 1 hour away
 */
function isBookingMoreThanOneHourAway(
  appointmentDate: string,
  appointmentTime: string
): boolean {
  const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
  const now = new Date();
  const diffMs = appointmentDateTime.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours >= 1;
}

/**
 * Calculate minutes until appointment
 */
function getMinutesUntilAppointment(
  appointmentDate: string,
  appointmentTime: string
): number {
  const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
  const now = new Date();
  const diffMs = appointmentDateTime.getTime() - now.getTime();
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Send confirmation email when booking is created (if more than 1 hour away)
 */
export async function sendBookingConfirmationIfNeeded(
  bookingId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch booking with customer and services
    const { data: booking, error: bookingError } = await supabase
      .from("booking")
      .select(
        `
        *,
        customer:customer_id (*),
        service_bookings:service_bookings!service_bookings_booking_transaction_id_fkey (
          *,
          service:service_id (*)
        )
      `
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return { success: false, error: "Booking not found" };
    }

    const bookingData = booking as BookingWithDetails;

    // Check if booking is more than 1 hour away
    if (
      !isBookingMoreThanOneHourAway(
        bookingData.appointment_date,
        bookingData.appointment_time || ""
      )
    ) {
      // Booking is less than 1 hour away, skip confirmation email
      return { success: true };
    }

    // Check if customer has email
    if (!bookingData.customer?.email) {
      return { success: true }; // No email, skip silently
    }

    // Prepare email data
    const services = bookingData.service_bookings
      .map((sb) => ({
        name: sb.service?.name || "Unknown Service",
        quantity: sb.quantity || 1,
      }))
      .filter((s) => s.name !== "Unknown Service");

    const emailData: BookingEmailData = {
      customerName: bookingData.customer.name || "Valued Customer",
      customerEmail: bookingData.customer.email,
      bookingId: bookingData.id,
      appointmentDate: bookingData.appointment_date,
      appointmentTime: bookingData.appointment_time || "",
      services,
      location: bookingData.location || "Unknown Location",
      totalAmount: (bookingData.grandTotal || 0) - (bookingData.grandDiscount || 0),
      notes: bookingData.notes,
    };

    // Send confirmation email
    const result = await sendBookingConfirmation(emailData);
    return result;
  } catch (error) {
    console.error("Error sending booking confirmation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check and send reminder emails for upcoming bookings
 * This should be called by a cron job every few minutes
 */
export async function checkAndSendReminders(): Promise<{
  success: boolean;
  sent: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let sent = 0;

  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    // Get all upcoming bookings with customers that have emails
    // We'll check for bookings that are approximately at our reminder times
    const { data: bookings, error: bookingsError } = await supabase
      .from("booking")
      .select(
        `
        *,
        customer:customer_id (*),
        service_bookings:service_bookings!service_bookings_booking_transaction_id_fkey (
          *,
          service:service_id (*)
        ),
        email_reminders:email_reminders!email_reminders_booking_id_fkey (*)
      `
      )
      .in("status", ["PENDING", "CONFIRMED"])
      .not("customer_id", "is", null)
      .gte("appointment_date", now.toISOString().split("T")[0]);

    if (bookingsError) {
      return {
        success: false,
        sent: 0,
        errors: [bookingsError.message],
      };
    }

    if (!bookings || bookings.length === 0) {
      return { success: true, sent: 0, errors: [] };
    }

    // Process each booking
    for (const booking of bookings as BookingWithDetails[]) {
      try {
        // Skip if customer has no email
        if (!booking.customer?.email) {
          continue;
        }

        // Skip if booking is less than 1 hour away
        if (
          !isBookingMoreThanOneHourAway(
            booking.appointment_date,
            booking.appointment_time || ""
          )
        ) {
          continue;
        }

        const minutesUntil = getMinutesUntilAppointment(
          booking.appointment_date,
          booking.appointment_time || ""
        );

        // Check which reminder to send (60, 30, or 10 minutes)
        let shouldSend = false;
        let reminderMinutes = 0;

        if (minutesUntil <= 60 && minutesUntil > 55) {
          // Send 1 hour reminder (within 5 minute window)
          reminderMinutes = 60;
          shouldSend = true;
        } else if (minutesUntil <= 30 && minutesUntil > 25) {
          // Send 30 minute reminder (within 5 minute window)
          reminderMinutes = 30;
          shouldSend = true;
        } else if (minutesUntil <= 10 && minutesUntil > 5) {
          // Send 10 minute reminder (within 5 minute window)
          reminderMinutes = 10;
          shouldSend = true;
        }

        if (!shouldSend) {
          continue;
        }

        // Check if we've already sent this reminder
        const existingReminder = (booking as any).email_reminders?.find(
          (r: any) => r.reminder_minutes === reminderMinutes
        );

        if (existingReminder) {
          continue; // Already sent
        }

        // Prepare email data
        const services = booking.service_bookings
          .map((sb) => ({
            name: sb.service?.name || "Unknown Service",
            quantity: sb.quantity || 1,
          }))
          .filter((s) => s.name !== "Unknown Service");

        const emailData: BookingEmailData = {
          customerName: booking.customer.name || "Valued Customer",
          customerEmail: booking.customer.email,
          bookingId: booking.id,
          appointmentDate: booking.appointment_date,
          appointmentTime: booking.appointment_time || "",
          services,
          location: booking.location || "Unknown Location",
          totalAmount:
            (booking.grandTotal || 0) - (booking.grandDiscount || 0),
          notes: booking.notes,
        };

        // Send reminder email
        const result = await sendBookingReminder(emailData, reminderMinutes);

        if (result.success) {
          // Record that we sent this reminder
          await supabase.from("email_reminders").insert({
            booking_id: booking.id,
            reminder_minutes: reminderMinutes,
            sent_at: new Date().toISOString(),
          });
          sent++;
        } else {
          errors.push(
            `Failed to send reminder for booking #${booking.id}: ${result.error}`
          );
        }
      } catch (error) {
        const errorMsg = `Error processing booking #${booking.id}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    return {
      success: errors.length === 0,
      sent,
      errors,
    };
  } catch (error) {
    const errorMsg = `Error in checkAndSendReminders: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
    errors.push(errorMsg);
    console.error(errorMsg, error);
    return {
      success: false,
      sent,
      errors,
    };
  }
}

