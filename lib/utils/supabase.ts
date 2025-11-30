import { createClient, processLock } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

// Lazy load AsyncStorage to avoid SSR issues
let AsyncStorage: any = null;
const getAsyncStorage = () => {
  if (AsyncStorage) return AsyncStorage;

  // Only import AsyncStorage when actually needed and in a client environment
  if (typeof window === "undefined" && Platform.OS === "web") {
    return null;
  }

  try {
    // Use require for conditional import to avoid top-level import issues
    AsyncStorage = require("@react-native-async-storage/async-storage").default;
    return AsyncStorage;
  } catch (error) {
    console.warn("AsyncStorage not available:", error);
    return null;
  }
};

let supabaseClient: ReturnType<typeof createClient> | null = null;

const getSupabaseClient = () => {
  if (supabaseClient) {
    return supabaseClient;
  }

  // Only initialize on client side (not during SSR)
  if (typeof window === "undefined" && Platform.OS === "web") {
    throw new Error(
      "Supabase client can only be initialized on the client side"
    );
  }

  const storage =
    Platform.OS === "web"
      ? typeof window !== "undefined"
        ? window.localStorage
        : undefined
      : getAsyncStorage();

  // Check for required environment variables
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const errorMessage = `Missing Supabase environment variables. 
Please ensure you have EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY set in your .env file or environment variables.

Current values:
- EXPO_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "✅ Set" : "❌ Missing"}
- EXPO_PUBLIC_SUPABASE_KEY: ${supabaseKey ? "✅ Set" : "❌ Missing"}

On Android, make sure to restart the development server after adding environment variables.`;
    
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: storage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });

  return supabaseClient;
};

// Lazy initialization proxy - only creates client when first accessed
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    try {
      const client = getSupabaseClient();
      const value = client[prop as keyof ReturnType<typeof createClient>];
      if (typeof value === "function") {
        return value.bind(client);
      }
      return value;
    } catch (error) {
      // If client can't be created (e.g., during SSR), return a no-op
      if (error instanceof Error && error.message.includes("client side")) {
        console.warn("Supabase client not available in this environment");
        return () => {};
      }
      throw error;
    }
  },
});
