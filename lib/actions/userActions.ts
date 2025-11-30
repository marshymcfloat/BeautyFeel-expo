import { supabase } from "../utils/supabase";

/**
 * Get user email by user ID
 * This is a helper function to get user information
 */
export async function getUserEmail(userId: string) {
  try {
    // We can get the current user's email directly
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    // If it's the current user, return their email
    if (currentUser?.id === userId) {
      return {
        success: true,
        data: currentUser.email || null,
      };
    }

    // For other users, we'll need to use a database function or store emails in employee table
    // For now, return null and we'll use employee ID as fallback
    return {
      success: true,
      data: null,
    };
  } catch (error) {
    console.error("Error getting user email:", error);
    return {
      success: false,
      error: "Failed to get user email",
    };
  }
}

