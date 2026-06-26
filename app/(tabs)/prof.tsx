import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { cancelSubscription, fetchUserSubscriptions, getUserByEmail, type UserSubscription } from "../../services/api";
import { getUser, signOut } from "../../services/auth";

type ProfileDetailsSection =
  | "personal-information"
  | "medical-history"
  | "allergies";
type SettingsSection =
  | "notifications"
  | "language-region"
  | "privacy-security"
  | "help-support";

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

  const getParamValue = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;
  const userEmail = getParamValue(params.email) || getUser()?.email || "";
  const displayEmail = userEmail;

  const [userData, setUserData] = useState<UserInfo>(() => ({
    fullName: getParamValue(params.fullName) || "User Name",
    email: displayEmail,
    age: getParamValue(params.age) || "Not set",
    height: getParamValue(params.height) || "Not set",
    weight: getParamValue(params.weight) || "Not set",
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
          medicalConditions: Array.isArray(profile.medicalConditions)
            ? profile.medicalConditions
            : prev.medicalConditions,
          allergies: Array.isArray(profile.allergies)
            ? profile.allergies
            : prev.allergies,
          healthGoals: Array.isArray(profile.healthGoals)
            ? profile.healthGoals
            : prev.healthGoals,
        }));
      })
      .catch((error) => {
        console.log("Failed to load profile:", error);
      })
      .finally(() => {
        if (active) {
          setIsLoadingProfile(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    params.age,
    params.email,
    params.fullName,
    params.height,
    params.weight,
    displayEmail,
    userEmail,
  ]);

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);

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
        console.log("Failed to load subscriptions:", error);
      });

    return () => {
      active = false;
    };
  }, [userEmail]);

  const healthcareTeam = subscriptions.map((sub) => ({
    id: sub.id,
    name: sub.selectedDoctorName || sub.professionalTitle || "Healthcare Professional",
    specialty: sub.planName,
    since: sub.period || "",
  }));

  const handleUnsubscribe = (subscriptionId: string, name: string) => {
    Alert.alert(
      "Remove Subscription",
      `Remove ${name} from your healthcare team?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelSubscription(subscriptionId);
              setSubscriptions((prev) => prev.filter((s) => s.id !== subscriptionId));
            } catch {
              Alert.alert("Error", "Failed to remove subscription. Please try again.");
            }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const performLogout = async () => {
    setShowLogoutModal(false);
    await signOut();
    router.replace("/(tabs)/splash");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: () => {
            console.log("Account deleted");
          },
          style: "destructive",
        },
      ],
    );
  };

  const SettingsItem = ({
    icon,
    title,
    iconColor,
    iconBg,
    onPress,
    showChevron = true,
  }: {
    icon: string;
    title: string;
    iconColor: string;
    iconBg: string;
    onPress?: () => void;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      <View style={styles.settingsItemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={20} color={iconColor} />
        </View>
        <Text style={styles.settingsItemText}>{title}</Text>
      </View>
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  const DataPrivacyItem = ({
    title,
    onPress,
  }: {
    title: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity style={styles.dataPrivacyItem} onPress={onPress}>
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
    <TouchableOpacity style={styles.profileDetailsItem} onPress={onPress}>
      <View style={styles.profileDetailsLeft}>
        <View
          style={[styles.profileIconContainer, { backgroundColor: iconBg }]}
        >
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
      pathname: "/profile-detail" as any,
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
      pathname: "/settings-detail" as any,
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
              <Text style={styles.profileEmail}>
                {isLoadingProfile ? "Loading profile..." : userData.email}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/profile",
                  params: { email: displayEmail },
                })
              }
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
            onPress={() => openProfileDetail("personal-information")}
          />

          <ProfileDetailsItem
            icon="heart-outline"
            title="Medical History"
            iconColor="#EC4899"
            iconBg="#FCE7F3"
            onPress={() => openProfileDetail("medical-history")}
          />

          <ProfileDetailsItem
            icon="alert-circle-outline"
            title="Allergies & Intolerances"
            iconColor="#EF4444"
            iconBg="#FEE2E2"
            onPress={() => openProfileDetail("allergies")}
          />

          <TouchableOpacity
            style={styles.profileDetailsItem}
            onPress={() => toggleSection("healthcare")}
          >
            <View style={styles.profileDetailsLeft}>
              <View
                style={[
                  styles.profileIconContainer,
                  { backgroundColor: "#D1FAE5" },
                ]}
              >
                <Ionicons name="people-outline" size={18} color="#10B981" />
              </View>
              <Text style={styles.profileDetailsText}>My Healthcare Team</Text>
            </View>
            <Ionicons
              name={
                expandedSection === "healthcare"
                  ? "chevron-down"
                  : "chevron-forward"
              }
              size={18}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {expandedSection === "healthcare" && (
            <View style={styles.healthcareTeamList}>
              {healthcareTeam.length === 0 && (
                <Text style={styles.memberSpecialty}>
                  No professionals added yet.
                </Text>
              )}
              {healthcareTeam.map((member) => (
                <View key={member.id} style={styles.teamMemberCard}>
                  <View style={styles.memberIconContainer}>
                    <Ionicons name="person-circle" size={32} color="#F59E0B" />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberSpecialty}>
                      {member.specialty}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.memberSince}>{member.since}</Text>
                    <TouchableOpacity
                      onPress={() => handleUnsubscribe(member.id, member.name)}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addProfessionalButton}
                onPress={() =>
                  router.push({
                    pathname: "/doctors" as any,
                    params: { email: displayEmail },
                  })
                }
              >
                <Text style={styles.addProfessionalText}>
                  + Add Professional
                </Text>
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
            onPress={() => openSettingsDetail("notifications")}
          />
          <SettingsItem
            icon="globe-outline"
            title="Language & Region"
            iconColor="#3B82F6"
            iconBg="#DBEAFE"
            onPress={() => openSettingsDetail("language-region")}
          />
          <SettingsItem
            icon="shield-checkmark-outline"
            title="Privacy & Security"
            iconColor="#EC4899"
            iconBg="#FCE7F3"
            onPress={() => openSettingsDetail("privacy-security")}
          />
          <SettingsItem
            icon="help-circle-outline"
            title="Help & Support"
            iconColor="#10B981"
            iconBg="#D1FAE5"
            onPress={() => openSettingsDetail("help-support")}
          />
        </View>

        {/* Data & Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>
          <View style={styles.dataPrivacyContainer}>
            <DataPrivacyItem
              title="Download My Data"
              onPress={() => console.log("Download My Data pressed")}
            />
            <DataPrivacyItem
              title="Data Sharing Preferences"
              onPress={() => console.log("Data Sharing Preferences pressed")}
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
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#FFFFFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      {/* Logout confirmation */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutModalCard}>
            <MaterialCommunityIcons name="logout" size={36} color="#EF4444" />
            <Text style={styles.logoutModalTitle}>Log out?</Text>
            <Text style={styles.logoutModalText}>
              You&apos;ll need to sign in again to access your account.
            </Text>
            <TouchableOpacity
              style={styles.logoutConfirmButton}
              onPress={performLogout}
            >
              <Text style={styles.logoutConfirmText}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowLogoutModal(false)}>
              <Text style={styles.logoutCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Light slate-blue
  },
  scrollContent: {
    paddingBottom: 100,
  },
  logoutOverlay: {
    flex: 1,
    backgroundColor: "#00000080",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logoutModalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  logoutModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 12,
    marginBottom: 8,
  },
  logoutModalText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  logoutConfirmButton: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  logoutConfirmText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  logoutCancelText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 4,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: "#2563EB",
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#2563EB",
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  profileStats: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 16,
  },
  statItem: {
    paddingRight: 12,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  profileDetailsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  profileDetailsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  profileDetailsLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  profileDetailsText: {
    fontSize: 15,
    color: "#111827",
  },
  healthcareTeamList: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
  },
  teamMemberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
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
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  memberSpecialty: {
    fontSize: 12,
    color: "#6B7280",
  },
  memberSince: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  removeText: {
    fontSize: 11,
    color: "#EF4444",
    fontWeight: "600",
    marginTop: 4,
  },
  addProfessionalButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2563EB",
    borderStyle: "dashed",
    alignItems: "center",
    marginTop: 4,
  },
  addProfessionalText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  settingsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    marginTop: 8,
  },
  settingsHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginVertical: 8,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingsItemText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  dataPrivacyContainer: {
    paddingHorizontal: 20,
  },
  dataPrivacyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dataPrivacyText: {
    fontSize: 15,
    color: "#111827",
  },
  versionSection: {
    backgroundColor: "#FFFFFF",
    marginVertical: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  versionLabel: {
    fontSize: 15,
    color: "#6B7280",
  },
  versionValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bottomSpacer: {
    height: 100, // Extra padding for global CustomTabBar
  },
});
