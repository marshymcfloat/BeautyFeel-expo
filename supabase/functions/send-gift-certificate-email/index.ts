// Supabase Edge Function to send gift certificate emails to customers

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface GiftCertificateEmailRequest {
    email: string;
    customerName: string;
    giftCertificateCode: string;
    services?: Array<{ name: string; quantity: number }>;
    serviceSets?: Array<{ name: string; quantity: number }>;
    expiresOn?: string | null;
}

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

        // Parse request body
        const body: GiftCertificateEmailRequest = await req.json();

        // Validate required fields
        if (!body.email || !body.customerName || !body.giftCertificateCode) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error:
                        "Missing required fields: email, customerName, giftCertificateCode",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        // Format expiration date if provided
        let expirationText = "";
        if (body.expiresOn) {
            const expiryDate = new Date(body.expiresOn);
            expirationText = expiryDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            });
        }

        // Build services list HTML
        let servicesListHtml = "";
        if (body.services && body.services.length > 0) {
            servicesListHtml = `
        <div style="margin: 15px 0;">
          <h3 style="color: #111827; margin-bottom: 10px;">Services Included:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${
                body.services.map((s) =>
                    `<li>${s.name}${
                        s.quantity > 1 ? ` (x${s.quantity})` : ""
                    }</li>`
                ).join("")
            }
          </ul>
        </div>
      `;
        }

        // Build service sets list HTML
        let serviceSetsListHtml = "";
        if (body.serviceSets && body.serviceSets.length > 0) {
            serviceSetsListHtml = `
        <div style="margin: 15px 0;">
          <h3 style="color: #111827; margin-bottom: 10px;">Service Sets Included:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${
                body.serviceSets.map((s) =>
                    `<li>${s.name}${
                        s.quantity > 1 ? ` (x${s.quantity})` : ""
                    }</li>`
                ).join("")
            }
          </ul>
        </div>
      `;
        }

        // Send email via Resend
        const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "Beautyfeel <noreply@beautyfeel.net>",
                to: body.email,
                subject:
                    `🎁 Your Gift Certificate: ${body.giftCertificateCode}`,
                html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Your Gift Certificate</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #ec4899, #d946ef); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0;">🎁 Your Gift Certificate</h1>
              </div>
              
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px;">Hi ${body.customerName},</p>
                
                <p>We're excited to share your gift certificate with you! Use it to redeem the included services during your next booking.</p>
                
                <div style="background: white; padding: 30px; border-radius: 8px; margin: 20px 0; border: 2px dashed #ec4899; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Gift Certificate Code</p>
                  <h2 style="margin: 0; color: #ec4899; font-size: 36px; font-weight: bold; letter-spacing: 4px; font-family: monospace;">${body.giftCertificateCode}</h2>
                  ${
                    expirationText
                        ? `<p style="margin: 15px 0 0 0; color: #6b7280; font-size: 14px;">Expires: ${expirationText}</p>`
                        : ""
                }
                </div>
                
                ${servicesListHtml}
                ${serviceSetsListHtml}
                
                <div style="background: #fdf2f8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ec4899;">
                  <h3 style="margin-top: 0; color: #ec4899;">How to Use Your Gift Certificate</h3>
                  <ol style="margin: 0; padding-left: 20px;">
                    <li>Book your appointment through our app or website</li>
                    <li>Enter the gift certificate code <strong>${body.giftCertificateCode}</strong> during checkout</li>
                    <li>The included services will be automatically applied to your booking</li>
                  </ol>
                </div>
                
                ${
                    expirationText
                        ? `
                <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                  <strong>⏰ Important:</strong> This gift certificate expires on ${expirationText}. Make sure to use it before then!
                </p>
                `
                        : ""
                }
                
                <p style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                  <strong>💡 Note:</strong> This gift certificate can be used once. The included services will be redeemed when you complete your booking.
                </p>
                
                <p style="margin-top: 30px;">
                  If you have any questions or need assistance, please don't hesitate to contact us.
                </p>
                
                <p>We look forward to serving you!</p>
                
                <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
                  Best regards,<br>
                  The Beautyfeel Team
                </p>
              </div>
            </body>
          </html>
        `,
            }),
        });

        if (!emailResponse.ok) {
            const errorData = await emailResponse.json().catch(() => ({}));
            return new Response(
                JSON.stringify({
                    success: false,
                    error: errorData.message || "Failed to send email",
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                },
            );
        }

        const emailData = await emailResponse.json();

        return new Response(
            JSON.stringify({
                success: true,
                message: "Email sent successfully",
                emailId: emailData.id,
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
