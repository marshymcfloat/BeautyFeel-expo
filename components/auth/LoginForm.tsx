import { authLoginAction } from "@/lib/actions/authActions";
import { supabase } from "@/lib/utils/supabase";
import { authLoginSchema, LoginSchemaTypes } from "@/lib/zod-schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Loader2 } from "lucide-react-native";
import React from "react";
import { useForm } from "react-hook-form";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { FormField } from "../form/FormField";
import RotatingSpinner from "../ui/RotatingSpinner";
import { Toast, ToastDescription, ToastTitle, useToast } from "../ui/toast";

function LoadingSpinner({ color = "white" }: { color?: string }) {
  return (
    <RotatingSpinner isAnimating={true} size={18}>
      <Loader2 size={18} color={color} />
    </RotatingSpinner>
  );
}

export default function LoginForm({
  onSuccess,
}: {
  onSuccess: (value: boolean) => void;
}) {
  const toast = useToast();
  const router = useRouter();

  const form = useForm<LoginSchemaTypes>({
    resolver: zodResolver(authLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { control, handleSubmit } = form;

  const { mutate: login, isPending: loginPending } = useMutation({
    mutationFn: authLoginAction,
    onSuccess: async (data) => {
      try {
        console.log(
          "Mutation onSuccess called with data:",
          JSON.stringify(data)
        );

        if (!data.success) {
          console.error("Login failed:", data.error);
          toast.show({
            placement: "top",
            duration: 3000,
            render: ({ id }) => {
              const uniqueToastId = "toast-" + id;
              return (
                <Toast
                  variant="outline"
                  nativeID={uniqueToastId}
                  action="error"
                >
                  <ToastTitle>Login error</ToastTitle>
                  <ToastDescription>{data.error}</ToastDescription>
                </Toast>
              );
            },
          });
          return;
        }

        console.log("Login successful! Verifying session...");

        await new Promise((resolve) => setTimeout(resolve, 300));

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        console.log("Session check result:", {
          hasSession: !!session,
          error: sessionError,
        });

        if (sessionError || !session) {
          console.error("Session not found after login:", sessionError);
          toast.show({
            placement: "top",
            duration: 3000,
            render: ({ id }) => (
              <Toast action="error" variant="outline" nativeID={"toast-" + id}>
                <ToastTitle>Session Error</ToastTitle>
                <ToastDescription>
                  Login succeeded but session could not be established. Please
                  try again.
                </ToastDescription>
              </Toast>
            ),
          });
          return;
        }

        console.log("Session verified! User ID:", session.user?.id);
        console.log("Platform:", Platform.OS);

        console.log("Closing modal...");
        onSuccess(false);
      } catch (error) {
        console.error("Error in onSuccess callback:", error);
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => (
            <Toast action="error" variant="outline" nativeID={"toast-" + id}>
              <ToastTitle>Unexpected Error</ToastTitle>
              <ToastDescription>
                {error instanceof Error
                  ? error.message
                  : "An unexpected error occurred"}
              </ToastDescription>
            </Toast>
          ),
        });
      }
    },
    onError: (error) => {
      console.error("Mutation onError called:", error);
      toast.show({
        placement: "top",
        duration: 3000,
        render: ({ id }) => (
          <Toast action="error" variant="outline" nativeID={"toast-" + id}>
            <ToastTitle>Login Failed</ToastTitle>
            <ToastDescription>
              {error.message || "Something went wrong. Please try again."}
            </ToastDescription>
          </Toast>
        ),
      });
    },
    onSettled: (data, error) => {
      console.log("Mutation onSettled called", {
        hasData: !!data,
        hasError: !!error,
      });
    },
  });

  function handleSubmission(data: LoginSchemaTypes) {
    console.log("Form submitted, attempting login with email:", data.email);
    login(data);
  }

  return (
    <View>
      <FormField
        control={control}
        name="email"
        label="Email"
        placeholder="you@example.com"
        placeholderTextColor="#9CA3AF"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <FormField
        control={control}
        name="password"
        label="Password"
        placeholder="Enter your password"
        placeholderTextColor="#9CA3AF"
        secureTextEntry
      />

      <Pressable
        onPress={handleSubmit(handleSubmission)}
        disabled={loginPending}
        style={[
          styles.signInButtonContainer,
          { opacity: loginPending ? 0.8 : 1 },
        ]}
      >
        <LinearGradient
          colors={["#ec4899", "#d946ef"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.signInButtonGradient}
        >
          {loginPending && (
            <View style={styles.spinnerContainer}>
              <LoadingSpinner />
            </View>
          )}
          <Text style={styles.signInButtonText}>
            {loginPending ? "Signing in..." : "Sign In"}
          </Text>
        </LinearGradient>
      </Pressable>

      <Pressable
        onPress={() => onSuccess(false)}
        disabled={loginPending}
        style={styles.cancelButton}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  signInButtonContainer: {
    marginTop: 24,
    borderRadius: 12,
    overflow: "hidden",
  },
  signInButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    minHeight: 52,
  },
  spinnerContainer: {
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  signInButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  cancelButtonText: {
    textAlign: "center",
    color: "#6b7280",
    fontWeight: "500",
  },
});
