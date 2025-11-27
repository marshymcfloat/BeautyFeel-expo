import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  Calendar,
  ChevronRight,
  Clock,
  Scissors,
  Sparkles,
  Star,
} from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

interface ServiceCardProps {
  title: string;
  duration: string;
  price: string;
  icon: React.ReactNode;
  gradient: readonly [string, string];
}

function ServiceCard({
  title,
  duration,
  price,
  icon,
  gradient,
}: ServiceCardProps) {
  return (
    <Pressable className="w-36 mr-4 active:opacity-90">
      <View className="rounded-2xl overflow-hidden">
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="p-4 h-40 justify-between"
        >
          <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center">
            {icon}
          </View>
          <View>
            <Text className="text-white font-bold text-base">{title}</Text>
            <Text className="text-white/80 text-sm">{duration}</Text>
            <Text className="text-white font-bold mt-1">{price}</Text>
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

interface AppointmentCardProps {
  clientName: string;
  service: string;
  time: string;
  status: "upcoming" | "completed" | "cancelled";
}

function AppointmentCard({
  clientName,
  service,
  time,
  status,
}: AppointmentCardProps) {
  const statusColors = {
    upcoming: { bg: "bg-blue-50", text: "text-blue-600", label: "Upcoming" },
    completed: {
      bg: "bg-green-50",
      text: "text-green-600",
      label: "Completed",
    },
    cancelled: { bg: "bg-red-50", text: "text-red-600", label: "Cancelled" },
  };

  const statusStyle = statusColors[status];

  return (
    <View className="bg-white rounded-2xl p-4 mb-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-12 h-12 rounded-full overflow-hidden">
            <LinearGradient
              colors={["#f9a8d4", "#d8b4fe"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="w-full h-full items-center justify-center"
            >
              <Text className="text-white font-bold text-lg">
                {clientName.charAt(0)}
              </Text>
            </LinearGradient>
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-gray-900 font-semibold">{clientName}</Text>
            <Text className="text-gray-500 text-sm">{service}</Text>
          </View>
        </View>
        <View className="items-end">
          <View className={`px-2 py-1 rounded-full ${statusStyle.bg}`}>
            <Text className={`text-xs font-medium ${statusStyle.text}`}>
              {statusStyle.label}
            </Text>
          </View>
          <View className="flex-row items-center mt-1">
            <Clock size={12} color="#9CA3AF" />
            <Text className="text-gray-400 text-xs ml-1">{time}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const services: ServiceCardProps[] = [
    {
      title: "Haircut",
      duration: "45 min",
      price: "$45",
      icon: <Scissors size={20} color="white" />,
      gradient: ["#ec4899", "#f472b6"] as const,
    },
    {
      title: "Coloring",
      duration: "2 hours",
      price: "$120",
      icon: <Sparkles size={20} color="white" />,
      gradient: ["#a855f7", "#c084fc"] as const,
    },
    {
      title: "Styling",
      duration: "1 hour",
      price: "$75",
      icon: <Star size={20} color="white" />,
      gradient: ["#f97316", "#fb923c"] as const,
    },
    {
      title: "Treatment",
      duration: "1.5 hours",
      price: "$90",
      icon: <Sparkles size={20} color="white" />,
      gradient: ["#06b6d4", "#22d3ee"] as const,
    },
  ];

  const appointments: AppointmentCardProps[] = [
    {
      clientName: "Sarah Johnson",
      service: "Hair Coloring & Styling",
      time: "10:00 AM",
      status: "upcoming",
    },
    {
      clientName: "Emily Davis",
      service: "Haircut",
      time: "11:30 AM",
      status: "upcoming",
    },
    {
      clientName: "Maria Garcia",
      service: "Full Treatment",
      time: "2:00 PM",
      status: "upcoming",
    },
  ];

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 pt-4 pb-6">
        <View>
          <Text className="text-gray-500">Welcome back,</Text>
          <Text className="text-2xl font-bold text-gray-900">Jane</Text>
        </View>
        <Pressable className="w-10 h-10 rounded-full bg-white items-center justify-center">
          <Bell size={20} color="#374151" />
        </Pressable>
      </View>

      {/* Today's Summary Card */}
      <View className="mx-6 mb-6 rounded-3xl overflow-hidden">
        <LinearGradient
          colors={["#ec4899", "#d946ef"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="p-6"
        >
          <View className="flex-row items-center mb-4">
            <Calendar size={20} color="white" />
            <Text className="text-white font-medium ml-2">Today&apos;s Summary</Text>
          </View>
          <View className="flex-row justify-between">
            <View>
              <Text className="text-white/80 text-sm">Appointments</Text>
              <Text className="text-white text-3xl font-bold">8</Text>
            </View>
            <View className="w-px bg-white/30" />
            <View>
              <Text className="text-white/80 text-sm">Revenue</Text>
              <Text className="text-white text-3xl font-bold">$642</Text>
            </View>
            <View className="w-px bg-white/30" />
            <View>
              <Text className="text-white/80 text-sm">Clients</Text>
              <Text className="text-white text-3xl font-bold">6</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Quick Services */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center px-6 mb-4">
          <Text className="text-xl font-bold text-gray-900">Services</Text>
          <Pressable className="flex-row items-center">
            <Text className="text-pink-500 font-medium">See All</Text>
            <ChevronRight size={16} color="#ec4899" />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: 24, paddingRight: 16 }}
        >
          {services.map((service, index) => (
            <ServiceCard key={index} {...service} />
          ))}
        </ScrollView>
      </View>

      {/* Upcoming Appointments */}
      <View className="px-6">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-gray-900">
            Today&apos;s Appointments
          </Text>
          <Pressable className="flex-row items-center">
            <Text className="text-pink-500 font-medium">View All</Text>
            <ChevronRight size={16} color="#ec4899" />
          </Pressable>
        </View>

        {appointments.map((appointment, index) => (
          <AppointmentCard key={index} {...appointment} />
        ))}
      </View>
    </ScrollView>
  );
}
