import { Ionicons } from "@expo/vector-icons";
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
import { getUserByEmail, saveUserProfile } from "../../services/api";

type Step = 1 | 2 | 3 | 4 | 5;

interface ProfileData {
  fullName: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  medicalConditions: string[];
  allergies: string[];
  healthGoals: string[];
  language: string;
  units: string;
}

const medicalConditionsList = [
  "Hypertension",
  "Diabetes Type 1",
  "Diabetes Type 2",
  "Heart Disease",
  "High Cholesterol",
  "Asthma",
  "Arthritis",
  "Obesity",
  "Sleep Apnea",
];

const healthGoals = [
  { id: "weight", label: "Weight Management", icon: "⚖️" },
  { id: "nutrition", label: "Better Nutrition", icon: "🥗" },
  { id: "fitness", label: "Fitness & Activity", icon: "💪" },
  { id: "disease", label: "Disease Control", icon: "💊" },
];

export default function ProfileSetup() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const userEmail = emailParam || "user@example.com";

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [profileData, setProfileData] = useState<ProfileData>({
    fullName: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    medicalConditions: [],
    allergies: [],
    healthGoals: [],
    language: "English",
    units: "Metric (kg, cm)",
  });
  const [allergyInput, setAllergyInput] = useState("");
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    getUserByEmail(userEmail)
      .then((response) => {
        if (!active) return;

        const profile = (response.user.profile || {}) as any;
        setProfileData((prev) => ({
          ...prev,
          fullName: profile.fullName || prev.fullName,
          age: profile.age || prev.age,
          gender: profile.gender || prev.gender,
          height: profile.height || prev.height,
          weight: profile.weight || prev.weight,
          medicalConditions:
            profile.medicalConditions || prev.medicalConditions,
          allergies: profile.allergies || prev.allergies,
          healthGoals: profile.healthGoals || prev.healthGoals,
          language: profile.language || prev.language,
          units: profile.units || prev.units,
        }));
      })
      .catch((error) => {
        console.log("Failed to fetch profile:", error);
      });

    return () => {
      active = false;
    };
  }, [userEmail]);

  const genderOptions = ["Male", "Female", "Other"];

  const handleContinue = async () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as Step);
    } else {
      setIsSubmitting(true);
      try {
        await saveUserProfile({
          email: userEmail,
          profile: profileData,
        });
      } catch (error) {
        console.log("Profile save error (non-blocking):", error);
      }
      setIsSubmitting(false);
      router.replace({
        pathname: "/(tabs)/home",
        params: {
          fullName: profileData.fullName,
          age: profileData.age,
          height: profileData.height,
          weight: profileData.weight,
          email: userEmail,
        },
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const toggleMedicalCondition = (condition: string) => {
    setProfileData((prev) => ({
      ...prev,
      medicalConditions: prev.medicalConditions.includes(condition)
        ? prev.medicalConditions.filter((c) => c !== condition)
        : [...prev.medicalConditions, condition],
    }));
  };

  const addAllergy = () => {
    if (allergyInput.trim()) {
      setProfileData((prev) => ({
        ...prev,
        allergies: [...prev.allergies, allergyInput.trim()],
      }));
      setAllergyInput("");
    }
  };

  const removeAllergy = (allergy: string) => {
    setProfileData((prev) => ({
      ...prev,
      allergies: prev.allergies.filter((a) => a !== allergy),
    }));
  };

  const selectHealthGoal = (goalId: string) => {
    setProfileData((prev) => {
      const newGoals = prev.healthGoals.includes(goalId)
        ? prev.healthGoals.filter((g) => g !== goalId)
        : [...prev.healthGoals, goalId];

      return {
        ...prev,
        healthGoals: newGoals,
      };
    });
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <Text style={styles.progressText}>Complete Your Profile</Text>
      <Text style={styles.stepText}>Step {currentStep} of 5</Text>
      <View style={styles.progressBarContainer}>
        <View
          style={[styles.progressBar, { width: `${(currentStep / 5) * 100}%` }]}
        />
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconHeader}>
        <View style={styles.iconCircle}>
          <Ionicons name="person-outline" size={32} color="#3B82F6" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.stepTitle}>Personal Information</Text>
          <Text style={styles.stepSubtitle}>Tell us about yourself</Text>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Ahmed Mohamed"
          value={profileData.fullName}
          onChangeText={(text) =>
            setProfileData({ ...profileData, fullName: text })
          }
        />
      </View>

      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            placeholder="30"
            keyboardType="numeric"
            value={profileData.age}
            onChangeText={(text) =>
              setProfileData({ ...profileData, age: text })
            }
          />
        </View>

        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerContainer}>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowGenderModal(true)}
            >
              <Text
                style={
                  profileData.gender
                    ? styles.pickerText
                    : styles.pickerPlaceholder
                }
              >
                {profileData.gender || "Select"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Height (cm)</Text>
          <TextInput
            style={styles.input}
            placeholder="175"
            keyboardType="numeric"
            value={profileData.height}
            onChangeText={(text) =>
              setProfileData({ ...profileData, height: text })
            }
          />
        </View>

        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="75"
            keyboardType="numeric"
            value={profileData.weight}
            onChangeText={(text) =>
              setProfileData({ ...profileData, weight: text })
            }
          />
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconHeader}>
        <View style={styles.iconCircle}>
          <Ionicons name="medical-outline" size={32} color="#3B82F6" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.stepTitle}>Medical Conditions</Text>
          <Text style={styles.stepSubtitle}>
            Select any that apply (optional)
          </Text>
        </View>
      </View>

      <View style={styles.conditionsGrid}>
        {medicalConditionsList.map((condition) => (
          <TouchableOpacity
            key={condition}
            style={[
              styles.conditionCard,
              profileData.medicalConditions.includes(condition) &&
                styles.conditionCardSelected,
            ]}
            onPress={() => toggleMedicalCondition(condition)}
          >
            <Text
              style={[
                styles.conditionText,
                profileData.medicalConditions.includes(condition) &&
                  styles.conditionTextSelected,
              ]}
            >
              {condition}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconHeader}>
        <View style={styles.iconCircle}>
          <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.stepTitle}>Allergies & Intolerances</Text>
          <Text style={styles.stepSubtitle}>
            Add any food allergies or intolerances
          </Text>
        </View>
      </View>

      <View style={styles.allergyInputContainer}>
        <TextInput
          style={styles.allergyInput}
          placeholder="e.g., Peanuts, Dairy, Shellfish"
          value={allergyInput}
          onChangeText={setAllergyInput}
        />
        <TouchableOpacity style={styles.addButton} onPress={addAllergy}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {profileData.allergies.length > 0 ? (
        <View style={styles.allergyList}>
          {profileData.allergies.map((allergy, index) => (
            <View key={index} style={styles.allergyTag}>
              <Text style={styles.allergyTagText}>{allergy}</Text>
              <TouchableOpacity onPress={() => removeAllergy(allergy)}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No allergies added yet. You can skip this step if you don&apos;t
            have any.
          </Text>
        </View>
      )}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconHeader}>
        <View style={styles.iconCircle}>
          <Ionicons name="trophy-outline" size={32} color="#3B82F6" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.stepTitle}>Your Health Goals</Text>
          <Text style={styles.stepSubtitle}>
            What do you want to achieve? (Select all that apply)
          </Text>
        </View>
      </View>

      <View style={styles.goalsGrid}>
        {healthGoals.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            activeOpacity={0.7}
            style={[
              styles.goalCard,
              profileData.healthGoals.includes(goal.id) &&
                styles.goalCardSelected,
            ]}
            onPress={() => selectHealthGoal(goal.id)}
          >
            <Text style={styles.goalIcon}>{goal.icon}</Text>
            <Text style={styles.goalLabel}>{goal.label}</Text>
            {profileData.healthGoals.includes(goal.id) && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {profileData.healthGoals.length > 0 && (
        <View style={styles.selectedGoalsDebug}>
          <Text style={styles.debugText}>
            Selected: {profileData.healthGoals.join(", ")}
          </Text>
        </View>
      )}
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.iconHeader}>
        <View style={styles.iconCircle}>
          <Ionicons name="settings-outline" size={32} color="#3B82F6" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.stepTitle}>Preferences</Text>
          <Text style={styles.stepSubtitle}>Customize your experience</Text>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Language</Text>
        <View style={styles.pickerContainer}>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => {
              const languages = ["English", "Arabic", "French", "Spanish"];
              const currentIndex = languages.indexOf(profileData.language);
              const nextLanguage =
                languages[(currentIndex + 1) % languages.length];
              setProfileData({ ...profileData, language: nextLanguage });
            }}
          >
            <Text style={styles.pickerText}>{profileData.language}</Text>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Units</Text>
        <View style={styles.pickerContainer}>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => {
              setProfileData({
                ...profileData,
                units:
                  profileData.units === "Metric (kg, cm)"
                    ? "Imperial (lb, ft)"
                    : "Metric (kg, cm)",
              });
            }}
          >
            <Text style={styles.pickerText}>{profileData.units}</Text>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.completionBox}>
        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
        <Text style={styles.completionText}>You&apos;re all set!</Text>
        <Text style={styles.completionSubtext}>
          Click finish to start tracking your health journey with VitalConnect.
        </Text>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderProgressBar()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentStep()}
      </ScrollView>

      <View style={styles.navigationButtons}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.continueButton,
            currentStep === 1 && styles.continueButtonFull,
          ]}
          onPress={handleContinue}
          disabled={isSubmitting}
        >
          <Text style={styles.continueButtonText}>
            {isSubmitting
              ? "Saving..."
              : currentStep === 5
                ? "Finish"
                : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Gender Selection Modal */}
      <Modal
        visible={showGenderModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGenderModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGenderModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              <TouchableOpacity onPress={() => setShowGenderModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {genderOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.modalOption,
                  profileData.gender === option && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setProfileData({ ...profileData, gender: option });
                  setShowGenderModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    profileData.gender === option &&
                      styles.modalOptionTextSelected,
                  ]}
                >
                  {option}
                </Text>
                {profileData.gender === option && (
                  <Ionicons name="checkmark" size={20} color="#3B82F6" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  progressContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  progressText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  stepContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  rowInputs: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  pickerContainer: {
    position: "relative",
  },
  picker: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerText: {
    fontSize: 16,
    color: "#111827",
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: "#9CA3AF",
  },
  conditionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  conditionCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: "47%",
  },
  conditionCardSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  conditionText: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
  },
  conditionTextSelected: {
    color: "#3B82F6",
    fontWeight: "500",
  },
  allergyInputContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  allergyInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  addButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  allergyList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  allergyTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  allergyTagText: {
    fontSize: 14,
    color: "#DC2626",
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  goalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  goalCard: {
    width: "47%",
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    position: "relative",
  },
  goalCardSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  goalIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  completionBox: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginTop: 20,
  },
  completionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#047857",
    marginTop: 8,
    marginBottom: 4,
  },
  completionSubtext: {
    fontSize: 14,
    color: "#065F46",
    textAlign: "center",
  },
  navigationButtons: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  backButton: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  continueButton: {
    flex: 2,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  continueButtonFull: {
    flex: 1,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalOptionSelected: {
    backgroundColor: "#EFF6FF",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#374151",
  },
  modalOptionTextSelected: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  selectedGoalsDebug: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  debugText: {
    fontSize: 12,
    color: "#1E40AF",
    fontWeight: "500",
  },
});
