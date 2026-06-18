import express from "express";
import { getDb } from "../db/mongoClient.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!email || !phone || !password) {
      return res
        .status(400)
        .json({ message: "Email, phone, and password are required." });
    }

    const db = await getDb();
    const users = db.collection("users");
    const normalizedEmail = email.toLowerCase();

    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already exists." });
    }

    const now = new Date();
    const result = await users.insertOne({
      email: normalizedEmail,
      phone,
      password,
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    return res.status(201).json({
      message: "Account created.",
      userId: result.insertedId.toString(),
      email: normalizedEmail,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to register user.", error: String(error) });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const db = await getDb();
    const users = db.collection("users");
    const normalizedEmail = email.toLowerCase();

    const user = await users.findOne({ email: normalizedEmail, password });
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
    return res
      .status(500)
      .json({ message: "Failed to login.", error: String(error) });
  }
});

export default router;
