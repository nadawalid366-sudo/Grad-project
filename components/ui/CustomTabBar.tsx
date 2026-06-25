import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Dimensions, Platform, Text, Animated, DeviceEventEmitter } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { IconSymbol } from "./icon-symbol";
import { VoiceModal } from "../VoiceModal";
import { getUser } from "../../services/auth";

const { width } = Dimensions.get("window");

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('OPEN_VOICE_MODAL', () => {
      setIsVoiceModalVisible(true);
    });
    return () => subscription.remove();
  }, []);

  const activeRoute = state.routes[state.index];
  const activeRouteName = activeRoute.name;
  
  // Try to get email from user session, fallback to route params
  const user = getUser();
  const email = user?.email || (activeRoute.params as any)?.email || "";

  // Define which tabs to show on the custom tab bar.
  // Patient tabs: home, logs, messages, prof
  // Doctor tabs: dochome, patients, docplans, docprof
  const visibleTabs = ["home", "logs", "messages", "prof", "dochome", "patients", "docplans", "docprof", "docmessages"];

  if (!visibleTabs.includes(activeRouteName)) {
    return null; // Don't show tab bar on auth screens, etc.
  }

  // Determine user role based on authenticated session
  const isDoctor = user?.role === "professional";

  // Define the ordered tabs to show
  const patientTabs = [
    { name: "home", icon: "heart.fill" },
    { name: "logs", icon: "calendar" },
    { name: "VOICE_BUTTON", icon: "mic.fill" },
    { name: "messages", icon: "message.fill" },
    { name: "prof", icon: "person.circle.fill" },
  ];

  const doctorTabs = [
    { name: "dochome", icon: "heart.text.square.fill" },
    { name: "patients", icon: "person.3.fill" },
    { name: "VOICE_BUTTON", icon: "mic.fill" },
    { name: "docmessages", icon: "message.fill" },
    { name: "docprof", icon: "person.circle.fill" },
  ];

  const tabsToShow = isDoctor ? doctorTabs : patientTabs;

  return (
    <>
      <View style={styles.container}>
        <View style={styles.tabBar}>
        {tabsToShow.map((tab, index) => {
          if (tab.name === "VOICE_BUTTON") {
            return (
              <TouchableOpacity
                key="voice_button"
                style={styles.addButton}
                activeOpacity={0.8}
                onPress={() => {
                  setIsVoiceModalVisible(true);
                }}
              >
                <IconSymbol name="mic.fill" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            );
          }

          const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
          const isFocused = routeIndex === state.index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: state.routes[routeIndex]?.key || tab.name,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              // Pass the current params so we don't lose the email
              navigation.navigate(tab.name, { ...activeRoute.params, merge: true });
            }
          };

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              style={styles.tabItem}
            >
              <IconSymbol
                name={tab.icon as any}
                size={26}
                color={isFocused ? "#2563EB" : "#94A3B8"}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>

      <VoiceModal 
        visible={isVoiceModalVisible} 
        onClose={() => setIsVoiceModalVisible(false)} 
        email={email}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 30 : 20,
    width: width,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    width: "90%",
    height: 70,
    borderRadius: 35,
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB", // Primary Blue
    alignItems: "center",
    justifyContent: "center",
    marginTop: -30, // Elevated
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
