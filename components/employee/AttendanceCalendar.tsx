import { getEmployeeAttendance } from "@/lib/actions/attendanceActions";
import { useAuth } from "@/lib/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon } from "lucide-react-native";
import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View, Platform } from "react-native";

interface AttendanceCalendarProps {
  month?: number; // 0-11 (JavaScript month index)
  year?: number;
}

export default function AttendanceCalendar({
  month: propMonth,
  year: propYear,
}: AttendanceCalendarProps) {
  const { employee } = useAuth();
  const today = new Date();
  const currentMonth = propMonth ?? today.getMonth();
  const currentYear = propYear ?? today.getFullYear();

  // Calculate start and end dates for the month
  const startDate = new Date(currentYear, currentMonth, 1)
    .toISOString()
    .split("T")[0];
  const endDate = new Date(currentYear, currentMonth + 1, 0)
    .toISOString()
    .split("T")[0];

  // Fetch attendance records for the month
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["employee-attendance", employee?.id, startDate, endDate],
    queryFn: () =>
      getEmployeeAttendance(employee?.id || "", startDate, endDate),
    enabled: !!employee?.id,
  });

  // Create a map of dates to attendance status
  const attendanceMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (attendanceData?.success && attendanceData.data) {
      attendanceData.data.forEach((record) => {
        map.set(record.attendance_date, record.is_present);
      });
    }
    return map;
  }, [attendanceData]);

  // Get days in month and first day of month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days: Array<{ day: number; date: string; isPresent?: boolean }> = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: 0, date: "" });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(currentYear, currentMonth, day)
        .toISOString()
        .split("T")[0];
      const isPresent = attendanceMap.get(dateStr);
      days.push({
        day,
        date: dateStr,
        isPresent: isPresent !== undefined ? isPresent : undefined,
      });
    }

    return days;
  }, [daysInMonth, firstDayOfMonth, currentYear, currentMonth, attendanceMap]);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIconWrapper}>
          <CalendarIcon size={22} color="#ec4899" />
        </View>
        <Text style={styles.title}>
          {monthNames[currentMonth]} {currentYear}
        </Text>
      </View>

      {/* Day headers */}
      <View style={styles.dayHeaders}>
        {dayNames.map((day) => (
          <View key={day} style={styles.dayHeader}>
            <Text style={styles.dayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((item, index) => {
          if (item.day === 0) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const isToday = item.date === today.toISOString().split("T")[0];
          const hasAttendance = item.isPresent !== undefined;
          const isPresent = item.isPresent === true;

          return (
            <View
              key={item.date}
              style={[
                styles.dayCell,
                isToday && styles.todayCell,
                hasAttendance && !isPresent && styles.absentCell,
                hasAttendance && isPresent && styles.presentCell,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  isToday && styles.todayText,
                  hasAttendance && !isPresent && styles.absentText,
                  hasAttendance && isPresent && styles.presentText,
                ]}
              >
                {item.day}
              </Text>
              {hasAttendance && (
                <View
                  style={[
                    styles.statusIndicator,
                    isPresent ? styles.presentDot : styles.absentDot,
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.presentDot]} />
          <Text style={styles.legendText}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.absentDot]} />
          <Text style={styles.legendText}>Absent</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.noDataDot]} />
          <Text style={styles.legendText}>No Data</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#ec4899",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  dayHeaders: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ec4899",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  headerIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fdf2f8",
    alignItems: "center",
    justifyContent: "center",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    padding: 4,
    borderRadius: 12,
  },
  dayText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  todayCell: {
    backgroundColor: "#fdf2f8",
    borderWidth: 2,
    borderColor: "#ec4899",
  },
  todayText: {
    fontWeight: "800",
    color: "#ec4899",
  },
  presentCell: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1.5,
    borderColor: "#10b981",
  },
  presentText: {
    color: "#059669",
    fontWeight: "700",
  },
  absentCell: {
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderColor: "#ef4444",
  },
  absentText: {
    color: "#dc2626",
    fontWeight: "700",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  presentDot: {
    backgroundColor: "#16a34a",
  },
  absentDot: {
    backgroundColor: "#dc2626",
  },
  noDataDot: {
    backgroundColor: "#9ca3af",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1.5,
    borderTopColor: "#f3f4f6",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
});
