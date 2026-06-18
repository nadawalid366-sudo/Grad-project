import express from "express";
import { getDb } from "../db/mongoClient.js";

const router = express.Router();

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

router.get("/patient/:email", async (req, res) => {
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
    const exerciseLogs = logs.filter((l) => l.type === "exercise").length;
    const medicationLogs = logs.filter((l) => l.type === "medication").length;

    const metrics = [
      {
        id: "calories",
        title: "Today's Calories",
        current: mealLogs * 400,
        goal: 2000,
        unit: "kcal",
        icon: "flame",
        color: "#10B981",
        backgroundColor: "#DCFCE7",
      },
      {
        id: "activity",
        title: "Activity Minutes",
        current: exerciseLogs * 30,
        goal: 60,
        unit: "min",
        icon: "run",
        color: "#3B82F6",
        backgroundColor: "#DBEAFE",
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

router.post("/patient/:email/logs", async (req, res) => {
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

router.post("/patient/:email/plans", async (req, res) => {
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

router.get("/doctor/:email", async (req, res) => {
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
      {},
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

router.post("/doctor-login", async (req, res) => {
  try {
    const { email, doctorName, specialty } = req.body;
    if (!email || !doctorName) {
      return res
        .status(400)
        .json({ message: "Email and doctorName are required." });
    }

    const db = await getDb();
    const doctors = db.collection("doctors");
    const now = new Date();
    const normalizedEmail = email.toLowerCase();

    await doctors.updateOne(
      { email: normalizedEmail },
      {
        $set: {
          email: normalizedEmail,
          doctorName,
          specialty: specialty || "General Practitioner",
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    return res.json({
      message: "Doctor signed in.",
      doctor: {
        email: normalizedEmail,
        doctorName,
        specialty: specialty || "General Practitioner",
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to sign in doctor.", error: String(error) });
  }
});

router.post("/doctor/:email/plans", async (req, res) => {
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

router.get("/doctor/:email/alerts", async (_req, res) => {
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

router.patch("/doctor/:email/alerts/:alertId/resolve", async (req, res) => {
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

router.get("/doctor/:email/patients", async (_req, res) => {
  try {
    const patients = await getCollectionDocs(
      "doctorPatients",
      {},
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

router.get("/doctor/:email/analytics", async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();

    const patients = await getCollectionDocs(
      "doctorPatients",
      {},
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

    const weeklyActivity = [
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ].map((label) => {
      const match = activities.filter((activity) => {
        const diffDays = Math.floor(
          (new Date() - new Date(activity.createdAt)) / 86400000,
        );
        return diffDays >= 0 && diffDays < 7;
      }).length;

      return {
        label,
        value: match,
        percentage: match > 0 ? Math.min(100, match * 20) : 0,
      };
    });

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

    return res.json({
      stats,
      patientsByCondition,
      weeklyActivity,
      alertTrends,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to load analytics.", error: String(error) });
  }
});

router.get("/messages/:email", async (req, res) => {
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

router.post("/messages/:email", async (req, res) => {
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
