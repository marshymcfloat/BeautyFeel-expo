// Supabase Edge Function to send appointment session reminders
// This should be called by a cron job daily (e.g., at 9:00 AM UTC)
// It checks for multi-appointment sessions that need reminders 1-3 days before their recommended appointment date

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
    try {
        // Check for API key
        if (!RESEND_API_KEY) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "RESEND_API_KEY is not configured",
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        // Create Supabase client with service role key for admin access
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Call the RPC function to get sessions needing reminders
        const { data: sessionsNeedingReminders, error: rpcError } =
            await supabase
                .rpc("check_and_send_appointment_reminders");

        if (rpcError) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `RPC error: ${rpcError.message}`,
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        if (
            !sessionsNeedingReminders || sessionsNeedingReminders.length === 0
        ) {
            return new Response(
                JSON.stringify({
                    success: true,
                    sent: 0,
                    message:
                        "No appointment sessions need reminders at this time",
                }),
                {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        const errors: string[] = [];
        let sent = 0;

        // Process each session that needs a reminder
        for (const session of sessionsNeedingReminders) {
            try {
                if (!session.customer_email) {
                    errors.push(
                        `Session ${session.session_id}: Customer email not available`,
                    );
                    continue;
                }

                // Calculate days until appointment
                const daysUntil = session.days_until_appointment;
                if (daysUntil === null || daysUntil < 0) {
                    continue; // Skip if date has passed or is invalid
                }

                // Determine which reminder to send (3-day, 2-day, or 1-day)
                let reminderMinutes = 0;
                let daysBefore = 0;

                if (daysUntil === 3) {
                    reminderMinutes = 3 * 24 * 60; // 3 days in minutes
                    daysBefore = 3;
                } else if (daysUntil === 2) {
                    reminderMinutes = 2 * 24 * 60; // 2 days in minutes
                    daysBefore = 2;
                } else if (daysUntil === 1) {
                    reminderMinutes = 1 * 24 * 60; // 1 day in minutes
                    daysBefore = 1;
                } else {
                    continue; // Only send reminders 1-3 days before
                }

                // Check if reminder already sent for this step and reminder time
                const { data: existingReminders } = await supabase
                    .from("email_reminders")
                    .select("id")
                    .eq("session_id", session.session_id)
                    .eq("reminder_minutes", reminderMinutes)
                    .eq("reminder_type", "APPOINTMENT_STEP")
                    .gte(
                        "sent_at",
                        new Date(Date.now() - 24 * 60 * 60 * 1000)
                            .toISOString(),
                    ); // Within last 24 hours

                if (existingReminders && existingReminders.length > 0) {
                    continue; // Already sent
                }

                // Format the recommended date
                const recommendedDate = session.next_recommended_date
                    ? new Date(session.next_recommended_date)
                    : null;

                if (!recommendedDate) {
                    errors.push(
                        `Session ${session.session_id}: No recommended date available`,
                    );
                    continue;
                }

                const formattedDate = recommendedDate.toLocaleDateString(
                    "en-US",
                    {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    },
                );

                const reminderText = daysBefore === 1
                    ? "Your next session is tomorrow!"
                    : `Your next session is in ${daysBefore} days!`;

                // Send email via Resend
                const emailResponse = await fetch(
                    "https://api.resend.com/emails",
                    {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${RESEND_API_KEY}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            from: "Beautyfeel <noreply@beautyfeel.net>",
                            to: session.customer_email,
                            subject:
                                `Reminder: Your next ${session.service_title} session is coming up!`,
                            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Appointment Session Reminder</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">🗓️ Session Reminder: ${daysBefore} Day${
                                daysBefore > 1 ? "s" : ""
                            } Left!</h1>
                  </div>
                  
                  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 16px;">Hi ${
                                session.customer_name || "Valued Customer"
                            },</p>
                    
                    <p>This is a friendly reminder about your upcoming appointment session:</p>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1;">
                      <h2 style="margin-top: 0; color: #6366f1;">Next Session Details</h2>
                      <p><strong>Service:</strong> ${session.service_title}${
                                session.next_step_label
                                    ? ` (${session.next_step_label})`
                                    : ""
                            }</p>
                      <p><strong>Current Step:</strong> ${session.current_step}</p>
                      <p><strong>Recommended Date:</strong> ${formattedDate}</p>
                    </div>
                    
                    <p style="background: #e0e7ff; padding: 15px; border-radius: 8px; border-left: 4px solid #6366f1;">
                      <strong>🔔 Heads up!</strong> ${reminderText}
                    </p>
                    
                    <p style="margin-top: 30px;">
                      Please remember to book your next session around the recommended date to stay on track with your treatment plan.
                    </p>
                    
                    <p>We look forward to continuing your journey with Beautyfeel!</p>
                    
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                      This is an automated reminder. If you have any questions, please contact us directly.
                    </p>
                  </div>
                </body>
              </html>
            `,
                        }),
                    },
                );

                if (emailResponse.ok) {
                    // Record reminder in database
                    // booking_id is nullable for appointment step reminders
                    await supabase.from("email_reminders").insert({
                        session_id: session.session_id,
                        step_order: session.current_step,
                        reminder_minutes: reminderMinutes,
                        reminder_type: "APPOINTMENT_STEP",
                        sent_at: new Date().toISOString(),
                        // booking_id is null for appointment step reminders
                    });
                    sent++;
                } else {
                    const errorData = await emailResponse.json().catch(
                        () => ({})
                    );
                    errors.push(
                        `Failed to send reminder for session ${session.session_id}: ${
                            errorData.message || "Unknown error"
                        }`,
                    );
                }
            } catch (error) {
                errors.push(
                    `Error processing session ${session.session_id}: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`,
                );
            }
        }

        return new Response(
            JSON.stringify({
                success: errors.length === 0,
                sent,
                total: sessionsNeedingReminders.length,
                errors,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json" },
            },
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }
});
