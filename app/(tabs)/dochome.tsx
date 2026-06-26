import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  DoctorDashboardStats,
  fetchDoctorDashboard,
  fetchDoctorDashboardStats,
} from "../../services/api";
import { getUser } from "../../services/auth";
import { useBlockBack } from "../../hooks/use-block-back";

// ─── helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const clean = name.replace(/^dr\.?\s+/i, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : clean.slice(0, 2).toUpperCase();
}

function severityColor(s?: string): string {
  if (s === "Critical") return "#DC2626";
  if (s === "High") return "#D97706";
  if (s === "Medium") return "#2563EB";
  if (s === "Low") return "#10B981";
  return "#6B7280";
}

function logTypeIcon(type?: string): string {
  switch (type) {
    case "meal":       return "food-fork-drink";
    case "exercise":   return "run";
    case "medication": return "pill";
    case "vitals":     return "heart-pulse";
    case "water":      return "water";
    case "sleep":      return "sleep";
    default:           return "clipboard-text";
  }
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function complianceColor(pct: number): string {
  if (pct >= 70) return "#10B981";
  if (pct >= 40) return "#F59E0B";
  return "#EF4444";
}

// ─── sub-components ──────────────────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  sub,
  color,
  bg,
  urgent,
  onPress,
}: {
  icon: string;
  label: string;
  value: number;
  sub?: string;
  color: string;
  bg: string;
  urgent?: boolean;
  onPress?: () => void;
}) {
  const inner = (
    <View style={[styles.metricCard, urgent && { borderColor: color, borderWidth: 1.5 }]}>
      <View style={[styles.metricIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.metricValue, urgent && { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
    </View>
  );
  return onPress ? (
    <TouchableOpacity style={{ flex: 1 }} onPress={onPress} activeOpacity={0.8}>
      {inner}
    </TouchableOpacity>
  ) : (
    <View style={{ flex: 1 }}>{inner}</View>
  );
}

type ActivityItem = DoctorDashboardStats["recentActivity"][number];

function ActivityRow({ item }: { item: ActivityItem }) {
  const isAlert = item.type === "alert";
  const color = severityColor(item.severity);

  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIconWrap, { backgroundColor: color + "18" }]}>
        {isAlert ? (
          <Ionicons name="alert-circle" size={18} color={color} />
        ) : (
          <MaterialCommunityIcons
            name={logTypeIcon(item.logType) as any}
            size={18}
            color={color}
          />
        )}
      </View>
      <View style={styles.activityBody}>
        <View style={styles.activityTop}>
          <Text style={styles.activityPatient} numberOfLines={1}>
            {item.patientName}
          </Text>
          <Text style={styles.activityTime}>{item.time}</Text>
        </View>
        <Text style={styles.activityMsg} numberOfLines={2}>
          {item.message}
        </Text>
      </View>
      {isAlert && (
        <View style={[styles.severityDot, { backgroundColor: color }]} />
      )}
    </View>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function DoctorHome() {
  const { doctorName: nameParam, email: emailParam } =
    useLocalSearchParams<{ doctorName?: string; email?: string }>();
  const router = useRouter();
  useBlockBack();

  const [doctorName, setDoctorName]       = useState("Doctor");
  const [specialty, setSpecialty]         = useState("");
  const [doctorEmail, setDoctorEmail]     = useState("");
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const [stats, setStats] = useState<DoctorDashboardStats>({
    activePatients:       0,
    unreadMessages:       0,
    pendingSubscriptions: 0,
    todayPatients:        0,
    highPriorityAlerts:   0,
    mediumAlerts:         0,
    compliance:           0,
    recentActivity:       [],
  });

  useEffect(() => {
    const email = emailParam || getUser()?.email || "";
    setDoctorEmail(email);
    if (nameParam) setDoctorName(nameParam);
    if (email) load(email);
  }, [emailParam, nameParam]);

  const load = async (email: string) => {
    try {
      const [infoRes, statsRes] = await Promise.allSettled([
        fetchDoctorDashboard(email),
        fetchDoctorDashboardStats(email),
      ]);

      if (infoRes.status === "fulfilled") {
        const doc = (infoRes.value.doctor || {}) as Record<string, any>;
        if (doc.doctorName || doc.fullName)
          setDoctorName(String(doc.doctorName || doc.fullName));
        if (doc.specialty) setSpecialty(String(doc.specialty));
      }

      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    load(doctorEmail);
  };

  const quickActions = [
    {
      id: "messages",
      label: "Messages",
      icon: "chatbubbles",
      color: "#10B981",
      bg: "#D1FAE5",
      badge: stats.unreadMessages,
      onPress: () =>
        router.push({ pathname: "/(tabs)/docmessages", params: { email: doctorEmail } }),
    },
    {
      id: "patients",
      label: "Patients",
      icon: "people",
      color: "#2563EB",
      bg: "#DBEAFE",
      badge: 0,
      onPress: () =>
        router.push({ pathname: "/(tabs)/patients", params: { email: doctorEmail, doctorName } }),
    },
    {
      id: "alerts",
      label: "Alerts",
      icon: "alert-circle",
      color: "#DC2626",
      bg: "#FEE2E2",
      badge: stats.highPriorityAlerts,
      onPress: () =>
        router.push({ pathname: "/(tabs)/docalerts", params: { email: doctorEmail } }),
    },
    {
      id: "plans",
      label: "Plans",
      icon: "clipboard",
      color: "#7C3AED",
      bg: "#EDE9FE",
      badge: 0,
      onPress: () =>
        router.push({ pathname: "/(tabs)/docplans", params: { email: doctorEmail, doctorName } }),
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Loading your dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#1E40AF"
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerDate}>{todayLabel()}</Text>
            <Text style={styles.headerGreeting}>Dr. {doctorName}</Text>
            {specialty ? (
              <Text style={styles.headerSpecialty}>{specialty}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/docprof",
                params: { doctorName, email: doctorEmail },
              })
            }
          >
            <Text style={styles.avatarText}>{getInitials(doctorName)}</Text>
          </TouchableOpacity>
        </View>

        {/* ── KPI Cards ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Practice Overview</Text>

          {/* Hero — Active Patients */}
          <View style={styles.heroCard}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>Active Patients</Text>
              <Text style={styles.heroValue}>{stats.activePatients}</Text>
              <View style={styles.heroMeta}>
                <Ionicons name="person" size={12} color="#93C5FD" />
                <Text style={styles.heroMetaText}>
                  {stats.todayPatients} logged today
                </Text>
              </View>
            </View>
            <View style={styles.heroIconBg}>
              <Ionicons name="people" size={56} color="#1E40AF" />
            </View>
          </View>

          {/* Row 1 — Messages + Pending Subscriptions */}
          <View style={styles.cardRow}>
            <MetricCard
              icon="chatbubbles"
              label="Unread Messages"
              value={stats.unreadMessages}
              color="#10B981"
              bg="#D1FAE5"
              urgent={stats.unreadMessages > 0}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/docmessages",
                  params: { email: doctorEmail },
                })
              }
            />
            <MetricCard
              icon="card"
              label="Pending Subscriptions"
              value={stats.pendingSubscriptions}
              sub="Last 7 days"
              color="#7C3AED"
              bg="#EDE9FE"
            />
          </View>

          {/* Row 2 — Today's Patients + High Priority */}
          <View style={styles.cardRow}>
            <MetricCard
              icon="today"
              label="Today's Patients"
              value={stats.todayPatients}
              sub="Active today"
              color="#0891B2"
              bg="#CFFAFE"
            />
            <MetricCard
              icon="alert-circle"
              label="High Priority"
              value={stats.highPriorityAlerts}
              color="#DC2626"
              bg="#FEE2E2"
              urgent={stats.highPriorityAlerts > 0}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/docalerts",
                  params: { email: doctorEmail },
                })
              }
            />
          </View>

          {/* Row 3 — Medium Alerts + Compliance */}
          <View style={styles.cardRow}>
            <MetricCard
              icon="information-circle"
              label="Medium Alerts"
              value={stats.mediumAlerts}
              color="#D97706"
              bg="#FEF3C7"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/docalerts",
                  params: { email: doctorEmail },
                })
              }
            />
            {/* Compliance — custom card with progress bar */}
            <View style={[styles.metricCard, { flex: 1 }]}>
              <View style={[styles.metricIconWrap, { backgroundColor: "#D1FAE5" }]}>
                <Ionicons name="trending-up" size={20} color="#059669" />
              </View>
              <Text
                style={[
                  styles.metricValue,
                  { color: complianceColor(stats.compliance) },
                ]}
              >
                {stats.compliance}%
              </Text>
              <Text style={styles.metricLabel}>Compliance</Text>
              <View style={styles.complianceTrack}>
                <View
                  style={[
                    styles.complianceFill,
                    {
                      width: `${Math.min(stats.compliance, 100)}%` as any,
                      backgroundColor: complianceColor(stats.compliance),
                    },
                  ]}
                />
              </View>
              <Text style={styles.metricSub}>7-day log rate</Text>
            </View>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickRow}>
            {quickActions.map((qa) => (
              <TouchableOpacity
                key={qa.id}
                style={styles.qaBtn}
                onPress={qa.onPress}
                activeOpacity={0.75}
              >
                <View style={[styles.qaIconWrap, { backgroundColor: qa.bg }]}>
                  <Ionicons name={qa.icon as any} size={24} color={qa.color} />
                  {qa.badge > 0 && (
                    <View style={styles.qaBadge}>
                      <Text style={styles.qaBadgeText}>{qa.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.qaLabel}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Recent Activity ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {stats.recentActivity.length > 0 && (
              <Text style={styles.sectionCount}>
                {stats.recentActivity.length} items
              </Text>
            )}
          </View>

          {stats.recentActivity.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Ionicons name="pulse-outline" size={44} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>All quiet</Text>
              <Text style={styles.emptyBody}>
                Patient activity and alerts will appear here
              </Text>
            </View>
          ) : (
            stats.recentActivity.map((item, i) => (
              <ActivityRow key={item.id || i} item={item} />
            ))
          )}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  scroll: { paddingBottom: 20 },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  loadingText: { fontSize: 14, color: "#64748B" },

  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    backgroundColor: "#1E3A8A",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
  },
  headerLeft: { flex: 1 },
  headerDate: {
    fontSize: 12,
    color: "#93C5FD",
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  headerGreeting: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  headerSpecialty: {
    fontSize: 13,
    color: "#BFDBFE",
    marginTop: 4,
    fontWeight: "500",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    marginTop: 4,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // ── Sections
  section: { paddingHorizontal: 16, paddingTop: 22 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  sectionCount: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
    marginBottom: 12,
  },

  // ── Hero card
  heroCard: {
    backgroundColor: "#1E40AF",
    borderRadius: 18,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  heroLeft: { flex: 1 },
  heroLabel: {
    fontSize: 13,
    color: "#93C5FD",
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 56,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 62,
    letterSpacing: -2,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  heroMetaText: {
    fontSize: 12,
    color: "#BFDBFE",
    fontWeight: "500",
  },
  heroIconBg: {
    opacity: 0.12,
    marginLeft: 8,
  },

  // ── Card row
  cardRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },

  // ── Metric card
  metricCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  metricIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  metricValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 16,
  },
  metricSub: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "500",
  },

  // Compliance bar
  complianceTrack: {
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 2,
  },
  complianceFill: {
    height: "100%",
    borderRadius: 3,
  },

  // ── Quick actions
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  qaBtn: {
    alignItems: "center",
    flex: 1,
  },
  qaIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    position: "relative",
  },
  qaBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#F1F5F9",
  },
  qaBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  qaLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },

  // ── Recent activity
  emptyActivity: {
    alignItems: "center",
    paddingVertical: 36,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#94A3B8",
  },
  emptyBody: {
    fontSize: 13,
    color: "#CBD5E1",
    textAlign: "center",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 13,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  activityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  activityBody: { flex: 1 },
  activityTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  activityPatient: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
    marginRight: 8,
  },
  activityTime: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  activityMsg: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
