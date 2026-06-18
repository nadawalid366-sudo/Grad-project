import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { fetchDoctorDashboard, saveDoctorPlan } from "../../services/api";

interface MetricCard {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
  backgroundColor: string;
}

interface Alert {
  id: string;
  patientName: string;
  issue: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  time: string;
}

interface Activity {
  id: string;
  patientName: string;
  action: string;
  time: string;
  icon: string;
  iconColor: string;
}

interface CreatedPlan {
  id: string;
  planType: string;
  patientName: string;
  goal: string;
  description: string;
  duration: string;
}

export default function DoctorDashboard() {
  const { doctorName: doctorNameParam, email: emailParam } = useLocalSearchParams<{ doctorName?: string; email?: string }>();
  const router = useRouter();
  const [doctorName, setDoctorName] = useState("Doctor");
  const [doctorEmail, setDoctorEmail] = useState("doctor@example.com");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [isCreatePlanModalVisible, setIsCreatePlanModalVisible] =
    useState(false);
  const [newPlanType, setNewPlanType] = useState<"Meal Plan" | "Workout Plan">(
    "Meal Plan",
  );
  const [newPlanPatientName, setNewPlanPatientName] = useState("");
  const [newPlanGoal, setNewPlanGoal] = useState("");
  const [newPlanDescription, setNewPlanDescription] = useState("");
  const [newPlanDuration, setNewPlanDuration] = useState("");
  const [createdPlans] = useState<CreatedPlan[]>([]);

  useEffect(() => {
    setDoctorName(doctorNameParam || "Doctor");
    setDoctorEmail(emailParam || "doctor@example.com");
  }, [doctorNameParam, emailParam]);

  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    let active = true;
    fetchDoctorDashboard(doctorEmail)
      .then((response) => {
        if (!active) return;
        setDashboardData(response);
        if (response.doctor?.doctorName) {
          setDoctorName(String(response.doctor.doctorName));
        }
      })
      .catch((error) => {
        console.log("Failed to load doctor dashboard:", error);
      });

    return () => {
      active = false;
    };
  }, [doctorEmail]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return { bg: "#FEE2E2", text: "#DC2626", border: "#EF4444" };
      case "High":
        return { bg: "#FED7AA", text: "#C2410C", border: "#F59E0B" };
      case "Medium":
        return { bg: "#FEF3C7", text: "#B45309", border: "#F59E0B" };
      case "Low":
        return { bg: "#DBEAFE", text: "#1E40AF", border: "#3B82F6" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280", border: "#9CA3AF" };
    }
  };

  const renderMetricCard = (card: MetricCard) => (
    <View key={card.id} style={styles.metricCard}>
      <View
        style={[
          styles.metricIconContainer,
          { backgroundColor: card.backgroundColor },
        ]}
      >
        <MaterialCommunityIcons
          name={card.icon as any}
          size={28}
          color={card.color}
        />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricTitle}>{card.title}</Text>
        <Text style={styles.metricValue}>{card.value}</Text>
        <Text style={styles.metricSubtitle}>{card.subtitle}</Text>
      </View>
    </View>
  );

  const renderAlert = (alert: Alert) => {
    const colors = getSeverityColor(alert.severity);
    return (
      <TouchableOpacity
        key={alert.id}
        style={[
          styles.alertCard,
          { backgroundColor: colors.bg, borderLeftColor: colors.border },
        ]}
      >
        <View style={styles.alertHeader}>
          <Text style={styles.alertPatientName}>{alert.patientName}</Text>
          <View
            style={[styles.severityBadge, { backgroundColor: colors.text }]}
          >
            <Text style={styles.severityText}>{alert.severity}</Text>
          </View>
        </View>
        <Text style={styles.alertIssue}>{alert.issue}</Text>
        <Text style={styles.alertTime}>{alert.time}</Text>
      </TouchableOpacity>
    );
  };

  const renderActivity = (activity: Activity) => (
    <View key={activity.id} style={styles.activityItem}>
      <View
        style={[
          styles.activityIcon,
          { backgroundColor: activity.iconColor + "20" },
        ]}
      >
        <MaterialCommunityIcons
          name={activity.icon as any}
          size={20}
          color={activity.iconColor}
        />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityPatient}>{activity.patientName}</Text>
        <Text style={styles.activityAction}>{activity.action}</Text>
      </View>
      <Text style={styles.activityTime}>{activity.time}</Text>
    </View>
  );

  const handleOpenCreatePlanModal = (
    planType: "Meal Plan" | "Workout Plan",
  ) => {
    setNewPlanType(planType);
    setNewPlanPatientName("");
    setNewPlanGoal("");
    setNewPlanDescription("");
    setNewPlanDuration("");
    setIsCreatePlanModalVisible(true);
  };

  const handleCloseCreatePlanModal = () => {
    setIsCreatePlanModalVisible(false);
  };

  const handleSaveCreatedPlan = () => {
    if (
      !newPlanPatientName.trim() ||
      !newPlanGoal.trim() ||
      !newPlanDescription.trim()
    ) {
      return;
    }
    if (doctorEmail) {
      saveDoctorPlan(doctorEmail, {
        patientName: newPlanPatientName.trim(),
        patientAge: 0,
        planType: newPlanType,
        status: "Active",
        startDate: new Date().toISOString(),
        endDate: "",
        adherence: 0,
        description: newPlanDescription.trim(),
        goals: [newPlanGoal.trim()],
      }).catch((error) => console.log("Failed to save plan:", error));
    }
    handleCloseCreatePlanModal();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header with Search */}
        <View style={styles.header}>
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
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications" size={24} color="#6B7280" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>5</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-circle" size={32} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Welcome Banner */}
        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeTitle}>
            Welcome back, Dr. {doctorName}! 👋
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Here&apos;s what&apos;s happening with your patients today
          </Text>
        </View>

        {/* Metric Cards */}
        <View style={styles.metricsSection}>
          {(dashboardData?.metrics || []).map(renderMetricCard)}
        </View>

        {/* Engagement Card */}
        <View style={styles.engagementCard}>
          <View style={styles.engagementIconContainer}>
            <MaterialCommunityIcons
              name="hand-wave"
              size={24}
              color="#F59E0B"
            />
          </View>
          <Text style={styles.engagementTitle}>Avg Engagement</Text>
          <Text style={styles.engagementValue}>87%</Text>
          <Text style={styles.engagementSubtitle}>+3% vs last week</Text>
        </View>

        {/* Recent Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.alertsList}>
            {(dashboardData?.recentAlerts || []).map(renderAlert)}
          </View>
        </View>

        {/* Patient Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Activity</Text>
          <View style={styles.activityList}>
            {(dashboardData?.patientActivity || []).map(renderActivity)}
          </View>
        </View>

        {/* Action Tiles */}
        <View style={styles.section}>
          <View style={styles.actionTilesContainer}>
            <TouchableOpacity
              style={styles.actionTile}
              onPress={() => handleOpenCreatePlanModal("Meal Plan")}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: "#FEF3C7" },
                ]}
              >
                <MaterialCommunityIcons
                  name="food-apple"
                  size={28}
                  color="#F59E0B"
                />
              </View>
              <Text style={styles.actionTileTitle}>Create Meal Plan</Text>
              <Text style={styles.actionTileSubtitle}>
                Design a nutrition plan for your patient
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionTile}
              onPress={() => handleOpenCreatePlanModal("Workout Plan")}
            >
              <View
                style={[
                  styles.actionIconContainer,
                  { backgroundColor: "#DBEAFE" },
                ]}
              >
                <MaterialCommunityIcons
                  name="dumbbell"
                  size={28}
                  color="#3B82F6"
                />
              </View>
              <Text style={styles.actionTileTitle}>Create Workout Plan</Text>
              <Text style={styles.actionTileSubtitle}>
                Build a fitness routine for your patient
              </Text>
            </TouchableOpacity>

            {createdPlans.length > 0 && (
              <View style={styles.recentPlanCard}>
                <Text style={styles.recentPlanLabel}>Latest Plan Created</Text>
                <Text style={styles.recentPlanTitle}>
                  {createdPlans[0].planType} for {createdPlans[0].patientName}
                </Text>
                <Text style={styles.recentPlanText}>
                  Goal: {createdPlans[0].goal}
                </Text>
                <Text style={styles.recentPlanText}>
                  Duration: {createdPlans[0].duration}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={isCreatePlanModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseCreatePlanModal}
      >
        <View style={styles.planModalOverlay}>
          <View style={styles.planModalContent}>
            <View style={styles.planModalHeader}>
              <Text style={styles.planModalTitle}>Create {newPlanType}</Text>
              <TouchableOpacity onPress={handleCloseCreatePlanModal}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.planFieldLabel}>Patient Name</Text>
              <TextInput
                style={styles.planInput}
                placeholder="Enter patient name"
                value={newPlanPatientName}
                onChangeText={setNewPlanPatientName}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.planFieldLabel}>Primary Goal</Text>
              <TextInput
                style={styles.planInput}
                placeholder={
                  newPlanType === "Meal Plan"
                    ? "e.g. Reduce blood glucose"
                    : "e.g. Improve endurance"
                }
                value={newPlanGoal}
                onChangeText={setNewPlanGoal}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.planFieldLabel}>Plan Description</Text>
              <TextInput
                style={[styles.planInput, styles.planInputMultiline]}
                placeholder={
                  newPlanType === "Meal Plan"
                    ? "Describe meals, calories, and rules..."
                    : "Describe workouts, sets, and schedule..."
                }
                value={newPlanDescription}
                onChangeText={setNewPlanDescription}
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.planFieldLabel}>Duration</Text>
              <TextInput
                style={styles.planInput}
                placeholder="e.g. 4 weeks"
                value={newPlanDuration}
                onChangeText={setNewPlanDuration}
                placeholderTextColor="#9CA3AF"
              />

              <TouchableOpacity
                style={[
                  styles.planSaveButton,
                  (!newPlanPatientName.trim() ||
                    !newPlanGoal.trim() ||
                    !newPlanDescription.trim()) &&
                    styles.planSaveButtonDisabled,
                ]}
                onPress={handleSaveCreatedPlan}
                disabled={
                  !newPlanPatientName.trim() ||
                  !newPlanGoal.trim() ||
                  !newPlanDescription.trim()
                }
              >
                <Text style={styles.planSaveButtonText}>Save Plan</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setSelectedTab("dashboard")}
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

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/patients",
              params: { doctorName },
            })
          }
        >
          <Ionicons
            name="people"
            size={24}
            color={selectedTab === "patients" ? "#3B82F6" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.navLabel,
              selectedTab === "patients" && { color: "#3B82F6" },
            ]}
          >
            My Patients
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({ pathname: "/(tabs)/alerts", params: { doctorName } })
          }
        >
          <View style={styles.navIconWithBadge}>
            <Ionicons
              name="alert-circle"
              size={24}
              color={selectedTab === "alerts" ? "#3B82F6" : "#9CA3AF"}
            />
            <View style={styles.navBadge}>
              <Text style={styles.navBadgeText}>5</Text>
            </View>
          </View>
          <Text
            style={[
              styles.navLabel,
              selectedTab === "alerts" && { color: "#3B82F6" },
            ]}
          >
            Alerts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/docplans",
              params: { doctorName },
            })
          }
        >
          <Ionicons
            name="clipboard"
            size={24}
            color={selectedTab === "plans" ? "#3B82F6" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.navLabel,
              selectedTab === "plans" && { color: "#3B82F6" },
            ]}
          >
            Plans
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/(tabs)/analytics")}
        >
          <Ionicons
            name="bar-chart"
            size={24}
            color={selectedTab === "analytics" ? "#3B82F6" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.navLabel,
              selectedTab === "analytics" && { color: "#3B82F6" },
            ]}
          >
            Analytics
          </Text>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 12,
  },
  searchContainer: {
    flex: 1,
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
  notificationButton: {
    position: "relative",
    padding: 4,
  },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileButton: {
    padding: 0,
  },
  welcomeBanner: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  metricsSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  metricContent: {
    alignItems: "center",
  },
  metricTitle: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  engagementCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  engagementIconContainer: {
    marginBottom: 8,
  },
  engagementTitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  engagementValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  engagementSubtitle: {
    fontSize: 12,
    color: "#10B981",
  },
  section: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
  },
  alertsList: {
    gap: 12,
  },
  alertCard: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  alertPatientName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  alertIssue: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
  },
  alertTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityPatient: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  activityAction: {
    fontSize: 13,
    color: "#6B7280",
  },
  activityTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  actionTilesContainer: {
    gap: 12,
  },
  actionTile: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionTileTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  actionTileSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  recentPlanCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 12,
  },
  recentPlanLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#047857",
    marginBottom: 4,
  },
  recentPlanTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: 4,
  },
  recentPlanText: {
    fontSize: 12,
    color: "#065F46",
  },
  planModalOverlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
  },
  planModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: "80%",
  },
  planModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  planModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  planFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 6,
    marginTop: 10,
  },
  planInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  planInputMultiline: {
    minHeight: 96,
  },
  planSaveButton: {
    marginTop: 16,
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  planSaveButtonDisabled: {
    backgroundColor: "#BFDBFE",
  },
  planSaveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
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
