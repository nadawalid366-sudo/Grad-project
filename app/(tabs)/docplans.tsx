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

type PlanStatus = "Active" | "Completed" | "Draft";
type PlanType =
  | "Meal Plan"
  | "Workout Plan"
  | "Medication Plan"
  | "Sleep Plan"
  | "General Health";

interface Plan {
  id: string;
  patientName: string;
  patientAge: number;
  planType: PlanType;
  status: PlanStatus;
  startDate: string;
  endDate: string;
  adherence: number;
  description: string;
  goals: string[];
}

export default function DocPlansScreen() {
  const { doctorName: doctorNameParam, email: emailParam } = useLocalSearchParams<{ doctorName?: string; email?: string }>();
  const router = useRouter();
  const [doctorName, setDoctorName] = useState("Doctor");
  const [doctorEmail, setDoctorEmail] = useState("doctor@example.com");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<PlanStatus | "All">(
    "All",
  );
  const [selectedType, setSelectedType] = useState<PlanType | "All">("All");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editGoalsText, setEditGoalsText] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editAdherence, setEditAdherence] = useState("");
  const [editStatus, setEditStatus] = useState<PlanStatus>("Draft");

  useEffect(() => {
    setDoctorName(doctorNameParam || "Doctor");
    setDoctorEmail(emailParam || "doctor@example.com");
  }, [doctorNameParam, emailParam]);

  useEffect(() => {
    let active = true;
    fetchDoctorDashboard(doctorEmail)
      .then((response) => {
        if (!active) return;

        const mappedPlans = (response.plans || []).map(
          (plan: any, index: number) => ({
            id: plan.id || plan._id || String(index + 1),
            patientName: plan.patientName,
            patientAge: Number(plan.patientAge || 0),
            planType: plan.planType,
            status: plan.status,
            startDate: plan.startDate,
            endDate: plan.endDate,
            adherence: Number(plan.adherence || 0),
            description: plan.description,
            goals: plan.goals || [],
          }),
        );

        setAllPlans(mappedPlans);
      })
      .catch((error) => console.log("Failed to load doctor plans:", error));

    return () => {
      active = false;
    };
  }, [doctorEmail]);

  const [allPlans, setAllPlans] = useState<Plan[]>([]);

  const renderStatusIcon = (status: PlanStatus) => {
    switch (status) {
      case "Active":
        return <Ionicons name="play-circle" size={14} color="#1E40AF" />;
      case "Completed":
        return <Ionicons name="checkmark" size={14} color="#065F46" />;
      case "Draft":
        return <Ionicons name="help-outline" size={14} color="#6B7280" />;
    }
  };

  const getStatusColor = (status: PlanStatus) => {
    switch (status) {
      case "Active":
        return { bg: "#DBEAFE", text: "#1E40AF" };
      case "Completed":
        return { bg: "#D1FAE5", text: "#065F46" };
      case "Draft":
        return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  const getPlanTypeColor = (type: PlanType) => {
    const colors: { [key in PlanType]: string } = {
      "Meal Plan": "#FEE2E2",
      "Workout Plan": "#DBEAFE",
      "Medication Plan": "#FEF3C7",
      "Sleep Plan": "#E9D5FF",
      "General Health": "#CCFBF1",
    };
    return colors[type];
  };

  const getPlanTypeIcon = (type: PlanType) => {
    const icons: {
      [key in PlanType]: keyof typeof MaterialCommunityIcons.glyphMap;
    } = {
      "Meal Plan": "food-apple",
      "Workout Plan": "dumbbell",
      "Medication Plan": "pill",
      "Sleep Plan": "bed",
      "General Health": "heart",
    };
    return icons[type];
  };

  const filteredPlans = allPlans.filter((plan) => {
    const matchesSearch = plan.patientName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "All" || plan.status === selectedStatus;
    const matchesType =
      selectedType === "All" || plan.planType === selectedType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const activePlansCount = allPlans.filter((p) => p.status === "Active").length;
  const completedPlansCount = allPlans.filter(
    (p) => p.status === "Completed",
  ).length;
  const draftPlansCount = allPlans.filter((p) => p.status === "Draft").length;

  const getAdherenceColor = (adherence: number) => {
    if (adherence >= 85) {
      return "#10B981";
    }
    if (adherence >= 60) {
      return "#F59E0B";
    }
    return "#EF4444";
  };

  const handleViewPlanDetails = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsDetailsModalVisible(true);
  };

  const handleClosePlanDetails = () => {
    setIsDetailsModalVisible(false);
    setSelectedPlan(null);
  };

  const handleOpenEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setEditDescription(plan.description);
    setEditGoalsText(plan.goals.join(", "));
    setEditStartDate(plan.startDate);
    setEditEndDate(plan.endDate);
    setEditAdherence(String(plan.adherence));
    setEditStatus(plan.status);
    setIsEditModalVisible(true);
  };

  const handleCloseEditPlan = () => {
    setIsEditModalVisible(false);
    setEditingPlan(null);
    setEditDescription("");
    setEditGoalsText("");
    setEditStartDate("");
    setEditEndDate("");
    setEditAdherence("");
    setEditStatus("Draft");
  };

  const handleSaveEditedPlan = () => {
    if (!editingPlan) {
      return;
    }

    const adherenceNum = Number(editAdherence);
    const safeAdherence = Number.isFinite(adherenceNum)
      ? Math.max(0, Math.min(100, adherenceNum))
      : editingPlan.adherence;

    const nextGoals = editGoalsText
      .split(",")
      .map((goal) => goal.trim())
      .filter(Boolean);

    const updatedPlan: Plan = {
      ...editingPlan,
      status: editStatus,
      description: editDescription.trim() || editingPlan.description,
      goals: nextGoals.length > 0 ? nextGoals : editingPlan.goals,
      startDate: editStartDate.trim() || editingPlan.startDate,
      endDate: editEndDate.trim() || editingPlan.endDate,
      adherence: safeAdherence,
    };

    setAllPlans((prevPlans) =>
      prevPlans.map((plan) =>
        plan.id === editingPlan.id ? updatedPlan : plan,
      ),
    );

    saveDoctorPlan(doctorEmail, {
      patientName: updatedPlan.patientName,
      patientAge: updatedPlan.patientAge,
      planType: updatedPlan.planType,
      status: updatedPlan.status,
      startDate: updatedPlan.startDate,
      endDate: updatedPlan.endDate,
      adherence: updatedPlan.adherence,
      description: updatedPlan.description,
      goals: updatedPlan.goals,
    }).catch((error) => console.log("Failed to save doctor plan:", error));

    setSelectedPlan((prevSelected) =>
      prevSelected && prevSelected.id === editingPlan.id
        ? updatedPlan
        : prevSelected,
    );

    handleCloseEditPlan();
  };

  const renderPlanCard = (plan: Plan) => {
    const statusColor = getStatusColor(plan.status);

    return (
      <View key={plan.id} style={styles.planCard}>
        <View style={styles.planHeader}>
          <View
            style={[
              styles.planTypeIcon,
              { backgroundColor: getPlanTypeColor(plan.planType) },
            ]}
          >
            <MaterialCommunityIcons
              name={getPlanTypeIcon(plan.planType)}
              size={24}
              color="#3B82F6"
            />
          </View>
          <View style={styles.planHeaderContent}>
            <Text style={styles.planTypeText}>{plan.planType}</Text>
            <Text style={styles.patientNameText}>
              {plan.patientName}, {plan.patientAge}
            </Text>
          </View>
          <View
            style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}
          >
            {renderStatusIcon(plan.status)}
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {plan.status}
            </Text>
          </View>
        </View>

        <Text style={styles.planDescription}>{plan.description}</Text>

        <View style={styles.goalSection}>
          <Text style={styles.goalLabel}>Goals:</Text>
          <View style={styles.goalsContainer}>
            {plan.goals.map((goal, index) => (
              <View key={index} style={styles.goalTag}>
                <Text style={styles.goalTagText}>✓ {goal}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.adherenceSection}>
          <View style={styles.adherenceLabelContainer}>
            <Text style={styles.adherenceLabel}>Adherence</Text>
            <Text style={styles.adherenceValue}>{plan.adherence}%</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${plan.adherence}%`,
                  backgroundColor:
                    plan.adherence >= 85
                      ? "#10B981"
                      : plan.adherence >= 60
                        ? "#F59E0B"
                        : "#EF4444",
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.dateSection}>
          <View style={styles.dateItem}>
            <Ionicons name="calendar" size={14} color="#6B7280" />
            <Text style={styles.dateText}>{plan.startDate}</Text>
          </View>
          <Text style={styles.dateSeparator}>→</Text>
          <View style={styles.dateItem}>
            <Ionicons name="calendar" size={14} color="#6B7280" />
            <Text style={styles.dateText}>{plan.endDate}</Text>
          </View>
        </View>

        <View style={styles.planActions}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => handleViewPlanDetails(plan)}
          >
            <Ionicons name="eye" size={16} color="#3B82F6" />
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleOpenEditPlan(plan)}
          >
            <Ionicons name="pencil" size={16} color="#10B981" />
            <Text style={styles.editButtonText}>Edit Plan</Text>
          </TouchableOpacity>
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
            <Text style={styles.headerTitle}>Treatment Plans</Text>
            <Text style={styles.headerSubtitle}>
              Manage patient health plans
            </Text>
          </View>
          <TouchableOpacity style={styles.createButton}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Status Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryCard}>
            <Ionicons name="play-circle" size={20} color="#3B82F6" />
            <Text style={styles.summaryCount}>{activePlansCount}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="checkmark" size={20} color="#10B981" />
            <Text style={styles.summaryCount}>{completedPlansCount}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="help-outline" size={20} color="#6B7280" />
            <Text style={styles.summaryCount}>{draftPlansCount}</Text>
            <Text style={styles.summaryLabel}>Draft</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by patient name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusFilterContainer}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedStatus === "All" && styles.filterChipActive,
              ]}
              onPress={() => setSelectedStatus("All")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === "All" && styles.filterChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedStatus === "Active" && styles.filterChipActive,
              ]}
              onPress={() => setSelectedStatus("Active")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === "Active" && styles.filterChipTextActive,
                ]}
              >
                Active
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedStatus === "Completed" && styles.filterChipActive,
              ]}
              onPress={() => setSelectedStatus("Completed")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === "Completed" && styles.filterChipTextActive,
                ]}
              >
                Completed
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedStatus === "Draft" && styles.filterChipActive,
              ]}
              onPress={() => setSelectedStatus("Draft")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === "Draft" && styles.filterChipTextActive,
                ]}
              >
                Draft
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Plan Type Filter */}
        <View style={styles.typeFilterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeFilterContainer}
          >
            <TouchableOpacity
              style={[
                styles.typeChip,
                selectedType === "All" && styles.typeChipActive,
              ]}
              onPress={() => setSelectedType("All")}
            >
              <Text
                style={[
                  styles.typeChipText,
                  selectedType === "All" && styles.typeChipTextActive,
                ]}
              >
                All Types
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeChip,
                selectedType === "Meal Plan" && styles.typeChipActive,
              ]}
              onPress={() => setSelectedType("Meal Plan")}
            >
              <MaterialCommunityIcons
                name="food-apple"
                size={14}
                color="currentColor"
              />
              <Text
                style={[
                  styles.typeChipText,
                  selectedType === "Meal Plan" && styles.typeChipTextActive,
                ]}
              >
                Meal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeChip,
                selectedType === "Workout Plan" && styles.typeChipActive,
              ]}
              onPress={() => setSelectedType("Workout Plan")}
            >
              <MaterialCommunityIcons
                name="dumbbell"
                size={14}
                color="currentColor"
              />
              <Text
                style={[
                  styles.typeChipText,
                  selectedType === "Workout Plan" && styles.typeChipTextActive,
                ]}
              >
                Workout
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeChip,
                selectedType === "Medication Plan" && styles.typeChipActive,
              ]}
              onPress={() => setSelectedType("Medication Plan")}
            >
              <MaterialCommunityIcons
                name="pill"
                size={14}
                color="currentColor"
              />
              <Text
                style={[
                  styles.typeChipText,
                  selectedType === "Medication Plan" &&
                    styles.typeChipTextActive,
                ]}
              >
                Medicine
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeChip,
                selectedType === "Sleep Plan" && styles.typeChipActive,
              ]}
              onPress={() => setSelectedType("Sleep Plan")}
            >
              <MaterialCommunityIcons
                name="bed"
                size={14}
                color="currentColor"
              />
              <Text
                style={[
                  styles.typeChipText,
                  selectedType === "Sleep Plan" && styles.typeChipTextActive,
                ]}
              >
                Sleep
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Plans List */}
        <View style={styles.plansList}>
          {filteredPlans.length > 0 ? (
            filteredPlans.map(renderPlanCard)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No Plans Found</Text>
              <Text style={styles.emptyStateText}>
                No plans match your current filters. Try adjusting your search.
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseEditPlan}
      >
        <View style={styles.detailsOverlay}>
          <View style={styles.detailsModalContainer}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Edit Plan</Text>
              <TouchableOpacity onPress={handleCloseEditPlan}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {editingPlan && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailsPatientBlock}>
                  <Text style={styles.detailsPatientName}>
                    {editingPlan.patientName}
                  </Text>
                  <Text style={styles.detailsPatientMeta}>
                    {editingPlan.planType}
                  </Text>
                </View>

                <Text style={styles.editFieldLabel}>Status</Text>
                <View style={styles.editStatusRow}>
                  {(["Active", "Completed", "Draft"] as PlanStatus[]).map(
                    (status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.editStatusChip,
                          editStatus === status && styles.editStatusChipActive,
                        ]}
                        onPress={() => setEditStatus(status)}
                      >
                        <Text
                          style={[
                            styles.editStatusChipText,
                            editStatus === status &&
                              styles.editStatusChipTextActive,
                          ]}
                        >
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>

                <Text style={styles.editFieldLabel}>Description</Text>
                <TextInput
                  style={[styles.editInput, styles.editMultilineInput]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  textAlignVertical="top"
                />

                <Text style={styles.editFieldLabel}>
                  Goals (comma separated)
                </Text>
                <TextInput
                  style={[styles.editInput, styles.editMultilineInput]}
                  value={editGoalsText}
                  onChangeText={setEditGoalsText}
                  multiline
                  textAlignVertical="top"
                />

                <Text style={styles.editFieldLabel}>Start Date</Text>
                <TextInput
                  style={styles.editInput}
                  value={editStartDate}
                  onChangeText={setEditStartDate}
                  placeholder="e.g. Mar 1, 2026"
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.editFieldLabel}>End Date</Text>
                <TextInput
                  style={styles.editInput}
                  value={editEndDate}
                  onChangeText={setEditEndDate}
                  placeholder="e.g. Jun 1, 2026"
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.editFieldLabel}>Adherence (0-100)</Text>
                <TextInput
                  style={styles.editInput}
                  value={editAdherence}
                  onChangeText={setEditAdherence}
                  keyboardType="numeric"
                  placeholder="e.g. 85"
                  placeholderTextColor="#9CA3AF"
                />

                <TouchableOpacity
                  style={styles.saveEditButton}
                  onPress={handleSaveEditedPlan}
                >
                  <Text style={styles.saveEditButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={isDetailsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleClosePlanDetails}
      >
        <View style={styles.detailsOverlay}>
          <View style={styles.detailsModalContainer}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Plan Details</Text>
              <TouchableOpacity onPress={handleClosePlanDetails}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedPlan && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailsPatientBlock}>
                  <Text style={styles.detailsPatientName}>
                    {selectedPlan.patientName}
                  </Text>
                  <Text style={styles.detailsPatientMeta}>
                    Age: {selectedPlan.patientAge}
                  </Text>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionLabel}>Plan Type</Text>
                  <Text style={styles.detailsSectionValue}>
                    {selectedPlan.planType}
                  </Text>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionLabel}>Status</Text>
                  <View
                    style={[
                      styles.detailsStatusBadge,
                      {
                        backgroundColor: getStatusColor(selectedPlan.status).bg,
                      },
                    ]}
                  >
                    {renderStatusIcon(selectedPlan.status)}
                    <Text
                      style={[
                        styles.detailsStatusText,
                        { color: getStatusColor(selectedPlan.status).text },
                      ]}
                    >
                      {selectedPlan.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionLabel}>
                    Plan Description
                  </Text>
                  <Text style={styles.detailsSectionValue}>
                    {selectedPlan.description}
                  </Text>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionLabel}>Goals</Text>
                  <View style={styles.detailsGoalsList}>
                    {selectedPlan.goals.map((goal, index) => (
                      <View key={index} style={styles.detailsGoalItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#10B981"
                        />
                        <Text style={styles.detailsGoalText}>{goal}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionLabel}>Duration</Text>
                  <Text style={styles.detailsSectionValue}>
                    {selectedPlan.startDate} to {selectedPlan.endDate}
                  </Text>
                </View>

                <View style={styles.detailsSection}>
                  <View style={styles.adherenceLabelContainer}>
                    <Text style={styles.detailsSectionLabel}>Adherence</Text>
                    <Text style={styles.adherenceValue}>
                      {selectedPlan.adherence}%
                    </Text>
                  </View>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${selectedPlan.adherence}%`,
                          backgroundColor: getAdherenceColor(
                            selectedPlan.adherence,
                          ),
                        },
                      ]}
                    />
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

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
          <Ionicons name="grid" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Dashboard</Text>
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
          <Ionicons name="people" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>My Patients</Text>
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

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="clipboard" size={24} color="#3B82F6" />
          <Text style={[styles.navLabel, { color: "#3B82F6" }]}>Plans</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  summarySection: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  filterSection: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  statusFilterContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  filterChipActive: {
    backgroundColor: "#3B82F6",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  typeFilterSection: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  typeFilterContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    gap: 4,
  },
  typeChipActive: {
    backgroundColor: "#3B82F6",
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  typeChipTextActive: {
    color: "#FFFFFF",
  },
  plansList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  planTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  planHeaderContent: {
    flex: 1,
  },
  planTypeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 2,
  },
  patientNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  planDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 12,
  },
  goalSection: {
    marginBottom: 12,
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  goalsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  goalTag: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  goalTagText: {
    fontSize: 11,
    color: "#065F46",
    fontWeight: "500",
  },
  adherenceSection: {
    marginBottom: 12,
  },
  adherenceLabelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  adherenceLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  adherenceValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  dateSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 12,
    gap: 8,
  },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: "#6B7280",
  },
  dateSeparator: {
    fontSize: 12,
    color: "#D1D5DB",
    marginHorizontal: 4,
  },
  planActions: {
    flexDirection: "row",
    gap: 8,
  },
  viewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DBEAFE",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D1FAE5",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
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
  detailsOverlay: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "flex-end",
  },
  detailsModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: "80%",
  },
  detailsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  detailsPatientBlock: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  detailsPatientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  detailsPatientMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  detailsSection: {
    marginBottom: 14,
  },
  detailsSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 6,
  },
  detailsSectionValue: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 20,
  },
  detailsStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  detailsStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  detailsGoalsList: {
    gap: 8,
  },
  detailsGoalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailsGoalText: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
  },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 6,
    marginTop: 10,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  editMultilineInput: {
    minHeight: 84,
  },
  editStatusRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  editStatusChip: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#F3F4F6",
  },
  editStatusChipActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#93C5FD",
  },
  editStatusChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  editStatusChipTextActive: {
    color: "#1E40AF",
  },
  saveEditButton: {
    marginTop: 16,
    backgroundColor: "#10B981",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  saveEditButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
