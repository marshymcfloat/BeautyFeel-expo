/**
 * Email Service using Resend API
 * Uses fetch API for universal compatibility (works in Node.js, Deno, and browsers)
 */

// Get API key from environment - works in both Node.js and Supabase Edge Functions
const getResendApiKey = () => {
  // Try different environment variable access methods
  if (typeof process !== "undefined" && process.env) {
    return process.env.RESEND_API_KEY;
  }
  // For Deno/Supabase Edge Functions
  // @ts-ignore - Deno is only available in Deno runtime
  if (typeof Deno !== "undefined" && Deno.env) {
    // @ts-ignore
    return Deno.env.get("RESEND_API_KEY");
  }
  return null;
};

const RESEND_API_KEY = getResendApiKey();
const RESEND_API_URL = "https://api.resend.com/emails";

export interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  bookingId: number;
  appointmentDate: string;
  appointmentTime: string;
  services: Array<{ name: string; quantity: number }>;
  location: string;
  totalAmount: number;
  notes?: string | null;
}

export interface AppointmentStepReminderData {
  customerName: string;
  customerEmail: string;
  serviceTitle: string;
  currentStep: number;
  nextStepLabel: string;
  recommendedDate: string;
  daysUntil: string;
}

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmation(
  data: BookingEmailData,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!RESEND_API_KEY) {
      return { success: false, error: "Resend API key not configured" };
    }

    if (!data.customerEmail) {
      return { success: false, error: "Customer email is required" };
    }

    const appointmentDateTime = new Date(
      `${data.appointmentDate}T${data.appointmentTime}`,
    );
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

    const servicesList = data.services
      .map((s) => `${s.name}${s.quantity > 1 ? ` (x${s.quantity})` : ""}`)
      .join(", ");

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Beautyfeel <noreply@beautyfeel.net>", // Update with your verified domain
        to: data.customerEmail,
        subject: `Booking Confirmation - ${formattedDate}`,
        html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Booking Confirmation</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ec4899, #d946ef, #a855f7); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">Booking Confirmed!</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Hi ${data.customerName},</p>
              
              <p>Your booking has been confirmed! We're excited to see you.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ec4899;">
                <h2 style="margin-top: 0; color: #ec4899;">Booking Details</h2>
                <p><strong>Booking ID:</strong> #${data.bookingId}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                <p><strong>Location:</strong> ${data.location}</p>
                <p><strong>Services:</strong> ${servicesList}</p>
                <p><strong>Total Amount:</strong> ₱${
          data.totalAmount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        }</p>
                ${
          data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ""
        }
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">
                We'll send you reminders 1 hour, 30 minutes, and 10 minutes before your appointment.
              </p>
              
              <p style="margin-top: 30px;">
                If you need to make any changes, please contact us as soon as possible.
              </p>
              
              <p>Thank you for choosing Beautyfeel!</p>
            </div>
          </body>
        </html>
      `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error sending confirmation email:", errorData);
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error sending confirmation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send booking reminder email
 */
export async function sendBookingReminder(
  data: BookingEmailData,
  minutesUntil: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!RESEND_API_KEY) {
      return { success: false, error: "Resend API key not configured" };
    }

    if (!data.customerEmail) {
      return { success: false, error: "Customer email is required" };
    }

    const appointmentDateTime = new Date(
      `${data.appointmentDate}T${data.appointmentTime}`,
    );
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

    const servicesList = data.services
      .map((s) => `${s.name}${s.quantity > 1 ? ` (x${s.quantity})` : ""}`)
      .join(", ");

    const timeText = minutesUntil === 60
      ? "1 hour"
      : minutesUntil === 30
      ? "30 minutes"
      : minutesUntil === 10
      ? "10 minutes"
      : `${minutesUntil} minutes`;

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Beautyfeel <noreply@beautyfeel.net>",
        to: data.customerEmail,
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
              <p style="font-size: 16px;">Hi ${data.customerName},</p>
              
              <p>This is a friendly reminder that you have an appointment with us in <strong>${timeText}</strong>!</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h2 style="margin-top: 0; color: #f59e0b;">Appointment Details</h2>
                <p><strong>Booking ID:</strong> #${data.bookingId}</p>
                <p><strong>Date:</strong> ${formattedDate}</p>
                <p><strong>Time:</strong> ${formattedTime}</p>
                <p><strong>Location:</strong> ${data.location}</p>
                <p><strong>Services:</strong> ${servicesList}</p>
              </div>
              
              <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <strong>⏰ Don't forget!</strong> Your appointment is in ${timeText}. Please arrive on time.
              </p>
              
              <p style="margin-top: 30px;">
                If you need to reschedule or cancel, please contact us as soon as possible.
              </p>
              
              <p>We look forward to seeing you!</p>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This is an automated reminder. If you have any questions, please contact us directly.
              </p>
            </div>
          </body>
        </html>
      `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error sending reminder email:", errorData);
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error sending reminder email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send appointment step reminder email
 * Reminds customers about upcoming recommended appointment dates for multi-appointment services
 */
export async function sendAppointmentStepReminder(
  data: AppointmentStepReminderData,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!RESEND_API_KEY) {
      return { success: false, error: "Resend API key not configured" };
    }

    if (!data.customerEmail) {
      return { success: false, error: "Customer email is required" };
    }

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Beautyfeel <noreply@beautyfeel.net>",
        to: data.customerEmail,
        subject: `Upcoming Appointment: ${data.serviceTitle} - ${data.nextStepLabel}`,
        html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Appointment Step Reminder</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #8b5cf6, #a855f7); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">📅 Appointment Reminder</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Hi ${data.customerName},</p>
              
              <p>This is a friendly reminder about your ongoing <strong>${data.serviceTitle}</strong> treatment.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
                <h2 style="margin-top: 0; color: #8b5cf6;">Your Next Appointment</h2>
                <p><strong>Service:</strong> ${data.serviceTitle}</p>
                <p><strong>Step:</strong> ${data.nextStepLabel}</p>
                <p><strong>Current Progress:</strong> Step ${data.currentStep}</p>
                <p><strong>Recommended Date:</strong> ${data.recommendedDate}</p>
                <p><strong>Time Until:</strong> ${data.daysUntil}</p>
              </div>
              
              <p style="background: #ede9fe; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
                <strong>💡 Don't forget!</strong> It's recommended to schedule your next appointment for <strong>${data.recommendedDate}</strong> to maintain the best results from your treatment.
              </p>
              
              <p style="margin-top: 30px;">
                Please contact us to schedule your next appointment. We're here to help you complete your treatment successfully!
              </p>
              
              <p>Thank you for choosing Beautyfeel!</p>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This is an automated reminder. If you have any questions, please contact us directly.
              </p>
            </div>
          </body>
        </html>
      `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error sending appointment step reminder email:", errorData);
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error sending appointment step reminder email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
