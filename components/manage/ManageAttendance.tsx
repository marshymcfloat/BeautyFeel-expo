import AttendanceManager from "@/components/attendance/AttendanceManager";
import type { Database } from "@/database.types";
import { getAllEmployeesForAttendance } from "@/lib/actions/attendanceActions";
import { useAuth } from "@/lib/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect } from "react";
import { getPhilippineDate } from "@/lib/utils/dateTime";

type Branch = Database["public"]["Enums"]["branch"];

export default function ManageAttendance({
  onRefetchReady,
}: {
  onRefetchReady?: (refetch: () => Promise<any>) => void;
}) {
  const { employee } = useAuth();
  const ownerBranch = (employee?.branch as Branch) || null;
  const today = getPhilippineDate();

  const { refetch } = useQuery({
    queryKey: ["employees-attendance", today, ownerBranch],
    queryFn: () => getAllEmployeesForAttendance(ownerBranch),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (onRefetchReady) {
      onRefetchReady(refetch);
    }
  }, [onRefetchReady, refetch]);

  return <AttendanceManager ownerBranch={ownerBranch} />;
}

