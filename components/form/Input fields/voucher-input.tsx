import { Ticket, X } from "lucide-react-native";
import React, { useState } from "react";
import { Control, UseFormSetValue, useWatch } from "react-hook-form";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  Text,
  View,
} from "react-native";

import {
  FormControl,
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { checkVoucher } from "@/lib/actions/voucherActions";
import { CreateBookingTypes } from "@/lib/zod-schemas/booking";
import { AlertCircle } from "lucide-react-native";

interface VoucherInputProps {
  control: Control<CreateBookingTypes>;
  setValue: UseFormSetValue<CreateBookingTypes>;
}

export default function VoucherInput({ control, setValue }: VoucherInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const appliedVoucherId = useWatch({ control, name: "voucher" });
  const currentDiscount = useWatch({ control, name: "grandDiscount" });

  const handleApply = async () => {
    if (!code) return;

    setLoading(true);
    setLocalError("");
    Keyboard.dismiss();

    const result = await checkVoucher(code);

    if (!result.success || !result.data) {
      setLocalError(result.error || "Invalid code");
      setLoading(false);
      return;
    }

    // Success: Update Form
    const voucher = result.data;

    // 1. Set the Voucher ID (for the database relationship)
    setValue("voucher", voucher.id);

    // 2. Set the Discount Value
    setValue("grandDiscount", voucher.value);

    // 3. Clear local input state
    setLoading(false);
    setCode(""); // Clear text box as we move to "Applied" state
  };

  const handleRemove = () => {
    setValue("voucher", null);
    setValue("grandDiscount", 0);
    setLocalError("");
  };

  // --- STATE: VOUCHER APPLIED ---
  if (appliedVoucherId) {
    return (
      <View className="mb-4">
        <FormControlLabel className="mb-2">
          <FormControlLabelText className="text-gray-700 font-medium">
            Voucher / Discount
          </FormControlLabelText>
        </FormControlLabel>

        <View className="bg-green-50 border border-green-200 rounded-lg p-3 flex-row justify-between items-center h-12">
          <View className="flex-row items-center gap-2">
            <Ticket size={18} color="green" />
            <Text className="text-green-800 font-medium">
              Discount Applied: -₱{currentDiscount.toLocaleString()}
            </Text>
          </View>
          <Pressable
            onPress={handleRemove}
            className="bg-white rounded-full p-1"
          >
            <X size={14} color="gray" />
          </Pressable>
        </View>
      </View>
    );
  }

  // --- STATE: INPUT MODE ---
  return (
    <FormControl isInvalid={!!localError} className="mb-4">
      <FormControlLabel className="mb-2">
        <FormControlLabelText className="text-gray-700 font-medium">
          Voucher Code
        </FormControlLabelText>
      </FormControlLabel>

      <Input
        variant="outline"
        size="md"
        className={`bg-white h-12 rounded-lg border-gray-300 ${
          localError ? "border-red-500" : ""
        }`}
      >
        <InputSlot className="pl-3">
          <InputIcon as={Ticket} size={"md"} className="text-gray-400" />
        </InputSlot>

        <InputField
          placeholder="Enter code"
          value={code}
          onChangeText={(t) => {
            setCode(t);
            if (localError) setLocalError("");
          }}
          className="text-black ml-1 flex-1"
          autoCapitalize="characters"
        />

        <InputSlot className="pr-3">
          {loading ? (
            <ActivityIndicator size="small" color="#ec4899" />
          ) : (
            <Pressable
              onPress={handleApply}
              disabled={!code}
              className={`${code ? "opacity-100" : "opacity-50"}`}
            >
              <Text className="text-pink-500 font-bold text-sm">Apply</Text>
            </Pressable>
          )}
        </InputSlot>
      </Input>

      <FormControlError>
        <FormControlErrorIcon as={AlertCircle} size="md" />
        <FormControlErrorText className="text-xs ml-1">
          {localError}
        </FormControlErrorText>
      </FormControlError>
    </FormControl>
  );
}
