import express from "express";
import { getDb } from "../db/mongoClient.js";

const router = express.Router();

router.post("/profile", async (req, res) => {
  try {
    const { email, profile } = req.body;

    if (!email || !profile) {
      return res
        .status(400)
        .json({ message: "Email and profile are required." });
    }

    const db = await getDb();
    const users = db.collection("users");
    const normalizedEmail = email.toLowerCase();

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
        email: result.value?.email || normalizedEmail,
        ...(result.value?.profile || profile),
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
    const { email, subscription } = req.body;

    if (!email || !subscription) {
      return res
        .status(400)
        .json({ message: "Email and subscription are required." });
    }

    const db = await getDb();
    const users = db.collection("users");
    const normalizedEmail = email.toLowerCase();

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

router.get(":email", async (req, res) => {
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

router.get(":email/subscriptions", async (req, res) => {
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

export default router;
