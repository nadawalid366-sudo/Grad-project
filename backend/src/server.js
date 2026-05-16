import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import app from "./app.js";
import { bootstrapCollections } from "./db/bootstrapCollections.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try backend/.env first, then project-root/.env when launched via npm --prefix backend.
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: false });

const port = Number(process.env.PORT) || 5000;
const host = process.env.HOST || "0.0.0.0";

try {
  await bootstrapCollections();
  app.listen(port, host, () => {
    console.log(`Backend running on http://${host}:${port}`);
  });
} catch (error) {
  console.error("Failed to initialize database collections", error);
  process.exit(1);
}