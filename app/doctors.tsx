import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    fetchRegisteredProfessionals,
    saveUserSubscription,
    type RegisteredProfessional,
} from "../services/api";

// Default plan per type — used when doctor.price is null (paid, type-based pricing).
const PLAN_BY_TYPE: Record<string, { name: string; price: number; period: string }> = {
  doctor:       { name: "Monthly Consultation", price: 49, period: "/ month" },
  nutritionist: { name: "Nutrition Plan",       price: 39, period: "/ month" },
  coach:        { name: "Coaching Program",     price: 29, period: "/ month" },
};

const TYPE_META: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  doctor:       { label: "Doctor",       bg: "#DBEAFE", color: "#2563EB", icon: "stethoscope" },
  nutritionist: { label: "Nutritionist", bg: "#D1FAE5", color: "#059669", icon: "food-apple" },
  coach:        { label: "Coach",        bg: "#FEF3C7", color: "#D97706", icon: "run-fast" },
};

// price === 0  → free (direct access, no payment)
// price > 0    → paid at that specific price
// price === null → paid at the type-based default from PLAN_BY_TYPE
function resolvePrice(doctor: RegisteredProfessional): number {
  if (typeof doctor.price === "number") return doctor.price;
  const type = doctor.type ?? "doctor";
  return PLAN_BY_TYPE[type]?.price ?? 49;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialCommunityIcons
          key={i}
          name={i <= full ? "star" : "star-outline"}
          size={14}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

function DoctorCard({
  doctor,
  isFree,
  effectivePrice,
  isProcessing,
  isSubscribed,
  onFreeAccess,
  onPaidSubscribe,
  onViewProfile,
}: {
  doctor: RegisteredProfessional;
  isFree: boolean;
  effectivePrice: number;
  isProcessing: boolean;
  isSubscribed: boolean;
  onFreeAccess: (d: RegisteredProfessional) => void;
  onPaidSubscribe: (d: RegisteredProfessional) => void;
  onViewProfile: (d: RegisteredProfessional) => void;
}) {
  const type = doctor.type ?? "doctor";
  const plan = PLAN_BY_TYPE[type] ?? PLAN_BY_TYPE.doctor;
  const meta = TYPE_META[type] ?? TYPE_META.doctor;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{getInitials(doctor.fullName)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardHeadline}>
            <Text style={styles.doctorName}>{doctor.fullName}</Text>
            <View style={[styles.statusBadge, isFree ? styles.freeBadge : styles.paidBadge]}>
              <Text style={[styles.statusBadgeText, isFree ? styles.freeBadgeText : styles.paidBadgeText]}>
                {isFree ? "Free" : "Paid"}
              </Text>
            </View>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}> 
            <MaterialCommunityIcons name={meta.icon as any} size={12} color={meta.color} />
            <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.specialty}>{doctor.specialty}</Text>

      {doctor.bio ? (
        <Text style={styles.bio} numberOfLines={2}>{doctor.bio}</Text>
      ) : null}

      <View style={styles.ratingRow}>
        <StarRating rating={doctor.rating} />
        <Text style={styles.ratingText}>
          {Number(doctor.rating).toFixed(1)} <Text style={styles.reviewCount}>({doctor.reviewCount} reviews)</Text>
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <View>
          {isFree ? (
            <>
              <Text style={styles.freeLabel}>Free</Text>
              <Text style={styles.planName}>Free Consultation</Text>
            </>
          ) : (
            <>
              <Text style={styles.price}>
                ${effectivePrice}
                <Text style={styles.period}> {plan.period}</Text>
              </Text>
              <Text style={styles.planName}>{plan.name}</Text>
            </>
          )}
        </View>

        <View style={styles.cardActions}>
          <Pressable
            style={({ pressed }) => [styles.viewButton, pressed && styles.buttonPressed]}
            onPress={() => onViewProfile(doctor)}
            android_ripple={{ color: "#DBEAFE" }}
          >
            <Text style={styles.viewButtonText}>View profile</Text>
          </Pressable>

          {isSubscribed ? (
            <View style={styles.subscribedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.subscribedText}>Subscribed</Text>
            </View>
          ) : isFree ? (
            <Pressable
              style={({ pressed }) => [styles.freeButton, pressed && styles.buttonPressed, isProcessing && styles.buttonDisabled]}
              onPress={() => onFreeAccess(doctor)}
              disabled={isProcessing}
              android_ripple={{ color: "#047857" }}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.freeButtonText}>Free Access</Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.subscribeButton, pressed && styles.buttonPressed]}
              onPress={() => onPaidSubscribe(doctor)}
              android_ripple={{ color: "#1D4ED8" }}
            >
              <Text style={styles.subscribeText}>Subscribe</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export default function DoctorsScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [doctors, setDoctors] = useState<RegisteredProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [consultationFilter, setConsultationFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('All');
  const [sortOption, setSortOption] = useState<'newest' | 'priceLow' | 'priceHigh' | 'experience'>('newest');
  const [selectedDoctor, setSelectedDoctor] = useState<RegisteredProfessional | null>(null);

  const reload = useCallback(() => {
    setError("");
    setLoading(true);
    fetchRegisteredProfessionals()
      .then((res) => setDoctors(res.professionals))
      .catch(() => setError("Could not load professionals. Check your connection."))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const handleFreeAccess = async (doctor: RegisteredProfessional) => {
    if (!email) {
      Alert.alert("Not signed in", "Please log in to subscribe to a professional.");
      return;
    }
    if (subscribedIds.has(doctor.id)) return;

    setProcessingId(doctor.id);
    try {
      await saveUserSubscription({
        email,
        subscription: {
          id: `free-${doctor.id}`,
          professionalId: doctor.id,
          professionalTitle: doctor.fullName,
          planName: "Free Consultation",
          amount: 0,
          period: "Free",
          selectedDoctorName: doctor.fullName,
        },
      });
      setSubscribedIds((prev) => new Set([...prev, doctor.id]));
      Alert.alert(
        "Access Granted",
        `You now have free access to ${doctor.fullName}. Send them a message from the Messages tab.`,
        [{ text: "OK" }],
      );
    } catch {
      Alert.alert("Error", "Could not complete. Please check your connection and try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const handlePaidSubscribe = (doctor: RegisteredProfessional) => {
    if (!email) {
      Alert.alert("Not signed in", "Please log in to subscribe to a professional.");
      return;
    }

    const type = doctor.type ?? "doctor";
    const price = resolvePrice(doctor);
    const plan = PLAN_BY_TYPE[type] ?? PLAN_BY_TYPE.doctor;
    router.push({
      pathname: "/payment" as any,
      params: {
        email,
        professionalId: doctor.id,
        professionalTitle: doctor.fullName,
        planName: plan.name,
        amount: String(price),
        period: plan.period,
      },
    });
  };

  const handleViewProfile = (doctor: RegisteredProfessional) => {
    setSelectedDoctor(doctor);
  };

  const closeModal = () => setSelectedDoctor(null);

  const specialtyOptions = useMemo(() => {
    const uniqueSpecialties = Array.from(
      new Set(doctors.map((doctor) => doctor.specialty).filter(Boolean)),
    );
    return ["All", ...uniqueSpecialties];
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return doctors
      .filter((doctor) => {
        if (consultationFilter === 'free' && doctor.consultationType !== 'free') {
          return false;
        }
        if (consultationFilter === 'paid' && doctor.consultationType !== 'paid') {
          return false;
        }
        if (specialtyFilter !== 'All' && doctor.specialty !== specialtyFilter) {
          return false;
        }
        return (
          doctor.fullName.toLowerCase().includes(query) ||
          doctor.specialty.toLowerCase().includes(query) ||
          doctor.clinicName?.toLowerCase().includes(query) ||
          doctor.email.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        if (sortOption === 'priceLow') {
          return resolvePrice(a) - resolvePrice(b);
        }
        if (sortOption === 'priceHigh') {
          return resolvePrice(b) - resolvePrice(a);
        }
        if (sortOption === 'experience') {
          return Number(b.experience || 0) - Number(a.experience || 0);
        }
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [doctors, searchQuery, consultationFilter, specialtyFilter, sortOption]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#2563EB" />
        </Pressable>
        <Text style={styles.headerTitle}>Find a Professional</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, specialty, or clinic"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {['all', 'free', 'paid'].map((option) => (
            <Pressable
              key={option}
              style={[
                styles.filterChip,
                consultationFilter === option && styles.filterChipActive,
              ]}
              onPress={() => setConsultationFilter(option as 'all' | 'free' | 'paid')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  consultationFilter === option && styles.filterChipTextActive,
                ]}
              >
                {option === 'all' ? 'All' : option === 'free' ? 'Free' : 'Paid'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {specialtyOptions.map((specialty) => (
            <Pressable
              key={specialty}
              style={[
                styles.filterChip,
                specialtyFilter === specialty && styles.filterChipActive,
              ]}
              onPress={() => setSpecialtyFilter(specialty)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  specialtyFilter === specialty && styles.filterChipTextActive,
                ]}
              >
                {specialty}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortRow}>
          {[
            { key: 'newest', label: 'Newest' },
            { key: 'priceLow', label: 'Price ↑' },
            { key: 'priceHigh', label: 'Price ↓' },
            { key: 'experience', label: 'Experience' },
          ].map((option) => (
            <Pressable
              key={option.key}
              style={[
                styles.sortButton,
                sortOption === option.key && styles.sortButtonActive,
              ]}
              onPress={() => setSortOption(option.key as any)}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortOption === option.key && styles.sortButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="wifi-off" size={48} color="#D1D5DB" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={reload}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : filteredDoctors.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="account-search-outline"
            size={64}
            color="#D1D5DB"
          />
          <Text style={styles.emptyTitle}>No professionals found</Text>
          <Text style={styles.emptySubtitle}>
            Change your search or filters to see more results.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDoctors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const price = resolvePrice(item);
            return (
              <DoctorCard
                doctor={item}
                isFree={item.consultationType === 'free'}
                effectivePrice={price}
                isProcessing={processingId === item.id}
                isSubscribed={subscribedIds.has(item.id)}
                onFreeAccess={handleFreeAccess}
                onPaidSubscribe={handlePaidSubscribe}
                onViewProfile={handleViewProfile}
              />
            );
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={!!selectedDoctor} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDoctor?.fullName}</Text>
              <Pressable onPress={closeModal} hitSlop={10}>
                <Ionicons name="close" size={24} color="#374151" />
              </Pressable>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>{selectedDoctor?.specialty}</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type</Text>
                <Text style={styles.detailValue}>{selectedDoctor?.type}</Text>
              </View>
              {selectedDoctor?.clinicName ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Clinic</Text>
                  <Text style={styles.detailValue}>{selectedDoctor.clinicName}</Text>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Experience</Text>
                <Text style={styles.detailValue}>{selectedDoctor?.experience} years</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Rating</Text>
                <Text style={styles.detailValue}>{selectedDoctor?.rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.modalSectionTitle}>About</Text>
              <Text style={styles.modalText}>{selectedDoctor?.bio || 'No profile details available.'}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterChipText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  sortButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  sortButtonActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  sortButtonTextActive: {
    color: "#FFFFFF",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#2563EB",
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#374151",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
  list: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  cardInfo: {
    flex: 1,
    gap: 6,
  },
  cardHeadline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  freeBadge: {
    backgroundColor: "#DCFCE7",
  },
  paidBadge: {
    backgroundColor: "#DBEAFE",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  freeBadgeText: {
    color: "#166534",
  },
  paidBadgeText: {
    color: "#1D4ED8",
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  specialty: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    marginBottom: 4,
  },
  bio: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  stars: {
    flexDirection: "row",
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  reviewCount: {
    fontWeight: "400",
    color: "#9CA3AF",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  freeLabel: {
    fontSize: 22,
    fontWeight: "800",
    color: "#059669",
  },
  price: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2563EB",
  },
  period: {
    fontSize: 13,
    fontWeight: "400",
    color: "#6B7280",
  },
  planName: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  freeButton: {
    backgroundColor: "#059669",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 110,
    alignItems: "center",
  },
  freeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  subscribeButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  subscribeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  viewButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2563EB",
    backgroundColor: "#FFFFFF",
  },
  viewButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "700",
  },
  subscribedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#D1FAE5",
  },
  subscribedText: {
    color: "#059669",
    fontSize: 13,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 12,
  },
  modalBody: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "700",
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  detailLabel: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },
  detailValue: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
    maxWidth: "55%",
    textAlign: "right",
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#4B5563",
  },
});
