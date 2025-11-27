import LoginForm from "@/components/auth/LoginForm";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      {/* Login Modal */}
      <Modal
        visible={showAuthModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View className="flex-1 justify-center items-center px-6">
          <Pressable
            className="absolute inset-0 bg-black/50"
            onPress={() => setShowAuthModal(false)}
          />
          <View className="bg-white rounded-3xl w-full max-w-md p-8 z-10">
            {/* Modal Header */}
            <View className="items-center mb-6">
              <View className="w-16 h-16 rounded-full bg-gradient-to-br items-center justify-center mb-4">
                <LinearGradient
                  colors={["#ec4899", "#a855f7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="w-full h-full rounded-full items-center justify-center"
                >
                  <Sparkles size={28} color="white" />
                </LinearGradient>
              </View>
              <Text className="text-2xl font-bold text-gray-900">
                Welcome Back
              </Text>
              <Text className="text-gray-500 mt-1">
                Sign in to your Beautyfeel account
              </Text>
            </View>

            <LoginForm onSuccess={setShowAuthModal} />
          </View>
        </View>
      </Modal>

      {/* Main Landing Screen */}
      <LinearGradient
        colors={["#fdf2f8", "#fae8ff", "#f3e8ff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-1"
      >
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row justify-end px-6 py-4">
            <Pressable
              className="bg-white/80 rounded-full px-5 py-2.5 active:bg-white"
              onPress={() => setShowAuthModal(true)}
            >
              <Text className="text-pink-600 font-semibold">Sign In</Text>
            </Pressable>
          </View>

          {/* Hero Content */}
          <View className="flex-1 justify-center items-center px-8">
            {/* Decorative Elements */}
            <View className="absolute top-20 left-8 w-20 h-20 rounded-full bg-pink-300/20" />
            <View className="absolute top-40 right-12 w-14 h-14 rounded-full bg-purple-300/30" />
            <View className="absolute bottom-32 left-16 w-24 h-24 rounded-full bg-fuchsia-200/25" />

            {/* Logo Section */}
            <View className="items-center">
              {/* Icon */}
              <View className="w-24 h-24 rounded-3xl items-center justify-center mb-8 overflow-hidden">
                <LinearGradient
                  colors={["#ec4899", "#d946ef", "#a855f7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="w-full h-full items-center justify-center"
                >
                  <Sparkles size={44} color="white" />
                </LinearGradient>
              </View>

              {/* Brand Name */}
              <Text
                className="text-5xl font-black text-transparent tracking-widest uppercase"
                style={{
                  color: "#1f1f1f",
                  letterSpacing: 8,
                }}
              >
                BEAUTYFEEL
              </Text>

              {/* Divider */}
              <LinearGradient
                colors={["#ec4899", "#a855f7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="h-1 w-48 rounded-full mt-4 mb-4"
              />

              {/* Tagline */}
              <Text className="text-lg text-gray-600 font-medium tracking-wide">
                Your Beauty, Our Passion
              </Text>
            </View>
          </View>

          {/* Bottom Section */}
          <View className="px-8 pb-10">
            <Pressable
              className="rounded-2xl overflow-hidden active:opacity-90"
              onPress={() => setShowAuthModal(true)}
            >
              <LinearGradient
                colors={["#ec4899", "#d946ef"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-4 items-center"
              >
                <Text className="text-white text-lg font-bold">
                  Get Started
                </Text>
              </LinearGradient>
            </Pressable>

            <Text className="text-center text-gray-500 text-sm mt-4">
              Join thousands of beauty professionals
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}
