import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import { formatDateString } from "@/lib/utils/dateTime";
import { COLORS, GRADIENT_COLORS } from "@/lib/utils/constants";

interface DaySelectorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function DaySelector({ selectedDate, onDateChange }: DaySelectorProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today);

  const days = useMemo(() => {
    const daysArray = [];
    const startOfWeek = new Date(currentMonth);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      daysArray.push({
        date: date,
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        dateNum: date.getDate(),
        dateString: formatDateString(date),
        isToday: formatDateString(date) === formatDateString(today),
      });
    }
    return daysArray;
  }, [currentMonth]);

  const previousWeek = () => {
    const newDate = new Date(currentMonth);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentMonth(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentMonth);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentMonth(newDate);
  };

  const monthYear = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <View style={styles.daySelector}>
      <View style={styles.daySelectorHeader}>
        <Pressable
          onPress={previousWeek}
          style={({ pressed }) => [
            styles.daySelectorButton,
            pressed && styles.daySelectorButtonPressed,
          ]}
        >
          <ChevronLeft size={20} color="#374151" />
        </Pressable>
        <Text style={styles.monthYearText}>{monthYear}</Text>
        <Pressable
          onPress={nextWeek}
          style={({ pressed }) => [
            styles.daySelectorButton,
            pressed && styles.daySelectorButtonPressed,
          ]}
        >
          <ChevronRight size={20} color="#374151" />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayScrollContent}
      >
        {days.map((item) => {
          const isSelected = item.dateString === selectedDate;
          return (
            <Pressable
              key={item.dateString}
              onPress={() => onDateChange(item.dateString)}
              style={styles.dayItem}
            >
              {isSelected ? (
                <LinearGradient
                  colors={GRADIENT_COLORS.primaryShort}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.daySelectedGradient}
                >
                  <Text style={styles.daySelectedDay}>{item.day}</Text>
                  <Text style={styles.daySelectedDate}>{item.dateNum}</Text>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.dayUnselected,
                    item.isToday && styles.dayUnselectedToday,
                  ]}
                >
                  <Text style={styles.dayUnselectedDay}>{item.day}</Text>
                  <Text style={styles.dayUnselectedDate}>{item.dateNum}</Text>
                  {item.isToday && <View style={styles.todayIndicator} />}
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  daySelector: {
    backgroundColor: "white",
    marginHorizontal: 24,
    marginBottom: 20,
    paddingBottom: 20,
    paddingTop: 20,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  daySelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  daySelectorButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  daySelectorButtonPressed: {
    backgroundColor: "#e5e7eb",
    transform: [{ scale: 0.95 }],
  },
  monthYearText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 18,
    letterSpacing: -0.3,
  },
  dayScrollContent: {
    paddingHorizontal: 16,
  },
  dayItem: {
    marginHorizontal: 6,
  },
  daySelectedGradient: {
    width: 60,
    height: 84,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  daySelectedDay: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  daySelectedDate: {
    color: "white",
    fontWeight: "bold",
    fontSize: 24,
    marginTop: 4,
  },
  dayUnselected: {
    width: 60,
    height: 84,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayUnselectedToday: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.backgroundLight,
  },
  dayUnselectedDay: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  dayUnselectedDate: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: 22,
    marginTop: 4,
  },
  todayIndicator: {
    position: "absolute",
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
});

