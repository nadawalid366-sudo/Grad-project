import cors from "cors";
import express from "express";
import morgan from "morgan";

import { getDb } from "./db/mongoClient.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import professionalRoutes from "./routes/professionalRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();

// Middlewares
app.use(
  cors({
    origin: "*", // safe for Expo development
  })
);

app.use(express.json());
app.use(morgan("dev"));

// Health check (IMPORTANT for Expo testing)
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Optional test route
app.get("/api/v1/ping", (_req, res) => {
  res.json({ message: "pong" });
});

app.get("/api/dashboard-stats", async (req, res) => {
  try {
    const email = typeof req.query.email === "string" ? req.query.email.toLowerCase() : "";
    const db = await getDb();

    const query = email ? { email } : {};
    const logs = await db
      .collection("patientLogs")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching data", error: String(error) });
  }
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/professionals", professionalRoutes);

export default app;