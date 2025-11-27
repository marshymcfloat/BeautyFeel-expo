import { authLoginAction } from "@/lib/actions/authActions";
import { authLoginSchema, LoginSchemaTypes } from "@/lib/zod-schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Check, Loader2 } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { FormField } from "../form/FormField";
import { Toast, ToastDescription, ToastTitle, useToast } from "../ui/toast";

function LoadingSpinner({ color = "white" }: { color?: string }) {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Loader2 size={18} color={color} />
    </Animated.View>
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
    onSuccess: (data) => {
      if (!data.success) {
        toast.show({
          placement: "top",
          duration: 3000,
          render: ({ id }) => {
            const uniqueToastId = "toast-" + id;
            return (
              <Toast variant="outline" nativeID={uniqueToastId} action="error">
                <ToastTitle>Login error</ToastTitle>
                <ToastDescription>{data.error}</ToastDescription>
              </Toast>
            );
          },
        });
        return;
      }
      toast.show({
        placement: "top",
        duration: 3000,
        render: ({ id }) => {
          return (
            <Toast
              action="success"
              variant="outline"
              nativeID={`toast-${id}`}
              className="bg-white flex-row items-center gap-4 p-4 shadow-md"
            >
              <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
                <Check color="#22c55e" size={18} />
              </View>
              <View className="flex-1 gap-1">
                <ToastTitle className="text-gray-900 font-bold">
                  Login Successful
                </ToastTitle>
                <ToastDescription className="text-gray-600 text-xs">
                  Welcome back! Redirecting you now...
                </ToastDescription>
              </View>
            </Toast>
          );
        },
      });

      onSuccess(true);
      router.replace("/home");
    },
    onError: (error) => {
      toast.show({
        placement: "top",
        render: ({ id }) => (
          <Toast action="error" variant="outline" nativeID={"toast-" + id}>
            <ToastTitle>Login Failed</ToastTitle>
            <ToastDescription>
              {error.message || "Something went wrong"}
            </ToastDescription>
          </Toast>
        ),
      });
    },
  });

  function handleSubmission(data: LoginSchemaTypes) {
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
        className="mt-6 rounded-xl overflow-hidden active:opacity-90"
        style={{ opacity: loginPending ? 0.7 : 1 }}
      >
        <LinearGradient
          colors={["#ec4899", "#d946ef"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="py-4 items-center justify-center flex-row"
        >
          {loginPending && (
            <View className="mr-2">
              <LoadingSpinner />
            </View>
          )}
          <Text className="text-white font-bold text-base">
            {loginPending ? "Signing in..." : "Sign In"}
          </Text>
        </LinearGradient>
      </Pressable>

      <Pressable
        onPress={() => onSuccess(false)}
        disabled={loginPending}
        className="mt-4 py-3"
      >
        <Text className="text-center text-gray-500 font-medium">Cancel</Text>
      </Pressable>
    </View>
  );
}
