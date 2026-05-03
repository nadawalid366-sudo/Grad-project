import { MongoClient } from "mongodb";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const mongoDbName = process.env.MONGODB_DB || "gradproject2";

const client = new MongoClient(mongoUri);
let dbInstance;

export async function getDb() {
  if (!dbInstance) {
    await client.connect();
    dbInstance = client.db(mongoDbName);
  }

  return dbInstance;
}
