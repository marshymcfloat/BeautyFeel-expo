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
        <View className="w-full my-2">
          <Text className="text-gray-700 font-medium mb-1 capitalize">
            {label}
          </Text>
          <TextInput
            className={`border text-black rounded-md p-3 w-full ${
              error ? "border-red-500" : "border-gray-300"
            }`}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            {...textInputProps}
          />
          {error && <Text className="text-red-500 mt-1">{error.message}</Text>}
        </View>
      )}
    />
  );
}
