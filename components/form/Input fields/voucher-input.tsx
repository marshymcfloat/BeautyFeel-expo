import { ResponsiveText } from "@/components/ui/ResponsiveText";
import type { Tables } from "@/database.types";
import { checkVoucher } from "@/lib/actions/voucherActions";
import { scaleDimension, scaleFont } from "@/lib/utils/responsive";
import { CreateBookingSchema } from "@/lib/zod-schemas/booking";
import { AlertCircle, Ticket, X } from "lucide-react-native";
import React, { useState } from "react";
import { Control, UseFormSetValue, useWatch } from "react-hook-form";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

interface VoucherInputProps {
  control: Control<CreateBookingSchema>;
  setValue: UseFormSetValue<CreateBookingSchema>;
}

export default function VoucherInput({ control, setValue }: VoucherInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const appliedVoucherId = useWatch({ control, name: "voucher" });
  const currentDiscount = useWatch({ control, name: "grandDiscount" });

  const handleApply = async () => {
    if (!code) return;

    // Validate format: BF + 4 alphanumeric characters
    const codePattern = /^BF[A-Z0-9]{4}$/;
    if (!codePattern.test(code.toUpperCase())) {
      setLocalError(
        "Invalid format. Code must be BF followed by 4 characters (e.g., BF1234)"
      );
      return;
    }

    setLoading(true);
    setLocalError("");
    Keyboard.dismiss();

    const result = await checkVoucher(code.toUpperCase());

    if (!result.success) {
      setLocalError(result.error || "Invalid code");
      setLoading(false);
      return;
    }

    // Type assertion - we know data exists when success is true
    const voucher = (result as { success: true; data: Tables<"voucher"> }).data;

    if (!voucher) {
      setLocalError("Voucher not found");
      setLoading(false);
      return;
    }

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

  if (appliedVoucherId) {
    return (
      <View style={styles.container}>
        <ResponsiveText variant="sm" style={styles.label} numberOfLines={1}>
          Voucher / Discount
        </ResponsiveText>
        <View style={styles.appliedContainer}>
          <View style={styles.appliedContent}>
            <Ticket size={scaleDimension(18)} color="#10b981" />
            <ResponsiveText
              variant="sm"
              style={styles.appliedText}
              numberOfLines={1}
            >
              Discount Applied: -₱{currentDiscount.toLocaleString()}
            </ResponsiveText>
          </View>
          <Pressable onPress={handleRemove} style={styles.removeButton}>
            <X size={scaleDimension(14)} color="#6b7280" />
          </Pressable>
        </View>
      </View>
    );
  }

  // --- STATE: INPUT MODE ---
  return (
    <View style={styles.container}>
      <ResponsiveText variant="sm" style={styles.label} numberOfLines={1}>
        Voucher Code (Optional)
      </ResponsiveText>
      <View
        style={[
          styles.inputContainer,
          localError ? styles.inputError : styles.inputNormal,
        ]}
      >
        <View style={styles.iconContainer}>
          <Ticket size={scaleDimension(20)} color="#9ca3af" />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Enter code (e.g., BF1234)"
          placeholderTextColor="#9CA3AF"
          value={code}
          onChangeText={(t) => {
            // Limit to 6 characters and uppercase
            const upperCode = t.toUpperCase().slice(0, 6);
            setCode(upperCode);
            if (localError) setLocalError("");
          }}
          autoCapitalize="characters"
          maxLength={6}
          textAlignVertical="center"
        />
        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="small" color="#ec4899" />
          ) : (
            <Pressable
              onPress={handleApply}
              disabled={!code}
              style={[styles.applyButton, !code && styles.applyButtonDisabled]}
            >
              <ResponsiveText
                variant="sm"
                style={[
                  styles.applyButtonText,
                  !code && styles.applyButtonTextDisabled,
                ]}
                numberOfLines={1}
              >
                Apply
              </ResponsiveText>
            </Pressable>
          )}
        </View>
      </View>
      {localError && (
        <View style={styles.errorContainer}>
          <AlertCircle size={scaleDimension(16)} color="#EF4444" />
          <ResponsiveText
            variant="xs"
            style={styles.errorText}
            numberOfLines={2}
          >
            {localError}
          </ResponsiveText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: scaleDimension(16),
  },
  label: {
    color: "#374151",
    fontWeight: "600",
    marginBottom: scaleDimension(8),
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: scaleDimension(12),
    borderWidth: 1,
    backgroundColor: "#F9FAFB",
    minHeight: scaleDimension(52),
    paddingHorizontal: scaleDimension(4),
  },
  inputNormal: {
    borderColor: "#E5E7EB",
  },
  inputError: {
    borderWidth: 2,
    borderColor: "#F87171",
  },
  iconContainer: {
    paddingLeft: scaleDimension(12),
    paddingRight: scaleDimension(8),
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: scaleFont(16),
    color: "#111827",
    paddingVertical:
      Platform.OS === "ios" ? scaleDimension(14) : scaleDimension(12),
    textAlignVertical: "center",
  },
  buttonContainer: {
    paddingRight: scaleDimension(12),
    paddingLeft: scaleDimension(8),
    justifyContent: "center",
    alignItems: "center",
  },
  applyButton: {
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(6),
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    color: "#ec4899",
    fontWeight: "600",
  },
  applyButtonTextDisabled: {
    color: "#9ca3af",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: scaleDimension(6),
    marginLeft: scaleDimension(4),
    gap: scaleDimension(4),
  },
  errorText: {
    color: "#EF4444",
    flex: 1,
  },
  appliedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#d1fae5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    borderRadius: scaleDimension(12),
    padding: scaleDimension(12),
    minHeight: scaleDimension(52),
  },
  appliedContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
    flex: 1,
  },
  appliedText: {
    color: "#065f46",
    fontWeight: "600",
    flex: 1,
  },
  removeButton: {
    backgroundColor: "white",
    borderRadius: scaleDimension(16),
    padding: scaleDimension(4),
    marginLeft: scaleDimension(8),
  },
});
