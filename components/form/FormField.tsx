import { Control, Controller, FieldValues, Path } from "react-hook-form";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

type FormFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
} & TextInputProps;

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  ...textInputProps
}: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => {
        // Convert value to string for TextInput (handles numbers, null, undefined)
        const stringValue =
          value === null || value === undefined ? "" : String(value);

        return (
          <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={[
                styles.input,
                error ? styles.inputError : styles.inputNormal,
              ]}
              placeholderTextColor="#9CA3AF"
              onBlur={onBlur}
              onChangeText={onChange}
              value={stringValue}
              textAlignVertical="center"
              {...textInputProps}
            />
            {error && <Text style={styles.errorText}>{error.message}</Text>}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    color: "#374151",
    fontWeight: "600",
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    minHeight: 52,
    textAlignVertical: "center",
  },
  inputNormal: {
    borderColor: "#E5E7EB",
  },
  inputError: {
    borderWidth: 2,
    borderColor: "#F87171",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 6,
    marginLeft: 4,
  },
});
