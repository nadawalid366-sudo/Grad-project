import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "../constants/theme";
import {
  buildHealthScoreBreakdown,
  formatPointValue,
  normalizeHealthMetrics,
} from "../constants/healthScoring";
import type { PatientDashboard } from "../services/api";

type HealthScoreModalProps = {
  visible: boolean;
  onClose: () => void;
  dashboard?: PatientDashboard | null;
  healthScore?: string | number;
};

function formatMetricValue(current: number, goal: number, unit: string) {
  const formatNumber = (value: number) => (Number.isInteger(value) ? value.toString() : value.toFixed(1));
  return `${formatNumber(current)} / ${formatNumber(goal)} ${unit}`;
}

function getBarWidth(progressPercent: number) {
  return `${Math.min(progressPercent, 100)}%`;
}

export function HealthScoreModal({ visible, onClose, dashboard, healthScore }: HealthScoreModalProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowCompleted(false);
    }
  }, [visible, dashboard]);

  const metrics = useMemo(() => normalizeHealthMetrics(dashboard), [dashboard]);
  const breakdown = useMemo(() => buildHealthScoreBreakdown(metrics), [metrics]);
  const weakAreas = breakdown.filter((entry) => entry.isWeak);
  const completedAreas = breakdown.filter((entry) => !entry.isWeak);
  const currentScore =
    typeof healthScore === "number"
      ? healthScore.toFixed(1)
      : typeof healthScore === "string" && healthScore.trim()
        ? Number(healthScore).toFixed(1)
        : "0.0";
  const hasWeakAreas = weakAreas.length > 0;
  const completedVisible = hasWeakAreas ? showCompleted : true;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Raise your health score</Text>
              <Text style={styles.subtitle}>
                Weak areas are shown first, with exact point values for each action.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Current score</Text>
            <Text style={styles.scoreValue}>{currentScore}</Text>
            <Text style={styles.scoreHint}>
              Improve the weak areas below to lift today&apos;s score faster.
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Needs attention</Text>
              <Text style={styles.sectionMeta}>{weakAreas.length} metrics</Text>
            </View>

            {weakAreas.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="check-circle" size={28} color="#10B981" />
                <Text style={styles.emptyTitle}>Everything is in the green</Text>
                <Text style={styles.emptyText}>
                  Keep the same routine to hold onto your score and stay balanced.
                </Text>
              </View>
            ) : (
              weakAreas.map((entry) => (
                <View key={entry.key} style={styles.metricCard}>
                  <View style={styles.metricTopRow}>
                    <View style={[styles.metricIcon, { backgroundColor: `${entry.barColor}18` }]}>
                      <MaterialCommunityIcons name={entry.icon as any} size={22} color={entry.barColor} />
                    </View>
                    <View style={styles.metricTextBlock}>
                      <Text style={styles.metricTitle}>{entry.title}</Text>
                      <Text style={styles.metricValue}>{formatMetricValue(entry.current, entry.goal, entry.unit)}</Text>
                    </View>
                    <View style={styles.pointsPill}>
                      <Text style={styles.pointsText}>
                        {formatPointValue(entry.earnedPoints)} / {formatPointValue(entry.maxPoints)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: getBarWidth(entry.progressPercent), backgroundColor: entry.barColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.tipText}>{entry.tip}</Text>
                </View>
              ))
            )}

            <View style={styles.sectionHeaderWithToggle}>
              <View>
                <Text style={styles.sectionTitle}>Completed areas</Text>
                <Text style={styles.sectionMeta}>Already strong today</Text>
              </View>
              {hasWeakAreas && (
                <TouchableOpacity onPress={() => setShowCompleted((current) => !current)} style={styles.toggleButton}>
                  <Text style={styles.toggleButtonText}>{completedVisible ? "Hide" : `Show (${completedAreas.length})`}</Text>
                </TouchableOpacity>
              )}
            </View>

            {completedVisible &&
              completedAreas.map((entry) => (
                <View key={entry.key} style={[styles.metricCard, styles.completedCard]}>
                  <View style={styles.metricTopRow}>
                    <View style={[styles.metricIcon, { backgroundColor: `${entry.barColor}18` }]}>
                      <MaterialCommunityIcons name={entry.icon as any} size={22} color={entry.barColor} />
                    </View>
                    <View style={styles.metricTextBlock}>
                      <Text style={styles.metricTitle}>{entry.title}</Text>
                      <Text style={styles.metricValue}>{formatMetricValue(entry.current, entry.goal, entry.unit)}</Text>
                    </View>
                    <View style={styles.pointsPillGreen}>
                      <Text style={styles.pointsTextGreen}>
                        {formatPointValue(entry.earnedPoints)} / {formatPointValue(entry.maxPoints)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: getBarWidth(entry.progressPercent), backgroundColor: entry.barColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.tipText}>{entry.tip}</Text>
                </View>
              ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.icon,
    maxWidth: 290,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreCard: {
    marginTop: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D4ED8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  scoreValue: {
    fontSize: 34,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 2,
  },
  scoreHint: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#475569",
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 10,
  },
  sectionHeaderWithToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.light.text,
  },
  sectionMeta: {
    fontSize: 12,
    color: Colors.light.icon,
    marginTop: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  metricCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  completedCard: {
    opacity: 0.92,
  },
  metricTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  metricTextBlock: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.light.text,
  },
  metricValue: {
    fontSize: 13,
    color: Colors.light.icon,
    marginTop: 2,
  },
  pointsPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
  },
  pointsText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B91C1C",
  },
  pointsPillGreen: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
  },
  pointsTextGreen: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
  progressTrack: {
    marginTop: 14,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  tipText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: "#334155",
  },
  emptyState: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.light.text,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.light.icon,
  },
});
