import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { AlertCircle, Calendar, Clock } from "lucide-react-native";
import React, { useState } from "react";
import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { Platform, Pressable, View } from "react-native";

import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";

interface DateTimeInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
}

export default function DateTimeInput<T extends FieldValues>({
  control,
  name,
  label,
}: DateTimeInputProps<T>) {
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState<"date" | "time">("date");

  // Helper to safely convert any value to a Date object
  // This fixes the "left-hand side of instanceof" error
  const toDate = (val: unknown): Date => {
    if (val instanceof Date) return val;
    if (typeof val === "string" || typeof val === "number")
      return new Date(val);
    return new Date(); // Default to now if undefined/null
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange }, fieldState: { error } }) => {
        // Use the helper to guarantee we have a Date object
        const currentDate = toDate(value);

        const handleChange = (
          event: DateTimePickerEvent,
          selectedDate?: Date
        ) => {
          if (event.type === "dismissed") {
            setShowPicker(false);
            return;
          }

          if (selectedDate) {
            const newDate = new Date(currentDate);

            if (mode === "date") {
              newDate.setFullYear(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate()
              );
            } else {
              newDate.setHours(
                selectedDate.getHours(),
                selectedDate.getMinutes()
              );
            }

            onChange(newDate);
          }

          if (Platform.OS === "android") {
            setShowPicker(false);
          }
        };

        const openPicker = (currentMode: "date" | "time") => {
          setMode(currentMode);
          setShowPicker(true);
        };

        return (
          <FormControl isInvalid={!!error} className="mb-4">
            <FormControlLabel className="mb-2">
              <FormControlLabelText className="text-gray-700 font-medium">
                {label}
              </FormControlLabelText>
            </FormControlLabel>

            <View className="flex-row gap-2">
              {/* Date Button */}
              <Pressable className="flex-1" onPress={() => openPicker("date")}>
                <View pointerEvents="none">
                  <Input
                    variant="outline"
                    size="md"
                    className={`bg-white h-12 rounded-lg border-gray-300 ${
                      error ? "border-red-500" : ""
                    }`}
                  >
                    <InputField
                      value={formatDate(currentDate)}
                      editable={false}
                      className="text-black"
                    />
                    <InputSlot className="pr-3">
                      <InputIcon
                        as={Calendar}
                        size={"md"}
                        className="text-gray-500"
                      />
                    </InputSlot>
                  </Input>
                </View>
              </Pressable>

              {/* Time Button */}
              <Pressable className="flex-1" onPress={() => openPicker("time")}>
                <View pointerEvents="none">
                  <Input
                    variant="outline"
                    size="md"
                    className={`bg-white h-12 rounded-lg border-gray-300 ${
                      error ? "border-red-500" : ""
                    }`}
                  >
                    <InputField
                      value={formatTime(currentDate)}
                      editable={false}
                      className="text-black"
                    />
                    <InputSlot className="pr-3">
                      <InputIcon
                        as={Clock}
                        size={"md"}
                        className="text-gray-500"
                      />
                    </InputSlot>
                  </Input>
                </View>
              </Pressable>
            </View>

            {showPicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={currentDate}
                mode={mode}
                is24Hour={false}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleChange}
              />
            )}

            <FormControlError>
              <FormControlErrorIcon as={AlertCircle} size="md" />
              <FormControlErrorText className="text-xs ml-1">
                {error?.message}
              </FormControlErrorText>
            </FormControlError>
          </FormControl>
        );
      }}
    />
  );
}
