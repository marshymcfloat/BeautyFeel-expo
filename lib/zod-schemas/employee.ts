import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
    .optional(),
  role: z.enum(["OWNER", "CASHIER", "MASSEUSE", "WORKER"]),
  salary: z.coerce.number().min(0, "Salary must be 0 or greater").default(0),
  commission_rate: z.coerce
    .number()
    .min(0, "Commission rate must be between 0 and 100")
    .max(100, "Commission rate must be between 0 and 100")
    .default(0),
  daily_rate: z.coerce.number().min(0, "Daily rate must be 0 or greater")
    .optional(),
  can_request_payslip: z.boolean().default(true),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

// Schema for updating (password is optional)
export const employeeUpdateSchema = employeeSchema.partial().extend({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(8, "Password must be at least 8 characters")
    .optional().nullable(),
});

export type EmployeeUpdateFormData = z.infer<typeof employeeUpdateSchema>;
