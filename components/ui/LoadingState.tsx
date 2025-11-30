import { View, StyleSheet } from "react-native";
import { Skeleton, SkeletonCard, SkeletonList } from "./Skeleton";

interface LoadingStateProps {
  variant?: "spinner" | "skeleton" | "card" | "list";
  count?: number;
}

export function LoadingState({
  variant = "skeleton",
  count = 3,
}: LoadingStateProps) {
  if (variant === "card") {
    return (
      <View style={styles.container}>
        <SkeletonCard count={count} />
      </View>
    );
  }

  if (variant === "list") {
    return (
      <View style={styles.container}>
        <SkeletonList count={count} />
      </View>
    );
  }

  if (variant === "skeleton") {
    return (
      <View style={styles.container}>
        <Skeleton width="100%" height={60} borderRadius={12} />
        <Skeleton width="80%" height={20} borderRadius={8} style={styles.marginTop} />
        <Skeleton width="60%" height={16} borderRadius={6} style={styles.marginTop} />
      </View>
    );
  }

  // Fallback to simple skeleton if variant is "spinner" (for backward compatibility)
  return (
    <View style={styles.container}>
      <Skeleton width="100%" height={60} borderRadius={12} />
      <Skeleton width="80%" height={20} borderRadius={8} style={styles.marginTop} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  marginTop: {
    marginTop: 12,
  },
});

