import { LinearGradient } from "expo-linear-gradient";
import { Slot } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function protectedLayout() {
  return (
    <LinearGradient
      colors={["#fce7f3", "#e9d5ff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <Slot />
      </SafeAreaView>
    </LinearGradient>
  );
}
