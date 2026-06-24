import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
  override: false,
});

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB || "gradproject2";

if (!mongoUri) {
  throw new Error(
    "Missing Mongo connection string. Set MONGO_URI in backend/.env.",
  );
}

const client = new MongoClient(mongoUri);
let dbInstance;

export async function getDb() {
  if (!dbInstance) {
    await client.connect();
    dbInstance = client.db(mongoDbName);
    await dbInstance.command({ ping: 1 });
    console.log(
      `[mongodb] Connected to "${dbInstance.databaseName}" at ${client.options?.hosts?.join(",") || mongoUri}`,
    );
  }

  return dbInstance;
}

export async function closeDb() {
  if (client) {
    await client.close();
    dbInstance = undefined;
  }
}
