import dotenv from "dotenv";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import app from "./app.js";
import { bootstrapCollections } from "./db/bootstrapCollections.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env first, then project root .env for npm --prefix usage.
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: false });

const port = Number(process.env.PORT) || 5001;
const host = process.env.HOST || "0.0.0.0";

async function startServer() {
  await bootstrapCollections();

  const server = http.createServer(app);

  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
      console.error(
        `Port ${port} is already in use. Stop the other process or change PORT in backend/.env.`,
      );
      process.exit(1);
    }

    console.error("Server error:", err);
    process.exit(1);
  });

  server.listen(port, host, () => {
    console.log(`Backend running on http://${host}:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exit(1);
});
