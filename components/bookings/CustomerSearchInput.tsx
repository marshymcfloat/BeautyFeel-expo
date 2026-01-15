import { Tables } from "@/database.types";
import { getUpcomingAppointmentSessions } from "@/lib/actions/appointmentSessionActions";
import { searchCustomers } from "@/lib/actions/customerActions";
import { scaleDimension, scaleFont } from "@/lib/utils/responsive";
import { useQuery } from "@tanstack/react-query";
import { Calendar, User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Customer = Tables<"customer">;

interface CustomerSearchInputProps {
  value: number | null;
  customerName?: string;
  onSelect: (customerId: number, customer: Customer) => void;
  onNameChange?: (name: string) => void;
  onClear?: () => void;
  error?: string;
}

export default function CustomerSearchInput({
  value,
  customerName,
  onSelect,
  onNameChange,
  onClear,
  error,
}: CustomerSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [showResults, setShowResults] = useState(false);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["customerSearch", searchTerm],
    queryFn: () => searchCustomers(searchTerm),
    enabled: searchTerm.length > 0 && !selectedCustomer,
  });

  const customers: Customer[] =
    searchResults?.success && searchResults.data ? searchResults.data : [];

  const { data: upcomingSessions, refetch: refetchUpcomingSessions } = useQuery(
    {
      queryKey: ["upcomingAppointmentSessions", value],
      queryFn: () => getUpcomingAppointmentSessions(value || 0),
      enabled: !!value && value > 0 && !!selectedCustomer,
    }
  );

  useEffect(() => {
    if (value && value > 0 && selectedCustomer) {
      refetchUpcomingSessions();
    }
  }, [value, selectedCustomer, refetchUpcomingSessions]);

  useEffect(() => {
    if (value === null || value === 0) {
      setSelectedCustomer(null);
      if (!customerName) {
        setSearchTerm("");
      }
    }
  }, [value, customerName]);

  useEffect(() => {
    if (customerName && !selectedCustomer) {
      setSearchTerm(customerName);
    }
  }, [customerName, selectedCustomer]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchTerm(customer.name);
    setShowResults(false);
    onSelect(customer.id, customer);
  };

  const handleClear = () => {
    setSelectedCustomer(null);
    setSearchTerm("");
    setShowResults(false);
    onClear?.();
    onNameChange?.("");
  };

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    if (selectedCustomer) {
      setSelectedCustomer(null);
      onClear?.();
    }
    setShowResults(text.length > 0);
    onNameChange?.(text);
  };

  if (selectedCustomer) {
    const sessions =
      upcomingSessions?.success && upcomingSessions.data
        ? upcomingSessions.data
        : [];

    return (
      <View style={styles.container}>
        <View style={styles.selectedContainer}>
          <View style={styles.selectedContent}>
            <User size={20} color="#ec4899" />
            <Text style={styles.selectedText}>{selectedCustomer.name}</Text>
          </View>
          <Pressable onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Change</Text>
          </Pressable>
        </View>

        {sessions.length > 0 && (
          <View style={styles.upcomingSessionsContainer}>
            <View style={styles.upcomingSessionsHeader}>
              <Calendar size={16} color="#8b5cf6" />
              <Text style={styles.upcomingSessionsTitle}>
                Upcoming Appointments
              </Text>
            </View>
            {sessions.map((session) => {
              const daysUntil = session.next_recommended_date
                ? Math.ceil(
                    (new Date(session.next_recommended_date).getTime() -
                      new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )
                : null;

              return (
                <View key={session.session_id} style={styles.sessionItem}>
                  <Text style={styles.sessionService}>
                    {session.service_title}
                  </Text>
                  <Text style={styles.sessionStep}>
                    Next:{" "}
                    {session.next_step_label || `Step ${session.current_step}`}
                  </Text>
                  {session.next_recommended_date && (
                    <Text style={styles.sessionDate}>
                      Recommended:{" "}
                      {new Date(
                        session.next_recommended_date
                      ).toLocaleDateString()}
                      {daysUntil !== null && daysUntil >= 0 && (
                        <Text style={styles.sessionDays}>
                          {" "}
                          (
                          {daysUntil === 0
                            ? "Today"
                            : daysUntil === 1
                            ? "Tomorrow"
                            : `in ${daysUntil} days`}
                          )
                        </Text>
                      )}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[styles.inputContainer, error && styles.inputContainerError]}
      >
        <User size={20} color="#9CA3AF" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search or type customer name..."
          value={searchTerm}
          onChangeText={handleSearchChange}
          placeholderTextColor="#9CA3AF"
          onFocus={() => setShowResults(searchTerm.length > 0)}
        />
        {isSearching && (
          <ActivityIndicator
            size="small"
            color="#ec4899"
            style={styles.loader}
          />
        )}
      </View>

      {showResults && customers.length > 0 && (
        <View style={styles.resultsShadowWrapper}>
          <ScrollView
            style={styles.resultsContainer}
            contentContainerStyle={styles.resultsContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {customers.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleSelectCustomer(item)}
                style={styles.resultItem}
              >
                <View style={styles.resultItemContent}>
                  <User size={18} color="#6b7280" />
                  <View style={styles.resultItemText}>
                    <Text style={styles.resultItemName}>{item.name}</Text>
                    {item.email && (
                      <Text style={styles.resultItemEmail}>{item.email}</Text>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: scaleDimension(16),
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: scaleDimension(12),
    backgroundColor: "#f9fafb",
    paddingHorizontal: scaleDimension(16),
    minHeight: scaleDimension(52),
  },
  inputContainerError: {
    borderColor: "#ef4444",
  },
  inputIcon: {
    marginRight: scaleDimension(12),
  },
  input: {
    flex: 1,
    fontSize: scaleFont(16),
    color: "#111827",
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  loader: {
    marginLeft: scaleDimension(8),
  },
  selectedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: scaleDimension(12),
    backgroundColor: "#f0fdf4",
    paddingHorizontal: scaleDimension(16),
    paddingVertical: scaleDimension(12),
    minHeight: scaleDimension(52),
  },
  selectedContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectedText: {
    marginLeft: scaleDimension(12),
    fontSize: scaleFont(16),
    color: "#111827",
    fontWeight: "500",
  },
  clearButton: {
    paddingHorizontal: scaleDimension(12),
    paddingVertical: scaleDimension(6),
  },
  clearButtonText: {
    color: "#ec4899",
    fontWeight: "500",
    fontSize: scaleFont(14),
  },
  resultsShadowWrapper: {
    marginTop: scaleDimension(8),
    borderRadius: scaleDimension(12),
    backgroundColor: "white",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: scaleDimension(2) },
        shadowOpacity: 0.1,
        shadowRadius: scaleDimension(4),
      },
      android: {
        elevation: 3,
      },
    }),
  },
  resultsContainer: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: scaleDimension(12),
    backgroundColor: "white",
    maxHeight: scaleDimension(200),
    overflow: "hidden",
  },
  resultsContent: {
    paddingBottom: scaleDimension(8),
  },
  resultItem: {
    paddingHorizontal: scaleDimension(16),
    paddingVertical: scaleDimension(12),
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  resultItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  resultItemText: {
    marginLeft: scaleDimension(12),
    flex: 1,
  },
  resultItemName: {
    fontSize: scaleFont(16),
    color: "#111827",
    fontWeight: "500",
  },
  resultItemEmail: {
    fontSize: scaleFont(14),
    color: "#6b7280",
    marginTop: scaleDimension(2),
  },
  errorText: {
    color: "#ef4444",
    fontSize: scaleFont(12),
    marginTop: scaleDimension(4),
    marginLeft: scaleDimension(4),
  },
  upcomingSessionsContainer: {
    marginTop: scaleDimension(12),
    backgroundColor: "#f3f4f6",
    borderRadius: scaleDimension(8),
    padding: scaleDimension(12),
    borderLeftWidth: 3,
    borderLeftColor: "#8b5cf6",
  },
  upcomingSessionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(8),
    marginBottom: scaleDimension(8),
  },
  upcomingSessionsTitle: {
    fontSize: scaleFont(14),
    fontWeight: "600",
    color: "#111827",
  },
  sessionItem: {
    marginTop: scaleDimension(8),
    paddingTop: scaleDimension(8),
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  sessionService: {
    fontSize: scaleFont(14),
    fontWeight: "600",
    color: "#111827",
    marginBottom: scaleDimension(4),
  },
  sessionStep: {
    fontSize: scaleFont(12),
    color: "#6b7280",
    marginBottom: scaleDimension(2),
  },
  sessionDate: {
    fontSize: scaleFont(12),
    color: "#374151",
  },
  sessionDays: {
    fontSize: scaleFont(12),
    color: "#8b5cf6",
    fontWeight: "500",
  },
});
