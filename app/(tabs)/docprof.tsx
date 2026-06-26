import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { fetchDoctorDashboard } from "../../services/api";
import { getUser, signOut } from "../../services/auth";

const TYPE_LABELS: Record<string, string> = {
  doctor: "Doctor",
  nutritionist: "Nutritionist",
  coach: "Fitness Coach",
};

export default function DoctorProfile() {
  const { doctorName: doctorNameParam, email: emailParam } =
    useLocalSearchParams<{ doctorName?: string; email?: string }>();
  const router = useRouter();

  const [doctorName, setDoctorName] = useState("Doctor");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [specialty, setSpecialty] = useState("General Practitioner");
  const [type, setType] = useState("doctor");
  const [rating, setRating] = useState<number | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    setDoctorName(doctorNameParam || "Doctor");
    setDoctorEmail(emailParam || getUser()?.email || "");
  }, [doctorNameParam, emailParam]);

  useEffect(() => {
    let active = true;
    fetchDoctorDashboard(doctorEmail)
      .then((response) => {
        if (!active) return;
        const doctor = (response.doctor || {}) as Record<string, any>;
        if (doctor.doctorName || doctor.fullName) {
          setDoctorName(String(doctor.doctorName || doctor.fullName));
        }
        if (doctor.specialty) setSpecialty(String(doctor.specialty));
        if (doctor.type) setType(String(doctor.type));
        if (typeof doctor.rating === "number") setRating(doctor.rating);
      })
      .catch((error) => console.log("Failed to load doctor profile:", error));

    return () => {
      active = false;
    };
  }, [doctorEmail]);

  const getInitials = (name: string) => {
    const clean = name.replace(/^dr\.?\s+/i, "").trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const performLogout = async () => {
    setShowLogoutModal(false);
    await signOut();
    router.replace("/(tabs)/splash");
  };

  const goDoctor = (pathname: string) =>
    router.push({ pathname: pathname as any, params: { doctorName, email: doctorEmail } });

  const InfoRow = ({
    icon,
    label,
    value,
  }: {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
    value: string;
  }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <MaterialCommunityIcons name={icon} size={20} color="#3B82F6" />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile header card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(doctorName)}</Text>
          </View>
          <Text style={styles.name}>Dr. {doctorName}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {TYPE_LABELS[type] || type}
            </Text>
          </View>
          {rating !== null && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.card}>
            <InfoRow icon="email-outline" label="Email" value={doctorEmail} />
            <View style={styles.divider} />
            <InfoRow
              icon="medical-bag"
              label="Specialty"
              value={specialty}
            />
            <View style={styles.divider} />
            <InfoRow
              icon="account-tie"
              label="Role"
              value={TYPE_LABELS[type] || type}
            />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#FFFFFF" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => goDoctor("/(tabs)/dochome")}
        >
          <Ionicons name="grid" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => goDoctor("/(tabs)/patients")}
        >
          <Ionicons name="people" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>My Patients</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => goDoctor("/(tabs)/alerts")}
        >
          <Ionicons name="alert-circle" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => goDoctor("/(tabs)/docplans")}
        >
          <Ionicons name="clipboard" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Plans</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => goDoctor("/(tabs)/analytics")}
        >
          <Ionicons name="bar-chart" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Analytics</Text>
        </TouchableOpacity>
      </View>

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
              You&apos;ll need to sign in again to access your portal.
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
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EF4444",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 15,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
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
    paddingTop: 8,
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
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
    fontWeight: "600",
  },
});
