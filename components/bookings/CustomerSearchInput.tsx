import { Tables } from "@/database.types";
import { searchCustomers } from "@/lib/actions/customerActions";
import { scaleDimension, scaleFont } from "@/lib/utils/responsive";
import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Customer = Tables<"customer">;

interface CustomerSearchInputProps {
  value: number | null; // customerId (null or 0 means new customer)
  customerName?: string; // Customer name for new customers
  onSelect: (customerId: number, customer: Customer) => void;
  onNameChange?: (name: string) => void; // Callback when user types a new customer name
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

  // Search customers when search term changes
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["customerSearch", searchTerm],
    queryFn: () => searchCustomers(searchTerm),
    enabled: searchTerm.length > 0 && !selectedCustomer,
  });

  const customers: Customer[] =
    searchResults?.success && searchResults.data ? searchResults.data : [];

  // Reset when value changes externally
  useEffect(() => {
    if (value === null || value === 0) {
      setSelectedCustomer(null);
      if (!customerName) {
        setSearchTerm("");
      }
    }
  }, [value, customerName]);

  // Sync searchTerm with customerName if provided
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
  resultsContainer: {
    marginTop: scaleDimension(8),
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: scaleDimension(12),
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scaleDimension(2) },
    shadowOpacity: 0.1,
    shadowRadius: scaleDimension(4),
    elevation: 3,
    maxHeight: scaleDimension(200),
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
});
