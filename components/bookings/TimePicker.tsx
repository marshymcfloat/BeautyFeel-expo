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
import { Clock } from "lucide-react-native";

interface TimePickerProps {
  value: string; // HH:MM format
  onChange: (time: string) => void;
  error?: string;
}

export default function TimePicker({
  value,
  onChange,
  error,
}: TimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Convert string to Date object (use today's date with the time)
  const getTimeValue = (): Date => {
    const now = new Date();
    if (value) {
      const [hours, minutes] = value.split(":").map(Number);
      now.setHours(hours || 0, minutes || 0, 0, 0);
    }
    return now;
  };

  const timeValue = getTimeValue();
  const [tempTime, setTempTime] = useState<Date>(timeValue);

  // Update tempTime when value changes externally
  useEffect(() => {
    setTempTime(getTimeValue());
  }, [value]);

  // Format time for display (12-hour format with AM/PM)
  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr) return "Select time";
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }

    if (event.type === "dismissed") {
      setShowPicker(false);
      return;
    }

    if (selectedTime) {
      if (Platform.OS === "ios") {
        // On iOS, just update temp time, wait for Done button
        setTempTime(selectedTime);
      } else {
        // On Android, format and save immediately
        const hours = String(selectedTime.getHours()).padStart(2, "0");
        const minutes = String(selectedTime.getMinutes()).padStart(2, "0");
        const formattedTime = `${hours}:${minutes}`;
        onChange(formattedTime);
      }
    }
  };

  const handleDone = () => {
    // Format and save the time when Done is pressed (iOS)
    const hours = String(tempTime.getHours()).padStart(2, "0");
    const minutes = String(tempTime.getMinutes()).padStart(2, "0");
    const formattedTime = `${hours}:${minutes}`;
    onChange(formattedTime);
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
        <Clock size={20} color={error ? "#ef4444" : "#6b7280"} style={styles.icon} />
        <Text style={[styles.pickerText, !value && styles.pickerTextPlaceholder]}>
          {formatDisplayTime(value)}
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
                    <Text style={styles.modalTitle}>Select Time</Text>
                    <Pressable onPress={handleDone} style={styles.doneButton}>
                      <Text style={styles.doneButtonText}>Done</Text>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={tempTime}
                    mode="time"
                    display="spinner"
                    is24Hour={false}
                    onChange={handleTimeChange}
                    style={styles.iosPicker}
                  />
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={timeValue}
              mode="time"
              display="default"
              is24Hour={false}
              onChange={handleTimeChange}
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

