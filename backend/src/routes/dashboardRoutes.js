import express from "express";
import { ObjectId } from "mongodb";
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

// Infer an alert severity from a symptom log's free-text content. Patient logs
// don't carry an explicit severity, so we derive one from keywords.
function inferSeverityFromLog(log) {
  const value =
    `${log.title || ""} ${log.subtitle || ""} ${log.note || ""}`.toLowerCase();
  if (
    value.includes("severe") ||
    value.includes("chest pain") ||
    value.includes("emergency") ||
    value.includes("faint") ||
    value.includes("can't breathe") ||
    value.includes("cant breathe") ||
    value.includes("unbearable")
  ) {
    return "Critical";
  }
  if (
    value.includes("high") ||
    value.includes("bad") ||
    value.includes("vomit") ||
    value.includes("fever") ||
    value.includes("dizzy") ||
    value.includes("worse")
  ) {
    return "High";
  }
  if (
    value.includes("mild") ||
    value.includes("slight") ||
    value.includes("minor") ||
    value.includes("a little")
  ) {
    return "Low";
  }
  return "Medium";
}

// Returns a {change, trend} pair describing the movement from a previous value
// to a current value, formatted for the analytics stat cards.
function formatChange(current, previous) {
  if (previous === 0 && current === 0) {
    return { change: "—", trend: "up" };
  }
  if (previous === 0) {
    return { change: `+${current}`, trend: "up" };
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return { change: `${pct >= 0 ? "+" : ""}${pct}%`, trend: pct >= 0 ? "up" : "down" };
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
          // Link back to the doctor plan so it can be removed together on delete.
          sourcePlanId: result.insertedId.toString(),
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

// Match a doctor plan whether stored with an ObjectId _id or a plain string id,
// always scoped to the owning doctor.
function buildPlanFilter(email, planId) {
  const orMatches = [{ id: planId }];
  if (ObjectId.isValid(planId)) {
    orMatches.push({ _id: new ObjectId(planId) });
  }
  return { doctorEmail: email, $or: orMatches };
}

router.delete("/doctor/:email/plans/:planId", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { planId } = req.params;
    const db = await getDb();

    const result = await db
      .collection("doctorPlans")
      .deleteOne(buildPlanFilter(email, planId));

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Plan not found." });
    }

    // Remove the mirrored copy from the patient's Plans page if one was created.
    await db
      .collection("patientPlans")
      .deleteMany({ assignedByDoctor: email, sourcePlanId: planId });

    return res.json({ message: "Plan deleted." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to delete doctor plan.", error: String(error) });
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
    const db = await getDb();

    // Patients subscribed to this doctor (linked when they subscribe).
    const patients = await getCollectionDocs(
      "doctorPatients",
      { doctorEmail: email },
      { createdAt: -1 },
      500,
    );
    const patientEmails = patients
      .map((p) => p.patientEmail)
      .filter(Boolean);

    // Real activity: every log written by those subscribed patients.
    const logs = patientEmails.length
      ? await db
          .collection("patientLogs")
          .find({ email: { $in: patientEmails } })
          .sort({ createdAt: -1 })
          .toArray()
      : [];

    const plans = await getCollectionDocs(
      "doctorPlans",
      { doctorEmail: email },
      { createdAt: -1 },
      500,
    );
    const patientPlans = patientEmails.length
      ? await db
          .collection("patientPlans")
          .find({ email: { $in: patientEmails } })
          .toArray()
      : [];

    const totalPatients = patients.length;
    const now = Date.now();
    const DAY = 86400000;
    const within = (date, days) => {
      if (!date) return false;
      const t = new Date(date).getTime();
      return !Number.isNaN(t) && now - t <= days * DAY;
    };
    // True when `date` falls between `from` and `to` days ago (a past window).
    const inWindow = (date, fromDays, toDays) => {
      if (!date) return false;
      const t = new Date(date).getTime();
      if (Number.isNaN(t)) return false;
      const age = now - t;
      return age > fromDays * DAY && age <= toDays * DAY;
    };

    // ---- Group logs per patient and compute real per-patient metrics ----
    const logsByPatient = {};
    logs.forEach((log) => {
      (logsByPatient[log.email] ||= []).push(log);
    });

    const patientUpdates = [];
    const patientsWithMetrics = patients.map((patient) => {
      const pLogs = logsByPatient[patient.patientEmail] || [];
      // Adherence = share of the last 7 days on which the patient logged at
      // least once (a real engagement signal derived from their activity).
      const daysLogged = new Set();
      let openSymptoms = 0;
      pLogs.forEach((log) => {
        if (within(log.createdAt, 7)) {
          daysLogged.add(new Date(log.createdAt).toDateString());
        }
        if (log.type === "symptom" && within(log.createdAt, 7)) {
          openSymptoms += 1;
        }
      });
      const adherence = Math.round((daysLogged.size / 7) * 100);
      const lastLog = pLogs[0]; // logs are sorted newest first
      const lastActivity = lastLog
        ? formatTimeAgo(new Date(lastLog.createdAt))
        : "No activity";
      const planCount = patientPlans.filter(
        (pl) => pl.email === patient.patientEmail,
      ).length;
      const trend =
        adherence >= 70 ? "up" : adherence >= 40 ? "stable" : "down";

      // Persist the freshly computed metrics so the Patients page reflects them.
      patientUpdates.push({
        updateOne: {
          filter: { doctorEmail: email, patientEmail: patient.patientEmail },
          update: {
            $set: {
              adherence,
              alerts: openSymptoms,
              lastActivity,
              logsCount: pLogs.length,
              planCount,
              trend,
              metricsUpdatedAt: new Date(),
            },
          },
        },
      });

      return {
        ...patient,
        adherence,
        alerts: openSymptoms,
        lastActivity,
        logsCount: pLogs.length,
        planCount,
        trend,
      };
    });

    if (patientUpdates.length) {
      await db.collection("doctorPatients").bulkWrite(patientUpdates);
    }

    // ---- Stat cards (current vs previous 7-day window) ----
    const newPatientsThisWeek = patients.filter((p) =>
      within(p.createdAt, 7),
    ).length;
    const newPatientsPrevWeek = patients.filter((p) =>
      inWindow(p.createdAt, 7, 14),
    ).length;

    const activeThisWeek = patientsWithMetrics.filter((p) =>
      (logsByPatient[p.patientEmail] || []).some((l) => within(l.createdAt, 7)),
    ).length;
    const activePrevWeek = patientsWithMetrics.filter((p) =>
      (logsByPatient[p.patientEmail] || []).some((l) =>
        inWindow(l.createdAt, 7, 14),
      ),
    ).length;

    const logsThisWeek = logs.filter((l) => within(l.createdAt, 7)).length;
    const logsPrevWeek = logs.filter((l) =>
      inWindow(l.createdAt, 7, 14),
    ).length;

    const plansThisWeek = plans.filter((p) => within(p.createdAt, 7)).length;
    const plansPrevWeek = plans.filter((p) =>
      inWindow(p.createdAt, 7, 14),
    ).length;

    const patientChange = formatChange(
      newPatientsThisWeek,
      newPatientsPrevWeek,
    );
    const activeChange = formatChange(activeThisWeek, activePrevWeek);
    const logsChange = formatChange(logsThisWeek, logsPrevWeek);
    const plansChange = formatChange(plansThisWeek, plansPrevWeek);

    const stats = [
      {
        id: "1",
        title: "Total Patients",
        value: String(totalPatients),
        change: patientChange.change,
        trend: patientChange.trend,
        color: "#3B82F6",
        icon: "account-group",
      },
      {
        id: "2",
        title: "Active This Week",
        value: String(activeThisWeek),
        change: activeChange.change,
        trend: activeChange.trend,
        color: "#10B981",
        icon: "pulse",
      },
      {
        id: "3",
        title: "Logs This Week",
        value: String(logsThisWeek),
        change: logsChange.change,
        trend: logsChange.trend,
        color: "#F59E0B",
        icon: "notebook-check",
      },
      {
        id: "4",
        title: "Plans Assigned",
        value: String(plans.length),
        change: plansChange.change,
        trend: plansChange.trend,
        color: "#8B5CF6",
        icon: "clipboard-text",
      },
    ];

    // ---- Patients by condition: one entry per patient, labelled by name with
    // their condition(s) shown alongside (from real patient profiles). ----
    const patientsByCondition = patients.map((p, index) => {
      const conditions = (p.conditions || []).filter(Boolean);
      return {
        label: p.name || (p.patientEmail || "").split("@")[0] || "Patient",
        condition: conditions.length ? conditions.join(", ") : "No condition",
        value: 1,
        percentage: totalPatients
          ? Math.round((1 / totalPatients) * 1000) / 10
          : 0,
      };
    });

    if (patientsByCondition.length === 0) {
      patientsByCondition.push({
        label: "No data",
        condition: "",
        value: 0,
        percentage: 0,
      });
    }

    // ---- Weekly activity (real per-day log counts, last 7 days oldest→newest) ----
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const dailyCounts = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(today.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const count = logs.filter((log) => {
        const created = new Date(log.createdAt);
        return created >= dayStart && created < dayEnd;
      }).length;

      dailyCounts.push({ label: dayNames[dayStart.getDay()], value: count });
    }
    const maxDailyCount = Math.max(1, ...dailyCounts.map((d) => d.value));
    const weeklyActivity = dailyCounts.map((d) => ({
      ...d,
      percentage: Math.round((d.value / maxDailyCount) * 100),
    }));

    // ---- Activity breakdown by log type (real) ----
    const typeMeta = {
      meal: { label: "Meals", color: "#F59E0B" },
      exercise: { label: "Exercise", color: "#3B82F6" },
      vitals: { label: "Vitals", color: "#EF4444" },
      medication: { label: "Medication", color: "#EC4899" },
      symptom: { label: "Symptoms", color: "#8B5CF6" },
    };
    const typeCounts = {};
    logs.forEach((log) => {
      const t = typeMeta[log.type] ? log.type : "symptom";
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const totalTyped = Object.values(typeCounts).reduce((s, v) => s + v, 0) || 1;
    const activityBreakdown = Object.keys(typeMeta)
      .map((type) => ({
        label: typeMeta[type].label,
        value: typeCounts[type] || 0,
        color: typeMeta[type].color,
        percentage: Math.round(((typeCounts[type] || 0) / totalTyped) * 1000) / 10,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    // ---- Alert distribution: symptom logs grouped by inferred severity ----
    const symptomLogs = logs.filter((log) => log.type === "symptom");
    const severityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    symptomLogs.forEach((log) => {
      severityCounts[inferSeverityFromLog(log)] += 1;
    });
    const totalSymptoms = symptomLogs.length || 1;
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
        percentage: Math.round((count / totalSymptoms) * 1000) / 10,
      }),
    );

    // ---- Performance metrics (all derived from real activity) ----
    const adherenceValues = patientsWithMetrics.map((p) => p.adherence);
    const avgAdherence = adherenceValues.length
      ? Math.round(
          adherenceValues.reduce((sum, n) => sum + n, 0) /
            adherenceValues.length,
        )
      : 0;
    const activeRate = totalPatients
      ? Math.round((activeThisWeek / totalPatients) * 100)
      : 0;
    const patientsWithPlan = patientsWithMetrics.filter(
      (p) => p.planCount > 0,
    ).length;
    const planCoverage = totalPatients
      ? Math.round((patientsWithPlan / totalPatients) * 100)
      : 0;
    const engagedLast30 = patientsWithMetrics.filter((p) =>
      (logsByPatient[p.patientEmail] || []).some((l) => within(l.createdAt, 30)),
    ).length;
    const engagementRate = totalPatients
      ? Math.round((engagedLast30 / totalPatients) * 100)
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
        {
          label: "30-Day Engagement",
          value: engagementRate,
          color: "#8B5CF6",
        },
      );
    }

    // ---- Key insights (generated from real activity) ----
    const newPatients30 = patients.filter((p) =>
      within(p.createdAt, 30),
    ).length;
    const criticalSymptoms7 = symptomLogs.filter(
      (log) => within(log.createdAt, 7) && inferSeverityFromLog(log) === "Critical",
    ).length;
    const inactivePatients = patientsWithMetrics.filter(
      (p) => !(logsByPatient[p.patientEmail] || []).some((l) => within(l.createdAt, 7)),
    ).length;

    const insights = [];
    if (totalPatients === 0) {
      insights.push({
        id: "no-patients",
        icon: "people",
        color: "#6B7280",
        text: "No patients have subscribed to you yet. Analytics will populate as patients join and log activity.",
      });
    }
    if (newPatients30 > 0) {
      insights.push({
        id: "new-patients",
        icon: "people",
        color: "#F59E0B",
        text: `${newPatients30} new patient${newPatients30 === 1 ? "" : "s"} subscribed in the last 30 days`,
      });
    }
    if (logsThisWeek > 0) {
      insights.push({
        id: "logs",
        icon: "create",
        color: "#10B981",
        text: `${logsThisWeek} activit${logsThisWeek === 1 ? "y" : "ies"} logged by your patients this week`,
      });
    }
    if (criticalSymptoms7 > 0) {
      insights.push({
        id: "critical",
        icon: "alert-circle",
        color: "#EF4444",
        text: `${criticalSymptoms7} critical symptom${criticalSymptoms7 === 1 ? "" : "s"} reported in the last 7 days`,
      });
    }
    if (inactivePatients > 0 && totalPatients > 0) {
      insights.push({
        id: "inactive",
        icon: "alert",
        color: "#F59E0B",
        text: `${inactivePatients} patient${inactivePatients === 1 ? " has" : "s have"} not logged anything this week`,
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
      totalLogs: logs.length,
      patientsByCondition,
      weeklyActivity,
      activityBreakdown,
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
