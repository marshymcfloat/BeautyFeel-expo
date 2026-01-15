import { z } from "zod";

// Service item in booking (with quantity)
export const bookingServiceSchema = z.object({
  serviceId: z.number().int().positive({ message: "Service is required" }),
  quantity: z
    .number()
    .int()
    .positive({ message: "Quantity must be at least 1" })
    .max(10, { message: "Quantity cannot exceed 10" }),
});

// Service Set item in booking (with quantity)
export const bookingServiceSetSchema = z.object({
  serviceSetId: z.number().int().positive({
    message: "Service set is required",
  }),
  quantity: z
    .number()
    .int()
    .positive({ message: "Quantity must be at least 1" })
    .max(10, { message: "Quantity cannot exceed 10" }),
});

// Main booking schema
export const createBookingSchema = z.object({
  customerId: z.number().int().nonnegative().optional(), // 0 or null means new customer
  customerName: z.string().optional(), // Will be validated in refine
  appointmentDate: z.string().min(1, {
    message: "Appointment date is required",
  }),
  appointmentTime: z.string().min(1, {
    message: "Appointment time is required",
  }),
  branch: z.enum(["NAILS", "SKIN", "LASHES", "MASSAGE"], {
    required_error: "Branch is required",
    invalid_type_error: "Please select a valid branch",
  }),
  customerEmail: z.string().email({
    message: "Please enter a valid email address",
  }).optional().or(z.literal("")),
  services: z
    .array(bookingServiceSchema)
    .optional()
    .default([]),
  serviceSets: z
    .array(bookingServiceSetSchema)
    .optional()
    .default([]),
  notes: z.string().optional(),
  voucherCode: z.string().optional(), // Keep for backward compatibility, but prefer voucher + grandDiscount
  voucher: z.number().int().positive().nullable().optional(), // Voucher ID
  grandDiscount: z.number().min(0).optional().default(0), // Discount amount from voucher
  applyDiscount: z.boolean().optional().default(true),
}).refine((data) => {
  // Either customerId (existing) or customerName (new) must be provided
  const hasCustomerId = data.customerId && data.customerId > 0;
  const hasCustomerName = data.customerName &&
    data.customerName.trim().length > 0;
  return hasCustomerId || hasCustomerName;
}, {
  message: "Customer name is required",
  path: ["customerName"], // Error will show on customerName field for better UX
}).refine((data) => {
  // At least one service or service set must be provided
  const hasServices = data.services && data.services.length > 0;
  const hasServiceSets = data.serviceSets && data.serviceSets.length > 0;
  return hasServices || hasServiceSets;
}, {
  message: "At least one service or service set is required",
  path: ["services"], // Error will show on services field
});

export type CreateBookingSchema = z.infer<typeof createBookingSchema>;
export type BookingServiceSchema = z.infer<typeof bookingServiceSchema>;
export type BookingServiceSetSchema = z.infer<typeof bookingServiceSetSchema>;

// Update booking schema
export const updateBookingSchema = z.object({
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
  branch: z.enum(["NAILS", "SKIN", "LASHES", "MASSAGE"]).optional(),
  notes: z.string().optional(),
  status: z
    .enum([
      "PENDING",
      "CONFIRMED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ])
    .optional(),
});

export type UpdateBookingSchema = z.infer<typeof updateBookingSchema>;

// Service instance status enum
export const serviceInstanceStatusSchema = z.enum([
  "UNCLAIMED",
  "CLAIMED",
  "SERVED",
]);

export type ServiceInstanceStatus = z.infer<typeof serviceInstanceStatusSchema>;
