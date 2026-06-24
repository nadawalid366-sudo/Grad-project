import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { fetchPatientDashboard, savePatientPlan } from '../../services/api';

type PlanType = 'meal' | 'exercise' | 'medication' | 'general';

interface Plan {
  id: string;
  type: PlanType;
  title: string;
  description: string;
  icon: string;
  color: string;
  backgroundColor: string;
  status?: string;
  goals?: string[];
  startDate?: string;
  assignedByDoctor?: string;
  createdAt?: string;
  completed?: number;
  total?: number;
}

const PLAN_TYPE_OPTIONS: {
  id: PlanType;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
}[] = [
  { id: 'meal', title: 'Meal Plan', icon: 'restaurant', color: '#F59E0B', backgroundColor: '#FEF3C7' },
  { id: 'exercise', title: 'Workout Plan', icon: 'fitness', color: '#3B82F6', backgroundColor: '#DBEAFE' },
  { id: 'medication', title: 'Medication', icon: 'medical', color: '#EC4899', backgroundColor: '#FCE7F3' },
  { id: 'general', title: 'General', icon: 'sparkles', color: '#10B981', backgroundColor: '#D1FAE5' },
];

function getPlanVisual(type: PlanType) {
  return (
    PLAN_TYPE_OPTIONS.find((option) => option.id === type) ||
    PLAN_TYPE_OPTIONS[3]
  );
}

export default function HealthPlans() {
  const params = useLocalSearchParams<{ fullName?: string; age?: string; height?: string; weight?: string; email?: string }>();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [voiceAssistantScreen, setVoiceAssistantScreen] = useState<'listening' | 'confirmation'>('listening');
  const [selectedLogType, setSelectedLogType] = useState<string>('');
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [newPlanType, setNewPlanType] = useState<PlanType>('meal');
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanDescription, setNewPlanDescription] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    setUserData({
      fullName: params.fullName || 'User Name',
      age: params.age || '',
      height: params.height || '',
      weight: params.weight || '',
      email: params.email || 'user@example.com',
    });
  }, [params.fullName, params.age, params.height, params.weight, params.email]);

  const loadPlans = useCallback(async (email: string) => {
    try {
      const response = await fetchPatientDashboard(email);
      const mappedPlans: Plan[] = (response.plans || []).map(
        (plan: any, index: number) => {
          const type: PlanType = plan.type || 'general';
          const visual = getPlanVisual(type);
          return {
            id: plan.id || plan._id || String(index + 1),
            type,
            title: plan.title || 'Health Plan',
            description: plan.description || '',
            icon: plan.icon || visual.icon,
            color: plan.color || visual.color,
            backgroundColor: plan.backgroundColor || visual.backgroundColor,
            status: plan.status || 'Active',
            goals: Array.isArray(plan.goals) ? plan.goals : [],
            startDate: plan.startDate,
            assignedByDoctor: plan.assignedByDoctor,
            createdAt: plan.createdAt,
            completed: plan.completed,
            total: plan.total,
          };
        },
      );
      setPlans(mappedPlans);
    } catch (error) {
      console.log('Failed to load plans:', error);
    }
  }, []);

  useEffect(() => {
    const email = userData?.email;
    if (!email) {
      return;
    }
    loadPlans(email);
  }, [userData?.email, loadPlans]);

  const handleOpenCreatePlan = (type: PlanType) => {
    setNewPlanType(type);
    setNewPlanTitle('');
    setNewPlanDescription('');
    setIsCreatePlanOpen(true);
  };

  const handleCloseCreatePlan = () => {
    if (isSavingPlan) return;
    setIsCreatePlanOpen(false);
  };

  const handleSavePlan = async () => {
    const email = userData?.email;
    if (!email || !newPlanTitle.trim()) {
      return;
    }

    try {
      setIsSavingPlan(true);
      await savePatientPlan(email, {
        title: newPlanTitle.trim(),
        description: newPlanDescription.trim(),
        type: newPlanType,
      });
      setIsCreatePlanOpen(false);
      await loadPlans(email);
    } catch (error) {
      console.log('Failed to save plan:', error);
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Pulsating animation
  useEffect(() => {
    if (isVoiceAssistantOpen && voiceAssistantScreen === 'listening') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [isVoiceAssistantOpen, voiceAssistantScreen, pulseAnim]);

  const handleOpenVoiceAssistant = () => {
    setIsVoiceAssistantOpen(true);
    setVoiceAssistantScreen('listening');
    setSelectedLogType('');
  };

  const handleCloseVoiceAssistant = () => {
    setIsVoiceAssistantOpen(false);
    setVoiceAssistantScreen('listening');
    setSelectedLogType('');
    pulseAnim.setValue(0);
  };

  const handleListeningComplete = () => {
    setVoiceAssistantScreen('confirmation');
  };

  const renderPlan = (plan: Plan) => (
    <TouchableOpacity
      key={plan.id}
      style={styles.planCard}
      activeOpacity={0.7}
      onPress={() => setSelectedPlan(plan)}
    >
      <View style={[styles.planIconContainer, { backgroundColor: plan.backgroundColor }]}>
        <Ionicons name={plan.icon as any} size={28} color={plan.color} />
      </View>
      <View style={styles.planContent}>
        <Text style={styles.planTitle}>{plan.title}</Text>
        {plan.description ? (
          <Text style={styles.planDescription} numberOfLines={1}>
            {plan.description}
          </Text>
        ) : null}
        <View style={styles.planMetaRow}>
          <View style={[styles.planTypeTag, { backgroundColor: plan.backgroundColor }]}>
            <Text style={[styles.planTypeTagText, { color: plan.color }]}>
              {getPlanVisual(plan.type).title}
            </Text>
          </View>
          {plan.assignedByDoctor ? (
            <View style={styles.doctorTag}>
              <Ionicons name="medkit" size={11} color="#1D4ED8" />
              <Text style={styles.doctorTagText}>From your doctor</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Health Plans</Text>
          <Text style={styles.headerSubtitle}>Manage your personalized health journey</Text>
        </View>

        {/* Create a new plan */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Create a Plan</Text>
          <View style={styles.createTypeRow}>
            {PLAN_TYPE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.createTypeCard}
                onPress={() => handleOpenCreatePlan(option.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.createTypeIcon, { backgroundColor: option.backgroundColor }]}>
                  <Ionicons name={option.icon} size={24} color={option.color} />
                </View>
                <Text style={styles.createTypeLabel}>{option.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Your Plans */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Your Plans</Text>
          {plans.length > 0 ? (
            plans.map(renderPlan)
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <MaterialCommunityIcons name="calendar-check" size={64} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyStateTitle}>No active plans yet</Text>
              <Text style={styles.emptyStateText}>
                Start creating personalized health plans to track your goals
              </Text>
              <TouchableOpacity
                style={styles.createPlanButton}
                onPress={() => handleOpenCreatePlan('meal')}
              >
                <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
                <Text style={styles.createPlanText}>Create Your First Plan</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Professional Guidance Box */}
        <View style={styles.professionalGuidanceBox}>
          <View style={styles.guidanceContent}>
            <Text style={styles.guidanceTitle}>Need personalized guidance?</Text>
            <Text style={styles.guidanceSubtitle}>
              Connect with healthcare professionals who can create custom plans for your health goals.
            </Text>
            <TouchableOpacity 
              style={styles.findProfessionalsButton}
              onPress={() => router.push({ pathname: '/(tabs)/professionals', params: { email: userData?.email } })}
            >
              <Text style={styles.findProfessionalsText}>Find Professionals</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={handleOpenVoiceAssistant}
      >
        <MaterialCommunityIcons name="microphone" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push({ pathname: '/(tabs)/home', params: userData })}>
          <Ionicons name="home-outline" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push({ pathname: '/(tabs)/logs', params: userData })}>
          <Ionicons name="document-text-outline" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Logs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="calendar" size={24} color="#3B82F6" />
          <Text style={[styles.navLabel, { color: '#3B82F6' }]}>Plans</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="chatbubble-outline" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push({ pathname: '/(tabs)/prof', params: userData })}>
          <Ionicons name="person-outline" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Plan Details Modal */}
      <Modal
        visible={selectedPlan !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPlan(null)}
      >
        <View style={styles.createModalOverlay}>
          <View style={styles.createModalContent}>
            <View style={styles.createModalHeader}>
              <Text style={styles.createModalTitle}>Plan Details</Text>
              <TouchableOpacity onPress={() => setSelectedPlan(null)}>
                <Ionicons name="close" size={26} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedPlan ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailHeaderRow}>
                  <View
                    style={[
                      styles.planIconContainer,
                      { backgroundColor: selectedPlan.backgroundColor },
                    ]}
                  >
                    <Ionicons
                      name={selectedPlan.icon as any}
                      size={28}
                      color={selectedPlan.color}
                    />
                  </View>
                  <View style={styles.flexShrink}>
                    <Text style={styles.detailTitle}>{selectedPlan.title}</Text>
                    <Text style={styles.detailType}>
                      {getPlanVisual(selectedPlan.type).title}
                    </Text>
                  </View>
                </View>

                {selectedPlan.assignedByDoctor ? (
                  <View style={styles.detailDoctorBanner}>
                    <Ionicons name="medkit" size={16} color="#1D4ED8" />
                    <Text style={styles.detailDoctorText}>
                      Assigned by your doctor ({selectedPlan.assignedByDoctor})
                    </Text>
                  </View>
                ) : null}

                <Text style={styles.planDetailLabel}>Status</Text>
                <Text style={styles.planDetailValue}>
                  {selectedPlan.status || 'Active'}
                </Text>

                {selectedPlan.startDate ? (
                  <>
                    <Text style={styles.planDetailLabel}>Start Date</Text>
                    <Text style={styles.planDetailValue}>
                      {selectedPlan.startDate}
                    </Text>
                  </>
                ) : null}

                <Text style={styles.planDetailLabel}>Description</Text>
                <Text style={styles.planDetailValue}>
                  {selectedPlan.description || 'No description provided.'}
                </Text>

                {selectedPlan.goals && selectedPlan.goals.length > 0 ? (
                  <>
                    <Text style={styles.planDetailLabel}>Goals</Text>
                    {selectedPlan.goals.map((goal, index) => (
                      <View key={index} style={styles.goalRow}>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#10B981"
                        />
                        <Text style={styles.goalText}>{goal}</Text>
                      </View>
                    ))}
                  </>
                ) : null}

                <TouchableOpacity
                  style={styles.savePlanButton}
                  onPress={() => setSelectedPlan(null)}
                >
                  <Text style={styles.savePlanButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Create Plan Modal */}
      <Modal
        visible={isCreatePlanOpen}
        transparent
        animationType="slide"
        onRequestClose={handleCloseCreatePlan}
      >
        <View style={styles.createModalOverlay}>
          <View style={styles.createModalContent}>
            <View style={styles.createModalHeader}>
              <Text style={styles.createModalTitle}>New Plan</Text>
              <TouchableOpacity onPress={handleCloseCreatePlan}>
                <Ionicons name="close" size={26} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Type</Text>
            <View style={styles.typeChipRow}>
              {PLAN_TYPE_OPTIONS.map((option) => {
                const active = newPlanType === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.typeChip,
                      active && { backgroundColor: option.color, borderColor: option.color },
                    ]}
                    onPress={() => setNewPlanType(option.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                      {option.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.createInput}
              placeholder="e.g. Morning workout routine"
              placeholderTextColor="#9CA3AF"
              value={newPlanTitle}
              onChangeText={setNewPlanTitle}
            />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.createInput, styles.createInputMultiline]}
              placeholder="Describe your goals, schedule, details..."
              placeholderTextColor="#9CA3AF"
              value={newPlanDescription}
              onChangeText={setNewPlanDescription}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.savePlanButton,
                (!newPlanTitle.trim() || isSavingPlan) && styles.savePlanButtonDisabled,
              ]}
              onPress={handleSavePlan}
              disabled={!newPlanTitle.trim() || isSavingPlan}
            >
              <Text style={styles.savePlanButtonText}>
                {isSavingPlan ? 'Saving...' : 'Save Plan'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Voice Assistant Modal */}
      <Modal
        visible={isVoiceAssistantOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseVoiceAssistant}
      >
        <View style={styles.modalOverlay}>
          {voiceAssistantScreen === 'listening' ? (
            // Listening Screen
            <View style={styles.voiceModalContent}>
              <View style={styles.voiceModalHeader}>
                <View>
                  <Text style={styles.voiceModalTitle}>Voice Assistant</Text>
                  <Text style={styles.selectedTypeLabel}>Speak directly. Your log type will be detected automatically.</Text>
                </View>
                <TouchableOpacity onPress={handleCloseVoiceAssistant}>
                  <Ionicons name="close" size={28} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.listeningContainer}>
                <Text style={styles.listeningLabel}>Listening...</Text>
                
                <View style={styles.pulseContainer}>
                  <Animated.View
                    style={[
                      styles.pulseRing,
                      {
                        opacity: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 0.2],
                        }),
                        transform: [
                          {
                            scale: pulseAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.5],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <View style={styles.microphoneCircle}>
                    <MaterialCommunityIcons name="microphone" size={40} color="#FFFFFF" />
                  </View>
                </View>

                <Text style={styles.instructionText}>Speak clearly into your device</Text>
              </View>

              <TouchableOpacity
                style={styles.listeningButton}
                onPress={handleListeningComplete}
              >
                <Text style={styles.listeningButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Confirmation Screen
            <View style={styles.voiceModalContent}>
              <View style={styles.confirmationHeader}>
                <Text style={styles.confirmationTitle}>Confirm your entry</Text>
                <TouchableOpacity onPress={handleCloseVoiceAssistant}>
                  <Ionicons name="close" size={28} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.confirmationDetails}>
                <Text style={styles.detailLabel}>Logged:</Text>
                <Text style={styles.detailValue}>{selectedLogType}</Text>
                <Text style={styles.detailSubtext}>Your entry has been recorded successfully</Text>
              </View>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleCloseVoiceAssistant}
              >
                <Text style={styles.confirmButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  plansSection: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  planIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planContent: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  planMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  planTypeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planTypeTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  doctorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  doctorTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  flexShrink: {
    flexShrink: 1,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  detailType: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  detailDoctorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  detailDoctorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  planDetailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 14,
    marginBottom: 4,
  },
  planDetailValue: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 21,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  goalText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  createTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  createTypeCard: {
    width: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  createTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 1,
  },
  createModalOverlay: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  createModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  createModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 12,
  },
  typeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  typeChipTextActive: {
    color: '#FFFFFF',
  },
  createInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  createInputMultiline: {
    minHeight: 96,
  },
  savePlanButton: {
    marginTop: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  savePlanButtonDisabled: {
    backgroundColor: '#BFDBFE',
  },
  savePlanButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  createPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    gap: 8,
  },
  createPlanText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  professionalGuidanceBox: {
    marginHorizontal: 16,
    marginVertical: 20,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  guidanceContent: {
    alignItems: 'flex-start',
  },
  guidanceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  guidanceSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
    marginBottom: 16,
    opacity: 0.95,
  },
  findProfessionalsButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  findProfessionalsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  bottomSpacer: {
    height: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  navLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '600',
  },
  // Voice Assistant Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  voiceModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  voiceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  voiceModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  selectedTypeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  listeningContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  listeningLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 24,
  },
  pulseContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  microphoneCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  instructionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  listeningButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  listeningButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  confirmationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  confirmationTile: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tileIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  confirmationDetails: {
    alignItems: 'center',
    marginVertical: 32,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  detailSubtext: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
