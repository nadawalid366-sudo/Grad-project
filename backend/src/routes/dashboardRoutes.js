import express from "express";
import { requireRole, requireSelf } from "../auth/authMiddleware.js";
import { getDb } from "../db/mongoClient.js";

const router = express.Router();

// Reusable guards: patient routes are self-only; doctor routes additionally
// require the professional role.
const patientOnly = requireSelf();
const doctorOnly = [requireRole("professional"), requireSelf()];

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

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function normalizeLogType(type = "", title = "", subtitle = "", note = "") {
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
      20,
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

    const mealLogs = logs.filter((l) => l.type === "meal").length;
    const medicationLogs = logs.filter((l) => l.type === "medication").length;

    // User-editable health metrics (calories, sleep schedule, water intake).
    // Stored per patient; fall back to computed/default values when unset.
    const stored = await db.collection("patientMetrics").findOne({ email });
    const healthMetrics = {
      calories: {
        current: stored?.calories?.current ?? mealLogs * 400,
        goal: stored?.calories?.goal ?? 2000,
      },
      sleep: {
        bedtime: stored?.sleep?.bedtime ?? "23:00",
        wakeTime: stored?.sleep?.wakeTime ?? "07:00",
      },
      water: {
        amount: stored?.water?.amount ?? 0,
        unit: stored?.water?.unit ?? "cups",
        goal:
          stored?.water?.goal ??
          (stored?.water?.unit === "litres" ? 2 : 8),
      },
    };

    const metrics = [
      {
        id: "calories",
        title: "Today's Calories",
        current: healthMetrics.calories.current,
        goal: healthMetrics.calories.goal,
        unit: "kcal",
        icon: "flame",
        color: "#10B981",
        backgroundColor: "#DCFCE7",
      },
      {
        id: "medication",
        title: "Medication",
        current: medicationLogs > 0 ? 100 : 0,
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
    const { type, title, subtitle, note } = req.body;
    const normalizedType = normalizeLogType(type, title, subtitle, note);
    const db = await getDb();

    const result = await db.collection("patientLogs").insertOne({
      email,
      type: normalizedType,
      title,
      subtitle: subtitle || note || "",
      note: note || "",
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
    const patients = await getCollectionDocs(
      "doctorPatients",
      { doctorEmail: email },
      { createdAt: -1 },
      50,
    );
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

export default router;
