import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import {
  type EmployeeWithRole,
  getEmployeeByUserId,
} from "../actions/employeeActions";
import { supabase } from "../utils/supabase";

export interface AuthUser {
  user: User | null;
  employee: EmployeeWithRole | null;
  role: "OWNER" | "CASHIER" | "WORKER" | "MASSEUSE" | null;
  hasRole: (
    role:
      | "owner"
      | "cashier"
      | "worker"
      | "masseuse"
      | "OWNER"
      | "CASHIER"
      | "WORKER"
      | "MASSEUSE",
  ) => boolean;
  loading: boolean;
}

export function useAuth(): AuthUser {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<EmployeeWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEmployeeData = useCallback(async (userId: string) => {
    try {
      const result = await getEmployeeByUserId(userId);
      if (result.success && result.data) {
        setEmployee(result.data);
      } else {
        // No employee record found - this is OK, just set to null
        setEmployee(null);
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
      // Don't block on employee data fetch failure - set to null and continue
      setEmployee(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let hasInitialized = false;

    // Helper function to update user state
    const updateUserState = async (session: any) => {
      if (!mounted) return;

      console.log("updateUserState called, has session:", !!session);
      const currentUser = session?.user ?? null;

      if (currentUser) {
        console.log("Session has user, ID:", currentUser.id);
        try {
          // Set user immediately from session (don't wait for verification)
          if (mounted) {
            console.log("Setting user from session immediately");
            setUser(currentUser);
            setLoading(false);
          }

          // Verify the session in background (don't block)
          supabase.auth.getUser().then(
            ({ data: { user: verifiedUser }, error: verifyError }) => {
              if (!mounted) return;

              if (verifyError || !verifiedUser) {
                console.error("User verification failed:", verifyError);
                // Only sign out if there's a real error, not just a delay
                if (
                  verifyError && verifyError.message !== "session_not_found"
                ) {
                  supabase.auth.signOut();
                  setUser(null);
                  setEmployee(null);
                  setLoading(false);
                }
                return;
              }

              // Update with verified user if different
              if (
                mounted && verifiedUser && verifiedUser.id !== currentUser.id
              ) {
                console.log("Updating with verified user");
                setUser(verifiedUser);
              }
            },
          ).catch((error) => {
            console.error("Error in background user verification:", error);
            // Don't block on verification errors
          });

          // Fetch employee data in background - don't block redirect
          fetchEmployeeData(currentUser.id).catch((err) => {
            console.error("Error fetching employee data:", err);
            if (mounted) {
              setEmployee(null);
            }
          });
        } catch (error) {
          console.error("Error in updateUserState:", error);
          if (mounted) {
            setUser(null);
            setEmployee(null);
            setLoading(false);
          }
        }
      } else {
        console.log("No user in session, clearing state");
        if (mounted) {
          setUser(null);
          setEmployee(null);
          setLoading(false);
        }
      }
    };

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;

      // Clear timeout since we got a response
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Handle session errors
      if (error) {
        console.error("Session error:", error);
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error("Error signing out:", signOutError);
        }
        if (mounted) {
          setUser(null);
          setEmployee(null);
          setLoading(false);
        }
        hasInitialized = true;
        return;
      }

      await updateUserState(session);
      hasInitialized = true;
    }).catch((error) => {
      console.error("Unexpected error getting session:", error);
      if (mounted) {
        setUser(null);
        setEmployee(null);
        setLoading(false);
      }
      hasInitialized = true;
    });

    // Set a timeout to prevent infinite loading (max 10 seconds)
    timeoutId = setTimeout(() => {
      if (mounted && !hasInitialized) {
        console.warn("Session check timeout, clearing loading state");
        setLoading(false);
        hasInitialized = true;
      }
    }, 10000);

    // Listen for auth changes - this is critical for detecting login
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log("Auth state changed:", event, "Has session:", !!session);

      // Clear timeout since we got an auth state change
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Handle specific events
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await updateUserState(session);
      } else if (event === "SIGNED_OUT") {
        if (mounted) {
          setUser(null);
          setEmployee(null);
          setLoading(false);
        }
      } else {
        // For other events, update state normally
        await updateUserState(session);
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.unsubscribe();
    };
  }, [fetchEmployeeData]);

  // Helper function to check if user has a specific role
  // Accepts both lowercase and uppercase role names for convenience
  const hasRole = (
    role:
      | "owner"
      | "cashier"
      | "worker"
      | "masseuse"
      | "OWNER"
      | "CASHIER"
      | "WORKER"
      | "MASSEUSE",
  ): boolean => {
    if (!employee || !employee.role) return false;
    // Normalize role to uppercase for comparison (database stores uppercase)
    const normalizedRole = role.toUpperCase() as
      | "OWNER"
      | "CASHIER"
      | "WORKER"
      | "MASSEUSE";
    return employee.role === normalizedRole;
  };

  return {
    user,
    employee,
    role: employee?.role ?? null,
    hasRole,
    loading,
  };
}
