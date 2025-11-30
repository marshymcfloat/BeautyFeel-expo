// Supabase Edge Function to send booking reminders
// This should be called by a cron job every 5 minutes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    // Create Supabase client with service role key for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Import the reminder checking logic
    // Since we're in Deno, we need to adapt the code
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    // Get all upcoming bookings
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
      `,
      )
      .in("status", ["PENDING", "CONFIRMED"])
      .not("customer_id", "is", null)
      .gte("appointment_date", now.toISOString().split("T")[0]);

    if (bookingsError) {
      return new Response(
        JSON.stringify({ success: false, error: bookingsError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          message: "No bookings to process",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const errors: string[] = [];
    let sent = 0;

    // Initialize Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    // Process each booking
    for (const booking of bookings) {
      try {
        if (!booking.customer?.email) continue;

        const appointmentDateTime = new Date(
          `${booking.appointment_date}T${booking.appointment_time || ""}`,
        );
        const diffMs = appointmentDateTime.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const minutesUntil = Math.floor(diffMs / (1000 * 60));

        // Skip if less than 1 hour away
        if (diffHours < 1) continue;

        // Determine which reminder to send
        let reminderMinutes = 0;
        let shouldSend = false;

        if (minutesUntil <= 60 && minutesUntil > 55) {
          reminderMinutes = 60;
          shouldSend = true;
        } else if (minutesUntil <= 30 && minutesUntil > 25) {
          reminderMinutes = 30;
          shouldSend = true;
        } else if (minutesUntil <= 10 && minutesUntil > 5) {
          reminderMinutes = 10;
          shouldSend = true;
        }

        if (!shouldSend) continue;

        // Check if already sent
        const existingReminder = booking.email_reminders?.find(
          (r: any) => r.reminder_minutes === reminderMinutes,
        );
        if (existingReminder) continue;

        // Prepare email
        const services = booking.service_bookings
          .map((sb: any) => ({
            name: sb.service?.name || "Unknown Service",
            quantity: sb.quantity || 1,
          }))
          .filter((s: any) => s.name !== "Unknown Service");

        const timeText = reminderMinutes === 60
          ? "1 hour"
          : reminderMinutes === 30
          ? "30 minutes"
          : "10 minutes";

        const formattedDate = appointmentDateTime.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const formattedTime = appointmentDateTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        const servicesList = services
          .map((s: any) =>
            `${s.name}${s.quantity > 1 ? ` (x${s.quantity})` : ""}`
          )
          .join(", ");

        // Send email via Resend
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Beautyfeel <noreply@beautyfeel.net>",
            to: booking.customer.email,
            subject: `Reminder: Your appointment is in ${timeText}`,
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Appointment Reminder</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #f59e0b, #f97316); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">⏰ Appointment Reminder</h1>
                  </div>
                  
                  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 16px;">Hi ${
              booking.customer.name || "Valued Customer"
            },</p>
                    
                    <p>This is a friendly reminder that you have an appointment with us in <strong>${timeText}</strong>!</p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                      <h2 style="margin-top: 0; color: #f59e0b;">Appointment Details</h2>
                      <p><strong>Booking ID:</strong> #${booking.id}</p>
                      <p><strong>Date:</strong> ${formattedDate}</p>
                      <p><strong>Time:</strong> ${formattedTime}</p>
                      <p><strong>Location:</strong> ${
              booking.location || "Unknown Location"
            }</p>
                      <p><strong>Services:</strong> ${servicesList}</p>
                    </div>
                    
                    <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                      <strong>⏰ Don't forget!</strong> Your appointment is in ${timeText}. Please arrive on time.
                    </p>
                    
                    <p style="margin-top: 30px;">
                      If you need to reschedule or cancel, please contact us as soon as possible.
                    </p>
                    
                    <p>We look forward to seeing you!</p>
                  </div>
                </body>
              </html>
            `,
          }),
        });

        if (emailResponse.ok) {
          // Record reminder
          await supabase.from("email_reminders").insert({
            booking_id: booking.id,
            reminder_minutes: reminderMinutes,
            sent_at: new Date().toISOString(),
          });
          sent++;
        } else {
          const errorData = await emailResponse.json();
          errors.push(
            `Failed to send reminder for booking #${booking.id}: ${
              errorData.message || "Unknown error"
            }`,
          );
        }
      } catch (error) {
        errors.push(
          `Error processing booking #${booking.id}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        sent,
        errors,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
