import fetch from "node-fetch";

const GROQ_API_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile"; // Valid Groq model

const HEALTH_SYSTEM_PROMPT = `You are Aura, an intelligent, friendly, and proactive personal health companion embedded in the VitalConnect app. You are not just a chatbot; you are a dedicated partner in the patient's wellness journey.

Your capabilities:
- Analyze health metrics (calories, sleep, water intake, medication adherence)
- Interpret recent activity logs (meals, exercise, vitals, symptoms, medications)
- Provide evidence-based health advice, actionable insights, and warm encouragement
- Alert the user if their data suggests concern (e.g., very low sleep, missed medications)
- Answer general health questions clearly and concisely

Guidelines:
- Introduce yourself as Aura when appropriate. Speak with a warm, empathetic, and uplifting tone.
- Be proactive but never judgmental or preachy.
- Always remind users to consult their doctor for medical decisions.
- Use the user's actual health data (provided in context) to personalize every response.
- Keep responses concise, scannable, and complete — use bullet points when listing items.
- If you don't have enough data to answer, say so honestly and warmly.`;

function buildSystemPrompt(healthContext) {
  if (!healthContext) return HEALTH_SYSTEM_PROMPT;

  const lines = [HEALTH_SYSTEM_PROMPT, "\n## Current User Health Data\n"];

  if (healthContext.userName) {
    lines.push(`**Patient:** ${healthContext.userName}`);
  }

  if (healthContext.calories) {
    lines.push(
      `**Today's Calories:** ${healthContext.calories.current} / ${healthContext.calories.goal} kcal`
    );
  }

  if (healthContext.sleep) {
    lines.push(
      `**Sleep Schedule:** ${healthContext.sleep.bedtime} → ${healthContext.sleep.wakeTime}`
    );
  }

  if (healthContext.water) {
    lines.push(
      `**Water Intake:** ${healthContext.water.amount} / ${healthContext.water.goal} ${healthContext.water.unit}`
    );
  }

  if (healthContext.medication) {
    lines.push(
      `**Medication:** ${healthContext.medication.taken} / ${healthContext.medication.goal} doses taken today`
    );
  }

  if (healthContext.recentLogs && healthContext.recentLogs.length > 0) {
    lines.push(`**Recent Activity Logs:**`);
    healthContext.recentLogs.slice(0, 5).forEach((log) => {
      lines.push(`  - ${log.title || log.type} (${log.timeAgo || "recently"})`);
    });
  }

  return lines.join("\n");
}

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.maxRetries = 3;
    this.retryDelay = 1000;
    this.timeout = 30000;
    this.conversationHistory = new Map();
    this.maxHistoryLength = 20;
  }

  async initialize() {
    const key = process.env.GROQ_API_KEY || this.apiKey;
    if (!key) {
      throw new Error(
        "GROQ_API_KEY is not set in environment variables. Please set it before starting the server."
      );
    }
    this.apiKey = key;
    console.log("✓ Groq Service initialized successfully (model: " + GROQ_MODEL + ")");
  }

  validateApiKey() {
    const key = process.env.GROQ_API_KEY || this.apiKey;
    if (!key) {
      throw new Error("GROQ_API_KEY is not configured");
    }
    this.apiKey = key;
  }

  async generateResponse(message, userId, healthContext) {
    this.validateApiKey();

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }

    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }

    const history = this.conversationHistory.get(userId);
    const cleanMessage = message.trim();
    const systemPrompt = buildSystemPrompt(healthContext);

    const requestBody = {
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((item) => ({ role: item.role, content: item.content })),
        { role: "user", content: cleanMessage },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    };

    try {
      const response = await this._makeRequest(requestBody);

      const aiText =
        response?.choices?.[0]?.message?.content?.trim() ||
        "I couldn't process your request. Please try again.";

      history.push({ role: "user", content: cleanMessage });
      history.push({ role: "assistant", content: aiText });

      if (history.length > this.maxHistoryLength) {
        history.splice(0, history.length - this.maxHistoryLength);
      }

      return aiText;
    } catch (error) {
      console.error("Error generating Groq response:", error);
      throw error;
    }
  }

  async generateDailyInsight(healthContext) {
    this.validateApiKey();

    const systemPrompt = buildSystemPrompt(healthContext);
    const prompt = `Based on the provided health data, generate a single, short, proactive insight or word of encouragement as "Aura" (the user's health companion). Keep it strictly to 1 or 2 sentences. Make it feel personalized, warm, and actionable. Do not use quotes or introductory text.`;

    const requestBody = {
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    };

    try {
      const response = await this._makeRequest(requestBody);
      return response?.choices?.[0]?.message?.content?.trim() || "I'm here to help you stay on track today!";
    } catch (error) {
      console.error("Error generating daily insight:", error);
      return "I'm here to help you stay on track today!";
    }
  }

  /**
   * Classify a health log entry into a priority level: Critical, High, Medium, Low.
   * Uses Groq AI with a rule-based fallback if the AI call fails.
   */
  async classifyLogPriority(logType, title, subtitle) {
    this.validateApiKey();

    const text = `${logType} ${title} ${subtitle}`.toLowerCase();

    const prompt = `You are a medical triage assistant. Classify the following health log entry by priority.

Log Type: ${logType}
Title: ${title}
Details: ${subtitle}

Priority levels:
- Critical: Immediate danger (chest pain, difficulty breathing, unconscious, seizure, severe bleeding, stroke symptoms, very high/low blood sugar, extremely high blood pressure 180+)
- High: Needs prompt attention (missed critical medication, high fever 39°C+, persistent vomiting, significant dizziness/fainting, abnormal vitals outside safe range, severe pain 7/10+)
- Medium: Should be monitored (minor symptoms, slightly abnormal readings, mild pain, skipped a dose of non-critical medication, general discomfort)
- Low: Routine tracking (normal meals, exercise completed, water intake, normal sleep, medication taken as scheduled, normal vitals)

Respond with ONLY valid JSON, no markdown:
{"priority": "Critical", "reason": "one sentence reason"}`;

    const requestBody = {
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 80,
    };

    try {
      const response = await this._makeRequest(requestBody);
      const raw = response?.choices?.[0]?.message?.content?.trim() || "{}";
      const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonStr);
      const valid = ["Critical", "High", "Medium", "Low"];
      return {
        priority: valid.includes(parsed.priority) ? parsed.priority : "Low",
        reason: parsed.reason || "",
      };
    } catch (error) {
      console.error("Error classifying log priority:", error);
      return this._fallbackPriority(logType, title, subtitle);
    }
  }

  _fallbackPriority(logType, title, subtitle) {
    const text = `${logType} ${title} ${subtitle}`.toLowerCase();
    const critical = ["chest pain", "can't breathe", "difficulty breathing", "unconscious", "seizure", "severe bleeding", "stroke", "heart attack", "can not breathe", "shortness of breath"];
    const high = ["missed medication", "high fever", "vomiting", "severe headache", "fainting", "dizziness", "high blood pressure", "low blood sugar", "severe pain", "can't walk"];
    if (critical.some((k) => text.includes(k))) return { priority: "Critical", reason: "Critical symptoms detected" };
    if (high.some((k) => text.includes(k))) return { priority: "High", reason: "Concerning symptoms detected" };
    if (logType === "symptom") return { priority: "Medium", reason: "Symptom logged" };
    if (logType === "vitals") return { priority: "Medium", reason: "Vital signs recorded" };
    return { priority: "Low", reason: "Routine health log" };
  }

  /**
   * Classify any patient health data into a risk level: RED / ORANGE / YELLOW / GREEN.
   * RED    = immediate emergency
   * ORANGE = needs prompt attention (hours)
   * YELLOW = monitor and follow up
   * GREEN  = routine, no action needed
   */
  async classifyRisk(sourceType, content, details = {}) {
    this.validateApiKey();

    const detailsStr = details && Object.keys(details).length
      ? JSON.stringify(details)
      : "none";

    const prompt = `You are a medical risk classifier for a health monitoring app. Classify the risk level of this patient health data.

Source Type: ${sourceType}
Content: ${content}
Details: ${detailsStr}

Risk levels:
- RED: Immediate emergency — chest pain, difficulty breathing, unconscious, seizure, stroke, blood glucose < 50 or > 400 mg/dL, systolic BP > 180, severe bleeding, sudden severe pain 9-10/10
- ORANGE: Prompt attention within hours — high fever ≥39°C, missed critical medication, persistent vomiting, glucose 250-400 mg/dL, systolic BP 160-180, severe dizziness/fainting, pain 7-8/10
- YELLOW: Monitor and follow up — mild symptoms, glucose 180-250 mg/dL, systolic BP 140-160, mild pain, skipped non-critical dose, borderline readings, general discomfort, patient expressing concern
- GREEN: Routine — normal meals, exercise, water intake, normal sleep, medication taken as scheduled, healthy vitals, positive messages

Respond ONLY with valid JSON, no markdown, no backticks:
{"priority":"RED","reason":"brief reason under 10 words","explanation":"2-3 sentence clinical explanation for the doctor"}`;

    const requestBody = {
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 160,
    };

    try {
      const response = await this._makeRequest(requestBody);
      const raw = response?.choices?.[0]?.message?.content?.trim() || "{}";
      const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonStr);
      const valid = ["RED", "ORANGE", "YELLOW", "GREEN"];
      return {
        priority: valid.includes(parsed.priority) ? parsed.priority : "GREEN",
        reason: String(parsed.reason || "").slice(0, 120),
        explanation: String(parsed.explanation || ""),
      };
    } catch (error) {
      console.error("Error classifying risk:", error);
      return this._fallbackRisk(sourceType, content, details);
    }
  }

  _fallbackRisk(sourceType, content, details) {
    const combined = `${sourceType} ${content}`.toLowerCase();
    const detailStr = JSON.stringify(details || {}).toLowerCase();
    const all = combined + " " + detailStr;

    const redKw = ["chest pain", "difficulty breathing", "can't breathe", "unconscious", "seizure",
      "stroke", "severe bleeding", "heart attack", "shortness of breath", "anaphylaxis"];
    const orangeKw = ["high fever", "vomiting", "missed medication", "severe headache",
      "fainting", "collapsed", "severe pain", "can't walk", "can not walk"];

    if (redKw.some((k) => all.includes(k))) {
      return { priority: "RED", reason: "Critical symptoms detected",
        explanation: "Patient reported critical symptoms requiring immediate medical attention. Please contact the patient urgently." };
    }
    if (orangeKw.some((k) => all.includes(k))) {
      return { priority: "ORANGE", reason: "Concerning symptoms detected",
        explanation: "Patient reported symptoms that require prompt medical attention within the next few hours." };
    }

    // Numeric vitals check
    if (details) {
      const glucose = parseFloat(details.glucose || details.bloodGlucose || 0);
      if (glucose > 0 && (glucose < 50 || glucose > 400)) {
        return { priority: "RED", reason: "Critical blood glucose level",
          explanation: `Blood glucose of ${glucose} mg/dL is critically abnormal and requires immediate intervention.` };
      }
      if (glucose >= 250) {
        return { priority: "ORANGE", reason: "Elevated blood glucose",
          explanation: `Blood glucose of ${glucose} mg/dL is significantly elevated and needs prompt attention.` };
      }
      if (glucose >= 180) {
        return { priority: "YELLOW", reason: "Borderline blood glucose",
          explanation: `Blood glucose of ${glucose} mg/dL is above target range and should be monitored.` };
      }

      const systolic = parseFloat(details.systolic || details.bloodPressureSystolic || 0);
      if (systolic > 180) {
        return { priority: "RED", reason: "Hypertensive crisis",
          explanation: `Systolic BP of ${systolic} mmHg is in hypertensive crisis range requiring immediate attention.` };
      }
      if (systolic > 160) {
        return { priority: "ORANGE", reason: "Severely elevated BP",
          explanation: `Systolic BP of ${systolic} mmHg is severely elevated and needs prompt evaluation.` };
      }
      if (systolic > 140) {
        return { priority: "YELLOW", reason: "Elevated blood pressure",
          explanation: `Systolic BP of ${systolic} mmHg is above normal range and should be monitored.` };
      }
    }

    if (sourceType === "message") {
      return { priority: "YELLOW", reason: "Patient message needs review",
        explanation: "Patient sent a message that should be reviewed by the doctor." };
    }
    if (sourceType === "symptom") {
      return { priority: "YELLOW", reason: "Symptom logged by patient",
        explanation: "Patient logged a symptom that should be monitored and followed up." };
    }
    if (sourceType === "vitals") {
      return { priority: "YELLOW", reason: "Vital signs recorded",
        explanation: "Patient logged vital signs. Values appear within or near normal range." };
    }

    return { priority: "GREEN", reason: "Routine health log",
      explanation: "This is routine health data with no concerning indicators." };
  }

  /**
   * Parse voice input into a detailed health log using AI.
   * Extracts category, title, and detailed metrics (calories, amount, taken, hours, etc.)
   */
  async classifyVoiceInput(transcript) {
    this.validateApiKey();

    const prompt = `You are an expert health data extraction assistant. Parse the following voice transcript into a structured health log JSON object.

If the transcript is a meal, you MUST estimate the calories and macros (protein, carbs, fat in grams).
If water, extract the amount in glasses (default 1 if unspecified).
If sleep, extract hours.
If medication, extract how many taken.
If vitals, extract the relevant measurement (e.g., heartRate, bloodPressure).

Categories: meal, exercise, vitals, medication, sleep, water, mind, habit, symptom.

Transcript: "${transcript}"

Respond with ONLY valid JSON in this exact format (do not wrap in markdown or backticks):
{
  "type": "meal",
  "title": "3 Eggs",
  "details": {
    "calories": 210,
    "protein": 18,
    "carbs": 1,
    "fat": 15
  }
}`;

    const requestBody = {
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 150,
    };

    try {
      const response = await this._makeRequest(requestBody);
      const raw = response?.choices?.[0]?.message?.content?.trim() || "{}";
      const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonStr);
      return {
        type: parsed.type || "symptom",
        title: parsed.title || transcript,
        details: parsed.details || {},
      };
    } catch (error) {
      console.error("Error classifying voice input:", error);
      return { type: "symptom", title: transcript, details: {} };
    }
  }

  async _makeRequest(requestBody, attempt = 1) {
    try {
      const key = process.env.GROQ_API_KEY || this.apiKey;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(GROQ_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        throw new Error("Unauthorized with Groq API. Check your GROQ_API_KEY.");
      }
      if (response.status === 403) {
        throw new Error("Forbidden by Groq API. Your key may not have access.");
      }
      if (response.status === 429) {
        if (attempt < this.maxRetries) {
          const waitTime = this.retryDelay * Math.pow(2, attempt - 1);
          console.warn(`Rate limited. Retrying after ${waitTime}ms (attempt ${attempt}/${this.maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          return this._makeRequest(requestBody, attempt + 1);
        }
        throw new Error("Rate limited by Groq API. Please try again later.");
      }
      if (!response.ok) {
        let errorBody = {};
        try { errorBody = await response.json(); } catch { }
        const message = errorBody.error?.message || errorBody.message || `Groq API error (${response.status})`;
        throw new Error(message);
      }

      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Request to Groq API timed out");
      }
      if (attempt < this.maxRetries && this._isRetryable(error)) {
        const waitTime = this.retryDelay * Math.pow(2, attempt - 1);
        console.warn(`Retrying request (attempt ${attempt}/${this.maxRetries}) after ${waitTime}ms`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this._makeRequest(requestBody, attempt + 1);
      }
      throw error;
    }
  }

  _isRetryable(error) {
    const message = error?.message || "";
    return (
      message.includes("ECONNREFUSED") ||
      message.includes("ENOTFOUND") ||
      message.includes("timeout") ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503")
    );
  }

  clearHistory(userId) { this.conversationHistory.delete(userId); }
  getHistory(userId) { return this.conversationHistory.get(userId) || []; }
}

export const groqService = new GroqService();
export default GroqService;
