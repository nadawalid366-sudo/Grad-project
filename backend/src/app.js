import cors from "cors";
import express from "express";
import morgan from "morgan";

import { getDb } from "./db/mongoClient.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import professionalRoutes from "./routes/professionalRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : "*",
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return res.status(200).json({
      status: "ok",
      database: db.databaseName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Database connection failed",
      error: String(error),
    });
  }
});

app.get("/api/v1/ping", (_req, res) => {
  res.json({ message: "pong" });
});

app.get("/api/dashboard-stats", async (req, res) => {
  try {
    const email =
      typeof req.query.email === "string" ? req.query.email.toLowerCase() : "";
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
    return res
      .status(500)
      .json({ message: "Error fetching data", error: String(error) });
  }
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/professionals", professionalRoutes);

app.use((req, res) => {
  res
    .status(404)
    .json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Unexpected server error" });
});

export default app;
