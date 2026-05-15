import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getUserByEmail } from '../../services/api';

type ProfileDetailsSection = 'personal-information' | 'medical-history' | 'allergies';
type SettingsSection = 'notifications' | 'language-region' | 'privacy-security' | 'help-support';

type UserInfo = {
  fullName: string;
  email: string;
  age: string;
  height: string;
  weight: string;
  medicalConditions: string[];
  allergies: string[];
  healthGoals: string[];
};

export default function ProfileSettings() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    fullName?: string;
    age?: string;
    height?: string;
    weight?: string;
  }>();

  const getParamValue = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);
  const userEmail = getParamValue(params.email);
  const displayEmail = userEmail || 'user@example.com';

  const [userData, setUserData] = useState<UserInfo>(() => ({
    fullName: getParamValue(params.fullName) || 'User Name',
    email: displayEmail,
    age: getParamValue(params.age) || 'Not set',
    height: getParamValue(params.height) || 'Not set',
    weight: getParamValue(params.weight) || 'Not set',
    medicalConditions: [],
    allergies: [],
    healthGoals: [],
  }));
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    let active = true;

    setUserData((prev) => ({
      ...prev,
      fullName: getParamValue(params.fullName) || prev.fullName,
      email: displayEmail,
      age: getParamValue(params.age) || prev.age,
      height: getParamValue(params.height) || prev.height,
      weight: getParamValue(params.weight) || prev.weight,
    }));

    if (!userEmail) {
      return () => {
        active = false;
      };
    }

    setIsLoadingProfile(true);
    getUserByEmail(userEmail)
      .then((response) => {
        if (!active) return;

        const profile = (response.user.profile || {}) as Record<string, any>;
        setUserData((prev) => ({
          ...prev,
          fullName: profile.fullName || prev.fullName,
          email: response.user.email || prev.email,
          age: profile.age || prev.age,
          height: profile.height || prev.height,
          weight: profile.weight || prev.weight,
          medicalConditions: Array.isArray(profile.medicalConditions) ? profile.medicalConditions : prev.medicalConditions,
          allergies: Array.isArray(profile.allergies) ? profile.allergies : prev.allergies,
          healthGoals: Array.isArray(profile.healthGoals) ? profile.healthGoals : prev.healthGoals,
        }));
      })
      .catch((error) => {
        console.log('Failed to load profile:', error);
      })
      .finally(() => {
        if (active) {
          setIsLoadingProfile(false);
        }
      });

    return () => {
      active = false;
    };
  }, [params.age, params.email, params.fullName, params.height, params.weight, userEmail]);

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const healthcareTeam = [
    {
      id: 1,
      name: 'Dr. Ahmed Hassan',
      specialty: 'Cardiologist',
      since: 'Since Jan 2024',
    },
    {
      id: 2,
      name: 'Dr. Sarah Ahmed',
      specialty: 'Nutritionist',
      since: 'Since Feb 2024',
    },
    {
      id: 3,
      name: 'Coach Mohamed Ali',
      specialty: 'Fitness Coach',
      since: 'Since Mar 2024',
    },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: () => {
            // Handle logout logic here
            console.log('User logged out');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => {
            console.log('Account deleted');
          },
          style: 'destructive',
        },
      ]
    );
  };

  const SettingsItem = ({ 
    icon, 
    title, 
    iconColor, 
    iconBg, 
    onPress,
    showChevron = true 
  }: { 
    icon: string; 
    title: string; 
    iconColor: string; 
    iconBg: string;
    onPress?: () => void;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.settingsItem}
      onPress={onPress}
    >
      <View style={styles.settingsItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={20} color={iconColor} />
        </View>
        <Text style={styles.settingsItemText}>{title}</Text>
      </View>
      {showChevron && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
    </TouchableOpacity>
  );

  const DataPrivacyItem = ({ title, onPress }: { title: string; onPress?: () => void }) => (
    <TouchableOpacity 
      style={styles.dataPrivacyItem}
      onPress={onPress}
    >
      <Text style={styles.dataPrivacyText}>{title}</Text>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const ProfileDetailsItem = ({ 
    icon, 
    title, 
    iconColor, 
    iconBg, 
    onPress,
    isExpanded = false,
  }: { 
    icon: string; 
    title: string; 
    iconColor: string; 
    iconBg: string;
    onPress?: () => void;
    isExpanded?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.profileDetailsItem}
      onPress={onPress}
    >
      <View style={styles.profileDetailsLeft}>
        <View style={[styles.profileIconContainer, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <Text style={styles.profileDetailsText}>{title}</Text>
      </View>
      <Ionicons 
        name={isExpanded ? "chevron-down" : "chevron-forward"} 
        size={18} 
        color="#9CA3AF" 
      />
    </TouchableOpacity>
  );

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const openProfileDetail = (section: ProfileDetailsSection) => {
    router.push({
      pathname: '/profile-detail' as any,
      params: {
        section,
        email: userData.email,
        fullName: userData.fullName,
        age: userData.age,
        height: userData.height,
        weight: userData.weight,
      },
    });
  };

  const openSettingsDetail = (section: SettingsSection) => {
    router.push({
      pathname: '/settings-detail' as any,
      params: {
        section,
        email: userData.email,
        fullName: userData.fullName,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={32} color="#3B82F6" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userData.fullName}</Text>
              <Text style={styles.profileEmail}>{isLoadingProfile ? 'Loading profile...' : userData.email}</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push({ pathname: '/(tabs)/profile', params: { email: displayEmail } })}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Age: {userData.age}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Height: {userData.height}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Weight: {userData.weight}</Text>
            </View>
          </View>
        </View>

        {/* Profile Details Section */}
        <View style={styles.section}>
          <Text style={styles.profileDetailsTitle}>Profile Details</Text>
          
          <ProfileDetailsItem
            icon="person-outline"
            title="Personal Information"
            iconColor="#3B82F6"
            iconBg="#DBEAFE"
            onPress={() => openProfileDetail('personal-information')}
          />
          
          <ProfileDetailsItem
            icon="heart-outline"
            title="Medical History"
            iconColor="#EC4899"
            iconBg="#FCE7F3"
            onPress={() => openProfileDetail('medical-history')}
          />
          
          <ProfileDetailsItem
            icon="alert-circle-outline"
            title="Allergies & Intolerances"
            iconColor="#EF4444"
            iconBg="#FEE2E2"
            onPress={() => openProfileDetail('allergies')}
          />
          
          <TouchableOpacity 
            style={styles.profileDetailsItem}
            onPress={() => toggleSection('healthcare')}
          >
            <View style={styles.profileDetailsLeft}>
              <View style={[styles.profileIconContainer, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="people-outline" size={18} color="#10B981" />
              </View>
              <Text style={styles.profileDetailsText}>My Healthcare Team</Text>
            </View>
            <Ionicons 
              name={expandedSection === 'healthcare' ? "chevron-down" : "chevron-forward"} 
              size={18} 
              color="#9CA3AF" 
            />
          </TouchableOpacity>

          {expandedSection === 'healthcare' && (
            <View style={styles.healthcareTeamList}>
              {healthcareTeam.map((member) => (
                <View key={member.id} style={styles.teamMemberCard}>
                  <View style={styles.memberIconContainer}>
                    <Ionicons name="person-circle" size={32} color="#F59E0B" />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberSpecialty}>{member.specialty}</Text>
                  </View>
                  <Text style={styles.memberSince}>{member.since}</Text>
                </View>
              ))}
              
              <TouchableOpacity style={styles.addProfessionalButton}>
                <Text style={styles.addProfessionalText}>+ Add Professional</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Settings Header */}
        <View style={styles.settingsHeader}>
          <Text style={styles.settingsHeaderTitle}>Settings</Text>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <SettingsItem
            icon="notifications-outline"
            title="Notifications"
            iconColor="#F59E0B"
            iconBg="#FEF3C7"
            onPress={() => openSettingsDetail('notifications')}
          />
          <SettingsItem
            icon="globe-outline"
            title="Language & Region"
            iconColor="#3B82F6"
            iconBg="#DBEAFE"
            onPress={() => openSettingsDetail('language-region')}
          />
          <SettingsItem
            icon="shield-checkmark-outline"
            title="Privacy & Security"
            iconColor="#EC4899"
            iconBg="#FCE7F3"
            onPress={() => openSettingsDetail('privacy-security')}
          />
          <SettingsItem
            icon="help-circle-outline"
            title="Help & Support"
            iconColor="#10B981"
            iconBg="#D1FAE5"
            onPress={() => openSettingsDetail('help-support')}
          />
        </View>

        {/* Data & Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          <View style={styles.dataPrivacyContainer}>
            <DataPrivacyItem 
              title="Download My Data"
              onPress={() => console.log('Download My Data pressed')}
            />
            <DataPrivacyItem 
              title="Data Sharing Preferences"
              onPress={() => console.log('Data Sharing Preferences pressed')}
            />
            <DataPrivacyItem 
              title="Delete Account"
              onPress={handleDeleteAccount}
            />
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.versionSection}>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Version</Text>
            <Text style={styles.versionValue}>1.0.0</Text>
          </View>
          <TouchableOpacity style={styles.versionRow}>
            <Text style={styles.versionLabel}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.versionRow}>
            <Text style={styles.versionLabel}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={20} color="#FFFFFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

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
        <TouchableOpacity style={styles.navItem} onPress={() => router.push({ pathname: '/(tabs)/plans', params: userData })}>
          <Ionicons name="calendar-outline" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Plans</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="chatbubble-outline" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={24} color="#3B82F6" />
          <Text style={[styles.navLabel, { color: '#3B82F6' }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: '#3B82F6',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
  },
  statItem: {
    paddingRight: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  profileDetailsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  profileDetailsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  profileDetailsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileDetailsText: {
    fontSize: 15,
    color: '#111827',
  },
  healthcareTeamList: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  teamMemberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  memberIconContainer: {
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  memberSpecialty: {
    fontSize: 12,
    color: '#6B7280',
  },
  memberSince: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  addProfessionalButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 4,
  },
  addProfessionalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  settingsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  settingsHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingsItemText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  dataPrivacyContainer: {
    paddingHorizontal: 20,
  },
  dataPrivacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dataPrivacyText: {
    fontSize: 15,
    color: '#111827',
  },
  versionSection: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  versionLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  versionValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 20,
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
});
