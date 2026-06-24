import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { fetchDoctorPatients } from "../../services/api";

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female";
  conditions: string[];
  lastActivity: string;
  adherence: number;
  alerts: number;
  trend: "up" | "down" | "stable";
}

export default function MyPatientsScreen() {
  const { doctorName: doctorNameParam, email: emailParam } = useLocalSearchParams<{ doctorName?: string; email?: string }>();
  const router = useRouter();
  const [doctorName, setDoctorName] = useState("Doctor");
  const [doctorEmail, setDoctorEmail] = useState("doctor@example.com");
  const [searchQuery, setSearchQuery] = useState("");
  const selectedCondition = "All Conditions";
  const sortBy = "Sort by Name";
  const [viewMode, setViewMode] = useState<"list" | "table">("list");
  const selectedTab: string = "patients";

  useEffect(() => {
    setDoctorName(doctorNameParam || "Doctor");
    setDoctorEmail(emailParam || "doctor@example.com");
  }, [doctorNameParam, emailParam]);

  const [dashboardPatients, setDashboardPatients] = useState<Patient[]>([]);

  useEffect(() => {
    let active = true;
    fetchDoctorPatients(doctorEmail)
      .then((response) => {
        if (!active) return;
        setDashboardPatients(
          (response.patients || []).map((patient: any, index: number) => ({
            id: patient.id || patient._id || String(index + 1),
            name: patient.name,
            age: Number(patient.age || 0),
            gender: patient.gender,
            conditions: patient.conditions || [],
            lastActivity: patient.lastActivity || "Just now",
            adherence: Number(patient.adherence || 0),
            alerts: Number(patient.alerts || 0),
            trend: patient.trend || "stable",
          })),
        );
      })
      .catch((error) => console.log("Failed to load patients:", error));

    return () => {
      active = false;
    };
  }, [doctorEmail]);

  const patients: Patient[] = dashboardPatients;

  const getConditionColor = (condition: string) => {
    const colorMap: { [key: string]: { bg: string; text: string } } = {
      "Diabetes Type 2": { bg: "#FEE2E2", text: "#DC2626" },
      Hypertension: { bg: "#FED7AA", text: "#C2410C" },
      Asthma: { bg: "#FCE7F3", text: "#BE185D" },
      "High Cholesterol": { bg: "#F3E8FF", text: "#7C3AED" },
      Obesity: { bg: "#FEF3C7", text: "#B45309" },
    };
    return colorMap[condition] || { bg: "#E5E7EB", text: "#6B7280" };
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <Ionicons name="trending-up" size={16} color="#10B981" />;
      case "down":
        return <Ionicons name="trending-down" size={16} color="#EF4444" />;
      default:
        return <Ionicons name="remove" size={16} color="#9CA3AF" />;
    }
  };

  const getAdherenceColor = (adherence: number) => {
    if (adherence >= 80) return "#10B981";
    if (adherence >= 60) return "#F59E0B";
    return "#EF4444";
  };

  const renderPatientCard = (patient: Patient) => (
    <TouchableOpacity key={patient.id} style={styles.patientCard}>
      <View style={styles.patientHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={28} color="#3B82F6" />
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{patient.name}</Text>
          <Text style={styles.patientDetails}>
            {patient.age} • {patient.gender}
          </Text>
        </View>
        <Text style={styles.lastActivity}>{patient.lastActivity}</Text>
      </View>

      <View style={styles.conditionsContainer}>
        {patient.conditions.map((condition, index) => {
          const colors = getConditionColor(condition);
          return (
            <View
              key={index}
              style={[styles.conditionTag, { backgroundColor: colors.bg }]}
            >
              <Text style={[styles.conditionText, { color: colors.text }]}>
                {condition}
              </Text>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );

  const renderPatientRow = (patient: Patient) => {
    const adherenceColor = getAdherenceColor(patient.adherence);

    return (
      <View key={patient.id} style={styles.tableRow}>
        <View style={styles.tableCell}>
          <View style={styles.tableCellContent}>
            <View style={styles.smallAvatarContainer}>
              <Ionicons name="person" size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.tableName}>{patient.name}</Text>
              <Text style={styles.tableSubtext}>
                {patient.age} • {patient.gender}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.tableCell}>
          <View style={styles.adherenceContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${patient.adherence}%`,
                    backgroundColor: adherenceColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.adherenceText}>{patient.adherence}%</Text>
          </View>
        </View>

        <View style={styles.tableCell}>
          {patient.alerts > 0 ? (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>{patient.alerts}</Text>
            </View>
          ) : (
            <Text style={styles.noAlerts}>—</Text>
          )}
        </View>

        <View style={styles.tableCell}>{getTrendIcon(patient.trend)}</View>

        <View style={styles.tableCell}>
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={18} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Patients</Text>
            <Text style={styles.headerSubtitle}>
              Manage and monitor your patient roster
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search patients..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <TouchableOpacity style={styles.filterDropdown}>
            <Text style={styles.filterText}>{selectedCondition}</Text>
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterDropdown}>
            <Text style={styles.filterText}>{sortBy}</Text>
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Patient Count */}
        <View style={styles.countSection}>
          <Text style={styles.patientCount}>{patients.length} patients</Text>
        </View>

        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === "list" && styles.viewButtonActive,
            ]}
            onPress={() => setViewMode("list")}
          >
            <Ionicons
              name="list"
              size={20}
              color={viewMode === "list" ? "#3B82F6" : "#9CA3AF"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewButton,
              viewMode === "table" && styles.viewButtonActive,
            ]}
            onPress={() => setViewMode("table")}
          >
            <Ionicons
              name="grid"
              size={20}
              color={viewMode === "table" ? "#3B82F6" : "#9CA3AF"}
            />
          </TouchableOpacity>
        </View>

        {/* Patient List or Table */}
        {viewMode === "list" ? (
          <View style={styles.patientsList}>
            {patients.map(renderPatientCard)}
          </View>
        ) : (
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Patient</Text>
              <Text style={styles.tableHeaderText}>Adherence</Text>
              <Text style={styles.tableHeaderText}>Alerts</Text>
              <Text style={styles.tableHeaderText}>Trend</Text>
              <Text style={styles.tableHeaderText}>Actions</Text>
            </View>

            {/* Table Rows */}
            {patients.map(renderPatientRow)}
          </View>
        )}

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/dochome",
              params: { doctorName, email: doctorEmail },
            })
          }
        >
          <Ionicons
            name="grid"
            size={24}
            color={selectedTab === "dashboard" ? "#3B82F6" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.navLabel,
              selectedTab === "dashboard" && { color: "#3B82F6" },
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="people" size={24} color="#3B82F6" />
          <Text style={[styles.navLabel, { color: "#3B82F6" }]}>
            My Patients
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/alerts",
              params: { doctorName, email: doctorEmail },
            })
          }
        >
          <View style={styles.navIconWithBadge}>
            <Ionicons name="alert-circle" size={24} color="#9CA3AF" />
          </View>
          <Text style={styles.navLabel}>Alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/docplans",
              params: { doctorName, email: doctorEmail },
            })
          }
        >
          <Ionicons name="clipboard" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Plans</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/analytics",
              params: { doctorName, email: doctorEmail },
            })
          }
        >
          <Ionicons name="bar-chart" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Analytics</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  filtersSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterDropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  countSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  patientCount: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  viewToggle: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  viewButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  viewButtonActive: {
    backgroundColor: "#DBEAFE",
  },
  patientsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  patientCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  patientHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  patientDetails: {
    fontSize: 13,
    color: "#6B7280",
  },
  lastActivity: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  conditionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  conditionTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  conditionText: {
    fontSize: 11,
    fontWeight: "600",
  },
  tableContainer: {
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 12,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    alignItems: "center",
  },
  tableCell: {
    flex: 1,
    justifyContent: "center",
  },
  tableCellContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 2,
  },
  smallAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  tableName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  tableSubtext: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  adherenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  adherenceText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    minWidth: 35,
  },
  alertBadge: {
    backgroundColor: "#EF4444",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  alertBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  noAlerts: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 6,
    backgroundColor: "#DBEAFE",
    borderRadius: 6,
  },
  bottomSpacer: {
    height: 20,
  },
  bottomNavigation: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  navIconWithBadge: {
    position: "relative",
  },
  navBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  navBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  navLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
    fontWeight: "600",
  },
});
