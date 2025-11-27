import React from "react";
import { Text, TextInput, View } from "react-native";

export default function TextInputGroup({
  label,
  placeholder,
  secureTextEntry,
}: {
  label: string;
  placeholder: string;
  secureTextEntry: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="text-gray-700 font-medium mb-1">{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        secureTextEntry={secureTextEntry}
        className="border border-gray-300 rounded-lg p-3 text-black bg-white"
      />
    </View>
  );
}
