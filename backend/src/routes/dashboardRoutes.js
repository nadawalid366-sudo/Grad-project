import express from "express";
import { ObjectId } from "mongodb";
import { requireRole, requireSelf } from "../auth/authMiddleware.js";
import { getDb } from "../db/mongoClient.js";
import { groqService } from "../ai-chat/services/groqService.js";

const router = express.Router();

// Reusable guards: patient routes are self-only; doctor routes additionally
// require the professional role.
const patientOnly = requireSelf();
const doctorOnly = [requireRole("professional"), requireSelf()];

function formatTimeAgo(dateInput) {
  const date = new Date(dateInput);
  if (isNaN(date)) return "Just now";
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

async function getCollectionDocs(
  collectionName,
  query = {},
  sort = {},
  limit = 0,
) {
  const db = await getDb();
  let cursor = db.collection(collectionName).find(query);
  if (Object.keys(sort).length > 0) cursor = cursor.sort(sort);
  if (limit > 0) cursor = cursor.limit(limit);
  return cursor.toArray();
}

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapPlanTypeToPatientType(planType = "") {
  const value = planType.toLowerCase();
  if (value.includes("meal") || value.includes("diet") || value.includes("nutrition")) {
    return "meal";
  }
  if (value.includes("workout") || value.includes("exercise") || value.includes("fitness")) {
    return "exercise";
  }
  if (value.includes("medication") || value.includes("medicine")) {
    return "medication";
  }
  return "general";
}

function normalizeLogType(type = "", title = "", subtitle = "", note = "") {
  // If the explicit type is passed and valid, strictly keep it.
  const validTypes = ["meal", "exercise", "vitals", "medication", "symptom", "water", "sleep"];
  if (validTypes.includes(type)) return type;

  const value = `${type} ${title} ${subtitle} ${note}`.toLowerCase();

  if (
    value.includes("meal") ||
    value.includes("food") ||
    value.includes("breakfast") ||
    value.includes("lunch") ||
    value.includes("dinner") ||
    value.includes("snack")
  ) {
    return "meal";
  }

  if (
    value.includes("exercise") ||
    value.includes("workout") ||
    value.includes("walk") ||
    value.includes("run") ||
    value.includes("jog") ||
    value.includes("activity")
  ) {
    return "exercise";
  }

  if (
    value.includes("vital") ||
    value.includes("blood pressure") ||
    value.includes("bp") ||
    value.includes("glucose") ||
    value.includes("pulse") ||
    value.includes("heart rate")
  ) {
    return "vitals";
  }

  if (
    value.includes("medication") ||
    value.includes("medicine") ||
    value.includes("pill") ||
    value.includes("dose") ||
    value.includes("tablet")
  ) {
    return "medication";
  }

  if (
    value.includes("symptom") ||
    value.includes("pain") ||
    value.includes("headache") ||
    value.includes("nausea") ||
    value.includes("fever") ||
    value.includes("cough")
  ) {
    return "symptom";
  }

  if (value.includes("water") || value.includes("drink") || value.includes("glass")) {
    return "water";
  }

  if (value.includes("sleep") || value.includes("bed") || value.includes("nap")) {
    return "sleep";
  }


  return "symptom";
}

router.get("/patient/:email", patientOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const db = await getDb();
    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const logs = await getCollectionDocs(
      "patientLogs",
      { email },
      { createdAt: -1 },
      100, // Fetch up to 100 for the frontend feed
    );
    const plans = await getCollectionDocs(
      "patientPlans",
      { email },
      { createdAt: -1 },
      20,
    );
    const messages = await getCollectionDocs(
      "patientMessages",
      { email },
      { createdAt: 1 },
      50,
    );

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaysLogs = await getCollectionDocs(
      "patientLogs",
      { email, createdAt: { $gte: startOfToday } },
      { createdAt: -1 },
      200
    );

    let totalCalories = 0;
    let totalWater = 0;
    let totalMedication = 0;
    let totalSleep = 0;

    todaysLogs.forEach(l => {
      if (l.type === "meal" && l.details?.calories) totalCalories += Number(l.details.calories);
      if (l.type === "water" && l.details?.amount) totalWater += Number(l.details.amount);
      if (l.type === "medication" && l.details?.taken) totalMedication += Number(l.details.taken);
      if (l.type === "sleep" && l.details?.hours) totalSleep += Number(l.details.hours);
    });

    // User-editable health metrics (calories, sleep schedule, water intake).
    // Stored per patient; fall back to computed/default values when unset.
    const stored = await db.collection("patientMetrics").findOne({ email });
    const healthMetrics = {
      calories: {
        current: totalCalories,
        goal: stored?.calories?.goal ?? 2000,
      },
      sleep: {
        hours: totalSleep,
        bedtime: stored?.sleep?.bedtime ?? "23:00",
        wakeTime: stored?.sleep?.wakeTime ?? "07:00",
      },
      water: {
        amount: totalWater,
        unit: stored?.water?.unit ?? "glasses",
        goal: stored?.water?.goal ?? 8,
      },
      medication: {
        taken: totalMedication,
        goal: stored?.medication?.goal ?? 2,
      }
    };

    // Calculate a basic health score (0.0 to 10.0)
    let score = 2.0; // Base score just for using the app
    
    // Water (up to 3 points)
    const waterGoal = healthMetrics.water.goal > 0 ? healthMetrics.water.goal : 8;
    score += Math.min(totalWater / waterGoal, 1) * 3.0;

    // Sleep (up to 2 points)
    score += Math.min(totalSleep / 8, 1) * 2.0;

    // Medication (up to 1.5 points)
    if (healthMetrics.medication.goal > 0) {
      score += Math.min(totalMedication / healthMetrics.medication.goal, 1) * 1.5;
    } else {
      score += 1.5; // No meds needed, free points
    }

    // Calories (up to 1.5 points)
    if (totalCalories > 0 && totalCalories <= healthMetrics.calories.goal * 1.2) {
      score += 1.5;
    }

    const healthScore = Math.min(score, 10.0);

    const metrics = [
      {
        id: "calories",
        title: "Today's Calories",
        current: healthMetrics.calories.current,
        goal: healthMetrics.calories.goal,
        unit: "kcal",
        icon: "fire",
        color: "#10B981",
        backgroundColor: "#DCFCE7",
      },
      {
        id: "medication",
        title: "Medication",
        current: totalMedication > 0 ? 100 : 0,
        goal: 100,
        unit: "%",
        icon: "pill",
        color: "#EC4899",
        backgroundColor: "#FCE7F3",
      },
    ];

    const recentActivities = logs.slice(0, 5).map((log) => ({
      id: log._id?.toString() || log.id || "1",
      title: `${log.type === "meal" ? "Logged" : "Recorded"} ${log.title || log.subtitle || "Health log"}`,
      timeAgo: log.timestamp || formatTimeAgo(new Date(log.createdAt)),
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
    }));

    const quickActions = [
      {
        id: "1",
        label: "Log Meal",
        icon: "silverware-fork-knife",
        color: "#F59E0B",
      },
      { id: "2", label: "Log Exercise", icon: "dumbbell", color: "#3B82F6" },
      { id: "3", label: "Log Vitals", icon: "heart-pulse", color: "#EF4444" },
      {
        id: "4",
        label: "Log Symptom",
        icon: "emoticon-sad-outline",
        color: "#8B5CF6",
      },
      { id: "5", label: "Log Medication", icon: "pill", color: "#EC4899" },
    ];

    return res.json({
      user: {
        email: user.email,
        fullName: user.profile?.fullName || user.email.split("@")[0],
        age: user.profile?.age || "",
        height: user.profile?.height || "",
        weight: user.profile?.weight || "",
        phone: user.phone || "",
      },
      healthScore,
      metrics,
      healthMetrics,
      recentActivities,
      quickActions,
      logs,
      plans,
      messages,
      professionals: [],
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "Failed to load patient dashboard.",
        error: String(error),
      });
  }
});

router.post("/patient/:email/logs", patientOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { type, title, subtitle, note, isVoice, transcript, details } = req.body;
    let logType = type;
    let logTitle = title;
    let logSubtitle = subtitle || note || "";
    let logDetails = details || {};

    if (isVoice && transcript && !details) {
      // Use Groq to intelligently parse the voice transcript if details aren't provided
      const parsed = await groqService.classifyVoiceInput(transcript);
      logType = type || parsed.type;
      logTitle = parsed.title;
      logSubtitle = transcript;
      logDetails = parsed.details || {};
    } else if (!isVoice) {
      logType = normalizeLogType(type, title, subtitle, note);
    }

    const db = await getDb();
    const result = await db.collection("patientLogs").insertOne({
      email,
      type: logType,
      title: logTitle,
      subtitle: logSubtitle,
      note: note || "",
      details: logDetails,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res
      .status(201)
      .json({ message: "Log saved.", logId: result.insertedId.toString() });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to save log.", error: String(error) });
  }
});

// Build a Mongo filter that matches a log whether it was stored with an ObjectId
// _id (the normal case) or a plain string id (older/seeded records).
function buildLogFilter(email, logId) {
  const orMatches = [{ id: logId }];
  if (ObjectId.isValid(logId)) {
    orMatches.push({ _id: new ObjectId(logId) });
  }
  return { email, $or: orMatches };
}

router.put("/patient/:email/logs/:logId", patientOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { logId } = req.params;
    const { type, title, subtitle, note } = req.body;
    const db = await getDb();

    const normalizedType = normalizeLogType(type, title, subtitle, note);
    const set = {
      type: normalizedType,
      title: title || "",
      subtitle: subtitle || note || "",
      note: note || "",
      updatedAt: new Date(),
    };

    const result = await db
      .collection("patientLogs")
      .updateOne(buildLogFilter(email, logId), { $set: set });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Log not found." });
    }

    return res.json({ message: "Log updated." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to update log.", error: String(error) });
  }
});

router.delete("/patient/:email/logs/:logId", patientOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { logId } = req.params;
    const db = await getDb();

    const result = await db
      .collection("patientLogs")
      .deleteOne(buildLogFilter(email, logId));

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Log not found." });
    }

    return res.json({ message: "Log deleted." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to delete log.", error: String(error) });
  }
});

router.put("/patient/:email/metrics", patientOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { calories, sleep, water } = req.body;
    const db = await getDb();

    const set = { updatedAt: new Date() };
    if (calories) {
      set.calories = {
        current: Number(calories.current) || 0,
        goal: Number(calories.goal) || 2000,
      };
    }
    if (sleep) {
      set.sleep = {
        bedtime: String(sleep.bedtime || "23:00"),
        wakeTime: String(sleep.wakeTime || "07:00"),
      };
    }
    if (water) {
      const unit = water.unit === "litres" ? "litres" : "cups";
      set.water = {
        amount: Number(water.amount) || 0,
        unit,
        goal: Number(water.goal) || (unit === "litres" ? 2 : 8),
      };
    }

    await db.collection("patientMetrics").updateOne(
      { email },
      { $set: set, $setOnInsert: { email, createdAt: new Date() } },
      { upsert: true },
    );

    return res.json({ message: "Health metrics saved." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to save metrics.", error: String(error) });
  }
});

router.post("/patient/:email/plans", patientOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { title, description, type } = req.body;
    const db = await getDb();

    const result = await db.collection("patientPlans").insertOne({
      email,
      title,
      description,
      type: type || "general",
      status: "Active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res
      .status(201)
      .json({ message: "Plan saved.", planId: result.insertedId.toString() });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to save plan.", error: String(error) });
  }
});

router.get("/doctor/:email", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const db = await getDb();
    const doctor = await db.collection("doctors").findOne({ email });
    const profile = doctor || { email, doctorName: "Doctor" };

    const alerts = await getCollectionDocs(
      "doctorAlerts",
      {},
      { createdAt: -1 },
      50,
    );
    // Fetch patient-doctor links, then join with real patient data from users collection
    const patientLinks = await getCollectionDocs(
      "doctorPatients",
      { doctorEmail: email },
      { createdAt: -1 },
      50,
    );

    // Enrich patient links with actual patient data from users collection
    const patients = [];
    for (const link of patientLinks) {
      const patient = await db
        .collection("users")
        .findOne({ email: link.patientEmail });
      if (patient) {
        patients.push({
          id: patient._id?.toString() || link.patientId,
          patientId: link.patientId,
          fullName: patient.profile?.fullName || patient.email.split("@")[0],
          email: patient.email,
          status: link.status || "active",
          healthScore: patient.healthScore || 5,
          phone: patient.phone || "",
          age: patient.profile?.age || "",
          height: patient.profile?.height || "",
          weight: patient.profile?.weight || "",
          assignedAt: link.assignedAt,
        });
      }
    }
    const plans = await getCollectionDocs(
      "doctorPlans",
      { doctorEmail: email },
      { createdAt: -1 },
      50,
    );
    const activities = await getCollectionDocs(
      "doctorActivities",
      {},
      { createdAt: -1 },
      50,
    );

    const activePatients = patients.length;
    const pendingAlerts = alerts.filter((a) => !a.isResolved).length;
    const criticalAlerts = alerts.filter(
      (a) => !a.isResolved && a.severity === "Critical",
    ).length;

    const metrics = [
      {
        id: "patients",
        title: "Total Active Patients",
        value: String(activePatients),
        subtitle: "Registered",
        icon: "account-group",
        color: "#3B82F6",
        backgroundColor: "#DBEAFE",
      },
      {
        id: "alerts",
        title: "Pending Alerts",
        value: String(pendingAlerts),
        subtitle:
          criticalAlerts > 0 ? `${criticalAlerts} critical` : "All clear",
        icon: "alert-circle",
        color: "#EF4444",
        backgroundColor: "#FEE2E2",
      },
      {
        id: "plans",
        title: "Plans Assigned",
        value: String(plans.length),
        subtitle: "Total",
        icon: "clipboard-text",
        color: "#10B981",
        backgroundColor: "#D1FAE5",
      },
    ];

    return res.json({
      doctor: profile,
      metrics,
      recentAlerts: alerts.slice(0, 5),
      patientActivity: activities.slice(0, 5),
      patients,
      plans,
      analytics: null,
    });
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "Failed to load doctor dashboard.",
        error: String(error),
      });
  }
});

router.post("/doctor/:email/plans", doctorOnly, async (req, res) => {
// TEST ENDPOINT: Assign sample patients to a doctor (for testing/seeding)
router.post("/assign-test-patients", async (req, res) => {
  try {
    const { doctorEmail } = req.body;

    if (!doctorEmail) {
      return res.status(400).json({ message: "Doctor email is required." });
    }

    const normalizedDoctorEmail = doctorEmail.toLowerCase();
    const db = await getDb();

    // Verify doctor exists
    const doctor = await db
      .collection("doctors")
      .findOne({ email: normalizedDoctorEmail });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    // Get first 5 patients from users collection
    const testPatients = await db
      .collection("users")
      .find({})
      .limit(5)
      .toArray();

    if (testPatients.length === 0) {
      return res.status(404).json({ message: "No patients available for assignment." });
    }

    const assignments = [];
    for (const patient of testPatients) {
      // Check if already assigned
      const existing = await db
        .collection("doctorPatients")
        .findOne({
          doctorEmail: normalizedDoctorEmail,
          patientEmail: patient.email,
        });

      if (!existing) {
        const result = await db.collection("doctorPatients").insertOne({
          doctorEmail: normalizedDoctorEmail,
          doctorId: doctor._id.toString(),
          patientEmail: patient.email,
          patientId: patient._id.toString(),
          assignedAt: new Date(),
          status: "active",
        });
        assignments.push({
          id: result.insertedId.toString(),
          patientEmail: patient.email,
          patientName: patient.profile?.fullName || patient.email.split("@")[0],
        });
      }
    }

    return res.status(201).json({
      message: `Successfully assigned ${assignments.length} test patient(s) to doctor.`,
      assignments,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to assign test patients.",
      error: String(error),
    });
  }
});

router.post("/doctor/:email/plans", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const {
      patientName,
      patientAge,
      planType,
      status,
      startDate,
      endDate,
      adherence,
      description,
      goals,
    } = req.body;
    const db = await getDb();

    const result = await db.collection("doctorPlans").insertOne({
      doctorEmail: email,
      patientName,
      patientAge,
      planType,
      status,
      startDate,
      endDate,
      adherence,
      description,
      goals,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // If this plan targets one of the doctor's subscribed patients, also surface
    // it on that patient's Plans page.
    if (patientName) {
      const patient = await db.collection("doctorPatients").findOne({
        doctorEmail: email,
        name: { $regex: `^${escapeRegex(patientName.trim())}$`, $options: "i" },
      });

      if (patient?.patientEmail) {
        await db.collection("patientPlans").insertOne({
          email: patient.patientEmail,
          title: planType || "Care Plan",
          description:
            description ||
            (Array.isArray(goals) && goals.length
              ? `Goals: ${goals.join(", ")}`
              : ""),
          type: mapPlanTypeToPatientType(planType),
          status: status || "Active",
          assignedByDoctor: email,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return res
      .status(201)
      .json({
        message: "Doctor plan saved.",
        planId: result.insertedId.toString(),
      });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to save doctor plan.", error: String(error) });
  }
});

router.get("/doctor/:email/alerts", doctorOnly, async (_req, res) => {
  try {
    const alerts = await getCollectionDocs(
      "doctorAlerts",
      {},
      { createdAt: -1 },
      50,
    );
    return res.json({ alerts });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to load alerts.", error: String(error) });
  }
});

router.patch(
  "/doctor/:email/alerts/:alertId/resolve",
  doctorOnly,
  async (req, res) => {
  try {
    const { alertId } = req.params;
    const db = await getDb();

    await db
      .collection("doctorAlerts")
      .updateOne(
        { id: alertId },
        { $set: { isResolved: true, updatedAt: new Date() } },
      );

    return res.json({ message: "Alert resolved." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to resolve alert.", error: String(error) });
  }
});

router.get("/doctor/:email/patients", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const patients = await getCollectionDocs(
      "doctorPatients",
      { doctorEmail: email },
      { createdAt: -1 },
      50,
    );
    return res.json({ patients });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to load patients.", error: String(error) });
  }
});

router.get("/doctor/:email/analytics", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();

    const patients = await getCollectionDocs(
      "doctorPatients",
      { doctorEmail: email },
      { createdAt: -1 },
      200,
    );
    const alerts = await getCollectionDocs(
      "doctorAlerts",
      {},
      { createdAt: -1 },
      200,
    );
    const plans = await getCollectionDocs(
      "doctorPlans",
      { doctorEmail: email },
      { createdAt: -1 },
      200,
    );
    const activities = await getCollectionDocs(
      "doctorActivities",
      {},
      { createdAt: -1 },
      200,
    );

    const totalPatients = patients.length;
    const resolvedAlerts = alerts.filter((a) => a.isResolved).length;

    const stats = [
      {
        id: "1",
        title: "Total Patients",
        value: String(totalPatients),
        change: "-",
        trend: "up",
        color: "#3B82F6",
        icon: "account-group",
      },
      {
        id: "2",
        title: "Active Cases",
        value: String(patients.filter((p) => p.adherence > 70).length),
        change: "-",
        trend: "up",
        color: "#10B981",
        icon: "medical-bag",
      },
      {
        id: "3",
        title: "Alerts Resolved",
        value: String(resolvedAlerts),
        change: "-",
        trend: "up",
        color: "#F59E0B",
        icon: "alert-circle-check",
      },
      {
        id: "4",
        title: "Plans Assigned",
        value: String(plans.length),
        change: "-",
        trend: "up",
        color: "#8B5CF6",
        icon: "clipboard-text",
      },
    ];

    const conditionCounts = {};
    patients.forEach((p) => {
      (p.conditions || []).forEach((condition) => {
        conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
      });
    });

    const totalConditions =
      Object.values(conditionCounts).reduce((sum, value) => sum + value, 0) ||
      1;
    const patientsByCondition = Object.entries(conditionCounts).map(
      ([label, value]) => ({
        label,
        value,
        percentage: Math.round((value / totalConditions) * 1000) / 10,
      }),
    );

    if (patientsByCondition.length === 0) {
      patientsByCondition.push({ label: "No data", value: 0, percentage: 0 });
    }

    // Real per-day activity counts for the last 7 calendar days (oldest first).
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const dailyCounts = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(today.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const count = activities.filter((activity) => {
        const created = new Date(activity.createdAt);
        return created >= dayStart && created < dayEnd;
      }).length;

      dailyCounts.push({ label: dayNames[dayStart.getDay()], value: count });
    }
    const maxDailyCount = Math.max(1, ...dailyCounts.map((d) => d.value));
    const weeklyActivity = dailyCounts.map((d) => ({
      ...d,
      percentage: Math.round((d.value / maxDailyCount) * 100),
    }));

    const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    alerts.forEach((alert) => {
      if (severityCounts[alert.severity] !== undefined)
        severityCounts[alert.severity] += 1;
    });

    const totalAlerts = alerts.length || 1;
    const alertTrends = Object.entries(severityCounts).map(
      ([severity, count]) => ({
        severity,
        count,
        color:
          severity === "Critical"
            ? "#EF4444"
            : severity === "High"
              ? "#F59E0B"
              : severity === "Medium"
                ? "#3B82F6"
                : "#10B981",
        percentage: Math.round((count / totalAlerts) * 1000) / 10,
      }),
    );

    // Performance metrics derived from real patient/alert/plan records.
    const adherenceValues = patients
      .map((p) => Number(p.adherence))
      .filter((n) => !Number.isNaN(n));
    const avgAdherence = adherenceValues.length
      ? Math.round(
          adherenceValues.reduce((sum, n) => sum + n, 0) /
            adherenceValues.length,
        )
      : 0;
    const activeRate = totalPatients
      ? Math.round(
          (patients.filter((p) => p.adherence > 70).length / totalPatients) *
            100,
        )
      : 0;
    const alertResolutionRate = alerts.length
      ? Math.round((resolvedAlerts / alerts.length) * 100)
      : 0;
    const planCoverage = totalPatients
      ? Math.min(100, Math.round((plans.length / totalPatients) * 100))
      : 0;

    const performanceMetrics = [];
    if (totalPatients > 0) {
      performanceMetrics.push(
        {
          label: "Average Patient Adherence",
          value: avgAdherence,
          color: "#10B981",
        },
        { label: "Active Patient Rate", value: activeRate, color: "#3B82F6" },
        { label: "Care Plan Coverage", value: planCoverage, color: "#F59E0B" },
      );
    }
    if (alerts.length > 0) {
      performanceMetrics.push({
        label: "Alert Resolution Rate",
        value: alertResolutionRate,
        color: "#8B5CF6",
      });
    }

    // Key insights generated from real activity over recent time windows.
    const now = Date.now();
    const within = (date, days) => {
      if (!date) return false;
      const t = new Date(date).getTime();
      return !Number.isNaN(t) && now - t <= days * 86400000;
    };
    const newPatients30 = patients.filter((p) =>
      within(p.createdAt, 30),
    ).length;
    const resolved7 = alerts.filter(
      (a) => a.isResolved && within(a.updatedAt || a.createdAt, 7),
    ).length;
    const criticalPending = alerts.filter(
      (a) => !a.isResolved && a.severity === "Critical",
    ).length;

    const insights = [];
    if (newPatients30 > 0) {
      insights.push({
        id: "new-patients",
        icon: "people",
        color: "#F59E0B",
        text: `${newPatients30} new patient${newPatients30 === 1 ? "" : "s"} added in the last 30 days`,
      });
    }
    if (resolved7 > 0) {
      insights.push({
        id: "resolved",
        icon: "checkmark-circle",
        color: "#10B981",
        text: `${resolved7} alert${resolved7 === 1 ? "" : "s"} resolved in the last 7 days`,
      });
    }
    if (criticalPending > 0) {
      insights.push({
        id: "critical",
        icon: "alert-circle",
        color: "#EF4444",
        text: `${criticalPending} critical alert${criticalPending === 1 ? "" : "s"} awaiting response`,
      });
    }
    if (avgAdherence > 0) {
      insights.push({
        id: "adherence",
        icon: "trending-up",
        color: "#3B82F6",
        text: `Average patient adherence is ${avgAdherence}%`,
      });
    }

    return res.json({
      stats,
      totalPatients,
      patientsByCondition,
      weeklyActivity,
      alertTrends,
      performanceMetrics,
      insights,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to load analytics.", error: String(error) });
  }
});

router.get("/messages/:email", patientOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const messages = await getCollectionDocs(
      "patientMessages",
      { email },
      { createdAt: 1 },
      100,
    );
    return res.json({ messages });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to load messages.", error: String(error) });
  }
});

router.post("/messages/:email", patientOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { doctorId, doctorName, message } = req.body;
    const db = await getDb();

    const result = await db.collection("patientMessages").insertOne({
      email,
      doctorId,
      doctorName,
      sender: "patient",
      message,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res
      .status(201)
      .json({
        message: "Message sent.",
        messageId: result.insertedId.toString(),
      });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to send message.", error: String(error) });
  }
});

router.get("/doctor/:email/messages", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const db = await getDb();
    const doc = await db.collection("professionals").findOne({ email });
    if (!doc) return res.status(404).json({ message: "Doctor not found" });

    const messages = await db.collection("patientMessages").find({
      doctorId: doc._id.toString()
    }).sort({ createdAt: 1 }).limit(200).toArray();

    return res.json({ messages });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to load messages.", error: String(error) });
  }
});

router.post("/doctor/:email/messages", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const db = await getDb();
    const doc = await db.collection("professionals").findOne({ email });
    if (!doc) return res.status(404).json({ message: "Doctor not found" });

    const { patientEmail, message } = req.body;
    const result = await db.collection("patientMessages").insertOne({
      email: patientEmail,
      doctorId: doc._id.toString(),
      doctorName: doc.fullName || "Care Team",
      sender: "doctor",
      message,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res
      .status(201)
      .json({
        message: "Message sent.",
        messageId: result.insertedId.toString(),
      });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to send message.", error: String(error) });
  }
});

export default router;
