import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    loginProfessional,
    registerProfessional,
} from "../../services/api";

type ProfessionalType = "doctor" | "nutritionist" | "coach";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROFESSIONAL_TYPES: { value: ProfessionalType; label: string }[] = [
  { value: "doctor", label: "Doctor" },
  { value: "nutritionist", label: "Nutritionist" },
  { value: "coach", label: "Fitness Coach" },
];

export default function DoctorLoginScreen() {
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [doctorName, setDoctorName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [experience, setExperience] = useState("");
  const [bio, setBio] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [consultationType, setConsultationType] = useState<"free" | "paid">("free");
  const [price, setPrice] = useState("");
  const [type, setType] = useState<ProfessionalType>("doctor");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [language, setLanguage] = useState("en");
  const router = useRouter();

  const isRegister = mode === "register";

  const goToDashboard = (name: string, professionalEmail: string) => {
    // Add slight delay to ensure doctor record is committed to database
    setTimeout(() => {
      router.replace({
        pathname: "/(tabs)/dochome",
        params: { doctorName: name, email: professionalEmail },
      });
    }, 1500);
  };

  const handleSignInPress = async () => {
    if (isRegister) {
      if (!doctorName || !email || !password) {
        alert("Please fill in name, email, and password");
        return;
      }
      if (!specialty || !experience || !bio) {
        alert("Please fill in specialty, experience, and bio");
        return;
      }
      if (!consultationType) {
        alert("Please select a consultation type.");
        return;
      }
      if (consultationType === "paid") {
        if (!price || Number(price) <= 0) {
          alert("Please enter a valid monthly subscription price.");
          return;
        }
      }
    }

    if (!isRegister && (!email || !password)) {
      alert("Please enter your email and password");
      return;
    }

    if (!EMAIL_REGEX.test(email.trim())) {
      alert("Please enter a valid email address");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    try {
      setSubmitting(true);

      if (isRegister) {
        const { professional } = await registerProfessional({
          fullName: doctorName,
          email,
          password,
          type,
          specialty,
          experience,
          bio,
          clinicName: clinicName || undefined,
          consultationType,
          price: consultationType === "paid" ? Number(price) : 0,
        });
        goToDashboard(professional.fullName, professional.email);
      } else {
        const { professional } = await loginProfessional({ email, password });
        goToDashboard(professional.fullName, professional.email);
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : isRegister
            ? "Failed to create account"
            : "Failed to sign in",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(isRegister ? "signin" : "register");
  };

  const handleLanguagePress = () => {
    // Toggle language
    setLanguage(language === "en" ? "ar" : "en");
    console.log(
      "Language toggled to:",
      language === "en" ? "Arabic" : "English",
    );
  };

  const handleBackPress = () => {
    // Navigate back to splash screen
    router.push("/(tabs)/splash");
  };

  return (
    <View style={styles.container}>
      {/* Deep Royal Blue Gradient Background */}
      <View style={styles.background} />

      {/* Language Selector - Top Right */}
      <TouchableOpacity
        style={styles.languageButton}
        onPress={handleLanguagePress}
        activeOpacity={0.7}
      >
        <MaterialIcons name="language" size={16} color="white" />
        <Text style={styles.languageText}>العربية</Text>
      </TouchableOpacity>

      {/* Back Button - Top Left */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackPress}
        activeOpacity={0.7}
      >
        <MaterialIcons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      {/* Main Content - ScrollView for mobile devices */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* VitalConnect Logo/Icon */}
        <View style={styles.logoContainer}>
          <MaterialIcons name="favorite" size={48} color="white" />
        </View>

        {/* Welcome Text */}
        <Text style={styles.title}>Healthcare Professional Portal</Text>
        <Text style={styles.subtitle}>
          {isRegister
            ? "Create your professional account"
            : "Sign in to access your patient dashboard"}
        </Text>

        {/* White Card Container */}
        <View style={styles.card}>
          {/* Doctor Name Input (register only) */}
          {isRegister && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="person"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Dr. Ahmed Hassan"
                  placeholderTextColor="#9CA3AF"
                  value={doctorName}
                  onChangeText={setDoctorName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* Professional Type (register only) */}
          {isRegister && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>I am a</Text>
              <View style={styles.typeRow}>
                {PROFESSIONAL_TYPES.map((option) => {
                  const active = type === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                      onPress={() => setType(option.value)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          active && styles.typeChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Specialty (register only) */}
          {isRegister && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Specialty</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="medical-services"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Cardiologist, Sports Nutrition"
                  placeholderTextColor="#9CA3AF"
                  value={specialty}
                  onChangeText={setSpecialty}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {isRegister && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Experience</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="badge"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 8 years"
                  placeholderTextColor="#9CA3AF"
                  value={experience}
                  onChangeText={setExperience}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {isRegister && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <View style={styles.inputContainerMultiline}>
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Tell patients about your expertise"
                  placeholderTextColor="#9CA3AF"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}

          {isRegister && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Clinic Name (optional)</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="local-hospital"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Healing Hearts Clinic"
                  placeholderTextColor="#9CA3AF"
                  value={clinicName}
                  onChangeText={setClinicName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {isRegister && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Consultation type</Text>
              <View style={styles.typeRow}>
                {[
                  { value: "free", label: "Free Consultation" },
                  { value: "paid", label: "Paid Consultation" },
                ].map((option) => {
                  const active = consultationType === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.typeChip,
                        active && styles.typeChipActive,
                      ]}
                      onPress={() => setConsultationType(option.value as "free" | "paid")}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          active && styles.typeChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {isRegister && consultationType === "paid" && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Monthly Subscription Price</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="attach-money"
                  size={20}
                  color="#9CA3AF"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 49"
                  placeholderTextColor="#9CA3AF"
                  value={price}
                  onChangeText={(text) => setPrice(text.replace(/[^0-9.]/g, ""))}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="email"
                size={20}
                color="#9CA3AF"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="doctor@hospital.com"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="lock"
                size={20}
                color="#9CA3AF"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
              />
              <TouchableOpacity
                onPress={() => setPasswordVisible(!passwordVisible)}
                style={styles.eyeIcon}
              >
                <MaterialIcons
                  name={passwordVisible ? "visibility" : "visibility-off"}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password Link (sign in only) */}
          {!isRegister && (
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.signInButton, submitting && styles.signInButtonDisabled]}
            onPress={handleSignInPress}
            activeOpacity={0.9}
            disabled={submitting}
          >
            <Text style={styles.signInButtonText}>
              {submitting
                ? "Please wait..."
                : isRegister
                  ? "Create Account"
                  : "Sign In"}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register / Sign In Toggle */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              {isRegister
                ? "Already have an account? "
                : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={toggleMode}>
              <Text style={styles.registerLink}>
                {isRegister ? "Sign In" : "Register as Professional"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E5A96",
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#1E5A96",
  },
  languageButton: {
    position: "absolute",
    top: 50,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    zIndex: 10,
  },
  languageText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 30,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
  },
  inputContainerMultiline: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: 10,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: "#111827",
  },
  eyeIcon: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#1E5A96",
    fontWeight: "600",
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  typeChipActive: {
    backgroundColor: "#1E5A96",
    borderColor: "#1E5A96",
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  typeChipTextActive: {
    color: "white",
  },
  signInButton: {
    backgroundColor: "#1E5A96",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#9CA3AF",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    fontSize: 14,
    color: "#6B7280",
  },
  registerLink: {
    fontSize: 14,
    color: "#1E5A96",
    fontWeight: "700",
  },
});
