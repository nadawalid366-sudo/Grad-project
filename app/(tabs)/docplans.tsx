import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  NutritionPlan,
  assignDoctorPlan,
  deleteDoctorPlan,
  duplicateDoctorPlan,
  fetchDoctorPatients,
  fetchDoctorPlans,
  saveDoctorPlan,
  updateDoctorPlan,
} from "../../services/api";
import { getUser } from "../../services/auth";

type PlanStatus = "Active" | "Completed" | "Draft";
type PlanType =
  | "Meal Plan"
  | "Workout Plan"
  | "Medication Plan"
  | "Sleep Plan"
  | "General Health";

const PLAN_TYPES: PlanType[] = [
  "Meal Plan",
  "Workout Plan",
  "Medication Plan",
  "Sleep Plan",
  "General Health",
];

function getTypeIcon(type: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const map: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    "Meal Plan": "food-apple",
    "Workout Plan": "dumbbell",
    "Medication Plan": "pill",
    "Sleep Plan": "bed",
    "General Health": "heart-pulse",
  };
  return (map[type] as keyof typeof MaterialCommunityIcons.glyphMap) ?? "clipboard-list";
}

function getTypeColor(type: string): string {
  const map: Record<string, string> = {
    "Meal Plan": "#FEE2E2",
    "Workout Plan": "#DBEAFE",
    "Medication Plan": "#FEF3C7",
    "Sleep Plan": "#E9D5FF",
    "General Health": "#CCFBF1",
  };
  return map[type] ?? "#F3F4F6";
}

function getStatusColor(status: string): { bg: string; text: string } {
  if (status === "Active") return { bg: "#DBEAFE", text: "#1E40AF" };
  if (status === "Completed") return { bg: "#D1FAE5", text: "#065F46" };
  return { bg: "#F3F4F6", text: "#6B7280" };
}

const BLANK_FORM = {
  title: "",
  type: "Meal Plan" as PlanType,
  status: "Active" as PlanStatus,
  description: "",
  goalsText: "",
  startDate: "",
  endDate: "",
};

export default function DocPlansScreen() {
  const { doctorName: doctorNameParam, email: emailParam } =
    useLocalSearchParams<{ doctorName?: string; email?: string }>();
  const router = useRouter();

  const [doctorName] = useState(doctorNameParam || "Doctor");
  const [doctorEmail] = useState(
    (emailParam || getUser()?.email || "").toLowerCase(),
  );

  const [allPlans, setAllPlans] = useState<NutritionPlan[]>([]);
  const [patients, setPatients] = useState<{ email: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<PlanStatus | "All">("All");
  const [selectedType, setSelectedType] = useState<PlanType | "All">("All");

  // Details modal
  const [selectedPlan, setSelectedPlan] = useState<NutritionPlan | null>(null);

  // Edit modal
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<NutritionPlan | null>(null);
  const [editForm, setEditForm] = useState({ ...BLANK_FORM });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Create modal
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [createForm, setCreateForm] = useState({ ...BLANK_FORM });
  const [isSavingCreate, setIsSavingCreate] = useState(false);

  // Assign modal
  const [assigningPlan, setAssigningPlan] = useState<NutritionPlan | null>(null);
  const [assignSearch, setAssignSearch] = useState("");
  const [isSavingAssign, setIsSavingAssign] = useState(false);

  // Delete confirm
  const [planPendingDelete, setPlanPendingDelete] = useState<NutritionPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPlans = useCallback(async () => {
    try {
      const res = await fetchDoctorPlans(doctorEmail);
      setAllPlans(res.plans || []);
    } catch {
      // silently keep stale data
    }
  }, [doctorEmail]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadPlans();
      setLoading(false);
    })();
  }, [loadPlans]);

  useEffect(() => {
    fetchDoctorPatients(doctorEmail)
      .then((res) =>
        setPatients(
          (res.patients || []).map((p: any) => ({
            email: p.email || p.patientEmail || "",
            name: p.name || p.fullName || p.patientName || p.email || "",
          })),
        ),
      )
      .catch(() => {});
  }, [doctorEmail]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPlans();
    setRefreshing(false);
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filteredPlans = allPlans.filter((p) => {
    const title = (p.planTitle || "").toLowerCase();
    const assigned = (p.assignedTo || [])
      .map((a) => a.patientName)
      .join(" ")
      .toLowerCase();
    const matchSearch =
      !searchQuery ||
      title.includes(searchQuery.toLowerCase()) ||
      assigned.includes(searchQuery.toLowerCase());
    const matchStatus = selectedStatus === "All" || p.status === selectedStatus;
    const matchType = selectedType === "All" || p.planType === selectedType;
    return matchSearch && matchStatus && matchType;
  });

  const activePlansCount = allPlans.filter((p) => p.status === "Active").length;
  const completedPlansCount = allPlans.filter((p) => p.status === "Completed").length;
  const draftPlansCount = allPlans.filter((p) => p.status === "Draft").length;

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setCreateForm({ ...BLANK_FORM });
    setIsCreateModalVisible(true);
  };

  const handleSaveCreate = async () => {
    if (!createForm.description.trim()) {
      Alert.alert("Missing field", "Please add a description.");
      return;
    }
    setIsSavingCreate(true);
    try {
      await saveDoctorPlan(doctorEmail, {
        planTitle: createForm.title.trim() || createForm.type,
        planType: createForm.type,
        status: createForm.status,
        startDate: createForm.startDate.trim(),
        endDate: createForm.endDate.trim(),
        description: createForm.description.trim(),
        goals: createForm.goalsText
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
      });
      await loadPlans();
      setIsCreateModalVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to create plan.");
    } finally {
      setIsSavingCreate(false);
    }
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const handleOpenEdit = (plan: NutritionPlan) => {
    setEditingPlan(plan);
    setEditForm({
      title: plan.planTitle || "",
      type: (plan.planType as PlanType) || "Meal Plan",
      status: (plan.status as PlanStatus) || "Active",
      description: plan.description || "",
      goalsText: (plan.goals || []).join(", "),
      startDate: plan.startDate || "",
      endDate: plan.endDate || "",
    });
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPlan) return;
    setIsSavingEdit(true);
    try {
      await updateDoctorPlan(doctorEmail, editingPlan.id, {
        planTitle: editForm.title.trim() || editForm.type,
        planType: editForm.type,
        status: editForm.status,
        startDate: editForm.startDate.trim(),
        endDate: editForm.endDate.trim(),
        description: editForm.description.trim(),
        goals: editForm.goalsText
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
      });
      await loadPlans();
      // Update selected plan details if open
      setSelectedPlan((prev) =>
        prev && prev.id === editingPlan.id
          ? {
              ...prev,
              planTitle: editForm.title.trim() || editForm.type,
              planType: editForm.type,
              status: editForm.status,
              startDate: editForm.startDate.trim(),
              endDate: editForm.endDate.trim(),
              description: editForm.description.trim(),
              goals: editForm.goalsText
                .split(",")
                .map((g) => g.trim())
                .filter(Boolean),
            }
          : prev,
      );
      setIsEditModalVisible(false);
      setEditingPlan(null);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update plan.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!planPendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoctorPlan(doctorEmail, planPendingDelete.id);
      setAllPlans((prev) => prev.filter((p) => p.id !== planPendingDelete.id));
      if (selectedPlan?.id === planPendingDelete.id) setSelectedPlan(null);
      setPlanPendingDelete(null);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to delete plan.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Assign ─────────────────────────────────────────────────────────────────
  const handleOpenAssign = (plan: NutritionPlan) => {
    setAssigningPlan(plan);
    setAssignSearch("");
  };

  const handleAssign = async (patientEmail: string, patientName: string) => {
    if (!assigningPlan) return;
    setIsSavingAssign(true);
    try {
      await assignDoctorPlan(doctorEmail, assigningPlan.id, patientEmail, patientName);
      await loadPlans();
      setAssigningPlan(null);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to assign plan.");
    } finally {
      setIsSavingAssign(false);
    }
  };

  // ── Duplicate ──────────────────────────────────────────────────────────────
  const handleDuplicate = async (plan: NutritionPlan) => {
    try {
      await duplicateDoctorPlan(doctorEmail, plan.id);
      await loadPlans();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to duplicate plan.");
    }
  };

  // ── Plan Card ──────────────────────────────────────────────────────────────
  const renderPlanCard = (plan: NutritionPlan) => {
    const sc = getStatusColor(plan.status);
    const assignedCount = (plan.assignedTo || []).length;

    return (
      <View key={plan.id} style={styles.planCard}>
        <View style={styles.planHeader}>
          <View style={[styles.planTypeIcon, { backgroundColor: getTypeColor(plan.planType) }]}>
            <MaterialCommunityIcons name={getTypeIcon(plan.planType)} size={22} color="#3B82F6" />
          </View>
          <View style={styles.planHeaderContent}>
            <Text style={styles.planTypeText}>{plan.planType}</Text>
            <Text style={styles.planTitleText} numberOfLines={1}>
              {plan.planTitle}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{plan.status}</Text>
          </View>
        </View>

        {!!plan.description && (
          <Text style={styles.planDescription} numberOfLines={2}>
            {plan.description}
          </Text>
        )}

        {(plan.goals || []).length > 0 && (
          <View style={styles.goalsRow}>
            {plan.goals.slice(0, 3).map((g, i) => (
              <View key={i} style={styles.goalTag}>
                <Text style={styles.goalTagText} numberOfLines={1}>
                  ✓ {g}
                </Text>
              </View>
            ))}
            {plan.goals.length > 3 && (
              <View style={styles.goalTag}>
                <Text style={styles.goalTagText}>+{plan.goals.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {(plan.startDate || plan.endDate) && (
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={13} color="#9CA3AF" />
            <Text style={styles.dateText}>
              {plan.startDate || "—"} → {plan.endDate || "—"}
            </Text>
          </View>
        )}

        <View style={styles.assignedRow}>
          <Ionicons name="people-outline" size={13} color="#6B7280" />
          <Text style={styles.assignedText}>
            {assignedCount} patient{assignedCount !== 1 ? "s" : ""} assigned
          </Text>
        </View>

        <View style={styles.planActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setSelectedPlan(plan)}>
            <Ionicons name="eye-outline" size={15} color="#3B82F6" />
            <Text style={[styles.actionBtnText, { color: "#3B82F6" }]}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenEdit(plan)}>
            <Ionicons name="pencil-outline" size={15} color="#10B981" />
            <Text style={[styles.actionBtnText, { color: "#10B981" }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenAssign(plan)}>
            <Ionicons name="person-add-outline" size={15} color="#8B5CF6" />
            <Text style={[styles.actionBtnText, { color: "#8B5CF6" }]}>Assign</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDuplicate(plan)}>
            <Ionicons name="copy-outline" size={15} color="#F59E0B" />
            <Text style={[styles.actionBtnText, { color: "#F59E0B" }]}>Copy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPlanPendingDelete(plan)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Treatment Plans</Text>
            <Text style={styles.headerSubtitle}>Create and manage patient plans</Text>
          </View>
          <TouchableOpacity style={styles.createButton} onPress={handleOpenCreate}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          {[
            { icon: "play-circle" as const, count: activePlansCount, label: "Active", color: "#3B82F6" },
            { icon: "checkmark-circle" as const, count: completedPlansCount, label: "Done", color: "#10B981" },
            { icon: "document-outline" as const, count: draftPlansCount, label: "Draft", color: "#9CA3AF" },
          ].map(({ icon, count, label, color }) => (
            <View key={label} style={styles.summaryCard}>
              <Ionicons name={icon} size={20} color={color} />
              <Text style={styles.summaryCount}>{count}</Text>
              <Text style={styles.summaryLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search plans or patients..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Status filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(["All", "Active", "Completed", "Draft"] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, selectedStatus === s && styles.chipActive]}
              onPress={() => setSelectedStatus(s)}
            >
              <Text style={[styles.chipText, selectedStatus === s && styles.chipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Type filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.chip, selectedType === "All" && styles.chipActive]}
            onPress={() => setSelectedType("All")}
          >
            <Text style={[styles.chipText, selectedType === "All" && styles.chipTextActive]}>
              All Types
            </Text>
          </TouchableOpacity>
          {PLAN_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, selectedType === t && styles.chipActive]}
              onPress={() => setSelectedType(t)}
            >
              <MaterialCommunityIcons
                name={getTypeIcon(t)}
                size={13}
                color={selectedType === t ? "#FFFFFF" : "#6B7280"}
              />
              <Text style={[styles.chipText, selectedType === t && styles.chipTextActive]}>
                {t.replace(" Plan", "")}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Plans list */}
        <View style={styles.listWrap}>
          {loading && allPlans.length === 0 ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.emptyText}>Loading plans…</Text>
            </View>
          ) : filteredPlans.length > 0 ? (
            filteredPlans.map(renderPlanCard)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>
                {allPlans.length === 0 ? "No Plans Yet" : "No Plans Match"}
              </Text>
              <Text style={styles.emptyText}>
                {allPlans.length === 0
                  ? "Tap + to create your first treatment plan."
                  : "Try adjusting the filters."}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Details Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={!!selectedPlan}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPlan(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Plan Details</Text>
              <TouchableOpacity onPress={() => setSelectedPlan(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {selectedPlan && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailBlock}>
                  <Text style={styles.detailPlanTitle}>{selectedPlan.planTitle}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedPlan.status).bg, alignSelf: "flex-start", marginTop: 4 }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedPlan.status).text }]}>{selectedPlan.status}</Text>
                  </View>
                </View>
                <DetailRow label="Type" value={selectedPlan.planType} />
                {!!selectedPlan.description && <DetailRow label="Description" value={selectedPlan.description} />}
                {(selectedPlan.startDate || selectedPlan.endDate) && (
                  <DetailRow label="Duration" value={`${selectedPlan.startDate || "—"} → ${selectedPlan.endDate || "—"}`} />
                )}
                {(selectedPlan.goals || []).length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Goals</Text>
                    {selectedPlan.goals.map((g, i) => (
                      <View key={i} style={styles.goalItem}>
                        <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                        <Text style={styles.goalItemText}>{g}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Assigned Patients ({(selectedPlan.assignedTo || []).length})</Text>
                  {(selectedPlan.assignedTo || []).length === 0 ? (
                    <Text style={styles.detailValue}>Not assigned yet</Text>
                  ) : (
                    selectedPlan.assignedTo.map((a, i) => (
                      <Text key={i} style={styles.detailValue}>
                        • {a.patientName} ({a.patientEmail})
                      </Text>
                    ))
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 16 }]}
                  onPress={() => { setSelectedPlan(null); handleOpenEdit(selectedPlan); }}
                >
                  <Ionicons name="pencil" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Edit This Plan</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Create Modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Plan</Text>
              <TouchableOpacity onPress={() => setIsCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <FormLabel text="Plan Title" />
              <TextInput
                style={styles.input}
                value={createForm.title}
                onChangeText={(v) => setCreateForm((f) => ({ ...f, title: v }))}
                placeholder="e.g. Low Carb Meal Plan"
                placeholderTextColor="#9CA3AF"
              />

              <FormLabel text="Category" />
              <View style={styles.chipWrap}>
                {PLAN_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.selectChip, createForm.type === t && styles.selectChipActive]}
                    onPress={() => setCreateForm((f) => ({ ...f, type: t }))}
                  >
                    <MaterialCommunityIcons name={getTypeIcon(t)} size={13} color={createForm.type === t ? "#FFFFFF" : "#6B7280"} />
                    <Text style={[styles.selectChipText, createForm.type === t && styles.selectChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FormLabel text="Status" />
              <View style={styles.chipWrap}>
                {(["Active", "Draft"] as PlanStatus[]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.selectChip, createForm.status === s && styles.selectChipActive]}
                    onPress={() => setCreateForm((f) => ({ ...f, status: s }))}
                  >
                    <Text style={[styles.selectChipText, createForm.status === s && styles.selectChipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <FormLabel text="Description *" />
              <TextInput
                style={[styles.input, styles.multiline]}
                value={createForm.description}
                onChangeText={(v) => setCreateForm((f) => ({ ...f, description: v }))}
                placeholder="Describe the plan..."
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />

              <FormLabel text="Goals (comma separated)" />
              <TextInput
                style={[styles.input, styles.multiline]}
                value={createForm.goalsText}
                onChangeText={(v) => setCreateForm((f) => ({ ...f, goalsText: v }))}
                placeholder="e.g. Reduce sugar, Walk 30 min daily"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />

              <FormLabel text="Start Date" />
              <TextInput
                style={styles.input}
                value={createForm.startDate}
                onChangeText={(v) => setCreateForm((f) => ({ ...f, startDate: v }))}
                placeholder="e.g. Jan 1, 2026"
                placeholderTextColor="#9CA3AF"
              />

              <FormLabel text="End Date" />
              <TextInput
                style={styles.input}
                value={createForm.endDate}
                onChangeText={(v) => setCreateForm((f) => ({ ...f, endDate: v }))}
                placeholder="e.g. Mar 31, 2026"
                placeholderTextColor="#9CA3AF"
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 20 }, isSavingCreate && styles.btnDisabled]}
                onPress={handleSaveCreate}
                disabled={isSavingCreate}
              >
                {isSavingCreate ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.primaryBtnText}>{isSavingCreate ? "Creating…" : "Create Plan"}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Edit Modal ────────────────────────────────────────────────────── */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Edit Plan</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {editingPlan && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <FormLabel text="Plan Title" />
                <TextInput
                  style={styles.input}
                  value={editForm.title}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, title: v }))}
                  placeholder="Plan title"
                  placeholderTextColor="#9CA3AF"
                />

                <FormLabel text="Category" />
                <View style={styles.chipWrap}>
                  {PLAN_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.selectChip, editForm.type === t && styles.selectChipActive]}
                      onPress={() => setEditForm((f) => ({ ...f, type: t }))}
                    >
                      <MaterialCommunityIcons name={getTypeIcon(t)} size={13} color={editForm.type === t ? "#FFFFFF" : "#6B7280"} />
                      <Text style={[styles.selectChipText, editForm.type === t && styles.selectChipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <FormLabel text="Status" />
                <View style={styles.chipWrap}>
                  {(["Active", "Completed", "Draft"] as PlanStatus[]).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.selectChip, editForm.status === s && styles.selectChipActive]}
                      onPress={() => setEditForm((f) => ({ ...f, status: s }))}
                    >
                      <Text style={[styles.selectChipText, editForm.status === s && styles.selectChipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <FormLabel text="Description" />
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={editForm.description}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, description: v }))}
                  multiline
                  textAlignVertical="top"
                />

                <FormLabel text="Goals (comma separated)" />
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={editForm.goalsText}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, goalsText: v }))}
                  multiline
                  textAlignVertical="top"
                />

                <FormLabel text="Start Date" />
                <TextInput
                  style={styles.input}
                  value={editForm.startDate}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, startDate: v }))}
                  placeholder="e.g. Jan 1, 2026"
                  placeholderTextColor="#9CA3AF"
                />

                <FormLabel text="End Date" />
                <TextInput
                  style={styles.input}
                  value={editForm.endDate}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, endDate: v }))}
                  placeholder="e.g. Mar 31, 2026"
                  placeholderTextColor="#9CA3AF"
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 20 }, isSavingEdit && styles.btnDisabled]}
                  onPress={handleSaveEdit}
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  )}
                  <Text style={styles.primaryBtnText}>{isSavingEdit ? "Saving…" : "Save Changes"}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Assign Modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={!!assigningPlan}
        transparent
        animationType="slide"
        onRequestClose={() => setAssigningPlan(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Assign Plan</Text>
              <TouchableOpacity onPress={() => setAssigningPlan(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {assigningPlan && (
              <>
                <Text style={styles.assignPlanName}>{assigningPlan.planTitle}</Text>
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={16} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search patients..."
                    placeholderTextColor="#9CA3AF"
                    value={assignSearch}
                    onChangeText={setAssignSearch}
                  />
                </View>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320, marginTop: 8 }}>
                  {patients
                    .filter(
                      (p) =>
                        !assignSearch ||
                        p.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
                        p.email.toLowerCase().includes(assignSearch.toLowerCase()),
                    )
                    .map((p) => {
                      const alreadyAssigned = (assigningPlan.assignedTo || []).some(
                        (a) => a.patientEmail === p.email,
                      );
                      return (
                        <TouchableOpacity
                          key={p.email}
                          style={[styles.patientRow, alreadyAssigned && { opacity: 0.5 }]}
                          onPress={() => !alreadyAssigned && !isSavingAssign && handleAssign(p.email, p.name)}
                          disabled={alreadyAssigned || isSavingAssign}
                        >
                          <View style={styles.patientAvatar}>
                            <Text style={styles.patientAvatarText}>{p.name.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.patientName}>{p.name}</Text>
                            <Text style={styles.patientEmail}>{p.email}</Text>
                          </View>
                          {alreadyAssigned ? (
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                          ) : (
                            <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  {patients.length === 0 && (
                    <Text style={[styles.emptyText, { textAlign: "center", paddingVertical: 24 }]}>
                      No linked patients found.
                    </Text>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Delete Confirm Modal ──────────────────────────────────────────── */}
      <Modal
        visible={!!planPendingDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setPlanPendingDelete(null)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="trash" size={28} color="#EF4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete Plan?</Text>
            <Text style={styles.confirmText}>
              {planPendingDelete
                ? `"${planPendingDelete.planTitle}" will be permanently removed from all ${(planPendingDelete.assignedTo || []).length} assigned patients.`
                : ""}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setPlanPendingDelete(null)}
                disabled={isDeleting}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteBtn, isDeleting && styles.btnDisabled]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
              >
                <Text style={styles.confirmDeleteText}>{isDeleting ? "Deleting…" : "Delete"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FormLabel({ text }: { text: string }) {
  return <Text style={styles.formLabel}>{text}</Text>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailSection}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContent: { paddingBottom: 32 },

  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 2 },
  headerSubtitle: { fontSize: 13, color: "#6B7280" },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },

  summaryRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  summaryCount: { fontSize: 20, fontWeight: "700", color: "#111827", marginTop: 4, marginBottom: 2 },
  summaryLabel: { fontSize: 11, color: "#6B7280", fontWeight: "500" },

  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },

  filterRow: { paddingHorizontal: 16, paddingVertical: 6, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  chipActive: { backgroundColor: "#3B82F6" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  chipTextActive: { color: "#FFFFFF" },

  listWrap: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginBottom: 12,
  },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  planTypeIcon: { width: 46, height: 46, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  planHeaderContent: { flex: 1 },
  planTypeText: { fontSize: 11, color: "#6B7280", fontWeight: "600", marginBottom: 2 },
  planTitleText: { fontSize: 15, fontWeight: "700", color: "#111827" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700" },
  planDescription: { fontSize: 13, color: "#6B7280", lineHeight: 18, marginBottom: 10 },
  goalsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  goalTag: { backgroundColor: "#ECFDF5", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  goalTagText: { fontSize: 11, color: "#065F46", fontWeight: "500" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  dateText: { fontSize: 12, color: "#9CA3AF" },
  assignedRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12 },
  assignedText: { fontSize: 12, color: "#6B7280" },
  planActions: { flexDirection: "row", gap: 6, alignItems: "center" },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 4,
  },
  actionBtnText: { fontSize: 11, fontWeight: "600" },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginTop: 14, marginBottom: 6 },
  emptyText: { fontSize: 13, color: "#6B7280", textAlign: "center" },

  // Modals
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: "88%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },

  // Details modal
  detailBlock: { backgroundColor: "#F3F4F6", borderRadius: 12, padding: 14, marginBottom: 14 },
  detailPlanTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  detailSection: { marginBottom: 14 },
  detailLabel: { fontSize: 11, fontWeight: "600", color: "#6B7280", marginBottom: 5 },
  detailValue: { fontSize: 14, color: "#111827", lineHeight: 20 },
  goalItem: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 5 },
  goalItemText: { fontSize: 13, color: "#111827", flex: 1 },

  // Form
  formLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  multiline: { minHeight: 80 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  selectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#F3F4F6",
  },
  selectChipActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  selectChipText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  selectChipTextActive: { color: "#FFFFFF" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 13,
    gap: 8,
    marginBottom: 8,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  btnDisabled: { opacity: 0.5 },

  // Assign modal
  assignPlanName: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 12 },
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  patientAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  patientAvatarText: { fontSize: 16, fontWeight: "700", color: "#1E40AF" },
  patientName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  patientEmail: { fontSize: 12, color: "#6B7280" },

  // Delete confirm
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  confirmCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    width: "100%",
  },
  confirmIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  confirmTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8 },
  confirmText: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20, marginBottom: 20 },
  confirmActions: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmCancelText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmDeleteText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
