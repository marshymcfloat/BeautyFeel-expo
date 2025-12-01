import "@/app/global.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import TanstackProvider from "@/components/Providers/TanstackProvider";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { ToastContainer } from "@/components/ui/toast/ToastContainer";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect } from "react";
import { View } from "react-native";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    console.log("RootLayout mounted");
    return () => {
      console.log("RootLayout unmounted");
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <GluestackUIProvider mode="light">
        <TanstackProvider>
          <StatusBar style="dark" />
          <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(protected-routes)" />
            </Stack>
          </View>
          <ToastContainer />
        </TanstackProvider>
      </GluestackUIProvider>
    </ErrorBoundary>
  );
}
