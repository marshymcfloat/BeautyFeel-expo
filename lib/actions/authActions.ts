import { supabase } from "../utils/supabase";
import { authLoginSchema, LoginSchemaTypes } from "../zod-schemas/auth";

export async function authLoginAction(data: LoginSchemaTypes) {
  try {
    console.log("Starting login action...");
    const validationResult = authLoginSchema.safeParse(data);

    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error);
      return {
        success: false,
        error: validationResult.error.errors[0]?.message || "Validation error",
      };
    }

    const { email, password } = validationResult.data;
    console.log("Attempting to sign in with email:", email);
    
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message || "Authentication error" };
    }

    console.log("Login successful, user:", authData.user?.id);
    return { success: true, message: "Login successful" };
  } catch (error) {
    console.error("Unexpected login error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unexpected error occurred" 
    };
  }
}
