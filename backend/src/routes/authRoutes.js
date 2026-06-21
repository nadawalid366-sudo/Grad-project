import bcrypt from "bcryptjs";
import express from "express";
import { signToken } from "../auth/jwt.js";
import { getDb } from "../db/mongoClient.js";

const router = express.Router();

const isHashed = (value = "") => typeof value === "string" && value.startsWith("$2");

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
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await users.insertOne({
      email: normalizedEmail,
      phone,
      password: passwordHash,
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    const userId = result.insertedId.toString();
    const token = signToken({
      sub: userId,
      email: normalizedEmail,
      role: "patient",
    });

    return res.status(201).json({
      message: "Account created.",
      token,
      userId,
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

    const user = await users.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Verify password. Legacy accounts stored plaintext: compare directly and
    // transparently upgrade to a bcrypt hash on successful login.
    let passwordOk;
    if (isHashed(user.password)) {
      passwordOk = await bcrypt.compare(password, user.password);
    } else {
      passwordOk = user.password === password;
      if (passwordOk) {
        const passwordHash = await bcrypt.hash(password, 10);
        await users.updateOne(
          { _id: user._id },
          { $set: { password: passwordHash, updatedAt: new Date() } },
        );
      }
    }

    if (!passwordOk) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const profile = user.profile || {};
    const token = signToken({
      sub: user._id.toString(),
      email: user.email,
      role: "patient",
    });

    return res.json({
      message: "Login successful",
      token,
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
