import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchUserSubscriptions, getUserByEmail, type UserSubscription } from '../services/api';

type DetailSection = 'personal-information' | 'medical-history' | 'allergies';

type UserProfile = {
  email: string;
  fullName: string;
  age: string;
  height: string;
  weight: string;
  medicalConditions: string[];
  allergies: string[];
  healthGoals: string[];
};

export default function ProfileDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    section?: string;
    email?: string;
    fullName?: string;
    age?: string;
    height?: string;
    weight?: string;
  }>();

  const section = (Array.isArray(params.section) ? params.section[0] : params.section) as DetailSection | undefined;
  const userEmail = Array.isArray(params.email) ? params.email[0] : params.email;
  const displayEmail = userEmail || 'user@example.com';

  const [isLoading, setIsLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    email: displayEmail,
    fullName: Array.isArray(params.fullName) ? params.fullName[0] : params.fullName || 'User Name',
    age: Array.isArray(params.age) ? params.age[0] : params.age || 'Not set',
    height: Array.isArray(params.height) ? params.height[0] : params.height || 'Not set',
    weight: Array.isArray(params.weight) ? params.weight[0] : params.weight || 'Not set',
    medicalConditions: [],
    allergies: [],
    healthGoals: [],
  });

  

  useEffect(() => {
    if (!userEmail) {
      return;
    }

    let active = true;
    setIsLoading(true);

    getUserByEmail(userEmail)
      .then((response) => {
        if (!active) return;

        const profile = (response.user.profile || {}) as Record<string, any>;
        setUserProfile((prev) => ({
          ...prev,
          email: response.user.email || prev.email,
          fullName: profile.fullName || prev.fullName,
          age: profile.age || prev.age,
          height: profile.height || prev.height,
          weight: profile.weight || prev.weight,
          medicalConditions: Array.isArray(profile.medicalConditions) ? profile.medicalConditions : prev.medicalConditions,
          allergies: Array.isArray(profile.allergies) ? profile.allergies : prev.allergies,
          healthGoals: Array.isArray(profile.healthGoals) ? profile.healthGoals : prev.healthGoals,
        }));
      })
      .catch((error) => {
        console.log('Failed to load profile details:', error);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) {
      return;
    }

    let active = true;

    fetchUserSubscriptions(userEmail)
      .then((response) => {
        if (!active) return;
        const all = Array.isArray(response.subscriptions)
          ? response.subscriptions
          : [];
        // Keep only one entry per professional (guards against legacy duplicates).
        const seen = new Set<string>();
        const unique = all.filter((sub) => {
          const key = String(sub.professionalId || sub.id || sub.professionalTitle);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setSubscriptions(unique);
      })
      .catch((error) => {
        console.log('Failed to load subscriptions:', error);
      });

    return () => {
      active = false;
    };
  }, [userEmail]);

  

  const titleMap: Record<DetailSection, string> = {
    'personal-information': 'Personal Information',
    'medical-history': 'Medical History',
    allergies: 'Allergies & Intolerances',
  };

  const screenTitle = section && titleMap[section] ? titleMap[section] : 'Profile Details';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{screenTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryName}>{userProfile.fullName}</Text>
            <Text style={styles.summaryEmail}>{isLoading ? 'Loading profile...' : userProfile.email}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>My Healthcare Team</Text>
          {subscriptions.length > 0 ? (
            subscriptions.map((subscription) => {
              const doctorName = subscription.selectedDoctorName || subscription.professionalTitle || 'Healthcare Professional';
              const initials = doctorName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase();

              return (
                <View key={subscription.id} style={styles.teamRow}>
                  <View style={styles.teamAvatar}>
                    <Text style={styles.teamAvatarText}>{initials || 'DR'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teamName}>{doctorName}</Text>
                    <Text style={styles.teamMeta}>
                      {subscription.planName}
                      {subscription.period ? ` • ${subscription.period}` : ''}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View>
              <Text style={styles.emptyText}>
                You do not have an active subscription yet. Subscribe to a professional to see your care team here.
              </Text>
              <TouchableOpacity
                style={styles.subscribeButton}
                onPress={() => router.push({ pathname: '/(tabs)/professionals', params: { email: userEmail } })}
              >
                <Text style={styles.subscribeButtonText}>Browse Professionals</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        

        {section === 'medical-history' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Medical History</Text>
            {userProfile.medicalConditions.length > 0 ? (
              userProfile.medicalConditions.map((item) => (
                <View key={item} style={styles.tagRow}>
                  <Ionicons name="heart" size={16} color="#EC4899" />
                  <Text style={styles.tagText}>{item}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No medical history saved yet.</Text>
            )}
          </View>
        ) : section === 'allergies' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Allergies & Intolerances</Text>
            {userProfile.allergies.length > 0 ? (
              userProfile.allergies.map((item) => (
                <View key={item} style={styles.tagRow}>
                  <Ionicons name="warning" size={16} color="#EF4444" />
                  <Text style={styles.tagText}>{item}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No allergies saved yet.</Text>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal Information</Text>
            <InfoRow label="Full Name" value={userProfile.fullName} />
            <InfoRow label="Email" value={userProfile.email} />
            <InfoRow label="Age" value={userProfile.age} />
            <InfoRow label="Height" value={userProfile.height} />
            <InfoRow label="Weight" value={userProfile.weight} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'Not set'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  summaryEmail: {
    fontSize: 13,
    color: '#3B82F6',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  tagText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    paddingVertical: 8,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  teamAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  teamName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  teamMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  subscribeButton: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  
});