import { supabase } from "@/lib/utils/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Bell,
  ChevronRight,
  CreditCard,
  HelpCircle,
  LogOut,
  Settings,
  Shield,
  User,
} from "lucide-react-native";
import React from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
}

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  danger = false,
}: MenuItemProps) {
  return (
    <Pressable
      className="flex-row items-center py-4 px-4 active:bg-gray-50"
      onPress={onPress}
    >
      <View
        className={`w-10 h-10 rounded-xl items-center justify-center ${danger ? "bg-red-50" : "bg-pink-50"}`}
      >
        {icon}
      </View>
      <View className="flex-1 ml-3">
        <Text
          className={`font-medium ${danger ? "text-red-600" : "text-gray-900"}`}
        >
          {title}
        </Text>
        {subtitle && (
          <Text className="text-gray-500 text-sm mt-0.5">{subtitle}</Text>
        )}
      </View>
      {!danger && <ChevronRight size={20} color="#9CA3AF" />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="px-6 pt-4 pb-6">
        <Text className="text-3xl font-bold text-gray-900">Profile</Text>
      </View>

      {/* Profile Card */}
      <View className="mx-6 mb-6 rounded-3xl overflow-hidden">
        <LinearGradient
          colors={["#ec4899", "#d946ef", "#a855f7"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="p-6"
        >
          <View className="flex-row items-center">
            <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center border-2 border-white/40">
              <Text className="text-3xl font-bold text-white">JD</Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-2xl font-bold text-white">Jane Doe</Text>
              <Text className="text-white/80 mt-1">jane.doe@email.com</Text>
              <View className="flex-row items-center mt-2">
                <View className="bg-white/20 px-3 py-1 rounded-full">
                  <Text className="text-white text-sm font-medium">
                    Pro Member
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Stats */}
          <View className="flex-row mt-6 pt-6 border-t border-white/20">
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-white">248</Text>
              <Text className="text-white/70 text-sm">Appointments</Text>
            </View>
            <View className="w-px bg-white/20" />
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-white">4.9</Text>
              <Text className="text-white/70 text-sm">Rating</Text>
            </View>
            <View className="w-px bg-white/20" />
            <View className="flex-1 items-center">
              <Text className="text-2xl font-bold text-white">2y</Text>
              <Text className="text-white/70 text-sm">Member</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Menu Sections */}
      <View className="px-6 mb-6">
        <Text className="text-gray-500 font-medium mb-2 ml-1">ACCOUNT</Text>
        <View className="bg-white rounded-2xl overflow-hidden">
          <MenuItem
            icon={<User size={20} color="#ec4899" />}
            title="Personal Information"
            subtitle="Update your details"
          />
          <View className="h-px bg-gray-100 mx-4" />
          <MenuItem
            icon={<CreditCard size={20} color="#ec4899" />}
            title="Payment Methods"
            subtitle="Manage your cards"
          />
          <View className="h-px bg-gray-100 mx-4" />
          <MenuItem
            icon={<Bell size={20} color="#ec4899" />}
            title="Notifications"
            subtitle="Set your preferences"
          />
        </View>
      </View>

      <View className="px-6 mb-6">
        <Text className="text-gray-500 font-medium mb-2 ml-1">PREFERENCES</Text>
        <View className="bg-white rounded-2xl overflow-hidden">
          <MenuItem
            icon={<Settings size={20} color="#ec4899" />}
            title="Settings"
            subtitle="App preferences"
          />
          <View className="h-px bg-gray-100 mx-4" />
          <MenuItem
            icon={<Shield size={20} color="#ec4899" />}
            title="Privacy & Security"
            subtitle="Protect your account"
          />
          <View className="h-px bg-gray-100 mx-4" />
          <MenuItem
            icon={<HelpCircle size={20} color="#ec4899" />}
            title="Help & Support"
            subtitle="Get help with the app"
          />
        </View>
      </View>

      <View className="px-6 mb-6">
        <View className="bg-white rounded-2xl overflow-hidden">
          <MenuItem
            icon={<LogOut size={20} color="#ef4444" />}
            title="Sign Out"
            onPress={handleLogout}
            danger
          />
        </View>
      </View>

      {/* Version */}
      <Text className="text-center text-gray-400 text-sm mb-6">
        Beautyfeel v1.0.0
      </Text>
    </ScrollView>
  );
}
