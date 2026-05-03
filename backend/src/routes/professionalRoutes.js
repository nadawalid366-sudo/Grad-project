import express from "express";
import { defaultProfessionals } from "../data/defaultProfessionals.js";
import { getDb } from "../db/mongoClient.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const db = await getDb();
    const professionalsCollection = db.collection("professionals");

    const count = await professionalsCollection.countDocuments();
    if (count === 0) {
      await professionalsCollection.insertMany(defaultProfessionals);
    }

    const professionals = await professionalsCollection.find({}).toArray();
    return res.json({ professionals });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load professionals.", error: String(error) });
  }
});

export default router;
