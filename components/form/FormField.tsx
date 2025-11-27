import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Text, TextInput, TextInputProps, View } from "react-native";

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
      }) => (
        <View className="w-full mb-4">
          <Text className="text-gray-700 font-semibold mb-2 text-sm">
            {label}
          </Text>
          <TextInput
            className={`rounded-xl px-4 py-3.5 text-base text-gray-900 bg-gray-50 ${
              error
                ? "border-2 border-red-400"
                : "border border-gray-200 focus:border-pink-400"
            }`}
            placeholderTextColor="#9CA3AF"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            {...textInputProps}
          />
          {error && (
            <Text className="text-red-500 text-sm mt-1.5 ml-1">
              {error.message}
            </Text>
          )}
        </View>
      )}
    />
  );
}
