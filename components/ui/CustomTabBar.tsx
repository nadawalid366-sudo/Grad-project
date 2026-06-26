import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Text,
  DeviceEventEmitter,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { IconSymbol } from "./icon-symbol";
import { VoiceModal } from "../VoiceModal";
import { getUser } from "../../services/auth";

const { width } = Dimensions.get("window");

// ─── Patient tab config ───────────────────────────────────────────────────────
// 5-slot design: icon | icon | [MIC CENTER] | icon | icon
const PATIENT_TABS = [
  { name: "home",     ionIcon: "home",          label: "Home" },
  { name: "logs",     ionIcon: "calendar",      label: "Logs" },
  { name: "_VOICE_",  ionIcon: "mic",           label: "" },        // centre mic
  { name: "messages", ionIcon: "chatbubble",    label: "Messages" },
  { name: "prof",     ionIcon: "person",        label: "Profile" },
] as const;

// ─── Doctor tab config ────────────────────────────────────────────────────────
// 6 flat professional tabs — no centre button, no Logs
const DOCTOR_TABS = [
  { name: "dochome",     ionIcon: "grid",          label: "Dashboard" },
  { name: "patients",    ionIcon: "people",         label: "Patients" },
  { name: "docalerts",   ionIcon: "notifications",  label: "Alerts" },
  { name: "docmessages", ionIcon: "chatbubble",     label: "Messages" },
  { name: "docplans",    ionIcon: "clipboard",      label: "Plans" },
  { name: "docprof",     ionIcon: "person",         label: "Profile" },
] as const;

// Doctor-only routes — used as the primary signal for role detection.
// This prevents a stale/null getUser() from showing the wrong tab bar.
const DOCTOR_ROUTES = new Set([
  "dochome", "patients", "docalerts", "docmessages", "docprof", "docplans",
]);

const PATIENT_ROUTES = new Set([
  "home", "logs", "messages", "prof",
]);

const ALL_VISIBLE = [
  ...Array.from(PATIENT_ROUTES),
  ...Array.from(DOCTOR_ROUTES),
];

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [voiceVisible, setVoiceVisible] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);

  useEffect(() => {
    const subs = [
      DeviceEventEmitter.addListener("OPEN_VOICE_MODAL", () => setVoiceVisible(true)),
      DeviceEventEmitter.addListener("HIDE_TAB_BAR",     () => setThreadOpen(true)),
      DeviceEventEmitter.addListener("SHOW_TAB_BAR",     () => setThreadOpen(false)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const activeRoute = state.routes[state.index];
  const activeRouteName = activeRoute.name;

  // Hide on non-tab screens or while a chat thread is open
  if (!ALL_VISIBLE.includes(activeRouteName) || threadOpen) return null;

  // Route is the most reliable signal: if we're on a doctor route, show doctor
  // tabs regardless of whether getUser() has finished hydrating from storage.
  const user = getUser();
  const email = user?.email || (activeRoute.params as any)?.email || "";
  const isDoctor =
    DOCTOR_ROUTES.has(activeRouteName) || user?.role === "professional";

  // ── Doctor navigation ────────────────────────────────────────────────────

  if (isDoctor) {
    return (
      <View style={styles.docContainer}>
        <View style={styles.docTabBar}>
          {DOCTOR_TABS.map((tab) => {
            const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
            const isFocused = routeIndex === state.index;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: state.routes[routeIndex]?.key ?? tab.name,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(tab.name, {
                  ...activeRoute.params,
                  merge: true,
                } as any);
              }
            };

            return (
              <TouchableOpacity
                key={tab.name}
                onPress={onPress}
                style={styles.docTabItem}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.docIconWrap,
                    isFocused && styles.docIconWrapActive,
                  ]}
                >
                  <Ionicons
                    name={(isFocused ? tab.ionIcon : `${tab.ionIcon}-outline`) as any}
                    size={20}
                    color={isFocused ? "#2563EB" : "#94A3B8"}
                  />
                </View>
                <Text
                  style={[
                    styles.docTabLabel,
                    isFocused && styles.docTabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // ── Patient navigation ───────────────────────────────────────────────────

  return (
    <>
      <View style={styles.patContainer}>
        <View style={styles.patTabBar}>
          {PATIENT_TABS.map((tab, index) => {
            if (tab.name === "_VOICE_") {
              return (
                <TouchableOpacity
                  key="_voice_"
                  style={styles.patVoiceBtn}
                  activeOpacity={0.8}
                  onPress={() => setVoiceVisible(true)}
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
                target: state.routes[routeIndex]?.key ?? tab.name,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(tab.name, {
                  ...activeRoute.params,
                  merge: true,
                } as any);
              }
            };

            return (
              <TouchableOpacity
                key={tab.name}
                onPress={onPress}
                style={styles.patTabItem}
              >
                <Ionicons
                  name={(isFocused ? tab.ionIcon : `${tab.ionIcon}-outline`) as any}
                  size={26}
                  color={isFocused ? "#2563EB" : "#94A3B8"}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <VoiceModal
        visible={voiceVisible}
        onClose={() => setVoiceVisible(false)}
        email={email}
      />
    </>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Doctor bar ──────────────────────────────────────────────────────────
  docContainer: {
    position: "absolute",
    bottom: 0,
    width: width,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    paddingBottom: Platform.OS === "ios" ? 20 : 0,
    elevation: 10,
    zIndex: 100,
  },
  docTabBar: {
    flexDirection: "row",
    height: 60,
    alignItems: "center",
  },
  docTabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 2,
  },
  docIconWrap: {
    width: 36,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  docIconWrapActive: {
    backgroundColor: "#EFF6FF",
  },
  docTabLabel: {
    fontSize: 9,
    fontWeight: "500",
    color: "#94A3B8",
  },
  docTabLabelActive: {
    color: "#2563EB",
    fontWeight: "600",
  },

  // ── Patient bar ──────────────────────────────────────────────────────────
  patContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 30 : 20,
    width: width,
    alignItems: "center",
    justifyContent: "center",
  },
  patTabBar: {
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
  patTabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  patVoiceBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -30,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
