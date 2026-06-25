import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    SafeAreaView,
    TextInput
} from "react-native";
import { fetchDoctorDashboard } from "../../services/api";
import { useBlockBack } from "../../hooks/use-block-back";

export default function DoctorDashboard() {
  const { doctorName: doctorNameParam, email: emailParam } = useLocalSearchParams<{ doctorName?: string; email?: string }>();
  const router = useRouter();
  useBlockBack();
  const [doctorName, setDoctorName] = useState("Doctor");
  const [doctorEmail, setDoctorEmail] = useState("doctor@example.com");
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setDoctorName(doctorNameParam || "Doctor");
    setDoctorEmail(emailParam || "doctor@example.com");
  }, [doctorNameParam, emailParam]);

  useEffect(() => {
    let active = true;
    
    // Add small delay to ensure doctor record is committed
    const loadTimer = setTimeout(() => {
      fetchDoctorDashboard(doctorEmail)
        .then((response) => {
          if (!active) return;
          setDashboardData(response);
          if (response.doctor?.doctorName) {
            setDoctorName(String(response.doctor.doctorName));
          }
        })
        .catch(console.error);
    }, 500);
    
    return () => { 
      active = false;
      clearTimeout(loadTimer);
    };
  }, [doctorEmail]);

  const patients = dashboardData?.patients || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, Dr. {doctorName}</Text>
            <Text style={styles.subtitle}>Here is your patients overview</Text>
          </View>
          <View style={styles.headerAvatar}>
            <MaterialCommunityIcons name="stethoscope" size={24} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Patients</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.patientsList}>
          {patients.length > 0 ? (
            patients.map((patient: any, index: number) => (
              <TouchableOpacity 
                key={patient.id || index} 
                style={styles.patientCard}
                onPress={() => router.push({ pathname: '/(tabs)/patients', params: { patientId: patient.id } })}
              >
                <View style={styles.patientInfo}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{patient.fullName ? patient.fullName.charAt(0) : '?'}</Text>
                  </View>
                  <View>
                    <Text style={styles.patientName}>{patient.fullName || 'Unknown'}</Text>
                    <Text style={styles.patientStatus}>{patient.status || 'Stable'}</Text>
                  </View>
                </View>
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreText}>{patient.healthScore || '0.0'}</Text>
                  <MaterialCommunityIcons name="heart-pulse" size={16} color="#2563EB" />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Text style={{ color: '#6B7280' }}>No patients assigned yet.</Text>
            </View>
          )}
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Light slate-blue
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2563EB", // Primary Blue
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#0F172A",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  patientsList: {
    gap: 16,
  },
  patientCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  patientInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0F2FE", // Soft blue
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  patientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  patientStatus: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
});
