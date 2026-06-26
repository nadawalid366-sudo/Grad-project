/**
 * VitalConnect Database Seed Script
 * Run: node scripts/seedDatabase.js  (from backend/)
 *
 * Creates Dr. Abdelrhman Hamdy + 30 realistic patients with full historical
 * health data: meal logs, vitals, messages, alerts, plans and subscriptions.
 * Idempotent — safe to re-run; existing seeded documents are replaced.
 */

import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import path from "path";
import { fileURLToPath } from "url";

// ─── env ─────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: false });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DB_NAME   = process.env.MONGODB_DB || "gradproject2";

if (!MONGO_URI) {
  console.error("❌  MONGO_URI / MONGODB_URI env var is not set. Aborting.");
  process.exit(1);
}

// ─── tiny helpers ─────────────────────────────────────────────────────────────
const daysAgo  = (n) => new Date(Date.now() - n * 86_400_000);
const hoursAgo = (h) => new Date(Date.now() - h * 3_600_000);
const pick     = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand     = (lo, hi) => Math.round(lo + Math.random() * (hi - lo));

function priorityToSeverity(p) {
  if (p === "RED")    return "Critical";
  if (p === "ORANGE") return "High";
  if (p === "YELLOW") return "Medium";
  return "Low";
}

function fmtTime(date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// ─── doctor ───────────────────────────────────────────────────────────────────
const DOCTOR = {
  fullName:         "Abdelrhman Hamdy",
  doctorName:       "Abdelrhman Hamdy",
  email:            "shadow11@gmail.com",
  password:         "Hamdy@2",
  type:             "nutritionist",
  specialty:        "Nutritionist",
  experience:       "5 Years",
  bio:              "Certified Nutritionist specializing in weight management, sports nutrition, healthy lifestyle coaching, and personalized meal planning.",
  clinicName:       "VitalConnect Nutrition Clinic",
  consultationType: "free",
  price:            0,
  rating:           4.9,
  reviewCount:      127,
  isVerified:       true,
  isActive:         true,
};

// ─── doctor plans ─────────────────────────────────────────────────────────────
const PLAN_TEMPLATES = [
  {
    planTitle:   "Mediterranean Nutrition Plan",
    planType:    "Meal Plan",
    description: "A heart-healthy Mediterranean diet emphasizing vegetables, legumes, fish, and olive oil. Designed for weight management and cardiovascular health.",
    goals:       ["Reduce processed food intake", "Eat fish twice a week", "Consume 5 servings of vegetables daily", "Replace red meat with legumes"],
  },
  {
    planTitle:   "Diabetes-Friendly Meal Plan",
    planType:    "Meal Plan",
    description: "Low glycemic index meal plan specifically designed to stabilize blood sugar levels. Carbohydrate-controlled with regular meal timing.",
    goals:       ["Keep carbs below 45g per meal", "Eat every 3-4 hours", "Avoid sugary drinks", "Monitor blood glucose before and after meals"],
  },
  {
    planTitle:   "Weight Loss & Fitness Program",
    planType:    "Workout Plan",
    description: "A balanced combination of strength training and cardio designed to maximize fat loss while preserving lean muscle mass.",
    goals:       ["30 minutes of cardio 5x per week", "Strength training 3x per week", "10,000 steps daily", "Stay in calorie deficit of 500 kcal/day"],
  },
  {
    planTitle:   "Hypertension Management Plan",
    planType:    "General Health",
    description: "DASH diet-based nutrition plan focused on reducing sodium, increasing potassium-rich foods, and managing blood pressure through lifestyle changes.",
    goals:       ["Limit sodium to 1500mg/day", "Eat 4-5 servings of fruits and vegetables", "Reduce alcohol consumption", "Daily 20-minute walk"],
  },
  {
    planTitle:   "Sleep & Recovery Protocol",
    planType:    "Sleep Plan",
    description: "Evidence-based sleep hygiene program combined with nutrition support for better sleep quality, stress reduction, and recovery.",
    goals:       ["Sleep 7-8 hours per night", "No screens 1 hour before bed", "Evening herbal tea routine", "Consistent wake-up time"],
  },
];

// ─── patient definitions ─────────────────────────────────────────────────────
// scenario: "green" | "yellow" | "orange" | "red"
const PATIENTS = [
  // ── RED (7) — critical health alerts ────────────────────────────────────────
  {
    fullName: "Ahmed Hassan",       email: "ahmed.hassan@vitalseed.com",   password: "Patient@123",
    phone: "+201012345678", age: "35", gender: "Male",   height: "178cm", weight: "98kg",
    conditions: ["Diabetes Type 2", "Obesity"],
    goals: ["Control blood sugar", "Lose 20kg"],
    plan: 1, scenario: "red",
    adherence: 35, alertCount: 6,
    bpRange: [130, 85], glucoseRange: [310, 370], hrRange: [88, 102],
  },
  {
    fullName: "Fatima Al-Rashid",   email: "fatima.alrashid@vitalseed.com", password: "Patient@123",
    phone: "+201023456789", age: "52", gender: "Female", height: "162cm", weight: "84kg",
    conditions: ["Hypertension", "High Cholesterol"],
    goals: ["Lower blood pressure", "Reduce cholesterol"],
    plan: 3, scenario: "red",
    adherence: 42, alertCount: 5,
    bpRange: [188, 118], glucoseRange: [105, 120], hrRange: [78, 95],
  },
  {
    fullName: "Mohamed Saeed",      email: "mohamed.saeed@vitalseed.com",  password: "Patient@123",
    phone: "+201034567890", age: "58", gender: "Male",   height: "175cm", weight: "122kg",
    conditions: ["Obesity", "Sleep Apnea", "Pre-diabetes"],
    goals: ["Lose 30kg", "Improve sleep quality"],
    plan: 0, scenario: "red",
    adherence: 28, alertCount: 7,
    bpRange: [155, 98], glucoseRange: [140, 180], hrRange: [90, 108],
  },
  {
    fullName: "Tarek Mostafa",      email: "tarek.mostafa@vitalseed.com",  password: "Patient@123",
    phone: "+201045678901", age: "61", gender: "Male",   height: "172cm", weight: "88kg",
    conditions: ["Heart Disease", "Diabetes Type 2", "Hypertension"],
    goals: ["Cardiac rehabilitation", "Blood sugar control"],
    plan: 1, scenario: "red",
    adherence: 45, alertCount: 8,
    bpRange: [178, 112], glucoseRange: [280, 340], hrRange: [95, 115],
  },
  {
    fullName: "Khaled Younis",      email: "khaled.younis@vitalseed.com",  password: "Patient@123",
    phone: "+201056789012", age: "49", gender: "Male",   height: "170cm", weight: "105kg",
    conditions: ["Diabetes Type 2", "High Cholesterol", "Hypertension"],
    goals: ["Control blood sugar", "Lower cholesterol"],
    plan: 1, scenario: "red",
    adherence: 30, alertCount: 9,
    bpRange: [175, 108], glucoseRange: [320, 410], hrRange: [88, 104],
  },
  {
    fullName: "Nabil Qassem",       email: "nabil.qassem@vitalseed.com",   password: "Patient@123",
    phone: "+201067890123", age: "63", gender: "Male",   height: "168cm", weight: "91kg",
    conditions: ["Post-MI Recovery", "Hypertension", "Diabetes Type 2"],
    goals: ["Cardiac recovery", "Prevent recurrence"],
    plan: 3, scenario: "red",
    adherence: 55, alertCount: 6,
    bpRange: [182, 115], glucoseRange: [260, 320], hrRange: [92, 112],
  },
  {
    fullName: "Adel Mahmoud",       email: "adel.mahmoud@vitalseed.com",   password: "Patient@123",
    phone: "+201078901234", age: "47", gender: "Male",   height: "176cm", weight: "96kg",
    conditions: ["Diabetes Type 2"],
    goals: ["Blood sugar control", "Weight loss"],
    plan: 1, scenario: "red",
    adherence: 22, alertCount: 10,
    bpRange: [145, 92], glucoseRange: [350, 450], hrRange: [82, 98],
  },

  // ── ORANGE (9) — high priority / poor compliance ──────────────────────────
  {
    fullName: "Omar Khalil",        email: "omar.khalil@vitalseed.com",    password: "Patient@123",
    phone: "+201089012345", age: "42", gender: "Male",   height: "180cm", weight: "82kg",
    conditions: ["Mild Hypertension"],
    goals: ["Maintain healthy weight", "Control BP"],
    plan: 3, scenario: "orange_no_logs",
    adherence: 38, alertCount: 4,
    bpRange: [148, 92], glucoseRange: [95, 108], hrRange: [75, 88],
  },
  {
    fullName: "Kareem Abboud",      email: "kareem.abboud@vitalseed.com",  password: "Patient@123",
    phone: "+201090123456", age: "44", gender: "Male",   height: "177cm", weight: "91kg",
    conditions: ["High Cholesterol"],
    goals: ["Reduce cholesterol", "Lose 10kg"],
    plan: 0, scenario: "orange",
    adherence: 40, alertCount: 4,
    bpRange: [138, 88], glucoseRange: [98, 115], hrRange: [78, 90],
  },
  {
    fullName: "Hisham Al-Bakr",     email: "hisham.albakr@vitalseed.com",  password: "Patient@123",
    phone: "+201001234567", age: "39", gender: "Male",   height: "174cm", weight: "87kg",
    conditions: [],
    goals: ["Lose 15kg", "Build healthy habits"],
    plan: 2, scenario: "orange",
    adherence: 35, alertCount: 3,
    bpRange: [132, 84], glucoseRange: [92, 105], hrRange: [76, 88],
  },
  {
    fullName: "Samer Zaki",         email: "samer.zaki@vitalseed.com",     password: "Patient@123",
    phone: "+201012340001", age: "46", gender: "Male",   height: "173cm", weight: "93kg",
    conditions: ["High Cholesterol", "Fatty Liver"],
    goals: ["Lower cholesterol", "Improve liver health"],
    plan: 0, scenario: "orange",
    adherence: 45, alertCount: 3,
    bpRange: [135, 86], glucoseRange: [100, 118], hrRange: [74, 86],
  },
  {
    fullName: "Noha Saleh",         email: "noha.saleh@vitalseed.com",     password: "Patient@123",
    phone: "+201012340002", age: "36", gender: "Female", height: "160cm", weight: "76kg",
    conditions: ["PCOS"],
    goals: ["Lose 12kg", "Improve hormonal balance"],
    plan: 0, scenario: "orange",
    adherence: 48, alertCount: 3,
    bpRange: [128, 80], glucoseRange: [96, 112], hrRange: [72, 85],
  },
  {
    fullName: "Walid Farouk",       email: "walid.farouk@vitalseed.com",   password: "Patient@123",
    phone: "+201012340003", age: "37", gender: "Male",   height: "179cm", weight: "89kg",
    conditions: ["Sleep Apnea", "Mild Obesity"],
    goals: ["Improve sleep", "Lose 10kg"],
    plan: 4, scenario: "orange",
    adherence: 42, alertCount: 4,
    bpRange: [140, 90], glucoseRange: [94, 108], hrRange: [80, 95],
  },
  {
    fullName: "Fawzi Ibrahim",      email: "fawzi.ibrahim@vitalseed.com",  password: "Patient@123",
    phone: "+201012340004", age: "41", gender: "Male",   height: "171cm", weight: "118kg",
    conditions: ["Morbid Obesity", "Pre-diabetes"],
    goals: ["Lose 40kg", "Prevent diabetes"],
    plan: 0, scenario: "orange",
    adherence: 30, alertCount: 5,
    bpRange: [145, 94], glucoseRange: [125, 145], hrRange: [85, 100],
  },
  {
    fullName: "Ramzi Al-Amin",      email: "ramzi.alamin@vitalseed.com",   password: "Patient@123",
    phone: "+201012340005", age: "64", gender: "Male",   height: "167cm", weight: "79kg",
    conditions: ["Hypertension", "Arthritis", "High Cholesterol"],
    goals: ["Manage multiple conditions", "Stay active"],
    plan: 3, scenario: "orange",
    adherence: 50, alertCount: 4,
    bpRange: [155, 96], glucoseRange: [108, 125], hrRange: [70, 85],
  },
  {
    fullName: "Bassem Khalaf",      email: "bassem.khalaf@vitalseed.com",  password: "Patient@123",
    phone: "+201012340006", age: "43", gender: "Male",   height: "175cm", weight: "95kg",
    conditions: ["Obesity", "High Cholesterol"],
    goals: ["Lose weight", "Better nutrition"],
    plan: 0, scenario: "orange",
    adherence: 40, alertCount: 3,
    bpRange: [142, 90], glucoseRange: [105, 125], hrRange: [80, 94],
  },

  // ── YELLOW (8) — medium priority / mild issues ────────────────────────────
  {
    fullName: "Sara El-Sayed",      email: "sara.elsayed@vitalseed.com",   password: "Patient@123",
    phone: "+201012340007", age: "33", gender: "Female", height: "165cm", weight: "65kg",
    conditions: [],
    goals: ["Lose 5kg", "Drink more water", "Exercise regularly"],
    plan: 2, scenario: "yellow",
    adherence: 68, alertCount: 2,
    bpRange: [118, 76], glucoseRange: [88, 99], hrRange: [68, 82],
  },
  {
    fullName: "Rania Khalid",       email: "rania.khalid@vitalseed.com",   password: "Patient@123",
    phone: "+201012340008", age: "38", gender: "Female", height: "163cm", weight: "71kg",
    conditions: ["Mild Hypertension"],
    goals: ["Lower blood pressure naturally", "Reduce stress"],
    plan: 3, scenario: "yellow",
    adherence: 72, alertCount: 2,
    bpRange: [138, 88], glucoseRange: [90, 102], hrRange: [70, 84],
  },
  {
    fullName: "Dina Fawzy",         email: "dina.fawzy@vitalseed.com",     password: "Patient@123",
    phone: "+201012340009", age: "27", gender: "Female", height: "168cm", weight: "59kg",
    conditions: [],
    goals: ["Maintain weight", "Eat cleaner", "Build muscle"],
    plan: 2, scenario: "yellow",
    adherence: 75, alertCount: 1,
    bpRange: [112, 72], glucoseRange: [85, 96], hrRange: [65, 78],
  },
  {
    fullName: "Amira Hamed",        email: "amira.hamed@vitalseed.com",    password: "Patient@123",
    phone: "+201012340010", age: "22", gender: "Female", height: "161cm", weight: "56kg",
    conditions: [],
    goals: ["Gain healthy weight", "Regular meals"],
    plan: 0, scenario: "yellow",
    adherence: 65, alertCount: 2,
    bpRange: [108, 68], glucoseRange: [82, 94], hrRange: [68, 80],
  },
  {
    fullName: "Mona Abdel-Aziz",    email: "mona.abdelaziz@vitalseed.com", password: "Patient@123",
    phone: "+201012340011", age: "44", gender: "Female", height: "164cm", weight: "68kg",
    conditions: ["Hypothyroidism"],
    goals: ["Manage thyroid condition", "Maintain energy"],
    plan: 0, scenario: "yellow",
    adherence: 78, alertCount: 1,
    bpRange: [122, 78], glucoseRange: [88, 100], hrRange: [62, 76],
  },
  {
    fullName: "Salma Hassan",       email: "salma.hassan@vitalseed.com",   password: "Patient@123",
    phone: "+201012340012", age: "28", gender: "Female", height: "166cm", weight: "62kg",
    conditions: [],
    goals: ["Lose 4kg", "Better hydration"],
    plan: 0, scenario: "yellow",
    adherence: 70, alertCount: 1,
    bpRange: [115, 73], glucoseRange: [86, 97], hrRange: [66, 79],
  },
  {
    fullName: "Reem Al-Farsi",      email: "reem.alfarsi@vitalseed.com",   password: "Patient@123",
    phone: "+201012340013", age: "34", gender: "Female", height: "162cm", weight: "70kg",
    conditions: [],
    goals: ["Lose 8kg", "Tone up"],
    plan: 2, scenario: "yellow",
    adherence: 73, alertCount: 2,
    bpRange: [120, 77], glucoseRange: [89, 101], hrRange: [68, 81],
  },
  {
    fullName: "Yasmine Khalil",     email: "yasmine.khalil@vitalseed.com", password: "Patient@123",
    phone: "+201012340014", age: "25", gender: "Female", height: "170cm", weight: "61kg",
    conditions: [],
    goals: ["Improve endurance", "Sleep better"],
    plan: 4, scenario: "yellow",
    adherence: 76, alertCount: 1,
    bpRange: [110, 70], glucoseRange: [84, 95], hrRange: [62, 75],
  },

  // ── GREEN (6) — excellent compliance ─────────────────────────────────────
  {
    fullName: "Layla Mansour",      email: "layla.mansour@vitalseed.com",  password: "Patient@123",
    phone: "+201012340015", age: "29", gender: "Female", height: "167cm", weight: "64kg",
    conditions: [],
    goals: ["Maintain ideal weight", "Optimal nutrition"],
    plan: 0, scenario: "green",
    adherence: 94, alertCount: 0,
    bpRange: [112, 72], glucoseRange: [85, 94], hrRange: [62, 74],
  },
  {
    fullName: "Nour Ibrahim",       email: "nour.ibrahim@vitalseed.com",   password: "Patient@123",
    phone: "+201012340016", age: "24", gender: "Female", height: "163cm", weight: "55kg",
    conditions: [],
    goals: ["Build athletic performance", "Optimal recovery"],
    plan: 2, scenario: "green",
    adherence: 97, alertCount: 0,
    bpRange: [108, 68], glucoseRange: [82, 92], hrRange: [58, 70],
  },
  {
    fullName: "Youssef Nasser",     email: "youssef.nasser@vitalseed.com", password: "Patient@123",
    phone: "+201012340017", age: "31", gender: "Male",   height: "182cm", weight: "78kg",
    conditions: [],
    goals: ["Maintain weight loss", "Build muscle"],
    plan: 2, scenario: "green",
    adherence: 92, alertCount: 0,
    bpRange: [116, 74], glucoseRange: [86, 96], hrRange: [60, 73],
  },
  {
    fullName: "Mariam Qasim",       email: "mariam.qasim@vitalseed.com",   password: "Patient@123",
    phone: "+201012340018", age: "33", gender: "Female", height: "160cm", weight: "58kg",
    conditions: [],
    goals: ["Healthy lifestyle", "Energy boost"],
    plan: 0, scenario: "green",
    adherence: 96, alertCount: 0,
    bpRange: [110, 70], glucoseRange: [84, 93], hrRange: [63, 75],
  },
  {
    fullName: "Ibrahim El-Mahdi",   email: "ibrahim.elmahdi@vitalseed.com", password: "Patient@123",
    phone: "+201012340019", age: "28", gender: "Male",   height: "185cm", weight: "82kg",
    conditions: [],
    goals: ["Athletic performance", "Clean eating"],
    plan: 2, scenario: "green",
    adherence: 98, alertCount: 0,
    bpRange: [114, 72], glucoseRange: [84, 94], hrRange: [55, 68],
  },
  {
    fullName: "Heba Mostafa",       email: "heba.mostafa@vitalseed.com",   password: "Patient@123",
    phone: "+201012340020", age: "36", gender: "Female", height: "165cm", weight: "62kg",
    conditions: ["IBS"],
    goals: ["Manage IBS through diet", "Reduce inflammation"],
    plan: 0, scenario: "green",
    adherence: 91, alertCount: 0,
    bpRange: [113, 73], glucoseRange: [85, 95], hrRange: [64, 76],
  },
];

// ─── meal food library ────────────────────────────────────────────────────────
const MEALS = {
  healthy: {
    breakfast: [
      { title: "Oatmeal with Banana", subtitle: "Rolled oats, banana, honey, skim milk", cal: 320, p: 12, c: 58, f: 6 },
      { title: "Greek Yogurt Parfait", subtitle: "Greek yogurt, granola, mixed berries", cal: 290, p: 18, c: 38, f: 7 },
      { title: "Whole Grain Toast & Eggs", subtitle: "2 poached eggs, whole grain toast, tomato", cal: 340, p: 22, c: 32, f: 12 },
      { title: "Smoothie Bowl", subtitle: "Acai, banana, berries, chia seeds, almond milk", cal: 380, p: 10, c: 62, f: 14 },
      { title: "Vegetable Omelette", subtitle: "3 eggs, spinach, bell pepper, feta cheese", cal: 310, p: 24, c: 8, f: 20 },
    ],
    lunch: [
      { title: "Grilled Chicken Salad", subtitle: "Grilled chicken, mixed greens, quinoa, olive oil dressing", cal: 420, p: 38, c: 28, f: 16 },
      { title: "Lentil Soup & Bread", subtitle: "Red lentil soup, whole grain bread, cucumber salad", cal: 380, p: 20, c: 58, f: 8 },
      { title: "Grilled Fish & Rice", subtitle: "Grilled tilapia, brown rice, steamed broccoli", cal: 450, p: 42, c: 48, f: 10 },
      { title: "Veggie Wrap", subtitle: "Whole wheat wrap, hummus, grilled vegetables, feta", cal: 360, p: 14, c: 48, f: 14 },
      { title: "Chicken & Vegetable Stir Fry", subtitle: "Lean chicken, mixed vegetables, brown rice, light soy", cal: 440, p: 36, c: 46, f: 12 },
    ],
    dinner: [
      { title: "Baked Salmon & Asparagus", subtitle: "Baked salmon fillet, asparagus, quinoa", cal: 480, p: 44, c: 28, f: 18 },
      { title: "Turkey Meatballs & Pasta", subtitle: "Lean turkey meatballs, whole wheat pasta, tomato sauce", cal: 520, p: 38, c: 58, f: 14 },
      { title: "Grilled Chicken & Sweet Potato", subtitle: "Marinated chicken breast, baked sweet potato, salad", cal: 490, p: 40, c: 52, f: 10 },
      { title: "Vegetable Curry & Rice", subtitle: "Mixed vegetable curry, brown rice, raita", cal: 420, p: 16, c: 68, f: 10 },
      { title: "Fish Tacos", subtitle: "Grilled white fish, corn tortillas, slaw, avocado", cal: 440, p: 36, c: 42, f: 16 },
    ],
    snacks: [
      { title: "Apple & Almond Butter", subtitle: "1 apple, 2 tbsp almond butter", cal: 190, p: 5, c: 28, f: 10 },
      { title: "Mixed Nuts", subtitle: "Almonds, walnuts, cashews — 30g", cal: 170, p: 6, c: 8, f: 14 },
      { title: "Hummus & Vegetables", subtitle: "Hummus, carrot sticks, cucumber", cal: 140, p: 6, c: 18, f: 6 },
    ],
  },
  poor: {
    breakfast: [
      { title: "Skipped Breakfast", subtitle: "No breakfast logged", cal: 0, p: 0, c: 0, f: 0 },
      { title: "Coffee Only", subtitle: "Black coffee with 2 sugars", cal: 40, p: 0, c: 10, f: 0 },
      { title: "Chocolate Croissant", subtitle: "Store-bought chocolate croissant, coffee", cal: 580, p: 8, c: 72, f: 28 },
      { title: "Sugary Cereal", subtitle: "Froot Loops with whole milk", cal: 480, p: 8, c: 88, f: 10 },
    ],
    lunch: [
      { title: "Fast Food Burger", subtitle: "Double cheeseburger, large fries, cola", cal: 1240, p: 42, c: 128, f: 68 },
      { title: "Pizza Slice x3", subtitle: "3 slices pepperoni pizza", cal: 860, p: 36, c: 98, f: 38 },
      { title: "Shawarma & Fries", subtitle: "Chicken shawarma, french fries, mayo", cal: 920, p: 38, c: 88, f: 48 },
      { title: "Instant Noodles", subtitle: "2 packets instant noodles with egg", cal: 680, p: 18, c: 94, f: 28 },
    ],
    dinner: [
      { title: "Fried Chicken", subtitle: "3 pieces fried chicken, coleslaw", cal: 980, p: 58, c: 62, f: 56 },
      { title: "Late Night Snacking", subtitle: "Chips, chocolate, soft drink", cal: 760, p: 8, c: 110, f: 32 },
      { title: "Takeout Biryani", subtitle: "Large portion chicken biryani with raita", cal: 880, p: 38, c: 112, f: 28 },
      { title: "Rice & Heavy Gravy", subtitle: "White rice, mutton curry, bread", cal: 1100, p: 48, c: 128, f: 42 },
    ],
  },
};

const MESSAGES_TEMPLATES = [
  // Doctor to patient openers
  { sender: "doctor", texts: [
    "Good morning! How are you feeling today? Have you been sticking to your meal plan?",
    "Hello! I reviewed your recent logs — great progress this week! Keep it up.",
    "Hi there! Just checking in. I noticed you haven't logged any meals in the past few days. Everything okay?",
    "Good afternoon! Your blood sugar readings this week concern me. We need to discuss your diet.",
    "Hello! Excellent work on your nutrition this week. Your consistency is really paying off!",
  ]},
  // Patient responses
  { sender: "patient", texts: [
    "Good morning doctor! Feeling much better today. Yes, following the plan as best I can.",
    "Thank you doctor! I've been trying hard. Had a cheat day yesterday but back on track today.",
    "Sorry doctor, was busy with work. Will start logging again from today.",
    "Doctor, my blood sugar was 340 this morning. I'm scared. What should I do?",
    "Thank you for the encouragement! I lost 2kg this week!",
    "Doctor, I have a question about the meal plan. Can I substitute rice with quinoa?",
    "I've been having headaches. Could it be related to my diet?",
    "The exercise plan is going great! Did 45 minutes on the treadmill today.",
    "Doctor, I missed my medication yesterday. Will it affect my readings significantly?",
    "Feeling tired lately even though I'm sleeping 8 hours. Could it be iron deficiency?",
  ]},
  // Doctor advice
  { sender: "doctor", texts: [
    "Yes, quinoa is an excellent substitute — it's lower GI and higher in protein. Great choice!",
    "At 340, please drink plenty of water and avoid any carbohydrates for your next meal. If it stays above 300, contact me immediately.",
    "Congratulations on the 2kg loss! That's excellent progress. Keep following the plan.",
    "Headaches can sometimes be caused by dehydration or low blood sugar. Make sure you're drinking at least 2 liters of water daily.",
    "Missing one dose shouldn't significantly impact your readings, but please make sure you take it today and maintain consistency.",
    "Fatigue can indicate iron deficiency. I'm adding an iron-rich food recommendation to your plan. Let's check your levels next week.",
    "That's amazing! 45 minutes of cardio is excellent. Make sure you're refueling with protein after exercise.",
    "I recommend checking your blood pressure twice daily for the next week. Morning and evening readings please.",
  ]},
];

// ─── log generation ───────────────────────────────────────────────────────────

function generateMealLogs(patient, doctorId, days) {
  const logs = [];
  const isRed    = patient.scenario === "red";
  const isOrange = patient.scenario.startsWith("orange");
  const isGreen  = patient.scenario === "green";

  for (let d = 0; d < days; d++) {
    const baseDate = daysAgo(d);
    baseDate.setHours(0, 0, 0, 0);

    // Skip days based on scenario
    if (isOrange && Math.random() < 0.45) continue;
    if (isRed    && Math.random() < 0.55) continue;
    if (patient.scenario === "orange_no_logs" && d < 6) continue;
    if (patient.scenario === "yellow" && Math.random() < 0.20) continue;

    const pool = (isRed || isOrange) && Math.random() < 0.6 ? MEALS.poor : MEALS.healthy;

    // Breakfast (7-9 AM)
    if (Math.random() > (isOrange || isRed ? 0.35 : 0.05)) {
      const m  = pick(pool.breakfast);
      const ts = new Date(baseDate); ts.setHours(rand(7, 9), rand(0, 59));
      logs.push({
        email: patient.email, type: "meal",
        title: m.title, subtitle: m.subtitle, note: "",
        details: { calories: m.cal, protein: m.p, carbs: m.c, fat: m.f, mealType: "breakfast" },
        riskPriority: m.cal > 700 ? "ORANGE" : "GREEN",
        priority:     m.cal > 700 ? "High"   : "Low",
        priorityReason: m.cal > 700 ? "High calorie breakfast" : "",
        explanation:    m.cal > 700 ? "Calorie intake significantly above recommended breakfast range" : "",
        timestamp: fmtTime(ts), createdAt: ts, updatedAt: ts,
      });
    }

    // Lunch (12-14)
    if (Math.random() > (isOrange || isRed ? 0.25 : 0.03)) {
      const m  = pick(pool.lunch);
      const ts = new Date(baseDate); ts.setHours(rand(12, 14), rand(0, 59));
      const risk = m.cal > 900 ? "RED" : m.cal > 700 ? "ORANGE" : "GREEN";
      logs.push({
        email: patient.email, type: "meal",
        title: m.title, subtitle: m.subtitle, note: "",
        details: { calories: m.cal, protein: m.p, carbs: m.c, fat: m.f, mealType: "lunch" },
        riskPriority: risk,
        priority:     priorityToSeverity(risk),
        priorityReason: m.cal > 900 ? "Dangerously high calorie lunch" : m.cal > 700 ? "High calorie intake" : "",
        explanation:    m.cal > 900 ? "Single meal exceeds daily calorie budget" : "",
        timestamp: fmtTime(ts), createdAt: ts, updatedAt: ts,
      });
    }

    // Dinner (18-21)
    if (Math.random() > (isRed ? 0.30 : 0.08)) {
      const m  = pick(pool.dinner);
      const ts = new Date(baseDate); ts.setHours(rand(18, 21), rand(0, 59));
      const risk = m.cal > 1000 ? "RED" : m.cal > 800 ? "ORANGE" : "GREEN";
      logs.push({
        email: patient.email, type: "meal",
        title: m.title, subtitle: m.subtitle, note: "",
        details: { calories: m.cal, protein: m.p, carbs: m.c, fat: m.f, mealType: "dinner" },
        riskPriority: risk,
        priority:     priorityToSeverity(risk),
        priorityReason: m.cal > 1000 ? "Extremely high calorie dinner" : "",
        explanation:    m.cal > 1000 ? "Late high-calorie meal significantly impacts weight and blood sugar" : "",
        timestamp: fmtTime(ts), createdAt: ts, updatedAt: ts,
      });
    }

    // Snack (afternoon / evening, green & yellow patients mainly)
    if (isGreen && Math.random() < 0.6) {
      const m  = pick(MEALS.healthy.snacks);
      const ts = new Date(baseDate); ts.setHours(rand(15, 17), rand(0, 59));
      logs.push({
        email: patient.email, type: "meal",
        title: m.title, subtitle: m.subtitle, note: "",
        details: { calories: m.cal, protein: m.p, carbs: m.c, fat: m.f, mealType: "snack" },
        riskPriority: "GREEN", priority: "Low",
        priorityReason: "", explanation: "",
        timestamp: fmtTime(ts), createdAt: ts, updatedAt: ts,
      });
    }
  }
  return logs;
}

function generateVitalsLogs(patient, days) {
  const logs = [];
  const [sysBP, diaBP] = patient.bpRange;
  const [loG, hiG]     = patient.glucoseRange;
  const [loH, hiH]     = patient.hrRange;

  const totalEntries = patient.scenario === "green" ? 25
    : patient.scenario === "yellow" ? 18
    : patient.scenario.startsWith("orange") ? 10
    : 14; // red

  for (let i = 0; i < totalEntries && i < days; i++) {
    const d = Math.floor(i * (days / totalEntries));
    const ts = daysAgo(d);
    ts.setHours(rand(6, 10), rand(0, 59));

    const glucose = rand(loG, hiG);
    const bpSys   = rand(sysBP - 10, sysBP + 10);
    const bpDia   = rand(diaBP - 5,  diaBP + 5);
    const hr      = rand(loH, hiH);

    // Blood sugar risk
    let sugarRisk = glucose > 300 ? "RED" : glucose > 200 ? "ORANGE" : glucose > 140 ? "YELLOW" : "GREEN";
    // BP risk
    let bpRisk = bpSys > 180 ? "RED" : bpSys > 160 ? "ORANGE" : bpSys > 140 ? "YELLOW" : "GREEN";
    const overallRisk = ["RED","ORANGE","YELLOW","GREEN"].find(
      r => [sugarRisk, bpRisk].includes(r)
    ) || "GREEN";

    // Blood sugar log
    logs.push({
      email: patient.email, type: "vitals",
      title: "Blood Sugar Reading",
      subtitle: `${glucose} mg/dL — ${glucose < 100 ? "Normal" : glucose < 200 ? "Elevated" : "High"}`,
      note: "",
      details: { blood_glucose: glucose, unit: "mg/dL", status: glucose > 200 ? "High" : "Normal" },
      riskPriority: sugarRisk,
      priority: priorityToSeverity(sugarRisk),
      priorityReason: glucose > 300 ? "Critically high blood sugar" : glucose > 200 ? "Blood sugar significantly elevated" : "",
      explanation:    glucose > 300 ? `Blood glucose at ${glucose} mg/dL is dangerously high and requires immediate dietary intervention` : "",
      timestamp: fmtTime(ts), createdAt: new Date(ts.getTime() - 600000), updatedAt: ts,
    });

    // Blood pressure log
    const ts2 = new Date(ts.getTime() + 300000);
    logs.push({
      email: patient.email, type: "vitals",
      title: "Blood Pressure Check",
      subtitle: `${bpSys}/${bpDia} mmHg — ${bpSys > 140 ? "High" : "Normal"}`,
      note: "",
      details: { blood_pressure: `${bpSys}/${bpDia}`, systolic: bpSys, diastolic: bpDia, heart_rate: hr },
      riskPriority: bpRisk,
      priority: priorityToSeverity(bpRisk),
      priorityReason: bpSys > 180 ? "Dangerously high blood pressure" : bpSys > 160 ? "Significantly high blood pressure" : bpSys > 140 ? "Elevated blood pressure" : "",
      explanation:    bpSys > 180 ? `Systolic pressure at ${bpSys} mmHg is critically high — immediate medical attention may be required` : "",
      timestamp: fmtTime(ts2), createdAt: ts2, updatedAt: ts2,
    });
  }

  return logs;
}

function generateExerciseLogs(patient, days) {
  const logs = [];
  const isGreen  = patient.scenario === "green";
  const isYellow = patient.scenario === "yellow";
  const isOrange = patient.scenario.startsWith("orange");

  const freq = isGreen ? 0.75 : isYellow ? 0.45 : isOrange ? 0.20 : 0.15;
  const exercises = [
    { title: "Morning Walk",          subtitle: "Brisk walking in the park",            dur: "30 min", cal: 180, dist: "3.5km"  },
    { title: "Treadmill Run",         subtitle: "Moderate intensity treadmill session",  dur: "45 min", cal: 380, dist: "6.2km"  },
    { title: "Cycling",               subtitle: "Stationary bike workout",               dur: "40 min", cal: 320, dist: "18km"   },
    { title: "Weight Training",       subtitle: "Upper body strength training",          dur: "50 min", cal: 280, dist: ""       },
    { title: "Yoga & Stretching",     subtitle: "Hatha yoga and flexibility exercises",  dur: "45 min", cal: 150, dist: ""       },
    { title: "Swimming",              subtitle: "Freestyle and breaststroke laps",       dur: "35 min", cal: 420, dist: "1.2km"  },
    { title: "HIIT Workout",          subtitle: "High-intensity interval training",      dur: "25 min", cal: 340, dist: ""       },
    { title: "Evening Jog",           subtitle: "Outdoor jogging session",               dur: "40 min", cal: 350, dist: "5.8km"  },
  ];

  for (let d = 0; d < days; d++) {
    if (Math.random() > freq) continue;
    const ex = pick(exercises);
    const ts = daysAgo(d);
    ts.setHours(rand(6, 20), rand(0, 59));

    logs.push({
      email: patient.email, type: "exercise",
      title: ex.title, subtitle: ex.subtitle, note: "",
      details: { duration: ex.dur, calories: ex.cal, distance: ex.dist },
      riskPriority: "GREEN", priority: "Low",
      priorityReason: "", explanation: "",
      timestamp: fmtTime(ts), createdAt: ts, updatedAt: ts,
    });
  }
  return logs;
}

function generateWaterLogs(patient, days) {
  const logs = [];
  const isGreen  = patient.scenario === "green";
  const isOrange = patient.scenario.startsWith("orange");

  for (let d = 0; d < days; d++) {
    if (isOrange && Math.random() < 0.40) continue;
    if (patient.scenario === "orange_no_logs" && d < 6) continue;

    const amount = isGreen ? rand(2000, 3000) : isOrange ? rand(600, 1400) : rand(1200, 2200);
    const ts = daysAgo(d);
    ts.setHours(rand(18, 22), rand(0, 59));
    const risk = amount < 1000 ? "YELLOW" : "GREEN";

    logs.push({
      email: patient.email, type: "water",
      title: "Daily Water Intake",
      subtitle: `${amount}ml consumed today`,
      note: "",
      details: { amount, unit: "ml" },
      riskPriority: risk, priority: priorityToSeverity(risk),
      priorityReason: amount < 1000 ? "Insufficient water intake" : "",
      explanation:    amount < 1000 ? "Patient consumed less than 50% of recommended daily water intake" : "",
      timestamp: fmtTime(ts), createdAt: ts, updatedAt: ts,
    });
  }
  return logs;
}

function generateSleepLogs(patient, days) {
  const logs = [];
  const isGreen = patient.scenario === "green";
  const isWalid = patient.email.includes("walid");

  for (let d = 0; d < days; d += rand(1, 3)) {
    const hours = isGreen ? rand(70, 85) / 10 : isWalid ? rand(40, 60) / 10 : rand(50, 75) / 10;
    const ts = daysAgo(d);
    ts.setHours(rand(7, 9), rand(0, 59));
    const risk = hours < 5 ? "ORANGE" : hours < 6.5 ? "YELLOW" : "GREEN";

    logs.push({
      email: patient.email, type: "sleep",
      title: "Sleep Log",
      subtitle: `${hours.toFixed(1)} hours — ${hours >= 7 ? "Good" : hours >= 6 ? "Fair" : "Poor"} sleep quality`,
      note: "",
      details: { hours, quality: hours >= 7 ? "Good" : hours >= 6 ? "Fair" : "Poor" },
      riskPriority: risk, priority: priorityToSeverity(risk),
      priorityReason: hours < 5 ? "Severely insufficient sleep" : hours < 6.5 ? "Sleep below recommended minimum" : "",
      explanation:    hours < 5 ? "Less than 5 hours of sleep severely impacts health, metabolism, and cognitive function" : "",
      timestamp: fmtTime(ts), createdAt: ts, updatedAt: ts,
    });
  }
  return logs;
}

// ─── message generation ───────────────────────────────────────────────────────
function generateMessages(patient, doctorId) {
  const msgs = [];
  const isRed    = patient.scenario === "red";
  const isOrange = patient.scenario.startsWith("orange");
  const isGreen  = patient.scenario === "green";

  const doctorTexts   = MESSAGES_TEMPLATES[0].texts;
  const patientTexts  = MESSAGES_TEMPLATES[1].texts;
  const doctorAdvice  = MESSAGES_TEMPLATES[2].texts;

  // Build conversation thread (older messages first)
  const threadDays = isRed ? 25 : isOrange ? 15 : isGreen ? 30 : 20;
  let msgCount = isRed ? rand(10, 14) : isOrange ? rand(5, 9) : isGreen ? rand(12, 16) : rand(7, 11);

  for (let i = 0; i < msgCount; i++) {
    const daysBack = Math.floor((threadDays - i * (threadDays / msgCount)));
    const ts = daysAgo(daysBack);
    ts.setHours(rand(8, 22), rand(0, 59));

    const isDoctor = i % 2 === 0;
    const textPool = isDoctor ? (i < 2 ? doctorTexts : doctorAdvice) : patientTexts;
    const text     = pick(textPool);

    // Unread: recent patient messages not yet read by doctor
    const isPatientMsg = !isDoctor;
    const isRecent     = daysBack < 2;
    const isRead       = !(isPatientMsg && isRecent && (isRed || isOrange));

    msgs.push({
      email:     patient.email,
      doctorId:  doctorId,
      message:   text,
      sender:    isDoctor ? "doctor" : "patient",
      timestamp: fmtTime(ts),
      isRead,
      createdAt: ts,
    });
  }

  // Add recent unread messages for red/orange patients
  if (isRed || isOrange) {
    const urgentMsgs = isRed ? [
      "Doctor, my blood sugar this morning was very high again. I feel dizzy.",
      "I haven't been feeling well for 3 days now. Should I go to the hospital?",
    ] : [
      "Doctor, I haven't been logging much lately. Life has been very busy.",
    ];

    for (const text of urgentMsgs) {
      const ts = hoursAgo(rand(2, 18));
      msgs.push({
        email: patient.email, doctorId,
        message: text, sender: "patient",
        timestamp: fmtTime(ts), isRead: false, createdAt: ts,
      });
    }
  }

  return msgs;
}

// ─── alert generation ─────────────────────────────────────────────────────────
function generateAlerts(patient, doctorEmail, logs) {
  const alerts = [];
  const logAlerts = logs.filter(l => l.riskPriority !== "GREEN" && l.type !== "water");

  for (const log of logAlerts.slice(0, patient.alertCount)) {
    const alertId  = new ObjectId();
    const scenario = patient.scenario;
    const isRed    = log.riskPriority === "RED";
    const isOrange = log.riskPriority === "ORANGE";

    alerts.push({
      _id:         alertId,
      id:          alertId.toString(),
      patientEmail: patient.email,
      patientName:  patient.fullName,
      doctorEmail,
      message:     `[${log.riskPriority}] ${log.title}${log.subtitle ? ": " + log.subtitle : ""}`,
      priority:    log.riskPriority,
      severity:    priorityToSeverity(log.riskPriority),
      reason:      log.priorityReason || `Abnormal ${log.type} reading detected`,
      explanation: log.explanation || `Patient ${patient.fullName}'s ${log.type} log requires attention`,
      sourceType:  "log",
      logType:     log.type,
      isResolved:  isGreenOrResolved(scenario, isRed, isOrange),
      createdAt:   log.createdAt,
    });
  }

  // No-logs alert for orange_no_logs
  if (patient.scenario === "orange_no_logs") {
    const alertId = new ObjectId();
    alerts.push({
      _id: alertId, id: alertId.toString(),
      patientEmail: patient.email, patientName: patient.fullName,
      doctorEmail,
      message:     "[ORANGE] Patient has not logged any health data in 6 days",
      priority:    "ORANGE", severity: "High",
      reason:      "No activity detected for 6+ days",
      explanation: `${patient.fullName} has been completely absent from the app for 6 consecutive days. Compliance check needed.`,
      sourceType:  "system",
      logType:     "compliance",
      isResolved:  false,
      createdAt:   daysAgo(1),
    });
  }

  return alerts;
}

function isGreenOrResolved(scenario, isRed, isOrange) {
  if (scenario === "green") return true;
  if (isRed) return false;
  if (isOrange) return Math.random() < 0.25;
  return Math.random() < 0.55;
}

// ─── main seed function ───────────────────────────────────────────────────────
async function seed() {
  console.log("🌱  VitalConnect Seed Script\n");
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`✅  Connected → ${DB_NAME}\n`);

    // ── 1. Doctor ──────────────────────────────────────────────────────────────
    console.log("👨‍⚕️  Seeding doctor: Abdelrhman Hamdy…");
    const passwordHash = await bcrypt.hash(DOCTOR.password, 10);
    const now = new Date();

    const doctorResult = await db.collection("doctors").findOneAndUpdate(
      { email: DOCTOR.email },
      {
        $set: {
          fullName:         DOCTOR.fullName,
          doctorName:       DOCTOR.doctorName,
          type:             DOCTOR.type,
          specialty:        DOCTOR.specialty,
          experience:       DOCTOR.experience,
          bio:              DOCTOR.bio,
          clinicName:       DOCTOR.clinicName,
          consultationType: DOCTOR.consultationType,
          price:            DOCTOR.price,
          rating:           DOCTOR.rating,
          reviewCount:      DOCTOR.reviewCount,
          isVerified:       DOCTOR.isVerified,
          isActive:         DOCTOR.isActive,
          updatedAt:        now,
        },
        $setOnInsert: {
          email:     DOCTOR.email,
          password:  passwordHash,
          createdAt: daysAgo(180),
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    const doctor    = doctorResult;
    const doctorId  = doctor._id.toString();
    const docEmail  = DOCTOR.email;
    console.log(`   ↳ Doctor ID: ${doctorId}\n`);

    // ── 2. Doctor Plans ────────────────────────────────────────────────────────
    console.log("📋  Seeding doctor plans…");
    const planIds = [];
    for (const [i, tpl] of PLAN_TEMPLATES.entries()) {
      const planObjId = new ObjectId();
      const planIdStr = planObjId.toString();
      const start = daysAgo(rand(60, 90));
      const end   = new Date(start.getTime() + 90 * 86_400_000);

      await db.collection("doctorPlans").findOneAndUpdate(
        { doctorEmail: docEmail, planTitle: tpl.planTitle },
        {
          $set: {
            planType:    tpl.planType,
            description: tpl.description,
            goals:       tpl.goals,
            status:      "Active",
            startDate:   start.toISOString().split("T")[0],
            endDate:     end.toISOString().split("T")[0],
            updatedAt:   now,
          },
          $setOnInsert: {
            id:          planIdStr,
            doctorEmail: docEmail,
            planTitle:   tpl.planTitle,
            assignedTo:  [],
            createdAt:   daysAgo(rand(60, 90)),
          },
        },
        { upsert: true, returnDocument: "after" },
      );

      const inserted = await db.collection("doctorPlans").findOne({ doctorEmail: docEmail, planTitle: tpl.planTitle });
      planIds.push(inserted);
    }
    console.log(`   ↳ ${planIds.length} plans ready\n`);

    // ── 3. Patients + subscriptions + logs + messages + alerts ────────────────
    console.log(`👥  Seeding ${PATIENTS.length} patients…\n`);
    let totalLogs = 0, totalMsgs = 0, totalAlerts = 0;

    for (const patient of PATIENTS) {
      process.stdout.write(`   → ${patient.fullName.padEnd(22)} [${patient.scenario.toUpperCase().slice(0,6)}]  `);

      const patientPw  = await bcrypt.hash(patient.password, 10);
      const profileObj = {
        fullName:          patient.fullName,
        age:               patient.age,
        gender:            patient.gender,
        height:            patient.height,
        weight:            patient.weight,
        medicalConditions: patient.conditions,
        allergies:         [],
        healthGoals:       patient.goals,
        language:          "English",
        units:             "Metric (kg, cm)",
      };

      const subscriptionObj = {
        id:                    `${doctorId}-${patient.email}`,
        professionalId:        doctorId,
        professionalTitle:     "Nutritionist Plan",
        planName:              "Free Access",
        amount:                0,
        period:                "per month",
        subscribedAt:          daysAgo(rand(30, 90)),
        selectedDoctorName:    DOCTOR.fullName,
      };

      const patientResult = await db.collection("users").findOneAndUpdate(
        { email: patient.email },
        {
          $set: {
            phone:       patient.phone,
            profile:     profileObj,
            isVerified:  true,
            updatedAt:   now,
            subscriptions: [subscriptionObj],
          },
          $setOnInsert: {
            email:     patient.email,
            password:  patientPw,
            createdAt: daysAgo(rand(60, 120)),
          },
        },
        { upsert: true, returnDocument: "after" },
      );

      const patientId = patientResult._id.toString();

      // ── doctorPatients link ──────────────────────────────────────────────────
      const trendOptions = { green: "up", yellow: "stable", orange: "down", orange_no_logs: "stable", red: "down" };
      await db.collection("doctorPatients").findOneAndUpdate(
        { doctorEmail: docEmail, patientEmail: patient.email },
        {
          $set: {
            name:        patient.fullName,
            age:         Number(patient.age),
            gender:      patient.gender,
            conditions:  patient.conditions,
            lastActivity: patient.scenario === "orange_no_logs" ? "6 days ago"
                        : patient.scenario.startsWith("orange") ? `${rand(1,3)} days ago`
                        : patient.scenario === "red" ? `${rand(1,12)} hours ago`
                        : "Today",
            trend:       trendOptions[patient.scenario] || "stable",
            status:      "active",
            adherence:   patient.adherence,
            alerts:      patient.alertCount,
            updatedAt:   now,
          },
          $setOnInsert: {
            doctorEmail:  docEmail,
            patientEmail: patient.email,
            doctorId,
            patientId,
            assignedAt:   subscriptionObj.subscribedAt,
            createdAt:    subscriptionObj.subscribedAt,
          },
        },
        { upsert: true },
      );

      // ── clear and re-seed logs ───────────────────────────────────────────────
      await db.collection("patientLogs").deleteMany({ email: patient.email });

      const logDays = patient.scenario === "green" ? 60
        : patient.scenario === "yellow" ? 45
        : patient.scenario.startsWith("orange") ? 30
        : 35;

      const mealLogs    = generateMealLogs(patient, doctorId, logDays);
      const vitalsLogs  = generateVitalsLogs(patient, logDays);
      const exLogs      = generateExerciseLogs(patient, logDays);
      const waterLogs   = generateWaterLogs(patient, logDays);
      const sleepLogs   = generateSleepLogs(patient, logDays);
      const allLogs     = [...mealLogs, ...vitalsLogs, ...exLogs, ...waterLogs, ...sleepLogs];

      if (allLogs.length > 0) {
        await db.collection("patientLogs").insertMany(allLogs);
      }
      totalLogs += allLogs.length;

      // ── clear and re-seed messages ───────────────────────────────────────────
      await db.collection("patientMessages").deleteMany({ email: patient.email, doctorId });
      const msgs = generateMessages(patient, doctorId);
      if (msgs.length > 0) {
        await db.collection("patientMessages").insertMany(msgs);
      }
      totalMsgs += msgs.length;

      // ── clear and re-seed alerts ─────────────────────────────────────────────
      await db.collection("doctorAlerts").deleteMany({ patientEmail: patient.email, doctorEmail: docEmail });
      const alerts = generateAlerts(patient, docEmail, allLogs);
      if (alerts.length > 0) {
        await db.collection("doctorAlerts").insertMany(alerts);
      }
      totalAlerts += alerts.length;

      // ── assign patient plan (patientPlans) ───────────────────────────────────
      const planTemplate = planIds[patient.plan] || planIds[0];
      if (planTemplate) {
        const ppExists = await db.collection("patientPlans").findOne({
          email: patient.email, doctorPlanId: (planTemplate.id || planTemplate._id.toString()),
        });
        if (!ppExists) {
          const ppId  = new ObjectId();
          await db.collection("patientPlans").insertOne({
            _id:              ppId,
            email:            patient.email,
            title:            planTemplate.planTitle,
            description:      planTemplate.description,
            type:             planTemplate.planType.toLowerCase().includes("meal") ? "meal"
                            : planTemplate.planType.toLowerCase().includes("workout") ? "exercise"
                            : "general",
            status:           "Active",
            goals:            planTemplate.goals,
            startDate:        planTemplate.startDate || daysAgo(30).toISOString().split("T")[0],
            endDate:          planTemplate.endDate   || daysAgo(-60).toISOString().split("T")[0],
            assignedByDoctor: docEmail,
            doctorPlanId:     planTemplate.id || planTemplate._id.toString(),
            createdAt:        daysAgo(rand(15, 45)),
            updatedAt:        now,
          });

          // update doctorPlans.assignedTo
          await db.collection("doctorPlans").updateOne(
            { _id: planTemplate._id },
            {
              $push: {
                assignedTo: {
                  patientEmail: patient.email,
                  patientName:  patient.fullName,
                  patientPlanId: ppId.toString(),
                  assignedAt:   daysAgo(rand(15, 45)),
                },
              },
            },
          );
        }
      }

      console.log(`logs:${String(allLogs.length).padStart(3)}  msgs:${String(msgs.length).padStart(2)}  alerts:${String(alerts.length).padStart(2)}  ✓`);
    }

    // ── summary ──────────────────────────────────────────────────────────────
    console.log(`\n${"═".repeat(58)}`);
    console.log("✅  SEED COMPLETE");
    console.log(`${"═".repeat(58)}`);
    console.log(`   Doctor   : ${DOCTOR.fullName} <${DOCTOR.email}>`);
    console.log(`   Password : ${DOCTOR.password}`);
    console.log(`   Patients : ${PATIENTS.length}`);
    console.log(`   Logs     : ${totalLogs}`);
    console.log(`   Messages : ${totalMsgs}`);
    console.log(`   Alerts   : ${totalAlerts}`);
    console.log(`${"═".repeat(58)}`);
    console.log(`\n   Patient login example:`);
    console.log(`   Email    : ahmed.hassan@vitalseed.com`);
    console.log(`   Password : Patient@123`);
    console.log(`${"═".repeat(58)}\n`);

  } catch (err) {
    console.error("❌  Seed failed:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
