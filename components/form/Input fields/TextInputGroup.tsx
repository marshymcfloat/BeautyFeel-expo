import React from "react";
import { Text, TextInput } from "react-native";
import { View } from "react-native-reanimated/lib/typescript/Animated";

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
    <View>
      <Text>{label}</Text>
      <TextInput
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        className="border border-black rounded-md p-2"
      />
    </View>
  );
}
