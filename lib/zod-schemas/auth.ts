import { z } from "zod";

export const authLoginSchema = z.object({
  email: z
    .string()
    .email()
    .min(1, { message: "Email is required" })
    .max(100, { message: "Email must be less than 100 characters" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
});

export type LoginSchemaTypes = z.infer<typeof authLoginSchema>;
