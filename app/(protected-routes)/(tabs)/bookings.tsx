import { LinearGradient } from "expo-linear-gradient";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
} from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

interface BookingCardProps {
  clientName: string;
  service: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  status: "confirmed" | "pending" | "completed";
}

function BookingCard({
  clientName,
  service,
  date,
  time,
  duration,
  location,
  status,
}: BookingCardProps) {
  const statusStyles = {
    confirmed: {
      bg: "bg-green-50",
      text: "text-green-600",
      label: "Confirmed",
    },
    pending: { bg: "bg-amber-50", text: "text-amber-600", label: "Pending" },
    completed: {
      bg: "bg-gray-100",
      text: "text-gray-600",
      label: "Completed",
    },
  };

  const style = statusStyles[status];

  return (
    <View className="bg-white rounded-2xl p-5 mb-4">
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-row items-center flex-1">
          <View className="w-14 h-14 rounded-full overflow-hidden">
            <LinearGradient
              colors={["#ec4899", "#d946ef"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="w-full h-full items-center justify-center"
            >
              <Text className="text-white font-bold text-xl">
                {clientName.charAt(0)}
              </Text>
            </LinearGradient>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-gray-900 font-bold text-lg">{clientName}</Text>
            <Text className="text-pink-500 font-medium">{service}</Text>
          </View>
        </View>
        <View className={`px-3 py-1.5 rounded-full ${style.bg}`}>
          <Text className={`text-sm font-medium ${style.text}`}>
            {style.label}
          </Text>
        </View>
      </View>

      <View className="bg-gray-50 rounded-xl p-4">
        <View className="flex-row items-center mb-3">
          <Calendar size={16} color="#6B7280" />
          <Text className="text-gray-600 ml-2">{date}</Text>
        </View>
        <View className="flex-row items-center mb-3">
          <Clock size={16} color="#6B7280" />
          <Text className="text-gray-600 ml-2">
            {time} • {duration}
          </Text>
        </View>
        <View className="flex-row items-center">
          <MapPin size={16} color="#6B7280" />
          <Text className="text-gray-600 ml-2">{location}</Text>
        </View>
      </View>

      {status !== "completed" && (
        <View className="flex-row mt-4 gap-3">
          <Pressable className="flex-1 bg-gray-100 py-3 rounded-xl active:bg-gray-200">
            <Text className="text-gray-700 font-semibold text-center">
              Reschedule
            </Text>
          </Pressable>
          <Pressable className="flex-1 rounded-xl overflow-hidden active:opacity-90">
            <LinearGradient
              colors={["#ec4899", "#d946ef"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="py-3"
            >
              <Text className="text-white font-semibold text-center">
                Start Session
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function DaySelector() {
  const [selectedDay, setSelectedDay] = useState(2);

  const days = [
    { day: "Mon", date: 18 },
    { day: "Tue", date: 19 },
    { day: "Wed", date: 20 },
    { day: "Thu", date: 21 },
    { day: "Fri", date: 22 },
    { day: "Sat", date: 23 },
    { day: "Sun", date: 24 },
  ];

  return (
    <View className="mb-6">
      <View className="flex-row justify-between items-center px-6 mb-4">
        <Pressable className="w-8 h-8 rounded-full bg-white items-center justify-center">
          <ChevronLeft size={18} color="#374151" />
        </Pressable>
        <Text className="text-gray-900 font-bold text-lg">November 2024</Text>
        <Pressable className="w-8 h-8 rounded-full bg-white items-center justify-center">
          <ChevronRight size={18} color="#374151" />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {days.map((item, index) => {
          const isSelected = index === selectedDay;
          return (
            <Pressable
              key={index}
              onPress={() => setSelectedDay(index)}
              className="mx-2"
            >
              {isSelected ? (
                <LinearGradient
                  colors={["#ec4899", "#d946ef"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="w-14 h-20 rounded-2xl items-center justify-center"
                >
                  <Text className="text-white/80 text-sm">{item.day}</Text>
                  <Text className="text-white font-bold text-xl">
                    {item.date}
                  </Text>
                </LinearGradient>
              ) : (
                <View className="w-14 h-20 rounded-2xl bg-white items-center justify-center">
                  <Text className="text-gray-500 text-sm">{item.day}</Text>
                  <Text className="text-gray-900 font-bold text-xl">
                    {item.date}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function BookingsScreen() {
  const bookings: BookingCardProps[] = [
    {
      clientName: "Emma Wilson",
      service: "Hair Coloring",
      date: "Wednesday, Nov 20",
      time: "10:00 AM",
      duration: "2 hours",
      location: "Salon Studio A",
      status: "confirmed",
    },
    {
      clientName: "Sarah Davis",
      service: "Manicure & Pedicure",
      date: "Wednesday, Nov 20",
      time: "1:00 PM",
      duration: "1.5 hours",
      location: "Nail Station B",
      status: "pending",
    },
    {
      clientName: "Lisa Chen",
      service: "Full Makeover",
      date: "Wednesday, Nov 20",
      time: "4:00 PM",
      duration: "3 hours",
      location: "VIP Suite",
      status: "confirmed",
    },
  ];

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 pt-4 pb-6">
          <View>
            <Text className="text-3xl font-bold text-gray-900">Bookings</Text>
            <Text className="text-gray-500 mt-1">Manage your appointments</Text>
          </View>
          <Pressable className="w-12 h-12 rounded-full overflow-hidden active:opacity-90">
            <LinearGradient
              colors={["#ec4899", "#d946ef"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="w-full h-full items-center justify-center"
            >
              <Plus size={24} color="white" />
            </LinearGradient>
          </Pressable>
        </View>

        {/* Day Selector */}
        <DaySelector />

        {/* Bookings List */}
        <View className="px-6">
          <Text className="text-gray-500 font-medium mb-4">
            3 appointments today
          </Text>
          {bookings.map((booking, index) => (
            <BookingCard key={index} {...booking} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
