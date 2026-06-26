import { Tabs } from "expo-router";
import React from "react";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { CustomTabBar } from "@/components/ui/CustomTabBar";
import { FloatingAura } from "@/components/ui/FloatingAura";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <>
    <Tabs
      backBehavior="history"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Authentication and Setup Screens */}
      <Tabs.Screen name="index" options={{ title: "Home", href: null }} />
      <Tabs.Screen name="splash" options={{ title: "Splash", href: null }} />
      <Tabs.Screen name="login" options={{ title: "Login", href: null }} />
      <Tabs.Screen name="signup" options={{ title: "Signup", href: null }} />
      <Tabs.Screen name="profile" options={{ title: "Profile Setup", href: null }} />
      <Tabs.Screen name="doclogin" options={{ title: "Doctor Login", href: null }} />

      {/* Patient Tabs */}
      <Tabs.Screen name="home" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="logs" options={{ title: "Logs" }} />
      <Tabs.Screen name="ai-chat" options={{ title: "AI Chat", href: null }} /> {/* Hidden from primary custom tab bar, but still accessible */}
      <Tabs.Screen name="messages" options={{ title: "Messages" }} />
      <Tabs.Screen name="prof" options={{ title: "Profile" }} />

      {/* Doctor Tabs */}
      <Tabs.Screen name="dochome" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="patients" options={{ title: "Patients" }} />
      <Tabs.Screen name="docalerts" options={{ title: "Alerts" }} />
      <Tabs.Screen name="docmessages" options={{ title: "Messages" }} />
      <Tabs.Screen name="docplans" options={{ title: "Plans", href: null }} />
      <Tabs.Screen name="docprof" options={{ title: "Doctor Profile" }} />
      
    </Tabs>
      <FloatingAura />
    </>
  );
}
