import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ResponsiveText } from "@/components/ui/ResponsiveText";
import {
  getCustomersAction,
  type Customer,
} from "@/lib/actions/customerActions";
import { formatCurrency } from "@/lib/utils/currency";
import {
  getContainerPadding,
  PLATFORM,
  scaleDimension,
} from "@/lib/utils/responsive";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  Mail,
  PenLine,
  Phone,
  Plus,
  Search,
  TrendingUp,
  Users,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import CustomerAppointmentsModal from "./CustomerAppointmentsModal";
import CustomerFormModal from "./CustomerFormModal";

const PAGE_SIZE = 20;

const getInitials = (name: string) => {
  if (!name) return "C";
  const names = name.split(" ");
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export default function ManageCustomers({
  onRefetchReady,
}: {
  onRefetchReady?: (refetch: () => void) => void;
}) {
  const queryClient = useQueryClient();

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAppointmentsModal, setShowAppointmentsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [viewingCustomerId, setViewingCustomerId] = useState<number | null>(
    null
  );
  const [viewingCustomerName, setViewingCustomerName] = useState<string>("");

  const [sortBy, setSortBy] = useState<"spent" | "name" | "created_at">(
    "created_at"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["customers", sortBy, sortOrder, debouncedSearchTerm],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await getCustomersAction({
        page: pageParam,
        pageSize: PAGE_SIZE,
        sortBy,
        order: sortOrder,
        searchTerm: debouncedSearchTerm,
      });
      if (!res.success) throw new Error(res.error);
      return res;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pagination?.nextPage ?? undefined,
    placeholderData: (previousData) => previousData,
  });

  const customers = useMemo(() => {
    return (
      data?.pages
        .flatMap((page) => page.data)
        .filter((c): c is Customer => c !== undefined) || []
    );
  }, [data]);

  const totalCount = data?.pages[0]?.pagination?.total || 0;

  React.useEffect(() => {
    if (onRefetchReady) {
      onRefetchReady(() => refetch());
    }
  }, [onRefetchReady, refetch]);

  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setShowCustomerModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleViewAppointments = (customer: Customer) => {
    setViewingCustomerId(customer.id);
    setViewingCustomerName(customer.name);
    setShowAppointmentsModal(true);
  };

  const handleSortToggle = () => {
    if (sortBy === "spent") {
      setSortBy("created_at");
      setSortOrder("desc");
    } else {
      setSortBy("spent");
      setSortOrder("desc");
    }
  };

  const containerPadding = getContainerPadding();
  const iconSize = scaleDimension(20);

  const renderItem = ({ item }: { item: Customer }) => (
    <View style={styles.cardContainer}>
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <ResponsiveText variant="lg" style={styles.avatarText}>
            {getInitials(item.name)}
          </ResponsiveText>
        </View>
      </View>

      <View style={styles.cardCenter}>
        <ResponsiveText
          variant="lg"
          style={styles.customerName}
          numberOfLines={1}
        >
          {item.name}
        </ResponsiveText>

        <View style={styles.contactRow}>
          {item.email ? (
            <View style={styles.iconTextPair}>
              <Mail size={12} color="#6b7280" />
              <ResponsiveText
                variant="xs"
                style={styles.contactText}
                numberOfLines={1}
              >
                {item.email}
              </ResponsiveText>
            </View>
          ) : null}

          {item.phone ? (
            <View style={styles.iconTextPair}>
              <Phone size={12} color="#6b7280" />
              <ResponsiveText
                variant="xs"
                style={styles.contactText}
                numberOfLines={1}
              >
                {item.phone}
              </ResponsiveText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.cardRight}>
        <View style={styles.spentBadge}>
          <ResponsiveText variant="xs" style={styles.spentLabel}>
            Spent
          </ResponsiveText>
          <ResponsiveText variant="sm" style={styles.spentValue}>
            {formatCurrency(item.spent || 0)}
          </ResponsiveText>
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            style={styles.viewButton}
            onPress={() => handleViewAppointments(item)}
            hitSlop={10}
          >
            <Eye size={16} color="#10b981" />
          </Pressable>
          <Pressable
            style={styles.editButton}
            onPress={() => handleEditCustomer(item)}
            hitSlop={10}
          >
            <PenLine size={16} color="#6366f1" />
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (isLoading && !data && !isRefetching) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <LoadingState variant="list" count={6} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <ErrorState
          message={
            error instanceof Error ? error.message : "Failed to load customers"
          }
          title="Connection Error"
        />
        <Pressable style={styles.retryButton} onPress={() => refetch()}>
          <ResponsiveText style={styles.retryText}>Try Again</ResponsiveText>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <View style={[styles.container, { paddingHorizontal: containerPadding }]}>
        <View style={styles.header}>
          <View>
            <ResponsiveText variant="2xl" style={styles.headerTitle}>
              Customers
            </ResponsiveText>
            <ResponsiveText variant="sm" style={styles.headerSubtitle}>
              {totalCount} active profiles
            </ResponsiveText>
          </View>
          <Pressable onPress={handleCreateCustomer} style={styles.addButton}>
            <Plus size={iconSize} color="white" />
            <ResponsiveText variant="sm" style={styles.addButtonText}>
              Add New
            </ResponsiveText>
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.inputWrapper}>
            <Search size={18} color="#9ca3af" />
            <TextInput
              style={styles.input}
              placeholder="Search by name, email, or phone..."
              placeholderTextColor="#9ca3af"
              value={searchTerm}
              onChangeText={setSearchTerm}
              autoCorrect={false}
            />
            {searchTerm.length > 0 && (
              <Pressable onPress={() => setSearchTerm("")}>
                <X size={18} color="#9ca3af" />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={handleSortToggle}
            style={[
              styles.sortButton,
              sortBy === "spent" && styles.sortButtonActive,
            ]}
          >
            <TrendingUp
              size={20}
              color={sortBy === "spent" ? "white" : "#4b5563"}
            />
          </Pressable>
        </View>

        <FlatList
          data={customers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={() => Keyboard.dismiss()}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !debouncedSearchTerm}
              onRefresh={refetch}
              tintColor="#ec4899"
            />
          }
          ListEmptyComponent={
            !isLoading || data ? (
              <EmptyState
                icon={<Users size={48} color="#d1d5db" />}
                title="No customers found"
                message={
                  debouncedSearchTerm
                    ? "Adjust your search to find results."
                    : "Start by adding your first customer."
                }
              />
            ) : null
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.loadingFooter}>
                <ActivityIndicator color="#ec4899" />
              </View>
            ) : (
              <View style={{ height: 20 }} />
            )
          }
        />

        <CustomerFormModal
          visible={showCustomerModal}
          onClose={() => {
            setShowCustomerModal(false);
            setSelectedCustomer(null);
          }}
          existingCustomer={selectedCustomer}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["customers"] });
          }}
        />

        <CustomerAppointmentsModal
          visible={showAppointmentsModal}
          onClose={() => {
            setShowAppointmentsModal(false);
            setViewingCustomerId(null);
            setViewingCustomerName("");
          }}
          customerId={viewingCustomerId}
          customerName={viewingCustomerName}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: scaleDimension(20),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleDimension(20),
  },
  headerTitle: {
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: "#6b7280",
    marginTop: scaleDimension(4),
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ec4899",
    paddingHorizontal: scaleDimension(16),
    paddingVertical: scaleDimension(10),
    borderRadius: scaleDimension(12),
    gap: scaleDimension(8),
    ...PLATFORM.shadowLg,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    gap: scaleDimension(12),
    marginBottom: scaleDimension(16),
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: scaleDimension(12),
    paddingHorizontal: scaleDimension(14),
    height: scaleDimension(48),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: scaleDimension(10),
    ...PLATFORM.shadow,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    elevation: 1,
  },
  input: {
    flex: 1,
    fontSize: scaleDimension(15),
    color: "#111827",
    height: "100%",
  },
  sortButton: {
    width: scaleDimension(48),
    height: scaleDimension(48),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: scaleDimension(12),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...PLATFORM.shadow,
    shadowOpacity: 0.03,
  },
  sortButtonActive: {
    backgroundColor: "#ec4899",
    borderColor: "#ec4899",
  },
  listContent: {
    paddingBottom: scaleDimension(40),
  },
  cardContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: scaleDimension(16),
    marginBottom: scaleDimension(12),
    padding: scaleDimension(12),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    ...PLATFORM.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardLeft: {
    marginRight: scaleDimension(12),
  },
  avatar: {
    width: scaleDimension(48),
    height: scaleDimension(48),
    borderRadius: scaleDimension(24),
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatarText: {
    fontWeight: "700",
    color: "#6B7280",
    fontSize: scaleDimension(16),
  },
  cardCenter: {
    flex: 1,
    justifyContent: "center",
    gap: scaleDimension(4),
  },
  customerName: {
    fontWeight: "700",
    color: "#1F2937",
    fontSize: scaleDimension(16),
  },
  contactRow: {
    flexDirection: "column",
    gap: scaleDimension(2),
  },
  iconTextPair: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleDimension(6),
  },
  contactText: {
    color: "#6B7280",
    fontSize: scaleDimension(12),
  },
  cardRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: scaleDimension(8),
  },
  spentBadge: {
    alignItems: "flex-end",
  },
  spentLabel: {
    fontSize: scaleDimension(10),
    color: "#9CA3AF",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  spentValue: {
    fontWeight: "700",
    color: "#059669",
  },
  actionButtons: {
    flexDirection: "row",
    gap: scaleDimension(8),
  },
  viewButton: {
    padding: 6,
    backgroundColor: "#D1FAE5",
    borderRadius: 8,
  },
  editButton: {
    padding: 6,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
  },
  loadingFooter: {
    paddingVertical: 24,
    alignItems: "center",
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#ec4899",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: "center",
  },
  retryText: {
    color: "white",
    fontWeight: "600",
  },
});
