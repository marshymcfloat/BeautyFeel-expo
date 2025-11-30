import { useAuth } from "@/lib/hooks/useAuth";
import { Tabs } from "expo-router";
import {
  Calendar,
  Home,
  Settings,
  TrendingUp,
  User,
} from "lucide-react-native";
import { Platform, StyleSheet, View } from "react-native";

export default function TabsLayout() {
  const { hasRole, loading } = useAuth();
  const isOwner = hasRole("owner");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ec4899",
        tabBarInactiveTintColor: "#9CA3AF",
        sceneStyle:
          Platform.OS === "web"
            ? { backgroundColor: "#fce7f3" }
            : { backgroundColor: "transparent" },
        tabBarStyle: {
          position: Platform.OS === "web" ? "relative" : "absolute",
          bottom:
            Platform.OS === "web" ? 0 : Platform.OS === "android" ? 16 : 20,
          marginHorizontal: Platform.OS === "web" ? 0 : 20,
          height: 64,
          borderRadius: Platform.OS === "web" ? 0 : 32,
          backgroundColor: "white",
          borderTopWidth: Platform.OS === "web" ? 1 : 0,
          borderTopColor: Platform.OS === "web" ? "#E5E7EB" : "transparent",
          borderWidth: 0,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          paddingBottom: Platform.OS === "ios" ? 8 : 4,
          paddingTop: Platform.OS === "ios" ? 8 : 4,
          overflow: "visible",
        },
        tabBarItemStyle: {
          height: "100%",
          paddingTop: 0,
          paddingBottom: 0,
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
        },
        lazy: true,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconContainer,
                focused && styles.tabIconContainerFocused,
              ]}
            >
              <Home size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconContainer,
                focused && styles.tabIconContainerFocused,
              ]}
            >
              <Calendar
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: "Sales",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconContainer,
                focused && styles.tabIconContainerFocused,
              ]}
            >
              <TrendingUp
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
          href: isOwner ? "/sales" : null,
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          title: "Manage",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconContainer,
                focused && styles.tabIconContainerFocused,
              ]}
            >
              <Settings
                size={22}
                color={color}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
          href: isOwner ? "/manage" : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.tabIconContainer,
                focused && styles.tabIconContainerFocused,
              ]}
            >
              <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    padding: 6,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tabIconContainerFocused: {
    backgroundColor: "#fdf2f8",
  },
});
