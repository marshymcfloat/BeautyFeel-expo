import type { User } from "@supabase/supabase-js";
import React, { useCallback, useEffect, useState } from "react";
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
  const fetchingEmployeeRef = React.useRef<Set<string>>(new Set());

  const fetchEmployeeData = useCallback(async (userId: string) => {
    if (!userId) {
      setEmployee(null);
      return;
    }

    // Prevent duplicate fetches for the same user using ref
    if (fetchingEmployeeRef.current.has(userId)) {
      return;
    }

    fetchingEmployeeRef.current.add(userId);

    try {
      const result = await getEmployeeByUserId(userId);
      // Always set employee based on result, even if null
      // This prevents infinite loops by ensuring state is always updated
      setEmployee(result.data || null);
    } catch (error) {
      // Silently handle errors - employee data is optional
      setEmployee(null);
    } finally {
      // Keep userId in set for a short time to prevent rapid re-fetches
      // This helps prevent spam when server is down
      setTimeout(() => {
        fetchingEmployeeRef.current.delete(userId);
      }, 10000); // Wait 10 seconds before allowing re-fetch
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let hasInitialized = false;
    let isUpdatingState = false;
    let lastUpdateUserId: string | null = null;

    // Helper function to update user state
    const updateUserState = async (session: any) => {
      if (!mounted) return;
      
      // Don't process if already updating (unless it's a different user)
      const currentUser = session?.user ?? null;
      const currentUserId = currentUser?.id ?? null;
      
      if (isUpdatingState && lastUpdateUserId === currentUserId) {
        return;
      }

      isUpdatingState = true;
      lastUpdateUserId = currentUserId;

      if (currentUser) {
        try {
          // Set user immediately from session (don't wait for verification)
          if (mounted) {
            setUser(currentUser);
            setLoading(false);
          }

          // Verify the session in background (don't block) - but catch errors gracefully
          supabase.auth.getUser().then(
            ({ data: { user: verifiedUser }, error: verifyError }) => {
              if (!mounted) return;

              // Handle JSON parse errors and 500 errors gracefully
              if (verifyError) {
                const errorMsg = verifyError.message || "";
                if (errorMsg.includes("JSON Parse") || errorMsg.includes("<html>") || errorMsg.includes("500")) {
                  // Silently handle server errors - they're expected during server issues
                  // Don't sign out on server errors, just use the session user
                  isUpdatingState = false;
                  return;
                }
                
                // Only sign out on real auth errors
                if (verifyError.message !== "session_not_found") {
                  console.error("User verification failed:", verifyError);
                  supabase.auth.signOut().catch(() => {});
                  if (mounted) {
                    setUser(null);
                    setEmployee(null);
                    setLoading(false);
                  }
                }
                isUpdatingState = false;
                return;
              }

              // Update with verified user if different
              if (
                mounted && verifiedUser && verifiedUser.id !== currentUser.id
              ) {
                setUser(verifiedUser);
                // Fetch employee for verified user if different
                // Only fetch if we haven't already fetched for this user
                if (!fetchingEmployeeRef.current.has(verifiedUser.id)) {
                  fetchEmployeeData(verifiedUser.id).catch(() => {
                    if (mounted) setEmployee(null);
                  });
                }
              }
              isUpdatingState = false;
            },
          ).catch((error) => {
            // Silently handle verification errors - continue with session user
            isUpdatingState = false;
          });

          // Fetch employee data in background - don't block redirect
          // Only fetch if we haven't already fetched for this user
          if (!fetchingEmployeeRef.current.has(currentUser.id)) {
            fetchEmployeeData(currentUser.id).catch((err) => {
              // Silently handle errors - employee data is optional
              if (mounted) {
                setEmployee(null);
              }
            });
          }
        } catch (error) {
          console.error("Error in updateUserState:", error);
          if (mounted) {
            setUser(null);
            setEmployee(null);
            setLoading(false);
          }
          isUpdatingState = false;
        }
      } else {
        console.log("No user in session, clearing state");
        if (mounted) {
          setUser(null);
          setEmployee(null);
          setLoading(false);
        }
        isUpdatingState = false;
        lastUpdateUserId = null;
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

      // Only log important events to reduce noise
      if (event !== "INITIAL_SESSION") {
        console.log("Auth state changed:", event, "Has session:", !!session);
      }

      // Clear timeout since we got an auth state change
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Handle specific events
      if (event === "SIGNED_OUT") {
        // Always allow sign out - reset all flags and state immediately
        isUpdatingState = false;
        lastUpdateUserId = null;
        fetchingEmployeeRef.current.clear();
        hasInitialized = false; // Reset initialization flag
        if (mounted) {
          setUser(null);
          setEmployee(null);
          setLoading(false);
        }
        // Don't call updateUserState for sign out
        return;
      } else if (event === "INITIAL_SESSION") {
        // Only process INITIAL_SESSION once - ignore subsequent INITIAL_SESSION events
        if (!hasInitialized) {
          // Reset flags before processing initial session
          isUpdatingState = false;
          lastUpdateUserId = null;
          await updateUserState(session);
          hasInitialized = true;
        }
        // Don't process INITIAL_SESSION if already initialized
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Reset flags for new sign-in
        isUpdatingState = false;
        lastUpdateUserId = null;
        fetchingEmployeeRef.current.clear();
        await updateUserState(session);
      } else {
        // For other events, only update if not already updating
        if (!isUpdatingState) {
          await updateUserState(session);
        }
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
