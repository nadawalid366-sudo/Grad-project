import express from "express";
import { ObjectId } from "mongodb";
import { groqService } from "../ai-chat/services/groqService.js";
import { requireRole, requireSelf } from "../auth/authMiddleware.js";
import { getDb } from "../db/mongoClient.js";

function priorityToSeverity(p) {
  if (p === "RED")    return "Critical";
  if (p === "ORANGE") return "High";
  if (p === "YELLOW") return "Medium";
  return "Low";
}

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

const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };

router.post("/patient/:email/logs", patientOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { type, title, subtitle, note, isVoice, transcript, details } = req.body;
    let logType = type;
    let logTitle = title;
    let logSubtitle = subtitle || note || "";
    let logDetails = details || {};

    if (isVoice && transcript && !details) {
      const parsed = await groqService.classifyVoiceInput(transcript);
      logType = type || parsed.type;
      logTitle = parsed.title;
      logSubtitle = transcript;
      logDetails = parsed.details || {};
    } else if (!isVoice) {
      logType = normalizeLogType(type, title, subtitle, note);
    }

    // AI risk classification → RED / ORANGE / YELLOW / GREEN
    let riskPriority = "GREEN";
    let riskReason = "";
    let riskExplanation = "";
    try {
      const content = `${logTitle}${logSubtitle ? ": " + logSubtitle : ""}`;
      const classified = await groqService.classifyRisk(logType, content, logDetails);
      riskPriority   = classified.priority;
      riskReason     = classified.reason;
      riskExplanation = classified.explanation;
    } catch (e) {
      console.warn("Risk classification failed, defaulting to GREEN:", e.message);
    }

    const db = await getDb();
    const result = await db.collection("patientLogs").insertOne({
      email,
      type: logType,
      title: logTitle,
      subtitle: logSubtitle,
      note: note || "",
      details: logDetails,
      riskPriority,                          // RED / ORANGE / YELLOW / GREEN
      priority: priorityToSeverity(riskPriority), // Critical/High/Medium/Low (backward compat)
      priorityReason: riskReason,
      explanation: riskExplanation,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create doctor alerts for RED, ORANGE, YELLOW — skip GREEN (routine)
    if (riskPriority !== "GREEN") {
      try {
        const user = await db.collection("users").findOne({ email });
        const patientName = user?.profile?.fullName || email.split("@")[0];

        const doctorLinks = await db
          .collection("doctorPatients")
          .find({ patientEmail: email })
          .toArray();

        for (const link of doctorLinks) {
          const alertId = new ObjectId();
          await db.collection("doctorAlerts").insertOne({
            _id: alertId,
            id: alertId.toString(),
            patientEmail: email,
            patientName,
            doctorEmail: link.doctorEmail,
            message: `[${riskPriority}] ${logTitle}${logSubtitle ? `: ${logSubtitle}` : ""}`,
            priority: riskPriority,
            severity: priorityToSeverity(riskPriority),
            reason: riskReason,
            explanation: riskExplanation,
            sourceType: "log",
            logType,
            logId: result.insertedId.toString(),
            isResolved: false,
            createdAt: new Date(),
          });
        }
      } catch (alertErr) {
        console.warn("Failed to create doctor alert:", alertErr.message);
      }
    }

    return res.status(201).json({
      message: "Log saved.",
      logId: result.insertedId.toString(),
      riskPriority,
      priority: priorityToSeverity(riskPriority),
      reason: riskReason,
    });
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
      { doctorEmail: email },
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
      { doctorEmail: email },
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

    // Sort alerts by priority before returning
    alerts.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.severity] ?? 3;
      const pb = PRIORITY_ORDER[b.severity] ?? 3;
      if (pa !== pb) return pa - pb;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

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

// TEST ENDPOINT: Assign sample patients to the authenticated doctor (for testing/seeding)
router.post(
  "/assign-test-patients",
  requireRole("professional"),
  async (req, res) => {
    try {
      const authenticatedDoctorEmail = req.auth.email;
      const normalizedDoctorEmail = authenticatedDoctorEmail;
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

// ── Helper: write a plan copy into patientPlans and update doctorPlans.assignedTo
async function assignPlanToPatient(db, doctorEmail, planId, plan, patientEmail, patientName) {
  const existing = await db.collection("patientPlans").findOne({
    doctorPlanId: planId,
    email: patientEmail,
  });
  if (existing) return existing._id.toString(); // already assigned

  const pp = await db.collection("patientPlans").insertOne({
    email: patientEmail,
    title: plan.planTitle || plan.planType || "Care Plan",
    description: plan.description || "",
    type: mapPlanTypeToPatientType(plan.planType || ""),
    status: plan.status || "Active",
    goals: Array.isArray(plan.goals) ? plan.goals : [],
    startDate: plan.startDate || "",
    endDate: plan.endDate || "",
    assignedByDoctor: doctorEmail,
    doctorPlanId: planId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.collection("doctorPlans").updateOne(
    { $or: [{ id: planId }, ...(ObjectId.isValid(planId) ? [{ _id: new ObjectId(planId) }] : [])] },
    {
      $push: {
        assignedTo: {
          patientEmail,
          patientName: patientName || patientEmail,
          patientPlanId: pp.insertedId.toString(),
          assignedAt: new Date(),
        },
      },
    },
  );
  return pp.insertedId.toString();
}

// ── Helper: build a filter that matches a doctorPlan by id (string) or _id (ObjectId)
function planFilter(planId) {
  const f = [{ id: planId }];
  if (ObjectId.isValid(planId)) f.push({ _id: new ObjectId(planId) });
  return { $or: f };
}

router.post("/doctor/:email/plans", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const {
      planTitle, planType, status, startDate, endDate,
      description, goals, patientEmail, patientName, patientAge,
    } = req.body;
    const db = await getDb();

    const planId = new ObjectId();
    const planDoc = {
      _id: planId,
      id: planId.toString(),
      doctorEmail: email,
      planTitle: planTitle || planType || "Untitled Plan",
      planType: planType || "General Health",
      status: status || "Active",
      startDate: startDate || "",
      endDate: endDate || "",
      description: description || "",
      goals: Array.isArray(goals) ? goals : [],
      assignedTo: [],
      // legacy fields kept for backward compat
      patientName: patientName || "",
      patientAge: Number(patientAge) || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection("doctorPlans").insertOne(planDoc);

    // If patientEmail supplied, immediately assign
    if (patientEmail) {
      const resolvedName = patientName || patientEmail.split("@")[0];
      await assignPlanToPatient(db, email, planId.toString(), planDoc, patientEmail, resolvedName);
    }

    return res.status(201).json({ message: "Plan created.", planId: planId.toString() });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save doctor plan.", error: String(error) });
  }
});

// GET all plans for a doctor (dedicated, richer than the dashboard route)
router.get("/doctor/:email/plans", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const db = await getDb();
    const plans = await db
      .collection("doctorPlans")
      .find({ doctorEmail: email })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return res.json({
      plans: plans.map((p) => ({
        ...p,
        _id: p._id?.toString(),
        id: p.id || p._id?.toString(),
        planTitle: p.planTitle || p.planType || "Untitled Plan",
        assignedTo: Array.isArray(p.assignedTo) ? p.assignedTo : [],
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load plans.", error: String(error) });
  }
});

// UPDATE a plan (and sync assigned patient copies)
router.put("/doctor/:email/plans/:planId", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { planId } = req.params;
    const { planTitle, planType, status, startDate, endDate, description, goals } = req.body;
    const db = await getDb();

    const set = {
      planTitle: planTitle || planType || "Untitled Plan",
      planType: planType || "General Health",
      status: status || "Active",
      startDate: startDate || "",
      endDate: endDate || "",
      description: description || "",
      goals: Array.isArray(goals) ? goals : [],
      updatedAt: new Date(),
    };

    await db.collection("doctorPlans").updateOne(planFilter(planId), { $set: set });

    // Sync any patient plan copies
    await db.collection("patientPlans").updateMany(
      { doctorPlanId: planId },
      {
        $set: {
          title: set.planTitle,
          description: set.description,
          type: mapPlanTypeToPatientType(set.planType),
          status: set.status,
          goals: set.goals,
          startDate: set.startDate,
          endDate: set.endDate,
          updatedAt: new Date(),
        },
      },
    );

    return res.json({ message: "Plan updated." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update plan.", error: String(error) });
  }
});

// DELETE a plan (and remove patient copies)
router.delete("/doctor/:email/plans/:planId", doctorOnly, async (req, res) => {
  try {
    const { planId } = req.params;
    const db = await getDb();

    await db.collection("doctorPlans").deleteOne(planFilter(planId));
    await db.collection("patientPlans").deleteMany({ doctorPlanId: planId });

    return res.json({ message: "Plan deleted." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete plan.", error: String(error) });
  }
});

// ASSIGN an existing plan to a patient
router.post("/doctor/:email/plans/:planId/assign", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { planId } = req.params;
    const { patientEmail, patientName } = req.body;
    if (!patientEmail) return res.status(400).json({ message: "patientEmail required." });

    const db = await getDb();
    const plan = await db.collection("doctorPlans").findOne(planFilter(planId));
    if (!plan) return res.status(404).json({ message: "Plan not found." });

    const resolvedName = patientName || patientEmail.split("@")[0];
    const patientPlanId = await assignPlanToPatient(db, email, planId, plan, patientEmail, resolvedName);

    return res.status(201).json({ message: "Plan assigned.", patientPlanId });
  } catch (error) {
    return res.status(500).json({ message: "Failed to assign plan.", error: String(error) });
  }
});

// DUPLICATE a plan (creates a copy, no assignment)
router.post("/doctor/:email/plans/:planId/duplicate", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { planId } = req.params;
    const db = await getDb();

    const original = await db.collection("doctorPlans").findOne(planFilter(planId));
    if (!original) return res.status(404).json({ message: "Plan not found." });

    const newId = new ObjectId();
    await db.collection("doctorPlans").insertOne({
      ...original,
      _id: newId,
      id: newId.toString(),
      planTitle: `${original.planTitle || original.planType || "Plan"} (Copy)`,
      assignedTo: [],
      patientName: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(201).json({ message: "Plan duplicated.", planId: newId.toString() });
  } catch (error) {
    return res.status(500).json({ message: "Failed to duplicate plan.", error: String(error) });
  }
});

router.get("/doctor/:email/alerts", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const db = await getDb();

    // Include alerts explicitly for this doctor + legacy alerts with no doctorEmail
    const raw = await db
      .collection("doctorAlerts")
      .find({ $or: [{ doctorEmail: email }, { doctorEmail: { $exists: false } }] })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    const RISK_ORDER = { RED: 0, ORANGE: 1, YELLOW: 2, GREEN: 3 };
    const SEV_ORDER  = { Critical: 0, High: 1, Medium: 2, Low: 3 };

    // Normalise + sort: RED first, then ORANGE, YELLOW, GREEN; unresolved before resolved
    const alerts = raw
      .map((a) => ({
        ...a,
        _id: a._id?.toString(),
        id: a.id || a._id?.toString() || "",
        // derive color priority from either the new 'priority' field or old 'severity'
        priority: ["RED","ORANGE","YELLOW","GREEN"].includes(a.priority)
          ? a.priority
          : a.severity === "Critical" ? "RED"
          : a.severity === "High"     ? "ORANGE"
          : a.severity === "Medium"   ? "YELLOW"
          : "GREEN",
      }))
      .sort((a, b) => {
        const ra = RISK_ORDER[a.priority] ?? 3;
        const rb = RISK_ORDER[b.priority] ?? 3;
        if (ra !== rb) return ra - rb;
        if (a.isResolved !== b.isResolved) return a.isResolved ? 1 : -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

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
    const { email } = req.params;
    const { alertId } = req.params;
    const db = await getDb();

    // Match only alerts owned by the authenticated doctor.
    const orFilter = [
      { id: alertId },
      ...(ObjectId.isValid(alertId) ? [{ _id: new ObjectId(alertId) }] : []),
    ];

    const result = await db
      .collection("doctorAlerts")
      .updateOne(
        { $and: [{ doctorEmail: email.toLowerCase() }, { $or: orFilter }] },
        { $set: { isResolved: true, resolvedAt: new Date(), updatedAt: new Date() } },
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Alert not found or access denied." });
    }

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

router.get("/doctor/:email/subscriptions", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const db = await getDb();

    const doctor = await db.collection("doctors").findOne({ email });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const doctorId = doctor._id.toString();

    const patientLinks = await db
      .collection("doctorPatients")
      .find({ doctorEmail: email })
      .sort({ createdAt: -1 })
      .toArray();

    const subscriptions = [];
    for (const link of patientLinks) {
      const patient = await db
        .collection("users")
        .findOne({ email: link.patientEmail });
      if (!patient) continue;

      const patientSubs = (patient.subscriptions || []).filter(
        (s) => s.professionalId === doctorId,
      );
      const sub = patientSubs[0] || null;

      const rawDate = sub?.subscribedAt || link.createdAt;
      const subscribedAt = rawDate instanceof Date
        ? rawDate.toISOString()
        : rawDate
        ? String(rawDate)
        : null;

      subscriptions.push({
        patientEmail: link.patientEmail,
        patientName:
          patient.profile?.fullName ||
          link.name ||
          link.patientEmail.split("@")[0],
        planName: sub?.planName || "Free Access",
        amount: typeof sub?.amount === "number" ? sub.amount : 0,
        period: sub?.period || "free",
        subscribedAt,
        status: "active",
      });
    }

    return res.json({ subscriptions });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to load subscriptions.", error: String(error) });
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
      { doctorEmail: email },
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
      { doctorEmail: email },
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

    // Classify the patient message — create alert for anything non-GREEN
    try {
      const classified = await groqService.classifyRisk("message", message, {});
      if (classified.priority !== "GREEN") {
        const user = await db.collection("users").findOne({ email });
        const patientName = user?.profile?.fullName || email.split("@")[0];

        const doctorLinks = await db
          .collection("doctorPatients")
          .find({ patientEmail: email })
          .toArray();

        for (const link of doctorLinks) {
          const alertId = new ObjectId();
          await db.collection("doctorAlerts").insertOne({
            _id: alertId,
            id: alertId.toString(),
            patientEmail: email,
            patientName,
            doctorEmail: link.doctorEmail,
            message: `[Message] ${message.slice(0, 140)}`,
            priority: classified.priority,
            severity: priorityToSeverity(classified.priority),
            reason: classified.reason,
            explanation: classified.explanation,
            sourceType: "message",
            messageId: result.insertedId.toString(),
            isResolved: false,
            createdAt: new Date(),
          });
        }
      }
    } catch (classErr) {
      console.warn("Message classification failed:", classErr.message);
    }

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
    const doc = await db.collection("doctors").findOne({ email });
    if (!doc) return res.status(404).json({ message: "Doctor not found" });

    const [messages, patientLinks] = await Promise.all([
      db.collection("patientMessages")
        .find({ doctorId: doc._id.toString() })
        .sort({ createdAt: 1 })
        .limit(200)
        .toArray(),
      db.collection("doctorPatients")
        .find({ doctorEmail: email })
        .toArray(),
    ]);

    // Build name lookup from subscription roster
    const nameMap = {};
    patientLinks.forEach((link) => {
      nameMap[link.patientEmail] = link.name || link.patientEmail;
    });

    const enriched = messages.map((m) => ({
      ...m,
      _id: m._id?.toString(),
      patientName: nameMap[m.email] || m.email,
    }));

    return res.json({ messages: enriched });
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
    const doc = await db.collection("doctors").findOne({ email });
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

// Patient marks all messages from a specific doctor as read
router.patch("/messages/:email/read", patientOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const { doctorId } = req.body;
    if (!doctorId) return res.status(400).json({ message: "doctorId required." });
    const db = await getDb();
    await db.collection("patientMessages").updateMany(
      { email, doctorId, sender: "doctor", isRead: false },
      { $set: { isRead: true, updatedAt: new Date() } },
    );
    return res.json({ message: "Messages marked as read." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to mark messages as read.", error: String(error) });
  }
});

// Doctor marks all messages from a specific patient as read
router.patch("/doctor/:email/messages/read", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const db = await getDb();
    const doc = await db.collection("doctors").findOne({ email });
    if (!doc) return res.status(404).json({ message: "Doctor not found" });
    const { patientEmail } = req.body;
    if (!patientEmail) return res.status(400).json({ message: "patientEmail required." });
    await db.collection("patientMessages").updateMany(
      { email: patientEmail.toLowerCase(), doctorId: doc._id.toString(), sender: "patient", isRead: false },
      { $set: { isRead: true, updatedAt: new Date() } },
    );
    return res.json({ message: "Messages marked as read." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to mark messages as read.", error: String(error) });
  }
});

// ── Professional dashboard stats — all 7 KPI cards in one request ──────────
router.get("/doctor/:email/dashboard-stats", doctorOnly, async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const db = await getDb();

    const doctor = await db.collection("doctors").findOne({ email });
    const doctorId = doctor?._id?.toString();

    // All patient links for this doctor
    const patientLinks = await db
      .collection("doctorPatients")
      .find({ doctorEmail: email })
      .toArray();

    const activePatients = patientLinks.length;
    const patientEmails = patientLinks.map((l) => l.patientEmail).filter(Boolean);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    // Today's patients: distinct patients with at least one log today
    let todayPatients = 0;
    if (patientEmails.length > 0) {
      const todayLoggers = await db
        .collection("patientLogs")
        .aggregate([
          { $match: { email: { $in: patientEmails }, createdAt: { $gte: todayStart } } },
          { $group: { _id: "$email" } },
        ])
        .toArray();
      todayPatients = todayLoggers.length;
    }

    // Unread messages from patients sent to this doctor
    let unreadMessages = 0;
    if (doctorId) {
      unreadMessages = await db.collection("patientMessages").countDocuments({
        doctorId,
        sender: "patient",
        isRead: false,
      });
    }

    // Pending subscriptions: new patient links in the last 7 days
    const pendingSubscriptions = patientLinks.filter((l) => {
      const d = new Date(l.createdAt || 0);
      return !isNaN(d.getTime()) && d >= sevenDaysAgo;
    }).length;

    // Alerts scoped to this doctor
    const allAlerts = await db
      .collection("doctorAlerts")
      .find({ doctorEmail: email })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    const highPriorityAlerts = allAlerts.filter(
      (a) => !a.isResolved && (a.severity === "Critical" || a.severity === "High"),
    ).length;

    const mediumAlerts = allAlerts.filter(
      (a) => !a.isResolved && a.severity === "Medium",
    ).length;

    // Compliance: % of patients with at least one log in the last 7 days
    let compliance = 0;
    if (activePatients > 0 && patientEmails.length > 0) {
      const recentLoggers = await db
        .collection("patientLogs")
        .aggregate([
          { $match: { email: { $in: patientEmails }, createdAt: { $gte: sevenDaysAgo } } },
          { $group: { _id: "$email" } },
        ])
        .toArray();
      compliance = Math.round((recentLoggers.length / activePatients) * 100);
    }

    // Recent activity: unresolved alerts + recent patient logs merged by time
    const unresolvedAlerts = allAlerts
      .filter((a) => !a.isResolved)
      .slice(0, 5)
      .map((a) => ({
        id: a._id?.toString() || a.id || "",
        type: "alert",
        patientName: a.patientName || "Patient",
        message: a.message || "",
        severity: a.severity || "Low",
        time: formatTimeAgo(a.createdAt),
        createdAt: a.createdAt || new Date(0),
      }));

    let recentLogActivity = [];
    if (patientEmails.length > 0) {
      const recentLogs = await db
        .collection("patientLogs")
        .find({ email: { $in: patientEmails } })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();

      const users = await db
        .collection("users")
        .find({ email: { $in: patientEmails } })
        .project({ email: 1, "profile.fullName": 1 })
        .toArray();

      const nameMap = {};
      users.forEach((u) => {
        nameMap[u.email] = u.profile?.fullName || u.email.split("@")[0];
      });

      recentLogActivity = recentLogs.map((l) => ({
        id: l._id?.toString() || "",
        type: "log",
        patientName: nameMap[l.email] || l.email,
        message: l.title || `${l.type || "health"} log`,
        severity: l.priority || "Low",
        time: formatTimeAgo(l.createdAt),
        createdAt: l.createdAt || new Date(0),
        logType: l.type || "general",
      }));
    }

    const recentActivity = [...unresolvedAlerts, ...recentLogActivity]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    return res.json({
      activePatients,
      unreadMessages,
      pendingSubscriptions,
      todayPatients,
      highPriorityAlerts,
      mediumAlerts,
      compliance,
      recentActivity,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load dashboard stats.",
      error: String(error),
    });
  }
});

export default router;
