import express from "express";
import { ObjectId } from "mongodb";
import { requireSelf } from "../auth/authMiddleware.js";
import { getDb } from "../db/mongoClient.js";

const router = express.Router();

// Link a subscribing patient to the professional's patient roster so they
// show up in that doctor's portal. Safe to call repeatedly (upsert).
async function linkPatientToProfessional(db, professionalId, patientEmail) {
  if (!professionalId || !ObjectId.isValid(professionalId)) {
    return;
  }

  const doctor = await db
    .collection("doctors")
    .findOne({ _id: new ObjectId(professionalId) });
  if (!doctor) {
    return;
  }

  const patient = await db.collection("users").findOne({ email: patientEmail });
  const profile = patient?.profile || {};
  const patientName =
    profile.fullName || patientEmail.split("@")[0] || "Patient";

  await db.collection("doctorPatients").updateOne(
    { doctorEmail: doctor.email, patientEmail },
    {
      $set: {
        name: patientName,
        age: Number(profile.age) || 0,
        gender: profile.gender || "",
        conditions: profile.medicalConditions || [],
        lastActivity: "Just now",
        trend: "stable",
        status: "active",
        updatedAt: new Date(),
      },
      $setOnInsert: {
        doctorEmail: doctor.email,
        patientEmail,
        doctorId: doctor._id.toString(),
        patientId: patient?._id?.toString() || "",
        adherence: 0,
        alerts: 0,
        assignedAt: new Date(),
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}

router.post("/profile", async (req, res) => {
  try {
    const { profile } = req.body;

    if (!profile) {
      return res.status(400).json({ message: "Profile is required." });
    }

    const db = await getDb();
    const users = db.collection("users");
    // Identity comes from the verified token, never the request body.
    const normalizedEmail = req.auth.email;

    const result = await users.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          profile,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          email: normalizedEmail,
          createdAt: new Date(),
          isVerified: true,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      },
    );

    return res.json({
      message: "Profile saved.",
      user: {
        email: result?.email || normalizedEmail,
        ...(result?.profile || profile),
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to save profile.", error: String(error) });
  }
});

router.post("/subscriptions", async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription) {
      return res.status(400).json({ message: "Subscription is required." });
    }

    const db = await getDb();
    const users = db.collection("users");
    // Identity comes from the verified token, never the request body.
    const normalizedEmail = req.auth.email;

    const normalizedSubscription = {
      id:
        subscription.id ||
        `${subscription.professionalTitle}-${subscription.planName}`,
      professionalId: subscription.professionalId || null,
      professionalTitle: subscription.professionalTitle || "Professional Plan",
      planName: subscription.planName || "Selected Plan",
      amount: Number(subscription.amount || 0),
      period: subscription.period || "per month",
      subscribedAt: new Date(),
      selectedDoctorName:
        subscription.selectedDoctorName ||
        subscription.professionalTitle ||
        null,
    };

    // Remove any prior subscription to the same professional so a patient who
    // re-subscribes (or taps Pay multiple times) only keeps one entry.
    const duplicateFilter = normalizedSubscription.professionalId
      ? { professionalId: normalizedSubscription.professionalId }
      : { id: normalizedSubscription.id };

    await users.updateOne(
      { email: normalizedEmail },
      { $pull: { subscriptions: duplicateFilter } },
    );

    await users.updateOne(
      { email: normalizedEmail },
      {
        $setOnInsert: {
          email: normalizedEmail,
          createdAt: new Date(),
          isVerified: true,
        },
        $push: {
          subscriptions: {
            $each: [normalizedSubscription],
            $position: 0,
            $slice: 20,
          },
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

    await linkPatientToProfessional(
      db,
      normalizedSubscription.professionalId,
      normalizedEmail,
    );

    return res
      .status(201)
      .json({
        message: "Subscription saved.",
        subscription: normalizedSubscription,
      });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to save subscription.", error: String(error) });
  }
});

router.get("/:email", requireSelf(), async (req, res) => {
  try {
    const email = (req.params.email || "").toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const db = await getDb();
    const users = db.collection("users");

    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const safeUser = {
      email: user.email,
      phone: user.phone,
      isVerified: user.isVerified,
      profile: user.profile || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.json({ user: safeUser });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to fetch user.", error: String(error) });
  }
});

router.get("/:email/subscriptions", requireSelf(), async (req, res) => {
  try {
    const email = (req.params.email || "").toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const db = await getDb();
    const users = db.collection("users");

    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ subscriptions: user.subscriptions || [] });
  } catch (error) {
    return res
      .status(500)
      .json({
        message: "Failed to fetch subscriptions.",
        error: String(error),
      });
  }
});

router.delete("/subscriptions/:subscriptionId", async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const normalizedEmail = req.auth.email;
    const db = await getDb();

    // Fetch subscription before removing so we can clean up the doctor's roster
    const user = await db
      .collection("users")
      .findOne({ email: normalizedEmail }, { projection: { subscriptions: 1 } });

    const sub = (user?.subscriptions || []).find(
      (s) => String(s.id) === subscriptionId,
    );

    await db.collection("users").updateOne(
      { email: normalizedEmail },
      { $pull: { subscriptions: { id: subscriptionId } } },
    );

    if (sub?.professionalId && ObjectId.isValid(sub.professionalId)) {
      const doctor = await db
        .collection("doctors")
        .findOne({ _id: new ObjectId(sub.professionalId) });
      if (doctor) {
        await db.collection("doctorPatients").deleteOne({
          doctorEmail: doctor.email,
          patientEmail: normalizedEmail,
        });
      }
    }

    return res.json({ message: "Subscription cancelled." });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to cancel subscription.", error: String(error) });
  }
});

export default router;
