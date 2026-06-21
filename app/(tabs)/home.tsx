import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import {
    fetchDashboardStats,
    fetchPatientDashboard,
    savePatientLog,
    savePatientMetrics,
} from "../../services/api";
import { useBlockBack } from "../../hooks/use-block-back";

type WaterUnit = "cups" | "litres";

interface HealthMetrics {
  calories: { current: number; goal: number };
  sleep: { bedtime: string; wakeTime: string };
  water: { amount: number; unit: WaterUnit; goal: number };
}

const DEFAULT_HEALTH_METRICS: HealthMetrics = {
  calories: { current: 0, goal: 2000 },
  sleep: { bedtime: "23:00", wakeTime: "07:00" },
  water: { amount: 0, unit: "cups", goal: 8 },
};

// Format a "HH:MM" 24h string as a 12h label, e.g. "23:00" -> "11:00 PM".
const formatTime12 = (time: string) => {
  const [hRaw, mRaw] = (time || "").split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return time || "--:--";
  }
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

// Hours slept between bedtime and wake time, wrapping past midnight.
const computeSleepHours = (bedtime: string, wakeTime: string) => {
  const [bh, bm] = (bedtime || "").split(":").map(Number);
  const [wh, wm] = (wakeTime || "").split(":").map(Number);
  if ([bh, bm, wh, wm].some((n) => Number.isNaN(n))) {
    return 0;
  }
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return Math.round((mins / 60) * 10) / 10;
};

// expo-speech-recognition is a native module NOT bundled in Expo Go. Its package
// calls requireNativeModule('ExpoSpeechRecognition') at IMPORT time, which throws
// in Expo Go — a static import would make this whole route file fail to load and
// break navigation to /home. Load it via a guarded require so the screen still
// renders (voice disabled) when the native module is absent.
type SpeechEventHook = (
  eventName: string,
  listener: (event: any) => void,
) => void;

let speechModule: any = null;
let useSpeechEvent: SpeechEventHook = () => {};
try {
  const SpeechRecognition = require("expo-speech-recognition");
  if (SpeechRecognition?.ExpoSpeechRecognitionModule) {
    speechModule = SpeechRecognition.ExpoSpeechRecognitionModule;
    useSpeechEvent = SpeechRecognition.useSpeechRecognitionEvent;
  }
} catch (error) {
  console.log(
    "expo-speech-recognition unavailable (expected in Expo Go):",
    error,
  );
}

interface MetricCard {
  id: string;
  title: string;
  current: number;
  goal: number;
  unit: string;
  icon: string;
  color: string;
  backgroundColor: string;
}

interface ActivityItem {
  id: string;
  title: string;
  timeAgo: string;
  icon: string;
  color: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
}

interface QuickLogEntry {
  id: string;
  type: string;
  value: string;
  note: string;
  timestamp: string;
}

export default function DashboardHome() {
  const params = useLocalSearchParams<{ fullName?: string; age?: string; height?: string; weight?: string; email?: string }>();
  const router = useRouter();
  // Dashboard is a root screen — block the hardware back button.
  useBlockBack();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [userName, setUserName] = useState("User");
  const [userData, setUserData] = useState<any>(null);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);
  const [voiceAssistantScreen, setVoiceAssistantScreen] = useState<
    "listening" | "confirmation"
  >("listening");
  const [selectedLogType, setSelectedLogType] = useState<string>("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isQuickLogModalOpen, setIsQuickLogModalOpen] = useState(false);
  const [quickLogType, setQuickLogType] = useState("");
  const [quickLogValue, setQuickLogValue] = useState("");
  const [quickLogNote, setQuickLogNote] = useState("");
  const [quickLogEntries, setQuickLogEntries] = useState<QuickLogEntry[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<MetricCard[]>([]);
  const [dashboardActivities, setDashboardActivities] = useState<
    ActivityItem[]
  >([]);
  const [dashboardQuickActions, setDashboardQuickActions] = useState<
    QuickAction[]
  >([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics>(
    DEFAULT_HEALTH_METRICS,
  );
  const [editMetric, setEditMetric] = useState<
    null | "calories" | "sleep" | "water"
  >(null);
  const [draftCalories, setDraftCalories] = useState("");
  const [draftBedtime, setDraftBedtime] = useState("");
  const [draftWakeTime, setDraftWakeTime] = useState("");
  const [draftWaterAmount, setDraftWaterAmount] = useState("");
  const [draftWaterUnit, setDraftWaterUnit] = useState<WaterUnit>("cups");
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const name = params.fullName || "User";
    setUserName(name);
    setUserData({
      fullName: params.fullName || "User Name",
      age: params.age || "",
      height: params.height || "",
      weight: params.weight || "",
      email: params.email || "user@example.com",
    });
  }, [params.fullName, params.age, params.height, params.weight, params.email]);

  useEffect(() => {
    const email = userData?.email;
    if (!email) {
      return;
    }

    let active = true;
    Promise.all([
      fetchPatientDashboard(email),
      fetchDashboardStats(email).catch(() => []),
    ])
      .then(([response, latestLogs]) => {
        if (!active) return;

        const mappedMetrics: MetricCard[] = (response.metrics || []).map(
          (metric: Record<string, any>, index: number) => ({
            id: String(metric.id || index + 1),
            title: String(metric.title || "Metric"),
            current: Number(metric.current ?? metric.value ?? 0),
            goal: Number(metric.goal ?? 100),
            unit: String(metric.unit || ""),
            icon: String(metric.icon || "chart-bar"),
            color: String(metric.color || "#3B82F6"),
            backgroundColor: String(metric.backgroundColor || "#DBEAFE"),
          }),
        );

        const mappedQuickActions: QuickAction[] = (
          response.quickActions || []
        ).map((action: Record<string, any>, index: number) => ({
          id: String(action.id || index + 1),
          label: String(action.label || "Action"),
          icon: String(action.icon || "circle"),
          color: String(action.color || "#3B82F6"),
        }));

        setDashboardMetrics(mappedMetrics);
        setDashboardQuickActions(mappedQuickActions);

        if (response.healthMetrics) {
          const hm = response.healthMetrics;
          setHealthMetrics({
            calories: {
              current: Number(hm.calories?.current ?? 0),
              goal: Number(hm.calories?.goal ?? 2000),
            },
            sleep: {
              bedtime: String(hm.sleep?.bedtime ?? "23:00"),
              wakeTime: String(hm.sleep?.wakeTime ?? "07:00"),
            },
            water: {
              amount: Number(hm.water?.amount ?? 0),
              unit: hm.water?.unit === "litres" ? "litres" : "cups",
              goal: Number(hm.water?.goal ?? 8),
            },
          });
        }

        const mappedActivities: ActivityItem[] = (latestLogs || []).map(
          (log: any, index: number) => ({
            id: log.id || log._id || String(index + 1),
            title: log.title || log.subtitle || log.note || "Health log",
            timeAgo: log.timestamp || "Just now",
            icon:
              log.type === "meal"
                ? "food-fork-drink"
                : log.type === "exercise"
                  ? "walk"
                  : log.type === "medication"
                    ? "pill"
                    : "heart-pulse",
            color:
              log.type === "meal"
                ? "#F59E0B"
                : log.type === "exercise"
                  ? "#3B82F6"
                  : log.type === "medication"
                    ? "#EC4899"
                    : "#EF4444",
          }),
        );

        setDashboardActivities(
          mappedActivities.length > 0
            ? mappedActivities
            : (response.recentActivities || []).map(
                (item: Record<string, any>, index: number) => ({
                  id: String(item.id || index + 1),
                  title: String(item.title || "Activity"),
                  timeAgo: String(item.timeAgo || "Just now"),
                  icon: String(
                    item.icon || "heart-pulse",
                  ) as ActivityItem["icon"],
                  color: String(item.color || "#EF4444"),
                }),
              ),
        );

        if (response.user?.fullName) {
          setUserName(response.user.fullName);
        }
      })
      .catch((error) => {
        console.log("Failed to load patient dashboard:", error);
      });

    return () => {
      active = false;
    };
  }, [userData?.email]);

  // Pulsating animation
  useEffect(() => {
    if (isVoiceAssistantOpen && voiceAssistantScreen === "listening") {
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
        ]),
      ).start();
    }
  }, [isVoiceAssistantOpen, voiceAssistantScreen, pulseAnim]);

  const classifyVoiceLogType = (transcript: string) => {
    const text = transcript.toLowerCase();

    const matches = {
      meal: [
        "meal",
        "breakfast",
        "lunch",
        "dinner",
        "snack",
        "ate",
        "food",
        "calories",
      ],
      medication: [
        "medication",
        "medicine",
        "pill",
        "tablet",
        "dose",
        "insulin",
        "metformin",
        "drug",
      ],
      exercise: [
        "exercise",
        "workout",
        "walk",
        "run",
        "jog",
        "gym",
        "training",
        "activity",
      ],
      vitals: [
        "blood pressure",
        "bp",
        "pulse",
        "heart rate",
        "glucose",
        "sugar",
        "temperature",
        "oxygen",
      ],
      symptom: [
        "symptom",
        "pain",
        "headache",
        "nausea",
        "dizzy",
        "fatigue",
        "cough",
        "fever",
      ],
    };

    const scoreCategory = (keywords: string[]) =>
      keywords.reduce((score, keyword) => {
        if (text.includes(keyword)) {
          return score + 1;
        }
        return score;
      }, 0);

    const scores = {
      meal: scoreCategory(matches.meal),
      medication: scoreCategory(matches.medication),
      exercise: scoreCategory(matches.exercise),
      vitals: scoreCategory(matches.vitals),
      symptom: scoreCategory(matches.symptom),
    };

    const bestMatch = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    if (!bestMatch || bestMatch[1] === 0) {
      return "General Health Log";
    }

    switch (bestMatch[0]) {
      case "meal":
        return "Log Meal";
      case "medication":
        return "Log Medication";
      case "exercise":
        return "Log Exercise";
      case "vitals":
        return "Log Vitals";
      case "symptom":
        return "Log Symptom";
      default:
        return "General Health Log";
    }
  };

  const handleVoiceResultFinal = (transcript: string) => {
    const cleanTranscript = transcript.trim();
    if (!cleanTranscript) {
      return;
    }

    const detectedType = classifyVoiceLogType(cleanTranscript);
    setVoiceTranscript(cleanTranscript);
    setSelectedLogType(detectedType);
    setVoiceAssistantScreen("confirmation");

    // Save voice log to database
    if (userData?.email) {
      const normalizedLogType = (() => {
        const value = detectedType.toLowerCase();
        if (value.includes("meal")) return "meal";
        if (value.includes("exercise")) return "exercise";
        if (value.includes("vitals")) return "vitals";
        if (value.includes("medication")) return "medication";
        return "symptom";
      })();

      const newEntry: QuickLogEntry = {
        id: Date.now().toString(),
        type: detectedType,
        value: cleanTranscript,
        note: "",
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setQuickLogEntries((prev) => [newEntry, ...prev]);
      savePatientLog(userData.email, {
        type: normalizedLogType,
        title: cleanTranscript,
        subtitle: cleanTranscript,
        note: "",
      }).catch((error) => console.log("Failed to save voice log:", error));
    }
  };

  useSpeechEvent("start", () => {
    setVoiceAssistantScreen("listening");
  });

  useSpeechEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript?.trim() || "";
    if (!transcript) {
      return;
    }

    setVoiceTranscript(transcript);
    if (event.isFinal) {
      handleVoiceResultFinal(transcript);
    }
  });

  useSpeechEvent("error", (event) => {
    const fallbackType = classifyVoiceLogType(event?.message || "");
    setSelectedLogType(fallbackType);
    setVoiceAssistantScreen("confirmation");
  });

  useSpeechEvent("end", () => {});

  const startVoiceRecognition = async () => {
    if (!speechModule) {
      return;
    }

    const permission = await speechModule.requestPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    speechModule.start({
      lang: "en-US",
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
      addsPunctuation: true,
    });
  };

  const handleOpenVoiceAssistant = () => {
    setIsVoiceAssistantOpen(true);
    setVoiceAssistantScreen("listening");
    setSelectedLogType("");
    setVoiceTranscript("");
    startVoiceRecognition().catch(() => {});
  };

  const handleCloseVoiceAssistant = () => {
    speechModule?.stop();
    setIsVoiceAssistantOpen(false);
    setVoiceAssistantScreen("listening");
    setSelectedLogType("");
    setVoiceTranscript("");
    pulseAnim.setValue(0);
  };

  const handleListeningComplete = () => {
    speechModule?.stop();
    if (!voiceTranscript.trim()) {
      setSelectedLogType("General Health Log");
      setVoiceAssistantScreen("confirmation");
      return;
    }
    handleVoiceResultFinal(voiceTranscript);
  };

  const getQuickLogValuePlaceholder = (type: string) => {
    switch (type) {
      case "Log Meal":
        return "Meal name (e.g. Grilled chicken + rice)";
      case "Log Exercise":
        return "Exercise and duration (e.g. Walking 30 min)";
      case "Log Vitals":
        return "Vital reading (e.g. BP 120/80 or glucose 105)";
      case "Log Medication":
        return "Medication name and dose (e.g. Metformin 500mg)";
      case "Log Symptom":
        return "Symptom (e.g. Headache, mild)";
      default:
        return "Enter details";
    }
  };

  const handleOpenQuickLog = (type: string) => {
    setQuickLogType(type);
    setQuickLogValue("");
    setQuickLogNote("");
    setIsQuickLogModalOpen(true);
  };

  const handleCloseQuickLog = () => {
    setIsQuickLogModalOpen(false);
    setQuickLogType("");
    setQuickLogValue("");
    setQuickLogNote("");
  };

  const handleSaveQuickLog = () => {
    if (!quickLogValue.trim()) {
      return;
    }

    const normalizedLogType = (() => {
      const value = quickLogType.toLowerCase();
      if (value.includes("meal")) return "meal";
      if (value.includes("exercise")) return "exercise";
      if (value.includes("vitals")) return "vitals";
      if (value.includes("medication")) return "medication";
      if (value.includes("symptom")) return "symptom";
      return "symptom";
    })();

    const newEntry: QuickLogEntry = {
      id: Date.now().toString(),
      type: quickLogType,
      value: quickLogValue.trim(),
      note: quickLogNote.trim(),
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setQuickLogEntries((prev) => [newEntry, ...prev]);
    if (userData?.email) {
      savePatientLog(userData.email, {
        type: normalizedLogType,
        title: quickLogValue.trim(),
        subtitle: quickLogNote.trim() || quickLogValue.trim(),
        note: quickLogNote.trim(),
      }).catch((error) => console.log("Failed to save quick log:", error));
    }
    handleCloseQuickLog();
  };

  const persistHealthMetrics = (next: HealthMetrics) => {
    setHealthMetrics(next);
    if (userData?.email) {
      savePatientMetrics(userData.email, next).catch((error) =>
        console.log("Failed to save health metrics:", error),
      );
    }
  };

  const handleEditCalories = () => {
    setDraftCalories(String(healthMetrics.calories.current));
    setEditMetric("calories");
  };

  const handleEditSleep = () => {
    setDraftBedtime(healthMetrics.sleep.bedtime);
    setDraftWakeTime(healthMetrics.sleep.wakeTime);
    setEditMetric("sleep");
  };

  const handleEditWater = () => {
    setDraftWaterAmount(String(healthMetrics.water.amount));
    setDraftWaterUnit(healthMetrics.water.unit);
    setEditMetric("water");
  };

  const handleCloseEdit = () => setEditMetric(null);

  const handleSaveCalories = () => {
    const current = Math.max(0, Math.round(Number(draftCalories) || 0));
    persistHealthMetrics({
      ...healthMetrics,
      calories: { ...healthMetrics.calories, current },
    });
    setEditMetric(null);
  };

  // Accept "H:MM" or "HH:MM" within valid 24h ranges; otherwise keep current.
  const normalizeTime = (value: string, fallback: string) => {
    const match = (value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return fallback;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h > 23 || m > 59) return fallback;
    return `${String(h).padStart(2, "0")}:${match[2]}`;
  };

  const handleSaveSleep = () => {
    persistHealthMetrics({
      ...healthMetrics,
      sleep: {
        bedtime: normalizeTime(draftBedtime, healthMetrics.sleep.bedtime),
        wakeTime: normalizeTime(draftWakeTime, healthMetrics.sleep.wakeTime),
      },
    });
    setEditMetric(null);
  };

  const handleSaveWater = () => {
    const amount = Math.max(0, Number(draftWaterAmount) || 0);
    const goal = draftWaterUnit === "litres" ? 2 : 8;
    persistHealthMetrics({
      ...healthMetrics,
      water: { amount, unit: draftWaterUnit, goal },
    });
    setEditMetric(null);
  };

  const medicationCard: MetricCard = dashboardMetrics.find(
    (m) => m.id === "medication",
  ) || {
    id: "medication",
    title: "Medication",
    current: 0,
    goal: 100,
    unit: "%",
    icon: "pill",
    color: "#EC4899",
    backgroundColor: "#FCE7F3",
  };
  const recentActivities: ActivityItem[] = dashboardActivities;
  const quickActions: QuickAction[] =
    dashboardQuickActions.length > 0
      ? dashboardQuickActions
      : [
          {
            id: "1",
            label: "Log Meal",
            icon: "silverware-fork-knife",
            color: "#F59E0B",
          },
          {
            id: "2",
            label: "Log Exercise",
            icon: "dumbbell",
            color: "#3B82F6",
          },
          {
            id: "3",
            label: "Log Vitals",
            icon: "heart-pulse",
            color: "#EF4444",
          },
          {
            id: "4",
            label: "Log Symptom",
            icon: "emoticon-sad-outline",
            color: "#8B5CF6",
          },
          { id: "5", label: "Log Medication", icon: "pill", color: "#EC4899" },
        ];

  const isCompact = screenHeight < 780;
  const isVeryCompact = screenHeight < 700;
  const isNarrow = screenWidth < 380;
  const visibleActivities = recentActivities.slice(0, isVeryCompact ? 2 : 3);
  const visibleQuickActions = quickActions.slice(0, isVeryCompact ? 3 : 4);

  const renderMetricCard = (card: MetricCard) => {
    const progress = (card.current / card.goal) * 100;
    const displayProgress = Math.min(progress, 100);

    return (
      <View key={card.id} style={styles.metricCard}>
        <View style={styles.metricHeader}>
          <View
            style={[
              styles.metricIcon,
              { backgroundColor: card.backgroundColor },
            ]}
          >
            <MaterialCommunityIcons
              name={card.icon as any}
              size={isCompact ? 18 : 20}
              color={card.color}
            />
          </View>
          <Text
            style={[styles.metricTitle, isCompact && styles.metricTitleCompact]}
            numberOfLines={1}
          >
            {card.title}
          </Text>
        </View>

        <View style={styles.metricValue}>
          <Text
            style={[
              styles.metricNumber,
              isCompact && styles.metricNumberCompact,
            ]}
          >
            {card.current}
          </Text>
          <Text
            style={[styles.metricUnit, isCompact && styles.metricUnitCompact]}
          >
            / {card.goal} {card.unit}
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${displayProgress}%`,
                backgroundColor: card.color,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{Math.round(displayProgress)}%</Text>
      </View>
    );
  };

  const renderCaloriesCard = () => {
    const { current, goal } = healthMetrics.calories;
    const displayProgress = Math.min((current / goal) * 100, 100);

    return (
      <TouchableOpacity
        style={styles.metricCard}
        activeOpacity={0.85}
        onPress={handleEditCalories}
      >
        <View style={styles.metricHeader}>
          <View style={[styles.metricIcon, { backgroundColor: "#DCFCE7" }]}>
            <MaterialCommunityIcons
              name="fire"
              size={isCompact ? 18 : 20}
              color="#10B981"
            />
          </View>
          <Text
            style={[styles.metricTitle, isCompact && styles.metricTitleCompact]}
            numberOfLines={1}
          >
            Calories
          </Text>
          <MaterialCommunityIcons name="pencil" size={14} color="#9CA3AF" />
        </View>

        <View style={styles.metricValue}>
          <Text
            style={[
              styles.metricNumber,
              isCompact && styles.metricNumberCompact,
            ]}
          >
            {current}
          </Text>
          <Text
            style={[styles.metricUnit, isCompact && styles.metricUnitCompact]}
          >
            / {goal} kcal
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${displayProgress}%`, backgroundColor: "#10B981" },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{Math.round(displayProgress)}%</Text>
      </TouchableOpacity>
    );
  };

  const renderSleepCard = () => {
    const hours = computeSleepHours(
      healthMetrics.sleep.bedtime,
      healthMetrics.sleep.wakeTime,
    );

    return (
      <TouchableOpacity
        style={[styles.metricCard, styles.bpMetricCard]}
        activeOpacity={0.85}
        onPress={handleEditSleep}
      >
        <View style={styles.metricHeader}>
          <View style={[styles.metricIcon, { backgroundColor: "#EDE9FE" }]}>
            <MaterialCommunityIcons
              name="sleep"
              size={isCompact ? 18 : 20}
              color="#8B5CF6"
            />
          </View>
          <Text
            style={[styles.metricTitle, isCompact && styles.metricTitleCompact]}
            numberOfLines={1}
          >
            Sleep Schedule
          </Text>
          <MaterialCommunityIcons name="pencil" size={14} color="#9CA3AF" />
        </View>

        <View style={styles.bpMetricValueRow}>
          <Text
            style={[
              styles.bpMetricValue,
              isCompact && styles.bpMetricValueCompact,
            ]}
          >
            {hours}
          </Text>
          <Text style={styles.bpMetricUnit}>hrs</Text>
        </View>

        <Text style={styles.sleepScheduleText} numberOfLines={1}>
          {formatTime12(healthMetrics.sleep.bedtime)} →{" "}
          {formatTime12(healthMetrics.sleep.wakeTime)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderWaterCard = () => {
    const { amount, unit, goal } = healthMetrics.water;
    const displayProgress = Math.min((amount / goal) * 100, 100);

    return (
      <TouchableOpacity
        style={styles.metricCard}
        activeOpacity={0.85}
        onPress={handleEditWater}
      >
        <View style={styles.metricHeader}>
          <View style={[styles.metricIcon, { backgroundColor: "#E0F2FE" }]}>
            <MaterialCommunityIcons
              name="cup-water"
              size={isCompact ? 18 : 20}
              color="#0EA5E9"
            />
          </View>
          <Text
            style={[styles.metricTitle, isCompact && styles.metricTitleCompact]}
            numberOfLines={1}
          >
            Water Intake
          </Text>
          <MaterialCommunityIcons name="pencil" size={14} color="#9CA3AF" />
        </View>

        <View style={styles.metricValue}>
          <Text
            style={[
              styles.metricNumber,
              isCompact && styles.metricNumberCompact,
            ]}
          >
            {amount}
          </Text>
          <Text
            style={[styles.metricUnit, isCompact && styles.metricUnitCompact]}
          >
            / {goal} {unit}
          </Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${displayProgress}%`, backgroundColor: "#0EA5E9" },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{Math.round(displayProgress)}%</Text>
      </TouchableOpacity>
    );
  };

  const renderActivityItem = (item: ActivityItem) => (
    <View key={item.id} style={styles.activityItem}>
      <View
        style={[styles.activityIcon, { backgroundColor: item.color + "20" }]}
      >
        <MaterialCommunityIcons
          name={item.icon as any}
          size={16}
          color={item.color}
        />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.activityTime}>{item.timeAgo}</Text>
      </View>
    </View>
  );

  const renderQuickAction = (action: QuickAction) => (
    <TouchableOpacity
      key={action.id}
      style={styles.quickActionButton}
      onPress={() => handleOpenQuickLog(action.label)}
      activeOpacity={0.8}
    >
      <View
        style={[styles.actionIcon, { backgroundColor: action.color + "20" }]}
      >
        <MaterialCommunityIcons
          name={action.icon as any}
          size={16}
          color={action.color}
        />
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>
        {action.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageContent}>
        <View style={[styles.header, isCompact && styles.headerCompact]}>
          <View style={styles.headerTextWrap}>
            <Text
              style={[styles.greeting, isNarrow && styles.greetingNarrow]}
              numberOfLines={1}
            >
              Good morning, {userName}! 👋
            </Text>
            <Text style={styles.subgreeting} numberOfLines={1}>
              Here&apos;s your health overview for today
            </Text>
          </View>
        </View>

        <View style={styles.mainGrid}>
          <View style={styles.mainGridRow}>
            {renderCaloriesCard()}
            {renderSleepCard()}
          </View>

          <View style={styles.mainGridRow}>
            {renderMetricCard(medicationCard)}
            {renderWaterCard()}
          </View>
        </View>

        <View style={styles.horizontalSection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View
            style={[
              styles.recentActivityList,
              isCompact && styles.recentActivityListCompact,
            ]}
          >
            {visibleActivities.map(renderActivityItem)}
          </View>
        </View>

        <View style={styles.horizontalSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.horizontalRow}>
            {visibleQuickActions.map(renderQuickAction)}
          </View>
          {quickLogEntries.length > 0 && (
            <View style={styles.latestQuickLogCard}>
              <Text style={styles.latestQuickLogTitle}>
                Latest: {quickLogEntries[0].type}
              </Text>
              <Text style={styles.latestQuickLogValue} numberOfLines={1}>
                {quickLogEntries[0].value}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleOpenVoiceAssistant}>
        <MaterialCommunityIcons name="microphone" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        visible={isQuickLogModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseQuickLog}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.quickLogModalContent}>
            <View style={styles.quickLogHeader}>
              <Text style={styles.quickLogTitle}>{quickLogType}</Text>
              <TouchableOpacity onPress={handleCloseQuickLog}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.quickLogLabel}>What did you log?</Text>
            <TextInput
              style={styles.quickLogInput}
              placeholder={getQuickLogValuePlaceholder(quickLogType)}
              placeholderTextColor="#9CA3AF"
              value={quickLogValue}
              onChangeText={setQuickLogValue}
            />

            <Text style={styles.quickLogLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.quickLogInput, styles.quickLogNotesInput]}
              placeholder="Add any extra details"
              placeholderTextColor="#9CA3AF"
              value={quickLogNote}
              onChangeText={setQuickLogNote}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.quickLogSaveButton,
                !quickLogValue.trim() && styles.quickLogSaveButtonDisabled,
              ]}
              onPress={handleSaveQuickLog}
              disabled={!quickLogValue.trim()}
            >
              <Text style={styles.quickLogSaveButtonText}>Save Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Health Metric Modal */}
      <Modal
        visible={editMetric !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.quickLogModalContent}>
            <View style={styles.quickLogHeader}>
              <Text style={styles.quickLogTitle}>
                {editMetric === "calories"
                  ? "Edit Calories"
                  : editMetric === "sleep"
                    ? "Edit Sleep Schedule"
                    : "Edit Water Intake"}
              </Text>
              <TouchableOpacity onPress={handleCloseEdit}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {editMetric === "calories" && (
              <>
                <Text style={styles.quickLogLabel}>Calories consumed (kcal)</Text>
                <TextInput
                  style={styles.quickLogInput}
                  placeholder="e.g. 1500"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={draftCalories}
                  onChangeText={setDraftCalories}
                />
                <TouchableOpacity
                  style={styles.quickLogSaveButton}
                  onPress={handleSaveCalories}
                >
                  <Text style={styles.quickLogSaveButtonText}>Save</Text>
                </TouchableOpacity>
              </>
            )}

            {editMetric === "sleep" && (
              <>
                <Text style={styles.quickLogLabel}>Bedtime (24h, HH:MM)</Text>
                <TextInput
                  style={styles.quickLogInput}
                  placeholder="23:00"
                  placeholderTextColor="#9CA3AF"
                  value={draftBedtime}
                  onChangeText={setDraftBedtime}
                />
                <Text style={styles.quickLogLabel}>
                  Wake-up time (24h, HH:MM)
                </Text>
                <TextInput
                  style={styles.quickLogInput}
                  placeholder="07:00"
                  placeholderTextColor="#9CA3AF"
                  value={draftWakeTime}
                  onChangeText={setDraftWakeTime}
                />
                <TouchableOpacity
                  style={styles.quickLogSaveButton}
                  onPress={handleSaveSleep}
                >
                  <Text style={styles.quickLogSaveButtonText}>Save</Text>
                </TouchableOpacity>
              </>
            )}

            {editMetric === "water" && (
              <>
                <Text style={styles.quickLogLabel}>Amount</Text>
                <TextInput
                  style={styles.quickLogInput}
                  placeholder={draftWaterUnit === "litres" ? "e.g. 1.5" : "e.g. 6"}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={draftWaterAmount}
                  onChangeText={setDraftWaterAmount}
                />
                <Text style={styles.quickLogLabel}>Unit</Text>
                <View style={styles.unitToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.unitToggleButton,
                      draftWaterUnit === "cups" && styles.unitToggleButtonActive,
                    ]}
                    onPress={() => setDraftWaterUnit("cups")}
                  >
                    <Text
                      style={[
                        styles.unitToggleText,
                        draftWaterUnit === "cups" &&
                          styles.unitToggleTextActive,
                      ]}
                    >
                      Cups
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.unitToggleButton,
                      draftWaterUnit === "litres" &&
                        styles.unitToggleButtonActive,
                    ]}
                    onPress={() => setDraftWaterUnit("litres")}
                  >
                    <Text
                      style={[
                        styles.unitToggleText,
                        draftWaterUnit === "litres" &&
                          styles.unitToggleTextActive,
                      ]}
                    >
                      Litres
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.quickLogSaveButton}
                  onPress={handleSaveWater}
                >
                  <Text style={styles.quickLogSaveButtonText}>Save</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#3B82F6" />
          <Text style={[styles.navLabel, { color: "#3B82F6" }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({ pathname: "/(tabs)/logs", params: userData })
          }
        >
          <Ionicons name="document-text-outline" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Logs</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({ pathname: "/(tabs)/plans", params: userData })
          }
        >
          <Ionicons name="calendar-outline" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Plans</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({ pathname: "/(tabs)/messages", params: userData })
          }
        >
          <Ionicons name="chatbubble-outline" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({ pathname: "/(tabs)/prof", params: userData })
          }
        >
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
          {voiceAssistantScreen === "listening" ? (
            // Listening Screen
            <View style={styles.voiceModalContent}>
              <View style={styles.voiceModalHeader}>
                <View>
                  <Text style={styles.voiceModalTitle}>Voice Assistant</Text>
                  <Text style={styles.selectedTypeLabel}>
                    Speak directly. Your log type will be detected
                    automatically.
                  </Text>
                </View>
                <TouchableOpacity onPress={handleCloseVoiceAssistant}>
                  <Ionicons name="close" size={28} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.listeningContainer}>
                <Text style={styles.listeningLabel}>Listening...</Text>

                {/* Pulsating Waveform Circle */}
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
                    <MaterialCommunityIcons
                      name="microphone"
                      size={40}
                      color="#FFFFFF"
                    />
                  </View>
                </View>

                <Text style={styles.instructionText}>
                  Speak clearly into your device
                </Text>
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
                <Text style={styles.detailValue}>
                  {selectedLogType || "General Health Log"}
                </Text>
                <Text style={styles.detailSubtext}>
                  Your entry has been recorded successfully
                </Text>
              </View>

              <View style={styles.confirmActionRow}>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleCloseVoiceAssistant}
                >
                  <Text style={styles.confirmButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: "#F9FAFB",
    overflow: "hidden",
  },
  pageContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
  },
  headerCompact: {
    paddingVertical: 10,
  },
  headerTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  greetingNarrow: {
    fontSize: 18,
  },
  subgreeting: {
    fontSize: 12,
    color: "#6B7280",
  },
  settingsButton: {
    padding: 4,
  },
  metricRow: {
    flexDirection: "row",
    gap: 8,
  },
  mainGrid: {
    flex: 1,
    gap: 6,
  },
  mainGridRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 11,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  metricTitle: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },
  metricTitleCompact: {
    fontSize: 11,
  },
  metricValue: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 6,
  },
  metricNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  metricNumberCompact: {
    fontSize: 18,
  },
  metricUnit: {
    fontSize: 11,
    color: "#9CA3AF",
    marginLeft: 4,
  },
  metricUnitCompact: {
    fontSize: 10,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginBottom: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  horizontalSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    overflow: "hidden",
    minHeight: 92,
  },
  recentActivityList: {
    gap: 8,
  },
  recentActivityListCompact: {
    gap: 6,
  },
  horizontalRow: {
    flexDirection: "row",
    gap: 6,
  },
  bpMetricCard: {
    justifyContent: "space-between",
  },
  bpMetricValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  bpMetricValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  bpMetricValueCompact: {
    fontSize: 18,
  },
  bpMetricUnit: {
    fontSize: 10,
    color: "#9CA3AF",
    marginLeft: 4,
  },
  bpStatus: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  sleepScheduleText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  unitToggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  unitToggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  unitToggleButtonActive: {
    borderColor: "#3B82F6",
    backgroundColor: "#DBEAFE",
  },
  unitToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  unitToggleTextActive: {
    color: "#1D4ED8",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  activityList: {
    gap: 6,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 8,
  },
  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 1,
  },
  activityTime: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  quickActionsGrid: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
  latestQuickLogCard: {
    marginTop: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 8,
  },
  latestQuickLogTitle: {
    fontSize: 10,
    color: "#047857",
    fontWeight: "600",
    marginBottom: 2,
  },
  latestQuickLogValue: {
    fontSize: 11,
    color: "#065F46",
  },
  fab: {
    position: "absolute",
    bottom: 86,
    right: 14,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomNavigation: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingBottom: 6,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  navLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
    fontWeight: "600",
  },
  // Voice Assistant Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000080",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  voiceModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  voiceModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  voiceModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  selectedTypeLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  listeningContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  listeningLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 24,
  },
  pulseContainer: {
    position: "relative",
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  pulseRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#3B82F6",
  },
  microphoneCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  instructionText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  liveTranscript: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    fontSize: 13,
    color: "#111827",
    width: "100%",
    textAlign: "center",
  },
  listeningButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  listeningButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  confirmationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  confirmationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
  },
  confirmationTile: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tileIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  tileName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
  confirmationDetails: {
    alignItems: "center",
    marginVertical: 32,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  detailSubtext: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
    marginTop: 8,
    flex: 1,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  confirmActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  confirmButtonSecondary: {
    backgroundColor: "#E5E7EB",
  },
  confirmButtonSecondaryText: {
    color: "#374151",
  },
  quickLogModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 420,
  },
  quickLogHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  quickLogTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  quickLogLabel: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
    fontWeight: "600",
  },
  quickLogInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
  },
  quickLogNotesInput: {
    minHeight: 90,
  },
  quickLogSaveButton: {
    marginTop: 4,
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  quickLogSaveButtonDisabled: {
    backgroundColor: "#BFDBFE",
  },
  quickLogSaveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
