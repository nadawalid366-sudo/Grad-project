import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Plan {
  id: string;
  type: 'meal' | 'exercise' | 'medication';
  title: string;
  description: string;
  icon: string;
  color: string;
  backgroundColor: string;
  completed?: number;
  total?: number;
}

export default function HealthPlans() {
  const route = useRoute();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [voiceAssistantScreen, setVoiceAssistantScreen] = useState<'listening' | 'confirmation'>('listening');
  const [selectedLogType, setSelectedLogType] = useState<string>('');
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Extract user data from route params
  useEffect(() => {
    const params = route.params as any;
    if (params) {
      setUserData({
        fullName: params?.fullName || 'User Name',
        age: params?.age || '',
        height: params?.height || '',
        weight: params?.weight || '',
        email: params?.email || 'user@example.com'
      });
    }
  }, [route.params]);

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

  const plans: Plan[] = [
    // Empty initially - users can create their own plans
  ];

  const planCategories = [
    {
      id: 'meal',
      title: 'Meal Plans',
      icon: 'restaurant',
      color: '#F59E0B',
      backgroundColor: '#FEF3C7',
      description: 'No meal plans yet',
    },
    {
      id: 'exercise',
      title: 'Exercise Plans',
      icon: 'fitness',
      color: '#3B82F6',
      backgroundColor: '#DBEAFE',
      description: 'No exercise plans yet',
    },
    {
      id: 'medication',
      title: 'Medication Schedule',
      icon: 'medical',
      color: '#EC4899',
      backgroundColor: '#FCE7F3',
      description: 'No medication schedules yet',
    },
  ];

  const renderPlanCategory = (category: any) => (
    <TouchableOpacity key={category.id} style={styles.planCard}>
      <View style={[styles.planIconContainer, { backgroundColor: category.backgroundColor }]}>
        <Ionicons name={category.icon} size={28} color={category.color} />
      </View>
      <View style={styles.planContent}>
        <Text style={styles.planTitle}>{category.title}</Text>
        <Text style={styles.planDescription}>{category.description}</Text>
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

        {/* Plan Categories */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Your Plans</Text>
          {planCategories.map(renderPlanCategory)}
        </View>

        {/* Empty State */}
        {plans.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons name="calendar-check" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyStateTitle}>No active plans yet</Text>
            <Text style={styles.emptyStateText}>
              Start creating personalized health plans to track your goals
            </Text>
            <TouchableOpacity style={styles.createPlanButton}>
              <Ionicons name="add-circle-outline" size={20} color="#3B82F6" />
              <Text style={styles.createPlanText}>Create Your First Plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Professional Guidance Box */}
        <View style={styles.professionalGuidanceBox}>
          <View style={styles.guidanceContent}>
            <Text style={styles.guidanceTitle}>Need personalized guidance?</Text>
            <Text style={styles.guidanceSubtitle}>
              Connect with healthcare professionals who can create custom plans for your health goals.
            </Text>
            <TouchableOpacity 
              style={styles.findProfessionalsButton}
              onPress={() => router.push('/(tabs)/professionals')}
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
