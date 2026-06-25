import bcrypt from "bcryptjs";
import express from "express";
import { signToken } from "../auth/jwt.js";
import { getDb } from "../db/mongoClient.js";

const router = express.Router();

const PROFESSIONAL_TYPES = ["doctor", "nutritionist", "coach"];

const isHashed = (value = "") =>
  typeof value === "string" && value.startsWith("$2");

function publicProfessional(doc) {
  if (!doc) return null;
  return {
    id: doc._id?.toString(),
    fullName: doc.fullName || doc.doctorName || "Professional",
    email: doc.email,
    type: doc.type || "doctor",
    specialty: doc.specialty || "General Practitioner",
    bio: doc.bio || "",
    rating: doc.rating ?? 5,
    reviewCount: doc.reviewCount ?? 0,
    createdAt: doc.createdAt,
  };
}

// List professional service categories (with subscription plans), if any.
router.get("/", async (_req, res) => {
  try {
    const db = await getDb();
    const professionals = await db
      .collection("professionals")
      .find({})
      .toArray();
    return res.json({ professionals });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to load professionals.", error: String(error) });
  }
});

// List individual professionals who have registered an account.
router.get("/registered", async (_req, res) => {
  try {
    const db = await getDb();
    const docs = await db
      .collection("doctors")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.json({ professionals: docs.map(publicProfessional) });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load registered professionals.",
      error: String(error),
    });
  }
});

// Create a healthcare professional account.
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, type, specialty } = req.body;

    if (!fullName || !email || !password) {
      return res
        .status(400)
        .json({ message: "Full name, email, and password are required." });
    }

    const normalizedType = PROFESSIONAL_TYPES.includes(type) ? type : "doctor";
    const db = await getDb();
    const doctors = db.collection("doctors");
    const normalizedEmail = email.toLowerCase();

    const existing = await doctors.findOne({ email: normalizedEmail });
    if (existing) {
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await doctors.insertOne({
      fullName,
      doctorName: fullName,
      email: normalizedEmail,
      password: passwordHash,
      type: normalizedType,
      specialty: specialty || "General Practitioner",
      rating: 5,
      reviewCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    const created = await doctors.findOne({ _id: result.insertedId });
    const token = signToken({
      sub: result.insertedId.toString(),
      email: normalizedEmail,
      role: "professional",
    });

    return res.status(201).json({
      message: "Professional account created.",
      token,
      professional: publicProfessional(created),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to register professional.",
      error: String(error),
    });
  }
});

// Sign in an existing professional.
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const db = await getDb();
    const doctors = db.collection("doctors");
    const normalizedEmail = email.toLowerCase();
    const doctor = await doctors.findOne({ email: normalizedEmail });

    if (!doctor) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Verify password; transparently upgrade legacy plaintext to a hash.
    let passwordOk;
    if (isHashed(doctor.password)) {
      passwordOk = await bcrypt.compare(password, doctor.password);
    } else {
      passwordOk = doctor.password === password;
      if (passwordOk) {
        const passwordHash = await bcrypt.hash(password, 10);
        await doctors.updateOne(
          { _id: doctor._id },
          { $set: { password: passwordHash, updatedAt: new Date() } },
        );
      }
    }

    if (!passwordOk) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = signToken({
      sub: doctor._id.toString(),
      email: doctor.email,
      role: "professional",
    });

    return res.json({
      message: "Login successful",
      token,
      professional: publicProfessional(doctor),
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to sign in professional.", error: String(error) });
  }
});


// Assign a patient to a doctor (create patient-doctor link)
router.post("/assign-patient", async (req, res) => {
  try {
    const { patientEmail, doctorEmail } = req.body;

    if (!patientEmail || !doctorEmail) {
      return res
        .status(400)
        .json({ message: "Patient email and doctor email are required." });
    }

    const normalizedPatientEmail = patientEmail.toLowerCase();
    const normalizedDoctorEmail = doctorEmail.toLowerCase();

    const db = await getDb();

    // Verify doctor exists
    const doctor = await db
      .collection("doctors")
      .findOne({ email: normalizedDoctorEmail });
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    // Verify patient exists
    const patient = await db
      .collection("users")
      .findOne({ email: normalizedPatientEmail });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Check if this patient is already assigned to this doctor
    const existing = await db
      .collection("doctorPatients")
      .findOne({
        doctorEmail: normalizedDoctorEmail,
        patientEmail: normalizedPatientEmail,
      });

    if (existing) {
      return res
        .status(409)
        .json({ message: "Patient is already assigned to this doctor." });
    }

    // Create the patient-doctor link
    const result = await db.collection("doctorPatients").insertOne({
      doctorEmail: normalizedDoctorEmail,
      doctorId: doctor._id.toString(),
      patientEmail: normalizedPatientEmail,
      patientId: patient._id.toString(),
      assignedAt: new Date(),
      status: "active",
    });

    return res.status(201).json({
      message: "Patient assigned to doctor successfully.",
      link: {
        id: result.insertedId.toString(),
        doctorEmail: normalizedDoctorEmail,
        patientEmail: normalizedPatientEmail,
        assignedAt: new Date(),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to assign patient to doctor.",
      error: String(error),
    });
  }
});

export default router;
