import cors from "cors";
import express from "express";
import morgan from "morgan";

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

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/professionals", professionalRoutes);

export default app;