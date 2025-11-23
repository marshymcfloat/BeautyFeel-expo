import { authLoginAction } from "@/lib/actions/authActions";
import { authLoginSchema, LoginSchemaTypes } from "@/lib/zod-schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Check, LoaderCircle } from "lucide-react-native";
import React from "react";
import { useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";
import { FormField } from "../form/FormField";
import { Toast, ToastDescription, ToastTitle, useToast } from "../ui/toast";

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
              className="bg-white flex-row items-center gap-4 p-4 shadow-md  "
            >
              <Check color="green" size={20} className="mt-0.5" />

              <View className="flex-1 gap-1">
                <ToastTitle className="text-black font-bold">
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
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <FormField
        control={control}
        name="password"
        label="Password"
        placeholder="********"
        secureTextEntry
      />

      <Pressable
        onPress={handleSubmit(handleSubmission)}
        disabled={loginPending}
        className={`bg-pink-500 rounded-md py-3 mt-4 ${
          loginPending ? "opacity-50" : ""
        }`}
      >
        <View className="flex-row justify-center items-center gap-2">
          {loginPending && (
            <LoaderCircle className="animate-spin" color="white" size={16} />
          )}
          <Text className="text-white text-center font-bold">
            {loginPending ? "Logging in..." : "Login"}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => onSuccess(false)}
        disabled={loginPending}
        className="mt-4"
      >
        <Text className="text-center text-gray-500">Cancel</Text>
      </Pressable>
    </View>
  );
}
