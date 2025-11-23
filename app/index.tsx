import LoginForm from "@/components/auth/LoginForm";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <Modal visible={showAuthModal} transparent animationType="fade">
        <View className="flex-1 bg-black/40 justify-center items-center p-4">
          <View className="bg-white rounded-lg w-full max-w-sm shadow-lg p-6">
            <Text className="text-center font-bold text-2xl mb-4">
              Beautyfeel Login
            </Text>
            <LoginForm onSuccess={setShowAuthModal} />
          </View>
        </View>
      </Modal>

      <SafeAreaView className="relative justify-center items-center flex-1 bg-gradient-to-br from-pink-100 to-purple-200">
        <Pressable
          className="absolute top-4 right-4 z-10 p-2"
          onPress={() => setShowAuthModal(true)}
        >
          <Text className="underline underline-offset-2">Login</Text>
        </Pressable>
        <View className="items-center gap-1">
          <Text className="text-5xl font-bold text-center uppercase tracking-[6px]">
            beautyfeel
          </Text>

          <View className="h-[2px] rounded-full w-full bg-black" />
          <Text className="font-medium text-md">Your Beauty, Our Passion</Text>
        </View>
      </SafeAreaView>
    </>
  );
}
