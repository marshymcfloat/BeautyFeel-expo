import "@/app/global.css";
import TanstackProvider from "@/components/Providers/TanstackProvider";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { Stack } from "expo-router";
import "./global.css";

export default function RootLayout() {
  return (
    <GluestackUIProvider mode="dark">
      <TanstackProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </TanstackProvider>
    </GluestackUIProvider>
  );
}
