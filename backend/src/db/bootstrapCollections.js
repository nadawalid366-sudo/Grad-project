import { doctorDashboardSeed } from "../data/dashboardSeeds.js";
import { defaultProfessionals } from "../data/defaultProfessionals.js";
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

async function seedCollectionIfEmpty(db, collectionName, docs) {
  if (!docs.length) return;

  const collection = db.collection(collectionName);
  const count = await collection.countDocuments();
  if (count === 0) {
    await collection.insertMany(docs);
  }
}

export async function bootstrapCollections() {
  const db = await getDb();
  await ensureCollectionsExist(db);

  await seedCollectionIfEmpty(db, "professionals", defaultProfessionals);
  await seedCollectionIfEmpty(db, "doctorAlerts", doctorDashboardSeed.alerts);
  await seedCollectionIfEmpty(db, "doctorPatients", doctorDashboardSeed.patients);
  await seedCollectionIfEmpty(db, "doctorActivities", doctorDashboardSeed.patientActivity);
}
