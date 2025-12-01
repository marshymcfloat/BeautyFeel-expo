import type { BookingWithServices } from "@/components/bookings/types";
import type { Tables, TablesInsert } from "../../database.types";
import { supabase } from "../utils/supabase";
import {
  CreateBookingSchema,
  createBookingSchema,
  UpdateBookingSchema,
  updateBookingSchema,
} from "../zod-schemas/booking";
import { createCustomerAction } from "./customerActions";

type Booking = Tables<"public", "booking">;
type Service = Tables<"public", "service">;
type ServiceBooking = Tables<"public", "service_bookings">;

/**
 * Create a new booking with services
 * Creates service instances based on quantity (1 instance per quantity)
 */
export async function createBookingAction(data: CreateBookingSchema) {
  try {
    // Validate input
    const validationResult = createBookingSchema.safeParse(data);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || "Validation error",
      };
    }

    const validated = validationResult.data;

    // Fetch all services for individual service bookings
    const serviceIds = validated.services?.map((s) => s.serviceId) || [];
    const servicesMap = new Map<number, Service>();

    if (serviceIds.length > 0) {
      const { data: services, error: servicesError } = await supabase
        .from("service")
        .select("id, price, duration_minutes, is_active")
        .in("id", serviceIds);

      if (servicesError || !services) {
        return {
          success: false,
          error: "Failed to fetch services. Please try again.",
        };
      }

      // Validate all services exist and are active
      for (const service of services) {
        servicesMap.set(service.id, service);
      }

      for (const bookingService of validated.services || []) {
        const service = servicesMap.get(bookingService.serviceId);
        if (!service) {
          return {
            success: false,
            error: `Service with ID ${bookingService.serviceId} not found`,
          };
        }
        if (!service.is_active) {
          return {
            success: false,
            error: `Service "${service.id}" is not available`,
          };
        }
      }
    }

    // Fetch all service sets
    const serviceSetIds = validated.serviceSets?.map((s) => s.serviceSetId) ||
      [];
    const serviceSetsMap = new Map<
      number,
      {
        id: number;
        price: number;
        title: string;
        service_set_items: Array<{
          service_id: number;
          adjusted_price: number | null;
          service: Service;
        }>;
      }
    >();

    if (serviceSetIds.length > 0) {
      const { data: serviceSets, error: serviceSetsError } = await supabase
        .from("service_set")
        .select(
          `
          id,
          price,
          title,
          is_active,
          service_set_items (
            service_id,
            adjusted_price,
            service:service_id (*)
          )
        `,
        )
        .in("id", serviceSetIds)
        .eq("is_active", true);

      if (serviceSetsError || !serviceSets) {
        return {
          success: false,
          error: "Failed to fetch service sets. Please try again.",
        };
      }

      // Validate all service sets exist and are active
      for (const serviceSet of serviceSets as any[]) {
        if (!serviceSet.is_active) {
          return {
            success: false,
            error: `Service set "${serviceSet.title}" is not available`,
          };
        }

        // Validate all services in the set are active
        const items = serviceSet.service_set_items || [];
        for (const item of items) {
          if (!item.service || !item.service.is_active) {
            return {
              success: false,
              error:
                `Service set "${serviceSet.title}" contains inactive services`,
            };
          }
          // Add services from set to the services map for duration calculation
          servicesMap.set(item.service.id, item.service);
        }

        serviceSetsMap.set(serviceSet.id, {
          id: serviceSet.id,
          price: serviceSet.price,
          title: serviceSet.title,
          service_set_items: items.map((item: any) => ({
            service_id: item.service_id,
            adjusted_price: item.adjusted_price ?? null,
            service: item.service,
          })),
        });
      }
    }

    // Calculate totals
    let grandTotal = 0;
    let totalDuration = 0;

    // Add totals from individual services
    for (const bookingService of validated.services || []) {
      const service = servicesMap.get(bookingService.serviceId)!;
      const serviceTotal = service.price * bookingService.quantity;
      grandTotal += serviceTotal;
      totalDuration += service.duration_minutes * bookingService.quantity;
    }

    // Add totals from service sets
    for (const bookingServiceSet of validated.serviceSets || []) {
      const serviceSet = serviceSetsMap.get(bookingServiceSet.serviceSetId);
      if (!serviceSet) {
        return {
          success: false,
          error:
            `Service set with ID ${bookingServiceSet.serviceSetId} not found`,
        };
      }

      // Add service set price * quantity
      const serviceSetTotal = serviceSet.price * bookingServiceSet.quantity;
      grandTotal += serviceSetTotal;

      // Calculate total duration from all services in the set
      // For each quantity, we add the duration of all services in the set
      for (let q = 0; q < bookingServiceSet.quantity; q++) {
        for (const item of serviceSet.service_set_items) {
          const service = servicesMap.get(item.service_id);
          if (service) {
            totalDuration += service.duration_minutes;
          }
        }
      }
    }

    // Check voucher if provided
    let voucherDiscount = 0;
    let voucherId: number | null = null;

    // First, update any expired vouchers
    const today = new Date().toISOString().split("T")[0];
    await supabase
      .from("voucher")
      .update({ status: "EXPIRED" })
      .eq("status", "ACTIVE")
      .not("expires_on", "is", null)
      .lt("expires_on", today);

    // Use voucher ID if provided (from VoucherInput component)
    if (validated.voucher && validated.voucher > 0) {
      const { data: voucher, error: voucherError } = await supabase
        .from("voucher")
        .select("id, value, status, expires_on")
        .eq("id", validated.voucher)
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (voucherError || !voucher) {
        return {
          success: false,
          error: "Invalid or expired voucher. Please remove and reapply.",
        };
      }

      // Double-check expiration
      if (voucher.expires_on) {
        const expiryDate = new Date(voucher.expires_on);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        if (expiryDate < todayDate) {
          await supabase
            .from("voucher")
            .update({ status: "EXPIRED" })
            .eq("id", voucher.id);

          return {
            success: false,
            error: "This voucher has expired",
          };
        }
      }

      voucherId = voucher.id;
      // Use grandDiscount from form if provided, otherwise use voucher value
      voucherDiscount = Math.min(
        validated.grandDiscount || voucher.value,
        grandTotal
      );
    } else if (validated.voucherCode) {
      // Fallback: use voucherCode for backward compatibility
      const { data: voucher, error: voucherError } = await supabase
        .from("voucher")
        .select("id, value, status, expires_on")
        .eq("code", validated.voucherCode.toUpperCase())
        .eq("status", "ACTIVE")
        .maybeSingle();

      if (voucherError || !voucher) {
        // Check if voucher exists but is not active
        const { data: voucherExists } = await supabase
          .from("voucher")
          .select("status")
          .eq("code", validated.voucherCode.toUpperCase())
          .maybeSingle();

        if (voucherExists) {
          if (voucherExists.status === "USED") {
            return {
              success: false,
              error: "This voucher has already been used",
            };
          }
          if (voucherExists.status === "EXPIRED") {
            return {
              success: false,
              error: "This voucher has expired",
            };
          }
        }
        return {
          success: false,
          error: "Invalid voucher code",
        };
      }

      // Double-check expiration
      if (voucher.expires_on) {
        const expiryDate = new Date(voucher.expires_on);
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        if (expiryDate < todayDate) {
          await supabase
            .from("voucher")
            .update({ status: "EXPIRED" })
            .eq("id", voucher.id);

          return {
            success: false,
            error: "This voucher has expired",
          };
        }
      }

      voucherId = voucher.id;
      voucherDiscount = Math.min(voucher.value, grandTotal);
    }

    const finalTotal = grandTotal - voucherDiscount;

    // Parse date and time
    const appointmentDate = validated.appointmentDate;
    const appointmentTime = validated.appointmentTime;

    // Determine customer ID - create customer if needed
    let customerId: number;

    if (validated.customerId && validated.customerId > 0) {
      // Existing customer
      customerId = validated.customerId;

      // Update customer email if provided
      if (validated.customerEmail && validated.customerEmail.trim()) {
        const { error: emailUpdateError } = await supabase
          .from("customer")
          .update({
            email: validated.customerEmail.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", customerId);

        if (emailUpdateError) {
          console.error("Error updating customer email:", emailUpdateError);
          // Don't fail the booking creation, just log the error
        }
      }
    } else if (validated.customerName && validated.customerName.trim()) {
      // New customer - create them
      const createCustomerResult = await createCustomerAction({
        name: validated.customerName.trim(),
        email: validated.customerEmail?.trim() || null,
      });

      if (!createCustomerResult.success || !createCustomerResult.data) {
        return {
          success: false,
          error: createCustomerResult.error || "Failed to create customer",
        };
      }

      customerId = createCustomerResult.data.id;
    } else {
      return {
        success: false,
        error:
          "Customer is required. Please select an existing customer or enter a customer name.",
      };
    }

    // Create booking
    const bookingInsert: TablesInsert<"public", "booking"> = {
      customer_id: customerId,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      duration_minutes: totalDuration,
      location: validated.branch, // Store branch enum in location field for now
      grandTotal: grandTotal,
      grandDiscount: voucherDiscount,
      status: "PENDING",
      notes: validated.notes || null,
      voucher_id: voucherId,
    };

    const { data: booking, error: bookingError } = await supabase
      .from("booking")
      .insert(bookingInsert)
      .select()
      .single();

    if (bookingError || !booking) {
      console.error("Booking creation error:", bookingError);
      return {
        success: false,
        error: bookingError?.message || "Failed to create booking",
      };
    }

    // Create service instances (one per quantity)
    const serviceBookingsInserts: TablesInsert<"public", "service_bookings">[] =
      [];

    let sequenceOrder = 1;

    // Create service instances for individual services
    for (const bookingService of validated.services || []) {
      const service = servicesMap.get(bookingService.serviceId)!;

      // Create one instance per quantity
      for (let i = 0; i < bookingService.quantity; i++) {
        serviceBookingsInserts.push({
          booking_transaction_id: booking.id,
          service_id: service.id,
          quantity: 1, // Each instance has quantity 1
          price_at_booking: service.price,
          sequence_order: sequenceOrder++,
          status: "UNCLAIMED", // New instances start as unclaimed
        });
      }
    }

    // Create service instances for service sets
    // For each service set quantity, create instances for all services in the set
    for (const bookingServiceSet of validated.serviceSets || []) {
      const serviceSet = serviceSetsMap.get(bookingServiceSet.serviceSetId)!;

      // For each quantity of the service set
      for (let q = 0; q < bookingServiceSet.quantity; q++) {
        // Create one instance for each service in the set
        for (const item of serviceSet.service_set_items) {
          const service = servicesMap.get(item.service_id);
          if (!service) continue;

          // Calculate the price per service from the service set
          // Use adjusted_price if available, otherwise divide evenly
          let pricePerService: number;
          if (
            item.adjusted_price !== null && item.adjusted_price !== undefined &&
            item.adjusted_price > 0
          ) {
            // Use the adjusted price for commission calculation
            pricePerService = item.adjusted_price;
          } else {
            // Divide the service set price evenly among services without adjusted prices
            const servicesInSetCount = serviceSet.service_set_items.length;
            pricePerService = serviceSet.price / servicesInSetCount;
          }

          serviceBookingsInserts.push({
            booking_transaction_id: booking.id,
            service_id: service.id,
            quantity: 1,
            price_at_booking: pricePerService, // Use adjusted price if available, otherwise divided evenly
            sequence_order: sequenceOrder++,
            status: "UNCLAIMED",
          });
        }
      }
    }

    // Insert all service instances
    const { data: serviceBookings, error: serviceBookingsError } =
      await supabase
        .from("service_bookings")
        .insert(serviceBookingsInserts)
        .select();

    if (serviceBookingsError || !serviceBookings) {
      // Rollback: delete the booking if service instances fail
      await supabase.from("booking").delete().eq("id", booking.id);

      console.error("Service bookings creation error:", serviceBookingsError);
      return {
        success: false,
        error: serviceBookingsError?.message ||
          "Failed to create service instances",
      };
    }

    // Mark voucher as used if applied
    if (voucherId) {
      await supabase
        .from("voucher")
        .update({ status: "USED" })
        .eq("id", voucherId);
    }

    // Update customer's last transaction and spent amount
    const { data: customer } = await supabase
      .from("customer")
      .select("spent")
      .eq("id", customerId)
      .single();

    const newSpent = (customer?.spent || 0) + finalTotal;

    await supabase
      .from("customer")
      .update({
        spent: newSpent,
        last_transaction: new Date().toISOString(),
      })
      .eq("id", customerId);

    // Send confirmation email if booking is more than 1 hour away
    // Do this asynchronously so it doesn't block booking creation
    // Using dynamic import to avoid circular dependency issues
    (async () => {
      try {
        // Use dynamic import with error handling to avoid module loading issues
        const emailModule = await import("./emailReminderActions").catch(() => null);
        if (emailModule?.sendBookingConfirmationIfNeeded) {
          await emailModule.sendBookingConfirmationIfNeeded(booking.id).catch((err) => {
            console.error("Error sending confirmation email:", err);
          });
        }
      } catch (error) {
        // Silently fail - email sending is optional and shouldn't block booking creation
        console.warn("Email reminder module not available:", error);
      }
    })();

    return {
      success: true,
      data: {
        booking,
        serviceBookings,
      },
    };
  } catch (error) {
    console.error("Unexpected error creating booking:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Update booking details
 */
export async function updateBookingAction(
  bookingId: number,
  data: UpdateBookingSchema,
) {
  try {
    const validationResult = updateBookingSchema.safeParse(data);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || "Validation error",
      };
    }

    const updateData: Tables<"public", "booking">["Update"] = {};

    if (data.appointmentDate) {
      updateData.appointment_date = data.appointmentDate;
    }
    if (data.appointmentTime) {
      updateData.appointment_time = data.appointmentTime;
    }
    if (data.location) updateData.location = data.location;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.status) {
      updateData.status = data.status;

      // Update status timestamps
      const now = new Date().toISOString();
      if (data.status === "CONFIRMED") {
        updateData.confirmed_at = now;
      } else if (data.status === "IN_PROGRESS") {
        updateData.started_at = now;
      } else if (data.status === "COMPLETED") {
        updateData.completed_at = now;
      } else if (data.status === "CANCELLED") {
        updateData.cancelled_at = now;
      }
    }

    const { data: booking, error } = await supabase
      .from("booking")
      .update(updateData)
      .eq("id", bookingId)
      .select()
      .single();

    if (error || !booking) {
      return {
        success: false,
        error: error?.message || "Failed to update booking",
      };
    }

    return {
      success: true,
      data: booking,
    };
  } catch (error) {
    console.error("Unexpected error updating booking:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get booking with full details (customer, services)
 */
export async function getBookingWithDetails(bookingId: number) {
  try {
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
      `,
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        error: bookingError?.message || "Booking not found",
      };
    }

    return {
      success: true,
      data: booking as BookingWithServices,
    };
  } catch (error) {
    console.error("Unexpected error fetching booking:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get bookings for a specific date
 */
export async function getBookingsByDate(date: string) {
  try {
    const { data: bookings, error } = await supabase
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

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to fetch bookings",
      };
    }

    return {
      success: true,
      data: (bookings || []) as BookingWithServices[],
    };
  } catch (error) {
    console.error("Unexpected error fetching bookings:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get all bookings (for management view)
 */
export async function getAllBookings() {
  try {
    const { data: bookings, error } = await supabase
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
      .order("created_at", { ascending: false });

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to fetch bookings",
      };
    }

    return {
      success: true,
      data: (bookings || []) as BookingWithServices[],
    };
  } catch (error) {
    console.error("Unexpected error fetching all bookings:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Delete a booking
 * First deletes all related service_bookings, then deletes the booking
 */
export async function deleteBookingAction(bookingId: number) {
  try {
    // First, delete all service_bookings that reference this booking
    const { error: serviceBookingsError } = await supabase
      .from("service_bookings")
      .delete()
      .eq("booking_transaction_id", bookingId);

    if (serviceBookingsError) {
      console.error("Error deleting service bookings:", serviceBookingsError);
      return {
        success: false,
        error: serviceBookingsError.message ||
          "Failed to delete related service bookings",
      };
    }

    // Then delete the booking
    const { error } = await supabase
      .from("booking")
      .delete()
      .eq("id", bookingId);

    if (error) {
      return {
        success: false,
        error: error.message || "Failed to delete booking",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Unexpected error deleting booking:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}
