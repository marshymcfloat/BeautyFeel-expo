import { supabase } from "../utils/supabase";
import { authLoginSchema, LoginSchemaTypes } from "../zod-schemas/auth";

export async function authLoginAction(data: LoginSchemaTypes) {
  try {
    const validationResult = authLoginSchema.safeParse(data);

    if (!validationResult.success) {
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || "Validation error",
      };
    }

    const { email, password } = validationResult.data;
    const { data: user, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message || "Authentication error" };
    }

    return { success: true, message: "Login successful" };
  } catch (error) {
    console.error(error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
