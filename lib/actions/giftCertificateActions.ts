import type { Tables } from "../../database.types";
import { formatDateString } from "../utils/dateTime";
import { supabase } from "../utils/supabase";
import { createBookingAction } from "./bookingActions";

type GiftCertificate = Tables<"gift_certificate">;
type GiftCertificateService = Tables<"gift_certificate_services">;
type GiftCertificateServiceSet = Tables<"gift_certificate_service_sets">;
type Customer = Tables<"customer">;
type Service = Tables<"service">;
type ServiceSet = Tables<"service_set">;

export interface GiftCertificateWithRelations extends GiftCertificate {
  customer?: {
    id: number;
    name: string;
    email: string | null;
  } | null;
  services?: Array<{
    id: number;
    service_id: number;
    quantity: number;
    service: {
      id: number;
      title: string;
      price: number;
    };
  }>;
  service_sets?: Array<{
    id: number;
    service_set_id: number;
    quantity: number;
    service_set: {
      id: number;
      title: string;
      price: number;
    };
  }>;
}

export async function giftCertificateCodeExists(
  code: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("gift_certificate")
      .select("id")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    if (error) {
      console.error("Error checking gift certificate code:", error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error("Unexpected error checking gift certificate code:", err);
    return false;
  }
}

export async function checkGiftCertificate(code: string) {
  try {
    await updateExpiredGiftCertificates();

    const { data, error } = await supabase
      .from("gift_certificate")
      .select(
        `
        *,
        gift_certificate_services (
          id,
          service_id,
          quantity,
          service:service_id (
            id,
            title,
            price,
            duration_minutes,
            is_active
          )
        ),
        gift_certificate_service_sets (
          id,
          service_set_id,
          quantity,
          service_set:service_set_id (
            id,
            title,
            price,
            is_active
          )
        )
      `,
      )
      .eq("code", code.toUpperCase())
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: "Database error while checking gift certificate.",
      };
    }

    if (!data) {
      const { data: gcExists } = await supabase
        .from("gift_certificate")
        .select("status, expires_on")
        .eq("code", code.toUpperCase())
        .maybeSingle() as { data: GiftCertificate | null };

      if (gcExists) {
        if (gcExists.status === "USED") {
          return {
            success: false,
            error: "This gift certificate has already been used.",
          };
        }
        if (gcExists.status === "EXPIRED") {
          return {
            success: false,
            error: "This gift certificate has expired.",
          };
        }
      }
      return { success: false, error: "Invalid gift certificate code." };
    }

    const gcData = data as GiftCertificate & {
      gift_certificate_services?: Array<
        GiftCertificateService & {
          service: Service;
        }
      >;
      gift_certificate_service_sets?: Array<
        GiftCertificateServiceSet & {
          service_set: ServiceSet;
        }
      >;
    };

    if (gcData.expires_on) {
      const expiryDate = new Date(gcData.expires_on);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        await (supabase
          .from("gift_certificate") as any)
          .update({ status: "EXPIRED" })
          .eq("id", gcData.id);

        return { success: false, error: "This gift certificate has expired." };
      }
    }

    const hasServices = gcData.gift_certificate_services &&
      gcData.gift_certificate_services.length > 0;
    const hasServiceSets = gcData.gift_certificate_service_sets &&
      gcData.gift_certificate_service_sets.length > 0;

    if (!hasServices && !hasServiceSets) {
      return {
        success: false,
        error: "This gift certificate has no services or service sets.",
      };
    }

    return {
      success: true,
      data: {
        ...gcData,
        services: gcData.gift_certificate_services?.map((s) => ({
          id: s.id,
          service_id: s.service_id,
          quantity: s.quantity,
          service: {
            id: s.service.id,
            title: s.service.title,
            price: s.service.price,
          },
        })),
        service_sets: gcData.gift_certificate_service_sets?.map((ss) => ({
          id: ss.id,
          service_set_id: ss.service_set_id,
          quantity: ss.quantity,
          service_set: {
            id: ss.service_set.id,
            title: ss.service_set.title,
            price: ss.service_set.price,
          },
        })),
      } as GiftCertificateWithRelations,
    };
  } catch (err) {
    console.error("Unexpected error checking gift certificate:", err);
    return {
      success: false,
      error: "An unexpected error occurred.",
    };
  }
}

export async function claimGiftCertificateAction(giftCertificateId: number) {
  try {
    // First, fetch the gift certificate with all its details
    const { data: giftCertificate, error: fetchError } = await supabase
      .from("gift_certificate")
      .select(
        `
        *,
        gift_certificate_services (
          id,
          service_id,
          quantity,
          service:service_id (
            id,
            title,
            price,
            duration_minutes,
            is_active
          )
        ),
        gift_certificate_service_sets (
          id,
          service_set_id,
          quantity,
          service_set:service_set_id (
            id,
            title,
            price,
            is_active
          )
        )
      `,
      )
      .eq("id", giftCertificateId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (fetchError || !giftCertificate) {
      return {
        success: false,
        error: fetchError?.message ||
          "Gift certificate not found or already used",
      };
    }

    const gcData = giftCertificate as GiftCertificate & {
      gift_certificate_services?: Array<
        GiftCertificateService & {
          service: Service;
        }
      >;
      gift_certificate_service_sets?: Array<
        GiftCertificateServiceSet & {
          service_set: ServiceSet;
        }
      >;
    };

    // Validate that customer_id exists (required)
    if (!gcData.customer_id) {
      return {
        success: false,
        error: "Gift certificate must be associated with a customer",
      };
    }

    // Check if gift certificate has services or service sets
    const hasServices = gcData.gift_certificate_services &&
      gcData.gift_certificate_services.length > 0;
    const hasServiceSets = gcData.gift_certificate_service_sets &&
      gcData.gift_certificate_service_sets.length > 0;

    if (!hasServices && !hasServiceSets) {
      return {
        success: false,
        error: "Gift certificate has no services or service sets",
      };
    }

    // Get current date and time
    const now = new Date();
    const appointmentDate = formatDateString(now);
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const appointmentTime = `${hours}:${minutes}`;

    // Prepare services and service sets for booking
    const services = gcData.gift_certificate_services?.map((s) => ({
      serviceId: s.service_id,
      quantity: s.quantity,
    })) || [];

    const serviceSets = gcData.gift_certificate_service_sets?.map((ss) => ({
      serviceSetId: ss.service_set_id,
      quantity: ss.quantity,
    })) || [];

    // Create booking automatically
    const bookingResult = await createBookingAction({
      customerId: gcData.customer_id || undefined,
      appointmentDate,
      appointmentTime,
      branch: "NAILS", // Default branch - you may want to make this configurable
      services,
      serviceSets,
      notes: `Gift certificate ${gcData.code} claimed`,
      grandDiscount: 0,
    });

    if (!bookingResult.success) {
      return {
        success: false,
        error: bookingResult.error || "Failed to create booking",
      };
    }

    // Mark gift certificate as USED
    const { error: updateError } = await (supabase
      .from("gift_certificate") as any)
      .update({ status: "USED" })
      .eq("id", giftCertificateId)
      .eq("status", "ACTIVE");

    if (updateError) {
      // Booking was created but failed to update gift certificate status
      // This is a partial success - booking exists but certificate not marked as used
      console.error("Failed to mark gift certificate as used:", updateError);
      return {
        success: false,
        error: "Booking created but failed to mark gift certificate as used",
      };
    }

    return {
      success: true,
      data: bookingResult.data,
    };
  } catch (err) {
    console.error("Unexpected error claiming gift certificate:", err);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

export async function getAllGiftCertificates() {
  try {
    await updateExpiredGiftCertificates();

    const { data, error } = await supabase
      .from("gift_certificate")
      .select(
        `
        *,
        customer:customer_id (
          id,
          name,
          email
        ),
        gift_certificate_services (
          id,
          service_id,
          quantity,
          service:service_id (
            id,
            title,
            price
          )
        ),
        gift_certificate_service_sets (
          id,
          service_set_id,
          quantity,
          service_set:service_set_id (
            id,
            title,
            price
          )
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching gift certificates:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch gift certificates",
      };
    }

    return {
      success: true,
      data: (data || []) as GiftCertificateWithRelations[],
    };
  } catch (err) {
    console.error("Unexpected error fetching gift certificates:", err);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

export async function createGiftCertificateAction(data: {
  code: string;
  customerId?: number | null;
  customerName?: string | null;
  customerEmail?: string | null;
  expiresOn?: string | null;
  serviceIds?: Array<{ serviceId: number; quantity: number }>;
  serviceSetIds?: Array<{ serviceSetId: number; quantity: number }>;
}) {
  try {
    const exists = await giftCertificateCodeExists(data.code);
    if (exists) {
      return {
        success: false,
        error: "A gift certificate with this code already exists",
      };
    }

    let customerId = data.customerId;

    if (data.customerName && !customerId) {
      const { data: existingCustomer } = await (supabase
        .from("customer") as any)
        .select("id")
        .eq("name", data.customerName.trim())
        .maybeSingle();

      if (existingCustomer) {
        customerId = (existingCustomer as { id: number }).id;
      } else {
        const { data: newCustomer, error: customerError } = await (supabase
          .from("customer") as any)
          .insert({
            name: data.customerName.trim(),
            email: data.customerEmail?.trim() || null,
            spent: 0,
          })
          .select()
          .single();

        if (customerError || !newCustomer) {
          return {
            success: false,
            error: customerError?.message || "Failed to create customer",
          };
        }

        customerId = (newCustomer as Customer).id;
      }
    }

    const { data: giftCertificate, error: gcError } = await (supabase
      .from("gift_certificate") as any)
      .insert({
        code: data.code.toUpperCase(),
        customer_id: customerId,
        customer_name: data.customerName?.trim() || null,
        customer_email: data.customerEmail?.trim() || null,
        expires_on: data.expiresOn || null,
        status: "ACTIVE",
      })
      .select()
      .single();

    if (gcError || !giftCertificate) {
      return {
        success: false,
        error: gcError?.message || "Failed to create gift certificate",
      };
    }

    let totalValue = 0;

    if (data.serviceIds && data.serviceIds.length > 0) {
      const serviceInserts: Array<{
        gift_certificate_id: number;
        service_id: number;
        quantity: number;
      }> = [];
      for (const item of data.serviceIds) {
        const { data: service } = await (supabase
          .from("service") as any)
          .select("price")
          .eq("id", item.serviceId)
          .single();

        if (service) {
          totalValue += (service as Service).price * item.quantity;
          serviceInserts.push({
            gift_certificate_id: (giftCertificate as GiftCertificate).id,
            service_id: item.serviceId,
            quantity: item.quantity,
          });
        }
      }

      if (serviceInserts.length > 0) {
        const { error: servicesError } = await (supabase
          .from("gift_certificate_services") as any)
          .insert(serviceInserts);

        if (servicesError) {
          await supabase
            .from("gift_certificate")
            .delete()
            .eq("id", (giftCertificate as GiftCertificate).id);
          return {
            success: false,
            error: "Failed to add services to gift certificate",
          };
        }
      }
    }

    if (data.serviceSetIds && data.serviceSetIds.length > 0) {
      const serviceSetInserts: Array<{
        gift_certificate_id: number;
        service_set_id: number;
        quantity: number;
      }> = [];
      for (const item of data.serviceSetIds) {
        const { data: serviceSet } = await (supabase
          .from("service_set") as any)
          .select("price")
          .eq("id", item.serviceSetId)
          .single();

        if (serviceSet) {
          totalValue += (serviceSet as ServiceSet).price * item.quantity;
          serviceSetInserts.push({
            gift_certificate_id: (giftCertificate as GiftCertificate).id,
            service_set_id: item.serviceSetId,
            quantity: item.quantity,
          });
        }
      }

      if (serviceSetInserts.length > 0) {
        const { error: serviceSetsError } = await (supabase
          .from("gift_certificate_service_sets") as any)
          .insert(serviceSetInserts);

        if (serviceSetsError) {
          await supabase
            .from("gift_certificate")
            .delete()
            .eq("id", (giftCertificate as GiftCertificate).id);
          return {
            success: false,
            error: "Failed to add service sets to gift certificate",
          };
        }
      }
    }

    if (customerId) {
      const { data: customer } = await (supabase
        .from("customer") as any)
        .select("spent")
        .eq("id", customerId)
        .single();

      if (customer) {
        const newSpent = ((customer as Customer).spent || 0) + totalValue;
        await (supabase
          .from("customer") as any)
          .update({ spent: newSpent })
          .eq("id", customerId);
      }
    }

    return {
      success: true,
      data: giftCertificate,
    };
  } catch (err) {
    console.error("Unexpected error creating gift certificate:", err);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

export async function deleteGiftCertificateAction(giftCertificateId: number) {
  try {
    const { error } = await supabase
      .from("gift_certificate")
      .delete()
      .eq("id", giftCertificateId);

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to delete gift certificate",
      };
    }

    return {
      success: true,
    };
  } catch (err) {
    console.error("Unexpected error deleting gift certificate:", err);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

export async function sendGiftCertificateEmailAction(data: {
  email: string;
  customerName: string;
  giftCertificateCode: string;
  services?: Array<{ name: string; quantity: number }>;
  serviceSets?: Array<{ name: string; quantity: number }>;
  expiresOn?: string | null;
}) {
  try {
    const { data: result, error } = await supabase.functions.invoke(
      "send-gift-certificate-email",
      {
        body: data,
      },
    );

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    return {
      success: true,
      data: result,
    };
  } catch (err) {
    console.error("Unexpected error sending gift certificate email:", err);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

async function updateExpiredGiftCertificates() {
  try {
    const { error: rpcError } = await supabase.rpc(
      "update_expired_gift_certificates",
    );

    if (rpcError) {
      const today = new Date().toISOString().split("T")[0];
      await (supabase
        .from("gift_certificate") as any)
        .update({ status: "EXPIRED" })
        .eq("status", "ACTIVE")
        .not("expires_on", "is", null)
        .lt("expires_on", today);
    }
  } catch (err) {
    console.error("Error updating expired gift certificates:", err);
  }
}
