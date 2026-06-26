import { Ionicons } from "@expo/vector-icons";
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
import { DoctorAlert, fetchDoctorAlerts, resolveDoctorAlert } from "../../services/api";
import { getUser } from "../../services/auth";

// ─── types ────────────────────────────────────────────────────────────────────

type Priority = "RED" | "ORANGE" | "YELLOW" | "GREEN";
type StatusFilter = "pending" | "resolved" | "all";

// ─── constants ────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<Priority, number> = { RED: 0, ORANGE: 1, YELLOW: 2, GREEN: 3 };

const PRIORITY_CONFIG: Record<Priority, {
  color: string; bg: string; border: string; label: string; icon: string;
}> = {
  RED:    { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", label: "RED",    icon: "alert-circle" },
  ORANGE: { color: "#EA580C", bg: "#FFF7ED", border: "#FDBA74", label: "ORANGE", icon: "alert" },
  YELLOW: { color: "#CA8A04", bg: "#FEFCE8", border: "#FDE047", label: "YELLOW", icon: "warning" },
  GREEN:  { color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC", label: "GREEN",  icon: "checkmark-circle" },
};

const SOURCE_LABEL: Record<string, string> = {
  log: "Health Log",
  message: "Message",
  vitals: "Vitals",
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function normalizePriority(a: DoctorAlert): Priority {
  if (a.priority === "RED" || a.priority === "ORANGE" || a.priority === "YELLOW" || a.priority === "GREEN") {
    return a.priority;
  }
  // Backward compat: map old severity → color
  if (a.severity === "Critical") return "RED";
  if (a.severity === "High")     return "ORANGE";
  if (a.severity === "Medium")   return "YELLOW";
  return "GREEN";
}

// ─── component ───────────────────────────────────────────────────────────────

export default function DocAlertsScreen() {
  const { email: emailParam, doctorName } = useLocalSearchParams<{ email?: string; doctorName?: string }>();
  const router = useRouter();

  const user = getUser();
  const doctorEmail = emailParam || user?.email || "doctor@example.com";

  const [alerts, setAlerts]             = useState<DoctorAlert[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [colorFilter, setColorFilter]   = useState<Priority | "all">("all");

  useEffect(() => { loadAlerts(); }, [doctorEmail]);

  async function loadAlerts() {
    try {
      const res = await fetchDoctorAlerts(doctorEmail);
      const normalized = (res.alerts || []).map((a) => ({
        ...a,
        priority: normalizePriority(a),
      }));
      normalized.sort((a, b) => {
        const pa = PRIORITY_ORDER[normalizePriority(a)];
        const pb = PRIORITY_ORDER[normalizePriority(b)];
        if (pa !== pb) return pa - pb;
        if (a.isResolved !== b.isResolved) return a.isResolved ? 1 : -1;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      setAlerts(normalized);
    } catch (e) {
      console.log("Failed to load alerts:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleRefresh = () => { setRefreshing(true); loadAlerts(); };

  const handleResolve = async (alertId: string) => {
    try {
      await resolveDoctorAlert(doctorEmail, alertId);
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, isResolved: true } : a)));
    } catch (e) {
      console.log("Failed to resolve:", e);
    }
  };

  const handleOpenChat = (a: DoctorAlert) => {
    router.push({
      pathname: "/(tabs)/docmessages",
      params: { email: doctorEmail, patientEmail: a.patientEmail || "" },
    });
  };

  const handleOpenPatient = (a: DoctorAlert) => {
    router.push({
      pathname: "/(tabs)/patients",
      params: { email: doctorEmail, patientEmail: a.patientEmail || "", doctorName: doctorName || "" },
    });
  };

  // ── derived ───────────────────────────────────────────────────────────────

  const pending = alerts.filter((a) => !a.isResolved);
  const redCount    = pending.filter((a) => normalizePriority(a) === "RED").length;
  const orangeCount = pending.filter((a) => normalizePriority(a) === "ORANGE").length;
  const yellowCount = pending.filter((a) => normalizePriority(a) === "YELLOW").length;

  const filtered = alerts.filter((a) => {
    if (statusFilter === "pending"  && a.isResolved)  return false;
    if (statusFilter === "resolved" && !a.isResolved) return false;
    if (colorFilter !== "all" && normalizePriority(a) !== colorFilter) return false;
    return true;
  });

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Patient Alerts</Text>
          <Text style={styles.headerSub}>
            {pending.length} pending
            {redCount    > 0 ? `  ·  ${redCount} 🔴`    : ""}
            {orangeCount > 0 ? `  ·  ${orangeCount} 🟠` : ""}
            {yellowCount > 0 ? `  ·  ${yellowCount} 🟡` : ""}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={refreshing}>
          <Ionicons name="refresh" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* ── RED banner ── */}
      {redCount > 0 && (
        <View style={styles.redBanner}>
          <Ionicons name="alert-circle" size={16} color="#FFFFFF" />
          <Text style={styles.redBannerText}>
            {redCount} RED alert{redCount > 1 ? "s" : ""} — requires immediate action
          </Text>
        </View>
      )}

      {/* ── Status filter ── */}
      <View style={styles.statusRow}>
        {(["pending", "all", "resolved"] as StatusFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.statusChip, statusFilter === f && styles.statusChipActive]}
            onPress={() => setStatusFilter(f)}
          >
            <Text style={[styles.statusChipText, statusFilter === f && styles.statusChipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Color filter ── */}
      <View style={styles.colorRow}>
        <TouchableOpacity
          style={[styles.colorChip, colorFilter === "all" && styles.colorChipAllActive]}
          onPress={() => setColorFilter("all")}
        >
          <Text style={[styles.colorChipText, colorFilter === "all" && { color: "#1E40AF" }]}>All</Text>
        </TouchableOpacity>
        {(["RED", "ORANGE", "YELLOW", "GREEN"] as Priority[]).map((p) => {
          const cfg = PRIORITY_CONFIG[p];
          const active = colorFilter === p;
          return (
            <TouchableOpacity
              key={p}
              style={[
                styles.colorChip,
                active && { backgroundColor: cfg.color, borderColor: cfg.color },
                !active && { borderColor: cfg.color },
              ]}
              onPress={() => setColorFilter(p)}
            >
              <View style={[styles.colorDot, { backgroundColor: active ? "#FFF" : cfg.color }]} />
              <Text style={[styles.colorChipText, { color: active ? "#FFF" : cfg.color }]}>
                {p}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563EB" />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={64} color="#D1FAE5" />
              <Text style={styles.emptyTitle}>No alerts</Text>
              <Text style={styles.emptySub}>
                {statusFilter === "pending"
                  ? "All clear — no pending alerts"
                  : "No alerts match the current filters"}
              </Text>
            </View>
          ) : (
            filtered.map((a) => (
              <AlertCard
                key={a.id}
                alert={a}
                onResolve={() => handleResolve(a.id)}
                onOpenChat={() => handleOpenChat(a)}
                onOpenPatient={() => handleOpenPatient(a)}
              />
            ))
          )}
          <View style={{ height: 110 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── AlertCard ────────────────────────────────────────────────────────────────

function AlertCard({
  alert: a,
  onResolve,
  onOpenChat,
  onOpenPatient,
}: {
  alert: DoctorAlert;
  onResolve: () => void;
  onOpenChat: () => void;
  onOpenPatient: () => void;
}) {
  const p = normalizePriority(a);
  const cfg = PRIORITY_CONFIG[p];
  const resolved = a.isResolved;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: resolved ? "#F9FAFB" : cfg.bg, borderColor: resolved ? "#E5E7EB" : cfg.border },
        !resolved && p === "RED" && styles.cardPulse,
      ]}
    >
      {/* Left accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: resolved ? "#D1D5DB" : cfg.color }]} />

      <View style={styles.cardBody}>

        {/* ── Top row: icon + patient + priority badge + time ── */}
        <View style={styles.cardTop}>
          <View style={[styles.prioIconWrap, { backgroundColor: (resolved ? "#9CA3AF" : cfg.color) + "20" }]}>
            <Ionicons
              name={cfg.icon as any}
              size={18}
              color={resolved ? "#9CA3AF" : cfg.color}
            />
          </View>
          <View style={styles.cardTopMid}>
            <Text style={[styles.patientName, resolved && { color: "#9CA3AF" }]} numberOfLines={1}>
              {a.patientName || "Patient"}
            </Text>
            {a.patientEmail ? (
              <Text style={styles.patientEmail} numberOfLines={1}>{a.patientEmail}</Text>
            ) : null}
          </View>
          <View style={styles.cardTopRight}>
            <View style={[styles.prioBadge, { backgroundColor: resolved ? "#E5E7EB" : cfg.color + "20", borderColor: resolved ? "#D1D5DB" : cfg.color }]}>
              <Text style={[styles.prioBadgeText, { color: resolved ? "#6B7280" : cfg.color }]}>
                {resolved ? "RESOLVED" : p}
              </Text>
            </View>
            <Text style={styles.cardTime}>{timeAgo(a.createdAt)}</Text>
          </View>
        </View>

        {/* ── Source type chip ── */}
        {(a.sourceType || a.logType) && (
          <View style={styles.sourceRow}>
            <View style={styles.sourceChip}>
              <Ionicons
                name={a.sourceType === "message" ? "chatbubble" : a.logType === "vitals" ? "heart-pulse" : "document-text"}
                size={10}
                color="#6B7280"
              />
              <Text style={styles.sourceText}>
                {SOURCE_LABEL[a.sourceType || ""] || a.logType || a.sourceType || "log"}
              </Text>
            </View>
          </View>
        )}

        {/* ── Alert message ── */}
        <Text style={[styles.alertMsg, resolved && { color: "#9CA3AF" }]} numberOfLines={3}>
          {a.message}
        </Text>

        {/* ── AI Reason ── */}
        {a.reason ? (
          <View style={styles.reasonRow}>
            <Text style={styles.reasonLabel}>Reason: </Text>
            <Text style={styles.reasonText}>{a.reason}</Text>
          </View>
        ) : null}

        {/* ── AI Explanation ── */}
        {a.explanation ? (
          <View style={[styles.explanationBox, { borderLeftColor: resolved ? "#D1D5DB" : cfg.color }]}>
            <View style={styles.explanationHeader}>
              <Ionicons name="sparkles" size={11} color={resolved ? "#9CA3AF" : cfg.color} />
              <Text style={[styles.explanationLabel, { color: resolved ? "#9CA3AF" : cfg.color }]}>
                AI Assessment
              </Text>
            </View>
            <Text style={[styles.explanationText, resolved && { color: "#9CA3AF" }]} numberOfLines={4}>
              {a.explanation}
            </Text>
          </View>
        ) : null}

        {/* ── Action buttons ── */}
        <View style={styles.actions}>
          {!resolved && (
            <>
              <TouchableOpacity style={styles.actionBtnChat} onPress={onOpenChat} activeOpacity={0.8}>
                <Ionicons name="chatbubble-ellipses" size={14} color="#2563EB" />
                <Text style={styles.actionBtnChatText}>Open Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtnPatient} onPress={onOpenPatient} activeOpacity={0.8}>
                <Ionicons name="person" size={14} color="#7C3AED" />
                <Text style={styles.actionBtnPatientText}>Patient</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtnResolve, { backgroundColor: cfg.color }]}
                onPress={onResolve}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                <Text style={styles.actionBtnResolveText}>Resolve</Text>
              </TouchableOpacity>
            </>
          )}

          {resolved && (
            <View style={styles.resolvedRow}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.resolvedText}>Resolved</Text>
            </View>
          )}
        </View>

      </View>
    </View>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  headerSub:   { fontSize: 13, color: "#6B7280", marginTop: 2 },
  refreshBtn: {
    padding: 8, borderRadius: 20, backgroundColor: "#EFF6FF",
  },

  // Red banner
  redBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DC2626",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  redBannerText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF", flex: 1 },

  // Status filter
  statusRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  statusChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  statusChipActive:     { backgroundColor: "#1E40AF", borderColor: "#1E40AF" },
  statusChipText:       { fontSize: 13, fontWeight: "500", color: "#6B7280" },
  statusChipTextActive: { color: "#FFFFFF", fontWeight: "700" },

  // Color filter
  colorRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  colorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  colorChipAllActive: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  colorDot: { width: 6, height: 6, borderRadius: 3 },
  colorChipText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },

  // List
  list: { padding: 14, gap: 10 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#374151" },
  emptySub: { fontSize: 14, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },

  // Card
  card: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardPulse: {
    shadowColor: "#DC2626",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  cardAccent: { width: 5 },
  cardBody: { flex: 1, padding: 14, gap: 8 },

  // Card top row
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  prioIconWrap: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: "center", alignItems: "center",
  },
  cardTopMid: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  patientEmail: { fontSize: 11, color: "#9CA3AF", marginTop: 1 },
  cardTopRight: { alignItems: "flex-end", gap: 4 },
  prioBadge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, borderWidth: 1,
  },
  prioBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  cardTime: { fontSize: 10, color: "#9CA3AF", fontWeight: "500" },

  // Source chip
  sourceRow: { flexDirection: "row" },
  sourceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  sourceText: { fontSize: 10, color: "#6B7280", fontWeight: "600" },

  // Alert message
  alertMsg: { fontSize: 13, color: "#374151", lineHeight: 19, fontWeight: "500" },

  // Reason
  reasonRow: { flexDirection: "row", flexWrap: "wrap" },
  reasonLabel: { fontSize: 12, fontWeight: "700", color: "#374151" },
  reasonText:  { fontSize: 12, color: "#374151", flex: 1 },

  // AI Explanation
  explanationBox: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    gap: 4,
  },
  explanationHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  explanationLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  explanationText: { fontSize: 12, color: "#4B5563", lineHeight: 17 },

  // Actions
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  actionBtnChat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  actionBtnChatText: { fontSize: 12, fontWeight: "700", color: "#2563EB" },
  actionBtnPatient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  actionBtnPatientText: { fontSize: 12, fontWeight: "700", color: "#7C3AED" },
  actionBtnResolve: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginLeft: "auto",
  },
  actionBtnResolveText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },

  resolvedRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  resolvedText: { fontSize: 12, fontWeight: "600", color: "#10B981" },
});
