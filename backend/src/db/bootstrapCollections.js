import { getDb } from "./mongoClient.js";

const REQUIRED_COLLECTIONS = [
  "users",
  "professionals",
  "doctors",
  "patientLogs",
  "patientPlans",
  "patientMessages",
  "doctorAlerts",
  "doctorPatients",
  "doctorPlans",
  "doctorActivities",
];

async function ensureCollectionsExist(db) {
  const existing = await db.listCollections({}, { nameOnly: true }).toArray();
  const existingNames = new Set(existing.map((collection) => collection.name));

  for (const collectionName of REQUIRED_COLLECTIONS) {
    if (!existingNames.has(collectionName)) {
      await db.createCollection(collectionName);
    }
  }
}

export async function bootstrapCollections() {
  const db = await getDb();
  await ensureCollectionsExist(db);
}
