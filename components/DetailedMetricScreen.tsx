import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fetchPatientDashboard } from "../services/api";

const { width } = Dimensions.get("window");

export function DetailedMetricScreen({ type, email }: { type: string; email?: string }) {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    if (!email) return;
    fetchPatientDashboard(email).then((res: any) => {
      if (res.healthMetrics) setMetrics(res.healthMetrics);
    }).catch(console.error);
  }, [email]);

  // Standardize to use medical blue as the primary accent
  let accentColor = "#2563EB"; // Default Primary Blue
  let title = "Tracking";
  let mainValue = "";
  let subValue = "";
  let icon = "leaf";
  let chartPlaceholder = "";

  switch (type) {
    case "sleep":
      title = "Sleep tracking";
      mainValue = metrics?.sleep?.hours ? `${metrics.sleep.hours}h` : "--h";
      subValue = "Sleep duration";
      icon = "moon-waning-crescent";
      chartPlaceholder = "Daily goal: 8 hours";
      break;
    case "vitals": // Heart
    case "heart":
      accentColor = "#EF4444"; // Keep Red for Heart
      title = "Heart analysis";
      mainValue = metrics?.vitals?.heartRate ? `${metrics.vitals.heartRate}` : "--";
      subValue = "bpm";
      icon = "heart";
      chartPlaceholder = metrics?.vitals?.bloodPressure ? `${metrics.vitals.bloodPressure} mmHg` : "No recent reading";
      break;
    case "water":
      title = "Water tracking";
      mainValue = `${metrics?.water?.amount || 0} of ${metrics?.water?.goal || 15}`;
      subValue = "glasses";
      icon = "water";
      chartPlaceholder = `Daily goal: ${metrics?.water?.goal || 15} glasses`;
      break;
    case "medication": // Pills
      title = "Medication";
      mainValue = `${metrics?.medication?.taken || 0}/${metrics?.medication?.goal || 0}`;
      subValue = "Pills";
      icon = "pill";
      chartPlaceholder = "Daily adherence";
      break;
    default:
      title = "Health tracking";
      mainValue = "Active";
      subValue = "Status";
      icon = "leaf";
      break;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity style={styles.checkButton}>
          <Ionicons name="checkmark" size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.mainCircle}>
          <Text style={styles.subValue}>{subValue}</Text>
          <Text style={[styles.mainValue, { color: accentColor }]}>{mainValue}</Text>
        </View>

        <View style={styles.chartArea}>
          <MaterialCommunityIcons name={icon as any} size={48} color={accentColor} style={{ opacity: 0.8, alignSelf: 'center', marginBottom: 20 }} />
          <Text style={styles.chartText}>{chartPlaceholder}</Text>
        </View>

        <TouchableOpacity style={[styles.addButton, { backgroundColor: accentColor }]}>
          <Text style={styles.addButtonText}>Add data</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Light slate-blue
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  checkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: 60,
  },
  mainCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  mainValue: {
    fontSize: 64,
    fontWeight: "800",
    letterSpacing: -2,
  },
  subValue: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: -10,
  },
  chartArea: {
    width: "80%",
    height: 150,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  addButton: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
