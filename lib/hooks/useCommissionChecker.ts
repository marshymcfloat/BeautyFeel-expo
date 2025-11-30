import { useEffect, useRef } from "react";
import { checkAndApplyCommissions } from "../actions/commissionActions";

/**
 * Hook to periodically check and apply commissions for bookings
 * This checks bookings where all services are served to see if commissions should be applied
 */
export function useCommissionChecker(intervalMs: number = 60000) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkCommissions = async () => {
      // This would ideally fetch bookings that need commission checks
      // For now, we'll rely on the manual check when services are marked as served
      // This hook can be extended to periodically check pending commissions
    };

    // Set up interval
    intervalRef.current = setInterval(checkCommissions, intervalMs);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMs]);

  return {
    checkCommissions: checkAndApplyCommissions,
  };
}

