import { ObjectId } from "mongodb";
import { getDb } from "../db/mongoClient.js";

export const DOCTOR_TYPES = ["doctor", "nutritionist", "coach"];

// Default subscription plan per doctor type.
// Used by the patient browsing UI so pricing is defined once here,
// not spread across frontend files.
export const DEFAULT_PLANS = {
  doctor: {
    name: "Monthly Consultation",
    price: 49,
    period: "/ month",
    description: "Unlimited messaging and monthly check-in",
    features: ["Unlimited messages", "Monthly video call", "Care plan access"],
  },
  nutritionist: {
    name: "Nutrition Plan",
    price: 39,
    period: "/ month",
    description: "Personalised nutrition guidance",
    features: ["Meal plan creation", "Weekly review", "Unlimited messages"],
  },
  coach: {
    name: "Coaching Program",
    price: 29,
    period: "/ month",
    description: "Lifestyle and wellness coaching",
    features: ["Goal tracking", "Bi-weekly check-in", "Unlimited messages"],
  },
};

// Doctor document shape (MongoDB, no Mongoose):
// {
//   _id:         ObjectId
//   fullName:    string
//   email:       string  (unique, always lowercase)
//   password:    string  (bcrypt hash)
//   type:        "doctor" | "nutritionist" | "coach"
//   specialty:   string
//   bio:         string
//   rating:      number  (0-5, default 5)
//   reviewCount: number  (default 0)
//   isActive:    boolean (default true)
//   createdAt:   Date
//   updatedAt:   Date
// }

// Strip sensitive fields for API responses.
// Includes a resolved `plan` so callers never need to hard-code pricing.
export function toPublic(doc) {
  if (!doc) return null;
  const type = DOCTOR_TYPES.includes(doc.type) ? doc.type : "doctor";
  return {
    id: doc._id?.toString(),
    fullName: doc.fullName || doc.doctorName || "Professional",
    email: doc.email,
    type,
    specialty: doc.specialty || "General Practitioner",
    bio: doc.bio || "",
    rating: doc.rating ?? 5,
    reviewCount: doc.reviewCount ?? 0,
    isActive: doc.isActive !== false,
    createdAt: doc.createdAt,
    plan: DEFAULT_PLANS[type] ?? DEFAULT_PLANS.doctor,
  };
}

export async function findByEmail(email) {
  const db = await getDb();
  return db.collection("doctors").findOne({ email: email.toLowerCase() });
}

export async function findById(id) {
  if (!id || !ObjectId.isValid(id)) return null;
  const db = await getDb();
  return db.collection("doctors").findOne({ _id: new ObjectId(id) });
}

export async function findAll() {
  const db = await getDb();
  return db
    .collection("doctors")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
}

// Create indexes for the doctors collection.
// Safe to call on every startup — MongoDB ignores existing indexes with the same name and definition.
export async function ensureIndexes(db) {
  const col = db.collection("doctors");
  await col.createIndex({ email: 1 }, { unique: true, name: "idx_doctors_email" });
  await col.createIndex({ type: 1 }, { name: "idx_doctors_type" });
  await col.createIndex({ createdAt: -1 }, { name: "idx_doctors_createdAt" });
}
