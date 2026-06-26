import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.MONGODB_DB || process.env.DB_NAME || "gradproject2";

async function seed() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB at " + MONGO_URI);
    const db = client.db(DB_NAME);

    // Test accounts to seed
    const patient1 = "patient1@example.com";
    const patient2 = "patient2@example.com";
    const doctor1 = "doctor1@example.com";

    // Clean up old test data
    console.log("Cleaning up old test data...");
    await db.collection("users").deleteMany({ email: { $in: [patient1, patient2] } });
    await db.collection("doctors").deleteMany({ email: doctor1 });
    await db.collection("patientMetrics").deleteMany({ email: { $in: [patient1, patient2] } });
    await db.collection("patientLogs").deleteMany({ email: { $in: [patient1, patient2] } });

    // Hash password
    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create patient users
    console.log("Creating test patient users...");
    await db.collection("users").insertMany([
      {
        email: patient1,
        password: hashedPassword,
        role: "patient",
        isVerified: true,
        profile: { fullName: "Sarah Connor", age: "32", height: "165", weight: "65" },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: patient2,
        password: hashedPassword,
        role: "patient",
        isVerified: true,
        profile: { fullName: "John Doe", age: "45", height: "180", weight: "85" },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Create doctor in doctors collection (professionals login checks this collection)
    console.log("Creating test doctor account...");
    await db.collection("doctors").insertOne({
      email: doctor1,
      password: hashedPassword,
      fullName: "Dr. Gregory House",
      doctorName: "Dr. Gregory House",
      type: "doctor",
      specialty: "Diagnostic Medicine",
      rating: 5,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create Metrics
    console.log("Setting health metrics...");
    await db.collection("patientMetrics").insertMany([
      {
        email: patient1,
        calories: { goal: 1800 },
        sleep: { bedtime: "22:30", wakeTime: "06:30" },
        water: { goal: 8, unit: "glasses" },
        medication: { goal: 2 }
      },
      {
        email: patient2,
        calories: { goal: 2400 },
        sleep: { bedtime: "23:00", wakeTime: "07:00" },
        water: { goal: 12, unit: "glasses" },
        medication: { goal: 0 }
      }
    ]);

    // Generate Logs for today
    console.log("Generating today's health logs...");
    const today = new Date();
    
    // Sarah's logs
    await db.collection("patientLogs").insertMany([
      {
        email: patient1,
        type: "meal",
        title: "Oatmeal with Berries",
        subtitle: "Breakfast",
        details: { calories: 320, protein: 12, carbs: 45, fat: 5 },
        createdAt: new Date(new Date(today).setHours(7, 30, 0, 0)),
        timestamp: "07:30 AM"
      },
      {
        email: patient1,
        type: "water",
        title: "Morning hydration",
        details: { amount: 2, unit: "glasses" },
        createdAt: new Date(new Date(today).setHours(8, 0, 0, 0)),
        timestamp: "08:00 AM"
      },
      {
        email: patient1,
        type: "medication",
        title: "Vitamin D",
        details: { taken: 1 },
        createdAt: new Date(new Date(today).setHours(8, 30, 0, 0)),
        timestamp: "08:30 AM"
      },
      {
        email: patient1,
        type: "exercise",
        title: "Morning Run",
        subtitle: "3 miles",
        details: { calories: 350, duration: "30 min", distance: "3 miles" },
        createdAt: new Date(new Date(today).setHours(9, 0, 0, 0)),
        timestamp: "09:00 AM"
      },
      {
        email: patient1,
        type: "sleep",
        title: "Restful sleep",
        details: { hours: 7.5 },
        createdAt: new Date(new Date(today).setHours(6, 30, 0, 0)),
        timestamp: "06:30 AM"
      }
    ]);

    // John's logs
    await db.collection("patientLogs").insertMany([
      {
        email: patient2,
        type: "meal",
        title: "Steak and Eggs",
        subtitle: "Breakfast",
        details: { calories: 650, protein: 45, carbs: 5, fat: 35 },
        createdAt: new Date(new Date(today).setHours(8, 0, 0, 0)),
        timestamp: "08:00 AM"
      },
      {
        email: patient2,
        type: "water",
        title: "Water",
        details: { amount: 1, unit: "glasses" },
        createdAt: new Date(new Date(today).setHours(8, 15, 0, 0)),
        timestamp: "08:15 AM"
      }
    ]);

    console.log("Seeding complete! You can now log in with the test accounts.");
  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await client.close();
  }
}

seed();
