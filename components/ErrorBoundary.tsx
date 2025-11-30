import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <Text style={styles.emoji}>⚠️</Text>
              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.subtitle}>
                The app encountered an error. Please check the details below or
                restart the app.
              </Text>

              {this.state.error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorTitle}>Error Message:</Text>
                  <Text style={styles.errorText}>
                    {this.state.error.toString()}
                  </Text>
                </View>
              )}

              {this.state.errorInfo && (
                <View style={styles.stackBox}>
                  <Text style={styles.stackTitle}>Stack Trace:</Text>
                  <ScrollView style={styles.stackScrollView}>
                    <Text style={styles.stackText}>
                      {this.state.errorInfo.componentStack}
                    </Text>
                  </ScrollView>
                </View>
              )}

              <Pressable
                onPress={this.handleReset}
                style={styles.resetButton}
              >
                <Text style={styles.resetButtonText}>Try Again</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 600,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#4b5563",
    marginBottom: 24,
    textAlign: "center",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: "100%",
  },
  errorTitle: {
    color: "#991b1b",
    fontWeight: "600",
    marginBottom: 8,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 14,
    fontFamily: "monospace",
  },
  stackBox: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: "100%",
  },
  stackTitle: {
    color: "#1f2937",
    fontWeight: "600",
    marginBottom: 8,
  },
  stackScrollView: {
    maxHeight: 200,
  },
  stackText: {
    color: "#374151",
    fontSize: 12,
    fontFamily: "monospace",
  },
  resetButton: {
    backgroundColor: "#ec4899",
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  resetButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
