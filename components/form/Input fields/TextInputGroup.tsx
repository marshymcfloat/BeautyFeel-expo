import React from "react";
import { Text, TextInput, View, StyleSheet } from "react-native";

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
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        secureTextEntry={secureTextEntry}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: "#374151",
    fontWeight: "500",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    color: "#000000",
    backgroundColor: "white",
  },
});
