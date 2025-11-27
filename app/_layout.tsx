import "@/app/global.css";
import TanstackProvider from "@/components/Providers/TanstackProvider";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="light">
      <TanstackProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(protected-routes)" />
        </Stack>
      </TanstackProvider>
    </GluestackUIProvider>
  );
}
