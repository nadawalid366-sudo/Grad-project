import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  DeviceEventEmitter,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { fetchPatientDashboard, type PatientDashboard } from "../../services/api";
import { HealthScoreModal } from "../../components/HealthScoreModal";
import { useBlockBack } from "../../hooks/use-block-back";
import { getUser } from "../../services/auth";

export default function DashboardHome() {
  useBlockBack();
  const router = useRouter();
  const params = useLocalSearchParams<{ fullName?: string; email?: string }>();
  const [userName, setUserName] = useState("");
  const [healthScore, setHealthScore] = useState("0.0");
  const [isHealthScoreModalVisible, setIsHealthScoreModalVisible] = useState(false);
  const [dashboardData, setDashboardData] = useState<PatientDashboard | null>(null);
  
  const [healthMetrics, setHealthMetrics] = useState<any>({
    calories: { current: 0, goal: 2000 },
    sleep: { bedtime: "--:--", wakeTime: "--:--", hours: 0, goal: 8 },
    water: { amount: 0, goal: 15, unit: "glasses" },
    medication: { taken: 0, goal: 2 },
    exercise: { minutes: 0, goal: 30 },
    heart: { bpm: 0 },
    mind: { current: 0, goal: 0 },
  });

  const refreshDashboard = useCallback((email: string) => {
    fetchPatientDashboard(email).then((res) => {
      setDashboardData(res);
      if (res.healthScore !== undefined) {
        setHealthScore(Number(res.healthScore).toFixed(1));
      }
      if (res.healthMetrics) {
        const hm = res.healthMetrics;
        setHealthMetrics((prev: any) => ({
          ...prev,
          calories: { current: hm.calories?.current || 0, goal: hm.calories?.goal || 2000 },
          water: { amount: hm.water?.amount || 0, goal: hm.water?.goal || 15, unit: 'glasses' },
          medication: { taken: hm.medication?.taken || 0, goal: hm.medication?.goal || 2 },
          sleep: { bedtime: hm.sleep?.bedtime || "--:--", wakeTime: hm.sleep?.wakeTime || "--:--", hours: hm.sleep?.hours || 0, goal: hm.sleep?.goal || 8 },
          exercise: { minutes: hm.exercise?.minutes || 0, goal: hm.exercise?.goal || 30 },
          heart: { bpm: hm.vitals?.heartRate || 0 },
          mind: { current: hm.mind?.current || 0, goal: hm.mind?.goal || 0 },
        }));
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const user = getUser();
    const resolvedEmail = params.email || user?.email;
    const resolvedName = params.fullName || user?.fullName || "";

    if (resolvedName) {
      setUserName(resolvedName.split(' ')[0]);
    }

    if (!resolvedEmail) return;
    refreshDashboard(resolvedEmail);
  }, [params.email, params.fullName, refreshDashboard]);

  // Re-fetch whenever a log is saved anywhere in the app
  useEffect(() => {
    const email = params.email || getUser()?.email;
    if (!email) return;
    const sub = DeviceEventEmitter.addListener('DASHBOARD_UPDATED', () => {
      refreshDashboard(email);
    });
    return () => sub.remove();
  }, [params.email, refreshDashboard]);

  const currentEmail = params.email || getUser()?.email;

  // Standard Metric Cards
  const MetricCard = ({ title, value, icon, color, onPress }: any) => (
    <TouchableOpacity
      style={styles.metricCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{userName}, how are you feeling today?</Text>
          <TouchableOpacity style={styles.scoreTouchArea} onPress={() => setIsHealthScoreModalVisible(true)} activeOpacity={0.85}>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreValue}>{healthScore}</Text>
              <MaterialCommunityIcons name="flower-tulip-outline" size={32} color="#F6A6C1" style={styles.scoreIcon} />
            </View>
            <Text style={styles.scoreSubtext}>your health score <MaterialCommunityIcons name="information-outline" size={12} /></Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={() => Alert.alert("Emergency", "Calling emergency services...")}
          >
            <Text style={styles.emergencyText}>Emergency</Text>
            <MaterialCommunityIcons name="phone" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/messages")}>
              <MaterialCommunityIcons name="stethoscope" size={24} color="#0F172A" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/logs")}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.prioritySection}>
          <Text style={styles.priorityTitle}>Needs attention</Text>
          <Text style={styles.priorityHint}>Tap any card to quickly log it with your voice!</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.priorityScroll}>
            {healthMetrics.calories.current === 0 && (
              <TouchableOpacity 
                style={styles.priorityCard} 
                onPress={() => DeviceEventEmitter.emit("OPEN_VOICE_MODAL")}
              >
                <MaterialCommunityIcons name="food-apple" size={24} color="#F59E0B" />
                <View>
                  <Text style={styles.priorityCardTitle}>Log your meals</Text>
                  <Text style={styles.priorityCardSub}>Tell Aura what you ate</Text>
                </View>
              </TouchableOpacity>
            )}
            {healthMetrics.medication.taken < healthMetrics.medication.goal && (
              <TouchableOpacity 
                style={styles.priorityCard} 
                onPress={() => DeviceEventEmitter.emit("OPEN_VOICE_MODAL")}
              >
                <MaterialCommunityIcons name="pill" size={24} color="#EF4444" />
                <View>
                  <Text style={styles.priorityCardTitle}>Take medication</Text>
                  <Text style={styles.priorityCardSub}>You have pending meds</Text>
                </View>
              </TouchableOpacity>
            )}
            {healthMetrics.water.amount < healthMetrics.water.goal && (
              <TouchableOpacity 
                style={styles.priorityCard} 
                onPress={() => DeviceEventEmitter.emit("OPEN_VOICE_MODAL")}
              >
                <MaterialCommunityIcons name="cup-water" size={24} color="#3B82F6" />
                <View>
                  <Text style={styles.priorityCardTitle}>Hydrate</Text>
                  <Text style={styles.priorityCardSub}>Drink more water</Text>
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        <View style={styles.highlightsSection}>
          <View style={styles.highlightsHeader}>
            <Text style={styles.highlightsTitle}>Daily highlights</Text>
            <TouchableOpacity>
              <Text style={styles.showAllText}>Show all ...</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.highlightsSub}>Keep going to complete all activities</Text>

          <View style={styles.metricsGrid}>
            <MetricCard
              title="Calories"
              value={`${healthMetrics.calories.current}/${healthMetrics.calories.goal} kcal`}
              icon="flame"
              color="#F59E0B"
              onPress={() => DeviceEventEmitter.emit("OPEN_VOICE_MODAL")}
            />
            <MetricCard
              title="Water"
              value={`${healthMetrics.water.amount}/${healthMetrics.water.goal} glasses`}
              icon="cup-water"
              color="#3B82F6"
              onPress={() => DeviceEventEmitter.emit("OPEN_VOICE_MODAL")}
            />
            <MetricCard
              title="Medication"
              value={`${healthMetrics.medication.taken}/${healthMetrics.medication.goal} taken`}
              icon="pill"
              color="#3B82F6"
              onPress={() => DeviceEventEmitter.emit("OPEN_VOICE_MODAL")}
            />
            <MetricCard
              title="Heart Rate"
              value={`${healthMetrics.heart.bpm} bpm`}
              icon="heart-pulse"
              color="#EF4444"
              onPress={() => DeviceEventEmitter.emit("OPEN_VOICE_MODAL")}
            />
            <MetricCard
              title="Sleep"
              value={`${healthMetrics.sleep.hours} hrs`}
              icon="bed"
              color="#3B82F6"
              onPress={() => DeviceEventEmitter.emit("OPEN_VOICE_MODAL")}
            />
          </View>
        </View>
        
        {/* My Care Plans */}
        {(dashboardData?.plans || []).length > 0 && (
          <View style={styles.plansSection}>
            <Text style={styles.plansSectionTitle}>My Care Plans</Text>
            <Text style={styles.plansSectionSub}>Assigned by your doctor</Text>
            {(dashboardData!.plans as any[]).map((plan: any, idx: number) => {
              const status: string = plan.status || "Active";
              const statusColor =
                status === "Active" ? "#1E40AF" : status === "Completed" ? "#065F46" : "#6B7280";
              const statusBg =
                status === "Active" ? "#DBEAFE" : status === "Completed" ? "#D1FAE5" : "#F3F4F6";
              const typeIconMap: Record<string, string> = {
                "Meal Plan": "food-apple",
                "Workout Plan": "dumbbell",
                "Medication Plan": "pill",
                "Sleep Plan": "bed",
                "General Health": "heart-pulse",
              };
              const icon = (typeIconMap[plan.type || ""] || "clipboard-list-outline") as any;
              return (
                <View key={plan._id || plan.id || idx} style={styles.planCard}>
                  <View style={styles.planCardHeader}>
                    <View style={styles.planCardIcon}>
                      <MaterialCommunityIcons name={icon} size={20} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planCardTitle} numberOfLines={1}>
                        {plan.title || plan.planTitle || plan.type || "Care Plan"}
                      </Text>
                      {!!plan.assignedByDoctor && (
                        <Text style={styles.planCardDoctor}>Dr. {plan.assignedByDoctor.split("@")[0]}</Text>
                      )}
                    </View>
                    <View style={[styles.planCardStatus, { backgroundColor: statusBg }]}>
                      <Text style={[styles.planCardStatusText, { color: statusColor }]}>{status}</Text>
                    </View>
                  </View>
                  {!!plan.description && (
                    <Text style={styles.planCardDescription} numberOfLines={2}>
                      {plan.description}
                    </Text>
                  )}
                  {(plan.goals || []).length > 0 && (
                    <View style={styles.planGoalsRow}>
                      {(plan.goals as string[]).slice(0, 3).map((g: string, i: number) => (
                        <View key={i} style={styles.planGoalTag}>
                          <Text style={styles.planGoalText} numberOfLines={1}>✓ {g}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {(plan.startDate || plan.endDate) && (
                    <Text style={styles.planCardDates}>
                      {plan.startDate || "—"} → {plan.endDate || "—"}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Padding for bottom tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <HealthScoreModal
        visible={isHealthScoreModalVisible}
        onClose={() => setIsHealthScoreModalVisible(false)}
        healthScore={healthScore}
        dashboard={dashboardData}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Light slate-blue background
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  scoreTouchArea: {
    alignItems: "center",
  },
  greeting: {
    fontSize: 22,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 8,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#2563EB", // Primary blue
    lineHeight: 40,
    letterSpacing: -1,
  },
  scoreIcon: {
    marginTop: 0,
    marginLeft: 4,
  },
  scoreSubtext: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  emergencyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444", // Critical Red
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  emergencyText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  headerIcons: {
    flexDirection: "row",
    gap: 12,
  },
  iconBtn: {
    padding: 6,
  },
  highlightsSection: {
    marginBottom: 20,
  },
  highlightsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  prioritySection: {
    marginBottom: 24,
  },
  priorityTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  priorityHint: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  priorityScroll: {
    gap: 12,
    paddingHorizontal: 24,
  },
  priorityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  priorityCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  priorityCardSub: {
    fontSize: 12,
    color: "#64748B",
  },
  highlightsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  showAllText: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "600",
  },
  highlightsSub: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  metricCard: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 13,
    color: "#64748B",
  },

  // Care Plans section
  plansSection: {
    marginBottom: 20,
  },
  plansSectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  plansSectionSub: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  planCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  planCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  planCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  planCardDoctor: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  planCardStatus: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  planCardStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  planCardDescription: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 8,
  },
  planGoalsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  planGoalTag: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planGoalText: {
    fontSize: 11,
    color: "#065F46",
    fontWeight: "500",
  },
  planCardDates: {
    fontSize: 11,
    color: "#9CA3AF",
  },
});
