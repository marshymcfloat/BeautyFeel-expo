import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowUpRight,
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
} from "lucide-react-native";
import React from "react";
import { ScrollView, Text, View } from "react-native";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
}

function StatCard({ title, value, change, positive, icon }: StatCardProps) {
  return (
    <View className="bg-white rounded-2xl p-5 flex-1 min-w-[45%]">
      <View className="flex-row justify-between items-start mb-3">
        <View className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center">
          {icon}
        </View>
        <View
          className={`flex-row items-center px-2 py-1 rounded-full ${positive ? "bg-green-50" : "bg-red-50"}`}
        >
          <ArrowUpRight
            size={12}
            color={positive ? "#22c55e" : "#ef4444"}
            style={{ transform: [{ rotate: positive ? "0deg" : "90deg" }] }}
          />
          <Text
            className={`text-xs ml-0.5 ${positive ? "text-green-600" : "text-red-500"}`}
          >
            {change}
          </Text>
        </View>
      </View>
      <Text className="text-gray-500 text-sm">{title}</Text>
      <Text className="text-2xl font-bold text-gray-900 mt-1">{value}</Text>
    </View>
  );
}

interface TransactionProps {
  name: string;
  service: string;
  amount: string;
  time: string;
}

function TransactionItem({ name, service, amount, time }: TransactionProps) {
  return (
    <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
      <View className="flex-row items-center flex-1">
        <View className="w-12 h-12 rounded-full bg-gradient-to-br items-center justify-center overflow-hidden">
          <LinearGradient
            colors={["#f9a8d4", "#d8b4fe"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="w-full h-full items-center justify-center"
          >
            <Text className="text-white font-bold text-lg">
              {name.charAt(0)}
            </Text>
          </LinearGradient>
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-gray-900 font-semibold">{name}</Text>
          <Text className="text-gray-500 text-sm">{service}</Text>
        </View>
      </View>
      <View className="items-end">
        <Text className="text-gray-900 font-bold">{amount}</Text>
        <Text className="text-gray-400 text-xs">{time}</Text>
      </View>
    </View>
  );
}

export default function SalesScreen() {
  const stats = [
    {
      title: "Today's Sales",
      value: "$1,284",
      change: "12%",
      positive: true,
      icon: <DollarSign size={20} color="#ec4899" />,
    },
    {
      title: "Weekly Revenue",
      value: "$8,432",
      change: "8%",
      positive: true,
      icon: <TrendingUp size={20} color="#ec4899" />,
    },
    {
      title: "Appointments",
      value: "24",
      change: "5%",
      positive: false,
      icon: <Calendar size={20} color="#ec4899" />,
    },
    {
      title: "New Clients",
      value: "12",
      change: "18%",
      positive: true,
      icon: <Users size={20} color="#ec4899" />,
    },
  ];

  const transactions = [
    {
      name: "Emma Wilson",
      service: "Hair Coloring",
      amount: "+$180",
      time: "2 min ago",
    },
    {
      name: "Sarah Davis",
      service: "Manicure & Pedicure",
      amount: "+$95",
      time: "15 min ago",
    },
    {
      name: "Lisa Chen",
      service: "Facial Treatment",
      amount: "+$120",
      time: "1 hour ago",
    },
    {
      name: "Maria Garcia",
      service: "Haircut & Styling",
      amount: "+$75",
      time: "2 hours ago",
    },
    {
      name: "Amanda Brown",
      service: "Full Makeover",
      amount: "+$250",
      time: "3 hours ago",
    },
  ];

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-6 pt-4 pb-6">
        <Text className="text-3xl font-bold text-gray-900">Sales</Text>
        <Text className="text-gray-500 mt-1">Track your revenue</Text>
      </View>

      {/* Stats Grid */}
      <View className="px-6 mb-6">
        <View className="flex-row flex-wrap gap-4">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </View>
      </View>

      {/* Recent Transactions */}
      <View className="px-6">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-bold text-gray-900">
            Recent Transactions
          </Text>
          <Text className="text-pink-500 font-medium">See All</Text>
        </View>

        <View className="bg-white rounded-2xl px-5">
          {transactions.map((transaction, index) => (
            <TransactionItem key={index} {...transaction} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
