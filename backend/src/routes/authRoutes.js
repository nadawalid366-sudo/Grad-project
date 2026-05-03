import express from "express";
import { getDb } from "../db/mongoClient.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!email || !phone || !password) {
      return res.status(400).json({ message: "Email, phone, and password are required." });
    }

    const db = await getDb();
    const users = db.collection("users");

    const existing = await users.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already exists." });
    }

    const now = new Date();
    const result = await users.insertOne({
      email: email.toLowerCase(),
      phone,
      password,
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    return res.status(201).json({
      message: "Account created. Verify your account to continue.",
      userId: result.insertedId.toString(),
      email: email.toLowerCase(),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register user.", error: String(error) });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required." });
    }

    const db = await getDb();
    const users = db.collection("users");

    const result = await users.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { isVerified: true, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({ message: "Account verified.", email: email.toLowerCase() });
  } catch (error) {
    return res.status(500).json({ message: "Failed to verify account.", error: String(error) });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const db = await getDb();
    const users = db.collection("users");

    const user = await users.findOne({ email: email.toLowerCase(), password });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const profile = user.profile || {};

    return res.json({
      message: "Login successful",
      user: {
        email: user.email,
        fullName: profile.fullName || "User",
        age: profile.age || "",
        height: profile.height || "",
        weight: profile.weight || "",
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to login.", error: String(error) });
  }
});

export default router;
