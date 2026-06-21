import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
  fetchRegisteredProfessionals,
  type RegisteredProfessional,
} from "../../services/api";

const TYPE_LABELS: Record<string, string> = {
  doctor: "Doctor",
  nutritionist: "Nutritionist",
  coach: "Fitness Coach",
};

const CONSULTATION_PRICE: Record<string, number> = {
  doctor: 49,
  nutritionist: 39,
  coach: 29,
};

export default function FindProfessionals() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const selectedTab: string = "professionals";
  const [registered, setRegistered] = useState<RegisteredProfessional[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("user@example.com");

  useEffect(() => {
    setUserEmail(emailParam || "user@example.com");
  }, [emailParam]);

  useEffect(() => {
    const loadProfessionals = async () => {
      try {
        setIsLoading(true);
        const registeredRes = await fetchRegisteredProfessionals();
        setRegistered(registeredRes.professionals);
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Failed to load professionals",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadProfessionals();
  }, []);

  const handleSubscribeToProfessional = (
    professional: RegisteredProfessional,
  ) => {
    router.push({
      pathname: "/payment",
      params: {
        email: userEmail,
        professionalId: professional.id,
        professionalTitle: professional.fullName,
        planName: "Consultation",
        amount: String(CONSULTATION_PRICE[professional.type] ?? 49),
        period: "per month",
      },
    });
  };

  const renderRegisteredCard = (professional: RegisteredProfessional) => (
    <View key={professional.id} style={styles.professionalCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatarBadge}>
          <Text style={styles.cardAvatar}>
            {getProfessionalInitials(professional.fullName)}
          </Text>
        </View>
        <View style={styles.cardHeaderInfo}>
          <Text style={styles.cardTitle}>{professional.fullName}</Text>
          <View style={styles.ratingContainer}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {TYPE_LABELS[professional.type] || professional.type}
              </Text>
            </View>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.rating}>{professional.rating}</Text>
            <Text style={styles.reviewCount}>
              ({professional.reviewCount})
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.cardDescription}>
        {professional.specialty}
        {professional.email ? ` · ${professional.email}` : ""}
      </Text>

      <TouchableOpacity
        style={styles.subscribeButton}
        onPress={() => handleSubscribeToProfessional(professional)}
      >
        <Text style={styles.subscribeButtonText}>
          Subscribe • ${CONSULTATION_PRICE[professional.type] ?? 49}/mo
        </Text>
      </TouchableOpacity>
    </View>
  );

  const getProfessionalInitials = (title: string) => {
    const parts = title.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return title.slice(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Professionals</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Introduction */}
        <View style={styles.introContainer}>
          <Text style={styles.introTitle}>
            Connect with Healthcare Professionals
          </Text>
          <Text style={styles.introSubtitle}>
            Get personalized guidance from certified doctors, nutritionists, and
            fitness coaches
          </Text>
        </View>

        {/* Professional Cards */}
        {isLoading ? (
          <Text style={styles.loadingText}>Loading professionals...</Text>
        ) : registered.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Available Professionals</Text>
            {registered.map((professional) =>
              renderRegisteredCard(professional),
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No professionals yet</Text>
            <Text style={styles.emptyStateText}>
              Healthcare professionals who register will appear here.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/home",
              params: { email: userEmail },
            })
          }
        >
          <Ionicons
            name="home"
            size={24}
            color={selectedTab === "home" ? "#3B82F6" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.navLabel,
              selectedTab === "home" && { color: "#3B82F6" },
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/logs",
              params: { email: userEmail },
            })
          }
        >
          <Ionicons
            name="document-text"
            size={24}
            color={selectedTab === "logs" ? "#3B82F6" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.navLabel,
              selectedTab === "logs" && { color: "#3B82F6" },
            ]}
          >
            Logs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/plans",
              params: { email: userEmail },
            })
          }
        >
          <Ionicons
            name="calendar"
            size={24}
            color={selectedTab === "plans" ? "#3B82F6" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.navLabel,
              selectedTab === "plans" && { color: "#3B82F6" },
            ]}
          >
            Plans
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/messages",
              params: { email: userEmail },
            })
          }
        >
          <Ionicons
            name="chatbubble"
            size={24}
            color={selectedTab === "messages" ? "#3B82F6" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.navLabel,
              selectedTab === "messages" && { color: "#3B82F6" },
            ]}
          >
            Messages
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/prof",
              params: { email: userEmail },
            })
          }
        >
          <Ionicons
            name="person"
            size={24}
            color={selectedTab === "profile" ? "#3B82F6" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.navLabel,
              selectedTab === "profile" && { color: "#3B82F6" },
            ]}
          >
            Profile
          </Text>
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  introContainer: {
    padding: 20,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 16,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0C4A6E",
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 14,
    color: "#0E7490",
    lineHeight: 20,
  },
  loadingText: {
    textAlign: "center",
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginTop: 12,
  },
  emptyStateText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  typeBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  professionalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardAvatar: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  cardAvatarBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  reviewCount: {
    fontSize: 12,
    color: "#6B7280",
  },
  cardDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
  },
  featuresContainer: {
    marginBottom: 20,
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
  },
  plansContainer: {
    marginTop: 12,
  },
  plansTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  planCard: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  planName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  planPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3B82F6",
  },
  planPeriod: {
    fontSize: 12,
    color: "#6B7280",
  },
  planDescription: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 10,
  },
  planFeatures: {
    marginBottom: 12,
  },
  planFeatureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 6,
  },
  planFeatureText: {
    fontSize: 12,
    color: "#374151",
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  subscribeButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
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
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
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
    fontWeight: "500",
  },
});
