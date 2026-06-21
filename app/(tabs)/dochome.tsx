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
import { useBlockBack } from "../../hooks/use-block-back";

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
  // Dashboard is a root screen — block the hardware back button.
  useBlockBack();
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
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);

  useEffect(() => {
    setDoctorName(doctorNameParam || "Doctor");
    setDoctorEmail(emailParam || "doctor@example.com");
  }, [doctorNameParam, emailParam]);

  const [dashboardData, setDashboardData] = useState<any>(null);
  const allAlerts: any[] = dashboardData?.recentAlerts || [];
  const pendingAlertCount = allAlerts.filter(
    (alert: any) => !alert?.isResolved,
  ).length;

  // Build the notification feed from real alert records: unresolved first,
  // then most recent.
  const notifications = [...allAlerts].sort((a, b) => {
    if (Boolean(a?.isResolved) !== Boolean(b?.isResolved)) {
      return a?.isResolved ? 1 : -1;
    }
    const aTime = new Date(a?.createdAt || 0).getTime();
    const bTime = new Date(b?.createdAt || 0).getTime();
    return bTime - aTime;
  });

  const goToAlerts = () => {
    setIsNotificationsVisible(false);
    router.push({
      pathname: "/(tabs)/alerts",
      params: { doctorName, email: doctorEmail },
    });
  };

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
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => setIsNotificationsVisible(true)}
          >
            <Ionicons name="notifications" size={24} color="#6B7280" />
            {pendingAlertCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {pendingAlertCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/docprof",
                params: { doctorName, email: doctorEmail },
              })
            }
          >
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

      {/* Notifications Panel */}
      <Modal
        visible={isNotificationsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNotificationsVisible(false)}
      >
        <TouchableOpacity
          style={styles.notificationsOverlay}
          activeOpacity={1}
          onPress={() => setIsNotificationsVisible(false)}
        >
          <TouchableOpacity
            style={styles.notificationsPanel}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={styles.notificationsHeader}>
              <Text style={styles.notificationsTitle}>
                Notifications
                {pendingAlertCount > 0 ? ` (${pendingAlertCount} new)` : ""}
              </Text>
              <TouchableOpacity
                onPress={() => setIsNotificationsVisible(false)}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {notifications.length === 0 ? (
              <View style={styles.notificationsEmpty}>
                <Ionicons
                  name="notifications-off-outline"
                  size={32}
                  color="#9CA3AF"
                />
                <Text style={styles.notificationsEmptyText}>
                  No notifications yet
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.notificationsList}
                showsVerticalScrollIndicator={false}
              >
                {notifications.map((item: any, index: number) => {
                  const colors = getSeverityColor(item?.severity);
                  return (
                    <TouchableOpacity
                      key={item?.id || item?._id || index}
                      style={[
                        styles.notificationItem,
                        !item?.isResolved && styles.notificationItemUnread,
                      ]}
                      onPress={goToAlerts}
                    >
                      <View
                        style={[
                          styles.notificationIcon,
                          { backgroundColor: colors.bg },
                        ]}
                      >
                        <Ionicons
                          name="alert-circle"
                          size={18}
                          color={colors.border}
                        />
                      </View>
                      <View style={styles.notificationContent}>
                        <View style={styles.notificationTopRow}>
                          <Text style={styles.notificationName} numberOfLines={1}>
                            {item?.patientName || "Patient"}
                          </Text>
                          {!item?.isResolved && (
                            <View style={styles.notificationUnreadDot} />
                          )}
                        </View>
                        <Text
                          style={styles.notificationMessage}
                          numberOfLines={2}
                        >
                          {item?.issue || "New alert"}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {item?.time ||
                            (item?.createdAt
                              ? new Date(item.createdAt).toLocaleString()
                              : "")}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.notificationsFooter}
              onPress={goToAlerts}
            >
              <Text style={styles.notificationsFooterText}>
                View all alerts
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
              {(dashboardData?.patients || []).length > 0 && (
                <View style={styles.patientChipRow}>
                  {(dashboardData?.patients || []).map((patient: any) => {
                    const name = String(patient.name || "");
                    const active = newPlanPatientName === name;
                    return (
                      <TouchableOpacity
                        key={patient._id || patient.id || name}
                        style={[
                          styles.patientChip,
                          active && styles.patientChipActive,
                        ]}
                        onPress={() => setNewPlanPatientName(name)}
                      >
                        <Text
                          style={[
                            styles.patientChipText,
                            active && styles.patientChipTextActive,
                          ]}
                        >
                          {name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

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
              params: { doctorName, email: doctorEmail },
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
            router.push({
              pathname: "/(tabs)/alerts",
              params: { doctorName, email: doctorEmail },
            })
          }
        >
          <View style={styles.navIconWithBadge}>
            <Ionicons
              name="alert-circle"
              size={24}
              color={selectedTab === "alerts" ? "#3B82F6" : "#9CA3AF"}
            />
            {pendingAlertCount > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{pendingAlertCount}</Text>
              </View>
            )}
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
              params: { doctorName, email: doctorEmail },
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
          onPress={() =>
            router.push({
              pathname: "/(tabs)/analytics",
              params: { doctorName, email: doctorEmail },
            })
          }
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
  notificationsOverlay: {
    flex: 1,
    backgroundColor: "#00000040",
    paddingTop: 70,
    paddingHorizontal: 16,
    alignItems: "flex-end",
  },
  notificationsPanel: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "75%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  notificationsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  notificationsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  notificationsList: {
    flexGrow: 0,
  },
  notificationsEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 8,
  },
  notificationsEmptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  notificationItemUnread: {
    backgroundColor: "#F8FAFF",
  },
  notificationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  notificationName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  notificationUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  notificationsFooter: {
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  notificationsFooterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
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
  patientChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  patientChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6",
  },
  patientChipActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  patientChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  patientChipTextActive: {
    color: "#FFFFFF",
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
