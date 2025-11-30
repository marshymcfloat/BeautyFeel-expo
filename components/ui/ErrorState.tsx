import { COLORS } from "@/lib/utils/constants";
import { scaleDimension, useResponsive } from "@/lib/utils/responsive";
import { AlertCircle } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { ResponsiveText } from "./ResponsiveText";

interface ErrorStateProps {
  message: string;
  title?: string;
}

export function ErrorState({ message, title = "Error" }: ErrorStateProps) {
  const { isSmallPhone } = useResponsive();
  const iconSize = isSmallPhone ? 40 : 48;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <AlertCircle size={iconSize} color={COLORS.error} />
      </View>
      <ResponsiveText variant="xl" style={styles.title} numberOfLines={2}>
        {title}
      </ResponsiveText>
      <ResponsiveText variant="md" style={styles.message} numberOfLines={4}>
        {message}
      </ResponsiveText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scaleDimension(40),
    paddingHorizontal: scaleDimension(32),
  },
  iconContainer: {
    width: scaleDimension(96),
    height: scaleDimension(96),
    borderRadius: 999,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scaleDimension(24),
  },
  title: {
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: scaleDimension(8),
  },
  message: {
    color: COLORS.error,
    textAlign: "center",
    marginTop: scaleDimension(8),
  },
});
