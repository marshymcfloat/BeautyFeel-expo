import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Clear all Supabase session data from storage
 * This is useful for debugging or when a user is deleted
 */
export async function clearSession() {
  try {
    if (Platform.OS === "web") {
      // Clear from localStorage on web
      if (typeof window !== "undefined") {
        // Clear Supabase session keys
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (key.includes("supabase") || key.includes("auth")) {
            localStorage.removeItem(key);
          }
        });
      }
    } else {
      // Clear from AsyncStorage on native
      const allKeys = await AsyncStorage.getAllKeys();
      const supabaseKeys = allKeys.filter(
        (key) => key.includes("supabase") || key.includes("auth")
      );
      if (supabaseKeys.length > 0) {
        await AsyncStorage.multiRemove(supabaseKeys);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error clearing session:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to clear session",
    };
  }
}

