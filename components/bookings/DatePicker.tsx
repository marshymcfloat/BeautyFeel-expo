import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  StyleSheet,
  Modal,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Calendar } from "lucide-react-native";

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export default function DatePicker({
  value,
  onChange,
  error,
  minimumDate,
  maximumDate,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => value ? new Date(value) : new Date());

  // Convert string to Date object
  const dateValue = value ? new Date(value) : new Date();

  // Update tempDate when value changes externally
  useEffect(() => {
    if (value) {
      setTempDate(new Date(value));
    }
  }, [value]);

  // Format date for display
  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }

    if (event.type === "dismissed") {
      setShowPicker(false);
      return;
    }

    if (selectedDate) {
      if (Platform.OS === "ios") {
        // On iOS, just update temp date, wait for Done button
        setTempDate(selectedDate);
      } else {
        // On Android, format and save immediately
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
        const day = String(selectedDate.getDate()).padStart(2, "0");
        const formattedDate = `${year}-${month}-${day}`;
        onChange(formattedDate);
      }
    }
  };

  const handleDone = () => {
    // Format and save the date when Done is pressed (iOS)
    const year = tempDate.getFullYear();
    const month = String(tempDate.getMonth() + 1).padStart(2, "0");
    const day = String(tempDate.getDate()).padStart(2, "0");
    const formattedDate = `${year}-${month}-${day}`;
    onChange(formattedDate);
    setShowPicker(false);
  };

  const openPicker = () => {
    setShowPicker(true);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={openPicker}
        style={[styles.pickerButton, error && styles.pickerButtonError]}
      >
        <Calendar size={20} color={error ? "#ef4444" : "#6b7280"} style={styles.icon} />
        <Text style={[styles.pickerText, !value && styles.pickerTextPlaceholder]}>
          {value ? formatDisplayDate(dateValue) : "Select date"}
        </Text>
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {showPicker && (
        <>
          {Platform.OS === "ios" ? (
            <Modal
              visible={showPicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowPicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Pressable onPress={() => setShowPicker(false)} style={styles.cancelButton}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                    <Text style={styles.modalTitle}>Select Date</Text>
                    <Pressable onPress={handleDone} style={styles.doneButton}>
                      <Text style={styles.doneButtonText}>Done</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    minimumDate={minimumDate}
                    maximumDate={maximumDate}
                    style={styles.iosPicker}
                  />
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={dateValue}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
    minHeight: 52,
  },
  pickerButtonError: {
    borderColor: "#ef4444",
  },
  icon: {
    marginRight: 12,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    textAlignVertical: "center",
  },
  pickerTextPlaceholder: {
    color: "#9CA3AF",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#6b7280",
  },
  doneButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ec4899",
  },
  iosPicker: {
    height: 200,
  },
});

